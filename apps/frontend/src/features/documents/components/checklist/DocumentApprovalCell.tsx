/** Spatial micro-stepper approval cell matching the approval workflow mockup. */
import {ShieldCheck, AlertCircle, Check, Send, X} from 'lucide-react';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

export function getShortRoleLabel(step: any, idx: number): string {
  if (step.isPicMarketing || step.is_pic_marketing) return 'PIC MKT';

  const auth = (step.authority || step.authorityName || step.code || '').trim();
  if (auth) {
    // Regex extract role code right before _APPROVE, _REVIEW, _VERIFY (e.g. CRM_FAP-FORM_CA_APPROVE -> CA)
    const m = auth.match(/_([A-Za-z0-9]+)_(?:APPROVE|APPROVAL|REVIEW|VERIFY)$/i) || auth.match(/_([A-Za-z0-9]+)$/i);
    if (m && m[1]) {
      const code = m[1].toUpperCase();
      if (code === 'LEGAL') return 'Legal';
      if (code === 'MANAGEMENT') return 'Mgmt';
      if (code === 'PIC' || code === 'MARKETING' || code === 'MKT') return 'PIC MKT';
      return code;
    }
  }

  // Fallback checks on authority / authorityName / step.name / step.code
  const text = `${step.authorityName || ''} ${step.authority || ''} ${step.name || ''} ${step.code || ''}`.toUpperCase();
  if (text.includes('PIC') && (text.includes('MARKETING') || text.includes('MKT'))) return 'PIC MKT';
  if (text.includes('PIC MARKETING') || text.includes('MARKETING PIC') || text.includes('PIC MKT')) return 'PIC MKT';
  if (text.includes('MARKETING') || text.includes('MKT')) return 'PIC MKT';
  if (text.includes('PIC')) return 'PIC MKT';
  if (text.includes('CA') || text.includes('CREDIT')) return 'CA';
  if (text.includes('BP') || text.includes('BUSINESS PARTNER')) return 'BP';
  if (text.includes('BS') || text.includes('BUSINESS SUPPORT')) return 'BS';
  if (text.includes('LEGAL')) return 'Legal';
  if (text.includes('MANAGEMENT') || text.includes('MGMT')) return 'Mgmt';
  if (text.includes('RISK')) return 'Risk';
  if (text.includes('BM') || text.includes('BRANCH')) return 'BM';
  if (text.includes('BOD') || text.includes('DIRECTOR')) return 'BOD';

  const levelNum = step.order ?? step.sortOrder ?? (idx + 1);
  return `L${levelNum}`;
}

