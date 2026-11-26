/** Who submitted the archive, when, and the key facts of the submission. */

export function ArchiveMetadataBanner({current}: {current: any}) {
  const happened = current.statusCode === 'APPROVED' ? 'Approved' : current.statusCode === 'REJECTED' ? 'Rejected' : 'Submitted';
  return (
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
            fontWeight: 700,
            display: 'block',
          }}
        >
          {happened} At
        </span>
        <strong style={{fontSize: 13, color: '#0f172a'}}>
          {new Date(current.frozenAt).toLocaleString('en-GB')}
        </strong>
      </div>
      <div>
        <span
          style={{
            fontSize: 11,
            color: '#64748b',
            textTransform: 'uppercase',
            fontWeight: 700,
            display: 'block',
          }}
        >
          {happened} By
        </span>
        <strong style={{fontSize: 13, color: '#0f172a'}}>{current.frozenByName}</strong>
      </div>
      <div>
        <span
          style={{
            fontSize: 11,
            color: '#64748b',
            textTransform: 'uppercase',
            fontWeight: 700,
            display: 'block',
          }}
        >
          Target Stage
        </span>
        <strong style={{fontSize: 13, color: '#047857'}}>
          {current.stageCode}
        </strong>
      </div>
      <div>
        <span
          style={{
            fontSize: 11,
            color: '#64748b',
            textTransform: 'uppercase',
            fontWeight: 700,
            display: 'block',
          }}
        >
          Archive Reference
        </span>
        <strong style={{fontSize: 13, color: '#0f172a'}}>
          {current.freezeVersion ? `Snapshot v${current.freezeVersion}` : current.version ? `v${current.version}` : 'Snapshot Archive'}
        </strong>
        {current.id && (
          <span style={{fontSize: 10, color: '#94a3b8', display: 'block', fontFamily: 'monospace'}}>
            Ref #{String(current.id).slice(0, 8)}
          </span>
        )}
      </div>
    </div>
  );
}
