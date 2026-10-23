export type Field={key:string,label:string,type?:string,options?:string[],optionLabels?:Record<string,string>,wide?:boolean,required?:boolean,unit?:string};
const f=(key:string,label:string,type='text',options?:string[]):Field=>({key,label,type,options});

const LOWERCASE_WORDS = new Set(['at', 'in', 'or', 'of']);

export function toTitleCase(str: string): string {
  if (!str) return '';
  return str.replace(/\b([a-zA-Z]+)\b/g, (word, offset) => {
    const lower = word.toLowerCase();
    if (offset > 0 && LOWERCASE_WORDS.has(lower)) {
      return lower;
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}

export const profileFields=[
  f('branchCode','Branch','select',['JKT01','BPN01','PLB01','MDN01','SBY01']),
  f('customerStatus','Customer Relationship','select',['NEW','EXISTING']),
  f('companyAddress','Company Address'),
  f('province','Province'),
  f('city','City'),
  f('district','District'),
  f('village','Village / Sub-district'),
  f('rt','RT'),
  f('rw','RW'),
  f('postalCode','Postal Code'),
  f('phoneFax','Phone / Fax'),
  f('email','Company Email','email'),
  f('website','Website'),
  f('mainBusiness','Main Business'),
  f('experienceYears','Experience · Years','number'),
  f('experienceMonths','Experience · Months','number'),
  f('locationStatus','Business Premises','select',['OWNED','RENTED']),
  f('repaymentSource','Source of Repayment'),
  f('latestDeedNo','Latest Deed Number'),
  f('latestDeedDate','Latest Deed Date','date'),
  f('industrySegment','Industry','select',['MINING','AGRICULTURE','FORESTRY','CONSTRUCTION','OIL_AND_GAS','OTHER']),
  f('businessRole','Business Role','select',['CONS_OWNER','CONTRACTORS','SUB_CONT','RENTAL','OTHER'])
];

export const customerFields=[
  f('companyName','Company Name'),
  f('companyType','Business Category','select',['CORPORATE','COMMERCIAL','MICRO','LIUGONG_USER']),
  f('nib','NIB'),
  f('nibDate','NIB Established Date','date'),
  f('npwp','NPWP'),
  f('sktNo','SKT Number'),
  f('sppkpNo','SPPKP Number'),
  f('establishmentActNo','Establishment Deed Number'),
  f('establishmentDate','Establishment Deed Date','date')
];

export const picFields=[
  f('picName','Contact Name'),
  f('position','Position'),
  f('phone','Phone Number'),
  f('email','Email','email'),
  f('country','Country'),
  f('province','Province'),
  f('city','City / Regency'),
  f('district','District'),
  f('village','Village / Sub-District'),
  f('rt','RT'),
  f('rw','RW'),
  f('postalCode','ZIP Code'),
  {...f('currentAddress','Full Address','textarea'),wide:true}
];

export const stakeholderFields=[
  f('representativeType','Representative Type','select',['NONE','DIRECTOR','SHAREHOLDER','AUTHORIZED_SIGNATORY','OTHER']),
  f('stakeholderType','Type','select',['INDIVIDUAL','CORPORATE']),
  f('signatory','Signatory','select',['NONE','YES','NO']),
  {...f('idType','ID Type','select',['NONE','KTP_NPWP','PASSPORT_KITAS']),optionLabels:{NONE:'None',KTP_NPWP:'KTP - NPWP',PASSPORT_KITAS:'PASSPORT - KITAS'}},
  f('idNumber','ID Number - [KTP or PASSPORT]'),
  f('idNumberSecondary','ID Number - [NPWP or KITAS]'),
  f('title','Title','select',['NONE','MR','MRS','MS','DR','OTHER']),
  f('firstName','First Name'),
  f('middleName','Middle Name'),
  f('lastName','Last Name'),
  f('dateOfBirth','Date of Birth','date'),
  f('ageYears','Age · Years','number'),
  f('ageMonths','Age · Months','number'),
  f('maritalStatus','Marital Status','select',['NONE','SINGLE','MARRIED','DIVORCED','WIDOWED','OTHER']),
  f('designation','Designation','select',['NONE','DIRECTOR','COMMISSIONER','PRESIDENT_DIRECTOR','OWNER','MANAGER','OTHER']),
  f('occupation','Occupation'),
  {...f('email','Email','email'),required:true},
  {...f('mobilePhone','Mobile Phone','tel'),required:true},
  f('gender','Gender','select',['NONE','MALE','FEMALE','OTHER']),
  f('sharePercentage','Percentage Share','number'),
  f('depositedCapital','Deposited Capital (IDR)','number'),
  {...f('primaryCapital','Primary Capital (IDR)','number'),required:true},
  f('citizenship','Citizenship','select',['INDONESIAN','FOREIGN']),
  f('country','Country'),
  f('province','Province'),
  f('cityRegency','City / Regency'),
  f('district','District'),
  f('village','Village / Sub-District'),
  f('rw','RW'),
  f('rt','RT'),
  f('address','Address'),
  f('postalCode','Postal / ZIP Code')
];

export const projectFields=[
  f('projectOwner','Project Owner'),
  f('projectLocation','Location'),
  f('projectRole','Role in Project'),
  f('contractStatus','Contract Status','select',['EXISTING','NEW'])
];

export const bankFields=[
  f('bankOrFinInstitution','Bank / Financial Institution'),
  f('currency','Currency','select',['IDR']),
  f('creditFacility','Credit Facility (IDR)','number'),
  f('monthlyInstallment','Monthly Installment (IDR)','number'),
  f('yearStarted','Year Started','number'),
  f('interestRate','Interest Rate (%)','number'),
  f('paymentRecord','Payment Record'),
  f('facilityStatus','Facility Status','select',['Active','Settled'])
];

export const proposalFields=[
  f('facilityPurpose','Facility Purpose','select',['INVESTMENT','WORKING_CAPITAL']),
  f('purposeDetail','Purpose Details'),
  f('financingMethod','Financing Method','select',['FINANCIAL_LEASE','SALE_AND_LEASE_BACK','INSTALLMENT_FINANCING']),
  f('currency','Currency','select',['IDR']),
  f('financingValue','Total Equipment Value (IDR)','number'),
  f('downPaymentValue','Down Payment (IDR)','number'),
  f('securityDeposit','Security Deposit (IDR)','number'),
  f('interestRate','Annual Interest Rate (%)','number'),
  f('tenorMonths','Tenor (Months)','number'),
  f('paymentMethod','Payment Timing','select',['In Arrear','In Advance']),
  f('applicationSource','Application Source'),
  f('termsNotes','Terms and Notes')
];

export const unitFields=[
  f('assetName','Asset Name'),
  f('unitCategory','Unit Category','select',['HE','TRUCK']),
  f('brand','Brand'),
  f('unitType','Type'),
  f('modelName','Model'),
  {...f('classTon','Class','number'),unit:'ton'},
  f('quantity','Total Unit','number'),
  f('years','Years','number'),
  {...f('specifications','Specifications','textarea'),wide:true}
];

export const financialFields=[
  f('currentAssets','Current Assets','number'),
  f('nonCurrentAssets','Non-Current Assets','number'),
  f('totalAssets','Total Assets','number'),
  f('currentLiabilities','Current Liabilities','number'),
  f('nonCurrentLiabilities','Non-Current Liabilities','number'),
  f('totalLiabilities','Total Liabilities','number'),
  f('equity','Equity','number'),
  f('totalLiabAndEquity','Total Liabilities & Equity','number'),
  f('revenue','Revenue','number'),
  f('grossMargin','Gross Profit','number'),
  f('operatingMargin','Operating Profit (EBIT)','number'),
  f('tax','Tax','number'),
  f('netIncome','Net Income','number')
];

export const blank=(fields:Field[])=>Object.fromEntries(fields.map(f=>[f.key,f.options?.[0]??(f.type==='number'?0:f.type==='date'?null:'')]));
export const label=(s:string)=>s ? toTitleCase(s.replaceAll('_',' ')) : '—';
export const legalDeedFields=[
  {...f('deedNumber','Deed Number'),required:true},
  {...f('deedDate','Deed Date','date'),required:true},
  f('ministerialDecreeNumber','Ministerial Decree Number'),
  f('ministerialDecreeDate','Ministerial Decree Date','date')
];
export const legalPartyFields: Field[] = [];

