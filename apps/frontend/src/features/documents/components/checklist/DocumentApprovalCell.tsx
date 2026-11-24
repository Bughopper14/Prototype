/** Spatial micro-stepper approval cell matching the approval workflow mockup. */
import {ShieldCheck, AlertCircle, Check, Send} from 'lucide-react';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

export function getShortRoleLabel(step: any, idx: number): string {
  const auth = (step.authority || step.authorityName || '').trim();
  if (auth) {
    // Regex extract role code right before _APPROVE, _REVIEW, _VERIFY (e.g. CRM_FAP-FORM_CA_APPROVE -> CA)
    const m = auth.match(/_([A-Za-z0-9]+)_(?:APPROVE|REVIEW|VERIFY)$/i) || auth.match(/_([A-Za-z0-9]+)$/i);
    if (m && m[1]) {
      const code = m[1].toUpperCase();
      if (code === 'LEGAL') return 'Legal';
      if (code === 'MANAGEMENT') return 'Mgmt';
      return code;
    }
  }

  // Fallback checks on authority / authorityName only (avoid step.name which has full workflow title)
  const text = `${step.authorityName || ''} ${step.authority || ''}`.toUpperCase();
  if (text.includes('CA') || text.includes('CREDIT')) return 'CA';
  if (text.includes('BP') || text.includes('BUSINESS PARTNER')) return 'BP';
  if (text.includes('BS') || text.includes('BUSINESS SUPPORT')) return 'BS';
  if (text.includes('LEGAL')) return 'Legal';
  if (text.includes('RISK')) return 'Risk';
  if (text.includes('BM') || text.includes('BRANCH')) return 'BM';
  if (text.includes('BOD') || text.includes('DIRECTOR')) return 'BOD';

  const levelNum = step.order ?? step.sortOrder ?? (idx + 1);
  return `L${levelNum}`;
}

export function DocumentApprovalCell({
  row,
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
  const isAllApproved = approval.state === 'APPROVED' || (totalSteps > 0 && approvedSteps === totalSteps);
  const isRejected = approval.state === 'REJECTED';
  const isReopened = approval.state === 'REOPENED';
  const isNotRequested = approval.state === 'NOT_REQUESTED';
  const needsSubmission = isNotRequested || isRejected || isReopened;

  const activeStep = activeStepIndex >= 0 ? steps[activeStepIndex] : null;
  const activeLevel = activeStep?.order ?? activeStep?.sortOrder ?? (activeStepIndex >= 0 ? activeStepIndex + 1 : 1);

  // Fill percentage for the track line
  const fillPct = isAllApproved
    ? 100
    : totalSteps > 0
    ? Math.round((approvedSteps / totalSteps) * 100)
    : 0;

  if (needsSubmission) {
    return (
      <div
        className="new-approval-card not-requested"
        style={{marginTop: '6px'}}
      >
        <div className="card-status-bar">
          <span className={`approval-stage-badge ${isRejected ? 'badge-danger' : 'badge-needs'}`}>
            <ShieldCheck size={11} />{' '}
            {isRejected
              ? 'Perlu Revisi Dokumen'
              : approval.again
              ? 'Needs approval again'
              : 'Needs approval'}
          </span>
          {totalSteps > 0 && (
            <span className="ratio-indicator">0 / {totalSteps} Selesai</span>
          )}
        </div>

        {totalSteps > 0 && (
          <div
            className="micro-stepper-track"
            onClick={() => onOpenModal(row)}
            title="Klik untuk melihat alur persetujuan"
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
          disabled={!row.isAvailable || approvalBusy === row.chkId}
          title={
            !row.isAvailable
              ? 'Upload file dokumen terlebih dahulu sebelum submit'
              : 'Submit dokumen ini untuk persetujuan'
          }
          onClick={e => {
            e.stopPropagation();
            onConfirmSubmit(row);
          }}
        >
          <Send size={12} />
          <span>{approval.again || isRejected || isReopened ? 'Resubmit for Approval' : 'Submit for Approval'}</span>
        </button>

        <button
          type="button"
          className="btn-view-pipeline"
          style={{marginTop: '2px'}}
          onClick={() => onOpenModal(row)}
        >
          Lihat Alur Persetujuan &gt;
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
      title="Klik untuk membuka riwayat persetujuan lengkap"
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
            ? `${totalSteps} / ${totalSteps} Lengkap`
            : `${approvedSteps} / ${totalSteps || 1} Selesai`}
        </span>
      </div>

      {/* Sleek Micro-Stepper Track */}
      {totalSteps > 0 && (
        <div className="micro-stepper-track">
          <div className="track-line-bg" />
          <div
            className="track-line-fill"
            style={{
              width: `${fillPct}%`,
              background: '#10b981',
            }}
          />
          <div className="stepper-nodes">
            {steps.map((st: any, idx: number) => {
              const isDone = st.status === 'APPROVED';
              const isActive = st.status === 'PENDING' || idx === activeStepIndex;
              const isStepRejected = st.status === 'REJECTED';
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
          ? '🔍 Lihat Sertifikat Approval >'
          : '🔍 Lihat Alur Persetujuan >'}
      </button>
    </div>
  );
}
