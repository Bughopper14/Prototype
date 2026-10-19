# PT LiuGong Finance Indonesia · LOS-DMS
### Loan Origination System & Document Management System (Sistem Originasi Pembiayaan & Manajemen Dokumen)

Sistem enterprise terintegrasi untuk originasi pembiayaan alat berat (*Heavy Equipment*) dan truk komersial bagi calon debitur **PT LiuGong Finance Indonesia (LFI)**. Platform ini mencakup pengelolaan siklus hidup kredit secara end-to-end: mulai dari inisiasi formulir aplikasi pembiayaan (FAP), otomasi OCR cerdas (*Optical Character Recognition*) untuk KTP dan NIB, tinjauan legalitas akta, spreading laporan keuangan 3 tahun, dual sign-off verifikasi kredit dan hukum, hingga keputusan akhir rapat komite pembiayaan (*Credit Committee*).

---

## 🛠 Tech Stack & Arsitektur Sistem

- **Frontend**: React 18, TypeScript, Vite, Lucide Icons, TinyMCE Rich-Text Editor (akta remarks).
- **Backend**: Node.js / Express REST API, PostgreSQL (Didukung PGlite untuk mode offline/lokal atau PostgreSQL Server untuk mode produksi).
- **Security & Storage**: Cookie-based JWT Authentication, Signed Document URLs (kadaluwarsa 15 menit), Hash Password Bcrypt, Append-only Audit Triggers.
- **Intelligent OCR Engine**:
  - **OCR NIB OSS**: Ekstraksi otomatis nomor NIB, tanggal terbit, nama perusahaan, alamat, RT/RW, dan kode pos dengan **Hierarchical Wilayah Resolution** (pencarian berjenjang naik dari Kelurahan $\rightarrow$ Kecamatan $\rightarrow$ Kabupaten/Kota $\rightarrow$ Provinsi berdasarkan Master Data).
  - **OCR KTP Pengurus**: Ekstraksi NIK, nama lengkap, tempat/tanggal lahir, jenis kelamin, alamat lengkap, RT/RW, kelurahan, kecamatan, agama, status perkawinan, pekerjaan, dan masa berlaku (otomatis *SEUMUR HIDUP*), serta kalkulasi usia otomatis (*greyed out*).
- **Live Form Engine**: *Side-by-side Live Excel Mirror* yang merefleksikan lembar formulir aplikasi resmi secara real-time dan siap dicetak ke kertas A4 (*High-Fidelity A4 Print Engine*).

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### Kebutuhan Sistem
- **Node.js**: Versi 20.x atau 22.x LTS atau lebih baru.
- **NPM**: Versi 9.x atau lebih baru.

### Langkah Menjalankan di Komputer Lokal

1. **Clone Repository & Masuk ke Direktori Proyek**:
   ```sh
   git clone https://github.com/Bughopper14/Prototype.git -b axel
   cd prototype-src
   ```

2. **Instalasi Dependencies**:
   ```sh
   npm install
   ```

3. **Jalankan Mode Pengembangan (Development)**:
   ```sh
   npm run dev
   ```
   Aplikasi akan berjalan dan dapat diakses melalui peramban web di:
   👉 **http://127.0.0.1:4174**

4. **Kompilasi & Uji Coba Produksi**:
   ```sh
   npm test          # Menjalankan unit & integration test
   npm run build     # Melakukan compile TypeScript & bundler Vite
   npm start         # Menjalankan fullstack bundle pada port 3001
   ```

### Mengakses Melalui Ponsel / Tablet dalam Satu Jaringan Wi-Fi
1. Cari alamat IPv4 komputer Anda (buka PowerShell/CMD dan ketik `ipconfig`, contoh: `192.168.1.15`).
2. Pastikan port `4174` diizinkan melalui Windows Firewall.
3. Buka browser di ponsel/tablet dan kunjungi: `http://192.168.1.15:4174`.

---

## 👥 Akun Demo & Peran Pengguna (Role-Based Access)

Sistem menerapkan prinsip **Four-Eyes Principle** dan pemisahan tugas (*separation of duties*). Setiap pengguna memiliki akses dan wewenang yang berbeda:

