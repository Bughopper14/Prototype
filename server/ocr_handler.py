import sys
import os
import json
import time
import uuid
from pathlib import Path
from datetime import datetime

# Include OCR project in path
OCR_PATH = r"C:\Users\reage\Documents\ChatGPT\OCR"
if OCR_PATH not in sys.path:
    sys.path.insert(0, OCR_PATH)

PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIUGONG_CLEAN = os.path.join(PARENT_DIR, "LiugongApps_Clean")
for p_dir in [PARENT_DIR, LIUGONG_CLEAN]:
    if os.path.exists(p_dir) and p_dir not in sys.path:
        sys.path.append(p_dir)
try:
    import db_connector
except Exception:
    db_connector = None

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
    TESSERACT_EXE = r"C:\Program Files\PDF24\tesseract\tesseract.exe"
    if os.path.exists(TESSERACT_EXE):
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_EXE
    
    # Check tessdata location
    tess_dir = os.path.dirname(os.path.abspath(__file__))
    tess_parent = os.path.dirname(tess_dir)
    if os.path.exists(os.path.join(tess_parent, 'eng.traineddata')):
        os.environ['TESSDATA_PREFIX'] = tess_parent
    elif os.path.exists(r"C:\Program Files\PDF24\tesseract\tessdata"):
        os.environ['TESSDATA_PREFIX'] = r"C:\Program Files\PDF24\tesseract"
    TESSERACT_AVAILABLE = True
except Exception as te:
    print(f"[!] Warning: Pytesseract init error: {te}")
    TESSERACT_AVAILABLE = False

class TesseractEngine:
    @classmethod
    def process_image(cls, img) -> list:
        if not TESSERACT_AVAILABLE:
            return OCREngine.process_image(img) if OCR_AVAILABLE else []
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

TEMP_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp_ocr_uploads')
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)

def get_db_conn():
    config_paths = [
        os.path.join(os.getcwd(), 'config.json'),
        os.path.join(os.getcwd(), 'LiugongApps_Clean', 'config.json'),
        r'C:\Users\reage\Documents\ChatGPT\testlfidash\LiugongApps_Clean\config.json',
        r'C:\Users\reage\Documents\ChatGPT\testlfidash\config.json'
    ]
    cfg = None
    for p in config_paths:
        if os.path.exists(p):
            try:
                cfg = json.load(open(p, 'r', encoding='utf-8')).get('database', {})
                break
            except Exception:
                pass
    host = cfg.get('host', '127.0.0.1') if cfg else '127.0.0.1'
    port = int(cfg.get('port', 3306)) if cfg else 3306
    user = cfg.get('user', 'root') if cfg else 'root'
    password = cfg.get('password', '123987') if cfg else '123987'
    database = cfg.get('name', 'liugongapps_db') if cfg else 'liugongapps_db'
    import pymysql
    return pymysql.connect(host=host, port=port, user=user, password=password, database=database)

