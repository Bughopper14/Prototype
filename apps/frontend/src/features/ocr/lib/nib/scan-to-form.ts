/** The NIB form and how the OCR server's scan result is turned into it. */
import {
  extractWilayahFromAddressAndText,
  parseAllAddressFields,
} from '@/features/ocr/lib/nib/address-wilayah';
import {normalizeWilayahInput, type useMasterData} from '@/shared/master-data';
import {extractStreetAddress, formatCompanyName} from '@liugong/shared';

export interface NibFormData {
  nib: string;
  companyName: string;
  fullAddress: string;
  /** The address exactly as the OCR read it (street, region names, postal code) */
  alamat: string;
  /** Only the street / building part of it: what is left after the region fields below are taken out */
  streetAddress: string;
  email: string;
  phone: string;
  tanggalTerbit: string;
  city: string;
  district: string;
  village: string;
  postalCode: string;
  province: string;
  rt: string;
  rw: string;
}

export const EMPTY_NIB_FORM: NibFormData = {
  nib: '',
  companyName: '',
  fullAddress: '',
  alamat: '',
  streetAddress: '',
  email: '',
  phone: '',
  tanggalTerbit: '',
  city: '',
  district: '',
  village: '',
  postalCode: '',
  province: '',
  rt: '',
  rw: '',
};

/** The street / building part of a full NIB address: what is not a province, city, district, village, RT/RW or postal code. */
export function nibStreetAddress(
  fullAddress: string,
  regions: {province?: string; city?: string; district?: string; village?: string; postalCode?: string},
): string {
  return extractStreetAddress(fullAddress, regions)
    .replace(/^[/:,\-\s.–—=]+/, '')
    .trim();
}

/** The form values (and the text shown as "raw") for the data the OCR server returned. */
export function scanResultToForm(d: any, master: ReturnType<typeof useMasterData>) {
  const newNib = String(d.nib || '')
    .replace(/\D/g, '')
    .slice(0, 13);
  const newCompanyName = formatCompanyName(String(d.company_name || d.companyName || '').trim());
  let rawAddress = String(d.alamat_lengkap || d.fullAddress || d.alamat || d.companyAddress || '').trim();
  // Keep the correspondence address only, without the labels that follow it on the NIB
  if (/korespondensi/i.test(rawAddress)) rawAddress = rawAddress.split(/korespondensi/i).pop() || rawAddress;
  rawAddress = rawAddress
    .replace(/^[/:,\-\s.–—=]+/, '')
    .replace(
      /\s*(?:NPWP|Nomor\s*Pokok\s*Wajib\s*Pajak|(?:No\.?\s*)?Telepon|(?:No\.?\s*)?Telp|Email|Status\s*Penanaman|Kode\s*KBLI)\s*[:.\-–—=]?.*/i,
      '',
    )
    .replace(/[,.\s\-]+$/, '')
    .trim();

  // Directly parse all address components (street address, RT/RW, kelurahan, kecamatan, kota, provinsi, kode pos) from the full address
  const parsed = parseAllAddressFields(rawAddress, master);
  let newProvince = normalizeWilayahInput(parsed.province || d.provinsi || d.province || '');
  let newCity = (parsed.city || d.kota || d.city || d.cityRegency || '').trim();
  let newDistrict = normalizeWilayahInput(parsed.district || d.kecamatan || d.district || '');
  let newVillage = normalizeWilayahInput(parsed.village || d.kel_desa || d.village || d.kelurahan || '');
  let newPostal = (parsed.postalCode || d.kode_pos || d.postalCode || '').replace(/\D/g, '').slice(0, 5);
  let newRt = parsed.rt || String(d.rt || '').trim();
  let newRw = parsed.rw || String(d.rw || '').trim();
  const streetAddress = parsed.alamat || rawAddress;

  const newEmail = String(d.email || '').trim();
  const newPhone = String(d.phone || d.phoneFax || '').trim();
  const rawTanggal = String(
    d.tanggal_terbit || d.establishmentDate || d.nibIssuedDate || d.issueDate || d.tanggalTerbit || '',
  ).trim();
  let newTanggal = rawTanggal;
  const isoMatch = rawTanggal.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    newTanggal = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  } else {
    const dmMatch = rawTanggal.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmMatch) {
      newTanggal = `${dmMatch[3]}-${dmMatch[2].padStart(2, '0')}-${dmMatch[1].padStart(2, '0')}`;
    }
  }

  const fullAddress = rawAddress;

  const formData: NibFormData = {
    nib: newNib,
    companyName: newCompanyName,
    fullAddress: fullAddress,
    alamat: rawAddress,
    streetAddress:
      streetAddress ||
      nibStreetAddress(rawAddress, {
        province: newProvince,
        city: newCity,
        district: newDistrict,
        village: newVillage,
        postalCode: newPostal,
      }),
    province: newProvince,
    city: newCity,
    district: newDistrict,
    village: newVillage,
    postalCode: newPostal,
    email: newEmail,
    phone: newPhone,
    tanggalTerbit: newTanggal,
    rt: newRt,
    rw: newRw,
  };
  return {formData, rawText: fullAddress || JSON.stringify(d, null, 2)};
}
