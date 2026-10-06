import { createWriteStream } from 'node:fs';
import { mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createGzip } from 'node:zlib';

const base = 'https://www.emsifa.com/api-wilayah-indonesia/v2';
const output = path.resolve('server/data/indonesia-regions.json.gz');
const concurrency = 40;

async function fetchData(resource) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(`${base}/${resource}.json`);
      if (!response.ok) throw new Error(`${response.status} ${resource}`);
      const body = await response.json();
      return body.data;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function mapLimit(values, limit, fn) {
  const output = new Array(values.length);
  let next = 0;
  async function worker() {
    while (true) {
      const index = next++;
      if (index >= values.length) return;
      output[index] = await fn(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return output;
}

const provinces = await fetchData('provinces');
const rows = provinces.map(x => ({ id: x.id, name: x.name, level: 1, parentId: null, postalCode: null }));
console.log(`Loaded ${provinces.length} provinces`);

const regenciesByProvince = await mapLimit(provinces, concurrency, p => fetchData(`regencies/${p.id}`));
const regencies = regenciesByProvince.flat();
rows.push(...regencies.map(x => ({ id: x.id, name: x.name, level: 2, parentId: x.id.slice(0, x.id.lastIndexOf('.')), postalCode: null })));
console.log(`Loaded ${regencies.length} regencies/cities`);

const districtsByRegency = await mapLimit(regencies, concurrency, r => fetchData(`districts/${r.id}`));
const districts = districtsByRegency.flat();
rows.push(...districts.map(x => ({ id: x.id, name: x.name, level: 3, parentId: x.id.slice(0, x.id.lastIndexOf('.')), postalCode: null })));
console.log(`Loaded ${districts.length} districts`);

let completedDistricts = 0;
const villagesByDistrict = await mapLimit(districts, concurrency, async d => {
  const villages = await fetchData(`villages/${d.id}`);
  completedDistricts++;
  if (completedDistricts % 500 === 0) console.log(`Loaded villages for ${completedDistricts}/${districts.length} districts`);
  return villages;
});
const villages = villagesByDistrict.flat();
rows.push(...villages.map(x => ({ id: x.id, name: x.name, level: 4, parentId: x.id.slice(0, x.id.lastIndexOf('.')), postalCode: x.postal_code || null })));
console.log(`Loaded ${villages.length} villages; writing ${rows.length} records`);

await mkdir(path.dirname(output), { recursive: true });
const temp = `${output}.tmp`;
await pipeline(
  ReadableFromRows(rows),
  createGzip({ level: 9 }),
  createWriteStream(temp),
);
await rename(temp, output);
console.log(`Wrote ${output}`);

function ReadableFromRows(value) {
  return Readable.from([JSON.stringify(value)]);
}
