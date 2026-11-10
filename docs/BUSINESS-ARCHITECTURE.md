# DOKUMEN SPESIFIKASI BISNIS & OPERASIONAL LENGKAP:
# MEKANISME REKONSILIASI AKTA PERUBAHAN, SINKRONISASI STAKEHOLDER, DAN ALUR APPROVAL DUAL-ROLE (MAKER-CHECKER)

**Nomor Dokumen:** LFI/SOP-SPEC/LEGAL-APPROVAL/2026/001  
**Entitas:** PT LiuGong Finance Indonesia (LFI) — Captive Heavy Equipment Multi-Finance  
**Klasifikasi:** Standar Operasional Prosedur & Spesifikasi Fungsional Sistem  
**Penyusun:** Business Process Architecture & Legal Risk Team  
**Reviewer:** Willy (Product Owner & Lead Architect)  
**Versi:** 3.0 (Edisi Lengkap — Delta Rekonsiliasi Akta & Alur Maker-Checker)  
**Tanggal Rilis:** Oktober 2026  

---

## 1. PENDAHULUAN & MASALAH BISNIS AKTA PERUBAHAN NOTARIS

### 1.1 Karakteristik Nyata Akta Perubahan Notaris di Indonesia (The Legal Reality)
Dalam praktik hukum perseroan terbatas (UU No. 40 Tahun 2007 tentang PT) dan kebiasaan akta notaris di Indonesia:
- **Akta Perubahan TIDAK SELALU Memuat Ulang Seluruh Struktur Kepemilikan:**
  Ketika sebuah PT melakukan perubahan anggaran dasar atau kepengurusan, Notaris sering kali **hanya menuangkan klausul perubahan parsial (Delta Update)**, misalnya:
  1. *Perubahan Direksi/Komisaris saja:* Akta hanya menyebutkan pengangkatan direktur baru dan pemberhentian direktur lama, tanpa menyebutkan siapa saja pemilik saham.
  2. *Pengalihan Sebagian Saham (Jual Beli Saham Tertentu):* Akta hanya mencatat Tuan A menjual 10% sahamnya kepada Tuan C. Nama pemegang saham lain (Tuan B yang memegang 50%) tidak dibahas secara mendalam atau tidak dirinci ulang di dalam batang tubuh akta tersebut.
  3. *Peningkatan Modal Ditempatkan oleh Satu Pihak Saja.*

### 1.2 Dampak Kritis Jika Sistem Mengasumsikan Input Kosong sebagai 0%:
Jika sistem aplikasi CRM hanya membaca data mentah dari Akta Perubahan yang diinput admin secara parsial:
- Pemegang saham lama yang sah (namun tidak disebutkan di akta perubahan baru) akan hilang (*terhapus dari sistem*).
- Total persentase kepemilikan saham di sistem menjadi tidak balance (< 100%), sehingga aplikasi terblokir secara keliru.
- Informasi beneficial owner / pemegang saham pengendali menjadi bias, menyesatkan komite kredit.

### 1.3 Solusi Bisnis: Mekanisme Rekonsiliasi Berantai (*Cumulative Legal State Inheritance*)
Sistem mengadopsi prinsip **Rekonsiliasi Status Hukum Berkelanjutan**:
Setiap Akta Perubahan diperlakukan sebagai **Delta Patch** terhadap status hukum terakhir. Jika suatu data (misal pemegang saham lama atau direksi lama) tidak mengalami perubahan dalam akta baru, maka data tersebut **diwariskan secara otomatis (*inherited/merged*)** dari posisi hukum akta sebelumnya, sehingga susunan hukum PT selalu lengkap, utuh, dan valid 100.00%.

---

## 2. PEMISAHAN PERAN TEGAS: MAKER & CHECKER (SEPARATION OF DUTIES)

Untuk memitigasi risiko kesalahan input (*human error*) dan manipulasi dokumen di tingkat cabang, diterapkan prinsip perbankan **Four-Eyes Principle (Maker - Checker)**:

```
┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
│       1. MAKER (PEMBUAT DATA)        │        │      2. CHECKER (PEMERIKSA BERKAS)   │
│       Role: ADMIN MARKETING          │        │   Role: ADMIN BUSINESS SUPPORT (BS)  │
├──────────────────────────────────────┤        ├──────────────────────────────────────┤
│ • Membuat draft aplikasi baru.       │        │ • Memeriksa keaslian fisik dokumen   │
│ • Input Akta Pendirian & Perubahan.  │        │   dan legalitas notaris.             │
│ • Melakukan delta update pemegang    │        │ • Memvalidasi hasil rekonsiliasi     │
│   saham & susunan direksi.           │        │   saham kumulatif (wajib 100.00%).   │
│ • Mengunggah scan dokumen legal asli.│        │ • Mengambil keputusan: APPROVE       │
│ • Mengirimkan berkas: SUBMIT TO BS.  │        │   (lanjut ke Pusat) atau REJECT/     │
│ • Menerima notifikasi revisi jika    │        │   RETURN (kembali ke Admin MKT).     │
│   berkas ditolak/dikembalikan.       │        │ • Wajib menyertakan Reason jelas.    │
└──────────────────────────────────────┘        └──────────────────────────────────────┘
```

---

## 3. MEKANISME REKONSILIASI AKTA PERUBAHAN & STAKEHOLDER (STEP-BY-STEP)

### 3.1 Tipe Kategori Akta Perubahan (Master Categories)
Admin Marketing (Maker) saat menambahkan Akta Perubahan wajib memilih **Kategori Perubahan Utama**:
1. `AMEND_MANAGEMENT`: Perubahan Susunan Direksi & Dewan Komisaris.
2. `AMEND_SHARE_TRANSFER`: Pengalihan / Jual Beli Saham Antar Pihak.
3. `AMEND_CAPITAL_INCREASE`: Peningkatan Modal Dasar / Modal Disetor.
4. `AMEND_PURPOSE_KBLI`: Perubahan Bidang Usaha / Anggaran Dasar.
5. `AMEND_FULL_RESTATEMENT`: Perubahan Menyeluruh / Pengeluaran Saham Baru Total.

### 3.2 Logika Pewarisan & Penggabungan Data (The Merge Algorithm)
Ketika Admin MKT menambahkan Akta Perubahan:
1. **Pre-populate dari Posisi Hukum Terakhir:**
   Sistem secara otomatis menampilkan (*pre-fill*) susunan Direksi, Komisaris, dan Pemegang Saham dari posisi akta sebelumnya.
2. **Input Perubahan Parsial (Hanya Bagian yang Berubah):**
   - *Kasus 1: Pengalihan Saham Parsial:* Admin MKT cukup mengedit persentase Tuan A (dari 40% menjadi 30%) dan menambahkan Tuan C (10%). Pemegang saham Tuan B (60%) tidak perlu diinput ulang karena sistem mempertahankan datanya.
   - *Kasus 2: Perubahan Direksi Saja:* Admin MKT cukup memperbarui nama Direktur Utama. Sistem secara otomatis **mengunci dan menyalin seluruh struktur pemegang saham 100% dari akta sebelumnya** ke dalam catatan posisi hukum akta baru ini.
3. **Validasi Mutlak 100.00% pada Posisi Hasil Rekonsiliasi:**
   Setelah proses merger/editing parsial selesai, sistem mengecek posisi akhir:
   $$\sum \text{Persentase Saham Hasil Rekonsiliasi} \equiv 100.00\%$$
   Jika tidak tepat 100.00%, Admin MKT diberikan peringatan visual dan tombol submit dikunci sampai angka rekonsiliasi seimbang.

---

## 4. ALUR APPROVAL, REJECT FLOW, REASON CODE & NOTIFIKASI MAKER-CHECKER

```
    [ ADMIN MARKETING (MAKER) ]
                 │
                 │ 1. Input Aplikasi, Akta & Dokumen Scan
                 │ 2. Cek Rekonsiliasi Saham 100%
                 ▼
       ( Action: SUBMIT_TO_BS )
                 │
                 ▼
    [ ADMIN BUSINESS SUPPORT (CHECKER) ]
                 │
                 ├───────────────────────────────────────────────────────┐
                 │                                                       │
                 ▼                                                       ▼
       [ KEPUTUSAN: APPROVE ]                                  [ KEPUTUSAN: REJECT / RETURN ]
                 │                                                       │
    • Status: BS_VERIFIED                                   • Status: RETURNED_TO_MAKER
    • Berkas terkunci dari edit MKT.                        • Form kembali EDITABLE oleh MKT.
    • Berkas diteruskan ke kantor pusat                     • Wajib memilih REASON CODE
      (Credit Analyst & Legal Counsel).                       dan mengisi catatan revisi.
    • Notifikasi Sukses dikirim ke MKT.                                  │
                                                            • DISPATCH NOTIFIKASI REAL-TIME
                                                              ke Admin Marketing pembuat:
                                                              - Bell Notification UI
                                                              - Status Badge di Dashboard
                                                              - Email / Push Alert Cabang
                                                                         │
                                                                         ▼
                                                            [ ADMIN MARKETING (MAKER) ]
                                                              • Membaca catatan penolakan.
                                                              • Melakukan perbaikan data/upload ulang.
                                                              • Re-submit kembali ke BS.
```