| Role / Departemen | Email Login | Password Default | Tanggung Jawab & Hak Akses |
| :--- | :--- | :--- | :--- |
| **Marketing (MKT)** | `mkt@liugong.local` | `LiuGong2026!` | Inisiasi aplikasi baru, upload berkas awal, input data profil debitur, penyerahan ke BS. |
| **Branch Support (BS)** | `bs@liugong.local` | `LiuGong2026!` | Pemeriksaan kelengkapan dokumen, cek keabsahan akta & KTP, verifikasi checklist awal. |
| **Head Branch Support (HEAD_BS)** | `headbs@liugong.local` | `LiuGong2026!` | Supervisi verifikasi cabang dan approval resmi atas verifikasi akta perusahaan. |
| **Credit Analyst (CA)** | `ca@liugong.local` | `LiuGong2026!` | Analisis kapasitas bayar, rasio keuangan 3 tahun, evaluasi fasilitas bank, rekomendasi CA. |
| **Legal Counsel (LEGAL)** | `legal@liugong.local` | `LiuGong2026!` | Legal due diligence, pemeriksaan anggaran dasar & SK Kemenkumham, opini hukum. |
| **Credit Committee (COMMITTEE)** | `committee@liugong.local` | `LiuGong2026!` | Memimpin rapat komite dan menetapkan keputusan final: Persetujuan (*Approve*) atau Penolakan (*Reject*). |

*(Pada layar login, tersedia tombol pintas cepat untuk beralih antar departemen).*

---

## 📋 Alur Penggunaan Aplikasi dari Start sampai Selesai (End-to-End Workflow)

Berikut adalah panduan langkah demi langkah penggunaan aplikasi mulai dari inisiasi pengajuan hingga keputusan pencairan pembiayaan:

```
[Start: Login MKT] ➔ [Tahap 1: FAP Stage] ➔ [Tahap 2: Legal & Stakeholders]
                          │                           │
                          ▼                           ▼
[Tahap 4: Dual Review]  [Tahap 3: Verifikasi BS]  [Submit to BS]
   ├── Credit Analyst (CA)
   └── Legal Counsel (LEGAL)
        │
        ▼
[Tahap 5: Komite Kredit] ➔ [Persetujuan / APPROVED] ➔ [Selesai: Terbit Offering Letter]
```

---

### TAHAP 1: Inisiasi Pengajuan Aplikasi (FAP Stage) — Role: Marketing (MKT)
1. **Login sebagai Akun MKT**: Masuk ke aplikasi menggunakan akun `mkt@liugong.local`.
2. **Buat Aplikasi Baru**:
   - Di halaman *Overview* atau *Applications*, klik tombol **"+ New Application"**.
   - Sistem akan langsung membuka antarmuka formulir pengajuan dengan nomor registrasi FAP otomatis (format: `XXX/AF/MM/YYYY`).
   - Status aplikasi berada dalam status `DRAFT` dan tahap `FAP Stage`.
3. **Pilih Kategori Debitur**:
   - **Customer Baru (*New Customer*)**: Masukkan Nama Perusahaan, jenis badan usaha (Corporate/Commercial/Micro), nomor NIB (13 digit), dan nomor NPWP (15-16 digit).
   - **Customer Lama (*Existing Customer*)**: Cari nama debitur dari database master customer directory untuk mengisi data historis secara otomatis.
4. **Gunakan Fitur OCR NIB Otomatis**:
   - Klik tombol **"OCR Scan NIB"** di panel formulir.
   - Unggah berkas dokumen NIB (format PDF atau gambar).
   - Engine OCR secara instan mengekstrak nomor NIB, tanggal terbit, nama perseroan, serta memecah segmen alamat lengkap.
   - **Resolusi Wilayah Master Data**: Jika dokumen hanya memuat nama kelurahan atau kode pos tertentu (contoh: *"Karet Semanggi"*), sistem otomatis mencari hierarki ke atas dan melengkapi field: **Kecamatan (*Setiabudi*) $\rightarrow$ Kota/Kabupaten (*Jakarta Selatan*) $\rightarrow$ Provinsi (*DKI Jakarta*) $\rightarrow$ Kode Pos (*12930*)**.
   - Tinjau data hasil OCR, lalu klik **"Terapkan ke Formulir / Auto-Fill"**.
5. **Lengkapi Data PIC (Penanggung Jawab Debitur)**:
   - Isi nama lengkap PIC, nomor telepon/HP, jabatan (misal: Direktur Utama), email resmi, dan alamat domisili PIC.
