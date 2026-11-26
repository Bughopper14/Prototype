"""
Template-aligned FAP OCR extractor (OpenCV ORB Homography + 1x Full-Page RapidOCR + Fixed ROI Assignment + Pixel-Density Checkboxes).

Aligns each scanned FAP page to the 2-page master template image, runs RapidOCR once per aligned page
(fast: ~4-6s total), assigns each detected text box to its exact cell ROI, and reads checkboxes by
dark-ink pixel density. Falls back cleanly to the legacy extractor if alignment fails.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

from app.services.ocr_engine import OCREngine

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
ROI_MAP_PATH = TEMPLATES_DIR / "fap_roi_map.json"
RENDER_DPI = 220
ALIGN_SCALE = 0.5
OCR_SCALE = 1.0
MIN_HOMOGRAPHY_INLIERS = 25
CHECKBOX_KEYS = {"custNew", "custExisting", "corporate", "commercial", "micro", "liugongUser"}

_MASTER_CACHE: Dict[Tuple[int, float], Tuple[np.ndarray, Any, Any]] = {}
_ROI_CACHE: Optional[Dict[str, Any]] = None


def _log(msg: str) -> None:
    sys.stderr.write(f"[fap-align] {msg}\n")


def _load_roi_map() -> Optional[Dict[str, Any]]:
    global _ROI_CACHE
    if _ROI_CACHE is not None:
        return _ROI_CACHE
    if not ROI_MAP_PATH.exists():
        return None
    _ROI_CACHE = json.loads(ROI_MAP_PATH.read_text(encoding="utf-8"))
    return _ROI_CACHE


def _get_master(page_num: int, scale: float = ALIGN_SCALE) -> Optional[Tuple[np.ndarray, Any, Any]]:
    cache_key = (page_num, scale)
    if cache_key in _MASTER_CACHE:
        return _MASTER_CACHE[cache_key]
    img_path = TEMPLATES_DIR / f"master_page_{page_num}.png"
    if not img_path.exists():
        return None
    master_bgr = cv2.imread(str(img_path))
    if master_bgr is None:
        return None
    gray = cv2.cvtColor(master_bgr, cv2.COLOR_BGR2GRAY)
    work = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA) if scale < 1.0 else gray
    nfeatures = 2500 if scale < 1.0 else 4500
    orb = cv2.ORB_create(nfeatures=nfeatures)
    kp, desc = orb.detectAndCompute(work, None)
    if desc is None or len(kp) < MIN_HOMOGRAPHY_INLIERS:
        return None
    _MASTER_CACHE[cache_key] = (master_bgr, kp, desc)
    return _MASTER_CACHE[cache_key]


def _align_at_scale(
    scan_bgr: np.ndarray, page_num: int, scale: float, denoise: bool = False
) -> Optional[Tuple[np.ndarray, np.ndarray]]:
    master_bundle = _get_master(page_num, scale=scale)
    if master_bundle is None:
        return None
    master_bgr, kp_m, desc_m = master_bundle
    mh, mw = master_bgr.shape[:2]

    scan_gray = cv2.cvtColor(scan_bgr, cv2.COLOR_BGR2GRAY)
    if denoise:
        scan_gray = cv2.GaussianBlur(scan_gray, (3, 3), 0)
    work = cv2.resize(scan_gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA) if scale < 1.0 else scan_gray
    nfeatures = 2500 if scale < 1.0 else 4500
    orb = cv2.ORB_create(nfeatures=nfeatures)
    kp_s, desc_s = orb.detectAndCompute(work, None)
    if desc_s is None or len(kp_s) < MIN_HOMOGRAPHY_INLIERS:
        return None

    matcher = cv2.BFMatcher(cv2.NORM_HAMMING)
    raw_matches = matcher.knnMatch(desc_s, desc_m, k=2)
    ratio = 0.80 if denoise else 0.75
    good = [m for pair in raw_matches if len(pair) == 2 for m, n in [pair] if m.distance < ratio * n.distance]
    if len(good) < MIN_HOMOGRAPHY_INLIERS:
        return None

    src_pts = np.float32([kp_s[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst_pts = np.float32([kp_m[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    H_work, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 4.0 if scale < 1.0 else 6.0)
    if H_work is None or mask is None:
        return None

    inliers = int(mask.ravel().sum())
    if inliers < MIN_HOMOGRAPHY_INLIERS:
        return None

    if scale < 1.0:
        S = np.diag([scale, scale, 1.0])
        S_inv = np.diag([1.0 / scale, 1.0 / scale, 1.0])
        H = S_inv @ H_work @ S
    else:
        H = H_work

    det = float(np.linalg.det(H[:2, :2]))
    if det <= 0.1 or det > 10.0:
        return None

    warped = cv2.warpPerspective(
        scan_bgr,
        H,
        (mw, mh),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(255, 255, 255),
    )
    _log(f"page {page_num}: aligned cleanly (scale={scale}, denoise={denoise}, matches={len(good)}, inliers={inliers})")
    return warped, H


def _align_to_master(scan_bgr: np.ndarray, page_num: int) -> Optional[Tuple[np.ndarray, np.ndarray]]:
    # Fast half-res pass first (~0.10s); retry at full-res with light denoise for noisy/perspective scans
    res = _align_at_scale(scan_bgr, page_num, ALIGN_SCALE, denoise=False)
    if res is not None:
        return res
    res = _align_at_scale(scan_bgr, page_num, 1.0, denoise=True)
    if res is None:
        _log(f"page {page_num}: alignment failed at both half-res and full-res")
    return res


def _crop_roi(img: np.ndarray, box: Dict[str, Any], inset: int = 4) -> np.ndarray:
    h, w = img.shape[:2]
    x1 = max(0, int(round(box["x1"] * w)) + inset)
    y1 = max(0, int(round(box["y1"] * h)) + inset)
    x2 = min(w, int(round(box["x2"] * w)) - inset)
    y2 = min(h, int(round(box["y2"] * h)) - inset)
    if x2 <= x1 + 2 or y2 <= y1 + 2:
        return np.empty((0, 0, 3), dtype=np.uint8)
    return img[y1:y2, x1:x2]


def _checkbox_ink_score(crop: np.ndarray) -> float:
    if crop.size == 0:
        return 0.0
    h, w = crop.shape[:2]
    my, mx = max(2, int(h * 0.18)), max(2, int(w * 0.14))
    inner = crop[my : max(my + 1, h - my), mx : max(mx + 1, w - mx)]
    if inner.size == 0:
        return 0.0
    gray = cv2.cvtColor(inner, cv2.COLOR_BGR2GRAY)
    return float((gray < 175).sum()) / float(gray.size)


def _pick_checkbox(warped_pages: Dict[int, np.ndarray], cells: Dict[str, Any], options: List[Tuple[str, str]]) -> str:
    best_code = ""
    best_score = 0.008
    for roi_key, code in options:
        box = cells.get(roi_key)
        if not box or box["page"] not in warped_pages:
            continue
        score = _checkbox_ink_score(_crop_roi(warped_pages[box["page"]], box, inset=5))
        if score > best_score:
            best_score = score
            best_code = code
    return best_code


def _mask_and_crop_value_rois(
    img: np.ndarray, cells: Dict[str, Any], page_num: int, inset: int = 1, pad: int = 16
) -> Tuple[np.ndarray, int, int, int, int]:
    """
    Blanks out static template labels/borders outside value ROI cells AND tightly crops the canvas
    to the bounding box of that page's ROIs (e.g. Page 2 is only top 16% of page -> ~7x fewer pixels for DBNet).
    Returns `(cropped_canvas, ox, oy, full_w, full_h)`.
    """
    h, w = img.shape[:2]
    page_boxes = [box for key, box in cells.items() if key not in CHECKBOX_KEYS and box.get("page") == page_num]
    if not page_boxes:
        return np.empty((0, 0, 3), dtype=np.uint8), 0, 0, w, h

    ox1 = max(0, int(min(b["x1"] for b in page_boxes) * w) - pad)
    oy1 = max(0, int(min(b["y1"] for b in page_boxes) * h) - pad)
    ox2 = min(w, int(max(b["x2"] for b in page_boxes) * w) + pad)
    oy2 = min(h, int(max(b["y2"] for b in page_boxes) * h) + pad)

    canvas = np.full((oy2 - oy1, ox2 - ox1, 3), 255, dtype=np.uint8)
    for box in page_boxes:
        x1 = max(0, int(round(box["x1"] * w)) + inset)
        y1 = max(0, int(round(box["y1"] * h)) + inset)
        x2 = min(w, int(round(box["x2"] * w)) - inset)
        y2 = min(h, int(round(box["y2"] * h)) - inset)
        if x2 > x1 + 2 and y2 > y1 + 2:
            canvas[y1 - oy1 : y2 - oy1, x1 - ox1 : x2 - ox1] = img[y1:y2, x1:x2]
    return canvas, ox1, oy1, w, h


def _ocr_aligned_page(img: np.ndarray, cells: Dict[str, Any], page_num: int) -> List[Dict[str, Any]]:
    """Masks & tightly crops to value ROIs, then runs RapidOCR once (use_cls=False) and maps back to 0..1 page coords."""
    cropped, ox, oy, full_w, full_h = _mask_and_crop_value_rois(img, cells, page_num)
    if cropped.size == 0:
        return []
    scale = OCR_SCALE if OCR_SCALE < 1.0 else 1.0
    ocr_img = cv2.resize(cropped, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA) if scale < 1.0 else cropped
    raw_boxes = OCREngine.process_image(ocr_img, use_cls=False)
    out: List[Dict[str, Any]] = []
    for b in raw_boxes:
        txt = str(b.get("text") or "").strip()
        if not txt:
            continue
        cx_px = ox + ((b["x_min"] + b["x_max"]) / 2.0) / scale
        cy_px = oy + ((b["y_min"] + b["y_max"]) / 2.0) / scale
        out.append({
            "text": txt,
            "cx": cx_px / float(full_w),
            "cy": cy_px / float(full_h),
            "x1": (ox + b["x_min"] / scale) / float(full_w),
            "y1": (oy + b["y_min"] / scale) / float(full_h),
        })
    return out


def _read_from_boxes(
    page_boxes: Dict[int, List[Dict[str, Any]]],
    warped_pages: Dict[int, np.ndarray],
    cells: Dict[str, Any],
    key: str,
) -> str:
    box = cells.get(key)
    if not box or box["page"] not in page_boxes:
        return ""
    x1, y1, x2, y2 = box["x1"], box["y1"], box["x2"], box["y2"]
    hits = [b for b in page_boxes[box["page"]] if x1 <= b["cx"] <= x2 and y1 <= b["cy"] <= y2]
    if hits:
        hits.sort(key=lambda b: (round(b["cy"] / 0.004), b["cx"]))
        return re.sub(r"\s+", " ", " ".join(b["text"] for b in hits)).strip()

    # Fallback for tiny values (e.g. "36", "Riau") missed by full-page detector:
    # only runs if the cell actually contains dark ink (>0.4% dark pixels) and uses rec-only (~15ms).
    crop = _crop_roi(warped_pages[box["page"]], box, inset=2)
    if _checkbox_ink_score(crop) <= 0.004:
        return ""
    # Tightly trim white margins around the ink and pad cleanly with white so CRNN never clips edges
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    ys, xs = np.where(gray < 185)
    if ys.size < 12:
        return ""
    ch, cw = crop.shape[:2]
    tight = crop[max(0, int(ys.min()) - 2) : min(ch, int(ys.max()) + 3), max(0, int(xs.min()) - 2) : min(cw, int(xs.max()) + 3)]
    tight = cv2.copyMakeBorder(tight, 6, 6, 10, 10, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    if tight.shape[0] < 36:
        tight = cv2.resize(tight, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    rec = OCREngine.process_image(tight, use_cls=False, use_det=False)
    return re.sub(r"\s+", " ", " ".join(r["text"] for r in rec if r.get("text"))).strip()


def _normalize_date(raw: str) -> str:
    s = raw.strip()
    if not s:
        return ""
    m = re.search(r"(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})", s)
    if m:
        return f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}"
    m = re.search(r"(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})", s)
    if m:
        return f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"
    return s


def _parse_number(raw: str) -> Optional[float]:
    s = raw.strip()
    if not s:
        return None
    cleaned = re.sub(r"[^\d.,]", "", s)
    if not cleaned:
        return None
    if "," in cleaned and "." in cleaned:
        # Both separators present: whichever appears last is the decimal separator
        if cleaned.rfind(".") > cleaned.rfind(","):
            cleaned = cleaned.replace(",", "")
        else:
            cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned:
        if cleaned.count(",") >= 2 or (cleaned.count(",") == 1 and len(cleaned.split(",")[1]) == 3):
            cleaned = cleaned.replace(",", "")
        else:
            cleaned = cleaned.replace(",", ".")
    elif "." in cleaned:
        if cleaned.count(".") >= 2 or (cleaned.count(".") == 1 and len(cleaned.split(".")[1]) == 3):
            cleaned = cleaned.replace(".", "")
    try:
        val = float(cleaned)
        return int(val) if val.is_integer() else val
    except ValueError:
        return None


def _normalize_method(raw: str) -> str:
    u = re.sub(r"[\s_-]+", "", raw.upper())
    if not u:
        return ""
    if "FINANCIAL" in u or "SEWA" in u:
        return "FINANCIAL-LEASE"
    if "SALE" in u or "SLB" in u or "KEMBALI" in u:
        return "SALE-AND-LEASE-BACK"
    if "INSTALLMENT" in u or "ANGSURAN" in u or "PEMBELIAN" in u:
        return "INSTALLMENT-FINANCING"
    return raw.strip()


def _normalize_payment(raw: str) -> str:
    u = re.sub(r"[\s_-]+", "", raw.upper())
    if not u:
        return ""
    if "ADVANCE" in u or "MUKA" in u:
        return "IN-ADVANCE"
    if "ARREAR" in u or "BELAKANG" in u:
        return "IN-ARREAR"
    return raw.strip()


def _normalize_currency(raw: str) -> str:
    u = re.sub(r"[^A-Z0-9$]", "", raw.upper())
    if not u:
        return ""
    if u in {"IDR", "DR", "1DR", "LDR", "RP", "RUPIAH"}:
        return "IDR"
    if u in {"USD", "US$", "US", "USS", "JSS", "DOLLAR"}:
        return "USD"
    if u in {"CNY", "NY", "RMB"}:
        return "CNY"
    if u in {"SGD", "SG$"}:
        return "SGD"
    if u in {"EUR", "UR", "EURO"}:
        return "EUR"
    return u


def _render_input_pages(
    path: Optional[Path], data: Optional[bytes] = None, filename: str = ""
) -> Tuple[List[np.ndarray], List[List[Tuple[float, float, str]]]]:
    """
    Renders up to 4 pages to BGR images at RENDER_DPI, and for digital PDFs also captures
    selectable word centers `(cx_px, cy_px, text)` in the rendered pixel space for instant (<0.4s) extraction.
    """
    suffix = (path.suffix if path else Path(filename).suffix).lower()
    if suffix == ".pdf":
        import pymupdf

        doc = pymupdf.open(stream=data, filetype="pdf") if data is not None else pymupdf.open(str(path))
        pages: List[np.ndarray] = []
        digital_words: List[List[Tuple[float, float, str]]] = []
        pt_to_px = RENDER_DPI / 72.0
        try:
            for i in range(min(4, len(doc))):
                page = doc[i]
                pix = page.get_pixmap(dpi=RENDER_DPI)
                arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
                bgr = cv2.cvtColor(arr[:, :, :3], cv2.COLOR_RGB2BGR)
                pages.append(bgr)
                raw_w = page.get_text("words") or []
                if len(raw_w) >= 25:
                    digital_words.append([
                        (((w[0] + w[2]) / 2.0) * pt_to_px, ((w[1] + w[3]) / 2.0) * pt_to_px, str(w[4]).strip())
                        for w in raw_w
                        if str(w[4]).strip()
                    ])
                else:
                    digital_words.append([])
        finally:
            doc.close()
        return pages, digital_words

    if data is not None:
        buf = np.frombuffer(data, dtype=np.uint8)
        img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    else:
        img = cv2.imread(str(path))
    return ([img], [[]]) if img is not None else ([], [])


def _project_digital_words(
    words: List[Tuple[float, float, str]], H: np.ndarray, mw: int, mh: int
) -> List[Dict[str, Any]]:
    """Projects PDF digital word centers through homography H into master normalized (0..1) coords (~2ms)."""
    pts = np.float32([[[x, y]] for x, y, _ in words])
    proj = cv2.perspectiveTransform(pts, H)
    out: List[Dict[str, Any]] = []
    for (_, _, txt), pt in zip(words, proj):
        cx = float(pt[0][0]) / float(mw)
        cy = float(pt[0][1]) / float(mh)
        if 0.0 <= cx <= 1.0 and 0.0 <= cy <= 1.0:
            out.append({"text": txt, "cx": cx, "cy": cy, "x1": cx, "y1": cy})
    return out


def extract_fap_aligned(
    path: Optional[Path], data: Optional[bytes] = None, filename: str = ""
) -> Optional[Tuple[Dict[str, Any], int]]:
    """
    Runs Template Alignment + (Digital PDF fast-path OR Tight-Cropped ROI RapidOCR) + Pixel-Density Checkboxes.
    Returns `(data_dict, page_count)` on success, or `None` if alignment fails.
    """
    roi_map = _load_roi_map()
    if not roi_map or not roi_map.get("cells"):
        return None

    pages, digital_words = _render_input_pages(path, data=data, filename=filename)
    if not pages:
        return None

    warped_pages: Dict[int, np.ndarray] = {}
    page_homographies: Dict[int, np.ndarray] = {}
    matched_digital: Dict[int, List[Tuple[float, float, str]]] = {}
    used_idx: set[int] = set()
    # Match master page 1 first, then master page 2 across remaining input pages (handles overflow/cover pages)
    for target_master in (1, 2):
        for idx, page_img in enumerate(pages):
            if idx in used_idx:
                continue
            aligned = _align_to_master(page_img, target_master)
            if aligned is not None:
                warped_pages[target_master], page_homographies[target_master] = aligned
                matched_digital[target_master] = digital_words[idx]
                used_idx.add(idx)
                break

    # Require at least page 1 to align cleanly; otherwise fall back
    if 1 not in warped_pages:
        return None

    cells = roi_map["cells"]
    page_boxes: Dict[int, List[Dict[str, Any]]] = {}
    for pnum, img in warped_pages.items():
        dwords = matched_digital.get(pnum) or []
        if dwords:
            mh, mw = img.shape[:2]
            page_boxes[pnum] = _project_digital_words(dwords, page_homographies[pnum], mw, mh)
        else:
            page_boxes[pnum] = _ocr_aligned_page(img, cells, pnum)

    read = lambda key: _read_from_boxes(page_boxes, warped_pages, cells, key)

    customer_status = _pick_checkbox(warped_pages, cells, [("custNew", "NEW"), ("custExisting", "EXISTING")])
    company_type = _pick_checkbox(
        warped_pages,
        cells,
        [
            ("corporate", "CORPORATE"),
            ("commercial", "COMMERCIAL"),
            ("micro", "MICRO"),
            ("liugongUser", "LIUGONG-USER"),
        ],
    )

    fap_number = read("fapNumber")
    app_date = _normalize_date(read("applicationDate"))
    branch_code = read("branchCode").replace(" ", "")
    company_name = read("companyName")
    company_address = read("companyAddress")
    city = read("city")
    province = read("province")
    postal_code = re.sub(r"\D", "", read("postalCode"))
    phone_fax = re.sub(r"[^\d+()\-/\s]", "", read("phoneFax")).strip()
    email = read("email").replace(" ", "")
    website = read("website").replace(" ", "")
    main_business = read("mainBusiness")
    repayment_source = read("repaymentSource")
    location_status = read("locationStatus")
    est_act_no = read("establishmentActNo")
    est_date = _normalize_date(read("establishmentDate"))
    exp_years = re.sub(r"\D", "", read("experienceYears"))
    exp_months = re.sub(r"\D", "", read("experienceMonths"))
    latest_deed_no = read("latestDeedNo")
    latest_deed_date = _normalize_date(read("latestDeedDate"))
    nib = re.sub(r"\D", "", read("nib"))
    npwp = read("npwp").replace(" ", "")

    pic_name = read("picName")
    pic_position = read("picPosition")
    pic_phone = re.sub(r"[^\d+()\-/\s]", "", read("picPhone")).strip()
    pic_email = read("picEmail").replace(" ", "")
    pic_address = read("picAddress")
    pic_city = read("picCity")
    pic_province = read("picProvince")
    pic_postal_code = re.sub(r"\D", "", read("picPostalCode"))

    _sh_headers = {
        "name", "nama", "position", "jabatan", "amount of share", "amount of shares",
        "% share", "%share", "no", "shareholder", "pemegang saham",
    }
    stakeholders: List[Dict[str, str]] = []
    for row_i in range(3):
        sh_name = read(f"sh{row_i}_name")
        if not sh_name or sh_name.strip().lower() in _sh_headers:
            continue
        sh_pos = read(f"sh{row_i}_pos")
        sh_shares = read(f"sh{row_i}_shares")
        sh_pct = read(f"sh{row_i}_pct")
        stakeholders.append(
            {
                "name": sh_name,
                "position": "" if sh_pos.strip().lower() in _sh_headers else sh_pos,
                "shares": "" if sh_shares.strip().lower() in _sh_headers else sh_shares,
                "sharePercentage": "" if sh_pct.strip().lower() in _sh_headers else sh_pct,
            }
        )

    financing_method = _normalize_method(read("financingMethod"))
    financing_value = _parse_number(read("financingValue"))
    application_source = read("applicationSource")

    # If the financingMethod cell was empty/unreadable, infer from which Terms & Conditions block is filled
    if not financing_method:
        def _block_score(prefix: str) -> int:
            return sum(1 for s in ("Currency", "Rate", "Tenor", "Payment") if read(f"{prefix}{s}"))
        scores = [
            (_block_score("fl"), "FINANCIAL-LEASE"),
            (_block_score("if"), "INSTALLMENT-FINANCING"),
            (_block_score("slb"), "SALE-AND-LEASE-BACK"),
        ]
        scores.sort(key=lambda x: x[0], reverse=True)
        if scores[0][0] > 0 and (len(scores) < 2 or scores[0][0] > scores[1][0]):
            financing_method = scores[0][1]

    prefix_order = (
        ["fl", "if", "slb"]
        if financing_method == "FINANCIAL-LEASE"
        else ["slb", "if", "fl"]
        if financing_method == "SALE-AND-LEASE-BACK"
        else ["if", "fl", "slb"]
    )

    def pick_term(suffix: str) -> str:
        for p in prefix_order:
            val = read(f"{p}{suffix}")
            if val:
                return val
        return ""

    currency = _normalize_currency(pick_term("Currency"))
    interest_rate = _parse_number(pick_term("Rate"))
    tenor_months = _parse_number(pick_term("Tenor"))
    payment_method = _normalize_payment(pick_term("Payment"))
    facility_purpose = pick_term("Purpose")
    down_payment_val = _parse_number(read("ifDownPayment"))
    security_deposit = _parse_number(read("flDeposit") or read("slbDeposit"))

    data: Dict[str, Any] = {
        "fapNumber": fap_number,
        "applicationDate": app_date,
        "branchCode": branch_code,
        "companyName": company_name,
        "customerCategory": customer_status,
        "customerStatus": customer_status,
        "companyType": company_type,
        "nib": nib,
        "npwp": npwp,
        "establishmentActNo": est_act_no,
        "establishmentDate": est_date,
        "experienceYears": exp_years,
        "experienceMonths": exp_months,
        "latestDeedNo": latest_deed_no,
        "latestDeedDate": latest_deed_date,
        "companyAddress": company_address,
        "rt": "",
        "rw": "",
        "city": city,
        "province": province,
        "postalCode": postal_code,
        "phoneFax": phone_fax,
        "email": email,
        "website": website,
        "mainBusiness": main_business,
        "repaymentSource": repayment_source,
        "locationStatus": location_status,
        "picName": pic_name,
        "picPosition": pic_position,
        "picPhone": pic_phone,
        "picEmail": pic_email,
        "picAddress": pic_address,
        "picCity": pic_city,
        "picProvince": pic_province,
        "picPostalCode": pic_postal_code,
        "financingValue": financing_value,
        "downPaymentValue": down_payment_val,
        "securityDeposit": security_deposit,
        "tenorMonths": int(tenor_months) if tenor_months is not None else None,
        "facilityPurpose": facility_purpose,
        "financingMethod": financing_method,
        "interestRate": interest_rate,
        "paymentMethod": payment_method,
        "applicationSource": application_source,
        "currency": currency,
        "stakeholders": stakeholders,
        "shareholders": stakeholders,
        "raw_text": "",
    }
    return data, len(pages)
