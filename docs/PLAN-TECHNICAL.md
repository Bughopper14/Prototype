# DOKUMEN ARSITEKTUR TEKNIKAL & SPESIFIKASI REKAYASA SISTEM DETAIL (DETAILED TECH SPEC)
## SISTEM ORIGINASI PEMBIAYAAN CAPTIVE LIUGONG (LOS-DMS)
### PT LIUGONG FINANCE INDONESIA (LFI)

**Nomor Dokumen:** LFI/TECH/LOS-DMS/2026/001  
**Versi:** 3.0 (Comprehensive Technical Edition)  
**Status:** Approved by CTO & CEO Gates · Ready for Implementation  
**Klasifikasi:** Internal Technical Confidential  
**Author:** Principal Solution Architect & Lead Data Engineer  
**Reviewer:** Willy (Lead Solution Architect & Product Owner)  

---

## 1. ARSITEKTUR SISTEM & KOMPONEN INTERNAL

Sistem mengadopsi monorepo terpadu dengan pemisahan lapisan yang tegas antara Antarmuka Pengguna, Layanan API, Mesin Validasi Finansial, dan Database:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER (UI)                          │
│ React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons             │
│ • State: Reactive UI Hooks + Polling Notification Provider            │
│ • Form Modules: Customer, Legal, Bank, Units, Financials, Documents   │
│ • Checker Decision Modal: Reason Code Picker & Mandatory Comments      │
│ • Real-time Notification Banner & Drawer Catatan Penolakan             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API (JSON / Multipart HTTPS)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION API SERVER                          │
│ Node.js 22 LTS + Express Modular Architecture                          │
│ • Auth & RBAC Middleware: Cookie JWT Verifier (MKT, BS, CA, LEGAL)     │
│ • Legal Reconciliation Engine: Cumulative Stakeholder Inheritance      │
│ • Validation Layer: Zod Strict Schemas (Decimal, Total Share 100.00%)  │
│ • Transaction Coordinator: Atomic Transactions with Row Locks          │
│ • Notification Dispatcher: Real-time In-App Notification Pusher        │
└───────────────────────┬──────────────────────────┬─────────────────────┘
                        │                          │
                        ▼                          ▼
┌────────────────────────────────┐       ┌───────────────────────────────┐
│     BLOB STORAGE ADAPTER       │       │    PERSISTENCE TIER (RDBMS)   │
│ MinIO / AWS S3 (AES-256)       │       │ PostgreSQL 15+ Enterprise     │
│ • File Type Magic Byte Guard   │       │ • Master Lookups (Reference)  │
│   (PDF, PNG, JPG Verification) │       │ • Dual-Column Free-Text Snaps │
│ • 15-Minute Signed URLs        │       │ • Deed-Anchored Stakeholders  │
│ • Private Access Control       │       │ • Immutable Audit Triggers    │
└────────────────────────────────┘       └───────────────────────────────┘
```

---

## 2. SKEMA DATABASE DDL LENGKAP & INTEGRITAS DATA (POSTGRESQL 15+)

Berikut adalah skema relasional resmi untuk mendukung penanganan akta parsial, rekonsiliasi kumulatif, penolakan checker, dan audit trail yang tidak dapat diubah:

```sql
-- EKSTENSI UNTUK GENERATOR UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABEL UTAMA CUSTOMER & APLIKASI
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    company_type VARCHAR(50) NOT NULL DEFAULT 'CORPORATE' CHECK (company_type IN ('CORPORATE','COMMERCIAL','MICRO','LIUGONG_USER')),
    nib VARCHAR(13) NOT NULL UNIQUE,
    npwp VARCHAR(20) NOT NULL UNIQUE,
    skt_no VARCHAR(100),
    sppkp_no VARCHAR(100),
    establishment_act_no VARCHAR(100),
    establishment_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    fap_number VARCHAR(50) NOT NULL UNIQUE,
    application_date DATE NOT NULL DEFAULT CURRENT_DATE,
    branch_code VARCHAR(20) NOT NULL,
    branch_name_snapshot VARCHAR(100) NOT NULL, -- Free-text snapshot nama cabang
    customer_status VARCHAR(20) NOT NULL CHECK (customer_status IN ('NEW','EXISTING')),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',
        'SUBMITTED_TO_BS',
        'RETURNED',
        'BS_VERIFIED',
        'IN_CA_LEGAL_REVIEW',
        'CREDIT_COMMITTEE_REVIEW',
        'APPROVED',
        'REJECTED'
    )),
    company_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    phone_fax VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    industry_segment VARCHAR(100) NOT NULL,
    business_role VARCHAR(100) NOT NULL,
    created_by_user_id VARCHAR(100) NOT NULL, -- Admin MKT (Maker)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. TABEL AKTA LEGALITAS & PEMEGANG SAHAM TERIKAT
