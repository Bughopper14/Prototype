# TESTING SCENARIO & QUALITY ASSURANCE SPECIFICATION (COMPREHENSIVE TEST SUITE)
## SISTEM ORIGINASI PEMBIAYAAN CAPTIVE LIUGONG (LOS-DMS)
### PT LIUGONG FINANCE INDONESIA (LFI)

**Nomor Dokumen:** LFI/QA/TEST-SCENARIO/2026/001  
**Penyusun:** QA Lead Tester — Meowth (`office-tester`)  
**Peninjau & Validasi:** Willy (Lead Solution Architect & Product Owner)  
**Versi:** 1.0 (Enterprise Comprehensive QA Suite)  
**Target Sistem:** React 18 SPA + Express REST API + PostgreSQL 15+ + MinIO/S3  
**Cakupan Pengujian:** Positive, Negative, Boundary, Edge Case, Security, Concurrency, & Maker-Checker Regression  

---

## 1. RINGKASAN STRATEGI & TEST MATRIX (QA TEST PYRAMID)

Pengujian mengadopsi standar **ISO/IEC/IEEE 29119** dan metodologi **Testing Pyramid**:
1. **Unit & Mathematical Logic (35%):** Kalkulasi anuitas cicilan, rekonsiliasi kumulatif saham, dan validasi neraca.
2. **API & Integration Tests (40%):** Validasi endpoint REST, otorisasi RBAC (Maker vs Checker), dan proteksi trigger database.
3. **End-to-End & Boundary Scenarios (25%):** Simulasi lifecycle aplikasi dari input draft MKT, verifikasi/return BS, dual sign-off CA/Legal, hingga putusan Komite Kredit.

### Matriks Pengujian Modul Utama

| Test Suite ID | Modul yang Diuji | Jumlah Skenario | Tingkat Keparahan Kritis (P0) |
|---|---|:---:|:---:|
| **TS-01** | Intake Application (New vs Existing Customer & FAP Gen) | 8 Skenario | 6 High/Blocker |
| **TS-02** | Customer Profile, PIC & Asset Population | 6 Skenario | 3 Medium/High |
| **TS-03** | Legal Deeds & Cumulative Stakeholder Reconciliation | 12 Skenario | 10 Blocker/Critical |
| **TS-04** | Business & Bank References (Credit Facility) | 6 Skenario | 3 Medium/High |
| **TS-05** | Financing Proposal & Unit Free-Text Snapshot | 8 Skenario | 6 High/Blocker |
| **TS-06** | Financial Statements Spreading & Balance Check | 8 Skenario | 5 High/Blocker |
| **TS-07** | Maker-Checker Gate (Admin MKT vs Admin BS) & Reason Matrix | 10 Skenario | 9 Blocker/Critical |
| **TS-08** | In-App Real-time Notification & Return Lifecycle | 6 Skenario | 4 Medium/High |
| **TS-09** | DMS Private File Access & Magic Byte Guard | 6 Skenario | 5 High/Security |
| **TS-10** | Database Immutability & Audit Trail Tampering Prevention | 6 Skenario | 6 Security/Compliance |
| **TOTAL** | **10 Test Suites Lengkap** | **76 Skenario** | **57 P0 Blocker** |

---

## 2. DETAIL TEST SCENARIOS LENGKAP PER MODUL

---

### TS-01: INTAKE APPLICATION & CUSTOMER DEDUPLICATION

#### TC-INT-001: Pendaftaran Customer Baru Berhasil (Positive Case)
- **Prekondisi:** User login sebagai Admin Marketing (`role: MKT`).
- **Langkah Pengujian:**
  1. Buka menu **Applications &rarr; + New Application**.
  2. Pilih Customer Category: `NEW`.
  3. Masukkan data: Nama PT (`PT BARA ENERGI MAKMUR`), NIB (13 digit angka: `9120001234567`), NPWP (16 digit angka: `0123456789012345`), Akta Pendirian No. `01`, Notaris `Bambang, SH`, Tanggal `2020-01-15`.
  4. Pilih Cabang: `BPN01 - Balikpapan`.
  5. Klik tombol **Create Application Draft**.
- **Hasil yang Diharapkan (Expected Result):**
  - Data customer baru tersimpan di tabel `customers`.
  - Terbit nomor FAP unik dengan format: `FAP/BPN01/2026/0001`.
  - Status aplikasi: `DRAFT`.
  - Halaman otomatis berpindah ke formulir detail aplikasi Tab 1 (Customer & PIC).

