/** Helpers for reading master-data entries and resetting dependent fields. */
import {masterGroups, masterKey, type MasterCatalog} from '@liugong/shared';
import {equipmentChildren} from './store';
import {matchesMasterItem} from '../wilayah';

/** Alphabetical order for dropdown choices (Indonesian collation, numbers by value); "Other" style choices go last. */
const isOther = (label: string) => /(other|others|lainnya)/i.test(label);
export const compareLabels = (a: string, b: string) =>
  Number(isOther(a)) - Number(isOther(b)) || a.localeCompare(b, 'id', {numeric: true, sensitivity: 'base'});

export function masterEntries(data: MasterCatalog, key: string, value: any) {
  const group = masterGroups.find(g => g.key === masterKey(key));
  if (!group) return null;
  if (group.key === 'postalCode') {
    const provinceValue = value?.province,
      cityValue = value?.city || value?.cityRegency;
    if (cityValue) {
      const province = provinceValue
        ? data.province?.find(x => matchesMasterItem(x, provinceValue))
        : undefined;
      const city = data.city?.find(
        x => matchesMasterItem(x, cityValue) && (!province || x.parentValue === province.value),
      );
      const targetCity = city?.value || cityValue;
      return (data.postalCode || []).filter(x => x.active && x.parentValue === targetCity);
    }
    return (data.postalCode || []).slice(0, 50);
  }
  if (group.key === 'village') {
    let parentDistrict = group.parentField
      ? value?.[group.parentField] || value?.[masterKey(group.parentField)]
      : value?.district;
    if (parentDistrict) {
      const pDid =
        (data.district || []).find(x => matchesMasterItem(x, parentDistrict))?.value || parentDistrict;
      return (data.village || []).filter(x => x.active && x.parentValue === pDid);
    }
    const cVal = value?.city || value?.cityRegency;
    if (cVal) {
      const cObj = (data.city || []).find(x => matchesMasterItem(x, cVal));
      if (cObj) {
        const dSet = new Set(
          (data.district || []).filter(x => x.parentValue === cObj.value).map(x => x.value),
        );
        return (data.village || []).filter(x => x.active && !!x.parentValue && dSet.has(x.parentValue));
      }
    }
    return (data.village || []).slice(0, 50);
  }
  let parentValue = group.parentField
    ? value?.[group.parentField] || value?.[masterKey(group.parentField)]
    : undefined;
  if (!parentValue && group.key === 'district') parentValue = value?.city || value?.cityRegency;
  if (parentValue && group.parent) {
    const parent = data[group.parent]?.find(x => matchesMasterItem(x, parentValue));
    parentValue = parent?.value || parentValue;
  }
  if (group.key === 'district' || group.key === 'city') {
    if (!parentValue && group.key === 'district' && value?.province) {
      // no city yet: the districts of the cities of the chosen province (parent ids of each level)
      const province = data.province?.find(x => matchesMasterItem(x, value.province));
      const cities = new Set((data.city || []).filter(x => x.parentValue === province?.value).map(x => x.value));
      if (province) return (data.district || []).filter(x => x.active && !!x.parentValue && cities.has(x.parentValue));
    }
    if (!parentValue) return (data[group.key] || []).slice(0, 50);
    return (data[group.key] || []).filter(x => x.active && x.parentValue === parentValue);
  }
  if (equipmentChildren.has(group.key))
    return (data[group.key] || []).filter(x => x.active && !!parentValue && x.parentValue === parentValue);
  return (data[group.key] || []).filter(
    x => x.active && (!parentValue || !x.parentValue || x.parentValue === parentValue),
  );
}
export function resetMasterChildren(key: string, next: any, fieldKeys: string[]) {
  const changed = new Set([masterKey(key)]);
  // the record may carry the same value under an alias key (city / cityRegency): keep both in step
  for (const k of Object.keys(next)) if (k !== key && masterKey(k) === masterKey(key)) next[k] = next[key];
  for (let pass = 0; pass < masterGroups.length; pass++)
    for (const group of masterGroups)
      if (group.parent && changed.has(group.parent) && !changed.has(group.key)) {
        changed.add(group.key);
        // also the alias keys the record carries (e.g. cityRegency next to city), or the old parent stays behind
        for (const child of new Set([...fieldKeys, ...Object.keys(next)])) if (masterKey(child) === group.key) next[child] = '';
      }
  return next;
}
