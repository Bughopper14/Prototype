/** Tab: Customer & PIC (9-section unified form + FAP sheet preview). */
import {CustomerDetailSections} from '@/features/applications/components/workspace/customer/CustomerDetailSections';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {FapSheetPreview} from '@/features/crm/components/lazy';
import {bankFields, blank, financialFields, projectFields} from '@liugong/shared';
import {Archive, Building2, Columns} from 'lucide-react';

export function CustomerTab() {
  const {
    a,
    customerCategory,
    selectedCustomer,
    tab,
    draft,
    setDraft,
    sideBySide,
    setSideBySide,
    activeSyncSection,
    activeSyncField,
    syncTick,
    handleTriggerFieldSync,
    handlePreviewSectionClick,
    handlePrintFap,
    openArchiveViewer,
    liveCompanyName,
    liveNib,
    liveNpwp,
    liveDetailFapData,
    setOpenSections,
    setTargetProjectRow,
    setTargetBankRow,
    setFinancialActiveIndex,
    highlightFormElement,
    scrollToFormElement,
  } = useWorkspace();

  return (
    <>
      {tab === 0 && (
        <>
          <div
            className="customer-reference"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Building2 size={18} />
              <span>
                <b>
                  {customerCategory === 'EXISTING'
                    ? selectedCustomer?.companyName || 'No debtor selected'
                    : liveCompanyName || 'New Applicant'}
                </b>{' '}
                · NIB {customerCategory === 'EXISTING' ? selectedCustomer?.nib || '—' : liveNib || '—'} · NPWP{' '}
                {customerCategory === 'EXISTING' ? selectedCustomer?.npwp || '—' : liveNpwp || '—'}
              </span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <button
                type="button"
                className="button small"
                style={{
                  background: '#f8fafc',
                  color: '#002c5f',
                  borderColor: '#cbd5e1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onClick={openArchiveViewer}
                title="View immutable FAP submission archive, OCR differences, notes, and document storage path"
              >
                <Archive size={14} />
                <span>Submission Archive &amp; OCR</span>
              </button>
              <div className="fap-tab-layout-toggle" style={{margin: 0}}>
                <button
                  type="button"
                  className={`fap-tab-toggle-btn ${sideBySide ? 'active' : ''}`}
                  onClick={() => setSideBySide(s => !s)}
                  title={sideBySide ? 'Close Side-by-side' : 'Open Side-by-side Live FAP'}
                >
                  <Columns size={14} />
                  {sideBySide ? 'Side-by-side Live FAP (Active)' : 'Open Side-by-side FAP'}
                </button>
              </div>
            </div>
          </div>
          {!sideBySide && (
            <div style={{display: 'none'}} className="print-hidden-doc">
              <FapSheetPreview
                data={liveDetailFapData}
                application={a}
                customer={draft.customer || a.customer}
                profile={draft}
                pic={draft.pic || a.pic}
                onPrint={handlePrintFap}
              />
            </div>
          )}
          {sideBySide ? (
            <div className="fap-detail-split-container">
              <div
                className="fap-detail-form-col"
                onFocusCapture={e => {
                  if (!e.isTrusted) return;
                  const target = e.target as HTMLElement;
                  if (
                    !target ||
                    target.closest(
                      '.tox, .tox-tinymce, iframe, .preana-rich-editor-wrapper, .crm-rich-editor-wrapper',
                    )
                  )
                    return;
                  if (target && target.matches('input, textarea, select, button, [data-field], [name]')) {
                    const formEl = (target.closest('[data-field]') as HTMLElement) || target;
                    highlightFormElement(formEl);
                    const fieldKey =
                      formEl.getAttribute('data-field') ||
                      (formEl as HTMLInputElement).name ||
                      (target as HTMLInputElement).name ||
                      target.getAttribute('data-field');
                    const secContainer = target.closest('[data-section]') as HTMLElement;
                    const secContext = secContainer?.getAttribute('data-section') || undefined;
                    if (fieldKey) {
                      handleTriggerFieldSync(fieldKey, secContext);
                    }
                  }
                }}
                onClickCapture={e => {
                  const target = e.target as HTMLElement;
                  if (
                    target &&
                    target.matches('input, textarea, select, button, [data-field], [name], label, td')
                  ) {
                    const formEl = (target.closest('[data-field]') as HTMLElement) || target;
                    highlightFormElement(formEl);
                    const fieldKey =
                      formEl.getAttribute('data-field') ||
                      (formEl as HTMLInputElement).name ||
                      (target as HTMLInputElement).name ||
                      target.getAttribute('data-field');
                    const secContainer = target.closest('[data-section]') as HTMLElement;
                    const secContext = secContainer?.getAttribute('data-section') || undefined;
                    if (fieldKey) {
                      handleTriggerFieldSync(fieldKey, secContext);
                    }
                  }
                }}
              >
                <CustomerDetailSections />
              </div>
              <div className="fap-detail-preview-col">
                <FapSheetPreview
                  data={liveDetailFapData}
                  application={a}
                  customer={draft.customer || a.customer}
                  profile={draft}
                  pic={draft.pic || a.pic}
                  activeSection={activeSyncSection}
                  activeField={activeSyncField || undefined}
                  syncTick={syncTick}
                  onSectionClick={handlePreviewSectionClick}
                  onPreviewCellClick={(fKey, sId, meta) => {
                    if (sId) setOpenSections(prev => ({...prev, [sId]: true}));
                    if (meta?.repeater === 'projects' && meta?.rowIndex !== undefined) {
                      const neededLen = meta.rowIndex + 1;
                      const currentLen = (draft.projects || []).length;
                      if (neededLen > currentLen) {
                        const newRows = [...(draft.projects || [])];
                        while (newRows.length < neededLen) {
                          newRows.push(blank(projectFields));
                        }
                        setDraft((prev: any) => ({...prev, projects: newRows}));
                      }
                      setTargetProjectRow(meta.rowIndex);
                    } else if (meta?.repeater === 'financial' && meta?.rowIndex !== undefined) {
                      const neededLen = meta.rowIndex + 1;
                      const currentLen = (draft.financialStatements || []).length;
                      if (neededLen > currentLen) {
                        const newRows = [...(draft.financialStatements || [])];
                        const currentYear = new Date().getFullYear();
                        while (newRows.length < neededLen) {
                          newRows.push({
                            ...blank(financialFields),
                            fiscalYear: currentYear - (neededLen - newRows.length),
                          });
                        }
                        setDraft((prev: any) => ({...prev, financialStatements: newRows}));
                      }
                      setFinancialActiveIndex(meta.rowIndex);
                    } else if (meta?.repeater === 'banks' && meta?.rowIndex !== undefined) {
                      const neededLen = meta.rowIndex + 1;
                      const currentLen = (draft.bankReferences || []).length;
                      if (neededLen > currentLen) {
                        const newRows = [...(draft.bankReferences || [])];
                        while (newRows.length < neededLen) {
                          newRows.push(blank(bankFields));
                        }
                        setDraft((prev: any) => ({...prev, bankReferences: newRows}));
                      }
                      setTargetBankRow(meta.rowIndex);
                    }
                    handleTriggerFieldSync(fKey, meta?.sectionContext || sId);
                    scrollToFormElement(fKey, meta?.sectionContext || sId, sId);
                  }}
                  onPrint={handlePrintFap}
                />
              </div>
            </div>
          ) : (
            <div className="business-sections" style={{marginTop: 14}}>
              <CustomerDetailSections />
            </div>
          )}
        </>
      )}
    </>
  );
}
