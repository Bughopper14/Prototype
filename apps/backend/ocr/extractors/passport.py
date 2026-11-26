"""Passport (MRZ + VIZ) OCR field extractor."""
import re
from typing import Any, Dict, List, Optional, Tuple
from app.schemas import PassportSchema
from extractors.shared import extract_custom_targets

def _has_non_latin(s: str) -> bool:
    return bool(re.search(r'[\u4e00-\u9fff\u3040-\u30ff\u0600-\u06ff\u0400-\u04ff]', s))

def _clean_passport_date(raw: str) -> Optional[str]:
    if not raw:
        return None
    s = raw.strip().upper()
    m_num = re.search(r'\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b', s)
    if m_num:
        d = int(m_num.group(1))
        m = int(m_num.group(2))
        y = m_num.group(3)
        return f"{d:02d}-{m:02d}-{y}"
    m_word = re.search(r'\b(\d{1,2})\s*[-/]?\s*([A-Za-z]+|[\u4e00-\u9fff]+)\s*[-/]?\s*(\d{4})\b', s)
    if m_word:
        d = int(m_word.group(1))
        m_txt = m_word.group(2)
        y = m_word.group(3)
        m_eng = re.search(r'(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)', m_txt)
        if m_eng:
            return f"{d:02d} {m_eng.group(1)} {y}"
        return f"{d:02d} {m_txt} {y}"
    return s

def _format_mrz_date(yymmdd: str, is_dob: bool = False) -> str:
    MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    if len(yymmdd) != 6 or not yymmdd.isdigit():
        return yymmdd
    yy = int(yymmdd[0:2])
    mm = int(yymmdd[2:4])
    dd = int(yymmdd[4:6])
    m_str = MONTHS[mm - 1] if 1 <= mm <= 12 else f"{mm:02d}"
    year = (1900 + yy) if (is_dob and yy > 25) else (2000 + yy)
    return f"{dd:02d} {m_str} {year}"

def _parse_mrz(boxes: List[Dict[str, Any]]) -> Tuple[Optional[str], Optional[str], float, Dict[str, Any]]:
    sorted_y = sorted(boxes, key=lambda b: b.get("y_min", 0.0))
    if len(sorted_y) < 2:
        return None, None, 99999.0, {}

    def clean_mrz(t: str) -> str:
        t = t.replace("人", "<").replace(" ", "").replace("«", "<<")
        t = re.sub(r'E{2,}', '<<', t)
        return t

    line1_cand = None
    line2_cand = None

    # Search candidates from bottom up (last 8 boxes)
    bottom_boxes = sorted_y[-8:] if len(sorted_y) >= 8 else sorted_y
    for b in bottom_boxes:
        c_txt = clean_mrz(b.get("text", ""))
        # Check Line 1: Starts with P, length >= 20, contains country code and << or names
        if re.search(r'^P[<A-Z0-9]{1,2}[A-Z]{3}[A-Z0-9<]{10,}', c_txt):
            line1_cand = (b, c_txt)
        # Check Line 2: Passport number (8-10 chars) + nationality (3) + DOB (6) + sex + expiry (6)
        elif re.search(r'([A-Z0-9<]{8,10}\d?[A-Z]{3}\d{6}\d[MF<SK]\d{6})', c_txt):
            line2_cand = (b, c_txt)

    # Fallback to last 2 boxes if candidate scan didn't find both
    if not (line1_cand and line2_cand):
        b_last = sorted_y[-1]
        b_prev = sorted_y[-2]
        txt_last = clean_mrz(b_last.get("text", ""))
        txt_prev = clean_mrz(b_prev.get("text", ""))
        if ("<" in txt_last or len(txt_last) >= 20) and (txt_prev.startswith("P") or "<" in txt_prev or len(txt_prev) >= 20):
            line1_cand = (b_prev, txt_prev)
            line2_cand = (b_last, txt_last)

    if not (line1_cand and line2_cand):
        return None, None, 99999.0, {}

    b1, txt_prev = line1_cand
    b2, txt_last = line2_cand

    mrz_start_y = min(b1.get("y_min", 99999.0), b2.get("y_min", 99999.0)) - 5.0
    info = {}

    # Line 1 parsing: P<ISSUE_COUNTRY(3)SURNAME<<GIVEN_NAMES
    m1 = re.search(r'^P[<A-Z0-9]([A-Z]{3})([A-Z0-9<]+)', txt_prev)
    if m1:
        info["country_code"] = m1.group(1)
        raw_names = m1.group(2)
        name_parts = [p.replace("<", " ").strip() for p in raw_names.split("<<") if p.replace("<", " ").strip()]
        if len(name_parts) >= 2:
            info["surname"] = name_parts[0]
            g_names = re.sub(r'[^A-Z\s]', '', name_parts[1]).strip()
            info["given_names"] = g_names
            info["nama"] = f"{name_parts[0]} {g_names}".strip()
        elif len(name_parts) == 1:
            info["nama"] = name_parts[0]

    # Line 2 parsing
    m2 = re.search(r'([A-Z0-9<]{9})([0-9<]?)([A-Z]{3})(\d{6})\d([MF<SK])(\d{6})', txt_last)
    if m2:
        info["passport_number"] = m2.group(1).replace("<", "")
        info["nationality"] = m2.group(3)
        info["dob"] = _format_mrz_date(m2.group(4), is_dob=True)
        sex_ch = m2.group(5)
        info["sex"] = "Laki-laki (M)" if sex_ch in ["M", "K"] else ("Perempuan (F)" if sex_ch in ["F", "S", "P"] else None)
        info["expiry"] = _format_mrz_date(m2.group(6), is_dob=False)

    return txt_prev, txt_last, mrz_start_y, info

