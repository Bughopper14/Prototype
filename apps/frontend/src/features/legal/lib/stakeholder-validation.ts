/** Checks a stakeholder before it is saved: total shares of the deed and the mandatory fields. */
import {isFieldMandatory} from '@/shared/master-data';
import {stakeholderFields} from '@liugong/shared';

/** The error message to show, or null when the stakeholder can be saved. */
export function stakeholderSaveError({
  valToSave,
  rows,
  index,
  mandatoryRules,
}: {
  valToSave: any;
  rows: any[];
  index: number;
  mandatoryRules: Parameters<typeof isFieldMandatory>[0];
}): string | null {
  // The shares of one deed can never add up to more than 100%
  const otherRows = index >= 0 ? rows.filter((_, i) => i !== index) : rows;
  const otherTotal = otherRows.reduce((sum, r) => sum + (parseFloat(String(r.sharePercentage || 0)) || 0), 0);
  const thisShare = parseFloat(String(valToSave.sharePercentage || 0)) || 0;
  const totalShare = Math.round((otherTotal + thisShare) * 100) / 100;
  if (totalShare > 100) {
    return `Tidak dapat menyimpan: Total persentase saham pada akta ini menjadi ${totalShare.toFixed(2)}% (melebihi batas 100%). Pemegang saham lain: ${otherTotal.toFixed(2)}%. Maksimal yang dapat diinput: ${Math.max(0, 100 - otherTotal).toFixed(2)}%.`;
  }
  for (const f of stakeholderFields) {
    if (!isFieldMandatory(mandatoryRules, 'Shareholders & Management', f.key, false, 'FAP')) continue;
    const val = valToSave[f.key];
    if (
      val === undefined ||
      val === null ||
      String(val).trim() === '' ||
      (f.type === 'select' && val === 'NONE')
    ) {
      return `${f.label} is mandatory and must be filled.`;
    }
  }
  return null;
}
