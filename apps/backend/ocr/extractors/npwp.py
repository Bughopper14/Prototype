"""NPWP (Indonesian Tax ID) OCR field extractor."""
import re
from typing import Any, Dict, List, Optional, Tuple
from app.schemas import NPWPSchema
from extractors.shared import extract_custom_targets

def extract_npwp(
    boxes: List[Dict[str, Any]],
    custom_targets: Optional[List[str]] = None
) -> Tuple[NPWPSchema, List[Dict[str, Any]]]:
    """
    Specialized Indonesian NPWP (Nomor Pokok Wajib Pajak) Extractor.
    Extracts NPWP Number, Wajib Pajak Name, Address, KPP code, and Registration Date.
    """
    npwp = NPWPSchema()
    full_text = "\n".join([b.get("text", "") for b in boxes])

    # Sort boxes geometrically: top-to-bottom, then left-to-right
    boxes.sort(key=lambda b: (b.get("y_min", 0.0), b.get("x_min", 0.0)))

    npwp_idx = -1
    tgl_idx = -1

    # 1. NPWP Number (15 or 16 digit formatted or raw)
    npwp_pat = r'(\d{2}[.\s]?\d{3}[.\s]?\d{3}[.\s]?[0-9A-Z]{1}[-\s]?\d{3}[.\s]?\d{3})'
    for i, b in enumerate(boxes):
        txt = b.get("text", "")
        m = re.search(npwp_pat, txt)
        if m:
            raw_val = m.group(1).replace(" ", "")
            npwp.npwp_number = raw_val
            clean_num = re.sub(r'\D', '', raw_val)
            npwp.raw_npwp = clean_num
            if len(clean_num) >= 12:
                npwp.kpp = clean_num[9:12]
            npwp_idx = i
            b["field_mapping"] = "npwp_number"
            break

    # Fallback 15 or 16-digit raw number
    if not npwp.npwp_number:
        for i, b in enumerate(boxes):
            m_num = re.search(r'\b(\d{15,16})\b', b.get("text", ""))
            if m_num:
                clean_num = m_num.group(1)
                npwp.raw_npwp = clean_num
                if len(clean_num) == 15:
                    npwp.npwp_number = f"{clean_num[:2]}.{clean_num[2:5]}.{clean_num[5:8]}.{clean_num[8]}-{clean_num[9:12]}.{clean_num[12:]}"
                    npwp.kpp = clean_num[9:12]
                else:
                    npwp.npwp_number = clean_num
                npwp_idx = i
                b["field_mapping"] = "npwp_number"
                break

    # 2. Tanggal Terdaftar
    tgl_pat = r'(?:TGL\s*TERDAFTAR|TERDAFTAR)[:\uff1a\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})'
    for i, b in enumerate(boxes):
        txt = b.get("text", "")
        m = re.search(tgl_pat, txt, re.IGNORECASE)
        if m:
            npwp.tanggal_terdaftar = m.group(1)
            tgl_idx = i
            b["field_mapping"] = "tanggal_terdaftar"
            break
        elif "TERDAFTAR" in txt.upper() and i + 1 < len(boxes):
            m2 = re.search(r'(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})', boxes[i + 1].get("text", ""))
            if m2:
                npwp.tanggal_terdaftar = m2.group(1)
                tgl_idx = i
                boxes[i + 1]["field_mapping"] = "tanggal_terdaftar"
                break

    # 3. Name and Address between npwp_idx and tgl_idx
    address_lines = []
    name_found = False

    if npwp_idx != -1:
        end_bound = tgl_idx if tgl_idx != -1 else len(boxes)
        intermediate = boxes[npwp_idx + 1:end_bound]
        for b in intermediate:
            txt = b.get("text", "").strip()
            if not txt or any(junk in txt.lower() for junk in ["wisit", "sadar", "1,280", "1280", "pajak.go.id"]):
                continue
            if not name_found:
                npwp.nama = cls.segment_name(txt)
                b["field_mapping"] = "nama"
                name_found = True
            else:
                norm_line = cls.normalize_alamat(txt)
                norm_line = re.sub(r'([A-Za-z]+)-([A-Za-z]+)', r'\1 - \2', norm_line)
                address_lines.append(norm_line)
                b["field_mapping"] = "alamat"

    if address_lines:
        npwp.alamat = ", ".join(address_lines)
        if len(address_lines) >= 2:
            npwp.kelurahan_kecamatan = address_lines[1]
        if len(address_lines) >= 3:
            npwp.kota_provinsi = address_lines[2]

    # 4. Dynamic Custom Field Resolution
    if custom_targets:
        field_synonyms = {
            "npwp": npwp.npwp_number,
            "nomor npwp": npwp.npwp_number,
            "no npwp": npwp.npwp_number,
            "nama": npwp.nama,
            "nama wajib pajak": npwp.nama,
            "wajib pajak": npwp.nama,
            "alamat": npwp.alamat,
            "alamat wajib pajak": npwp.alamat,
            "kelurahan": npwp.kelurahan_kecamatan,
            "kecamatan": npwp.kelurahan_kecamatan,
            "kelurahan/kecamatan": npwp.kelurahan_kecamatan,
            "kota": npwp.kota_provinsi,
            "provinsi": npwp.kota_provinsi,
            "kota/provinsi": npwp.kota_provinsi,
            "kpp": npwp.kpp,
            "kantor pelayanan pajak": npwp.kpp,
            "kode kpp": npwp.kpp,
            "tanggal terdaftar": npwp.tanggal_terdaftar,
            "tgl terdaftar": npwp.tanggal_terdaftar,
            "terdaftar": npwp.tanggal_terdaftar,
            "nik": npwp.nik
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

        npwp.custom_fields = custom_res

    return npwp, boxes

