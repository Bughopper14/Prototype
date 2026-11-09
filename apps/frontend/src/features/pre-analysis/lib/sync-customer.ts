/** Copies customer and PIC fields from the application into the pre-analysis. */
import {PreAnalysisData} from './types';

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

  return {
    ...prevData,
    customerProjectName: companyName || prevData.customerProjectName,
    taxId: npwp || prevData.taxId,
    fapNumber: fapNumber || prevData.fapNumber,
    customerPic,
    customerArea,
  };
}
