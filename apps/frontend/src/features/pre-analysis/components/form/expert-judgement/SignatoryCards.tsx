/** The signatory cards. */
import {Plus} from 'lucide-react';
import {SignatoryCard} from '@/features/pre-analysis/components/form/expert-judgement/SignatoryCard';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function SignatoryCards() {
  const {currentSignatories, handleAddSignatory} = usePreAnalysisContext();
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
      {currentSignatories.map((sig, idx) => (
        <SignatoryCard key={sig.id || idx} sig={sig} idx={idx} />
      ))}

      <div style={{textAlign: 'center', marginTop: '4px'}}>
        <button
          type="button"
          onClick={handleAddSignatory}
          style={{
            fontSize: '0.75rem',
            padding: '6px 14px',
            borderRadius: '5px',
            background: '#eff6ff',
            color: '#1d4ed8',
            border: '1.5px dashed #3b82f6',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Plus size={14} />
          Add Another Signatory
        </button>
      </div>
    </div>
  );
}
