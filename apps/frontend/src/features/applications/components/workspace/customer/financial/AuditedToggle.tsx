/** Audited checkbox that applies to all fiscal years. */

export function AuditedToggle({
  draft,
  setDraft,
  canFinance,
  handleTriggerFieldSync,
}: {
  draft: any;
  setDraft: (d: any) => void;
  canFinance: boolean;
  handleTriggerFieldSync: (field: string, section?: string, extra?: any) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.85rem',
          cursor: canFinance ? 'pointer' : 'default',
          fontWeight: 600,
          color: '#1e293b',
        }}
      >
        <input
          type="checkbox"
          data-field="financialAudited"
          disabled={!canFinance}
          checked={Boolean(draft.financialAudited)}
          onChange={e => {
            const val = e.target.checked;
            setDraft((d: any) => ({...d, financialAudited: val}));
            handleTriggerFieldSync('financialAudited', 'fap-preview-sec-financial');
          }}
          onFocus={() => handleTriggerFieldSync('financialAudited', 'fap-preview-sec-financial')}
          style={{
            accentColor: '#2563eb',
            width: 18,
            height: 18,
            cursor: canFinance ? 'pointer' : 'default',
          }}
        />
        <span>Audited</span>
      </label>
      <span style={{fontSize: '0.78rem', color: '#64748b'}}>
        (Yes / No) · Centang jika laporan keuangan diaudit / Check if statements are audited
      </span>
    </div>
  );
}
