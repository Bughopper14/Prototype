/** Spatial micro-stepper approval cell matching the approval workflow mockup. */
import {ShieldCheck, AlertCircle, Check, Send} from 'lucide-react';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

export function getShortRoleLabel(step: any, idx: number): string {
  const text = `${step.authorityName || ''} ${step.authority || ''} ${step.name || ''}`.toUpperCase();
  if (text.includes('BUSINESS PARTNER') || text.includes('BP_APPROVE') || text.includes('BP')) return 'BP';
  if (text.includes('CREDIT') || text.includes('CA_APPROVE') || text.includes('ANALYST')) return 'Credit';
  if (text.includes('LEGAL') || text.includes('LEGAL_APPROVE')) return 'Legal';
  if (text.includes('RISK')) return 'Risk';
  if (text.includes('BRANCH') || text.includes('BM')) return 'BM';
  if (text.includes('DIRECTOR') || text.includes('BOD')) return 'Director';
  return `L${idx + 1}`;
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
              {steps.map((st: any, idx: number) => (
                <div key={st.id || idx} className="step-dot-wrap">
                  <div className="step-circle">{idx + 1}</div>
                  <span className="step-lbl">{getShortRoleLabel(st, idx)}</span>
                </div>
              ))}
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
            ⚡ In Review (Level {activeStepIndex >= 0 ? activeStepIndex + 1 : 1})
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

              let cls = 'step-dot-wrap';
              if (isDone) cls += ' done';
              else if (isActive) cls += ' active';
              else if (isStepRejected) cls += ' rejected';

              return (
                <div key={st.id || idx} className={cls}>
                  <div className="step-circle">
                    {isDone ? '✓' : isStepRejected ? '✕' : idx + 1}
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
