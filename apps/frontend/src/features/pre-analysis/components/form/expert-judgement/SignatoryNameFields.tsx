/** Full name and position / department of a signatory. */
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';
import type {SignatoryItem} from '@/features/pre-analysis/lib/types';

export function SignatoryNameFields({sig, idx}: {sig: SignatoryItem; idx: number}) {
  const {handleUpdateSignatory, triggerSignatorySync} = usePreAnalysisContext();
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '10px',
      }}
    >
      <div>
        <label
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#475569',
            display: 'block',
            marginBottom: '3px',
          }}
        >
          Full Name :
        </label>
        <input
          type="text"
          value={sig.name}
          onChange={e => handleUpdateSignatory(idx, {name: e.target.value})}
          onFocus={() => triggerSignatorySync(idx)}
          onClick={e => {
            e.stopPropagation();
            triggerSignatorySync(idx);
          }}
          style={{
            width: '100%',
            padding: '6px 10px',
            fontSize: '0.8rem',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            fontWeight: 600,
            color: '#0f172a',
          }}
        />
      </div>
      <div>
        <label
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#475569',
            display: 'block',
            marginBottom: '3px',
          }}
        >
          Position / Department :
        </label>
        <input
          type="text"
          value={sig.position}
          onChange={e => handleUpdateSignatory(idx, {position: e.target.value})}
          onFocus={() => triggerSignatorySync(idx)}
          onClick={e => {
            e.stopPropagation();
            triggerSignatorySync(idx);
          }}
          style={{
            width: '100%',
            padding: '6px 10px',
            fontSize: '0.8rem',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            color: '#334155',
          }}
        />
      </div>
    </div>
  );
}
