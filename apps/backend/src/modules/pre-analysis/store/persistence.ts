/** Loading and saving the Pre-Analysis of an application. */
import {pool} from '../../../core/db/pool';
import {generatePreAnalysisNo, getAllPreAnalysisNumbers} from './numbering';
import {DEFAULT_PRE_ANALYSIS_DATA, createBlankPreAnalysisData} from './defaults';

/** Table application_pre_analysis is defined in db/schema.sql. */
export async function initPreAnalysisStore() {
  await pool.query('SELECT 1 FROM application_pre_analysis LIMIT 1');
}

export async function getPreAnalysisData(appId: string, appRecord?: any): Promise<any> {
  let storedData: any = null;

  const [rows] = await pool.query<any[]>(
    'SELECT form_data FROM application_pre_analysis WHERE application_id = ?',
    [appId],
  );
  if (rows[0]?.form_data) {
    storedData = typeof rows[0].form_data === 'string' ? JSON.parse(rows[0].form_data) : rows[0].form_data;
  }

  // Check if existing stored data is old dummy fallback data (e.g. PT Handalan Putramas Santosa when real app is different)
  const isOldDummy =
    storedData &&
    storedData.customerProjectName === 'PT Handalan Putramas Santosa (HPS)' &&
    appRecord &&
    appRecord.companyName &&
    appRecord.companyName !== 'PT Handalan Putramas Santosa (HPS)';

  if (!storedData || isOldDummy) {
    const existingNumbers = await getAllPreAnalysisNumbers();
    const nextNo = generatePreAnalysisNo(existingNumbers, new Date());

    if (appRecord) {
      const initialData = createBlankPreAnalysisData(appId, appRecord, nextNo);
      await savePreAnalysisData(appId, initialData);
      return initialData;
    }

    return {
      ...DEFAULT_PRE_ANALYSIS_DATA,
      preAnalysisNo: nextNo,
    };
  }

  // If storedData exists and appRecord is provided, ensure any missing key FAP info is kept up-to-date
  if (appRecord) {
    let updated = false;
    const companyName = appRecord.customer?.companyName || appRecord.companyName;
    if (companyName && !storedData.customerProjectName) {
      storedData.customerProjectName = companyName;
      updated = true;
    }
    const npwp = appRecord.customer?.npwp || appRecord.npwp;
    if (npwp && !storedData.taxId) {
      storedData.taxId = npwp;
      updated = true;
    }
    if (appRecord.fapNumber && !storedData.fapNumber) {
      storedData.fapNumber = appRecord.fapNumber;
      updated = true;
    }
    if (updated) {
      await savePreAnalysisData(appId, storedData);
    }
  }

  return storedData;
}

export async function savePreAnalysisData(appId: string, data: any): Promise<any> {
  await pool.query(
    `INSERT INTO application_pre_analysis (application_id, form_data) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE form_data = VALUES(form_data), updated_at = CURRENT_TIMESTAMP`,
    [appId, JSON.stringify(data, null, 2)],
  );
  return data;
}
