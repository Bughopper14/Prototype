import {ActivityPage, NibOcrModal} from '@/features/crm/components/lazy';
import {Documents} from '@/features/documents/components/Documents';
import {DocumentChecklistTab} from '@/features/documents/components/checklist/DocumentChecklistTab';
import {FapArchiveModal} from '@/features/fap/components/FapArchiveModal';
import {FapComparisonModal} from '@/features/fap/components/FapComparisonModal';
import {DeedReviewDialog} from '@/features/legal/components/DeedReviewDialog';
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

export function ApplicationWorkspace(props: ApplicationWorkspaceProps) {
  const state = useApplicationWorkspace(props);
  const {
    a,
    user,
    onBack,
    onChange,
    notify,
    nibOcrOpen,
    setNibOcrOpen,
    handleApplyNibOcr,
    activeStage,
    reviewDeedId,
    setReviewDeedId,
    setEditRequest,
    reviewHidden,
    setReviewHidden,
    tab,
    busy,
    error,
    fapComparisonModal,
    setFapComparisonModal,
    archiveModalOpen,
    setArchiveModalOpen,
    archivesList,
    loadingArchives,
    selectedArchiveIdx,
    setSelectedArchiveIdx,
    handleApproveDocument,
    handleApproveFapChangesInDetail,
    handleCorrectFapDataInDetail,
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
            onApproveDocument={handleApproveDocument}
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
        {reviewDeedId && (
          <DeedReviewDialog
            application={a}
            user={user}
            deedId={reviewDeedId}
            hidden={reviewHidden}
            onClose={() => setReviewDeedId(null)}
            onEdit={what => {
              setEditRequest({id: reviewDeedId, what});
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
          applicationId={a?.id}
          onDocumentUploaded={onChange}
        />
        {fapComparisonModal && (
          <FapComparisonModal
            comparison={fapComparisonModal}
            onClose={() => setFapComparisonModal(null)}
            onApprove={handleApproveFapChangesInDetail}
            onCorrect={handleCorrectFapDataInDetail}
            busy={busy}
          />
        )}
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
