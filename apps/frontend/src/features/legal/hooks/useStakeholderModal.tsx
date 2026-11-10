/** All state, derived values and handlers of StakeholderModalDialog; shared with its sections through StakeholderModalContext. */
import {applyParsedDoc, mergeExtractedDoc, withoutDoc} from '@/features/legal/lib/stakeholder-doc-ocr';
import {applyForeignAddress} from '@/features/legal/lib/stakeholder-values';
import type {StakeholderDocType} from '@/features/legal/lib/types';
import {
  extractKitasTextFromImage,
  extractKtpTextFromImage,
  extractNpwpTextFromImage,
  extractPassportTextFromImage,
} from '@/features/ocr/lib/id-documents/extract';
import {parseKtpText} from '@/features/ocr/lib/id-documents/parse-ktp';
import {
  type ParsedKitasData,
  type ParsedKtpData,
  type ParsedNpwpData,
  type ParsedPassportData,
} from '@/features/ocr/lib/id-documents/types';
import {calculateAgeYearsMonths} from '@/shared/lib/format';
import {type Field} from '@liugong/shared';
import {useEffect, useMemo, useState} from 'react';

export type StakeholderModalDialogProps = {
  modal: any;
  editorLocked: boolean;
  formError: string;
  onClose: () => void;
  onSave: () => void;
  onChangeValue: (val: any) => void;
  fields: Field[];
  /** The deed's current stakeholders, for the running total of share percentages. */
  deedStakeholders?: any[];
};

