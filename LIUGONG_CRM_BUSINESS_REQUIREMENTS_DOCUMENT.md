# DOKUMEN SPESIFIKASI BISNIS & KEBUTUHAN FUNGSIONAL (BRD / FSD)
## SISTEM ORIGINASI PEMBIAYAAN & MANAJEMEN NASABAH (LOS-CRM)
### PT LIUGONG FINANCE INDONESIA

---

| Parameter Dokumen | Informasi |
| :--- | :--- |
| **Judul Dokumen** | Business Requirements Document (BRD) & Functional Specification Document (FSD) |
| **Nama Sistem** | LiuGong Finance Origination Workspace & Customer Relationship Management (LOS-CRM) |
| **Kode Proyek** | LFI-LOS-CRM-2026 |
| **Versi Dokumen** | 3.2.0 (Executive & Strategic Vision Edition) |
| **Tanggal Efektif** | 19 Oktober 2026 |
| **Disusun Untuk** | Latom (Presentation to President Director & Board of Directors) |
| **Target Pengguna** | President Director, Credit Committee, Marketing (MKT), Branch Support (BS), Head of BS, Credit Analyst (CA), Legal |
| **Status Dokumen** | APPROVED & STRATEGIC PRODUCTION BASELINE |

---

## DAFTAR ISI
1. [BAB 1: Eksekutif Ringkasan, Visi Bisnis & Sasaran Strategis](#bab-1-eksekutif-ringkasan-visi-bisnis--sasaran-strategis)
2. [BAB 2: Glosarium, Kamus Terminologi & Singkatan Finansial](#bab-2-glosarium-kamus-terminologi--singkatan-finansial)
3. [BAB 3: Pipa Strategis 4-Tahap Utama (The 4-Stage Strategic Pipeline)](#bab-3-pipa-strategis-4-tahap-utama-the-4-stage-strategic-pipeline)
   - 3.1. [Tahap 1: FAP Stage & Multi-Document AI/OCR Intake](#31-tahap-1-fap-stage--multi-document-aiocr-intake)
   - 3.2. [Gateway Interkoneksi: Pefindo Biro Kredit Ingestion Bridge](#32-gateway-interkoneksi-pefindo-biro-kredit-ingestion-bridge)
   - 3.3. [Tahap 2: Pre-Analysis & Early Risk Gatekeeping](#33-tahap-2-pre-analysis--early-risk-gatekeeping)
   - 3.4. [Tahap 3: ICLF (Initial Credit Limit Facility)](#34-tahap-3-iclf-initial-credit-limit-facility)
   - 3.5. [Tahap 4: Proposal Pembiayaan Final & Putusan Komite](#35-tahap-4-proposal-pembiayaan-final--putusan-komite)
4. [BAB 4: Spesifikasi Rinci Modul & Antarmuka Aplikasi](#bab-4-spesifikasi-rinci-modul--antarmuka-aplikasi)
   - 4.1. [Workspace Split 50-50 & Form 5-Modul Accordion](#41-workspace-split-50-50--form-5-modul-accordion)
   - 4.2. [Suite AI/OCR Multidokumen (NIB, KTP, Paspor, NPWP, E-KITAS)](#42-suite-aiocr-multidokumen-nib-ktp-paspor-npwp-e-kitas)
   - 4.3. [Digital Twin Pratinjau Lembar FAP Excel 118-Baris](#43-digital-twin-pratinjau-lembar-fap-excel-118-baris)
   - 4.4. [Tata Kelola Pemegang Saham & Stakeholders (Aturan 100%)](#44-tata-kelola-pemegang-saham--stakeholders-aturan-100)
   - 4.5. [Modul Proyek & Fasilitas Perbankan Eksisting](#45-modul-proyek--fasilitas-perbankan-eksisting)
   - 4.6. [Proposal Pembiayaan & Inventaris Unit Alat Berat LiuGong](#46-proposal-pembiayaan--inventaris-unit-alat-berat-liugong)
   - 4.7. [Spreading Keuangan 3 Tahun & Validasi Keseimbangan Neraca](#47-spreading-keuangan-3-tahun--validasi-keseimbangan-neraca)
   - 4.8. [Tata Kelola Akta Legalitas & WYSIWYG TinyMCE](#48-tata-kelola-akta-legalitas--wysiwyg-tinymce)
   - 4.9. [Meja Dokumen Digital & Enkripsi S3 Presigned](#49-meja-dokumen-digital--enkripsi-s3-presigned)
5. [BAB 5: Matriks Wewenang, Peran Organisasi & RACI Matrix](#bab-5-matriks-wewenang-peran-organisasi--raci-matrix)
6. [BAB 6: Alur Persetujuan Kredit & Mesin Status (State Machine)](#bab-6-alur-persetujuan-kredit--mesin-status-state-machine)
7. [BAB 7: Logika Validasi Bisnis, Formula Finansial & Aktuaria](#bab-7-logika-validasi-bisnis-formula-finansial--aktuaria)
8. [BAB 8: Kepatuhan Regulasi OJK, UU PDP & Jejak Audit Tak Terubahkan](#bab-8-kepatuhan-regulasi-ojk-uu-pdp--jejak-audit-tak-terubahkan)
9. [BAB 9: Master Data, Wilayah Administratif & Standar Industri KBLI](#bab-9-master-data-wilayah-administratif--standar-industri-kbli)
10. [BAB 10: Metrik Keberhasilan Bisnis, KPI & Standar SLA](#bab-10-metrik-keberhasilan-bisnis-kpi--standar-sla)

---

## BAB 1: Eksekutif Ringkasan, Visi Bisnis & Sasaran Strategis

### 1.1. Latar Belakang & Visi Presiden Direktur
PT LiuGong Finance Indonesia (LFI) sebagai entitas pembiayaan modal resmi (*captive finance*) dari LiuGong Heavy Machinery mengemban misi strategis untuk mempercepat penetrasi penjualan alat berat di sektor-sektor unggulan nasional: pertambangan nikel, batubara, perkebunan kelapa sawit, kehutanan, dan mega-proyek infrastruktur.

Sistem **Origination Workspace & CRM (LOS-CRM)** ini dirancang atas visi kepemimpinan modern untuk mentransformasikan operasi pembiayaan tradisional yang serba lambat dan manual menjadi **Fintech-Grade Enterprise Platform**. Sistem ini memposisikan LiuGong Finance Indonesia selangkah di depan kompetitor dalam hal:
1. **Kecepatan Layanan (Speed of Delivery):** Menjawab kebutuhan debitur tambang dan kontraktor yang membutuhkan kepastian unit alat berat di lapangan dalam hitungan hari, bukan minggu.
2. **Akurasi Risiko Sejak Detik Pertama (Risk Precision from Second Zero):** Memangkas risiko *Non-Performing Financing (NPF)* melalui verifikasi identitas instan via AI/OCR dan integrasi data biro kredit Pefindo.
3. **Efisiensi Beban Kerja Operasional (Zero Manual Redundancy):** Mengeliminasi pengetikan ulang data (*re-keying*), mencegah kesalahan matematis angsuran, serta mengamankan kepatuhan penuh terhadap regulasi Otoritas Jasa Keuangan (OJK).

---

## BAB 2: Glosarium, Kamus Terminologi & Singkatan Finansial

| Istilah / Singkatan | Definisi Bisnis & Operasional |
| :--- | :--- |
| **LOS-CRM** | *Loan Origination System & Customer Relationship Management* — Platform terintegrasi end-to-end yang mengelola siklus permohonan kredit nasabah dan hubungan portofolio pembiayaan. |
| **FAP STAGE** | Tahap awal intake permohonan (*Financing Application Proposal*) di mana seluruh profil nasabah, armada mesin, dan dokumen legalitas diinput dan diverifikasi. |
| **PRE-ANALYSIS** | Tahap analisis kelayakan awal (*feasibility screening*) berbasis scoring historis dan kapabilitas operasional debitur sebelum evaluasi komprehensif. |
| **ICLF** | *Initial Credit Limit Facility* — Penetapan pagu batas atas kredit maksimum yang dapat dinikmati oleh satu grup usaha debitur. |
| **PROPOSAL** | Tahap penyusunan proposal fasilitas pembiayaan formal lengkap dengan struktur komersial, kalkulasi bunga anuitas, dan rekomendasi komite kredit. |
| **PEFINDO OCR / API** | Integrasi sistem ke Pefindo Biro Kredit (Credit Bureau) untuk menarik riwayat kredit, skor kredit IdScore, dan total eksposur utang terbuka debitur. |
| **Multi-Doc AI/OCR** | Mesin kecerdasan buatan pemindai dokumen legal otomatis (NIB, KTP, Paspor, NPWP, E-KITAS) yang mengekstrak data instan tanpa pengetikan manual. |
| **Digital Twin FAP** | Visualisasi digital interaktif 118-baris yang mencerminkan format fisik lembar kerja Excel resmi perusahaan secara *real-time*. |

---

## BAB 3: Pipa Strategis 4-Tahap Utama (The 4-Stage Strategic Pipeline)

Sistem mengadopsi kerangka kerja 4 tahap progresif yang linear, akuntabel, dan transparan bagi jajaran manajemen:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   1. FAP STAGE  │ ────► │ 2. PRE-ANALYSIS │ ────► │    3. ICLF      │ ────► │   4. PROPOSAL   │
│                 │       │                 │       │                 │       │                 │
│ • Profil Debitur│       │ • Scoring Risiko│       │ • Batas Pagu    │       │ • Struktur Bunga│
│ • Multi-Doc OCR │       │ • Analisis Awal │       │ • Group Limit   │       │ • Legal Sign-off│
│ • Digital Twin  │       │ • Rekomendasi   │       │ • Evaluasi DP   │       │ • Putusan Komite│
└────────┬────────┘       └────────┬────────┘       └─────────────────┘       └─────────────────┘
         │                         ▲
         │    [GATEWAY CERDAS]     │
         └──►  PEFINDO OCR / API  ──┘
              • IdScore Inquiry
              • Credit Score 250-900
              • Debt Exposure Check
```

---

### 3.1. Tahap 1: FAP Stage & Multi-Document AI/OCR Intake
FAP Stage adalah gerbang utama pendaftaran debitur baru maupun penambahan unit nasabah eksisting. Keunggulan mutakhir yang disematkan pada tahap ini adalah **Multi-Document AI/OCR Suite**:
* **NIB (Nomor Induk Berusaha):** Ekstraksi otomatis 13 digit NIB, Nama Perusahaan, Alamat, Kode Pos, dan Tanggal Terbit dari sertifikat standar OSS Kemeninvestasi/BKPM.
* **e-KTP (Kartu Tanda Penduduk WNI):** Ekstraksi 16 digit NIK, Nama Lengkap, Tanggal Lahir, Jenis Kelamin, dan Alamat Domisili Direksi/Komisaris WNI.
* **PASSPORT & E-KITAS (Stakeholder Asing / Expatriate):** Ekstraksi nomor paspor, masa berlaku, dan identitas izin tinggal terbatas bagi jajaran Direksi atau Pemegang Saham WNA.
* **NPWP (Nomor Pokok Wajib Pajak):** Ekstraksi 15/16 digit NPWP Badan maupun Perorangan untuk validasi kepatuhan perpajakan di DJP.
* **Keunggulan Bisnis:** Menghilangkan waktu pengetikan hingga 85%, meniadakan salah ketik angka krusial, dan mempercepat penyelesaian berkas di hari yang sama.

---

### 3.2. Gateway Interkoneksi: Pefindo Biro Kredit Ingestion Bridge
Di antara FAP Stage dan Pre-Analysis, sistem menyediakan **Gateway Interkoneksi Cerdas**:
* **Mekanisme Pemicu Otomatis:** Begitu data identitas perusahaan (NIB & NPWP) serta data pengurus kunci (NIK KTP / Paspor) berhasil diverifikasi di FAP Stage, sistem dapat langsung melakukan *inquiry* ke sistem Pefindo Biro Kredit melalui API terenkripsi atau pemrosesan laporan Pefindo OCR.
* **Data Intelijen Finansial yang Ditarik:**
  1. **Pefindo Credit Score & Rating:** Skala skor kredit objektif (misal: 650–850) beserta probabilitas gagal bayar (*Probability of Default - PD*).
  2. **Matriks Riwayat Kredit Historis:** Rekam jejak kelancaran pembayaran cicilan dan riwayat tunggakan di lembaga pembiayaan dan perbankan.
  3. **Total Fasilitas Utang Berjalan (Active Debt Exposure):** Plafon total pinjaman yang sedang dinikmati debitur saat ini, besaran angsuran bulanan eksisting, serta jaminan yang sedang diagunkan di lembaga lain.
  4. **Peringatan Dini (Red Flags):** Deteksi otomatis jika debitur memiliki riwayat restrukturisasi kredit, gugatan perdata, atau cek kosong.
* **Dampak Strategis bagi Presiden Direktur:** Manajemen tidak lagi 'membeli kucing dalam karung'. Profil risiko debitur langsung terkuak secara transparan sebelum tim analis melangkah lebih jauh.

---

### 3.3. Tahap 2: Pre-Analysis & Early Risk Gatekeeping
* **Tujuan Strategis:** Menyaring permohonan di garis depan (*early gatekeeping*) guna menghemat waktu dan sumber daya organisasi.
* **Logika Kerja:**
  * Mengombinasikan data intelijen Pefindo dengan profil sektor usaha debitur (misal: rasio utilisasi alat di tambang nikel Morowali vs perkebunan sawit Riau).
  * Sistem memberikan indikator lampu hijau (*Go*), kuning (*Review with Extra Collateral*), atau merah (*No-Go*) secara objektif.
  * Mencegah aplikasi bermasalah masuk ke tahap perancangan proposal yang memakan waktu komite.

---

### 3.4. Tahap 3: ICLF (Initial Credit Limit Facility)
* **Tujuan Strategis:** Menetapkan batas tertinggi (*ceiling limit*) pembiayaan yang prudent bagi satu grup nasabah.
* **Elemen Evaluasi ICLF:**
  1. **Single Borrower / Group Limit:** Memastikan plafon yang diajukan tidak melanggar ketentuan Batas Maksimum Penyaluran Pembiayaan (BMPP) internal LiuGong Finance dan regulasi OJK.
  2. **Kapasitas Serap Modal:** Mengukur rasio kecukupan modal debitur terhadap jumlah unit alat berat LiuGong yang dipesan.
  3. **Struktur Uang Muka (Down Payment):** Penetapan batas minimum DP (10%, 20%, atau 30%) disesuaikan dengan tingkat risiko yang dihasilkan pada tahap Pre-Analysis.

---

### 3.5. Tahap 4: Proposal Pembiayaan Final & Putusan Komite
* **Tujuan Strategis:** Dossier lengkap permohonan kredit siap sidangkan di hadapan Komite Kredit untuk pencairan fasilitas.
* **Cakupan Dokumen:**
  * Penentuan skema pembiayaan resmi (*Financial Lease*, *Sale & Leaseback*, *Installment Financing*).
  * Rincian nomor seri unit mesin LiuGong, model, spesifikasi tonase, dan harga OTR.
  * Jadwal angsuran anuitas efektif bunga menurun (*reducing balance annuity schedule*).
  * Laporan keuangan spreading 3 tahun dengan verifikasi neraca seimbang persis (*Balance Sheet Integrity*).
  * Opini Yuridis formal (*Legal Opinion*) dan rekomendasi Credit Analyst.
  * Tanda tangan digital Komite Kredit dengan cap audit permanen (*Approval Lock*).

---

## BAB 4: Spesifikasi Rinci Modul & Antarmuka Aplikasi

### 4.1. Workspace Split 50-50 & Form 5-Modul Accordion
Formulir permohonan dirancang dalam format Split 50-50 berdampingan yang elegan, membagi 35+ field input ke dalam 5 modul kartu accordion terstruktur:
1. `01. Identitas & Klasifikasi Debitur`: Kategori bisnis (`CORPORATE`, `COMMERCIAL`, `MICRO`, `LIUGONG_USER`), cabang, status kepemilikan kantor.
2. `02. Kantor Registrasi & Domisili Perusahaan`: Hierarki alamat administratif lengkap (Provinsi s/d RT/RW dan Kode Pos).
3. `03. Profil Usaha & Legalitas Akta`: NIB 13 digit dengan tombol OCR, NPWP, Akta Pendirian, masa beroperasi perusahaan.
4. `04. Kontak Utama / Penanggung Jawab (PIC)`: Data lengkap kontak operasional dan alamat tempat tinggal PIC.
5. `05. Segmentasi Industri & Proyek Berjalan`: Sektor industri (Mining, Construction, dll.), peran usaha (Owner, Kontraktor, Rental), dan deskripsi bisnis.

### 4.2. Suite AI/OCR Multidokumen (NIB, KTP, Paspor, NPWP, E-KITAS)
* **Pemrosesan di Sisi Klien (WASM Privacy):** Dokumen sensitif nasabah dipindai menggunakan engine Tesseract WebAssembly lokal tanpa risiko kebocoran data di server eksternal, menjamin kepatuhan penuh terhadap UU Pelindungan Data Pribadi (UU PDP).
* **Integrasi Tepat Sasaran:**
  * NIB OCR: Tersemat rapi di baris label header sebagai pill badge `[ 📷 Scan OCR NIB ]` yang menjaga kotak input tetap 100% full-width simetris.
  * KTP/Paspor/NPWP OCR: Mendukung auto-populate data pemegang saham dan organ direksi pada tab Stakeholders.

### 4.3. Digital Twin Pratinjau Lembar FAP Excel 118-Baris
* Menampilkan visualisasi persis dari dokumen fisik `Application Form APPROVED(mandatory field).xlsx` lengkap dengan logo resmi LiuGong Finance Indonesia (`image2.jpg`).
* **Sinkronisasi Dua Arah (Bidirectional Auto-Sync):**
  * Perubahan pada input di form kiri memicu scroll otomatis ke baris sel di lembar Excel kanan disertai animasi *pulsing blue highlight* selama 2500ms.
  * Ribbon bar di kanan dilengkapi 5 tombol quick-jump chips (`1. Identitas` s/d `5. Proyek`) untuk melompat cepat antar bagian dokumen.

### 4.4. Tata Kelola Pemegang Saham & Stakeholders (Aturan 100%)
* **Strict 100% Equity Validation:** Sistem menolak pengajuan permohonan jika total porsi kepemilikan saham tidak genap persis 100.00% ($\pm 0.01\%$).
* **Kepatuhan APU-PPT:** Mengidentifikasi secara transparan *Ultimate Beneficial Owner (UBO)* yang memiliki saham di atas 25%.

### 4.5. Modul Proyek & Fasilitas Perbankan Eksisting
* Pencatatan kontrak kerja tambang/infrastruktur (Pemilik Proyek, Lokasi, Peran, Status Kontrak).
* Pencatatan fasilitas kredit di bank lain (Plafon, Angsuran Bulanan, Bunga, Track Record Pembayaran).

### 4.6. Proposal Pembiayaan & Inventaris Unit Alat Berat LiuGong
* Multi-unit inventory repeater: Kategori Unit (`HE` vs `TRUCK`), Model (e.g. *CLG922E*, *CLG856H*), Kelas Tonase, Jumlah Unit, dan Spesifikasi.
* Skema komersial: Nilai Unit, DP (wajib lebih kecil dari nilai unit), Security Deposit, Tenor (hingga 60 bulan), Suku Bunga p.a., dan Opsi Pembayaran (`In Arrear` vs `In Advance`).

### 4.7. Spreading Keuangan 3 Tahun & Validasi Keseimbangan Neraca
* Menampung laporan keuangan hingga 3 tahun buku terakhir.
* **Enforced Balance Sheet Equilibrium:** Menggunakan kalkulasi integer sen (*BigInt cents*) yang menjamin:
  $$\text{Total Aset} \equiv \text{Total Liabilitas} + \text{Ekuitas}$$
* Kalkulasi 5 rasio profitabilitas dan solvabilitas (Current Ratio, DER, GPM, OPM, NPM, ROA, ROE) secara instan dan bebas galat `Infinity`.

### 4.8. Tata Kelola Akta Legalitas & WYSIWYG TinyMCE
* Pemisahan tabel 2-tingkat: *Akta Aktif & Rujukan Terkini* di atas, dan *Riwayat Akta Lama* di bawah.
* Editor catatan akta TinyMCE dengan normalisasi otomatis daftar bernomor kontinu (`<ol>`) untuk mencegah format nomor melompat.
* Matriks perbandingan legalitas (*Deed Comparison Matrix*) yang memetakan perubahan modal dan pengurus antar versi akta.

### 4.9. Meja Dokumen Digital & Enkripsi S3 Presigned
* Checklist kelengkapan berkas wajib sesuai profil nasabah.
* Penyimpanan objek privat di AWS S3 dengan tautan aman bertanda tangan digital (*presigned URL*) yang kedaluwarsa otomatis dalam 15 menit.

---

## BAB 5: Matriks Wewenang, Peran Organisasi & RACI Matrix

Sistem menegakkan prinsip *Separation of Duties (Four-Eyes & Six-Eyes Principle)*:

| Departemen / Peran | Jabatan Kunci | Tanggung Jawab Utama dalam Sistem |
| :--- | :--- | :--- |
| **MKT** | Marketing / Relationship Mgr | Pendaftaran nasabah, pengoperasian OCR, penyusunan draf awal berkas. |
| **BS** | Branch Support (Arianti) | Verifikasi keabsahan fisik berkas, pemadanan data KTP/NIB di cabang. |
| **HEAD_BS** | Head of BS (Dellatra) | Persetujuan resmi cabang atas keabsahan akta dan kelayakan berkas. |
| **CA** | Credit Analyst / Risk Underwriter | Spreading keuangan 3 tahun, evaluasi skor Pefindo, rekomendasi limit kredit. |
| **LEGAL** | Legal Specialist | Pemeriksaan kepatuhan notaris, perikatan fidusia jaminan, opini hukum. |
| **COMMITTEE** | President Director & Komite | Sidang putusan akhir kredit: *APPROVED* atau *REJECTED*. |

---

## BAB 6: Alur Persetujuan Kredit & Mesin Status (State Machine)

Sistem memberlakukan 8 status transisi yang terkunci secara deterministik:
$$\text{DRAFT} \longrightarrow \text{SUBMITTED\_TO\_BS} \longleftrightarrow \text{RETURNED}$$
$$\text{SUBMITTED\_TO\_BS} \longrightarrow \text{BS\_VERIFIED} \longrightarrow \text{IN\_CA\_LEGAL\_REVIEW} \longrightarrow \text{CREDIT\_COMMITTEE\_REVIEW} \longrightarrow \text{APPROVED / REJECTED}$$

* **Dual Sign-Off Gate:** Berkas tidak dapat melangkah ke Komite Kredit jika salah satu dari Credit Analyst atau Legal belum memberikan rekomendasi persetujuan tertulis di sistem.
* **Approval Freeze Lock:** Aplikasi yang berstatus *APPROVED* terkunci secara permanen menjadi arsip hukum *read-only*.

---

## BAB 7: Logika Validasi Bisnis, Formula Finansial & Aktuaria

### 7.1. Rumus Anuitas Bunga Efektif (Reducing Balance Annuity)
$$\text{PMT} = \frac{PV \times r}{1 - (1 + r)^{-n}}$$
* $PV$ = Total Pokok Pembiayaan Bersih ($\text{Harga Unit} - \text{Down Payment}$).
* $r$ = Suku bunga per bulan ($\frac{\text{Suku Bunga Tahunan}}{12}$).
* $n$ = Tenor dalam bulan.

### 7.2. Integritas Batas Nilai & Penjaga Keuangan
* Tanggal akta dan dokumen historis dibatasi antara tahun 1900 hingga tanggal hari ini (`today`).
* Angka keuangan mendukung hingga skala 10 kuadriliun rupiah dengan toleransi maksimal 2 angka desimal.

---

## BAB 8: Kepatuhan Regulasi OJK, UU PDP & Jejak Audit Tak Terubahkan

1. **Kepatuhan UU PDP No. 27/2022:** Tidak ada data nasabah yang bocor ke publik; pemrosesan OCR dilakukan di memori lokal peramban; tautan berkas privat dengan waktu kedaluwarsa ketat.
2. **Kepatuhan Regulasi OJK (POJK Pembiayaan):** Dokumentasi digital memenuhi standar pembuktian hukum dan pemeriksaan audit kepatuhan multifinance.
3. **Catatan Audit Tak Terubahkan (Immutable Trigger Log):** Tabel `audit_logs` dilindungi pemicu basis data tingkat kernel yang memblokir keras setiap perintah `UPDATE` dan `DELETE`. Setiap klik dan perubahan status tercatat abadi beserta stempel waktu, IP address, dan ID aktor.

---

## BAB 9: Master Data, Wilayah Administratif & Standar Industri KBLI

* **Katalog Wilayah Nasional:** 38 Provinsi, 514 Kota/Kabupaten, ribuan Kecamatan dan Kelurahan, serta kodifikasi pos otomatis.
* **Klasifikasi KBLI Industri:** Sektor Pertambangan, Pertanian/Perkebunan, Kehutanan, Konstruksi, dan Migas yang dipetakan langsung dengan matriks selera risiko (*risk appetite*) perusahaan.

---

## BAB 10: Metrik Keberhasilan Bisnis, KPI & Standar SLA

| Indikator Kinerja Utama (KPI) | Sebelum Sistem | Target Sistem Baru (LOS-CRM) |
| :--- | :---: | :---: |
| **Turnaround Time (TAT) Siklus Kredit** | 10 – 14 Hari Kerja | **$\le$ 48 Jam (2 Hari Kerja)** |
| **Waktu Pendaftaran & Input Data Debitur** | 4 – 6 Jam | **$\le$ 30 Menit (dengan Multi-Doc AI/OCR)** |
| **Waktu Penarikan Laporan Kredit Pefindo** | 1 – 2 Hari Kerja | **Real-time (Detik) via Pefindo Bridge** |
| **Tingkat Retur Berkas (*Defect Rate*)** | 35% – 40% permohonan | **$\le$ 3% permohonan** |
| **Akurasi Validasi Neraca & Saham** | Rentan salah hitung | **100% Zero-Error (Tervalidasi Sistem)** |
| **Ketersediaan Layanan Operasional** | Tergantung jam kantor | **24/7 Digital High Availability** |

---

### Lembar Pengesahan Spesifikasi Bisnis

| Disusun & Diajukan Oleh | Ditelaah & Disetujui Oleh |
| :---: | :---: |
| <br/><br/>**Latom**<br/>Lead Project In-Charge & System Owner | <br/><br/>**Presiden Direktur**<br/>PT LiuGong Finance Indonesia |
