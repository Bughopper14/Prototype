/** Document Approval Audit Trail Modal matching the light theme mockup with approver names and timestamps. */
import {ShieldCheck, X, Check, AlertCircle, Clock, Lock, Send} from 'lucide-react';
import {useEffect} from 'react';
import {createPortal} from 'react-dom';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

function formatRoleName(authority: string, code?: string): string {
  const str = (authority || code || '').toUpperCase();
  if (str.includes('_BP') || str.includes('BP_') || str.includes('BUSINESS_PARTNER')) {
    return 'Business Partner (BP)';
  }
  if (str.includes('_CA') || str.includes('CA_') || str.includes('CREDIT')) {
    return 'Credit Analyst (CA)';
  }
  if (str.includes('_LEGAL') || str.includes('LEGAL_')) {
    return 'Head of Legal (Parallel)';
  }
  if (str.includes('_FINANCE') || str.includes('FINANCE_')) {
    return 'Finance Department';
  }
  if (str.includes('_RISK') || str.includes('RISK_')) {
    return 'Risk Reviewer';
  }
  return str.replace(/^CRM_/, '').replace(/_APPROV(?:E|AL)$/, '').replace(/[_-]/g, ' ') || 'Approver';
}

function formatWibDate(dateVal?: string | Date): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} · ${hours}:${minutes} WIB`;
}

function cleanRemarks(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

export function DocumentApprovalModal({
  row,
  isOpen,
  onClose,
  onConfirmSubmit,
  approvalBusy,
  mayRequest,
}: {
  row: ChecklistRow | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSubmit: (row: ChecklistRow) => void;
  approvalBusy?: string | null;
  /** The user may ask for an approval at all. */
  mayRequest: boolean;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !row) return null;

  const approval = row.check?.approval;
  const steps: any[] = approval?.steps || [];
  const isNotRequested = approval?.state === 'NOT_REQUESTED';
  const isRejected = approval?.state === 'REJECTED';
  const isReopened = approval?.state === 'REOPENED';
  const canSubmit = isNotRequested || isRejected || isReopened;

  return createPortal(
    <div className="doc-modal-backdrop" onClick={onClose}>
      <div className="doc-modal-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="doc-dialog-header">
          <div className="doc-dialog-title">
            <ShieldCheck size={18} className="text-blue" />
            <span>Approval Flow: {row.name}</span>
          </div>
          <button type="button" className="doc-dialog-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="doc-dialog-body">
          <div className="doc-workflow-info-banner">
            <strong>Multi-Level Approval Rules:</strong> This document requires sequential verification and approval
            based on authority levels defined in the workflow before the application can proceed.
          </div>

          {/* Vertical Stepper Audit Trail */}
          <div className="doc-vertical-stepper">
            {steps.length > 0 ? (
              steps.map((st: any, idx: number) => {
                const isApproved = st.status === 'APPROVED';
                const isPending = st.status === 'PENDING';
                const isStepRejected = st.status === 'REJECTED';
                const decisions: any[] = st.decisions || [];
                const lastDecision = decisions[decisions.length - 1];
                const levelNum = st.order ?? st.sortOrder ?? (idx + 1);

                const roleTitle = formatRoleName(st.authority || st.authorityName, st.code);
                const hasActed = isApproved || isStepRejected;
                const approverName = hasActed
                  ? (lastDecision?.by || st.completedBy || st.approvedBy || st.rejectedBy || st.actor || (isApproved ? 'Authorized Approver' : null))
                  : null;
                const decisionDate = hasActed
                  ? (lastDecision?.decidedAt
                      ? formatWibDate(lastDecision.decidedAt)
                      : st.completedAt
                        ? formatWibDate(st.completedAt)
                        : '')
                  : '';

                // Dynamically resolve previous distinct level: parallel steps with the same levelNum wait for the previous level
                const prevLevelSteps = steps.filter((s: any, i: number) => {
                  const lvl = s.order ?? s.sortOrder ?? (i + 1);
                  return lvl < levelNum;
                });
                const prevStep = prevLevelSteps.length > 0 ? prevLevelSteps[prevLevelSteps.length - 1] : null;
                const prevLevelNum = prevStep ? (prevStep.order ?? prevStep.sortOrder ?? 1) : null;
                const allPrevLevelSteps = prevLevelNum
                  ? prevLevelSteps.filter((s: any, i: number) => (s.order ?? s.sortOrder ?? (i + 1)) === prevLevelNum)
                  : [];
                const prevRoles = allPrevLevelSteps
                  .map((s: any) => formatRoleName(s.authority || s.authorityName, s.code))
                  .filter(Boolean)
                  .join(' & ');

                const waitingMessage = prevStep
                  ? `Waiting for Level ${prevLevelNum} (${prevRoles || formatRoleName(prevStep.authority || prevStep.authorityName, prevStep.code)}) approval`
                  : 'Waiting for document submission';

                let rowClass = 'doc-v-step-row';
                if (isApproved) rowClass += ' done';
                else if (isPending) rowClass += ' active';
                else if (isStepRejected) rowClass += ' rejected';

                return (
                  <div key={st.id || idx} className={rowClass}>
                    <div className="doc-v-step-circle">
                      {isApproved ? <Check size={16} /> : isStepRejected ? <AlertCircle size={16} /> : levelNum}
                    </div>

                    <div className="doc-v-step-content">
                      <div className="doc-v-top-info" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                          <span className="doc-v-role-title">
                            Level {levelNum}: {roleTitle}
                          </span>
                          <span
                            style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '11px',
                              background: '#eff6ff',
                              color: '#2563eb',
                              padding: '2px 8px',
                              borderRadius: 4,
                              border: '1px solid #dbeafe',
                              fontWeight: 600,
                            }}
                          >
                            {st.authority || st.authorityName || st.code || 'APPROVE'}
                          </span>
                        </div>
                        {isApproved ? (
                          <span className="doc-v-pill-status pill-approved">APPROVED</span>
                        ) : isPending ? (
                          <span className="doc-v-pill-status pill-review">IN REVIEW</span>
                        ) : isStepRejected ? (
                          <span className="doc-v-pill-status pill-rejected">REJECTED / REVISION</span>
                        ) : (
                          <span className="doc-v-pill-status pill-waiting">WAITING FOR TURN</span>
                        )}
                      </div>

                      <div className="doc-v-user-meta" style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: '12px', color: '#475569', marginTop: 4, flexWrap: 'wrap'}}>
                        {hasActed && approverName && (
                          <span style={{fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4}}>
                            👤 {approverName}
                          </span>
                        )}
                        {hasActed && decisionDate && (
                          <span style={{color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4}}>
                            🗓️ {decisionDate}
                          </span>
                        )}
                        {!hasActed && isPending && (
                          <span style={{color: '#2563eb', fontWeight: 500, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: 4}}>
                            ⏳ Pending review by authorized {roleTitle}
                          </span>
                        )}
                        {!hasActed && !isPending && (
                          <span style={{color: '#64748b', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: 4}}>
                            ⏳ {waitingMessage}
                          </span>
                        )}
                      </div>

                      {cleanRemarks(lastDecision?.remarks) ? (
                        <div className="doc-v-remarks-quote">
                          &ldquo;{cleanRemarks(lastDecision.remarks)}&rdquo;
                        </div>
                      ) : isStepRejected ? (
                        <div style={{marginTop: 6, fontSize: '12px', color: '#dc2626', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0'}}>
                          ✕ Revision request sent to Business Partner
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{textAlign: 'center', padding: '24px 16px', color: '#64748b'}}>
                <Clock size={24} style={{margin: '0 auto 8px', color: '#94a3b8'}} />
                <p>No approval stages have been configured for this document.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="doc-dialog-footer">
          <span style={{fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px'}}>
            <Lock size={12} /> Complete approval history is recorded in the audit log.
          </span>

          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            {canSubmit && (
              <button
                type="button"
                className="button primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '34px',
                  padding: '0 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
                disabled={!mayRequest || !approval?.canRequest || approvalBusy === row.chkId}
                title={!approval?.canRequest ? 'Upload document file before submitting' : 'Submit for Approval'}
                onClick={() => {
                  onClose();
                  onConfirmSubmit(row);
                }}
              >
                <Send size={13} />
                <span>{isRejected || isReopened ? 'Resubmit for Approval' : 'Submit for Approval'}</span>
              </button>
            )}

            <button type="button" className="button" style={{height: '34px', padding: '0 16px'}} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
