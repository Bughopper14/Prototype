/** Sends an ID image to the OCR service and parses the result per document type. */
import {api} from '@/shared/lib/api';
import {normalizeBirthDate, toDmyDate} from '@/shared/lib/dates';
import {extractStreetAddress} from '@liugong/shared';
import {parseKitasText} from './parse-kitas';
import {parseKtpText} from './parse-ktp';
import {parseNpwpText} from './parse-npwp';
import {parsePassportText, resolveGender} from './parse-passport';
import {ParsedKitasData, ParsedKtpData, ParsedNpwpData, ParsedPassportData} from './types';

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {type: mime});
}

// -------------------------------------------------------------
// Unified Scanner Caller
// -------------------------------------------------------------
export async function extractIdDocumentFromImage(
  fileOrInput: File | Blob | string,
  docType: 'ktp' | 'passport' | 'npwp' | 'kitas' = 'ktp',
  fileName?: string,
): Promise<{
  docType: string;
  data: any;
  rawText: string;
}> {
  try {
    const uploadPayload = new FormData();
    if (typeof fileOrInput === 'string') {
      if (fileOrInput.startsWith('data:')) {
        const b = dataUrlToBlob(fileOrInput);
        uploadPayload.append('file', b, fileName || `${docType}_scan.jpg`);
      } else {
        uploadPayload.append('file', new Blob([fileOrInput]), fileName || `${docType}_scan.txt`);
      }
    } else if (fileOrInput instanceof File) {
      uploadPayload.append('file', fileOrInput);
    } else if (fileOrInput instanceof Blob) {
      uploadPayload.append('file', fileOrInput, fileName || `${docType}_scan.jpg`);
    }
    uploadPayload.append('doc_type', docType);

    const res = await api('/ocr/scan', 'POST', uploadPayload);
    if (res && res.data) {
      const d = res.data;
      return {
        docType: res.doc_type || docType,
        data: d,
        rawText: typeof d === 'string' ? d : JSON.stringify(d, null, 2),
      };
    }
  } catch (err: any) {
    if (err?.code === 'WRONG_DOCUMENT_TYPE') throw err; // the caller tells the user to use the other tab
    console.warn(`[${docType.toUpperCase()} OCR] Scan error:`, err);
  }

  // Fallback to local regex if string was passed
  if (typeof fileOrInput === 'string' && !fileOrInput.startsWith('data:')) {
    if (docType === 'passport')
      return {docType: 'passport', data: parsePassportText(fileOrInput), rawText: fileOrInput};
    if (docType === 'npwp') return {docType: 'npwp', data: parseNpwpText(fileOrInput), rawText: fileOrInput};
    if (docType === 'kitas')
      return {docType: 'kitas', data: parseKitasText(fileOrInput), rawText: fileOrInput};
    return {docType: 'ktp', data: parseKtpText(fileOrInput), rawText: fileOrInput};
  }

  return {
    docType,
    data: {},
    rawText: '',
  };
}

export async function extractKtpTextFromImage(
  fileOrInput: File | Blob | string,
  fileName?: string,
): Promise<ParsedKtpData> {
  const res = await extractIdDocumentFromImage(fileOrInput, 'ktp', fileName);
  const d = res.data || {};
  const sLower = String(d.status_perkawinan || d.maritalStatus || d.status || '').toLowerCase();
  const isSingle = sLower.includes('belum') || sLower.includes('tidak') || sLower.includes('single');
  const isMarried =
    !isSingle && (sLower.includes('kawin') || sLower.includes('nikah') || sLower.includes('married'));
  const isDivorced = sLower.includes('cerai') || sLower.includes('divorced') || sLower.includes('widowed');
  const resolvedMarital = isSingle ? 'SINGLE' : isMarried ? 'MARRIED' : isDivorced ? 'DIVORCED' : 'SINGLE';

  const rawTl = d.tempat_lahir || d.tempatLahir || '';
  const cleanTl =
    rawTl.toUpperCase().startsWith('JAK') ||
    rawTl.toUpperCase().includes('JAKARTA') ||
    rawTl.toUpperCase().includes('JAKALA')
      ? 'JAKARTA'
      : rawTl;
  const rawDob = d.tanggal_lahir || d.tanggalLahir || d.dateOfBirth || '';
  const dobDmy = toDmyDate(rawDob) || rawDob;

  const rawAlamat = d.fullAddress || d.alamat_lengkap || d.alamat || d.address;
  const regionHints = {
    kelDesa: d.kel_desa || d.village,
    village: d.kel_desa || d.village,
    kecamatan: d.kecamatan || d.district,
    district: d.kecamatan || d.district,
    province: d.provinsi || d.province,
    cityRegency: d.kabupaten_kota || d.cityRegency || d.city,
    city: d.kabupaten_kota || d.cityRegency || d.city,
    kodePos: d.kode_pos || d.postalCode,
    postalCode: d.kode_pos || d.postalCode,
  };
  const streetAddress = d.streetAddress || extractStreetAddress(rawAlamat, regionHints);

  return {
    nik: d.nik || d.idNumber,
    nama: d.nama || d.name,
    firstName: d.firstName,
    middleName: d.middleName,
    lastName: d.lastName,
    tempatLahir: cleanTl,
    tanggalLahir: dobDmy,
    dateOfBirth: dobDmy,
    tempatTglLahir:
      d.tempatTglLahir || (cleanTl ? `${cleanTl}, ${dobDmy}` : dobDmy),
    gender:
      d.gender === 'FEMALE' || String(d.jenis_kelamin).toUpperCase().includes('PEREMPUAN')
        ? 'FEMALE'
        : 'MALE',
    golonganDarah: d.golongan_darah || d.golonganDarah,
    status: resolvedMarital,
    maritalStatus: resolvedMarital,
    kewarganegaraan: d.kewarganegaraan || 'WNI',
    citizenship: String(d.kewarganegaraan || '')
      .toUpperCase()
      .includes('WNA')
      ? 'WNA'
      : 'WNI',
    alamat: d.alamat || d.address || d.fullAddress,
    streetAddress,
    rtRw: d.rt_rw || d.rtRw,
    rt: d.rt,
    rw: d.rw,
    kelDesa: d.kel_desa || d.village,
    village: d.kel_desa || d.village,
    kecamatan: d.kecamatan || d.district,
    district: d.kecamatan || d.district,
    province: d.provinsi || d.province,
    cityRegency: d.kabupaten_kota || d.cityRegency || d.city,
    city: d.kabupaten_kota || d.cityRegency || d.city,
    kodePos: d.kode_pos || d.postalCode,
    postalCode: d.kode_pos || d.postalCode,
    agama: d.agama,
    pekerjaan: d.pekerjaan || d.occupation,
    berlaku_hingga: d.berlaku_hingga || 'SEUMUR HIDUP',
    rawText: res.rawText || '',
  };
}

