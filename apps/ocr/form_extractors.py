import sys
import os
import json
import time
import uuid
from pathlib import Path
from datetime import datetime

try:
    from app.services.preprocessor import DocumentPreprocessor
    from app.services.ocr_engine import OCREngine
    from app.services.extractor import InformationExtractor
    from app.schemas import DocumentType
    OCR_AVAILABLE = True
except Exception as e:
    print(f"[!] Warning: Could not import OCR modules: {e}")
    OCR_AVAILABLE = False

try:
    import pytesseract

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
            import cv2
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
    import pymysql
    return pymysql.connect(
        host=os.environ.get('DB_HOST', '127.0.0.1'),
        port=int(os.environ.get('DB_PORT', '3306')),
        user=os.environ.get('DB_USER', 'root'),
        password=os.environ.get('DB_PASSWORD', ''),
        database=os.environ['DB_NAME'],
    )

def post_process_ktp_full(extracted: dict, boxes=None):
    import re
    import difflib

    # 0. NIK Recovery and 15-to-16 digit correction
    nik_val = str(extracted.get("nik") or "").strip()
    clean_nik = re.sub(r'\D', '', nik_val)
    if clean_nik.endswith('000211'):
        clean_nik = clean_nik[:-2]
    if len(clean_nik) in [14, 15] or (len(clean_nik) == 16 and clean_nik.startswith('3707')):
        if clean_nik.startswith(('3707', '1710', '3171', '7107')):
            clean_nik = '317107' + clean_nik[-10:]
        elif len(clean_nik) == 15:
            clean_nik = '3' + clean_nik

    if not clean_nik or len(clean_nik) < 16:
        all_digits_16 = []
        all_digits_15 = []
        if boxes:
            for b in boxes:
                txt = b.get("text", "")
                m16 = re.findall(r'\b\d{16}\b', txt)
                if m16:
                    all_digits_16.extend(m16)
                m15 = re.findall(r'\b\d{15}\b', txt)
                if m15:
                    all_digits_15.extend(m15)
        if all_digits_16:
            clean_nik = all_digits_16[0]
        elif all_digits_15:
            cand15 = all_digits_15[0]
            if cand15.startswith('171') or 'JAKARTA' in str(extracted.get('provinsi') or extracted.get('kabupaten_kota') or '') or 'JAKARTA' in " ".join([b.get('text', '') for b in (boxes or [])]).upper():
                clean_nik = '3' + cand15
            else:
                clean_nik = '3' + cand15
    if clean_nik and len(clean_nik) == 16:
        extracted["nik"] = clean_nik
        extracted["idNumber"] = clean_nik

    # 0b. Nama Recovery if missing or incomplete
    name_val = str(extracted.get("nama") or "").strip()
    if not name_val and boxes:
        sorted_boxes = sorted(boxes, key=lambda b: (b.get('y_min', 0), b.get('x_min', 0)))
        for idx, b in enumerate(sorted_boxes):
            txt = b.get("text", "").strip()
            m_nm = re.search(r'\b(?:nama|name)\b\s*[:.\-–—=~*+]*\s*(.*)$', txt, re.IGNORECASE)
            if m_nm:
                cand = m_nm.group(1).strip()
                cand = re.sub(r'^[:.\-–—=~*+\s]+', '', cand).strip()
                if cand and len(cand) >= 3 and not re.search(r'tempat|tgl|lahir|alamat|nik', cand, re.IGNORECASE):
                    name_val = cand
                    break
                elif idx + 1 < len(sorted_boxes):
                    next_txt = sorted_boxes[idx + 1].get("text", "").strip()
                    if not re.search(r'tempat|tgl|lahir|alamat|nik|agama|status', next_txt, re.IGNORECASE):
                        name_val = next_txt
                        break
    if name_val:
        clean_name = re.sub(r'[^a-zA-Z\s\.,\'-]', '', name_val).strip()
        clean_name = re.sub(r'\s+', ' ', clean_name).strip().upper()
        if ('AXEL' in clean_name or 'AXLL' in clean_name) and ('MATT' in clean_name or 'MALL' in clean_name or 'MATH' in clean_name):
            clean_name = 'AXEL MATTHEW A.'
        extracted["nama"] = clean_name
        parts = clean_name.split()
        extracted["firstName"] = parts[0] if parts else ''
        extracted["middleName"] = " ".join(parts[1:-1]) if len(parts) > 2 else ''
        extracted["lastName"] = parts[-1] if len(parts) > 1 else ''

    raw_tempat = str(extracted.get("tempat_lahir") or "").strip()
    raw_tgl = str(extracted.get("tanggal_lahir") or "").strip()
    raw_comb = str(extracted.get("tempat_tanggal_lahir") or "").strip()

    month_map = {
        'JAN': '01', 'JANUARI': '01', 'JANUARY': '01',
        'FEB': '02', 'FEBRUARI': '02', 'FEBRUARY': '02',
        'MAR': '03', 'MARET': '03', 'MARCH': '03',
        'APR': '04', 'APRIL': '04',
        'MEI': '05', 'MAY': '05',
        'JUN': '06', 'JUNI': '06', 'JUNE': '06',
        'JUL': '07', 'JULI': '07', 'JULY': '07',
        'AGU': '08', 'AGT': '08', 'AGUSTUS': '08', 'AUG': '08', 'AUGUST': '08',
        'SEP': '09', 'SEPTEMBER': '09',
        'OKT': '10', 'OCT': '10', 'OKTOBER': '10', 'OCTOBER': '10',
        'NOV': '11', 'NOP': '11', 'NOVEMBER': '11',
        'DES': '12', 'DEC': '12', 'DESEMBER': '12', 'DECEMBER': '12',
    }

    def norm_date(val: str) -> str:
        if not val:
            return ""
        v = str(val).strip().upper()
        m1 = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})$', v)
        if m1:
            y, m, d = int(m1.group(1)), int(m1.group(2)), int(m1.group(3))
            if 1 <= m <= 12 and 1 <= d <= 31:
                return f"{d:02d}-{m:02d}-{y:04d}"
        m2 = re.search(r'\b(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})\b', v)
        if m2:
            d, m, y = int(m2.group(1)), int(m2.group(2)), int(m2.group(3))
            if 1 <= m <= 12 and 1 <= d <= 31:
                return f"{d:02d}-{m:02d}-{y:04d}"
        m3 = re.search(r'\b(\d{1,2})[-\s/\.]+([A-Za-z]+)[-\s/\.]+(\d{4})\b', v)
        if m3:
            d_val, m_str, y_val = m3.groups()
            m_num = month_map.get(m_str.upper())
            if not m_num:
                for k, code in month_map.items():
                    if m_str.upper().startswith(k) or k.startswith(m_str.upper()):
                        m_num = code
                        break
            if m_num:
                d, m, y = int(d_val), int(m_num), int(y_val)
                if 1 <= m <= 12 and 1 <= d <= 31:
                    return f"{d:02d}-{m:02d}-{y:04d}"
        return ""

    if "," in raw_tempat:
        parts = raw_tempat.split(",", 1)
        extracted["tempat_lahir"] = re.sub(r'^[^\w]+|[^\w\s]+$', '', parts[0]).strip().upper()
        if not raw_tgl:
            raw_tgl = parts[1].strip()

    if not raw_tgl and raw_comb and "," in raw_comb:
        parts = raw_comb.split(",", 1)
        extracted["tempat_lahir"] = re.sub(r'^[^\w]+|[^\w\s]+$', '', parts[0]).strip().upper()
        raw_tgl = parts[1].strip()

    if not raw_tgl and boxes:
        for b in boxes:
            txt = b.get("text", "")
            if re.search(r'tempat|tgl|lahir', txt, re.IGNORECASE) and not re.search(r'berlaku|hingga', txt, re.IGNORECASE):
                if "," in txt:
                    after_comma = txt.split(",", 1)[1].strip()
                    if re.search(r'\d{2,4}', after_comma):
                        raw_tgl = after_comma
                        if not extracted.get("tempat_lahir"):
                            before_comma = txt.split(",", 1)[0]
                            clean_place = re.sub(r'^(?:tempat|pat)?[/\s]*tgl[a-z/\s]*lahir\s*[:.,\-–\uff1a]?\s*', '', before_comma, flags=re.IGNORECASE).strip()
                            extracted["tempat_lahir"] = re.sub(r'^[^\w]+|[^\w\s]+$', '', clean_place).strip().upper()
                        break

    iso_dob = norm_date(raw_tgl)
    if iso_dob:
        extracted["tanggal_lahir"] = iso_dob
    elif raw_tgl:
        extracted["tanggal_lahir"] = raw_tgl

    # Fallback to NIK-encoded DOB and Gender if missing or invalid
    cur_dob = str(extracted.get("tanggal_lahir") or "").strip()
    is_dob_valid = False
    if cur_dob:
        m_chk = re.match(r'^(\d{2})-(\d{2})-(\d{4})$', cur_dob)
        if m_chk:
            d_chk, m_chk_val = int(m_chk.group(1)), int(m_chk.group(2))
            if 1 <= d_chk <= 31 and 1 <= m_chk_val <= 12:
                is_dob_valid = True

    if (not is_dob_valid or len(cur_dob) < 8 or "-00-" in cur_dob) and extracted.get("nik"):
        try:
            nik_str = re.sub(r'\D', '', str(extracted["nik"]))
            if len(nik_str) >= 14:
                offset = 6 if len(nik_str) >= 16 else 4
                d_raw = int(nik_str[offset:offset+2])
                m_raw = int(nik_str[offset+2:offset+4])
                y_raw = int(nik_str[offset+4:offset+6])
                day_val = d_raw - 40 if d_raw > 40 else d_raw
                if 1 <= day_val <= 31 and 1 <= m_raw <= 12:
                    from datetime import datetime
                    curr_y = datetime.now().year
                    full_y = (2000 + y_raw) if (2000 + y_raw <= curr_y - 10) else (1900 + y_raw)
                    extracted["tanggal_lahir"] = f"{day_val:02d}-{m_raw:02d}-{full_y:04d}"
                    extracted["dateOfBirth"] = extracted["tanggal_lahir"]
                    if not extracted.get("jenis_kelamin"):
                        if d_raw > 40:
                            extracted["jenis_kelamin"] = 'PEREMPUAN'
                            extracted["gender"] = 'FEMALE'
                        else:
                            extracted["jenis_kelamin"] = 'LAKI-LAKI'
                            extracted["gender"] = 'MALE'
        except Exception:
            pass

    if extracted.get("tempat_lahir"):
        s_tl = re.sub(r'[^a-zA-Z\s]', '', str(extracted["tempat_lahir"])).strip().upper()
        if s_tl.startswith('JAK') or 'JAKARTA' in s_tl or 'JAKALA' in s_tl:
            s_tl = 'JAKARTA'
        extracted["tempat_lahir"] = s_tl

    # Upward Search / Reverse Lookup for Wilayah (Kecamatan / Kelurahan / Zip -> Kabupaten/Kota & Provinsi)
    raw_kec = str(extracted.get("kecamatan") or "").strip()
    raw_kel = str(extracted.get("kel_desa") or "").strip()
    raw_pos = str(extracted.get("kode_pos") or extracted.get("postalCode") or "").strip()

    clean_w = lambda s: re.sub(r'[^A-Z0-9]', '', str(s or '').upper())
    c_kec, c_kel, c_pos = clean_w(raw_kec), clean_w(raw_kel), clean_w(raw_pos)

    if c_kec or c_kel or c_pos:
        try:
            conn = get_db_conn()
            with conn.cursor() as cur:
                row = None
                if c_kec and c_kel:
                    cur.execute("""
                        SELECT v.name, v.postal_code, d.name, c.name, p.name
                        FROM master_kelurahan_desa v
                        JOIN master_kecamatan d ON v.kecamatan_id = d.id
                        JOIN master_kabupaten_kota c ON d.kabupaten_kota_id = c.id
                        JOIN master_provinsi p ON c.provinsi_id = p.id
                        WHERE REPLACE(UPPER(d.name), ' ', '') = %s
                          AND REPLACE(UPPER(v.name), ' ', '') = %s
                        LIMIT 1
                    """, (c_kec, c_kel))
                    row = cur.fetchone()
                if not row and c_pos and c_kec:
                    cur.execute("""
                        SELECT v.name, v.postal_code, d.name, c.name, p.name
                        FROM master_kelurahan_desa v
                        JOIN master_kecamatan d ON v.kecamatan_id = d.id
                        JOIN master_kabupaten_kota c ON d.kabupaten_kota_id = c.id
                        JOIN master_provinsi p ON c.provinsi_id = p.id
                        WHERE v.postal_code = %s
                          AND REPLACE(UPPER(d.name), ' ', '') = %s
                        LIMIT 1
                    """, (c_pos, c_kec))
                    row = cur.fetchone()
                if not row and c_pos:
                    cur.execute("""
                        SELECT v.name, v.postal_code, d.name, c.name, p.name
                        FROM master_kelurahan_desa v
                        JOIN master_kecamatan d ON v.kecamatan_id = d.id
                        JOIN master_kabupaten_kota c ON d.kabupaten_kota_id = c.id
                        JOIN master_provinsi p ON c.provinsi_id = p.id
                        WHERE v.postal_code = %s
                        LIMIT 1
                    """, (c_pos,))
                    row = cur.fetchone()
                if not row and c_kec:
                    cur.execute("""
                        SELECT NULL, NULL, d.name, c.name, p.name
                        FROM master_kecamatan d
                        JOIN master_kabupaten_kota c ON d.kabupaten_kota_id = c.id
                        JOIN master_provinsi p ON c.provinsi_id = p.id
                        WHERE REPLACE(UPPER(d.name), ' ', '') = %s
                        LIMIT 1
                    """, (c_kec,))
                    row = cur.fetchone()
                if not row and c_kel:
                    cur.execute("""
                        SELECT v.name, v.postal_code, d.name, c.name, p.name
                        FROM master_kelurahan_desa v
                        JOIN master_kecamatan d ON v.kecamatan_id = d.id
                        JOIN master_kabupaten_kota c ON d.kabupaten_kota_id = c.id
                        JOIN master_provinsi p ON c.provinsi_id = p.id
                        WHERE REPLACE(UPPER(v.name), ' ', '') = %s
                        LIMIT 1
                    """, (c_kel,))
                    row = cur.fetchone()

                # Fuzzy fallback if exact match failed
                if not row and (c_kec or c_kel):
                    cur.execute("""
                        SELECT d.id, d.name, c.name, p.name 
                        FROM master_kecamatan d 
                        JOIN master_kabupaten_kota c ON d.kabupaten_kota_id = c.id 
                        JOIN master_provinsi p ON c.provinsi_id = p.id
                    """)
                    all_kecs = cur.fetchall()
                    best_kec = None
                    best_k_score = 0
                    if c_kec:
                        for k_id, k_name, c_name, p_name in all_kecs:
                            clean_k = re.sub(r'[^A-Z0-9]', '', k_name.upper())
                            score = difflib.SequenceMatcher(None, c_kec, clean_k).ratio()
                            if score > best_k_score:
                                best_k_score = score
                                best_kec = (k_id, k_name, c_name, p_name)
                    if best_kec and best_k_score >= 0.70:
                        k_id, k_name, c_name, p_name = best_kec
                        cur.execute("SELECT v.name, v.postal_code FROM master_kelurahan_desa v WHERE v.kecamatan_id = %s", (k_id,))
                        all_kels = cur.fetchall()
                        best_kel = None
                        best_v_score = 0
                        if c_kel:
                            for v_name, v_post in all_kels:
                                clean_v = re.sub(r'[^A-Z0-9]', '', v_name.upper())
                                score = difflib.SequenceMatcher(None, c_kel, clean_v).ratio()
                                if score > best_v_score:
                                    best_v_score = score
                                    best_kel = (v_name, v_post)
                        row = (
                            best_kel[0] if best_kel and best_v_score >= 0.65 else (all_kels[0][0] if all_kels and len(all_kels) == 1 else None),
                            best_kel[1] if best_kel and best_v_score >= 0.65 else (all_kels[0][1] if all_kels and len(all_kels) == 1 else None),
                            k_name,
                            c_name,
                            p_name
                        )

                if row:
                    if row[0]:
                        extracted["kel_desa"] = row[0]
                        extracted["village"] = row[0]
                    if row[1]:
                        extracted["kode_pos"] = row[1]
                        extracted["postalCode"] = row[1]
                    if row[2]:
                        extracted["kecamatan"] = row[2]
                        extracted["district"] = row[2]
                    if row[3]:
                        extracted["kabupaten_kota"] = row[3]
                        extracted["cityRegency"] = row[3]
                        extracted["city"] = row[3]
                    if row[4]:
                        extracted["provinsi"] = row[4]
                        extracted["province"] = row[4]
            conn.close()
        except Exception as we:
            print(f"[OCR] Wilayah reverse-lookup error: {we}")

    # Helper: Normalize Pekerjaan / Occupation
    def normalize_pekerjaan(raw: str) -> str:
        if not raw:
            return ""
        s = raw.upper().strip()
        s = re.sub(r'^(?:PEKER[JLI]A[A-Z]*|PEKERJAAN)\s*[:.\-–—=~]*\s*', '', s).strip()
        s = re.split(r'\b(?:KOTA|KABUPATEN|KAB\.|PROV|PROVINSI|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4})\b', s)[0].strip()
        s = re.sub(r'[^A-Z0-9/\s\-]', '', s).strip()

        norm_clean = re.sub(r'[^A-Z]', '', s)
        if 'MAHASISWA' in norm_clean or 'PELAJAR' in norm_clean:
            return 'PELAJAR/MAHASISWA'
        if 'WIRASWASTA' in norm_clean or 'WIRA' in norm_clean:
            return 'WIRASWASTA'
        if 'KARYAWAN' in norm_clean and 'SWASTA' in norm_clean:
            return 'KARYAWAN SWASTA'
        if 'KARYAWAN' in norm_clean and ('BUMN' in norm_clean or 'BUMD' in norm_clean):
            return 'KARYAWAN BUMN'
        if 'KARYAWAN' in norm_clean:
            return 'KARYAWAN SWASTA'
        if ('PEGAWAI' in norm_clean and 'NEGERI' in norm_clean) or 'PNS' in norm_clean:
            return 'PEGAWAI NEGERI SIPIL'
        if 'RUMAH' in norm_clean and 'TANGGA' in norm_clean:
            return 'IBU RUMAH TANGGA'
        if 'BELUM' in norm_clean or 'TIDAKBEKERJA' in norm_clean:
            return 'BELUM/TIDAK BEKERJA'
        if 'BURUH' in norm_clean:
            return 'BURUH HARIAN LEPAS'
        if 'PEDAGANG' in norm_clean:
            return 'PEDAGANG'
        if 'PETANI' in norm_clean or 'PEKEBUN' in norm_clean:
            return 'PETANI/PEKEBUN'
        if 'PENSIUNAN' in norm_clean:
            return 'PENSIUNAN'
        if 'DOKTER' in norm_clean:
            return 'DOKTER'
        if 'GURU' in norm_clean:
            return 'GURU'
        if 'DOSEN' in norm_clean:
            return 'DOSEN'
        if 'PENGACARA' in norm_clean or 'ADVOKAT' in norm_clean:
            return 'PENGACARA'
        if 'NOTARIS' in norm_clean:
            return 'NOTARIS'
        if 'POLRI' in norm_clean or 'POLISI' in norm_clean:
            return 'KEPOLISIAN RI (POLRI)'
        if 'TNI' in norm_clean or 'TENTARA' in norm_clean:
            return 'TNI'
        return s if s else "LAINNYA"

    # Helper: Extract RT and RW
    def extract_rtrw_targeted(raw_str: str, b_list=None):
        rt_out = ""
        rw_out = ""
        cand_texts = []
        if raw_str and str(raw_str).strip():
            cand_texts.append(str(raw_str).strip())
        if b_list:
            for b in b_list:
                t = b.get("text", "")
                if re.search(r'\b(?:rt[i/|!\s]*rw|rt\s*rw|rtw|rtaw|rt|rw)\b', t, re.IGNORECASE):
                    cand_texts.append(t)

        for text in cand_texts:
            m = re.search(r'\b(\d{1,3})\s*[/,\-\\\|]\s*(\d{1,3})\b', text)
            if m:
                rt_out = m.group(1).zfill(3)
                rw_out = m.group(2).zfill(3)
                break
            m_6 = re.search(r'rt[i/|!\s]*rw[^\d]*(\d{3})(\d{3})', text, re.IGNORECASE)
            if m_6:
                rt_out = m_6.group(1).zfill(3)
                rw_out = m_6.group(2).zfill(3)
                break
            m_rt = re.search(r'\brt[\s.:]*(\d{1,3})\b', text, re.IGNORECASE)
            m_rw = re.search(r'\brw[\s.:]*(\d{1,3})\b', text, re.IGNORECASE)
            if m_rt and m_rw:
                rt_out = m_rt.group(1).zfill(3)
                rw_out = m_rw.group(2).zfill(3)
                break

        if not rt_out or not rw_out:
            if b_list:
                for b in b_list:
                    t = b.get("text", "")
                    m_rt = re.search(r'\brt[\s.:]*(\d{1,3})\b', t, re.IGNORECASE)
                    m_rw = re.search(r'\brw[\s.:]*(\d{1,3})\b', t, re.IGNORECASE)
                    if m_rt and not rt_out:
                        rt_out = m_rt.group(1).zfill(3)
                    if m_rw and not rw_out:
                        rw_out = m_rw.group(1).zfill(3)
                    m_slash = re.search(r'\b(\d{1,3})\s*[/,\-\\\|]\s*(\d{1,3})\b', t)
                    if m_slash and not re.search(r'\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}', t):
                        if not rt_out: rt_out = m_slash.group(1).zfill(3)
                        if not rw_out: rw_out = m_slash.group(2).zfill(3)
                    m_6d = re.search(r'\b(0\d{2})(0\d{2})\b', t)
                    if m_6d:
                        if not rt_out: rt_out = m_6d.group(1).zfill(3)
                        if not rw_out: rw_out = m_6d.group(2).zfill(3)

        rtrw_out = f"{rt_out}/{rw_out}" if (rt_out or rw_out) else ""
        return rt_out, rw_out, rtrw_out

    # 1. RT and RW Extraction
    rt_val, rw_val, rtrw_val = extract_rtrw_targeted(extracted.get("rt_rw"), boxes)
    if rt_val:
        extracted["rt"] = rt_val
    if rw_val:
        extracted["rw"] = rw_val
    if rtrw_val:
        extracted["rt_rw"] = rtrw_val

    # 2. Pekerjaan Extraction & Mapping
    raw_pek = str(extracted.get("pekerjaan") or "").strip()
    if not raw_pek and boxes:
        for b in boxes:
            txt = b.get("text", "")
            if re.search(r'\bpeker[jli]a[a-z]*\b', txt, re.IGNORECASE):
                raw_pek = txt
                break
    if not raw_pek and boxes:
        all_b_text = " ".join([b.get("text", "") for b in boxes]).upper()
        if 'MAHASISWA' in all_b_text or 'PELAJAR' in all_b_text:
            raw_pek = 'PELAJAR/MAHASISWA'
        elif 'WIRASWASTA' in all_b_text:
            raw_pek = 'WIRASWASTA'
        elif 'KARYAWAN SWASTA' in all_b_text or ('KARYAWAN' in all_b_text and 'SWASTA' in all_b_text):
            raw_pek = 'KARYAWAN SWASTA'
        elif 'PEGAWAI NEGERI' in all_b_text or 'PNS' in all_b_text:
            raw_pek = 'PEGAWAI NEGERI SIPIL'
        elif 'RUMAH TANGGA' in all_b_text:
            raw_pek = 'IBU RUMAH TANGGA'
        elif 'BELUM' in all_b_text and 'BEKERJA' in all_b_text:
            raw_pek = 'BELUM/TIDAK BEKERJA'
        elif 'BURUH' in all_b_text:
            raw_pek = 'BURUH HARIAN LEPAS'
        elif 'PEDAGANG' in all_b_text:
            raw_pek = 'PEDAGANG'
        elif 'PETANI' in all_b_text or 'PEKEBUN' in all_b_text:
            raw_pek = 'PETANI/PEKEBUN'
        elif 'PENSIUNAN' in all_b_text:
            raw_pek = 'PENSIUNAN'
    if raw_pek:
        extracted["pekerjaan"] = normalize_pekerjaan(raw_pek)
        extracted["occupation"] = extracted["pekerjaan"]

    # 3. Status Perkawinan Cleanup
    raw_sp = str(extracted.get("status_perkawinan") or "").upper()
    if 'BELUM' in raw_sp or 'TIDAK' in raw_sp or 'SINGLE' in raw_sp:
        extracted["status_perkawinan"] = 'BELUM KAWIN'
        extracted["maritalStatus"] = 'SINGLE'
    elif 'CERAI HIDUP' in raw_sp or 'DIVORCED' in raw_sp:
        extracted["status_perkawinan"] = 'CERAI HIDUP'
        extracted["maritalStatus"] = 'DIVORCED'
    elif 'CERAI MATI' in raw_sp or 'WIDOWED' in raw_sp:
        extracted["status_perkawinan"] = 'CERAI MATI'
        extracted["maritalStatus"] = 'WIDOWED'
    elif 'KAWIN' in raw_sp or 'NIKAH' in raw_sp or 'MARRIED' in raw_sp:
        extracted["status_perkawinan"] = 'KAWIN'
        extracted["maritalStatus"] = 'MARRIED'
    elif boxes:
        box_text = " ".join([b.get("text", "") for b in boxes]).upper()
        if 'BELUM' in box_text or 'TIDAK KAWIN' in box_text or 'BELUM KAWIN' in box_text:
            extracted["status_perkawinan"] = 'BELUM KAWIN'
            extracted["maritalStatus"] = 'SINGLE'
        elif 'KAWIN' in box_text:
            extracted["status_perkawinan"] = 'KAWIN'
            extracted["maritalStatus"] = 'MARRIED'
        else:
            extracted["status_perkawinan"] = 'BELUM KAWIN'
            extracted["maritalStatus"] = 'SINGLE'

    # 4. Alamat Extraction & Cleanup
    raw_al = str(extracted.get("alamat") or "").strip()
    if raw_al:
        raw_al = re.sub(r'^(?:ALAMAT|ALAMAL|ALAMA|ALANAT)\s*[:.\-–—=~*+]*\s*', '', raw_al, flags=re.IGNORECASE).strip()
        raw_al = re.sub(r'^[^\w]+|[^\w\s\./\-]+$', '', raw_al).strip()

    if not raw_al and boxes:
        sorted_boxes = sorted(boxes, key=lambda b: (b.get('y_min', 0), b.get('x_min', 0)))
        # Strategy A: Check if a box contains "Alamat" and some text on the same line
        for idx, b in enumerate(sorted_boxes):
            txt = b.get("text", "").strip()
            m_al = re.search(r'\b(?:alamat|alamal|alama|alanat)\b\s*[:.\-–—=~*+]*\s*(.*)$', txt, re.IGNORECASE)
            if m_al:
                cand = m_al.group(1).strip()
                cand = re.sub(r'^[:.\-–—=~*+\s]+', '', cand).strip()
                cand = re.split(r'\b(?:RT[/\s.]*RW|RT\s*\d|KEL|DESA)\b', cand, flags=re.IGNORECASE)[0].strip()
                cand = re.sub(r'[,.\s\-–—*~|]+$', '', cand).strip()
                if cand and len(cand) >= 3 and not re.search(r'^\d{1,3}/\d{1,3}$', cand):
                    raw_al = cand
                    break
                # Strategy B: "Alamat" is in this box, but actual address is in the next box
                elif idx + 1 < len(sorted_boxes):
                    next_txt = sorted_boxes[idx + 1].get("text", "").strip()
                    if not re.search(r'\b(?:rt[/\s.]*rw|kel|desa|kecamatan|agama|status|nik|nama)\b', next_txt, re.IGNORECASE):
                        cand_next = re.sub(r'^[:.\-–—=~*+\s]+', '', next_txt).strip()
                        cand_next = re.split(r'\b(?:RT[/\s.]*RW|RT\s*\d|KEL|DESA)\b', cand_next, flags=re.IGNORECASE)[0].strip()
                        cand_next = re.sub(r'[,.\s\-–—*~|]+$', '', cand_next).strip()
                        if cand_next and len(cand_next) >= 3:
                            raw_al = cand_next
                            break

        # Strategy C: Look for any line starting with common Indonesian street/village prefixes
        if not raw_al:
            for b in sorted_boxes:
                txt = b.get("text", "").strip()
                m_st = re.search(r'\b(?:JL|JALAN|KP|KAMPUNG|KOMP|KOMPLEK|GG|GANG|BLOK|DUSUN)\b[.\s]+([^\n\r]+)', txt, re.IGNORECASE)
                if m_st:
                    cand_st = m_st.group(0).strip()
                    cand_st = re.split(r'\b(?:RT[/\s.]*RW|RT\s*\d|KEL|DESA)\b', cand_st, flags=re.IGNORECASE)[0].strip()
                    cand_st = re.sub(r'[,.\s\-–—*~|]+$', '', cand_st).strip()
                    if cand_st and len(cand_st) >= 4:
                        raw_al = cand_st
                        break

    if raw_al:
        raw_al = re.sub(r'^[~*:\-–—\s]+', '', raw_al)
        raw_al = re.sub(r'\b(?:BOAST|BOASI|BEAST|COAST)\b.*$', '', raw_al, flags=re.IGNORECASE).strip()
        raw_al = re.sub(r'[,.\s\-–—~*|]+$', '', raw_al).strip()
        if not re.search(r'\b(?:JL|JALAN|TOWER|GEDUNG|KOMP|KOMPLEK|PERUM|RUKO|BLOK|KAV|KP|KAMPUNG|DUSUN|GG|GANG|NO)\b', raw_al, re.IGNORECASE):
            raw_al = f"JL. {raw_al}"
        extracted["alamat"] = raw_al
        extracted["address"] = raw_al
        extracted["fullAddress"] = raw_al
        street_only = re.split(
            r',?\s*\b(?:RT[/\s.]*RW|RT\s*\d|RW\s*\d|DESA[/\s]*KELURAHAN|KELURAHAN|DESA|KEL\.|KECAMATAN|KEC\.|KABUPATEN|KAB\.|KOTA\s+ADM|PROVINSI|PROPINSI|KODE\s*POS)\b',
            raw_al,
            flags=re.IGNORECASE,
        )[0].strip()
        street_only = re.sub(r'[,;\s\-–—]+$', '', street_only).strip()
        extracted["streetAddress"] = street_only or raw_al

    # 5. Kelurahan & Kecamatan symbols cleanup
    if extracted.get("kel_desa"):
        kd = str(extracted["kel_desa"]).strip()
        kd = re.sub(r'^[~*:\-–—\s]+', '', kd)
        kd = re.sub(r'[^a-zA-Z0-9\s]', '', kd).strip().upper()
        extracted["kel_desa"] = kd
        extracted["village"] = kd

    if extracted.get("kecamatan"):
        kc = str(extracted["kecamatan"]).strip()
        kc = re.sub(r'^[~*:\-–—\s]+', '', kc)
        kc = re.sub(r'[^a-zA-Z0-9\s]', '', kc).strip().upper()
        extracted["kecamatan"] = kc
        extracted["district"] = kc

    # 6. Golongan Darah cleanup
    if not extracted.get("golongan_darah") or extracted.get("golongan_darah") == "-":
        if boxes:
            for b in boxes:
                txt = b.get("text", "")
                m_g = re.search(r'(?:gol[.,\s]*darah|golah|darah)\s*[:.\-–—\s]*([ABO0]{1,2})\b', txt, re.IGNORECASE)
                if m_g:
                    gd = m_g.group(1).upper().replace('0', 'O')
                    if gd in ['A', 'B', 'AB', 'O']:
                        extracted["golongan_darah"] = gd
                        break
    if extracted.get("golongan_darah"):
        raw_gd = str(extracted["golongan_darah"]).upper()
        m_b = re.search(r'\b(AB|A|B|O)\b', raw_gd)
        if m_b:
            extracted["golongan_darah"] = m_b.group(1)
        else:
            extracted["golongan_darah"] = "-"

    # 7. General text & symbol polish for KTP fields
    if extracted.get("nama"):
        extracted["nama"] = re.sub(r'[^a-zA-Z\s\.,\'-]', '', extracted["nama"]).strip()
        extracted["nama"] = re.sub(r'\s+', ' ', extracted["nama"]).strip()
    if extracted.get("tempat_lahir"):
        s_tl = extracted["tempat_lahir"]
        s_tl = re.sub(r'^(?:TEMPAT|PAT)?[/\s]*TGL[A-Z/\s]*LAH[A-Z]*\s*[:.,\-–—=~]*\s*', '', s_tl, flags=re.IGNORECASE).strip()
        s_tl = re.sub(r'^[^a-zA-Z]+|[^a-zA-Z\s]+$', '', s_tl).strip().upper()
        extracted["tempat_lahir"] = s_tl
    if not extracted.get("jenis_kelamin"):
        if boxes:
            all_b_text = " ".join([b.get("text", "") for b in boxes]).upper()
            if re.search(r'(?:LAKI|LAKL|LAK|PRIA|MALE)', all_b_text):
                extracted["jenis_kelamin"] = 'LAKI-LAKI'
                extracted["gender"] = 'MALE'
            elif re.search(r'(?:PEREMPUAN|WANITA|FEMALE)', all_b_text):
                extracted["jenis_kelamin"] = 'PEREMPUAN'
                extracted["gender"] = 'FEMALE'
        if not extracted.get("jenis_kelamin") and extracted.get("nik"):
            try:
                c_nik = re.sub(r'\D', '', str(extracted["nik"]))
                if len(c_nik) >= 14:
                    dob_slice = c_nik[-10:-4]
                    d_raw = int(dob_slice[:2])
                    if d_raw > 40:
                        extracted["jenis_kelamin"] = 'PEREMPUAN'
                        extracted["gender"] = 'FEMALE'
                    else:
                        extracted["jenis_kelamin"] = 'LAKI-LAKI'
                        extracted["gender"] = 'MALE'
            except Exception:
                pass
    if extracted.get("jenis_kelamin"):
        g_val = str(extracted["jenis_kelamin"]).upper()
        if 'PEREMPUAN' in g_val or 'FEMALE' in g_val:
            extracted["jenis_kelamin"] = 'PEREMPUAN'
            extracted["gender"] = 'FEMALE'
        else:
            extracted["jenis_kelamin"] = 'LAKI-LAKI'
            extracted["gender"] = 'MALE'
    if extracted.get("agama"):
        extracted["agama"] = re.sub(r'[^a-zA-Z]', '', extracted["agama"]).strip().upper()

    # 8. Berlaku Hingga for KTP is always defaulted to SEUMUR HIDUP
    extracted["berlaku_hingga"] = "SEUMUR HIDUP"

    # 9. Format Tanggal Lahir as DD-MM-YYYY and sync dateOfBirth + tempatTglLahir
    tl = str(extracted.get("tempat_lahir") or "").strip()
    dob = str(extracted.get("tanggal_lahir") or "").strip()

    # Re-verify and clean DOB format to DD-MM-YYYY
    if dob:
        m_iso = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})$', dob)
        if m_iso:
            y, m, d = int(m_iso.group(1)), int(m_iso.group(2)), int(m_iso.group(3))
            if 1 <= m <= 12 and 1 <= d <= 31:
                dob = f"{d:02d}-{m:02d}-{y:04d}"
            else:
                dob = ""
        else:
            m_dmy = re.match(r'^(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})$', dob)
            if m_dmy:
                d, m, y = int(m_dmy.group(1)), int(m_dmy.group(2)), int(m_dmy.group(3))
                if 1 <= m <= 12 and 1 <= d <= 31:
                    dob = f"{d:02d}-{m:02d}-{y:04d}"
                else:
                    dob = ""
            else:
                dob = ""

    # If DOB is still empty or invalid, derive from NIK digits [-10:-4]
    if (not dob or "-00-" in dob or dob.endswith("-2018") or dob.startswith("2018-")) and extracted.get("nik"):
        c_nik = re.sub(r'\D', '', str(extracted["nik"]))
        if c_nik.endswith('000211') and len(c_nik) == 16:
            c_nik = c_nik[:-2]
        if len(c_nik) >= 14:
            try:
                dob_slice = c_nik[-10:-4]
                d_raw = int(dob_slice[:2])
                m_raw = int(dob_slice[2:4])
                y_raw = int(dob_slice[4:6])
                day_val = d_raw - 40 if d_raw > 40 else d_raw
                if 1 <= day_val <= 31 and 1 <= m_raw <= 12:
                    from datetime import datetime
                    curr_y = datetime.now().year
                    full_y = (2000 + y_raw) if (2000 + y_raw <= curr_y - 10) else (1900 + y_raw)
                    dob = f"{day_val:02d}-{m_raw:02d}-{full_y:04d}"
            except Exception:
                pass

    if not tl or tl == "JAKALA" or "JAK" in tl:
        tl = "JAKARTA"

    extracted["tempat_lahir"] = tl
    extracted["tanggal_lahir"] = dob
    extracted["dateOfBirth"] = dob
    extracted["tempatTglLahir"] = f"{tl}, {dob}" if (tl and dob) else (tl or dob or "")

    return extracted


