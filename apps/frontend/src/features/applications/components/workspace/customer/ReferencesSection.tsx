/** Customer section 07: References (Bank facilities & comments). */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {money} from '@/shared/lib/format';
import {CrmRichTextEditor} from '@/shared/ui/CrmRichTextEditor';
import {Repeater} from '@/shared/ui/Repeater';
import {bankFields} from '@liugong/shared';
import {ChevronDown, Eye} from 'lucide-react';

export function ReferencesSection() {
  const {
    draft,
    setDraft,
    openSections,
    setOpenSections,
    activeFieldKey,
    handleTriggerFieldSync,
    handleTriggerSync,
    toggleSection,
    canEdit,
    targetBankRow,
    setTargetBankRow,
  } = useWorkspace();

  const totalMonthlyInstallment = (draft.bankReferences || []).reduce(
    (sum: number, r: any) => sum + (Number(r.monthlyInstallment) || 0),
    0,
  );

  return (
    <div
      className={`fap-accordion-card ${openSections['fap-preview-sec-banks'] ? 'is-open' : 'is-closed'}`}
      id="acc-fap-preview-sec-banks"
      data-section="banks"
    >
      <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-banks')}>
        <div className="fap-acc-header-left">
          <span className="fap-acc-step-badge">07</span>
          <div className="fap-acc-titles">
            <div className="fap-acc-title-row">
              <h4 className="fap-acc-title">References</h4>
              <span className={`fap-acc-badge ${(draft.bankReferences?.length || 0) > 0 ? 'success' : ''}`}>
                {draft.bankReferences?.length || 0} References
              </span>
            </div>
            <p className="fap-acc-subtitle">Existing company credit facilities, bank references, and loans</p>
          </div>
        </div>
        <div className="fap-acc-header-right">
          <button
            type="button"
            className="fap-acc-sync-btn"
            title="Sync preview document to this section"
            onClick={e => {
              e.stopPropagation();
              handleTriggerSync('fap-preview-sec-banks');
              setOpenSections(s => ({...s, ['fap-preview-sec-banks']: true}));
            }}
          >
            <Eye size={12} /> Sync View
          </button>
          <span className={`fap-acc-chevron ${openSections['fap-preview-sec-banks'] ? 'rotate' : ''}`}>
            <ChevronDown size={17} />
          </span>
        </div>
      </div>
      {openSections['fap-preview-sec-banks'] && (
        <div className="fap-accordion-content">
          <Repeater
            title="References"
            description="Existing company credit facilities, bank references, and loan obligations."
            fields={bankFields}
            rows={draft.bankReferences || []}
            disabled={!canEdit}
            carousel
            section="banks"
            targetRowIndex={targetBankRow}
            onRowChange={setTargetBankRow}
            onFieldFocus={(k, s) => handleTriggerFieldSync(k, s || `banks-${targetBankRow || 0}`)}
            onFieldSync={(k, s) => handleTriggerFieldSync(k, s || `banks-${targetBankRow || 0}`)}
            activeFieldKey={activeFieldKey}
            onChange={bankReferences => setDraft({...draft, bankReferences})}
          />

          {/* Total Monthly Installment */}
          <div
            style={{
              marginTop: 14,
              padding: '12px 16px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => handleTriggerFieldSync('totalMonthlyInstallment', 'banks')}
            title="Click to highlight Total Monthly Installment on FAP form"
          >
            <span style={{fontWeight: 600, color: '#334155', fontSize: '13px'}}>TOTAL MONTHLY INSTALLMENT</span>
            <span style={{fontWeight: 700, color: '#1e293b', fontSize: '15px'}}>
              {money(totalMonthlyInstallment)}
            </span>
          </div>

          {/* Comments Field */}
          <div style={{marginTop: 14}}>
            <label style={{display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 6}}>
              Comments
            </label>
            <CrmRichTextEditor
              id="fap-form-referenceComments"
              dataField="referenceComments"
              value={draft.referenceComments || ''}
              disabled={!canEdit}
              height={200}
              onClick={() => handleTriggerFieldSync('referenceComments', 'banks')}
              onChange={val => {
                setDraft((prev: any) => ({...prev, referenceComments: val}));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