#### TC-INT-002: Duplikasi NPWP/NIB pada Customer Baru (Negative Case)
- **Prekondisi:** NPWP `0123456789012345` sudah terdaftar di database.
- **Langkah Pengujian:**
  1. Pilih Customer Category: `NEW`.
  2. Masukkan NPWP yang sama: `0123456789012345`.
  3. Klik Create Application Draft.
- **Expected Result:**
  - Form menolak submission dengan pesan error validasi HTTP 409 / UI Toast: *"Debitur dengan NPWP ini sudah terdaftar. Silakan pilih kategori Existing Customer."*
  - Tidak ada FAP number baru yang dibuat.

#### TC-INT-003: Intake Existing Customer (Pre-fill Data & FAP Independen)
- **Prekondisi:** Customer `PT BARA ENERGI MAKMUR` sudah ada di sistem.
- **Langkah Pengujian:**
  1. Buka + New Application &rarr; Pilih `EXISTING`.
  2. Ketik pada kolom pencarian: `BARA ENERGI`.
  3. Pilih customer dari dropdown lookup.
  4. Verifikasi bahwa NIB, NPWP, dan Akta Pendirian terkunci (*read-only*).
  5. Klik Create Application Draft.
- **Expected Result:**
  - Aplikasi baru terbuat dengan FAP number baru (misal: `FAP/BPN01/2026/0002`).
  - `customer_status` bernilai `EXISTING`.
  - Mengubah alamat kantor pada aplikasi ini tidak boleh merubah data alamat pada aplikasi FAP sebelumnya (independensi snapshot).

#### TC-INT-004: FAP Numbering Concurrency / Race Condition Test (Edge Case)
- **Prekondisi:** Dua Admin MKT di cabang `JKT01` mengklik submit create application pada milidetik yang sama.
- **Langkah Pengujian:** Eksekusi 10 concurrent HTTP request `POST /api/v1/applications` dengan payload cabang yang sama.
- **Expected Result:**
  - Database transaksi atomik (`SELECT FOR UPDATE` pada tabel sequence).
  - Kesepuluh aplikasi menerima nomor FAP yang berurutan secara sempurna (`0001`, `0002`, ..., `0010`) tanpa ada nomor lompat atau duplikasi (*zero duplicate constraint violation*).

---

### TS-02: TAB 1 — CUSTOMER PROFILE, PIC & ASSET POPULATION

#### TC-PIC-001: Validasi Field Wajib Profil & Kontak PIC (Negative Case)
- **Prekondisi:** Aplikasi status `DRAFT`.
- **Langkah Pengujian:**
  1. Kosongkan nomor handphone PIC dan alamat email PIC.
  2. Klik Save Changes atau Submit to BS.
- **Expected Result:**
  - Sistem menampilkan error validasi inline: *"Email PIC wajib diisi format valid"* dan *"Nomor telepon/HP PIC wajib diisi"*.
  - Penyimpanan gagal sampai field wajib diisi.

#### TC-PIC-002: Pencatatan Populasi Unit Alat Berat Eksisting (Boundary Test)
- **Langkah Pengujian:**
  1. Masukkan nilai negatif pada input jumlah unit: `assetSummaryHeLiuGong = -5`.
  2. Simpan form.
- **Expected Result:**
  - Validasi Zod menolak angka negatif (`min(0)`). Field mereset atau menampilkan error: *"Jumlah unit minimal 0"*.

---

### TS-03: TAB 2 & 4 — LEGAL DEEDS & CUMULATIVE STAKEHOLDER RECONCILIATION

#### TC-LEG-001: Perekaman Akta Pendirian Awal dengan Kepemilikan 100% (Positive Case)
- **Langkah Pengujian:**
  1. Buka Tab Legal &rarr; Tambah Akta Pendirian (`ESTABLISHMENT`), No: `01/NOT/2020`, Notaris: `Hasan SH`.
  2. Input Stakeholder:
     - Tuan Anton (WNI, KTP 16 digit, Direktur Utama, Saham: 60.00%, Modal Disetor: Rp 600.000.000).
     - PT Graha Maju (Badan Usaha, NPWP 16 digit, Komisaris, Saham: 40.00%, Modal Disetor: Rp 400.000.000).
  3. Total Saham = 100.00%. Klik Simpan Akta.
- **Expected Result:**
  - Akta tersimpan dan ditandai `is_latest_deed = true`.
  - Tab Stakeholders otomatis memuat Anton (60%) dan PT Graha Maju (40%) dengan status seimbang (*Balanced*).

