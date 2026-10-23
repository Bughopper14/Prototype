import os
import re
import base64
from bs4 import BeautifulSoup

def main():
    base_dir = 'D:/CRM App2/CRM App2/uploaded_excel_html/Application Form APPROVED_files'
    
    with open(os.path.join(base_dir, 'sheet001.htm'), 'r', encoding='latin-1') as f:
        html = f.read()
        
    with open(os.path.join(base_dir, 'stylesheet.css'), 'r', encoding='latin-1') as f:
        css = f.read()

    # Base64 encode images
    for i in range(1, 27):
        img_name = f'image{i:03d}.png'
        img_path = os.path.join(base_dir, img_name)
        if os.path.exists(img_path):
            with open(img_path, 'rb') as img_f:
                b64 = base64.b64encode(img_f.read()).decode('utf-8')
                data_uri = f'data:image/png;base64,{b64}'
                html = re.sub(r'src=[\"\']?' + img_name + r'[\"\']?', f'src="{data_uri}"', html)

    # Strip excel redirect script
    html = re.sub(r'<script[\s\S]*?<\/script>', '', html, flags=re.IGNORECASE)

    soup = BeautifulSoup(html, 'html.parser')
    
    style_tag = soup.new_tag('style')
    custom_css = """
    *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
    }
    html {
        margin: 0 !important;
        padding: 0 !important;
        background: #f8fafc !important;
        width: 100% !important;
    }
    body {
        margin: 0 !important;
        padding: 24px 0 !important;
        background: #f8fafc !important;
        text-align: center !important;
        width: 100% !important;
        min-width: 100% !important;
        box-sizing: border-box !important;
        -webkit-font-smoothing: antialiased;
    }
    #fap-main-table, table.fap-main-table {
        margin-left: auto !important;
        margin-right: auto !important;
        background: #ffffff !important;
        box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08) !important;
        text-align: left !important;
        display: table !important;
    }
    .xl74, .xl75, .xl76 {
        background-color: #002060 !important;
        background: #002060 !important;
        border-bottom: 22px solid #002060 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    #fap-cell-province,
    #fap-cell-picProvince,
    #fap-cell-city,
    #fap-cell-picCity,
    #fap-cell-postalCode,
    #fap-cell-picPostalCode {
        border: .5pt solid black !important;
        box-sizing: border-box !important;
    }
    .fap-autofill-val {
        color: #002060 !important;
        font-weight: 700 !important;
    }
    .fap-chk-val {
        font-size: 20pt !important;
        font-weight: 900 !important;
        text-align: center !important;
        vertical-align: middle !important;
        color: #002060 !important;
        line-height: 1 !important;
    }
    .fap-address-box {
        vertical-align: top !important;
        text-align: left !important;
        padding: 6px 8px !important;
        line-height: 1.25 !important;
        font-size: 16pt !important;
    }
    @keyframes fapCellPulse {
        0% { box-shadow: inset 0 0 0 3px #2563eb, 0 0 16px rgba(37, 99, 235, 0.6); background-color: #dbeafe !important; }
        50% { box-shadow: inset 0 0 0 5px #1d4ed8, 0 0 24px rgba(37, 99, 235, 0.85); background-color: #bfdbfe !important; }
        100% { box-shadow: inset 0 0 0 3px #2563eb, 0 0 16px rgba(37, 99, 235, 0.6); background-color: #dbeafe !important; }
    }
    .fap-cell-highlight {
        animation: fapCellPulse 1.8s infinite ease-in-out !important;
        background-color: #dbeafe !important;
        outline: 4px solid #2563eb !important;
        outline-offset: -1px !important;
        z-index: 100 !important;
        position: relative !important;
        color: #1e3a8a !important;
    }
    .fap-section-highlight {
        animation: fapCellPulse 2.2s ease-in-out !important;
        outline: 4px solid #2563eb !important;
        background-color: rgba(219, 234, 254, 0.45) !important;
    }
    @media print {
        @page {
            size: A4 portrait;
            margin: 6mm 10mm;
        }
        *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
            min-width: 100% !important;
            text-align: center !important;
        }
        body {
            zoom: 0.185 !important;
        }
        #fap-main-table, table.fap-main-table {
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
        }
        .fap-page-break {
            page-break-before: always !important;
            break-before: page !important;
        }
        .fap-page-end-line td {
            border-bottom: 2.5pt solid black !important;
        }
        .xl74, .xl75, .xl76 {
            background-color: #002060 !important;
            background: #002060 !important;
            border-bottom: 22px solid #002060 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
    }
    """
    style_tag.string = css + '\n' + custom_css
    if soup.head:
        soup.head.append(style_tag)
    else:
        soup.insert(0, style_tag)

    # Logo stabilization
    for img in soup.find_all('img'):
        if img.get('v:shapes') == 'Image_x0020_27' or 'image002' in str(img.get('src', '')):
            img['class'] = (str(img.get('class', '')) + ' fap-logo-img').strip()
            if img.parent and img.parent.name == 'span':
                img.parent['class'] = (str(img.parent.get('class', '')) + ' fap-logo-span').strip()
                img.parent['style'] = "position:absolute;z-index:10;left:24px;top:14px;width:420px;height:auto;margin:0;"
            if img.parent and img.parent.parent and img.parent.parent.name == 'td':
                td = img.parent.parent
                td['class'] = (str(td.get('class', '')) + ' fap-logo-cell').strip()
                td['style'] = (str(td.get('style', '')) + ';position:relative !important;overflow:visible !important;').strip()

    table = soup.find('table')
    if not table:
        print("Table not found!")
        return

    table['id'] = 'fap-main-table'
    table['class'] = table.get('class', []) + ['fap-main-table']

    rows = table.find_all('tr')
    print(f"Total rows in table: {len(rows)}")

    # Row 4: No. Register
    r4_tds = rows[4].find_all('td')
    if len(r4_tds) > 16:
        r4_tds[16]['id'] = 'fap-cell-fapNumber'
        r4_tds[16]['class'] = r4_tds[16].get('class', []) + ['fap-autofill-val']

    # Row 8: Tanggal/Date, Customer Baru, Corporate, Micro
    rows[8]['id'] = 'fap-preview-sec-header'
    r8_tds = rows[8].find_all('td')
    if len(r8_tds) > 1:
        r8_tds[1]['id'] = 'fap-cell-applicationDate'
        r8_tds[1]['class'] = r8_tds[1].get('class', []) + ['fap-autofill-val']
    if len(r8_tds) > 4:
        r8_tds[4]['id'] = 'fap-cell-custNew'
        r8_tds[4]['class'] = r8_tds[4].get('class', []) + ['fap-chk-val']
    if len(r8_tds) > 9:
        r8_tds[9]['id'] = 'fap-cell-corporate'
        r8_tds[9]['class'] = r8_tds[9].get('class', []) + ['fap-chk-val']
    if len(r8_tds) > 13:
        r8_tds[13]['id'] = 'fap-cell-micro'
        r8_tds[13]['class'] = r8_tds[13].get('class', []) + ['fap-chk-val']

    # Row 9: Cabang/Branch, Customer Lama, Commercial, LiuGong User
    r9_tds = rows[9].find_all('td')
    if len(r9_tds) > 1:
        r9_tds[1]['id'] = 'fap-cell-branchCode'
        r9_tds[1]['class'] = r9_tds[1].get('class', []) + ['fap-autofill-val']
    if len(r9_tds) > 4:
        r9_tds[4]['id'] = 'fap-cell-custExisting'
        r9_tds[4]['class'] = r9_tds[4].get('class', []) + ['fap-chk-val']
    if len(r9_tds) > 9:
        r9_tds[9]['id'] = 'fap-cell-commercial'
        r9_tds[9]['class'] = r9_tds[9].get('class', []) + ['fap-chk-val']
    if len(r9_tds) > 13:
        r9_tds[13]['id'] = 'fap-cell-liugongUser'
        r9_tds[13]['class'] = r9_tds[13].get('class', []) + ['fap-chk-val']

    # Row 13: Nama Perusahaan, Penanggung Jawab/PIC, Telepon/Phone
    rows[13]['id'] = 'fap-preview-sec-company'
    r13_tds = rows[13].find_all('td')
    if len(r13_tds) > 4:
        r13_tds[4]['id'] = 'fap-cell-companyName'
        r13_tds[4]['class'] = r13_tds[4].get('class', []) + ['fap-autofill-val']
    if len(r13_tds) > 7:
        r13_tds[7]['id'] = 'fap-cell-picName'
        r13_tds[7]['class'] = r13_tds[7].get('class', []) + ['fap-autofill-val']
    if len(r13_tds) > 10:
        r13_tds[10]['id'] = 'fap-cell-phone'
        r13_tds[10]['class'] = r13_tds[10].get('class', []) + ['fap-autofill-val']

    # Row 16: Alamat Perusahaan, Jabatan/Position, Email
    r16_tds = rows[16].find_all('td')
    if len(r16_tds) > 3:
        r16_tds[3]['id'] = 'fap-cell-companyAddress'
        r16_tds[3]['class'] = r16_tds[3].get('class', []) + ['fap-autofill-val']
    if len(r16_tds) > 6:
        r16_tds[6]['id'] = 'fap-cell-position'
        r16_tds[6]['class'] = r16_tds[6].get('class', []) + ['fap-autofill-val']
    if len(r16_tds) > 9:
        r16_tds[9]['id'] = 'fap-cell-picEmail'
        r16_tds[9]['class'] = r16_tds[9].get('class', []) + ['fap-autofill-val']

    # Row 18: Kota/City, Alamat Tempat Tinggal/Current Address (PIC)
    r18_tds = rows[18].find_all('td')
    if len(r18_tds) > 4:
        r18_tds[4]['id'] = 'fap-cell-city'
        r18_tds[4]['class'] = r18_tds[4].get('class', []) + ['fap-autofill-val']
    if len(r18_tds) > 7:
        r18_tds[7]['id'] = 'fap-cell-currentAddress'
        r18_tds[7]['class'] = r18_tds[7].get('class', []) + ['fap-autofill-val', 'fap-address-box']

    # Row 20: Provinsi/Province (Company)
    r20_tds = rows[20].find_all('td')
    if len(r20_tds) > 3:
        r20_tds[3]['id'] = 'fap-cell-province'
        r20_tds[3]['class'] = r20_tds[3].get('class', []) + ['fap-autofill-val']
        r20_tds[3]['style'] = 'border:.5pt solid black !important;'

    # Row 22: Postal code (Company), Kota/City (PIC)
    r22_tds = rows[22].find_all('td')
    if len(r22_tds) > 4:
        r22_tds[4]['id'] = 'fap-cell-postalCode'
        r22_tds[4]['class'] = r22_tds[4].get('class', []) + ['fap-autofill-val']
    if len(r22_tds) > 12:
        r22_tds[12]['id'] = 'fap-cell-picCity'
        r22_tds[12]['class'] = r22_tds[12].get('class', []) + ['fap-autofill-val']

    # Row 24: Bisnis Utama (Company), Provinsi/Province (PIC)
    rows[24]['id'] = 'fap-preview-sec-business'
    r24_tds = rows[24].find_all('td')
    if len(r24_tds) > 3:
        r24_tds[3]['id'] = 'fap-cell-mainBusiness'
        r24_tds[3]['class'] = r24_tds[3].get('class', []) + ['fap-autofill-val']
    if len(r24_tds) > 14:
        r24_tds[10]['id'] = 'fap-cell-picProvince'
        r24_tds[10]['class'] = ['xl105', 'fap-autofill-val']
        r24_tds[10]['colspan'] = '5'
        r24_tds[10]['style'] = 'border:.5pt solid black !important;'
        for extra_td in [r24_tds[11], r24_tds[12], r24_tds[13], r24_tds[14]]:
            extra_td.decompose()

    # Row 26: Kode Post/Postal code (PIC)
    r26_tds = rows[26].find_all('td')
    if len(r26_tds) > 7:
        r26_tds[7]['id'] = 'fap-cell-picPostalCode'
        r26_tds[7]['class'] = r26_tds[7].get('class', []) + ['fap-autofill-val']

    # Row 27: No. Akta Pendirian, Tanggal Pendirian
    rows[27]['id'] = 'fap-preview-sec-deeds'
    r27_tds = rows[27].find_all('td')
    if len(r27_tds) > 3:
        r27_tds[3]['id'] = 'fap-cell-establishmentActNo'
        r27_tds[3]['class'] = r27_tds[3].get('class', []) + ['fap-autofill-val']
    if len(r27_tds) > 5:
        r27_tds[5]['id'] = 'fap-cell-establishmentDate'
        r27_tds[5]['class'] = r27_tds[5].get('class', []) + ['fap-autofill-val']

    # Row 29: Pengalaman (years, months)
    r29_tds = rows[29].find_all('td')
    if len(r29_tds) > 3:
        r29_tds[3]['id'] = 'fap-cell-experienceYears'
        r29_tds[3]['class'] = r29_tds[3].get('class', []) + ['fap-autofill-val']
    if len(r29_tds) > 5:
        r29_tds[5]['id'] = 'fap-cell-experienceMonths'
        r29_tds[5]['class'] = r29_tds[5].get('class', []) + ['fap-autofill-val']

    # Row 31: No. Akta Perubahan Terakhir, Tanggal Perubahan Terakhir, Shareholder 1
    rows[31]['id'] = 'fap-preview-sec-projects'
    r31_tds = rows[31].find_all('td')
    if len(r31_tds) > 3:
        r31_tds[3]['id'] = 'fap-cell-latestDeedNo'
        r31_tds[3]['class'] = r31_tds[3].get('class', []) + ['fap-autofill-val']
    if len(r31_tds) > 5:
        r31_tds[5]['id'] = 'fap-cell-latestDeedDate'
        r31_tds[5]['class'] = r31_tds[5].get('class', []) + ['fap-autofill-val']

    # Shareholder rows
    sh_map = [
        (31, 7), (32, 3), (34, 5), (36, 5),
        (38, 5), (39, 9), (41, 9), (44, 5)
    ]
    for idx, (r_idx, start_td) in enumerate(sh_map):
        tds = rows[r_idx].find_all('td')
        if len(tds) > start_td + 4:
            tds[start_td + 1]['id'] = f'fap-cell-sh-{idx}-name'
            tds[start_td + 1]['class'] = tds[start_td + 1].get('class', []) + ['fap-autofill-val']
            tds[start_td + 2]['id'] = f'fap-cell-sh-{idx}-pos'
            tds[start_td + 2]['class'] = tds[start_td + 2].get('class', []) + ['fap-autofill-val']
            tds[start_td + 3]['id'] = f'fap-cell-sh-{idx}-shares'
            tds[start_td + 3]['class'] = tds[start_td + 3].get('class', []) + ['fap-autofill-val']
            tds[start_td + 4]['id'] = f'fap-cell-sh-{idx}-pct'
            tds[start_td + 4]['class'] = tds[start_td + 4].get('class', []) + ['fap-autofill-val']

    # Row 34: NIB
    r34_tds = rows[34].find_all('td')
    if len(r34_tds) > 3:
        r34_tds[3]['id'] = 'fap-cell-nib'
        r34_tds[3]['class'] = r34_tds[3].get('class', []) + ['fap-autofill-val']

    # Row 36: NPWP
    r36_tds = rows[36].find_all('td')
    if len(r36_tds) > 3:
        r36_tds[3]['id'] = 'fap-cell-npwp'
        r36_tds[3]['class'] = r36_tds[3].get('class', []) + ['fap-autofill-val']

    # Row 38: Phone / Fax
    r38_tds = rows[38].find_all('td')
    if len(r38_tds) > 3:
        r38_tds[3]['id'] = 'fap-cell-phoneFax'
        r38_tds[3]['class'] = r38_tds[3].get('class', []) + ['fap-autofill-val']

    # Row 40: Website
    r40_tds = rows[40].find_all('td')
    if len(r40_tds) > 4:
        r40_tds[4]['id'] = 'fap-cell-website'
        r40_tds[4]['class'] = r40_tds[4].get('class', []) + ['fap-autofill-val']

    # Row 42: Email
    r42_tds = rows[42].find_all('td')
    if len(r42_tds) > 4:
        r42_tds[4]['id'] = 'fap-cell-email'
        r42_tds[4]['class'] = r42_tds[4].get('class', []) + ['fap-autofill-val']

    # Row 44: Sumber Pembayaran
    r44_tds = rows[44].find_all('td')
    if len(r44_tds) > 3:
        r44_tds[3]['id'] = 'fap-cell-repaymentSource'
        r44_tds[3]['class'] = r44_tds[3].get('class', []) + ['fap-autofill-val']

    # Row 46: Status tempat usaha
    r46_tds = rows[46].find_all('td')
    if len(r46_tds) > 3:
        r46_tds[3]['id'] = 'fap-cell-locationStatus'
        r46_tds[3]['class'] = r46_tds[3].get('class', []) + ['fap-autofill-val']

    # Row 67-69: Spacing between Orange dividing line and References section
    if len(rows) > 68:
        r68_tds = rows[68].find_all('td')
        if r68_tds:
            r68_tds[0]['colspan'] = '24'
            r68_tds[0]['style'] = 'height: 28px !important; line-height: 28px !important;'

    if len(rows) > 69:
        r69_tds = rows[69].find_all('td')
        if r69_tds:
            r69_tds[0]['style'] = (str(r69_tds[0].get('style', '')) + ';position:relative !important;overflow:visible !important;').strip(';')
            ref_span = r69_tds[0].find('span')
            if ref_span:
                ref_span['style'] = (str(ref_span.get('style', '')) + ';margin-top:16px !important;').strip(';')

    # Row 76: End of Page 1 - Add Closing Boundary Line
    if len(rows) > 76:
        rows[76]['class'] = (str(rows[76].get('class', '')) + ' fap-page-end-line').strip()
        for c in rows[76].find_all('td'):
            c['style'] = (str(c.get('style', '')) + ';border-bottom:2.5pt solid black !important;').strip(';')

    # Row 77: Exact Official Boundary between Page 1 and Page 2
    if len(rows) > 77:
        rows[77]['class'] = (str(rows[77].get('class', '')) + ' fap-page-break').strip()
        rows[77]['id'] = 'fap-preview-page-2'
        rows[77]['style'] = (str(rows[77].get('style', '')) + ';page-break-before:always !important;break-before:page !important;').strip(';')

    # Row 131/133: End of Page 2 - Add Closing Boundary Line
    if len(rows) > 131:
        rows[131]['class'] = (str(rows[131].get('class', '')) + ' fap-page-end-line').strip()
        for c in rows[131].find_all('td'):
            c['style'] = (str(c.get('style', '')) + ';border-bottom:2.5pt solid black !important;').strip(';')

    # Convert back to string
    final_html = str(soup)

    # Escape for JS template string
    escaped_js = final_html.replace('\\', '\\\\').replace('`', '\\`').replace('$', '\\$')
    
    out_ts = f"""// AUTO-GENERATED NATIVE EXCEL HTML TEMPLATE
export const FAP_EXCEL_HTML_TEMPLATE = `{escaped_js}`;
"""
    with open('D:/CRM App2/CRM App2/src/fap-html-template.ts', 'w', encoding='utf-8') as f:
        f.write(out_ts)
        
    print("Successfully generated src/fap-html-template.ts with accurate Row 8-9 IDs!")

if __name__ == '__main__':
    main()
