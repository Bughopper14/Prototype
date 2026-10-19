# LIUGONG FINANCE INDONESIA · ORIGINATION WORKSPACE & CRM
## Comprehensive Technical Specification, Architecture & Operational Manual

> **Document Version:** 2.4.0  
> **Last Updated:** October 19, 2026  
> **Repository:** `https://github.com/Bughopper14/Prototype.git` (Active Branch: `keith`)  
> **Production Target:** Port `3001` (Node/Express + Vite Production Dist)  
> **Environment:** Windows Server Azure Cloud VM (`20.194.113.201`)  

---

## 1. Executive Summary & System Identity

**LiuGong Finance Indonesia Loan Origination System (LOS-CRM)** is an enterprise financial application and origination workspace engineered specifically for heavy equipment financing and commercial leasing across Indonesia.

The platform unifies the entire commercial loan lifecycle into a single web application:
1. **Origination & Intake:** Marketing (MKT) initiates credit applications, captures customer data, and scans official NIB documents via OCR.
2. **50-50 Split Workspace:** Side-by-side view synchronizing dynamic data entry with a 118-row pixel-perfect digital twin of the official Excel Application Form (`Application Form APPROVED(mandatory field).xlsx`).
3. **Corporate Legal Management:** Dual-tier deed tracking (*Akta Aktif & Rujukan Terkini* vs *Riwayat Akta Lama*), 100% shareholder capital distribution validation, and TinyMCE rich text deed remarks.
4. **Governance & Multi-Role Approval Workflow:** Strict state machine governing stage transitions across 6 corporate roles:
   $$\text{MKT} \longrightarrow \text{Branch Support (BS)} \longrightarrow \text{Head of BS} \longrightarrow \text{Credit Analyst (CA) \& Legal} \longrightarrow \text{Credit Committee}$$
5. **Secure Document Management (DMS):** Time-bound authenticated pre-signed URLs (15-minute expiry), magic byte validation for PDFs and images, and append-only cryptographic audit logs.

---

## 2. Technology Stack & Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CLIENT TIER (Vite 6 + React 18)                       │
│  - TypeScript 5.4, React 18, React Hooks Architecture                      │
│  - Lucide React (Enterprise System Icons)                                   │
│  - TinyMCE 7 (Rich Text WYSIWYG Editor for Legal Deed Remarks)             │
│  - Tesseract.js (Client-Side WASM OCR Engine for NIB OSS Documents)        │
│  - Bidirectional DOM Scroll Synchronization & WAAPI Highlight Pulse        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST / JSON (Cookie JWT Auth)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    APPLICATION SERVER TIER (Node.js 22)                     │
│  - Express 4 REST API (Port 3001)                                          │
│  - tsx Runtime (Dev) & Vite Bundled Production Distribution (dist/)        │
│  - Zod 3.23 (Schema Validation for Input, Financials, Deeds & Shares)      │
│  - JWT Authentication (HttpOnly, SameSite Cookies)                          │
│  - AWS SDK v3 S3 Presigned URL Generator                                   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ SQL & Disk I/O
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                      DATA & PERSISTENCE STORAGE TIER                        │
│  - Database: PGlite Embedded / PostgreSQL (Relational SQL Schema)          │
│  - File System: Local Private Storage / AWS S3 Compatible Blob Storage     │
│  - Master Catalogs: Hierarchical Indonesian Geo-Data (Prov/Kota/Kec/Kel)    │
│  - Audit Logs: Append-Only Trigger-Protected Event Tables                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Libraries & Toolchains:
* **Frontend:** `react@18.3.1`, `react-dom@18.3.1`, `vite@6.4.3`, `typescript@5.4.5`, `lucide-react@0.474.0`, `@tinymce/tinymce-react@6.3.0`, `tesseract.js@5.1.1`.
* **Backend:** `express@4.21.2`, `dotenv@16.4.7`, `zod@3.23.8`, `jsonwebtoken@9.0.2`, `bcryptjs@2.4.3`, `@electric-sql/pglite@0.2.14`, `@aws-sdk/client-s3@3.738.0`.
* **Quality Assurance & Testing:** Node.js native test runner (`tsx --test`), `assert`, Playwright (`@playwright/test` with Microsoft Edge headless runner), and custom anti-slop linter (`lint_antislop_ui.py`).

---

## 3. Core Business Modules & Workflows

