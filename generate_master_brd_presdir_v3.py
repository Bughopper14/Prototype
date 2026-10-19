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
        run = p_img.add_run()
        run.add_picture(img_path, width=width)
        
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_after = Pt(8)
        run_cap = p_cap.add_run(f"Gambar: {caption}")
        run_cap.font.name = "Calibri"
        run_cap.font.size = Pt(9.5)
        run_cap.font.italic = True
        run_cap.font.color.rgb = RGBColor(100, 116, 139)

def build_word_document():
    doc = docx.Document()
    
    section = doc.sections[0]
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.85)
    section.right_margin = Inches(0.85)

    # -------------------------------------------------------------
    # HEADER FORMAL: LOGO & JUDUL
    # -------------------------------------------------------------
    logo_path = r"D:\CRM App2\CRM App2\public\excel_assets\image2.jpg"
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p_logo.paragraph_format.space_after = Pt(4)
        run_logo = p_logo.add_run()
        run_logo.add_picture(logo_path, width=Inches(2.5))

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(2)
    r_title = p_title.add_run("PROPOSAL SPESIFIKASI BISNIS & ROADMAP SISTEM")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(22)
    r_title.bold = True
    r_title.font.color.rgb = RGBColor(0, 32, 96)

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(12)
    r_sub = p_sub.add_run("ORIGINATION WORKSPACE & CRM PLATFORM (LOS-CRM) · PT LIUGONG FINANCE INDONESIA")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(11)
    r_sub.bold = True
    r_sub.font.color.rgb = RGBColor(237, 125, 49)

    add_callout(
        doc,
        "DOKUMEN PRESENTASI EKSEKUTIF UNTUK PRESIDEN DIREKTUR:\n"
        "Dokumen ini membedah Roadmap Strategis Pengembangan Sistem 2026–2027 dengan fokus utama pada rilis Q4 2026 (FAP STAGE: Customer & PIC hingga Stakeholders + Tab Dokumen). "
        "Dilengkapi rincian operasional langkah demi langkah (SOP 6 Tahap) penginputan data oleh tim Marketing, integrasi OCR NIB OSS RBA, Digital Twin Excel 118-baris, validasi saham 100%, serta gambaran umum fase lanjutan 2027.",
        title="RINGKASAN STRATEGIS DIREKSI"
    )

    # -------------------------------------------------------------
    # TABEL METADATA
    # -------------------------------------------------------------
    meta_table = doc.add_table(rows=6, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False
    set_table_borders(meta_table, color="B0C4DE")
    col_w = [Inches(2.2), Inches(4.3)]
    
    meta_data = [
        ("Nama Inisiatif", "LiuGong Finance Origination & Customer Relationship Management (LOS-CRM)"),
        ("Sponsor Proyek", "Presiden Direktur · PT LiuGong Finance Indonesia"),
        ("Lead System Owner", "Latom (CTO & Head of Digital Transformation)"),
        ("Target Rilis Q4 2026", "FAP Stage (Customer & PIC, Legal, Stakeholders, Tab Documents 13 Checklist)"),
        ("Horizon Roadmap 2027", "Q1: Pre-Analysis & Pefindo OCR | Q2: ICLF & CDE Financial | Q3: CDE Bank Statement | Q4: Proposal Final"),
        ("Status Kompilasi & QA", "Production Ready · 27/27 Test Suites PASS · 0 Console Error")
    ]
    for i, (k, v) in enumerate(meta_data):
        row = meta_table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width, c1.width = col_w[0], col_w[1]
        set_cell_margins(c0, 60, 60, 100, 100)
        set_cell_margins(c1, 60, 60, 100, 100)
        set_cell_background(c0, "F0F4F8")
        
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_after = Pt(2)
        r0 = p0.add_run(k)
        r0.font.name = "Calibri"
        r0.font.size = Pt(9.5)
        r0.bold = True
        r0.font.color.rgb = RGBColor(0, 32, 96)
        
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(2)
        r1 = p1.add_run(v)
        r1.font.name = "Calibri"
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = RGBColor(40, 50, 60)

    doc.add_page_break()

    # -------------------------------------------------------------
    # BAB 1: ROADMAP STRATEGIS 2026–2027 (PHASED LIFECYCLE)
    # -------------------------------------------------------------
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(8)
    h1.paragraph_format.space_after = Pt(4)
    r = h1.add_run("BAB 1: ROADMAP STRATEGIS PENGEMBANGAN SISTEM (2026 – 2027)")
    r.font.name = "Calibri"
    r.font.size = Pt(15)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(8)
    p.add_run(
        "Untuk memastikan kehati-hatian perbankan (prudential financing) dan kesiapan adopsi di lapangan, "
        "transformasi sistem LOS-CRM LiuGong dibagi ke dalam 5 kuartal strategis yang terukur:"
    )

    # Tabel Roadmap
    road_table = doc.add_table(rows=6, cols=3)
    road_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    road_table.autofit = False
    set_table_borders(road_table, color="D3D3D3")
    col_w_road = [Inches(1.4), Inches(2.5), Inches(2.6)]
    headers_road = ["Periode Rilis", "Modul & Fitur Kunci", "Sasaran Strategis & Nilai Bisnis"]
    for j, htext in enumerate(headers_road):
        cell = road_table.rows[0].cells[j]
        cell.width = col_w_road[j]
        set_cell_background(cell, "002060")
        set_cell_margins(cell, 60, 60, 80, 80)
        p_hdr = cell.paragraphs[0]
        r_hdr = p_hdr.add_run(htext)
        r_hdr.font.name = "Calibri"
        r_hdr.font.size = Pt(9.5)
        r_hdr.bold = True
        r_hdr.font.color.rgb = RGBColor(255, 255, 255)

    roadmap_rows = [
        ("Q4 2026\n(FOKUS UTAMA)",
         "• FAP STAGE RELEASE:\n  - Customer & PIC (5 Modul Accordion)\n  - Legal Deeds (Akta & SK Menkumham)\n  - Stakeholders (Susunan Pengurus & Saham)\n  - Documents Tab (13 Checklist Berkas)\n  - Live Excel Mirror 118-Baris & OCR NIB",
         "Standarisasi onboarding nasabah, peniadaan typo data legalitas via OCR NIB, validasi kepemilikan modal mutlak 100%, serta sentralisasi berkas digital."),
        
        ("Q1 2027",
         "• PRE-ANALYSIS + INTEGRASI PEFINDO OCR:\n  - Early Risk Screening (Go / Review / No-Go)\n  - Pefindo Credit Score & Ingestion Bridge\n  - OCR NPWP & SPT Tahunan Langsung Mengisi Financial Statements",
         "Penyaringan dini debitur berisiko tinggi. Ekstraksi otomatis laporan keuangan dari dokumen pajak tanpa pengetikan manual oleh analis."),
        
        ("Q2 2027",
         "• ICLF + CDE (FINANCIAL):\n  - Initial Credit Limit Facility (BMPP OJK)\n  - Credit Decision Engine (CDE) Phase 1\n  - Analisis Rasio Likuiditas & Solvabilitas Otomatis",
         "Penetapan pagu batas atas kredit debitur tunggal/grup usaha dan kalkulasi kesehatan neraca secara komputasi otomatis."),
        
        ("Q3 2027",
         "• CDE (BANK STATEMENT) PHASE 2:\n  - Parser Mutasi Rekening Koran Bank Otomatis\n  - Analisis Saldo Mengendap & Cashflow Riil\n  - Deteksi Cek Kosong & Transaksi Anomali",
         "Mengetahui kapasitas angsuran riil debitur dari rekam jejak mutasi bank operasional 3–6 bulan secara objektif."),
        
        ("Q4 2027",
         "• PROPOSAL PEMBIAYAAN FINAL:\n  - Inventaris Unit Alat Berat LiuGong\n  - Anuitas Bunga Efektif Menurun Resmi\n  - Dossier Komprehensif Siap Sidang\n  - Persetujuan Komite Kredit Digital",
         "Siklus kredit penuh selesai (end-to-end). Penerbitan SPPK otomatis dan pencairan unit alat berat LiuGong ke pelanggan.")
    ]

    for i, (col1, col2, col3) in enumerate(roadmap_rows):
        row = road_table.rows[i+1]
        for c_idx, text in enumerate([col1, col2, col3]):
            c = row.cells[c_idx]
            c.width = col_w_road[c_idx]
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
            if i == 0:
                set_cell_background(c, "EFF6FF")
            elif i % 2 == 1:
                set_cell_background(c, "F8FAFC")

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Embed Diagram Pipa 4-Tahap
    add_image_figure(doc, r"D:\CRM App2\CRM App2\public\diagram_pipa_strategis_4_tahap.png",
                     "Diagram Arsitektur Pipa Pembiayaan 4-Tahap & Interkoneksi Pefindo OCR")

    doc.add_page_break()

    # -------------------------------------------------------------
    # BAB 2: ARSITEKTUR FAP STAGE, PEMETAAN FITUR & AI OCR, SERTA ALUR HINGGA PROPOSAL
    # -------------------------------------------------------------
    h2 = doc.add_paragraph()
    h2.paragraph_format.space_before = Pt(8)
    h2.paragraph_format.space_after = Pt(4)
    r = h2.add_run("BAB 2: ARSITEKTUR FAP STAGE, PEMETAAN FITUR & AI OCR, SERTA ALUR HINGGA PROPOSAL")
    r.font.name = "Calibri"
    r.font.size = Pt(15)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    # 2.1 PENJELASAN UMUM FAP STAGE
    sub21 = doc.add_paragraph()
    sub21.paragraph_format.space_before = Pt(6)
    sub21.paragraph_format.space_after = Pt(2)
    r = sub21.add_run("2.1. Penjelasan Umum FAP Stage (General Overview & Peran Marketing)")
    r.font.name = "Calibri"
    r.font.size = Pt(12)
    r.bold = True
    r.font.color.rgb = RGBColor(237, 125, 49)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "FAP STAGE (Financing Application Process) adalah gerbang intake operasional paling awal pada sistem LOS-CRM LiuGong Finance Indonesia. "
        "Pada model bisnis LiuGong Finance, operasional berjalan terpusat di Kantor Pusat (Head Office) tanpa kantor cabang fisik di daerah, "
        "bekerja sama langsung dengan jaringan Dealer Resmi LiuGong (seperti PT Megatama Mandiri, dll.). "
        "Tim Marketing (MKT) bertugas melakukan onboarding calon debitur secara komprehensif, "
        "menghimpun data legalitas korporasi, memetakan susunan pengurus serta pemegang saham, dan memverifikasi kelengkapan berkas fisik "
        "persyaratan pembiayaan sebelum permohonan diteruskan ke tahap analisis risiko.\n\n"
        "Secara garis besar, aktivitas utama staf Marketing pada FAP Stage mencakup:\n"
        "1. Inisiasi Permohonan: Menentukan kategori debitur (Baru/Lama), segmentasi (Corporate/Commercial/Micro), dan penunjukan mitra dealer resmi LiuGong.\n"
        "2. Perekaman Identitas & Domisili: Memasukkan nama resmi PT/CV, alamat kantor pusat, kontak penanggung jawab operasional (PIC), serta segmentasi proyek kontrak berjalan.\n"
        "3. Dokumentasi Yuridis Notaris: Merekam data akta pendirian dan akta perubahan terakhir lengkap dengan tanggal dan nomor SK Menkumham.\n"
        "4. Pemetaan Tata Kelola Kepemilikan: Mendaftarkan seluruh direksi, komisaris, dan pemegang saham dengan validasi keras komposisi modal 100.00%.\n"
        "5. Pengumpulan 13 Dokumen Persyaratan: Menghimpun pindaian berkas legalitas dan finansial ke dalam repositori digital terenkripsi."
    )

    add_image_figure(doc, r"D:\CRM App2\screenshots_fap_steps\05_step_tab1_form_auto_filled.png",
                     "Tampilan Workspace FAP Stage Split 50-50 Menampilkan 4 Tab Terstruktur dan Digital Twin Excel 118-Baris (Live System)")

    # 2.2 FITUR-FITUR UTAMA FAP STAGE
    sub22 = doc.add_paragraph()
    sub22.paragraph_format.space_before = Pt(8)
    sub22.paragraph_format.space_after = Pt(2)
    r = sub22.add_run("2.2. Fitur-Fitur Utama pada FAP Stage (Core Capabilities)")
    r.font.name = "Calibri"
    r.font.size = Pt(12)
    r.bold = True
    r.font.color.rgb = RGBColor(237, 125, 49)

    feat_table = doc.add_table(rows=6, cols=2)
    feat_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    feat_table.autofit = False
    set_table_borders(feat_table, color="D3D3D3")
    col_w_feat = [Inches(2.2), Inches(4.3)]
    feat_headers = ["Fitur Utama FAP Stage", "Deskripsi Fungsional & Nilai Bisnis"]
    for j, htext in enumerate(feat_headers):
        cell = feat_table.rows[0].cells[j]
        cell.width = col_w_feat[j]
        set_cell_background(cell, "002060")
        set_cell_margins(cell, 60, 60, 80, 80)
        p_hdr = cell.paragraphs[0]
        r_hdr = p_hdr.add_run(htext)
        r_hdr.font.name = "Calibri"
        r_hdr.font.size = Pt(9.5)
        r_hdr.bold = True
        r_hdr.font.color.rgb = RGBColor(255, 255, 255)

    feat_rows = [
        ("Workspace Split 50-50 & Live Excel Mirror",
         "Kolom kiri formulir input dan kolom kanan pratinjau lembar kerja resmi Excel 118-baris. Setiap ketikan di formulir kiri langsung terisi seketika di lembar Excel kanan secara real-time."),
        ("Formulir 5-Modul Kartu Accordion",
         "Membagi lebih dari 35 field input panjang menjadi 5 modul terstruktur (01 Identitas, 02 Domisili, 03 Profil Usaha, 04 PIC, 05 Proyek) lengkap dengan quick jump chips navigasi dua arah."),
        ("Dual Table Legal Notaris & TinyMCE Editor",
         "Pemisahan akta aktif (rujukan yuridis saat ini) di tabel atas dan riwayat akta lama di tabel bawah, dilengkapi editor TinyMCE bernomor otomatis untuk mencatat klausul notaris."),
        ("Hard Gate Validasi Modal Saham 100.00%",
         "Sistem mengunci pengajuan jika total persentase saham seluruh pemegang saham tidak tepat 100.00% (mencegah kekeliruan perhitungan modal debitur)."),
        ("Pusat Checklist & Repositori 13 Berkas Dokumen",
         "Tab Dokumen menampilkan checklist 13 berkas wajib legalitas dan finansial, fitur unggah file digital (PDF/JPG), indikator status verifikasi, dan counter kelengkapan berkas.")
    ]
    for i, (title_f, desc_f) in enumerate(feat_rows):
        row = feat_table.rows[i+1]
        for j, val in enumerate([title_f, desc_f]):
            cell = row.cells[j]
            cell.width = col_w_feat[j]
            set_cell_margins(cell, 50, 50, 70, 70)
            if i % 2 == 1:
                set_cell_background(cell, "F9FAFB")
            p_cell = cell.paragraphs[0]
            p_cell.paragraph_format.line_spacing = 1.15
            r_c = p_cell.add_run(val)
            r_c.font.name = "Calibri"
            r_c.font.size = Pt(9)
            if j == 0:
                r_c.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # 2.3 PEMETAAN TITIK-TITIK MULTI-DOCUMENT AI OCR
    sub23 = doc.add_paragraph()
    sub23.paragraph_format.space_before = Pt(8)
    sub23.paragraph_format.space_after = Pt(2)
    r = sub23.add_run("2.3. Pemetaan Titik-Titik Multi-Document AI OCR (Di Mana Saja OCR Bekerja)")
    r.font.name = "Calibri"
    r.font.size = Pt(12)
    r.bold = True
    r.font.color.rgb = RGBColor(237, 125, 49)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "Untuk mempercepat proses onboarding dan meniadakan risiko kesalahan pengetikan nomor resmi (human-error typo), "
        "sistem menanamkan teknologi Optical Character Recognition (OCR) berbasis AI pada titik-titik krusial berikut:"
    )

    ocr_table = doc.add_table(rows=5, cols=3)
    ocr_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    ocr_table.autofit = False
    set_table_borders(ocr_table, color="D3D3D3")
    col_w_ocr = [Inches(1.8), Inches(2.2), Inches(2.5)]
    ocr_headers = ["Teknologi OCR", "Titik Lokasi pada Sistem", "Parameter yang Diekstrak Otomatis"]
    for j, htext in enumerate(ocr_headers):
        cell = ocr_table.rows[0].cells[j]
        cell.width = col_w_ocr[j]
        set_cell_background(cell, "002060")
        set_cell_margins(cell, 60, 60, 80, 80)
        p_hdr = cell.paragraphs[0]
        r_hdr = p_hdr.add_run(htext)
        r_hdr.font.name = "Calibri"
        r_hdr.font.size = Pt(9.5)
        r_hdr.bold = True
        r_hdr.font.color.rgb = RGBColor(255, 255, 255)

    ocr_rows = [
        ("OCR NIB OSS (13-Digit)",
         "Tab 1 (Customer & PIC)\nModul 02: Kantor Registrasi & Domisili (Tombol pill [Scan OCR NIB])",
         "• Nomor NIB (13 digit)\n• Nama Resmi Perusahaan\n• Alamat Domisili Kantor\n• Kode Pos\n• Tanggal Terbit OSS BKPM"),
        ("OCR e-KTP WNI",
         "Tab 3 (Stakeholders)\nForm Input Pengurus Direksi & Komisaris Berkewarganegaraan Indonesia",
         "• NIK KTP (16 digit)\n• Nama Lengkap Pengurus\n• Tempat & Tanggal Lahir\n• Jenis Kelamin\n• Alamat KTP"),
        ("OCR Paspor & E-KITAS (Expatriate)",
         "Tab 3 (Stakeholders)\nForm Input Direksi, Komisaris, atau Pemegang Saham WNA (Ekspatriat)",
         "• Nomor Buku Paspor\n• Masa Berlaku Paspor\n• Nomor Izin Tinggal E-KITAS\n• Negara Asal / Kewarganegaraan"),
        ("OCR NPWP (Badan & Pribadi)",
         "Tab 1 (Modul 03 Profil Usaha) & Tab 3 (Stakeholders)",
         "• Nomor Pokok Wajib Pajak (15 atau 16 digit valid DJP)\n• Nama Terdaftar Pajak\n• Alamat Terdaftar Pajak")
    ]
    for i, (col1, col2, col3) in enumerate(ocr_rows):
        row = ocr_table.rows[i+1]
        for j, val in enumerate([col1, col2, col3]):
            cell = row.cells[j]
            cell.width = col_w_ocr[j]
            set_cell_margins(cell, 50, 50, 70, 70)
            if i % 2 == 1:
                set_cell_background(cell, "F9FAFB")
            p_cell = cell.paragraphs[0]
            p_cell.paragraph_format.line_spacing = 1.15
            r_c = p_cell.add_run(val)
            r_c.font.name = "Calibri"
            r_c.font.size = Pt(9)
            if j == 0:
                r_c.bold = True

    add_image_figure(doc, r"D:\CRM App2\screenshots_fap_steps\03_step_nib_ocr_modal_opened.png",
                     "Modal Dialog Scan OCR NIB 13-Digit Terbuka Langsung dari Form Domisili Perusahaan")
    add_image_figure(doc, r"D:\CRM App2\screenshots_fap_steps\step_stakeholder_ktp_ocr_modal.png",
                     "Modal Dialog Side-by-side OCR e-KTP & Paspor pada Pengurus dan Pemegang Saham (Stakeholders)")

    # 2.4 ALUR BERKESINAMBUNGAN DARI FAP HINGGA PROPOSAL
    sub24 = doc.add_paragraph()
    sub24.paragraph_format.space_before = Pt(8)
    sub24.paragraph_format.space_after = Pt(2)
    r = sub24.add_run("2.4. Alur Rantai Pembiayaan: Dari FAP Stage Hingga Proposal Final")
    r.font.name = "Calibri"
    r.font.size = Pt(12)
    r.bold = True
    r.font.color.rgb = RGBColor(237, 125, 49)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "FAP Stage tidak berdiri sendiri, melainkan menjadi fondasi data utama yang mengalir mulus ke seluruh tahapan berikutnya hingga penerbitan proposal komersial:\n\n"
        "1. FAP STAGE (Customer Intake & Profiling):\n"
        "   Marketing menghimpun profil debitur, legalitas akta, susunan saham (100%), dan 13 berkas fisik. "
        "Data tervalidasi dan siap diproses lebih lanjut.\n\n"
        "2. [THE INTELLIGENT BRIDGE: PEFINDO BIRO KREDIT GATEWAY]:\n"
        "   Sebelum masuk ke analisis mendalam, sistem secara otomatis menembakkan data identitas (NIB/NPWP) ke Pefindo Biro Kredit. "
        "Penarikan Credit Score IdScore (skala 250–900) dan total eksposur kredit berjalan disajikan secara instan dalam hitungan detik.\n\n"
        "3. PRE-ANALYSIS (Risk Screening & Gatekeeping):\n"
        "   Credit Analyst melakukan skrining kelayakan awal (Go / Review / No-Go). Pada roadmap Q1 2027, fitur OCR NPWP / SPT Tahunan "
        "akan membaca lampiran pajak dan otomatis mengisikan angka omzet, aset, dan modal ke tabel Financial Statements tanpa ketik manual.\n\n"
        "4. ICLF (Initial Credit Limit Facility & CDE):\n"
        "   Penetapan pagu batas atas kredit debitur atau grup usaha sesuai ketentuan BMPP OJK, didukung Credit Decision Engine (CDE Financial di Q2 2027 dan CDE Bank Statement di Q3 2027).\n\n"
        "5. PROPOSAL (Final Commercial Dossier & Committee Approval):\n"
        "   Penyusunan paket pembiayaan unit alat berat LiuGong, skema subsidi bunga dealer, uang muka (DP 20%–30%), "
        "kalkulator anuitas bunga efektif menurun (reducing balance), dan persetujuan bertingkat Komite Kredit berjejak audit abadi."
    )

    doc.add_page_break()

    # -------------------------------------------------------------
    # BAB 3: GAMBARAN UMUM FASE MENDATANG (ROADMAP 2027)
    # -------------------------------------------------------------
    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(8)
    h3.paragraph_format.space_after = Pt(4)
    r = h3.add_run("BAB 3: GAMBARAN UMUM FASE MENDATANG (ROADMAP 2027)")
    r.font.name = "Calibri"
    r.font.size = Pt(15)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "Fase lanjutan pada tahun 2027 akan mengembangkan kapabilitas analitis mendalam, "
        "decision engine otomatis, serta penuntasan proposal komite kredit:"
    )

    # 3.1 Q1 2027
    sub31 = doc.add_paragraph()
    sub31.paragraph_format.space_before = Pt(6)
    sub31.paragraph_format.space_after = Pt(2)
    r = sub31.add_run("3.1. Q1 2027 — Pre-Analysis & Integrasi Pefindo OCR (OCR NPWP / SPT Tahunan)")
    r.font.name = "Calibri"
    r.font.size = Pt(12)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(4)
    p.add_run(
        "• Early Risk Triaging: Skrining kelayakan awal debitur secara instan (kategori Go / Review / No-Go) sebelum analis menghabiskan waktu ke lapangan.\n"
        "• Integrasi Pefindo Biro Kredit: Menembakkan identitas nasabah ke Pefindo untuk menarik Credit Score (skala 250–900), riwayat pembayaran kredit, serta total fasilitas utang terbuka secara real-time.\n"
        "• Fitur Cerdas OCR NPWP & SPT Tahunan: Pemindai OCR mutakhir yang membaca lampiran SPT Pajak Penghasilan Badan (Formulir 1771) dan secara langsung memetakan angka Penjualan, HPP, Beban Operasional, Aset Lancar, dan Modal ke tabel Financial Statement di sistem tanpa pengetikan manual."
    )

    # 3.2 Q2 2027
    sub32 = doc.add_paragraph()
    sub32.paragraph_format.space_before = Pt(6)
    sub32.paragraph_format.space_after = Pt(2)
    r = sub32.add_run("3.2. Q2 2027 — ICLF & Credit Decision Engine (CDE Financial)")
    r.font.name = "Calibri"
    r.font.size = Pt(12)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(4)
    p.add_run(
        "• Initial Credit Limit Facility (ICLF): Penetapan batas pagu pembiayaan maksimum per debitur tunggal maupun grup usaha berdasarkan kepatuhan Batas Maksimum Pemberian Pembiayaan (BMPP OJK) dan rasio permodalan.\n"
        "• Credit Decision Engine (CDE) Phase 1: Engine penilaian kredit otomatis yang mengevaluasi rasio keuangan (Current Ratio, Debt-to-Equity, Net Profit Margin, Interest Coverage Ratio) dan menghasilkan skor kelayakan finansial secara terstandardisasi."
    )

    # 3.3 Q3 2027
    sub33 = doc.add_paragraph()
    sub33.paragraph_format.space_before = Pt(6)
    sub33.paragraph_format.space_after = Pt(2)
    r = sub33.add_run("3.3. Q3 2027 — Credit Decision Engine (CDE Bank Statement) Phase 2")
    r.font.name = "Calibri"
    r.font.size = Pt(12)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(4)
    p.add_run(
        "• Parser Rekening Koran Cerdas: Mengekstrak mutasi buku bank debitur (Bank Mandiri, BCA, BRI, BNI) dari berkas PDF mutasi 3–6 bulan terakhir.\n"
        "• Analisis Likuiditas Riil: Menghitung saldo rata-rata bulanan, perputaran kredit harian, frekuensi saldo minus, serta mendeteksi transaksi anomali atau cek kosong untuk memastikan debitur memiliki kemampuan membayar angsuran riil."
    )

    # 3.4 Q4 2027
    sub34 = doc.add_paragraph()
    sub34.paragraph_format.space_before = Pt(6)
    sub34.paragraph_format.space_after = Pt(2)
    r = sub34.add_run("3.4. Q4 2027 — Proposal Pembiayaan Final & Putusan Komite Kredit")
    r.font.name = "Calibri"
    r.font.size = Pt(12)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(4)
    p.add_run(
        "• Rincian Unit Alat Berat LiuGong: Inventaris unit (Excavator 922E, Wheel Loader 856H, Dump Truck), harga OTR, subsidi dealer, dan uang muka (DP 20%–30%).\n"
        "• Mesin Aktuaria Bunga Efektif: Simulasi angsuran anuitas menurun resmi (reducing balance annuity) presisi tinggi.\n"
        "• Persetujuan Komite Kredit Digital: Pelaksanaan sidang komite kredit digital berjenjang (Tier 1 s/d Tier 3 Direksi/Presdir) dengan hak Approve, Reject, atau Return, disertai pencatatan audit trail permanen."
    )

    doc.add_page_break()

    # -------------------------------------------------------------
    # BAB 4: LEMBAR PENGESAHAN EKSEKUTIF
    # -------------------------------------------------------------
    h4 = doc.add_paragraph()
    h4.paragraph_format.space_before = Pt(8)
    h4.paragraph_format.space_after = Pt(4)
    r = h4.add_run("BAB 4: LEMBAR PENGESAHAN EKSEKUTIF")
    r.font.name = "Calibri"
    r.font.size = Pt(15)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 32, 96)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(8)
    p.add_run(
        "Proposal Spesifikasi Bisnis dan Roadmap Sistem LOS-CRM ini disusun sebagai pedoman resmi pengembangan sistem "
        "dan diajukan untuk memperoleh persetujuan prinsip dari Bapak Presiden Direktur:"
    )

    sign_table = doc.add_table(rows=2, cols=2)
    sign_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sign_table.autofit = False
    set_table_borders(sign_table, color="D3D3D3")
    col_w_sign = [Inches(3.2), Inches(3.2)]
    
    sign_headers = ["Diajukan Oleh:", "Disetujui Oleh:"]
    for j, htext in enumerate(sign_headers):
        c = sign_table.rows[0].cells[j]
        c.width = col_w_sign[j]
        set_cell_background(c, "002060")
        set_cell_margins(c, 50, 50, 80, 80)
        p_hdr = c.paragraphs[0]
        r_hdr = p_hdr.add_run(htext)
        r_hdr.font.name = "Calibri"
        r_hdr.font.size = Pt(9.5)
        r_hdr.bold = True
        r_hdr.font.color.rgb = RGBColor(255, 255, 255)

    sign_contents = [
        ("Latom\nLead System Owner & AI CTO\nPT LiuGong Finance Indonesia\n\nTanggal: 19 Oktober 2026"),
        ("Presiden Direktur\nChief Executive Officer\nPT LiuGong Finance Indonesia\n\nTanggal: .............................")
    ]
    for j, text in enumerate(sign_contents):
        c = sign_table.rows[1].cells[j]
        c.width = col_w_sign[j]
        set_cell_margins(c, 100, 100, 80, 80)
        set_cell_background(c, "FFFFFF")
        p_c = c.paragraphs[0]
        p_c.paragraph_format.line_spacing = 1.2
        r_c = p_c.add_run(text)
        r_c.font.name = "Calibri"
        r_c.font.size = Pt(9.5)
        r_c.font.color.rgb = RGBColor(0, 32, 96)

    # Simpan dokumen
    out_path = r"D:\CRM App2\CRM App2\LIUGONG_CRM_BUSINESS_SPECIFICATION_PRESDIR.docx"
    doc.save(out_path)
    print(f"Step-by-step SOP Document created at: {out_path} (size: {os.path.getsize(out_path)} bytes)")

if __name__ == "__main__":
    build_word_document()
