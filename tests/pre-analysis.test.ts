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

test('pre-analysis default payload includes Section 5 delivery & Section 7 competition table matching PDF', async () => {
  const data = await getPreAnalysisData('test-fresh-app-002');
  // Section 5 Delivery & QA check
  assert.ok(data.deliveryStatus, 'deliveryStatus should exist');
  assert.match(data.deliveryStatus, /Not yet Deliver/i);
  assert.ok(data.deliveryDate, 'deliveryDate should exist');
  assert.ok(data.qaConclusion, 'qaConclusion should exist');

  // Section 7 Competition Table (13 finco rows)
  assert.ok(Array.isArray(data.competitionTable), 'competitionTable should be an array');
  assert.equal(data.competitionTable.length, 13, 'competitionTable should contain 13 competitor benchmark rows');
  assert.equal(data.competitionTable[0].finco, 'Komatsu Astra Finance (KAF)');
  assert.equal(data.competitionTable[12].finco, 'SMFL');
});

test('pre-analysis Section 2 separates holding group, project name, location, and existing/new projects', async () => {
  const data = await getPreAnalysisData('test-fresh-app-003');
  // Holding Group (STAR GROUP)
  assert.ok(data.holdingGroup, 'holdingGroup must exist');
  assert.match(data.holdingGroup, /STAR GROUP/i);

  // Project Name & Location distinct fields
  assert.ok(data.projectName, 'projectName must exist');
  assert.match(data.projectName, /Land Clearing|Harvesting/i);
  assert.ok(data.projectLocation, 'projectLocation must exist');
  assert.match(data.projectLocation, /Sumatera|Jakarta/i);

  // Existing Projects vs New Projects distinct fields
  assert.ok(data.existingProjects, 'existingProjects must exist');
  assert.match(data.existingProjects, /PT Handalan Putramas Santosa/i);
  assert.match(data.existingProjects, /PT Pangan Sejahtera Santosa/i);

  assert.ok(data.newProjects, 'newProjects must exist');
  assert.match(data.newProjects, /PT Harta Putramas Santosa/i);
});

test('pre-analysis Section 3 separates company background, star group milestones narrative, business dev background, and operational team info', async () => {
  const data = await getPreAnalysisData('test-fresh-app-004');
  // Company Background
  assert.ok(data.companyBackground, 'companyBackground must exist');
  assert.match(data.companyBackground, /PT Handalan Putramas Santosa/i);

  // STAR Group Milestones Narrative
  assert.ok(data.starGroupMilestonesNarrative, 'starGroupMilestonesNarrative must exist');
  assert.match(data.starGroupMilestonesNarrative, /PT PASS Established/i);
  assert.match(data.starGroupMilestonesNarrative, /PT STAR Established as Holding Company/i);
  assert.match(data.starGroupMilestonesNarrative, /PT HPS Established/i);

  // Business Development Background (Mr. Herry Tho)
  assert.ok(data.businessDevBackground, 'businessDevBackground must exist');
  assert.match(data.businessDevBackground, /Mr\. Herry Tho/i);
  assert.match(data.businessDevBackground, /DNR Logistics/i);

  // Other Information / Operational Team
  assert.ok(data.operationalTeamInfo, 'operationalTeamInfo must exist');
  assert.match(data.operationalTeamInfo, /Sarindo/i);

  // UBO (Ultimate Beneficiary Owner)
  assert.ok(data.uboInfo || data.ubo, 'ubo / uboInfo must exist');
  assert.match(data.uboInfo || data.ubo, /Mr\. Hansen Santosa/i);

  // UBO Information (Separate column before company milestones)
  assert.ok(data.uboInformation, 'uboInformation must exist as a separate field');
  assert.match(data.uboInformation, /STAR GROUP Corporate/i);
  assert.match(data.uboInformation, /PT Sentosa Abadi Raja/i);
});

test('pre-analysis Section 6 includes dealerCheck field matching PDF', async () => {
  const data = await getPreAnalysisData('test-fresh-app-005');
  assert.ok(data.dealerCheck, 'dealerCheck must exist');
  assert.match(data.dealerCheck, /No Records Payment|New Liugong Customer/i);
  assert.ok(data.topDealerToCustomer, 'topDealerToCustomer must exist');
  assert.ok(data.lmiArCheck, 'lmiArCheck must exist');
});

test('pre-analysis Section 7 includes full approval committee sign-off fields matching PDF', async () => {
  const data = await getPreAnalysisData('test-fresh-app-006');
  // 3 Committee Signatories
  assert.ok(data.proposedBy, 'proposedBy must exist');
  assert.match(data.proposedBy, /Amanda Cynthia/i);
  assert.match(data.proposedBy, /Senior Account Manager/i);

  assert.ok(data.reviewedBy, 'reviewedBy must exist');
  assert.match(data.reviewedBy, /Maria Regina/i);
  assert.match(data.reviewedBy, /Dept\. Head/i);

  assert.ok(data.approvedBy, 'approvedBy must exist');
  assert.match(data.approvedBy, /Jembar Ganda E/i);
  assert.match(data.approvedBy, /Director/i);
});