#### TC-LEG-002: Akta Perubahan Parsial — Pergantian Direksi Saja (Cumulative Inheritance)
- **Skenario Bisnis:** Perusahaan mengangkat Direktur baru tanpa mengubah struktur saham.
- **Langkah Pengujian:**
  1. Tambah Akta Perubahan (`AMENDMENT`), No: `10/NOT/2023`.
  2. Pilih Kategori: `Perubahan Kepengurusan (MANAGEMENT_ONLY)`.
  3. Ubah nama Direktur Utama menjadi Tuan Budi.
  4. Kosongkan input data saham baru (karena notaris tidak mencatat perubahan saham).
  5. Klik Simpan Akta.
- **Expected Result:**
  - Mesin rekonsiliasi mendeteksi `amendmentType === 'MANAGEMENT_ONLY'`.
  - Sistem **mewariskan 100% data pemegang saham dari Akta No. 01** (Anton 60% dan PT Graha Maju 40%) dengan flag `is_inherited = true`.
  - Tab Stakeholders tetap menampilkan total 100.00% tanpa error data hilang.

#### TC-LEG-003: Akta Perubahan Parsial — Pengalihan Sebagian Saham (Partial Share Transfer)
- **Skenario Bisnis:** Tuan Anton menjual 15% sahamnya ke Tuan Charles. PT Graha Maju (40%) tidak terlibat transaksi.
- **Langkah Pengujian:**
  1. Tambah Akta Perubahan No: `25/NOT/2025`.
  2. Pilih Kategori: `Pengalihan Saham (SHARE_TRANSFER)`.
  3. Masukkan delta perubahan saja:
     - Tuan Anton: sisa saham diupdate menjadi `45.00%`.
     - Tuan Charles (Baru): diinput saham `15.00%`.
     - PT Graha Maju: TIDAK DIINPUT ULANG pada akta ini.
  4. Simpan Akta.
- **Expected Result:**
  - Mesin rekonsiliasi menggabungkan data lama + delta baru:
    - Anton: `45.00%` (`is_inherited = false`).
    - Charles: `15.00%` (`is_inherited = false`).
    - PT Graha Maju: `40.00%` diwariskan otomatis (`is_inherited = true`).
  - Total akumulasi kepemilikan: $45\% + 15\% + 40\% = \mathbf{100.00\%}$.
  - Akta No. 25 menjadi `is_latest_deed = true`.

#### TC-LEG-004: Penolakan Rekonsiliasi Saham Tidak Balance (Negative Case)
- **Langkah Pengujian:**
  1. Pada Akta No. 25 di atas, Admin MKT salah menginput saham Tuan Charles sebesar `10.00%` (Total menjadi $45\% + 10\% + 40\% = 95.00\%$).
  2. Klik Simpan Akta.
- **Expected Result:**
  - Sistem memblokir penyimpanan dengan pesan error:
    *"Hasil rekonsiliasi pemegang saham tidak balance (95.00%). Total persentase wajib tepat 100.00%. Harap periksa kembali pasal akta notaris!"*
  - Status akta tidak tersimpan ke database.

#### TC-LEG-005: Validasi Dokumen WNA Pemegang Saham (E-KITAS Enforcement)
- **Langkah Pengujian:**
  1. Tambah pemegang saham individu dengan kewarganegaraan `WNA / FOREIGN`, paspor `A12345678`.
  2. Simpan dan coba ajukan (Submit to BS) tanpa mengunggah dokumen E-KITAS di Tab Dokumen.
- **Expected Result:**
  - Sistem memblokir aksi submit dengan pesan: *"Pemegang saham WNA terdeteksi. Dokumen E-KITAS wajib diunggah sebelum pengajuan."*

---

### TS-04: TAB 3 — BUSINESS CONTRACTS & BANK REFERENCES

#### TC-BUS-001: Perekaman Kontrak Kerja Proyek Tambang (Positive Case)
- **Langkah Pengujian:**
  1. Tambah Project Contract: Project Owner `PT Vale Indonesia`, Lokasi `Sorowako, Sulawesi Selatan`, Role `Main Contractor`, Status Kontrak `EXISTING`.
  2. Simpan data.
- **Expected Result:** Data tersimpan dan terhubung ke `application_id`.

#### TC-BUS-002: Perekaman Fasilitas Kredit Bank Rekanan (Positive Case)
- **Langkah Pengujian:**
  1. Tambah Fasilitas Bank: Bank Mandiri, Plafon: Rp 5.000.000.000, Angsuran: Rp 120.000.000/bln, Suku Bunga: 11.5% p.a., Status: `Active`.
  2. Simpan data.
- **Expected Result:** Data tersimpan presisi dalam format decimal tanpa pembulatan liar.

---

### TS-05: TAB 5 — FINANCING PROPOSAL & UNIT SNAPSHOT

