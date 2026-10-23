import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  getPreAnalysisData, 
  savePreAnalysisData, 
  DEFAULT_PRE_ANALYSIS_DATA,
  generatePreAnalysisNo,
  getRomanMonthFromDate
} from '../server/pre-analysis-store';

test('pre-analysis number auto-increment starts from 1 with 000/PREANA/MKT/IX/YYYY template', () => {
  // Test starting from 1
  const first = generatePreAnalysisNo([], '07-Sep-2026');
  assert.equal(first, '001/PREANA/MKT/IX/2026');

  // Test sequential increment
  const second = generatePreAnalysisNo(['001/PREANA/MKT/IX/2026'], '07-Sep-2026');
  assert.equal(second, '002/PREANA/MKT/IX/2026');

  const third = generatePreAnalysisNo(['001/PREANA/MKT/IX/2026', '002/PREANA/MKT/IX/2026'], '07-Sep-2026');
  assert.equal(third, '003/PREANA/MKT/IX/2026');

  // Test 3-digit zero-padding format
  const fortyEighth = generatePreAnalysisNo(['047/PREANA/MKT/IX/2026'], '07-Sep-2026');
  assert.equal(fortyEighth, '048/PREANA/MKT/IX/2026');

  // Test month Roman numeral conversion
  assert.equal(getRomanMonthFromDate('07-Sep-2026'), 'IX');
  assert.equal(getRomanMonthFromDate('15-Oct-2026'), 'X');
  assert.equal(getRomanMonthFromDate('01-Jan-2026'), 'I');
});

test('pre-analysis store initializes with 001/PREANA/MKT/IX/2026 default payload', async () => {
  const data = await getPreAnalysisData('test-fresh-app-001');
  assert.ok(data, 'Pre-analysis data should not be null');
  assert.match(data.preAnalysisNo, /^\d{3}\/PREANA\/MKT\/(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\/\d{4}$/);
  assert.equal(data.customerProjectName, 'PT Handalan Putramas Santosa (HPS)');
  assert.equal(data.taxId, '27.817.616.9-041.000');
  assert.equal(data.fapNumber, '070/AF/VIII/2026');
  assert.equal(data.recommendation, 'NOT RECOMMEND TO FULL DOCUMENTATION');
  assert.equal(data.goodProject, true);
  assert.equal(data.goodCustomer, false);
  assert.ok(Array.isArray(data.milestones), 'milestones should be an array');
  assert.ok(Array.isArray(data.unitComposition), 'unitComposition should be an array');
  assert.ok(Array.isArray(data.lenderExposures), 'lenderExposures should be an array');
});

test('pre-analysis store persists updates and retrieves saved values', async () => {
  const customData = {
    ...DEFAULT_PRE_ANALYSIS_DATA,
    preAnalysisNo: '001/PREANA/MKT/IX/2026',
    customerProjectName: 'PT Handalan Testing Mandiri',
    recommendation: 'RECOMMEND WITH CONDITIONS',
    goodCustomer: true,
  };

  const saved = await savePreAnalysisData('test-app-custom', customData);
  assert.equal(saved.preAnalysisNo, '001/PREANA/MKT/IX/2026');
  assert.equal(saved.customerProjectName, 'PT Handalan Testing Mandiri');
  assert.equal(saved.recommendation, 'RECOMMEND WITH CONDITIONS');

  const retrieved = await getPreAnalysisData('test-app-custom');
  assert.equal(retrieved.preAnalysisNo, '001/PREANA/MKT/IX/2026');
  assert.equal(retrieved.customerProjectName, 'PT Handalan Testing Mandiri');
  assert.equal(retrieved.goodCustomer, true);
});
