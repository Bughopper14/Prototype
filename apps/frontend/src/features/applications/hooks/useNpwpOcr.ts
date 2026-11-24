/** NPWP scan pop-up: whether it is open and how its result is applied to the application customer draft. */
import {useState} from 'react';

export interface NpwpOcrExtract {
  npwp?: string;
  nama?: string;
  alamat?: string;
  kpp?: string;
  tanggalTerdaftar?: string;
}

export function useNpwpOcr({
  customerCategory,
  setCustomerCategory,
  setCustomerDraft,
  setDraft,
}: {
  customerCategory: string;
  setCustomerCategory: (v: string) => void;
  setCustomerDraft: (fn: (prev: any) => any) => void;
  setDraft: (fn: (prev: any) => any) => void;
}) {
  const [npwpOcrOpen, setNpwpOcrOpen] = useState(false);

  const handleApplyNpwpOcr = (extracted: NpwpOcrExtract) => {
    const npwpVal = (extracted.npwp || '').trim();
    if (npwpVal) {
      setCustomerDraft((prev: any) => ({
        ...prev,
        npwp: npwpVal,
      }));
      setDraft((prev: any) => ({
        ...prev,
        customer: {
          ...(prev.customer || {}),
          npwp: npwpVal,
        },
      }));
    }
    if (customerCategory === 'EXISTING') {
      setCustomerCategory('NEW');
    }
  };

  return {npwpOcrOpen, setNpwpOcrOpen, handleApplyNpwpOcr};
}