-- ============================================================================
CREATE TABLE IF NOT EXISTS legal_deeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    deed_type VARCHAR(50) NOT NULL CHECK (deed_type IN ('ESTABLISHMENT', 'AMENDMENT')),
    deed_number VARCHAR(150) NOT NULL,
    deed_date DATE NOT NULL,
    notary_name VARCHAR(200) NOT NULL,
    ministerial_decree_number VARCHAR(200), -- SK Kemenkumham
    ministerial_decree_date DATE,
    amendment_type VARCHAR(50) CHECK (amendment_type IN (
        'MANAGEMENT_ONLY',
        'SHARE_TRANSFER',
        'CAPITAL_INCREASE',
        'PURPOSE_KBLI',
        'FULL_RESTATEMENT'
    )),
    remarks TEXT,
    is_latest_deed BOOLEAN NOT NULL DEFAULT false,
    created_by_user_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_legal_deeds_app_date ON legal_deeds(application_id, deed_date DESC);

CREATE TABLE IF NOT EXISTS deed_stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deed_id UUID NOT NULL REFERENCES legal_deeds(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    stakeholder_type VARCHAR(20) NOT NULL CHECK (stakeholder_type IN ('INDIVIDUAL', 'CORPORATE')),
    nationality_type VARCHAR(10) NOT NULL DEFAULT 'WNI' CHECK (nationality_type IN ('WNI', 'WNA')),
    id_type VARCHAR(20) NOT NULL CHECK (id_type IN ('NONE', 'KTP', 'PASSPORT', 'NPWP')),
    id_number VARCHAR(50) NOT NULL,
    tax_number VARCHAR(50),
    full_name VARCHAR(250) NOT NULL,
    designation VARCHAR(100) NOT NULL DEFAULT 'Shareholder',
    primary_capital NUMERIC(18, 2) NOT NULL DEFAULT 0,
    deposited_capital NUMERIC(18, 2) NOT NULL DEFAULT 0,
    share_percentage NUMERIC(5, 2) NOT NULL CHECK (share_percentage >= 0 AND share_percentage <= 100),
    is_authorized_signatory BOOLEAN NOT NULL DEFAULT false,
    email VARCHAR(150),
    mobile_phone VARCHAR(50),
    address TEXT,
    is_inherited BOOLEAN NOT NULL DEFAULT false, -- True jika diwariskan dari akta lama
    source_deed_id UUID REFERENCES legal_deeds(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deed_stakeholders_deed ON deed_stakeholders(deed_id);

-- ============================================================================
-- 3. TABEL UNIT PEMBIAYAAN DUAL-COLUMN FREE-TEXT SNAPSHOT
-- ============================================================================
CREATE TABLE IF NOT EXISTS financing_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    facility_purpose VARCHAR(50) NOT NULL CHECK (facility_purpose IN ('INVESTMENT','WORKING_CAPITAL')),
    financing_method VARCHAR(50) NOT NULL CHECK (financing_method IN ('FINANCIAL_LEASE','SALE_AND_LEASE_BACK','INSTALLMENT_FINANCING')),
    currency VARCHAR(5) NOT NULL DEFAULT 'IDR',
    financing_value NUMERIC(18, 2) NOT NULL,
    down_payment_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
    security_deposit NUMERIC(18, 2) NOT NULL DEFAULT 0,
    interest_rate NUMERIC(5, 2) NOT NULL,
    tenor_months INTEGER NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financing_unit_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES financing_proposals(id) ON DELETE CASCADE,
    ref_master_unit_id UUID,
    brand VARCHAR(100) NOT NULL, -- Free-text statis: 'LiuGong'
    unit_category VARCHAR(50) NOT NULL, -- Free-text statis: 'HE' / 'TRUCK'
    unit_type VARCHAR(100) NOT NULL, -- 'Hydraulic Excavator'
    model_name VARCHAR(150) NOT NULL, -- '936E HD'
    specifications TEXT,
    class_ton NUMERIC(5, 2),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(18, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(18, 2) NOT NULL CHECK (total_price >= 0)
);

-- ============================================================================
-- 4. TABEL AUDIT LOG & REJECTION ENGINE
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id),
    action_by VARCHAR(150) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    comments TEXT,
    ip_address VARCHAR(50),
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rejection_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL DEFAULT 'BRANCH_CHECKER_REVIEW',
    rejected_by_user_id VARCHAR(100) NOT NULL,
    rejected_by_name VARCHAR(150) NOT NULL,
    checker_role VARCHAR(50) NOT NULL DEFAULT 'BS',
    target_maker_user_id VARCHAR(100) NOT NULL,
    reason_code VARCHAR(100) NOT NULL,
    reason_category VARCHAR(100) NOT NULL,
    comments TEXT NOT NULL,
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id VARCHAR(100) NOT NULL,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    payload JSONB,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_user_id, is_read);

