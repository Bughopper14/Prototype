import {ActivityPage, NibOcrModal, NpwpOcrModal} from '@/features/crm/components/lazy';
import {Documents} from '@/features/documents/components/Documents';
import {DocumentChecklistTab} from '@/features/documents/components/checklist/DocumentChecklistTab';
import {FapArchiveModal} from '@/features/fap/components/FapArchiveModal';
import {DeedApprovalDialog} from '@/features/legal/components/DeedApprovalDialog';
import {ArrowLeft, ShieldCheck} from 'lucide-react';

import {FormBottomActions} from '@/features/applications/components/workspace/FormBottomActions';
import {ApprovalPanel} from '@/features/applications/components/workspace/ApprovalPanel';
import {ApproverView} from '@/features/applications/components/workspace/ApproverView';
import {WorkspaceContext} from '@/features/applications/components/workspace/WorkspaceContext';
import {SaveLegalConfirmDialog} from '@/features/applications/components/workspace/dialogs/SaveLegalConfirmDialog';
import {ApprovalDecisionDialog, SubmitStageDialog} from '@/features/applications/components/workspace/dialogs/ApprovalDialogs';
import {ChevronStepper} from '@/features/applications/components/workspace/header/ChevronStepper';
import {DetailHeading} from '@/features/applications/components/workspace/header/DetailHeading';
import {DetailSummary} from '@/features/applications/components/workspace/header/DetailSummary';
import {DetailTabs} from '@/features/applications/components/workspace/header/DetailTabs';
import {CustomerTab} from '@/features/applications/components/workspace/tabs/CustomerTab';
import {FinancialStatementsTab} from '@/features/applications/components/workspace/tabs/FinancialStatementsTab';
import {LegalTab} from '@/features/applications/components/workspace/tabs/LegalTab';
import {PreAnalysisTab} from '@/features/applications/components/workspace/tabs/PreAnalysisTab';
import {StakeholdersTab} from '@/features/applications/components/workspace/tabs/StakeholdersTab';
import {
  useApplicationWorkspace,
  type ApplicationWorkspaceProps,
} from '@/features/applications/hooks/useApplicationWorkspace';
import {screenOf} from '@/features/applications/lib/workspace/stage';
import {SCREEN} from '@/shared/master-data';

