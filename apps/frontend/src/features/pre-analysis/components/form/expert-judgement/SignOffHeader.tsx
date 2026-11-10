/** Title of the sign-off area and the button that adds a signatory. */
import {Plus} from 'lucide-react';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function SignOffHeader() {
  const {currentSignatories, handleAddSignatory} = usePreAnalysisContext();
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '8px',
      }}
    >
      <div>
        <span style={{fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a'}}>
          Signatures & Committee Authorization
        </span>
        <div style={{fontSize: '0.7rem', color: '#64748b'}}>
          Signature columns for formal executive authorization (Propose, Review, Approve, etc.)
        </div>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        <span
          style={{
            fontSize: '0.7rem',
            background: '#dbeafe',
            color: '#1e40af',
            padding: '3px 8px',
            borderRadius: '4px',
            fontWeight: 600,
          }}
        >
          {currentSignatories.length} {currentSignatories.length === 1 ? 'Signatory' : 'Signatories'}
        </span>
        <button
          type="button"
          onClick={handleAddSignatory}
          style={{
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '5px',
            background: '#1d4ed8',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 1px 2px rgba(29, 78, 216, 0.2)',
          }}
        >
          <Plus size={14} />
          Add Signatory
        </button>
      </div>
    </div>
  );
}
