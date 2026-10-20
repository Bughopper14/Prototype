import sys
import os
import json
from pathlib import Path

# Include OCR and current dir in sys.path
sys.path.insert(0, r"C:\Users\reage\Documents\ChatGPT\OCR")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.preprocessor import DocumentPreprocessor
from app.services.ocr_engine import OCREngine
from app.services.extractor import InformationExtractor

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)

    file_path = sys.argv[1]
    doc_type = sys.argv[2] if len(sys.argv) > 2 else "auto"

    p = Path(file_path)
    if not p.exists():
        print(json.dumps({"error": f"File not found: {file_path}"}))
        sys.exit(1)

    try:
        # Check if PDF has digital text or contains scanned image
        img_to_process = None
        page_count = 1
        digital_boxes = []
        if p.suffix.lower() == '.pdf':
            try:
                import pymupdf as fitz
                import cv2
                import numpy as np
                doc = fitz.open(str(p))
                page_count = len(doc)
                
                # Check for digital text in PDF pages
                for page in doc:
                    for blk in page.get_text('blocks'):
                        blk_txt = blk[4].strip() if len(blk) > 4 else ''
                        for line in blk_txt.split('\n'):
                            clean_line = line.strip()
                            if clean_line:
                                digital_boxes.append({
                                    "text": clean_line,
                                    "confidence": 1.0,
                                    "box": [int(blk[0]), int(blk[1]), int(blk[2]), int(blk[3])]
                                })

                # Only extract embedded image if PDF has NO digital text (e.g. scanned KTP PDF)
                dtype_hint = (doc_type or "auto").strip().lower()
                if len(digital_boxes) < 5 and dtype_hint not in ['nib', 'fap', 'deed', 'akta']:
                    best_img = None
                    max_area = 0
                    for page in doc:
                        for img_info in page.get_images():
                            xref = img_info[0]
                            base_img = doc.extract_image(xref)
                            img_bytes = base_img.get('image')
                            if img_bytes:
                                nparr = np.frombuffer(img_bytes, np.uint8)
                                decoded = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                                if decoded is not None:
                                    area = decoded.shape[0] * decoded.shape[1]
                                    if area > max_area and area > 200000:
                                        max_area = area
                                        best_img = decoded
                    if best_img is not None:
                        img_to_process = best_img
            except Exception as pdf_err:
                sys.stderr.write(f"[OCR_CLI] PDF text/image extraction note: {pdf_err}\n")

        boxes = []
        # If PDF already had rich digital text (like official OSS NIB or FAP), use digital text
        if digital_boxes and len(digital_boxes) >= 5:
            boxes.extend(digital_boxes)
        else:
            if img_to_process is None:
                raw_img, page_count = DocumentPreprocessor.load_document(p)
                oriented_img, rot_angle = DocumentPreprocessor.auto_orient_image(raw_img)
                deskewed_img, skew_angle = DocumentPreprocessor.deskew_image(oriented_img)
                img_to_process = deskewed_img
            else:
                oriented_img, rot_angle = DocumentPreprocessor.auto_orient_image(img_to_process)
                deskewed_img, skew_angle = DocumentPreprocessor.deskew_image(oriented_img)
                img_to_process = deskewed_img

            # Prioritize RapidOCR (OCREngine) for superior text detection on KTP and documents
            boxes = OCREngine.process_image(img_to_process)
            if not boxes:
                from ocr_handler import TesseractEngine
                boxes = TesseractEngine.process_image(img_to_process)
            if digital_boxes:
                boxes.extend(digital_boxes)

        dtype_clean = (doc_type or "auto").strip().lower()
        if dtype_clean in ["auto", "none", ""]:
            full_b_text = " ".join((b.get("text") or "") for b in boxes)
            import re
            if "fap" in p.name.lower() or re.search(r'financing\s+application\s+form|\bfap\b|tujuan\s+pembiayaan|fap\s+intake', full_b_text, re.IGNORECASE):
                dtype_clean = "fap"
            else:
                detected = InformationExtractor.detect_document_type(boxes, p.name)
                dtype_clean = detected.value if hasattr(detected, "value") else str(detected).lower()

        if dtype_clean == "fap":
            from ocr_handler import extract_fap
            extracted, tagged = extract_fap(boxes, pdf_path=str(p) if p.suffix.lower() == '.pdf' else None)
            detected_type = "fap"
        elif dtype_clean == "ktp":
            from ocr_handler import extract_ktp_nib_style
            extracted, tagged = extract_ktp_nib_style(boxes)
            detected_type = "ktp"
        elif dtype_clean == "npwp":
            obj, tagged = InformationExtractor.extract_npwp(boxes)
            extracted = obj.model_dump() if hasattr(obj, "model_dump") else dict(obj)
            detected_type = "npwp"
        elif dtype_clean == "passport":
            obj, tagged = InformationExtractor.extract_passport(boxes)
            extracted = obj.model_dump() if hasattr(obj, "model_dump") else dict(obj)
            detected_type = "passport"
        elif dtype_clean == "kitas":
            obj, tagged = InformationExtractor.extract_kitas(boxes)
            extracted = obj.model_dump() if hasattr(obj, "model_dump") else dict(obj)
            detected_type = "kitas"
        elif dtype_clean == "nib":
            from ocr_handler import extract_nib
            extracted, tagged = extract_nib(boxes)
            detected_type = "nib"
        else:
            obj, tagged = InformationExtractor.extract_generic(boxes)
            extracted = obj.model_dump() if hasattr(obj, "model_dump") else dict(obj)
            detected_type = "generic"

        print(json.dumps({
            "status": "success",
            "doc_type": detected_type,
            "filename": p.name,
            "page_count": page_count,
            "data": extracted
        }, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
