import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';
import type {ReactNode} from 'react';

/** Navy title bar of a section of the live document; clicking it jumps to that section of the form. */
export function PreviewSectionTitle({n, field, children}: {n: number; field: string; children: ReactNode}) {
  const {handlePreviewCellClick} = usePreAnalysisContext();
  return (
    <div
      id={`preana-preview-sec-${n}`}
      onClick={() => handlePreviewCellClick(field, `sec${n}`)}
      style={{
        background: '#1b365d',
        color: '#ffffff',
        padding: '6px 10px',
        fontWeight: 700,
        fontSize: '10.5pt',
        marginTop: '16px',
        marginBottom: '8px',
        cursor: 'pointer',
      }}
    >
      {children}
    </div>
  );
}
