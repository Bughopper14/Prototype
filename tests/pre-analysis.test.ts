import test from 'node:test';
import assert from 'node:assert/strict';
import { getPreAnalysisData, savePreAnalysisData, DEFAULT_PRE_ANALYSIS_DATA } from '../server/pre-analysis-store';

test('pre-analysis store initializes with full 7-section default payload', async () => {
  const data = await getPreAnalysisData('test-app-001');
  assert.ok(data, 'Pre-analysis data should not be null');
  assert.equal(data.preAnalysisNo, '047/PREANA/MKT/IX/2026');
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
    preAnalysisNo: '099/PREANA/TEST/2026',
    customerProjectName: 'PT Handalan Testing Mandiri',
    recommendation: 'RECOMMEND WITH CONDITIONS',
    goodCustomer: true,
  };

  const saved = await savePreAnalysisData('test-app-custom', customData);
  assert.equal(saved.preAnalysisNo, '099/PREANA/TEST/2026');
  assert.equal(saved.customerProjectName, 'PT Handalan Testing Mandiri');
  assert.equal(saved.recommendation, 'RECOMMEND WITH CONDITIONS');

  const retrieved = await getPreAnalysisData('test-app-custom');
  assert.equal(retrieved.preAnalysisNo, '099/PREANA/TEST/2026');
  assert.equal(retrieved.customerProjectName, 'PT Handalan Testing Mandiri');
  assert.equal(retrieved.goodCustomer, true);
});
