# DOKUMEN SPESIFIKASI BISNIS & KEBUTUHAN FUNGSIONAL (BRD / FSD)
## SISTEM ORIGINASI PEMBIAYAAN & MANAJEMEN NASABAH (LOS-CRM)
### PT LIUGONG FINANCE INDONESIA

---

| Parameter Dokumen | Informasi |
| :--- | :--- |
| **Judul Dokumen** | Business Requirements Document (BRD) & Functional Specification Document (FSD) |
| **Nama Sistem** | LiuGong Finance Origination Workspace & Customer Relationship Management (LOS-CRM) |
| **Kode Proyek** | LFI-LOS-CRM-2026 |
| **Versi Dokumen** | 3.0.0 (Master Enterprise Specification) |
| **Tanggal Efektif** | 19 Oktober 2026 |
| **Penyusun** | AI CTO & Enterprise Systems Architect for Latom |
| **Target Pengguna** | Marketing (MKT), Branch Support (BS), Head of BS, Credit Analyst (CA), Legal, Credit Committee, Management |
| **Status Dokumen** | APPROVED & PRODUCTION READY |

---

## DAFTAR ISI
1. [BAB 1: Latar Belakang, Visi Bisnis & Sasaran Strategis](#bab-1-latar-belakang-visi-bisnis--sasaran-strategis)
2. [BAB 2: Glosarium, Kamus Terminologi & Singkatan Finansial](#bab-2-glosarium-kamus-terminologi--singkatan-finansial)
3. [BAB 3: Peta Arsitektur Bisnis & Alur Pengguna (User Journey)](#bab-3-peta-arsitektur-bisnis--alur-pengguna-user-journey)
4. [BAB 4: Spesifikasi Rinci Modul & Antarmuka Aplikasi](#bab-4-spesifikasi-rinci-modul--antarmuka-aplikasi)
   - 4.1. [Modul Portofolio & Pipeline Aplikasi (Overview & Applications)](#41-modul-portofolio--pipeline-aplikasi-overview--applications)
   - 4.2. [Workspace Split 50-50 & Customer Detail (Tab 0)](#42-workspace-split-50-50--customer-detail-tab-0)
   - 4.3. [Mesin OCR Pemindaian NIB OSS (Tesseract Client-Side Engine)](#43-mesin-ocr-pemindaian-nib-oss-tesseract-client-side-engine)
   - 4.4. [Digital Twin Pratinjau Lembar FAP Excel 118-Baris](#44-digital-twin-pratinjau-lembar-fap-excel-118-baris)
   - 4.5. [Tata Kelola Pemegang Saham & Stakeholders (Tab 1)](#45-tata-kelola-pemegang-saham--stakeholders-tab-1)
   - 4.6. [Modul Proyek & Fasilitas Perbankan Eksisting (Tab 2)](#46-modul-proyek--fasilitas-perbankan-eksisting-tab-2)
   - 4.7. [Proposal Pembiayaan & Inventaris Unit Alat Berat (Tab 3)](#47-proposal-pembiayaan--inventaris-unit-alat-berat-tab-3)
   - 4.8. [Spreading Keuangan 3 Tahun & Analisis Rasio (Tab 4)](#48-spreading-keuangan-3-tahun--analisis-rasio-tab-4)
   - 4.9. [Tata Kelola Akta Legalitas & Notaris (Tab 5)](#49-tata-kelola-akta-legalitas--notaris-tab-5)
   - 4.10. [Meja Dokumen Digital & Penyimpanan S3 (Tab 6)](#410-meja-dokumen-digital--penyimpanan-s3-tab-6)
5. [BAB 5: Matriks Wewenang, Peran Organisasi & RACI Matrix](#bab-5-matriks-wewenang-peran-organisasi--raci-matrix)
6. [BAB 6: Alur Persetujuan Kredit & Mesin Status (State Machine)](#bab-6-alur-persetujuan-kredit--mesin-status-state-machine)
7. [BAB 7: Logika Validasi Bisnis, Formula Finansial & Aktuaria](#bab-7-logika-validasi-bisnis-formula-finansial--aktuaria)
8. [BAB 8: Kepatuhan Regulasi, Privasi Data (UU PDP) & Jejak Audit](#bab-8-kepatuhan-regulasi-privasi-data-uu-pdp--jejak-audit)
9. [BAB 9: Master Data, Wilayah Administratif & Standar KBLI](#bab-9-master-data-wilayah-administratif--standar-kbli)
10. [BAB 10: Metrik Keberhasilan Bisnis, KPI & Standar SLA](#bab-10-metrik-keberhasilan-bisnis-kpi--standar-sla)

---

## BAB 1: Latar Belakang, Visi Bisnis & Sasaran Strategis

### 1.1. Latar Belakang Bisnis
PT LiuGong Finance Indonesia (LFI) merupakan entitas pembiayaan modal (*captive finance*) yang melayani penyediaan fasilitas sewa pembiayaan (*financial lease*), jual dan sewa-balik (*sale and leaseback*), serta pembelian pembayaran bertahap (*installment financing*) untuk alat berat konstruksi, pertambangan, kehutanan, dan logistik merk LiuGong serta armada truk pendukung di seluruh Indonesia.

Sebelum hadirnya sistem LOS-CRM ini, proses origination kredit menghadapi sejumlah tantangan operasional:
1. **Ketergantungan Lembar Kerja Excel Lepas:** Pengisian data permohonan menggunakan berkas Excel statis (`Application Form APPROVED`) rentan salah formula, ketidaksinkronan versi, dan keterputusan data riwayat nasabah.
2. **Proses Verifikasi Legalitas Berulang:** Pengecekan riwayat akta pendirian dan akta perubahan AHU Kemenkumham dilakukan manual tanpa visualisasi perbandingan (*delta matrix*), memperlambat verifikasi yuridis.
3. **Risiko Ketidakseimbangan Finansial & Pemegang Saham:** Sering ditemukan permohonan dengan persentase pemegang saham yang tidak genap 100% atau laporan keuangan neraca yang tidak *balance* antara Aset dengan Liabilitas + Ekuitas.
4. **Siklus Persetujuan (Turnaround Time - TAT) yang Lambat:** Berkas fisik atau email manual memakan waktu 7 hingga 14 hari kerja untuk menyelesaikan rantai verifikasi dari cabang hingga Komite Kredit.

### 1.2. Visi & Tujuan Strategis Sistem
Sistem LOS-CRM dirancang untuk mencapai sasaran bisnis berikut:
* **Single Source of Truth:** Seluruh data pemohon, legalitas, dokumen jaminan, unit alat berat, dan riwayat analisis kredit terkonsolidasi dalam satu basis data relasional yang aman.
* **Akselerasi SLA Kredit:** Memangkas SLA pemrosesan dari 14 hari menjadi **maksimal 48 jam** (2 hari kerja) melalui otomatisasi alur kerja dan validasi instan.
* **Pencegahan Fraud & Human Error:** Mengunci kalkulasi aktuaria angsuran, validasi NIB resmi melalui OCR OSS, serta penegakan validasi ketat neraca dan komposisi saham secara *real-time*.
* **Digital Twin Parity:** Memberikan rasa nyaman bagi tim bisnis dengan mempertahankan format lembar resmi FAP Excel standar perusahaan melalui antarmuka visual kembar berdampingan (*Side-by-Side 50-50 Split*).

---

## BAB 2: Glosarium, Kamus Terminologi & Singkatan Finansial

Untuk memastikan keselarasan istilah antara pemangku kepentingan bisnis, operasional, hukum, dan teknologi informasi:

| Istilah / Singkatan | Definisi Bisnis & Operasional |
| :--- | :--- |
| **LOS** | *Loan Origination System* — Sistem inti yang menangani seluruh siklus awal permohonan pembiayaan mulai dari intake data, verifikasi berkas, mitigasi risiko, hingga persetujuan komite. |
| **FAP** | *Financing Application Proposal* — Dokumen proposal permohonan kredit resmi berisi ikhtisar debitur, unit yang dibiayai, struktur fasilitas, analisis keuangan, dan legalitas. |
| **Pre-Analysis** | Tahap asesmen awal kelayakan debitur sebelum proposal formal diajukan ke komite kredit lengkap. |
| **ICLF** | *Initial Credit Limit Facility* — Penetapan pagu batas atas kredit yang dapat dinikmati oleh satu grup usaha nasabah. |
| **NIB** | *Nomor Induk Berusaha* — Identitas tunggal pelaku usaha berformat 13 digit angka yang diterbitkan oleh Lembaga OSS Kementerian Investasi/BKPM. |
| **NPWP** | *Nomor Pokok Wajib Pajak* — Identitas perpajakan 15 digit (lama) atau 16 digit NIK/NPWP (format baru DJP). |
| **SKT & SPPKP** | *Surat Keterangan Terdaftar* dan *Surat Pengukuhan Pengusaha Kena Pajak* yang membuktikan legalitas kepatuhan pajak perusahaan. |
| **AHU Kemenkumham** | Administrasi Hukum Umum — Pengesahan keputusan Menteri Hukum dan HAM atas Akta Pendirian atau Akta Perubahan Anggaran Dasar perseroan. |
| **Financial Lease** | Sewa Pembiayaan — Skema sewa guna usaha di mana hak opsi untuk membeli barang modal berada pada penyewa guna usaha (debitur) di akhir masa sewa. |
| **Sale and Leaseback** | Jual dan Sewa-Balik — Skema di mana debitur menjual unit alat berat miliknya kepada perusahaan pembiayaan untuk mendapatkan likuiditas modal kerja, lalu menyewanya kembali. |
| **Installment Financing** | Pembiayaan Pembelian Pembayaran Bertahap — Skema penyediaan barang modal dengan pelunasan angsuran secara berkala. |
| **In Advance** | Pembayaran angsuran pertama dilakukan di muka saat pencairan fasilitas pembiayaan. |
| **In Arrear** | Pembayaran angsuran pertama dilakukan di akhir periode bulan pertama masa sewa. |
| **Reducing Balance Annuity** | Metode perhitungan bunga efektif di mana porsi bunga menurun seiring berkurangnya sisa pokok pinjaman (*outstanding principal*). |
| **DER** | *Debt to Equity Ratio* — Rasio total liabilitas terhadap ekuitas untuk mengukur tingkat leverage utang debitur. |
| **Current Ratio** | Rasio lancar (Aset Lancar / Liabilitas Jangka Pendek) untuk mengukur kemampuan likuiditas jangka pendek. |
| **GPM / OPM / NPM** | *Gross Profit Margin*, *Operating Profit Margin*, dan *Net Profit Margin* — Metrik profitabilitas usaha debitur. |
| **ROA / ROE** | *Return on Assets* dan *Return on Equity* — Rasio efektivitas pemanfaatan aset dan ekuitas dalam menghasilkan laba. |
| **UBO** | *Ultimate Beneficial Owner* (Pemilik Manfaat Akhir) — Individu yang memiliki kendali atau kepemilikan saham di atas 25% sesuai ketentuan APUPPT OJK. |

---

## BAB 3: Peta Arsitektur Bisnis & Alur Pengguna (User Journey)

Sistem memfasilitasi perjalanan pengguna (*end-to-end user journey*) yang terstruktur dalam 5 fase utama:

```
[FASE 1: INTAKE & REGISTRASI]
Marketing Officer (MKT) membuka dashboard -> Membuat permohonan baru ->
Mengunggah/Scan dokumen NIB OSS -> Memilih kategori bisnis & cabang registrasi ->
Mengisi modul form detail pelanggan (01 s/d 05).

                    │
                    ▼
[FASE 2: LEGALITAS & KEPEMILIKAN SAHAM]
MKT menginput Akta Pendirian & Akta Perubahan Terakhir -> Mengisi 100% susunan pemegang saham ->
Menyusun uraian catatan akta dengan editor TinyMCE -> Mengajukan akta ke Branch Support.

                    │
                    ▼
[FASE 3: VERIFIKASI CABANG & DUAL-CHECK]
Branch Support (Arianti / BS) memvalidasi keabsahan dokumen & data input ->
Head of BS (Dellatra) memberikan formal approval akta -> Status permohonan naik ke BS_VERIFIED.

                    │
                    ▼
[FASE 4: UNDERWRITING KREDIT & LEGAL OPINION]
Credit Analyst (CA) melakukan spreading laporan keuangan 3 tahun & evaluasi rasio ->
Legal Officer memeriksa keabsahan yuridis, penjamin, dan fidusia ->
Menerbitkan Credit Memo dan Legal Opinion formal.

                    │
                    ▼
[FASE 5: PUTUSAN KOMITE KREDIT & PENETAPAN FACILITY]
Credit Committee bersidang meninjau dossier digital utuh ->
Memberikan putusan bulat: APPROVED (Disetujui) atau REJECTED (Ditolak dengan alasan formal) ->
Sistem mengunci berkas dan mencatat cap audit permanen.
```

---

## BAB 4: Spesifikasi Rinci Modul & Antarmuka Aplikasi

### 4.1. Modul Portofolio & Pipeline Aplikasi (Overview & Applications)
* **Tujuan Bisnis:** Memberikan visibilitas terpadu atas seluruh jalur pipa (*pipeline*) pembiayaan aktif bagi pimpinan cabang dan kantor pusat.
* **Elemen Fungsional:**
  1. **Statistik Portofolio Ringkas:** Kartu metrik total aplikasi aktif, aplikasi dalam proses review cabang, aplikasi dalam evaluasi CA/Legal, dan total nilai fasilitas diajukan.
  2. **Filter Multidimensi:** Filter berdasarkan Cabang (Jakarta, Balikpapan, Palembang, Medan, Surabaya), Status Aplikasi (Draft, Submitted to BS, BS Verified, Under Review, Approved, Rejected, Returned), serta rentang tanggal pengajuan.
  3. **Pencarian Cepat:** Pencarian berbasis teks instan untuk Nomor FAP, Nama Perusahaan Debitur, atau Nama PIC.
  4. **Ekspor Laporan:** Tombol ekspor data tabular ke format CSV/Excel untuk rekonsiliasi berkas mingguan.

---

### 4.2. Workspace Split 50-50 & Customer Detail (Tab 0)
Antarmuka paling vital pada aplikasi, memadukan fleksibilitas pengisian formulir di sisi kiri dengan pratinjau dokumen lembar FAP resmi di sisi kanan.

#### Tata Letak Sisi Kiri: 5 Modul Accordion Terstruktur
Formulir dirancang dalam bentuk 5 kartu accordion bernomor yang dapat dibuka/tutup dengan indikator badge progres:

* **Modul 01: Identitas & Klasifikasi Debitur**
  * `companyName`: Nama resmi badan usaha sesuai akta (wajib).
  * `companyType`: Kategori bisnis (`CORPORATE`, `COMMERCIAL`, `MICRO`, `LIUGONG_USER`).
  * `customerStatus`: Hubungan nasabah (`NEW` / `EXISTING`).
  * `branchCode`: Cabang pemroses (`JKT01` - Jakarta, `BPN01` - Balikpapan, `PLB01` - Palembang, `MDN01` - Medan, `SBY01` - Surabaya).
  * `locationStatus`: Status kepemilikan tempat usaha (`OWNED` / Milik Sendiri vs `RENTED` / Sewa).
  * `repaymentSource`: Sumber utama pelunasan kewajiban (e.g. *Termin Kontrak Tambang Nikel*).

* **Modul 02: Kantor Registrasi & Domisili Perusahaan**
  * Hierarki Alamat Terpadu: Provinsi $\rightarrow$ Kota/Kabupaten $\rightarrow$ Kecamatan $\rightarrow$ Kelurahan/Desa $\rightarrow$ RT $\rightarrow$ RW $\rightarrow$ Kode Pos.
  * `companyAddress`: Alamat jalan lengkap kantor operasional/kantor pusat.
  * `phoneFax`: Nomor telepon dan faksimili kantor (validasi 7–15 digit).
  * `email`: Alamat email korespondensi resmi perusahaan.
  * `website`: Alamat situs resmi perusahaan.

* **Modul 03: Profil Usaha & Legalitas Akta**
  * `nib`: Nomor Induk Berusaha 13 digit angka murni dengan tombol aksi OCR terintegrasi di header field.
  * `npwp`: Nomor Pokok Wajib Pajak 15 atau 16 digit.
  * `establishmentActNo`: Nomor Akta Pendirian perseroan.
  * `establishmentDate`: Tanggal Akta Pendirian (format ISO `YYYY-MM-DD`, tidak boleh melampaui hari ini).
  * `experienceYears` & `experienceMonths`: Pengalaman beroperasi perusahaan dalam tahun dan bulan (0–11).
  * `latestDeedNo`: Nomor Akta Perubahan Anggaran Dasar Terakhir.
  * `latestDeedDate`: Tanggal Akta Perubahan Terakhir.

* **Modul 04: Kontak Utama / Penanggung Jawab (PIC)**
  * `picName`: Nama lengkap pejabat penghubung/PIC.
  * `position`: Jabatan dalam perusahaan (Direktur Utama, Finance Manager, Kuasa Direksi).
  * `phone` / `mobilePhone`: Nomor kontak seluler langsung PIC.
  * `email`: Alamat email kerja PIC.
  * `currentAddress`: Alamat tempat tinggal domisili PIC saat ini.
  * `city`, `province`, `postalCode`: Detail wilayah tempat tinggal PIC.

* **Modul 05: Segmentasi Industri & Proyek Berjalan**
  * `industrySegment`: Klasifikasi sektor (`MINING`, `AGRICULTURE`, `FORESTRY`, `CONSTRUCTION`, `OIL_AND_GAS`, `OTHER`).
  * `businessRole`: Peran usaha (`CONS_OWNER` / Pemilik Konsesi, `CONTRACTORS` / Kontraktor Utama, `SUB_CONT` / Sub-Kontraktor, `RENTAL` / Rental Alat Berat, `OTHER`).
  * `mainBusiness`: Deskripsi naratif komoditas utama dan kegiatan operasional harian.

---

### 4.3. Mesin OCR Pemindaian NIB OSS (Tesseract Client-Side Engine)
* **Aksesibilitas UI:** Tombol `[ 📷 Scan OCR NIB ]` terletak pada baris label field NIB sebagai pill badge yang elegan tanpa mengorbankan lebar kotak input.
* **Mekanisme Kerja:**
  1. Pengguna mengunggah gambar/scan berkas NIB OSS (format PDF, PNG, JPG).
  2. Engine Tesseract.js (WASM) memproses dokumen secara lokal di sisi peramban klien demi privasi data nasabah (tanpa mengirim berkas mentah ke API publik eksternal).
  3. Mesin regex mengekstrak 5 entitas kunci:
     * **Nomor NIB:** Pola 13 digit numerik persis.
     * **Nama Perusahaan:** Ekstraksi teks setelah label *Nama Perusahaan* / *Nama Pelaku Usaha*.
     * **Alamat Perusahaan:** Ekstraksi blok alamat domisili terdaftar.
     * **Kode Pos:** Pola 5 digit angka wilayah pos.
     * **Tanggal Pengesahan NIB:** Konversi format tanggal bahasa Indonesia (*contoh: 14 Maret 2022*) menjadi ISO `2022-03-14`.
  4. Pengguna melihat kotak dialog pratinjau hasil ekstraksi dan dapat menekan tombol `Terapkan ke Formulir` untuk mengisi field secara otomatis.

---

### 4.4. Digital Twin Pratinjau Lembar FAP Excel 118-Baris
Sisi kanan workspace menyajikan pratinjau dokumen lembar FAP yang 100% identik dengan berkas resmi `Application Form APPROVED(mandatory field).xlsx`:
* **Ribbon Bar Excel:** Dilengkapi kontrol zoom (Auto-Fit, 75%, 100%, 125%), tombol cetak/PDF, dan 5 quick-jump navigation chips.
* **Auto-Sync Dua Arah (Bidirectional Synchronization):**
  * Mengedit modul di form kiri mengalirkan data *live* ke sel tabel kanan dan memicu scroll otomatis ke section terkait dengan animasi seleksi border biru (*highlight pulse* 2500ms).
  * Menekan chip navigasi di kanan otomatis menggulir pratinjau dokumen dan membuka modul accordion yang sesuai di kiri.
* **Cakupan Struktur Lembar Resmi:**
  1. Kop resmi dengan Logo PT LiuGong Finance Indonesia (`image2.jpg`) dan Nomor Registrasi FAP unik.
  2. Bagian Identitas, Cabang, dan Tanggal Registrasi.
  3. Bagian Profil Perusahaan, Kontak PIC, dan Susunan Pemegang Saham.
  4. Bagian Tujuan Pembiayaan & Inventaris Fixed Assets Armada Eksisting.
  5. Bagian Segmentasi Industri & Kontrak Proyek Berjalan.
  6. Bagian Portofolio Rekening & Fasilitas Kredit Perbankan yang Dimiliki.
  7. Bagian Usulan Fasilitas Pembiayaan LiuGong & Checklist Kelengkapan Dokumen.
  8. Bagian Ikhtisar Laporan Keuangan 3 Tahun (Neraca & Laba Rugi).
  9. Klausul Pernyataan Debitur 4 Butir Hukum.
  10. Kolom Tanda Tangan Ganda: Debitur (tanda tangan & stempel cap perusahaan) dan Verifikasi Petugas Marketing PT LiuGong Finance Indonesia (kode formulir `ver 01/2025`).

---

### 4.5. Tata Kelola Pemegang Saham & Stakeholders (Tab 1)
* **Aturan Pokok Kepemilikan:**
  * Mendukung entitas Pemegang Saham Perorangan (*Individual*) dan Badan Usaha (*Corporate*).
  * **Aturan Saldo 100%:** Pada saat draft, persentase saham dapat diisi bertahap, namun saat permohonan diajukan (*submission*), total kepemilikan saham seluruh pemegang saham **wajib genap persis 100.00%** (toleransi pembulatan $\pm 0.01\%$).
* **Validasi Identitas Hukum:**
  * **WNI Perorangan:** Wajib mengisi KTP 16 digit angka valid.
  * **WNA Perorangan:** Wajib mencantumkan nomor Paspor (5–20 karakter alfanumerik) dan mengunggah checklist E-KITAS.
  * **Badan Usaha:** Wajib mencantumkan NPWP Badan 15 atau 16 digit.
* **Struktur Pengurus:** Pencatatan organ perseroan (Direktur Utama, Direktur, Komisaris Utama, Komisaris) lengkap dengan masa berlaku kepengurusan.

---

### 4.6. Modul Proyek & Fasilitas Perbankan Eksisting (Tab 2)
* **Daftar Kontrak Proyek Berjalan:**
  * Memetakan rekam jejak pekerjaan debitur: Pemilik Proyek (*Project Owner*, e.g. *PT Vale Indonesia Tbk*), Lokasi Proyek (*Project Location*, e.g. *Site Sorowako*), Peran dalam Proyek (*Contractor Role*, e.g. *Sub-kontraktor Hauling Batubara*), dan Status Kontrak (`EXISTING` vs `NEW`).
* **Rekam Jejak Fasilitas Perbankan / Lembaga Pembiayaan:**
  * Pencatatan kreditor eksisting: Nama Bank/Leasing, Mata Uang (`IDR`), Plafon Fasilitas (*Credit Facility*), Besaran Angsuran Bulanan (*Monthly Installment*), Tahun Mulai Fasilitas, Suku Bunga (%), Riwayat Kelancaran Pembayaran (*Payment Record*), dan Status Fasilitas (`Active` / `Lunas`).
  * Informasi ini menjadi basis analisis komitmen utang bulanan debitur bagi Credit Analyst.

---

### 4.7. Proposal Pembiayaan & Inventaris Unit Alat Berat (Tab 3)
* **Spesifikasi Skema Pembiayaan:**
  * `facilityPurpose`: Tujuan Fasilitas (`INVESTMENT` / Investasi Armada Baru vs `WORKING_CAPITAL` / Modal Kerja).
  * `financingMethod`: Metode Pembiayaan (`FINANCIAL_LEASE`, `SALE_AND_LEASE_BACK`, `INSTALLMENT_FINANCING`).
  * `financingValue`: Total Nilai Pembelian Unit Alat Berat (IDR).
  * `downPaymentValue`: Nilai Uang Muka / DP (IDR) — *Aturan bisnis: DP wajib bernilai lebih kecil dari total nilai pembiayaan*.
  * `securityDeposit`: Nilai Jaminan Pengaman / Simpanan Jaminan (IDR).
  * `interestRate`: Suku Bunga Pembiayaan Tahunan (% p.a.).
  * `tenorMonths`: Jangka waktu fasilitas (12, 24, 36, 48, hingga 60 bulan).
  * `paymentMethod`: Waktu pembayaran angsuran (`In Arrear` / Belakang vs `In Advance` / Muka).
* **Inventaris Unit Alat Berat (Equipment Repeater):**
  * Pencatatan multi-unit rincian mesin: Kategori Unit (`HE` - Heavy Equipment vs `TRUCK`), Merk (LiuGong vs Non-LiuGong), Tipe, Nama Model (e.g. *CLG922E*, *CLG856H*), Kelas Kapasitas (Ton), Jumlah Unit (*Quantity*), Tahun Produksi (*Years*), dan Deskripsi Spesifikasi Teknis Mesin.

---

### 4.8. Spreading Keuangan 3 Tahun & Analisis Rasio (Tab 4)
* **Model Spreading Laporan Keuangan:**
  * Menampung riwayat data laporan keuangan hingga **3 tahun buku terakhir** (misal: 2023, 2024, 2025).
  * **Validasi Keseimbangan Neraca (Strict Balance Check):**
    Sistem menggunakan kalkulasi aritmatika berbasis integer sen (*BigInt cents*) untuk mencegah galat pecahan float:
    $$\text{Total Aset} = \text{Aset Lancar} + \text{Aset Tidak Lancar}$$
    $$\text{Total Liabilitas} = \text{Liabilitas Jangka Pendek} + \text{Liabilitas Jangka Panjang}$$
    $$\text{Total Aset} \equiv \text{Total Liabilitas} + \text{Ekuitas}$$
    Jika persamaan di atas tidak seimbang, sistem secara deterministik menolak penyimpanan dengan pesan peringatan: *Neraca belum seimbang*.
* **Rasio Keuangan Otomatis:**
  * **Current Ratio:** $\frac{\text{Current Assets}}{\text{Current Liabilities}}$
  * **Debt to Equity Ratio (DER):** $\frac{\text{Total Liabilities}}{\text{Equity}}$
  * **Gross Profit Margin (GPM):** $\frac{\text{Gross Profit}}{\text{Revenue}} \times 100\%$
  * **Operating Profit Margin (OPM):** $\frac{\text{Operating Profit}}{\text{Revenue}} \times 100\%$
  * **Net Profit Margin (NPM):** $\frac{\text{Net Income}}{\text{Revenue}} \times 100\%$
  * *Catatan Kebijakan:* Rasio menangani pembagian dengan angka nol secara elegan tanpa menampilkan error `Infinity`. Rasio DSCR (*Debt Service Coverage Ratio*) secara eksplisit ditandai *Unavailable* karena tidak tersedianya pos amortisasi & depresiasi pada skema standar FAP.

---

### 4.9. Tata Kelola Akta Legalitas & Notaris (Tab 5)
* **Pemisahan Tabel 2-Tingkat (Two-Tier Deed Table):**
  1. **Tabel Atas: Akta Aktif & Rujukan Terkini:**
     Menampilkan 1 Akta Pendirian utama dan 1 Akta Perubahan terakhir yang berlaku efektif sebagai rujukan yuridis operasional.
  2. **Tabel Bawah: Riwayat Akta Lama (Historical Archive):**
     Mengarsipkan seluruh akta perubahan historis sebelumnya dan akta yang masa berlakunya telah habis.
* **Editor WYSIWYG TinyMCE untuk Catatan Akta:**
  * Dilengkapi editor teks kaya TinyMCE untuk menyusun uraian notaris, perubahan susunan pengurus, atau penambahan setoran modal.
  * **Normalisasi Daftar Bernomor Otomatis:** Sistem mendeteksi daftar berurutan (`<ol>`) dan menjamin penomoran tetap berlanjut secara kontinu (1, 2, 3...) antar alinea tanpa ter-reset secara tidak sengaja.
* **Dialog Review & Matriks Komparasi Legalitas (`deed-comparison.tsx`):**
  * Membandingkan perubahan hak suara, penambahan/penarikan modal, serta pergantian direksi antara akta terdahulu (*Baseline*) dan draf akta terbaru secara berdampingan.
  * Menghapus field usang `Representative` dan seksi `Pihak terkait` untuk menjaga kesederhanaan dan kepatuhan terhadap format standar Kemenkumham.

---

### 4.10. Meja Dokumen Digital & Penyimpanan S3 (Tab 6)
* **Matriks Checklist Dokumen Wajib:**
  * Company Profile, NIB, NPWP, SKT/SPPKP, KTP Pengurus & Pemegang Saham, Rekening Koran 3 Bulan Terakhir, Laporan Keuangan 3 Tahun Terakhir, Akta Pendirian & SK Kemenkumham, Akta Perubahan Terakhir & SK Kemenkumham, serta Kontrak Kerja / SPK Proyek.
* **Keamanan Penyimpanan Objek (AWS S3 Presigned URL):**
  * Dokumen fisik disimpan pada bucket privat S3 yang terisolasi.
  * Pengguna hanya dapat mengunduh atau melihat dokumen melalui tautan terotentikasi (*signed URL*) yang memiliki masa kedaluwarsa **15 menit**.
  * Validasi tanda tangan digital berkas (*magic bytes*) menjamin bahwa berkas yang diunggah benar-benar PDF, PNG, atau JPEG yang sah (maksimal ukuran 20 MB).

---

## BAB 5: Matriks Wewenang, Peran Organisasi & RACI Matrix

Sistem menerapkan prinsip *Separation of Duties (SoD)* perbankan yang ketat:

### 5.1. Definisi Peran Organisasi

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     MKT      │ ──► │      BS      │ ──► │   HEAD_BS    │
│  (Marketing) │     │ (Branch Sp.) │     │ (Branch Head)│
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  COMMITTEE   │ ◄── │    LEGAL     │ ◄── │      CA      │
│ (Credit Com.)│     │ (Legal Sp.)  │     │ (Risk Under) │
└──────────────┘     └──────────────┘     └──────────────┘
```

1. **`MKT` (Marketing Officer / Relationship Manager):**
   * Pemilik awal permohonan (*creator/maker*).
   * Bertanggung jawab mengisi seluruh formulir profil nasabah, mengunggah dokumen agunan dan legalitas, mengoperasikan OCR NIB, serta mengajukan berkas ke Branch Support.
2. **`BS` (Branch Support Officer - Arianti):**
   * Verifikator cabang (*first-line checker*).
   * Memvalidasi kelengkapan fisik berkas, memeriksa konsistensi KTP/NPWP, dan memeriksa draf akta legalitas. Berhak mengembalikan berkas ke MKT (`RETURNED`) jika terdapat kekurangan.
3. **`HEAD_BS` (Head of Branch Support - Dellatra):**
   * Pengawas operasional cabang (*authorizer*).
   * Memberikan persetujuan resmi atas verifikasi akta dan menandatangani kelayakan berkas untuk dinaikkan ke meja kantor pusat (CA & Legal).
4. **`CA` (Credit Analyst / Underwriter):**
   * Spesialis asesmen risiko kredit.
   * Melakukan spreading keuangan, memeriksa rasio solvabilitas/likuiditas, memverifikasi rekam jejak fasilitas bank lain (SLIK OJK), dan menerbitkan *Credit Memo* rekomendasi limit.
5. **`LEGAL` (Legal Specialist):**
   * Penelaah kepatuhan hukum dan perikatan jaminan.
   * Melakukan verifikasi keabsahan notaris, memeriksa riwayat sengketa perseroan, menyusun advis legal (*Legal Opinion*), dan memastikan keabsahan fidusia agunan mesin.
6. **`COMMITTEE` (Credit Committee):**
   * Pengambil keputusan tertinggi kredit.
   * Terdiri dari jajaran Direksi dan Kepala Divisi Risiko yang memiliki wewenang final untuk menyetujui (*APPROVED*) atau menolak (*REJECTED*) permohonan pembiayaan.

### 5.2. Matriks RACI (Responsible, Accountable, Consulted, Informed)

| Aktivitas / Tahapan Kerja | MKT | BS | HEAD_BS | CA | LEGAL | COMMITTEE |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Registrasi Permohonan & Intake Data Nasabah | **R** | C | I | I | I | I |
| Pemindaian OCR NIB & Validasi Lapangan | **R** | A | I | I | I | I |
| Pengisian Struktur Pemegang Saham & Akta | **R** | C | I | I | C | I |
| Pemeriksaan Kelengkapan Berkas (Checklist) | I | **R** | A | I | I | I |
| Persetujuan Review Akta Notaris | I | C | **R / A** | I | C | I |
| Pengembalian Berkas (*Return Workflow*) | I | **R** | A | I | I | I |
| Spreading Keuangan & Evaluasi Rasio Bisnis | I | I | I | **R** | I | I |
| Penyusunan Advis Hukum & Telaah Fidusia | I | I | I | I | **R** | I |
| Sidang Putusan Komite Kredit | I | I | I | C | C | **R / A** |
| Pencairan Fasilitas & Penguncian Berkas | I | I | I | I | I | **A** |

*Keterangan: R = Responsible (Pelaksana), A = Accountable (Penanggung Jawab Akhir), C = Consulted (Pihak Berkonsultasi), I = Informed (Pihak Menerima Notifikasi).*

---

## BAB 6: Alur Persetujuan Kredit & Mesin Status (State Machine)

Sistem memberlakukan 8 status transisi aplikasi yang terkunci secara deterministik:

```
                  ┌──────────────┐
                  │    DRAFT     │ ◄──────────────────────┐
                  └──────┬───────┘                        │
                         │ Action: SUBMIT                 │
                         ▼                                │
              ┌──────────────────────┐                    │
              │   SUBMITTED_TO_BS    │                    │
              └──────────┬───────────┘                    │
                         │ Action: RETURN                 │
                         ├────────────────────────────────┘
                         │ Action: VERIFY
                         ▼
              ┌──────────────────────┐
              │     BS_VERIFIED      │
              └──────────┬───────────┘
                         │ Action: START_REVIEW
                         ▼
              ┌──────────────────────┐
              │ IN_CA_LEGAL_REVIEW   │
              └──────────┬───────────┘
                         │ Action: RECOMMEND (Dual Sign-Off CA & Legal)
                         ▼
              ┌──────────────────────┐
              │CREDIT_COMMITTEE_REV  │
              └──────────┬───────────┘
                         │
         ┌───────────────┴───────────────┐
         │ Action: APPROVE               │ Action: REJECT
         ▼                               ▼
  ┌──────────────┐                ┌──────────────┐
  │   APPROVED   │                │   REJECTED   │
  └──────────────┘                └──────────────┘
```

### Rincian Aturan Transisi:
1. `DRAFT` $\rightarrow$ `SUBMITTED_TO_BS`:
   * *Prasyarat:* Profil perusahaan, PIC lengkap, kontak telepon valid, dan susunan pemegang saham genap 100%.
2. `SUBMITTED_TO_BS` $\rightarrow$ `RETURNED`:
   * *Pemicu:* Branch Support menemukan dokumen buram atau data tidak cocok. MKT menerima notifikasi catatan perbaikan dan dapat mengedit ulang berkas.
3. `SUBMITTED_TO_BS` $\rightarrow$ `BS_VERIFIED`:
   * *Prasyarat:* BS telah memverifikasi seluruh berkas wajib dan Head of BS telah menyetujui Akta Pendirian & Perubahan.
4. `BS_VERIFIED` $\rightarrow$ `IN_CA_LEGAL_REVIEW`:
   * Berkas terbuka secara paralel bagi Credit Analyst (untuk analisis finansial) dan Legal (untuk legal opinion).
5. `IN_CA_LEGAL_REVIEW` $\rightarrow$ `CREDIT_COMMITTEE_REVIEW`:
   * *Prasyarat:* Kedua pihak (CA dan Legal) telah memberikan rekomendasi positif (*dual sign-off*). Jika salah satu pihak belum sign-off, tombol tidak aktif.
6. `CREDIT_COMMITTEE_REVIEW` $\rightarrow$ `APPROVED`:
   * Persetujuan final fasilitas kredit. Berkas dibekukan permanen (*read-only lock*) untuk audit OJK.
7. `CREDIT_COMMITTEE_REVIEW` $\rightarrow$ `REJECTED`:
   * Penolakan formal dengan kewajiban mencantumkan alasan tertulis yang tersimpan permanen pada riwayat audit.

---

## BAB 7: Logika Validasi Bisnis, Formula Finansial & Aktuaria

### 7.1. Formula Angsuran Pembiayaan (Annuity Reducing Balance)
Perhitungan angsuran bulanan pokok dan bunga dihitung menggunakan rumus anuitas bunga efektif:

$$\text{PMT} = \frac{PV \times r}{1 - (1 + r)^{-n}}$$

*Di mana:*
* $PV$ (*Present Value*) = Nilai Pokok Pembiayaan Bersih ($\text{Total Nilai Unit} - \text{Down Payment}$).
* $r$ = Suku bunga bulanan ($\frac{\text{Suku Bunga Tahunan}}{12}$).
* $n$ = Total tenor dalam bulan (misal: 36 bulan).
* *Penyesuaian In Advance:* Jika skema *In Advance*, angsuran pertama dipungut saat pencairan, sehingga sisa pokok yang diamortisasi berkurang satu periode.

### 7.2. Validasi Batas Nilai & Format Karakter
* **Tanggal Historis:** Tanggal Akta, Tanggal Lahir, Tanggal Registrasi, dan Tanggal SK Menteri dibatasi antara `1900-01-01` hingga tanggal hari ini (`today`). Tanggal di masa depan otomatis ditolak.
* **Masa Berlaku Akta:** Masa berlaku akta dihitung secara dinamis:
  $$\text{Tanggal Kedaluwarsa} = \text{Tanggal Akta} + 5 \text{ Tahun}$$
  Akta yang melampaui tanggal tersebut ditandai dengan status `Tidak aktif`.
* **Nomor Kontak:** Mendukung format lokal dan internasional (`+62`), dengan batas panjang digit bersih antara 7 hingga 15 digit angka.
* **Presisi Angka Keuangan:** Seluruh nilai rupiah dibatasi maksimal 2 angka desimal dan batas atas mutlak $10^{16}$ (10 kuadriliun Rupiah).

---

## BAB 8: Kepatuhan Regulasi, Privasi Data (UU PDP) & Jejak Audit

### 8.1. Kepatuhan Undang-Undang Pelindungan Data Pribadi (UU PDP No. 27/2022)
1. **Pemrosesan Data Berbasis Peran (Least Privilege):** Pengguna hanya dapat mengakses dokumen identitas (KTP, KK, NPWP) sesuai dengan kebutuhan fungsi jabatannya.
2. **Isolasi Tautan Dokumen:** Tidak ada tautan publik statis ke dokumen nasabah. Seluruh URL unduhan di-generate secara privat dengan masa aktif hanya 15 menit menggunakan signature AWS S3.
3. **Penyimpanan Lokal WASM OCR:** Pemrosesan gambar NIB dan KTP dilakukan pada memori lokal peramban klien pengguna tanpa pernah dilempar ke pihak ketiga (mengeliminasi risiko kebocoran data di transit).

### 8.2. Catatan Audit Tak Terubahkan (Immutable Append-Only Audit Trail)
Setiap mutasi data dilindungi oleh pemicu (*database trigger*) pada tabel `audit_logs`:
* **Pencegahan Modifikasi:** Percobaan operasi `UPDATE` atau `DELETE` pada tabel log audit akan langsung dibatalkan (*aborted*) oleh trigger basis data dengan kode error `P0001: Audit records are append-only and cannot be altered or removed`.
* **Struktur Metadata Log:** Mencatat ID Aplikasi, ID Aktor, Peran Jabatan, Tipe Aksi, Alamat IP Pengguna, Stempel Waktu Mikrodetik (UTC), serta rekaman kondisi data sebelum (*previous_state*) dan sesudah (*new_state*).

---

## BAB 9: Master Data, Wilayah Administratif & Standar KBLI

Sistem mengintegrasikan katalog data referensi terstandarisasi:

### 9.1. Wilayah Administratif Republik Indonesia
Struktur hierarkis terpadu mencakup:
* **38 Provinsi:** Dari Nanggroe Aceh Darussalam hingga Papua Selatan.
* **514 Kota & Kabupaten:** Hubungan relasional otomatis yang memastikan pemilihan Kota hanya memunculkan Kecamatan yang valid.
* **Kecamatan, Kelurahan & Kodifikasi Pos:** Pemilihan Kelurahan secara otomatis mempopulasikan 5 digit Kode Pos resmi PT Pos Indonesia.

### 9.2. Sektor Usaha & KBLI
Pilihan industri disesuaikan dengan fokus penyaluran pembiayaan alat berat LiuGong:
1. **Pertambangan (Mining):** Batubara, Nikel, Bauksit, Emas, Pasir Besi, Quarry Granit/Batu.
2. **Pertanian & Perkebunan (Agriculture):** Perkebunan Kelapa Sawit, Tebu, Karet, Pengolahan Lahan.
3. **Kehutanan (Forestry):** Hutan Tanaman Industri (HTI), Penebangan Kayu Legal (*Logging*).
4. **Konstruksi & Infrastruktur (Construction):** Pembangunan Jalan Tol, Bendungan, Pelabuhan, Gedung Bertingkat.
5. **Minyak & Gas Bumi (Oil & Gas):** Pengeboran Darat, Pematangan Lahan Pipa Migas.

---

## BAB 10: Metrik Keberhasilan Bisnis, KPI & Standar SLA

Sistem dirancang untuk memenuhi sasaran indikator kinerja operasional:

| Metrik Kinerja (KPI) | Standar Sebelum Sistem | Target Standar LOS-CRM | Metode Pengukuran |
| :--- | :---: | :---: | :--- |
| **Siklus Total Pengajuan (TAT)** | 10 – 14 Hari Kerja | **$\le$ 48 Jam (2 Hari Kerja)** | Waktu dari status `DRAFT` pertama kali dibuat hingga `APPROVED`. |
| **SLA Verifikasi Cabang (BS)** | 2 – 3 Hari | **$\le$ 4 Jam Kerja** | Waktu dari `SUBMITTED_TO_BS` hingga `BS_VERIFIED`. |
| **SLA Analisis CA & Legal** | 4 – 5 Hari | **$\le$ 24 Jam Kerja** | Waktu dari `BS_VERIFIED` hingga rekomendasi komite. |
| **Tingkat Retur Berkas (Defect Rate)** | 35% – 40% permohonan | **$\le$ 3% permohonan** | Persentase aplikasi yang mengalami status `RETURNED`. |
| **Akurasi Validasi Neraca & Saham** | Sering salah hitung | **100% Zero-Error** | Enforced secara algoritmik di sisi form & backend Zod. |
| **Ketersediaan Sistem (Uptime)** | N/A (Manual) | **99.9% High Availability** | Pemantauan Task Scheduler & Express Healthcheck. |

---

### Lembar Pengesahan Spesifikasi Bisnis

| Dibuat & Dirancang Oleh | Ditinjau & Disetujui Oleh |
| :---: | :---: |
| <br/><br/>**Personal AI CTO / Systems Architect**<br/>Lead Enterprise Solution | <br/><br/>**Latom**<br/>Owner & Executive Decision Maker |

*Dokumen ini merupakan spesifikasi bisnis resmi dan aset intelektual PT LiuGong Finance Indonesia.*
