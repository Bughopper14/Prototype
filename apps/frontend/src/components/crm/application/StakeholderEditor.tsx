import {stakeholderFields} from '@liugong/shared';
import {Repeater} from '@/components/crm/common/SharedUi';
import {stakeholderEditorValues} from '@/components/crm/legal/stakeholder-values';

export function StakeholderEditor({
  rows,
  onChange,
  disabled,
}: {
  rows: any[];
  onChange: (rows: any[]) => void;
  disabled: boolean;
}) {
  const total = rows.reduce((sum, x) => sum + Number(x.sharePercentage || 0), 0),
    isExceeded = total > 100.01;
  return (
    <>
      <div className={'ownership ' + (isExceeded ? 'unbalanced' : 'balanced')}>
        <div>
          <strong>{total.toFixed(2)}%</strong>
          <span>Total ownership · max 100% (not required to be 100%)</span>
        </div>
        <div className="ownership-bar">
          <i style={{width: Math.min(100, total) + '%', background: isExceeded ? '#dc2626' : '#002c5f'}} />
        </div>
      </div>
      {isExceeded && (
        <p style={{color: '#dc2626', fontSize: '12px', marginTop: '6px', fontWeight: 600}}>
          ⚠ Total share ownership exceeds 100%. Please readjust each party's share portion.
        </p>
      )}
      <Repeater
        title="Stakeholders"
        fields={stakeholderFields}
        rows={rows.map(stakeholderEditorValues)}
        disabled={disabled}
        onChange={onChange}
      />
    </>
  );
}
