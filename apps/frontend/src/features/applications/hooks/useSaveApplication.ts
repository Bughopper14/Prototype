/** Save the application draft (customer, legal, business, financing) with mandatory-field checks. */
import {recordSystemActivity} from '@/features/activity/lib/activity-store';
import {computeApplicationDiff} from '@/features/activity/lib/application-diff';
import {stakeholderForSave} from '@/features/legal/lib/stakeholder-values';
import {api} from '@/shared/lib/api';
import {money} from '@/shared/lib/format';

export function useSaveApplication({
  customerCategory,
  customerDraft,
  setCustomerDraft,
  activeStage,
  tab,
  draft,
  setDraft,
  setBusy,
  setError,
  liveCompanyName,
  liveCompanyType,
  liveNib,
  liveNpwp,
  liveEstablishmentActNo,
  liveEstablishmentDate,
  liveNibDate,
  a,
  user,
  onChange,
  notify,
}: {
  customerCategory: string;
  customerDraft: any;
  setCustomerDraft: React.Dispatch<any>;
  activeStage: string;
  tab: number;
  draft: any;
  setDraft: React.Dispatch<any>;
  setBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  liveCompanyName: string;
  liveCompanyType: string;
  liveNib: string;
  liveNpwp: string;
  liveEstablishmentActNo: string;
  liveEstablishmentDate: string;
  liveNibDate: string;
  a: any;
  user: any;
  onChange: (a: any) => void;
  notify: (s: string) => void;
}) {
  async function save() {
    // FAP Stage is fully editable per specification
    setBusy(true);
    setError('');
    try {
      const stakeholdersChanged = JSON.stringify(draft.stakeholders) !== JSON.stringify(a.stakeholders);
      const hasPicData =
        draft.pic &&
        Object.values(draft.pic).some(
          v => v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-',
        );
      const cleanProjects = (draft.projects || []).filter(
        (p: any) =>
          p && Object.values(p).some((v: any) => v !== undefined && v !== null && String(v).trim() !== ''),
      );
      const safeProfileData = Object.fromEntries(
        Object.entries(draft).filter(
          ([k]) =>
            ![
              'proposal',
              'financialStatements',
              'legal',
              'stakeholders',
              'documentChecks',
              'approvalLogs',
              'signoffs',
              'ratios',
            ].includes(k),
        ),
      );
      if (
        !safeProfileData.latestDeedDate ||
        String(safeProfileData.latestDeedDate).trim() === '' ||
        String(safeProfileData.latestDeedDate) === 'null'
      ) {
        safeProfileData.latestDeedDate = null;
      }
      if (!safeProfileData.latestDeedNo || String(safeProfileData.latestDeedNo).trim() === '') {
        safeProfileData.latestDeedNo = null;
      }

      const resolvedName =
        liveCompanyName ||
        customerDraft?.companyName ||
        draft.customer?.companyName ||
        draft.companyName ||
        'New Company (Draft)';
      const customerPayload = {
        ...(draft.customer || {}),
        ...(customerDraft || {}),
        companyName: resolvedName,
        companyType: liveCompanyType || 'CORPORATE',
        nib: liveNib || customerDraft?.nib || draft.customer?.nib || '',
        npwp: liveNpwp || customerDraft?.npwp || draft.customer?.npwp || '',
        establishmentActNo:
          (
            liveEstablishmentActNo ||
            customerDraft?.establishmentActNo ||
            draft.customer?.establishmentActNo ||
            ''
          ).trim() || null,
        establishmentDate:
          liveEstablishmentDate ||
          customerDraft?.establishmentDate ||
          draft.customer?.establishmentDate ||
          null ||
          null,
        nibDate: liveNibDate || customerDraft?.nibDate || draft.customer?.nibDate || null || null,
      };

      const deedsWithStakeholders = (draft.legal?.deeds || []).map((d: any) => ({
        ...d,
        stakeholders:
          d.id === (draft.legal.selectedDeedId || draft.legal?.deeds?.[0]?.id)
            ? draft.stakeholders || d.stakeholders || []
            : d.stakeholders || [],
      }));
      const legalPayload = {
        ...(draft.legal || {}),
        deeds: deedsWithStakeholders,
      };
      const body =
        tab === 0
          ? {
              profile: {
                ...safeProfileData,
                companyName: resolvedName,
                customerStatus: customerCategory,
              },
              customer: customerPayload,
              customerCategory: customerCategory,
              ...(hasPicData ? {pic: draft.pic} : {}),
              projects: cleanProjects,
            }
          : tab === 2
            ? {
                projects: cleanProjects,
                bankReferences: draft.bankReferences,
                proposal: draft.proposal,
              }
            : tab === 3
              ? {
                  proposal: draft.proposal,
                }
              : tab === 4
                ? {
                    financialStatements: draft.financialStatements,
                  }
                : {
                    legal: legalPayload,
                    stakeholders: (draft.stakeholders || []).map(stakeholderForSave),
                  };

      const currentStage = activeStage || draft.stage || a.stage || 'FAP Stage';
      const v = await api(`/applications/${a.id}/page-${tab < 3 ? 1 : tab === 5 ? 'legal' : 2}`, 'PUT', {
        ...body,
        stage: currentStage,
      });
      const nextApp = {
        ...a,
        ...v,
        stage: currentStage,
        customer: {
          ...(a.customer || {}),
          ...(v?.customer || {}),
          ...customerPayload,
        },
      };
      setDraft((prev: any) => ({...prev, ...nextApp}));
      setCustomerDraft((prev: any) => ({...prev, ...customerPayload}));
      onChange(nextApp);
      notify('Changes saved successfully');
      try {
        const tabNamesList: Record<number, string> = {
          0: 'Customer & PIC',
          1: 'Stakeholders',
          2: 'Business & banks',
          3: 'Financing & units',
          4: 'Financial statements',
          5: 'Legal',
          6: 'Documents',
          8: 'Pre Analysis form',
        };
        const activeSectionName = tabNamesList[tab] || 'Application details';

        let diffResult = {changes: [] as any[], details: '', summaryTitle: ''};
        try {
          diffResult = computeApplicationDiff({
            tab,
            beforeApp: a,
            draft,
            customerPayload,
            customerDraft,
            resolvedName,
            customerCategory,
          });
        } catch (diffErr) {
          console.error('Diff computation error:', diffErr);
        }

        let changeSnippet = diffResult.details;
        if (!changeSnippet) {
          if (tab === 0)
            changeSnippet = `Saved company profile, contact details, NIB (${customerPayload.nib || 'N/A'}), and NPWP (${customerPayload.npwp || 'N/A'}).`;
          else if (tab === 1) changeSnippet = `Saved share ownership and stakeholder list.`;
          else if (tab === 2)
            changeSnippet = `Updated business operations, industry segment, and bank reference info.`;
          else if (tab === 3 || tab === 4)
            changeSnippet = `Updated financing value (${money(draft.proposal?.financingValue)}) and equipment unit terms.`;
          else if (tab === 5) changeSnippet = `Updated legal deeds and shareholder registers.`;
          else if (tab === 6) changeSnippet = `Updated document desk checklist records.`;
          else if (tab === 8)
            changeSnippet = `Saved Pre-Analysis evaluation, greyed-out checklist, and TinyMCE remarks.`;
        }

        recordSystemActivity({
          applicationId: a.id,
          fapNumber: a.fapNumber,
          companyName: resolvedName,
          section: activeSectionName,
          tabIndex: tab,
          actionType: 'UPDATE',
          title: diffResult.summaryTitle
            ? `${diffResult.summaryTitle} for ${resolvedName}`
            : `Updated ${activeSectionName} for ${resolvedName}`,
          details: changeSnippet,
          changes: diffResult.changes,
          actionBy: user?.name || 'System User',
          userRole: user?.role || 'User',
        });
      } catch (actErr) {
        console.error('Activity record error:', actErr);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save changes.');
    } finally {
      setBusy(false);
    }
  }

  return {save};
}
