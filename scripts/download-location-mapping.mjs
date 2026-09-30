import fs from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import crypto from 'node:crypto';
import { buildLocationMapping } from './lib/location-mapping.mjs';

const sourceUrl = 'https://raw.githubusercontent.com/cahyadsn/wilayah_kodepos/main/json/wilayah_kodepos.json';
const sourceFileIndex = process.argv.indexOf('--source-file');
let sourceText;
if (sourceFileIndex >= 0) {
  if (!process.argv[sourceFileIndex + 1]) throw new Error('--source-file requires a filename');
  sourceText = await fs.readFile(process.argv[sourceFileIndex + 1], 'utf8');
} else {
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Postal source returned HTTP ${response.status}`);
  sourceText = await response.text();
}
const regions = JSON.parse(gunzipSync(await fs.readFile('server/data/indonesia-regions.json.gz')).toString('utf8'));
const postalByVillage = JSON.parse(sourceText);
const rows = buildLocationMapping(regions, postalByVillage, sourceUrl);
const villageCount = regions.filter(row => row.level === 4).length;
const knownVillages = new Set(rows.map(row => row.kode_kelurahan_desa));
const unmatchedSourceCodes = Object.keys(postalByVillage).filter(code => !knownVillages.has(code));
if (unmatchedSourceCodes.length) throw new Error(`Postal source has ${unmatchedSourceCodes.length} unmatched village codes; refresh hierarchy before importing.`);
const snapshot = {
  downloadedAt: new Date().toISOString(), sourceUrl,
  sourceSha256: crypto.createHash('sha256').update(sourceText).digest('hex'),
  mappingSha256: crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
  villageCount, rowCount: rows.length, rows,
};
const output = 'server/data/mapping-wilayah.json.gz';
await fs.writeFile(`${output}.tmp`, gzipSync(JSON.stringify(snapshot), { level: 9 }));
await fs.rename(`${output}.tmp`, output);
const counts = new Map();
for (const row of rows) counts.set(row.kode_kelurahan_desa, (counts.get(row.kode_kelurahan_desa) || 0) + 1);
console.log(JSON.stringify({output, villages: villageCount, rows: rows.length, villagesWithMultiplePostalCodes: [...counts.values()].filter(n => n > 1).length, sourceSha256: snapshot.sourceSha256}));
