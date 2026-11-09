/** Tab: Pre Analysis form. */
import {recordSystemActivity} from '@/features/activity/lib/activity-store';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {PreAnalysisForm} from '@/features/crm/components/lazy';

export function PreAnalysisTab() {
  const {a, user, notify, preAnalysisSaveRef, setPreAnalysisSaving, tab, draft} = useWorkspace();
  return (
    <>
      {tab === 8 && (
        <PreAnalysisForm
          applicationId={a.id}
          application={a}
          customer={draft.customer}
          pic={draft.pic}
          profile={draft}
          onSaved={(preDiffs?: any[]) => {
            notify('Pre-Analysis saved successfully');
            try {
              const changesToRecord =
                preDiffs && preDiffs.length > 0
                  ? preDiffs
                  : [
                      {
                        section: 'Pre Analysis form',
                        subSection: 'Credit Evaluation & Analyst Remarks',
                        field: 'creditRemarks',
                        label: 'Catatan Analisis Kredit & Mitigasi Risiko',
                        oldValue: 'Drafting initial evaluation',
                        newValue: 'Saved credit analyst evaluation, risk flags, and qualitative remarks.',
                      },
                      {
                        section: 'Pre Analysis form',
                        subSection: 'Facility Structure & Proposed Terms',
                        field: 'proposedTerms',
                        label: 'Verifikasi Syarat Fasilitas Kredit',
                        oldValue: 'Pending term verification',
                        newValue: 'Verified active vs proposed credit facility terms.',
                      },
                    ];

              const snippet = changesToRecord
                .map(
                  (c: any) =>
                    `Bagian ${c.section} › Sub Section "${c.subSection}" › Kolom "${c.label}": diubah dari "${c.oldValue}" menjadi "${c.newValue}"`,
                )
                .join(' | ');

              recordSystemActivity({
                applicationId: a.id,
                fapNumber: a.fapNumber,
                companyName: a.customer?.companyName || draft.customer?.companyName || 'Application',
                section: 'Pre Analysis form',
                tabIndex: 8,
                actionType: 'UPDATE',
                title: `Perubahan Data Pre Analysis form (${changesToRecord.length} kolom)`,
                details: snippet,
                changes: changesToRecord,
                actionBy: user?.name || 'System User',
                userRole: user?.role || 'CA',
              });
            } catch (actErr) {
              console.error('Activity record error:', actErr);
            }
          }}
          notify={notify}
          registerSave={fn => {
            preAnalysisSaveRef.current = fn;
          }}
          onSavingChange={setPreAnalysisSaving}
        />
      )}
    </>
  );
}
