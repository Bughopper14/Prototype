/** Investment plan options (from the master table) and their remarks. */
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function InvestmentPlanField() {
  const {investmentPlanMasterItems, data, updateField, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    <>
      {/* INVESTMENT PLAN: CHECKBOXES FROM MASTER TABLE + REMARKS */}
      <div
        id="preana-form-investmentPlan"
        data-field="investmentPlan"
        tabIndex={-1}
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          transition: 'all 0.25s ease',
        }}
      >
        <div>
          <label style={{fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a', margin: 0}}>
            Investment Plan Options
          </label>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          {investmentPlanMasterItems.map(item => {
            const isChecked = (data.investmentPlanSelected || []).includes(item.value);
            const remarkVal = (data.investmentPlanRemarks && data.investmentPlanRemarks[item.value]) || '';

            const handleToggle = () => {
              const cur = data.investmentPlanSelected || [];
              const next = isChecked ? cur.filter(x => x !== item.value) : [...cur, item.value];
              updateField('investmentPlanSelected', next);
            };

            const handleRemarkChange = (val: string) => {
              const curRemarks = {...(data.investmentPlanRemarks || {})};
              curRemarks[item.value] = val;
              updateField('investmentPlanRemarks', curRemarks);
            };

            return (
              <div
                key={item.value}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  padding: '8px 10px',
                  background: isChecked ? '#eff6ff' : '#ffffff',
                  border: isChecked ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
                  borderRadius: '6px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    margin: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={handleToggle}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#2563eb',
                      cursor: 'pointer',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: isChecked ? 700 : 500,
                      color: isChecked ? '#1e40af' : '#334155',
                    }}
                  >
                    {item.name || item.value}
                  </span>
                </label>

                {isChecked && (
                  <div style={{marginTop: '3px'}}>
                    <input
                      type="text"
                      value={remarkVal}
                      onChange={e => handleRemarkChange(e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-investmentPlan')}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: '0.75rem',
                        borderRadius: '4px',
                        border: '1px solid #93c5fd',
                        background: '#ffffff',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
