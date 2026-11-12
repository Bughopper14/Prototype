/** Legal tab: deeds, stakeholders, KTP OCR and deed review. */
import {deedNames} from '@/features/legal/components/DeedViews';
import {StakeholderDetailDialog} from '@/features/legal/components/StakeholderDetailDialog';
import {StakeholderModalDialog} from '@/features/legal/components/StakeholderModalDialog';
import {stakeholderEditorValues} from '@/features/legal/lib/stakeholder-values';
import {date} from '@/shared/lib/format';
import {Modal} from '@/shared/ui/Modal';
import {stakeholderFields} from '@liugong/shared';
import {Trash2} from 'lucide-react';

import {ActiveDeedsHeading} from '@/features/legal/components/legal-editor/ActiveDeedsHeading';
import {DeedActionMenu} from '@/features/legal/components/legal-editor/DeedActionMenu';
import {DeedTable} from '@/features/legal/components/legal-editor/DeedTable';
import {DeedEditorModal} from '@/features/legal/components/legal-editor/DeedEditorModal';
import {DeedStakeholdersModal} from '@/features/legal/components/legal-editor/DeedStakeholdersModal';
import {DeleteStakeholderModal} from '@/features/legal/components/legal-editor/DeleteStakeholderModal';
import {HistoricalDeedsHeading} from '@/features/legal/components/legal-editor/HistoricalDeedsHeading';
import {LegalEditorContext} from '@/features/legal/components/legal-editor/LegalEditorContext';
import {ShareholderCountModal} from '@/features/legal/components/legal-editor/ShareholderCountModal';
import {useLegalEditor, type LegalEditorProps} from '@/features/legal/hooks/useLegalEditor';

export function LegalEditor(props: LegalEditorProps) {
  const state = useLegalEditor(props);
  const {
    formError,
    deleting,
    setDeleting,
    stakeholderModal,
    setStakeholderModal,
    setStakeholderList,
    viewStakeholderDetail,
    setViewStakeholderDetail,
    viewRemarkDeed,
    setViewRemarkDeed,
    remarkCategories,
    getDeedCategoryIds,
    deeds,
    rowsFor,
    listLocked,
    editorLocked,
    removeDeed,
    saveStakeholder,
    latestAmendmentDeed,
    activeDeeds,
    historicalDeeds,
  } = state;
  return (
    <LegalEditorContext.Provider value={state}>
      <>
        {/* 1. TOP TABLE: ACTIVE DEEDS & CURRENT REFERENCE */}
        <ActiveDeedsHeading />

        <DeedTable list={activeDeeds} isHistory={false} emptyMsg="No active deeds recorded." />

        {/* 2. BOTTOM TABLE: PREVIOUS DEED HISTORY (HISTORICAL DATA) */}
        <HistoricalDeedsHeading />

        <DeedTable
          list={historicalDeeds}
          isHistory
          emptyMsg="No previous deed history. All deeds are recorded in the active reference table."
        />

        <DeedActionMenu />
        <DeedEditorModal />
        <ShareholderCountModal />
        <DeedStakeholdersModal />
        {stakeholderModal && (
          <StakeholderModalDialog
            modal={stakeholderModal}
            applicationId={props.application?.id}
            editorLocked={editorLocked}
            formError={formError}
            onClose={() => {
              // Closing the stakeholder form goes back to that deed's stakeholder list
              const deedId = stakeholderModal.deedId;
              setStakeholderModal(null);
              if (deedId) setStakeholderList(deedId);
            }}
            onSave={saveStakeholder}
            deedStakeholders={rowsFor(deeds.find(x => x.id === stakeholderModal.deedId))}
            onChangeValue={val => {
              const fullName = [val.firstName, val.middleName, val.lastName]
                .map((x: any) => String(x || '').trim())
                .filter(Boolean)
                .join(' ');
              setStakeholderModal({...stakeholderModal, value: {...val, name: fullName || val.name}});
            }}
            fields={stakeholderFields}
          />
        )}
        {viewStakeholderDetail && (
          <StakeholderDetailDialog
            item={viewStakeholderDetail.stakeholder}
            deed={deeds.find((x: any) => x.id === viewStakeholderDetail.deedId)}
            onClose={() => setViewStakeholderDetail(null)}
            onEdit={() => {
              const item = viewStakeholderDetail.stakeholder;
              const deedId = viewStakeholderDetail.deedId;
              const idx = viewStakeholderDetail.index;
              setViewStakeholderDetail(null);
              setStakeholderList(null);
              setStakeholderModal({
                deedId: deedId,
                index: idx,
                value: stakeholderEditorValues(item),
              });
            }}
            locked={listLocked}
          />
        )}
        <DeleteStakeholderModal />
        {deleting && (
          <Modal title="Delete Deed" onClose={() => setDeleting(null)}>
            <div className="modal-body">
              <p>
                Delete {deedNames[deleting.type]} <strong>{deleting.deedNumber || 'no number'}</strong> from
                the Legal list?
              </p>
              {deleting.source === 'Sistem' && (
                <p className="muted legal-delete-note">
                  Original data in Customer or profile remains; this deed will be hidden from the Legal list.
                </p>
              )}
              <p className="muted legal-delete-note">
                Click Save changes after deleting to keep changes saved.
              </p>
            </div>
            <div className="modal-actions">
              <button className="button" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button className="button legal-confirm-delete" onClick={removeDeed}>
                <Trash2 size={15} />
                Delete deed
              </button>
            </div>
          </Modal>
        )}
        {viewRemarkDeed &&
          (() => {
            const deed = viewRemarkDeed.deed,
              rawIds = getDeedCategoryIds(deed);
            const isLatest = deed.id === latestAmendmentDeed?.id && deed.type === 'amendment';
            const deedTitle = isLatest ? 'Latest Amendment Deed' : deedNames[deed.type];
            return (
              <Modal title={`Remarks Details · ${deedTitle}`} onClose={() => setViewRemarkDeed(null)}>
                <div className="modal-body legal-category-popup">
                  <div className="legal-popup-meta">
                    <span className="legal-type-badge">{deedTitle}</span>
                    <span className="legal-popup-deed-no">{deed.deedNumber}</span>
                    <span className="legal-popup-date">{date(deed.deedDate)}</span>
                  </div>
                  <div style={{marginBottom: '14px'}}>
                    <span
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#475569',
                        display: 'block',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Change Categories ({rawIds.length} Selected):
                    </span>
                    <div
                      className="legal-categories-wrap"
                      style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}
                    >
                      {rawIds.map((id: string) => {
                        const cat = remarkCategories.find(c => c.id === id || c.name === id),
                          name = cat?.name || id;
                        return (
                          <span
                            key={id}
                            className="legal-category-badge"
                            style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              padding: '4px 10px',
                              borderRadius: '16px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                            }}
                          >
                            ✓ {name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="legal-single-remark-view">
                    <span
                      className="field-label"
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: '#002060',
                        display: 'block',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Deed Notes / Remarks:
                    </span>
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '14px 16px',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        color: '#0f172a',
                        minHeight: '80px',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: deed.remarks || 'No remarks notes for this deed yet.',
                      }}
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="button primary" onClick={() => setViewRemarkDeed(null)}>
                    Close
                  </button>
                </div>
              </Modal>
            );
          })()}
      </>
    </LegalEditorContext.Provider>
  );
}
