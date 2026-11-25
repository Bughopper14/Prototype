/** Stores the ID scans (KTP, NPWP, passport, KITAS) of saved stakeholders in crm_fap_ocr_*. */
import {api} from '@/shared/lib/api';
import type {IdScan} from '@/features/ocr/lib/id-documents/types';

const SCAN_FIELDS = ['ktpData', 'npwpData', 'passportData', 'kitasData'];

/**
 * Called after the deed with these stakeholders was saved: each scan made in the stakeholder form is sent with the
 * stakeholder's id. A failed scan save does not undo the deed save; the next save sends it again.
 */
export async function saveStakeholderScans(rows: any[]) {
  for (const row of rows || []) {
    if (!row?.id) continue;
    for (const field of SCAN_FIELDS) {
      const scan: IdScan | undefined = row[field]?.scan;
      if (!scan?.data) continue;
      await api('/stakeholders/documents/save', 'POST', {
        stakeholder_id: row.id,
        doc_type: scan.docType,
        data: {...scan.data, file_name: scan.fileName, document_path: scan.documentPath, temp_key: scan.tempKey},
      }).catch(e => console.warn('Saving the scanned document failed:', e));
    }
  }
}
