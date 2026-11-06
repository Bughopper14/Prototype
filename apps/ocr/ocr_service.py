"""Document OCR pipeline, shared by the one-shot CLI (ocr_cli.py) and the long-lived worker (ocr_worker.py)."""
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import cv2
import numpy as np

import form_extractors as forms
from app.services.extractor import InformationExtractor
from app.services.ocr_engine import OCREngine
from app.services.preprocessor import DocumentPreprocessor

Boxes = List[Dict[str, Any]]

DIGITAL_TEXT_MIN_LINES = 15  # a PDF with at least this many text lines is read directly, without OCR
MAX_IMAGE_SIDE = 1800  # larger images are scaled down: crisp enough for OCR and much faster
MAX_PDF_PAGES = {"nib": 2, "fap": 3}
DEFAULT_MAX_PDF_PAGES = 4
PDF_DPI = {"nib": 200.0, "fap": 160.0}
DEFAULT_PDF_DPI = 200.0


def _log(message: str) -> None:
    sys.stderr.write(f"[ocr] {message}\n")


def _ocr_image(image: np.ndarray) -> Boxes:
    """RapidOCR first; if it finds nothing try auto-orientation, then Tesseract."""
    boxes = OCREngine.process_image(image)
    if not boxes:
        oriented, _ = DocumentPreprocessor.auto_orient_image(image)
        boxes = OCREngine.process_image(oriented)
    if not boxes:
        boxes = forms.TesseractEngine.process_image(image)
    return boxes


def _digital_text_boxes(pdf) -> Boxes:
    boxes: Boxes = []
    for index, page in enumerate(pdf):
        for block in page.get_text("blocks"):
            text = block[4].strip() if len(block) > 4 else ""
            for line in text.split("\n"):
                line = line.strip()
                if line:
                    boxes.append({
                        "text": line,
                        "confidence": 1.0,
                        "page": index + 1,
                        "page_width": int(page.rect.width),
                        "page_height": int(page.rect.height),
                        "box": [int(block[0]), int(block[1]), int(block[2]), int(block[3])],
                    })
    return boxes


def _read_pdf(path: Path, doc_type: str) -> Tuple[Boxes, int]:
    import pymupdf

    pdf = pymupdf.open(str(path))
    try:
        page_count = len(pdf)
        digital = _digital_text_boxes(pdf)
        if len(digital) >= DIGITAL_TEXT_MIN_LINES and doc_type != "ktp":
            return digital, page_count

        kind = "nib" if doc_type == "nib" or "nib" in path.name.lower() else (
            "fap" if doc_type == "fap" or "fap" in path.name.lower() else "")
        matrix = pymupdf.Matrix(PDF_DPI.get(kind, DEFAULT_PDF_DPI) / 72.0, PDF_DPI.get(kind, DEFAULT_PDF_DPI) / 72.0)
        boxes: Boxes = []
        for index in range(min(page_count, MAX_PDF_PAGES.get(kind, DEFAULT_MAX_PDF_PAGES))):
            pixmap = pdf[index].get_pixmap(matrix=matrix, alpha=False)
            rgb = np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(pixmap.h, pixmap.w, pixmap.n)
            page_boxes = _ocr_image(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
            for box in page_boxes:
                box.update(page=index + 1, page_width=pixmap.w, page_height=pixmap.h)
            boxes.extend(page_boxes)
            # NIB: the first page already carries the 13-digit number and the company identity
            if kind == "nib" and re.search(r"\b\d{13}\b", " ".join(b.get("text") or "" for b in page_boxes)):
                break
        return boxes, page_count
    finally:
        pdf.close()


def _read_image(path: Path) -> Tuple[Boxes, int]:
    image, page_count = DocumentPreprocessor.load_document(path)
    height, width = image.shape[:2]
    if max(height, width) > MAX_IMAGE_SIDE:
        scale = MAX_IMAGE_SIDE / max(height, width)
        image = cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_AREA)

    boxes = OCREngine.process_image(image)
    if not boxes:
        oriented, _ = DocumentPreprocessor.auto_orient_image(image)
        deskewed, _ = DocumentPreprocessor.deskew_image(oriented)
        boxes = OCREngine.process_image(deskewed)
    if not boxes:
        boxes = forms.TesseractEngine.process_image(image)

    height, width = image.shape[:2]
    for box in boxes:
        box.update(page=1, page_width=width, page_height=height)
    return boxes, page_count


def _resolve_type(doc_type: str, boxes: Boxes, filename: str) -> str:
    if doc_type not in ("auto", "none", ""):
        return doc_type
    text = " ".join(b.get("text") or "" for b in boxes)
    if "fap" in filename.lower() or re.search(
            r"financing\s+application\s+form|\bfap\b|tujuan\s+pembiayaan|fap\s+intake", text, re.IGNORECASE):
        return "fap"
    detected = InformationExtractor.detect_document_type(boxes, filename)
    return detected.value if hasattr(detected, "value") else str(detected).lower()


def _dump(model: Any) -> Dict[str, Any]:
    return model.model_dump() if hasattr(model, "model_dump") else dict(model)


def _extract(kind: str, boxes: Boxes, path: Path) -> Tuple[str, Dict[str, Any]]:
    if kind == "fap":
        return "fap", forms.extract_fap(boxes, pdf_path=str(path))[0]
    if kind == "ktp":
        return "ktp", forms.extract_ktp_nib_style(boxes)[0]
    if kind == "nib":
        return "nib", forms.extract_nib(boxes)[0]
    if kind == "npwp":
        return "npwp", _dump(InformationExtractor.extract_npwp(boxes)[0])
    if kind == "passport":
        return "passport", _dump(InformationExtractor.extract_passport(boxes)[0])
    if kind == "kitas":
        return "kitas", _dump(InformationExtractor.extract_kitas(boxes)[0])
    return "generic", _dump(InformationExtractor.extract_generic(boxes)[0])


def process_document(file_path: str, doc_type: str = "auto") -> Dict[str, Any]:
    """Reads one document and returns {status, doc_type, filename, page_count, data}. Raises on failure."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    doc_type = (doc_type or "auto").strip().lower()
    boxes: Boxes = []
    page_count = 1
    if path.suffix.lower() == ".pdf":
        try:
            boxes, page_count = _read_pdf(path, doc_type)
        except Exception as error:  # fall back to the image path below
            _log(f"PDF extraction note: {error}")
    if not boxes:
        boxes, page_count = _read_image(path)

    detected, data = _extract(_resolve_type(doc_type, boxes, path.name), boxes, path)
    return {"status": "success", "doc_type": detected, "filename": path.name, "page_count": page_count, "data": data}