export async function extractPassportTextFromImage(
  fileOrInput: File | Blob | string,
  fileName?: string,
): Promise<ParsedPassportData> {
  const res = await extractIdDocumentFromImage(fileOrInput, 'passport', fileName);
  const d = res.data || {};
  const resolvedGen =
    resolveGender(d.gender) || resolveGender(d.jenis_kelamin) || resolveGender(d.sex) || undefined;
  return {
    passportNumber: d.passport_number || d.passportNumber,
    countryCode: d.country_code || d.countryCode,
    countryName: d.country_name || d.countryName || d.nationality,
    fullName: d.nama || d.fullName,
    surname: d.surname,
    givenNames: d.given_names || d.givenNames,
    nationality: d.nationality || d.country_name,
    dateOfBirth: normalizeBirthDate(d.tanggal_lahir || d.dateOfBirth) || undefined,
    placeOfBirth: d.tempat_lahir || d.placeOfBirth,
    gender: resolvedGen,
    issueDate:
      normalizeBirthDate(d.tanggal_pengeluaran || d.issueDate) || d.tanggal_pengeluaran || d.issueDate,
    expiryDate: normalizeBirthDate(d.tanggal_berlaku || d.expiryDate) || d.tanggal_berlaku || d.expiryDate,
    issuingAuthority: d.kantor_penerbit || d.issuingAuthority,
    personalId: d.personal_id || d.personalId,
    mrzLine1: d.mrz_line1 || d.mrzLine1,
    mrzLine2: d.mrz_line2 || d.mrzLine2,
    rawText: res.rawText || '',
  };
}

export async function extractNpwpTextFromImage(
  fileOrInput: File | Blob | string,
  fileName?: string,
): Promise<ParsedNpwpData> {
  const res = await extractIdDocumentFromImage(fileOrInput, 'npwp', fileName);
  const d = res.data || {};
  return {
    npwpNumber: d.npwp_number || d.npwpNumber,
    rawNpwp: d.raw_npwp || d.rawNpwp,
    nama: d.nama,
    nik: d.nik,
    alamat: d.alamat,
    kelurahanKecamatan: d.kelurahan_kecamatan || d.kelurahanKecamatan,
    kotaProvinsi: d.kota_provinsi || d.kotaProvinsi,
    kpp: d.kpp,
    tanggalTerdaftar: d.tanggal_terdaftar || d.tanggalTerdaftar,
    rawText: res.rawText || '',
  };
}

export async function extractKitasTextFromImage(
  fileOrInput: File | Blob | string,
  fileName?: string,
): Promise<ParsedKitasData> {
  const res = await extractIdDocumentFromImage(fileOrInput, 'kitas', fileName);
  const d = res.data || {};
  const resolvedGen =
    resolveGender(d.gender) || resolveGender(d.jenis_kelamin) || resolveGender(d.sex) || undefined;
  return {
    permitNumber: d.permit_number || d.permitNumber,
    niora: d.niora,
    nama: d.nama,
    kewarganegaraan: d.kewarganegaraan,
    tanggalLahir: normalizeBirthDate(d.tanggal_lahir || d.tanggalLahir) || undefined,
    dateOfBirth: normalizeBirthDate(d.tanggal_lahir || d.tanggalLahir) || undefined,
    gender: resolvedGen,
    berlakuHingga:
      normalizeBirthDate(d.berlaku_hingga || d.berlakuHingga) || d.berlaku_hingga || d.berlakuHingga,
    instansiPenerbit: d.instansi_penerbit || d.instansiPenerbit || 'Direktorat Jenderal Imigrasi',
    rawText: res.rawText || '',
  };
}
