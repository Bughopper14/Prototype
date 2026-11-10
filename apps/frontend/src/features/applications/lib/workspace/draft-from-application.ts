/** The editable draft of an application, with the deed and experience fields filled in from the Legal data. */
import {initDraftBase} from '@/features/applications/lib/financing-proposal';
import {calculateAgeYearsMonths, deriveDeedSync} from '@/shared/lib/format';

export function draftFromApplication(a: any) {
  const base = initDraftBase(a);
  // Sync deed fields from legal when loading existing data
  if (a.legal) {
    const sync = deriveDeedSync(a.legal, a);
    if (sync.establishmentActNo) base.latestDeedNo = base.latestDeedNo || sync.latestDeedNo;
    if (sync.latestDeedDate) base.latestDeedDate = base.latestDeedDate || sync.latestDeedDate;
    if (sync.establishmentDate) {
      const exp = calculateAgeYearsMonths(sync.establishmentDate);
      base.experienceYears = exp.years;
      base.experienceMonths = exp.months;
    }
    if (sync.establishmentActNo && a.customer) {
      base.customer = {
        ...(base.customer || {}),
        establishmentActNo: base.customer?.establishmentActNo || sync.establishmentActNo,
        establishmentDate: base.customer?.establishmentDate || sync.establishmentDate,
      };
    }
  }
  return base;
}
