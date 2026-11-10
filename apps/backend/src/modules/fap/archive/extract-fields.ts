/** Reads the values of a FAP submission from an application object (profile, customer, PIC, proposal) and builds its snapshot. */
export function extractArchiveFields(currentApp: any) {
  const prof = currentApp?.profile || currentApp || {};
  const cust = currentApp?.customer || prof.customer || {};
  const pic = currentApp?.pic || prof.pic || {};
  const prop = currentApp?.proposal || prof.proposal || {};

  const fapNumber = currentApp?.fapNumber || currentApp?.fap_registration_number || prof.fapNumber || null;
  const companyName =
    currentApp?.companyName || currentApp?.company_name || cust.companyName || prof.companyName || null;
  const customerId = currentApp?.customerId || currentApp?.customer_id || cust.id || null;
  const appDate = currentApp?.applicationDate ? String(currentApp.applicationDate).slice(0, 10) : null;
  const branchCode = currentApp?.branchCode || prof.branchCode || null;
  const customerStatus =
    currentApp?.customerStatus || currentApp?.customerCategory || prof.customerCategory || 'EXISTING';
  const companyType = currentApp?.companyType || cust.companyType || prof.companyType || null;
  const nib = currentApp?.nib || cust.nib || prof.nib || null;
  const nibDate =
    currentApp?.nibDate || cust.nibDate || prof.nibDate
      ? String(currentApp?.nibDate || cust.nibDate || prof.nibDate).slice(0, 10)
      : null;
  const npwp = currentApp?.npwp || cust.npwp || prof.npwp || null;
  const sktNo = currentApp?.sktNo || cust.sktNo || prof.sktNo || null;
  const sppkpNo = currentApp?.sppkpNo || cust.sppkpNo || prof.sppkpNo || null;
  const establishmentActNo =
    currentApp?.establishmentActNo || cust.establishmentActNo || prof.establishmentActNo || null;
  const establishmentDate =
    currentApp?.establishmentDate || cust.establishmentDate || prof.establishmentDate
      ? String(currentApp?.establishmentDate || cust.establishmentDate || prof.establishmentDate).slice(0, 10)
      : null;
  const latestDeedNo = currentApp?.latestDeedNo || prof.latestDeedNo || null;
  const latestDeedDate =
    currentApp?.latestDeedDate || prof.latestDeedDate
      ? String(currentApp?.latestDeedDate || prof.latestDeedDate).slice(0, 10)
      : null;

  const companyAddress = currentApp?.companyAddress || cust.companyAddress || prof.companyAddress || null;
  const rt = currentApp?.rt || cust.rt || prof.rt || null;
  const rw = currentApp?.rw || cust.rw || prof.rw || null;
  const city = currentApp?.city || cust.city || prof.city || null;
  const province = currentApp?.province || cust.province || prof.province || null;
  const postalCode = currentApp?.postalCode || cust.postalCode || prof.postalCode || null;
  const phoneFax = currentApp?.phoneFax || cust.phoneFax || prof.phoneFax || null;
  const email = currentApp?.email || cust.email || prof.email || null;
  const website = currentApp?.website || cust.website || prof.website || null;

  const mainBusiness = currentApp?.mainBusiness || cust.mainBusiness || prof.mainBusiness || null;
  const experienceYears =
    Number(currentApp?.experienceYears ?? cust.experienceYears ?? prof.experienceYears ?? 0) || 0;
  const experienceMonths =
    Number(currentApp?.experienceMonths ?? cust.experienceMonths ?? prof.experienceMonths ?? 0) || 0;
  const locationStatus = currentApp?.locationStatus || cust.locationStatus || prof.locationStatus || null;
  const repaymentSource = currentApp?.repaymentSource || cust.repaymentSource || prof.repaymentSource || null;
  const industrySegment = currentApp?.industrySegment || cust.industrySegment || prof.industrySegment || null;
  const businessRole = currentApp?.businessRole || cust.businessRole || prof.businessRole || null;

  const assetHeLiuGong = Number(currentApp?.assetSummaryHeLiuGong ?? prof.assetSummaryHeLiuGong ?? 0) || 0;
  const assetTruckLiuGong =
    Number(currentApp?.assetSummaryTruckLiuGong ?? prof.assetSummaryTruckLiuGong ?? 0) || 0;
  const assetHeNonLiuGong =
    Number(currentApp?.assetSummaryHeNonLiuGong ?? prof.assetSummaryHeNonLiuGong ?? 0) || 0;
  const assetTruckNonLiuGong =
    Number(currentApp?.assetSummaryTruckNonLiuGong ?? prof.assetSummaryTruckNonLiuGong ?? 0) || 0;

  // PIC details
  const picName = pic.picName || pic.name || null;
  const picPosition = pic.position || null;
  const picPhone = pic.phone || pic.mobilePhone || null;
  const picEmail = pic.email || null;
  const picCurrentAddress = pic.currentAddress || pic.address || null;
  const picRt = pic.rt || null;
  const picRw = pic.rw || null;
  const picCity = pic.city || null;
  const picProvince = pic.province || null;
  const picPostalCode = pic.postalCode || null;
  const picIdNumber = pic.idNumber || pic.nik || null;
  const picGender = pic.gender || null;
  const picBirthPlace = pic.birthPlace || pic.tempatLahir || null;
  const picBirthDate =
    pic.birthDate || pic.tanggalLahir ? String(pic.birthDate || pic.tanggalLahir).slice(0, 10) : null;

  // Page 2 details
  const projects = currentApp?.projects || prof.projects || [];
  const stakeholders = currentApp?.stakeholders || prof.stakeholders || [];
  const bankReferences = currentApp?.bankReferences || prof.bankReferences || [];
  const financingValue = prop.financingValue ? Number(prop.financingValue) : null;
  const tenorMonths = prop.tenorMonths ? Number(prop.tenorMonths) : null;
  const interestRate = prop.interestRate ? Number(prop.interestRate) : null;
  const downPaymentValue = prop.downPaymentValue ? Number(prop.downPaymentValue) : null;
  const paymentMethod = prop.paymentMethod || null;
  const estimatedInstallment =
    prop.estimatedInstallment || prop.estimatedMonthlyInstallment
      ? Number(prop.estimatedInstallment || prop.estimatedMonthlyInstallment)
      : null;
  const equipmentUnits = prop.units || currentApp?.equipmentUnits || prof.equipmentUnits || [];
  const financialStatements = currentApp?.financialStatements || prof.financialStatements || [];

  // Build comprehensive system FAP stage snapshot
  const fapStageSnapshot = {
    capturedAt: new Date().toISOString(),
    fapNumber,
    companyName,
    customerId,
    applicationDate: appDate,
    customerCategory: customerStatus,
    branchCode,
    profile: {
      companyName,
      companyType,
      nib,
      nibDate,
      npwp,
      establishmentActNo,
      establishmentDate,
      latestDeedNo,
      latestDeedDate,
      sktNo,
      sppkpNo,
      phoneFax,
      email,
      website,
      mainBusiness,
      experienceYears,
      experienceMonths,
      locationStatus,
      repaymentSource,
      industrySegment,
      businessRole,
      companyAddress,
      rt,
      rw,
      city,
      province,
      postalCode,
      assetSummary: {
        heLiuGong: assetHeLiuGong,
        truckLiuGong: assetTruckLiuGong,
        heNonLiuGong: assetHeNonLiuGong,
        truckNonLiuGong: assetTruckNonLiuGong,
      },
    },
    pic,
    legal: currentApp?.legal || prof.legal || null,
    stakeholders,
    projects,
    proposal: prop,
    bankReferences,
    equipmentUnits,
    financialStatements,
  };

  return {
    prof,
    cust,
    pic,
    prop,
    fapNumber,
    companyName,
    customerId,
    appDate,
    branchCode,
    customerStatus,
    companyType,
    nib,
    nibDate,
    npwp,
    sktNo,
    sppkpNo,
    establishmentActNo,
    establishmentDate,
    latestDeedNo,
    latestDeedDate,
    companyAddress,
    rt,
    rw,
    city,
    province,
    postalCode,
    phoneFax,
    email,
    website,
    mainBusiness,
    experienceYears,
    experienceMonths,
    locationStatus,
    repaymentSource,
    industrySegment,
    businessRole,
    assetHeLiuGong,
    assetTruckLiuGong,
    assetHeNonLiuGong,
    assetTruckNonLiuGong,
    picName,
    picPosition,
    picPhone,
    picEmail,
    picCurrentAddress,
    picRt,
    picRw,
    picCity,
    picProvince,
    picPostalCode,
    picIdNumber,
    picGender,
    picBirthPlace,
    picBirthDate,
    projects,
    stakeholders,
    bankReferences,
    financingValue,
    tenorMonths,
    interestRate,
    downPaymentValue,
    paymentMethod,
    estimatedInstallment,
    equipmentUnits,
    financialStatements,
    fapStageSnapshot,
  };
}
