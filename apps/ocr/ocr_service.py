"""Document OCR pipeline, shared by the one-shot CLI (ocr_cli.py) and the long-lived worker (ocr_worker.py)."""
import re
import sys
from difflib import SequenceMatcher
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


def _ocr_image(image: np.ndarray, doc_type: str = "") -> Tuple[Boxes, np.ndarray]:
    """RapidOCR first; applies KTP orientation + stripe cleaning when scanning KTP, else standard fallback."""
    if doc_type == "ktp":
        oriented, _ = DocumentPreprocessor.orient_ktp_image(image, OCREngine.process_image)
        clean_bgr, clean_gray, _ = DocumentPreprocessor.enhance_ktp_for_ocr(oriented)
        boxes = OCREngine.process_image(clean_bgr)
        if boxes:
            boxes = DocumentPreprocessor.refine_ktp_box_spacing(
                clean_gray, boxes, OCREngine.get_engine()
            )
        else:
            boxes = forms.TesseractEngine.process_image(clean_bgr)
        return boxes, clean_bgr

    boxes = OCREngine.process_image(image)
    work_img = image
    if not boxes:
        work_img, _ = DocumentPreprocessor.auto_orient_image(image)
        boxes = OCREngine.process_image(work_img)
    if not boxes:
        boxes = forms.TesseractEngine.process_image(image)
        work_img = image
    return boxes, work_img


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
            "fap" if doc_type == "fap" or "fap" in path.name.lower() else doc_type)
        matrix = pymupdf.Matrix(PDF_DPI.get(kind, DEFAULT_PDF_DPI) / 72.0, PDF_DPI.get(kind, DEFAULT_PDF_DPI) / 72.0)
        boxes: Boxes = []
        for index in range(min(page_count, MAX_PDF_PAGES.get(kind, DEFAULT_MAX_PDF_PAGES))):
            pixmap = pdf[index].get_pixmap(matrix=matrix, alpha=False)
            rgb = np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(pixmap.h, pixmap.w, pixmap.n)
            page_boxes, work_img = _ocr_image(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), doc_type=doc_type)
            wh, ww = work_img.shape[:2]
            for box in page_boxes:
                box.update(page=index + 1, page_width=ww, page_height=wh)
            boxes.extend(page_boxes)
            # NIB: the first page already carries the 13-digit number and the company identity
            if kind == "nib" and re.search(r"\b\d{13}\b", " ".join(b.get("text") or "" for b in page_boxes)):
                break
        return boxes, page_count
    finally:
        pdf.close()


def _read_image(path: Path, doc_type: str = "") -> Tuple[Boxes, int]:
    image, page_count = DocumentPreprocessor.load_document(path)
    height, width = image.shape[:2]
    if max(height, width) > MAX_IMAGE_SIDE:
        scale = MAX_IMAGE_SIDE / max(height, width)
        image = cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_AREA)

    boxes, work_img = _ocr_image(image, doc_type=doc_type)
    height, width = work_img.shape[:2]
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


# OCR drops spaces and misreads letters ("ljin" for "Ijin"), so markers are matched on the text with
# everything but letters/digits removed. Only markers that cannot appear on the other document are used.
KITAS_MARKERS = ("KITAS", "KITAP", "TINGGALTERBATAS", "TINGGALTETAP", "NIORA", "LIMITEDSTAY", "STAYPERMIT")
PASSPORT_MARKERS = ("PASSPORT", "PASPOR", "PASSEPORT")
# Blurry photos garble the words ("Terbatex", "Penmit Card"): these count when most of the word survives
KITAS_FUZZY_MARKERS = (("TERBATAS", 6), ("PERMITCARD", 7))
# Passport MRZ line 1 ("P<CHN...<<"), also read with the first "<" as "O"/"0"
PASSPORT_MRZ = re.compile(r"P[<O0][A-Z]{3}[A-Z]*<<|<{6,}")


def _longest_common(text: str, word: str) -> int:
    return SequenceMatcher(None, text, word, autojunk=False).find_longest_match(0, len(text), 0, len(word)).size


def _wrong_document(kind: str, boxes: Boxes) -> str:
    """Returns "kitas"/"passport" when the scan clearly is the other of the two documents, else "".

    A KITAS photographed on top of a passport carries both, so KITAS markers win: the passport tab rejects
    it, the KITAS tab accepts it. Unclear scans (no markers either way) are accepted, not rejected."""
    if kind not in ("passport", "kitas"):
        return ""
    text = "".join(b.get("text") or "" for b in boxes).upper()
    squashed = re.sub(r"[^A-Z0-9<]", "", text)
    has_kitas = any(m in squashed for m in KITAS_MARKERS) or any(
        _longest_common(squashed, word) >= need for word, need in KITAS_FUZZY_MARKERS)
    has_passport = any(m in squashed for m in PASSPORT_MARKERS) or bool(PASSPORT_MRZ.search(squashed))
    if kind == "passport" and has_kitas:
        return "kitas"
    if kind == "kitas" and has_passport and not has_kitas:
        return "passport"
    return ""


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
        boxes, page_count = _read_image(path, doc_type)

    wrong = _wrong_document(doc_type, boxes)
    if wrong:
        return {"status": "wrong_document", "doc_type": doc_type, "type_mismatch": wrong,
                "filename": path.name, "page_count": page_count, "data": {}}

    detected, data = _extract(_resolve_type(doc_type, boxes, path.name), boxes, path)
    return {"status": "success", "doc_type": detected, "filename": path.name, "page_count": page_count, "data": data}
