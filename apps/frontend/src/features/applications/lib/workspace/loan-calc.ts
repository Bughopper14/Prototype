/** Installment of the proposed financing (annuity; paid in advance when the payment method says so). */
import type {useMasterData} from '@/shared/master-data';

export function calculateInstallment(p: any, master: ReturnType<typeof useMasterData>) {
  const principal = Number(p.financingValue) - Number(p.downPaymentValue);
  const r = Number(p.interestRate) / 1200;
  const monthly = p.tenorMonths
    ? (r
        ? (principal * r) / (1 - Math.pow(1 + r, -Number(p.tenorMonths)))
        : principal / Number(p.tenorMonths)) /
      (master.paymentMethod.find(x => x.value === p.paymentMethod)?.timing === 'advance' ? 1 + r : 1)
    : 0;
  return {principal, r, monthly};
}