def post_process_ktp_full(extracted: dict, boxes=None):
    import re
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
            return f"{int(m1.group(1)):04d}-{int(m1.group(2)):02d}-{int(m1.group(3)):02d}"
        m2 = re.search(r'\b(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})\b', v)
        if m2:
            return f"{int(m2.group(3)):04d}-{int(m2.group(2)):02d}-{int(m2.group(1)):02d}"
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
                return f"{int(y_val):04d}-{m_num}-{int(d_val):02d}"
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
            if re.search(r'tempat|tgl|lahir', txt, re.IGNORECASE):
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

                if row:
                    if row[0] and not extracted.get("kel_desa"): extracted["kel_desa"] = row[0]
                    if row[1] and not extracted.get("kode_pos"): extracted["kode_pos"] = row[1]
                    if row[2] and not extracted.get("kecamatan"): extracted["kecamatan"] = row[2]
                    if row[3]: extracted["kabupaten_kota"] = row[3]
                    if row[4]: extracted["provinsi"] = row[4]
                    extracted["cityRegency"] = extracted.get("kabupaten_kota")
                    extracted["city"] = extracted.get("kabupaten_kota")
                    extracted["province"] = extracted.get("provinsi")
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
    if raw_pek:
        extracted["pekerjaan"] = normalize_pekerjaan(raw_pek)
        extracted["occupation"] = extracted["pekerjaan"]

    # 3. Status Perkawinan Cleanup
    raw_sp = str(extracted.get("status_perkawinan") or "").upper()
    if 'BELUM' in raw_sp or 'SINGLE' in raw_sp:
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
        if 'BELUM KAWIN' in box_text:
            extracted["status_perkawinan"] = 'BELUM KAWIN'
            extracted["maritalStatus"] = 'SINGLE'
        elif 'KAWIN' in box_text:
            extracted["status_perkawinan"] = 'KAWIN'
            extracted["maritalStatus"] = 'MARRIED'

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
        extracted["alamat"] = raw_al
        extracted["address"] = raw_al
        extracted["fullAddress"] = raw_al

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

    return extracted


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
                return f"{int(y_val):04d}-{m_num}-{int(d_val):02d}"
        m_iso = re.search(r'\b(\d{4})-(\d{1,2})-(\d{1,2})\b', v)
        if m_iso:
            return f"{int(m_iso.group(1)):04d}-{int(m_iso.group(2)):02d}-{int(m_iso.group(3)):02d}"
        m_dm = re.search(r'\b(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})\b', v)
        if m_dm:
            return f"{int(m_dm.group(3)):04d}-{int(m_dm.group(2)):02d}-{int(m_dm.group(1)):02d}"
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
    tgl_match = re.search(r'(?:diterbitkan|ditetapkan|tanggal\s+terbit|pada\s+tanggal)[\s\w,\.]*?(?:pada\s+tanggal\s*[:.\-–—]?\s*)?(\d{1,2}\s+[A-Za-z]+\s+\d{4})', full_text, re.IGNORECASE)
    if tgl_match:
        tanggal_terbit = parse_indo_date(tgl_match.group(1))

    if not tanggal_terbit:
        date_candidates = re.findall(r'\b(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b', full_text, re.IGNORECASE)
        if date_candidates:
            tanggal_terbit = parse_indo_date(date_candidates[-1])

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

    alamat_full = ""
    if addr_lines:
        alamat_full = " ".join(addr_lines)
        alamat_full = re.sub(r'\s+', ' ', alamat_full).strip()
        alamat_full = re.sub(r'^[:,\s.\-–—]+', '', alamat_full).strip()

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

    kec_match = re.search(r'(?:kecamatan|kec\.?)[\s:.\-–—]*([A-Za-z\s]+?)(?:,|$|\n|kabupaten|kota|kelurahan|kode\s*pos)', full_text, re.IGNORECASE)
    if kec_match:
        kecamatan = re.sub(r'[^A-Za-z\s]', '', kec_match.group(1)).strip().upper()

    kel_match = re.search(r'(?:kelurahan|kel\.?|desa)[\s:.\-–—]*([A-Za-z\s]+?)(?:,|$|\n|kecamatan|kode\s*pos)', full_text, re.IGNORECASE)
    if kel_match:
        kelurahan = re.sub(r'[^A-Za-z\s]', '', kel_match.group(1)).strip().upper()

    for line in lines:
        m_c = re.search(r'^(?:\d+[\.\)]\s*)?(?:nama\s+perusahaan|nama\s+pelaku\s+usaha|nama\s+perseroan)[\s:.\-–—=]+(.*)$', line.strip(), re.IGNORECASE)
        if m_c:
            cand_name = m_c.group(1).strip()
            if len(cand_name) > 3 and not re.search(r'republik|indonesia|pemerintah', cand_name, re.IGNORECASE):
                company_name = cand_name
                break

    if not company_name:
        comp_match = re.search(r'(?:nama\s+perusahaan|nama\s+pelaku\s+usaha|nama\s+perseroan)[\s:.\-–—]*([A-Za-z0-9\.,\s\(\)]+?)(?:$|\n|nomor\s+induk|nib|alamat)', full_text, re.IGNORECASE)
        if comp_match:
            cand_name = comp_match.group(1).strip()
            if len(cand_name) > 3 and not re.search(r'republik|indonesia|pemerintah', cand_name, re.IGNORECASE):
                company_name = cand_name

    if not company_name:
        pt_match = re.search(r'\b(PT\.?\s+[A-Z0-9\s\.\-]{3,40}|CV\.?\s+[A-Z0-9\s\.\-]{3,40})\b', full_text)
        if pt_match:
            cand_name = pt_match.group(1).strip()
            if not re.search(r'pemerintah|kementerian|bkpm', cand_name, re.IGNORECASE):
                company_name = cand_name

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

