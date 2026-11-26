/** Customer section 01: Debtor Identity & Classification. */
import {GenerateFapNumberButton} from '@/features/applications/components/GenerateFapNumberButton';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {calculateAgeYearsMonths} from '@/shared/lib/format';
import {Fields} from '@/shared/ui/Fields';
import {blank, customerFields, FORM_SECTION} from '@liugong/shared';
import {ChevronDown, Eye, Search, X} from 'lucide-react';
import {useState} from 'react';
import {RequiredStar} from '@/shared/ui/RequiredStar';

export function DebtorIdentitySection() {
  const {
    a,
    customerCategory,
    customerDraft,
    setCustomerDraft,
    setNibOcrOpen,
    setNpwpOcrOpen,
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
    customers,
    customerId,
    setCustomerId,
    sanitizeCustomer,
    onChange,
    notify,
  } = useWorkspace();
  // An existing customer is chosen from the customer directory; its identity then comes from that record.
  const [query, setQuery] = useState('');
  const choosing = draft.isNew && customerCategory === 'EXISTING';
  const chosen = choosing && customerId ? customers.find((c: any) => c.id === customerId) : null;
  const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
  const matches = query.trim()
    ? customers
        .filter((c: any) => {
          const q = query.trim().toLowerCase();
          const d = digits(query);
          return (
            String(c.companyName || '').toLowerCase().includes(q) ||
            (d.length >= 3 && (digits(c.nib).includes(d) || digits(c.npwp).includes(d)))
          );
        })
        .slice(0, 8)
    : [];
  // The identity card shows the customer; the same sync as typing in it (deed number and experience follow).
  const syncCustomer = (c: any) => {
    setCustomerDraft(c);
    const legalDeeds: any[] = Array.isArray(draft.legal?.deeds) ? draft.legal.deeds : [];
    const hasLegalEstablishment = legalDeeds.some((d: any) => d.type === 'establishment');
    const hasLegalAmendment = legalDeeds.some((d: any) => d.type === 'amendment');
    const estDate = String(c.establishmentDate || '').slice(0, 10);
    const exp = calculateAgeYearsMonths(estDate);
    setDraft((prev: any) => ({
      ...prev,
      customer: c,
      // If no establishment deed in legal yet, use the registered one as latest
      ...(!hasLegalAmendment && !hasLegalEstablishment
        ? {latestDeedNo: c.establishmentActNo || prev.latestDeedNo || '', latestDeedDate: estDate || prev.latestDeedDate || ''}
        : {}),
      // Experience always calculated from establishmentDate
      ...(estDate ? {experienceYears: exp.years, experienceMonths: exp.months} : {}),
    }));
  };
  const chooseCustomer = (c: any) => {
    setCustomerId(c.id);
    setQuery('');
    syncCustomer(sanitizeCustomer(structuredClone(c)));
  };
  const clearCustomer = () => {
    setCustomerId('');
    syncCustomer(blank(customerFields));
  };
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
            <div>
              <span style={{fontSize: '0.75rem', color: '#64748b', display: 'block'}}>Application number</span>
              <b
                style={{
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                }}
              >
                {a.applicationNumber || a.application_number || draft.applicationNumber || (draft.isNew ? 'Generated on save' : '-')}
              </b>
            </div>
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
              className="intake-fap-number"
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
                {draft.fapNumber || a.fapNumber || 'Not generated yet'}
              </b>
              {!draft.isNew && !(draft.fapNumber || a.fapNumber) && (
                <span className="intake-fap-number-action" onClick={e => e.stopPropagation()}>
                  <GenerateFapNumberButton applicationId={a.id} onGenerated={onChange} notify={notify} />
                </span>
              )}
            </div>
          </div>
          <div className="customer-category-selector-box" style={{marginBottom: 16, width: '100%'}}>
            <label
              className="customer-category-label"
              style={{
                display: 'block',
                fontWeight: 700,
                fontSize: '0.82rem',
                color: '#334155',
                marginBottom: 6,
              }}
              onClick={() => handleTriggerFieldSync('customerCategory', 'header')}
            >
              Customer Category
              <RequiredStar field="customerCategory" section={FORM_SECTION.DEBTOR} />
            </label>
            <select
              className="customer-category-select-input"
              value={customerCategory}
              disabled={!canEditCustomerPic || (!draft.isNew && Boolean(a.customerId || a.customer_id))}
              onFocus={() => handleTriggerFieldSync('customerCategory', 'header')}
              onChange={e => {
                // a customer chosen for Existing is released when the category goes back to New
                if (draft.isNew && e.target.value !== 'EXISTING' && customerId) clearCustomer();
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
            {choosing && canEditCustomerPic && (
              <div style={{marginTop: 10}} data-field="existingCustomer">
                {chosen ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #2563eb',
                      background: '#eff6ff',
                      fontSize: '0.82rem',
                    }}
                  >
                    <span>
                      <strong>{chosen.companyName}</strong>
                      <span className="muted">
                        {' '}
                        · NIB {chosen.nib || '-'} · NPWP {chosen.npwp || '-'}
                      </span>
                    </span>
                    <button type="button" className="button small" onClick={clearCustomer}>
                      <X size={12} /> Change
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{position: 'relative'}}>
                      <Search size={14} style={{position: 'absolute', left: 10, top: 12, color: '#64748b'}} />
                      <input
                        type="search"
                        value={query}
                        placeholder="Search existing customer by company name, NIB or NPWP"
                        onChange={e => setQuery(e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '10px 12px 10px 32px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          fontSize: '0.875rem',
                        }}
                      />
                    </div>
                    {query.trim() && (
                      <div
                        style={{
                          marginTop: 4,
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          background: '#ffffff',
                          maxHeight: 240,
                          overflowY: 'auto',
                        }}
                      >
                        {matches.length ? (
                          matches.map((c: any) => (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => chooseCustomer(c)}
                              style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 12px',
                                border: 0,
                                borderBottom: '1px solid #f1f5f9',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                              }}
                            >
                              <strong>{c.companyName}</strong>
                              <span className="muted">
                                {' '}
                                · NIB {c.nib || '-'} · NPWP {c.npwp || '-'}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="muted" style={{padding: '10px 12px', fontSize: '0.82rem'}}>
                            No matching customer. Check the spelling or choose New Customer.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="new-customer-fields-block" style={{marginTop: 12}}>
            <Fields
              fields={fapCustomerFields}
              onNibOcr={canEditCustomerPic && !chosen ? () => setNibOcrOpen(true) : undefined}
              onNpwpOcr={canEditCustomerPic && !chosen ? () => setNpwpOcrOpen(true) : undefined}
              value={customerDraft}
              disabled={!canEditCustomerPic || !!chosen}
              section="customer"
              ruleSection={FORM_SECTION.DEBTOR}
              onFieldFocus={k => handleTriggerFieldSync(k, 'customer')}
              activeFieldKey={activeFieldKey}
              onChange={syncCustomer}
            />
          </div>
        </div>
      )}
    </div>
  );
}
