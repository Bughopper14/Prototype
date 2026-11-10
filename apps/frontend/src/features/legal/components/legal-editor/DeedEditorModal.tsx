/** Add / edit deed dialog. */
import {DeedRemarksTinyMCE} from '@/features/legal/components/DeedRemarksTinyMCE';
import {normalizeRemarksToHtml} from '@/features/legal/lib/remarks-html';
import {date} from '@/shared/lib/format';
import {Fields} from '@/shared/ui/Fields';
import {Modal} from '@/shared/ui/Modal';
import {legalDeedFields} from '@liugong/shared';
import {Save} from 'lucide-react';

import {useLegalEditorContext} from '@/features/legal/components/legal-editor/LegalEditorContext';

export function DeedEditorModal() {
  const {
    value,
    application,
    formError,
    setFormError,
    editing,
    setEditing,
    amendmentRemarkCategories,
    getDeedCategoryIds,
    deeds,
    editorLocked,
    saveDeed,
    isDuplicateDeedNumber,
    complete,
    establishmentDeedCat,
    isTypeMandatory,
    isRemarksMandatory,
  } = useLegalEditorContext();
  return (
    <>
      {editing &&
        (() => {
          const availableChips =
            editing.type === 'amendment'
              ? amendmentRemarkCategories
              : [establishmentDeedCat, ...amendmentRemarkCategories];
          const currentSelectedCategoryIds = getDeedCategoryIds(editing);
          const toggleCategory = (catId: string) => {
            if (editorLocked) return;
            setEditing((prev: any) => {
              if (!prev) return prev;
              const currentCats = getDeedCategoryIds(prev);
              const isSelected = currentCats.includes(catId);
              const next = isSelected ? currentCats.filter(id => id !== catId) : [...currentCats, catId];
              return {...prev, remarkCategoryIds: next, remarkCategoryId: next[0] || ''};
            });
          };
          return (
            <Modal
              title={
                deeds.some(x => x.id === editing.id)
                  ? editorLocked
                    ? 'Deed Details'
                    : 'Edit Deed'
                  : 'Add Deed'
              }
              onClose={() => setEditing(null)}
              className="modal-legal-deed-wide"
            >
              <div className="modal-body legal-deed-modal">
                {formError && (
                  <div className="error" role="alert">
                    {formError}
                  </div>
                )}
                {(() => {
                  const hasExistingEstablishment = deeds.some(
                    (x: any) => x.type === 'establishment' && x.id !== editing.id,
                  );
                  return (
                    <label className="legal-deed-select">
                      Deed type{isTypeMandatory && <span className="field-required">*</span>}
                      <select
                        aria-label="Deed type"
                        disabled={editorLocked}
                        value={editing.type}
                        onChange={e => {
                          const newType = e.target.value;
                          const nextCats =
                            newType === 'establishment'
                              ? ['establishment-deed']
                              : editing.remarkCategoryIds?.filter(
                                  (x: string) => x !== 'establishment-deed',
                                ) || [];
                          setEditing({
                            ...editing,
                            type: newType,
                            remarkCategoryIds: nextCats,
                            remarkCategoryId: nextCats[0] || '',
                          });
                        }}
                      >
                        <option
                          value="establishment"
                          disabled={hasExistingEstablishment}
                          style={
                            hasExistingEstablishment
                              ? {color: '#94a3b8', backgroundColor: '#f1f5f9', cursor: 'not-allowed'}
                              : undefined
                          }
                        >
                          Establishment Deed{hasExistingEstablishment ? ' (Already exists)' : ''}
                        </option>
                        <option value="amendment">Amendment Deed</option>
                      </select>
                    </label>
                  );
                })()}
                <Fields
                  fields={legalDeedFields}
                  section="Legal Deeds & Amendments"
                  value={editing}
                  disabled={editorLocked}
                  customErrors={
                    isDuplicateDeedNumber
                      ? {deedNumber: 'This deed number has already been entered in this application.'}
                      : undefined
                  }
                  onChange={next => {
                    setEditing({...editing, ...next});
                    const estDeed = deeds.find((x: any) => x.type === 'establishment' && x.id !== editing.id);
                    const estDate =
                      estDeed?.deedDate || value.establishmentDate || application.customer?.establishmentDate;
                    const dDate = next.deedDate || editing.deedDate;
                    if (
                      editing.type === 'amendment' &&
                      dDate &&
                      estDate &&
                      String(dDate).slice(0, 10) < String(estDate).slice(0, 10)
                    ) {
                      setFormError(
                        `Amendment deed date (${date(dDate)}) cannot be before the establishment deed date (${date(estDate)}).`,
                      );
                    } else if (
                      formError &&
                      formError.includes('cannot be before the establishment deed date')
                    ) {
                      setFormError('');
                    }
                  }}
                />
                <>
                  <div className="legal-remarks-category-group">
                    <span className="field-label">Remarks Categories</span>
                    <div className="legal-remarks-chips" role="group" aria-label="Remarks Categories">
                      {availableChips.map(cat => {
                        const isSelected = currentSelectedCategoryIds.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected}
                            disabled={editorLocked}
                            className={`legal-remark-chip ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleCategory(cat.id)}
                          >
                            <span className="legal-chip-check">{isSelected ? '✓' : '+'}</span>
                            <span>{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="legal-unified-remarks-box">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <div>
                        <span
                          className="field-label"
                          style={{fontSize: '13px', fontWeight: 700, color: '#002060'}}
                        >
                          Notes / Deed Remarks
                          {isRemarksMandatory && <span className="field-required">*</span>}
                        </span>
                        <p
                          className="legal-remarks-hint"
                          style={{fontSize: '11px', color: '#64748b', margin: '2px 0 0 0'}}
                        >
                          Write notes and details of deed changes below (rich text TinyMCE format supported):
                        </p>
                      </div>
                      <span
                        className="subtle-chip"
                        style={{background: '#eff6ff', color: '#1d4ed8', fontSize: '10.5px', fontWeight: 600}}
                      >
                        TinyMCE Editor
                      </span>
                    </div>
                    <DeedRemarksTinyMCE
                      key={editing.id}
                      initialContent={normalizeRemarksToHtml(editing.remarks)}
                      disabled={editorLocked}
                      onChange={newContent => {
                        setEditing((prev: any) => (prev ? {...prev, remarks: newContent} : prev));
                      }}
                    />
                  </div>
                </>
              </div>
              <div className="modal-actions">
                <button className="button" onClick={() => setEditing(null)}>
                  {editorLocked ? 'Close' : 'Cancel'}
                </button>
                {!editorLocked && (
                  <button
                    className="button primary"
                    onClick={saveDeed}
                    disabled={!complete || isDuplicateDeedNumber}
                  >
                    <Save size={15} />
                    Save Deed
                  </button>
                )}
              </div>
            </Modal>
          );
        })()}
    </>
  );
}
