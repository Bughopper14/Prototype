/** Tab: Legal (deeds and stakeholders). */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {LegalEditor} from '@/features/legal/components/LegalEditor';
import {deriveDeedSync} from '@/shared/lib/format';

export function LegalTab() {
  const {
    a,
    user,
    notify,
    setCustomerDraft,
    tab,
    draft,
    setDraft,
    canLegal,
    beginDeedReview,
    editRequest,
    setEditRequest,
    setReviewHidden,
  } = useWorkspace();
  return (
    <>
      {tab === 5 && (
        <LegalEditor
          value={draft.legal || {}}
          application={a}
          stakeholders={draft.stakeholders}
          disabled={!canLegal}
          user={user}
          onReview={beginDeedReview}
          notify={notify}
          editRequest={editRequest}
          onEditRequestHandled={() => setEditRequest(null)}
          onEditFinished={async id => {
            // Back to the review dialog at once (no empty moment); it refreshes in place with what was just saved
            setReviewHidden(false);
            await beginDeedReview(id);
          }}
          onChange={legal => {
            const sync = deriveDeedSync(legal, a);
            const updCustomer = {
              ...(draft.customer || {}),
              establishmentActNo: sync.establishmentActNo || draft.customer?.establishmentActNo || '',
              establishmentDate: sync.establishmentDate || draft.customer?.establishmentDate || '',
            };
            if (sync.establishmentActNo) setCustomerDraft((prev: any) => ({...prev, ...updCustomer}));
            setDraft({
              ...draft,
              legal,
              latestDeedNo: sync.latestDeedNo || draft.latestDeedNo || '',
              latestDeedDate: sync.latestDeedDate || draft.latestDeedDate || '',
              experienceYears: sync.experienceYears,
              experienceMonths: sync.experienceMonths,
              customer: sync.establishmentActNo ? updCustomer : draft.customer || {},
            });
          }}
          onStakeholdersChange={(legal, stakeholders) => {
            const sync = deriveDeedSync(legal, a);
            const updCustomer = {
              ...(draft.customer || {}),
              establishmentActNo: sync.establishmentActNo || draft.customer?.establishmentActNo || '',
              establishmentDate: sync.establishmentDate || draft.customer?.establishmentDate || '',
            };
            if (sync.establishmentActNo) setCustomerDraft((prev: any) => ({...prev, ...updCustomer}));
            // The FAP shows the shareholders of the latest deed
            const effectiveStakeholders =
              sync.latestStakeholders.length > 0 ? sync.latestStakeholders : stakeholders;
            setDraft({
              ...draft,
              legal,
              stakeholders: effectiveStakeholders,
              latestDeedNo: sync.latestDeedNo || draft.latestDeedNo || '',
              latestDeedDate: sync.latestDeedDate || draft.latestDeedDate || '',
              experienceYears: sync.experienceYears,
              experienceMonths: sync.experienceMonths,
              customer: sync.establishmentActNo ? updCustomer : draft.customer || {},
            });
          }}
        />
      )}
    </>
  );
}