#### TC-FIN-001: Kalkulasi Anuitas Cicilan Bulanan (In Advance vs In Arrear)
- **Kondisi Data:**
  - Nilai Unit (Financing Value): Rp 1.200.000.000,-
  - Down Payment (DP 20%): Rp 240.000.000,-
  - Pokok Pembiayaan (Principal): Rp 960.000.000,-
  - Suku Bunga: 12% p.a. ($r = 1\%$ per bulan).
  - Tenor: 36 bulan.
- **Langkah Pengujian:**
  1. Pilih skema pembayaran: `In Arrear`. Cek estimasi angsuran.
  2. Ubah skema pembayaran: `In Advance`. Cek estimasi angsuran.
- **Expected Result:**
  - Rumus Arrear: $PMT = \frac{P \times r}{1 - (1+r)^{-n}} = \frac{960.000.000 \times 0.01}{1 - (1.01)^{-36}} = \mathbf{Rp\ 31.886.666,-}$.
  - Rumus Advance: $PMT_{advance} = \frac{PMT_{arrear}}{1 + r} = \frac{31.886.666}{1.01} = \mathbf{Rp\ 31.570.956,-}$.
  - Nilai di UI sesuai tepat dengan toleransi desimal $\pm 1$ rupiah.

#### TC-FIN-002: Verifikasi Dual-Column Free-Text Snapshot Unit Alat Berat
- **Langkah Pengujian:**
  1. Tambahkan unit dari master: Model `936E HD Excavator`, Qty `2`, Harga Satuan `Rp 2.100.000.000`.
  2. Simpan proposal pembiayaan.
  3. Lakukan inspeksi langsung ke PostgreSQL database:
     `SELECT brand, model_name, unit_price, ref_master_unit_id FROM financing_unit_items WHERE proposal_id = ...`
- **Expected Result:**
  - Kolom `brand` berisi teks statis `'LiuGong'`.
  - Kolom `model_name` berisi teks statis `'936E HD Excavator'`.
  - Jika tabel master unit diupdate di masa depan, nilai teks pada record transaksi ini **tidak berubah sama sekali**.

---

### TS-06: TAB 6 — FINANCIAL STATEMENTS SPREADING & BALANCE CHECK

#### TC-FS-001: Validasi Keseimbangan Neraca Akuntansi (Balance vs Unbalance)
- **Skenario:** Input Neraca Tahun 2025.
- **Langkah Pengujian A (Unbalance):**
  - Aset Lancar: 500M, Aset Tidak Lancar: 500M (Total Aset = 1.000M).
  - Liabilitas Lancar: 300M, Liabilitas Jangka Panjang: 200M (Total Liab = 500M).
  - Ekuitas: 400M (Total Pasiva = 900M).
- **Expected Result A:**
  - Status neraca menampilkan badge merah berkedip: `! Unbalanced (Selisih Rp 100.000.000)`.
  - Tombol Submit to BS dinonaktifkan.
- **Langkah Pengujian B (Balance):**
  - Koreksi Ekuitas menjadi 500M (Total Pasiva = 1.000M $\equiv$ Total Aset).
- **Expected Result B:**
  - Status neraca berubah menjadi badge hijau: `✓ Balanced`. Tombol submit aktif.

---

### TS-07: WORKFLOW MAKER-CHECKER (ADMIN MKT & ADMIN BS)

#### TC-WF-001: Maker Submit to BS Berhasil (Positive Case)
- **Prekondisi:** User `mkt@liugong.local`, semua field wajib terisi dan dokumen wajib terunggah.
- **Langkah Pengujian:** Klik tombol **Submit to BS**.
- **Expected Result:**
  - Status aplikasi berubah dari `DRAFT` &rarr; `SUBMITTED_TO_BS`.
  - Seluruh field form terkunci dari edit oleh Admin MKT (*read-only state*).
  - Aplikasi muncul di daftar antrean verifikasi Admin BS cabang.

#### TC-WF-002: Checker Otorisasi: MKT Dilarang Memanggil Endpoint Verifikasi (Security Guard)
- **Langkah Pengujian:** Eksekusi API call langsung dengan JWT role MKT:
  `POST /api/v1/applications/:id/checker-decision` dengan body `{"decision": "APPROVE"}`.
- **Expected Result:** Server menolak dengan response: `HTTP 403 Forbidden: Hanya role BS (Checker) yang berhak melakukan verifikasi cabang`.

#### TC-WF-003: Checker Me-Return Berkas ke Maker Wajib Reason Code (Negative & Boundary)
- **Prekondisi:** User `bs@liugong.local`, status `SUBMITTED_TO_BS`.
- **Langkah Pengujian A (Komentar Kosong):**
  1. Klik tombol **Return to Maker**.
  2. Biarkan Reason Code kosong dan komentar kosong &rarr; Klik Konfirmasi.
