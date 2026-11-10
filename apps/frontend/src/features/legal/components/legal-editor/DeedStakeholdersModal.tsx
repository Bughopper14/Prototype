/** Stakeholders on a deed: list, add, view, delete. */
import {stakeholderEditorValues} from '@/features/legal/lib/stakeholder-values';
import {Modal} from '@/shared/ui/Modal';
import {blank, label, stakeholderFields} from '@liugong/shared';
import {Eye, Pencil, Plus, Trash2} from 'lucide-react';

import {useLegalEditorContext} from '@/features/legal/components/legal-editor/LegalEditorContext';

export function DeedStakeholdersModal() {
  const {
    setStakeholderModal,
    stakeholderList,
    setStakeholderList,
    setViewStakeholderDetail,
    setDeleteStakeholder,
    deeds,
    listLocked,
    rowsFor,
  } = useLegalEditorContext();
  return (
    <>
      {stakeholderList && (
        <Modal title="Stakeholders on this deed" onClose={() => setStakeholderList(null)}>
          <div className="modal-body">
            <div className="legal-stakeholder-list">
              {rowsFor(deeds.find(x => x.id === stakeholderList)).map((r, i) => (
                <div
                  className="legal-stakeholder-item interactive-stakeholder-card"
                  key={r.id || i}
                  onClick={() =>
                    setViewStakeholderDetail({deedId: stakeholderList, index: i, stakeholder: r})
                  }
                  title="Click to view full stakeholder details"
                >
                  <div className="legal-stakeholder-item-info">
                    <div className="legal-stakeholder-avatar">
                      {(r.name || r.firstName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <b>
                        {r.name ||
                          [r.firstName, r.lastName].filter(Boolean).join(' ') ||
                          `Stakeholder ${i + 1}`}
                      </b>
                      <small>
                        {label(r.stakeholderType)} · {Number(r.sharePercentage || 0).toFixed(2)}% shares ·{' '}
                        {label(r.representativeType || 'SHAREHOLDER')}
                      </small>
                    </div>
                  </div>
                  <div className="legal-row-buttons" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className="button small"
                      style={{background: '#f8fafc', color: '#002060', borderColor: '#cbd5e1'}}
                      onClick={() =>
                        setViewStakeholderDetail({deedId: stakeholderList, index: i, stakeholder: r})
                      }
                      title="View full stakeholder details"
                    >
                      <Eye size={13} style={{marginRight: '4px'}} />
                      Detail
                    </button>
                    {/* A locked deed can only be read, and Detail already shows everything: no second read-only button. */}
                    {!listLocked && (
                      <button
                        type="button"
                        className="button small"
                        onClick={() => {
                          setStakeholderModal({
                            deedId: stakeholderList,
                            index: i,
                            value: stakeholderEditorValues(r),
                          });
                          setStakeholderList(null);
                        }}
                      >
                        <Pencil size={13} style={{marginRight: '4px'}} />
                        Edit
                      </button>
                    )}
                    {!listLocked && (
                      <button
                        type="button"
                        className="button small legal-delete-button"
                        onClick={() => {
                          // The list stays open behind the confirmation
                          setDeleteStakeholder({
                            deedId: stakeholderList,
                            index: i,
                            id: r.id,
                            name:
                              r.name ||
                              [r.firstName, r.lastName].filter(Boolean).join(' ') ||
                              `Stakeholder ${i + 1}`,
                          });
                        }}
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!rowsFor(deeds.find(x => x.id === stakeholderList)).length && (
                <div className="empty-small">No stakeholders on this deed yet.</div>
              )}
            </div>
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setStakeholderList(null)}>
              Close
            </button>
            {!listLocked && (
              <button
                className="button primary"
                onClick={() => {
                  setStakeholderModal({
                    deedId: stakeholderList,
                    index: -1,
                    value: {
                      ...blank(stakeholderFields),
                      representativeType: 'SHAREHOLDER',
                      positions: 'NONE',
                      idType: 'NONE',
                    },
                  });
                  setStakeholderList(null);
                }}
              >
                <Plus size={15} />
                Add shareholder
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
