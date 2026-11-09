/** Customer section 01: Debtor Identity & Classification. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {calculateAgeYearsMonths} from '@/shared/lib/format';
import {Fields} from '@/shared/ui/Fields';
import {ChevronDown, Eye} from 'lucide-react';

export function DebtorIdentitySection() {
  const {
    a,
    customerCategory,
    customerDraft,
    setCustomerDraft,
    setNibOcrOpen,
    selectedCustomer,
    fapCustomerFields,
    changeCategory,
    draft,
    setDraft,
    openSections,
    setOpenSections,
    activeFieldKey,
    handleTriggerFieldSync,
    handleTriggerSync,
    toggleSection,
    liveCompanyName,
    canEditCustomerPic,
  } = useWorkspace();
  return (
    <div
      className={`fap-accordion-card ${openSections['fap-preview-sec-header'] ? 'is-open' : 'is-closed'}`}
      id="acc-fap-preview-sec-header"
    >
      <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-header')}>
        <div className="fap-acc-header-left">
          <span className="fap-acc-step-badge">01</span>
          <div className="fap-acc-titles">
            <div className="fap-acc-title-row">
              <h4 className="fap-acc-title">Debtor Identity & Classification</h4>
              <span className={`fap-acc-badge ${liveCompanyName ? 'success' : ''}`}>
                {customerCategory === 'EXISTING'
                  ? selectedCustomer
                    ? selectedCustomer.companyName
                    : 'Select Debtor'
                  : liveCompanyName || 'New Debtor'}
              </span>
            </div>
            <p className="fap-acc-subtitle">
              Customer category (Existing / New), FAP registration number, NIB, and NPWP
            </p>
          </div>
        </div>
        <div className="fap-acc-header-right">
          <button
            type="button"
            className="fap-acc-sync-btn"
            title="Sync preview document to this section"
            onClick={e => {
              e.stopPropagation();
              handleTriggerSync('fap-preview-sec-header');
              setOpenSections(s => ({...s, ['fap-preview-sec-header']: true}));
            }}
          >
            <Eye size={12} /> Sync View
          </button>
          <span className={`fap-acc-chevron ${openSections['fap-preview-sec-header'] ? 'rotate' : ''}`}>
            <ChevronDown size={17} />
          </span>
        </div>
      </div>
      {openSections['fap-preview-sec-header'] && (
        <div className="fap-accordion-content">
          <div
            className="intake-system-fields"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              padding: '12px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <div
              style={{cursor: 'pointer'}}
              onClick={() => handleTriggerFieldSync('applicationDate', 'header')}
              title="Click to sync view Tanggal/Date di formulir aplikasi"
            >
              <span style={{fontSize: '0.75rem', color: '#64748b', display: 'block'}}>Application date</span>
              <b
                style={{
                  fontSize: '0.875rem',
                  color: activeFieldKey === 'applicationDate' ? '#2563eb' : '#0f172a',
                }}
              >
                {new Date(draft.applicationDate || Date.now()).toLocaleDateString('en-GB')}
              </b>
            </div>
            <div
              style={{cursor: 'pointer'}}
              onClick={() => handleTriggerFieldSync('fapNumber', 'header')}
              title="Click to sync view No. Register FAP di formulir aplikasi"
            >
              <span style={{fontSize: '0.75rem', color: '#64748b', display: 'block'}}>
                FAP Registration Number
              </span>
              <b
                style={{
                  fontSize: '0.875rem',
                  color: activeFieldKey === 'fapNumber' ? '#2563eb' : '#0f172a',
                }}
              >
                {draft.isNew ? 'Generated automatically upon saving' : draft.fapNumber || a.fapNumber || '—'}
              </b>
            </div>
          </div>
          <div className="customer-category-selector-box" style={{marginBottom: 16, width: '100%'}}>
            <label
              className="customer-category-label"
              style={{
                display: 'block',
                fontWeight: 600,
                fontSize: '0.82rem',
                color: '#334155',
                marginBottom: 6,
              }}
              onClick={() => handleTriggerFieldSync('customerCategory', 'header')}
            >
              Customer Category
            </label>
            <select
              className="customer-category-select-input"
              value={customerCategory}
              disabled={!canEditCustomerPic || (!draft.isNew && Boolean(a.customerId || a.customer_id))}
              onFocus={() => handleTriggerFieldSync('customerCategory', 'header')}
              onChange={e => {
                changeCategory(e.target.value);
                handleTriggerFieldSync(
                  e.target.value === 'EXISTING' ? 'fap-cell-custExisting' : 'fap-cell-custNew',
                  'header',
                );
              }}
              style={{
                width: '100%',
                display: 'block',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '0.875rem',
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              <option value="EXISTING">Existing Customer</option>
              <option value="NEW">New Customer</option>
            </select>
          </div>
          <div className="new-customer-fields-block" style={{marginTop: 12}}>
            <Fields
              fields={fapCustomerFields}
              onNibOcr={canEditCustomerPic ? () => setNibOcrOpen(true) : undefined}
              value={customerDraft}
              disabled={!canEditCustomerPic}
              section="customer"
              onFieldFocus={k => handleTriggerFieldSync(k, 'customer')}
              onFieldSync={k => handleTriggerFieldSync(k, 'customer')}
              activeFieldKey={activeFieldKey}
              onChange={c => {
                setCustomerDraft(c);
                // Sync establishment deed to latestDeed and experience if no deeds in legal yet
                const legalDeeds: any[] = Array.isArray(draft.legal?.deeds) ? draft.legal.deeds : [];
                const hasLegalEstablishment = legalDeeds.some((d: any) => d.type === 'establishment');
                const hasLegalAmendment = legalDeeds.some((d: any) => d.type === 'amendment');
                const estDate = String(c.establishmentDate || '').slice(0, 10);
                const exp = calculateAgeYearsMonths(estDate);
                setDraft((prev: any) => ({
                  ...prev,
                  customer: c,
                  // If no establishment deed in legal yet, use manual input as latest
                  ...(!hasLegalAmendment && !hasLegalEstablishment
                    ? {
                        latestDeedNo: c.establishmentActNo || prev.latestDeedNo || '',
                        latestDeedDate: estDate || prev.latestDeedDate || '',
                      }
                    : {}),
                  // Experience always calculated from establishmentDate
                  ...(estDate ? {experienceYears: exp.years, experienceMonths: exp.months} : {}),
                }));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