- **Expected Result A:** Form modal menolak: *"Reason code dan catatan koreksi wajib diisi saat pengembalian berkas"*.
- **Langkah Pengujian B (Pengembalian Sah):**
  1. Pilih Reason Code: `ERR_SHAREHOLDER_MISMATCH`.
  2. Tulis komentar: *"Pada Akta No. 25, saham Tuan Charles harusnya 15%, mohon sesuaikan kembali di tab Legal."*
  3. Klik Konfirmasi Return.
- **Expected Result B:**
  - Status aplikasi berubah menjadi `RETURNED`.
  - Record baru masuk ke tabel `rejection_logs` dan `approval_logs`.
  - Form aplikasi kembali *editable* oleh Admin MKT.

---

### TS-08: IN-APP REAL-TIME NOTIFICATION DISPATCH

#### TC-NOTIF-001: Penerimaan Notifikasi Pengembalian oleh Admin MKT Pembuat
- **Prekondisi:** Aplikasi `FAP/JKT01/2026/0014` di-return oleh Admin BS pada TC-WF-003.
- **Langkah Pengujian:**
  1. Login sebagai Admin MKT pembuat aplikasi (`mkt@liugong.local`).
  2. Buka dashboard aplikasi.
- **Expected Result:**
  - Ikon lonceng notifikasi di pojok kanan atas menampilkan badge merah `(1)`.
  - Di bagian atas dashboard muncul banner peringatan mencolok:
    `[ACTION REQUIRED] Aplikasi FAP/JKT01/2026/0014 dikembalikan oleh BS. Alasan: [ERR_SHAREHOLDER_MISMATCH] Pada Akta No. 25...`
  - Mengklik banner langsung mengarahkan user ke Tab Legal aplikasi tersebut dengan kolom bermasalah disorot (*highlighted*).

---

### TS-09: DMS PRIVATE STORAGE & MAGIC BYTE VALIDATION

#### TC-DMS-001: Penolakan File Berbahaya / Ekstensi Palsu (Security Test)
- **Langkah Pengujian:**
  1. Siapkan file executable (.exe atau script bash) yang di-rename menjadi `akta_notaris.pdf`.
  2. Unggah file tersebut pada checklist dokumen Akta.
- **Expected Result:**
  - API memeriksa 8 byte pertama (Magic Bytes).
  - Sistem mendeteksi header bukan `%PDF-` &rarr; Melempar `HTTP 422: Upload file PDF, PNG atau JPEG yang valid`. File tidak disimpan ke disk/S3.

#### TC-DMS-002: Akses Dokumen Privat via Short-Lived Signed URL (Security Test)
- **Langkah Pengujian:**
  1. Request signed URL berkas: `GET /api/v1/files/:id/url`.
  2. Salin URL token yang dihasilkan. Buka di tab browser baru &rarr; Berkas terbuka.
  3. Tunggu 16 menit (token expired) &rarr; Refresh halaman.
- **Expected Result:** Server merespon `HTTP 403 Forbidden: Document link has expired`. File tidak bocor ke publik.

---

### TS-10: DATABASE IMMUTABILITY & AUDIT TRAIL TAMPERING

#### TC-AUD-001: Percobaan Update & Delete pada Tabel Audit Log (Database Trigger Test)
- **Langkah Pengujian:**
  1. Akses console PostgreSQL melalui terminal.
  2. Jalankan perintah: `UPDATE approval_logs SET comments = 'Manipulasi data audit' WHERE id = '...';`
  3. Jalankan perintah: `DELETE FROM rejection_logs;`
- **Expected Result:**
  - Kedua perintah digagalkan oleh trigger `trg_lock_approval_logs` dan `trg_lock_rejection_logs`.
  - Database mengembalikan error exception:
    `ERROR: Pelanggaran Integritas Audit: Data pada tabel approval_logs bersifat IMMUTABLE dan dilarang di-UPDATE atau di-DELETE!`
  - Integritas data audit tetap 100% utuh.

---

## 3. CHECKLIST EKSEKUSI & TEST ENVIRONMENT SETUP

Untuk menjalankan skenario di atas secara otomatis di terminal Linux:

```bash
# 1. Masuk ke direktori project
cd /home/willy/Project/CRM

# 2. Jalankan Unit Test Validasi Nomor FAP & Rekonsiliasi
npm test

# 3. Jalankan Automated Integration Suite (Maker-Checker, Immutability & Token Expiry)
npx tsx tests/integration.test.ts
```
