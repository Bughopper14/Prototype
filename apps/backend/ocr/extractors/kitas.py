"""KITAS / KITAP (Indonesian Stay Permit) OCR field extractor."""
import re
from typing import Any, Dict, List, Optional, Tuple
from app.schemas import KitasSchema
from extractors.shared import extract_custom_targets

def extract_kitas(
    boxes: List[Dict[str, Any]],
    custom_targets: Optional[List[str]] = None
) -> Tuple[KitasSchema, List[Dict[str, Any]]]:
    """
    Specialized Extractor for Indonesian KITAS (Kartu Izin Tinggal Terbatas Elektronik / e-KITAS)
    and KITAP (Kartu Izin Tinggal Tetap).
    Extracts NIORA, Full Name, Nationality, Date of Birth, Sex, Permit Number, Date of Expiry,
    and Issuing Authority.
    """
    kitas = KitasSchema()
    boxes_sorted = sorted(boxes, key=lambda b: (b.get("y_min", 0.0), b.get("x_min", 0.0)))
    full_text = "\n".join([b.get("text", "") for b in boxes_sorted])

    # e-KITAS layout is fixed: each label sits on its own line with the value directly underneath,
    # in the same column. OCR often garbles the labels ("FutL None", "Pereit Nunber"), so labels
    # are matched fuzzily and the value is the nearest non-label line below, inside that column.
    from difflib import SequenceMatcher

    KITAS_KEYS = {
        "niora": ["NIORA"],
        "nama": ["FULLNAME", "NAMALENGKAP"],
        "kewarganegaraan": ["NATIONALITY", "KEWARGANEGARAAN"],
        "tanggal_lahir": ["DATEOFBIRTH", "TGLLAHIR"],
        "jenis_kelamin": ["SEX", "JENISKELAMIN"],
        "permit_number": ["PERMITNUMBER", "NOIZIN", "NOMORIZIN"],
        "berlaku_hingga": ["DATEOFEXPIRY", "BERLAKUHINGGA", "MASABERLAKU"],
    }
    HEADER_WORDS = ["KEMENTERIAN", "DIREKTORAT", "IMIGRASI", "KARTU", "TERBATAS", "SIGNATURE", "TANDA"]

    def norm(t: str) -> str:
        return re.sub(r"[^A-Z0-9]", "", (t or "").upper())

    def label_score(t: str) -> Tuple[float, Optional[str]]:
        n = norm(t)
        if not n:
            return 0.0, None
        best: Tuple[float, Optional[str]] = (0.0, None)
        for key, names in KITAS_KEYS.items():
            for name in names:
                # Short labels (SEX) must match closely, long ones tolerate OCR noise
                r = SequenceMatcher(None, n, name).ratio() if len(name) > 3 else (1.0 if n == name else 0.0)
                if r > best[0]:
                    best = (r, key)
        return best

    def is_kitas_label(t: str) -> bool:
        return label_score(t)[0] >= 0.6 or any(w in norm(t) for w in HEADER_WORDS)

    # Best-matching box per label
    labels: Dict[str, Dict[str, Any]] = {}
    label_ratio: Dict[str, float] = {}
    for b in boxes_sorted:
        r, key = label_score(b.get("text", ""))
        if key and r >= 0.6 and r > label_ratio.get(key, 0.0):
            labels[key], label_ratio[key] = b, r

    def value_below(label: Dict[str, Any]) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
        h = max(label["y_max"] - label["y_min"], 8.0)
        right = label["x_max"] + 8 * h
        for other in labels.values():  # stop at the next label on the same row
            if other is not label and abs(other["y_min"] - label["y_min"]) < h and other["x_min"] > label["x_min"]:
                right = min(right, other["x_min"] - 2)
        cands = [
            c for c in boxes_sorted
            if c is not label
            and c["y_min"] > label["y_min"] + 0.4 * h
            and c["y_min"] - label["y_max"] <= 1.6 * h + 4
            and label["x_min"] - h <= c["x_min"] < right
        ]
        cands.sort(key=lambda c: (c["y_min"], abs(c["x_min"] - label["x_min"])))
        for c in cands:
            txt = c.get("text", "").strip()
            if not txt:
                continue
            if is_kitas_label(txt):
                return None, None  # next label reached: the value is missing/unreadable
            return txt, c
        return None, None

    for key, label in labels.items():
        val, box = value_below(label)
        if not val:
            continue
        if key == "niora":
            token = val.replace(" ", "").upper()
            # The whole value when it looks like a NIORA; otherwise the part starting at an "I"/"1"
            m = re.fullmatch(r"([A-Z0-9]{10,13})", token) or re.search(r"([1I][A-Z0-9]{9,12})", token)
            if not m:
                continue
            n = m.group(1)
            if n.startswith("I") and n[1].isdigit():
                n = "1" + n[1:]
            kitas.niora = n
        elif key == "nama":
            kitas.nama = cls.segment_name(val)
        elif key == "kewarganegaraan":
            kitas.kewarganegaraan = val.upper()
        elif key in ("tanggal_lahir", "berlaku_hingga"):
            if not re.search(r"\d", val):
                continue
            setattr(kitas, key, cls._clean_passport_date(val) or val)
        elif key == "jenis_kelamin":
            u_sex = norm(val)
            if u_sex in ("F", "P", "W", "FEMALE", "PEREMPUAN", "WANITA"):
                kitas.jenis_kelamin = "Perempuan (F)"
            elif u_sex in ("M", "L", "MALE", "LAKILAKI", "PRIA"):
                kitas.jenis_kelamin = "Laki-laki (M)"
            else:
                continue
        elif key == "permit_number":
            m = re.search(r"\b([0-9][A-Z0-9]{8,11})\s*[-.]?\s*([A-Z0-9])\b", val.upper())
            if not m:
                continue
            kitas.permit_number = f"{m.group(1)}-{m.group(2)}"
        box["field_mapping"] = key
    # Regex fallbacks if any fields were missed
    if not kitas.niora:
        for b in boxes_sorted:
            m = re.search(r'\b([1I][A-Z0-9]{9,12})\b', b.get("text", "").upper())
            if m and not any(k in m.group(1) for k in ["REPUBLIK", "INDONESIA", "KEMENTERIAN"]):
                n = m.group(1)
                if n.startswith("I") and n[1].isdigit(): n = "1" + n[1:]
                kitas.niora = n
                b["field_mapping"] = "niora"
                break

    if not kitas.permit_number:
        for b in boxes_sorted:
            m = re.search(r'\b([0-9][A-Z0-9]{8,11})[-.]([A-Z0-9])\b', b.get("text", "").upper())
            if m:
                p = f"{m.group(1)}-{m.group(2)}"
                if p.endswith("-6"): p = p[:-2] + "-Q"
                kitas.permit_number = p
                b["field_mapping"] = "permit_number"
                break

    if not kitas.berlaku_hingga:
        for b in boxes_sorted:
            m = re.search(r'\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\b', b.get("text", ""))
            if m and m.group(1) != kitas.tanggal_lahir:
                kitas.berlaku_hingga = m.group(1)
                b["field_mapping"] = "berlaku_hingga"
                break

    # Small or blurry photos lose the "Date of Birth" / "Nationality" / "Sex" labels (read as "004", ...) and
    # glue the sex letter to the date ("23-07-1972F"). Fall back to the date pattern and the row it sits on.
    if not kitas.tanggal_lahir:
        date_re = re.compile(r"(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\s*([MFLP])?")
        for b in boxes_sorted:
            m = date_re.search(b.get("text", "").upper())
            if not m:
                continue
            found = cls._clean_passport_date(f"{m.group(1)}-{m.group(2)}-{m.group(3)}")
            if found == kitas.berlaku_hingga:
                continue  # the expiry date, not the birth date
            kitas.tanggal_lahir = found
            b["field_mapping"] = "tanggal_lahir"
            if m.group(4) and not kitas.jenis_kelamin:
                kitas.jenis_kelamin = "Perempuan (F)" if m.group(4) in ("F", "P") else "Laki-laki (M)"
            if not kitas.kewarganegaraan:
                row_h = max(b["y_max"] - b["y_min"], 6.0)
                for n in boxes_sorted:
                    if (n is not b and re.fullmatch(r"[A-Z]{3}", n.get("text", "").strip())
                            and abs(n["y_min"] - b["y_min"]) < row_h and n["x_min"] < b["x_min"]):
                        kitas.kewarganegaraan = n["text"].strip()
                        n["field_mapping"] = "kewarganegaraan"
                        break
            break

    # Dynamic Custom Fields
    if custom_targets:
        field_synonyms = {
            "niora": kitas.niora,
            "nomor niora": kitas.niora,
            "no niora": kitas.niora,
            "nama": kitas.nama,
            "nama lengkap": kitas.nama,
            "full name": kitas.nama,
            "kewarganegaraan": kitas.kewarganegaraan,
            "nationality": kitas.kewarganegaraan,
            "tanggal lahir": kitas.tanggal_lahir,
            "tgl lahir": kitas.tanggal_lahir,
            "date of birth": kitas.tanggal_lahir,
            "dob": kitas.tanggal_lahir,
            "jenis kelamin": kitas.jenis_kelamin,
            "sex": kitas.jenis_kelamin,
            "gender": kitas.jenis_kelamin,
            "permit number": kitas.permit_number,
            "nomor permit": kitas.permit_number,
            "no permit": kitas.permit_number,
            "nomor izin": kitas.permit_number,
            "no izin": kitas.permit_number,
            "nomor izin tinggal": kitas.permit_number,
            "berlaku hingga": kitas.berlaku_hingga,
            "tanggal berakhir": kitas.berlaku_hingga,
            "date of expiry": kitas.berlaku_hingga,
            "expiry date": kitas.berlaku_hingga,
            "masa berlaku": kitas.berlaku_hingga,
            "instansi penerbit": kitas.instansi_penerbit
        }

        custom_res = {}
        for target in custom_targets:
            clean_target = target.strip().lower()
            matched = False
            for syn_k, syn_v in field_synonyms.items():
                if clean_target == syn_k or syn_k in clean_target:
                    custom_res[target] = syn_v or "Tidak terdeteksi"
                    matched = True
                    break
            if not matched:
                single_res = extract_custom_targets(full_text, [target])
                custom_res[target] = single_res.get(target, "Tidak terdeteksi")

        kitas.custom_fields = custom_res

    return kitas, boxes

