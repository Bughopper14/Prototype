/** Document name and number in the toolbar. */
import {FileText} from 'lucide-react';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function PreviewDocumentIdentity() {
  const {data} = usePreAnalysisContext();
  return (
    <>
      {/* Left: Document Identity */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <FileText size={15} color="#93c5fd" style={{flexShrink: 0}} />
        <span
          style={{
            fontWeight: 700,
            fontSize: '0.8rem',
            letterSpacing: '0.02em',
            color: '#f8fafc',
            whiteSpace: 'nowrap',
          }}
        >
          PRE-ANALYSIS
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            color: '#94a3b8',
            borderLeft: '1px solid rgba(255,255,255,0.2)',
            paddingLeft: '8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Ref: <span style={{color: '#e2e8f0', fontWeight: 600}}>{data.preAnalysisNo}</span>
        </span>
      </div>
    </>
  );
}
