/**
 * End-to-end check of the write path through the real HTTP API (login → customer → application → page saves →
 * legal → document upload/verify → pre-analysis → workflow transition → audit trail).
 *
 * It creates data, so run it against a TEST database only:
 *   DB_NAME=crm_test npm run db:setup
 *   DB_NAME=crm_test npm run user:create -- e2e-admin "E2e-Pass-123" "E2E Admin" --admin
 *   DB_NAME=crm_test npx next start -p 3100        (in another terminal)
 *   npx tsx scripts/dev/e2e-write-flow.ts
 *
 * Env: E2E_BASE (default http://localhost:3100), E2E_USER, E2E_PASSWORD.
 */
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE || 'http://localhost:3100';
const USER = process.env.E2E_USER || 'e2e-admin';
const PASSWORD = process.env.E2E_PASSWORD || 'E2e-Pass-123';

let cookie = '';
const results: {name: string; ok: boolean; detail: string}[] = [];

async function http(method: string, path: string, body?: unknown, extra: RequestInit = {}) {
  const isForm = body instanceof FormData;
  const response = await fetch(BASE + path, {
    method,
    headers: {
      ...(cookie ? {Cookie: cookie} : {}),
      ...(body && !isForm ? {'Content-Type': 'application/json'} : {}),
      Origin: BASE,
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    redirect: 'manual',
    ...extra,
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie?.startsWith('los_session=') && !setCookie.startsWith('los_session=;')) cookie = setCookie.split(';')[0];
  const text = await response.text();
  let data: any = text;
  try { data = JSON.parse(text); } catch { /* not JSON */ }
  return {status: response.status, data};
}

async function step<T>(name: string, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    const value = await fn();
    results.push({name, ok: true, detail: ''});
    console.log(`  ok    ${name}`);
    return value;
  } catch (error: any) {
    results.push({name, ok: false, detail: error.message});
    console.log(`  FAIL  ${name}\n        ${String(error.message).split('\n').join('\n        ')}`);
    return undefined;
  }
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
const expectStatus = (res: {status: number; data: any}, ...allowed: number[]) =>
  expect(allowed.includes(res.status), `HTTP ${res.status}: ${typeof res.data === 'string' ? res.data.slice(0, 300) : JSON.stringify(res.data).slice(0, 500)}`);

const unique = String(Date.now()).slice(-9);
const nib = `9${unique}`.padEnd(13, '0').slice(0, 13);
const npwp = `0${unique}`.padEnd(15, '1').slice(0, 15);

async function main() {
  console.log(`E2E write flow against ${BASE}`);

  await step('login rejects a wrong password', async () => {
    expectStatus(await http('POST', '/api/auth/login', {username: USER, password: 'wrong-password'}), 401);
  });
  await step('login accepts the right password and sets the session cookie', async () => {
    const res = await http('POST', '/api/auth/login', {username: USER, password: PASSWORD, next: '/crm-dashboard'});
    expectStatus(res, 200);
    expect(cookie, 'no session cookie returned');
    expect(res.data.redirect === '/crm-dashboard', 'redirect not honoured');
  });
  await step('/auth/me returns an administrator with authorities', async () => {
    const res = await http('GET', '/api/v1/auth/me');
    expectStatus(res, 200);
    expect(res.data.role === 'ADMIN' && res.data.authorities.length > 0, JSON.stringify(res.data).slice(0, 200));
  });
  await step('API without a session is rejected', async () => {
    const saved = cookie; cookie = '';
    const res = await http('GET', '/api/v1/applications');
    cookie = saved;
    expectStatus(res, 401);
  });
  await step('cross-origin write is rejected', async () => {
    const response = await fetch(`${BASE}/api/v1/user-activity`, {method: 'POST', headers: {'Content-Type': 'application/json', Cookie: cookie, Origin: 'http://evil.example'}, body: '{}'});
    expect(response.status === 403, `expected 403, got ${response.status}`);
  });
  await step('master data loads and revalidates with ETag (304)', async () => {
    const first = await fetch(`${BASE}/api/v1/master-data`, {headers: {Cookie: cookie, 'Accept-Encoding': 'gzip'}});
    expect(first.status === 200, `status ${first.status}`);
    const etag = first.headers.get('etag');
    expect(etag, 'no ETag');
    await first.arrayBuffer();
    const second = await fetch(`${BASE}/api/v1/master-data`, {headers: {Cookie: cookie, 'If-None-Match': etag!, 'Accept-Encoding': 'gzip'}});
    expect(second.status === 304, `expected 304, got ${second.status}`);
  });

  const customer = await step('create customer', async () => {
    const res = await http('POST', '/api/v1/customers', {companyName: `PT E2E Test ${unique}`, companyType: 'CORPORATE', nib, npwp});
    expectStatus(res, 200, 201);
    expect(res.data.id, 'no customer id');
    return res.data;
  });
  await step('customer validation rejects a bad NIB', async () => {
    expectStatus(await http('POST', '/api/v1/customers', {companyName: 'Bad', companyType: 'CORPORATE', nib: '123', npwp}), 422);
  });
  await step('draft customers without NIB/NPWP get unique placeholders and are not merged', async () => {
    const a = await http('POST', '/api/v1/customers', {companyName: `PT Draft A ${unique}`, companyType: 'CORPORATE'});
    await new Promise(r => setTimeout(r, 5));
    const b = await http('POST', '/api/v1/customers', {companyName: `PT Draft B ${unique}`, companyType: 'CORPORATE'});
    expectStatus(a, 200, 201);
    expectStatus(b, 200, 201);
    expect(a.data.id !== b.data.id, 'two blank-identifier customers were merged into one');
    expect(/^\d{13}$/.test(a.data.nib) && /^\d{15}$/.test(a.data.npwp), `placeholders: ${a.data.nib} / ${a.data.npwp}`);
  });
  expect(customer, 'cannot continue without a customer');

  const application = await step('create application (draft)', async () => {
    const res = await http('POST', '/api/v1/applications', {
      customerId: customer.id, customerStatus: 'EXISTING', branchCode: 'JKT01', companyAddress: 'Jl. Uji Coba No. 1',
      province: 'DKI JAKARTA', city: 'KOTA JAKARTA SELATAN', postalCode: '12930', phoneFax: '021123456',
      email: 'e2e@example.com', mainBusiness: 'Konstruksi', stage: 'FAP Stage',
    });
    expectStatus(res, 201);
    expect(/^\d{3}\/AF\/[IVX]+\/\d{4}$/.test(res.data.fapNumber || ''), `unexpected FAP number: ${res.data.fapNumber}`);
    expect(res.data.status === 'DRAFT', `status ${res.data.status}`);
    return res.data;
  });
  expect(application, 'cannot continue without an application');
  const id = application.id;

  await step('application is listed and readable', async () => {
    const list = await http('GET', '/api/v1/applications');
    expectStatus(list, 200);
    expect(list.data.some((a: any) => a.id === id), 'new application missing from the list');
    expectStatus(await http('GET', `/api/v1/applications/${id}`), 200);
    expectStatus(await http('GET', '/api/v1/applications/00000000-0000-0000-0000-000000000000'), 404);
  });

  await step('save page 1: profile + PIC + projects', async () => {
    const res = await http('PUT', `/api/v1/applications/${id}/page-1`, {
      profile: {branchCode: 'JKT01', companyAddress: 'Jl. Uji Coba No. 2', province: 'DKI JAKARTA', city: 'KOTA JAKARTA SELATAN',
        postalCode: '12930', phoneFax: '021123456', email: 'e2e@example.com', mainBusiness: 'Konstruksi',
        locationStatus: 'OWNED', repaymentSource: 'Operating Cash Flow', industrySegment: 'MINING', businessRole: 'CONTRACTORS', customerStatus: 'EXISTING'},
      customer: {companyName: `PT E2E Test ${unique}`, companyType: 'CORPORATE', nib, npwp},
      customerCategory: 'EXISTING',
      pic: {picName: 'Budi Uji', position: 'Direktur', phone: '081234567890', email: 'budi@example.com', currentAddress: 'Jl. PIC 1', province: 'DKI JAKARTA', city: 'KOTA JAKARTA SELATAN', postalCode: '12930'},
      projects: [{projectOwner: 'PT Pemilik', projectLocation: 'Kalimantan', projectRole: 'Kontraktor', contractStatus: 'EXISTING'}],
    });
    expectStatus(res, 200);
    expect(res.data.companyAddress === 'Jl. Uji Coba No. 2', `address not saved: ${res.data.companyAddress}`);
    expect(res.data.pic?.picName === 'Budi Uji', 'PIC not saved');
    expect(res.data.projects?.length === 1, `projects: ${res.data.projects?.length}`);
  });

  await step('save page 1 (tab 2): bank references + financing proposal keep earlier sections', async () => {
    const res = await http('PUT', `/api/v1/applications/${id}/page-1`, {
      projects: [{projectOwner: 'PT Pemilik', projectLocation: 'Kalimantan', projectRole: 'Kontraktor', contractStatus: 'EXISTING'}],
      bankReferences: [{bankOrFinInstitution: 'Bank Uji', currency: 'IDR', creditFacility: 1000000000, monthlyInstallment: 25000000, yearStarted: 2022, interestRate: 9.5, paymentRecord: 'Lancar', facilityStatus: 'Active'}],
      proposal: {facilityPurpose: 'INVESTMENT', financingMethod: 'INSTALLMENT_FINANCING', currency: 'IDR', financingValue: 2000000000, downPaymentValue: 400000000,
        interestRate: 10, tenorMonths: 36, paymentMethod: 'In Arrear',
        units: [{assetName: 'Excavator', unitCategory: 'HE', brand: 'LiuGong', unitType: 'Excavator', modelName: '922E', classTon: 22, quantity: 2, years: 2026}]},
    });
    expectStatus(res, 200);
    expect(res.data.bankReferences?.length === 1, `bank references: ${res.data.bankReferences?.length}`);
    expect(Number(res.data.proposal?.financingValue) === 2000000000, `proposal: ${JSON.stringify(res.data.proposal)?.slice(0, 200)}`);
    expect(res.data.projects?.length === 1, 'projects were wiped by the second save');
    expect(res.data.pic?.picName === 'Budi Uji', 'PIC was wiped by the second save');
  });

  await step('save page 2: three balanced financial statements', async () => {
    const year = (fiscalYear: number, scale: number) => ({
      fiscalYear, isAudited: true,
      currentAssets: 600 * scale, nonCurrentAssets: 400 * scale, totalAssets: 1000 * scale,
      currentLiabilities: 300 * scale, nonCurrentLiabilities: 200 * scale, totalLiabilities: 500 * scale,
      equity: 500 * scale, totalLiabAndEquity: 1000 * scale, revenue: 2000 * scale, grossMargin: 800 * scale,
      operatingMargin: 400 * scale, tax: 80 * scale, netIncome: 320 * scale,
    });
    const res = await http('PUT', `/api/v1/applications/${id}/page-2`, {financialStatements: [year(2023, 1e6), year(2024, 1.2e6), year(2025, 1.5e6)]});
    expectStatus(res, 200);
    expect(res.data.financialStatements?.length === 3, `statements: ${res.data.financialStatements?.length}`);
  });

  await step('page 2 stores an unbalanced sheet as a draft (balance is flagged in the data, not enforced on save)', async () => {
    const bad = {fiscalYear: 2025, isAudited: true, currentAssets: 1, nonCurrentAssets: 1, totalAssets: 2, currentLiabilities: 1, nonCurrentLiabilities: 1, totalLiabilities: 2, equity: 5, totalLiabAndEquity: 7, revenue: 1, grossMargin: 1, operatingMargin: 1, tax: 0, netIncome: 1};
    const res = await http('PUT', `/api/v1/applications/${id}/page-2`, {financialStatements: [bad]});
    expectStatus(res, 200);
    expect(res.data.financialStatements?.length === 1, `statements after draft save: ${res.data.financialStatements?.length}`);
  });

  await step('save legal: one establishment deed with a shareholder', async () => {
    const res = await http('PUT', `/api/v1/applications/${id}/page-legal`, {
      legal: {deeds: [{id: 'deed-e2e-1', type: 'establishment', deedNumber: '12', deedDate: '2020-01-15', ministerialDecreeNumber: 'AHU-0001', ministerialDecreeDate: '2020-02-01', remarks: '', parties: {representative: 'Budi Uji'}}], selectedDeedId: 'deed-e2e-1'},
      stakeholders: [{id: 'stk-e2e-1', stakeholderType: 'INDIVIDUAL', firstName: 'Budi', lastName: 'Uji', designation: 'DIRECTOR', representativeType: 'DIRECTOR',
        sharePercentage: 100, primaryCapital: 1000000, email: 'budi@example.com', mobilePhone: '081234567890', citizenship: 'INDONESIAN', idType: 'NONE'}],
    });
    expectStatus(res, 200);
    expect((res.data.legal?.deeds || []).length >= 1, `deeds: ${JSON.stringify(res.data.legal)?.slice(0, 300)}`);
  });

  await step('deed review: submit is validated, state is persisted', async () => {
    const detail = await http('GET', `/api/v1/applications/${id}`);
    const deed = detail.data.legal.deeds[0];
    const res = await http('POST', `/api/v1/applications/${id}/deeds/${deed.id}/review`, {action: 'SUBMIT', revision: deed.review?.revision || 1, comments: 'e2e'});
    expectStatus(res, 200, 409, 422, 403);
    if (res.status === 200) {
      const after = (await http('GET', `/api/v1/applications/${id}`)).data.legal.deeds[0];
      expect(after.review?.status === 'PENDING_CHECK', `review status after submit: ${after.review?.status}`);
    }
  });

  const checklist = await step('document checklist exists', async () => {
    const res = await http('GET', `/api/v1/applications/${id}/checklist`);
    expectStatus(res, 200);
    expect(res.data.length > 0, 'empty checklist');
    return res.data as any[];
  });
  const first = checklist?.find(d => String(d.documentCode).toUpperCase() !== 'FAP') || checklist?.[0];

  const uploaded = await step('upload a PDF to the checklist', async () => {
    const form = new FormData();
    form.append('file', new Blob(['%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'], {type: 'application/pdf'}), 'e2e.pdf');
    form.append('checklistId', first.id);
    form.append('documentCode', first.documentCode);
    const res = await http('POST', `/api/v1/applications/${id}/documents/upload`, form);
    expectStatus(res, 201);
    return res.data;
  });
  await step('upload rejects a fake PDF', async () => {
    const form = new FormData();
    form.append('file', new Blob(['not a pdf at all'], {type: 'application/pdf'}), 'fake.pdf');
    form.append('checklistId', first.id);
    expectStatus(await http('POST', `/api/v1/applications/${id}/documents/upload`, form), 422);
  });
  await step('uploaded file is visible, gets a signed URL and downloads', async () => {
    const detail = (await http('GET', `/api/v1/applications/${id}/checklist`)).data.find((d: any) => d.id === first.id);
    const file = detail.files?.[0];
    expect(file, `no file on the checklist item: ${JSON.stringify(detail).slice(0, 200)}`);
    const link = await http('GET', `/api/v1/files/${file.id}/url`);
    expectStatus(link, 200);
    const download = await fetch(BASE + link.data.url, {headers: {Cookie: cookie}});
    expect(download.status === 200, `download status ${download.status}`);
    expect((await download.text()).startsWith('%PDF-'), 'downloaded bytes are not the uploaded PDF');
  });
  await step('verify the document as BS', async () => {
    const res = await http('PATCH', `/api/v1/applications/${id}/checklist/${first.id}/verify`, {department: 'BS', isVerified: true, registrationDate: '2025-01-01', expiredDate: '2099-01-01', dataSummary: 'e2e', notes: 'ok'});
    expectStatus(res, 200);
  });
  await step('delete the uploaded file', async () => {
    const detail = (await http('GET', `/api/v1/applications/${id}/checklist`)).data.find((d: any) => d.id === first.id);
    expectStatus(await http('DELETE', `/api/v1/applications/${id}/documents/files/${detail.files[0].id}`), 200);
  });
  void uploaded;

  await step('pre-analysis: read defaults, save an edit, read it back', async () => {
    const read = await http('GET', `/api/v1/applications/${id}/pre-analysis`);
    expectStatus(read, 200);
    const data = {...read.data.data, customerProjectName: 'E2E Project Edited'};
    expectStatus(await http('PUT', `/api/v1/applications/${id}/pre-analysis`, data), 200);
    const again = await http('GET', `/api/v1/applications/${id}/pre-analysis`);
    expect(again.data.data.customerProjectName === 'E2E Project Edited', 'edit was not persisted');
  });

  await step('workflow gate: submitting without the signed FAP document is refused with a clear message', async () => {
    const res = await http('POST', `/api/v1/applications/${id}/transition`, {action: 'SUBMIT_TO_BS', comments: 'e2e'});
    expectStatus(res, 409, 422);
    expect(/FAP/i.test(res.data.message || ''), `unexpected message: ${res.data.message}`);
  });

  await step('upload the signed FAP document, approve it and enter Pre-analysis', async () => {
    const list = (await http('GET', `/api/v1/applications/${id}/checklist`)).data as any[];
    const fap = list.find(d => String(d.documentCode).toUpperCase() === 'FAP');
    expect(fap, 'no FAP checklist item');
    const form = new FormData();
    // A real scanned FAP form when the fixture is present (so the OCR comparison can run), otherwise a stub PDF.
    const sample = path.resolve('scripts/dev/fixtures/test_doc_fap_stage.pdf');
    const bytes = existsSync(sample) ? readFileSync(sample) : Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
    form.append('file', new Blob([new Uint8Array(bytes)], {type: 'application/pdf'}), 'fap-signed.pdf');
    form.append('checklistId', fap.id);
    form.append('documentCode', 'FAP');
    expectStatus(await http('POST', `/api/v1/applications/${id}/documents/upload`, form), 201);
    const approved = await http('POST', `/api/v1/applications/${id}/fap-changes/approve`, {remarks: 'e2e approve'});
    expectStatus(approved, 200);
    const detail = (await http('GET', `/api/v1/applications/${id}`)).data;
    expect(detail.stage === 'Pre-analysis', `stage after approve: ${detail.stage}`);
  });

  await step('FAP OCR comparison reads the signed PDF (needs services/ocr set up; skipped otherwise)', async () => {
    if (!existsSync(path.resolve('scripts/dev/fixtures/test_doc_fap_stage.pdf'))) { console.log('        → fixture missing, skipped'); return; }
    let comparison: any = null;
    for (let attempt = 0; attempt < 20 && !comparison?.extractedData?.companyName; attempt++) {
      const res = await http('POST', `/api/v1/applications/${id}/fap-comparison/run`, {});
      if (res.status === 200) comparison = res.data.comparison;
      if (!comparison?.extractedData?.companyName) await new Promise(r => setTimeout(r, 2000));
    }
    expect(comparison?.extractedData?.companyName, `no OCR result: ${JSON.stringify(comparison)?.slice(0, 200)}`);
    console.log(`        → OCR read company "${comparison.extractedData.companyName}", ${comparison.diffs.length} difference(s) against the saved data`);
  });

  await step('FAP submission archive is written and immutable', async () => {
    const archives = await http('GET', `/api/v1/applications/${id}/fap-archive`);
    expectStatus(archives, 200);
    expect(archives.data.archives.length >= 1, 'no archive row was recorded');
    expectStatus(await http('DELETE', `/api/v1/applications/${id}/fap-archive`), 403);
  });

  await step('workflow: submit to BS (accepted, or refused with the missing-data reason)', async () => {
    const res = await http('POST', `/api/v1/applications/${id}/transition`, {action: 'SUBMIT_TO_BS', comments: 'e2e'});
    expectStatus(res, 200, 409, 422);
    console.log(`        → HTTP ${res.status}${res.status === 200 ? ` status=${res.data.status}` : ` ${(res.data.message || '').slice(0, 200)}`}`);
    if (res.status === 200) expect(res.data.status === 'SUBMITTED_TO_BS', `status ${res.data.status}`);
  });

  await step('stage switch back to FAP Stage', async () => {
    expectStatus(await http('PUT', `/api/v1/applications/${id}/stage`, {stage: 'FAP Stage'}), 200);
  });

  await step('activity feed records the changes', async () => {
    const res = await http('GET', '/api/v1/activity');
    expectStatus(res, 200);
    expect(res.data.some((a: any) => a.applicationId === id), 'no activity row for the application');
  });
  await step('notifications endpoint works', async () => expectStatus(await http('GET', '/api/v1/notifications'), 200));

  await step('user management: list, create, edit, permission, delete a user', async () => {
    const overview = await http('GET', '/api/v1/um/overview');
    expectStatus(overview, 200);
    const name = `e2e-user-${unique}`;
    const created = await http('POST', '/api/v1/um/users', {username: name, full_name: 'E2E User', position: 'Staff', email: `${name}@example.com`, password: 'Secret-123'});
    expectStatus(created, 201);
    const userId = created.data.id;
    expectStatus(await http('PUT', `/api/v1/um/users/${userId}`, {username: name, full_name: 'E2E User Edited', position: 'Staff', email: `${name}@example.com`}), 200);
    expectStatus(await http('PUT', `/api/v1/um/users/${userId}/permissions`, {'2': '3'}), 200);
    expectStatus(await http('PUT', `/api/v1/um/users/${userId}/session-timeout`, {timeout_minutes: 30}), 200);
    expectStatus(await http('POST', `/api/v1/um/users/${userId}/force-logout`, {}), 200);
    const second = await fetch(`${BASE}/api/auth/login`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: name, password: 'Secret-123'})});
    expect(second.status === 200, `new user cannot log in: ${second.status}`);
    expectStatus(await http('DELETE', `/api/v1/um/users/${userId}`), 200);
  });

  await step('logout invalidates the session', async () => {
    expectStatus(await http('POST', '/api/auth/logout', {}), 200);
    const res = await http('GET', '/api/v1/applications');
    expectStatus(res, 401);
  });

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch(error => { console.error(error); process.exit(1); });
