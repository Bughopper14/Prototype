# DOKUMEN ARSITEKTUR TEKNIKAL & SPESIFIKASI REKAYASA SISTEM:
# SISTEM REKONSILIASI AKTA PERUBAHAN, SINKRONISASI STAKEHOLDER KUMULATIF, DAN MESIN APPROVAL MAKER-CHECKER (ADMIN MKT & ADMIN BS)

**Nomor Dokumen:** LFI/TECH-SPEC/LEGAL-APPROVAL/2026/001  
**Klasifikasi:** Internal Technical Specification & Database Engineering  
**Penyusun:** Senior Backend Architect & Database Specialist  
**Reviewer:** Willy (Lead Solution Architect & Product Owner)  
**Versi:** 3.0 (Edisi Lengkap — Technical Reconciliation Engine & Event Notification)  
**Tanggal Rilis:** Oktober 2026  

---

## 1. ARSITEKTUR MESIN REKONSILIASI AKTA PERUBAHAN (LEGAL DELTA RECONCILIATION ENGINE)

### 1.1 Model Data Penyimpanan: Posisi Dasar vs Delta Perubahan
Untuk menangani situasi di mana akta perubahan hanya mencatat pembaruan parsial tanpa mengulang data lama, skema database mengombinasikan **Snapshot Akta Notaris Asli** dengan **Posisi Hukum Kumulatif (Resolved Active Legal State)**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LEGAL RECONCILIATION BUS                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    [ Akta 1: Akta Pendirian No. 01 ] ──► Stakeholders A (60%), B (40%)
                                    │
                                    ▼ (Mewariskan Data A & B)
    [ Akta 2: Akta Perubahan No. 05 ] ──► Hanya ganti Direktur Utama
                                    │     (Stakeholders A 60%, B 40% diwariskan)
                                    ▼
    [ Akta 3: Akta Perubahan No. 12 ] ──► Parsial: A jual 10% ke C (10%)
                                    │     (Hasil Rekonsiliasi: A 50%, B 40%, C 10%)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             VIEW / TABLE: resolved_deed_stakeholders                   │
│             (Posisi Hukum Mutakhir Aktif — Wajib 100.00%)              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. SKEMA DATABASE DDL & TRIGGER POSTGRESQL LENGKAP

### 2.1 Skema Tabel Akta, Stakeholder Terikat, dan Riwayat Rekonsiliasi

```sql
-- 1. Tabel Akta Notaris (Establishment & Amendment Deeds)
CREATE TABLE IF NOT EXISTS legal_deeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    deed_type VARCHAR(50) NOT NULL CHECK (deed_type IN ('ESTABLISHMENT', 'AMENDMENT')),
    deed_number VARCHAR(150) NOT NULL,
    deed_date DATE NOT NULL,
    notary_name VARCHAR(200) NOT NULL,
    ministerial_decree_number VARCHAR(200),
    ministerial_decree_date DATE,
    amendment_type VARCHAR(50) CHECK (amendment_type IN ('MANAGEMENT_ONLY', 'SHARE_TRANSFER', 'CAPITAL_INCREASE', 'PURPOSE_KBLI', 'FULL_RESTATEMENT')),
    remarks TEXT,
    is_latest_deed BOOLEAN NOT NULL DEFAULT false,
    created_by_user_id VARCHAR(100) NOT NULL, -- Admin MKT (Maker)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_legal_deeds_app_date ON legal_deeds(application_id, deed_date DESC);

-- 2. Tabel Item Pemegang Saham Mentah per Akta (Raw Deed Stakeholders)
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
    is_inherited BOOLEAN NOT NULL DEFAULT false, -- True jika data ini diwariskan dari akta sebelumnya
    source_deed_id UUID REFERENCES legal_deeds(id), -- Asal akta pertama kali dicatat
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deed_stakeholders_deed ON deed_stakeholders(deed_id);

-- 3. Tabel Log Pengembalian / Penolakan (Checker Rejections)
CREATE TABLE IF NOT EXISTS rejection_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL DEFAULT 'BRANCH_CHECKER_REVIEW',
    rejected_by_user_id VARCHAR(100) NOT NULL,
    rejected_by_name VARCHAR(150) NOT NULL,
    checker_role VARCHAR(50) NOT NULL DEFAULT 'BS',
    target_maker_user_id VARCHAR(100) NOT NULL, -- Admin MKT yang membuat draft
    reason_code VARCHAR(100) NOT NULL,          -- Cth: ERR_SHAREHOLDER_MISMATCH
    reason_category VARCHAR(100) NOT NULL,      -- Cth: LEGAL_DOCUMENT, IDENTITY, FINANCIAL
    comments TEXT NOT NULL,                     -- Catatan koreksi wajib dari BS
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Antrean Notifikasi In-App (Maker Notifications Queue)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id VARCHAR(100) NOT NULL, -- Ditujukan ke user ID Maker (Admin MKT)
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,  -- 'APPLICATION_RETURNED', 'APPLICATION_VERIFIED'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    payload JSONB,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id, is_read);
```

