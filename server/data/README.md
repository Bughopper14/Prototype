# Indonesia region master data

`indonesia-regions.json.gz` is a local snapshot of Indonesia's province, regency/city, district, and village hierarchy with postal codes. It was downloaded from the Emsifa Indonesia Region API on 2026-09-30; the source reported an update date of 2026-09-27 and 38 provinces, 514 regencies/cities, 7,285 districts, and 83,762 villages.

Source and attribution: [emsifa/api-wilayah-indonesia](https://github.com/emsifa/api-wilayah-indonesia). The API documents its source data as originating from [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) and [cahyadsn/wilayah_kodepos](https://github.com/cahyadsn/wilayah_kodepos). The generator repository is MIT licensed; retain this attribution when redistributing the snapshot.

To refresh the snapshot, run `node scripts/download-indonesia-regions.mjs`. The application imports or completes the snapshot on startup into four linked master tables: `master_provinsi`, `master_kabupaten_kota`, `master_kecamatan`, and `master_kelurahan_desa`. Postal codes are stored per village in `master_kelurahan_desa.postal_code`.