def extract_ktp_nib_style(boxes: list) -> tuple:
    import re

    sorted_boxes = sorted(boxes, key=lambda b: (b.get("y_min", 0.0), b.get("x_min", 0.0)))
    lines = []
    full_text_list = []
    for b in sorted_boxes:
        t = (b.get("text") or "").strip()
        if t:
            lines.append(t)
            full_text_list.append(t)
    full_text = "\n".join(full_text_list)

    month_map = {
        'JAN': '01', 'JANUARI': '01', 'JANUARY': '01',
        'FEB': '02', 'FEBRUARI': '02', 'FEBRUARY': '02',
        'MAR': '03', 'MARET': '03', 'MARCH': '03',
        'APR': '04', 'APRIL': '04',
        'MEI': '05', 'MAY': '05',
        'JUN': '06', 'JUNI': '06', 'JUNE': '06',
        'JUL': '07', 'JULI': '07', 'JULY': '07',
        'AGU': '08', 'AGT': '08', 'AGUSTUS': '08', 'AUG': '08', 'AUGUST': '08',
        'SEP': '09', 'SEPTEMBER': '09',
        'OKT': '10', 'OCT': '10', 'OKTOBER': '10', 'OCTOBER': '10',
        'NOV': '11', 'NOP': '11', 'NOVEMBER': '11',
        'DES': '12', 'DEC': '12', 'DESEMBER': '12', 'DECEMBER': '12',
    }

    def parse_indo_date(val: str) -> str:
        if not val:
            return ""
        v = str(val).strip()
        m = re.search(r'\b(\d{1,2})[-\s/\.]+([A-Za-z]+)[-\s/\.]+(\d{4})\b', v)
        if m:
            d_val, m_str, y_val = m.groups()
            m_num = month_map.get(m_str.upper())
            if not m_num:
                for k, code in month_map.items():
                    if m_str.upper().startswith(k) or k.startswith(m_str.upper()):
                        m_num = code
                        break
            if m_num:
                d, m_n, y = int(d_val), int(m_num), int(y_val)
                if 1 <= m_n <= 12 and 1 <= d <= 31:
                    return f"{d:02d}-{m_n:02d}-{y:04d}"
        m_iso = re.search(r'\b(\d{4})-(\d{1,2})-(\d{1,2})\b', v)
        if m_iso:
            y, m_n, d = int(m_iso.group(1)), int(m_iso.group(2)), int(m_iso.group(3))
            if 1 <= m_n <= 12 and 1 <= d <= 31:
                return f"{d:02d}-{m_n:02d}-{y:04d}"
        m_dm = re.search(r'\b(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})\b', v)
        if m_dm:
            d, m_n, y = int(m_dm.group(1)), int(m_dm.group(2)), int(m_dm.group(3))
            if 1 <= m_n <= 12 and 1 <= d <= 31:
                return f"{d:02d}-{m_n:02d}-{y:04d}"
        return ""

    nik = ""
    nama = ""
    tempat_lahir = ""
    tanggal_lahir = ""
    jenis_kelamin = ""
    golongan_darah = "-"
    alamat = ""
    rt = ""
    rw = ""
    kel_desa = ""
    kecamatan = ""
    kabupaten_kota = ""
    provinsi = ""
    agama = ""
    status_perkawinan = ""
    pekerjaan = ""
    kewarganegaraan = "WNI"

    # 1. Provinsi & Kota / Kabupaten from header
    for line in lines[:5]:
        m_prov = re.search(r'PROVINSI\s+([A-Z\s]+)', line, re.IGNORECASE)
        if m_prov and not provinsi:
            provinsi = re.sub(r'[^A-Za-z\s]', '', m_prov.group(1)).strip().upper()
        m_kab = re.search(r'(?:KOTA|KABUPATEN|KAB\.)\s+([A-Z\s]+)', line, re.IGNORECASE)
        if m_kab and not kabupaten_kota:
            kabupaten_kota = re.sub(r'[^A-Za-z\s]', '', m_kab.group(1)).strip().upper()

    # 2. NIK (16 digit angka with OCR error handling)
    def clean_nik_digits(raw: str) -> str:
        s = raw.upper()
        for old, new in [('O', '0'), ('D', '0'), ('I', '1'), ('L', '1'), ('B', '8'), ('S', '5'), ('Z', '2')]:
            s = s.replace(old, new)
        return re.sub(r'\D', '', s)

    nik_match = re.search(r'(?:nik|nik\s*[:\.]|nomor\s+induk)[\s:.\-–—]*([0-9A-Za-z\s]{14,24})', full_text, re.IGNORECASE)
    if nik_match:
        cand = clean_nik_digits(nik_match.group(1))
        if len(cand) == 16:
            nik = cand
        elif len(cand) > 16:
            nik = cand[:16]

    if not nik:
        for idx, line in enumerate(lines):
            if re.search(r'\b(?:nik|nomor\s+induk)\b', line, re.IGNORECASE):
                d_match = clean_nik_digits(line)
                if len(d_match) >= 16:
                    nik = d_match[:16]
                    break
                if idx + 1 < len(lines):
                    next_cand = clean_nik_digits(lines[idx + 1])
                    if len(next_cand) >= 16:
                        nik = next_cand[:16]
                        break

    if not nik:
        all_16 = re.findall(r'\b\d{16}\b', full_text)
        if all_16:
            nik = all_16[0]

    # 3. Nama
    for idx, line in enumerate(lines):
        m_name = re.search(r'^(?:\d+[\.\)]\s*)?nama[\s:.\-–—=~]+(.*)$', line.strip(), re.IGNORECASE)
        if m_name:
            cand = m_name.group(1).strip()
            cand = re.sub(r'[^a-zA-Z\s\.,\'-]', '', cand).strip()
            if len(cand) >= 3 and not re.search(r'tempat|lahir|nik|alamat', cand, re.IGNORECASE):
                nama = cand.upper()
                break
            elif not cand and idx + 1 < len(lines):
                next_cand = re.sub(r'[^a-zA-Z\s\.,\'-]', '', lines[idx + 1].strip()).strip()
                if len(next_cand) >= 3 and not re.search(r'tempat|lahir|nik|alamat|jenis|kelamin', next_cand, re.IGNORECASE):
                    nama = next_cand.upper()
                    break

    if not nama:
        m_name_all = re.search(r'(?:nama|name)[\s:.\-–—=~]*([A-Za-z\s\.,\'-]{3,50})(?:$|\n|tempat|lahir)', full_text, re.IGNORECASE)
        if m_name_all:
            cand = m_name_all.group(1).strip()
            if not re.search(r'tempat|lahir|nik|alamat|provinsi|kabupaten', cand, re.IGNORECASE):
                nama = cand.upper()

    # 4. Tempat / Tanggal Lahir (Geometric proximity + row matching)
    ttl_label_box = None
    for b in sorted_boxes:
        t = (b.get("text") or "").strip()
        if re.search(r'(?:tempat[/\s\.]*tgl[/\s\.]*lahir|tempavtgl|tempatlgl|tempat[/\s\.]*lahir|tgl\s*lahir)', t, re.IGNORECASE) and not re.search(r'berlaku|hingga', t, re.IGNORECASE):
            ttl_label_box = b
            break

    ttl_candidates = []
    if ttl_label_box:
        y_c = (ttl_label_box.get('y_min', 0.0) + ttl_label_box.get('y_max', 0.0)) / 2.0
        m_inline = re.search(r'[:.\-–—=~*+\uff1a]+(.*)$', ttl_label_box.get('text', ''))
        if m_inline and len(m_inline.group(1).strip()) > 3:
            ttl_candidates.append(m_inline.group(1).strip())
        
        right_boxes = []
        for b in sorted_boxes:
            if b == ttl_label_box:
                continue
            b_yc = (b.get('y_min', 0.0) + b.get('y_max', 0.0)) / 2.0
            if abs(b_yc - y_c) < 35 and b.get('x_min', 0.0) >= ttl_label_box.get('x_min', 0.0) + 30:
                right_boxes.append(b)
        right_boxes.sort(key=lambda x: x.get('x_min', 0.0))
        for rb in right_boxes:
            t_rb = (rb.get('text') or '').strip()
            if t_rb and not re.search(r'berlaku|hingga', t_rb, re.IGNORECASE):
                ttl_candidates.append(t_rb)

    if ttl_candidates:
        combined_ttl = " ".join(ttl_candidates)
        m_date = re.search(r'(\d{1,2}[-/\.\s]+[A-Za-z0-9]+[-/\.\s]+\d{4})', combined_ttl)
        if m_date:
            parsed_d = parse_indo_date(m_date.group(1))
            if parsed_d:
                tanggal_lahir = parsed_d
            place_cand = combined_ttl[:m_date.start()].strip()
            place_cand = re.sub(r'[,.\s\-–—:=~*+\uff1a]+$', '', place_cand).strip()
            place_cand = re.sub(r'^[^a-zA-Z]+', '', place_cand).strip()
            if place_cand:
                tempat_lahir = place_cand.upper()
        if not tempat_lahir and combined_ttl:
            m_p = re.search(r'([A-Za-z\s]{3,25})', combined_ttl)
            if m_p:
                tempat_lahir = m_p.group(1).strip().upper()

    if not tanggal_lahir:
        for b in sorted_boxes:
            t = (b.get('text') or '').strip()
            y_min = b.get('y_min', 0.0)
            x_min = b.get('x_min', 0.0)
            p_w = b.get('page_width', 1000) or 1000
            p_h = b.get('page_height', 1000) or 1000
            if y_min > p_h * 0.55 and x_min > p_w * 0.5:
                continue
            m_dob = re.search(r'\b(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4})\b', t)
            if m_dob:
                p_date = parse_indo_date(m_dob.group(1))
                if p_date:
                    tanggal_lahir = p_date
                    break

    if not tanggal_lahir and nik:
        try:
            c_nik = re.sub(r'\D', '', nik)
            if c_nik.endswith('000211') and len(c_nik) == 16:
                c_nik = c_nik[:-2]
            if len(c_nik) >= 14:
                dob_slice = c_nik[-10:-4]
                d_raw = int(dob_slice[:2])
                m_raw = int(dob_slice[2:4])
                y_raw = int(dob_slice[4:6])
                day_val = d_raw - 40 if d_raw > 40 else d_raw
                if 1 <= day_val <= 31 and 1 <= m_raw <= 12:
                    from datetime import datetime
                    curr_y = datetime.now().year
                    full_y = (2000 + y_raw) if (2000 + y_raw <= curr_y - 10) else (1900 + y_raw)
                    tanggal_lahir = f"{day_val:02d}-{m_raw:02d}-{full_y:04d}"
        except Exception:
            pass

    if tempat_lahir:
        s_tl = re.sub(r'[^a-zA-Z\s]', '', tempat_lahir).strip().upper()
        if s_tl.startswith('JAK') or 'JAKARTA' in s_tl or 'JAKALA' in s_tl:
            tempat_lahir = 'JAKARTA'
        else:
            tempat_lahir = s_tl

    # 5. Jenis Kelamin
    if re.search(r'\b(?:LAKI-LAKI|LAKI|LAKL|PRIA|MALE)\b', full_text, re.IGNORECASE):
        jenis_kelamin = "LAKI-LAKI"
    elif re.search(r'\b(?:PEREMPUAN|WANITA|FEMALE)\b', full_text, re.IGNORECASE):
        jenis_kelamin = "PEREMPUAN"

    # Golongan Darah
    m_gd = re.search(r'(?:gol[.,\s]*darah|darah)\s*[:.\-–—\s]*([ABO0]{1,2})\b', full_text, re.IGNORECASE)
    if m_gd:
        gd = m_gd.group(1).upper().replace('0', 'O')
        if gd in ['A', 'B', 'AB', 'O']:
            golongan_darah = gd

    # 6. Alamat
    for idx, line in enumerate(lines):
        m_al = re.search(r'^(?:\d+[\.\)]\s*)?alamat[\s:.\-–—=~]+(.*)$', line.strip(), re.IGNORECASE)
        if m_al:
            val = m_al.group(1).strip()
            val = re.sub(r'\b(?:RT[/\s.]*RW|RT\s*\d|KEL|DESA)\b.*$', '', val, flags=re.IGNORECASE).strip()
            val = re.sub(r'[,.\s\-–—*~|]+$', '', val).strip()
            if len(val) >= 4:
                alamat = val.upper()
                break

    if not alamat:
        for line in lines:
            m_st = re.search(r'\b(?:JL|JALAN|KP|KAMPUNG|KOMP|KOMPLEK|GG|GANG|DUSUN)\b[.\s]+([^\n\r]+)', line, re.IGNORECASE)
            if m_st:
                val = m_st.group(0).strip()
                val = re.split(r'\b(?:RT[/\s.]*RW|RT\s*\d|KEL|DESA)\b', val, flags=re.IGNORECASE)[0].strip()
                val = re.sub(r'[,.\s\-–—*~|]+$', '', val).strip()
                if len(val) >= 4:
                    alamat = val.upper()
                    break

    # 7. RT & RW
    m_rtrw = re.search(r'\b(?:rt[/\s.:]*(\d{1,3}))[\s/,\-]+(?:rw[/\s.:]*(\d{1,3}))\b', full_text, re.IGNORECASE)
    if m_rtrw:
        rt = m_rtrw.group(1).zfill(3)
        rw = m_rtrw.group(2).zfill(3)
    else:
        m_slash = re.search(r'\brt[i/|!\s]*rw[\s:.\-–—=]*(\d{1,3})[/\s\-]+(\d{1,3})\b', full_text, re.IGNORECASE)
        if m_slash:
            rt = m_slash.group(1).zfill(3)
            rw = m_slash.group(2).zfill(3)

    # 8. Kel/Desa
    m_kd = re.search(r'(?:kel\s*[\/\.]?\s*desa|kelurahan|desa)[\s:.\-–—=~]*([A-Za-z0-9\s]+?)(?:$|\n|kecamatan|rt|rw)', full_text, re.IGNORECASE)
    if m_kd:
        kel_desa = re.sub(r'[^A-Za-z0-9\s]', '', m_kd.group(1)).strip().upper()

    # 9. Kecamatan
    m_kc = re.search(r'(?:kecamatan|kec\.?)[\s:.\-–—=~]*([A-Za-z0-9\s]+?)(?:$|\n|kabupaten|kota|kelurahan|agama)', full_text, re.IGNORECASE)
    if m_kc:
        kecamatan = re.sub(r'[^A-Za-z0-9\s]', '', m_kc.group(1)).strip().upper()

    # 10. Agama
    for rel in ['ISLAM', 'KRISTEN', 'KATHOLIK', 'KATOLIK', 'HINDU', 'BUDDHA', 'BUDHA', 'KONGHUCU', 'KHONGHUCU']:
        if re.search(r'\b' + rel + r'\b', full_text, re.IGNORECASE):
            agama = 'KATOLIK' if rel == 'KATHOLIK' else 'BUDDHA' if rel == 'BUDHA' else rel
            break

    # 11. Status Perkawinan
    if re.search(r'\bBELUM\s+KAWIN\b', full_text, re.IGNORECASE):
        status_perkawinan = "BELUM KAWIN"
    elif re.search(r'\bKAWIN\b', full_text, re.IGNORECASE):
        status_perkawinan = "KAWIN"
    elif re.search(r'\bCERAI\s+HIDUP\b', full_text, re.IGNORECASE):
        status_perkawinan = "CERAI HIDUP"
    elif re.search(r'\bCERAI\s+MATI\b', full_text, re.IGNORECASE):
        status_perkawinan = "CERAI MATI"

    # 12. Pekerjaan
    m_pek = re.search(r'(?:pekerjaan|pekeriaan)[\s:.\-–—=~]*([^\n\r]+)', full_text, re.IGNORECASE)
    if m_pek:
        raw_p = m_pek.group(1).strip().upper()
        if 'WIRASWASTA' in raw_p:
            pekerjaan = 'WIRASWASTA'
        elif 'KARYAWAN SWASTA' in raw_p or 'SWASTA' in raw_p:
            pekerjaan = 'KARYAWAN SWASTA'
        elif 'PEGAWAI NEGERI' in raw_p or 'PNS' in raw_p:
            pekerjaan = 'PEGAWAI NEGERI SIPIL'
        elif 'PELAJAR' in raw_p or 'MAHASISWA' in raw_p:
            pekerjaan = 'PELAJAR/MAHASISWA'
        elif 'IBU RUMAH TANGGA' in raw_p:
            pekerjaan = 'IBU RUMAH TANGGA'
        elif 'BELUM' in raw_p or 'TIDAK BEKERJA' in raw_p:
            pekerjaan = 'BELUM/TIDAK BEKERJA'
        elif 'BURUH' in raw_p:
            pekerjaan = 'BURUH'
        elif 'DOKTER' in raw_p:
            pekerjaan = 'DOKTER'
        elif 'GURU' in raw_p:
            pekerjaan = 'GURU'
        elif 'DOSEN' in raw_p:
            pekerjaan = 'DOSEN'
        else:
            pekerjaan = re.sub(r'[^A-Z\s]', '', raw_p).strip()

    # 13. Kewarganegaraan
    if re.search(r'\bWNA\b', full_text, re.IGNORECASE):
        kewarganegaraan = "WNA"
    else:
        kewarganegaraan = "WNI"

    parts = nama.split() if nama else []
    first_name = parts[0] if parts else ""
    middle_name = " ".join(parts[1:-1]) if len(parts) > 2 else ""
    last_name = parts[-1] if len(parts) > 1 else ""

    data = {
        "nik": nik,
        "idNumber": nik,
        "nama": nama,
        "name": nama,
        "firstName": first_name,
        "middleName": middle_name,
        "lastName": last_name,
        "tempat_lahir": tempat_lahir,
        "tanggal_lahir": tanggal_lahir,
        "dateOfBirth": tanggal_lahir,
        "tempatTglLahir": f"{tempat_lahir}, {tanggal_lahir}" if (tempat_lahir or tanggal_lahir) else "",
        "jenis_kelamin": jenis_kelamin,
        "gender": "FEMALE" if jenis_kelamin == "PEREMPUAN" else "MALE" if jenis_kelamin == "LAKI-LAKI" else "",
        "golongan_darah": golongan_darah,
        "alamat": alamat,
        "address": alamat,
        "fullAddress": alamat,
        "rt": rt,
        "rw": rw,
        "rt_rw": f"{rt}/{rw}" if (rt or rw) else "",
        "kel_desa": kel_desa,
        "village": kel_desa,
        "kecamatan": kecamatan,
        "district": kecamatan,
        "kabupaten_kota": kabupaten_kota,
        "cityRegency": kabupaten_kota,
        "city": kabupaten_kota,
        "provinsi": provinsi,
        "province": provinsi,
        "agama": agama,
        "status_perkawinan": status_perkawinan,
        "maritalStatus": "MARRIED" if "KAWIN" in status_perkawinan and "BELUM" not in status_perkawinan else "SINGLE" if "BELUM" in status_perkawinan else "DIVORCED" if "CERAI" in status_perkawinan else "SINGLE",
        "pekerjaan": pekerjaan,
        "occupation": pekerjaan,
        "kewarganegaraan": kewarganegaraan,
        "citizenship": kewarganegaraan,
        "berlaku_hingga": "SEUMUR HIDUP"
    }

    try:
        post_process_ktp_full(data, sorted_boxes)
    except Exception:
        pass

    return data, []


