/** Applying what the NIB scan found to the customer draft and to the FAP draft. */
import {resolveWilayahUpwards, type useMasterData} from '@/shared/master-data';
import {toTitleCase} from '@liugong/shared';

export interface NibOcrExtract {
  nib?: string;
  companyName?: string;
  alamat?: string;
  email?: string;
  phone?: string;
  tanggalTerbit?: string;
  province?: string;
  city?: string;
  district?: string;
  village?: string;
  postalCode?: string;
  rt?: string;
  rw?: string;
}

const clean = (extracted: NibOcrExtract) => ({
  rawComp: extracted.companyName ? toTitleCase(String(extracted.companyName).trim()) : '',
  rawNib: extracted.nib ? String(extracted.nib).replace(/\D/g, '').slice(0, 13) : '',
  rawDate: extracted.tanggalTerbit ? String(extracted.tanggalTerbit).trim() : '',
});

/** Company fields to merge into the customer draft, or null when the scan had none of them. */
export function nibCustomerPatch(extracted: NibOcrExtract) {
  const {rawComp, rawNib, rawDate} = clean(extracted);
  if (!rawNib && !rawDate && !rawComp) return null;
  return {
    ...(rawNib ? {nib: rawNib} : {}),
    ...(rawComp ? {companyName: rawComp} : {}),
    ...(rawDate ? {nibDate: rawDate} : {}),
  };
}

export function applyNibOcrToDraft(
  prev: any,
  extracted: NibOcrExtract,
  master: ReturnType<typeof useMasterData>,
) {
  const {rawComp, rawNib, rawDate} = clean(extracted);
  const next = {
    ...prev,
    ...(rawNib ? {nib: rawNib} : {}),
    ...(rawComp ? {companyName: rawComp} : {}),
    ...(extracted.alamat ? {companyAddress: extracted.alamat} : {}),
    ...(extracted.email ? {email: extracted.email} : {}),
    ...(extracted.phone ? {phoneFax: extracted.phone} : {}),
    ...(rawDate ? {nibDate: rawDate} : {}),
    ...(extracted.province ? {province: extracted.province} : {}),
    ...(extracted.city ? {city: extracted.city, cityRegency: extracted.city} : {}),
    ...(extracted.district ? {district: extracted.district} : {}),
    ...(extracted.village ? {village: extracted.village} : {}),
    ...(extracted.postalCode ? {postalCode: extracted.postalCode} : {}),
    ...(extracted.rt ? {rt: extracted.rt} : {}),
    ...(extracted.rw ? {rw: extracted.rw} : {}),
    customer: {
      ...(prev.customer || {}),
      ...(rawNib ? {nib: rawNib} : {}),
      ...(rawComp ? {companyName: rawComp} : {}),
      ...(rawDate ? {nibDate: rawDate} : {}),
    },
  };
  return resolveWilayahUpwards(next, master);
}
