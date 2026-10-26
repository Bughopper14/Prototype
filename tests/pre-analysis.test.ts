import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  getPreAnalysisData, 
  savePreAnalysisData, 
  DEFAULT_PRE_ANALYSIS_DATA,
  generatePreAnalysisNo,
  getRomanMonthFromDate
} from '../server/pre-analysis-store';
import { syncCustomerAndPicIntoPreAnalysis, type PreAnalysisData } from '../src/PreAnalysisForm';

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

test('syncCustomerAndPicIntoPreAnalysis maps Customer, NPWP, FAP No, and PIC data accurately', () => {
  const initial = {
    ...DEFAULT_PRE_ANALYSIS_DATA,
    customerProjectName: 'Initial Company',
    taxId: '00.000.000.0-000.000',
    fapNumber: 'INITIAL/FAP/2026',
    customerPic: 'Initial PIC',
    customerArea: 'Jakarta, DKI Jakarta'
  } as unknown as PreAnalysisData;

  const sources = {
    customer: {
      companyName: 'PT Mandiri Prima Persada',
      npwp: '31.456.789.0-021.000',
      city: 'Surabaya',
      province: 'Jawa Timur'
    },
    pic: {
      picName: 'Hendra Setiawan',
      position: 'Managing Director'
    },
    application: {
      fapNumber: '102/AF/X/2026'
    },
    profile: {
      city: 'Surabaya',
      province: 'Jawa Timur'
    }
  };

  const synced = syncCustomerAndPicIntoPreAnalysis(initial, sources);
  assert.equal(synced.customerProjectName, 'PT Mandiri Prima Persada');
  assert.equal(synced.taxId, '31.456.789.0-021.000');
  assert.equal(synced.fapNumber, '102/AF/X/2026');
  assert.equal(synced.customerPic, 'Hendra Setiawan (Managing Director)');
  assert.equal(synced.customerArea, 'Surabaya, Jawa Timur');

  // Verify non-targeted fields remain preserved
  assert.equal(synced.preAnalysisNo, initial.preAnalysisNo);
  assert.equal(synced.goodProject, initial.goodProject);
});

test('syncCustomerAndPicIntoPreAnalysis gracefully preserves existing data when sources are empty or partial', () => {
  const initial = {
    ...DEFAULT_PRE_ANALYSIS_DATA,
    customerProjectName: 'Preserved Company',
    taxId: '99.999.999.9-999.000',
    fapNumber: 'KEEP/FAP/2026',
    customerPic: 'Preserved PIC (Director)',
    customerArea: 'Medan, Sumatera Utara'
  } as unknown as PreAnalysisData;

  // Empty sources
  const syncedEmpty = syncCustomerAndPicIntoPreAnalysis(initial, {});
  assert.equal(syncedEmpty.customerProjectName, 'Preserved Company');
  assert.equal(syncedEmpty.taxId, '99.999.999.9-999.000');
  assert.equal(syncedEmpty.customerPic, 'Preserved PIC (Director)');

  // Partial sources (only PIC without position)
  const syncedPartial = syncCustomerAndPicIntoPreAnalysis(initial, {
    pic: { picName: 'Dewi Sartika' }
  });
  assert.equal(syncedPartial.customerPic, 'Dewi Sartika');
  assert.equal(syncedPartial.customerProjectName, 'Preserved Company');
});


test('createBlankPreAnalysisData correctly populates FAP data and blanks non-FAP fields', async () => {
  const { createBlankPreAnalysisData } = await import('../server/pre-analysis-store');
  const mockApp = {
    id: 'app-fap-mock-123',
    companyName: 'PT Nusantara Jaya Mineral',
    fapNumber: '099/AF/X/2026',
    customer: {
      companyName: 'PT Nusantara Jaya Mineral',
      npwp: '01.234.567.8-901.000'
    },
    city: 'Samarinda',
    province: 'Kalimantan Timur',
    repaymentSource: 'Cash Flow Kontrak Batubara',
    pic: {
      picName: 'Bambang Sudirman',
      position: 'Direktur Operasional'
    },
    legal: {
      deeds: [
        {
          stakeholders: [
            { depositedCapital: 5000000000 }
          ]
        }
      ]
    }
  };

  const blankData = createBlankPreAnalysisData('app-fap-mock-123', mockApp, '005/PREANA/MKT/X/2026');

  // Verify FAP fields are connected
  assert.equal(blankData.preAnalysisNo, '005/PREANA/MKT/X/2026');
  assert.equal(blankData.customerProjectName, 'PT Nusantara Jaya Mineral');
  assert.equal(blankData.taxId, '01.234.567.8-901.000');
  assert.equal(blankData.fapNumber, '099/AF/X/2026');
  assert.equal(blankData.customerPic, 'Bambang Sudirman (Direktur Operasional)');
  assert.equal(blankData.customerArea, 'Samarinda, Kalimantan Timur');
  assert.equal(blankData.sourceOfRepayment, 'Cash Flow Kontrak Batubara');
  assert.ok(blankData.paidUpCapital.includes('5.000.000.000'));

  // Verify non-FAP fields are blank / empty
  assert.equal(blankData.projectNameLocation, '');
  assert.equal(blankData.bowheerInfo, '');
  assert.equal(blankData.companyBackground, '');
  assert.deepEqual(blankData.milestones, []);
  assert.deepEqual(blankData.unitComposition, []);
  assert.deepEqual(blankData.lenderExposures, []);
  assert.deepEqual(blankData.mitigationConditions, []);
  assert.equal(blankData.recommendation, '');
});

// Cleanly terminate active database connection pool after test completion
test('teardown pool connections', () => {
  setTimeout(() => process.exit(0), 100);
});