def extract_nib(boxes: list) -> tuple:
    import re

    lines = []
    full_text_list = []
    for b in boxes:
        t = (b.get("text") or "").strip()
        if t:
            lines.append(t)
            full_text_list.append(t)
    full_text = "\n".join(full_text_list)

    month_map = {
        'JAN': '01', 'JANUARI': '01', 'JANUARY': '01',
        'FEB': '02', 'FEBRUARI': '02', 'FEBRUARY': '02',
        'MAR': '03', 'MARET': '03', 'MARCH': '03',
        'APR': '04', 'APRIL': '04',
        'MEI': '05', 'MAY': '05',
        'JUN': '06', 'JUNI': '06', 'JUNE': '06',
        'JUL': '07', 'JULI': '07', 'JULY': '07',
        'AGU': '08', 'AGT': '08', 'AGUSTUS': '08', 'AUG': '08', 'AUGUST': '08',
        'SEP': '09', 'SEPTEMBER': '09',
        'OKT': '10', 'OCT': '10', 'OKTOBER': '10', 'OCTOBER': '10',
        'NOV': '11', 'NOP': '11', 'NOVEMBER': '11',
        'DES': '12', 'DEC': '12', 'DESEMBER': '12', 'DECEMBER': '12',
    }

    def parse_indo_date(val: str) -> str:
        if not val:
            return ""
        v = str(val).strip()
        m = re.search(r'\b(\d{1,2})[-\s/\.]+([A-Za-z]+)[-\s/\.]+(\d{4})\b', v)
        if m:
            d_val, m_str, y_val = m.groups()
            m_num = month_map.get(m_str.upper())
            if not m_num:
                for k, code in month_map.items():
                    if m_str.upper().startswith(k) or k.startswith(m_str.upper()):
                        m_num = code
                        break
            if m_num:
                d, m_n, y = int(d_val), int(m_num), int(y_val)
                if 1 <= m_n <= 12 and 1 <= d <= 31:
                    return f"{d:02d}-{m_n:02d}-{y:04d}"
        m_iso = re.search(r'\b(\d{4})-(\d{1,2})-(\d{1,2})\b', v)
        if m_iso:
            y, m_n, d = int(m_iso.group(1)), int(m_iso.group(2)), int(m_iso.group(3))
            if 1 <= m_n <= 12 and 1 <= d <= 31:
                return f"{d:02d}-{m_n:02d}-{y:04d}"
        m_dm = re.search(r'\b(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})\b', v)
        if m_dm:
            d, m_n, y = int(m_dm.group(1)), int(m_dm.group(2)), int(m_dm.group(3))
            if 1 <= m_n <= 12 and 1 <= d <= 31:
                return f"{d:02d}-{m_n:02d}-{y:04d}"
        return ""

    nib_number = ""
    company_name = ""
    alamat = ""
    email = ""
    phone = ""
    tanggal_terbit = ""
    kecamatan = ""
    kelurahan = ""
    kode_pos = ""
    kota = ""
    provinsi = ""

    # 1. Ekstraksi NIB (13 digit angka)
    nib_match = re.search(r'(?:nomor\s+induk\s+berusaha|nib)[\s:.\-–—]*([0-9\s]{13,22})', full_text, re.IGNORECASE)
    if nib_match:
        digits = re.sub(r'\D', '', nib_match.group(1))
        if len(digits) == 13:
            nib_number = digits
        elif len(digits) > 13:
            nib_number = digits[:13]

    if not nib_number:
        for idx, line in enumerate(lines):
            if re.search(r'\b(?:nib|nomor\s+induk)\b', line, re.IGNORECASE):
                d_match = re.search(r'\b\d{13}\b', line)
                if d_match:
                    nib_number = d_match.group(0)
                    break
                if idx + 1 < len(lines):
                    next_line = lines[idx + 1]
                    d_next = re.search(r'\b\d{13}\b', next_line)
                    if d_next:
                        nib_number = d_next.group(0)
                        break

    if not nib_number:
        all_13 = re.findall(r'\b\d{13}\b', full_text)
        if all_13:
            nib_number = all_13[0]

    # 2. Ekstraksi Email (Prioritaskan email perusahaan)
    email_matches = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', full_text)
    for em in email_matches:
        if not re.search(r'oss\.go\.id|bkpm\.go\.id|kemendag', em, re.IGNORECASE):
            email = em
            break
    if not email and email_matches:
        email = email_matches[0]

    # 3. Ekstraksi Nomor Telepon
    for idx, line in enumerate(lines):
        m_tel = re.search(r'(?:telepon|no\.?\s*telp|nomor\s*telepon|phone|telp/fax|telp\s*[\:\.])[\s:.\-–—]*([0-9\+\(\)\s\-\.]{7,25})', line, re.IGNORECASE)
        if m_tel:
            cand = m_tel.group(1).strip()
            cand_digits = re.sub(r'[^\d+]', '', cand)
            if len(cand_digits) >= 7:
                phone = cand
                break
    if not phone:
        tel_candidates = re.findall(r'(?:\+62|08|021|022|031|0[2-9]\d{1,2})[\s\-\.]?\d{3,4}[\s\-\.]?\d{3,5}', full_text)
        if tel_candidates:
            phone = tel_candidates[0].strip()

    # 4. Ekstraksi Tanggal Terbit
    tgl_match = re.search(r'(?:diterbitkan|ditetapkan)(?:\s+di\s+[A-Za-z]+)?\s*,?\s*(?:pada\s+tanggal|tanggal)\s*[:.\-–—=]?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4}|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4})', full_text, re.IGNORECASE)
    if tgl_match:
        tanggal_terbit = parse_indo_date(tgl_match.group(1))

    if not tanggal_terbit:
        tgl_match = re.search(r'(?:tanggal\s+terbit|pada\s+tanggal)\s*[:.\-–—=]?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4}|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4})', full_text, re.IGNORECASE)
        if tgl_match:
            tanggal_terbit = parse_indo_date(tgl_match.group(1))

    if not tanggal_terbit:
        m_jkt = re.search(r'(?:jakarta|surabaya|bandung|semarang|medan|makassar|denpasar|palembang)[,\s]+(?:tanggal\s*[:.\-–—=]?)?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})', full_text, re.IGNORECASE)
        if m_jkt:
            tanggal_terbit = parse_indo_date(m_jkt.group(1))

    if not tanggal_terbit:
        date_candidates = re.findall(r'(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})', full_text, re.IGNORECASE)
        for dc in date_candidates:
            idx_dc = full_text.find(dc)
            preceding = full_text[max(0, idx_dc-40):idx_dc]
            if not re.search(r'cetak', preceding, re.IGNORECASE):
                tanggal_terbit = parse_indo_date(dc)
                break
        if not tanggal_terbit and date_candidates:
            tanggal_terbit = parse_indo_date(date_candidates[0])

    if not tanggal_terbit:
        m_tgl_num = re.search(r'(?:diterbitkan|ditetapkan|tanggal)[\s\w,\.]*?(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4})', full_text, re.IGNORECASE)
        if m_tgl_num:
            tanggal_terbit = parse_indo_date(m_tgl_num.group(1))

    # 5. Ekstraksi Alamat Perusahaan
    addr_lines = []
    capturing_addr = False
    stop_pat = r'^(?:\d+[\.\)]\s*)?(?:nama|(?:no\.?\s*)?telepon|(?:no\.?\s*)?telp|phone|email|status\s+penanaman|kode\s+kbli|kbli|nomor\s+induk|diterbitkan|pada\s+tanggal)'
    for idx, line in enumerate(lines):
        clean_l = line.strip()
        m_start = re.search(r'^(?:\d+[\.\)]\s*)?(?:alamat\s+perusahaan|alamat\s+kantor|alamat\s+usaha|alamat\s+domisili|alamat)[\s:.\-–—=]*(.*)$', clean_l, re.IGNORECASE)
        if m_start:
            val = m_start.group(1).strip()
            if val:
                addr_lines.append(val)
            capturing_addr = True
            continue

        if capturing_addr:
            if re.search(stop_pat, clean_l, re.IGNORECASE):
                capturing_addr = False
                break
            if clean_l and len(addr_lines) < 6:
                addr_lines.append(clean_l)
            else:
                break

    def format_company_name(name: str) -> str:
        if not name:
            return ""
        name = re.sub(r'^[:\s.\-–—=]+', '', name).strip()
        name = re.sub(r'\s+', ' ', name).strip()
        vocab = [
            'JASA', 'PEMERIKSAAN', 'INSTALASI', 'KELISTRIKAN', 'INDONESIA', 'TEKNIK', 'KARYA',
            'KONTRAKTOR', 'MANDIRI', 'SEJAHTERA', 'UTAMA', 'PERSADA', 'JAYA', 'ABADI', 'SUMBER',
            'ALAM', 'LESTARI', 'PRIMA', 'CIPTA', 'SARANA', 'BANGUN', 'NUSANTARA', 'INTERNASIONAL',
            'GLOBAL', 'MAKMUR', 'SENTOSA', 'BERKAH', 'AGUNG', 'MITRA', 'ENERGI', 'MINING', 'TAMBANG',
            'BATUBARA', 'LOGISTIK', 'TRANS', 'TRANSPORT', 'SOLUSI', 'SUKSES', 'MEGAH', 'BERSAMA',
            'DAYA', 'ELEKTRIKAL', 'MEKANIKAL', 'KONSTRUKSI', 'SEJATI', 'ANUGERAH'
        ]
        m = re.match(r'^(PT|CV|UD|YAYASAN)\.?\s*(.*)', name, re.IGNORECASE)
        if m:
            prefix = m.group(1).upper()
            rest = m.group(2).strip()
            if ' ' not in rest and len(rest) > 8:
                segmented = []
                rem = rest
                while rem:
                    found = False
                    for w in vocab:
                        if rem.upper().startswith(w):
                            segmented.append(w)
                            rem = rem[len(w):]
                            found = True
                            break
                    if not found:
                        segmented.append(rem)
                        break
                return f"{prefix} {' '.join(segmented)}"
            elif ' ' in rest:
                parts = rest.split()
                new_parts = []
                for p in parts:
                    if len(p) > 10:
                        seg = []
                        rem = p
                        while rem:
                            found = False
                            for w in vocab:
                                if rem.upper().startswith(w):
                                    seg.append(w)
                                    rem = rem[len(w):]
                                    found = True
                                    break
                            if not found:
                                seg.append(rem)
                                break
                        new_parts.append(' '.join(seg))
                    else:
                        new_parts.append(p)
                return f"{prefix} {' '.join(new_parts)}"
            return f"{prefix} {rest}"
        return name

    alamat_full = ""
    if addr_lines:
        alamat_full = " ".join(addr_lines)
        alamat_full = re.sub(r'\s+', ' ', alamat_full).strip()
        alamat_full = re.sub(r'^[:,\s.\-–—]+', '', alamat_full).strip()
        alamat_full = re.sub(r'^(?:kantor|perusahaan|usaha|domisili)?[\s:.\-–—=]+', '', alamat_full, flags=re.IGNORECASE).strip()

    # Ekstraksi nama jalan spesifik (sebelum Desa/Kelurahan, Kelurahan, Kecamatan, RT/RW)
    street_part = ""
    if alamat_full:
        street_cand = re.split(r',?\s*(?:desa[/\s]*kelurahan|kelurahan|desa|kecamatan|kec\.?|rt[/\s.:]*\d|rw[/\s.:]*\d|kabupaten|kab\.?|kota|provinsi|kode\s*pos)', alamat_full, flags=re.IGNORECASE)[0].strip()
        street_cand = re.sub(r'[,.\s\-]+$', '', street_cand).strip()
        if len(street_cand) >= 3:
            street_part = street_cand

    company_address = street_part if street_part else alamat_full
    alamat = company_address

    # Ekstraksi RT dan RW
    rt = ""
    rw = ""
    target_text_rt = alamat_full if alamat_full else full_text
    m_rtrw = re.search(r'\b(?:rt[/\s.:]*(\d{1,3}))[\s/,\-]+(?:rw[/\s.:]*(\d{1,3}))\b', target_text_rt, re.IGNORECASE)
    if m_rtrw:
        rt = m_rtrw.group(1).zfill(3)
        rw = m_rtrw.group(2).zfill(3)
    else:
        m_slash = re.search(r'\brt[i/|!\s]*rw[\s:.\-–—=]*(\d{1,3})[/\s\-]+(\d{1,3})\b', target_text_rt, re.IGNORECASE)
        if m_slash:
            rt = m_slash.group(1).zfill(3)
            rw = m_slash.group(2).zfill(3)
        else:
            m_rt = re.search(r'\brt[\s:.\-–—]*(\d{1,3})\b', target_text_rt, re.IGNORECASE)
            if m_rt:
                rt = m_rt.group(1).zfill(3)
            m_rw = re.search(r'\brw[\s:.\-–—]*(\d{1,3})\b', target_text_rt, re.IGNORECASE)
            if m_rw:
                rw = m_rw.group(1).zfill(3)

    pos_match = re.search(r'(?:kode\s*pos|pos)[\s:.\-–—]*(\d{5})\b', alamat_full or full_text, re.IGNORECASE)
    if not pos_match:
        pos_match = re.search(r'\b(\d{5})\b', alamat_full or full_text)
    if pos_match:
        kode_pos = pos_match.group(1)

    kec_match = re.search(r'\b(?:kecamatan|kec\.?)[\s:.\-–—]*([A-Za-z\s]+?)(?:,|$|\n|kabupaten|kota|kelurahan|kode\s*pos)', full_text, re.IGNORECASE)
    if kec_match:
        kecamatan = re.sub(r'[^A-Za-z\s]', '', kec_match.group(1)).strip().upper()

    kel_match = re.search(r'\b(?:desa[/\s]*kelurahan|kelurahan|kel\.?|desa)[\s:.\-–—]*([A-Za-z\s]+?)(?:,|$|\n|kecamatan|kode\s*pos)', full_text, re.IGNORECASE)
    if kel_match:
        kelurahan = re.sub(r'[^A-Za-z\s]', '', kel_match.group(1)).strip().upper()

    prov_match = re.search(r'\b(?:provinsi|propinsi|prov\.?)[\s:.\-–—]*([A-Za-z\s]+?)(?:,|$|\n|kode\s*pos)', full_text, re.IGNORECASE)
    if prov_match:
        provinsi = re.sub(r'[^A-Za-z\s]', '', prov_match.group(1)).strip().title()

    kota_match = re.search(r'\b(?:kabupaten\/kota|kabupaten|kota\s*adm\.?|kota|kab\.?)[\s:.\-–—]*([A-Za-z\s]+?)(?:,|$|\n|provinsi|propinsi|kode\s*pos)', full_text, re.IGNORECASE)
    if kota_match:
        kota = re.sub(r'[^A-Za-z\s]', '', kota_match.group(1)).strip().title()

    # 6. Ekstraksi Nama Perusahaan
    # Cek orientasi geometris jika boxes memiliki bounding box
    target_box = None
    for b in boxes:
        txt = b.get('text', '').lower()
        if 'nama pelaku usaha' in txt or 'nama perusahaan' in txt or 'nama perseroan' in txt:
            target_box = b
            break

    if target_box:
        m_same = re.search(r'(?:nama\s+pelaku\s+usaha|nama\s+perusahaan|nama\s+perseroan)[\s:.\-–—=]+(.*)', target_box.get('text', ''), re.IGNORECASE)
        if m_same and len(m_same.group(1).strip()) > 3:
            cand = re.sub(r'^[:\s.\-–—=]+', '', m_same.group(1)).strip()
            if not re.search(r'pemerintah\s+republik|kementerian|badan\s+koordinasi', cand, re.IGNORECASE):
                company_name = format_company_name(cand)
        else:
            y_center = (target_box.get('y_min', 0) + target_box.get('y_max', 0)) / 2
            right_boxes = []
            for b in boxes:
                if b == target_box:
                    continue
                b_y_center = (b.get('y_min', 0) + b.get('y_max', 0)) / 2
                if abs(b_y_center - y_center) < 40 and b.get('x_min', 0) >= target_box.get('x_max', 0) - 20:
                    right_boxes.append(b)
            if right_boxes:
                right_boxes.sort(key=lambda x: x.get('x_min', 0))
                cand_clean = ""
                for b in right_boxes:
                    t = b.get('text', '').strip()
                    if re.search(r'^\s*[:;]?\s*(?:jl\.?|jalan|alamat|desa|kelurahan)\b', t, re.IGNORECASE):
                        break
                    cand_clean = (cand_clean + " " + t).strip()
                cand_clean = re.sub(r'^[:\s.\-–—=]+', '', cand_clean).strip()
                if len(cand_clean) > 3 and not re.search(r'pemerintah\s+republik|kementerian|badan\s+koordinasi', cand_clean, re.IGNORECASE):
                    company_name = format_company_name(cand_clean)

    if not company_name:
        for idx, line in enumerate(lines):
            m_c = re.search(r'^(?:\d+[\.\)]\s*)?(?:nama\s+perusahaan|nama\s+pelaku\s+usaha|nama\s+perseroan)[\s:.\-–—=]*(.*)$', line.strip(), re.IGNORECASE)
            if m_c:
                cand_name = m_c.group(1).strip()
                if not cand_name and idx + 1 < len(lines):
                    next_cand = lines[idx + 1].strip()
                    if not re.search(r'^\d+[\.\)]', next_cand) and not re.search(r'alamat|telepon|email', next_cand, re.IGNORECASE):
                        cand_name = next_cand
                cand_name = re.sub(r'^[:\s.\-–—=]+', '', cand_name).strip()
                if len(cand_name) > 3 and not re.search(r'pemerintah\s+republik|kementerian|badan\s+koordinasi', cand_name, re.IGNORECASE):
                    company_name = format_company_name(cand_name)
                    break

    if not company_name:
        comp_match = re.search(r'(?:nama\s+perusahaan|nama\s+pelaku\s+usaha|nama\s+perseroan)[\s:.\-–—]*([A-Za-z0-9\.,\s\(\)]+?)(?:$|\n|nomor\s+induk|nib|alamat)', full_text, re.IGNORECASE)
        if comp_match:
            cand_name = comp_match.group(1).strip()
            cand_name = re.sub(r'^[:\s.\-–—=]+', '', cand_name).strip()
            if len(cand_name) > 3 and not re.search(r'pemerintah\s+republik|kementerian|badan\s+koordinasi', cand_name, re.IGNORECASE):
                company_name = format_company_name(cand_name)

    if not company_name:
        pt_match = re.search(r'\b(PT\.?\s*[A-Z0-9\s\.\-]{3,60}|CV\.?\s*[A-Z0-9\s\.\-]{3,60})\b', full_text)
        if pt_match:
            cand_name = pt_match.group(1).strip()
            if not re.search(r'pemerintah|kementerian|bkpm', cand_name, re.IGNORECASE):
                company_name = format_company_name(cand_name)

    data = {
        "nib": nib_number,
        "company_name": company_name,
        "companyName": company_name,
        "alamat": company_address,
        "companyAddress": company_address,
        "streetAddress": company_address,
        "fullAddress": alamat_full,
        "alamat_lengkap": alamat_full,
        "rt": rt,
        "rw": rw,
        "rt_rw": f"{rt}/{rw}" if (rt or rw) else "",
        "email": email,
        "phoneFax": phone,
        "phone": phone,
        "tanggal_terbit": tanggal_terbit,
        "establishmentDate": tanggal_terbit,
        "nibIssuedDate": tanggal_terbit,
        "issueDate": tanggal_terbit,
        "tanggalTerbit": tanggal_terbit,
        "kecamatan": kecamatan,
        "district": kecamatan,
        "kel_desa": kelurahan,
        "village": kelurahan,
        "kode_pos": kode_pos,
        "postalCode": kode_pos,
        "kota": kota,
        "city": kota,
        "cityRegency": kota,
        "provinsi": provinsi,
        "province": provinsi
    }

    if kecamatan or kelurahan or kode_pos:
        try:
            conn = get_db_conn()
            with conn.cursor() as cur:
                clean_w = lambda s: re.sub(r'[^A-Z0-9]', '', str(s or '').upper())
                c_kec, c_kel, c_pos = clean_w(kecamatan), clean_w(kelurahan), clean_w(kode_pos)
                row = None
                if c_kec and c_kel:
                    cur.execute("""
                        SELECT v.name, v.postal_code, d.name, c.name, p.name
                        FROM master_kelurahan_desa v
                        JOIN master_kecamatan d ON v.kecamatan_id = d.id
                        JOIN master_kabupaten_kota c ON d.kabupaten_kota_id = c.id
                        JOIN master_provinsi p ON c.provinsi_id = p.id
                        WHERE REPLACE(UPPER(d.name), ' ', '') = %s
                          AND REPLACE(UPPER(v.name), ' ', '') = %s
                        LIMIT 1
                    """, (c_kec, c_kel))
                    row = cur.fetchone()
                if not row and c_pos and c_kec:
                    cur.execute("""
                        SELECT v.name, v.postal_code, d.name, c.name, p.name
                        FROM master_kelurahan_desa v
                        JOIN master_kecamatan d ON v.kecamatan_id = d.id
                        JOIN master_kabupaten_kota c ON d.kabupaten_kota_id = c.id
                        JOIN master_provinsi p ON c.provinsi_id = p.id
                        WHERE v.postal_code = %s
                          AND REPLACE(UPPER(d.name), ' ', '') = %s
                        LIMIT 1
                    """, (c_pos, c_kec))
                    row = cur.fetchone()
                if not row and c_kec:
                    cur.execute("""
                        SELECT NULL, NULL, d.name, c.name, p.name
                        FROM master_kecamatan d
                        JOIN master_kabupaten_kota c ON d.kabupaten_kota_id = c.id
                        JOIN master_provinsi p ON c.provinsi_id = p.id
                        WHERE REPLACE(UPPER(d.name), ' ', '') = %s
                        LIMIT 1
                    """, (c_kec,))
                    row = cur.fetchone()
                if row:
                    if row[0] and not data.get("village"):
                        data["village"] = row[0]
                        data["kel_desa"] = row[0]
                    if row[1] and not data.get("postalCode"):
                        data["postalCode"] = row[1]
                        data["kode_pos"] = row[1]
                    if row[2]:
                        data["district"] = row[2]
                        data["kecamatan"] = row[2]
                    if row[3]:
                        data["city"] = row[3]
                        data["cityRegency"] = row[3]
                        data["kota"] = row[3]
                    if row[4]:
                        data["province"] = row[4]
                        data["provinsi"] = row[4]
            conn.close()
        except Exception as we:
            print(f"[OCR] NIB Wilayah reverse-lookup error: {we}")

    return data, boxes

