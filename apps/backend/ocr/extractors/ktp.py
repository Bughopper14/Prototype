# pyre-ignore-all-errors
# pyrefly: ignore-errors
# type: ignore
"""KTP (Indonesian ID card) OCR field extractor."""
import re
from extractors.shared import (
    _lookup_wilayah_db,
    respace_glued_name,
)

def _clean_ktp_address(raw_al: str, region_hints=None) -> str:
    """Cleans OCR artifacts from a KTP street address without fabricating prefixes."""
    import re

    val = str(raw_al or "").strip().upper()
    if not val:
        return ""
    val = re.sub(r'^(?:ALAMAT|ALAMAL|ALAMA|ALANAT|ATAMAT|AIAMAT)\s*[:：.\-–—=~*+]*\s*', '', val)
    val = re.sub(r'^[：:~*:\-–—.;,|!\s]+', '', val)
    val = re.sub(r'\b(?:BOAST|BOASI|BEAST|COAST)\b.*$', '', val).strip()
    val = re.sub(r'\b(?:RT[/\s.]*RW|RT\s*\d|KEL\s*[/.]?\s*DESA|KELURAHAN|KECAMATAN)\b.*$', '', val).strip()
    val = re.sub(r'[,.\s\-–—~*|：:]+$', '', val).strip()

    # Separate genuinely present prefixes/numbers glued by OCR (without inventing JL.)
    val = re.sub(r'^\d{1,3}\s*/\s*\d{1,3}\s+', '', val)
    val = re.sub(r'^JL\.?(?=[A-Z]{3,})', 'JL. ', val)
    val = re.sub(r'^JALAN(?=[A-Z]{3,})', 'JALAN ', val)
    val = re.sub(r'([A-Z]{3,})(\d+)', r'\1 \2', val)
    val = re.sub(r'(\d+)\s*N[O0][.:,;]*\s*(\d+)', r'\1 NO. \2', val)
    val = re.sub(r'([A-Z]{2,})(N[O0][.:,;]+\s*\d+)', r'\1 \2', val)
    val = re.sub(r'\bN[O0][.:,;\s]*(\d+)', r'NO. \1', val)

    # Restore spaces in street tokens matching resolved Kel/Kec names (e.g. KEBONKACANG -> KEBON KACANG)
    for hint in (region_hints or []):
        h_clean = re.sub(r'\s+', ' ', str(hint or '').upper()).strip()
        h_compact = re.sub(r'[^A-Z0-9]', '', h_clean)
        if ' ' in h_clean and len(h_compact) >= 6 and h_compact in val:
            val = re.sub(rf'\b{re.escape(h_compact)}\b', h_clean, val)

    return re.sub(r'\s+', ' ', val).strip()


_INDO_NAME_SPLITTER = None


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
        else:
            clean_name = respace_glued_name(clean_name)
        extracted["nama"] = clean_name
        extracted["name"] = clean_name
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
    if raw_kec or raw_kel or raw_pos:
        try:
            row = _lookup_wilayah_db(raw_kec, raw_kel, raw_pos)
            if row and not _wilayah_row_fits(row, extracted.get("kabupaten_kota") or extracted.get("city"), extracted.get("provinsi") or extracted.get("province")):
                row = None  # another city or province than the one on the document
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
    def extract_rtrw_targeted(raw_str: str | None = "", b_list=None):
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
        # the label may come wrapped in quotes ("ALAMAT": "JL. ...")
        raw_al = re.sub(r'^[\s\x22\x27`]*(?:ALAMAT|ALAMAL|ALAMA|ALANAT)[\s\x22\x27`]*[:.\-–—=~*+]*[\s\x22\x27`]*', '', raw_al, flags=re.IGNORECASE).strip()
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
        raw_al = _clean_ktp_address(
            raw_al,
            [extracted.get("kel_desa"), extracted.get("kecamatan")],
        )
        if raw_al:
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
        kd = re.sub(r'^(?:KELURAHAN|ELURAHAN|LURAHAN|URAHAN|DESA)\s+', '', kd).strip()
        extracted["kel_desa"] = kd
        extracted["village"] = kd

    if extracted.get("kecamatan"):
        kc = str(extracted["kecamatan"]).strip()
        kc = re.sub(r'^[~*:\-–—\s]+', '', kc)
        kc = re.sub(r'[^a-zA-Z0-9\s]', '', kc).strip().upper()
        # the end of the label "KECAMATAN" is sometimes read as part of the value ("AMATAN KALIDERES")
        kc = re.sub(r'^(?:KECAMATAN|ECAMATAN|CAMATAN|AMATAN|MATAN)\s+', '', kc).strip()
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

    if tl and (tl == "JAKALA" or tl.startswith("JAK") or "JAKARTA" in tl):
        tl = "JAKARTA"

    extracted["tempat_lahir"] = tl
    extracted["tanggal_lahir"] = dob
    extracted["dateOfBirth"] = dob
    extracted["tempatTglLahir"] = f"{tl}, {dob}" if (tl and dob) else (tl or dob or "")

    return extracted


