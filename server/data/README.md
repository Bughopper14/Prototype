# Indonesia region master data

`indonesia-regions.json.gz` is a local snapshot of Indonesia's province, regency/city, district, and village hierarchy with postal codes. It was downloaded from the Emsifa Indonesia Region API on 2026-09-30; the source reported an update date of 2026-09-27 and 38 provinces, 514 regencies/cities, 7,285 districts, and 83,762 villages.

Source and attribution: [emsifa/api-wilayah-indonesia](https://github.com/emsifa/api-wilayah-indonesia). The API documents its source data as originating from [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) and [cahyadsn/wilayah_kodepos](https://github.com/cahyadsn/wilayah_kodepos). The generator repository is MIT licensed; retain this attribution when redistributing the snapshot.

To refresh the snapshot, run `node scripts/download-indonesia-regions.mjs`. The application imports or completes the snapshot on startup into four linked master tables: `master_provinsi`, `master_kabupaten_kota`, `master_kecamatan`, and `master_kelurahan_desa`. Postal codes are stored per village in `master_kelurahan_desa.postal_code`.

## Mapping wilayah dan kode pos

`master_mapping_wilayah` is the combined, physical mapping table. Its first five columns are `provinsi`, `kabupaten_kota`, `kecamatan`, `kelurahan_desa`, and `kode_pos`. Additional columns retain all four administrative codes, the source URL, and the imported snapshot checksum. Names repeat across rows as required by the hierarchy.

`mapping-wilayah.json.gz` joins the hierarchy snapshot above with [cahyadsn/wilayah_kodepos's national JSON dataset](https://github.com/cahyadsn/wilayah_kodepos/blob/main/json/wilayah_kodepos.json), downloaded on 2026-09-30. This source currently supplies **one five-digit postcode per village**: 83,762 mappings for 83,762 villages. Coverage of every additional postcode for villages with multiple postcodes has not been verified. Retain the source attribution above (MIT).

The primary key is `(kode_kelurahan_desa, kode_pos)`. Thus one village can have multiple mapping rows, and multiple villages can share a postcode. Postcodes are text to preserve leading zeroes. The form automatically selects the postcode when there is exactly one; if there are multiple, it presents a choice from the mapping table. The old singular `master_kelurahan_desa.postal_code` is retained for compatibility, while the form reads postcode choices from the mapping table.

Refresh with `node scripts/download-location-mapping.mjs` after refreshing the hierarchy. The generator matches exact administrative codes, rejects broken hierarchies, invalid postcodes and unmatched source codes, and supports scalar or array postcode values. An already downloaded copy can be passed using `--source-file <filename>`. Restart the API to import the new snapshot. Imports add or update source mappings without deleting additional mapping rows. The source and mapping SHA-256 checksums are stored in the snapshot; the imported mapping checksum is also stored per row.

Inspect the five requested columns directly in MySQL:

```sql
SELECT provinsi, kabupaten_kota, kecamatan, kelurahan_desa, kode_pos
FROM lfiinternal.master_mapping_wilayah
ORDER BY kode_provinsi, kode_kabupaten_kota, kode_kecamatan,
         kode_kelurahan_desa, kode_pos;
```

Authenticated API: `GET /api/v1/location-mapping?page=1&limit=100`. Optional exact filters: `kodeProvinsi`, `kodeKabupatenKota`, `kodeKecamatan`, `kodeKelurahanDesa`, and `kodePos`. The maximum page size is 500 rows. Village options at `/api/v1/location-masters?level=4&parentCode=...` include the `postalCodes` array.

Verify the mapping generator with `node --test tests/location-mapping.test.mjs`.
