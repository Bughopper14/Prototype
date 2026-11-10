/** One signatory: role, name, position and date. */
import {SignatoryCardHeader} from '@/features/pre-analysis/components/form/expert-judgement/SignatoryCardHeader';
import {SignatoryRemoveButton} from '@/features/pre-analysis/components/form/expert-judgement/SignatoryRemoveButton';
import {SignatoryNameFields} from '@/features/pre-analysis/components/form/expert-judgement/SignatoryNameFields';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';
import type {SignatoryItem} from '@/features/pre-analysis/lib/types';

export function SignatoryCard({sig, idx}: {sig: SignatoryItem; idx: number}) {
  const {triggerSignatorySync} = usePreAnalysisContext();

  const roleColor = sig.role.toLowerCase().includes('propose')
    ? {bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe'}
    : sig.role.toLowerCase().includes('review')
      ? {bg: '#fef3c7', text: '#92400e', border: '#fde68a'}
      : {bg: '#dcfce7', text: '#166534', border: '#bbf7d0'};

  return (
    <div
      id={`preana-form-signatory-${idx}`}
      data-field={`signatory-${idx}`}
      onClick={() => triggerSignatorySync(idx)}
      className="preana-signatory-card"
      style={{
        border: '1.5px solid #cbd5e1',
        borderRadius: '8px',
        background: '#f8fafc',
        padding: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        cursor: 'pointer',
      }}
    >
      <SignatoryCardHeader sig={sig} idx={idx} roleColor={roleColor} />

      <SignatoryRemoveButton idx={idx} />

      <SignatoryNameFields sig={sig} idx={idx} />
    </div>
  );
}