def _find_viz_value(
    label_box: Dict[str, Any],
    viz_boxes: List[Dict[str, Any]],
    is_name: bool = False,
    allow_multiline: bool = False,
    max_y_dist: float = 65.0
) -> Tuple[Optional[str], Optional[str], List[Dict[str, Any]]]:
    lbl_x1, lbl_x2 = label_box["x_min"], label_box["x_max"]
    lbl_y1, lbl_y2 = label_box["y_min"], label_box["y_max"]
    lbl_w = lbl_x2 - lbl_x1
    lbl_cx = (lbl_x1 + lbl_x2) / 2

    LABEL_KEYS = [
        "PASSPORT", "PASPOR", "TYPE", "TIPE", "JENIS", "COUNTRY", "KODE NEGARA", "CODE",
        "SURNAME", "GIVEN", "FULL NAME", "FULLNAME", "NAMALENGKAP", "NAMA LENGKAP",
        "NATIONALITY", "KEWARGANEGARAAN", "DATE OF BIRTH", "DATE OF ISSUE", "DATE OF EXPIRY",
        "TGL. LAHIR", "TGL.LAHIR", "TGL. PENGELUARAN", "TGL.PENGELUARAN", "TGL. HABIS BERLAKU", "TGL.HABISBERLAKU",
        "PLACE OF BIRTH", "TEMPAT LAHIR", "TEMPATLAHIR", "SEX", "KELAMIN",
        "AUTHORITY", "ISSUING", "KANTOR YANG MENGELUARKAN", "PERSONAL ID", "REG. NO", "REG.NO",
        "生年月日", "出生日期", "発行年月日", "签发日期", "發照日期", "有効期間満了日", "有效期至", "效期截止日期",
        "国籍", "國籍", "本籍", "出生地", "性别", "性別", "姓", "名", "姓名", "旅券番号", "护照号码", "護照號碼",
        "外文别名", "外文別名", "别名", "別名", "ALIA", "ALSO KNOWN AS"
    ]

    def is_label(t: str) -> bool:
        u = t.upper().strip()
        if "/" in u or "NATIONALITY" in u or "KEWARGANEGARAAN" in u or "BIRTH" in u or "ISSUE" in u or "EXPIRY" in u or "AUTHORITY" in u or "PASSPORT" in u or "PASPOR" in u or "ALSO KNOWN" in u or "AS" in u:
            return True
        if any(u == k or u.startswith(k + ":") or u.startswith(k + " ") for k in ["TYPE", "PASSPORT NO", "CODE", "SEX", "AUTHORITY", "DATE OF BIRTH", "DATE OF ISSUE", "DATE OF EXPIRY", "JENIS", "NEGARA", "KEWARGANEGARAAN"]):
            return True
        return False

    below_candidates = []
    beside_candidates = []

    for b in viz_boxes:
        if b["id"] == label_box["id"]:
            continue
        bx1, bx2 = b["x_min"], b["x_max"]
        by1, by2 = b["y_min"], b["y_max"]
        bcx = (bx1 + bx2) / 2
        y_diff = by1 - lbl_y2
        y_overlap = min(lbl_y2, by2) - max(lbl_y1, by1)
        x_overlap = min(lbl_x2, bx2) - max(lbl_x1, bx1)

        if -18 <= y_diff <= max_y_dist and (x_overlap > 10 or abs(bcx - lbl_cx) < max(lbl_w * 0.7, 60) or x_overlap > -30):
            below_candidates.append(b)

        if y_overlap > 5 and bx1 > lbl_x1 and (bx1 - lbl_x2) < 70:
            beside_candidates.append(b)

    below_candidates.sort(key=lambda c: (
        c["y_min"] // 25,
        -max(0.0, min(lbl_x2, c["x_max"]) - max(lbl_x1, c["x_min"])),
        abs((c["x_min"] + c["x_max"]) / 2 - lbl_cx)
    ))
    beside_candidates.sort(key=lambda x: x["x_min"])

    if beside_candidates and not below_candidates:
        first_b = beside_candidates[0]
        if not is_label(first_b.get("text", "")):
            return first_b.get("text", "").strip(), None, [first_b]

    if not below_candidates:
        return None, None, []

    latin_val = None
    native_val = None
    used_boxes = []

    for b in below_candidates:
        txt = b.get("text", "").strip()
        if not txt:
            continue
        if any(w in txt.upper() for w in ["SPECIMEN", "SAMPLE", "NOT VALID", "PASSPORT", "PASPOR", "旅券", "护照"]):
            continue
        if is_label(txt):
            break

        if is_name:
            if _has_non_latin(txt):
                if not native_val:
                    native_val = txt
                    used_boxes.append(b)
            else:
                if not latin_val:
                    latin_val = txt
                    used_boxes.append(b)
                elif allow_multiline:
                    latin_val += " " + txt
                    used_boxes.append(b)
        else:
            if not latin_val:
                latin_val = txt
                used_boxes.append(b)
                if not allow_multiline:
                    break
            elif allow_multiline:
                latin_val += " " + txt
                used_boxes.append(b)

    return latin_val, native_val, used_boxes

