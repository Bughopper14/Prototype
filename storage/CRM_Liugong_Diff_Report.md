# Laporan Audit & Diff Lengkap: `CRM_Liugong_Database_Design.xlsx` vs Original `plan-schema.sql` / `plan-seed.sql` vs `prototype-src`

- **Blueprint Excel:** `c:\Users\reage\Documents\ChatGPT\testlfidash\prototype-src\storage\CRM_Liugong_Database_Design.xlsx` (identik dengan copy di `Downloads`)
- **SQL Target (Original):** `c:\Users\reage\Documents\ChatGPT\testlfidash\prototype-src\storage\plan-schema.sql` & `c:\Users\reage\Documents\ChatGPT\testlfidash\prototype-src\storage\plan-seed.sql`
- **Codebase & DB Legacy Pembanding:** `c:\Users\reage\Documents\ChatGPT\testlfidash\prototype-src\apps\backend\db\schema.sql`, `c:\Users\reage\Documents\ChatGPT\testlfidash\prototype-src\apps\backend\db\seed.sql`, `c:\Users\reage\Documents\ChatGPT\testlfidash\prototype-src\packages\shared\src`, `c:\Users\reage\Documents\ChatGPT\testlfidash\prototype-src\apps\backend\src\modules`, `c:\Users\reage\Documents\ChatGPT\testlfidash\prototype-src\apps\frontend\src\features`

---

## 1. Perbandingan `CRM_Liugong_Database_Design.xlsx` vs Original `plan-schema.sql` & `plan-seed.sql`

| Metrik | Excel (`CRM_Liugong_Database_Design.xlsx`) | `plan-schema.sql` / `plan-seed.sql` (Original) | Status |
|---|---:|---:|---|
| Jumlah Tabel | 91 | 91 | Identik 100% |
| Jumlah Kolom | 1.253 | 1.253 | Identik 100% (0 selisih nama/nullability) |
| Jumlah Foreign Key | 156 | 156 | Identik 100% |
| Jumlah PK / Unique / Index | 218 | 218 (91 PK + UK + Index) | Identik 100% |
| Tabel yang Di-seed | 39 | 39 | Identik 100% (jumlah baris semua 39 tabel sama persis) |

> **Catatan teknis minor:** Pada **26 tabel** di sheet `02_Users_and_Master`, `03_Core_and_FAP_Live`, dan `04_Freeze_History`, hanya ada perbedaan gaya penulisan Excel vs SQL seperti `ENUM(DRAFT, ...)` vs `ENUM('DRAFT', ...)` dan `TINYINT(UNSIGNED)`/`SMALLINT(UNSIGNED)` vs `TINYINT UNSIGNED`/`SMALLINT UNSIGNED`. Tidak ada perbedaan struktur sama sekali antara `.xlsx` dan dua file SQL original.

---

## 2. Daftar Lengkap Apa Saja yang KURANG / HILANG terhadap `prototype-src`

