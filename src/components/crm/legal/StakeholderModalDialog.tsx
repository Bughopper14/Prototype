import {useEffect, useState, useMemo} from 'react';
import {Copy, Sparkles, Check, Upload, RotateCw, ZoomIn, ZoomOut, Save, Trash2} from 'lucide-react';
import {parseKtpText, extractKtpTextFromImage, extractPassportTextFromImage, extractNpwpTextFromImage, extractKitasTextFromImage, splitPersonName, type ParsedKtpData, type ParsedPassportData, type ParsedNpwpData, type ParsedKitasData} from '@/lib/crm/ktp-ocr';
import {type Field, label} from '@/lib/shared/fields';
import {calculateAgeYearsMonths} from '@/lib/crm/format';
import {Fields, Modal} from '@/components/crm/common/ui';

export type StakeholderDocType = 'KTP' | 'PASSPORT' | 'NPWP' | 'KITAS';

export function StakeholderModalDialog({
  modal,
  editorLocked,
  formError,
  onClose,
  onSave,
  onChangeValue,
  fields
}: {
  modal: any;
  editorLocked: boolean;
  formError: string;
  onClose: () => void;
  onSave: () => void;
  onChangeValue: (val: any) => void;
  fields: Field[];
}) {
  const curVal = modal.value || {};
  const isNewStakeholder = modal.index < 0;

  const rawIdType = String(curVal.idType || '').toUpperCase().trim();
  const activeIdGroup: 'KTP_NPWP' | 'PASSPORT_KITAS' | 'NONE' = 
    rawIdType === 'NONE'
      ? 'NONE'
      : rawIdType === 'PASSPORT_KITAS' || ['PASSPORT', 'KITAS'].includes(rawIdType)
      ? 'PASSPORT_KITAS'
      : rawIdType === 'KTP_NPWP' || ['KTP', 'NPWP'].includes(rawIdType)
      ? 'KTP_NPWP'
      : curVal.passportUrl || curVal.kitasUrl || curVal.nationalityType === 'WNA' || curVal.citizenship === 'FOREIGN'
      ? 'PASSPORT_KITAS'
      : curVal.ktpUrl || curVal.npwpUrl
      ? 'KTP_NPWP'
      : 'NONE';

  const formValue = useMemo(() => {
    if (activeIdGroup !== 'NONE' && curVal.idType !== activeIdGroup) {
      return { ...curVal, idType: activeIdGroup };
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
  const allowedDocTypes: StakeholderDocType[] = activeIdGroup === 'PASSPORT_KITAS'
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
          idType: 'PASSPORT_KITAS'
        });
      } else if (upper === 'KTP_NPWP') {
        setDocType('KTP');
        onChangeValue({
          ...curVal,
          idType: 'KTP_NPWP'
        });
      } else {
        onChangeValue({
          ...curVal,
          idType: 'NONE'
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
      const { years, months } = calculateAgeYearsMonths(curVal.dateOfBirth);
      if (curVal.ageYears !== years || curVal.ageMonths !== months) {
        onChangeValue({
          ...curVal,
          ageYears: years,
          ageMonths: months
        });
      }
    }
  }, [curVal.dateOfBirth]);

  // Document Assets per type
  const docAssets: Record<StakeholderDocType, { url?: string; fileName?: string; mime?: string; ocrText?: string; data?: any }> = {
    KTP: { url: curVal.ktpUrl, fileName: curVal.ktpFileName, mime: curVal.ktpMime, ocrText: curVal.ktpOcrText, data: curVal.ktpData },
    PASSPORT: { url: curVal.passportUrl, fileName: curVal.passportFileName, mime: curVal.passportMime, ocrText: curVal.passportOcrText, data: curVal.passportData },
    NPWP: { url: curVal.npwpUrl, fileName: curVal.npwpFileName, mime: curVal.npwpMime, ocrText: curVal.npwpOcrText, data: curVal.npwpData },
    KITAS: { url: curVal.kitasUrl, fileName: curVal.kitasFileName, mime: curVal.kitasMime, ocrText: curVal.kitasOcrText, data: curVal.kitasData }
  };

  const currentAsset = docAssets[docType];

  // Parsed data for each doc type
  const ktpParsed: ParsedKtpData = {
    ...parseKtpText(curVal.ktpOcrText || ''),
    ...(curVal.ktpData || {})
  };
  if (curVal.idNumber && (!ktpParsed.nik || ktpParsed.nik === '')) ktpParsed.nik = curVal.idNumber;
  if (curVal.name && (!ktpParsed.nama || ktpParsed.nama === '')) ktpParsed.nama = curVal.name;
  if (curVal.dateOfBirth && (!ktpParsed.dateOfBirth || ktpParsed.dateOfBirth === '')) ktpParsed.dateOfBirth = curVal.dateOfBirth;
  if (curVal.maritalStatus && curVal.maritalStatus !== 'NONE') {
    ktpParsed.maritalStatus = curVal.maritalStatus;
    ktpParsed.status = curVal.maritalStatus;
  }
  if (curVal.address && (!ktpParsed.alamat || ktpParsed.alamat === '')) ktpParsed.alamat = curVal.address;
  if (curVal.province && (!ktpParsed.province || ktpParsed.province === '')) ktpParsed.province = curVal.province;
  if (curVal.cityRegency && (!ktpParsed.cityRegency || ktpParsed.cityRegency === '')) ktpParsed.cityRegency = curVal.cityRegency;
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
  if (curVal.occupation && (!ktpParsed.pekerjaan || ktpParsed.pekerjaan === '')) ktpParsed.pekerjaan = curVal.occupation;

  const passportParsed: ParsedPassportData = {
    ...(curVal.passportData || {}),
    rawText: curVal.passportOcrText || ''
  };
  if (curVal.idNumber && curVal.idType === 'PASSPORT' && !passportParsed.passportNumber) passportParsed.passportNumber = curVal.idNumber;
  if (curVal.name && !passportParsed.fullName) passportParsed.fullName = curVal.name;
  if (curVal.dateOfBirth && !passportParsed.dateOfBirth) passportParsed.dateOfBirth = curVal.dateOfBirth;

  const npwpParsed: ParsedNpwpData = {
    ...(curVal.npwpData || {}),
    rawText: curVal.npwpOcrText || ''
  };
  if (curVal.taxId && !npwpParsed.npwpNumber) npwpParsed.npwpNumber = curVal.taxId;
  if (curVal.name && !npwpParsed.nama) npwpParsed.nama = curVal.name;

  const kitasParsed: ParsedKitasData = {
    ...(curVal.kitasData || {}),
    rawText: curVal.kitasOcrText || ''
  };
  if (curVal.idNumber && curVal.idType === 'KITAS' && !kitasParsed.permitNumber) kitasParsed.permitNumber = curVal.idNumber;
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
        let nextVal = { ...curVal };
        if (targetType === 'KTP') {
          const extracted = await extractKtpTextFromImage(f, f.name);
          nextVal = {
            ...nextVal,
            ktpUrl: dataUrl,
            ktpFileName: f.name,
            ktpMime: f.type,
            ktpOcrText: extracted.rawText || '',
            ktpData: extracted
          };
          if (extracted.nik) { nextVal.idNumber = extracted.nik; }
          nextVal.idType = 'KTP_NPWP';
          if (extracted.nama) {
            nextVal.name = extracted.nama;
            nextVal.firstName = extracted.firstName || '';
            nextVal.middleName = extracted.middleName || '';
            nextVal.lastName = extracted.lastName || '';
          }
          if (extracted.dateOfBirth) {
            nextVal.dateOfBirth = extracted.dateOfBirth;
            const { years, months } = calculateAgeYearsMonths(extracted.dateOfBirth);
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
          if (extracted.cityRegency || extracted.city) nextVal.cityRegency = extracted.cityRegency || extracted.city;
          if (extracted.kecamatan || extracted.district) nextVal.district = extracted.kecamatan || extracted.district;
          if (extracted.kelDesa || extracted.village) nextVal.village = extracted.kelDesa || extracted.village;
          if (extracted.rt) nextVal.rt = extracted.rt;
          if (extracted.rw) nextVal.rw = extracted.rw;
          if (extracted.kodePos || extracted.postalCode) nextVal.postalCode = extracted.kodePos || extracted.postalCode;
          if (extracted.pekerjaan) nextVal.occupation = extracted.pekerjaan;
        } else if (targetType === 'PASSPORT') {
          const extracted = await extractPassportTextFromImage(f, f.name);
          nextVal = {
            ...nextVal,
            passportUrl: dataUrl,
            passportFileName: f.name,
            passportMime: f.type,
            passportOcrText: extracted.rawText || '',
            passportData: extracted
          };
          if (extracted.passportNumber) {
            nextVal.idNumber = extracted.passportNumber;
          }
          nextVal.idType = 'PASSPORT_KITAS';
          if (extracted.fullName || extracted.surname || extracted.givenNames) {
            nextVal.name = extracted.fullName || [extracted.givenNames, extracted.surname].filter(Boolean).join(' ');
            nextVal.firstName = extracted.givenNames || '';
            nextVal.lastName = extracted.surname || '';
          }
          if (extracted.dateOfBirth) {
            nextVal.dateOfBirth = extracted.dateOfBirth;
            const { years, months } = calculateAgeYearsMonths(extracted.dateOfBirth);
            nextVal.ageYears = years;
            nextVal.ageMonths = months;
          }
          if (extracted.gender) nextVal.gender = extracted.gender;
          if (extracted.countryCode || extracted.nationality) {
            const isIndo = extracted.countryCode === 'IDN' || extracted.nationality?.toUpperCase().includes('INDONESIA');
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
            npwpData: extracted
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
            kitasData: extracted
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
            const { years, months } = calculateAgeYearsMonths(extracted.tanggalLahir);
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
    let nextVal = { ...curVal };
    if (docType === 'KTP') {
      const p = ktpParsed;
      if (p.nik) { nextVal.idNumber = p.nik; }
      nextVal.idType = 'KTP_NPWP';
      if (p.nama) {
        nextVal.name = p.nama;
        nextVal.firstName = p.firstName || '';
        nextVal.middleName = p.middleName || '';
        nextVal.lastName = p.lastName || '';
      }
      if (p.dateOfBirth) {
        nextVal.dateOfBirth = p.dateOfBirth;
        const { years, months } = calculateAgeYearsMonths(p.dateOfBirth);
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
        const { years, months } = calculateAgeYearsMonths(p.dateOfBirth);
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
        const { years, months } = calculateAgeYearsMonths(p.tanggalLahir);
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
      onChangeValue({ ...curVal, ktpUrl: undefined, ktpFileName: undefined, ktpMime: undefined, ktpOcrText: '', ktpData: undefined });
    } else if (docType === 'PASSPORT') {
      onChangeValue({ ...curVal, passportUrl: undefined, passportFileName: undefined, passportMime: undefined, passportOcrText: '', passportData: undefined });
    } else if (docType === 'NPWP') {
      onChangeValue({ ...curVal, npwpUrl: undefined, npwpFileName: undefined, npwpMime: undefined, npwpOcrText: '', npwpData: undefined });
    } else if (docType === 'KITAS') {
      onChangeValue({ ...curVal, kitasUrl: undefined, kitasFileName: undefined, kitasMime: undefined, kitasOcrText: '', kitasData: undefined });
    }
  };

  const docTitles: Record<StakeholderDocType, string> = {
    KTP: 'e-KTP (Kependudukan)',
    PASSPORT: 'Paspor (Passport Internasional)',
    NPWP: 'NPWP (Tax Identification Number)',
    KITAS: 'KITAS / ITAS (Izin Tinggal Terbatas)'
  };

  return (
    <Modal
      title={
        !isRightPaneVisible
          ? (isNewStakeholder ? 'Add Stakeholder' : editorLocked ? 'Stakeholder Details' : 'Edit Stakeholder')
          : (isNewStakeholder ? 'Add Stakeholder · Identity Document & OCR' : editorLocked ? 'Stakeholder Details' : 'Edit Stakeholder · Identity Document & OCR')
      }
      onClose={onClose}
      className={isRightPaneVisible ? "modal-side-by-side modal-stakeholder-ktp" : "modal-stakeholder-form-only"}
    >
      <div className="modal-side-by-side-body">
        {/* LEFT PANE: FORM FIELDS */}
        <div className="modal-side-form-pane">
          <div className="ktp-form-header-bar">
            <div>
              <span className="eyebrow" style={{color:'#002060',fontWeight:700,letterSpacing:'0.5px'}}>STAKEHOLDER FORM</span>
              <h3 style={{margin:'2px 0 0 0',fontSize:'15px',color:'#0f172a'}}>Shareholders & Directors Data</h3>
            </div>
            {copiedKey === 'applied_all' && (
              <span className="subtle-chip" style={{background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe',fontWeight:600,fontSize:'11px'}}>
                ✓ Document Data Applied to Form!
              </span>
            )}
          </div>

          {formError && <div className="error" role="alert">{formError}</div>}
          <Fields
            fields={fields.map(f => {
              if (f.key === 'idType') {
                return {
                  ...f,
                  options: ['NONE', 'KTP_NPWP', 'PASSPORT_KITAS'],
                  optionLabels: {
                    NONE: 'None',
                    KTP_NPWP: 'KTP - NPWP',
                    PASSPORT_KITAS: 'PASSPORT - KITAS'
                  }
                };
              }
              if (f.key === 'idNumber') {
                return {
                  ...f,
                  label: activeIdGroup === 'KTP_NPWP'
                    ? 'ID Number - KTP'
                    : activeIdGroup === 'PASSPORT_KITAS'
                    ? 'ID Number - PASSPORT'
                    : 'ID Number - [KTP or PASSPORT]'
                };
              }
              if (f.key === 'idNumberSecondary') {
                return {
                  ...f,
                  label: activeIdGroup === 'KTP_NPWP'
                    ? 'ID Number - NPWP'
                    : activeIdGroup === 'PASSPORT_KITAS'
                    ? 'ID Number - KITAS'
                    : 'ID Number - [NPWP or KITAS]'
                };
              }
              return f;
            })}
            value={formValue}
            disabled={editorLocked}
            onChange={onChangeValue}
            onSelectOption={handleSelectOption}
          />
        </div>

        {/* RIGHT PANE: DOCUMENT PREVIEW & OCR WORKSPACE (Visible only when document is present or ID type selected) */}
        {isRightPaneVisible && (
          <div className="modal-side-preview-pane stakeholder-ktp-pane">
            {/* DOCUMENT TYPE SELECTOR TABS */}
            <div className="doc-type-tabs">
              {allowedDocTypes.map(t => {
                const hasDoc = Boolean(docAssets[t].url);
                return (
                  <button
                    type="button"
                    key={t}
                    className={`doc-type-tab ${docType === t ? 'active' : ''}`}
                    onClick={() => handleSelectDocTypeTab(t)}
                  >
                    {hasDoc && <span className="doc-type-tab-indicator" title="File uploaded" />}
                    {t === 'KTP' ? 'e-KTP' : t === 'PASSPORT' ? 'Passport' : t === 'NPWP' ? 'NPWP' : 'KITAS'}
                  </button>
                );
              })}
            </div>

          {/* TOP TOOLBAR */}
          <div className="ktp-pane-topbar">
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <h4 style={{margin:0,fontSize:'14.5px',color:'#002060',fontWeight:700}}>{docTitles[docType]}</h4>
                {currentAsset.url && (
                  <span className="subtle-chip" style={{background:'#eff6ff',color:'#1d4ed8',fontSize:'10.5px',fontWeight:600}}>
                    ✓ Attached
                  </span>
                )}
              </div>
              <span style={{fontSize:'11px',color:'#64748b'}}>Physical ID document preview & smart data extraction (OCR)</span>
            </div>

            {currentAsset.url && !editorLocked && (
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <label className="button small button-secondary" style={{padding:'4px 10px',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:'4px'}}>
                  <Upload size={13}/> Replace File
                  <input type="file" accept="image/*,application/pdf" style={{display:'none'}} onChange={e => handleUploadDoc(e, docType)}/>
                </label>
                <button type="button" className="button small legal-delete-button" style={{padding:'4px 8px'}} onClick={handleRemoveDoc}>
                  <Trash2 size={13}/> Delete
                </button>
              </div>
            )}
          </div>

          {/* DOCUMENT VIEWER CARD */}
          {currentAsset.url ? (
            <div className="ktp-viewer-card">
              <div className="ktp-viewer-controls">
                <span className="ktp-viewer-filename">{currentAsset.fileName || `${docType} File`}</span>
                <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                  <button type="button" className="ktp-ctrl-btn" onClick={()=>setZoom(z=>Math.max(0.75, z-0.25))} title="Zoom Out"><ZoomOut size={13}/></button>
                  <span style={{fontSize:'10px',color:'#475569',minWidth:'28px',textAlign:'center'}}>{Math.round(zoom*100)}%</span>
                  <button type="button" className="ktp-ctrl-btn" onClick={()=>setZoom(z=>Math.min(2.5, z+0.25))} title="Zoom In"><ZoomIn size={13}/></button>
                  <button type="button" className="ktp-ctrl-btn" onClick={()=>setRotation(r=>(r+90)%360)} title="Putar 90°"><RotateCw size={13}/></button>
                  {(zoom!==1 || rotation!==0) && (
                    <button type="button" className="ktp-ctrl-btn reset" onClick={()=>{setZoom(1);setRotation(0);}} title="Reset View">Reset</button>
                  )}
                </div>
              </div>

              <div className="ktp-img-stage">
                {currentAsset.mime?.includes('pdf') || currentAsset.fileName?.toLowerCase().endsWith('.pdf') ? (
                  <iframe title={`${docType} PDF`} src={currentAsset.url} className="ktp-preview-iframe" />
                ) : (
                  <div className="ktp-img-viewport">
                    <img
                      src={currentAsset.url}
                      alt={`${docType} Preview`}
                      className="ktp-preview-img-interactive"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <label className="ktp-upload-box-enhanced">
              <div className="ktp-upload-icon-circle">
                <Upload size={28}/>
              </div>
              <div style={{textAlign:'center'}}>
                <b style={{fontSize:'14.5px',color:'#0f172a',display:'block'}}>Upload Scan / Photo {docTitles[docType]}</b>
                <span style={{fontSize:'12px',color:'#64748b',display:'block',marginTop:'4px'}}>Select image format (JPG, PNG) or PDF document</span>
              </div>
              <div className="ktp-upload-tip">
                <Sparkles size={14} style={{color:'#002060',flexShrink:0}}/>
                <span>Identity data on the document will be automatically scanned in a structured format according to the {docType} format to facilitate verification.</span>
              </div>
              <input type="file" accept="image/*,application/pdf" style={{display:'none'}} disabled={editorLocked} onChange={e => handleUploadDoc(e, docType)}/>
            </label>
          )}

          {/* OCR RESULTS WORKSPACE */}
          <div className="ktp-ocr-workspace-card">
            {/* OCR CARD HEADER */}
            <div className="ktp-ocr-header">
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div className="ktp-ocr-badge-icon"><Sparkles size={14}/></div>
                <div>
                  <h5 style={{margin:0,fontSize:'13.5px',color:'#002060',fontWeight:700}}>Hasil Pembacaan Dokumen ({docType} OCR)</h5>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'2px'}}>
                    {ocrLoading ? (
                      <span className="ktp-ocr-status loading">⏳ Scanning {docType} image...</span>
                    ) : currentAsset.ocrText ? (
                      <span className="ktp-ocr-status ready">✓ Data Ready to Sync</span>
                    ) : (
                      <span className="ktp-ocr-status empty">Awaiting file upload</span>
                    )}
                  </div>
                </div>
              </div>

              {currentAsset.ocrText && !editorLocked && (
                <button
                  type="button"
                  className="button primary small ktp-autofill-btn"
                  onClick={applyDocOcrToForm}
                  title={`Copy and sync ${docType} OCR data to the left form`}
                >
                  <Sparkles size={13}/> Auto-fill to Left Form
                </button>
              )}
            </div>

            {/* STRUCTURED DATA TILES PER DOCUMENT TYPE */}
            {docType === 'KTP' && (
              <div className="ktp-structured-grid">
                <div className="ktp-field-tile highlight">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NOMOR INDUK KEPENDUDUKAN (NIK)</span>
                    {ktpParsed.nik && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('nik', ktpParsed.nik!)}>
                        {copiedKey==='nik' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='nik' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <b className="ktp-field-val nik-val">{ktpParsed.nik || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NAMA LENGKAP</span>
                    {ktpParsed.nama && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('nama', ktpParsed.nama!)}>
                        {copiedKey==='nama' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='nama' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <b className="ktp-field-val">{ktpParsed.nama || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">TEMPAT / TGL LAHIR & USIA</span>
                  </div>
                  <span className="ktp-field-val">{ktpParsed.tempatTglLahir || (ktpParsed.tempatLahir ? `${ktpParsed.tempatLahir}, ${ktpParsed.dateOfBirth||''}` : '—')}</span>
                  {ktpParsed.dateOfBirth && (
                    <small className="ktp-field-sub">
                      ISO: {ktpParsed.dateOfBirth} · Age: {calculateAgeYearsMonths(ktpParsed.dateOfBirth).years} yr {calculateAgeYearsMonths(ktpParsed.dateOfBirth).months} mo
                    </small>
                  )}
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">JENIS KELAMIN</span>
                  </div>
                  <span className="ktp-field-val">{ktpParsed.gender === 'MALE' ? 'LAKI-LAKI (MALE)' : ktpParsed.gender === 'FEMALE' ? 'PEREMPUAN (FEMALE)' : '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">STATUS PERKAWINAN</span>
                  </div>
                  <span className="ktp-field-val">{ktpParsed.maritalStatus || ktpParsed.status || '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">KEWARGANEGARAAN</span>
                  </div>
                  <span className="ktp-field-val">{ktpParsed.citizenship || ktpParsed.kewarganegaraan || 'WNI'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">PEKERJAAN</span>
                  </div>
                  <span className="ktp-field-val">{ktpParsed.pekerjaan || '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">AGAMA</span>
                  </div>
                  <span className="ktp-field-val">{ktpParsed.agama || '—'}</span>
                </div>

                <div className="ktp-field-tile full-width">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">ALAMAT DOMISILI LENGKAP</span>
                    {(ktpParsed.alamat || ktpParsed.province) && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>{
                        const full = [
                          ktpParsed.alamat,
                          ktpParsed.rtRw ? `RT/RW ${ktpParsed.rtRw}` : (ktpParsed.rt && ktpParsed.rw ? `RT ${ktpParsed.rt}/RW ${ktpParsed.rw}` : ''),
                          ktpParsed.kelDesa || ktpParsed.village ? `Kel. ${ktpParsed.kelDesa || ktpParsed.village}` : '',
                          ktpParsed.kecamatan || ktpParsed.district ? `Kec. ${ktpParsed.kecamatan || ktpParsed.district}` : '',
                          ktpParsed.cityRegency || ktpParsed.city,
                          ktpParsed.province,
                          ktpParsed.kodePos || ktpParsed.postalCode
                        ].filter(Boolean).join(', ');
                        copyToClipboard('alamat', full || ktpParsed.alamat || '');
                      }}>
                        {copiedKey==='alamat' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='alamat' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <span className="ktp-field-val address-val">
                    {[
                      ktpParsed.alamat,
                      ktpParsed.rtRw ? `RT/RW ${ktpParsed.rtRw}` : (ktpParsed.rt && ktpParsed.rw ? `RT ${ktpParsed.rt}/RW ${ktpParsed.rw}` : ''),
                      ktpParsed.kelDesa || ktpParsed.village ? `Kel. ${ktpParsed.kelDesa || ktpParsed.village}` : '',
                      ktpParsed.kecamatan || ktpParsed.district ? `Kec. ${ktpParsed.kecamatan || ktpParsed.district}` : '',
                      ktpParsed.cityRegency || ktpParsed.city,
                      ktpParsed.province,
                      ktpParsed.kodePos || ktpParsed.postalCode
                    ].filter(Boolean).join(', ') || '—'}
                  </span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">PROVINSI</span>
                    {ktpParsed.province && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('prov', ktpParsed.province!)}>
                        {copiedKey==='prov' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='prov' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <span className="ktp-field-val">{ktpParsed.province || '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">KABUPATEN / KOTA</span>
                    {(ktpParsed.cityRegency || ktpParsed.city) && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('city', (ktpParsed.cityRegency || ktpParsed.city)!)}>
                        {copiedKey==='city' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='city' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <span className="ktp-field-val">{ktpParsed.cityRegency || ktpParsed.city || '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">KECAMATAN</span>
                    {(ktpParsed.kecamatan || ktpParsed.district) && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('kec', (ktpParsed.kecamatan || ktpParsed.district)!)}>
                        {copiedKey==='kec' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='kec' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <span className="ktp-field-val">{ktpParsed.kecamatan || ktpParsed.district || '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">KELURAHAN / DESA</span>
                    {(ktpParsed.kelDesa || ktpParsed.village) && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('kel', (ktpParsed.kelDesa || ktpParsed.village)!)}>
                        {copiedKey==='kel' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='kel' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <span className="ktp-field-val">{ktpParsed.kelDesa || ktpParsed.village || '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">RT / RW</span>
                    {(ktpParsed.rtRw || (ktpParsed.rt && ktpParsed.rw)) && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('rtrw', (ktpParsed.rtRw || `${ktpParsed.rt}/${ktpParsed.rw}`)!)}>
                        {copiedKey==='rtrw' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='rtrw' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <span className="ktp-field-val">{ktpParsed.rtRw || (ktpParsed.rt && ktpParsed.rw ? `${ktpParsed.rt}/${ktpParsed.rw}` : (ktpParsed.rt ? `RT ${ktpParsed.rt}` : (ktpParsed.rw ? `RW ${ktpParsed.rw}` : '—')))}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">KODE POS</span>
                    {(ktpParsed.kodePos || ktpParsed.postalCode) && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('kodepos', (ktpParsed.kodePos || ktpParsed.postalCode)!)}>
                        {copiedKey==='kodepos' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='kodepos' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <span className="ktp-field-val">{ktpParsed.kodePos || ktpParsed.postalCode || '—'}</span>
                </div>
              </div>
            )}

            {docType === 'PASSPORT' && (
              <div className="ktp-structured-grid">
                <div className="ktp-field-tile highlight">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NOMOR PASPOR (PASSPORT NO.)</span>
                    {passportParsed.passportNumber && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('passNo', passportParsed.passportNumber!)}>
                        {copiedKey==='passNo' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='passNo' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <b className="ktp-field-val nik-val">{passportParsed.passportNumber || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">KODE NEGARA / NATIONALITY</span>
                  </div>
                  <b className="ktp-field-val">{passportParsed.countryCode ? `${passportParsed.countryCode} · ${passportParsed.countryName || passportParsed.nationality || ''}` : passportParsed.nationality || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NAMA LENGKAP</span>
                  </div>
                  <b className="ktp-field-val">{passportParsed.fullName || [passportParsed.givenNames, passportParsed.surname].filter(Boolean).join(' ') || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NAMA DEPAN / SURNAME</span>
                  </div>
                  <span className="ktp-field-val">{passportParsed.givenNames ? `Given: ${passportParsed.givenNames}` : ''} {passportParsed.surname ? `· Surname: ${passportParsed.surname}` : ''}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">TANGGAL LAHIR & USIA</span>
                  </div>
                  <span className="ktp-field-val">{passportParsed.dateOfBirth || '—'}</span>
                  {passportParsed.dateOfBirth && (
                    <small className="ktp-field-sub">
                      Age: {calculateAgeYearsMonths(passportParsed.dateOfBirth).years} yr {calculateAgeYearsMonths(passportParsed.dateOfBirth).months} mo
                    </small>
                  )}
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">JENIS KELAMIN (SEX)</span>
                  </div>
                  <span className="ktp-field-val">{passportParsed.gender === 'MALE' ? 'M / LAKI-LAKI' : passportParsed.gender === 'FEMALE' ? 'F / PEREMPUAN' : '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">TANGGAL BERLAKU / EXPIRY</span>
                  </div>
                  <span className="ktp-field-val">{passportParsed.expiryDate || '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">KANTOR PENERBIT (AUTHORITY)</span>
                  </div>
                  <span className="ktp-field-val">{passportParsed.issuingAuthority || '—'}</span>
                </div>
              </div>
            )}

            {docType === 'NPWP' && (
              <div className="ktp-structured-grid">
                <div className="ktp-field-tile highlight">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NOMOR NPWP (15-16 DIGIT)</span>
                    {npwpParsed.npwpNumber && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('npwp', npwpParsed.npwpNumber!)}>
                        {copiedKey==='npwp' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='npwp' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <b className="ktp-field-val nik-val">{npwpParsed.npwpNumber || npwpParsed.rawNpwp || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NAMA WAJIB PAJAK</span>
                  </div>
                  <b className="ktp-field-val">{npwpParsed.nama || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NIK TERDAFTAR</span>
                  </div>
                  <span className="ktp-field-val">{npwpParsed.nik || '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">KANTOR PELAYANAN PAJAK (KPP)</span>
                  </div>
                  <span className="ktp-field-val">{npwpParsed.kpp || '—'}</span>
                </div>

                <div className="ktp-field-tile full-width">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">ALAMAT TERDAFTAR NPWP</span>
                  </div>
                  <span className="ktp-field-val address-val">
                    {[npwpParsed.alamat, npwpParsed.kelurahanKecamatan, npwpParsed.kotaProvinsi].filter(Boolean).join(', ') || '—'}
                  </span>
                </div>
              </div>
            )}

            {docType === 'KITAS' && (
              <div className="ktp-structured-grid">
                <div className="ktp-field-tile highlight">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NOMOR IZIN TINGGAL / NIORA</span>
                    {kitasParsed.permitNumber && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('kitasNo', kitasParsed.permitNumber!)}>
                        {copiedKey==='kitasNo' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='kitasNo' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <b className="ktp-field-val nik-val">{kitasParsed.permitNumber || kitasParsed.niora || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NAMA LENGKAP</span>
                  </div>
                  <b className="ktp-field-val">{kitasParsed.nama || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">KEWARGANEGARAAN</span>
                  </div>
                  <span className="ktp-field-val">{kitasParsed.kewarganegaraan || 'WNA'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">TANGGAL LAHIR & USIA</span>
                  </div>
                  <span className="ktp-field-val">{kitasParsed.tanggalLahir || '—'}</span>
                  {kitasParsed.tanggalLahir && (
                    <small className="ktp-field-sub">
                      Age: {calculateAgeYearsMonths(kitasParsed.tanggalLahir).years} yr {calculateAgeYearsMonths(kitasParsed.tanggalLahir).months} mo
                    </small>
                  )}
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">BERLAKU HINGGA</span>
                  </div>
                  <span className="ktp-field-val">{kitasParsed.berlakuHingga || '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">INSTANSI PENERBIT</span>
                  </div>
                  <span className="ktp-field-val">{kitasParsed.instansiPenerbit || 'Direktorat Jenderal Imigrasi'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      <div className="modal-actions">
        <button type="button" className="button" onClick={onClose}>{editorLocked ? 'Close' : 'Cancel'}</button>
        {!editorLocked && (
          <button type="button" className="button primary" onClick={onSave} style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
            <Save size={15}/> Save Shareholder
          </button>
        )}
      </div>
    </Modal>
  );
}