---

## 3. LOGIKA ALGORITMA REKONSILIASI KUMULATIF (BACKEND SERVICE)

Berikut fungsi TypeScript untuk merekonsiliasi pemegang saham saat Akta Perubahan parsial disimpan:

```typescript
// server/reconciliation.ts
export interface StakeholderEntry {
  id?: string;
  idNumber: string;
  fullName: string;
  designation: string;
  sharePercentage: number;
  depositedCapital: number;
  stakeholderType: 'INDIVIDUAL' | 'CORPORATE';
  nationalityType: 'WNI' | 'WNA';
  idType: 'KTP' | 'PASSPORT' | 'NPWP';
  isInherited?: boolean;
  sourceDeedId?: string;
}

export function reconcileStakeholders(
  previousState: StakeholderEntry[],
  deltaUpdates: StakeholderEntry[],
  amendmentType: string,
  currentDeedId: string
): StakeholderEntry[] {
  // JIKA AKTA HANYA GANTI DIREKSI / KBLI (Tidak ubah kepemilikan saham):
  if (amendmentType === 'MANAGEMENT_ONLY' || amendmentType === 'PURPOSE_KBLI') {
    return previousState.map(s => ({
      ...s,
      isInherited: true,
      sourceDeedId: s.sourceDeedId || currentDeedId
    }));
  }

  // JIKA AKTA MERUPAKAN PENGELUARAN SAHAM TOTAL (FULL RESTATEMENT):
  if (amendmentType === 'FULL_RESTATEMENT') {
    return deltaUpdates.map(s => ({ ...s, isInherited: false, sourceDeedId: currentDeedId }));
  }

  // JIKA AKTA PENGALIHAN SAHAM PARSIAL (SHARE_TRANSFER / CAPITAL_INCREASE):
  // Gabungkan data lama dengan update baru berdasarkan ID Number / NIK / NPWP
  const mergedMap = new Map<string, StakeholderEntry>();

  // 1. Masukkan semua posisi lama
  for (const prev of previousState) {
    mergedMap.set(prev.idNumber, { ...prev, isInherited: true });
  }

  // 2. Timpa atau tambahkan dengan data baru dari akta perubahan
  for (const delta of deltaUpdates) {
    if (delta.sharePercentage <= 0) {
      // Jika saham dialihkan habis (0%), hapus dari daftar pemegang saham aktif
      mergedMap.delete(delta.idNumber);
    } else {
      mergedMap.set(delta.idNumber, {
        ...delta,
        isInherited: false,
        sourceDeedId: currentDeedId
      });
    }
  }

  const finalResult = Array.from(mergedMap.values());

  // 3. Validasi Keseimbangan Total Saham Wajib 100.00%
  const totalShare = finalResult.reduce((sum, s) => sum + Number(s.sharePercentage || 0), 0);
  if (Math.abs(totalShare - 100.00) > 0.01) {
    throw new Error(
      `Hasil rekonsiliasi pemegang saham tidak balance (${totalShare.toFixed(2)}%). Total wajib tepat 100.00%. Periksa kembali akta perubahan!`
    );
  }

  return finalResult;
}
```

---

## 4. REST API SPECIFICATION: WORKFLOW MAKER & CHECKER

### 4.1 Endpoint Pengajuan oleh Admin MKT (Maker Submission)
- **Route:** `POST /api/v1/applications/:id/submit-to-bs`
- **Role Otorisasi:** `MKT` (Maker)
- **Prasyarat Status:** `DRAFT` atau `RETURNED`
- **Tindakan Sistem:**
  1. Validasi kelengkapan Customer, PIC, Legal, Business, Unit, Financials.
  2. Eksekusi rekonsiliasi pemegang saham mutakhir: memverifikasi bahwa $\sum \text{Saham} = 100.00\%$.
  3. Mengubah status: `SUBMITTED_TO_BS`.
  4. Membuat log audit: `ApprovalLog (Maker submitted application to Branch Support)`.

### 4.2 Endpoint Keputusan oleh Admin BS (Checker Gate)
- **Route:** `POST /api/v1/applications/:id/checker-decision`
- **Role Otorisasi:** `BS` (Checker)
- **Prasyarat Status:** `SUBMITTED_TO_BS`
- **Payload Request:**
  ```typescript
  interface CheckerDecisionPayload {
    decision: 'APPROVE' | 'RETURN';
    reasonCode?: string;     // Wajib jika decision === 'RETURN'
    reasonCategory?: string; // Wajib jika decision === 'RETURN'
    comments: string;        // Wajib jika decision === 'RETURN'
  }
  ```
