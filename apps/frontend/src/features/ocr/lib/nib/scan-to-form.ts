/** The NIB form and how the OCR server's scan result is turned into it. */
import {extractWilayahFromAddressAndText} from '@/features/ocr/lib/nib/address-wilayah';
import {normalizeWilayahInput, type useMasterData} from '@/shared/master-data';
import {toTitleCase} from '@liugong/shared';

export interface NibFormData {
  nib: string;
  companyName: string;
  alamat: string;
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
  alamat: '',
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

/** The form values (and the text shown as "raw") for the data the OCR server returned. */
export function scanResultToForm(d: any, master: ReturnType<typeof useMasterData>) {
  const newNib = String(d.nib || '')
    .replace(/\D/g, '')
    .slice(0, 13);
  const newCompanyName = toTitleCase(String(d.company_name || d.companyName || '').trim());
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

  let newProvince = String(d.provinsi || d.province || '').trim();
  let newCity = String(d.kota || d.city || d.cityRegency || '').trim();
  let newDistrict = String(d.kecamatan || d.district || '').trim();
  let newVillage = String(d.kel_desa || d.village || d.kelurahan || '').trim();
  let newPostal = String(d.kode_pos || d.postalCode || '')
    .replace(/\D/g, '')
    .slice(0, 5);
  let newRt = String(d.rt || '').trim();
  let newRw = String(d.rw || '').trim();

  // Always resolve & normalize wilayah fields through master data resolver
  const w = extractWilayahFromAddressAndText(
    `${rawAddress} ${newProvince} ${newCity} ${newDistrict} ${newVillage}`,
    rawAddress,
    master,
  );
  newProvince = normalizeWilayahInput(w.province || newProvince);
  newCity = normalizeWilayahInput(w.city || newCity);
  newDistrict = normalizeWilayahInput(w.district || newDistrict);
  newVillage = normalizeWilayahInput(w.village || newVillage);
  if (w.postalCode && !newPostal) newPostal = w.postalCode;
  if (w.rt && !newRt) newRt = w.rt;
  if (w.rw && !newRw) newRw = w.rw;

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

  const formData: NibFormData = {
    nib: newNib,
    companyName: newCompanyName,
    alamat: rawAddress,
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
  return {formData, rawText: rawAddress || JSON.stringify(d, null, 2)};
}
