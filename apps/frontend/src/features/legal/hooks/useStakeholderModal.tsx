/** All state, derived values and handlers of StakeholderModalDialog; shared with its sections through StakeholderModalContext. */
import type {StakeholderDocType} from '@/features/legal/lib/types';
import {
  extractKitasTextFromImage,
  extractKtpTextFromImage,
  extractNpwpTextFromImage,
  extractPassportTextFromImage,
} from '@/features/ocr/lib/id-documents/extract';
import {parseKtpText, splitPersonName} from '@/features/ocr/lib/id-documents/parse-ktp';
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
};

export function useStakeholderModal({
  modal,
  editorLocked,
  formError,
  onClose,
  onSave,
  onChangeValue,
  fields,
}: StakeholderModalDialogProps) {
  const curVal = modal.value || {};
  const isNewStakeholder = modal.index < 0;

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

  // Right pane is visible only when an ID document group (KTP - NPWP or PASSPORT - KITAS) is active
  const isRightPaneVisible = activeIdGroup === 'KTP_NPWP' || activeIdGroup === 'PASSPORT_KITAS';

  // Determine allowed document tabs based on ID Group (only 2 tabs per group)
  const allowedDocTypes: StakeholderDocType[] =
    activeIdGroup === 'PASSPORT_KITAS'
      ? ['PASSPORT', 'KITAS']
      : activeIdGroup === 'KTP_NPWP'
        ? ['KTP', 'NPWP']
        : [];

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

  // Parsed data for each doc type
  const ktpParsed: ParsedKtpData = {
    ...parseKtpText(curVal.ktpOcrText || ''),
    ...(curVal.ktpData || {}),
  };
  if (curVal.idNumber && (!ktpParsed.nik || ktpParsed.nik === '')) ktpParsed.nik = curVal.idNumber;
  if (curVal.name && (!ktpParsed.nama || ktpParsed.nama === '')) ktpParsed.nama = curVal.name;
  if (curVal.dateOfBirth && (!ktpParsed.dateOfBirth || ktpParsed.dateOfBirth === ''))
    ktpParsed.dateOfBirth = curVal.dateOfBirth;
  if (curVal.maritalStatus && curVal.maritalStatus !== 'NONE') {
    ktpParsed.maritalStatus = curVal.maritalStatus;
    ktpParsed.status = curVal.maritalStatus;
  }
  if (curVal.address && (!ktpParsed.alamat || ktpParsed.alamat === '')) ktpParsed.alamat = curVal.address;
  if (curVal.province && (!ktpParsed.province || ktpParsed.province === ''))
    ktpParsed.province = curVal.province;
  if (curVal.cityRegency && (!ktpParsed.cityRegency || ktpParsed.cityRegency === ''))
    ktpParsed.cityRegency = curVal.cityRegency;
  if (curVal.district && (!ktpParsed.kecamatan || ktpParsed.kecamatan === '')) {
    ktpParsed.kecamatan = curVal.district;
    ktpParsed.district = curVal.district;
  }
  if (curVal.village && (!ktpParsed.kelDesa || ktpParsed.kelDesa === '')) {
    ktpParsed.kelDesa = curVal.village;
    ktpParsed.village = curVal.village;
  }
  if (curVal.rt && (!ktpParsed.rt || ktpParsed.rt === '')) ktpParsed.rt = curVal.rt;
  if (curVal.rw && (!ktpParsed.rw || ktpParsed.rw === '')) ktpParsed.rw = curVal.rw;
  if ((ktpParsed.rt || ktpParsed.rw) && !ktpParsed.rtRw) {
    ktpParsed.rtRw = `${ktpParsed.rt || ''}/${ktpParsed.rw || ''}`.replace(/^\/|\/$/g, '');
  }
  if (curVal.postalCode && (!ktpParsed.kodePos || ktpParsed.kodePos === '')) {
    ktpParsed.kodePos = curVal.postalCode;
    ktpParsed.postalCode = curVal.postalCode;
  }
  if (curVal.occupation && (!ktpParsed.pekerjaan || ktpParsed.pekerjaan === ''))
    ktpParsed.pekerjaan = curVal.occupation;

  const passportParsed: ParsedPassportData = {
    ...(curVal.passportData || {}),
    rawText: curVal.passportOcrText || '',
  };
  if (curVal.idNumber && curVal.idType === 'PASSPORT' && !passportParsed.passportNumber)
    passportParsed.passportNumber = curVal.idNumber;
  if (curVal.name && !passportParsed.fullName) passportParsed.fullName = curVal.name;
  if (curVal.dateOfBirth && !passportParsed.dateOfBirth) passportParsed.dateOfBirth = curVal.dateOfBirth;

  const npwpParsed: ParsedNpwpData = {
    ...(curVal.npwpData || {}),
    rawText: curVal.npwpOcrText || '',
  };
  if (curVal.taxId && !npwpParsed.npwpNumber) npwpParsed.npwpNumber = curVal.taxId;
  if (curVal.name && !npwpParsed.nama) npwpParsed.nama = curVal.name;

  const kitasParsed: ParsedKitasData = {
    ...(curVal.kitasData || {}),
    rawText: curVal.kitasOcrText || '',
  };
  if (curVal.idNumber && curVal.idType === 'KITAS' && !kitasParsed.permitNumber)
    kitasParsed.permitNumber = curVal.idNumber;
  if (curVal.name && !kitasParsed.nama) kitasParsed.nama = curVal.name;

  const copyToClipboard = (key: string, val: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>, targetType: StakeholderDocType) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      const dataUrl = r.result as string;
      setOcrLoading(true);
      setZoom(1);
      setRotation(0);
      try {
        let nextVal = {...curVal};
        if (targetType === 'KTP') {
          const extracted = await extractKtpTextFromImage(f, f.name);
          nextVal = {
            ...nextVal,
            ktpUrl: dataUrl,
            ktpFileName: f.name,
            ktpMime: f.type,
            ktpOcrText: extracted.rawText || '',
            ktpData: extracted,
          };
          if (extracted.nik) {
            nextVal.idNumber = extracted.nik;
          }
          nextVal.idType = 'KTP_NPWP';
          if (extracted.nama) {
            nextVal.name = extracted.nama;
            nextVal.firstName = extracted.firstName || '';
            nextVal.middleName = extracted.middleName || '';
            nextVal.lastName = extracted.lastName || '';
          }
          if (extracted.dateOfBirth) {
            nextVal.dateOfBirth = extracted.dateOfBirth;
            const {years, months} = calculateAgeYearsMonths(extracted.dateOfBirth);
            nextVal.ageYears = years;
            nextVal.ageMonths = months;
          }
          if (extracted.gender) nextVal.gender = extracted.gender;
          if (extracted.maritalStatus) nextVal.maritalStatus = extracted.maritalStatus;
          if (extracted.citizenship) {
            nextVal.citizenship = extracted.citizenship === 'WNI' ? 'INDONESIAN' : 'FOREIGN';
            nextVal.nationalityType = extracted.citizenship;
          }
          if (extracted.kewarganegaraan?.includes('CHINA')) {
            nextVal.nationalityType = 'WNA';
            nextVal.citizenship = 'FOREIGN';
            nextVal.country = 'CHINA';
          }
          if (extracted.alamat) nextVal.address = extracted.alamat;
          if (extracted.province) nextVal.province = extracted.province;
          if (extracted.cityRegency || extracted.city)
            nextVal.cityRegency = extracted.cityRegency || extracted.city;
          if (extracted.kecamatan || extracted.district)
            nextVal.district = extracted.kecamatan || extracted.district;
          if (extracted.kelDesa || extracted.village)
            nextVal.village = extracted.kelDesa || extracted.village;
          if (extracted.rt) nextVal.rt = extracted.rt;
          if (extracted.rw) nextVal.rw = extracted.rw;
          if (extracted.kodePos || extracted.postalCode)
            nextVal.postalCode = extracted.kodePos || extracted.postalCode;
          if (extracted.pekerjaan) nextVal.occupation = extracted.pekerjaan;
        } else if (targetType === 'PASSPORT') {
          const extracted = await extractPassportTextFromImage(f, f.name);
          nextVal = {
            ...nextVal,
            passportUrl: dataUrl,
            passportFileName: f.name,
            passportMime: f.type,
            passportOcrText: extracted.rawText || '',
            passportData: extracted,
          };
          if (extracted.passportNumber) {
            nextVal.idNumber = extracted.passportNumber;
          }
          nextVal.idType = 'PASSPORT_KITAS';
          if (extracted.fullName || extracted.surname || extracted.givenNames) {
            nextVal.name =
              extracted.fullName || [extracted.givenNames, extracted.surname].filter(Boolean).join(' ');
            nextVal.firstName = extracted.givenNames || '';
            nextVal.lastName = extracted.surname || '';
          }
          if (extracted.dateOfBirth) {
            nextVal.dateOfBirth = extracted.dateOfBirth;
            const {years, months} = calculateAgeYearsMonths(extracted.dateOfBirth);
            nextVal.ageYears = years;
            nextVal.ageMonths = months;
          }
          if (extracted.gender) nextVal.gender = extracted.gender;
          if (extracted.countryCode || extracted.nationality) {
            const isIndo =
              extracted.countryCode === 'IDN' || extracted.nationality?.toUpperCase().includes('INDONESIA');
            nextVal.citizenship = isIndo ? 'INDONESIAN' : 'FOREIGN';
            nextVal.nationalityType = isIndo ? 'WNI' : 'WNA';
            nextVal.country = extracted.countryName || extracted.nationality || (isIndo ? 'INDONESIA' : '');
          }
        } else if (targetType === 'NPWP') {
          const extracted = await extractNpwpTextFromImage(f, f.name);
          nextVal = {
            ...nextVal,
            npwpUrl: dataUrl,
            npwpFileName: f.name,
            npwpMime: f.type,
            npwpOcrText: extracted.rawText || '',
            npwpData: extracted,
          };
          if (extracted.npwpNumber || extracted.rawNpwp) {
            nextVal.idNumberSecondary = extracted.npwpNumber || extracted.rawNpwp;
            nextVal.taxId = extracted.npwpNumber || extracted.rawNpwp;
            nextVal.npwp = extracted.npwpNumber || extracted.rawNpwp;
          }
          if (extracted.nik && !nextVal.idNumber) {
            nextVal.idNumber = extracted.nik;
          }
          nextVal.idType = 'KTP_NPWP';
          if (extracted.nama && !nextVal.name) {
            nextVal.name = extracted.nama;
            const sn = splitPersonName(extracted.nama);
            nextVal.firstName = sn.firstName;
            nextVal.middleName = sn.middleName;
            nextVal.lastName = sn.lastName;
          }
          if (extracted.alamat && !nextVal.address) nextVal.address = extracted.alamat;
          if (extracted.kotaProvinsi && !nextVal.cityRegency) nextVal.cityRegency = extracted.kotaProvinsi;
        } else if (targetType === 'KITAS') {
          const extracted = await extractKitasTextFromImage(f, f.name);
          nextVal = {
            ...nextVal,
            kitasUrl: dataUrl,
            kitasFileName: f.name,
            kitasMime: f.type,
            kitasOcrText: extracted.rawText || '',
            kitasData: extracted,
          };
          if (extracted.permitNumber || extracted.niora) {
            nextVal.idNumberSecondary = extracted.permitNumber || extracted.niora;
          }
          nextVal.idType = 'PASSPORT_KITAS';
          if (extracted.nama) {
            nextVal.name = extracted.nama;
            const sn = splitPersonName(extracted.nama);
            nextVal.firstName = sn.firstName;
            nextVal.middleName = sn.middleName;
            nextVal.lastName = sn.lastName;
          }
          if (extracted.tanggalLahir) {
            nextVal.dateOfBirth = extracted.tanggalLahir;
            const {years, months} = calculateAgeYearsMonths(extracted.tanggalLahir);
            nextVal.ageYears = years;
            nextVal.ageMonths = months;
          }
          if (extracted.gender) nextVal.gender = extracted.gender;
          if (extracted.kewarganegaraan) {
            nextVal.citizenship = 'FOREIGN';
            nextVal.nationalityType = 'WNA';
            nextVal.country = extracted.kewarganegaraan;
          }
        }
        onChangeValue(nextVal);
      } catch (err) {
        console.warn('OCR error:', err);
      } finally {
        setOcrLoading(false);
      }
    };
    r.readAsDataURL(f);
  };

  const applyDocOcrToForm = () => {
    let nextVal = {...curVal};
    if (docType === 'KTP') {
      const p = ktpParsed;
      if (p.nik) {
        nextVal.idNumber = p.nik;
      }
      nextVal.idType = 'KTP_NPWP';
      if (p.nama) {
        nextVal.name = p.nama;
        nextVal.firstName = p.firstName || '';
        nextVal.middleName = p.middleName || '';
        nextVal.lastName = p.lastName || '';
      }
      if (p.dateOfBirth) {
        nextVal.dateOfBirth = p.dateOfBirth;
        const {years, months} = calculateAgeYearsMonths(p.dateOfBirth);
        nextVal.ageYears = years;
        nextVal.ageMonths = months;
      }
      if (p.gender) nextVal.gender = p.gender;
      if (p.maritalStatus) nextVal.maritalStatus = p.maritalStatus;
      if (p.citizenship) {
        nextVal.citizenship = p.citizenship === 'WNI' ? 'INDONESIAN' : 'FOREIGN';
        nextVal.nationalityType = p.citizenship;
      }
      if (p.kewarganegaraan?.includes('CHINA')) {
        nextVal.nationalityType = 'WNA';
        nextVal.citizenship = 'FOREIGN';
        nextVal.country = 'CHINA';
      }
      if (p.alamat) nextVal.address = p.alamat;
      if (p.province) nextVal.province = p.province;
      if (p.cityRegency || p.city) nextVal.cityRegency = p.cityRegency || p.city;
      if (p.kecamatan || p.district) nextVal.district = p.kecamatan || p.district;
      if (p.kelDesa || p.village) nextVal.village = p.kelDesa || p.village;
      if (p.rt) nextVal.rt = p.rt;
      if (p.rw) nextVal.rw = p.rw;
      if (p.postalCode || p.kodePos) nextVal.postalCode = p.postalCode || p.kodePos;
      if (p.pekerjaan) nextVal.occupation = p.pekerjaan;
    } else if (docType === 'PASSPORT') {
      const p = passportParsed;
      if (p.passportNumber) {
        nextVal.idNumber = p.passportNumber;
      }
      nextVal.idType = 'PASSPORT_KITAS';
      if (p.fullName || p.surname || p.givenNames) {
        nextVal.name = p.fullName || [p.givenNames, p.surname].filter(Boolean).join(' ');
        nextVal.firstName = p.givenNames || '';
        nextVal.lastName = p.surname || '';
      }
      if (p.dateOfBirth) {
        nextVal.dateOfBirth = p.dateOfBirth;
        const {years, months} = calculateAgeYearsMonths(p.dateOfBirth);
        nextVal.ageYears = years;
        nextVal.ageMonths = months;
      }
      if (p.gender) nextVal.gender = p.gender;
      if (p.countryCode || p.nationality) {
        const isIndo = p.countryCode === 'IDN' || p.nationality?.toUpperCase().includes('INDONESIA');
        nextVal.citizenship = isIndo ? 'INDONESIAN' : 'FOREIGN';
        nextVal.nationalityType = isIndo ? 'WNI' : 'WNA';
        nextVal.country = p.countryName || p.nationality || (isIndo ? 'INDONESIA' : '');
      }
    } else if (docType === 'NPWP') {
      const p = npwpParsed;
      if (p.npwpNumber || p.rawNpwp) {
        nextVal.idNumberSecondary = p.npwpNumber || p.rawNpwp;
        nextVal.taxId = p.npwpNumber || p.rawNpwp;
        nextVal.npwp = p.npwpNumber || p.rawNpwp;
      }
      if (p.nik && !nextVal.idNumber) {
        nextVal.idNumber = p.nik;
      }
      nextVal.idType = 'KTP_NPWP';
      if (p.nama && !nextVal.name) {
        nextVal.name = p.nama;
        const sn = splitPersonName(p.nama);
        nextVal.firstName = sn.firstName;
        nextVal.middleName = sn.middleName;
        nextVal.lastName = sn.lastName;
      }
      if (p.alamat && !nextVal.address) nextVal.address = p.alamat;
      if (p.kotaProvinsi && !nextVal.cityRegency) nextVal.cityRegency = p.kotaProvinsi;
    } else if (docType === 'KITAS') {
      const p = kitasParsed;
      if (p.permitNumber || p.niora) {
        nextVal.idNumberSecondary = p.permitNumber || p.niora;
      }
      nextVal.idType = 'PASSPORT_KITAS';
      if (p.nama) {
        nextVal.name = p.nama;
        const sn = splitPersonName(p.nama);
        nextVal.firstName = sn.firstName;
        nextVal.middleName = sn.middleName;
        nextVal.lastName = sn.lastName;
      }
      if (p.tanggalLahir) {
        nextVal.dateOfBirth = p.tanggalLahir;
        const {years, months} = calculateAgeYearsMonths(p.tanggalLahir);
        nextVal.ageYears = years;
        nextVal.ageMonths = months;
      }
      if (p.gender) nextVal.gender = p.gender;
      if (p.kewarganegaraan) {
        nextVal.citizenship = 'FOREIGN';
        nextVal.nationalityType = 'WNA';
        nextVal.country = p.kewarganegaraan;
      }
    }
    onChangeValue(nextVal);
    setCopiedKey('applied_all');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRemoveDoc = () => {
    if (docType === 'KTP') {
      onChangeValue({
        ...curVal,
        ktpUrl: undefined,
        ktpFileName: undefined,
        ktpMime: undefined,
        ktpOcrText: '',
        ktpData: undefined,
      });
    } else if (docType === 'PASSPORT') {
      onChangeValue({
        ...curVal,
        passportUrl: undefined,
        passportFileName: undefined,
        passportMime: undefined,
        passportOcrText: '',
        passportData: undefined,
      });
    } else if (docType === 'NPWP') {
      onChangeValue({
        ...curVal,
        npwpUrl: undefined,
        npwpFileName: undefined,
        npwpMime: undefined,
        npwpOcrText: '',
        npwpData: undefined,
      });
    } else if (docType === 'KITAS') {
      onChangeValue({
        ...curVal,
        kitasUrl: undefined,
        kitasFileName: undefined,
        kitasMime: undefined,
        kitasOcrText: '',
        kitasData: undefined,
      });
    }
  };

  const docTitles: Record<StakeholderDocType, string> = {
    KTP: 'e-KTP (Kependudukan)',
    PASSPORT: 'Paspor (Passport Internasional)',
    NPWP: 'NPWP (Tax Identification Number)',
    KITAS: 'KITAS / ITAS (Izin Tinggal Terbatas)',
  };

  return {
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
