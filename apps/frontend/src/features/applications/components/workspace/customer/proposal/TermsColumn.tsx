/** One Terms & Conditions column: a heading, its fields, and monthly installment simulation (non-stepping). */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {TermsField} from '@/features/applications/components/workspace/customer/proposal/TermsField';
import type {TermsGroupConfig} from '@/features/applications/components/workspace/customer/proposal/terms-config';
import {parseMoney} from '@/features/applications/lib/financing-proposal';
import {Calculator, Info} from 'lucide-react';

export function TermsColumn({config}: {config: TermsGroupConfig}) {
  const {draft} = useWorkspace();
  const terms = (draft.financingProposal?.[config.group] as Record<string, string> | undefined) || {};
  const unassigned = (draft.financingProposal?.termsUnassigned as Record<string, string> | undefined) || {};
  const activeTerms = {...unassigned, ...terms};

  // Financing Value
  const rawFinancing =
    draft.financingProposal?.facilityProposed?.financingValue ||
    draft.proposal?.financingValue ||
    draft.proposal?.financing_value;
  const financingValue = parseMoney(rawFinancing);

  // Down Payment / Security Deposit
  const rawDp =
    activeTerms.downPayment ||
    activeTerms.securityDeposit ||
    draft.proposal?.downPaymentValue ||
    draft.proposal?.securityDeposit ||
    0;
  const downPayment = parseMoney(rawDp);

  // Interest Rate
  const rawRate = activeTerms.interestRate || draft.proposal?.interestRate || 0;
  const interestRate = parseMoney(rawRate);

  // Tenor (months)
  const rawTenor = activeTerms.tenor || draft.proposal?.tenorMonths || 0;
  const tenorMonths = Math.trunc(parseMoney(rawTenor));

  // Payment Timing
  const rawPaymentMethod = activeTerms.paymentMethod || draft.proposal?.paymentMethod || '';
  const isAdvance = String(rawPaymentMethod).toUpperCase().includes('ADVANCE');
  const paymentTimingLabel = isAdvance ? 'In Advance (Di Muka)' : 'In Arrear (Di Belakang)';

  // Currency
  const currency =
    activeTerms.currency ||
    draft.financingProposal?.facilityProposed?.currencyChoice ||
    draft.proposal?.currency ||
    'IDR';

  const principal = Math.max(0, financingValue - downPayment);
  let monthlyInstallment = 0;
  let totalPayment = 0;

  if (principal > 0 && tenorMonths > 0) {
    const r = (interestRate || 0) / 1200;
    if (r === 0) {
      monthlyInstallment = principal / tenorMonths;
    } else {
      const annuity = (principal * r) / (1 - Math.pow(1 + r, -tenorMonths));
      monthlyInstallment = isAdvance ? annuity / (1 + r) : annuity;
    }
    totalPayment = monthlyInstallment * tenorMonths;
  }

  const formatVal = (val: number) => {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'id-ID', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'IDR',
      maximumFractionDigits: 0,
    }).format(Math.round(val));
  };

  return (
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
      <div style={{display: 'flex', alignItems: 'center', marginBottom: '12px'}}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#002c5f',
            background: config.headerBackground,
            padding: '7px 12px',
            borderRadius: '6px',
            lineHeight: 1.3,
            width: '100%',
            minHeight: '30px',
            boxSizing: 'border-box',
          }}
        >
          {config.title || '\u00A0'}
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '12px',
          alignItems: 'end',
        }}
      >
        {config.fields.map(field => (
          <TermsField key={field.dataField} group={config.group} field={field} />
        ))}
      </div>

      {/* Monthly Installment Simulation Box (Non-Stepping) */}
      <div
        style={{
          marginTop: '16px',
          padding: '14px 16px',
          borderRadius: '8px',
          background: principal > 0 && tenorMonths > 0 ? '#f0fdf4' : '#f8fafc',
          border: principal > 0 && tenorMonths > 0 ? '1px solid #bbf7d0' : '1px dashed #cbd5e1',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <Calculator size={15} style={{color: principal > 0 && tenorMonths > 0 ? '#16a34a' : '#64748b'}} />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: principal > 0 && tenorMonths > 0 ? '#15803d' : '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Estimasi Pembayaran Bulanan / Monthly Installment
            </span>
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: principal > 0 && tenorMonths > 0 ? '#dcfce7' : '#e2e8f0',
              color: principal > 0 && tenorMonths > 0 ? '#166534' : '#64748b',
            }}
          >
            Non-Stepping (Reguler)
          </span>
        </div>

        {principal > 0 && tenorMonths > 0 ? (
          <div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px', flexWrap: 'wrap'}}>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#15803d',
                  fontFamily: 'monospace, sans-serif',
                }}
              >
                {formatVal(monthlyInstallment)}
              </span>
              <span style={{fontSize: '12px', color: '#4b5563', fontWeight: 500}}>/ bulan</span>
              {rawPaymentMethod ? (
                <span style={{fontSize: '11px', color: '#475569', marginLeft: 'auto'}}>
                  Metode: <b>{paymentTimingLabel}</b>
                </span>
              ) : (
                <span style={{fontSize: '11px', color: '#9ca3af', fontStyle: 'italic', marginLeft: 'auto'}}>
                  Cara bayar belum dipilih (default In Arrear)
                </span>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '8px',
                paddingTop: '8px',
                borderTop: '1px solid #dcfce7',
                fontSize: '11px',
                color: '#475569',
              }}
            >
              <div>
                <span style={{color: '#64748b'}}>Pokok Pembiayaan:</span>
                <div style={{fontWeight: 700, color: '#1e293b'}}>{formatVal(principal)}</div>
              </div>
              <div>
                <span style={{color: '#64748b'}}>Bunga &amp; Tenor:</span>
                <div style={{fontWeight: 700, color: '#1e293b'}}>
                  {interestRate}% p.a. · {tenorMonths} bln
                </div>
              </div>
              <div>
                <span style={{color: '#64748b'}}>Total Pembayaran:</span>
                <div style={{fontWeight: 700, color: '#1e293b'}}>{formatVal(totalPayment)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px'}}>
            <Info size={14} style={{color: '#94a3b8', flexShrink: 0}} />
            <span>
              Masukkan Nilai Pembiayaan, Uang Muka / Deposit, Bunga, dan Tenor untuk melihat simulasi angsuran
              bulanan (skema reguler non-stepping).
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
