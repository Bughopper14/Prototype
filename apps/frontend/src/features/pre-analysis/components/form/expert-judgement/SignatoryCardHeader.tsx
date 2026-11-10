/** Role of a signatory and its delete button. */
import {Trash2} from 'lucide-react';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';
import type {SignatoryItem} from '@/features/pre-analysis/lib/types';

export function SignatoryCardHeader({
  sig,
  idx,
  roleColor,
}: {
  sig: SignatoryItem;
  idx: number;
  roleColor: {bg: string; text: string; border: string};
}) {
  const {handleUpdateSignatory, triggerSignatorySync, currentSignatories, handleRemoveSignatory} =
    usePreAnalysisContext();
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        flexWrap: 'wrap',
        gap: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
          minWidth: '260px',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#1e3a8a',
            color: '#ffffff',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {idx + 1}
        </span>
        <div style={{display: 'flex', alignItems: 'center', gap: '6px', flex: 1}}>
          <label
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#0f172a',
              whiteSpace: 'nowrap',
            }}
          >
            Role Header:
          </label>
          <input
            type="text"
            value={sig.role}
            onChange={e => handleUpdateSignatory(idx, {role: e.target.value})}
            onFocus={() => triggerSignatorySync(idx)}
            onClick={e => {
              e.stopPropagation();
              triggerSignatorySync(idx);
            }}
            style={{
              padding: '4px 8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              width: '150px',
            }}
          />
          <div style={{display: 'flex', gap: '3px'}}>
            {['Propose by :', 'Reviewed by :', 'Approved by :'].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => handleUpdateSignatory(idx, {role: r})}
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 5px',
                  borderRadius: '3px',
                  border: '1px solid',
                  borderColor: sig.role === r ? '#3b82f6' : '#e2e8f0',
                  background: sig.role === r ? '#eff6ff' : '#ffffff',
                  color: sig.role === r ? '#1d4ed8' : '#64748b',
                  cursor: 'pointer',
                  fontWeight: sig.role === r ? 700 : 500,
                }}
              >
                {r.replace(' by :', '')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        <span
          style={{
            fontSize: '0.7rem',
            background: roleColor.bg,
            color: roleColor.text,
            border: `1px solid ${roleColor.border}`,
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 600,
          }}
        >
          {sig.role.replace(':', '').trim()}
        </span>
        {currentSignatories.length > 1 && (
          <button
            type="button"
            onClick={() => handleRemoveSignatory(idx)}
            title="Delete this signatory"
            style={{
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#ef4444',
              borderRadius: '4px',
              padding: '3px 8px',
              cursor: 'pointer',
              fontSize: '0.7rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
            }}
          >
            <Trash2 size={12} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
