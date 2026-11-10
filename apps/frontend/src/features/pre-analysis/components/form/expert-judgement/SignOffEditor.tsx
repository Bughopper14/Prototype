/** Signatures and committee authorization area. */
import {SignOffHeader} from '@/features/pre-analysis/components/form/expert-judgement/SignOffHeader';
import {SignatureDateControls} from '@/features/pre-analysis/components/form/expert-judgement/SignatureDateControls';
import {SignatoryCards} from '@/features/pre-analysis/components/form/expert-judgement/SignatoryCards';

export function SignOffEditor() {
  return (
    <>
      {/* Sign-offs (Signatures & Committee Authorization Area) */}
      <div style={{marginTop: '20px', borderTop: '1px solid #cbd5e1', paddingTop: '16px'}}>
        <SignOffHeader />

        {/* Signature Date Controls (Auto-updates to current date on open) */}
        <SignatureDateControls />

        {/* Dynamic Signatory Cards List */}
        <SignatoryCards />
      </div>
    </>
  );
}