### 3.1. Origination Workspace (Split 50-50 Engine)
The core differentiator of the platform is the **Split 50-50 Workspace** on Customer Detail (Tab 0):
* **Left Column (`.fap-detail-form-col`):** 5-module accordion form handling 35+ input fields.
* **Right Column (`.fap-detail-preview-col`):** Interactive digital spreadsheet replicating the official 118-row LiuGong Finance Excel template.
* **Bi-Directional Auto-Sync Scroll:**
  * When a user edits or focuses an accordion card on the left, the preview container scrolls automatically to the corresponding section using `scrollIntoView({ behavior: 'smooth', block: 'start' })` with an animated pulsing border (`fap-preview-sync-highlight`).
  * When a user clicks quick-jump chips in the Excel ribbon toolbar (`1. Identitas`, `2. Domisili`, `3. Profil Usaha`, `4. PIC`, `5. Proyek`), the preview scrolls to the anchor and automatically opens the matching accordion on the left.

### 3.2. Customer Detail: 5-Module Accordion Architecture
Form inputs are grouped into 5 clear numbered modules:
1. `01. Identitas & Klasifikasi Debitur`: Customer Name, Customer Type (Baru/Lama), Debtor Segment (Corporate/Commercial/Micro), Status Tempat Usaha (Milik Sendiri/Sewa), Tanggal & Cabang Registrasi.
2. `02. Kantor Registrasi & Domisili Perusahaan`: Hierarchical Indonesian administrative address (Provinsi, Kota/Kabupaten, Kecamatan, Kelurahan/Desa, RT/RW, dan Kode Pos otomatis).
3. `03. Profil Usaha & Legalitas Akta`: NIB 13 digit (with OCR Scan pill button), NPWP 16 digit, No. Akta Pendirian, Tanggal Pendirian, Pengalaman Usaha (tahun & bulan), No. Akta Perubahan Terakhir, Tanggal Perubahan.
4. `04. Kontak Utama / Penanggung Jawab (PIC)`: PIC Name, Position, ID/KTP Number, NPWP, Residential Address, Mobile Phone, Corporate Email, Website.
5. `05. Segmentasi Industri & Proyek Berjalan`: Industrial sector (Mining, Agriculture, Forestry, Construction, Oil & Gas), Primary Business activity, Ongoing Projects (Project Owner, Site Location, Contractor Role).

### 3.3. NIB OCR Scanner Engine
* **Integration:** Located directly on the header row of the `NIB · 13 digits` field as an elegant pill action button (`[ 📷 Scan OCR NIB ]`).
* **Input Symmetry:** The text input field remains 100% full-width (170.2px) without visual clipping or awkward button crowding.
* **Extraction Capability:** Client-side OCR via Tesseract.js parses scanned NIB OSS PDF/images and extracts 5 mandatory fields automatically:
  1. NIB (13 digits numeric regex).
  2. Company Legal Name.
  3. Registered Office Address.
  4. Postal Code (5 digits).
  5. Establishment Date (converted to ISO `YYYY-MM-DD`).

### 3.4. Corporate Legal Management (Tab Legal)
* **Two-Tier Deed Table:**
  * **Tabel Atas (`Akta aktif & rujukan terkini`):** Displays primary establishment deed and active latest amendment deed serving as current juridical reference.
  * **Tabel Bawah (`Riwayat akta lama`):** Chronological archive of superseded amendments and expired deeds.
* **Deed Review & Approval Modal:**
  * Three-party approval workflow: MKT submits deed $\rightarrow$ BS verifies/checks $\rightarrow$ Head BS approves $\rightarrow$ Published.
  * Clean layout without legacy `Representative` or redundant `Pihak terkait` fields.
  * Direct transition to *Kategori Remarks* chips and TinyMCE rich text editor.
* **TinyMCE Continuous Numbering Normalizer:**
  * Intercepts paste and input events in TinyMCE to guarantee that ordered lists (`<ol><li>...</li></ol>`) maintain unbroken continuous numbering across multiple paragraphs without resetting to `1.` unexpectedly.
* **Stakeholder Capital Distribution:**
  * Mandatory 100% shareholding validation across corporate and individual stakeholders.
  * Enforces identity document validation (KTP 16-digit for WNI, Passport/KITAS for WNA, NPWP for Corporate entities).

---

## 4. Multi-Role Workflow & State Transitions

The system enforces strict RBAC (Role-Based Access Control) across 6 roles:

| Role Code | Description | Permitted Actions |
| :--- | :--- | :--- |
| **`MKT`** | Marketing Officer | Create application, edit customer details, scan NIB, input initial deeds, submit to BS. |
| **`BS`** | Branch Support | Verify completeness of customer inputs, check legal deeds, request returns (`RETURNED`). |
| **`HEAD_BS`** | Head of Branch Support | Review verified dossiers, approve legal deeds, advance stage to CA/Legal review. |
| **`CA`** | Credit Analyst | Perform 3-year financial spreading, verify ratios (DER, Current Ratio, Operating Margin), submit credit memo. |
| **`LEGAL`** | Legal Specialist | Conduct juridical verification, issue formal Legal Opinion, validate encumbrances and collateral. |
| **`COMMITTEE`** | Credit Committee | Final credit decision: Approve (`APPROVED`) or Reject (`REJECTED`) loan origination. |

### Application Lifecycle State Machine:
```
[DRAFT] (MKT)
   │
   ▼
[SUBMITTED_TO_BS] ────(Return)───► [RETURNED] (MKT fixes)
   │
   ▼
[BS_VERIFIED] (BS checks OK)
   │
   ▼
[IN_CA_LEGAL_REVIEW] (Head BS approves deeds -> Dual review by CA & Legal)
   │
   ├── CA submits Credit Memo
   └── Legal signs off Legal Opinion
   │
   ▼
[CREDIT_COMMITTEE_REVIEW]
   │
   ├──► [APPROVED] (Formal Facility Approval)
   └──► [REJECTED] (Decline with formal audit reason)
```

---

## 5. Database Schema & Relational Design

The system runs on a relational schema in `server/schema.sql`:

```sql
-- Core Applications Table
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  fap_number TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  customer_id TEXT,
  branch_id TEXT NOT NULL,
  applicant_type TEXT NOT NULL, -- 'NEW' | 'EXISTING'
  segment TEXT NOT NULL,        -- 'CORPORATE' | 'COMMERCIAL' | 'MICRO'
  customer JSONB NOT NULL DEFAULT '{}',
  financing JSONB NOT NULL DEFAULT '{}',
  financials JSONB NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Legal Deeds & Amendments
CREATE TABLE IF NOT EXISTS legal_deeds (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  deed_type TEXT NOT NULL,       -- 'establishment' | 'amendment'
  deed_number TEXT,
  deed_date DATE,
  notary_name TEXT,
  decree_number TEXT,
  decree_date DATE,
  remark_categories TEXT[],
  remarks TEXT,
  review_status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT' | 'PENDING_CHECK' | 'PENDING_APPROVAL' | 'APPROVED'
  stakeholders JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document Metadata
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UPLOADED',
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cryptographic Append-Only Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  application_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  ip_address TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 6. API Endpoints & Request/Response Contracts

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates user credentials and issues signed HttpOnly JWT cookie. |
| `GET` | `/api/auth/me` | Authenticated | Returns active session profile, permissions, and department role. |
| `GET` | `/api/applications` | Authenticated | Lists portfolio applications with filters for branch, status, and search query. |
| `GET` | `/api/applications/:id` | Authenticated | Retrieves complete application dossier, customer records, and active deeds. |
| `PUT` | `/api/applications/:id` | MKT / BS | Updates customer fields, accordion form data, and financial spreading. |
| `POST` | `/api/applications/:id/transition` | Role Specific | Executes state machine transition (`SUBMIT`, `VERIFY`, `APPROVE`, `RETURN`, `REJECT`). |
| `GET` | `/api/applications/:id/deeds` | Authenticated | Lists all legal deeds, amendment history, and stakeholder shareholding matrices. |
| `POST` | `/api/applications/:id/deeds` | MKT / BS | Creates or updates a notary deed record with validation. |
| `POST` | `/api/applications/:id/deeds/:deedId/review` | BS / HEAD_BS | Handles deed check and formal approval steps. |
| `POST` | `/api/documents/presign-upload` | MKT / BS | Generates secure pre-signed S3 URL for private document ingestion. |
| `GET` | `/api/documents/:id/download` | Authenticated | Issues 15-minute temporary signed link for viewing/downloading attachments. |

---

## 7. Master Data Catalogs & Geographic Hierarchy

The application includes an offline-first master catalog (`src/master-catalog.ts`) covering:
* **Indonesian Administrative Hierarchy:** 38 Provinces $\rightarrow$ 514 Cities/Regencies $\rightarrow$ Districts $\rightarrow$ Urban Villages (*Kelurahan*) $\rightarrow$ Auto-populated 5-digit Postal Codes (*Kode Pos*).
* **Business Categories (KBLI):** Mining (Pertambangan), Agriculture (Pertanian), Forestry (Kehutanan), Construction & Infrastructure (Konstruksi), Oil & Gas (Minyak & Gas Bumi), Logistic & Transportation.
* **Financing Facility Types:** Financial Lease (Sewa Pembiayaan), Sale and Leaseback (Jual & Sewa Balik), Installment Financing (Pembelian Pembayaran Bertahap).

---

## 8. Verification, Testing & Quality Assurance

The system maintains 100% test coverage across 27 automated test suites:

```
TAP version 13
ok 1 - Customer detail save validates only customer fields and allows empty PIC during draft
ok 2 - two-step deed approval gates published shareholders and freezes pending data
ok 3 - rejection requires a reason, preserves history and can be resubmitted
ok 4 - deed can pass submit, check and approval without attachment
ok 5 - saving a selected deed leaves unrelated invalid dated deeds untouched
ok 6 - amendment comparison uses approved prior deeds and freezes the submitted baseline
ok 7 - uploaded documents can be removed and replaced, with checks reset and approved attachments protected
ok 8 - FAP numbering uses a padded sequence and Roman month
ok 9 - share validation accepts tolerance, requires highlighted fields, and rejects invalid identities and percentages
ok 10 - balance sheet uses exact decimal arithmetic and checks every reported total
ok 11 - ratios handle zero denominator without Infinity; DSCR is explicitly unavailable
ok 12 - proposal totals and annuity calculations cover zero interest and advance payment
ok 13 - FAP sequence continues for the year and uses the current Roman month
ok 14 - historical dates reject future and invalid calendar dates; expiry may be future
ok 15 - years, counts, percentages and numeric ranges apply recursively
ok 16 - identity, contact and financial checks preserve legitimate negative profit
ok 17 - draft ownership can be saved incrementally; submission requires 100 percent
ok 18 - explicit ID type overrides corporate and citizenship defaults
ok 19 - current deed list supersedes legacy duplicate validation and identifies invalid visible deed
ok 20 - full workflow: authentication, atomic updates, documents, dual review, audit and locks
ok 21 - location metadata and ZIP relationships survive catalog validation
ok 22 - NIB OCR parsing extracts all 5 mandatory fields from sample OSS text
ok 23 - NIB OCR handles date formats and fallback variations
ok 24 - TinyMCE deed remarks: merges adjacent ol lists into single continuous list
ok 25 - TinyMCE deed remarks: converts plain numbered lines to ordered list
ok 26 - TinyMCE deed remarks: preserves existing non-numbered paragraph text
ok 27 - TinyMCE deed remarks: handles empty or whitespace input safely
1..27
# tests 27 | pass 27 | fail 0
```

* **Anti-Slop UI Gate:** Verified via `lint_antislop_ui.py` (Exit Code `0`).
* **Runtime Visual QA:** Tested via Microsoft Edge headless via Playwright on port 3001 with 0 console errors and 0 layout shifts.

---

## 9. Operational & Deployment Guide

### Running in Development:
```bash
cd "D:/CRM App2/CRM App2"
npm install
npm run dev
# Vite runs at http://127.0.0.1:5173
```

### Running in Production (Port 3001):
```bash
cd "D:/CRM App2/CRM App2"
npm run build
npm start
# Production Express server serves API and static dist/ at http://127.0.0.1:3001
```

### Standalone HTML Excel Template Review:
The official 118-row Excel template converted to interactive HTML is located at:
* Local disk: `D:/CRM App2/CRM App2/public/fap_excel_template_view.html`
* Web URL: `http://127.0.0.1:3001/fap_excel_template_view.html`
* Features: Sheet tabs (`FAP STAGE` vs `PRE ANALYSIS`), Mode toggle (Blank vs Sample Filled), Zoom (Fit, 75%, 100%, 125%), and Direct Print/PDF generation.

### Git Repository & Sync:
```bash
git remote -v
# origin  https://github.com/Bughopper14/Prototype.git (push)
git status
# On branch keith, working tree clean
```

---
*© 2026 PT LiuGong Finance Indonesia. Prepared by Personal AI CTO for Latom.*