def generate_document_storage_info(doc_type: str, app_id: str = None, stakeholder_id: str = None, original_filename: str = None) -> dict:
    import re
    doc_type = (doc_type or 'general').lower().strip()
    clean_type = re.sub(r'[^a-z0-9_-]', '', doc_type) or 'general'
    clean_app = re.sub(r'[^a-zA-Z0-9_-]', '', app_id or 'unknown') or 'app'
    clean_stk = re.sub(r'[^a-zA-Z0-9_-]', '', stakeholder_id or '')
    ext = os.path.splitext(original_filename or '')[1].lower() or ('.pdf' if clean_type == 'nib' else '.jpg')
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    base_name = f"{clean_type}_{clean_app}"
    if clean_stk and clean_stk != clean_app and clean_stk != 'unknown':
        base_name += f"_{clean_stk}"
    base_name += f"_{timestamp}"

    file_name = f"{base_name}{ext}"
    rel_path = f"Documents/{clean_type}/{file_name}"
    file_url = f"/documents/{clean_type}/{file_name}"
    return {
        "doc_type": clean_type,
        "file_name": file_name,
        "relative_path": rel_path,
        "file_url": file_url
    }

def scan_document_ocr(file_storage, doc_type: str = "auto", app_id: str = None, stakeholder_id: str = None) -> dict:
    if not OCR_AVAILABLE and not TESSERACT_AVAILABLE:
        raise RuntimeError("OCR Engine modules not available on system")

    start_time = time.time()
    filename = file_storage.filename or "upload.png"
    ext = os.path.splitext(filename)[1].lower() or ".png"
    temp_filename = f"ocr_{uuid.uuid4().hex[:12]}{ext}"
    temp_path = Path(TEMP_UPLOAD_DIR) / temp_filename

    try:
        file_storage.save(str(temp_path))

        # 1. Load document (image or PDF)
        raw_img, page_count = DocumentPreprocessor.load_document(temp_path)
        # 2. Auto-orient
        oriented_img, rot_angle = DocumentPreprocessor.auto_orient_image(raw_img)
        # 3. Deskew
        deskewed_img, skew_angle = DocumentPreprocessor.deskew_image(oriented_img)
        # 4. Tesseract OCR Engine (with fallback)
        boxes = TesseractEngine.process_image(deskewed_img)

        # 5. Document Type detection
        dtype_clean = (doc_type or "auto").strip().lower()
        if dtype_clean in ["auto", "none", ""]:
            detected = InformationExtractor.detect_document_type(boxes, filename)
            dtype_clean = detected.value if hasattr(detected, "value") else str(detected).lower()

        # 6. Extract structured fields
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
            extracted, tagged = extract_nib(boxes)
            detected_type = "nib"
        else:
            obj, tagged = InformationExtractor.extract_generic(boxes)
            detected_type = "generic"

        if dtype_clean != "nib":
            extracted = obj.model_dump() if hasattr(obj, "model_dump") else dict(obj)

        # Robust Indonesian Birth Place and Date Adjuster and Administrative Upward Search
        if detected_type == "ktp":
            post_process_ktp_full(extracted, boxes)

        # Save structured document file if app_id or stakeholder_id provided
        storage_info = None
        if app_id or stakeholder_id:
            storage_info = generate_document_storage_info(detected_type, app_id, stakeholder_id, filename)
            # Write to both LiugongApps_Clean and prototype-src
            for base_root in [
                os.path.dirname(os.path.abspath(__file__)),
                os.path.abspath(os.path.join(PARENT_DIR, '..', 'prototype-src'))
            ]:
                target_fpath = os.path.join(base_root, storage_info['relative_path'])
                os.makedirs(os.path.dirname(target_fpath), exist_ok=True)
                try:
                    import shutil
                    shutil.copy2(str(temp_path), target_fpath)
                except Exception as save_err:
                    print(f"[!] Warning copying file to {target_fpath}: {save_err}")

            # Auto-save metadata into MySQL for stakeholder documents
            if stakeholder_id and detected_type in ["ktp", "npwp", "passport", "kitas"]:
                try:
                    save_document_db(
                        GLOBAL_CONFIG,
                        stakeholder_id,
                        detected_type,
                        extracted,
                        doc_path=storage_info['relative_path'],
                        file_name=storage_info['file_name']
                    )
                except Exception as s_err:
                    print(f"[!] Warning auto-saving OCR to DB: {s_err}")

        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "status": "success",
            "doc_type": detected_type,
            "filename": filename,
            "fileName": storage_info['file_name'] if storage_info else filename,
            "file_name": storage_info['file_name'] if storage_info else filename,
            "filePath": storage_info['relative_path'] if storage_info else '',
            "document_path": storage_info['relative_path'] if storage_info else '',
            "fileUrl": storage_info['file_url'] if storage_info else '',
            "page_count": page_count,
            "data": extracted,
            "processing_time_ms": elapsed_ms
        }
    finally:
        if temp_path.exists():
            try:
                os.remove(str(temp_path))
            except Exception:
                pass

