import {api} from '@/shared/lib/api';
import {ReviewActions} from '@/features/legal/components/deed-review/ReviewActions';
import {ReviewHistory} from '@/features/legal/components/deed-review/ReviewHistory';
import {ReviewComments} from '@/features/legal/components/deed-review/ReviewComments';
import {ReviewShareholders} from '@/features/legal/components/deed-review/ReviewShareholders';
import {ReviewDocument} from '@/features/legal/components/deed-review/ReviewDocument';
import {ReviewSummary} from '@/features/legal/components/deed-review/ReviewSummary';
import {ReviewNotices} from '@/features/legal/components/deed-review/ReviewNotices';
import {ReviewHeader} from '@/features/legal/components/deed-review/ReviewHeader';
import {useMasterData} from '@/shared/master-data';
import {
  DEED_EDIT_AUTHORITY,
  label,
  reviewStatus,
  stakeholderFields,
} from '@liugong/shared';
import {checkIsAdmin, hasAuthority} from '@/shared/lib/auth';
import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {DeedComparison} from './DeedComparison';
export function DeedReviewDialog({
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
    status = reviewStatus(deed),
    checklist = application.documentChecks.find((d: any) => d.documentCode === 'DEED'),
    files = checklist?.files || [];
  const [documentId, setDocumentId] = useState(deed?.review?.documentId || ''),
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
  const masterApproves = ((application.approvalPlaces || []) as any[]).some(p => p.scope === 'SECTION' && p.sectionCode === 'LEGAL-DEEDS-AMENDMENTS');
  const canSubmit =
      hasAuthority(user, DEED_EDIT_AUTHORITY) && ['DRAFT', 'NEEDS_REVISION'].includes(status),
    canApprove = checkIsAdmin(user) && status === 'PENDING';
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
      const a = await api(`/applications/${application.id}/deeds/${deedId}/review`, 'POST', {
        action,
        revision: deed?.review?.revision || 1,
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
  // The editor opened from here borrows this dialog's backdrop (see .deed-edit-over-review in the CSS)
  useEffect(() => {
    if (!hidden) return;
    document.body.classList.add('deed-edit-over-review');
    return () => document.body.classList.remove('deed-edit-over-review');
  }, [hidden]);
  if (!deed) return null;
  return createPortal(
    <div className={'modal-scrim deed-review-scrim' + (hidden ? ' is-hidden' : '')}>
      <section className="modal deed-review-modal" role="dialog" aria-modal="true" aria-label="Deed review">
        <ReviewHeader application={application} deed={deed} busy={busy} onClose={onClose} />
        <div className="modal-body">
          <ReviewNotices deed={deed} status={status} />
          <ReviewSummary deed={deed} master={master} />
          {deed.type === 'amendment' && <DeedComparison legal={application.legal} deed={deed} />}
          <ReviewDocument
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
          <ReviewShareholders
            closedRows={closedRows}
            setClosedRows={setClosedRows}
            detailRows={detailRows}
            holders={holders}
          />
          <ReviewComments
            canApprove={canApprove}
            error={error}
            comments={comments}
            setComments={setComments}
          />
          <ReviewHistory deed={deed} />
        </div>
        <ReviewActions
          canSubmit={canSubmit}
          canApprove={canApprove}
          legacyReview={!masterApproves}
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