### 4.1 Matriks Reason Code Penolakan / Pengembalian (Reject / Return Reasons)
Admin Business Support (Checker) **wajib** memilih minimal satu *Reason Code* standar serta menuliskan catatan instruksi spesifik (*mandatory comments*):

| Reason Code | Kategori Masalah | Contoh Catatan Checker (BS) yang Diterima MKT |
|---|---|---|
| `ERR_LEGAL_DEED_INCOMPLETE` | Dokumen Akta | *"Salinan Akta Perubahan No. 12 halaman 4 dan 5 terpotong, mohon scan ulang berkas notaris secara lengkap."* |
| `ERR_SK_MENKUMHAM_MISSING` | Legalitas Kemenkumham | *"SK Pengesahan Menkumham untuk Akta No. 12 belum dilampirkan. Wajib upload bukti AHU."* |
| `ERR_SHAREHOLDER_MISMATCH` | Susunan Pemegang Saham | *"Hasil rekonsiliasi saham tidak sesuai pasal 4 akta perubahan. Ada peralihan hak yang belum dicatat."* |
| `ERR_KTP_NPWP_INVALID` | Identitas Pengurus/Pemilik | *"KTP Direktur Utama buram dan NPWP PT belum tervalidasi pada sistem DJP."* |
| `ERR_MANDATORY_DOC_EXPIRED` | Masa Berlaku Dokumen | *"NIB atau izin usaha operasional telah habis masa berlaku. Mohon minta update izin terbaru ke nasabah."* |
| `ERR_OTHER` | Lain-lain | *Keterangan bebas instruksi khusus dari Checker.* |

### 4.2 Format Notifikasi Terkirim ke Admin Marketing (Maker Notification Payload)
Ketika Checker menekan tombol **Return / Reject**, sistem mengeksekusi dispatch notifikasi otomatis:

```json
{
  "event": "APPLICATION_RETURNED_BY_CHECKER",
  "applicationId": "f9b8c120-45a1-4bc7-9122-192837465abc",
  "fapNumber": "FAP/JKT01/2026/0014",
  "customerName": "PT MANDIRI ALAM PERKASA",
  "recipientUserId": "user_mkt_willy",
  "recipientEmail": "willy.mkt@liugong.local",
  "rejectedBy": "Siti Rahma (Admin Business Support)",
  "rejectedAt": "2026-10-01T03:15:00Z",
  "reasonCode": "ERR_SHAREHOLDER_MISMATCH",
  "reasonTitle": "Ketidaksesuaian Struktur Pemegang Saham",
  "comments": "Pada Akta Perubahan No. 15, saham Tuan Handoko telah dialihkan ke PT Cipta Investama sebesar 25%. Mohon perbarui susunan pemegang saham di tab Legal agar hasil rekonsiliasi akurat.",
  "actionUrl": "/willybrain/crm/applications/f9b8c120-45a1-4bc7-9122-192837465abc?tab=legal"
}
```

---

## 5. AUDIT TRAIL IMMUTABLE PADA PROSES MAKER-CHECKER

Setiap pergantian status dari Maker ke Checker, ataupun keputusan pengembalian berkas, dicatat ke dalam buku besar audit digital yang tidak dapat diubah:
1. **Pencatatan Aktor:** Dicatat nama lengkap pembuat (*Maker*) dan nama pemeriksa (*Checker*).
2. **Pencatatan Delta Perubahan:** Sistem menyimpan rekaman JSON sebelum (*before*) dan sesudah (*after*) perbaikan dilakukan.
3. **Penyimpanan Alasan Penolakan:** Catatan koreksi Checker tersimpan abadi sebagai bukti historis jika kelak terjadi komplain keterlambatan proses aplikasi kredit.
