// Join by administrative code, never by ambiguous village names.
export function buildLocationMapping(regions, postalByVillage, sourceUrl) {
  const byCode = new Map(regions.map(row => [row.id, row]));
  const rows = [];
  for (const village of regions.filter(row => row.level === 4)) {
    const district = byCode.get(village.parentId);
    const regency = byCode.get(district?.parentId);
    const province = byCode.get(regency?.parentId);
    if (district?.level !== 3 || regency?.level !== 2 || province?.level !== 1) {
      throw new Error(`Incomplete hierarchy for ${village.id}`);
    }
    const raw = postalByVillage[village.id];
    const codes = [...new Set((Array.isArray(raw) ? raw : [raw]).map(value => String(value ?? '').trim()))].sort();
    if (!codes.length || codes.some(code => !/^\d{5}$/.test(code))) {
      throw new Error(`Missing or invalid postal codes for ${village.id}`);
    }
    for (const code of codes) rows.push({
      provinsi: province.name, kabupaten_kota: regency.name,
      kecamatan: district.name, kelurahan_desa: village.name, kode_pos: code,
      kode_provinsi: province.id, kode_kabupaten_kota: regency.id,
      kode_kecamatan: district.id, kode_kelurahan_desa: village.id,
      sumber_url: sourceUrl,
    });
  }
  return rows;
}
