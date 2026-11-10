/** Customer section 08: Financing Proposal. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {CrmRichTextEditor} from '@/shared/ui/CrmRichTextEditor';
import {ChevronDown, Eye, FileSpreadsheet, FileText, FolderCheck} from 'lucide-react';

export function FinancingProposalSection() {
  const {
    draft,
    setDraft,
    openSections,
    setOpenSections,
    handleTriggerFieldSync,
    handleTriggerSync,
    toggleSection,
    canFinance,
  } = useWorkspace();

  const rPlan = draft.financingProposal?.realizationPlan || {};
  const lgHe = Number(rPlan.lgHe) || 0;
  const lgTruck = Number(rPlan.lgTruck) || 0;
  const lgUnit = lgHe + lgTruck;
  const nlgHe = Number(rPlan.nlgHe) || 0;
  const nlgTruck = Number(rPlan.nlgTruck) || 0;
  const nlgUnit = nlgHe + nlgTruck;
  const totHe = lgHe + nlgHe;
  const totTruck = lgTruck + nlgTruck;
  const totUnit = lgUnit + nlgUnit;

  const updatePlan = (patch: Record<string, number>) => {
    setDraft((prev: any) => ({
      ...prev,
      financingProposal: {
        ...(prev.financingProposal || {}),
        realizationPlan: {
          ...(prev.financingProposal?.realizationPlan || {}),
          ...patch,
        },
      },
    }));
  };

  return (
    <div
      className={`fap-accordion-card ${openSections['fap-preview-sec-proposal'] ? 'is-open' : 'is-closed'}`}
      id="acc-fap-preview-sec-proposal"
      data-section="proposal"
    >
      <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-proposal')}>
        <div className="fap-acc-header-left">
          <span className="fap-acc-step-badge">08</span>
          <div className="fap-acc-titles">
            <div className="fap-acc-title-row">
              <h4 className="fap-acc-title">Financing Proposal</h4>
              <span className="fap-acc-badge">
                {draft.financingProposal?.facilityProposed?.financingMethod || 'Proposal & Terms'}
              </span>
            </div>
            <p className="fap-acc-subtitle">Facility proposed structure and terms &amp; conditions</p>
          </div>
        </div>
        <div className="fap-acc-header-right">
          <button
            type="button"
            className="fap-acc-sync-btn"
            title="Sync preview document to this section"
            onClick={e => {
              e.stopPropagation();
              handleTriggerSync('fap-preview-sec-proposal');
              setOpenSections(s => ({...s, ['fap-preview-sec-proposal']: true}));
            }}
          >
            <Eye size={12} /> Sync View
          </button>
          <span className={`fap-acc-chevron ${openSections['fap-preview-sec-proposal'] ? 'rotate' : ''}`}>
            <ChevronDown size={17} />
          </span>
        </div>
      </div>
      {openSections['fap-preview-sec-proposal'] && (
        <div className="fap-accordion-content" style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
          {/* Sub-section 1: Facility Proposed */}
          <div style={{background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px'}}>
            <h5
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0f172a',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FileText size={15} style={{color: '#0284c7'}} />
              Facility Proposed
            </h5>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px'}}>
              <div className="field-group" data-field="financingMethod">
                <label className="field-label">Cara Pembiayaan / Financing Method</label>
                <input
                  type="text"
                  id="fap-form-financingMethod"
                  data-field="financingMethod"
                  className="field-input"
                  value={draft.financingProposal?.facilityProposed?.financingMethod || ''}
                  placeholder="e.g. Sewa Pembiayaan / Financial Lease"
                  disabled={!canFinance}
                  onFocus={() => handleTriggerFieldSync('financingMethod', 'proposal')}
                  onChange={e => {
                    const val = e.target.value;
                    setDraft((prev: any) => ({
                      ...prev,
                      financingProposal: {
                        ...(prev.financingProposal || {}),
                        facilityProposed: {
                          ...(prev.financingProposal?.facilityProposed || {}),
                          financingMethod: val,
                        },
                      },
                    }));
                  }}
                />
              </div>

              <div className="field-group" data-field="financingValueProp">
                <label className="field-label">Nilai Pembiayaan / Financing Value</label>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <div
                    style={{
                      display: 'inline-flex',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      overflow: 'hidden',
                      background: '#fff',
                    }}
                  >
                    {(['IDR', 'USD'] as const).map(c => {
                      const currentChoice = draft.financingProposal?.facilityProposed?.currencyChoice;
                      const isSel = currentChoice === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          data-field="currencyChoice"
                          disabled={!canFinance}
                          onClick={() => {
                            const nextVal = isSel ? '' : c;
                            setDraft((prev: any) => ({
                              ...prev,
                              financingProposal: {
                                ...(prev.financingProposal || {}),
                                facilityProposed: {
                                  ...(prev.financingProposal?.facilityProposed || {}),
                                  currencyChoice: nextVal,
                                },
                              },
                            }));
                            handleTriggerFieldSync('currencyChoice', 'proposal');
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: 'none',
                            background: isSel ? '#002c5f' : '#ffffff',
                            color: isSel ? '#ffffff' : '#64748b',
                            transition: 'all 0.15s',
                          }}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    id="fap-form-financingValueProp"
                    data-field="financingValueProp"
                    className="field-input"
                    style={{flex: 1}}
                    value={draft.financingProposal?.facilityProposed?.financingValue || ''}
                    placeholder="e.g. 1.500.000.000"
                    disabled={!canFinance}
                    onFocus={() => handleTriggerFieldSync('financingValueProp', 'proposal')}
                    onChange={e => {
                      const val = e.target.value;
                      setDraft((prev: any) => ({
                        ...prev,
                        financingProposal: {
                          ...(prev.financingProposal || {}),
                          facilityProposed: {
                            ...(prev.financingProposal?.facilityProposed || {}),
                            financingValue: val,
                          },
                        },
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="field-group" data-field="applicationSource">
                <label className="field-label">Application Source</label>
                <input
                  type="text"
                  id="fap-form-applicationSource"
                  data-field="applicationSource"
                  className="field-input"
                  value={draft.financingProposal?.facilityProposed?.applicationSource || ''}
                  placeholder="e.g. Vendor / Direct Marketing"
                  disabled={!canFinance}
                  onFocus={() => handleTriggerFieldSync('applicationSource', 'proposal')}
                  onChange={e => {
                    const val = e.target.value;
                    setDraft((prev: any) => ({
                      ...prev,
                      financingProposal: {
                        ...(prev.financingProposal || {}),
                        facilityProposed: {
                          ...(prev.financingProposal?.facilityProposed || {}),
                          applicationSource: val,
                        },
                      },
                    }));
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sub-section 2: Terms & Conditions */}
          <div>
            <h5
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0f172a',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FileText size={15} style={{color: '#0284c7'}} />
              Terms &amp; Conditions
            </h5>
            <p style={{fontSize: '12px', color: '#64748b', marginBottom: '14px'}}>
              Detail terms for Financial Lease, Sale &amp; Lease Back, and Installment Financing (all free text)
            </p>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px'}}>
              {/* 1. Sewa Pembiayaan / Financial Lease */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{minHeight: '42px', display: 'flex', alignItems: 'center', marginBottom: '14px'}}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#002c5f',
                      background: '#e0f2fe',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      lineHeight: 1.3,
                      width: '100%',
                    }}
                  >
                    Sewa Pembiayaan / Financial Lease
                  </div>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  <div className="field-group" data-field="flInvestment">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Working Capital / Investment
                    </label>
                    <input
                      type="text"
                      id="fap-form-flInvestment"
                      data-field="flInvestment"
                      className="field-input"
                      value={
                        draft.financingProposal?.termsFinancialLease?.workingCapitalInvestment ||
                        draft.financingProposal?.termsFinancialLease?.investment ||
                        ''
                      }
                      placeholder="working capital / Investment"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('flInvestment', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsFinancialLease: {
                              ...(prev.financingProposal?.termsFinancialLease || {}),
                              investment: val,
                              workingCapitalInvestment: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="field-group" data-field="flCurrency">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Mata Uang / Currency
                    </label>
                    <input
                      type="text"
                      id="fap-form-flCurrency"
                      data-field="flCurrency"
                      className="field-input"
                      value={draft.financingProposal?.termsFinancialLease?.currency || ''}
                      placeholder="e.g. IDR"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('flCurrency', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsFinancialLease: {
                              ...(prev.financingProposal?.termsFinancialLease || {}),
                              currency: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="field-group" data-field="flDeposit">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Simpanan Jaminan / Security Deposit
                    </label>
                    <input
                      type="text"
                      id="fap-form-flDeposit"
                      data-field="flDeposit"
                      className="field-input"
                      value={draft.financingProposal?.termsFinancialLease?.securityDeposit || ''}
                      placeholder="e.g. 20%"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('flDeposit', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsFinancialLease: {
                              ...(prev.financingProposal?.termsFinancialLease || {}),
                              securityDeposit: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="field-group" data-field="flRate">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Bunga / Interest Rate
                    </label>
                    <input
                      type="text"
                      id="fap-form-flRate"
                      data-field="flRate"
                      className="field-input"
                      value={draft.financingProposal?.termsFinancialLease?.interestRate || ''}
                      placeholder="e.g. 11.5% Flat"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('flRate', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsFinancialLease: {
                              ...(prev.financingProposal?.termsFinancialLease || {}),
                              interestRate: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="field-group" data-field="flTenor">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Jk. Waktu / Tenor
                    </label>
                    <input
                      type="text"
                      id="fap-form-flTenor"
                      data-field="flTenor"
                      className="field-input"
                      value={draft.financingProposal?.termsFinancialLease?.tenor || ''}
                      placeholder="e.g. 36 Bulan"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('flTenor', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsFinancialLease: {
                              ...(prev.financingProposal?.termsFinancialLease || {}),
                              tenor: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="field-group" data-field="flPayment">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Cara Pembayaran / Payment Method
                    </label>
                    <input
                      type="text"
                      id="fap-form-flPayment"
                      data-field="flPayment"
                      className="field-input"
                      value={draft.financingProposal?.termsFinancialLease?.paymentMethod || ''}
                      placeholder="e.g. In Arrear"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('flPayment', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsFinancialLease: {
                              ...(prev.financingProposal?.termsFinancialLease || {}),
                              paymentMethod: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Jual dan Sewa Kembali / Sale and Lease Back */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{minHeight: '42px', display: 'flex', alignItems: 'center', marginBottom: '14px'}}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#002c5f',
                      background: '#f1f5f9',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      lineHeight: 1.3,
                      width: '100%',
                    }}
                  >
                    Jual dan Sewa Kembali / Sale and Lease Back
                  </div>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  <div className="field-group" data-field="slbPurpose">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Working Capital / Investment
                    </label>
                    <input
                      type="text"
                      id="fap-form-slbPurpose"
                      data-field="slbPurpose"
                      className="field-input"
                      value={draft.financingProposal?.termsSaleAndLeaseBack?.workingCapitalInvestment || ''}
                      placeholder="working capital / Investment"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('slbPurpose', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsSaleAndLeaseBack: {
                              ...(prev.financingProposal?.termsSaleAndLeaseBack || {}),
                              workingCapitalInvestment: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="field-group" data-field="slbCurrency">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Mata Uang / Currency
                    </label>
                    <input
                      type="text"
                      id="fap-form-slbCurrency"
                      data-field="slbCurrency"
                      className="field-input"
                      value={draft.financingProposal?.termsSaleAndLeaseBack?.currency || ''}
                      placeholder="e.g. IDR"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('slbCurrency', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsSaleAndLeaseBack: {
                              ...(prev.financingProposal?.termsSaleAndLeaseBack || {}),
                              currency: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="field-group" data-field="slbDeposit">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Simpanan Jaminan / Security Deposit
                    </label>
                    <input
                      type="text"
                      id="fap-form-slbDeposit"
                      data-field="slbDeposit"
                      className="field-input"
                      value={draft.financingProposal?.termsSaleAndLeaseBack?.securityDeposit || ''}
                      placeholder="e.g. 20%"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('slbDeposit', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsSaleAndLeaseBack: {
                              ...(prev.financingProposal?.termsSaleAndLeaseBack || {}),
                              securityDeposit: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="field-group" data-field="slbRate">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Bunga / Interest Rate
                    </label>
                    <input
                      type="text"
                      id="fap-form-slbRate"
                      data-field="slbRate"
                      className="field-input"
                      value={draft.financingProposal?.termsSaleAndLeaseBack?.interestRate || ''}
                      placeholder="e.g. 12% Flat"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('slbRate', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsSaleAndLeaseBack: {
                              ...(prev.financingProposal?.termsSaleAndLeaseBack || {}),
                              interestRate: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="field-group" data-field="slbTenor">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Jk. Waktu / Tenor
                    </label>
                    <input
                      type="text"
                      id="fap-form-slbTenor"
                      data-field="slbTenor"
                      className="field-input"
                      value={draft.financingProposal?.termsSaleAndLeaseBack?.tenor || ''}
                      placeholder="e.g. 24 Bulan"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('slbTenor', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsSaleAndLeaseBack: {
                              ...(prev.financingProposal?.termsSaleAndLeaseBack || {}),
                              tenor: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="field-group" data-field="slbPayment">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Cara Pembayaran / Payment Method
                    </label>
                    <input
                      type="text"
                      id="fap-form-slbPayment"
                      data-field="slbPayment"
                      className="field-input"
                      value={draft.financingProposal?.termsSaleAndLeaseBack?.paymentMethod || ''}
                      placeholder="e.g. In Arrear"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('slbPayment', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsSaleAndLeaseBack: {
                              ...(prev.financingProposal?.termsSaleAndLeaseBack || {}),
                              paymentMethod: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Pembelian dengan Pembayaran Angsuran / Installment Financing */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{minHeight: '42px', display: 'flex', alignItems: 'center', marginBottom: '14px'}}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#002c5f',
                      background: '#f1f5f9',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      lineHeight: 1.3,
                      width: '100%',
                    }}
                  >
                    Pembelian dg Angsuran / Installment Financing
                  </div>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  <div className="field-group" data-field="ifPurpose">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Working Capital / Investment
                    </label>
                    <input
                      type="text"
                      id="fap-form-ifPurpose"
                      data-field="ifPurpose"
                      className="field-input"
                      value={draft.financingProposal?.termsInstallmentFinancing?.workingCapitalInvestment || ''}
                      placeholder="working capital / Investment"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('ifPurpose', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsInstallmentFinancing: {
                              ...(prev.financingProposal?.termsInstallmentFinancing || {}),
                              workingCapitalInvestment: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="field-group" data-field="ifCurrency">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Mata Uang / Currency
                    </label>
                    <input
                      type="text"
                      id="fap-form-ifCurrency"
                      data-field="ifCurrency"
                      className="field-input"
                      value={draft.financingProposal?.termsInstallmentFinancing?.currency || ''}
                      placeholder="e.g. IDR"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('ifCurrency', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsInstallmentFinancing: {
                              ...(prev.financingProposal?.termsInstallmentFinancing || {}),
                              currency: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="field-group" data-field="ifDownPayment">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Uang Muka / Down Payment
                    </label>
                    <input
                      type="text"
                      id="fap-form-ifDownPayment"
                      data-field="ifDownPayment"
                      className="field-input"
                      value={draft.financingProposal?.termsInstallmentFinancing?.downPayment || ''}
                      placeholder="e.g. 25%"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('ifDownPayment', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsInstallmentFinancing: {
                              ...(prev.financingProposal?.termsInstallmentFinancing || {}),
                              downPayment: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="field-group" data-field="ifRate">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Bunga / Interest Rate
                    </label>
                    <input
                      type="text"
                      id="fap-form-ifRate"
                      data-field="ifRate"
                      className="field-input"
                      value={draft.financingProposal?.termsInstallmentFinancing?.interestRate || ''}
                      placeholder="e.g. 11% Flat"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('ifRate', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsInstallmentFinancing: {
                              ...(prev.financingProposal?.termsInstallmentFinancing || {}),
                              interestRate: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="field-group" data-field="ifTenor">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Jk. Waktu / Tenor
                    </label>
                    <input
                      type="text"
                      id="fap-form-ifTenor"
                      data-field="ifTenor"
                      className="field-input"
                      value={draft.financingProposal?.termsInstallmentFinancing?.tenor || ''}
                      placeholder="e.g. 36 Bulan"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('ifTenor', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsInstallmentFinancing: {
                              ...(prev.financingProposal?.termsInstallmentFinancing || {}),
                              tenor: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="field-group" data-field="ifPayment">
                    <label
                      className="field-label"
                      style={{
                        fontSize: '11px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        lineHeight: 1.25,
                        marginBottom: '4px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      Cara Pembayaran / Payment Method
                    </label>
                    <input
                      type="text"
                      id="fap-form-ifPayment"
                      data-field="ifPayment"
                      className="field-input"
                      value={draft.financingProposal?.termsInstallmentFinancing?.paymentMethod || ''}
                      placeholder="e.g. In Arrear"
                      disabled={!canFinance}
                      onFocus={() => handleTriggerFieldSync('ifPayment', 'proposal')}
                      onChange={e => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            termsInstallmentFinancing: {
                              ...(prev.financingProposal?.termsInstallmentFinancing || {}),
                              paymentMethod: val,
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-section 3: Unit Realization Plan */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <h5
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0f172a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <FileSpreadsheet size={15} style={{color: '#0284c7'}} />
                  Rencana Realisasi Unit / Unit Realization Plan
                </h5>
                <p style={{fontSize: '12px', color: '#64748b'}}>
                  Summary of units to be realized by brand and equipment type
                </p>
              </div>
            </div>

            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.82rem'}}>
                <thead>
                  <tr style={{background: '#f1f5f9', borderBottom: '1.5pt solid #cbd5e1'}}>
                    <th style={{padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#334155'}}>Brand</th>
                    <th style={{padding: '8px 10px', fontWeight: 700, color: '#334155', width: 110}}>HE</th>
                    <th style={{padding: '8px 10px', fontWeight: 700, color: '#334155', width: 110}}>Truck</th>
                    <th style={{padding: '8px 10px', fontWeight: 700, color: '#334155', width: 110, background: '#e2e8f0'}}>
                      Unit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Liugong */}
                  <tr style={{borderBottom: '1px solid #e2e8f0'}}>
                    <td style={{padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#1d4ed8'}}>Liugong</td>
                    <td style={{padding: '4px'}} data-field="propAssetLgHe">
                      <input
                        type="number"
                        min="0"
                        id="fap-form-propAssetLgHe"
                        data-field="propAssetLgHe"
                        className="input-field"
                        style={{width: '100%', textAlign: 'center', padding: '5px 2px', fontSize: '0.85rem'}}
                        disabled={!canFinance}
                        value={rPlan.lgHe ?? 0}
                        onFocus={() => handleTriggerFieldSync('propAssetLgHe', 'proposal')}
                        onChange={e => updatePlan({lgHe: parseInt(e.target.value, 10) || 0})}
                      />
                    </td>
                    <td style={{padding: '4px'}} data-field="propAssetLgTruck">
                      <input
                        type="number"
                        min="0"
                        id="fap-form-propAssetLgTruck"
                        data-field="propAssetLgTruck"
                        className="input-field"
                        style={{width: '100%', textAlign: 'center', padding: '5px 2px', fontSize: '0.85rem'}}
                        disabled={!canFinance}
                        value={rPlan.lgTruck ?? 0}
                        onFocus={() => handleTriggerFieldSync('propAssetLgTruck', 'proposal')}
                        onChange={e => updatePlan({lgTruck: parseInt(e.target.value, 10) || 0})}
                      />
                    </td>
                    <td
                      id="fap-form-propAssetLgUnit"
                      data-field="propAssetLgUnit"
                      onClick={() => handleTriggerFieldSync('propAssetLgUnit', 'proposal')}
                      style={{padding: '8px 10px', fontWeight: 700, background: '#f8fafc', color: '#0f172a', cursor: 'pointer'}}
                      title="Click to highlight in FAP preview"
                    >
                      {lgUnit}
                    </td>
                  </tr>

                  {/* Non Liugong */}
                  <tr style={{borderBottom: '1px solid #e2e8f0'}}>
                    <td style={{padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569'}}>
                      Non Liugong
                    </td>
                    <td style={{padding: '4px'}} data-field="propAssetNlgHe">
                      <input
                        type="number"
                        min="0"
                        id="fap-form-propAssetNlgHe"
                        data-field="propAssetNlgHe"
                        className="input-field"
                        style={{width: '100%', textAlign: 'center', padding: '5px 2px', fontSize: '0.85rem'}}
                        disabled={!canFinance}
                        value={rPlan.nlgHe ?? 0}
                        onFocus={() => handleTriggerFieldSync('propAssetNlgHe', 'proposal')}
                        onChange={e => updatePlan({nlgHe: parseInt(e.target.value, 10) || 0})}
                      />
                    </td>
                    <td style={{padding: '4px'}} data-field="propAssetNlgTruck">
                      <input
                        type="number"
                        min="0"
                        id="fap-form-propAssetNlgTruck"
                        data-field="propAssetNlgTruck"
                        className="input-field"
                        style={{width: '100%', textAlign: 'center', padding: '5px 2px', fontSize: '0.85rem'}}
                        disabled={!canFinance}
                        value={rPlan.nlgTruck ?? 0}
                        onFocus={() => handleTriggerFieldSync('propAssetNlgTruck', 'proposal')}
                        onChange={e => updatePlan({nlgTruck: parseInt(e.target.value, 10) || 0})}
                      />
                    </td>
                    <td
                      id="fap-form-propAssetNlgUnit"
                      data-field="propAssetNlgUnit"
                      onClick={() => handleTriggerFieldSync('propAssetNlgUnit', 'proposal')}
                      style={{padding: '8px 10px', fontWeight: 700, background: '#f8fafc', color: '#0f172a', cursor: 'pointer'}}
                      title="Click to highlight in FAP preview"
                    >
                      {nlgUnit}
                    </td>
                  </tr>

                  {/* Total Row */}
                  <tr style={{background: '#f1f5f9', fontWeight: 800, borderTop: '1.5pt solid #cbd5e1'}}>
                    <td style={{padding: '8px 10px', textAlign: 'left', color: '#0f172a'}}>Total</td>
                    <td style={{padding: '8px 10px', color: '#0f172a'}}>{totHe}</td>
                    <td style={{padding: '8px 10px', color: '#0f172a'}}>{totTruck}</td>
                    <td
                      id="fap-form-propAssetTotUnit"
                      data-field="propAssetTotUnit"
                      onClick={() => handleTriggerFieldSync('propAssetTotUnit', 'proposal')}
                      style={{padding: '8px 10px', color: '#0f172a', background: '#e2e8f0', cursor: 'pointer'}}
                      title="Click to highlight in FAP preview"
                    >
                      {totUnit}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sub-section 4: Notes (TinyMCE) */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
            }}
            data-field="proposalNotes"
            onClick={() => handleTriggerFieldSync('proposalNotes', 'proposal')}
          >
            <h5
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0f172a',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FileText size={15} style={{color: '#0284c7'}} />
              Notes
            </h5>
            <p style={{fontSize: '12px', color: '#64748b', marginBottom: '12px'}}>
              Additional notes or specific terms for this financing application proposal
            </p>
            <div
              id="fap-form-proposalNotes"
              data-field="proposalNotes"
              onFocus={() => handleTriggerFieldSync('proposalNotes', 'proposal')}
              onClick={() => handleTriggerFieldSync('proposalNotes', 'proposal')}
            >
              <CrmRichTextEditor
                id="fap-form-proposalNotes"
                dataField="proposalNotes"
                value={draft.financingProposal?.notes || ''}
                disabled={!canFinance}
                height={220}
                onClick={() => handleTriggerFieldSync('proposalNotes', 'proposal')}
                onChange={content => {
                  setDraft((prev: any) => ({
                    ...prev,
                    financingProposal: {
                      ...(prev.financingProposal || {}),
                      notes: content,
                    },
                  }));
                }}
              />
            </div>
          </div>

          {/* Sub-section 5: Document Requirements */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h5
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0f172a',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FolderCheck size={15} style={{color: '#0284c7'}} />
              Persyaratan Dokumen / Document Requirement
            </h5>
            <p style={{fontSize: '12px', color: '#64748b', marginBottom: '14px'}}>
              Checklist required submission documents. Checking an item synchronizes checkmark (✓) to the physical FAP sheet.
            </p>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px'}}>
              {[
                {key: 'companyProfile', label: 'Company Profile', field: 'docReqCompanyProfile'},
                {key: 'legality', label: 'Legality (e.g. NIB, SIUJK, SIUP, etc)', field: 'docReqLegality'},
                {key: 'deedEstablishment', label: 'Deed establishment & Deed Amendments', field: 'docReqDeed'},
                {key: 'decreeMinistryOfLaw', label: 'Decree of the ministry of law', field: 'docReqDecree'},
                {key: 'copyIdBodShareholder', label: 'Copy of ID, BOD, and Shareholder', field: 'docReqCopyId'},
                {key: 'auditedFinancialStatements', label: 'Audited Financial Statements', field: 'docReqAuditedFin'},
                {key: 'bankStatements', label: 'Bank Statements', field: 'docReqBankStatements'},
                {key: 'bankFinancingFacility', label: 'Bank or Financing Facility', field: 'docReqBankFacility'},
                {key: 'productionReport', label: 'Production report', field: 'docReqProductionReport'},
                {key: 'listOfFixedAssets', label: 'List of fixed assets', field: 'docReqFixedAssets'},
                {key: 'projectContracts', label: 'Project Contracts', field: 'docReqProjectContracts'},
              ].map(docItem => {
                const docReq = draft.financingProposal?.documentRequirements || {};
                const isChecked = !!docReq[docItem.key];
                return (
                  <label
                    key={docItem.key}
                    id={`fap-form-${docItem.field}`}
                    data-field={docItem.field}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: isChecked ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                      background: isChecked ? '#eff6ff' : '#f8fafc',
                      cursor: canFinance ? 'pointer' : 'default',
                      transition: 'all 0.15s ease',
                    }}
                    onFocus={() => handleTriggerFieldSync(docItem.field, 'proposal')}
                    onClick={() => handleTriggerFieldSync(docItem.field, 'proposal')}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!canFinance}
                      style={{marginTop: '2px', cursor: canFinance ? 'pointer' : 'default'}}
                      onChange={e => {
                        const checked = e.target.checked;
                        setDraft((prev: any) => ({
                          ...prev,
                          financingProposal: {
                            ...(prev.financingProposal || {}),
                            documentRequirements: {
                              ...(prev.financingProposal?.documentRequirements || {}),
                              [docItem.key]: checked,
                            },
                          },
                        }));
                        handleTriggerFieldSync(docItem.field, 'proposal');
                      }}
                    />
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: isChecked ? 600 : 500,
                        color: isChecked ? '#1e40af' : '#334155',
                        lineHeight: 1.4,
                      }}
                    >
                      {docItem.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

