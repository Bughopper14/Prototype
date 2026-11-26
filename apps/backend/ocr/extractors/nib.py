# pyre-ignore-all-errors
# pyrefly: ignore-errors
# type: ignore
"""NIB (Nomor Induk Berusaha / OSS) OCR field extractor."""
import re
from extractors.shared import (
    _lookup_wilayah_db,
    respace_glued,
)

def extract_nib(boxes: list) -> tuple:
    import re

    lines = []
    full_text_list = []
    for b in boxes:
        t = respace_glued((b.get("text") or "").replace("\uff1a", ":").replace("\uff0c", ",").strip())
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
        # a number found without a label is a phone number only when it is not part of the NIB or NPWP number
        no_ids = re.sub(r'\b\d{13}\b', ' ', full_text)
        no_ids = re.sub(r'\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}', ' ', no_ids)
        tel_candidates = [c for c in re.findall(r'(?:\+62|08|021|022|031|0[2-9]\d{1,2})[\s\-\.]?\d{3,4}[\s\-\.]?\d{3,5}', no_ids) if not (nib_number and re.sub(r'\D', '', c) in nib_number)]
        if tel_candidates:
            phone = tel_candidates[0].strip()

    # 4. Ekstraksi Tanggal Terbit
    tgl_match = re.search(r'(?:diterbitkan|ditetapkan)(?:\s*di\s*[A-Za-z]+)?\s*,?\s*(?:pada\s*tanggal|tanggal)\s*[:.\-–—=]?\s*(\d{1,2}\s*[A-Za-z]+\s*\d{4}|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4})', full_text, re.IGNORECASE)
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
    stop_pat = r'^(?:\d+[\.\)]\s*)?(?:nama|npwp|nomor\s+pokok|(?:no\.?\s*)?telepon|(?:no\.?\s*)?telp|phone|email|status\s+penanaman|kode\s+kbli|kbli|nomor\s+induk|diterbitkan|pada\s+tanggal)'
    for idx, line in enumerate(lines):
        clean_l = line.strip()
        m_start = re.search(r'^(?:\d+[\.\)]\s*)?(?:alamat\s+perusahaan|alamat\s+kantor|alamat\s+usaha|alamat\s+domisili|alamat)[\s:：.\-–—=]*(.*)$', clean_l, re.IGNORECASE)
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
        alamat_full = re.sub(r'^[/:：,\s.\-–—]+', '', alamat_full).strip()
        alamat_full = re.sub(r'^(?:korespondensi\b)?[\s:：.\-–—=]*', '', alamat_full, flags=re.IGNORECASE).strip()
        alamat_full = re.sub(r'^(?:kantor|perusahaan|usaha|domisili)?[\s:：.\-–—=]+', '', alamat_full, flags=re.IGNORECASE).strip()

    # Ekstraksi nama jalan spesifik (sebelum Desa/Kelurahan, Kelurahan, Kecamatan, RT/RW, Kota, Provinsi)
    street_part = ""
    if alamat_full:
        street_cand = re.split(r',?\s*(?:desa[/\s]*kelurahan|kelurahan|kel\b|desa|ds\b|kecamatan|kec\b|rt[/\s.:]*\d|rw[/\s.:]*\d|(?:rt|rw)\b|kabupaten\/kota|kota\/kabupaten|kabupaten|kota\s*adm\.?|kota|kot\b|kodya\b|kab\b|provinsi|propinsi|prov\b|prop\b|kode\s*pos|\b\d{5}\b)', alamat_full, flags=re.IGNORECASE)[0].strip()
        street_cand = re.sub(r'[,.\s\-]+$', '', street_cand).strip()
        if len(street_cand) >= 3:
            street_part = street_cand

    company_address = street_part if street_part else alamat_full
    alamat = company_address

    # Ekstraksi RT dan RW (utamakan dari alamat_full)
    rt = ""
    rw = ""
    target_addr = alamat_full if alamat_full else full_text
    m_rtrw = re.search(r'\b(?:rt[/\s.:]*(\d{1,3}))[\s/,\-]+(?:rw[/\s.:]*(\d{1,3}))\b', target_addr, re.IGNORECASE)
    if m_rtrw:
        rt = m_rtrw.group(1).zfill(3)
        rw = m_rtrw.group(2).zfill(3)
    else:
        m_slash = re.search(r'\brt[i/|!\s]*rw[\s:.\-–—=]*(\d{1,3})[/\s\-]+(\d{1,3})\b', target_addr, re.IGNORECASE)
        if m_slash:
            rt = m_slash.group(1).zfill(3)
            rw = m_slash.group(2).zfill(3)
        else:
            m_rt = re.search(r'\brt[\s:.\-–—]*(\d{1,3})\b', target_addr, re.IGNORECASE)
            if m_rt:
                rt = m_rt.group(1).zfill(3)
            m_rw = re.search(r'\brw[\s:.\-–—]*(\d{1,3})\b', target_addr, re.IGNORECASE)
            if m_rw:
                rw = m_rw.group(1).zfill(3)

    pos_match = re.search(r'(?:kode\s*pos|pos)[\s:.\-–—]*(\d{5})\b', target_addr, re.IGNORECASE)
    if not pos_match:
        pos_match = re.search(r'\b(\d{5})\b', target_addr)
    if not pos_match and target_addr != full_text:
        pos_match = re.search(r'(?:kode\s*pos|pos)[\s:.\-–—]*(\d{5})\b', full_text, re.IGNORECASE)
    if pos_match:
        kode_pos = pos_match.group(1)

    kec_match = re.search(r'\b(?:kecamatan|kec\.?)[\s:.\-–—]*([A-Za-z\s]+?)(?:,|$|\n|kabupaten|kota|kelurahan|kode\s*pos)', target_addr, re.IGNORECASE)
    if not kec_match and target_addr != full_text:
        kec_match = re.search(r'\b(?:kecamatan|kec\.?)[\s:.\-–—]*([A-Za-z\s]+?)(?:,|$|\n|kabupaten|kota|kelurahan|kode\s*pos)', full_text, re.IGNORECASE)
    if kec_match:
        kecamatan = re.sub(r'[^A-Za-z\s]', '', kec_match.group(1)).strip().upper()

    kel_match = re.search(r'\b(?:desa[/\s]*kelurahan|kelurahan|kel\.?|desa)[\s:.\-–—]*([A-Za-z\s]+?)(?:,|$|\n|kecamatan|kode\s*pos)', target_addr, re.IGNORECASE)
    if not kel_match and target_addr != full_text:
        kel_match = re.search(r'\b(?:desa[/\s]*kelurahan|kelurahan|kel\.?|desa)[\s:.\-–—]*([A-Za-z\s]+?)(?:,|$|\n|kecamatan|kode\s*pos)', full_text, re.IGNORECASE)
    if kel_match:
        kelurahan = re.sub(r'[^A-Za-z\s]', '', kel_match.group(1)).strip().upper()

    prov_match = re.search(r'\b(?:provinsi|propinsi|prov\.?)[\s:.\-–—]*([A-Za-z\s]+?)(?:,|$|\n|kode\s*pos)', target_addr, re.IGNORECASE)
    if not prov_match and target_addr != full_text:
        prov_match = re.search(r'\b(?:provinsi|propinsi|prov\.?)[\s:.\-–—]*([A-Za-z\s]+?)(?:,|$|\n|kode\s*pos)', full_text, re.IGNORECASE)
    if prov_match:
        provinsi = re.sub(r'[^A-Za-z\s]', '', prov_match.group(1)).strip().title()

    kota_match = re.search(r'\b(?:kabupaten\/kota|kabupaten|kota\s*adm\.?|kota|kab\.?)[\s:.\-–—]*([A-Za-z\s]+?)(?:,|$|\n|provinsi|propinsi|kode\s*pos)', target_addr, re.IGNORECASE)
    if not kota_match and target_addr != full_text:
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
                row_h = target_box.get('y_max', 0) - target_box.get('y_min', 0)
                if abs(b_y_center - y_center) < max(12, row_h * 0.6) and b.get('x_min', 0) >= target_box.get('x_max', 0) - 20:
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
        "company_full_address": alamat_full,
        "companyFullAddress": alamat_full,
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
            row = _lookup_wilayah_db(kecamatan, kelurahan, kode_pos)
            if row and not _wilayah_row_fits(row, kota, provinsi):
                row = None  # another city or province than the one on the document
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
        except Exception as we:
            print(f"[OCR] NIB Wilayah reverse-lookup error: {we}")

    return data, boxes