6. **Live Mirror & Cetak Dokumen Resmi**:
   - Di sisi kanan formulir, aktifkan tombol **"Side-by-side Live FAP"** untuk memantau tampilan formulir resmi secara langsung (*real-time preview*).
   - Klik tombol **"Cetak Dokumen A4"** untuk mencetak atau mengunduh PDF lembar resmi formulir pembiayaan siap tanda tangan.
7. **Simpan Formulir**:
   - Klik tombol **"Save Changes"**. Perubahan data calon debitur dan PIC langsung tersimpan ke basis data dengan aman tanpa memindahkan pengguna ke tab lain.

---

### TAHAP 2: Legalitas & Struktur Kepemilikan Saham — Role: Marketing (MKT) & Legal
1. **Buka Tab 5 (Legal)**:
   - Pilih menu tab **"Legal"** pada formulir aplikasi.
2. **Perekaman Akta Perusahaan**:
   - **Akta Pendirian (*Establishment Deed*)**: Masukkan nomor akta pendirian, tanggal akta dibuat, dan nama notaris pembuat akta.
   - **Akta Perubahan Terakhir (*Latest Amendment Deed*)**: Masukkan nomor akta perubahan, tanggal akta perubahan, serta nomor & tanggal persetujuan SK Kemenkumham RI.
3. **Input Stakeholders & OCR KTP Pengurus**:
   - Daftarkan susunan Dewan Direksi, Dewan Komisaris, dan Pemegang Saham.
   - Untuk stakeholder perorangan (WNI), klik tombol **"Scan KTP"**:
     - Sistem mengekstrak NIK (16 digit), nama lengkap, tempat/tanggal lahir, alamat, RT/RW, kelurahan, kecamatan, agama, dan pekerjaan.
     - Kolom usia (*Age Years & Age Months*) dihitung otomatis dari tanggal lahir dan dikunci (*greyed out*).
     - Masa berlaku KTP diatur secara default menjadi **SEUMUR HIDUP**.
   - Masukkan porsi kepemilikan saham (*share percentage*) dan modal disetor. Bar kepemilikan saham akan menghitung total persentase secara real-time dan memberikan peringatan jika total kepemilikan melebihi 100%.
4. **Submit FAP Stage ke Branch Support**:
   - Klik tombol **"Submit to BS"** di sudut kanan bawah.
   - Status aplikasi berubah menjadi `SUBMITTED_TO_BS`.

---

### TAHAP 3: Verifikasi Cabang — Role: Branch Support (BS) & Head of BS (HEAD_BS)
1. **Pemeriksaan Dokumen oleh BS**:
   - Login dengan akun `bs@liugong.local`.
   - Di menu *Notifications* atau *Applications*, buka aplikasi yang berstatus `SUBMITTED_TO_BS`.
   - Buka tab **Legal** untuk memeriksa keabsahan fisik akta dan identitas KTP pengurus.
   - Berikan status verifikasi per akta: **Checked** (jika sesuai) atau **Reject** (jika ada data yang meragukan).
   - Masukkan catatan catatan pemeriksaan notaris (*notary remarks*).
2. **Approval Verifikasi Akta oleh Head BS**:
   - Login dengan akun `headbs@liugong.local`.
   - Buka notifikasi pemeriksaan akta, lalu berikan otorisasi **Approve Deed**.
3. **Lanjutkan ke Tahap Analisis Kredit**:
   - Setelah dokumen dan akta disetujui di tingkat cabang, BS mengklik tombol **"Start CA & Legal review"**.
   - Tahap aplikasi beralih ke tahap **Pre-analysis**, dan status berubah menjadi `IN_CA_LEGAL_REVIEW`.

---

### TAHAP 4: Analisis Kredit & Penilaian Hukum (Pre-analysis Dual Review)
Pada tahap ini, Credit Analyst (CA) dan Legal Officer (LEGAL) bekerja secara independen:

#### A. Tugas Credit Analyst (CA) — Akun: `ca@liugong.local`:
1. **Business & Banks (Tab 2)**:
   - Memasukkan referensi fasilitas pinjaman bank yang dimiliki debitur (nama bank, baki debet, angsuran bulanan, dan histori pembayaran).
2. **Financing & Units (Tab 3)**:
   - Menentukan struktur pembiayaan: Nilai Pembiayaan (*Financing Value*), Uang Muka (*Down Payment*), Suku Bunga per tahun (*Interest Rate*), Jangka Waktu (*Tenor*), dan Metode Pembayaran (*In Advance* atau *In Arrear*).
   - Sistem otomatis menghitung estimasi angsuran bulanan (*Estimated Monthly Installment*).
   - Mendaftarkan rincian unit alat berat yang dibiayai (model alat LiuGong, kategori HE/Truck, dan jumlah unit).
