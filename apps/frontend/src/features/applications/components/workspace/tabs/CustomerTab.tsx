/** Tab: Customer & PIC (form + FAP sheet preview). */
import {CustomerDetailSections} from '@/features/applications/components/workspace/customer/CustomerDetailSections';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {FapSheetPreview} from '@/features/crm/components/lazy';
import {Archive, Building2, Columns} from 'lucide-react';

export function CustomerTab() {
  const {
    a,
    customerCategory,
    selectedCustomer,
    tab,
    draft,
    sideBySide,
    setSideBySide,
    activeSyncSection,
    activeSyncField,
    syncTick,
    handlePreviewCellClick,
    formColumnHandlers,
    handlePreviewSectionClick,
    handlePrintFap,
    openArchiveViewer,
    liveCompanyName,
    liveNib,
    liveNpwp,
    liveDetailFapData,
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
              <div className="fap-detail-form-col" {...formColumnHandlers}>
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
                  onPreviewCellClick={handlePreviewCellClick}
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
