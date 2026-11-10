/** KTP photo upload and "apply OCR" for the stakeholder form. */
import {extractKtpTextFromImage} from '@/features/ocr/lib/id-documents/extract';
import {parseKtpText} from '@/features/ocr/lib/id-documents/parse-ktp';
import {ktpTextToStakeholder, mergeKtpScan} from '@/features/legal/lib/ktp-scan';

export function useKtpOcr({
  stakeholderModal,
  setStakeholderModal,
  setOcrLoading,
}: {
  stakeholderModal: any;
  setStakeholderModal: (fn: (prev: any) => any) => void;
  setOcrLoading: (v: boolean) => void;
}) {
  const handleKtpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      const dataUrl = r.result as string;
      setOcrLoading(true);
      setStakeholderModal((prev: any) => ({
        ...prev,
        value: {
          ...prev.value,
          ktpUrl: dataUrl,
          ktpFileName: f.name,
          ktpMime: f.type,
          ktpOcrText: '',
        },
      }));
      try {
        const parsed = await extractKtpTextFromImage(f, f.name);
        setStakeholderModal((prev: any) => {
          if (!prev) return prev;
          return {...prev, value: mergeKtpScan(prev.value || {}, parsed, f, dataUrl)};
        });
      } catch (err) {
        console.warn('OCR error:', err);
      } finally {
        setOcrLoading(false);
      }
    };
    r.readAsDataURL(f);
  };

  const applyOcrToForm = () => {
    if (!stakeholderModal?.value?.ktpOcrText) return;
    const parsed = parseKtpText(stakeholderModal.value.ktpOcrText);
    setStakeholderModal((prev: any) => {
      if (!prev) return prev;
      return {...prev, value: ktpTextToStakeholder(prev.value || {}, parsed)};
    });
  };

  return {handleKtpUpload, applyOcrToForm};
}
