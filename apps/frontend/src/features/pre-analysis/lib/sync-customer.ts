/** Copies the customer and PIC data of the application into the Pre-Analysis. */
import type {PreAnalysisData} from '@/features/pre-analysis/lib/types';

export function syncCustomerAndPicIntoPreAnalysis(
  prevData: PreAnalysisData,
  sources: {customer?: any; pic?: any; profile?: any; application?: any},
): PreAnalysisData {
  const companyName = sources.customer?.companyName || sources.application?.customer?.companyName;
  const npwp = sources.customer?.npwp || sources.application?.customer?.npwp;
  const fapNumber = sources.application?.fapNumber || sources.application?.fap_number;
  const rawPicName = sources.pic?.picName || sources.application?.pic?.picName;
  const rawPicPos = sources.pic?.position || sources.application?.pic?.position;
  const city = sources.profile?.city || sources.application?.city;
  const province = sources.profile?.province || sources.application?.province;

  let customerPic = prevData.customerPic;
  if (rawPicName) {
    customerPic = rawPicPos ? `${rawPicName} (${rawPicPos})` : rawPicName;
  }

  let customerArea = prevData.customerArea;
  if (city || province) {
    customerArea = [city, province].filter(Boolean).join(', ');
  }

  const isAppNew = Boolean(sources.application?.isNew || sources.application?.id === 'new');

  return {
    ...prevData,
    preAnalysisNo: isAppNew
      ? 'Auto (Generated on save)'
      : prevData.preAnalysisNo || 'Auto (Generated on save)',
    customerProjectName: companyName || (isAppNew ? '' : prevData.customerProjectName),
    taxId: npwp || (isAppNew ? '' : prevData.taxId),
    fapNumber: isAppNew
      ? 'Auto (Generated on save)'
      : fapNumber || prevData.fapNumber || 'Auto (Generated on save)',
    customerPic: customerPic || (isAppNew ? '' : prevData.customerPic),
    customerArea: customerArea || (isAppNew ? '' : prevData.customerArea),
  };
}
