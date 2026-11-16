/** The blank Pre-Analysis form of an application. */

export function createBlankPreAnalysisData(appRecord?: any, preAnalysisNo?: string): any {
  const companyName = appRecord?.customer?.companyName || appRecord?.companyName || '';
  const npwp = appRecord?.customer?.npwp || appRecord?.npwp || '';
  const fapNumber = appRecord?.fapNumber || appRecord?.fap_number || '';

  const pic = appRecord?.pic;
  const picName = pic?.picName ? `${pic.picName}${pic.position ? ` (${pic.position})` : ''}` : '';

  const city = appRecord?.city || appRecord?.customer?.city || '';
  const province = appRecord?.province || appRecord?.customer?.province || '';
  const customerArea = city ? `${city}${province ? `, ${province}` : ''}` : province || '';

  const sourceOfRepayment = appRecord?.repaymentSource || '';
  const leadSource = appRecord?.leadSource || '';
  const dealerPic = appRecord?.dealerPic || '';
  const lmiPic = appRecord?.lmiPic || '';
  const lfiPic = appRecord?.lfiPic || '';

  // Extract capital from deed stakeholders if present
  let paidUpCapital = '';
  let equity = '';
  const deeds = appRecord?.legal?.deeds;
  if (deeds && Array.isArray(deeds)) {
    let totalDeposited = 0;
    deeds.forEach((d: any) => {
      (d.stakeholders || []).forEach((s: any) => {
        const val = Number(s.depositedCapital || s.primaryCapital || 0);
        if (!isNaN(val)) totalDeposited += val;
      });
    });
    if (totalDeposited > 0) {
      paidUpCapital = `IDR ${totalDeposited.toLocaleString('id-ID')}`;
      equity = paidUpCapital;
    }
  }

  const today = new Date();
  const dStr = today
    .toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})
    .replace(/ /g, '-');

  return {
    preAnalysisNo: preAnalysisNo || '',
    preAnalysisDate: dStr,
    customerProjectName: companyName,
    taxId: npwp,
    fapNumber,
    leadSource,
    customerArea,
    dealerPic,
    lmiPic,
    lfiPic,
    customerPic: picName,
    equity,
    paidUpCapital,
    sourceOfRepayment,

    // Discrete Project & Background fields
    holdingGroup: '',
    projectName: '',
    projectLocation: '',
    hasExistingProjects: true,
    existingProjects: '',
    newProjects: '',
    projectNameLocation: '',
    customerRole: '',
    otherContractors: '',
    projectOwner: '',
    bowheerInfo: '',
    projectStatus: '',
    investmentPlan: '',
    financingSchemeRequested: '',

    ubo: '',
    uboInfo: '',
    uboInformation: '',
    hasGroupStructure: true,
    groupStructure: {
      holding: {
        name: '',
        authorizedCapital: '',
        paidUpCapital: '',
        shareholders: [{name: '', percentage: '', role: ''}],
        management: '',
      },
      subsidiaries: [],
    },
    companyBackground: '',
    starGroupMilestonesNarrative: '',
    businessDevBackground: '',
    operationalTeamInfo: '',
    milestones: [],
    existingFincoBackup: '',

    equipmentJobFit: '',
    utilizationDuration: '',
    priorLiugongExperience: '',
    serviceAgreementFmc: '',
    unitComposition: [],

    deliveryStatus: '',
    deliveryDate: '',
    qaIlinkComment: '',
    qaConclusion: '',

    dealerCheck: '',
    topDealerToCustomer: '',
    topLmiToDealer: '',
    lmiArCheck: '',
    slikPefindoHighlight: '',
    applicantPefindoCheck: '',
    pefindoTerms: '',
    pefindoNotes: '',
    lenderExposures: [],

    goodProject: false,
    goodProjectNote: '',
    goodCustomer: false,
    goodCustomerNote: '',
    recommendation: '',
    briefNote: '',
    suggestions: [],
    competitionNotes: '',
    competitionTable: [],
    proposedBy: '',
    reviewedBy: '',
    approvedBy: '',
  };
}
