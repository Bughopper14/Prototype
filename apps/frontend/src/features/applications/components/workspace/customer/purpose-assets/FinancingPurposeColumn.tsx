/** Financing purpose choices: investment and working capital. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {usePurposeSelection} from '@/features/applications/hooks/usePurposeSelection';

export function FinancingPurposeColumn() {
  const {canEdit} = useWorkspace();
  const {purposeList, togglePurpose} = usePurposeSelection();
  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          color: '#0f172a',
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{color: '#2563eb'}}>●</span> Tujuan Pembiayaan / Financing Purpose
      </div>

      {/* Investasi */}
      <div style={{marginBottom: 12}}>
        <div
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#1e40af',
            marginBottom: 6,
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: 4,
          }}
        >
          Investasi / Investment (✓) :
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
          {[
            {
              key: 'BUSINESS_ACTIVITY',
              label: 'Aktivitas Usaha / Investasi (Business Activity/Investment)',
            },
            {key: 'REHABILITATION', label: 'Rehabilitasi (rehabilitation)'},
            {key: 'EXPANSION', label: 'Modernisasi/Ekspansi (modernization/expansion)'},
            {
              key: 'RELOCATION',
              label: 'Relokasi tempat usaha (relocation of business premises)',
            },
          ].map(item => {
            const checked = purposeList.includes(item.key);
            return (
              <label
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.78rem',
                  color: checked ? '#0f172a' : '#475569',
                  fontWeight: checked ? 600 : 400,
                  background: checked ? '#eff6ff' : '#ffffff',
                  border: `1px solid ${checked ? '#93c5fd' : '#e2e8f0'}`,
                  padding: '6px 10px',
                  borderRadius: 6,
                  cursor: canEdit ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!canEdit}
                  onChange={() => togglePurpose(item.key)}
                  style={{cursor: canEdit ? 'pointer' : 'default', accentColor: '#2563eb'}}
                />
                <span>{item.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Modal Kerja */}
      <div>
        <div
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#059669',
            marginBottom: 6,
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: 4,
          }}
        >
          Modal Kerja / Working Capital (✓) :
        </div>
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            fontSize: '0.78rem',
            color: purposeList.includes('WORKING_CAPITAL') ? '#0f172a' : '#475569',
            fontWeight: purposeList.includes('WORKING_CAPITAL') ? 600 : 400,
            background: purposeList.includes('WORKING_CAPITAL') ? '#ecfdf5' : '#ffffff',
            border: `1px solid ${purposeList.includes('WORKING_CAPITAL') ? '#6ee7b7' : '#e2e8f0'}`,
            padding: '8px 10px',
            borderRadius: 6,
            cursor: canEdit ? 'pointer' : 'default',
            transition: 'all 0.15s ease',
          }}
        >
          <input
            type="checkbox"
            checked={purposeList.includes('WORKING_CAPITAL')}
            disabled={!canEdit}
            onChange={() => togglePurpose('WORKING_CAPITAL')}
            style={{
              marginTop: 2,
              cursor: canEdit ? 'pointer' : 'default',
              accentColor: '#059669',
            }}
          />
          <span style={{lineHeight: 1.35}}>
            memenuhi kebutuhan pengeluaran yang habis dalam 1 (satu) siklus usaha / fulfilling the expenditure
            needs that are used up in 1 (one) business cycle
          </span>
        </label>
      </div>
    </div>
  );
}
