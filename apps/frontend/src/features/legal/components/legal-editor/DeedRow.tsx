/** One deed row: type and review status, dates, validity, decree, remark categories, stakeholders and actions. */
import {deedNames} from '@/features/legal/components/DeedViews';
import {ApprovalSlot} from '@/features/applications/components/workspace/ApprovalSlot';
import {useLegalEditorContext} from '@/features/legal/components/legal-editor/LegalEditorContext';
import {checkIsAdmin, hasAuthority} from '@/shared/lib/auth';
import {date, deedValidity} from '@/shared/lib/format';
import {deedStatusLabel, DEED_EDIT_AUTHORITY, DEED_SECTION, reviewStatus} from '@liugong/shared';
import {MoreHorizontal} from 'lucide-react';

export function DeedRow({deed: x, isHistory}: {deed: any; isHistory: boolean}) {
  const {
    user,
    application,
    value,
    onChange,
    onReview,
    selectedId,
    locked,
    rowsFor,
    getDeedCategoryIds,
    remarkCategories,
    setViewRemarkDeed,
    setStakeholderList,
    setShareholderCountDeed,
    actionMenu,
    setActionMenu,
    primaryEstablishmentDeed,
    latestAmendmentDeed,
  } = useLegalEditorContext();
  const rowLocked = locked(x);
  const total = rowsFor(x).reduce((sum, r) => sum + Number(r.sharePercentage || 0), 0);
  const isExceeded = total > 100.01;
  const isComplete = Math.abs(total - 100) < 0.01;
  const ownershipClass = isExceeded
    ? 'exceeded'
    : isComplete
      ? 'complete'
      : total > 0
        ? 'partial'
        : 'incomplete';
  const ownershipLabel = isExceeded
    ? `⚠ ${total.toFixed(2)}% · Exceeds 100%`
    : isComplete
      ? '✓ 100%'
      : total > 0
        ? `✓ ${total.toFixed(2)}%`
        : '0.00% · No data yet';
  const masterApproves = ((application?.approvalPlaces || []) as any[]).some(p => p.scope === 'SECTION' && p.sectionCode === DEED_SECTION);
  const reviewLabel =
    hasAuthority(user, DEED_EDIT_AUTHORITY) && ['DRAFT', 'NEEDS_REVISION'].includes(reviewStatus(x))
      ? reviewStatus(x) === 'NEEDS_REVISION'
        ? 'Resubmit Deed'
        : 'Submit Deed'
      : checkIsAdmin(user) && reviewStatus(x) === 'PENDING'
        ? 'Review Deed'
        : 'View Review';
  const val = deedValidity(x.deedDate);
  const isPrimaryEst = primaryEstablishmentDeed?.id === x.id;
  const isLatestAmend = latestAmendmentDeed?.id === x.id;
  const typeLabel = x.type === 'amendment' && isLatestAmend ? 'Latest Amendment Deed' : deedNames[x.type];
  // Edit / Delete menu: only for someone who can change the deed. Beside the approval status when the deed has an approval, else in the button row.
  const menuButton = (
      <button
        className="button small legal-kebab"
        aria-label={`Deed action ${x.deedNumber || 'no number'}`}
        aria-haspopup="menu"
        aria-expanded={actionMenu?.id === x.id}
        onClick={e => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          setActionMenu({
            id: x.id,
            left: Math.max(8, Math.min(rect.right - 180, window.innerWidth - 188)),
            top: Math.min(rect.bottom + 5, window.innerHeight - 110),
          });
        }}
      >
        <MoreHorizontal size={17} />
      </button>
  );

  return (
    <tr className={selectedId === x.id ? 'selected' : ''} aria-selected={selectedId === x.id}>
      <td data-label="Deed">
        <div className="legal-deed-primary">
          <span className="legal-type-badge">{typeLabel}</span>
          {isHistory ? (
            <span className="legal-history-badge">Historical</span>
          ) : isPrimaryEst ? (
            <span
              className="legal-role-badge"
              style={{background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe'}}
            >
              Primary
            </span>
          ) : null}
        </div>
        <b className="legal-deed-number">{x.deedNumber || 'Number not filled'}</b>
        <span className={'deed-review-status compact ' + reviewStatus(x).toLowerCase()}>
          {deedStatusLabel(x)}
        </span>
        {reviewStatus(x) === 'NEEDS_REVISION' && x.review?.notes && (
          <small className="text-red">{x.review.notes}</small>
        )}
        <small>{x.source === 'Sistem' ? 'Initial system data' : 'Legal Input'}</small>
      </td>
      <td data-label="Date">
        <span className="legal-cell-main">{date(x.deedDate)}</span>
      </td>
      <td data-label="Status">
        <span
          className={
            'deed-validity ' + (val.active === null ? 'unknown' : val.active ? 'active' : 'inactive')
          }
        >
          {val.status}
        </span>
      </td>
      <td data-label="Valid Until">
        <span className="legal-cell-main">{date(val.expiry)}</span>
      </td>
      <td data-label="Ministerial Decree">
        <span className="legal-cell-main">{x.ministerialDecreeNumber || '—'}</span>
        <small>{date(x.ministerialDecreeDate)}</small>
      </td>
      <td data-label="Remarks Categories">
        {(() => {
          const rawIds = getDeedCategoryIds(x);
          if (!rawIds.length) return <span className="legal-category-label">—</span>;
          return (
            <div className="legal-categories-wrap">
              {rawIds.map((id: string) => {
                const cat = remarkCategories.find(c => c.id === id || c.name === id);
                const name = cat?.name || id;
                return (
                  <button
                    key={id}
                    type="button"
                    className="legal-category-badge clickable"
                    onClick={e => {
                      e.stopPropagation();
                      setViewRemarkDeed({deed: x, activeCatId: id});
                    }}
                    title={`Click to view ${name} remarks details`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          );
        })()}
      </td>
      <td data-label="Stakeholders">
        <button
          className="legal-count-link"
          onClick={e => {
            e.stopPropagation();
            onChange({...value, selectedDeedId: x.id});
            setStakeholderList(x.id);
          }}
        >
          {rowsFor(x).length} stakeholder(s) · Manage
        </button>
        <button
          className={'legal-ownership-summary ' + ownershipClass}
          onClick={e => {
            e.stopPropagation();
            setShareholderCountDeed(x.id);
          }}
          title="View share ownership details"
        >
          {ownershipLabel}
        </button>
      </td>
      <td className="legal-row-action">
        <div className="legal-row-buttons">
          {/* One deed, one approval: when the workflow has an approval for the deed section, the slot below is the approval, so the old Submit / Review buttons are not drawn (only the read-only review stays). */}
          {(!masterApproves || reviewLabel === 'View Review') && (
            <button
              className="button primary small deed-review-action"
              onClick={e => {
                e.stopPropagation();
                onReview(x.id);
              }}
            >
              {reviewLabel}
            </button>
          )}
          {!rowLocked && !masterApproves && menuButton}
        </div>
        {/* The approval of this deed in the workflow, on its own line (nothing is drawn when the workflow has none for the deed section). */}
        <ApprovalSlot scope="SECTION" code={DEED_SECTION} subjectId={x.id} trailing={!rowLocked && masterApproves ? menuButton : undefined} />
      </td>
    </tr>
  );
}
