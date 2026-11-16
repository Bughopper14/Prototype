/**
 * Verify or reject one checklist document for a department (BS, CA or Legal): the result, the registration and expiry
 * date read from the document, a summary and notes (crm_application_document_checklists).
 */
import {useState} from 'react';
import {Loader2} from 'lucide-react';
import {Modal} from '@/shared/ui/Modal';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

export type VerifyBody = {
  department: 'BS' | 'CA' | 'LEGAL';
  isVerified: boolean;
  registrationDate: string | null;
  expiredDate: string | null;
  dataSummary: string;
  notes: string;
};

const DEPARTMENTS: VerifyBody['department'][] = ['BS', 'CA', 'LEGAL'];
const day = (v: any) => (v ? String(v).slice(0, 10) : '');

export function VerifyDocumentDialog({
  row,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  row: ChecklistRow;
  busy: boolean;
  error: string;
  onSubmit: (body: VerifyBody) => void;
  onClose: () => void;
}) {
  const check = row.check || {};
  const [department, setDepartment] = useState<VerifyBody['department']>(
    DEPARTMENTS.includes(row.department as any) ? (row.department as VerifyBody['department']) : 'BS',
  );
  const [isVerified, setIsVerified] = useState(check.status !== 'REJECTED');
  const [registrationDate, setRegistrationDate] = useState(day(check.registrationDate));
  const [expiredDate, setExpiredDate] = useState(day(check.expiredDate));
  const [dataSummary, setDataSummary] = useState(check.dataSummary || '');
  const [notes, setNotes] = useState(check.notes || '');

  return (
    <Modal title={`Verifikasi Dokumen · ${row.code}`} onClose={onClose}>
      <div className="modal-body">
        <p className="muted" style={{marginTop: 0}}>
          {row.name}
        </p>
        <div className="formgrid">
          <label>
            <span className="field-label">Departemen</span>
            <select value={department} onChange={e => setDepartment(e.target.value as VerifyBody['department'])}>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Hasil</span>
            <select value={isVerified ? 'VERIFIED' : 'REJECTED'} onChange={e => setIsVerified(e.target.value === 'VERIFIED')}>
              <option value="VERIFIED">Terverifikasi</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </label>
          <label>
            <span className="field-label">Tanggal Terbit</span>
            <input type="date" value={registrationDate} onChange={e => setRegistrationDate(e.target.value)} />
          </label>
          <label>
            <span className="field-label">Tanggal Berlaku Sampai</span>
            <input type="date" value={expiredDate} onChange={e => setExpiredDate(e.target.value)} />
          </label>
          <label className="field-wide">
            <span className="field-label">Ringkasan Data Dokumen</span>
            <textarea rows={3} value={dataSummary} onChange={e => setDataSummary(e.target.value)} />
          </label>
          <label className="field-wide">
            <span className="field-label">Catatan</span>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </label>
        </div>
        {error && <div className="error">{error}</div>}
      </div>
      <div className="modal-actions">
        <button className="button" onClick={onClose} disabled={busy}>
          Batal
        </button>
        <button
          className="button primary"
          disabled={busy}
          onClick={() =>
            onSubmit({
              department,
              isVerified,
              registrationDate: registrationDate || null,
              expiredDate: expiredDate || null,
              dataSummary,
              notes,
            })
          }
        >
          {busy && <Loader2 size={14} className="spin" />}
          Simpan Verifikasi
        </button>
      </div>
    </Modal>
  );
}
