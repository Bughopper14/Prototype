/** Where the EKITAS document comes from and whether it is available. */
import type {ResolverContext} from '@/features/documents/lib/checklist/types';

export function resolveEkitas({files, allStakeholders, row}: ResolverContext) {
  const wnaStakeholders = allStakeholders.filter(
    s => s.nationalityType === 'WNA' || s.citizenship === 'FOREIGN' || s.passportUrl || s.kitasUrl,
  );

  row.isMandatory = wnaStakeholders.length > 0;

  if (files.length > 0) {
    row.isAvailable = true;
    row.sourceType = 'MANUAL';
    row.sourceLabel = 'Upload Manual (Document Checklist)';
    row.sourceDetails = `Berkas diunggah: ${files[0].fileName}`;
    row.canDelete = true;
  } else if (wnaStakeholders.length > 0) {
    const hasWnaDoc = wnaStakeholders.some(s => s.passportUrl || s.kitasUrl || s.idNumber);
    if (hasWnaDoc) {
      row.isAvailable = true;
      row.sourceType = 'SYSTEM_LINKED';
      row.sourceLabel = 'Legal · Stakeholders (WNA)';
      row.sourceDetails = `Paspor/KITAS terdata untuk: ${wnaStakeholders.map(s => s.name).join(', ')}`;
      row.canDelete = false;
      row.previewUrl = wnaStakeholders[0]?.passportUrl || wnaStakeholders[0]?.kitasUrl || '';
    }
  } else {
    row.sourceDetails = 'Tidak ada pengurus / pemegang saham WNA (Tidak diwajibkan)';
  }
}
