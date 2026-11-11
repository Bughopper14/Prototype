/** Customer section 06: industry segmentation and main business radio groups. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';

type SegmentOption = {
  value: string;
  label: string;
  matches: (currentUpper: string) => boolean;
};

const SEGMENT_OPTIONS: SegmentOption[] = [
  {value: 'MINING', label: 'Pertambangan/Mining', matches: cur => cur === 'MINING' || cur.includes('MINING')},
  {
    value: 'AGRICULTURE',
    label: 'Pertanian/Agriculture',
    matches: cur => cur === 'AGRICULTURE' || cur.includes('AGRICULTURE'),
  },
  {value: 'FORESTRY', label: 'Kehutanan/Forestry', matches: cur => cur === 'FORESTRY' || cur.includes('FORESTRY')},
  {
    value: 'CONSTRUCTION',
    label: 'Konstruksi/Construction',
    matches: cur => cur === 'CONSTRUCTION' || cur.includes('CONSTRUCTION'),
  },
  {
    value: 'OIL_AND_GAS',
    label: 'Oil & Gas',
    matches: cur => cur === 'OIL_AND_GAS' || cur === 'OIL_GAS' || cur.includes('OIL'),
  },
  {value: 'OTHER', label: 'Lainnya/Other', matches: cur => cur === 'OTHER' || cur.includes('OTHER')},
];

const BUSINESS_ROLE_OPTIONS: SegmentOption[] = [
  {
    value: 'CONS_OWNER',
    label: 'Cons. Owner',
    matches: cur => cur === 'CONS_OWNER' || cur === 'CONCESSION_OWNER' || cur.includes('OWNER'),
  },
  {
    value: 'CONTRACTORS',
    label: 'Contractors',
    matches: cur => cur === 'CONTRACTOR' || cur === 'CONTRACTORS' || cur.includes('KONTRAKTOR'),
  },
  {
    value: 'SUB_CONT',
    label: 'Sub Cont',
    matches: cur => cur === 'SUB_CONT' || cur === 'SUB_CONTRACTOR' || cur.startsWith('SUB'),
  },
  {value: 'RENTAL', label: 'Rental', matches: cur => cur === 'RENTAL' || cur.includes('RENTAL')},
  {value: 'OTHER', label: 'Other', matches: cur => cur === 'OTHER' || cur.includes('OTHER')},
];

function SegmentRadioGroup({
  fieldKey,
  title,
  value,
  options,
  disabled,
  onSelect,
}: {
  fieldKey: 'industrySegment' | 'businessRole';
  title: string;
  value: unknown;
  options: SegmentOption[];
  disabled: boolean;
  onSelect: (nextValue: string) => void;
}) {
  const curUpper = String(value || '').trim().toUpperCase();
  return (
    <div data-field={fieldKey}>
      <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: 8}}>
        {title}
      </label>
      <div
        role="radiogroup"
        aria-label={title}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: 6,
          padding: '8px 10px',
        }}
      >
        {options.map(opt => {
          const isSelected = Boolean(curUpper && opt.matches(curUpper));
          return (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '3px 2px',
                cursor: disabled ? 'default' : 'pointer',
                fontSize: '0.8rem',
                color: isSelected ? '#1d4ed8' : '#334155',
                fontWeight: isSelected ? 600 : 400,
              }}
            >
              <input
                type="radio"
                name={fieldKey}
                value={opt.value}
                checked={isSelected}
                disabled={disabled}
                onChange={() => {
                  if (!disabled) onSelect(opt.value);
                }}
                style={{
                  margin: 0,
                  cursor: disabled ? 'default' : 'pointer',
                  accentColor: '#2563eb',
                  flexShrink: 0,
                }}
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function SegmentChecklist() {
  const {draft, setDraft, handleTriggerFieldSync, canEditCustomerPic} = useWorkspace();
  const handleSelect = (fieldKey: 'industrySegment' | 'businessRole', nextVal: string) => {
    setDraft({...draft, [fieldKey]: nextVal});
    handleTriggerFieldSync(fieldKey, 'business', {[fieldKey]: nextVal});
  };
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
      <SegmentRadioGroup
        fieldKey="industrySegment"
        title="Segmentasi / Segmentation :"
        value={draft.industrySegment}
        options={SEGMENT_OPTIONS}
        disabled={!canEditCustomerPic}
        onSelect={nextVal => handleSelect('industrySegment', nextVal)}
      />
      <SegmentRadioGroup
        fieldKey="businessRole"
        title="Bisnis Utama / Main Business :"
        value={draft.businessRole}
        options={BUSINESS_ROLE_OPTIONS}
        disabled={!canEditCustomerPic}
        onSelect={nextVal => handleSelect('businessRole', nextVal)}
      />
    </div>
  );
}