export function ApplicationWorkspace(props: ApplicationWorkspaceProps) {
  const state = useApplicationWorkspace(props);
  const {
    a,
    user,
    onBack,
    onChange,
    refreshDocuments,
    notify,
    nibOcrOpen,
    setNibOcrOpen,
    handleApplyNibOcr,
    npwpOcrOpen,
    setNpwpOcrOpen,
    handleApplyNpwpOcr,
    activeStage,
    approvalDeedId,
    setApprovalDeedId,
    setEditRequest,
    reviewHidden,
    setReviewHidden,
    tab,
    busy,
    error,
    archiveModalOpen,
    setArchiveModalOpen,
    archivesList,
    loadingArchives,
    selectedArchiveIdx,
    setSelectedArchiveIdx,
    liveCompanyName,
    tabs,
    isFapLocked,
    canLegal,
    canEdit,
    canFinance,
    localReadIds,
    applicationActivities,
    handleMarkAppActivityRead,
    handleMarkAllAppActivitiesRead,
    handleOpenSectionFromActivity,
  } = state;
  return (
    <WorkspaceContext.Provider value={state}>
      <>
        <button className="text-link back-link" onClick={onBack}>
          <ArrowLeft size={15} />
          Back to workspace
        </button>
        <DetailHeading />
        <ChevronStepper />
        <DetailSummary />
        <DetailTabs />
        {error && <div className="error">{error}</div>}
        {tab < 6 && (
          <section className="panel form-panel">
            <div className="panel-head">
              <div>
                <h2>{tabs[tab]}</h2>
                <p>
                  {
                    (
                      {
                        0: 'Company profile, FAP physical form, and application details',
                        1: 'View ownership and stakeholder information. Edit these fields in Legal.',
                        4: 'Three years of financial performance. All figures in IDR.',
                        5: 'Deeds, related parties, and ownership structure.',
                      } as Record<number, string>
                    )[tab]
                  }
                </p>
              </div>
              {!(tab === 1 ? false : tab === 5 ? canLegal : tab === 0 ? canEdit : canFinance) && (
                <span className="subtle-chip">
                  <ShieldCheck size={14} />
                  Read only
                </span>
              )}
            </div>
            <div className="form-body">
              <CustomerTab />
              <StakeholdersTab />
              <FinancialStatementsTab />
              <LegalTab />
            </div>
            <FormBottomActions />
          </section>
        )}
        <PreAnalysisTab />
        {tab === 6 && (
          <Documents
            a={a}
            user={user}
            onChange={onChange}
            notify={notify}
            filterStage={activeStage}
            onSubmitStage={() => {
              const wfStages: any[] = a.workflow?.stages || [];
              const matched =
                wfStages.find(s => screenOf(s) === activeStage) ??
                wfStages.find(s => screenOf(s) === SCREEN.FAP) ??
                wfStages[0];
              state.setSubmitStageCode(matched?.code ?? null);
            }}
            onOpenChecklist={() => state.setTab(9)}
            isFapLocked={isFapLocked}
          />
        )}
        {tab === 11 && <ApprovalPanel />}
        {tab === 10 && <ApproverView />}
        {tab === 9 && (
          <DocumentChecklistTab
            application={a}
            draft={state.draft}
            user={user}
            onChange={onChange}
            notify={notify}
            activeScreen={activeStage}
            onSelectStage={stageCode => {
              const wf = (a.workflow?.stages || []).find((s: any) => s.code === stageCode);
              if (wf) state.setActiveStage(screenOf(wf));
            }}
          />
        )}
        {tab === 7 && (
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <ActivityPage
              activities={applicationActivities}
              readActivityIds={localReadIds}
              onOpen={handleOpenSectionFromActivity}
              onMarkRead={handleMarkAppActivityRead}
              onMarkAllRead={handleMarkAllAppActivitiesRead}
              title="Recent System Activity"
              subtitle={`Live record of application changes, form submissions, and section updates for ${liveCompanyName || 'this application'}.`}
              emptyMessage="No activity history for this application yet"
            />
          </div>
        )}
        {approvalDeedId && (
          <DeedApprovalDialog
            application={a}
            user={user}
            deedId={approvalDeedId}
            hidden={reviewHidden}
            onClose={() => setApprovalDeedId(null)}
            onEdit={what => {
              setEditRequest({id: approvalDeedId, what});
              setReviewHidden(true);
            }}
            onUpdated={onChange}
          />
        )}
        <SaveLegalConfirmDialog />
        <ApprovalDecisionDialog />
        <SubmitStageDialog />
        <NibOcrModal
          open={nibOcrOpen}
          onClose={() => setNibOcrOpen(false)}
          onApply={handleApplyNibOcr}
          notify={notify}
          applicationId={a?.isNew ? undefined : a?.id}
          onDocumentUploaded={refreshDocuments}
          isApproved={a?.documentChecks?.some((d: any) => d.documentCode === 'NIB' && d.approvalStatus === 'APPROVED')}
        />
        <NpwpOcrModal
          open={npwpOcrOpen}
          onClose={() => setNpwpOcrOpen(false)}
          onApply={handleApplyNpwpOcr}
          notify={notify}
          applicationId={a?.isNew ? undefined : a?.id}
          onDocumentUploaded={refreshDocuments}
          isApproved={a?.documentChecks?.some((d: any) => (d.documentCode === 'NPWPUSAHA' || d.documentCode === 'NPWP') && d.approvalStatus === 'APPROVED')}
        />
        {archiveModalOpen && (
          <FapArchiveModal
            application={a}
            archives={archivesList}
            loading={loadingArchives}
            selectedIndex={selectedArchiveIdx}
            onSelectIndex={setSelectedArchiveIdx}
            onClose={() => setArchiveModalOpen(false)}
            notify={notify}
          />
        )}
      </>
    </WorkspaceContext.Provider>
  );
}
