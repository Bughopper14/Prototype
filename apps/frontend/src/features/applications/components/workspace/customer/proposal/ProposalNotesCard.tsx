/** Sub-section 4 of the financing proposal: free-text notes (rich text). */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {highlightFormElement} from '@/features/applications/hooks/useFapPreviewSync';
import {CrmRichTextEditor} from '@/shared/ui/CrmRichTextEditor';
import {FileText} from 'lucide-react';

export function ProposalNotesCard() {
  const {draft, setDraft, handleTriggerFieldSync, canFinance} = useWorkspace();
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
      }}
      data-field="proposalNotes"
      onClick={() => {
        handleTriggerFieldSync('proposalNotes', 'proposal');
        highlightFormElement(
          document.getElementById('fap-form-proposalNotes') ||
            document.querySelector('[data-field="proposalNotes"]'),
        );
      }}
    >
      <h5
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: '#0f172a',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <FileText size={15} style={{color: '#0284c7'}} />
        Notes
      </h5>
      <p style={{fontSize: '12px', color: '#64748b', marginBottom: '12px'}}>
        Additional notes or specific terms for this financing application proposal
      </p>
      <div
        id="fap-form-proposalNotes"
        data-field="proposalNotes"
        onFocus={() => handleTriggerFieldSync('proposalNotes', 'proposal')}
        onClick={() => handleTriggerFieldSync('proposalNotes', 'proposal')}
      >
        <CrmRichTextEditor
          id="fap-form-proposalNotes"
          dataField="proposalNotes"
          value={draft.financingProposal?.notes || ''}
          disabled={!canFinance}
          height={220}
          onClick={() => handleTriggerFieldSync('proposalNotes', 'proposal')}
          onChange={content => {
            setDraft((prev: any) => ({
              ...prev,
              financingProposal: {
                ...(prev.financingProposal || {}),
                notes: content,
              },
            }));
          }}
        />
      </div>
    </div>
  );
}
