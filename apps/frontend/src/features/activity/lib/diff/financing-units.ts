/** Changes found in: Financing proposal and units. */
import type {DiffContext} from '@/features/activity/lib/diff/types';
import {cleanVal, formatMoneyVal} from '@/features/activity/lib/diff/format';

export function diffFinancingUnits({beforeApp, draft, changes}: DiffContext) {
  const oldP = beforeApp.proposal || {};
  const newP = draft.proposal || {};
  const checkProp = (subSection: string, label: string, field: string, oldVal: any, newVal: any) => {
    const sOld = cleanVal(oldVal);
    const sNew = cleanVal(newVal);
    if (sOld !== sNew) {
      changes.push({
        section: 'Financing & units',
        subSection,
        field,
        label,
        oldValue: sOld || '(kosong)',
        newValue: sNew || '(kosong)',
      });
    }
  };
  if (cleanVal(oldP.financingValue) !== cleanVal(newP.financingValue)) {
    checkProp(
      'Financing Proposal',
      'Nilai Pembiayaan (Plafond)',
      'financingValue',
      formatMoneyVal(oldP.financingValue),
      formatMoneyVal(newP.financingValue),
    );
  }
  if (cleanVal(oldP.downPaymentValue) !== cleanVal(newP.downPaymentValue)) {
    checkProp(
      'Financing Proposal',
      'Nilai Uang Muka (Down Payment)',
      'downPaymentValue',
      formatMoneyVal(oldP.downPaymentValue),
      formatMoneyVal(newP.downPaymentValue),
    );
  }
  if (cleanVal(oldP.tenorMonths) !== cleanVal(newP.tenorMonths)) {
    checkProp(
      'Financing Proposal',
      'Tenor Pembiayaan',
      'tenorMonths',
      oldP.tenorMonths ? `${oldP.tenorMonths} bulan` : '(kosong)',
      newP.tenorMonths ? `${newP.tenorMonths} bulan` : '(kosong)',
    );
  }
  if (cleanVal(oldP.interestRate) !== cleanVal(newP.interestRate)) {
    checkProp(
      'Financing Proposal',
      'Suku Bunga (Interest Rate)',
      'interestRate',
      oldP.interestRate ? `${oldP.interestRate}%` : '(kosong)',
      newP.interestRate ? `${newP.interestRate}%` : '(kosong)',
    );
  }
  if (cleanVal(oldP.paymentMethod) !== cleanVal(newP.paymentMethod)) {
    checkProp(
      'Financing Proposal',
      'Metode Pembayaran',
      'paymentMethod',
      oldP.paymentMethod,
      newP.paymentMethod,
    );
  }
  const oldUnits = Array.isArray(oldP.units) ? oldP.units : [];
  const newUnits = Array.isArray(newP.units) ? newP.units : [];
  if (oldUnits.length !== newUnits.length) {
    checkProp(
      'Equipment Units',
      'Jumlah Unit Alat Berat',
      'unitCount',
      `${oldUnits.length} unit`,
      `${newUnits.length} unit`,
    );
  }
}
