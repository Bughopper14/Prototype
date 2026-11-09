import {ActivityPage, NibOcrModal} from '@/features/crm/components/lazy';
import {Documents} from '@/features/documents/components/Documents';
import {FapArchiveModal} from '@/features/fap/components/FapArchiveModal';
import {FapComparisonModal} from '@/features/fap/components/FapComparisonModal';
import {DeedReviewDialog} from '@/features/legal/components/DeedReviewDialog';
import {date} from '@/shared/lib/format';
import {ArrowLeft, CheckCheck, ShieldCheck} from 'lucide-react';

import {FormBottomActions} from '@/features/applications/components/workspace/FormBottomActions';
import {StageActionsBar} from '@/features/applications/components/workspace/StageActionsBar';
import {WorkspaceContext} from '@/features/applications/components/workspace/WorkspaceContext';
import {SaveLegalConfirmDialog} from '@/features/applications/components/workspace/dialogs/SaveLegalConfirmDialog';
import {StageTransitionDialog} from '@/features/applications/components/workspace/dialogs/StageTransitionDialog';
import {SubmitFapConfirmDialog} from '@/features/applications/components/workspace/dialogs/SubmitFapConfirmDialog';
import {ChevronStepper} from '@/features/applications/components/workspace/header/ChevronStepper';
import {DetailHeading} from '@/features/applications/components/workspace/header/DetailHeading';
import {DetailSummary} from '@/features/applications/components/workspace/header/DetailSummary';
import {DetailTabs} from '@/features/applications/components/workspace/header/DetailTabs';
import {BusinessBanksTab} from '@/features/applications/components/workspace/tabs/BusinessBanksTab';
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
                    [
                      'Company profile and primary point of contact',
                      'View ownership and stakeholder information. Edit these fields in Legal.',
                      'Business details, bank facilities, financing terms, and equipment units',
                      'Equipment, financing terms, and estimated monthly installment',
                      'Three years of financial performance. All figures in IDR.',
                      'Deeds, related parties, and ownership structure.',
                    ][tab]
                  }
                </p>
              </div>
              {!(tab === 1
                ? false
                : tab === 5
                  ? canLegal
                  : tab === 2
                    ? canFinance
                    : tab < 3
                      ? canEdit
                      : canFinance) && (
                <span className="subtle-chip">
                  <ShieldCheck size={14} />
                  Read only
                </span>
              )}
            </div>
            <div className="form-body">
              <CustomerTab />
              <StakeholdersTab />
              <BusinessBanksTab />
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
        {tab === 7 && (
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <ActivityPage
              activities={applicationActivities}
              readActivityIds={localReadIds}
              onOpen={handleOpenSectionFromActivity}
              onMarkRead={handleMarkAppActivityRead}
              onMarkAllRead={handleMarkAllAppActivitiesRead}
              title="Recent System Activity"
              subtitle={`Live record of application changes, form submissions, and section updates for ${a.fapNumber || liveCompanyName || 'this application'}.`}
              emptyMessage="No activity history for this application yet"
            />
            {a.signoffs && a.signoffs.length > 0 && (
              <section className="panel" style={{padding: '16px 20px', borderRadius: 10}}>
                <h4 style={{margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#0f172a'}}>
                  Signoff Records
                </h4>
                <div className="signoffs">
                  {a.signoffs.map((s: any) => (
                    <div key={s.role}>
                      <CheckCheck size={16} />
                      {s.role} signed off by {s.actor} · {date(s.signed_at)}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
        <StageActionsBar />
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
        <SubmitFapConfirmDialog />
        <StageTransitionDialog />
        <NibOcrModal
          open={nibOcrOpen}
          onClose={() => setNibOcrOpen(false)}
          onApply={handleApplyNibOcr}
          notify={notify}
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
