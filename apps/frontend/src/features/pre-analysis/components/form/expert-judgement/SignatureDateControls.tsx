/** Default signature date (follows today when the document is opened). */
import {getTodaySignatureDate} from '@/features/pre-analysis/lib/defaults';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function SignatureDateControls() {
  const {signatureDateToDisplay, updateField, highlightAllSignatureDates, todayDateStr} =
    usePreAnalysisContext();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '14px',
        background: '#f8fafc',
        padding: '10px 14px',
        borderRadius: '6px',
        border: '1.5px solid #cbd5e1',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        <label style={{fontSize: '0.78rem', fontWeight: 700, color: '#1e3a8a'}}>
          Default Signature Date:
        </label>
        <input
          type="text"
          name="signatureDate"
          data-field="signatureDate"
          value={signatureDateToDisplay}
          onChange={e => updateField('signatureDate', e.target.value)}
          onFocus={highlightAllSignatureDates}
          onClick={highlightAllSignatureDates}
          style={{
            padding: '4px 10px',
            fontSize: '0.8rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            width: '140px',
            fontWeight: 700,
            color: '#0f172a',
            background: '#ffffff',
          }}
        />
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        <span
          style={{
            fontSize: '0.7rem',
            color: '#16a34a',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 600,
          }}
        >
          ✓ Auto-updates to today's date on open
        </span>
        <button
          type="button"
          onClick={() => {
            const today = getTodaySignatureDate();
            updateField('signatureDate', today);
            highlightAllSignatureDates();
          }}
          style={{
            fontSize: '0.72rem',
            padding: '3px 10px',
            borderRadius: '4px',
            background: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Reset to Today ({todayDateStr})
        </button>
      </div>
    </div>
  );
}
