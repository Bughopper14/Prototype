import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import os

def set_cell_background(cell, hex_color):
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="D3D3D3", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders_xml = f'''
    <w:tblBorders {nsdecls("w")}>
      <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
      <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
      <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
      <w:insideV w:val="none"/>
      <w:left w:val="none"/>
      <w:right w:val="none"/>
    </w:tblBorders>
    '''
    tblPr.append(parse_xml(borders_xml))

def add_callout(doc, text, title=None, border_color="002060", fill_color="F0F4F8"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, fill_color)
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders_xml = f'''
    <w:tcBorders {nsdecls("w")}>
      <w:left w:val="single" w:sz="36" w:color="{border_color}"/>
      <w:top w:val="none"/>
      <w:right w:val="none"/>
      <w:bottom w:val="none"/>
    </w:tcBorders>
    '''
    tcPr.append(parse_xml(borders_xml))
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    if title:
        run_title = p.add_run(title + "\n")
        run_title.bold = True
        run_title.font.name = "Calibri"
        run_title.font.size = Pt(11)
        run_title.font.color.rgb = RGBColor(0, 32, 96)
    
    run_text = p.add_run(text)
    run_text.font.name = "Calibri"
    run_text.font.size = Pt(10)
    run_text.font.color.rgb = RGBColor(40, 50, 65)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_image_figure(doc, img_path, caption, width=Inches(6.2)):
    if os.path.exists(img_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(8)
        p_img.paragraph_format.space_after = Pt(3)
        run_img = p_img.add_run()
        run_img.add_picture(img_path, width=width)
        
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_after = Pt(10)
        run_cap = p_cap.add_run(f"Gambar: {caption}")
        run_cap.italic = True
        run_cap.font.name = "Calibri"
        run_cap.font.size = Pt(9)
        run_cap.font.color.rgb = RGBColor(100, 110, 125)

def build_master_brd_presdir():
    doc = docx.Document()
    
    # Page setup (A4)
    section = doc.sections[0]
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.8)
    section.right_margin = Inches(0.8)
    
    header = section.header
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hrun = hp.add_run("PT LIUGONG FINANCE INDONESIA  |  LOAN ORIGINATION SYSTEM & CRM (LOS-CRM)")
    hrun.font.name = "Calibri"
    hrun.font.size = Pt(8.5)
    hrun.font.color.rgb = RGBColor(120, 130, 140)
    
    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    frun = fp.add_run("Dokumen Spesifikasi Bisnis & Panduan Eksekutif Direksi  •  Confidential / Hak Milik Perusahaan")
    frun.font.name = "Calibri"
    frun.font.size = Pt(8.5)
    frun.font.color.rgb = RGBColor(120, 130, 140)

    # -------------------------------------------------------------
    # COVER PAGE
    # -------------------------------------------------------------
    logo_path = r"D:\CRM App2\CRM App2\public\excel_assets\image2.jpg"
    if os.path.exists(logo_path):
        logo_p = doc.add_paragraph()
        logo_p.paragraph_format.space_before = Pt(12)
        logo_p.paragraph_format.space_after = Pt(16)
        logo_run = logo_p.add_run()
        logo_run.add_picture(logo_path, width=Inches(2.5))
    
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(8)
    p_title.paragraph_format.space_after = Pt(4)
    run_t = p_title.add_run("STRATEGIC PROPOSAL & BUSINESS REQUIREMENTS DOCUMENT")
    run_t.font.name = "Calibri"
    run_t.font.size = Pt(22)
    run_t.bold = True
    run_t.font.color.rgb = RGBColor(0, 32, 96) # LiuGong Navy

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(14)
    run_sub = p_sub.add_run("SISTEM ORIGINASI PEMBIAYAAN ALAT BERAT & CRM (LOS-CRM)\nTRANSFORMASI FINTECH-GRADE UNTUK PERCEPATAN PENJUALAN UNIT LIUGONG DI INDONESIA")
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(11)
    run_sub.bold = True
    run_sub.font.color.rgb = RGBColor(237, 125, 49) # LiuGong Orange

    add_callout(doc, 
        "\"Sistem ini bukan sekadar aplikasi administrasi, melainkan Mesin Pertumbuhan Penjualan (Growth Engine) dan Perisai Risiko Kredit (Risk Shield) PT LiuGong Finance Indonesia. Menyatukan ekosistem Tripartit: Dealer Resmi LiuGong – Customer – LiuGong Finance melalui alur 4 tahap otomatis: FAP STAGE ⟶ PEFINDO OCR GATEWAY ⟶ PRE-ANALYSIS ⟶ ICLF ⟶ PROPOSAL. Memangkas siklus kredit dari 14 hari menjadi 48 jam, mengunci akurasi data 100%, serta memitigasi Non-Performing Loan (NPL) sejak detik pertama.\"",
        title="EXECUTIVE VALUE PROPOSITION UNTUK BAPAK PRESIDEN DIREKTUR")

    meta_table = doc.add_table(rows=6, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False
    set_table_borders(meta_table, color="D3D3D3")
    col_w = [Inches(2.2), Inches(4.3)]
    
    meta_rows = [
        ("Entitas & Model Bisnis", "PT LiuGong Finance Indonesia (Captive Finance Alat Berat)"),
        ("Disusun & Dipresentasikan", "Latom (Lead System Owner & Technical In-Charge)"),
        ("Ditujukan Khusus Kepada", "Bapak Presiden Direktur & Jajaran Komite Kredit"),
        ("Tujuan Strategis Utama", "Akselerasi Penjualan Unit LiuGong, Mitigasi NPL & Kepatuhan OJK"),
        ("Status Kesiapan Sistem", "Production Ready (27/27 Test Suites PASS, Siap Go-Live)"),
        ("Tanggal Dokumen & Versi", "19 Oktober 2026  |  Versi 4.0.0 (Executive Masterpiece)")
    ]
    for i, (k, v) in enumerate(meta_rows):
        row = meta_table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width, c1.width = col_w[0], col_w[1]
        set_cell_margins(c0, 50, 50, 80, 80)
        set_cell_margins(c1, 50, 50, 80, 80)
        
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.name = "Calibri"
        r0.font.size = Pt(9.5)
        r0.bold = True
        r0.font.color.rgb = RGBColor(0, 32, 96)
        
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.name = "Calibri"
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = RGBColor(40, 50, 60)
        if i % 2 == 1:
            set_cell_background(c0, "F8FAFC")
            set_cell_background(c1, "F8FAFC")

    doc.add_page_break()

    # -------------------------------------------------------------
    # BAB 1: LATAR BELAKANG BISNIS & EKOSISTEM TRIPARTIT DEALER
    # -------------------------------------------------------------
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(8)
    h1.paragraph_format.space_after = Pt(4)
    r = h1.add_run("BAB 1: STRATEGI BISNIS & INTEGRASI EKOSISTEM DEALER LIUGONG")
    r.font.name = "Calibri"
    r.font.size = Pt(15)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "Sebagai perusahaan pembiayaan captive (Captive Finance) untuk Guangxi LiuGong Machinery Co., Ltd. di Indonesia, "
        "keberhasilan LiuGong Finance tidak dapat dipisahkan dari kecepatan penjualan dan kepuasan jaringan dealer resmi "
        "(seperti PT Megatama Traktor Utama, PT Traktor Perkasa Nusantara, dan dealer regional lainnya). "
        "Di sektor tambang batubara Kalimantan, tambang nikel Sulawesi, hingga proyek konstruksi jalan tol, "
        "pelanggan kontraktor sering kali membatalkan pesanan alat berat LiuGong dan beralih ke kompetitor (Komatsu/CAT) "
        "semata-mata karena proses persetujuan leasing kompetitor lebih cepat 2 hari."
    )

    p2 = doc.add_paragraph()
    p2.paragraph_format.line_spacing = 1.15
    p2.paragraph_format.space_after = Pt(6)
    p2.add_run(
        "Sistem LOS-CRM ini dibangun secara khusus untuk mengunci integrasi Tripartit:\n"
        "1. Dealer Resmi LiuGong: Menerbitkan Surat Penawaran (Quotation), spesifikasi unit (Excavator, Wheel Loader, Motor Grader, Dump Truck), Surat Pemesanan Kendaraan (SPK), dan Berita Acara Serah Terima (BAST).\n"
        "2. Skema Subsidi Dealer & Buyback Guarantee: Mendukung skema Joint Marketing di mana dealer memberikan subsidi bunga (Interest Subsidy) atau jaminan pembelian kembali (Buyback Guarantee / Recourse) untuk memitigasi risiko gagal bayar.\n"
        "3. Customer (Calon Debitur): Memperoleh kepastian pembiayaan secara transparan, fleksibilitas uang muka (DP 20%–30%), dan tenor hingga 48 bulan.\n"
        "4. LiuGong Finance: Mengamankan portofolio pembiayaan yang sehat, profitabilitas marjin bunga bersih, dan agunan fidusia yang sah secara hukum."
    )

    add_image_figure(doc, r"D:\CRM App2\screenshots_presdir\01_dashboard_overview.png", 
                     "Dashboard Eksekutif Portfolio & Pipeline Distribusi Pembiayaan (Live System)")

    # -------------------------------------------------------------
    # BAB 2: ALUR PIPA STRATEGIS 4-TAHAP
    # -------------------------------------------------------------
    h2 = doc.add_paragraph()
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after = Pt(4)
    r = h2.add_run("BAB 2: PIPA STRATEGIS 4-TAHAP (END-TO-END PIPELINE)")
    r.font.name = "Calibri"
    r.font.size = Pt(15)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(8)
    p.add_run(
        "Aplikasi menerapkan alur 4 tahap berjenjang yang menyatukan otomatisasi cerdas AI dan kehati-hatian perbankan (Prudential Banking), menghubungkan FAP Stage, Intelligent Pefindo Gateway, Pre-Analysis, ICLF, hingga Proposal final Komite Kredit:"
    )

    add_image_figure(doc, r"D:\CRM App2\CRM App2\public\diagram_pipa_strategis_4_tahap.png",
                     "Diagram Arsitektur Pipa Strategis 4-Tahap, Jembatan Pefindo Biro Kredit, dan Fondasi Ekosistem LiuGong Finance")

    flow_table = doc.add_table(rows=6, cols=3)
    flow_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    flow_table.autofit = False
    set_table_borders(flow_table, color="D3D3D3")
    col_w_flow = [Inches(1.8), Inches(2.3), Inches(2.5)]
    headers = ["Tahapan Sistem", "Fitur Unggulan & Teknologi", "Dampak Strategis bagi Direksi"]
    for j, htext in enumerate(headers):
        cell = flow_table.rows[0].cells[j]
        cell.width = col_w_flow[j]
        set_cell_background(cell, "002060")
        set_cell_margins(cell, 60, 60, 80, 80)
        p_hdr = cell.paragraphs[0]
        r_hdr = p_hdr.add_run(htext)
        r_hdr.font.name = "Calibri"
        r_hdr.font.size = Pt(9.5)
        r_hdr.bold = True
        r_hdr.font.color.rgb = RGBColor(255, 255, 255)

    flow_rows = [
        ("1. FAP STAGE\n(Intake & Profiling)", 
         "• Multi-Document AI/OCR (NIB, e-KTP, Paspor, NPWP, E-KITAS)\n• Form 5-Modul Accordion & Digital Twin Excel 118-Baris",
         "Onboarding nasabah seketika. Memangkas 80% waktu input data dan meniadakan salah ketik nomor identitas resmi."),
        ("INTERKONEKSI CERDAS\n(Pefindo Biro Kredit)", 
         "• Ingestion Data Otomatis ke Pefindo / SLIK OJK\n• Penarikan Credit Score (250–900) & Kol 1–5 24 Bulan\n• Total Eksposur Utang Perbankan Nasional",
         "Mengetahui integritas keuangan debitur secara seketika sebelum melangkah ke proses survei dan komite."),
        ("2. PRE-ANALYSIS\n(Risk Gatekeeping)", 
         "• Early Risk Triaging (Go / Review / No-Go)\n• Evaluasi KBLI Sektor Industri & Kapasitas Alat\n• Deteksi Dini Restrukturisasi & Gugatan",
         "Filter dini NPL. Menghemat waktu dan biaya operasional analis agar tidak memproses debitur yang berisiko macet."),
        ("3. ICLF\n(Limit Setting)", 
         "• Penetapan Batas Plafon Debitur Tunggal & Grup Usaha\n• Evaluasi BMPP Regulasi OJK\n• Struktur Rekomendasi Uang Muka (DP 20%–30%)",
         "Pencegahan konsentrasi risiko kredit berlebih pada grup usaha tertentu dan memastikan kecukupan modal kerja."),
        ("4. PROPOSAL\n(Dossier & Putusan)", 
         "• Inventaris Unit Alat Berat LiuGong\n• Anuitas Bunga Efektif Menurun Resmi\n• Neraca 3 Tahun Wajib Seimbang 100%\n• Putusan Komite Kredit Digital",
         "Dossier lengkap siap sidang. Putusan kredit terkunci aman dengan jejak audit tak terubahkan (Audit Trail).")
    ]

    for i, (col1, col2, col3) in enumerate(flow_rows):
        row = flow_table.rows[i+1]
        for c_idx, text in enumerate([col1, col2, col3]):
            c = row.cells[c_idx]
            c.width = col_w_flow[c_idx]
            set_cell_margins(c, 50, 50, 80, 80)
            p_cell = c.paragraphs[0]
            p_cell.paragraph_format.line_spacing = 1.15
            p_cell.paragraph_format.space_after = Pt(2)
            r_c = p_cell.add_run(text)
            r_c.font.name = "Calibri"
            r_c.font.size = Pt(8.5)
            if c_idx == 0:
                r_c.bold = True
                r_c.font.color.rgb = RGBColor(0, 32, 96)
            else:
                r_c.font.color.rgb = RGBColor(40, 50, 60)
            if i % 2 == 1:
                set_cell_background(c, "F8FAFC")

    add_image_figure(doc, r"D:\CRM App2\screenshots_presdir\02_pipeline_applications.png", 
                     "Daftar Pipeline Permohonan Pembiayaan Berdasarkan Kantor Cabang & Status Workflow (Live System)")

    doc.add_page_break()

    # -------------------------------------------------------------
    # BAB 3: MULTI-DOCUMENT AI/OCR & JEMBATAN PEFINDO BIRO KREDIT
    # -------------------------------------------------------------
    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(8)
    h3.paragraph_format.space_after = Pt(4)
    r = h3.add_run("BAB 3: SUITE MULTI-DOKUMEN AI/OCR & INTEGRASI PEFINDO BIRO KREDIT")
    r.font.name = "Calibri"
    r.font.size = Pt(15)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "Kelemahan terbesar sistem LOS tradisional di Indonesia adalah ketergantungan pada penginputan manual "
        "oleh staf administrasi cabang yang memicu tingkat kesalahan ketik (human error) hingga 20% pada NIK, NIB, dan NPWP. "
        "Aplikasi LOS-CRM LiuGong mengatasi hal ini secara tuntas melalui dua pilar teknologi mutakhir:"
    )

    sub31 = doc.add_paragraph()
    sub31.paragraph_format.space_before = Pt(6)
    sub31.paragraph_format.space_after = Pt(2)
    r = sub31.add_run("3.1. Multi-Document AI/OCR Suite pada FAP Stage")
    r.font.name = "Calibri"
    r.font.size = Pt(12)
    r.bold = True
    r.font.color.rgb = RGBColor(237, 125, 49)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(4)
    p.add_run(
        "Aplikasi memproses pemindaian dokumen secara instan di peramban (Client-Side Tesseract OCR WASM) dengan dukungan 5 jenis dokumen resmi:\n"
        "• NIB (Nomor Induk Berusaha): Memindai dokumen OSS RBA Kementerian Investasi/BKPM untuk mengekstrak 13-digit NIB, Nama Perusahaan, Alamat Lengkap, Kode Pos, dan Tanggal Terbit.\n"
        "• e-KTP (WNI): Memindai identitas Direksi, Komisaris, dan Pemegang Saham WNI untuk mengekstrak 16-digit NIK, Nama Lengkap, dan Tanggal Lahir.\n"
        "• PASSPORT & E-KITAS (Expatriate / Asing): Ekstraksi paspor dan izin tinggal WNA untuk mengakomodasi struktur PMA (Penanaman Modal Asing) dan Direksi berkewarganegaraan asing dari Tiongkok atau negara mitra.\n"
        "• NPWP Badan & Pribadi: Ekstraksi dan validasi format NPWP 15-digit lama maupun format 16-digit terbaru."
    )

    add_image_figure(doc, r"D:\CRM App2\screenshots_presdir\04_nib_ocr_modal.png", 
                     "Fitur Modal Scan OCR NIB OSS RBA dengan Ekstraksi 5 Field Otomatis (Live System)")

    sub32 = doc.add_paragraph()
    sub32.paragraph_format.space_before = Pt(8)
    sub32.paragraph_format.space_after = Pt(2)
    r = sub32.add_run("3.2. Jembatan Cerdas Antara FAP Stage dan Pre-Analysis: Pefindo Biro Kredit")
    r.font.name = "Calibri"
    r.font.size = Pt(12)
    r.bold = True
    r.font.color.rgb = RGBColor(237, 125, 49)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(4)
    p.add_run(
        "Begitu identitas legal debitur dan para pengurus kunci tervalidasi pada FAP Stage, sistem secara otomatis "
        "dapat menembakkan data tersebut ke Pefindo Biro Kredit (IdScore / SLIK OJK API Bridge) maupun membaca laporan PDF Pefindo via OCR parser. "
        "Langkah ini menghadirkan profil intelijen finansial yang komprehensif dalam hitungan detik:"
    )

    add_callout(doc,
        "INTELIJEN RISIKO PEFINDO BIRO KREDIT:\n"
        "1. Pefindo Credit Score (Skala 250–900): Skor obyektif yang memetakan probabilitas gagal bayar (Probability of Default/PD).\n"
        "2. Riwayat Kolektibilitas 24 Bulan (SLIK OJK): Mengetahui histori pembayaran cicilan debitur di bank atau leasing lain—apakah selalu Lancar (Kol 1) atau pernah Nunggak/Macet (Kol 2–5).\n"
        "3. Total Eksposur Utang Perbankan Nasional: Mengetahui total baki debet dan beban angsuran bulanan yang sedang berjalan di lembaga keuangan lain.\n"
        "4. Deteksi Dini Restrukturisasi & Gugatan Hukum: Menghindarkan LiuGong Finance dari debitur yang sedang dalam sengketa perdata, PKPU, atau kepailitan.",
        title="NILAI STRATEGIS INTEGRASI PEFINDO BAGI MANAJEMEN RISIKO")

    doc.add_page_break()

    # -------------------------------------------------------------
    # BAB 4: WORKSPACE 50-50 & DIGITAL TWIN EXCEL FAP
    # -------------------------------------------------------------
    h4 = doc.add_paragraph()
    h4.paragraph_format.space_before = Pt(8)
    h4.paragraph_format.space_after = Pt(4)
    r = h4.add_run("BAB 4: WORKSPACE SPLIT 50-50 & DIGITAL TWIN EXCEL FAP 118-BARIS")
    r.font.name = "Calibri"
    r.font.size = Pt(15)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "Salah satu keunggulan terbesar yang membedakan LOS-CRM LiuGong dari sistem kompetitor adalah "
        "arsitektur antarmuka Workspace Split 50-50. Di sisi kiri terdapat formulir 5 modul accordion modern, "
        "sementara di sisi kanan terpampang pratinjau lembar resmi Excel FAP 118-baris yang telah disetujui (Approved Mandatory Field) "
        "lengkap dengan logo resmi LiuGong Finance Indonesia, seksi identitas, profil usaha, proposal, hingga blok tanda tangan bermeterai."
    )

    add_image_figure(doc, r"D:\CRM App2\screenshots_presdir\03_workspace_split_50_50.png", 
                     "Workspace Split 50-50: Form Input Accordion (Kiri) & Live Preview Lembar FAP Excel (Kanan)")

    add_image_figure(doc, r"D:\CRM App2\screenshots_presdir\fap_excel_digital_twin.png", 
                     "Digital Twin Dokumen FAP Excel 118-Baris dengan Logo Resmi LiuGong Finance Indonesia")

    # -------------------------------------------------------------
    # BAB 5: TATA KELOLA KREDIT, STRUKTUR SAHAM & SPREADING KEUANGAN
    # -------------------------------------------------------------
    h5 = doc.add_paragraph()
    h5.paragraph_format.space_before = Pt(14)
    h5.paragraph_format.space_after = Pt(4)
    r = h5.add_run("BAB 5: TATA KELOLA KREDIT, PEMEGANG SAHAM 100% & SPREADING KEUANGAN")
    r.font.name = "Calibri"
    r.font.size = Pt(15)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "Aplikasi menerapkan mekanisme validasi deterministik tanpa kompromi untuk memastikan integritas permohonan kredit:"
    )

    gov_points = [
        ("Validasi Kepemilikan Saham 100% Persis (Tab Stakeholders)", 
         "Sistem secara deterministik mengunci pengajuan kredit jika total porsi kepemilikan saham seluruh pemegang saham tidak berjumlah persis 100.00%. Menutup celah saham fiktif dan mematuhi regulasi Anti-Pencucian Uang (APU-PPT OJK)."),
        ("Integritas Keseimbangan Neraca Keuangan 3 Tahun (Tab Financial Statements)", 
         "Menggunakan kalkulasi sen integer (BigInt) presisi tinggi untuk memeriksa 3 tahun laporan keuangan historis: Total Aset wajib sama persis dengan Total Liabilitas + Ekuitas. Laporan yang tidak seimbang langsung ditolak oleh sistem."),
        ("Tata Kelola Akta Legalitas & Notaris (Tab Legal)", 
         "Pemisahan akta aktif dan arsip historis, penomoran klausul kontinu pada editor teks TinyMCE, dan matriks perbandingan perubahan modal/pengurus secara berdampingan."),
        ("Checklist Bukti Fisik Dokumen (Tab Documents Desk)", 
         "Monitoring masa berlaku izin usaha (NIB, SIUP, SKT, SPPKP) dan penyimpanan terenkripsi di AWS S3 privat dengan link kedaluwarsa 15 menit sesuai UU PDP No. 27/2022.")
    ]

    for title, desc in gov_points:
        p_pt = doc.add_paragraph()
        p_pt.paragraph_format.line_spacing = 1.15
        p_pt.paragraph_format.space_after = Pt(3)
        run_pt_t = p_pt.add_run(f"• {title}: ")
        run_pt_t.bold = True
        run_pt_t.font.name = "Calibri"
        run_pt_t.font.size = Pt(9.5)
        run_pt_t.font.color.rgb = RGBColor(0, 32, 96)
        run_pt_d = p_pt.add_run(desc)
        run_pt_d.font.name = "Calibri"
        run_pt_d.font.size = Pt(9.5)
        run_pt_d.font.color.rgb = RGBColor(40, 50, 60)

    add_image_figure(doc, r"D:\CRM App2\screenshots_presdir\tab_3_stakeholders.png", 
                     "Verifikasi Struktur Kepemilikan Saham Wajib 100% & Direksi WNI/WNA (Live System)")

    add_image_figure(doc, r"D:\CRM App2\screenshots_presdir\tab_5_financial_statements.png", 
                     "Spreading Laporan Keuangan 3 Tahun dengan Keseimbangan Neraca Terverifikasi (Live System)")

    add_image_figure(doc, r"D:\CRM App2\screenshots_presdir\tab_2_legal.png", 
                     "Manajemen Akta Legalitas: Pemisahan Akta Aktif & Riwayat Historis (Live System)")

    add_image_figure(doc, r"D:\CRM App2\screenshots_presdir\tab_legal_modal_tinymce.png", 
                     "Editor Akta Legalitas TinyMCE dengan Penomoran Klausul Kontinu & Kategori Remarks (Live System)")

    doc.add_page_break()

    # -------------------------------------------------------------
    # BAB 6: SKENARIO RIIL & SIMULASI KALKULASI FINANSIAL
    # -------------------------------------------------------------
    h6 = doc.add_paragraph()
    h6.paragraph_format.space_before = Pt(8)
    h6.paragraph_format.space_after = Pt(4)
    r = h6.add_run("BAB 6: STUDI KASUS RIIL & KALKULASI DETAIL PEMBIAYAAN ALAT BERAT")
    r.font.name = "Calibri"
    r.font.size = Pt(15)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "Berikut adalah simulasi end-to-end kasus nyata permohonan pembiayaan alat berat LiuGong "
        "yang diproses melalui sistem LOS-CRM untuk menggambarkan akurasi aktuaria dan kalkulasi angsuran:"
    )

    case_table = doc.add_table(rows=11, cols=2)
    case_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    case_table.autofit = False
    set_table_borders(case_table, color="D3D3D3")
    col_w_case = [Inches(2.5), Inches(4.0)]
    
    case_data = [
        ("Nama Calon Debitur", "PT MANDIRI JAYA ABADI (Kontraktor Tambang Nikel Morowali)"),
        ("Dealer Resmi LiuGong", "PT Megatama Traktor Utama (Makassar Branch)"),
        ("Aset yang Dibiayai", "5 Unit Hydraulic Excavator LiuGong 922E (Heavy Equipment)"),
        ("Harga Unit OTR (Total Asset Cost)", "Rp 7.500.000.000 (5 Unit @ Rp 1.500.000.000)"),
        ("Uang Muka / Down Payment (DP 25%)", "Rp 1.875.000.000 (Dibayar tunai oleh debitur ke dealer)"),
        ("Subsidi Bunga dari Dealer (1.5% p.a.)", "Rp 112.500.000 (Dipotongkan langsung ke pokok pembiayaan)"),
        ("Pokok Pembiayaan Bersih (Net Principal)", "Rp 5.512.500.000"),
        ("Suku Bunga & Metode Perhitungan", "10.50% p.a. Efektif Menurun (Reducing Balance Annuity)"),
        ("Tenor Pembiayaan", "36 Bulan (3 Tahun) · Skema In Arrear"),
        ("Angsuran Bulanan Resmi (Monthly Installment)", "Rp 179.231.425 / bulan"),
        ("Hasil Evaluasi Rasio & Putusan Kredit", "DSCR: 2.70x | Pefindo Score: 785 (Risk Grade 2) | STATUS: APPROVED")
    ]

    for i, (k, v) in enumerate(case_data):
        row = case_table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width, c1.width = col_w_case[0], col_w_case[1]
        set_cell_margins(c0, 45, 45, 70, 70)
        set_cell_margins(c1, 45, 45, 70, 70)
        
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.name = "Calibri"
        r0.font.size = Pt(9)
        r0.bold = True
        r0.font.color.rgb = RGBColor(0, 32, 96)
        
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.name = "Calibri"
        r1.font.size = Pt(9)
        if i in [6, 9, 10]:
            r1.bold = True
            r1.font.color.rgb = RGBColor(237, 125, 49)
        else:
            r1.font.color.rgb = RGBColor(40, 50, 60)
        if i % 2 == 1:
            set_cell_background(c0, "F8FAFC")
            set_cell_background(c1, "F8FAFC")

    add_image_figure(doc, r"D:\CRM App2\screenshots_presdir\tab_4_business_and_banks.png", 
                     "Proposal Pembiayaan, Kalkulator Simulasi Angsuran Anuitas & Fasilitas Perbankan (Live System)")

    # -------------------------------------------------------------
    # BAB 7: TATA KELOLA PUTUSAN KOMITE KREDIT
    # -------------------------------------------------------------
    h7 = doc.add_paragraph()
    h7.paragraph_format.space_before = Pt(14)
    h7.paragraph_format.space_after = Pt(4)
    r = h7.add_run("BAB 7: TATA KELOLA & MATRIKS WEWENANG PUTUSAN KOMITE KREDIT")
    r.font.name = "Calibri"
    r.font.size = Pt(15)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "Untuk menjaga independensi dan kepatuhan terhadap prinsip Four-Eyes Principle OJK, sistem membagi "
        "kewenangan persetujuan kredit secara berjenjang berdasarkan plafon pembiayaan (Ticket Size):\n"
        "• Tier 1 (Plafon s/d Rp 2.5 Miliar): Diputuskan oleh Branch Manager bersama Head of Credit Analyst Cabang.\n"
        "• Tier 2 (Plafon Rp 2.5 Miliar – Rp 10 Miliar): Diputuskan oleh Komite Kredit Head Office (Head of CA, Head of Legal, Marketing Director).\n"
        "• Tier 3 (Plafon > Rp 10 Miliar atau Debitur Khusus): Wajib diputuskan oleh Sidang Komite Kredit Lengkap yang dipimpin langsung oleh Bapak Presiden Direktur."
    )

    add_image_figure(doc, r"D:\CRM App2\screenshots_presdir\committee_review_actions.png", 
                     "Layar Persetujuan Komite Kredit dengan Tombol Aksi Mutlak: Approve / Reject / Return (Live System)")

    # -------------------------------------------------------------
    # BAB 8: TARGET SLA, KPI & LEMBAR PENGESAHAN
    # -------------------------------------------------------------
    h8 = doc.add_paragraph()
    h8.paragraph_format.space_before = Pt(14)
    h8.paragraph_format.space_after = Pt(4)
    r = h8.add_run("BAB 8: TARGET KPI OPERASIONAL, ROI & LEMBAR PENGESAHAN")
    r.font.name = "Calibri"
    r.font.size = Pt(15)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    kpi_table = doc.add_table(rows=6, cols=3)
    kpi_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    kpi_table.autofit = False
    set_table_borders(kpi_table, color="D3D3D3")
    col_w_kpi = [Inches(2.5), Inches(1.8), Inches(2.2)]
    kpi_headers = ["Indikator Kinerja Utama (KPI)", "Sebelum Sistem Baru", "Target Sistem LOS-CRM"]
    for j, htext in enumerate(kpi_headers):
        cell = kpi_table.rows[0].cells[j]
        cell.width = col_w_kpi[j]
        set_cell_background(cell, "002060")
        set_cell_margins(cell, 60, 60, 80, 80)
        p_hdr = cell.paragraphs[0]
        r_hdr = p_hdr.add_run(htext)
        r_hdr.font.name = "Calibri"
        r_hdr.font.size = Pt(9.5)
        r_hdr.bold = True
        r_hdr.font.color.rgb = RGBColor(255, 255, 255)

    kpi_rows = [
        ("Turnaround Time (TAT) Siklus Kredit", "10 – 14 Hari Kerja", "Maksimal 48 Jam (2 Hari)"),
        ("Waktu Onboarding & Input Data Nasabah", "4 – 6 Jam", "≤ 30 Menit (Multi-Doc OCR)"),
        ("Inquiry Riwayat Kredit SLIK / Pefindo", "1 – 2 Hari Kerja", "Real-Time / Hitungan Detik"),
        ("Tingkat Retur Berkas (Defect Rate)", "35% – 40% aplikasi", "≤ 3% permohonan"),
        ("Akurasi Laporan Keuangan & Saham", "Rentan salah hitung", "100% Zero-Error Terverifikasi")
    ]

    for i, (kpi, old, new) in enumerate(kpi_rows):
        row = kpi_table.rows[i+1]
        for c_idx, text in enumerate([kpi, old, new]):
            c = row.cells[c_idx]
            c.width = col_w_kpi[c_idx]
            set_cell_margins(c, 50, 50, 70, 70)
            p_cell = c.paragraphs[0]
            r_c = p_cell.add_run(text)
            r_c.font.name = "Calibri"
            r_c.font.size = Pt(8.5)
            if c_idx == 0:
                r_c.bold = True
                r_c.font.color.rgb = RGBColor(0, 32, 96)
            elif c_idx == 2:
                r_c.bold = True
                r_c.font.color.rgb = RGBColor(237, 125, 49)
            if i % 2 == 1:
                set_cell_background(c, "F8FAFC")

    doc.add_paragraph().paragraph_format.space_after = Pt(20)

    # Formal Signatures Table
    sig_table = doc.add_table(rows=1, cols=2)
    sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sig_table.autofit = False
    set_table_borders(sig_table, color="FFFFFF")
    sig_col_w = [Inches(3.2), Inches(3.3)]
    
    row0 = sig_table.rows[0]
    p_s1 = row0.cells[0].paragraphs[0]
    p_s1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_s1 = p_s1.add_run("Disiapkan & Diajukan Oleh:\nLead System Owner & Technical In-Charge\n\n\n\n\n\n")
    r_s1.font.name = "Calibri"
    r_s1.font.size = Pt(9.5)
    r_s1_b = p_s1.add_run("LATOM\n")
    r_s1_b.bold = True
    r_s1_b.font.name = "Calibri"
    r_s1_b.font.size = Pt(10.5)
    r_s1_b.font.color.rgb = RGBColor(0, 32, 96)
    p_s1.add_run("PT LiuGong Finance Indonesia")

    p_s2 = row0.cells[1].paragraphs[0]
    p_s2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_s2 = p_s2.add_run("Ditelaah & Disetujui Oleh:\nPresiden Direktur\n\n\n\n\n\n")
    r_s2.font.name = "Calibri"
    r_s2.font.size = Pt(9.5)
    r_s2_b = p_s2.add_run("PRESIDEN DIREKTUR\n")
    r_s2_b.bold = True
    r_s2_b.font.name = "Calibri"
    r_s2_b.font.size = Pt(10.5)
    r_s2_b.font.color.rgb = RGBColor(0, 32, 96)
    p_s2.add_run("PT LiuGong Finance Indonesia")

    output_path = r"D:\CRM App2\CRM App2\LIUGONG_CRM_BUSINESS_SPECIFICATION_PRESDIR.docx"
    doc.save(output_path)
    print(f"Masterpiece document created successfully at: {output_path} (size: {os.path.getsize(output_path)} bytes)")

if __name__ == "__main__":
    build_master_brd_presdir()