-- ============================================================================
-- 5. TRIGGER PROTEKSI MUTLAK: IMMUTABLE AUDIT TRAIL
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Pelanggaran Integritas Audit: Data pada tabel % bersifat IMMUTABLE dan dilarang di-UPDATE atau di-DELETE!', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_approval_logs ON approval_logs;
CREATE TRIGGER trg_lock_approval_logs
BEFORE UPDATE OR DELETE ON approval_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();

DROP TRIGGER IF EXISTS trg_lock_rejection_logs ON rejection_logs;
CREATE TRIGGER trg_lock_rejection_logs
BEFORE UPDATE OR DELETE ON rejection_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();
```

---

## 3. LOGIKA ALGORITMA REKONSILIASI KUMULATIF (`server/reconciliation.ts`)

Berikut implementasi logika rekonsiliasi yang diintegrasikan pada backend Express:

```typescript
export interface StakeholderRecord {
  id?: string;
  idNumber: string;
  taxNumber?: string | null;
  fullName: string;
  designation: string;
  primaryCapital: number;
  depositedCapital: number;
  sharePercentage: number;
  stakeholderType: 'INDIVIDUAL' | 'CORPORATE';
  nationalityType: 'WNI' | 'WNA';
  idType: 'KTP' | 'PASSPORT' | 'NPWP';
  isAuthorizedSignatory: boolean;
  email?: string;
  mobilePhone?: string;
  address?: string;
  isInherited?: boolean;
  sourceDeedId?: string;
}

