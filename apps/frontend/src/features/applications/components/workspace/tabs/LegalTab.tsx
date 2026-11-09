/** Tab: Legal (deeds and stakeholders). */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {LegalEditor} from '@/features/legal/components/LegalEditor';
import {deriveDeedSync} from '@/shared/lib/format';

export function LegalTab() {
  const {a, user, setCustomerDraft, tab, draft, setDraft, canLegal, beginDeedReview} = useWorkspace();
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
            setDraft({
              ...draft,
              legal,
              stakeholders,
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