def extract_passport(
    boxes: List[Dict[str, Any]],
    custom_targets: Optional[List[str]] = None
) -> Tuple[PassportSchema, List[Dict[str, Any]]]:
    """
    Specialized International & Indonesian Passport Extractor.
    Leverages Machine Readable Zone (MRZ ICAO Doc 9303 TD3) and Visual Inspection Zone (VIZ)
    to extract Passport Number, Full Name (with Latin and native scripts), Country,
    Nationality, Date of Birth, Sex, Place of Birth, Issue/Expiry Dates, and Authority.
    """
    passport = PassportSchema()
    full_text = "\n".join([b.get("text", "") for b in boxes])
    boxes_sorted = sorted(boxes, key=lambda b: (b.get("y_min", 0.0), b.get("x_min", 0.0)))

    COUNTRY_MAP = {
        "IDN": "INDONESIA", "JPN": "JAPAN", "TWN": "TAIWAN", "CHN": "CHINA",
        "USA": "UNITED STATES OF AMERICA", "GBR": "UNITED KINGDOM", "MYS": "MALAYSIA",
        "SGP": "SINGAPORE", "THA": "THAILAND", "PHL": "PHILIPPINES", "VNM": "VIETNAM",
        "AUS": "AUSTRALIA", "KOR": "SOUTH KOREA", "DEU": "GERMANY", "FRA": "FRANCE",
        "NLD": "NETHERLANDS", "CAN": "CANADA", "SAU": "SAUDI ARABIA", "ARE": "UNITED ARAB EMIRATES",
        "IND": "INDIA"
    }

    # 1. Parse MRZ at the bottom of the passport
    line1, line2, mrz_start_y, mrz_info = _parse_mrz(boxes_sorted)
    if line1 and line2:
        passport.mrz_line1 = line1
        passport.mrz_line2 = line2
        passport.country_code = mrz_info.get("country_code")
        passport.passport_number = mrz_info.get("passport_number")
        passport.surname = mrz_info.get("surname")
        passport.given_names = mrz_info.get("given_names")
        passport.nama = mrz_info.get("nama")
        passport.nationality = mrz_info.get("nationality")
        passport.tanggal_lahir = mrz_info.get("dob")
        passport.jenis_kelamin = mrz_info.get("sex")
        passport.tanggal_berlaku = mrz_info.get("expiry")

    # 2. VIZ Processing (Candidate boxes strictly above MRZ)
    viz_boxes = [b for b in boxes_sorted if b.get("y_max", 0.0) <= mrz_start_y]
    viz_nama = None

    for b in viz_boxes:
        txt = b.get("text", "").strip()
        upper = txt.upper()

        # A. Passport Number
        if any(k in upper for k in ["PASSPORT NO", "PASSPORTNO", "NO.PASPOR", "NO. PASPOR", "旅券番号", "护照号码", "護照號碼"]) or ("PASSPORT" in upper and "NO" in upper):
            val, _, used = _find_viz_value(b, viz_boxes)
            if val:
                m = re.search(r'([A-Z0-9]{7,10})', val.replace(" ", "").upper())
                if m:
                    viz_num = m.group(1)
                    # Avoid replacing valid MRZ number (e.g. X000000) with reversed perforation (000000X)
                    if not (passport.passport_number and re.match(r'^[A-Z]\d+$', passport.passport_number) and re.match(r'^\d+[A-Z]$', viz_num)):
                        passport.passport_number = viz_num
                    for ub in used: ub["field_mapping"] = "passport_number"

        # B. Full Name (Combined Surname & Given Name)
        elif any(k in upper for k in ["FULL NAME", "FULLNAME", "NAMALENGKAP", "NAMA LENGKAP", "姓名", "NAME(SURNAME"]):
            val, nat, used = _find_viz_value(b, viz_boxes, is_name=True)
            if val:
                viz_nama = val.strip(", ")
                if "NAMALENGKAP" in viz_nama.upper():
                    viz_nama = "NAMA LENGKAP"
                passport.nama = cls.segment_name(viz_nama)
                for ub in used: ub["field_mapping"] = "nama"
            if nat:
                passport.nama_native = nat

        # C. Surname
        elif any(k in upper for k in ["SURNAME", "姓", "NOM"]) and "GIVEN" not in upper and "NAME" not in upper:
            val, nat, used = _find_viz_value(b, viz_boxes, is_name=True)
            if val:
                passport.surname = val.strip(", ")
                for ub in used: ub["field_mapping"] = "surname"
            if nat:
                passport.nama_native = nat

        # D. Given Name
        elif any(k in upper for k in ["GIVEN NAME", "GIVENNAME", "PRENOM", "名"]) and "SURNAME" not in upper and "ISSUE" not in upper:
            val, _, used = _find_viz_value(b, viz_boxes, is_name=True)
            if val:
                passport.given_names = val.strip(", ")
                for ub in used: ub["field_mapping"] = "given_names"

        # E. Date of Birth
        elif any(k in upper for k in ["DATE OF BIRTH", "DATEOF BIRTH", "DATEOFBIRTH", "TGL.LAHIR", "TGL. LAHIR", "生年月日", "出生日期"]):
            val, _, used = _find_viz_value(b, viz_boxes)
            if val:
                c_date = _clean_passport_date(val)
                if c_date and re.search(r'\d{4}', c_date):
                    passport.tanggal_lahir = c_date
                    for ub in used: ub["field_mapping"] = "tanggal_lahir"

        # F. Place of Birth
        elif any(k in upper for k in ["PLACE OF BIRTH", "PLACEOF BIRTH", "PLACEOFBRTH", "TEMPAT LAHIR", "TEMPATLAHIR", "本籍", "出生地"]):
            val, _, used = _find_viz_value(b, viz_boxes)
            if val:
                if "/" in val:
                    val = val.split("/")[-1].strip()
                val = val.replace("Tokr", "TOKYO").strip(", ")
                passport.tempat_lahir = val
                for ub in used: ub["field_mapping"] = "tempat_lahir"

        # G. Nationality
        elif any(k in upper for k in ["NATIONALITY", "KEWARGANEGARAAN", "国籍", "國籍"]):
            val, _, used = _find_viz_value(b, viz_boxes, allow_multiline=True)
            if val:
                if "/" in val:
                    val = val.split("/")[-1].strip()
                passport.nationality = val.strip(", ")
                for ub in used: ub["field_mapping"] = "nationality"

        # H. Sex / Kelamin
        elif any(k in upper for k in ["SEX", "KELAMIN", "性别", "性別"]) and "DATE" not in upper:
            val, _, used = _find_viz_value(b, viz_boxes)
            if val:
                clean_sex = val.upper()
                if "F" in clean_sex or "P" in clean_sex or "S" in clean_sex or "女" in clean_sex:
                    passport.jenis_kelamin = "Perempuan (F)"
                elif "M" in clean_sex or "L" in clean_sex or "K" in clean_sex or "男" in clean_sex:
                    passport.jenis_kelamin = "Laki-laki (M)"
                for ub in used: ub["field_mapping"] = "jenis_kelamin"

        # I. Date of Issue
        elif any(k in upper for k in ["DATE OF ISSUE", "DATEOFISSUE", "DATEOF ISSUE", "TGL.PENGELUARAN", "TGL. PENGELUARAN", "発行年月日", "签发日期", "發照日期"]):
            val, _, used = _find_viz_value(b, viz_boxes)
            if val:
                c_date = _clean_passport_date(val)
                if c_date:
                    passport.tanggal_pengeluaran = c_date
                    for ub in used: ub["field_mapping"] = "tanggal_pengeluaran"

        # J. Date of Expiry
        elif any(k in upper for k in ["DATE OF EXPIRY", "DATEOFEXPIRY", "DATE-OFEXPIRY", "EXPIRY", "TGL.HABISBERLAKU", "TGL. HABIS BERLAKU", "有効期間満了日", "有效期至", "效期截止日期"]):
            val, _, used = _find_viz_value(b, viz_boxes)
            if val:
                c_date = _clean_passport_date(val)
                if c_date:
                    passport.tanggal_berlaku = c_date
                    for ub in used: ub["field_mapping"] = "tanggal_berlaku"

        # K. Issuing Authority
        elif any(k in upper for k in ["AUTHORITY", "ISSUING OFFICE", "ISSUINGOFFICE", "KANTOR YANG MENGELUARKAN", "KANTORYANGMENGELUARKAN", "签发机关", "發照機關"]):
            val, _, used = _find_viz_value(b, viz_boxes, allow_multiline=True, max_y_dist=80.0)
            if val:
                passport.kantor_penerbit = val.strip()
                for ub in used: ub["field_mapping"] = "kantor_penerbit"

        # L. Personal ID No / Reg No
        elif any(k in upper for k in ["PERSONAL ID", "PERSONALID", "REG.NO", "REG. NO", "身分證", "身分"]):
            val, _, used = _find_viz_value(b, viz_boxes)
            if val:
                passport.personal_id = val.strip()
                for ub in used: ub["field_mapping"] = "personal_id"

    # Assemble Surname + Given name if needed and no full name already from VIZ
    if not viz_nama:
        if passport.surname and passport.given_names and (not passport.nama or passport.nama == passport.surname):
            passport.nama = f"{passport.surname} {passport.given_names}"
        elif passport.surname and not passport.nama:
            passport.nama = passport.surname

    # Fallback for passports where microprint labels were skipped (e.g. low-res scans):
    if not passport.nama_native:
        HEADER_NOISE = [
            "中华", "中華", "民国", "民國", "共和国", "共和國", "日本国", "护照", "護照", "旅券",
            "外交", "公务", "普通", "PEOPLE", "CHINA", "外文", "别名", "別名", "国籍", "國籍",
            "性别", "性別", "本籍", "出生", "签发", "簽發", "有效期", "姓名", "型式", "代码",
            "號碼", "号码", "机关", "機關"
        ]
        LABEL_KEYS_LOWER = ["type", "code", "date", "birth", "issue", "expiry", "sex", "country", "name", "passport", "authority", "also", "known", "alias"]
        name_y = None
        if passport.nama:
            for b in viz_boxes:
                b_txt = b.get("text", "").upper()
                if any(part in b_txt for part in passport.nama.upper().split() if len(part) >= 3):
                    name_y = b.get("y_min")
                    break

        best_cand = None
        best_dist = 99999.0
        for b in viz_boxes:
            txt = b.get("text", "").strip()
            if "/" in txt or any(k in txt.lower() for k in LABEL_KEYS_LOWER):
                continue
            if _has_non_latin(txt) and 2 <= len(txt) <= 8 and not any(h in txt for h in HEADER_NOISE):
                dist = abs(b.get("y_min", 0.0) - name_y) if name_y is not None else 50.0
                if dist < best_dist:
                    best_dist = dist
                    best_cand = (b, txt)

        if best_cand and best_dist < 80.0:
            b_cand, txt_cand = best_cand
            passport.nama_native = txt_cand
            b_cand["field_mapping"] = "nama_native"

    # Clean Indonesian specimen name
    if passport.country_code == "IDN" and passport.nama:
        if "LENGAP" in passport.nama or "NAMALENGKAP" in passport.nama.replace(" ", ""):
            passport.nama = "NAMA LENGKAP"

    if not passport.tempat_lahir:
        for b in viz_boxes:
            txt = b.get("text", "")
            if "/" in txt and any(r in txt.upper() for r in ["GUANGDONG", "BEIJING", "SHANGHAI", "JAKARTA", "TOKYO", "TAIWAN"]):
                passport.tempat_lahir = txt.split("/")[-1].strip()
                b["field_mapping"] = "tempat_lahir"
                break
    if not passport.tanggal_pengeluaran:
        for b in viz_boxes:
            txt = b.get("text", "")
            if re.search(r'\b\d{1,2}\s*(?:1月|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*\d{4}\b', txt, re.IGNORECASE):
                c_d = _clean_passport_date(txt)
                if c_d and c_d != passport.tanggal_lahir and c_d != passport.tanggal_berlaku:
                    passport.tanggal_pengeluaran = c_d
                    b["field_mapping"] = "tanggal_pengeluaran"
                    break

    # Country name resolution
    header_text = " ".join([b.get("text", "") for b in boxes_sorted[:8]]).upper()
    if "INDONESIA" in header_text or passport.country_code == "IDN":
        passport.country_name = "INDONESIA"
        passport.country_code = "IDN"
    elif "JAPAN" in header_text or "日本国" in header_text or passport.country_code == "JPN":
        passport.country_name = "JAPAN"
        passport.country_code = "JPN"
    elif "TAIWAN" in header_text or "REPUBLIC OF CHINA" in header_text or passport.country_code == "TWN":
        passport.country_name = "TAIWAN (REPUBLIC OF CHINA)"
        passport.country_code = "TWN"
    elif "CHINA" in header_text or passport.country_code == "CHN":
        passport.country_name = "PEOPLE'S REPUBLIC OF CHINA"
        passport.country_code = "CHN"
    elif passport.country_code in COUNTRY_MAP:
        passport.country_name = COUNTRY_MAP[passport.country_code]

    # 3. Dynamic Custom Target Field Resolution
    if custom_targets:
        field_synonyms = {
            "passport number": passport.passport_number,
            "nomor paspor": passport.passport_number,
            "no paspor": passport.passport_number,
            "no. paspor": passport.passport_number,
            "nama": passport.nama,
            "nama lengkap": passport.nama,
            "full name": passport.nama,
            "nama asli": passport.nama_native,
            "nama native": passport.nama_native,
            "surname": passport.surname,
            "given names": passport.given_names,
            "negara": passport.country_name,
            "negara penerbit": passport.country_name,
            "kode negara": passport.country_code,
            "kebangsaan": passport.nationality,
            "kewarganegaraan": passport.nationality,
            "nationality": passport.nationality,
            "tanggal lahir": passport.tanggal_lahir,
            "tgl lahir": passport.tanggal_lahir,
            "tempat lahir": passport.tempat_lahir,
            "jenis kelamin": passport.jenis_kelamin,
            "gender": passport.jenis_kelamin,
            "sex": passport.jenis_kelamin,
            "tanggal terbit": passport.tanggal_pengeluaran,
            "tanggal pengeluaran": passport.tanggal_pengeluaran,
            "berlaku hingga": passport.tanggal_berlaku,
            "masa berlaku": passport.tanggal_berlaku,
            "tanggal kedaluwarsa": passport.tanggal_berlaku,
            "kantor penerbit": passport.kantor_penerbit,
            "otoritas": passport.kantor_penerbit,
            "authority": passport.kantor_penerbit,
            "personal id": passport.personal_id,
            "mrz line 1": passport.mrz_line1,
            "mrz line 2": passport.mrz_line2
        }

        custom_res = {}
        for target in custom_targets:
            norm_target = re.sub(r'[^a-zA-Z0-9\s/]', '', target).strip().lower()
            norm_target = re.sub(r'\s+', ' ', norm_target)
            if norm_target in field_synonyms and field_synonyms[norm_target]:
                custom_res[target] = field_synonyms[norm_target]
            else:
                matched = False
                for syn, val in field_synonyms.items():
                    if val and (syn in norm_target or norm_target in syn):
                        custom_res[target] = val
                        matched = True
                        break
                if not matched:
                    single_res = extract_custom_targets(full_text, [target])
                    custom_res[target] = single_res.get(target, "Tidak terdeteksi")

        passport.custom_fields = custom_res

    return passport, boxes

