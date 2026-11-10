import {Modal} from '@/shared/ui/Modal';
import {ArchiveSnapshotViewer} from '@/features/fap/components/archive/ArchiveSnapshotViewer';
import {ArchiveDiscrepancies} from '@/features/fap/components/archive/ArchiveDiscrepancies';
import {ArchiveRemarks} from '@/features/fap/components/archive/ArchiveRemarks';
import {ArchiveStorageCard} from '@/features/fap/components/archive/ArchiveStorageCard';
import {ArchiveMetadataBanner} from '@/features/fap/components/archive/ArchiveMetadataBanner';
import {ArchiveVersionSelector} from '@/features/fap/components/archive/ArchiveVersionSelector';
import {Archive, Loader2, ShieldCheck} from 'lucide-react';
import {useState} from 'react';

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
            <ArchiveVersionSelector
              archives={archives}
              selectedIndex={selectedIndex}
              onSelectIndex={onSelectIndex}
            />

            {/* Snapshot Metadata Banner */}
            <ArchiveMetadataBanner current={current} />

            {/* Document Storage Location Card */}
            <ArchiveStorageCard current={current} copied={copied} handleCopyPath={handleCopyPath} />

            {/* Document Comparison Remarks */}
            <ArchiveRemarks current={current} />

            {/* OCR Discrepancies / Differences Table */}
            <ArchiveDiscrepancies discrepancies={discrepancies} />

            {/* System FAP Snapshot Collapsible Viewer */}
            <ArchiveSnapshotViewer
              current={current}
              showSnapshotJson={showSnapshotJson}
              setShowSnapshotJson={setShowSnapshotJson}
            />
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
