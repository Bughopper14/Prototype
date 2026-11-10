/** Print the document. */
import {Printer} from 'lucide-react';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function PrintButton() {
  const {handlePrint} = usePreAnalysisContext();
  return (
    <>
      {/* Print Button */}
      <button
        type="button"
        onClick={handlePrint}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: '#ffffff',
          color: '#0f294a',
          border: 'none',
          padding: '4px 10px',
          borderRadius: '5px',
          fontSize: '0.72rem',
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        <Printer size={13} /> Print
      </button>
    </>
  );
}
