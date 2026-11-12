/** How the OCR result of an ID document (KTP, passport, NPWP, KITAS) is merged into the stakeholder form. */
import {splitPersonName} from '@/features/ocr/lib/id-documents/parse-ktp';
import type {StakeholderDocType} from '@/features/legal/lib/types';
import {normalizeBirthDate} from '@/shared/lib/dates';
import {calculateAgeYearsMonths} from '@/shared/lib/format';
import {extractStreetAddress} from '@liugong/shared';

/** Right after an upload: the file, its text and the fields read from it are stored on the stakeholder. */
export function mergeExtractedDoc(
  curVal: any,
  targetType: StakeholderDocType,
  extracted: any,
  dataUrl: string,
  f: {name: string; type: string},
) {
  let nextVal = {...curVal};
  const storedUrl = extracted?.fileUrl || dataUrl;
  const storedName = extracted?.fileName || f.name;
  const storedPath = extracted?.documentPath || undefined;
  const ocrId = extracted?.ocrRecordId || undefined;
  if (targetType === 'KTP') {
    nextVal = {
      ...nextVal,
      ktpUrl: storedUrl,
      ktpFileName: storedName,
      ktpDocumentPath: storedPath,
      ktpOcrId: ocrId,
      ktpRemoved: false,
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
      nextVal.dateOfBirth = normalizeBirthDate(extracted.dateOfBirth) || extracted.dateOfBirth;
      const {years, months} = calculateAgeYearsMonths(nextVal.dateOfBirth);
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
    const ktpStreet = extracted.streetAddress || extractStreetAddress(extracted.alamat, extracted);
    if (ktpStreet) nextVal.address = ktpStreet;
    if (extracted.province) nextVal.province = extracted.province;
    if (extracted.cityRegency || extracted.city)
      nextVal.cityRegency = extracted.cityRegency || extracted.city;
    if (extracted.kecamatan || extracted.district)
      nextVal.district = extracted.kecamatan || extracted.district;
    if (extracted.kelDesa || extracted.village) nextVal.village = extracted.kelDesa || extracted.village;
    if (extracted.rt) nextVal.rt = extracted.rt;
    if (extracted.rw) nextVal.rw = extracted.rw;
    if (extracted.kodePos || extracted.postalCode)
      nextVal.postalCode = extracted.kodePos || extracted.postalCode;
    if (extracted.pekerjaan) nextVal.occupation = extracted.pekerjaan;
  } else if (targetType === 'PASSPORT') {
    nextVal = {
      ...nextVal,
      passportUrl: storedUrl,
      passportFileName: storedName,
      passportDocumentPath: storedPath,
      passportOcrId: ocrId,
      passportRemoved: false,
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
      nextVal.dateOfBirth = normalizeBirthDate(extracted.dateOfBirth) || extracted.dateOfBirth;
      const {years, months} = calculateAgeYearsMonths(nextVal.dateOfBirth);
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
    nextVal = {
      ...nextVal,
      npwpUrl: storedUrl,
      npwpFileName: storedName,
      npwpDocumentPath: storedPath,
      npwpOcrId: ocrId,
      npwpRemoved: false,
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
  } else if (targetType === 'KITAS') {
    nextVal = {
      ...nextVal,
      kitasUrl: storedUrl,
      kitasFileName: storedName,
      kitasDocumentPath: storedPath,
      kitasOcrId: ocrId,
      kitasRemoved: false,
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
      nextVal.dateOfBirth = normalizeBirthDate(extracted.tanggalLahir) || extracted.tanggalLahir;
      const {years, months} = calculateAgeYearsMonths(nextVal.dateOfBirth);
      nextVal.ageYears = years;
      nextVal.ageMonths = months;
    }
    if (extracted.gender) nextVal.gender = extracted.gender;
    // A KITAS is only issued to foreigners, even when the nationality line is unreadable
    nextVal.citizenship = 'FOREIGN';
    nextVal.nationalityType = 'WNA';
    if (extracted.kewarganegaraan) nextVal.country = extracted.kewarganegaraan;
  }
  return nextVal;
}

/** "Apply all" button: copy what was read from the active document onto the form. */
export function applyParsedDoc(curVal: any, docType: StakeholderDocType, parsed: any) {
  const p = parsed;
  const nextVal = {...curVal};
  if (docType === 'KTP') {
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
      nextVal.dateOfBirth = normalizeBirthDate(p.dateOfBirth) || p.dateOfBirth;
      const {years, months} = calculateAgeYearsMonths(nextVal.dateOfBirth);
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
    const ktpStreet = p.streetAddress || extractStreetAddress(p.alamat, p);
    if (ktpStreet) nextVal.address = ktpStreet;
    if (p.province) nextVal.province = p.province;
    if (p.cityRegency || p.city) nextVal.cityRegency = p.cityRegency || p.city;
    if (p.kecamatan || p.district) nextVal.district = p.kecamatan || p.district;
    if (p.kelDesa || p.village) nextVal.village = p.kelDesa || p.village;
    if (p.rt) nextVal.rt = p.rt;
    if (p.rw) nextVal.rw = p.rw;
    if (p.postalCode || p.kodePos) nextVal.postalCode = p.postalCode || p.kodePos;
    if (p.pekerjaan) nextVal.occupation = p.pekerjaan;
  } else if (docType === 'PASSPORT') {
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
      nextVal.dateOfBirth = normalizeBirthDate(p.dateOfBirth) || p.dateOfBirth;
      const {years, months} = calculateAgeYearsMonths(nextVal.dateOfBirth);
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
    // A KITAS is only issued to foreigners, even when the nationality line is unreadable
    nextVal.citizenship = 'FOREIGN';
    nextVal.nationalityType = 'WNA';
    if (p.kewarganegaraan) nextVal.country = p.kewarganegaraan;
  }
  return nextVal;
}

const CLEARED = (prefix: string) => ({
  [prefix + 'Url']: undefined,
  [prefix + 'FileName']: undefined,
  [prefix + 'DocumentPath']: undefined,
  [prefix + 'OcrId']: undefined,
  [prefix + 'Removed']: true,
  [prefix + 'Mime']: undefined,
  [prefix + 'OcrText']: '',
  [prefix + 'Data']: undefined,
});

/** The stakeholder without the file (and OCR text) of one document type. */
export function withoutDoc(curVal: any, docType: StakeholderDocType) {
  const prefix = {KTP: 'ktp', PASSPORT: 'passport', NPWP: 'npwp', KITAS: 'kitas'}[docType];
  const removedUrl = curVal?.[prefix + 'Url'];
  const clearsPrimary = removedUrl && curVal?.fileUrl === removedUrl;
  return {
    ...curVal,
    ...CLEARED(prefix),
    ...(clearsPrimary ? {fileUrl: undefined, document_path: undefined, file_name: undefined} : {}),
  };
}