export function reconcileCumulativeStakeholders(
  baseState: StakeholderRecord[],
  amendmentDelta: StakeholderRecord[],
  amendmentType: string,
  newDeedId: string
): StakeholderRecord[] {
  // Skenario 1: Akta hanya ubah pengurus (Direksi/Komisaris) atau KBLI
  if (amendmentType === 'MANAGEMENT_ONLY' || amendmentType === 'PURPOSE_KBLI') {
    return baseState.map(item => ({
      ...item,
      isInherited: true,
      sourceDeedId: item.sourceDeedId || newDeedId
    }));
  }

  // Skenario 2: Akta perubahan menyeluruh (Pengeluaran Saham Baru Total)
  if (amendmentType === 'FULL_RESTATEMENT') {
    const total = amendmentDelta.reduce((sum, item) => sum + Number(item.sharePercentage || 0), 0);
    if (Math.abs(total - 100.00) > 0.01) {
      throw new Error(`Total persentase saham baru wajib 100.00%, saat ini: ${total.toFixed(2)}%`);
    }
    return amendmentDelta.map(item => ({
      ...item,
      isInherited: false,
      sourceDeedId: newDeedId
    }));
  }

  // Skenario 3: Pengalihan Saham Parsial (Share Transfer) atau Peningkatan Modal Sebagian
  const resultMap = new Map<string, StakeholderRecord>();

  // 1. Masukkan seluruh struktur hukum lama
  for (const prev of baseState) {
    resultMap.set(prev.idNumber, {
      ...prev,
      isInherited: true
    });
  }

  // 2. Terapkan delta updates
  for (const delta of amendmentDelta) {
    if (delta.sharePercentage <= 0) {
      // Pemilik lama menjual seluruh sahamnya (0%) -> Hapus dari pemegang saham aktif
      resultMap.delete(delta.idNumber);
    } else {
      // Perbarui porsi saham atau tambahkan pemegang saham baru
      resultMap.set(delta.idNumber, {
        ...delta,
        isInherited: false,
        sourceDeedId: newDeedId
      });
    }
  }

  const finalStakeholders = Array.from(resultMap.values());

  // 3. Validasi Kesetaraan Saham 100.00%
  const totalPercentage = finalStakeholders.reduce(
    (sum, item) => sum + Number(item.sharePercentage || 0),
    0
  );

  if (Math.abs(totalPercentage - 100.00) > 0.01) {
    throw new Error(
      `Hasil rekonsiliasi saham tidak seimbang: Total = ${totalPercentage.toFixed(2)}%. Wajib tepat 100.00%. Periksa kembali akta notaris!`
    );
  }

  return finalStakeholders;
}
```

---

## 4. SPESIFIKASI ENDPOINT REST API UNTUK ALUR MAKER - CHECKER

### 4.1 Endpoint Pengajuan oleh Admin Marketing: `POST /api/v1/applications/:id/submit-to-bs`
* **Otorisasi Role:** `MKT` (Maker)
* **Kondisi Awal:** Status aplikasi harus `DRAFT` atau `RETURNED`
* **Logika Server:**
  1. Periksa kelengkapan tab: Profile, PIC, Legal, Business, Unit, Financials, Dokumen wajib.
  2. Ambil data akta mutakhir dan eksekusi fungsi `reconcileCumulativeStakeholders`.
  3. Update status aplikasi: `status = 'SUBMITTED_TO_BS'`.
  4. Simpan ke `approval_logs`: *"Maker submitted application to Branch Support"*.

### 4.2 Endpoint Putusan oleh Admin Business Support: `POST /api/v1/applications/:id/checker-decision`
* **Otorisasi Role:** `BS` (Checker)
* **Kondisi Awal:** Status aplikasi harus `SUBMITTED_TO_BS`
* **Payload Request Body (TypeScript Interface):**
  ```typescript
  interface CheckerDecisionPayload {
    decision: 'APPROVE' | 'RETURN';
    reasonCode?: string;     // Wajib jika decision === 'RETURN'
    reasonCategory?: string; // Wajib jika decision === 'RETURN'
    comments: string;        // Wajib jika decision === 'RETURN'
  }
  ```
* **Logika Server Saat `decision === 'APPROVE'`:**
  - Update `status = 'BS_VERIFIED'`.
  - Teruskan berkas ke meja review pusat (`IN_CA_LEGAL_REVIEW`).
  - Simpan ke `approval_logs`.
* **Logika Server Saat `decision === 'RETURN'`:**
  - Update `status = 'RETURNED'`.
  - Simpan record baru ke tabel `rejection_logs`.
  - Simpan record baru ke tabel `approval_logs` dengan komentar penolakan.
  - Insert record baru ke tabel `notifications` yang menargetkan `target_maker_user_id`.

---

## 5. REKAYASA NOTIFIKASI DISPATCH & POLLING STATE

1. **Endpoint Mengambil Notifikasi Maker:** `GET /api/v1/notifications/unread`
   - Mengambil seluruh notifikasi yang belum dibaca (`is_read = false`) untuk user login saat ini.
2. **Endpoint Menandai Notifikasi Terbaca:** `POST /api/v1/notifications/:id/mark-read`
3. **Komponen Frontend Banner & Modal Notifikasi:**
   - Komponen React `AlertBanner` di bagian atas dashboard Admin MKT menampilkan peringatan jika ada berkas yang dikembalikan:
     > *"Aplikasi FAP/JKT01/2026/0014 (PT Mandiri Alam Perkasa) dikembalikan oleh BS. Alasan: [ERR_SHAREHOLDER_MISMATCH] Susunan saham Akta No. 15 belum mencakup pengalihan 25%. Klik di sini untuk memperbaiki."*
   - Drawer perbaikan langsung mengarahkan pengguna ke tab yang bermasalah.

---

## 6. MATRIX AUTOMATED TESTING & VERIFIKASI KEAMANAN

| Kategori Tes | File Pengujian | Skenario Uji | Kriteria Sukses |
|---|---|---|---|
| **Reconciliation Unit** | `tests/reconciliation.test.ts` | Akta No. 1 (A: 60%, B: 40%). Tambah Akta No. 2 `MANAGEMENT_ONLY`. | Output: A (60%) & B (40%) tetap ada dengan flag `is_inherited = true`. |
| **Partial Transfer Unit** | `tests/reconciliation.test.ts` | Akta No. 2 A jual 10% ke C (10%). | Output: A (50%), B (40%), C (10%). Akumulasi total tepat 100.00%. |
| **Imbalance Exception** | `tests/reconciliation.test.ts` | Akta No. 2 menghasilkan total 95.00%. | Server melempar `Error: Hasil rekonsiliasi saham tidak seimbang (95.00%)`. |
| **Role Guard E2E** | `tests/integration.test.ts` | User role `MKT` memanggil `/checker-decision`. | Server melempar `HTTP 403 Forbidden`. |
| **Mandatory Reason E2E** | `tests/integration.test.ts` | BS me-return berkas tanpa `reasonCode`. | Server melempar `HTTP 422 Unprocessable Entity`. |
| **Immutable DB Trigger** | `tests/integration.test.ts` | Perintah SQL `DELETE FROM approval_logs`. | PostgreSQL melempar `EXCEPTION: Pelanggaran Integritas Audit`. |
