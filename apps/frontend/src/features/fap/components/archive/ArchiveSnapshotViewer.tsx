/** Collapsible viewer of the stored FAP snapshot (JSON). */
import type {Dispatch, SetStateAction} from 'react';

export function ArchiveSnapshotViewer({
  current,
  showSnapshotJson,
  setShowSnapshotJson,
}: {
  current: any;
  showSnapshotJson: boolean;
  setShowSnapshotJson: Dispatch<SetStateAction<boolean>>;
}) {
  return (
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
  );
}
