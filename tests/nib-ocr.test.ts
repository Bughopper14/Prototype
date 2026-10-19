import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNibText, parseDateToIso, SAMPLE_NIB_TEXT } from '../src/nib-ocr';

test('NIB OCR parsing extracts all 5 mandatory fields from sample OSS text', () => {
  const result = parseNibText(SAMPLE_NIB_TEXT);

  // 1. Nomor NIB (13 digit)
  assert.equal(result.nib, '1209260000012');

  // 2. Alamat
  assert.equal(result.alamat, 'JL. JENDERAL SUDIRMAN KAV. 52-53, KARET SEMANGGI, SETIABUDI, JAKARTA SELATAN');

  // 3. Email
  assert.equal(result.email, 'legal@nusantaraminers.co.id');

  // 4. No Telepon
  assert.equal(result.phone, '021-52993000');

  // 5. Tanggal Terbit (converted to ISO YYYY-MM-DD)
  assert.equal(result.tanggalTerbit, '2021-01-15');
});

test('NIB OCR handles date formats and fallback variations', () => {
  assert.equal(parseDateToIso('24 Agustus 2022'), '2022-08-24');
  assert.equal(parseDateToIso('2023-11-05'), '2023-11-05');
  assert.equal(parseDateToIso('01/12/2020'), '2020-12-01');

  const textWithVariation = `
  BADAN USAHA: CV MANDIRI ABADI
  NIB : 9120001234567
  ALAMAT DOMISILI : Komp. Pergudangan Daan Mogot Blok A No. 12, Jakarta Barat
  Surel : contact@mandiriabadi.co.id
  Telephone : 021-54321987
  Ditetapkan pada tanggal 10 Oktober 2019
  `;

  const parsed = parseNibText(textWithVariation);
  assert.equal(parsed.nib, '9120001234567');
  assert.equal(parsed.email, 'contact@mandiriabadi.co.id');
  assert.equal(parsed.phone, '021-54321987');
  assert.equal(parsed.tanggalTerbit, '2019-10-10');
  assert.ok(parsed.alamat?.includes('Daan Mogot'));
});
