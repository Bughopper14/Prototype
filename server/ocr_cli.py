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
        raw_img, page_count = DocumentPreprocessor.load_document(p)
        oriented_img, rot_angle = DocumentPreprocessor.auto_orient_image(raw_img)
        deskewed_img, skew_angle = DocumentPreprocessor.deskew_image(oriented_img)
        from ocr_handler import TesseractEngine
        boxes = TesseractEngine.process_image(deskewed_img)

        dtype_clean = (doc_type or "auto").strip().lower()
        if dtype_clean in ["auto", "none", ""]:
            detected = InformationExtractor.detect_document_type(boxes, p.name)
            dtype_clean = detected.value if hasattr(detected, "value") else str(detected).lower()

        if dtype_clean == "ktp":
            obj, tagged = InformationExtractor.extract_ktp(boxes)
            detected_type = "ktp"
        elif dtype_clean == "npwp":
            obj, tagged = InformationExtractor.extract_npwp(boxes)
            detected_type = "npwp"
        elif dtype_clean == "passport":
            obj, tagged = InformationExtractor.extract_passport(boxes)
            detected_type = "passport"
        elif dtype_clean == "kitas":
            obj, tagged = InformationExtractor.extract_kitas(boxes)
            detected_type = "kitas"
        elif dtype_clean == "nib":
            from ocr_handler import extract_nib
            extracted, tagged = extract_nib(boxes)
            detected_type = "nib"
        else:
            obj, tagged = InformationExtractor.extract_generic(boxes)
            detected_type = "generic"

        if dtype_clean != "nib":
            extracted = obj.model_dump() if hasattr(obj, "model_dump") else dict(obj)
        if detected_type == "ktp":
            try:
                from ocr_handler import post_process_ktp_full
                post_process_ktp_full(extracted, boxes)
            except Exception as pe:
                sys.stderr.write(f"[OCR_CLI] post_process_ktp_full warning: {pe}\n")

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
