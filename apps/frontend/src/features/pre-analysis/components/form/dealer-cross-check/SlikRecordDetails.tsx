/** Lender exposures with the grand total, Pefindo analysis notes and commercial terms (entity has records). */
import {Trash2} from 'lucide-react';
import {stripHtmlTags} from '@/features/pre-analysis/lib/text';
import {PreAnalysisRichEditor} from '@/features/pre-analysis/components/PreAnalysisRichEditor';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';
import type {EntitySlikReview} from '@/features/pre-analysis/lib/types';

export function SlikRecordDetails({
  idx,
  review,
  totalPlafonFormatted,
}: {
  idx: number;
  review: EntitySlikReview;
  totalPlafonFormatted: string;
}) {
  const {data, updateEntityReview, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    /* YES: Show Table with dynamic Grand Total, Pefindo Analysis Notes, and Commercial Terms */
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <span style={{fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic'}}>
          {stripHtmlTags(data.slikPefindoHighlight)}
        </span>
        <button
          type="button"
          onClick={() => {
            const next = [...(review.lenderExposures || []), {lender: '', plafond: '', rate: ''}];
            updateEntityReview(idx, {lenderExposures: next});
          }}
          style={{
            fontSize: '0.72rem',
            padding: '3px 10px',
            borderRadius: '4px',
            background: '#eff6ff',
            color: '#1e40af',
            border: '1px solid #bfdbfe',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          + Add Lender
        </button>
      </div>

      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          overflow: 'hidden',
          marginBottom: '12px',
        }}
      >
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem'}}>
          <thead style={{background: '#f8fafc', borderBottom: '1px solid #e2e8f0'}}>
            <tr>
              <th style={{padding: '6px 8px', textAlign: 'left'}}>Row Labels</th>
              <th style={{width: '32%', padding: '6px 8px', textAlign: 'right'}}>Sum of plafon</th>
              <th style={{width: '20%', padding: '6px 8px', textAlign: 'right'}}>Interest Rate</th>
              <th style={{width: '36px', padding: '6px 8px'}}></th>
            </tr>
          </thead>
          <tbody>
            {(review.lenderExposures || []).map((lex, lIdx) => (
              <tr key={lIdx} style={{borderBottom: '1px solid #f1f5f9'}}>
                <td style={{padding: '4px 6px'}}>
                  <input
                    type="text"
                    value={lex.lender || ''}
                    onChange={e => {
                      const copy = [...review.lenderExposures];
                      copy[lIdx] = {...copy[lIdx], lender: e.target.value};
                      updateEntityReview(idx, {lenderExposures: copy});
                    }}
                    onFocus={() => scrollToPreviewElement(`preana-preview-cell-slik-${idx}`)}
                    style={{
                      width: '100%',
                      padding: '4px',
                      fontSize: '0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '3px',
                    }}
                  />
                </td>
                <td style={{padding: '4px 6px', textAlign: 'right'}}>
                  <input
                    type="text"
                    value={lex.plafond || ''}
                    onChange={e => {
                      const copy = [...review.lenderExposures];
                      copy[lIdx] = {...copy[lIdx], plafond: e.target.value};
                      updateEntityReview(idx, {lenderExposures: copy});
                    }}
                    onFocus={() => scrollToPreviewElement(`preana-preview-cell-slik-${idx}`)}
                    style={{
                      width: '100%',
                      padding: '4px',
                      fontSize: '0.75rem',
                      textAlign: 'right',
                      border: '1px solid #cbd5e1',
                      borderRadius: '3px',
                      fontFamily: 'monospace',
                    }}
                  />
                </td>
                <td style={{padding: '4px 6px', textAlign: 'right'}}>
                  <input
                    type="text"
                    value={lex.rate || ''}
                    onChange={e => {
                      const copy = [...review.lenderExposures];
                      copy[lIdx] = {...copy[lIdx], rate: e.target.value};
                      updateEntityReview(idx, {lenderExposures: copy});
                    }}
                    onFocus={() => scrollToPreviewElement(`preana-preview-cell-slik-${idx}`)}
                    style={{
                      width: '100%',
                      padding: '4px',
                      fontSize: '0.75rem',
                      textAlign: 'right',
                      border: '1px solid #cbd5e1',
                      borderRadius: '3px',
                    }}
                  />
                </td>
                <td style={{padding: '4px 6px', textAlign: 'center'}}>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = review.lenderExposures.filter((_, i) => i !== lIdx);
                      updateEntityReview(idx, {lenderExposures: copy});
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr
              style={{
                background: '#f8fafc',
                fontWeight: 700,
                borderTop: '2px solid #cbd5e1',
              }}
            >
              <td style={{padding: '6px 8px', color: '#0f172a'}}>Grand Total</td>
              <td
                style={{
                  padding: '6px 8px',
                  textAlign: 'right',
                  color: '#1e3a8a',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                }}
              >
                {totalPlafonFormatted}
              </td>
              <td style={{padding: '6px 8px', textAlign: 'right', color: '#64748b'}}>-</td>
              <td style={{padding: '6px 8px'}}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{marginBottom: '10px'}}>
        <label
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#475569',
            marginBottom: '4px',
            display: 'block',
          }}
        >
          Pefindo Analysis Notes
        </label>
        <PreAnalysisRichEditor
          value={review.pefindoNotes || ''}
          onChange={val => updateEntityReview(idx, {pefindoNotes: val})}
          onFocus={() => scrollToPreviewElement(`preana-preview-cell-slik-${idx}`)}
          dataField={`slik-${idx}-pefindoNotes`}
          height={150}
        />
      </div>

      <div>
        <label
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#475569',
            marginBottom: '4px',
            display: 'block',
          }}
        >
          Commercial Terms on Other Fincos
        </label>
        <PreAnalysisRichEditor
          value={review.pefindoTerms || ''}
          onChange={val => updateEntityReview(idx, {pefindoTerms: val})}
          onFocus={() => scrollToPreviewElement(`preana-preview-cell-slik-${idx}`)}
          dataField={`slik-${idx}-pefindoTerms`}
          height={130}
        />
      </div>
    </div>
  );
}
