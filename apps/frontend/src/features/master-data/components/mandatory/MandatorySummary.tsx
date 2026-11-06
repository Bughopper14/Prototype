/** One-line totals above the mandatory-rules table. */
export function MandatorySummary({
  total,
  fap,
  fapMandatory,
  pre,
  preMandatory,
  mandatory,
}: {
  total: number;
  fap: number;
  fapMandatory: number;
  pre: number;
  preMandatory: number;
  mandatory: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        padding: '10px 16px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        fontSize: 12,
        color: '#475569',
        marginBottom: 16,
        alignItems: 'center',
      }}
    >
      <span>
        Total Fields: <b>{total}</b>
      </span>
      <span>•</span>
      <span style={{color: '#0284c7', fontWeight: 600}}>
        FAP: <b>{fap}</b> ({fapMandatory} Mandatory)
      </span>
      <span>•</span>
      <span style={{color: '#b45309', fontWeight: 600}}>
        PRE-AN: <b>{pre}</b> ({preMandatory} Mandatory)
      </span>
      <span>•</span>
      <span style={{color: '#dc2626', fontWeight: 600}}>
        * Total Mandatory: <b>{mandatory}</b>
      </span>
      <span>•</span>
      <span style={{color: '#64748b'}}>
        Total Optional: <b>{total - mandatory}</b>
      </span>
    </div>
  );
}