3. **Financial Statements Spreading (Tab 4)**:
   - Menginput neraca (*Balance Sheet*) dan laporan laba rugi (*Income Statement*) debitur selama 3 tahun buku terakhir.
   - Sistem secara otomatis memvalidasi keseimbangan neraca (*Balance Check: Aset = Liabilitas + Ekuitas*) serta menghitung rasio keuangan utama: **Current Ratio**, **Debt-to-Equity Ratio (DER)**, dan **Net Profit Margin (NPM)**.
4. **Sign-Off CA**:
   - Setelah analisis kredit selesai dan memenuhi syarat kelayakan kredit (*Credit Scoring*), klik tombol **"Sign off · CA"**.

#### B. Tugas Legal Counsel (LEGAL) — Akun: `legal@liugong.local`:
1. **Evaluasi Dokumen Hukum (Tab 5 & Tab 6)**:
   - Memastikan keabsahan anggaran dasar perseroan dan kewenangan direktur dalam menjaminkan aset atau menandatangani perjanjian pembiayaan (*Borrowing Authority*).
   - Mengunggah atau meninjau berkas **Legal Opinion**.
2. **Sign-Off Legal**:
   - Setelah uji tuntas hukum terpenuhi tanpa adanya sengketa, klik tombol **"Sign off · Legal"**.

---

### TAHAP 5: Sidang & Keputusan Komite Pembiayaan — Role: Committee
1. **Login sebagai Anggota Komite**: Masuk menggunakan akun `committee@liugong.local`.
2. **Aplikasi Masuk ke Antrean Komite**:
   - Ketika kedua departemen (CA dan Legal) telah memberikan tanda tangan digital (*Dual Sign-off*), status aplikasi otomatis bergerak ke `CREDIT_COMMITTEE_REVIEW`.
3. **Peninjauan Dokumen Terpadu**:
   - Komite membuka aplikasi dan memeriksa ringkasan profil debitur, kelayakan rasio keuangan, opini legal, serta rincian jaminan unit alat berat LiuGong.
4. **Penetapan Keputusan Komite**:
   - **APPROVE (Setujui)**:
     - Jika permohonan disetujui, klik tombol **"Approve"**.
     - Masukkan catatan keputusan komite pembiayaan (misal: syarat penambahan asuransi unit atau agunan tambahan).
     - Status aplikasi berubah menjadi `APPROVED`.
     - Seluruh formulir terkunci (*locked & append-only*), dan sistem siap memproses penerbitan *Offering Letter* kepada debitur.
   - **REJECT (Tolak)**:
     - Jika permohonan tidak memenuhi kriteria risiko kredit, klik tombol **"Reject"** dan cantumkan alasan penolakan secara transparan. Status menjadi `REJECTED`.
   - **RETURN (Kembalikan)**:
     - Jika dibutuhkan dokumen penunjang tambahan atau restrukturisasi uang muka, klik **"Return"** untuk dikembalikan ke Marketing/BS.

---

### TAHAP 6: Pemantauan Audit & Jejak Rekam (Activity Log)
- Di tab **Activity**, seluruh departemen dapat melihat rekam jejak kronologis yang tidak dapat dimanipulasi (*tamper-proof / append-only audit trail*).
- Setiap peristiwa mencatat secara detail: waktu kejadian (tanggal & jam), nama pengguna, departemen/role, aksi yang dilakukan, dan catatan pengambil keputusan.

---

## 🗄 Manajemen Master Data Wilayah & Pengaturan Sistem

Pengguna dengan wewenang administrator dapat mengakses menu **"Customize master data"** untuk:
- Mengelola data katalog wilayah (Provinsi, Kota/Kabupaten, Kecamatan, Kelurahan, dan Kode Pos).
- Menambah atau memperbarui daftar sektor industri (*Mining, Agriculture, Forestry, Construction, Oil & Gas*).
- Mengatur jenis unit alat berat dan suku bunga dasar pembiayaan LiuGong.

---

## 📄 Hak Cipta & Lisensi

Hak Cipta © 2026 **PT LiuGong Finance Indonesia**. Seluruh hak cipta dilindungi undang-undang. Dokumen dan sistem ini dikembangkan khusus untuk operasional pembiayaan resmi PT LiuGong Finance Indonesia.
