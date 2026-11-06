import {useState} from 'react';
import {
  Archive,
  ScanLine,
  Copy,
  FolderCheck,
  Check,
  CheckCheck,
  FileText,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import {type Field, label} from '@liugong/shared';
import {Modal} from '@/components/crm/common/SharedUi';

export function FapArchiveModal({
  application,
  archives,
  loading,
  selectedIndex,
  onSelectIndex,
  onClose,
  notify,
}: {
  application: any;
  archives: any[];
  loading: boolean;
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  onClose: () => void;
  notify: (msg: string) => void;
}) {
  const current = archives[selectedIndex] || null;
  const [copied, setCopied] = useState(false);
  const [showSnapshotJson, setShowSnapshotJson] = useState(false);

  const handleCopyPath = (pathText: string) => {
    if (!pathText) return;
    navigator.clipboard.writeText(pathText);
    setCopied(true);
    notify('Storage path copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const discrepancies = Array.isArray(current?.ocr_discrepancies) ? current.ocr_discrepancies : [];

  return (
    <Modal
      title="FAP Stage Submission Archive (Immutable Database Records)"
      onClose={onClose}
      className="modal-fap-comparison"
    >
      <div className="modal-body" style={{maxHeight: '80vh', overflowY: 'auto'}}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            background: '#f1f5f9',
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
          }}
        >
          <div>
            <div style={{fontWeight: 700, fontSize: 15, color: '#002060'}}>
              {application.customer?.companyName || application.companyName || 'Application'} ·{' '}
              {application.fapNumber || 'FAP Intake'}
            </div>
            <div style={{fontSize: 12, color: '#64748b', marginTop: 2}}>
              Permanent snapshot saved when FAP Stage was submitted to Pre-analysis.
            </div>
          </div>
          <span
            className="subtle-chip"
            style={{
              background: '#ecfdf5',
              color: '#047857',
              borderColor: '#a7f3d0',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <ShieldCheck size={14} /> Immutable (DB Trigger Protected)
          </span>
        </div>

        {loading ? (
          <div style={{padding: 40, textAlign: 'center', color: '#64748b'}}>
            <Loader2 size={24} className="spin" style={{margin: '0 auto 8px'}} />
            <div>Loading submission archives from database...</div>
          </div>
        ) : archives.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              background: '#fafafa',
              borderRadius: 8,
              border: '1px dashed #cbd5e1',
            }}
          >
            <Archive size={28} style={{color: '#94a3b8', margin: '0 auto 8px'}} />
            <h4 style={{margin: '0 0 4px', color: '#334155'}}>Belum ada arsip submit untuk aplikasi ini</h4>
            <p style={{margin: 0, fontSize: 13, color: '#64748b'}}>
              Data snapshot FAP, catatan remarks, perbandingan OCR, dan lokasi penyimpanan dokumen akan
              otomatis tersimpan secara permanen ketika FAP Stage di-submit dan beralih ke Pre-analysis.
            </p>
          </div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            {/* Version / snapshot selector if more than 1 */}
            {archives.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#f8fafc',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                }}
              >
                <span style={{fontSize: 12, fontWeight: 600, color: '#475569'}}>
                  Select Submission Snapshot:
                </span>
                <select
                  value={selectedIndex}
                  onChange={e => onSelectIndex(Number(e.target.value))}
                  style={{padding: '4px 8px', fontSize: 13, borderRadius: 4, border: '1px solid #cbd5e1'}}
                >
                  {archives.map((arc, idx) => (
                    <option key={arc.id || idx} value={idx}>
                      Snapshot #{archives.length - idx} —{' '}
                      {new Date(arc.submitted_at || arc.created_at).toLocaleString('en-GB')} by{' '}
                      {arc.submitted_by_user_name || 'System'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Snapshot Metadata Banner */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                background: '#ffffff',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 11,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    display: 'block',
                  }}
                >
                  Submitted At
                </span>
                <strong style={{fontSize: 13, color: '#0f172a'}}>
                  {new Date(current.submitted_at || current.created_at).toLocaleString('en-GB')}
                </strong>
              </div>
              <div>
                <span
                  style={{
                    fontSize: 11,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    display: 'block',
                  }}
                >
                  Submitted By
                </span>
                <strong style={{fontSize: 13, color: '#0f172a'}}>
                  {current.submitted_by_user_name || 'System'}
                </strong>
              </div>
              <div>
                <span
                  style={{
                    fontSize: 11,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    display: 'block',
                  }}
                >
                  Target Stage
                </span>
                <strong style={{fontSize: 13, color: '#047857'}}>
                  {current.stage_at_submission || 'PRE_ANALYSIS'}
                </strong>
              </div>
              <div>
                <span
                  style={{
                    fontSize: 11,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    display: 'block',
                  }}
                >
                  Database Archive ID
                </span>
                <span style={{fontSize: 11, fontFamily: 'monospace', color: '#475569'}}>{current.id}</span>
              </div>
            </div>

            {/* Document Storage Location Card */}
            <div style={{background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0'}}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#002060',
                  }}
                >
                  <FolderCheck size={16} />
                  <span>Lokasi Penyimpanan Dokumen (Physical Document Storage Path)</span>
                </div>
                {current.ocr_document_path && (
                  <button
                    type="button"
                    className="button small"
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    onClick={() => handleCopyPath(current.ocr_document_path)}
                  >
                    {copied ? <Check size={12} style={{color: '#10b981'}} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied!' : 'Copy Path'}</span>
                  </button>
                )}
              </div>
              <div
                style={{
                  background: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  color: current.ocr_document_path ? '#0f172a' : '#94a3b8',
                }}
              >
                {current.ocr_document_path ||
                  'Lokasi dokumen fisik: Belum terindeks pada direktori server atau diunggah secara virtual'}
              </div>
              {current.ocr_document_filename && (
                <div style={{marginTop: 6, fontSize: 11, color: '#64748b'}}>
                  Nama File Dokumen: <strong>{current.ocr_document_filename}</strong>
                </div>
              )}
            </div>

            {/* Document Comparison Remarks */}
            <div style={{background: '#fefce8', padding: 14, borderRadius: 8, border: '1px solid #fef08a'}}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#854d0e',
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FileText size={16} />
                <span>Remarks &amp; Notes Tambahan dari Perbandingan Dokumen</span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: '#713f12',
                  background: '#ffffff',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #fef08a',
                  minHeight: 40,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {current.comparison_remarks ||
                  'Tidak ada catatan khusus / keterangan remarks tambahan saat verifikasi dokumen FAP.'}
              </div>
            </div>

            {/* OCR Discrepancies / Differences Table */}
            <div style={{background: '#ffffff', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0'}}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#002060',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ScanLine size={16} />
                  <span>Perbandingan System FAP vs Hasil Dokumen OCR ({discrepancies.length} perbedaan)</span>
                </div>
                <span className="subtle-chip" style={{fontSize: 11}}>
                  {discrepancies.length === 0
                    ? '✓ Matched / No Discrepancy'
                    : `${discrepancies.length} Field(s) Differ`}
                </span>
              </div>

              {discrepancies.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    background: '#ecfdf5',
                    borderRadius: 6,
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <CheckCheck size={18} style={{color: '#059669'}} />
                  <span>
                    Semua kolom data sistem FAP yang dibandingkan telah sesuai atau tidak ditemukan perbedaan
                    dengan dokumen fisik OCR.
                  </span>
                </div>
              ) : (
                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 12}}>
                    <thead>
                      <tr
                        style={{background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left'}}
                      >
                        <th style={{padding: '8px 10px', color: '#475569', fontWeight: 600}}>Field Name</th>
                        <th style={{padding: '8px 10px', color: '#002060', fontWeight: 600}}>
                          System FAP Record
                        </th>
                        <th style={{padding: '8px 10px', color: '#b45309', fontWeight: 600}}>
                          Scanned Document (OCR)
                        </th>
                        <th style={{padding: '8px 10px', color: '#475569', fontWeight: 600, width: 100}}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {discrepancies.map((diff: any, i: number) => (
                        <tr key={diff.field || i} style={{borderBottom: '1px solid #e2e8f0'}}>
                          <td style={{padding: '8px 10px', fontWeight: 600, color: '#334155'}}>
                            {diff.label || diff.field}
                          </td>
                          <td style={{padding: '8px 10px', color: '#0f172a', background: '#f8fafc'}}>
                            {diff.oldValue || diff.systemValue || '—'}
                          </td>
                          <td
                            style={{
                              padding: '8px 10px',
                              color: '#b45309',
                              background: '#fffbeb',
                              fontWeight: 500,
                            }}
                          >
                            {diff.newValue || diff.ocrValue || '—'}
                          </td>
                          <td style={{padding: '8px 10px'}}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                background: '#fef3c7',
                                color: '#92400e',
                              }}
                            >
                              DIFFERENT
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* System FAP Snapshot Collapsible Viewer */}
            <div style={{background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span style={{fontWeight: 600, fontSize: 13, color: '#334155'}}>
                  Arsip Lengkap Snapshot FAP System Data (JSON Payload)
                </span>
                <button
                  type="button"
                  className="button small"
                  style={{fontSize: 11}}
                  onClick={() => setShowSnapshotJson(s => !s)}
                >
                  {showSnapshotJson ? 'Hide JSON Snapshot' : 'View Full JSON Snapshot'}
                </button>
              </div>
              {showSnapshotJson && (
                <pre
                  style={{
                    marginTop: 10,
                    background: '#0f172a',
                    color: '#f8fafc',
                    padding: 12,
                    borderRadius: 6,
                    fontSize: 11,
                    maxHeight: 300,
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                  }}
                >
                  {JSON.stringify(current.fap_stage_data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="modal-actions">
        <button type="button" className="button primary" onClick={onClose}>
          Tutup Arsip
        </button>
      </div>
    </Modal>
  );
}
