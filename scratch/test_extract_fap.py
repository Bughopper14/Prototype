import sys
import os
import re
sys.path.insert(0, r"C:\Users\reage\Documents\ChatGPT\OCR")
import pymupdf as fitz
import cv2
import numpy as np
from app.services.ocr_engine import OCREngine
from app.services.preprocessor import DocumentPreprocessor

def extract_fap_v2(boxes: list, pdf_path: str = None) -> dict:
    data = {
        "companyName": "",
        "customerCategory": "",
        "companyType": "",
        "nib": "",
        "npwp": "",
        "establishmentActNo": "",
        "establishmentDate": "",
        "latestDeedNo": "",
        "latestDeedDate": "",
        "companyAddress": "",
        "rt": "",
        "rw": "",
        "city": "",
        "district": "",
        "village": "",
        "province": "",
        "postalCode": "",
        "phoneFax": "",
        "website": "",
        "email": "",
        "mainBusiness": "",
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
        "interestRate": None,
        "tenorMonths": None,
        "facilityPurpose": "",
        "financingMethod": "",
        "customerStatus": "",
        "repaymentSource": "",
        "locationStatus": ""
    }

    # Helper to parse number from currency string
    def parse_num(val):
        if not val:
            return None
        # remove IDR, Rp, etc. and take leading integer part before comma
        s = str(val).replace('IDR', '').replace('Rp', '').replace('rp', '').strip()
        # if format is 40.000.000.000,00 or 40,000,000,000.00
        if ',' in s and '.' in s:
            if s.rfind(',') > s.rfind('.'): # Indonesian style: 40.000.000.000,00
                s = s[:s.rfind(',')]
                s = re.sub(r'[^\d]', '', s)
            else: # US style
                s = s[:s.rfind('.')]
                s = re.sub(r'[^\d]', '', s)
        else:
            s = re.sub(r'[^\d]', '', s)
        return int(s) if s else None

    # Separate boxes by page and columns
    page1_boxes = [b for b in boxes if b.get('page', 1) == 1]
    page2_boxes = [b for b in boxes if b.get('page', 1) == 2]

    # Process Page 1: Column Split (Left vs Right)
    img_w = page1_boxes[0].get('page_width', 2550) if page1_boxes else 2550
    mid_x = img_w * 0.48

    left_boxes = []
    right_boxes = []

    for b in page1_boxes:
        raw_b = b["box"]
        bx = min(pt[0] for pt in raw_b) if isinstance(raw_b[0], (list, tuple)) else raw_b[0]
        by = min(pt[1] for pt in raw_b) if isinstance(raw_b[0], (list, tuple)) else raw_b[1]
        t = (b.get("text") or "").strip()
        if not t:
            continue
        # Only split section 2 (rows below header y > 350 and above projects/fixed assets y < 2000)
        if 350 <= by <= 2000:
            if bx < mid_x:
                left_boxes.append((by, bx, t))
            else:
                right_boxes.append((by, bx, t))
        else:
            # Header or bottom
            left_boxes.append((by, bx, t))

    left_boxes.sort(key=lambda x: (x[0], x[1]))
    right_boxes.sort(key=lambda x: (x[0], x[1]))

    left_texts = [x[2] for x in left_boxes]
    right_texts = [x[2] for x in right_boxes]
    all_texts = [b.get("text", "").strip() for b in boxes]
    combined_full = "\n".join(all_texts)

    # 1. Company Column extractions (from left_texts / left_boxes)
    for i, t in enumerate(left_texts):
        # Company Name
        if re.search(r'company\s+name|nama\s+perusahaan', t, re.I):
            # next items that are not labels
            for nxt in left_texts[i+1:i+4]:
                if not re.search(r'company\s+address|person|pic|phone|branch|date|corporate', nxt, re.I):
                    data["companyName"] = nxt
                    break

        # Company Address
        if re.search(r'company\s+address|alamat\s+perusahaan', t, re.I):
            for nxt in left_texts[i+1:i+4]:
                if not re.search(r'city|kota|district|village|rt|rw|province', nxt, re.I):
                    data["companyAddress"] = nxt
                    break

        # City (Company)
        if re.match(r'^city$|^kota$', t, re.I):
            for nxt in left_texts[i+1:i+4]:
                if not re.search(r'district|village|rt|rw|province|postal', nxt, re.I):
                    data["city"] = nxt
                    break

        # Province (Company)
        if re.match(r'^province$|^provinsi$', t, re.I):
            for nxt in left_texts[i+1:i+4]:
                if not re.search(r'postal|main\s+business|establishment|deed', nxt, re.I):
                    data["province"] = nxt
                    break

        # Postal code (Company)
        if re.search(r'postal\s+code|kode\s+pos', t, re.I):
            for nxt in left_texts[i+1:i+4]:
                clean_num = re.sub(r'\D', '', nxt)
                if len(clean_num) == 5:
                    data["postalCode"] = clean_num
                    break

        # Main Business
        if re.search(r'main\s+business|bidang\s+usaha', t, re.I):
            for nxt in left_texts[i+1:i+4]:
                if not re.search(r'establishment|experience|deed|name|position|share', nxt, re.I):
                    data["mainBusiness"] = nxt
                    break

        # Establishment Deed No
        if re.search(r'establishment\s+deed\s+no|akta\s+pendirian', t, re.I):
            for nxt in left_texts[i+1:i+5]:
                if re.search(r'est\.\s*date|tanggal', nxt, re.I):
                    continue
                clean_d = re.sub(r'[^\w\/-]', '', nxt)
                if len(clean_d) >= 4 and not re.search(r'^\d{2}\/\d{2}\/\d{4}$', clean_d):
                    data["establishmentActNo"] = clean_d
                    break

        # Est. Date
        if re.search(r'est\.\s*date|tgl\.\s*pendirian', t, re.I):
            for nxt in left_texts[i+1:i+4]:
                m_dt = re.search(r'\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}', nxt)
                if m_dt:
                    data["establishmentDate"] = m_dt.group(0)
                    break

        # Latest Deed No
        if re.search(r'latest\s+(?:amendment\s+)?deed\s+no|akta\s+perubahan\s+terakhir', t, re.I):
            for nxt in left_texts[i+1:i+5]:
                if re.search(r'date|nib|npwp', nxt, re.I):
                    continue
                clean_d = re.sub(r'[^\w\/-]', '', nxt)
                if len(clean_d) >= 4 and not re.search(r'^\d{2}\/\d{2}\/\d{4}$', clean_d):
                    data["latestDeedNo"] = clean_d
                    break

        # Latest Deed Date
        if re.search(r'date\s*:\s*$', t, re.I) and i > 0 and 'deed' in left_texts[i-1].lower():
            for nxt in left_texts[i+1:i+4]:
                m_dt = re.search(r'\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}', nxt)
                if m_dt:
                    data["latestDeedDate"] = m_dt.group(0)
                    break

        # NIB
        if re.search(r'\bnib\b', t, re.I):
            for nxt in left_texts[i+1:i+4]:
                digits = re.sub(r'\D', '', nxt)
                if len(digits) >= 12:
                    data["nib"] = digits[:13]
                    break

        # NPWP
        if re.search(r'npwp|no\.?\s*tax', t, re.I):
            for nxt in left_texts[i+1:i+4]:
                digits = re.sub(r'\D', '', nxt)
                if len(digits) >= 15:
                    data["npwp"] = digits[:16]
                    break

        # Phone / Fax
        if re.search(r'phone\s*\/\s*fax|telepon\s*\/\s*fax', t, re.I):
            for nxt in left_texts[i+1:i+4]:
                clean_phone = re.sub(r'[^\d+]', '', nxt)
                if len(clean_phone) >= 7:
                    data["phoneFax"] = clean_phone
                    break

        # Website
        if re.search(r'^website$', t, re.I):
            for nxt in left_texts[i+1:i+4]:
                if '.' in nxt and '@' not in nxt:
                    data["website"] = nxt
                    break

        # Company Email
        if re.search(r'^email$', t, re.I):
            for nxt in left_texts[i+1:i+4]:
                if '@' in nxt:
                    data["email"] = nxt
                    break

    # 2. PIC Column extractions (from right_texts)
    for i, t in enumerate(right_texts):
        # PIC Name
        if re.search(r'person\s+in\s+charge|pic', t, re.I):
            for nxt in right_texts[i+1:i+4]:
                if not re.search(r'phone|email|position|address|city', nxt, re.I):
                    data["picName"] = nxt
                    break

        # PIC Phone
        if re.search(r'phone\s*:', t, re.I):
            for nxt in right_texts[i+1:i+4]:
                clean_phone = re.sub(r'[^\d+]', '', nxt)
                if len(clean_phone) >= 9:
                    data["picPhone"] = clean_phone
                    break

        # PIC Position
        if re.search(r'^position$|^jabatan$', t, re.I):
            parts = []
            for nxt in right_texts[i+1:i+5]:
                if re.search(r'email|current\s+address|city|phone', nxt, re.I):
                    break
                parts.append(nxt)
            if parts:
                data["picPosition"] = " ".join(parts)

        # PIC Email
        if re.search(r'email\s*:', t, re.I):
            for nxt in right_texts[i+1:i+4]:
                if '@' in nxt:
                    data["picEmail"] = nxt
                    break

        # PIC Current Address
        if re.search(r'current\s+address|alamat\s+sekarang', t, re.I):
            for nxt in right_texts[i+1:i+4]:
                if not re.search(r'city|province|postal|position', nxt, re.I):
                    data["picAddress"] = nxt
                    break

        # PIC City
        if re.match(r'^city$|^kota$', t, re.I):
            for nxt in right_texts[i+1:i+4]:
                if not re.search(r'province|postal|position', nxt, re.I):
                    data["picCity"] = nxt
                    break

        # PIC Province
        if re.match(r'^province$|^provinsi$', t, re.I):
            for nxt in right_texts[i+1:i+4]:
                if not re.search(r'postal|shareholder|position', nxt, re.I):
                    data["picProvince"] = nxt
                    break

        # PIC Postal Code
        if re.search(r'postal\s+code|kode\s+pos', t, re.I):
            for nxt in right_texts[i+1:i+4]:
                clean_num = re.sub(r'\D', '', nxt)
                if len(clean_num) == 5:
                    data["picPostalCode"] = clean_num
                    break

    # 3. Financing Facility Details (from Page 2 or whole document)
    p2_texts = [b.get("text", "").strip() for b in page2_boxes]

    # Financing Method
    for t in (p2_texts or all_texts):
        if re.search(r'financial\s+lease\s*\([v√xX]\)', t, re.I):
            data["financingMethod"] = "FINANCIAL_LEASE"
            break
        elif re.search(r'sale\s+and\s+lease\s+back\s*\([v√xX]\)', t, re.I):
            data["financingMethod"] = "SALE_AND_LEASE_BACK"
            break
        elif re.search(r'installment\s+purchase\s*\([v√xX]\)', t, re.I):
            data["financingMethod"] = "INSTALLMENT_PURCHASE"
            break

    # Financing Value
    for i, t in enumerate(p2_texts):
        if re.search(r'financing\s+value|nilai\s+pembiayaan', t, re.I):
            for nxt in p2_texts[i+1:i+4]:
                val = parse_num(nxt)
                if val and val > 1000000:
                    data["financingValue"] = val
                    break

        if re.search(r'down\s+payment|uang\s+muka', t, re.I):
            for nxt in p2_texts[i+1:i+4]:
                val = parse_num(nxt)
                if val and val > 1000000:
                    data["downPaymentValue"] = val
                    break

        if re.search(r'rate\s*:', t, re.I):
            for nxt in p2_texts[i+1:i+3]:
                m_rt = re.search(r'([\d.,]+)\s*%', nxt)
                if m_rt:
                    data["interestRate"] = float(m_rt.group(1).replace(',', '.'))
                    break

        if re.search(r'tenor|duration', t, re.I):
            for nxt in p2_texts[i+1:i+4]:
                m_tn = re.search(r'(\d+)(?:\.\d+)?\s*(?:months|bulan)', nxt, re.I)
                if m_tn:
                    data["tenorMonths"] = int(m_tn.group(1))
                    break

    # Financing Purpose Check
    if re.search(r'investment\s*\([v√xX]\)', combined_full, re.I):
        data["facilityPurpose"] = "INVESTMENT"
    elif re.search(r'working\s+capital\s*\([v√xX]\)', combined_full, re.I):
        data["facilityPurpose"] = "WORKING_CAPITAL"

    return data

# Test on testdocfap.pdf
doc = fitz.open("documents/testdocfap.pdf")
all_boxes = []
for p_idx in range(len(doc)):
    page = doc[p_idx]
    pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72), alpha=False)
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
    bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    boxes = OCREngine.process_image(bgr)
    for b in boxes:
        b["page"] = p_idx + 1
        b["page_width"] = pix.w
        b["page_height"] = pix.h
        all_boxes.append(b)

res = extract_fap_v2(all_boxes)
import json
print(json.dumps(res, indent=2))