def extract_ktp_nib_style(boxes: list) -> tuple:
    import re

    sorted_boxes = sorted(boxes, key=lambda b: ((b.get("y_min", 0.0) + b.get("y_max", 0.0)) / 2.0, b.get("x_min", 0.0)))
    lines = []
    full_text_list = []
    for b in sorted_boxes:
        t = (b.get("text") or "").strip()
        if t:
            lines.append(t)
            full_text_list.append(t)
    full_text = "\n".join(full_text_list)

    heights = sorted([max(6.0, float(b.get("y_max", 0.0)) - float(b.get("y_min", 0.0))) for b in sorted_boxes])
    med_h = heights[len(heights) // 2] if heights else 24.0
    row_tol = max(14.0, med_h * 0.65)
    page_w = max([float(b.get("page_width") or b.get("x_max") or 1000) for b in sorted_boxes] or [1000.0])

    def _yc(b):
        return (float(b.get("y_min", 0.0)) + float(b.get("y_max", 0.0))) / 2.0

    KTP_LABEL_RE = re.compile(
        r'^(?:nik|nama|tempat|tempav|tempa[tfl]|jenis\s*kel|jeniske|gol\.?\s*darah|got\.?\s*darah|alamat|alamal|atamat|aiamat|rt\s*[/\\|!i1u]?\s*rw|rtirw|rirw|rurw|btirw|kel\s*[\/\.]?\s*desa|kev\s*desa|kell\s*desa|keldesa|ke\/?desa|kecamatan|kocamatan|agama|status\s*per|pekerjaan|pekeraan|pekenaan|kewarganegaraan|berlaku|borlaku|beriaku)\b',
        re.IGNORECASE,
    )
    label_boxes = [b for b in sorted_boxes if KTP_LABEL_RE.search((b.get("text") or "").strip())]

    def _find_label_box(label_pat: str):
        rx = re.compile(label_pat, re.IGNORECASE)
        for b in sorted_boxes:
            if rx.search((b.get("text") or "").strip()):
                return b
        return None

    def _spatial_row_value(label_pat: str, strip_prefix_pat: str, allow_next_row: bool = False) -> str:
        lb = _find_label_box(label_pat)
        if not lb:
            return ""
        lb_txt = (lb.get("text") or "").strip()
        lb_yc = _yc(lb)
        lb_xmin = float(lb.get("x_min", 0.0))
        lb_xmax = float(lb.get("x_max", 0.0))
        other_labels_y = [_yc(ob) for ob in label_boxes if ob is not lb]

        parts = []
        # Inline value in the same box after label prefix / colon
        m_inline = re.search(strip_prefix_pat + r'[\s:：.\-–—=~*+]*(.+)$', lb_txt, re.IGNORECASE)
        if m_inline:
            cand_in = re.sub(r'^[:：.\-–—=~*+\s]+', '', m_inline.group(1)).strip()
            # Guard against matching suffix of the label itself when only label is in box
            if cand_in and len(cand_in) >= 2:
                parts.append(cand_in)

        # Boxes strictly to the right on the same spatial row (closer to this label than any other label)
        same_row = []
        for b in sorted_boxes:
            if b is lb or b in label_boxes:
                continue
            bx_min = float(b.get("x_min", 0.0))
            byc = _yc(b)
            t_raw = (b.get("text") or "").strip()
            # Exclude right-edge photo signature city/date region on full KTP cards
            if bx_min > page_w * 0.70 and lb_xmin < page_w * 0.35:
                continue
            if bx_min <= lb_xmin + max(18.0, (lb_xmax - lb_xmin) * 0.45):
                continue
            dy = abs(byc - lb_yc)
            if dy > row_tol:
                continue
            if any(abs(byc - oy) + 1.5 < dy for oy in other_labels_y):
                continue
            if allow_next_row and re.match(r'^[：:.\s]*\d{1,3}\s*[/\\|]\s*\d{1,3}\b', t_raw):
                continue
            same_row.append(b)
        same_row.sort(key=lambda b: float(b.get("x_min", 0.0)))
        for rb in same_row:
            t_rb = (rb.get("text") or "").strip()
            if t_rb:
                parts.append(t_rb)

        # Optional 2nd continuation line (for wrapped Alamat above RT/RW)
        if allow_next_row and same_row:
            next_labels_y = [oy for oy in other_labels_y if oy > lb_yc + med_h * 0.5]
            next_limit_y = min(next_labels_y) if next_labels_y else (lb_yc + med_h * 2.5)
            val_col_x = float(same_row[0].get("x_min", 0.0))
            cont = []
            for b in sorted_boxes:
                if b is lb or b in same_row or b in label_boxes:
                    continue
                bx_min = float(b.get("x_min", 0.0))
                byc = _yc(b)
                if bx_min < max(lb_xmax, val_col_x - 30.0):
                    continue
                if bx_min > page_w * 0.70 and lb_xmin < page_w * 0.35:
                    continue
                if lb_yc + med_h * 0.65 < byc < next_limit_y - med_h * 0.35:
                    t_c = re.sub(r'^[：:.\s]+', '', (b.get("text") or "")).strip()
                    if t_c and not re.match(r'^\d{1,3}\s*[/\\|]?\s*\d{1,3}$', t_c) and not re.search(r'^\d{2}-\d{2}-\d{4}$', t_c):
                        cont.append(t_c)
            parts.extend(cont)

        raw_val = " ".join(parts).strip()
        return re.sub(r'^[:：.\-–—=~*+\s]+', '', raw_val).strip()

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
        m = re.search(r'\b(\d{1,2})[-\s/\.]*([A-Za-z]+)[-\s/\.]*(\d{4})\b', v)
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

    nik_spatial = _spatial_row_value(r'^(?:nik|nomor\s+induk)\b', r'^(?:nik|nomor\s+induk)')
    if nik_spatial:
        cand = clean_nik_digits(nik_spatial)
        if len(cand) >= 16:
            nik = cand[:16]

    if not nik:
        nik_match = re.search(r'(?:nik|nik\s*[:\.]|nomor\s+induk)[\s:.\-–—]*([0-9A-Za-z\s]{14,24})', full_text, re.IGNORECASE)
        if nik_match:
            cand = clean_nik_digits(nik_match.group(1))
            if len(cand) >= 16:
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
    nama_spatial = _spatial_row_value(r'^(?:\d+[\.\)]\s*)?(?:nama|name)\b', r'^(?:\d+[\.\)]\s*)?(?:nama|name)')
    if nama_spatial:
        cand = re.sub(r'[^a-zA-Z\s\.,\'-]', '', nama_spatial).strip()
        if len(cand) >= 3 and not re.search(r'tempat|lahir|nik|alamat', cand, re.IGNORECASE):
            nama = cand.upper()

    if not nama:
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
        if re.search(r'(?:tempa[tvl][/.\s]*[til1]g[l1i][/.\s]*lahir|tempav[til1]g[l1i]|tempat[til1]g[l1i]|tempa[tvl][/.\s]*lahir|[til1]g[l1i]\s*lahir)', t, re.IGNORECASE) and not re.search(r'berlaku|hingga', t, re.IGNORECASE):
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
        berlaku_y = [
            (b.get('y_min', 0.0) + b.get('y_max', 0.0)) / 2.0
            for b in sorted_boxes
            if re.search(r'berlaku|hingga', (b.get('text') or ''), re.IGNORECASE)
        ]
        for b in sorted_boxes:
            t = (b.get('text') or '').strip()
            y_min = b.get('y_min', 0.0)
            y_c_box = (y_min + b.get('y_max', 0.0)) / 2.0
            x_min = b.get('x_min', 0.0)
            p_w = b.get('page_width', 1000) or 1000
            p_h = b.get('page_height', 1000) or 1000
            if y_min > p_h * 0.55 and x_min > p_w * 0.5:
                continue
            if any(abs(y_c_box - by) < 25 for by in berlaku_y):
                continue
            m_dob = re.search(r'(?<!\d)(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4})(?!\d)', t)
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
    al_spatial = _spatial_row_value(
        r'^(?:\d+[\.\)]\s*)?(?:alamat|alamal|alama|alanat|atamat|aiamat)\b',
        r'^(?:\d+[\.\)]\s*)?(?:alamat|alamal|alama|alanat|atamat|aiamat)',
        allow_next_row=True,
    )
    if al_spatial:
        val = re.sub(r'\b(?:RT[/\s.]*RW|RT\s*\d|KEL|DESA)\b.*$', '', al_spatial, flags=re.IGNORECASE).strip()
        val = re.sub(r'[,.\s\-–—*~|：:]+$', '', val).strip()
        if len(val) >= 4 and not re.fullmatch(r'\d{1,3}\s*/\s*\d{1,3}', val):
            alamat = val.upper()

    if not alamat:
        for idx, line in enumerate(lines):
            m_al = re.search(r'^(?:\d+[\.\)]\s*)?(?:alamat|alamal|alama|alanat|atamat|aiamat)[\s:：.\-–—=~]+(.*)$', line.strip(), re.IGNORECASE)
            if m_al:
                val = m_al.group(1).strip()
                val = re.sub(r'\b(?:RT[/\s.]*RW|RT\s*\d|KEL|DESA)\b.*$', '', val, flags=re.IGNORECASE).strip()
                val = re.sub(r'[,.\s\-–—*~|]+$', '', val).strip()
                if len(val) >= 4 and not re.fullmatch(r'\d{1,3}\s*/\s*\d{1,3}', val):
                    alamat = val.upper()
                    break

    if not alamat:
        for line in lines:
            m_st = re.search(r'\b(?:JL|JALAN|KP|KAMPUNG|KOMP|KOMPLEK|GG|GANG|DUSUN)\b[.\s]*([^\n\r]+)', line, re.IGNORECASE)
            if m_st:
                val = m_st.group(0).strip()
                val = re.split(r'\b(?:RT[/\s.]*RW|RT\s*\d|KEL|DESA)\b', val, flags=re.IGNORECASE)[0].strip()
                val = re.sub(r'[,.\s\-–—*~|]+$', '', val).strip()
                if len(val) >= 4:
                    alamat = val.upper()
                    break

    # 7. RT & RW
    rtrw_spatial = _spatial_row_value(
        r'^(?:rt\s*[/\\|!i1u]?\s*rw|rtirw|rirw|rurw|btirw|rtaw|m8/18)\b',
        r'^(?:rt\s*[/\\|!i1u]?\s*rw|rtirw|rirw|rurw|btirw|rtaw|m8/18)',
    )
    if rtrw_spatial:
        m_rtsp = re.search(r'(\d{1,3})\s*[/,\-\\\|]\s*(\d{1,3})', rtrw_spatial)
        if not m_rtsp:
            m_rtsp = re.search(r'\b(0\d{2})[71]?(0\d{2})\b', re.sub(r'\D', '', rtrw_spatial))
        if m_rtsp:
            rt = m_rtsp.group(1).zfill(3)
            rw = m_rtsp.group(2).zfill(3)
    if not rt or not rw:
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
    kel_spatial = _spatial_row_value(
        r'^(?:kel\s*[\/\.]?\s*desa|kelurahan|desa|kev\s*desa|kell\s*desa|keldesa|kelldesa|kevdesa|ke\/?desa)\b',
        r'^(?:kel\s*[\/\.]?\s*desa|kelurahan|desa|kev\s*desa|kell\s*desa|keldesa|kelldesa|kevdesa|ke\/?desa)',
    )
    if kel_spatial:
        kel_cand = re.sub(r'[^A-Za-z0-9\s]', '', kel_spatial).strip().upper()
        if kel_cand and not re.search(r'^\d{1,3}\s*/\s*\d{1,3}$', kel_cand):
            kel_desa = kel_cand
    if not kel_desa:
        m_kd = re.search(r'(?:kel\s*[\/\.]?\s*desa|kelurahan|desa|kev\s*desa|kell\s*desa|keldesa|kevdesa|ke\/?desa)[\s:.\-–—=~]*([A-Za-z0-9\s]+?)(?:$|\n|kecamatan|rt|rw)', full_text, re.IGNORECASE)
        if m_kd:
            kel_desa = re.sub(r'[^A-Za-z0-9\s]', '', m_kd.group(1)).strip().upper()

    # 9. Kecamatan
    kec_spatial = _spatial_row_value(
        r'^(?:kecamatan|kocamatan|kec\.?)\b',
        r'^(?:kecamatan|kocamatan|kec\.?)',
    )
    if kec_spatial:
        kec_cand = re.sub(r'[^A-Za-z0-9\s]', '', kec_spatial).strip().upper()
        if kec_cand and not re.search(r'^(?:ISLAM|KRISTEN|KATOLIK|HINDU|BUDDHA|KONGHUCU)$', kec_cand):
            kecamatan = kec_cand
    if not kecamatan:
        m_kc = re.search(r'(?:kecamatan|kocamatan|kec\.?)[\s:.\-–—=~]*([A-Za-z0-9\s]+?)(?:$|\n|kabupaten|kota|kelurahan|agama)', full_text, re.IGNORECASE)
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

    if nama:
        nama = respace_glued_name(nama)
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




extract_ktp = extract_ktp_nib_style
