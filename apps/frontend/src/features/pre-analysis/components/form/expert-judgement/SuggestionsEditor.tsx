/** Suggestions / mitigation limitations. */
import {Trash2} from 'lucide-react';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function SuggestionsEditor() {
  const {data, updateField, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    <>
      {/* Suggestions List */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}
        >
          <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
            Suggestions / Mitigation Limitations
          </label>
          <button
            type="button"
            onClick={() => {
              const next = [...(data.suggestions || []), ''];
              updateField('suggestions', next);
            }}
            style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: '4px',
              background: '#eff6ff',
              color: '#1e40af',
              border: '1px solid #bfdbfe',
              cursor: 'pointer',
            }}
          >
            + Add Item
          </button>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
          {(data.suggestions || []).map((s, idx) => (
            <div key={idx} style={{display: 'flex', gap: '6px', alignItems: 'center'}}>
              <input
                type="text"
                data-field="suggestions"
                value={s}
                onChange={e => {
                  const copy = [...data.suggestions];
                  copy[idx] = e.target.value;
                  updateField('suggestions', copy);
                }}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-suggestions')}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const copy = data.suggestions.filter((_, i) => i !== idx);
                  updateField('suggestions', copy);
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
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
