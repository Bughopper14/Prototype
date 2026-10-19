import fs from 'node:fs';
import path from 'node:path';
import { all, query, close } from '../server/db';
import { FAP_SAMPLE_PDF, PREANALYSIS_SAMPLE_PDF, ICLF_SAMPLE_PDF, KTP_SAMPLE_IMAGE } from '../src/demo-scenarios-data';

async function sync() {
  console.log('🔄 Mengambil data 24 aplikasi dan customer dari database PGlite...');
  
  const customers = await all('Customer');
  const rawApps = await all('Application');
  
  // Urutkan berdasarkan fapNumber
  rawApps.sort((a, b) => (a.fapNumber || '').localeCompare(b.fapNumber || ''));
  
  const fullApps: any[] = [];
  for (let idx = 0; idx < rawApps.length; idx++) {
    const a = rawApps[idx];
    // Pastikan backward compatibility ID untuk unit test demo-app-0 s/d demo-app-5
    const originalId = a.id;
    const legacyMap: Record<string, string> = {
      '001/AF/IX/2026': 'demo-app-0',
      '002/AF/IX/2026': 'demo-app-1',
      '003/AF/IX/2026': 'demo-app-2',
      '004/AF/IX/2026': 'demo-app-3',
      '005/AF/IX/2026': 'demo-app-4',
      '006/AF/IX/2026': 'demo-app-5',
    };
    if (a.fapNumber && legacyMap[a.fapNumber]) {
      a.id = legacyMap[a.fapNumber];
    } else {
      a.id = `demo-app-${idx}`;
    }

    const legalRes = await query('SELECT legal FROM applications WHERE id=$1', [originalId]);
    a.legal = legalRes.rows[0]?.legal || {};
    a.customer = customers.find(c => c.id === a.customerId) || null;
    a.pic = (await all('ApplicationPic', { applicationId: originalId }))[0] || null;
    a.stakeholders = await all('Stakeholder', { applicationId: originalId });
    a.projects = await all('ProjectContract', { applicationId: originalId });
    a.bankReferences = await all('BankReference', { applicationId: originalId });
    a.financialStatements = await all('FinancialStatement', { applicationId: originalId });
    a.documentChecks = await all('DocumentChecklist', { applicationId: originalId });
    a.approvalLogs = await all('ApprovalLog', { applicationId: originalId });
    a.proposal = (await all('FinancingProposal', { applicationId: originalId }))[0] || null;
    
    if (a.proposal) {
      a.proposal.units = await all('FinancingUnitItem', { proposalId: a.proposal.id });
    }
    
    for (const d of a.documentChecks) {
      d.files = await all('DocumentFile', { checklistId: d.id });
      // demoData tidak perlu diduplikasi di setiap file agar ukuran bundle tidak membengkak
      for (const f of d.files) {
        delete f.demoData;
      }
    }
    
    // Jangan duplikasi base64 ktpUrl yang sama persis di setiap stakeholder dan legal deeds
    for (const s of (a.stakeholders || [])) {
      if (s.ktpUrl && s.ktpUrl.startsWith('data:image/')) {
        delete s.ktpUrl;
      }
    }
    if (a.legal?.deeds) {
      for (const deed of a.legal.deeds) {
        for (const key of ['parties', 'stakeholders', 'directors', 'commissioners', 'shareholders']) {
          if (Array.isArray(deed[key])) {
            for (const item of deed[key]) {
              if (item.ktpUrl && item.ktpUrl.startsWith('data:image/')) {
                delete item.ktpUrl;
              }
            }
          }
        }
      }
    }
    
    a.financialStatements.sort((x: any, y: any) => x.fiscalYear - y.fiscalYear);
    a.approvalLogs.sort((x: any, y: any) => new Date(y.actionTimestamp).getTime() - new Date(x.actionTimestamp).getTime());
    
    const signoffs = await query('SELECT * FROM review_signoffs WHERE application_id=$1', [originalId]);
    a.signoffs = signoffs.rows;
    
    fullApps.push(a);
  }
  
  console.log(`📦 Diambil: ${customers.length} customer dan ${fullApps.length} aplikasi lengkap.`);
  
  const content = `// Comprehensive Dummy Data for ALL 24 CRM LOS Scenarios
// Auto-synchronized from PGlite Database
// Generated for complete testing coverage

export const FAP_SAMPLE_PDF = ${JSON.stringify(FAP_SAMPLE_PDF)};
export const PREANALYSIS_SAMPLE_PDF = ${JSON.stringify(PREANALYSIS_SAMPLE_PDF)};
export const ICLF_SAMPLE_PDF = ${JSON.stringify(ICLF_SAMPLE_PDF)};
export const KTP_SAMPLE_IMAGE = ${JSON.stringify(KTP_SAMPLE_IMAGE)};

export const SCENARIO_CUSTOMERS = ${JSON.stringify(customers, null, 2)};

export const SCENARIO_APPLICATIONS = ${JSON.stringify(fullApps, null, 2)};
`;

  const targetPath = path.resolve('src/demo-scenarios-data.ts');
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('✅ Berhasil menyinkronkan data ke src/demo-scenarios-data.ts');
  
  await close();
}

sync().catch(e => {
  console.error('❌ Gagal sinkronisasi:', e);
  process.exit(1);
});
