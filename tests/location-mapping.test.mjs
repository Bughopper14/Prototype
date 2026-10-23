import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLocationMapping } from '../scripts/lib/location-mapping.mjs';

const hierarchy = [
  { id: '01', name: 'Provinsi A', level: 1, parentId: null },
  { id: '01.01', name: 'Kabupaten A', level: 2, parentId: '01' },
  { id: '01.01.01', name: 'Kecamatan A', level: 3, parentId: '01.01' },
  { id: '01.01.01.0001', name: 'Desa A', level: 4, parentId: '01.01.01' },
  { id: '01.01.01.0002', name: 'Desa B', level: 4, parentId: '01.01.01' },
];
test('one village can have multiple postcodes and different villages can share a postcode', () => {
  const rows = buildLocationMapping(hierarchy, {
    '01.01.01.0001': ['01234', '01235', '01234'], '01.01.01.0002': '01234',
  }, 'https://example.com/source');
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => [row.kelurahan_desa, row.kode_pos]), [['Desa A', '01234'], ['Desa A', '01235'], ['Desa B', '01234']]);
  assert.equal(rows[0].provinsi, 'Provinsi A');
  assert.equal(rows[0].kode_kecamatan, '01.01.01');
});
test('missing postcodes and broken hierarchy fail rather than generating invented mappings', () => {
  assert.throws(() => buildLocationMapping(hierarchy, {}, 'source'), /Missing or invalid/);
  assert.throws(() => buildLocationMapping(hierarchy.filter(row => row.level !== 3), {}, 'source'), /Incomplete hierarchy/);
});