export function useStakeholderModal({
  modal,
  editorLocked,
  formError,
  onClose,
  onSave,
  onChangeValue: rawOnChangeValue,
  fields,
  deedStakeholders = [],
}: StakeholderModalDialogProps) {
  // Every change (typing, selects, OCR fills) keeps the foreign-address rule in sync.
  const onChangeValue = (val: any) => rawOnChangeValue(applyForeignAddress(val, modal.value || {}));
  const curVal = modal.value || {};
  const isNewStakeholder = modal.index < 0;

  // Running total of share percentages on this deed (other stakeholders + this one), capped at 100%
  const otherTotalShare = useMemo(
    () =>
      (Array.isArray(deedStakeholders) ? deedStakeholders : [])
        .filter((_: any, i: number) => modal.index < 0 || i !== modal.index)
        .reduce((sum: number, x: any) => sum + (parseFloat(String(x.sharePercentage || 0)) || 0), 0),
    [deedStakeholders, modal.index],
  );
  const rawInputShare =
    curVal.sharePercentage !== undefined &&
    curVal.sharePercentage !== null &&
    String(curVal.sharePercentage).trim() !== ''
      ? parseFloat(String(curVal.sharePercentage).replace(',', '.'))
      : 0;
  const currentInputShare = Number.isNaN(rawInputShare) ? 0 : rawInputShare;
  const roundedTotal = Math.round((otherTotalShare + currentInputShare) * 100) / 100;
  const roundedOther = Math.round(otherTotalShare * 100) / 100;
  const isShareExceeded = roundedTotal > 100 || currentInputShare > 100;
  const maxAvailableShare = Math.max(0, Math.round((100 - roundedOther) * 100) / 100);
  const shareCustomErrors: Record<string, string> = isShareExceeded
    ? {
        sharePercentage: `Total persentase saham pada akta ini akan menjadi ${roundedTotal.toFixed(2)}% (melebihi batas maksimal 100%). Pemegang saham lain: ${roundedOther.toFixed(2)}%. Maksimal yang dapat diinput: ${maxAvailableShare.toFixed(2)}%.`,
      }
    : {};

  const rawIdType = String(curVal.idType || '')
    .toUpperCase()
    .trim();
  const activeIdGroup: 'KTP_NPWP' | 'PASSPORT_KITAS' | 'NONE' =
    rawIdType === 'NONE'
      ? 'NONE'
      : rawIdType === 'PASSPORT_KITAS' || ['PASSPORT', 'KITAS'].includes(rawIdType)
        ? 'PASSPORT_KITAS'
        : rawIdType === 'KTP_NPWP' || ['KTP', 'NPWP'].includes(rawIdType)
          ? 'KTP_NPWP'
          : curVal.passportUrl ||
              curVal.kitasUrl ||
              curVal.nationalityType === 'WNA' ||
              curVal.citizenship === 'FOREIGN'
            ? 'PASSPORT_KITAS'
            : curVal.ktpUrl || curVal.npwpUrl
              ? 'KTP_NPWP'
              : 'NONE';

  const formValue = useMemo(() => {
    if (activeIdGroup !== 'NONE' && curVal.idType !== activeIdGroup) {
      return {...curVal, idType: activeIdGroup};
    }
    return curVal;
  }, [curVal, activeIdGroup]);

  // Apply the foreign-address rule to records opened as-is (e.g. an existing foreign stakeholder).
  useEffect(() => {
    const next = applyForeignAddress(formValue);
    if (Object.keys(next).some(k => next[k] !== formValue[k])) rawOnChangeValue(next);
  }, [formValue.citizenship, formValue.idType]);

  const [docType, setDocType] = useState<StakeholderDocType>(() => {
    if (activeIdGroup === 'PASSPORT_KITAS') {
      if (curVal.kitasUrl && !curVal.passportUrl) return 'KITAS';
      return 'PASSPORT';
    }
    if (curVal.npwpUrl && !curVal.ktpUrl) return 'NPWP';
    return 'KTP';
  });

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  // Shown in the document pane, e.g. a KITAS uploaded on the passport tab
  const [uploadError, setUploadError] = useState('');

  // Right pane is visible only when an ID document group (KTP - NPWP or PASSPORT - KITAS) is active
  const isRightPaneVisible = activeIdGroup === 'KTP_NPWP' || activeIdGroup === 'PASSPORT_KITAS';

  // Determine allowed document tabs based on ID Group (only 2 tabs per group)
  const allowedDocTypes: StakeholderDocType[] =
    activeIdGroup === 'PASSPORT_KITAS'
      ? ['PASSPORT', 'KITAS']
      : activeIdGroup === 'KTP_NPWP'
        ? ['KTP', 'NPWP']
        : [];

  // A wrong-document message belongs to the tab it appeared on
  useEffect(() => setUploadError(''), [docType]);

  // Sync docType tab whenever activeIdGroup changes (e.g. from dropdown)
  useEffect(() => {
    if (activeIdGroup === 'PASSPORT_KITAS') {
      if (docType !== 'PASSPORT' && docType !== 'KITAS') {
        setDocType('PASSPORT');
      }
    } else if (activeIdGroup === 'KTP_NPWP') {
      if (docType !== 'KTP' && docType !== 'NPWP') {
        setDocType('KTP');
      }
    }
  }, [activeIdGroup]);

  const handleSelectOption = (key: string, val: string) => {
    if (key === 'idType') {
      const upper = String(val).toUpperCase();
      if (upper === 'PASSPORT_KITAS') {
        setDocType('PASSPORT');
        onChangeValue({
          ...curVal,
          idType: 'PASSPORT_KITAS',
        });
      } else if (upper === 'KTP_NPWP') {
        setDocType('KTP');
        onChangeValue({
          ...curVal,
          idType: 'KTP_NPWP',
        });
      } else {
        onChangeValue({
          ...curVal,
          idType: 'NONE',
        });
      }
    }
  };

  const handleSelectDocTypeTab = (t: StakeholderDocType) => {
    setDocType(t);
  };

  // Auto-synchronize age whenever dateOfBirth changes
  useEffect(() => {
    if (curVal.dateOfBirth) {
      const {years, months} = calculateAgeYearsMonths(curVal.dateOfBirth);
      if (curVal.ageYears !== years || curVal.ageMonths !== months) {
        onChangeValue({
          ...curVal,
          ageYears: years,
          ageMonths: months,
        });
      }
    }
  }, [curVal.dateOfBirth]);

  // Document Assets per type
  const docAssets: Record<
    StakeholderDocType,
    {url?: string; fileName?: string; mime?: string; ocrText?: string; data?: any}
  > = {
    KTP: {
      url: curVal.ktpUrl,
      fileName: curVal.ktpFileName,
      mime: curVal.ktpMime,
      ocrText: curVal.ktpOcrText,
      data: curVal.ktpData,
    },
    PASSPORT: {
      url: curVal.passportUrl,
      fileName: curVal.passportFileName,
      mime: curVal.passportMime,
      ocrText: curVal.passportOcrText,
      data: curVal.passportData,
    },
    NPWP: {
      url: curVal.npwpUrl,
      fileName: curVal.npwpFileName,
      mime: curVal.npwpMime,
      ocrText: curVal.npwpOcrText,
      data: curVal.npwpData,
    },
    KITAS: {
      url: curVal.kitasUrl,
      fileName: curVal.kitasFileName,
      mime: curVal.kitasMime,
      ocrText: curVal.kitasOcrText,
      data: curVal.kitasData,
    },
  };

  const currentAsset = docAssets[docType];

  // What each document panel shows is only what the OCR read from that document. The form values are
  // never copied into it: "Auto-fill to Left Form" is optional and goes from here to the form, not back.
  const ktpParsed: ParsedKtpData = {
    ...parseKtpText(curVal.ktpOcrText || ''),
    ...(curVal.ktpData || {}),
  };
  if ((ktpParsed.rt || ktpParsed.rw) && !ktpParsed.rtRw) {
    ktpParsed.rtRw = `${ktpParsed.rt || ''}/${ktpParsed.rw || ''}`.replace(/^\/|\/$/g, '');
  }

  const passportParsed: ParsedPassportData = {
    ...(curVal.passportData || {}),
    rawText: curVal.passportOcrText || '',
  };

  const npwpParsed: ParsedNpwpData = {
    ...(curVal.npwpData || {}),
    rawText: curVal.npwpOcrText || '',
  };

  const kitasParsed: ParsedKitasData = {
    ...(curVal.kitasData || {}),
    rawText: curVal.kitasOcrText || '',
  };

  const copyToClipboard = (key: string, val: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>, targetType: StakeholderDocType) => {
    const input = e.target;
    const f = input.files?.[0];
    if (!f) return;
    input.value = ''; // picking the same file again must trigger onChange again
    setUploadError('');
    const r = new FileReader();
    r.onload = async () => {
      const dataUrl = r.result as string;
      setOcrLoading(true);
      setZoom(1);
      setRotation(0);
      try {
        const extract = {
          KTP: extractKtpTextFromImage,
          PASSPORT: extractPassportTextFromImage,
          NPWP: extractNpwpTextFromImage,
          KITAS: extractKitasTextFromImage,
        }[targetType];
        const extracted = await extract(f, f.name);
        onChangeValue(mergeExtractedDoc(curVal, targetType, extracted, dataUrl, f));
      } catch (err: any) {
        console.warn('OCR error:', err);
        if (err?.code === 'WRONG_DOCUMENT_TYPE') setUploadError(err.message);
      } finally {
        setOcrLoading(false);
      }
    };
    r.readAsDataURL(f);
  };

  const applyDocOcrToForm = () => {
    const parsed = {KTP: ktpParsed, PASSPORT: passportParsed, NPWP: npwpParsed, KITAS: kitasParsed}[docType];
    onChangeValue(applyParsedDoc(curVal, docType, parsed));
    setCopiedKey('applied_all');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRemoveDoc = () => {
    onChangeValue(withoutDoc(curVal, docType));
  };

  const docTitles: Record<StakeholderDocType, string> = {
    KTP: 'e-KTP (Kependudukan)',
    PASSPORT: 'Paspor (Passport Internasional)',
    NPWP: 'NPWP (Tax Identification Number)',
    KITAS: 'KITAS / ITAS (Izin Tinggal Terbatas)',
  };

  return {
    roundedTotal,
    roundedOther,
    isShareExceeded,
    maxAvailableShare,
    shareCustomErrors,
    modal,
    editorLocked,
    formError,
    onClose,
    onSave,
    onChangeValue,
    fields,
    curVal,
    isNewStakeholder,
    rawIdType,
    activeIdGroup,
    formValue,
    docType,
    setDocType,
    zoom,
    setZoom,
    rotation,
    setRotation,
    copiedKey,
    setCopiedKey,
    ocrLoading,
    setOcrLoading,
    uploadError,
    setUploadError,
    isRightPaneVisible,
    allowedDocTypes,
    handleSelectOption,
    handleSelectDocTypeTab,
    docAssets,
    currentAsset,
    ktpParsed,
    passportParsed,
    npwpParsed,
    kitasParsed,
    copyToClipboard,
    handleUploadDoc,
    applyDocOcrToForm,
    handleRemoveDoc,
    docTitles,
  };
}
