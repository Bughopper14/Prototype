"""Document OCR pipeline, shared by the one-shot CLI (ocr_cli.py) and the long-lived worker (ocr_worker.py)."""
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

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


def _respace_nib_boxes(gray: np.ndarray, boxes: Boxes) -> Boxes:
    """Splits NIB lines that came back without spaces at the visual word gaps; a line is only replaced when no character was lost or changed."""
    squash = lambda text: re.sub(r"[\W_]", "", str(text or "")).lower()
    refined = DocumentPreprocessor.refine_ktp_box_spacing(gray, [dict(b) for b in boxes], OCREngine.get_engine())
    for box, new in zip(boxes, refined):
        # the splitter also cuts numbers ("031 35571 81", "201 9"): digits are put back together
        text = re.sub(r"(?<=\d) (?=\d)", "", str(new.get("text") or ""))
        if " " in text and squash(text) == squash(box.get("text")):
            box["text"] = text
    return boxes


def _recover_nib_name(image: np.ndarray, boxes: Boxes) -> Boxes:
    """When the detector found the label "Nama Pelaku Usaha" but no text to its right, reads that strip of the page on its own."""
    label = next((b for b in boxes if re.search(r"nama\s*(?:pelaku\s*usaha|perusahaan|perseroan)", str(b.get("text") or ""), re.IGNORECASE)), None)
    if not label or re.search(r"nama\s*(?:pelaku\s*usaha|perusahaan|perseroan)\s*[:：]?\s*\S{4,}", str(label.get("text") or ""), re.IGNORECASE):
        return boxes
    h, w = image.shape[:2]
    yc = (label["y_min"] + label["y_max"]) / 2
    same_row = max(8, (label["y_max"] - label["y_min"]) * 0.5)
    if any(b is not label and abs((b["y_min"] + b["y_max"]) / 2 - yc) < same_row and b["x_min"] >= label["x_max"] - 20 for b in boxes):
        return boxes
    row_h = label["y_max"] - label["y_min"]
    # the detector is sensitive to how much of the neighbouring rows it sees: try a few windows until the row of the label gives text
    for factor in (0.6, 1.0, 1.5, 0.3, 2.0):
        pad = int(max(6, row_h * factor))
        x1, y1, y2 = int(label["x_max"]) + 4, max(0, int(label["y_min"]) - pad), min(h, int(label["y_max"]) + pad)
        strip = image[y1:y2, x1:w]
        if strip.size == 0:
            continue
        row_y = yc - y1
        found = [b for b in OCREngine.process_image(strip) if abs((b["y_min"] + b["y_max"]) / 2 - row_y) < row_h * 0.6]
        if found:
            break
    if not found:
        return boxes
    found.sort(key=lambda b: b["x_min"])
    text = " ".join(str(b.get("text") or "").strip() for b in found).strip()
    if len(text) < 4:
        return boxes
    boxes.append({**found[0], "text": text, "x_min": x1 + found[0]["x_min"], "x_max": x1 + found[-1]["x_max"], "y_min": label["y_min"], "y_max": label["y_max"], "confidence": float(found[0].get("confidence") or 0.5)})
    return boxes


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
    if doc_type == "nib" and boxes:
        # the recognizer often returns the lines of a scanned NIB without spaces: split them at the visual word gaps
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
            boxes = _respace_nib_boxes(gray, boxes)
            boxes = _recover_nib_name(image, boxes)
        except Exception as error:
            _log(f"NIB spacing/name recovery skipped: {error}")
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


def _read_pdf(path: Optional[Path], doc_type: str, data: Optional[bytes] = None, name: str = "") -> Tuple[Boxes, int]:
    import pymupdf

    name = name or (path.name if path else "")
    pdf = pymupdf.open(stream=data, filetype="pdf") if data is not None else pymupdf.open(str(path))
    try:
        page_count = len(pdf)
        digital = _digital_text_boxes(pdf)
        if len(digital) >= DIGITAL_TEXT_MIN_LINES and doc_type != "ktp":
            return digital, page_count

        kind = "nib" if doc_type == "nib" or "nib" in name.lower() else (
            "fap" if doc_type == "fap" or "fap" in name.lower() else doc_type)
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


def _read_image(path: Optional[Path], doc_type: str = "", data: Optional[bytes] = None, name: Optional[str] = None) -> Tuple[Boxes, int]:
    image, page_count = DocumentPreprocessor.load_document(path, data, name)
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


def _extract(kind: str, boxes: Boxes, path: Optional[Path]) -> Tuple[str, Dict[str, Any]]:
    if kind != "nib":
        # the text lines of a digital PDF only carry their block as "box": the extractors read x_min / y_max (a NIB uploaded as a KITAS used to crash on it)
        for i, b in enumerate(boxes):
            if "y_max" not in b and isinstance(b.get("box"), (list, tuple)) and len(b["box"]) == 4:
                b.update(x_min=b["box"][0], y_min=b["box"][1], x_max=b["box"][2], y_max=b["box"][3])
            b.setdefault("id", i)
    if kind == "fap":
        return "fap", forms.extract_fap(boxes, pdf_path=str(path) if path else None)[0]
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


def process_document(file_path: Optional[str], doc_type: str = "auto", data: Optional[bytes] = None, name: Optional[str] = None) -> Dict[str, Any]:
    """Reads one document, from a file (`file_path`) or from its bytes (`data` with its `name`: nothing is written to disk), and returns
    {status, doc_type, filename, page_count, data}. Raises on failure."""
    if data is not None:
        path = None
        filename = Path(name or "document").name
    else:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        filename = path.name

    doc_type = (doc_type or "auto").strip().lower()
    boxes: Boxes = []
    page_count = 1
    if Path(filename).suffix.lower() == ".pdf":
        try:
            boxes, page_count = _read_pdf(path, doc_type, data, filename)
        except Exception as error:  # fall back to the image path below
            _log(f"PDF extraction note: {error}")
    if not boxes:
        boxes, page_count = _read_image(path, doc_type, data, filename)

    wrong = _wrong_document(doc_type, boxes)
    if wrong:
        return {"status": "wrong_document", "doc_type": doc_type, "type_mismatch": wrong,
                "filename": filename, "page_count": page_count, "data": {}}

    detected, data = _extract(_resolve_type(doc_type, boxes, filename), boxes, path)
    return {"status": "success", "doc_type": detected, "filename": filename, "page_count": page_count, "data": data}
