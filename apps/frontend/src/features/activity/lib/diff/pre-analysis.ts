/** Changes found in: Pre-Analysis form. */
import type {DiffContext} from '@/features/activity/lib/diff/types';

export function diffPreAnalysis({changes}: DiffContext) {
  changes.push({
    section: 'Pre Analysis form',
    subSection: 'Credit Evaluation & Analyst Remarks',
    field: 'creditRemarks',
    label: 'Catatan Analisis Kredit & Mitigasi Risiko',
    oldValue: 'Drafting initial evaluation',
    newValue: 'Saved credit analyst evaluation, risk flags, and qualitative remarks.',
  });
  changes.push({
    section: 'Pre Analysis form',
    subSection: 'Facility Structure & Proposed Terms',
    field: 'proposedTerms',
    label: 'Verifikasi Syarat Fasilitas Kredit',
    oldValue: 'Pending term verification',
    newValue: 'Verified active vs proposed credit facility terms.',
  });
}
