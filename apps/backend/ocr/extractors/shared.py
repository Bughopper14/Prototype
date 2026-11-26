# pyre-ignore-all-errors
# pyrefly: ignore-errors
# type: ignore
"""Shared OCR utilities: Tesseract fallback, Wilayah DB lookup, Indonesian name spacing, custom targets."""
import json
import os
import re
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from app.services.preprocessor import DocumentPreprocessor  # type: ignore
    from app.services.ocr_engine import OCREngine  # type: ignore
    from app.schemas import DocumentType  # type: ignore
    OCR_AVAILABLE = True
except Exception as e:
    print(f"[!] Warning: Could not import OCR modules: {e}", file=sys.stderr)
    OCR_AVAILABLE = False

try:
    import pytesseract  # type: ignore
    if os.environ.get("TESSERACT_CMD"):
        pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_CMD"]
    TESSERACT_AVAILABLE = True
except Exception as error:
    print(f"[!] Warning: Pytesseract init error: {error}", file=sys.stderr)
    TESSERACT_AVAILABLE = False

class TesseractEngine:
    @classmethod
    def process_image(cls, img) -> list:
        if OCR_AVAILABLE:
            try:
                b = OCREngine.process_image(img)
                if b and len(b) > 0:
                    return b
            except Exception as e:
                print(f"[!] RapidOCR error in TesseractEngine: {e}")
        if not TESSERACT_AVAILABLE:
            return []
        try:
            import cv2  # type: ignore
            h, w = img.shape[:2]
            target_w = 1400
            scale = target_w / float(w) if w < target_w else 1.0
            work_img = img
            if scale > 1.0:
                work_img = cv2.resize(img, (0, 0), fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

            d = pytesseract.image_to_data(work_img, config='--psm 6', output_type=pytesseract.Output.DICT)
            lines = {}
            n = len(d['text'])
            for i in range(n):
                txt = str(d['text'][i]).strip()
                if not txt:
                    continue
                key = (d['block_num'][i], d['par_num'][i], d['line_num'][i])
                if key not in lines:
                    lines[key] = {
                        'words': [],
                        'x_min': d['left'][i],
                        'y_min': d['top'][i],
                        'x_max': d['left'][i] + d['width'][i],
                        'y_max': d['top'][i] + d['height'][i],
                        'confs': []
                    }
                line = lines[key]
                line['words'].append(txt)
                line['x_min'] = min(line['x_min'], d['left'][i])
                line['y_min'] = min(line['y_min'], d['top'][i])
                line['x_max'] = max(line['x_max'], d['left'][i] + d['width'][i])
                line['y_max'] = max(line['y_max'], d['top'][i] + d['height'][i])
                try:
                    conf_val = float(d['conf'][i])
                    if conf_val > 0:
                        line['confs'].append(conf_val)
                except:
                    pass

            boxes = []
            for idx, (k, l) in enumerate(lines.items()):
                text = ' '.join(l['words'])
                conf = round(sum(l['confs']) / len(l['confs']) / 100.0, 4) if l['confs'] else 0.85
                x_min = float(l['x_min']) / scale
                y_min = float(l['y_min']) / scale
                x_max = float(l['x_max']) / scale
                y_max = float(l['y_max']) / scale
                boxes.append({
                    'id': idx + 1,
                    'text': text,
                    'confidence': conf,
                    'box': [[x_min, y_min], [x_max, y_min], [x_max, y_max], [x_min, y_max]],
                    'x_min': x_min,
                    'y_min': y_min,
                    'x_max': x_max,
                    'y_max': y_max,
                    'field_mapping': None
                })
            if not boxes and OCR_AVAILABLE:
                return OCREngine.process_image(img)
            return boxes
        except Exception as err:
            print(f"[!] Tesseract processing error, falling back to RapidOCR: {err}")
            return OCREngine.process_image(img) if OCR_AVAILABLE else []

def get_db_conn():
    """Connects with the same DB_* environment variables as the Next.js app."""
    import pymysql  # type: ignore
    return pymysql.connect(
        host=os.environ.get('DB_HOST', '127.0.0.1'),
        port=int(os.environ.get('DB_PORT', '3306')),
        user=os.environ.get('DB_USER', 'root'),
        password=os.environ.get('DB_PASSWORD', ''),
        database=os.environ['DB_NAME'],
    )


def _wilayah_row_fits(row, city: str | None = "", province: str | None = "") -> bool:
    """False when a master-data row (village, postal, district, city, province) contradicts the city or province already read from the document.
    An empty city or province never contradicts anything."""
    import re

    clean = lambda s: re.sub(r'[^A-Z0-9]', '', str(s or '').upper())
    bare = lambda s: re.sub(r'^(?:KOTAADMINISTRASI|KOTAADM|KABUPATEN|KOTA|KAB)', '', clean(s))
    for known, found in ((city, row[3]), (province, row[4])):
        k, f = bare(known), bare(found)
        if not k or not f or k == f or k in f or f in k:
            continue
        if 'JAKARTA' in k and 'JAKARTA' in f:  # "DKI Jakarta" is "Daerah Khusus Ibukota Jakarta"
            continue
        return False
    return True


def _lookup_wilayah_db(raw_kec: str = "", raw_kel: str = "", raw_pos: str = ""):
    """Resolves (village, postal_code, district, city, province) against crm_master_* tables."""
    import re
    import difflib

    clean_w = lambda s: re.sub(r'[^A-Z0-9]', '', str(s or '').upper())
    c_kec, c_kel, c_pos = clean_w(raw_kec), clean_w(raw_kel), clean_w(raw_pos)
    if not (c_kec or c_kel or c_pos):
        return None

    base_select = """
        SELECT v.name, p.postal_code, d.name, c.name, pr.name
        FROM crm_master_villages v
        JOIN crm_master_districts d ON v.district_id = d.id
        JOIN crm_master_cities c ON d.city_id = c.id
        JOIN crm_master_provinces pr ON c.province_id = pr.id
        LEFT JOIN crm_master_postal_codes p ON v.postal_code_id = p.id
    """
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            row = None
            if c_kec and c_kel:
                cur.execute(
                    base_select + """
                    WHERE REPLACE(UPPER(d.name), ' ', '') = %s
                      AND REPLACE(UPPER(v.name), ' ', '') = %s
                    LIMIT 1
                    """,
                    (c_kec, c_kel),
                )
                row = cur.fetchone()
            if not row and c_pos and c_kec:
                cur.execute(
                    base_select + """
                    WHERE p.postal_code = %s
                      AND REPLACE(UPPER(d.name), ' ', '') = %s
                    LIMIT 1
                    """,
                    (c_pos, c_kec),
                )
                row = cur.fetchone()
            if not row and c_pos:
                cur.execute(base_select + " WHERE p.postal_code = %s LIMIT 1", (c_pos,))
                row = cur.fetchone()
            if not row and c_kec:
                cur.execute("""
                    SELECT NULL, NULL, d.name, c.name, pr.name
                    FROM crm_master_districts d
                    JOIN crm_master_cities c ON d.city_id = c.id
                    JOIN crm_master_provinces pr ON c.province_id = pr.id
                    WHERE REPLACE(UPPER(d.name), ' ', '') = %s
                    LIMIT 1
                """, (c_kec,))
                row = cur.fetchone()
            if not row and c_kel:
                cur.execute(
                    base_select + " WHERE REPLACE(UPPER(v.name), ' ', '') = %s LIMIT 1",
                    (c_kel,),
                )
                row = cur.fetchone()

            if not row and (c_kec or c_kel):
                cur.execute("""
                    SELECT d.id, d.name, c.name, pr.name
                    FROM crm_master_districts d
                    JOIN crm_master_cities c ON d.city_id = c.id
                    JOIN crm_master_provinces pr ON c.province_id = pr.id
                """)
                all_kecs = cur.fetchall()
                best_kec = None
                best_k_score = 0.0
                if c_kec:
                    for k_id, k_name, c_name, pr_name in all_kecs:
                        clean_k = clean_w(k_name)
                        score = difflib.SequenceMatcher(None, c_kec, clean_k).ratio()
                        if score > best_k_score:
                            best_k_score = score
                            best_kec = (k_id, k_name, c_name, pr_name)
                if best_kec and best_k_score >= 0.70:
                    k_id, k_name, c_name, pr_name = best_kec
                    cur.execute("""
                        SELECT v.name, p.postal_code
                        FROM crm_master_villages v
                        LEFT JOIN crm_master_postal_codes p ON v.postal_code_id = p.id
                        WHERE v.district_id = %s
                    """, (k_id,))
                    all_kels = cur.fetchall()
                    best_kel = None
                    best_v_score = 0.0
                    if c_kel:
                        for v_name, v_post in all_kels:
                            score = difflib.SequenceMatcher(None, c_kel, clean_w(v_name)).ratio()
                            if score > best_v_score:
                                best_v_score = score
                                best_kel = (v_name, v_post)
                    row = (
                        best_kel[0] if best_kel and best_v_score >= 0.65 else (all_kels[0][0] if len(all_kels) == 1 else None),
                        best_kel[1] if best_kel and best_v_score >= 0.65 else (all_kels[0][1] if len(all_kels) == 1 else None),
                        k_name,
                        c_name,
                        pr_name,
                    )
            return row
    finally:
        conn.close()



def get_indo_name_splitter():
    global _INDO_NAME_SPLITTER
    if _INDO_NAME_SPLITTER is not None:
        return _INDO_NAME_SPLITTER
    try:
        import wordninja  # type: ignore
        lm = wordninja.DEFAULT_LANGUAGE_MODEL
    except Exception:
        return None

    indo_names = [
        'supriadi', 'supriyadi', 'supri', 'candra', 'chandra', 'cahyono', 'cahyo', 'cahyani',
        'budi', 'santoso', 'wijaya', 'setiawan', 'kurniawan', 'pratama', 'putra', 'putri',
        'susanto', 'wahyudi', 'hidayat', 'lestari', 'wulandari', 'yulianti', 'sari', 'rahayu',
        'hermawan', 'gunawan', 'nugroho', 'saputra', 'saputri', 'utomo', 'kusuma', 'permana',
        'sukma', 'wibowo', 'purnomo', 'triono', 'mulyono', 'surya', 'dharma', 'agus', 'bambang',
        'joko', 'slamet', 'sugeng', 'eko', 'tri', 'catur', 'panca', 'hendra', 'indra', 'andi',
        'ahmad', 'muhammad', 'mochammad', 'abdul', 'siti', 'nur', 'dewi', 'sri', 'ratna', 'ratih',
        'maulana', 'fauzi', 'firmansyah', 'hakim', 'arifin', 'anwar', 'hasan', 'husen', 'ismail',
        'ibrahim', 'yusuf', 'ridwan', 'rusdi', 'rizki', 'rizky', 'fajar', 'bayu', 'dimas', 'bagus',
        'gilang', 'rendy', 'randy', 'febri', 'april', 'septian', 'okta', 'novi', 'desi', 'dian',
        'lia', 'rina', 'rini', 'tini', 'yanti', 'yani', 'wati', 'nurhayati', 'sulastri', 'suhartini',
        'sumiati', 'widodo', 'permata', 'kusuma', 'hartono', 'susila', 'susilo', 'mulyadi',
        'subagyo', 'suharto', 'sukarno', 'habibie', 'yudhoyono', 'megawati', 'kartika', 'anggraini',
        'novita', 'fitri', 'fitria', 'ramadhan', 'syahputra', 'lubis', 'nasution', 'siregar', 'harahap',
        'pasaribu', 'sinaga', 'simanjuntak', 'hutapea', 'sitompul', 'marpaung', 'panjaitan', 'tanjung',
        'manurung', 'simatupang', 'sitorus', 'hasibuan', 'daulay', 'batubara', 'pane', 'pulungan'
    ]
    for w in indo_names:
        lm._wordcost[w.lower()] = 3.0
        if len(w) > lm._maxword:
            lm._maxword = len(w)
    _INDO_NAME_SPLITTER = lm
    return _INDO_NAME_SPLITTER


def respace_glued_name(raw_name: str) -> str:
    if not raw_name:
        return ""
    import re
    s = raw_name.strip()
    if ' ' in s or len(s) < 7:
        return s
    # CamelCase like SupriadiCandraCahyono
    if re.search(r'[a-z][A-Z]', s):
        return re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', s).strip()
    # All uppercase glued name
    splitter = get_indo_name_splitter()
    if splitter:
        try:
            parts = splitter.split(s)
            if len(parts) > 1 and all(len(p) >= 2 for p in parts):
                return " ".join(parts).upper()
        except Exception:
            pass
    return s



def respace_glued(text: str) -> str:
    """Puts the spaces back in a line the OCR returned glued ("jl.PerakBaratNo.85,KotaSurabaya" -> "jl. Perak Barat No. 85, Kota Surabaya").
    Lines that already have normal spaces are returned unchanged."""
    import re

    t = str(text or '')
    t = re.sub(r',(?=[A-Za-z])', ', ', t)
    t = re.sub(r'\bKode\s*P[o0]s\s*:?\s*(?=\d{5}\b)', 'Kode Pos: ', t, flags=re.IGNORECASE)
    if not re.search(r'[a-z][A-Z][a-z]', t):
        return t
    t = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', t)
    t = re.sub(r'(?<=[A-Za-z])\.(?=[A-Za-z0-9])', '. ', t)
    t = re.sub(r'(?<=:)(?=[A-Za-z0-9])', ' ', t)
    t = re.sub(r'\bKode\s*P[o0]s\s*:?\s*(?=\d{5}\b)', 'Kode Pos: ', t, flags=re.IGNORECASE)
    return re.sub(r'\s+', ' ', t).strip()



def extract_custom_targets(full_text: str, custom_targets: List[str]) -> Dict[str, Any]:
    """
    Dynamically extracts user-configured custom fields from document text.
    Searches via key-value patterns, colon delimiters, and contextual proximity.
    """
    results: Dict[str, Any] = {}
    if not custom_targets:
        return results

    lines = [line.strip() for line in full_text.splitlines() if line.strip()]

    for target in custom_targets:
        target_clean = target.strip()
        if not target_clean:
            continue

        found_val = None
        target_lower = target_clean.lower()

        # Strategy 1: Direct key-value regex (e.g. "Target : Value" or "Target = Value")
        escaped = re.escape(target_clean)
        pattern = rf'(?:^|[\r\n\t|;])\s*{escaped}\s*[:=\-–]\s*([^\r\n|;]+)'
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            found_val = match.group(1).strip()

        # Strategy 2: Line by line search
        if not found_val:
            for i, line in enumerate(lines):
                line_lower = line.lower()
                if target_lower in line_lower:
                    if ":" in line:
                        parts = line.split(":", 1)
                        if target_lower in parts[0].lower() and len(parts) > 1 and parts[1].strip():
                            found_val = parts[1].strip()
                            break
                    elif "=" in line:
                        parts = line.split("=", 1)
                        if target_lower in parts[0].lower() and len(parts) > 1 and parts[1].strip():
                            found_val = parts[1].strip()
                            break
                    elif i + 1 < len(lines):
                        # Value is on the next line
                        next_line = lines[i + 1].strip()
                        if len(next_line) > 0 and len(next_line) < 150:
                            found_val = next_line
                            break

        # Strategy 3: Heuristic inline search (e.g., "Target sebesar Rp 50.000.000" or "Target pada 2026-10-15")
        if not found_val:
            inline_match = re.search(rf'{escaped}\s+(?:adalah|sebesar|yaitu|pada|di|sebanyak)?\s*([A-Za-z0-9\s.,\-\/]+)', full_text, re.IGNORECASE)
            if inline_match:
                candidate = inline_match.group(1).strip()
                # Keep candidate concise (up to first sentence punctuation or 60 chars)
                candidate = candidate.split('.')[0].split(',')[0].strip()
                if len(candidate) > 2:
                    found_val = candidate

        results[target_clean] = found_val if found_val else "Tidak terdeteksi"

    return results

def extract_key_insights(full_text: str) -> Dict[str, Any]:
    """
    Extracts high-level executive insights from any document:
    - Summary
    - Key Dates
    - Financial / Monetary Values
    - Key Action Items & Recommendations
    - Contacts / Emails / Phone numbers
    """
    lines = [line.strip() for line in full_text.splitlines() if line.strip()]

    # 1. Executive Summary: First 2-3 substantive paragraphs
    summary_paragraphs: List[str] = []
    for line in lines:
        if len(line) > 50 and not line.startswith(("#", "[", "|", "Slide")):
            summary_paragraphs.append(line)
            if len(summary_paragraphs) >= 2:
                break
    summary = " ".join(summary_paragraphs) if summary_paragraphs else (lines[0] if lines else "Dokumen diproses.")

    # 2. Key Dates
    date_pattern = r'\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b'
    dates = list(dict.fromkeys(re.findall(date_pattern, full_text, re.IGNORECASE)))[:5]

    # 3. Monetary Amounts
    money_pattern = r'\b((?:Rp|IDR|\$|USD)\.?\s*[\d.,]+(?:\s*(?:juta|miliar|ribu|million|billion))?)\b'
    amounts = list(dict.fromkeys(re.findall(money_pattern, full_text, re.IGNORECASE)))[:8]

    # 4. Action Items & Key Points
    action_items: List[str] = []
    for line in lines:
        lower = line.lower()
        if any(k in lower for k in ["harus", "wajib", "action", "tugas", "deadline", "rekomendasi", "kesimpulan", "target", "follow up", "catatan:"]):
            clean_item = re.sub(r'^[•\-\*\d\.\)]\s*', '', line).strip()
            if 10 < len(clean_item) < 200:
                action_items.append(clean_item)
            if len(action_items) >= 6:
                break

    # 5. Contacts (Email, Phone)
    emails = list(dict.fromkeys(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', full_text)))[:4]
    phones = list(dict.fromkeys(re.findall(r'\b(?:\+62|08|628)\d{8,12}\b', full_text)))[:4]

    # 6. Key-Value Pairs
    kv_pairs: Dict[str, str] = {}
    for line in lines:
        if ":" in line and not line.startswith("http"):
            parts = line.split(":", 1)
            k = parts[0].strip()
            v = parts[1].strip()
            if 2 < len(k) < 35 and 1 < len(v) < 100:
                kv_pairs[k] = v
            if len(kv_pairs) >= 10:
                break

    return {
        "summary": summary,
        "detected_dates": dates,
        "detected_amounts": amounts,
        "action_items": action_items,
        "contacts": {
            "emails": emails,
            "phones": phones
        },
        "key_value_pairs": kv_pairs
    }