export function DocumentApprovalCell({
  row,
  onRequestApproval,
  approvalBusy,
  onOpenModal,
  onConfirmSubmit,
}: {
  row: ChecklistRow;
  onRequestApproval?: (row: ChecklistRow) => void;
  approvalBusy?: string | null;
  onOpenModal: (row: ChecklistRow) => void;
  onConfirmSubmit: (row: ChecklistRow) => void;
}) {
  const approval = row.check?.approval;
  if (!approval) {
    return <span className="muted" style={{fontSize: '11.5px'}}>No approval needed</span>;
  }

  const steps = approval.steps || [];
  const totalSteps = steps.length;
  const approvedSteps = steps.filter((s: any) => s.status === 'APPROVED').length;
  const activeStepIndex = steps.findIndex((s: any) => s.status === 'PENDING');
  const isStepRejected = steps.some((s: any) => s.status === 'REJECTED' && !s.reopened);
  const isReopened = !!approval.reopened;
  const isRejected = !isReopened && (approval.state === 'REJECTED' || isStepRejected);
  const isAllApproved = !isRejected && !isReopened && (approval.state === 'APPROVED' || (totalSteps > 0 && approvedSteps === totalSteps));
  const isNotRequested = approval.state === 'NOT_STARTED';
  const needsSubmission = isNotRequested || isRejected || isReopened;
  // the user may ask (onRequestApproval is only given then) and the server accepts it (the document has a file and no round is running)
  const canSubmit = !!onRequestApproval && !!approval.canRequest;

  const activeStep = activeStepIndex >= 0 ? steps[activeStepIndex] : null;
  const activeLevel = activeStep?.order ?? activeStep?.sortOrder ?? (activeStepIndex >= 0 ? activeStepIndex + 1 : 1);

  // Fill percentage for the track line (Opsi B: halfway progress towards the active in-review step)
  const fillPct = isAllApproved
    ? 100
    : totalSteps > 1 && approvedSteps > 0
    ? Math.round(((approvedSteps - 0.5) / (totalSteps - 1)) * 100)
    : 0;

  // Dedicated View for REJECTED status (Matching Gambar 3)
  if (isRejected) {
    const rejectedStep = steps.find((s: any) => s.status === 'REJECTED');
    const rejectedIndex = rejectedStep ? steps.indexOf(rejectedStep) : -1;
    const rejectedRole = rejectedStep
      ? getShortRoleLabel(rejectedStep, rejectedIndex)
      : 'Approver';

    // Get rejection remarks from decisions or step/approval fields
    const decisions: any[] = rejectedStep?.decisions || [];
    const rejectDecision =
      decisions.slice().reverse().find((d: any) => d.decision === 'REJECTED') ||
      decisions[decisions.length - 1];
    const rawRemarks =
      rejectDecision?.remarks ||
      rejectedStep?.remarks ||
      rejectedStep?.comment ||
      approval.remarks ||
      approval.rejectionReason ||
      '';
    const rejectRemarks = rawRemarks.replace(/<[^>]*>/g, '').trim();

    // Red fill reaches the rejected step node
    const redFillPct =
      totalSteps > 1 && rejectedIndex >= 0
        ? Math.round((rejectedIndex / (totalSteps - 1)) * 100)
        : 0;

    // Green fill reaches halfway between the previous step and the rejected step
    const greenFillPct =
      totalSteps > 1 && rejectedIndex > 0
        ? Math.round(((rejectedIndex - 0.5) / (totalSteps - 1)) * 100)
        : 0;

    return (
      <div
        className="new-approval-card is-rejected"
        style={{marginTop: '6px'}}
      >
        {/* Top Header */}
        <div className="card-status-bar">
          <span className="badge-rejected-by">
            <X size={11} strokeWidth={3} /> Rejected by {rejectedRole}
          </span>
        </div>

        {/* Stepper Track with Progress */}
        {totalSteps > 0 && (
          <div
            className="micro-stepper-track"
            onClick={() => onOpenModal(row)}
            title="Click to view rejection details"
            style={{cursor: 'pointer'}}
          >
            <div className="track-line-bg" />
            {/* Red track up to the rejected node */}
            {redFillPct > 0 && (
              <div
                className="track-line-fill"
                style={{
                  width: `calc((100% - 26px) * ${redFillPct / 100})`,
                  background: '#ef4444',
                  zIndex: 2,
                }}
              />
            )}
            {/* Green track up to halfway before the rejected node */}
            {greenFillPct > 0 && (
              <div
                className="track-line-fill"
                style={{
                  width: `calc((100% - 26px) * ${greenFillPct / 100})`,
                  background: '#10b981',
                  zIndex: 3,
                }}
              />
            )}
            <div className="stepper-nodes" style={{position: 'relative', zIndex: 4}}>
              {steps.map((st: any, idx: number) => {
                const isStepApproved = st.status === 'APPROVED';
                const isThisStepRejected = st.status === 'REJECTED';
                const levelNum = st.order ?? st.sortOrder ?? (idx + 1);

                let cls = 'step-dot-wrap';
                if (isStepApproved) cls += ' done';
                else if (isThisStepRejected) cls += ' rejected';

                return (
                  <div key={st.id || idx} className={cls}>
                    <div className="step-circle">
                      {isStepApproved ? '✓' : isThisStepRejected ? '✕' : levelNum}
                    </div>
                    <span
                      className="step-lbl"
                      style={
                        isThisStepRejected
                          ? {color: '#dc2626', fontWeight: 700}
                          : isStepApproved
                          ? {color: '#059669', fontWeight: 600}
                          : undefined
                      }
                    >
                      {getShortRoleLabel(st, idx)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Remarks Callout if present */}
        {rejectRemarks && (
          <div className="doc-reject-callout">
            <span className="doc-reject-callout-icon">💬</span>
            <span className="doc-reject-callout-text">&ldquo;{rejectRemarks}&rdquo;</span>
          </div>
        )}

        {/* Resubmit for Approval Button */}
        <button
          type="button"
          className="btn-submit-for-approval btn-resubmit-danger"
          disabled={!canSubmit || approvalBusy === row.chkId}
          title={
            !approval.canRequest
              ? 'Upload document file before resubmitting'
              : 'Resubmit this document for approval'
          }
          onClick={e => {
            e.stopPropagation();
            onConfirmSubmit(row);
          }}
        >
          <Send size={12} />
          <span>Resubmit for Approval</span>
        </button>

        <button
          type="button"
          className="btn-view-pipeline"
          style={{marginTop: '2px', color: '#2563eb', borderColor: '#bfdbfe'}}
          onClick={() => onOpenModal(row)}
        >
          View Rejection Details &gt;
        </button>
      </div>
    );
  }

  if (needsSubmission) {
    return (
      <div
        className="new-approval-card not-requested"
        style={{marginTop: '6px'}}
      >
        <div className="card-status-bar">
          <span className="approval-stage-badge badge-needs">
            <ShieldCheck size={11} />{' '}
            {approval.again
              ? 'Needs approval again'
              : 'Needs approval'}
          </span>
          {totalSteps > 0 && (
            <span className="ratio-indicator">0 / {totalSteps} Completed</span>
          )}
        </div>

        {totalSteps > 0 && (
          <div
            className="micro-stepper-track"
            onClick={() => onOpenModal(row)}
            title="Click to view approval flow"
            style={{cursor: 'pointer'}}
          >
            <div className="track-line-bg" />
            <div className="track-line-fill" style={{width: '0%'}} />
            <div className="stepper-nodes">
              {steps.map((st: any, idx: number) => {
                const levelNum = st.order ?? st.sortOrder ?? (idx + 1);
                return (
                  <div key={st.id || idx} className="step-dot-wrap">
                    <div className="step-circle">{levelNum}</div>
                    <span className="step-lbl">{getShortRoleLabel(st, idx)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Submit for Approval Button */}
        <button
          type="button"
          className="btn-submit-for-approval"
          disabled={!canSubmit || approvalBusy === row.chkId}
          title={
            !approval.canRequest
              ? 'Upload document file before submitting'
              : 'Submit this document for approval'
          }
          onClick={e => {
            e.stopPropagation();
            onConfirmSubmit(row);
          }}
        >
          <Send size={12} />
          <span>{approval.again || isReopened ? 'Resubmit for Approval' : 'Submit for Approval'}</span>
        </button>

        <button
          type="button"
          className="btn-view-pipeline"
          style={{marginTop: '2px'}}
          onClick={() => onOpenModal(row)}
        >
          View Approval Flow &gt;
        </button>
      </div>
    );
  }

  // Active or approved
  return (
    <div
      className="new-approval-card"
      style={
        isAllApproved
          ? {borderColor: '#a7f3d0', background: '#f0fdf4', marginTop: '6px'}
          : {marginTop: '6px'}
      }
      onClick={() => onOpenModal(row)}
      title="Click to view full approval audit trail"
    >
      <div className="card-status-bar">
        {isAllApproved ? (
          <span className="approval-stage-badge badge-approved-all">
            <Check size={11} /> Fully Approved
          </span>
        ) : (
          <span className="approval-stage-badge badge-level2">
            ⚡ In Review (Level {activeLevel})
          </span>
        )}

        <span
          className="ratio-indicator"
          style={isAllApproved ? {color: '#047857'} : undefined}
        >
          {isAllApproved
            ? `${totalSteps} / ${totalSteps} Completed`
            : `${approvedSteps} / ${totalSteps || 1} Completed`}
        </span>
      </div>

      {/* Sleek Micro-Stepper Track */}
      {totalSteps > 0 && (
        <div className="micro-stepper-track">
          <div className="track-line-bg" />
          <div
            className="track-line-fill"
            style={{
              width: fillPct > 0 ? `calc((100% - 26px) * ${fillPct / 100})` : '0%',
              background: '#10b981',
            }}
          />
          <div className="stepper-nodes">
            {steps.map((st: any, idx: number) => {
              const isDone = st.status === 'APPROVED';
              const isActive = st.status === 'PENDING' || idx === activeStepIndex;
              const isStepRejected = st.status === 'REJECTED' && !st.reopened;
              const levelNum = st.order ?? st.sortOrder ?? (idx + 1);

              let cls = 'step-dot-wrap';
              if (isDone) cls += ' done';
              else if (isActive) cls += ' active';
              else if (isStepRejected) cls += ' rejected';

              return (
                <div key={st.id || idx} className={cls}>
                  <div className="step-circle">
                    {isDone ? '✓' : isStepRejected ? '✕' : levelNum}
                  </div>
                  <span className="step-lbl">{getShortRoleLabel(st, idx)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        className="btn-view-pipeline"
        style={
          isAllApproved
            ? {borderColor: '#a7f3d0', color: '#047857'}
            : undefined
        }
      >
        {isAllApproved
          ? '🔍 View Approval Certificate >'
          : '🔍 View Approval Flow >'}
      </button>
    </div>
  );
}
