/** Document Approval Audit Trail Modal matching the light theme mockup. */
import {ShieldCheck, X, Check, AlertCircle, Clock, Lock, Send} from 'lucide-react';
import {useEffect} from 'react';
import {createPortal} from 'react-dom';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

export function DocumentApprovalModal({
  row,
  isOpen,
  onClose,
  onConfirmSubmit,
  approvalBusy,
}: {
  row: ChecklistRow | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSubmit: (row: ChecklistRow) => void;
  approvalBusy?: string | null;
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
                      <div className="doc-v-top-info">
                        <span className="doc-v-role-title">
                          Level {levelNum}: {st.authority || st.authorityName || st.name || 'Approver'}
                        </span>
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

                      <div className="doc-v-user-meta">
                        {lastDecision ? (
                          <>
                            <span>👤 {lastDecision.by || 'Approver'}</span>
                            {lastDecision.decidedAt && (
                              <span style={{fontFamily: 'JetBrains Mono, monospace', fontSize: '11px'}}>
                                📅 {new Date(lastDecision.decidedAt).toLocaleString('en-US', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </span>
                            )}
                          </>
                        ) : isPending ? (
                          <span style={{color: '#d97706', fontWeight: 600}}>
                            ⏳ Awaiting approval action from the designated authority
                          </span>
                        ) : levelNum > 1 ? (
                          <span style={{color: '#94a3b8'}}>
                            Waiting for Level {levelNum - 1} approval
                          </span>
                        ) : (
                          <span style={{color: '#94a3b8'}}>
                            Waiting for document submission
                          </span>
                        )}
                      </div>

                      {lastDecision?.remarks && (
                        <div className="doc-v-remarks-quote">
                          &ldquo;{lastDecision.remarks}&rdquo;
                        </div>
                      )}
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
                disabled={!row.isAvailable || approvalBusy === row.chkId}
                title={!row.isAvailable ? 'Upload document file before submitting' : 'Submit for Approval'}
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
