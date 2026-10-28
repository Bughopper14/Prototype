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
        boxes = []
        if p.suffix.lower() == '.pdf':
            try:
                import pymupdf as fitz
                import cv2
                import numpy as np
                doc = fitz.open(str(p))
                page_count = len(doc)
                
                # Check for digital text in PDF pages first
                for p_idx, page in enumerate(doc):
                    for blk in page.get_text('blocks'):
                        blk_txt = blk[4].strip() if len(blk) > 4 else ''
                        for line in blk_txt.split('\n'):
                            clean_line = line.strip()
                            if clean_line:
                                digital_boxes.append({
                                    "text": clean_line,
                                    "confidence": 1.0,
                                    "page": p_idx + 1,
                                    "page_width": int(page.rect.width),
                                    "page_height": int(page.rect.height),
                                    "box": [int(blk[0]), int(blk[1]), int(blk[2]), int(blk[3])]
                                })

                # If PDF has digital text (e.g. >= 15 digital lines), use digital boxes
                dtype_hint = (doc_type or "auto").strip().lower()
                if len(digital_boxes) >= 15 and dtype_hint not in ['ktp']:
                    boxes.extend(digital_boxes)
                else:
                    # Render pages and run RapidOCR / Tesseract
                    is_nib_doc = (dtype_hint == 'nib' or 'nib' in p.name.lower())
                    is_fap_doc = (dtype_hint == 'fap' or 'fap' in p.name.lower())
                    dpi = 200.0 if is_nib_doc else (160.0 if is_fap_doc else 200.0)
                    mat = fitz.Matrix(dpi / 72.0, dpi / 72.0)
                    pages_to_process = min(page_count, 2) if is_nib_doc else (min(page_count, 3) if is_fap_doc else min(page_count, 4))

                    for p_idx in range(pages_to_process):
                        page = doc[p_idx]
                        pix = page.get_pixmap(matrix=mat, alpha=False)
                        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
                        bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
                        # Fast-path RapidOCR directly without auto_orient unless empty
                        p_boxes = OCREngine.process_image(bgr)
                        if not p_boxes:
                            oriented_img, _ = DocumentPreprocessor.auto_orient_image(bgr)
                            p_boxes = OCREngine.process_image(oriented_img)
                        if not p_boxes:
                            from ocr_handler import TesseractEngine
                            p_boxes = TesseractEngine.process_image(bgr)
                        for b in p_boxes:
                            b["page"] = p_idx + 1
                            b["page_width"] = pix.w
                            b["page_height"] = pix.h
                            boxes.append(b)
                doc.close()
            except Exception as pdf_err:
                sys.stderr.write(f"[OCR_CLI] Multi-page PDF extraction note: {pdf_err}\n")

        # Fallback for standard images (PNG, JPG) or when PDF parsing produced no boxes
        if not boxes:
            if img_to_process is None:
                raw_img, page_count = DocumentPreprocessor.load_document(p)
                oriented_img, rot_angle = DocumentPreprocessor.auto_orient_image(raw_img)
                deskewed_img, skew_angle = DocumentPreprocessor.deskew_image(oriented_img)
                img_to_process = deskewed_img
            else:
                oriented_img, rot_angle = DocumentPreprocessor.auto_orient_image(img_to_process)
                deskewed_img, skew_angle = DocumentPreprocessor.deskew_image(oriented_img)
                img_to_process = deskewed_img

            # Prioritize RapidOCR (OCREngine)
            boxes = OCREngine.process_image(img_to_process)
            if not boxes:
                from ocr_handler import TesseractEngine
                boxes = TesseractEngine.process_image(img_to_process)
            h, w = img_to_process.shape[:2]
            for b in boxes:
                b["page"] = 1
                b["page_width"] = w
                b["page_height"] = h

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
