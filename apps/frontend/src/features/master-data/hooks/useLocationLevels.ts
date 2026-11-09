/** Country → province → city → district → village cascade: which items each column shows and which is selected. */
import type {MasterItem} from '@liugong/shared';
import {useState} from 'react';

export const LOCATION_LEVELS = ['province', 'city', 'district', 'village'];

export interface LocationLevel {
  key: string;
  parent?: MasterItem;
  items: MasterItem[];
  selected?: MasterItem;
}

export function useLocationLevels(data: Record<string, MasterItem[]>) {
  const [countryValue, setCountryValue] = useState('');
  const [path, setPath] = useState<Record<string, string>>({});

  const countries = data.country.filter(x => x.active);
  const country = countries.find(x => x.value === countryValue) || countries[0];
  const levels: LocationLevel[] = [];
  for (const key of LOCATION_LEVELS) {
    const parent = levels.length ? levels.at(-1)?.selected : country;
    const items = parent
      ? (data[key] || []).filter(x => x.parentValue === parent.value || !x.parentValue)
      : [];
    const selected = items.find(x => x.value === path[key] && x.active) || items.find(x => x.active);
    levels.push({key, parent, items, selected});
  }

  /** Picks an item in one column and clears the selection in every column to its right. */
  const select = (key: string, value: string) =>
    setPath(old => {
      const next = {...old, [key]: value};
      for (const child of LOCATION_LEVELS.slice(LOCATION_LEVELS.indexOf(key) + 1)) delete next[child];
      return next;
    });

  const selectCountry = (value: string) => {
    setCountryValue(value);
    setPath({});
  };

  return {countries, country, levels, select, selectCountry};
}
