/** Who submitted the archive, when, and the key facts of the submission. */

export function ArchiveMetadataBanner({current}: {current: any}) {
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
        <strong style={{fontSize: 13, color: '#0f172a'}}>{current.submitted_by_user_name || 'System'}</strong>
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
  );
}
