/** Customer section 06: industry segmentation and main business as radio buttons (one choice each, from Master Data). */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {useMasterData} from '@/shared/master-data';
import type {MasterItem} from '@liugong/shared';
import {RequiredStar} from '@/shared/ui/RequiredStar';
import {FORM_SECTION} from '@liugong/shared';

function OptionList({
  field,
  title,
  options,
}: {
  field: 'industrySegment' | 'businessRole';
  title: string;
  options: MasterItem[];
}) {
  const {draft, setDraft, handleTriggerFieldSync, canEditCustomerPic} = useWorkspace();
  const current = String(draft[field] || '');
  return (
    <div data-field={field}>
      <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: 8}}>
        {title}
        <RequiredStar field={field} section={FORM_SECTION.SEGMENTATION} />
      </label>
      <div style={{display: 'flex', flexDirection: 'column', gap: 5}}>
        {options
          .filter(opt => opt.active || opt.value === current)
          .map(opt => {
            const isChecked = current === opt.value;
            return (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: `1px solid ${isChecked ? '#2563eb' : '#cbd5e1'}`,
                  background: isChecked ? '#eff6ff' : '#ffffff',
                  cursor: canEditCustomerPic ? 'pointer' : 'default',
                  fontSize: '0.78rem',
                  color: isChecked ? '#1d4ed8' : '#334155',
                  fontWeight: isChecked ? 600 : 400,
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name={field}
                  value={opt.value}
                  checked={isChecked}
                  disabled={!canEditCustomerPic}
                  onChange={() => {
                    setDraft({...draft, [field]: opt.value});
                    handleTriggerFieldSync(field, 'business', {[field]: opt.value});
                  }}
                  style={{width: 16, height: 16, margin: 0, accentColor: '#2563eb', flexShrink: 0, cursor: 'inherit'}}
                />
                <span>{opt.name}</span>
              </label>
            );
          })}
      </div>
    </div>
  );
}

export function SegmentChecklist() {
  const master = useMasterData();
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
        marginTop: '14px',
        background: '#f8fafc',
        padding: '12px 14px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}
    >
      <OptionList field="industrySegment" title="Segmentasi / Segmentation :" options={master.industrySegment || []} />
      <OptionList field="businessRole" title="Bisnis Utama / Main Business :" options={master.businessRole || []} />
    </div>
  );
}
