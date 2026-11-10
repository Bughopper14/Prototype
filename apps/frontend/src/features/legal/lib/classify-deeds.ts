/** Splits the deeds of an application into the active ones (shown on top) and the historical ones. */
import {deedValidity} from '@/shared/lib/format';

export function classifyDeeds(deeds: any[], application: any) {
  const establishmentDeeds = deeds.filter((d: any) => d.type === 'establishment');
  const amendmentDeeds = deeds.filter((d: any) => d.type === 'amendment');

  // 1. Primary establishment deed: matches number in customer profile, or the oldest
  const matchedEst = establishmentDeeds.find(
    (d: any) =>
      (application.customer?.establishmentActNo &&
        d.deedNumber === application.customer.establishmentActNo) ||
      (application.establishmentActNo && d.deedNumber === application.establishmentActNo),
  );
  const primaryEstablishmentDeed =
    matchedEst ||
    establishmentDeeds.slice().sort((a: any, b: any) => {
      const ad = Date.parse(String(a.deedDate || '')) || 0;
      const bd = Date.parse(String(b.deedDate || '')) || 0;
      return ad - bd;
    })[0] ||
    null;

  // 2. Latest amendment deed: sorted by most recent date
  const sortedAmendments = amendmentDeeds.slice().sort((a: any, b: any) => {
    const ad = Date.parse(String(a.deedDate || a.createdAt || '')) || 0;
    const bd = Date.parse(String(b.deedDate || b.createdAt || '')) || 0;
    return bd - ad;
  });
  const latestAmendmentDeed = sortedAmendments[0] || null;

  // 3. Active Deeds (Top Table): 1 Primary Establishment Deed + 1 Latest Amendment Deed (active)
  const activeDeeds: any[] = [];
  if (primaryEstablishmentDeed) {
    activeDeeds.push(primaryEstablishmentDeed);
  }
  if (latestAmendmentDeed && latestAmendmentDeed.id !== primaryEstablishmentDeed?.id) {
    const validity = deedValidity(latestAmendmentDeed.deedDate);
    if (validity.active !== false) {
      activeDeeds.push(latestAmendmentDeed);
    }
  }

  // 4. Historical Deeds (Bottom Table): All deeds other than active ones
  const activeIdSet = new Set(activeDeeds.map((d: any) => d.id));
  const historicalDeeds = deeds
    .filter((d: any) => !activeIdSet.has(d.id))
    .sort((a: any, b: any) => {
      const ad = Date.parse(String(a.deedDate || a.createdAt || '')) || 0;
      const bd = Date.parse(String(b.deedDate || b.createdAt || '')) || 0;
      return bd - ad;
    });

  return {
    establishmentDeeds,
    amendmentDeeds,
    matchedEst,
    primaryEstablishmentDeed,
    sortedAmendments,
    latestAmendmentDeed,
    activeDeeds,
    activeIdSet,
    historicalDeeds,
  };
}
