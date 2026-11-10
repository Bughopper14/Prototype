/** Validates and saves the Customer Detail & PIC section, then locks it and moves on to Legal. */
import {
  buildCustomerDetailBody,
  missingCustomerDetailFields,
} from '@/features/applications/lib/workspace/customer-detail';
import {api} from '@/shared/lib/api';

export function useCustomerDetailSubmit({
  a,
  draft,
  customerDraft,
  customerCategory,
  selectedCustomer,
  liveCompanyName,
  liveNib,
  liveNpwp,
  liveEstablishmentActNo,
  onChange,
  notify,
  setBusy,
  setError,
  setDraft,
  setTab,
  setCustomerDetailLocked,
}: {
  a: any;
  draft: any;
  customerDraft: any;
  customerCategory: string;
  selectedCustomer: any;
  liveCompanyName: string;
  liveNib: string;
  liveNpwp: string;
  liveEstablishmentActNo: string;
  onChange: (a: any) => void;
  notify: (s: string) => void;
  setBusy: (v: boolean) => void;
  setError: (v: string) => void;
  setDraft: (fn: (prev: any) => any) => void;
  setTab: (v: number) => void;
  setCustomerDetailLocked: (v: boolean) => void;
}) {
  async function submitCustomerDetail() {
    setError('');
    const missing = missingCustomerDetailFields(draft);
    if (missing.length > 0) {
      setError(
        `Please complete the required Customer Detail & PIC fields before submitting: ${missing.join(', ')}.`,
      );
      return;
    }

    setBusy(true);
    try {
      const body = buildCustomerDetailBody({
        draft,
        customerDraft,
        customerCategory,
        selectedCustomer,
        liveCompanyName,
        liveNib,
        liveNpwp,
        liveEstablishmentActNo,
      });
      const v = await api(`/applications/${a.id}/page-1`, 'PUT', {...body, stage: 'Pre-analysis'});
      const nextApp = {...a, ...v, customerDetailLocked: true};
      setDraft((prev: any) => ({...prev, ...nextApp, customerDetailLocked: true}));
      setCustomerDetailLocked(true);
      localStorage.setItem(`crm_locked_customer_${a.id}`, 'true');
      onChange(nextApp);
      notify('Customer details validated and locked. Switching to the Legal tab.');
      setTab(5);
    } catch (e: any) {
      setError(e.message || 'Failed to save and lock customer details.');
    } finally {
      setBusy(false);
    }
  }

  return {submitCustomerDetail};
}
