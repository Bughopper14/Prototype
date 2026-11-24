/** Financing purpose choices of FAP section 05, grouped per facility purpose; all from Master Data. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {usePurposeSelection} from '@/features/applications/hooks/usePurposeSelection';
import {useMasterData} from '@/shared/master-data';
import {RequiredStar} from '@/shared/ui/RequiredStar';
import {FORM_SECTION} from '@liugong/shared';

export function FinancingPurposeColumn() {
  const {canEdit, handleTriggerFieldSync} = useWorkspace();
  const {purposeList, togglePurpose} = usePurposeSelection();
  const master = useMasterData();
  // crm_master_financing_purpose_options, grouped under their facility purpose (crm_master_facility_purposes)
  const options = (master.financingPurposeOption || []).filter(o => o.active && o.visible !== false);
  const groups = (master.facilityPurpose || [])
    .map(purpose => ({purpose, options: options.filter(o => o.parentValue === purpose.value)}))
    .filter(g => g.options.length);
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
        <RequiredStar field="financingPurposeDetail" section={FORM_SECTION.PURPOSE} />
      </div>

      {groups.map(({purpose, options: groupOptions}) => (
        <div key={purpose.value} style={{marginBottom: 12}}>
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
            {groupOptions[0].groupLabel || purpose.name} (✓) :
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
            {groupOptions.map(item => {
              const checked = purposeList.includes(item.value);
              return (
                <label
                  key={item.value}
                  data-field={item.value}
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
                  onClick={() => item.paramKey && handleTriggerFieldSync(item.paramKey, 'purpose')}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!canEdit}
                    onChange={() => togglePurpose(item.value)}
                    style={{cursor: canEdit ? 'pointer' : 'default', accentColor: '#2563eb'}}
                  />
                  <span style={{lineHeight: 1.35}}>{item.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