def save_document_db(config, stakeholder_id: str, doc_type: str, data: dict, doc_path: str = None, file_name: str = None) -> dict:
    conn = db_connector.get_connection(config)
    if not conn:
        raise RuntimeError("Database connection unavailable")

    doc_type = (doc_type or "ktp").lower().strip()
    cursor = conn.cursor()
    record_id = str(uuid.uuid4())
    raw_json = json.dumps(data, ensure_ascii=False)
    file_name = file_name or data.get('file_name') or data.get('fileName')
    doc_path = doc_path or data.get('document_path') or data.get('filePath')

    try:
        if doc_type == "ktp":
            data['berlaku_hingga'] = 'SEUMUR HIDUP'
            cursor.execute("SELECT id FROM ktp WHERE stakeholder_id = %s", (stakeholder_id,))
            existing = cursor.fetchone()
            if existing:
                record_id = existing['id']
                cursor.execute("""
                    UPDATE ktp SET
                        nik = %s, nama = %s, tempat_lahir = %s, tanggal_lahir = %s,
                        jenis_kelamin = %s, golongan_darah = %s, alamat = %s, rt_rw = %s,
                        kel_desa = %s, kecamatan = %s, agama = %s, status_perkawinan = %s,
                        pekerjaan = %s, kewarganegaraan = %s, berlaku_hingga = %s,
                        document_path = %s, file_name = %s, raw_ocr_json = %s, updated_at = NOW()
                    WHERE id = %s
                """, (
                    data.get('nik'), data.get('nama'), data.get('tempat_lahir'), data.get('tanggal_lahir') or None,
                    data.get('jenis_kelamin'), data.get('golongan_darah'), data.get('alamat'), data.get('rt_rw'),
                    data.get('kel_desa'), data.get('kecamatan'), data.get('agama'), data.get('status_perkawinan'),
                    data.get('pekerjaan'), data.get('kewarganegaraan'), data.get('berlaku_hingga'),
                    doc_path, file_name, raw_json, record_id
                ))
            else:
                cursor.execute("""
                    INSERT INTO ktp (
                        id, stakeholder_id, nik, nama, tempat_lahir, tanggal_lahir,
                        jenis_kelamin, golongan_darah, alamat, rt_rw, kel_desa,
                        kecamatan, agama, status_perkawinan, pekerjaan, kewarganegaraan,
                        berlaku_hingga, document_path, file_name, raw_ocr_json, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, NOW(), NOW()
                    )
                """, (
                    record_id, stakeholder_id, data.get('nik'), data.get('nama'), data.get('tempat_lahir'), data.get('tanggal_lahir') or None,
                    data.get('jenis_kelamin'), data.get('golongan_darah'), data.get('alamat'), data.get('rt_rw'), data.get('kel_desa'),
                    data.get('kecamatan'), data.get('agama'), data.get('status_perkawinan'), data.get('pekerjaan'), data.get('kewarganegaraan'),
                    data.get('berlaku_hingga'), doc_path, file_name, raw_json
                ))

        elif doc_type == "npwp":
            cursor.execute("SELECT id FROM npwp WHERE stakeholder_id = %s", (stakeholder_id,))
            existing = cursor.fetchone()
            if existing:
                record_id = existing['id']
                cursor.execute("""
                    UPDATE npwp SET
                        npwp_number = %s, raw_npwp = %s, nama = %s, nik = %s,
                        alamat = %s, kelurahan_kecamatan = %s, kota_provinsi = %s,
                        kpp = %s, tanggal_terdaftar = %s, document_path = %s, file_name = %s,
                        raw_ocr_json = %s, updated_at = NOW()
                    WHERE id = %s
                """, (
                    data.get('npwp_number'), data.get('raw_npwp'), data.get('nama'), data.get('nik'),
                    data.get('alamat'), data.get('kelurahan_kecamatan'), data.get('kota_provinsi'),
                    data.get('kpp'), data.get('tanggal_terdaftar'), doc_path, file_name, raw_json, record_id
                ))
            else:
                cursor.execute("""
                    INSERT INTO npwp (
                        id, stakeholder_id, npwp_number, raw_npwp, nama, nik,
                        alamat, kelurahan_kecamatan, kota_provinsi, kpp, tanggal_terdaftar,
                        document_path, file_name, raw_ocr_json, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, NOW(), NOW()
                    )
                """, (
                    record_id, stakeholder_id, data.get('npwp_number'), data.get('raw_npwp'), data.get('nama'), data.get('nik'),
                    data.get('alamat'), data.get('kelurahan_kecamatan'), data.get('kota_provinsi'), data.get('kpp'), data.get('tanggal_terdaftar'),
                    doc_path, file_name, raw_json
                ))

        elif doc_type == "passport":
            cursor.execute("SELECT id FROM passport WHERE stakeholder_id = %s", (stakeholder_id,))
            existing = cursor.fetchone()
            if existing:
                record_id = existing['id']
                cursor.execute("""
                    UPDATE passport SET
                        passport_number = %s, country_code = %s, country_name = %s,
                        nama = %s, surname = %s, given_names = %s, nationality = %s,
                        tanggal_lahir = %s, tempat_lahir = %s, jenis_kelamin = %s,
                        tanggal_pengeluaran = %s, tanggal_berlaku = %s, kantor_penerbit = %s,
                        personal_id = %s, document_path = %s, file_name = %s, raw_ocr_json = %s, updated_at = NOW()
                    WHERE id = %s
                """, (
                    data.get('passport_number'), data.get('country_code'), data.get('country_name'),
                    data.get('nama'), data.get('surname'), data.get('given_names'), data.get('nationality'),
                    data.get('tanggal_lahir') or None, data.get('tempat_lahir'), data.get('jenis_kelamin'),
                    data.get('tanggal_pengeluaran') or None, data.get('tanggal_berlaku') or None, data.get('kantor_penerbit'),
                    data.get('personal_id'), doc_path, file_name, raw_json, record_id
                ))
            else:
                cursor.execute("""
                    INSERT INTO passport (
                        id, stakeholder_id, passport_number, country_code, country_name,
                        nama, surname, given_names, nationality, tanggal_lahir,
                        tempat_lahir, jenis_kelamin, tanggal_pengeluaran, tanggal_berlaku,
                        kantor_penerbit, personal_id, document_path, file_name, raw_ocr_json, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, NOW(), NOW()
                    )
                """, (
                    record_id, stakeholder_id, data.get('passport_number'), data.get('country_code'), data.get('country_name'),
                    data.get('nama'), data.get('surname'), data.get('given_names'), data.get('nationality'), data.get('tanggal_lahir') or None,
                    data.get('tempat_lahir'), data.get('jenis_kelamin'), data.get('tanggal_pengeluaran') or None, data.get('tanggal_berlaku') or None,
                    data.get('kantor_penerbit'), data.get('personal_id'), doc_path, file_name, raw_json
                ))

        elif doc_type == "kitas":
            cursor.execute("SELECT id FROM kitas WHERE stakeholder_id = %s", (stakeholder_id,))
            existing = cursor.fetchone()
            if existing:
                record_id = existing['id']
                cursor.execute("""
                    UPDATE kitas SET
                        niora = %s, permit_number = %s, nama = %s, kewarganegaraan = %s,
                        tanggal_lahir = %s, jenis_kelamin = %s, berlaku_hingga = %s,
                        instansi_penerbit = %s, alamat = %s, document_path = %s, file_name = %s,
                        raw_ocr_json = %s, updated_at = NOW()
                    WHERE id = %s
                """, (
                    data.get('niora'), data.get('permit_number'), data.get('nama'), data.get('kewarganegaraan'),
                    data.get('tanggal_lahir') or None, data.get('jenis_kelamin'), data.get('berlaku_hingga'),
                    data.get('instansi_penerbit'), data.get('alamat'), doc_path, file_name, raw_json, record_id
                ))
            else:
                cursor.execute("""
                    INSERT INTO kitas (
                        id, stakeholder_id, niora, permit_number, nama, kewarganegaraan,
                        tanggal_lahir, jenis_kelamin, berlaku_hingga, instansi_penerbit,
                        alamat, document_path, file_name, raw_ocr_json, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s, %s, NOW(), NOW()
                    )
                """, (
                    record_id, stakeholder_id, data.get('niora'), data.get('permit_number'), data.get('nama'), data.get('kewarganegaraan'),
                    data.get('tanggal_lahir') or None, data.get('jenis_kelamin'), data.get('berlaku_hingga'), data.get('instansi_penerbit'),
                    data.get('alamat'), doc_path, file_name, raw_json
                ))

        return {"status": "saved", "id": record_id, "doc_type": doc_type, "stakeholder_id": stakeholder_id}
    finally:
        cursor.close()
        conn.close()

def get_document_db(config, doc_type: str, stakeholder_id: str) -> dict:
    conn = db_connector.get_connection(config)
    if not conn:
        return None

    doc_type = (doc_type or "ktp").lower().strip()
    cursor = conn.cursor()
    try:
        if doc_type not in ["ktp", "npwp", "passport", "kitas"]:
            return None
        cursor.execute(f"SELECT * FROM `{doc_type}` WHERE stakeholder_id = %s ORDER BY updated_at DESC LIMIT 1", (stakeholder_id,))
        row = cursor.fetchone()
        if not row:
            return None
        # Format dates to YYYY-MM-DD
        for k in ['tanggal_lahir', 'tanggal_pengeluaran', 'tanggal_berlaku', 'created_at', 'updated_at']:
            if k in row and row[k] and hasattr(row[k], 'strftime'):
                row[k] = row[k].strftime('%Y-%m-%d')
        return row
    finally:
        cursor.close()
        conn.close()
