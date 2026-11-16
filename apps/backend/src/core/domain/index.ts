import Decimal from 'decimal.js';
export class Problem extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: {field: string; detail: string}[] = [],
    /** What is still missing (a list the screen can show with links), for answers that refuse an action as incomplete. */
    public missing?: {target: string; label: string; detail?: string}[],
  ) {
    super(message);
  }
}
export function ensure(ok: unknown, message: string, status = 422, field = 'application'): asserts ok {
  if (!ok) throw new Problem(status, message, [{field, detail: message}]);
}
export const money = (v: any) => new Decimal(v ?? 0);
/** Monthly installment of an annuity; paid in advance when the payment timing is ADVANCE (crm_master_payment_timings). */
export function installment(p: any, inAdvance = false) {
  const principal = money(p.financingValue).minus(p.downPaymentValue),
    rate = money(p.interestRate).div(1200);
  if (!p.tenorMonths) return null;
  if (rate.isZero()) return principal.div(p.tenorMonths).toFixed(2);
  return principal
    .times(rate)
    .div(money(1).minus(money(1).plus(rate).pow(-p.tenorMonths)))
    .div(inAdvance ? money(1).plus(rate) : 1)
    .toFixed(2);
}
export function ratios(r: any) {
  const ratio = (a: any, b: any) => (money(b).isZero() ? null : money(a).div(b).toFixed(2));
  return {
    currentRatio: ratio(r.currentAssets, r.currentLiabilities),
    debtToEquity: ratio(r.totalLiabilities, r.equity),
    netProfitMargin: money(r.revenue).isZero()
      ? null
      : money(r.netIncome).div(r.revenue).times(100).toFixed(2),
    dscr: null,
    dscrNote: 'Depreciation is not captured in FSD v1; DSCR is unavailable.',
  };
}
