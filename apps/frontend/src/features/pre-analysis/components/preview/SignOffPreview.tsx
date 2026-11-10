/** Approvals / sign-off footer of the document, three signatories per row. */
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function SignOffPreview() {
  const {currentSignatories, triggerSignatorySync, highlightAllSignatureDates, signatureDateToDisplay} =
    usePreAnalysisContext();
  return (
    <div
      style={{
        marginTop: '36px',
        marginBottom: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {(() => {
        const chunkSize = 3;
        const chunks = [];
        for (let i = 0; i < currentSignatories.length; i += chunkSize) {
          chunks.push({
            startIndex: i,
            items: currentSignatories.slice(i, i + chunkSize),
          });
        }

        return chunks.map((chunk, chunkIdx) => {
          const isMultiRow = currentSignatories.length > 3;
          const tableWidth = isMultiRow ? `${((chunk.items.length / 3) * 100).toFixed(2)}%` : '100%';

          return (
            <table
              key={chunkIdx}
              style={{
                width: tableWidth,
                borderCollapse: 'collapse',
                fontSize: '9pt',
                border: '1.5px solid #000000',
                background: '#ffffff',
                tableLayout: 'fixed',
              }}
            >
              <thead>
                <tr style={{background: '#f8fafc', borderBottom: '1.5px solid #000000'}}>
                  {chunk.items.map((sig, localIdx) => {
                    const globalIdx = chunk.startIndex + localIdx;
                    const colWidth = `${(100 / chunk.items.length).toFixed(2)}%`;
                    const isLastInChunk = localIdx === chunk.items.length - 1;
                    return (
                      <th
                        key={sig.id || globalIdx}
                        id={`preana-preview-cell-sign-head-${globalIdx}`}
                        onClick={() => triggerSignatorySync(globalIdx)}
                        style={{
                          width: colWidth,
                          padding: '8px 10px',
                          textAlign: 'left',
                          fontWeight: 700,
                          fontSize: isMultiRow ? '8pt' : currentSignatories.length > 3 ? '8pt' : '9pt',
                          color: '#000000',
                          borderRight: isLastInChunk ? 'none' : '1.5px solid #000000',
                          wordBreak: 'break-word',
                          cursor: 'pointer',
                        }}
                      >
                        {sig.role || 'Reviewed by :'}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Generous signature clearance - 95px height */}
                <tr style={{height: '95px'}}>
                  {chunk.items.map((sig, localIdx) => {
                    const globalIdx = chunk.startIndex + localIdx;
                    const isLastInChunk = localIdx === chunk.items.length - 1;
                    return (
                      <td
                        key={sig.id || globalIdx}
                        id={`preana-preview-cell-sign-${globalIdx}`}
                        onClick={() => triggerSignatorySync(globalIdx)}
                        style={{
                          padding: '10px',
                          verticalAlign: 'bottom',
                          borderRight: isLastInChunk ? 'none' : '1.5px solid #000000',
                          cursor: 'pointer',
                          height: '95px',
                        }}
                      >
                        <div
                          style={{
                            minHeight: '75px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            fontStyle: 'italic',
                            fontSize: '7.5pt',
                          }}
                        >
                          ( Signature / Stamp )
                        </div>
                      </td>
                    );
                  })}
                </tr>
                {/* Signatory Names & Positions */}
                <tr style={{borderTop: '1px solid #000000'}}>
                  {chunk.items.map((sig, localIdx) => {
                    const globalIdx = chunk.startIndex + localIdx;
                    const isLastInChunk = localIdx === chunk.items.length - 1;
                    const cellId =
                      globalIdx === 0
                        ? 'preana-preview-cell-proposedBy'
                        : globalIdx === 1
                          ? 'preana-preview-cell-reviewedBy'
                          : globalIdx === 2
                            ? 'preana-preview-cell-approvedBy'
                            : `preana-preview-cell-signatory-${globalIdx}`;

                    return (
                      <td
                        key={sig.id || globalIdx}
                        id={cellId}
                        onClick={() => triggerSignatorySync(globalIdx)}
                        style={{
                          padding: '8px 10px',
                          verticalAlign: 'top',
                          borderRight: isLastInChunk ? 'none' : '1.5px solid #000000',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: isMultiRow ? '8pt' : '9pt',
                            color: '#000000',
                            textDecoration: 'underline',
                            wordBreak: 'break-word',
                          }}
                        >
                          {sig.name || '-'}
                        </div>
                        <div
                          style={{
                            fontSize: isMultiRow ? '7.5pt' : '8pt',
                            color: '#1e293b',
                            marginTop: '2px',
                            whiteSpace: 'pre-line',
                            wordBreak: 'break-word',
                          }}
                        >
                          {sig.position || ''}
                        </div>
                        <div
                          id={`preana-preview-sig-date-${globalIdx}`}
                          onClick={e => {
                            e.stopPropagation();
                            highlightAllSignatureDates();
                          }}
                          style={{
                            fontSize: '7.5pt',
                            color: '#0f172a',
                            marginTop: '6px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Date: {signatureDateToDisplay}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          );
        });
      })()}
    </div>
  );
}
