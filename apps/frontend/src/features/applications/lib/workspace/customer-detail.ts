/** Checks and request body for locking the Customer Detail & PIC section. */
import {blank, picFields} from '@liugong/shared';

/** Required customer detail / PIC fields that are still empty (labels for the error message). */
export function missingCustomerDetailFields(draft: any): string[] {
  const missing: string[] = [];
  if (!draft.companyAddress?.trim()) missing.push('Company Address');
  if (!draft.province?.trim()) missing.push('Province');
  if (!draft.city?.trim()) missing.push('City/Regency');
  if (!draft.postalCode?.trim()) missing.push('Postal Code');
  if (!draft.mainBusiness?.trim()) missing.push('Main Business Sector');

  const pic = draft.pic || {};
  if (!pic.picName?.trim() && !pic.name?.trim()) missing.push('PIC Name');
  if (!pic.phone?.trim() && !pic.mobilePhone?.trim()) missing.push('PIC Phone Number');
  if (!pic.position?.trim()) missing.push('PIC Position');
  return missing;
}

/** Projects that have at least one value filled in. */
export const nonEmptyProjects = (draft: any) =>
  (draft.projects || []).filter(
    (p: any) =>
      p && Object.values(p).some((v: any) => v !== undefined && v !== null && String(v).trim() !== ''),
  );

export function buildCustomerDetailBody({
  draft,
  customerDraft,
  customerCategory,
  selectedCustomer,
  liveCompanyName,
  liveNib,
  liveNpwp,
  liveEstablishmentActNo,
}: {
  draft: any;
  customerDraft: any;
  customerCategory: string;
  selectedCustomer: any;
  liveCompanyName: string;
  liveNib: string;
  liveNpwp: string;
  liveEstablishmentActNo: string;
}) {
  const updatedDraft = {
    ...draft,
    customerDetailLocked: true,
    pic: draft.pic || blank(picFields),
    latestDeedDate:
      !draft.latestDeedDate ||
      String(draft.latestDeedDate).trim() === '' ||
      String(draft.latestDeedDate) === 'null'
        ? null
        : draft.latestDeedDate,
    latestDeedNo: !draft.latestDeedNo || String(draft.latestDeedNo).trim() === '' ? null : draft.latestDeedNo,
  };
  const customerPayload =
    customerCategory === 'NEW'
      ? {
          ...customerDraft,
          companyName: liveCompanyName,
          nib: liveNib,
          npwp: liveNpwp,
          establishmentActNo:
            (
              liveEstablishmentActNo ||
              customerDraft?.establishmentActNo ||
              draft.customer?.establishmentActNo ||
              ''
            ).trim() || null,
          establishmentDate: customerDraft?.establishmentDate || draft.customer?.establishmentDate || null,
          nibDate: customerDraft?.nibDate || draft.customer?.nibDate || null,
        }
      : {
          ...(selectedCustomer || {}),
          ...(draft.customer || {}),
          ...(customerDraft || {}),
          companyName: liveCompanyName,
        };
  return {
    profile: {...updatedDraft, companyName: liveCompanyName},
    customer: customerPayload,
    pic: updatedDraft.pic,
    projects: nonEmptyProjects(draft),
  };
}
