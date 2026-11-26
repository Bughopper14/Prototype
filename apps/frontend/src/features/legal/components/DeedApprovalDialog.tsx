import {api} from '@/shared/lib/api';
import {DeedApprovalActions} from '@/features/legal/components/deed-approval/DeedApprovalActions';
import {DeedApprovalHistory} from '@/features/legal/components/deed-approval/DeedApprovalHistory';
import {DeedApprovalComments} from '@/features/legal/components/deed-approval/DeedApprovalComments';
import {DeedApprovalShareholders} from '@/features/legal/components/deed-approval/DeedApprovalShareholders';
import {DeedApprovalDocument} from '@/features/legal/components/deed-approval/DeedApprovalDocument';
import {DeedApprovalSummary} from '@/features/legal/components/deed-approval/DeedApprovalSummary';
import {DeedApprovalNotices} from '@/features/legal/components/deed-approval/DeedApprovalNotices';
import {DeedApprovalHeader} from '@/features/legal/components/deed-approval/DeedApprovalHeader';
import {useMasterData} from '@/shared/master-data';
import {
  DEED_EDIT_AUTHORITY,
  DEED_SECTION,
  label,
  deedApprovalStatus,
  stakeholderFields,
} from '@liugong/shared';
import {checkIsAdmin, hasAuthority} from '@/shared/lib/auth';
import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {DeedComparison} from './DeedComparison';
export function DeedApprovalDialog({
  application,
  user,
  deedId,
  onClose,
  onEdit,
  hidden = false,
  onUpdated,
}: {
  /** Kept mounted but not shown while the deed editor is open on top of it. */
  hidden?: boolean;
  application: any;
  user: any;
  deedId: string;
  onClose: () => void;
  /** Close this dialog and open the deed (or its stakeholders) in the Legal editor. */
  onEdit?: (what: 'deed' | 'stakeholders') => void;
  onUpdated: (a: any) => void;
}) {
  const master = useMasterData();
  const deed = application.legal?.deeds?.find((d: any) => d.id === deedId),
    status = deedApprovalStatus(deed),
    checklist = application.documentChecks.find((d: any) => d.documentCode === 'DEED'),
    files = checklist?.files || [];
  const [documentId, setDocumentId] = useState(deed?.approval?.documentId || ''),
    [url, setUrl] = useState(''),
    [error, setError] = useState(''),
    [comments, setComments] = useState(''),
    [closedRows, setClosedRows] = useState<Record<number, boolean>>({}),
    [busy, setBusy] = useState(false);
  const holders: any[] = deed?.stakeholders || [];
  // Every stored field of a stakeholder that has a value, labelled the way the stakeholder form labels it.
  const detailRows = (r: any) =>
    stakeholderFields
      .map(f => {
        const raw = r[f.key];
        if (raw === undefined || raw === null || raw === '') return null;
        const shown = f.optionLabels?.[raw] ?? (f.type === 'select' ? label(String(raw)) : String(raw));
        const money = ['depositedCapital', 'primaryCapital'].includes(f.key) && !Number.isNaN(Number(raw));
        return [f.label, money ? Number(raw).toLocaleString('id-ID') : shown] as const;
      })
      .filter(Boolean) as (readonly [string, string])[];
  // One deed, one approval: when the workflow has an approval for the deed section, the approval of that section decides (the ApprovalSlot on the Legal tab), so this old Submit / Approve / Reject / Remarks is not offered.
  const masterApproves = ((application.approvalPlaces || []) as any[]).some(p => p.scope === 'SECTION' && p.sectionCode === DEED_SECTION);
  // Who gets the buttons of the old flow (a workflow without an approval on the deed section)
  const canSubmit =
      (checkIsAdmin(user) || hasAuthority(user, DEED_EDIT_AUTHORITY)) && ['NOT_STARTED', 'REJECTED'].includes(status),
    canApprove =
      (checkIsAdmin(user) ||
        hasAuthority(user, 'CRM_DEED-REVIEW_LEGAL_APPROVE') ||
        hasAuthority(user, 'CRM_LEGAL_EDIT') ||
        hasAuthority(user, 'CRM_DEED-REVIEW_BP_APPROVE') ||
        hasAuthority(user, 'CRM_DEED-REVIEW_BS_APPROVE')) &&
      status === 'IN_APPROVAL';
  // The approval of this deed in the workflow is decided right here: the steps of its round that this person may decide (the same ones the Legal tab offered a "Review & decide" button for)
  const round = ((application.approval?.current || []) as any[]).find(c => c.scope === 'SECTION' && c.sectionCode === DEED_SECTION && c.subjectId === deedId);
  const actable: any[] = masterApproves ? (round?.steps || []).filter((s: any) => s.canAct) : [];
  const canDecide = actable.length > 0;
  useEffect(() => {
    let live = true;
    setUrl('');
    if (documentId)
      api(`/files/${documentId}/url`)
        .then(v => {
          if (live) setUrl(v.url);
        })
        .catch(e => {
          if (live) setError(e.message);
        });
    return () => {
      live = false;
    };
  }, [documentId]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [busy, onClose]);
  async function action(action: string) {
    setBusy(true);
    setError('');
    try {
      const a = await api(`/applications/${application.id}/deeds/${deedId}/approval`, 'POST', {
        action,
        revision: deed?.approval?.revision || 1,
        ...(action === 'SUBMIT' ? {documentId} : {}),
        comments,
      });
      onUpdated(a);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function decide(decision: 'APPROVED' | 'REJECTED') {
    setBusy(true);
    setError('');
    try {
      for (const step of actable)
        await api(`/applications/${application.id}/approvals/${step.id}/decision`, 'POST', {decision, remarks: comments.trim() || undefined});
      onUpdated(await api(`/applications/${application.id}`));
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  // The editor opened from here borrows this dialog's backdrop (see .deed-edit-over-approval in the CSS)
  useEffect(() => {
    if (!hidden) return;
    document.body.classList.add('deed-edit-over-approval');
    return () => document.body.classList.remove('deed-edit-over-approval');
  }, [hidden]);
  if (!deed) return null;
  return createPortal(
    <div className={'modal-scrim deed-approval-scrim' + (hidden ? ' is-hidden' : '')}>
      <section className="modal deed-approval-modal" role="dialog" aria-modal="true" aria-label="Deed review">
        <DeedApprovalHeader application={application} deed={deed} busy={busy} onClose={onClose} />
        <div className="modal-body">
          <DeedApprovalNotices deed={deed} status={status} />
          <DeedApprovalSummary deed={deed} master={master} />
          {deed.type === 'amendment' && <DeedComparison legal={application.legal} deed={deed} />}
          <DeedApprovalDocument
            application={application}
            canSubmit={canSubmit}
            busy={busy}
            documentId={documentId}
            setDocumentId={setDocumentId}
            url={url}
            files={files}
            setError={setError}
            setBusy={setBusy}
            checklist={checklist}
            onUpdated={onUpdated}
          />
          <DeedApprovalShareholders
            closedRows={closedRows}
            setClosedRows={setClosedRows}
            detailRows={detailRows}
            holders={holders}
          />
          <DeedApprovalComments
            canApprove={canApprove || canDecide}
            withRemarks={!masterApproves}
            error={error}
            comments={comments}
            setComments={setComments}
          />
          <DeedApprovalHistory deed={deed} />
        </div>
        <DeedApprovalActions
          status={status}
          canSubmit={canSubmit}
          canApprove={canApprove}
          canDecide={canDecide}
          onDecide={decide}
          legacyApproval={!masterApproves}
          busy={busy}
          comments={comments}
          documentId={documentId}
          url={url}
          onClose={onClose}
          onEdit={onEdit}
          action={action}
        />
      </section>
    </div>,
    document.body,
  );
}
