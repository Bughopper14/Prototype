/** Fixed-asset summary of FAP section 05: units per brand and kind, with the LiuGong share. */
export function assetSummary(draft: any) {
  const lgHe = Number(draft.assetSummaryHeLiuGong) || 0;
  const lgTruck = Number(draft.assetSummaryTruckLiuGong) || 0;
  const nlgHe = Number(draft.assetSummaryHeNonLiuGong) || 0;
  const nlgTruck = Number(draft.assetSummaryTruckNonLiuGong) || 0;

  const lgUnit = lgHe + lgTruck;
  const nlgUnit = nlgHe + nlgTruck;
  const totHe = lgHe + nlgHe;
  const totTruck = lgTruck + nlgTruck;
  const totUnit = lgUnit + nlgUnit;

  const lgPct = totUnit > 0 ? ((lgUnit / totUnit) * 100).toFixed(1) + '%' : '0.0%';
  const nlgPct = totUnit > 0 ? ((nlgUnit / totUnit) * 100).toFixed(1) + '%' : '0.0%';
  const totPct = totUnit > 0 ? '100.0%' : '0.0%';

  return {lgHe, lgTruck, nlgHe, nlgTruck, lgUnit, nlgUnit, totHe, totTruck, totUnit, lgPct, nlgPct, totPct};
}
