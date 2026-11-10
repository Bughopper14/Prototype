/** Picks which archived submission to look at when there is more than one. */

export function ArchiveVersionSelector({
  archives,
  selectedIndex,
  onSelectIndex,
}: {
  archives: any[];
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
}) {
  return (
    <>
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
          <span style={{fontSize: 12, fontWeight: 600, color: '#475569'}}>Select Submission Snapshot:</span>
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
    </>
  );
}
