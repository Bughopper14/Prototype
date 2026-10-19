import re

with open('D:/CRM App2/CRM App2/generate_master_brd_presdir_v3.py', 'r', encoding='utf-8') as f:
    text = f.read()

start_marker = '# -------------------------------------------------------------\n    # BAB 2: PANDUAN OPERASIONAL'
end_marker = '# -------------------------------------------------------------\n    # BAB 3: GAMBARAN UMUM FASE MENDATANG'

start_idx = text.find(start_marker)
end_idx = text.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found! start:", start_idx, "end:", end_idx)
    exit(1)

new_bab2 = '''# -------------------------------------------------------------
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
        "FAP STAGE (Financing Application Process) adalah gerbang intake operasional paling awal pada sistem LOS-CRM LiuGong Finance. "
        "Pada tahap ini, tim Marketing (MKT) di seluruh kantor cabang bertugas melakukan onboarding calon debitur secara komprehensif, "
        "menghimpun data legalitas korporasi, memetakan susunan pengurus serta pemegang saham, dan memverifikasi kelengkapan berkas fisik "
        "persyaratan pembiayaan sebelum permohonan diteruskan ke tahap analisis risiko.\\n\\n"
        "Secara garis besar, aktivitas utama staf Marketing pada FAP Stage mencakup:\\n"
        "1. Inisiasi Permohonan: Menentukan kategori debitur (Baru/Lama), segmentasi (Corporate/Commercial/Micro), dan cabang operasional LiuGong.\\n"
        "2. Perekaman Identitas & Domisili: Memasukkan nama resmi PT/CV, alamat kantor pusat, kontak penanggung jawab operasional (PIC), serta segmentasi proyek kontrak berjalan.\\n"
        "3. Dokumentasi Yuridis Notaris: Merekam data akta pendirian dan akta perubahan terakhir lengkap dengan tanggal dan nomor SK Menkumham.\\n"
        "4. Pemetaan Tata Kelola Kepemilikan: Mendaftarkan seluruh direksi, komisaris, dan pemegang saham dengan validasi keras komposisi modal 100.00%.\\n"
        "5. Pengumpulan 13 Dokumen Persyaratan: Menghimpun pindaian berkas legalitas dan finansial ke dalam repositori digital terenkripsi."
    )

    add_image_figure(doc, r"D:\\CRM App2\\screenshots_fap_steps\\05_step_tab1_form_auto_filled.png",
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
         "Tab 1 (Customer & PIC)\\nModul 02: Kantor Registrasi & Domisili (Tombol pill [Scan OCR NIB])",
         "• Nomor NIB (13 digit)\\n• Nama Resmi Perusahaan\\n• Alamat Domisili Kantor\\n• Kode Pos\\n• Tanggal Terbit OSS BKPM"),
        ("OCR e-KTP WNI",
         "Tab 3 (Stakeholders)\\nForm Input Pengurus Direksi & Komisaris Berkewarganegaraan Indonesia",
         "• NIK KTP (16 digit)\\n• Nama Lengkap Pengurus\\n• Tempat & Tanggal Lahir\\n• Jenis Kelamin\\n• Alamat KTP"),
        ("OCR Paspor & E-KITAS (Expatriate)",
         "Tab 3 (Stakeholders)\\nForm Input Direksi, Komisaris, atau Pemegang Saham WNA (Ekspatriat)",
         "• Nomor Buku Paspor\\n• Masa Berlaku Paspor\\n• Nomor Izin Tinggal E-KITAS\\n• Negara Asal / Kewarganegaraan"),
        ("OCR NPWP (Badan & Pribadi)",
         "Tab 1 (Modul 03 Profil Usaha) & Tab 3 (Stakeholders)",
         "• Nomor Pokok Wajib Pajak (15 atau 16 digit valid DJP)\\n• Nama Terdaftar Pajak\\n• Alamat Terdaftar Pajak")
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

    add_image_figure(doc, r"D:\\CRM App2\\screenshots_fap_steps\\03_step_nib_ocr_modal_opened.png",
                     "Modal Dialog Scan OCR NIB 13-Digit Terbuka Langsung dari Form Domisili Perusahaan")

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
        "FAP Stage tidak berdiri sendiri, melainkan menjadi fondasi data utama yang mengalir mulus ke seluruh tahapan berikutnya hingga penerbitan proposal komersial:\\n\\n"
        "1. FAP STAGE (Customer Intake & Profiling):\\n"
        "   Marketing menghimpun profil debitur, legalitas akta, susunan saham (100%), dan 13 berkas fisik. "
        "Data tervalidasi dan siap diproses lebih lanjut.\\n\\n"
        "2. [THE INTELLIGENT BRIDGE: PEFINDO BIRO KREDIT GATEWAY]:\\n"
        "   Sebelum masuk ke analisis mendalam, sistem secara otomatis menembakkan data identitas (NIB/NPWP) ke Pefindo Biro Kredit. "
        "Penarikan Credit Score IdScore (skala 250–900) dan total eksposur kredit berjalan disajikan secara instan dalam hitungan detik.\\n\\n"
        "3. PRE-ANALYSIS (Risk Screening & Gatekeeping):\\n"
        "   Credit Analyst melakukan skrining kelayakan awal (Go / Review / No-Go). Pada roadmap Q1 2027, fitur OCR NPWP / SPT Tahunan "
        "akan membaca lampiran pajak dan otomatis mengisikan angka omzet, aset, dan modal ke tabel Financial Statements tanpa ketik manual.\\n\\n"
        "4. ICLF (Initial Credit Limit Facility & CDE):\\n"
        "   Penetapan pagu batas atas kredit debitur atau grup usaha sesuai ketentuan BMPP OJK, didukung Credit Decision Engine (CDE Financial di Q2 2027 dan CDE Bank Statement di Q3 2027).\\n\\n"
        "5. PROPOSAL (Final Commercial Dossier & Committee Approval):\\n"
        "   Penyusunan paket pembiayaan unit alat berat LiuGong, skema subsidi bunga dealer, uang muka (DP 20%–30%), "
        "kalkulator anuitas bunga efektif menurun (reducing balance), dan persetujuan bertingkat Komite Kredit berjejak audit abadi."
    )

    doc.add_page_break()

    '''

updated_text = text[:start_idx] + new_bab2 + text[end_idx:]
with open('D:/CRM App2/CRM App2/generate_master_brd_presdir_v3.py', 'w', encoding='utf-8') as f:
    f.write(updated_text)

print("Updated generate_master_brd_presdir_v3.py successfully!")