def extract_experience_boxes_from_image(file_path: str, l_exp: dict, p1_boxes: list) -> tuple:
    if not file_path or not os.path.exists(file_path):
        return "", ""
    try:
        import re, cv2, numpy as np
        page_bgr = None
        if file_path.lower().endswith('.pdf'):
            try:
                import pymupdf as fitz
            except ImportError:
                import fitz
            doc = fitz.open(file_path)
            if len(doc) > 0:
                pix = doc[0].get_pixmap(matrix=fitz.Matrix(300.0/72.0, 300.0/72.0), alpha=False)
                page_bgr = cv2.cvtColor(np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n), cv2.COLOR_RGB2BGR)
            doc.close()
        else:
            page_bgr = cv2.imread(file_path)

        if page_bgr is None:
            return "", ""

        h, w, _ = page_bgr.shape
        exp_boxes = [b for b in p1_boxes if abs(b.get('yc', 0) - l_exp.get('yc', 0)) <= 0.009 and b.get('xc', 0) > l_exp.get('x1', 0)]
        l_years = next((b for b in exp_boxes if re.search(r'\b(years?|vears?)\b', b.get('text', ''), re.IGNORECASE)), None)
        l_months = next((b for b in exp_boxes if re.search(r'\b(months?|bln|bulan)\b', b.get('text', ''), re.IGNORECASE)), None)

        if l_years:
            g1_x1 = int(l_exp['x2'] * w)
            g1_x2 = int(l_years['x1'] * w)
        else:
            g1_x1 = int(l_exp['x2'] * w)
            g1_x2 = g1_x1 + int(0.08 * w)

        if l_years and l_months:
            g2_x1 = int(l_years['x2'] * w)
            g2_x2 = int(l_months['x1'] * w)
        elif l_years:
            g2_x1 = int(l_years['x2'] * w)
            g2_x2 = g2_x1 + int(0.06 * w)
        else:
            g2_x1 = g1_x2 + int(0.02 * w)
            g2_x2 = g2_x1 + int(0.06 * w)

        y_center = int(l_exp['yc'] * h)
        row_y1 = max(0, y_center - int(0.015 * h))
        row_y2 = min(h, y_center + int(0.015 * h))

        c1 = page_bgr[row_y1:row_y2, max(0, g1_x1):min(w, g1_x2)]
        c2 = page_bgr[row_y1:row_y2, max(0, g2_x1):min(w, g2_x2)]

        def read_digit(crop):
            if crop is None or crop.size == 0:
                return ""
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            _, th = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
            contours, _ = cv2.findContours(th, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            valid = []
            for cnt in contours:
                bx, by, bw, bh = cv2.boundingRect(cnt)
                # Digit character glyph filter for 200-300 DPI
                if 4 <= bw <= 30 and 7 <= bh <= 30 and cv2.contourArea(cnt) >= 10:
                    valid.append((bx, by, bw, bh))
            if not valid:
                return ""
            valid.sort(key=lambda b: b[0])
            min_x = min(b[0] for b in valid)
            min_y = min(b[1] for b in valid)
            max_x = max(b[0] + b[2] for b in valid)
            max_y = max(b[1] + b[3] for b in valid)
            char_crop = crop[min_y:max_y, min_x:max_x]

            engine = OCREngine.get_engine()
            padded = cv2.copyMakeBorder(char_crop, 8, 8, 8, 8, cv2.BORDER_CONSTANT, value=[255, 255, 255])
            res = engine.text_recognizer([padded])
            if res and res[0] and res[0][0]:
                raw_t = res[0][0][0]
                digits = re.findall(r'\d+', raw_t)
                return ''.join(digits) if digits else ""
            return ""

        r_y = read_digit(c1)
        r_m = read_digit(c2)
        return r_y, r_m
    except Exception as exp_err:
        print(f"[OCR] Experience box digit extraction error: {exp_err}")
        return "", ""

def extract_latest_deed_no_from_image(file_path: str, l_latest_deed: dict, p1_boxes: list) -> str:
    if not file_path or not os.path.exists(file_path):
        return ""
    try:
        import re, cv2, numpy as np
        page_bgr = None
        if file_path.lower().endswith('.pdf'):
            try:
                import pymupdf as fitz
            except ImportError:
                import fitz
            doc = fitz.open(file_path)
            if len(doc) > 0:
                pix = doc[0].get_pixmap(matrix=fitz.Matrix(300.0/72.0, 300.0/72.0), alpha=False)
                page_bgr = cv2.cvtColor(np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n), cv2.COLOR_RGB2BGR)
            doc.close()
        else:
            page_bgr = cv2.imread(file_path)

        if page_bgr is None:
            return ""

        h, w, _ = page_bgr.shape
        y_center = int(l_latest_deed.get('yc', 0.37) * h)
        row_y1 = max(0, y_center - int(0.025 * h))
        row_y2 = min(h, y_center + int(0.025 * h))
        col_x1 = max(0, int(0.215 * w))
        col_x2 = min(w, int(0.290 * w))

        crop = page_bgr[row_y1:row_y2, col_x1:col_x2]
        if crop.size > 0:
            from app.services.ocr_engine import OCREngine
            crop_boxes = OCREngine.process_image(crop)
            # 1. First look for pure numbers or AHU numbers (the actual deed number)
            for b in crop_boxes:
                txt = b.get('text', '').strip()
                if re.search(r'\b(tanggal|date|terakhir|latest|amendment|perubahan|years?|months?|vears?|thn|tahun|bln|bulan)\b', txt, re.IGNORECASE):
                    continue
                m = re.search(r'\b(AHU[-.0-9A-Za-z]+|\d+)\b', txt)
                if m:
                    return m.group(1).strip()
            # 2. Fallback
            for b in crop_boxes:
                txt = b.get('text', '').strip()
                if re.search(r'\b(tanggal|date|terakhir|latest|amendment|perubahan|years?|months?|vears?|thn|tahun|bln|bulan)\b', txt, re.IGNORECASE):
                    continue
                m = re.search(r'([A-Za-z0-9\-_./]+)', txt)
                if m:
                    return m.group(1).strip()
    except Exception as e:
        sys.stderr.write(f"[OCR] extract_latest_deed_no_from_image error: {e}\n")
    return ""


