/** NIB scan pop-up: whether it is open and how its result is applied to the drafts. */
import {useState} from 'react';
import {
  applyNibOcrToDraft,
  nibCustomerPatch,
  type NibOcrExtract,
} from '@/features/applications/lib/workspace/nib-ocr';
import type {useMasterData} from '@/shared/master-data';

export function useNibOcr({
  master,
  customerCategory,
  setCustomerCategory,
  setCustomerDraft,
  setDraft,
}: {
  master: ReturnType<typeof useMasterData>;
  customerCategory: string;
  setCustomerCategory: (v: string) => void;
  setCustomerDraft: (fn: (prev: any) => any) => void;
  setDraft: (fn: (prev: any) => any) => void;
}) {
  const [nibOcrOpen, setNibOcrOpen] = useState(false);

  const handleApplyNibOcr = (extracted: NibOcrExtract) => {
    const patch = nibCustomerPatch(extracted);
    if (patch) setCustomerDraft((prev: any) => ({...prev, ...patch}));
    setDraft((prev: any) => applyNibOcrToDraft(prev, extracted, master));
    if (customerCategory === 'EXISTING') {
      setCustomerCategory('NEW');
    }
  };

  return {nibOcrOpen, setNibOcrOpen, handleApplyNibOcr};
}
