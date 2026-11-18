/** The workflow stage a document belongs to (FAP, Pre-analysis, ICLF), named and colored by its stage code. */
export function StageBadge({code, name}: {code: string; name: string}) {
  if (!code && !name) return <span className="muted">-</span>;
  return (
    <span className={`stage-badge stage-${(code || 'other').toLowerCase()}`} title={name || code}>
      {name || code}
    </span>
  );
}