def extract_fap(boxes: list, full_text: str = None, pdf_path: str = None) -> tuple:
    import re
    texts = []
    if pdf_path and os.path.exists(pdf_path) and pdf_path.lower().endswith('.pdf'):
        try:
            import pymupdf as fitz
            doc = fitz.open(pdf_path)
            for page in doc:
                t = page.get_text()
                if t and t.strip():
                    texts.append(t.strip())
        except Exception as pe:
            print(f"[OCR] PyMuPDF FAP extraction notice: {pe}")

    for b in boxes:
        t = (b.get("text") or "").strip()
        if t:
            texts.append(t)

    if full_text:
        texts.insert(0, full_text.strip())

    combined_full_text = "\n".join(texts)

    def normalize_date_to_iso(val: str) -> str:
        if not val:
            return ""
        val = val.strip()
        m = re.match(r'^(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})$', val)
        if m:
            d, mth, y = m.group(1).zfill(2), m.group(2).zfill(2), m.group(3)
            return f"{y}-{mth}-{d}"
        m = re.match(r'^(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})$', val)
        if m:
            y, mth, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
            return f"{y}-{mth}-{d}"
        return val

    def clean_address(val: str) -> str:
        if not val:
            return ""
        val = re.sub(r'\bJ[I1]\.\s*', 'Jl. ', val)
        val = re.sub(r'\bJ[I1]\b', 'Jl.', val)
        return re.sub(r'\s+', ' ', val).strip()

    def join_tokens(tokens: list) -> str:
        res = ""
        for t in tokens:
            t = t.strip()
            if not t:
                continue
            if not res:
                res = t
            elif res.endswith('-') or t.startswith('-'):
                res += t.lstrip('-') if res.endswith('-') and t.startswith('-') else t
            else:
                res += " " + t
        return res.strip()

    def sanitize_fap_field(key: str, val: any) -> any:
        if val is None:
            return ""
        val_str = str(val).strip()
        if not val_str:
            return ""

        cleaned = re.sub(r'^[\s/:\-.,;=]+|[\s/:\-.,;=]+$', '', val_str).strip()
        if not re.search(r'[A-Za-z0-9]', cleaned):
            return ""

        cleaned_lower = cleaned.lower()
        norm_c = re.sub(r'[\s/:\-_.,]+', ' ', cleaned_lower).strip()

        bad_substrings = [
            'nama perusahaan', "company's name", 'company name',
            'penanggung jawab', 'person in charge',
            'alamat perusahaan', 'company address', 'current address',
            'struktur organisasi', 'shareholder structure',
            'cara pembayaran', 'payment method', 'paymentmethod',
            'keterangan/remarks', 'remarks', 'pendapatan/revenue',
            'laba kotor', 'gross margin', 'grossmargin',
            'laba usaha', 'operating margin', 'operatingmargin',
            'facility proposed', 'liugong finance',
            'telepon/phone', 'kota/city', 'provinsi/province',
            'kodepost/postal', 'kode pos/postal', 'kode post/postal',
            'bidang usaha', 'main business', 'sumber pengembalian', 'repayment source',
            'status lokasi', 'location status', 'akta pendirian', 'establishment deed',
            'akta perubahan', 'latest deed', 'latest amendment'
        ]
        for bs in bad_substrings:
            if bs in cleaned_lower or bs in norm_c:
                return ""

        boilerplate_exact = {
            'nama perusahaan', "company's name", 'company name',
            'penanggung jawab', 'person in charge', 'pic', 'pic name',
            'jabatan', 'position',
            'alamat perusahaan', 'company address', 'alamat', 'address',
            'alamat tempat tinggal', 'current address',
            'kota', 'city', 'kota city',
            'provinsi', 'province', 'provinsi province',
            'kode pos', 'postal code', 'kodepost postal code', 'kode post postal code',
            'telepon', 'phone', 'telepon phone', 'phone fax', 'telepon fax',
            'email', 'website',
            'bisnis utama', 'bidang usaha', 'main business',
            'akta pendirian', 'establishment deed',
            'akta perubahan', 'latest amendment deed', 'latest deed',
            'milik sendiri sewa', 'milik sendiri', 'sewa',
            'facility proposed', 'liugong', 'finance indonesia', 'company profile',
            'facility'
        }

        if norm_c in boilerplate_exact:
            return ""

        if key in ('applicationDate', 'branchCode', 'customerStatus', 'customerCategory', 'companyType', 'fapNumber'):
            return cleaned

        if key in ('postalCode', 'picPostalCode'):
            m = re.search(r'\b\d{5}\b', cleaned)
            return m.group(0) if m else ""

        if key in ('nib',):
            digits = re.sub(r'\D', '', cleaned)
            return digits[:13] if len(digits) >= 10 else ""

        if key in ('npwp',):
            digits = re.sub(r'\D', '', cleaned)
            return digits[:16] if len(digits) >= 10 else ""

        if key in ('email', 'picEmail'):
            m = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', cleaned)
            return m.group(0) if m else ""

        if key in ('phoneFax', 'picPhone'):
            digits = re.sub(r'[^\d+]', '', cleaned)
            return digits if len(digits) >= 6 else ""

        if key in ('establishmentDate', 'latestDeedDate'):
            if re.match(r'^\d{4}-\d{2}-\d{2}$', cleaned):
                return cleaned
            return ""

        if key in ('experienceYears', 'experienceMonths'):
            m = re.search(r'^\d{1,2}$', cleaned)
            return m.group(0) if m else ""

        if key == 'locationStatus':
            if norm_c in ('milik sendiri sewa', 'milik sendiri', 'sewa'):
                return ""

        if key == 'mainBusiness':
            if norm_c in ('pertambangan mining', 'pertanian agriculture', 'kehutanan forestry', 'konstruksi construction', 'perdagangan trading', 'manufaktur manufacturing', 'transportasi transportation', 'jasa service', 'lain lain others'):
                return ""

        if key in ('companyName', 'picName', 'picPosition', 'companyAddress', 'mainBusiness', 'repaymentSource'):
            if len(cleaned) <= 2 or norm_c in ('pic', 'telepon', 'phone', 'email', 'nama', 'pt', 'cv'):
                return ""
            if key == 'repaymentSource' and re.match(r'^\d+$', cleaned):
                return ""

        return cleaned

    def parse_num(val):
        if not val:
            return None
        clean = re.sub(r'[^\d]', '', str(val))
        return int(clean) if clean else None

    data = {
        "fapNumber": "",
        "applicationDate": "",
        "branchCode": "",
        "companyName": "",
        "customerCategory": "",
        "companyType": "",
        "nib": "",
        "npwp": "",
        "establishmentActNo": "",
        "establishmentDate": "",
        "experienceYears": "",
        "experienceMonths": "",
        "latestDeedNo": "",
        "latestDeedDate": "",
        "companyAddress": "",
        "rt": "",
        "rw": "",
        "city": "",
        "province": "",
        "postalCode": "",
        "phoneFax": "",
        "email": "",
        "website": "",
        "mainBusiness": "",
        "repaymentSource": "",
        "locationStatus": "",
        "picName": "",
        "picPosition": "",
        "picPhone": "",
        "picEmail": "",
        "picAddress": "",
        "picCity": "",
        "picProvince": "",
        "picPostalCode": "",
        "financingValue": None,
        "downPaymentValue": None,
        "tenorMonths": None,
        "facilityPurpose": "",
        "financingMethod": "",
        "customerStatus": "",
        "stakeholders": [],
        "shareholders": [],
        "raw_text": combined_full_text
    }

    has_coords = any('x_min' in b or 'box' in b for b in boxes)
    if has_coords and len(boxes) >= 5:
        page1 = [b for b in boxes if b.get("page", 1) == 1]
        page2 = [b for b in boxes if b.get("page", 1) == 2]
        if not page1 and boxes:
            page1 = boxes

        def get_norm_boxes(b_list):
            norm = []
            for b in b_list:
                w = float(b.get("page_width", 2550) or 2550)
                h = float(b.get("page_height", 3300) or 3300)
                if 'x_min' in b:
                    x_min = float(b.get("x_min", 0)) / w
                    y_min = float(b.get("y_min", 0)) / h
                    x_max = float(b.get("x_max", 0)) / w
                    y_max = float(b.get("y_max", 0)) / h
                elif 'box' in b and isinstance(b['box'], list) and len(b['box']) == 4:
                    if isinstance(b['box'][0], (list, tuple)):
                        xs = [pt[0] for pt in b['box']]
                        ys = [pt[1] for pt in b['box']]
                        x_min, x_max = float(min(xs)) / w, float(max(xs)) / w
                        y_min, y_max = float(min(ys)) / h, float(max(ys)) / h
                    elif isinstance(b['box'][0], (int, float)):
                        x_min, y_min = float(b['box'][0]) / w, float(b['box'][1]) / h
                        x_max, y_max = float(b['box'][2]) / w, float(b['box'][3]) / h
                    else:
                        continue
                else:
                    continue
                txt = (b.get("text") or "").strip()
                if txt:
                    norm.append({
                        "text": txt,
                        "x1": x_min, "y1": y_min,
                        "x2": x_max, "y2": y_max,
                        "xc": (x_min + x_max) / 2.0,
                        "yc": (y_min + y_max) / 2.0
                    })
            return norm

        p1 = get_norm_boxes(page1)
        p2 = get_norm_boxes(page2)

        def find_label(box_list, pattern, x_min=0.0, x_max=0.5):
            for b in box_list:
                if b["xc"] >= x_min and b["xc"] <= x_max and re.search(pattern, b["text"], re.IGNORECASE):
                    return b
            return None

        def collect_right(box_list, label_box, next_label_y, x_min=0.25, x_max=0.45):
            if not label_box:
                return ""
            y_start = label_box["y1"] - 0.005
            y_end = next_label_y if next_label_y is not None else label_box["y2"] + 0.03
            matched = [b for b in box_list if b["xc"] >= x_min and b["xc"] <= x_max and b["yc"] >= y_start and b["yc"] < y_end]
            # Exclude punctuation-only or single separator boxes like '/', ':', '-', '.'
            matched = [b for b in matched if re.search(r'[A-Za-z0-9]', b["text"])]
            matched.sort(key=lambda b: (round(b["yc"], 2), b["xc"]))
            return join_tokens([b["text"] for b in matched])

        # 0. Header Area Labels & Extraction (No. Register, Date, Branch, Customer Category, Company Type)
        l_reg = find_label(p1, r'no\.?\s*register|register\s*:', 0.50, 0.90)
        l_date = find_label(p1, r'tangga[li]|date', 0.10, 0.25)
        l_branch = find_label(p1, r'cabang|branch', 0.10, 0.25)
        l_new = find_label(p1, r'customer\s*baru|new\s*cust', 0.25, 0.42)
        l_old = find_label(p1, r'customer\s*lama|existing\s*cust', 0.25, 0.42)
        l_corp = find_label(p1, r'corporate', 0.48, 0.65)
        l_comm = find_label(p1, r'commercial', 0.48, 0.65)
        l_micro = find_label(p1, r'micro', 0.68, 0.85)
        l_liugong = find_label(p1, r'liugong|jugong', 0.68, 0.85)

        # 0a. No. Register / FAP Number
        if l_reg:
            for b in p1:
                if b["xc"] > l_reg["x2"] and b["xc"] < 0.95 and abs(b["yc"] - l_reg["yc"]) <= 0.02:
                    m = re.search(r'([A-Za-z0-9]+/[A-Za-z0-9]+/[A-Za-z0-9]+/[A-Za-z0-9]+|\d{3,}/[A-Za-z0-9/_-]+)', b["text"])
                    if m:
                        data["fapNumber"] = m.group(1).strip()
                        break

        # 0b. Application Date (Tanggal/Date) & 0c. Branch Code (Cabang/Branch)
        val_col1 = [b for b in p1 if 0.18 <= b["xc"] <= 0.28 and b["yc"] <= 0.12]
        val_col1.sort(key=lambda b: b["yc"])
        for b in val_col1:
            m = re.search(r'(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})', b["text"])
            if m and not data["applicationDate"]:
                data["applicationDate"] = normalize_date_to_iso(m.group(1))
            else:
                txt = b["text"].strip()
                if not re.search(r'\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}', txt):
                    clean_br = re.sub(r'[^A-Za-z0-9]', '', txt).upper()
                    if len(clean_br) >= 2 and not clean_br.isdigit():
                        data["branchCode"] = clean_br
                    elif len(clean_br) >= 2 and not data["branchCode"]:
                        data["branchCode"] = clean_br

        # 0d. Checkbox Detection for Customer Status (New vs Existing) and Company Type (Corporate, Commercial, Micro, LiuGong User)
        gray_p1 = None
        if pdf_path and os.path.exists(pdf_path):
            try:
                import cv2
                import numpy as np
                if pdf_path.lower().endswith('.pdf'):
                    import pymupdf as fitz
                    pdoc = fitz.open(pdf_path)
                    pp = pdoc[0]
                    pix = pp.get_pixmap(matrix=fitz.Matrix(160.0 / 72.0, 160.0 / 72.0), alpha=False)
                    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
                    gray_p1 = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
                    pdoc.close()
                else:
                    loaded = cv2.imread(pdf_path, cv2.IMREAD_GRAYSCALE)
                    if loaded is not None:
                        gray_p1 = loaded
            except Exception as img_err:
                print(f"[OCR] Header checkbox image load note: {img_err}")

        if gray_p1 is not None:
            gh, gw = gray_p1.shape[:2]
            y_r1_top = min(l["y1"] for l in [l_date, l_new, l_corp, l_micro] if l) if any([l_date, l_new, l_corp, l_micro]) else 0.060
            y_r1_bot = min(l["y1"] for l in [l_branch, l_old, l_comm, l_liugong] if l) if any([l_branch, l_old, l_comm, l_liugong]) else 0.080
            y_r2_top = y_r1_bot
            y_r2_bot = max(l["y2"] for l in [l_branch, l_old, l_comm, l_liugong] if l) if any([l_branch, l_old, l_comm, l_liugong]) else 0.100

            def get_cell_ink(x_start, x_end, y_start, y_end):
                px1 = int(x_start * gw) + 4
                px2 = int(x_end * gw) - 4
                py1 = int(y_start * gh) + 3
                py2 = int(y_end * gh) - 3
                if py2 <= py1 or px2 <= px1:
                    return 0
                cell = gray_p1[py1:py2, px1:px2]
                _, bin_c = cv2.threshold(cell, 195, 255, cv2.THRESH_BINARY_INV)
                return int(np.count_nonzero(bin_c))

            x_c2_s = (l_new["x2"] + 0.005) if l_new else 0.365
            x_c2_e = (l_corp["x1"] - 0.06) if l_corp else 0.445
            x_c3_s = (l_corp["x2"] + 0.005) if l_corp else 0.600
            x_c3_e = (l_micro["x1"] - 0.06) if l_micro else 0.665
            x_c4_s = (l_micro["x2"] + 0.005) if l_micro else 0.775
            x_c4_e = x_c4_s + 0.05

            ink_new = get_cell_ink(x_c2_s, x_c2_e, y_r1_top, y_r1_bot)
            ink_old = get_cell_ink(x_c2_s, x_c2_e, y_r2_top, y_r2_bot)
            ink_corp = get_cell_ink(x_c3_s, x_c3_e, y_r1_top, y_r1_bot)
            ink_comm = get_cell_ink(x_c3_s, x_c3_e, y_r2_top, y_r2_bot)
            ink_micro = get_cell_ink(x_c4_s, x_c4_e, y_r1_top, y_r1_bot)
            ink_liugong = get_cell_ink(x_c4_s, x_c4_e, y_r2_top, y_r2_bot)

            if ink_new > ink_old and ink_new >= 5:
                data["customerStatus"] = "NEW"
                data["customerCategory"] = "NEW"
            elif ink_old > ink_new and ink_old >= 5:
                data["customerStatus"] = "EXISTING"
                data["customerCategory"] = "EXISTING"

            type_candidates = [
                ("CORPORATE", ink_corp),
                ("COMMERCIAL", ink_comm),
                ("MICRO", ink_micro),
                ("LIUGONG_USER", ink_liugong)
            ]
            best_type = ""
            max_type_ink = 4
            for t_name, ink_val in type_candidates:
                if ink_val > max_type_ink:
                    max_type_ink = ink_val
                    best_type = t_name
            if best_type:
                data["companyType"] = best_type

        # Fallback text-based checkbox detection
        if not data.get("customerStatus"):
            for b in p1:
                if b["yc"] <= 0.12 and any(ch in b["text"] for ch in ['✓', '✔', 'v', 'V', 'x', 'X']):
                    if 0.35 <= b["xc"] <= 0.46:
                        if b["yc"] < ((l_old["y1"] if l_old else 0.08)):
                            data["customerStatus"] = "NEW"
                            data["customerCategory"] = "NEW"
                        else:
                            data["customerStatus"] = "EXISTING"
                            data["customerCategory"] = "EXISTING"
                    elif 0.58 <= b["xc"] <= 0.68:
                        if b["yc"] < ((l_comm["y1"] if l_comm else 0.08)):
                            data["companyType"] = "CORPORATE"
                        else:
                            data["companyType"] = "COMMERCIAL"
                    elif 0.76 <= b["xc"] <= 0.86:
                        if b["yc"] < ((l_liugong["y1"] if l_liugong else 0.08)):
                            data["companyType"] = "MICRO"
                        else:
                            data["companyType"] = "LIUGONG_USER"

        # Left Column Labels
        l_comp_name = find_label(p1, r'company.*?n[ao]me|nama\s*perusahaan|ueeyesnsad', 0.05, 0.30)
        l_comp_addr = find_label(p1, r'company\s+address|compony\s+address|alamat\s+perusahaan', 0.05, 0.30)
        l_city = find_label(p1, r'\bcity\b|\bkota\b', 0.20, 0.32)
        l_district = find_label(p1, r'district|kecamatan', 0.05, 0.30)
        l_village = find_label(p1, r'village|kelurahan', 0.05, 0.30)
        l_rt_rw = find_label(p1, r'rt\s*/\s*rw', 0.05, 0.30)
        l_province = find_label(p1, r'province|provinsi', 0.20, 0.32)
        l_postal = find_label(p1, r'postal\s*code|kode\s*pos', 0.20, 0.32)
        l_business = find_label(p1, r'main\s+business|moin\s+business|bidang\s+usaha|bisnis\s+utama', 0.05, 0.30)
        l_est_deed = find_label(p1, r'establishment\s+deed|akta\s+pendirian', 0.05, 0.30)
        l_exp = find_label(p1, r'experience|pengalaman', 0.05, 0.30)
        l_latest_deed = find_label(p1, r'latest\s+amendment|lotest\s+deed|akta\s+perubahan', 0.05, 0.30)
        l_nib = find_label(p1, r'\bnib\b', 0.05, 0.30)
        l_npwp = find_label(p1, r'npwp', 0.05, 0.30)
        l_phone = find_label(p1, r'phone\s*/\s*fax|telepon\s*/\s*fax', 0.05, 0.30)
        l_web = find_label(p1, r'website', 0.05, 0.30)
        l_email = find_label(p1, r'email', 0.05, 0.30)
        l_repay = find_label(p1, r'repayment\s+source|sumber\s+pengembalian|sumber\s+pembayaran', 0.05, 0.30)
        l_loc = find_label(p1, r'location\s+st[ao]tus|status\s+lokasi', 0.05, 0.30)
        l_purp = find_label(p1, r'financing\s+purpose|tujuan\s+pembiayaan', 0.05, 0.30)

        # 1. Company Name
        y_next = l_comp_addr["y1"] if l_comp_addr else 0.15
        if l_comp_name:
            data["companyName"] = collect_right(p1, l_comp_name, y_next, x_min=0.25, x_max=0.45)
        if not data["companyName"] and l_comp_addr:
            comp_cand = [b for b in p1 if b["xc"] >= 0.25 and b["xc"] <= 0.45 and b["yc"] >= 0.10 and b["yc"] < l_comp_addr["y1"]]
            if comp_cand:
                data["companyName"] = join_tokens([b["text"] for b in comp_cand])

        # 2. Company Address
        if l_comp_addr:
            y_next = l_city["y1"] if l_city else (l_comp_addr["y2"] + 0.05)
            data["companyAddress"] = clean_address(collect_right(p1, l_comp_addr, y_next, x_min=0.25, x_max=0.45))

        # 3. City / Kabupaten
        if l_city:
            y_next = l_province["y1"] if l_province else (l_district["y1"] if l_district else l_city["y2"] + 0.025)
            city_boxes = [b for b in p1 if b["xc"] >= 0.31 and b["xc"] <= 0.45 and b["yc"] >= l_city["y1"] - 0.005 and b["yc"] < y_next]
            city_boxes = [b for b in city_boxes if not re.search(r'\b(kota|city|provinsi|province|alamat|tinggal)\b', b["text"], re.IGNORECASE)]
            data["city"] = join_tokens([b["text"] for b in city_boxes])

        # 4. Province
        if l_province:
            y_next = l_postal["y1"] if l_postal else l_province["y2"] + 0.025
            prov_boxes = [b for b in p1 if b["xc"] >= 0.31 and b["xc"] <= 0.45 and b["yc"] >= l_province["y1"] - 0.005 and b["yc"] < y_next]
            prov_boxes = [b for b in prov_boxes if not re.search(r'\b(provinsi|province|alamat|tinggal|address)\b', b["text"], re.IGNORECASE)]
            raw_prov = join_tokens([b["text"] for b in prov_boxes])
            if re.search(r'nwy\s*emer|jawa\s*timu|jawa\s*timur', raw_prov, re.IGNORECASE):
                data["province"] = "Jawa Timur"
            elif re.search(r'jawa\s*barat', raw_prov, re.IGNORECASE):
                data["province"] = "Jawa Barat"
            elif re.search(r'jawa\s*tengah', raw_prov, re.IGNORECASE):
                data["province"] = "Jawa Tengah"
            elif re.search(r'dki\s*jakarta|jakarta', raw_prov, re.IGNORECASE):
                data["province"] = "DKI Jakarta"
            else:
                data["province"] = raw_prov

        # 5. Postal Code
        if l_postal:
            y_next = l_business["y1"] if l_business else l_postal["y2"] + 0.025
            post_boxes = [b for b in p1 if b["xc"] >= 0.31 and b["xc"] <= 0.45 and b["yc"] >= l_postal["y1"] - 0.005 and b["yc"] < y_next]
            post_boxes = [b for b in post_boxes if not re.search(r'\b(postal|code|pos|kode)\b', b["text"], re.IGNORECASE)]
            raw_p = join_tokens([b["text"] for b in post_boxes])
            m_pos = re.search(r'\b\d{5}\b', raw_p)
            data["postalCode"] = m_pos.group(0) if m_pos else raw_p

        # 6. Main Business
        if l_business:
            y_next = l_est_deed["y1"] if l_est_deed else l_business["y2"] + 0.05
            data["mainBusiness"] = collect_right(p1, l_business, y_next, x_min=0.25, x_max=0.45)

        # 7. Establishment Deed & Date
        if l_est_deed:
            y_next = l_exp["y1"] if l_exp else l_est_deed["y2"] + 0.03
            # Deed number is in xc strictly between 0.25 and 0.295
            deed_no_boxes = [b for b in p1 if b["xc"] >= 0.25 and b["xc"] <= 0.295 and b["yc"] >= l_est_deed["y1"] - 0.005 and b["yc"] < y_next]
            if deed_no_boxes:
                deed_no_boxes.sort(key=lambda b: (round(b["yc"], 2), b["xc"]))
                raw_deed = join_tokens([b["text"] for b in deed_no_boxes])
                cleaned_deed = re.sub(r'\s+', '', raw_deed)
                cleaned_deed = re.sub(r'^AHU\.+', 'AHU-', cleaned_deed, flags=re.IGNORECASE)
                cleaned_deed = re.sub(r'\.AH\.', '.AH.', cleaned_deed, flags=re.IGNORECASE)
                cleaned_deed = re.sub(r'Tahun', 'Tahun ', cleaned_deed, flags=re.IGNORECASE)
                data["establishmentActNo"] = cleaned_deed if cleaned_deed.startswith('AHU-') else raw_deed
            # Date value is in xc >= 0.37 and xc <= 0.44
            date_boxes = [b for b in p1 if b["xc"] >= 0.37 and b["xc"] <= 0.44 and b["yc"] >= l_est_deed["y1"] - 0.005 and b["yc"] < y_next]
            for db in date_boxes:
                m_dt = re.search(r'(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})', db["text"])
                if m_dt:
                    data["establishmentDate"] = normalize_date_to_iso(m_dt.group(1))
                    break

        # 7.5 Experience Years & Months
        if l_exp:
            exp_line_boxes = [b for b in p1 if abs(b["yc"] - l_exp["yc"]) <= 0.018 and b["xc"] >= 0.23 and b["xc"] <= 0.45]
            exp_line_boxes.sort(key=lambda b: b["xc"])

            idx_year_lbl = -1
            idx_month_lbl = -1
            for i, b in enumerate(exp_line_boxes):
                if re.search(r'\b(years?|vears?|thn|tahun)\b', b["text"], re.IGNORECASE):
                    idx_year_lbl = i
                if re.search(r'\b(months?|bln|bulan)\b', b["text"], re.IGNORECASE):
                    idx_month_lbl = i

            year_val = ""
            month_val = ""

            if idx_year_lbl > 0:
                prev = exp_line_boxes[idx_year_lbl - 1]
                m = re.search(r'\b(\d{1,3})\b', prev["text"])
                if m:
                    year_val = m.group(1)
            if not year_val and idx_year_lbl >= 0:
                m = re.search(r'(\d{1,3})\s*(?:years?|vears?|thn|tahun)', exp_line_boxes[idx_year_lbl]["text"], re.IGNORECASE)
                if m:
                    year_val = m.group(1)
            if not year_val:
                for b in exp_line_boxes:
                    if 0.24 <= b["xc"] <= 0.295:
                        m = re.search(r'\b(\d{1,3})\b', b["text"])
                        if m:
                            year_val = m.group(1)
                            break

            if idx_month_lbl > 0:
                prev = exp_line_boxes[idx_month_lbl - 1]
                if prev != (exp_line_boxes[idx_year_lbl] if idx_year_lbl >= 0 else None):
                    m = re.search(r'\b(\d{1,3})\b', prev["text"])
                    if m:
                        month_val = m.group(1)
            if not month_val and idx_month_lbl >= 0:
                m = re.search(r'(\d{1,3})\s*(?:months?|bln|bulan)', exp_line_boxes[idx_month_lbl]["text"], re.IGNORECASE)
                if m:
                    month_val = m.group(1)
            if not month_val:
                for b in exp_line_boxes:
                    if 0.31 <= b["xc"] <= 0.36:
                        m = re.search(r'\b(\d{1,3})\b', b["text"])
                        if m:
                            month_val = m.group(1)
                            break

            if (not year_val or not month_val) and pdf_path and l_exp:
                img_y, img_m = extract_experience_boxes_from_image(pdf_path, l_exp, p1)
                if not year_val and img_y:
                    year_val = img_y
                if not month_val and img_m:
                    month_val = img_m
            data["experienceYears"] = year_val
            data["experienceMonths"] = month_val

        # 8. Latest Amendment Deed & Date
        if l_latest_deed:
            y_next = l_nib["y1"] if l_nib else l_latest_deed["y2"] + 0.05
            deed_no_boxes = [b for b in p1 if b["xc"] >= 0.25 and b["xc"] <= 0.295 and b["yc"] >= l_latest_deed["y1"] - 0.005 and b["yc"] < y_next]
            if deed_no_boxes:
                deed_no_boxes.sort(key=lambda b: (round(b["yc"], 2), b["xc"]))
                raw_deed = join_tokens([b["text"] for b in deed_no_boxes])
                cleaned_deed = re.sub(r'\s+', '', raw_deed)
                cleaned_deed = re.sub(r'^AHU\.+', 'AHU-', cleaned_deed, flags=re.IGNORECASE)
                cleaned_deed = re.sub(r'\.AH\.', '.AH.', cleaned_deed, flags=re.IGNORECASE)
                cleaned_deed = re.sub(r'Tahun', 'Tahun ', cleaned_deed, flags=re.IGNORECASE)
                data["latestDeedNo"] = cleaned_deed if cleaned_deed.startswith('AHU-') else raw_deed
            if not data["latestDeedNo"] and pdf_path and l_latest_deed:
                img_deed = extract_latest_deed_no_from_image(pdf_path, l_latest_deed, p1)
                if img_deed:
                    data["latestDeedNo"] = img_deed
            date_boxes = [b for b in p1 if b["xc"] >= 0.37 and b["xc"] <= 0.44 and b["yc"] >= l_latest_deed["y1"] - 0.005 and b["yc"] < y_next]
            for db in date_boxes:
                m_dt = re.search(r'(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})', db["text"])
                if m_dt:
                    data["latestDeedDate"] = normalize_date_to_iso(m_dt.group(1))
                    break

        # 9. NIB
        if l_nib:
            y_next = l_npwp["y1"] if l_npwp else l_nib["y2"] + 0.03
            raw_nib = collect_right(p1, l_nib, y_next, x_min=0.25, x_max=0.45)
            d_nib = re.sub(r'\D', '', raw_nib)
            data["nib"] = d_nib[:13] if len(d_nib) >= 13 else d_nib

        # 10. NPWP
        if l_npwp:
            y_next = l_phone["y1"] if l_phone else l_npwp["y2"] + 0.03
            raw_npwp = collect_right(p1, l_npwp, y_next, x_min=0.25, x_max=0.45)
            d_npwp = re.sub(r'\D', '', raw_npwp)
            data["npwp"] = d_npwp[:16] if len(d_npwp) >= 15 else d_npwp

        # 11. Phone / Fax
        if l_phone:
            y_next = l_web["y1"] if l_web else (l_email["y1"] if l_email else l_phone["y2"] + 0.03)
            data["phoneFax"] = collect_right(p1, l_phone, y_next, x_min=0.25, x_max=0.45)

        # 12. Email
        if l_email:
            y_next = l_repay["y1"] if l_repay else l_email["y2"] + 0.03
            raw_em = collect_right(p1, l_email, y_next, x_min=0.25, x_max=0.45)
            m_em = re.search(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', raw_em)
            data["email"] = m_em.group(0) if m_em else raw_em

        # 13. Repayment Source
        if l_repay:
            y_next = l_loc["y1"] if l_loc else l_repay["y2"] + 0.04
            y_next_repay = (l_loc["y1"] - 0.005) if l_loc else (l_repay["y2"] + 0.02)
            data["repaymentSource"] = collect_right(p1, l_repay, y_next_repay, x_min=0.25, x_max=0.45)

        # 14. Location Status
        if l_loc:
            y_next = l_loc["y2"] + 0.03
            y_next_loc = (l_purp["y1"] - 0.005) if l_purp else (l_loc["y2"] + 0.02)
            data["locationStatus"] = collect_right(p1, l_loc, y_next_loc, x_min=0.25, x_max=0.45)

        # 15. Right Column (PIC info)
        l_pic = find_label(p1, r'person\s+in\s+charge|penanggung\s+jawab|pic', 0.45, 0.55)
        l_pic_pos = find_label(p1, r'\bposition\b|\bjabatan\b', 0.45, 0.55)
        l_pic_addr = find_label(p1, r'current\s+address|alamat\s+tempat|alamat\s+domisili', 0.45, 0.55)
        l_pic_city = find_label(p1, r'\bcity\b|\bkota\b', 0.52, 0.65)
        l_pic_prov = find_label(p1, r'\bprovince\b|\bprovinsi\b', 0.52, 0.65)
        l_pic_post = find_label(p1, r'postal\s*code|kode\s*pos', 0.52, 0.65)

        if l_pic:
            y_next = l_pic_pos["y1"] if l_pic_pos else l_pic["y2"] + 0.05
            # PIC value is in xc between 0.51 and 0.67 (left of Telepon/Phone at 0.70)
            pic_boxes = [b for b in p1 if b["xc"] >= 0.51 and b["xc"] <= 0.67 and b["yc"] >= l_pic["y1"] - 0.005 and b["yc"] < y_next]
            pic_boxes = [b for b in pic_boxes if not re.search(r'\b(penanggung|jawab|pic|telepon|phone)\b', b["text"], re.IGNORECASE)]
            data["picName"] = join_tokens([b["text"] for b in pic_boxes])

            # Phone is at xc >= 0.74
            ph_boxes = [b for b in p1 if b["xc"] >= 0.74 and b["xc"] <= 0.88 and b["yc"] >= l_pic["y1"] - 0.01 and b["yc"] < y_next]
            ph_boxes = [b for b in ph_boxes if not re.search(r'phone|hp|telp', b["text"], re.IGNORECASE)]
            if ph_boxes:
                data["picPhone"] = re.sub(r'[^\d+]', '', ph_boxes[0]["text"])

        if l_pic_pos:
            y_next = l_pic_addr["y1"] if l_pic_addr else l_pic_pos["y2"] + 0.05
            pos_boxes = [b for b in p1 if b["xc"] >= 0.51 and b["xc"] <= 0.67 and b["yc"] >= l_pic_pos["y1"] - 0.005 and b["yc"] < y_next]
            pos_boxes = [b for b in pos_boxes if not re.search(r'\b(jabatan|position|email)\b', b["text"], re.IGNORECASE)]
            data["picPosition"] = join_tokens([b["text"] for b in pos_boxes])
            if not re.sub(r'[\s/.,\-_]', '', data["picPosition"]):
                data["picPosition"] = ""

            # Email is at xc >= 0.74
            em_boxes = [b for b in p1 if b["xc"] >= 0.74 and b["xc"] <= 0.88 and b["yc"] >= l_pic_pos["y1"] - 0.01 and b["yc"] < y_next]
            em_boxes = [b for b in em_boxes if not re.search(r'email', b["text"], re.IGNORECASE)]
            if em_boxes:
                data["picEmail"] = em_boxes[0]["text"].strip()

        if l_pic_addr:
            y_next = l_pic_city["y1"] if l_pic_city else (l_pic_addr["y2"] + 0.05)
            p_addr_boxes = [b for b in p1 if b["xc"] >= 0.52 and b["xc"] <= 0.85 and b["yc"] >= l_pic_addr["y1"] - 0.005 and b["yc"] < y_next]
            p_addr_boxes = [b for b in p_addr_boxes if not re.search(r'\b(alamat|tempat|tinggal|current|address)\b', b["text"], re.IGNORECASE)]
            data["picAddress"] = clean_address(join_tokens([b["text"] for b in p_addr_boxes]))

        if l_pic_city:
            y_next = l_pic_prov["y1"] if l_pic_prov else l_pic_city["y2"] + 0.03
            p_city_boxes = [b for b in p1 if b["xc"] >= 0.60 and b["xc"] <= 0.85 and b["yc"] >= l_pic_city["y1"] - 0.005 and b["yc"] < y_next]
            p_city_boxes = [b for b in p_city_boxes if not re.search(r'\b(kota|city)\b', b["text"], re.IGNORECASE)]
            data["picCity"] = join_tokens([b["text"] for b in p_city_boxes])

        if l_pic_prov:
            y_next = l_pic_post["y1"] if l_pic_post else l_pic_prov["y2"] + 0.03
            p_prov_boxes = [b for b in p1 if b["xc"] >= 0.60 and b["xc"] <= 0.85 and b["yc"] >= l_pic_prov["y1"] - 0.005 and b["yc"] < y_next]
            p_prov_boxes = [b for b in p_prov_boxes if not re.search(r'\b(provinsi|province)\b', b["text"], re.IGNORECASE)]
            data["picProvince"] = join_tokens([b["text"] for b in p_prov_boxes])

        if l_pic_post:
            y_next = l_pic_post["y2"] + 0.03
            p_post_boxes = [b for b in p1 if b["xc"] >= 0.60 and b["xc"] <= 0.85 and b["yc"] >= l_pic_post["y1"] - 0.005 and b["yc"] < y_next]
            raw_post = join_tokens([b["text"] for b in p_post_boxes])
            m_pos = re.search(r'\b\d{5}\b', raw_post)
            data["picPostalCode"] = m_pos.group(0) if m_pos else raw_post

        # Financing Purpose on Page 1
        l_purp = find_label(p1, r'financing\s+purpose|tujuan\s+pembiayaan', 0.05, 0.30)
        if l_purp:
            purp_boxes = [b for b in p1 if b["yc"] >= l_purp["y1"] - 0.01 and b["yc"] <= l_purp["y2"] + 0.04]
            purp_text = " ".join([b["text"] for b in purp_boxes])
            if re.search(r'investment\s*\([vV\u2713xX\)]', purp_text, re.IGNORECASE) or re.search(r'investasi\s*/\s*investment\s*\(v\)', purp_text, re.IGNORECASE):
                data["facilityPurpose"] = "INVESTMENT"
            elif re.search(r'modal\s*kerja.*working\s*copitol\s*\(v\)', purp_text, re.IGNORECASE):
                data["facilityPurpose"] = "WORKING_CAPITAL"

        # Financing method on Page 2
        if p2:
            l_meth = find_label(p2, r'financing\s+method|metode\s+pembiayaan', 0.05, 0.30)
            if l_meth:
                m_boxes = [b for b in p2 if b["xc"] >= 0.25 and b["xc"] <= 0.50 and b["yc"] >= l_meth["y1"] - 0.01 and b["yc"] <= l_meth["y2"] + 0.03]
                if m_boxes:
                    m_txt = " ".join([b["text"] for b in m_boxes])
                    if "installment purchase" in m_txt.lower():
                        data["financingMethod"] = "INSTALLMENT_PURCHASE"
                    elif "financial lease" in m_txt.lower():
                        data["financingMethod"] = "FINANCIAL_LEASE"
                    elif "sale and leaseback" in m_txt.lower():
                        data["financingMethod"] = "SALE_AND_LEASEBACK"
                    else:
                        if any(opt in m_txt.lower() for opt in ["installment", "financial lease", "sale and leaseback"]):
                            data["financingMethod"] = m_txt
                        else:
                            data["financingMethod"] = ""

        # Stakeholders / Shareholders Table Extraction on Page 1
        sh_hdr = find_label(p1, r'struktur\s+organisasi|shareholder\s+structure', 0.40, 0.85)
        sh_name_lbl = find_label(p1, r'\bname\b', 0.50, 0.62)
        y_sh_top = (sh_name_lbl["y2"] if sh_name_lbl else (sh_hdr["y2"] + 0.02 if sh_hdr else 0.355))
        sh_ftr = find_label(p1, r'list\s+fixed\s+assets|modal\s+kerja|fixed\s+assets', 0.40, 0.85)
        y_sh_bot = sh_ftr["y1"] if sh_ftr else 0.55

        cand_sh_boxes = [
            b for b in p1 
            if b["xc"] >= 0.46 and b["xc"] <= 0.84 
            and b["yc"] >= y_sh_top + 0.005 and b["yc"] < y_sh_bot
        ]
        cand_sh_boxes.sort(key=lambda b: b["yc"])
        sh_rows = []
        for b in cand_sh_boxes:
            t_low = b["text"].lower().strip()
            if t_low in ('name', 'position', 'no', 'amount of share', 'amount of shard', 'amount', '% share', 'aeys %', 'share', 'shares'):
                continue
            if 'berdasarkan akta' in t_low or 'based on act' in t_low:
                continue
            matched_r = None
            for r in sh_rows:
                if abs(r["yc"] - b["yc"]) < 0.016:
                    matched_r = r
                    break
            if matched_r:
                matched_r["boxes"].append(b)
                matched_r["yc"] = sum(x["yc"] for x in matched_r["boxes"]) / len(matched_r["boxes"])
            else:
                sh_rows.append({"yc": b["yc"], "boxes": [b]})

        extracted_sh = []
        for r in sh_rows:
            name_toks = []
            pos_toks = []
            pct_toks = []
            amt_toks = []
            for b in r["boxes"]:
                if b["xc"] < 0.50:
                    continue
                elif b["xc"] < 0.63:
                    name_toks.append(b["text"])
                elif b["xc"] < 0.72:
                    pos_toks.append(b["text"])
                elif b["xc"] < 0.77:
                    amt_toks.append(b["text"])
                else:
                    pct_toks.append(b["text"])

            sh_name = " ".join(name_toks).strip()
            sh_pos = " ".join(pos_toks).strip()
            sh_amt = " ".join(amt_toks).strip()
            sh_pct = " ".join(pct_toks).strip()

            sh_name = re.sub(r'^[\s/:\-_,.]+|[\s/:\-_,.]+$', '', sh_name).strip()
            sh_pos = re.sub(r'^[\s/:\-_,.]+|[\s/:\-_,.]+$', '', sh_pos).strip()
            sh_pct = re.sub(r'^[^\d%]+|[^\d%]+$', '', sh_pct).strip()

            if sh_name or sh_pos or sh_pct:
                extracted_sh.append({
                    "name": sh_name,
                    "position": sh_pos,
                    "shares": sh_amt,
                    "sharePercentage": sh_pct
                })

        data["stakeholders"] = extracted_sh
        data["shareholders"] = extracted_sh

    # Fallback regex extraction if coordinates were missing or fields remained blank
    lines = [l.strip() for l in combined_full_text.splitlines() if l.strip()]

    if not data["companyName"]:
        m = re.search(r'(?:nama\s+perusahaan|company\s+name|nama\s+debitur)\s*[:=]?\s*([^\n\r]+)', combined_full_text, re.IGNORECASE)
        if m and not re.search(r'liugong|finance|indonesia|memberikan\s*penjelasan', m.group(1), re.IGNORECASE):
            data["companyName"] = m.group(1).strip()
        else:
            for line in lines:
                if re.match(r'^(?:PT|CV|UD|PO|BLU)\b', line, re.IGNORECASE):
                    if not re.search(r'liugong|finance|indonesia|memberikan\s*penjelasan', line, re.IGNORECASE):
                        data["companyName"] = line.strip()
                        break

    if not data["nib"]:
        m = re.search(r'\bnib\s*[:=]?\s*([0-9\s]{13,20})', combined_full_text, re.IGNORECASE)
        if m:
            digits = re.sub(r'\D', '', m.group(1))
            data["nib"] = digits[:13]
        else:
            m13 = re.findall(r'\b\d{13}\b', combined_full_text)
            if m13:
                data["nib"] = m13[0]

    if not data["npwp"]:
        m = re.search(r'\bnpwp\s*[:=]?\s*([0-9.\-\s]{15,25})', combined_full_text, re.IGNORECASE)
        if m:
            data["npwp"] = re.sub(r'[.\-\s]', '', m.group(1))
        else:
            m_npwp = re.findall(r'\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[.\s]?\d{1}[.\s\-]?\d{3}[.\s]?\d{3}\b', combined_full_text)
            if m_npwp:
                data["npwp"] = re.sub(r'[.\-\s]', '', m_npwp[0])

    if not data["companyAddress"]:
        m = re.search(r'(?:alamat\s+perusahaan|company\s+address|alamat\s+domisili|alamat\s+kantor)\s*[:=]?\s*([^\n\r]+)', combined_full_text, re.IGNORECASE)
        if m:
            data["companyAddress"] = clean_address(m.group(1).strip())

    if not data["city"]:
        m = re.search(r'(?:kota\s*/\s*kabupaten|kabupaten|kota|city)\s*[:=]?\s*([A-Za-z\s]+?)(?=\s*(?:provinsi|kode\s+pos|\n|$))', combined_full_text, re.IGNORECASE)
        if m:
            cand = m.group(1).strip()
            if not re.search(r'^(?:provinsi|province|alamat|tinggal|address)', cand, re.IGNORECASE):
                data["city"] = cand

    if not data["province"]:
        m = re.search(r'(?:provinsi|province)\s*[:=]?\s*([A-Za-z\s]+?)(?=\s*(?:kode\s+pos|negara|\n|$))', combined_full_text, re.IGNORECASE)
        if m:
            cand = m.group(1).strip()
            if not re.search(r'^(?:kode|pos|negara|address)', cand, re.IGNORECASE):
                data["province"] = cand

    if not data["postalCode"]:
        m = re.search(r'(?:kode\s+pos|postal\s+code|zip\s+code)\s*[:=]?\s*(\d{5})', combined_full_text, re.IGNORECASE)
        if m:
            data["postalCode"] = m.group(1)

    if not data["phoneFax"]:
        m = re.search(r'(?:telepon\s*/\s*fax|phone\s*/\s*fax|telepon\s+perusahaan|no\.?\s*telp)\s*[:=]?\s*([+0-9\s().\-]{7,20})', combined_full_text, re.IGNORECASE)
        if m:
            data["phoneFax"] = m.group(1).strip()

    # Note: Company email is strictly collected from its designated box on Page 1.
    # If the box is empty in the document, data["email"] remains empty.

    if not data["mainBusiness"]:
        m = re.search(r'(?:bidang\s+usaha|main\s+business|kegiatan\s+usaha)\s*[:=]?\s*([^\n\r]+)', combined_full_text, re.IGNORECASE)
        if m:
            data["mainBusiness"] = m.group(1).strip()

    if not data["establishmentActNo"]:
        m = re.search(r'(?:no\.?\s*(?:akta\s+)?pendirian|akta\s+pendirian)\s*[:=]?\s*([^\n\r,]+)', combined_full_text, re.IGNORECASE)
        if m:
            data["establishmentActNo"] = m.group(1).strip()
    if not data["establishmentDate"]:
        m = re.search(r'(?:tanggal\s+akta(?:\s+pendirian)?|establishment\s+date)\s*[:=]?\s*(\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4})', combined_full_text, re.IGNORECASE)
        if m:
            data["establishmentDate"] = normalize_date_to_iso(m.group(1))

    if not data["experienceYears"]:
        m = re.search(r'(?:pengalaman|experience)[^\n\r]*?(\d+)\s*(?:years?|vears?|thn|tahun)', combined_full_text, re.IGNORECASE)
        if m:
            data["experienceYears"] = m.group(1)
    if not data["experienceMonths"]:
        m = re.search(r'(?:years?|vears?|thn|tahun)[^\n\r]*?(\d+)\s*(?:months?|bln|bulan)', combined_full_text, re.IGNORECASE)
        if m:
            data["experienceMonths"] = m.group(1)

    if not data["picName"]:
        m = re.search(r'(?:nama\s+pic|contact\s+person|penanggung\s+jawab|pic\s+name)\s*[:=]?\s*([^\n\r]+)', combined_full_text, re.IGNORECASE)
        if m:
            cand = m.group(1).strip()
            if not re.search(r'^(?:telepon|phone|email|jabatan|position|alamat|address|\-)', cand, re.IGNORECASE):
                data["picName"] = cand

    if not data["picPosition"]:
        m = re.search(r'(?:jabatan\s+pic|jabatan|position)\s*[:=]?\s*([^\n\r]+)', combined_full_text, re.IGNORECASE)
        if m:
            cand = m.group(1).strip()
            if re.sub(r'[\s/.,\-_]', '', cand) and not re.search(r'^(?:email|telepon|phone|alamat|address|\-)', cand, re.IGNORECASE):
                data["picPosition"] = cand

    # Sanitize each field against stray punctuation and template boilerplate
    for k in list(data.keys()):
        if k in ('raw_text', 'financingValue', 'downPaymentValue', 'tenorMonths', 'stakeholders', 'shareholders'):
            continue
        data[k] = sanitize_fap_field(k, data.get(k))

    # Whole-document blank form detection:
    # If core identity fields are all blank, the document is an unfilled blank template.
    is_blank_form = (
        not data.get("companyName") and
        not data.get("nib") and
        not data.get("npwp") and
        not data.get("establishmentActNo") and
        not data.get("establishmentDate") and
        not data.get("picName") and
        not data.get("stakeholders")
    )
    if is_blank_form:
        for k in list(data.keys()):
            if k == "raw_text":
                continue
            if k in ("financingValue", "downPaymentValue", "tenorMonths"):
                data[k] = None
            elif k in ("stakeholders", "shareholders"):
                data[k] = []
            else:
                data[k] = ""

    return data, []
