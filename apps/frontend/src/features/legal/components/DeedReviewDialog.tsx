import {api} from '@/shared/lib/api';
import {useMasterData} from '@/shared/master-data';
import {
  DEED_APPROVE_AUTHORITY,
  DEED_EDIT_AUTHORITY,
  deedReviewLabels,
  deedStatusLabel,
  label,
  reviewStatus,
  stakeholderFields,
} from '@liugong/shared';
import {hasAuthority} from '@/shared/lib/auth';
import {AlertCircle, Check, ChevronDown, Clock, ExternalLink, FileText, Pencil, Send, Upload, X} from 'lucide-react';
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
  const canSubmit =
      hasAuthority(user, DEED_EDIT_AUTHORITY) && ['DRAFT', 'REJECTED', 'NEEDS_CORRECTION'].includes(status),
    canCheck = hasAuthority(user, DEED_APPROVE_AUTHORITY) && status === 'PENDING_CHECK',
    canApprove = hasAuthority(user, DEED_APPROVE_AUTHORITY) && status === 'PENDING_APPROVAL';
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
        <div className="modal-head">
          <div>
            <h2>Deed review {deed.deedNumber}</h2>
            <p>{application.customer.companyName}</p>
          </div>
          <button className="icon-button" disabled={busy} onClick={onClose} aria-label="Close review">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className={'deed-review-status ' + status.toLowerCase()}>
            <Clock size={15} />
            {deedStatusLabel(deed)}
          </div>
          {status === 'REJECTED' && deed.review?.rejectionReason && (
            <div className="error">
              <b>Rejection reason: </b>
              {deed.review.rejectionReason}
            </div>
          )}
          {status === 'NEEDS_CORRECTION' && deed.review?.correctionNote && (
            <div className="error">
              <b>Remarks: </b>
              {deed.review.correctionNote}
            </div>
          )}
          <dl className="deed-review-summary">
            <div>
              <dt>Deed type</dt>
              <dd>{deed.type === 'amendment' ? 'Amendment deed' : 'Establishment deed'}</dd>
            </div>
            <div>
              <dt>Deed date</dt>
              <dd>{deed.deedDate}</dd>
            </div>
            <div>
              <dt>Ministerial Decree number</dt>
              <dd>{deed.ministerialDecreeNumber || '—'}</dd>
            </div>
            <div>
              <dt>Ministerial Decree date</dt>
              <dd>{deed.ministerialDecreeDate || '—'}</dd>
            </div>
            {deed.type === 'amendment' && (
              <div>
                <dt>Remarks category</dt>
                <dd>
                  {(Array.isArray(deed.remarkCategoryIds) && deed.remarkCategoryIds.length
                    ? deed.remarkCategoryIds
                    : [deed.remarkCategoryId].filter(Boolean)
                  )
                    .map(
                      (id: string) =>
                        master.remarkCategoryId.find(x => x.value === id)?.name ||
                        (id === 'establishment-deed' ? 'Establishment deed' : id),
                    )
                    .join(', ') || '—'}
                </dd>
              </div>
            )}
            {deed.remarks && (
              <div>
                <dt>Remarks</dt>
                <dd>{deed.remarks}</dd>
              </div>
            )}
          </dl>
          {deed.type === 'amendment' && <DeedComparison legal={application.legal} deed={deed} />}
          <h3>Deed document (optional)</h3>
          {canSubmit && (
            <div className="deed-review-document-picker">
              <label>
                Select document to submit
                <select
                  aria-label="Deed document"
                  value={documentId}
                  disabled={busy}
                  onChange={e => {
                    setError('');
                    setDocumentId(e.target.value);
                  }}
                >
                  <option value="">No attachment</option>
                  {files.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.fileName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="button small upload-label">
                <Upload size={14} />
                {busy ? 'Uploading...' : 'Upload document'}
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  disabled={busy || !checklist}
                  onChange={async e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setBusy(true);
                    setError('');
                    try {
                      const data = new FormData();
                      data.append('checklistId', checklist.id);
                      data.append('file', f);
                      const saved = await api(
                        `/applications/${application.id}/documents/upload`,
                        'POST',
                        data,
                      );
                      onUpdated(await api(`/applications/${application.id}`));
                      setDocumentId(saved.id);
                    } catch (e: any) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          )}
          {documentId ? (
            <>
              <div className="deed-review-file-name">
                <FileText size={16} />
                {files.find((f: any) => f.id === documentId)?.fileName || 'Deed document'}
                {url && (
                  <a className="text-link" href={url} target="_blank" rel="noreferrer">
                    Open document
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
              {url && (
                <div className="deed-review-preview">
                  {files.find((f: any) => f.id === documentId)?.mimeType === 'application/pdf' ? (
                    <iframe title="Deed document preview" src={url} />
                  ) : (
                    <img src={url} alt="Deed document" />
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="muted">No attachment. The deed can still be submitted, verified, and approved.</p>
          )}
          <div className="deed-review-shareholders">
            <h3>Submitted stakeholders / shareholders</h3>
            {holders.map((r: any, i: number) => (
              <div key={r.id || i} className={'deed-review-holder' + (closedRows[i] ? '' : ' open')}>
                <button
                  type="button"
                  className="deed-review-holder-row"
                  aria-expanded={!closedRows[i]}
                  onClick={() => setClosedRows({...closedRows, [i]: !closedRows[i]})}
                >
                  <span>
                    {[r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ') || r.name || 'No name'}
                  </span>
                  <b>{Number(r.sharePercentage || 0).toFixed(2)}%</b>
                  <ChevronDown size={15} />
                </button>
                {!closedRows[i] && (
                  <dl className="deed-review-holder-detail">
                    {detailRows(r).map(([name, value]) => (
                      <div key={name}>
                        <dt>{name}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ))}
          </div>
          {(canCheck || canApprove) && (
            <label className="deed-review-comments">
              Remarks (optional when approving, required for Remarks or Reject)
              <textarea
                aria-label="Remarks"
                rows={3}
                maxLength={10000}
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Add remarks for the record. To ask MKT to change something, describe it here and use Remarks. To refuse the deed, give the reason and use Reject."
              />
            </label>
          )}
          {(canCheck || canApprove) && !comments.trim() && (
            <ul className="muted deed-review-hint">
              <li>
                <b>{canCheck ? 'Verification passed' : 'Approve deed'}</b>: the deed is correct. Remarks are
                optional.
              </li>
              <li>
                <b>Remarks</b>: the deed is not wrong, but MKT must change or add something. It goes back to
                MKT as "Needs correction" with your note, and MKT submits it again.
              </li>
              <li>
                <b>Reject</b>: the deed is refused. It goes back to MKT as "Rejected" with your reason.
              </li>
              <li>Remarks and Reject stay grey until you write in the Remarks box above.</li>
            </ul>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {deed.reviewHistory?.length > 0 && (
            <details className="deed-review-history">
              <summary>Review history</summary>
              {[...deed.reviewHistory].reverse().map((h: any, i: number) => (
                <div key={i}>
                  <b>
                    {h.action === 'REMARKS' ? 'Remarks' : deedReviewLabels[h.status]} · {h.actor}
                  </b>
                  <small>{new Date(h.at).toLocaleString('en-GB', {timeZone: 'Asia/Bangkok'})}</small>
                  {h.comments && <p>{h.comments}</p>}
                </div>
              ))}
            </details>
          )}
        </div>
        <div className="modal-actions">
          <button className="button" disabled={busy} onClick={onClose}>
            Close
          </button>
          {(canCheck || canApprove) && (
            <button
              className="button"
              disabled={busy || !comments.trim()}
              title={comments.trim() ? 'Send the remarks back to MKT to change' : 'Write the remarks first'}
              onClick={() => action('REMARKS')}
            >
              <FileText size={14} />
              Remarks
            </button>
          )}
          {(canCheck || canApprove) && (
            <button
              className="button danger"
              disabled={busy || !comments.trim()}
              title={comments.trim() ? 'Reject the deed' : 'Write the reason first'}
              onClick={() => action('REJECT')}
            >
              <AlertCircle size={14} />
              Reject
            </button>
          )}
          {canSubmit && onEdit && (
            <>
              <button className="button" disabled={busy} onClick={() => onEdit('stakeholders')}>
                <Pencil size={14} />
                Edit stakeholders
              </button>
              <button className="button" disabled={busy} onClick={() => onEdit('deed')}>
                <Pencil size={14} />
                Edit deed
              </button>
            </>
          )}
          {canSubmit && (
            <button className="button primary" disabled={busy} onClick={() => action('SUBMIT')}>
              <Send size={14} />
              {(deed.reviewHistory || []).length
                ? 'Resubmit for Legal Approval'
                : 'Submit for Legal Approval'}
            </button>
          )}
          {canCheck && (
            <button
              className="button primary"
              disabled={busy || Boolean(documentId && !url)}
              onClick={() => action('CHECK')}
            >
              <Check size={14} />
              Verification passed
            </button>
          )}
          {canApprove && (
            <button
              className="button primary"
              disabled={busy || Boolean(documentId && !url)}
              onClick={() => action('APPROVE')}
            >
              <Check size={14} />
              Approve deed
            </button>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
export function NotificationsPage({
  items,
  onOpen,
  onRead,
}: {
  items: any[];
  onOpen: (id: string) => void;
  onRead: (id: string) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Notifications</h2>
        <span className="subtle-chip">{items.filter(x => !x.readAt).length} unread</span>
      </div>
      <div className="notifications-list">
        {items.map(n => (
          <article key={n.id} className={n.readAt ? '' : 'unread'}>
            <AlertCircle size={20} />
            <div>
              <h3>{n.title}</h3>
              <p>{n.message}</p>
              <small>{new Date(n.createdAt).toLocaleString('en-GB', {timeZone: 'Asia/Bangkok'})}</small>
              <div className="notification-actions">
                <button
                  className="text-link"
                  onClick={() => {
                    onRead(n.id);
                    onOpen(n.applicationId);
                  }}
                >
                  Open deed for action
                </button>
                {!n.readAt && (
                  <button className="text-link" onClick={() => onRead(n.id)}>
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
        {!items.length && <div className="empty-small">No notifications yet.</div>}
      </div>
    </section>
  );
}