| Gap ID | Severity | Area | Target | Ringkasan Kekurangan | Dampak pada `prototype-src` |
|---|---|---|---|---|---|
| `GAP-01` | **CRITICAL** | Transaksi & UI Mapping | `Pre-Analysis Module` | Tidak ada tabel transaksi Pre-Analysis & tidak ada di sheet 05_Frontend_Field_Mapping | prototype-src punya application_pre_analysis (JSON form_data), new_application_pre_analisis (25 col), modul backend modules/pre-analysis/*, script import-pre-analysis.ts, & UI features/pre-analysis/* |
| `GAP-02` | **CRITICAL** | Auth & Session | `users_users` | Hilang kolom session_timeout_minutes | users (10 col) di schema.sql memiliki session_timeout_minutes; dibaca/diubah oleh auth/session.ts, users.controller.ts, SessionTimeoutForm.tsx, UsersTab.tsx |
| `GAP-03` | **CRITICAL** | Auth & Session | `users_session_logs` | Hilang kolom last_activity dan expires_at | session_logs (11 col) memakai last_activity & expires_at di createSessionRecord() & verifySession() (auth/session.ts) + SessionsTab.tsx |
| `GAP-04` | **CRITICAL** | RBAC & Workflow Seed | `users_roles` | Hilang Role ID 2 (Super Admin CRM) dan seluruh role operasional workflow (BS, HEAD_BS, CA, LEGAL, COMMITTEE, Finance, CFO) | seed.sql lama punya Role 2 (Super Admin CRM); users.repository.ts enum ['MKT','BS','HEAD_BS','CA','LEGAL','COMMITTEE','ADMIN']; workflow transition.ts butuh BS, CA, LEGAL, COMMITTEE |
| `GAP-05` | **CRITICAL** | Workflow Execution | `crm_master_workflow (09_Workflow)` | 9 dari 12 transisi workflow berstatus 'BELUM ADA ROLE' di blueprint | applications/intake/transition.ts mengecek crm_workflow_submit (33), crm_workflow_verify_documents (34), crm_workflow_start_review (35), crm_workflow_recommend_credit (36), crm_workflow_recommend_legal (37), crm_workflow_final_decision (38), crm_workflow_return (39) |
| `GAP-06` | **HIGH** | RBAC Authority Seed | `users_authorities & users_role_authorities` | Kurang Authority ID 15 (crm_quick_add_master_option) dan 41 baris mapping role_authorities | AUTHORITY_CATALOG (packages/shared/src/authorities.ts) & seed.sql lama punya 40 authorities (termasuk id=15) & 80 role_authorities; id=15 dicek di master-data.controller.ts:42 |
| `GAP-07` | **HIGH** | Users Seed | `users_users & users_user_app_roles` | Hanya 1 user (admin) yang bahkan tidak punya row role untuk app_id=2 (CRM Dashboard) | auth/session.ts hanya mengizinkan admin masuk CRM karena hardcode username 'admin'; user lain/per-role tidak tersedia untuk testing multi-role maker-checker |
| `GAP-08` | **HIGH** | Master Data Equipment Seed | `crm_master_equipment_brands/types/models/assets` | 4 tabel turunan Equipment kosong (0 baris seed) | defaultMasterCatalog() (packages/shared/src/master-catalog.ts:247-251) me-seed hierarchy HE -> LiuGong -> Hydraulic Excavator -> 936E -> Excavator |
| `GAP-09` | **HIGH** | User Profile Merge Gap | `users_users vs crm_users` | Penggabungan crm_users ke users_users menghilangkan kolom department, phone, last_login_at, created_by, updated_by | crm_users (16 col) di users.repository.ts menyimpan department, phone, is_admin, is_placeholder, last_login_at, created_by, updated_by + syncCrmUser() |
| `GAP-10` | **HIGH** | Removed Fields Still in Codebase | `skt_no, sppkp_no & customerCategory mandatory` | SKT No & SPPKP No dihapus di Excel/plan-schema; customerCategory mandatory flag berubah 0 -> 1 | packages/shared/src/fields.ts (sktNo, sppkpNo), master-customer-fill.ts, intake/initialize.ts, fap/archive/record.ts masih menyimpan/mengirim sktNo/sppkpNo; seed.sql lama customerCategory=0 |
| `GAP-11` | **HIGH** | UI Mapping Coverage | `05_Frontend_Field_Mapping` | Sheet 05 hanya memetakan Tab 1-6 Application Workspace (FAP + Legal + Docs + Activity) | 5 modul UI utama belum dipetakan di sheet 05: features/pre-analysis, features/customers, features/master-data, features/user-management & portal, features/overview |
| `GAP-12` | **MEDIUM** | OCR KTP Column & Naming | `crm_fap_ocr_ktp & ocr_*` | Kolom OCR diterjemahkan ke Inggris (perlu update identity-documents.controller.ts) & belum ada street_address | identity-documents.controller.ts menulis nama kolom Indonesia (nama, alamat, kel_desa, kecamatan, ile_name) ke tabel ktp/npwp/passport/kitas |
| `GAP-13` | **MEDIUM** | Master Data ENUM 'NONE' & Kata Legal Remarks | `ENUMs & master-catalog.ts` | Nilai 'NONE' dihapus dari ENUM/master & legal remark categories berubah ke 6 nama Indonesia | fields.ts & master-catalog.ts masih memakai 'NONE' pada representativeType, designation, signatory, idType, title, maritalStatus; legal-masters punya 8 item termasuk alias kebab-case |
| `GAP-14` | **MEDIUM** | Soft-Delete & FK Refactoring | `is_active (1/NULL) & UUID *_id FKs` | 14 modul backend masih query kolom teks/code & deleted_at IS NULL tanpa is_active=NULL dan tanpa tabel JSON master_data/application_submit_lock/fap_submission_archive | Backend saat ini memakai code/string langsung (branch_code, province, city, document_code) & JSON blobs (ocr_comparison_json, master_data.catalog, fap_submission_archive) |

### Detail Kekurangan Kritis (`CRITICAL` & `HIGH`)

1. **Modul `pre-analysis` tidak memiliki tabel transaksi (`GAP-01`):**
   - Excel & `plan-schema.sql` hanya punya tabel master `crm_master_preanalysis_investment_options`.
   - Di `prototype-src`, `modules/pre-analysis` (`application_pre_analysis` + `new_application_pre_analisis`), `scripts/import-pre-analysis.ts`, dan `features/pre-analysis` menyimpan puluhan field & struktur bersarang (General Info, Project Info + Current/History/Investment Plans, Group Structure Holding/Subsidiaries/Shareholders, Milestones, Equipment Unit Composition, QA/Delivery Status, Entity SLIK/Pefindo Reviews & Lender Exposures, Assessment & Signatories). Sheet `05_Frontend_Field_Mapping` juga belum memetakan satu pun field Pre-Analysis.
2. **Autentikasi & Manajemen Sesi akan langsung error SQL (`GAP-02`, `GAP-03`):**
   - `users_users` kehilangan `session_timeout_minutes` (dipakai di `modules/auth/session.ts`, `modules/users/users.controller.ts`, `SessionTimeoutForm.tsx`, `UsersTab.tsx`).
   - `users_session_logs` kehilangan `last_activity` dan `expires_at` (dipakai di `createSessionRecord()` & `verifySession()` pada `auth/session.ts` serta `SessionsTab.tsx`).
   - Penggabungan `crm_users` ke `users_users` juga tidak membawa kolom `department`, `phone`, `last_login_at`.
3. **RBAC & Workflow macet pada 9 dari 12 transisi (`GAP-04`, `GAP-05`, `GAP-06`, `GAP-07`):**
   - `users_roles` hanya me-seed **3 role** (`1=Super Admin Portal`, `3=Marketing (MKT)`, `10=Legal Approval`). Role **`2=Super Admin` (CRM)** dari `seed.sql` lama hilang, dan tidak ada role **`BS`, `HEAD_BS`, `CA`, `LEGAL` (Officer), `COMMITTEE`, `Finance`, `CFO`**.
   - Dampaknya di `09_Workflow`: **9 dari 12 transisi bertanda `BELUM ADA ROLE`** (authority `35..39`: `START_REVIEW`, `RECOMMEND_CA`, `RECOMMEND_LEGAL`, `APPROVE_COMMITTEE`, `REJECT_COMMITTEE`, `RETURN`).
   - `users_authorities` di `plan-seed.sql` (39 baris) kehilangan **`id=15` (`crm_quick_add_master_option`)** yang ada di `packages/shared/src/authorities.ts` dan dicek oleh `master-data.controller.ts`.
   - `users_role_authorities` turun dari **80 baris** (`seed.sql` lama) menjadi **39 baris** (hilang 40 mapping Role `2` + `(3, 15)`).
   - `users_users` hanya berisi **1 user `admin`** dan `users_user_app_roles` hanya memberinya akses app `1` (User Management), bukan app `2` (CRM Dashboard).
4. **Master Equipment turunan kosong (`GAP-08`):**
   - `crm_master_equipment_brands`, `crm_master_equipment_types`, `crm_master_equipment_models`, dan `crm_master_equipment_assets` semuanya **0 baris** di `plan-seed.sql` (berbeda dengan `defaultMasterCatalog()` di `packages/shared/src/master-catalog.ts` yang me-seed `LiuGong -> Hydraulic Excavator -> 936E -> Excavator`).
5. **Kolom dihapus / berubah aturan (`GAP-10`, `GAP-12`, `GAP-13`):**
   - `skt_no` & `sppkp_no` sengaja dihapus dari `crm_master_business_partners` & `crm_frozen_fap_applications`, padahal masih ada di `packages/shared/src/fields.ts`, `master-customer-fill.ts`, `intake/initialize.ts`, dan `fap/archive/record.ts`.
   - `crm_master_field_mandatory_rules`: dari 203 aturan (semua `field_key` sama dengan `master_mandatory` lama), **`customerCategory` berubah `is_mandatory` dari `0` menjadi `1`**.
   - `NONE` dihapus dari semua `ENUM` & master (`representative_type`, `designation`, `stakeholder_positions`, `signatory`, `id_type`, `title`, `marital_status`), padahal `packages/shared/src/fields.ts` masih memakai string `'NONE'`.
   - `crm_fap_ocr_*` mengubah seluruh nama kolom ke bahasa Inggris (`full_name`, `address`, `village_name`, `file_name` alih-alih `nama`, `alamat`, `kel_desa`, `ile_name`) dan belum ada `street_address` di `crm_fap_ocr_ktp`.
6. **Cakupan `05_Frontend_Field_Mapping` belum penuh (`GAP-11`):**
   - Baru memetakan **121 baris** komponen Tab 1–6 Application Workspace. Belum mencakup `features/pre-analysis`, `features/customers`, `features/master-data`, `features/user-management`, `features/portal`, dan `features/overview`.

---

## 3. Ringkasan Pemetaan 66 Tabel Legacy (`schema.sql`) -> 91 Tabel Target (`plan-schema.sql`)

Detail kolom-per-kolom lengkap tersedia di sheet `04_Table_Mapping_Old_vs_New` pada file Excel. Berikut ringkasan perubahan utamanya:

- **Tabel legacy yang kehilangan kolom saat dibawa ke DB baru:**
  - `users` -> `users_users`: hilang `session_timeout_minutes`.
  - `session_logs` -> `users_session_logs`: hilang `last_activity`, `expires_at`.
  - `crm_users` -> `users_users`: digabung, tetapi tidak membawa `user_id` UUID, `is_admin`, `is_placeholder`, `department`, `phone`, `role`, `last_login_at`, `created_by`, `updated_by`.
  - `master_cust_n_pic_business_partner` -> `crm_master_business_partners`: hilang `skt_no`, `sppkp_no`; semua dropdown/lokasi teks berubah ke `*_id` UUID FK + tambah `partner_code`, `country_id`, `deleted_at`.
- **Tabel legacy yang dipecah / dinormalisasi:**
  - `master_data` (1 baris JSON catalog) -> dihapus, diganti 37 tabel `crm_master_*`.
  - `financing_detail` -> `crm_fap_financing_proposals` + `crm_fap_proposal_terms` + `crm_fap_financing_purposes` + `crm_fap_doc_requirements`.
  - `daftar_akta` -> `crm_fap_legal_deeds` + `crm_fap_legal_deed_remark_categories` + `is_latest_deed`.
  - `application_submit_lock` -> digabung ke `crm_applications` + `crm_application_stage_progress` + `crm_fap_document_ocr_comparisons` + `crm_fap_document_ocr_discrepancies`.
  - `fap_submission_archive` -> dipecah menjadi **15 tabel `crm_frozen_fap_*`**.
  - **Hilang tanpa pengganti transaksi:** `application_pre_analysis` & bagian khusus form dari `new_application_pre_analisis`.

---

## 4. Dampak ke 14 Modul Backend & Fitur Frontend (`prototype-src`)

| Layer | Modul / Feature | Blocker / Risiko | Dampak Utama |
|---|---|---|---|
| Backend | `pre-analysis` | **CRITICAL** | Tidak ada tabel transaksi untuk `application_pre_analysis` / section 1–7 Pre-Analysis. |
| Backend | `auth` & `users` | **CRITICAL** | Error SQL karena `session_timeout_minutes`, `last_activity`, `expires_at` hilang + `crm_users` dihapus; seed role/authority/user tidak lengkap. |
| Backend | `applications` | **CRITICAL** | 9/12 transisi `crm_master_workflow` belum punya role; semua query `all_applications` & teks master harus direfactor ke UUID `*_id` FK + `is_active (1/NULL)`. |
| Backend | `fap`, `customers`, `master-data`, `documents`, `legal` | **HIGH** | Semua JSON blob (`fap_submission_archive`, `master_data`, `ocr_comparison_json`) dihapus; authority `id=15` hilang; 4 tabel equipment anak 0 baris; kode remark & `'NONE'` berubah. |
| Backend | `identity-documents`, `activity`, `portal` | **MEDIUM** | Nama kolom tabel OCR berbahasa Indonesia -> Inggris; log aktivitas & notifikasi memakai FK/kolom tambahan; portal perlu penyesuaian nama tabel `users_*`. |
| Frontend | `pre-analysis` | **CRITICAL** | Belum terpetakan di Excel (`05_Frontend_Field_Mapping`) dan belum ada tabel DB targetnya. |
| Frontend | `customers`, `master-data`, `user-management`, `portal`, `overview`, `applications..activity` | **HIGH / MEDIUM** | 5 modul di luar Tab 1–6 belum dipetakan di sheet 05; form aplikasi perlu adaptasi FK UUID `*_id`, hapus `'NONE'`, dan keputusan final untuk `sktNo`/`sppkpNo`. |

---

## 5. File Output Laporan

- Excel Workbook (6 sheets): `c:\Users\reage\Documents\ChatGPT\testlfidash\prototype-src\storage\CRM_Liugong_Diff_Report.xlsx`
- Markdown Report: `c:\Users\reage\Documents\ChatGPT\testlfidash\prototype-src\storage\CRM_Liugong_Diff_Report.md`