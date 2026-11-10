/** Customer section 06: industry segmentation and main business checkboxes (one choice each). */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';

export function SegmentChecklist() {
  const {draft, setDraft, handleTriggerFieldSync, canEditCustomerPic} = useWorkspace();
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
      {/* Segmentasi / Segmentation */}
      <div data-field="industrySegment">
        <label
          style={{display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: 8}}
        >
          Segmentasi / Segmentation :
        </label>
        <div style={{display: 'flex', flexDirection: 'column', gap: 5}}>
          {[
            {value: 'MINING', label: 'Pertambangan/Mining'},
            {value: 'AGRICULTURE', label: 'Pertanian/Agriculture'},
            {value: 'FORESTRY', label: 'Kehutanan/Forestry'},
            {value: 'CONSTRUCTION', label: 'Konstruksi/Construction'},
            {value: 'OIL_AND_GAS', label: 'Oil & Gas'},
            {value: 'OTHER', label: 'Lainnya/Other'},
          ].map(opt => {
            const curSeg = String(draft.industrySegment || '')
              .trim()
              .toUpperCase();
            const isChecked = Boolean(
              curSeg &&
              (curSeg === opt.value ||
                (opt.value === 'OIL_AND_GAS' && (curSeg === 'OIL_GAS' || curSeg.includes('OIL'))) ||
                curSeg.includes(opt.value)),
            );
            return (
              <label
                key={opt.value}
                onClick={() => {
                  if (!canEditCustomerPic) return;
                  const newVal = isChecked ? '' : opt.value;
                  setDraft({...draft, industrySegment: newVal});
                  handleTriggerFieldSync('industrySegment', 'business', {industrySegment: newVal});
                }}
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
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    border: `1.5pt solid ${isChecked ? '#2563eb' : '#94a3b8'}`,
                    background: isChecked ? '#2563eb' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}
                >
                  {isChecked ? '✓' : ''}
                </div>
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Bisnis Utama / Main Business */}
      <div data-field="businessRole">
        <label
          style={{display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: 8}}
        >
          Bisnis Utama / Main Business :
        </label>
        <div style={{display: 'flex', flexDirection: 'column', gap: 5}}>
          {[
            {value: 'CONS_OWNER', label: 'Cons. Owner'},
            {value: 'CONTRACTORS', label: 'Contractors'},
            {value: 'SUB_CONT', label: 'Sub Cont'},
            {value: 'RENTAL', label: 'Rental'},
            {value: 'OTHER', label: 'Other'},
          ].map(opt => {
            const curRole = String(draft.businessRole || '')
              .trim()
              .toUpperCase();
            const isChecked = Boolean(
              curRole &&
              (curRole === opt.value ||
                (opt.value === 'CONTRACTORS' &&
                  (curRole === 'CONTRACTOR' ||
                    curRole === 'CONTRACTORS' ||
                    curRole.includes('KONTRAKTOR'))) ||
                (opt.value === 'SUB_CONT' &&
                  (curRole === 'SUB_CONT' || curRole === 'SUB_CONTRACTOR' || curRole.startsWith('SUB'))) ||
                (opt.value === 'CONS_OWNER' &&
                  (curRole === 'CONS_OWNER' ||
                    curRole === 'CONCESSION_OWNER' ||
                    curRole.includes('OWNER'))) ||
                curRole.includes(opt.value)),
            );
            return (
              <label
                key={opt.value}
                onClick={() => {
                  if (!canEditCustomerPic) return;
                  const newVal = isChecked ? '' : opt.value;
                  setDraft({...draft, businessRole: newVal});
                  handleTriggerFieldSync('businessRole', 'business', {businessRole: newVal});
                }}
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
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    border: `1.5pt solid ${isChecked ? '#2563eb' : '#94a3b8'}`,
                    background: isChecked ? '#2563eb' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}
                >
                  {isChecked ? '✓' : ''}
                </div>
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
