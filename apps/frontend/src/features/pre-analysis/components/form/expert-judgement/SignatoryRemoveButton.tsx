/** Delete button of a signatory. */
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function SignatoryRemoveButton({idx}: {idx: number}) {
  const {triggerSignatorySync} = usePreAnalysisContext();
  return (
    <div
      onClick={e => {
        e.stopPropagation();
        triggerSignatorySync(idx);
      }}
      style={{
        height: '75px',
        border: '1.5px dashed #94a3b8',
        borderRadius: '6px',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        marginBottom: '10px',
        cursor: 'pointer',
      }}
    >
      <span style={{fontSize: '0.75rem', color: '#64748b', fontWeight: 600}}>
        ( Wet / Digital Signature & Stamp Space )
      </span>
      <span style={{fontSize: '0.68rem', color: '#94a3b8'}}>Signature area column #{idx + 1}</span>
    </div>
  );
}