- **Logika Eksekusi Server Saat `decision === 'RETURN'`:**
  ```typescript
  await transaction(async (q) => {
    // 1. Lock Row
    await q('SELECT id FROM applications WHERE id = $1 FOR UPDATE', [id]);
    const app = await getApplication(id, q);

    // 2. Update Status Aplikasi Kembali ke RETURNED
    await q("UPDATE applications SET status = 'RETURNED', updated_at = NOW() WHERE id = $1", [id]);

    // 3. Catat ke Rejection Log
    await q(`
      INSERT INTO rejection_logs (
        application_id, stage, rejected_by_user_id, rejected_by_name, 
        checker_role, target_maker_user_id, reason_code, reason_category, comments
      ) VALUES ($1, 'BRANCH_CHECKER_REVIEW', $2, $3, 'BS', $4, $5, $6, $7)
    `, [id, req.actor.id, req.actor.name, app.createdByUserId, body.reasonCode, body.reasonCategory, body.comments]);

    // 4. Catat Immutable Approval Log
    await q(`
      INSERT INTO approval_logs (
        application_id, action_by, user_role, previous_status, new_status, comments
      ) VALUES ($1, $2, 'BS', 'SUBMITTED_TO_BS', 'RETURNED', $3)
    `, [id, req.actor.name, `[${body.reasonCode}] ${body.comments}`]);

    // 5. Kirim Notifikasi Real-time ke Admin MKT (Maker)
    await q(`
      INSERT INTO notifications (
        recipient_user_id, application_id, notification_type, title, message, payload
      ) VALUES ($1, $2, 'APPLICATION_RETURNED', $3, $4, $5)
    `, [
      app.createdByUserId,
      id,
      `Aplikasi ${app.fapNumber} Dikembalikan oleh BS`,
      `Alasan: ${body.comments}`,
      JSON.stringify({
        fapNumber: app.fapNumber,
        companyName: app.companyName,
        reasonCode: body.reasonCode,
        comments: body.comments,
        actionBy: req.actor.name,
        timestamp: new Date().toISOString()
      })
    ]);
  });
  ```

---

## 5. REKAYASA NOTIFIKASI DISPATCH (IN-APP & WEBHOOK / PUSH ALERT)

### 5.1 Mekanisme Notifikasi Frontend (Bell & Alert Banner)
1. **Polling / SSE Real-time Hook:**
   Frontend Admin Marketing terhubung ke `GET /api/v1/notifications/unread`.
2. **Visual Alert Pada Dashboard Admin MKT:**
   - Lencana lonceng merah menyala `(!)` dengan count penolakan.
   - Pada baris aplikasi yang dikembalikan, muncul badge merah mencolok: `RETURNED (Action Required)`.
   - Mengklik baris langsung membuka drawer riwayat catatan penolakan dari BS:
     > *"Checker: Siti Rahma (BS) — Alasan: [ERR_SHAREHOLDER_MISMATCH] Akta No. 15 belum mencakup pengalihan saham 25% ke PT Cipta Investama."*

---

## 6. PENGUJIAN OTOMATIS & VERIFIKASI KEAMANAN (TEST SUITES)

1. **Test Case: Cumulative Inheritance**
   - *Input:* Akta 1 (A: 60%, B: 40%). Tambah Akta 2 tipe `MANAGEMENT_ONLY` tanpa menyertakan array pemegang saham baru.
   - *Ekspektasi:* Posisi pemegang saham Akta 2 otomatis terisi A (60%) dan B (40%) dengan flag `is_inherited = true`.
2. **Test Case: Partial Transfer Rebalancing**
   - *Input:* Akta 2 A jual 10% ke C (10%).
   - *Ekspektasi:* Posisi ter-update menjadi A (50%), B (40%), C (10%). Total akumulasi dihitung tepat 100.00%.
3. **Test Case: Maker-Checker Role Isolation**
   - *Uji Coba:* Pengguna dengan role `MKT` memanggil endpoint `/checker-decision`.
   - *Ekspektasi:* Server melempar `HTTP 403 Forbidden: Hanya role BS (Checker) yang berhak melakukan verifikasi`.
4. **Test Case: Mandatory Rejection Reason**
   - *Uji Coba:* Admin BS menolak berkas dengan `reasonCode: null` atau `comments: ''`.
   - *Ekspektasi:* Server melempar `HTTP 422 Unprocessable Entity: Reason code dan komentar wajib diisi saat pengembalian berkas`.
