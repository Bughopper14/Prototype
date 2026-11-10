# INDEX — CRM Captive Multi-Finance LiuGong (LOS-DMS)

> ⚠️ **Loan Origination System (LOS) & Document Management System (DMS) untuk Pembiayaan Alat Berat PT LiuGong Finance Indonesia (LFI).**

---

## 1. Project Overview

```yaml
project: CRM
type: web-app
category: work (enterprise captive multi-finance)
client: PT LiuGong Finance Indonesia (LFI)
stack: React 18, TypeScript, Tailwind CSS, Express REST API, PostgreSQL 15+, MinIO/S3
source_path: /Willy/Project/CRM
repo: https://github.com/Bughopper14/Prototype
branch: main
status: active (architecture & specs complete)
```

---

## 2. Arsitektur & Logika Inti Produk

- **Target Bisnis**: Pembiayaan armada alat berat LiuGong (Excavator 936E HD, Wheel Loader 856H, Motor Grader) dengan skema Sewa Guna Usaha (Leasing) konvensional dan syariah.
- **Intake Nasabah**: Dual-path intake untuk `NEW` (validasi duplikasi NPWP/NIB, penerbitan FAP unik) dan `EXISTING` (pre-fill profil grup, penambahan fasilitas kredit baru).
- **Cumulative Legal State Inheritance**: Mengatasi kasus nyata akta perubahan notaris yang hanya memuat pembaharuan parsial (*delta* pengurus/pengalihan sebagian saham). Sistem secara otomatis mewariskan susunan pemegang saham lama yang tidak diamandemen sehingga kepemilikan modal tetap seimbang mutlak 100.00%.
- **Maker-Checker Governance**: Pemisahan peran tegas antara **Admin Marketing (Maker)** yang menginput dan mengunggah berkas dengan **Admin Business Support (Checker)** yang memvalidasi fisik akta, rasio saham, dan dokumen legal sebelum diteruskan ke Credit Analyst.
- **Standar Alasan Pengembalian (Reason Codes)**: Pengembalian berkas dari Checker ke Maker wajib menyertakan kode standar (`ERR_SHAREHOLDER_MISMATCH`, `ERR_LEGAL_DEED_INCOMPLETE`, `ERR_SK_MENKUMHAM_MISSING`, dll) disertai notifikasi in-app real-time.
- **Dual-Column Persistence**: Menyimpan snapshot teks statis bebas perubahan (`brand`, `model_name`, `unit_price`, `branch_name_snapshot`) di tabel transaksi untuk melindungi kontrak sewa guna usaha dari korupsi data historis jika master catalog berubah.
- **Append-Only Immutability**: Seluruh log audit persetujuan dan pengembalian dilindungi oleh PostgreSQL trigger anti-tampering yang menolak instruksi `UPDATE` dan `DELETE`.

---

## 3. Direktori Dokumentasi Enterprise (`docs/`)

Dokumentasi lengkap sistem tersimpan secara terstruktur di `/Willy/Project/CRM/docs/`:

1. **[`docs/BUSINESS-ARCHITECTURE.md`](docs/BUSINESS-ARCHITECTURE.md)**: Enterprise Business Requirements Document (BRD) v2.0, mencakup proses bisnis pembiayaan captive, lifecycle aplikasi, matriks peran, dan mitigasi risiko OJK.
2. **[`docs/TECHNICAL-ARCHITECTURE.md`](docs/TECHNICAL-ARCHITECTURE.md)**: Spesifikasi arsitektur teknikal, topologi monorepo, skema database DDL lengkap, algoritma rekonsiliasi saham TypeScript, dan kontrak API REST.
3. **[`docs/PLAN-CONCEPT.md`](docs/PLAN-CONCEPT.md)**: Product Requirements Document (PRD), peta kebutuhan fungsional MoSCoW, diagram alur rekonsiliasi akta, dan diagram sequence Maker-Checker.
4. **[`docs/PLAN-TECHNICAL.md`](docs/PLAN-TECHNICAL.md)**: Spesifikasi rekayasa teknikal, blueprint implementasi antarmuka tab, skrip migrasi database, dan matrix pengujian otomatis.
5. **[`docs/TEST-SCENARIOS.md`](docs/TEST-SCENARIOS.md)**: Comprehensive QA Test Suite Specification oleh QA Tester Meowth yang mencakup 10 Test Suite (76 Skenario Pengujian Rinci).

---

## 4. Struktur Database Utama

- `customers`: Master debitur (tipe badan usaha PT/CV/Individu, NIB, NPWP).
- `applications`: Berkas permohonan pembiayaan berstatus lifecycle (`DRAFT`, `SUBMITTED_TO_BS`, `RETURNED`, `BS_VERIFIED`, `IN_CREDIT_REVIEW`, dll).
- `legal_deeds`: Rekaman akta pendirian dan akta perubahan (nomor akta, notaris, nomor SK Menkumham, tanggal pengesahan).
- `deed_stakeholders`: Susunan pengurus dan pemegang saham per akta dengan flag `is_inherited` dan `source_deed_id`.
- `financing_proposals`: Usulan pembiayaan (tenor, DP, skema pembayaran Advance/Arrear, flat rate, effective rate).
- `financing_unit_items`: Daftar unit alat berat dengan pola snapshot kolom ganda.
- `rejection_logs` & `approval_logs`: Log jejak audit append-only yang kebal manipulasi.
- `notifications`: Antrean pemberitahuan in-app bagi Admin Marketing.

---

## 5. Status Milestone

| Fase | Deskripsi | Status |
|:---:|---|:---:|
| **Phase 1** | Reverse Engineering & Audit Codebase Prototype | ✅ Done |
| **Phase 2** | Virtual Office Run Analyst Brief, CTO & CEO Gate Review | ✅ Approved |
| **Phase 3** | Enterprise Documentation Suite (BRD, Tech Spec, PRD) | ✅ Done |
| **Phase 4** | QA Test Suite Specification (76 Test Scenarios) | ✅ Done |
| **Phase 5** | Database Schema Migration & Cumulative Reconciliation Engine | ⏳ Queued |
| **Phase 6** | UI Form Tab Refactoring & Maker-Checker Dashboard View | ⏳ Queued |
