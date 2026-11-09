/** Preview section 6: Cross-check with Dealer / LMI. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';
import {renderRichHtml} from '@/features/pre-analysis/components/RichHtml';
import {stripHtmlTags} from '@/features/pre-analysis/lib/text';

export function DealerCrossCheckPreview() {
  const {data, handlePreviewCellClick, groupSubsidiaries, getEntityReview, getGrandTotal} = usePreAnalysis();
  return (
    <>
      <div
        id="preana-preview-sec-6"
        onClick={() => handlePreviewCellClick('topDealerToCustomer', 'sec6')}
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
        6. CROSS-CHECK WITH DEALER / LMI (quick)
      </div>
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px'}}>
        <tbody>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>Dealer Check</td>
            <td
              id="preana-preview-cell-dealerCheck"
              onClick={() => handlePreviewCellClick('dealerCheck', 'sec6')}
              style={{width: '74%', padding: '4px 6px', cursor: 'pointer', fontWeight: 600}}
            >
              {data.dealerCheck}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>TOP from Dealer to Customer</td>
            <td
              id="preana-preview-cell-topDealerToCustomer"
              onClick={() => handlePreviewCellClick('topDealerToCustomer', 'sec6')}
              style={{width: '74%', padding: '4px 6px', cursor: 'pointer'}}
            >
              {data.topDealerToCustomer}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>TOP from LMI to Dealer</td>
            <td
              id="preana-preview-cell-topLmiToDealer"
              onClick={() => handlePreviewCellClick('topLmiToDealer', 'sec6')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {data.topLmiToDealer}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>LMI Internal AR Check</td>
            <td
              id="preana-preview-cell-lmiArCheck"
              onClick={() => handlePreviewCellClick('lmiArCheck', 'sec6')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {data.lmiArCheck}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700, verticalAlign: 'top'}}>SLIK/Bureau Highlight</td>
            <td style={{padding: '4px 6px'}}>
              {groupSubsidiaries.map((sub, idx) => {
                const fullEntityName = sub.subtitle
                  ? `${sub.name} ${sub.subtitle}`
                  : sub.name || `Entity #${idx + 1}`;
                const review = getEntityReview(idx, fullEntityName);
                const totalPlafonFormatted = getGrandTotal(review.lenderExposures);

                if (review.hasRecord) {
                  return (
                    <div key={idx} style={{marginTop: idx > 0 ? '14px' : '0'}}>
                      <div style={{fontWeight: 700, color: '#1b365d', marginBottom: '4px'}}>
                        {idx + 1}. {fullEntityName.toUpperCase()} :
                      </div>
                      <div
                        style={{
                          fontStyle: 'italic',
                          marginBottom: '6px',
                          fontSize: '8pt',
                          color: '#475569',
                        }}
                      >
                        {stripHtmlTags(data.slikPefindoHighlight)}
                      </div>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '8pt',
                          marginBottom: '8px',
                        }}
                      >
                        <thead>
                          <tr style={{background: '#f1f5f9'}}>
                            <th
                              style={{
                                padding: '3px 6px',
                                textAlign: 'left',
                                border: '1px solid #cbd5e1',
                              }}
                            >
                              Row Labels
                            </th>
                            <th
                              style={{
                                width: '35%',
                                padding: '3px 6px',
                                textAlign: 'right',
                                border: '1px solid #cbd5e1',
                              }}
                            >
                              Sum of plafon
                            </th>
                            <th
                              style={{
                                width: '22%',
                                padding: '3px 6px',
                                textAlign: 'right',
                                border: '1px solid #cbd5e1',
                              }}
                            >
                              Interest Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(review.lenderExposures || []).map((lex, lIdx) => (
                            <tr key={lIdx}>
                              <td style={{padding: '3px 6px', border: '1px solid #e2e8f0'}}>{lex.lender}</td>
                              <td
                                style={{
                                  padding: '3px 6px',
                                  border: '1px solid #e2e8f0',
                                  textAlign: 'right',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {lex.plafond}
                              </td>
                              <td
                                style={{
                                  padding: '3px 6px',
                                  border: '1px solid #e2e8f0',
                                  textAlign: 'right',
                                }}
                              >
                                {lex.rate}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{background: '#f8fafc', fontWeight: 700}}>
                            <td style={{padding: '4px 6px', border: '1px solid #cbd5e1'}}>Grand Total</td>
                            <td
                              style={{
                                padding: '4px 6px',
                                border: '1px solid #cbd5e1',
                                textAlign: 'right',
                                color: '#1e3a8a',
                                fontFamily: 'monospace',
                              }}
                            >
                              {totalPlafonFormatted}
                            </td>
                            <td
                              style={{
                                padding: '4px 6px',
                                border: '1px solid #cbd5e1',
                                textAlign: 'right',
                              }}
                            >
                              -
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                      <div style={{fontSize: '8pt', color: '#334155', marginBottom: '6px'}}>
                        {renderRichHtml(review.pefindoNotes)}
                      </div>
                      {review.pefindoTerms && (
                        <div
                          style={{
                            fontSize: '8pt',
                            color: '#334155',
                            fontWeight: 600,
                            background: '#f8fafc',
                            padding: '4px',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          {renderRichHtml(review.pefindoTerms)}
                        </div>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <div key={idx} style={{marginTop: idx > 0 ? '14px' : '0'}}>
                      <div style={{fontWeight: 700, color: '#1b365d', marginBottom: '4px'}}>
                        {idx + 1}. {fullEntityName.toUpperCase()} - No Records
                      </div>
                      <div
                        style={{
                          fontSize: '8pt',
                          color: '#475569',
                          fontStyle: 'italic',
                          paddingLeft: '8px',
                        }}
                      >
                        {renderRichHtml(review.noRecordRemarks || 'NO RECORD SINCE ITS NEWLY ESTABLISHED')}
                      </div>
                    </div>
                  );
                }
              })}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
