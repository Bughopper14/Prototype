export function businessToday(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export const historicalDateKeys=new Set(['establishmentDate','latestDeedDate','deedDate','ministerialDecreeDate','dateOfBirth','registrationDate','applicationDate']);
const yearKeys=new Set(['yearStarted','years','fiscalYear']);
const integerKeys=new Set(['quantity','tenorMonths','experienceYears','experienceMonths','ageYears','ageMonths','assetSummaryHeLiuGong','assetSummaryTruckLiuGong','assetSummaryHeNonLiuGong','assetSummaryTruckNonLiuGong']);
const moneyKeys=new Set(['creditFacility','monthlyInstallment','financingValue','downPaymentValue','securityDeposit','depositedCapital','primaryCapital','shareAmount','unitPrice','totalPrice','currentAssets','nonCurrentAssets','totalAssets','currentLiabilities','nonCurrentLiabilities','totalLiabilities','equity','totalLiabAndEquity','revenue','grossMargin','operatingMargin','tax','netIncome']);
const signedMoney=new Set(['equity','grossMargin','operatingMargin','netIncome','tax']);
const names:Record<string,string>={deedDate:'Deed date',ministerialDecreeDate:'Ministerial Decree date',establishmentDate:'Establishment date',latestDeedDate:'Latest deed date',dateOfBirth:'Date of birth',registrationDate:'Registration date',expiredDate:'Expiry date',yearStarted:'Year started',years:'Unit years',fiscalYear:'Fiscal year',sharePercentage:'Share percentage',quantity:'Unit quantity',tenorMonths:'Tenor',interestRate:'Interest rate',classTon:'Class (ton)',experienceMonths:'Experience months',ageMonths:'Age months',email:'Email',mobilePhone:'Mobile phone',phone:'Phone number',rt:'RT',rw:'RW',financingValue:'Total equipment value',downPaymentValue:'Down payment',securityDeposit:'Security deposit',creditFacility:'Credit facility',monthlyInstallment:'Monthly installment',unitPrice:'Unit price',totalPrice:'Total price',currentAssets:'Current assets',nonCurrentAssets:'Non-current assets',totalAssets:'Total assets',currentLiabilities:'Current liabilities',nonCurrentLiabilities:'Non-current liabilities',totalLiabilities:'Total liabilities',equity:'Equity',totalLiabAndEquity:'Total liabilities & equity',revenue:'Revenue',grossMargin:'Gross margin',operatingMargin:'Operating margin',tax:'Tax',netIncome:'Net income'};
export function inputLimits(key:string,now=new Date()):{min?:number|string,max?:number|string,step?:number|string}{const today=businessToday(now),year=Number(today.slice(0,4));if(key==='dateOfBirth')return {};if(historicalDateKeys.has(key))return {min:'1900-01-01',max:today};if(yearKeys.has(key))return {min:1900,max:year,step:1};if(['sharePercentage','interestRate'].includes(key))return {min:0,max:100,step:'0.01'};if(['experienceMonths','ageMonths'].includes(key))return {min:0,max:11,step:1};if(key==='tenorMonths')return {min:0,max:120,step:1};if(key==='quantity')return {min:1,max:1000000,step:1};if(integerKeys.has(key))return {min:0,max:1000000,step:1};if(key==='classTon')return {min:'0.01',max:1000000,step:'0.01'};if(moneyKeys.has(key))return {...(!signedMoney.has(key)?{min:0}:{}),step:'0.01'};return {};}
export function fieldInputError(key:string,value:any,now=new Date()):string{
 if(value===undefined||value===null||String(value).trim()==='')return '';
 if(key==='dateOfBirth')return '';
 const name=names[key]||key,text=String(value).trim();
 if(historicalDateKeys.has(key)||key==='expiredDate'){
  const raw=text.slice(0,10),match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(raw),date=new Date(raw+'T00:00:00Z');
  if(!match||Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==raw||raw<'1900-01-01')return `${name}: invalid date (minimum year 1900).`;
  if(historicalDateKeys.has(key)&&raw>businessToday(now))return `${name} cannot be a future date.`;
 }
 if(yearKeys.has(key)||integerKeys.has(key)||moneyKeys.has(key)||['interestRate','sharePercentage','classTon'].includes(key)){
  const number=Number(text),limits=inputLimits(key,now);if(!Number.isFinite(number)||Math.abs(number)>=1e16)return `${name}: invalid number or value too large.`;
  if((yearKeys.has(key)||integerKeys.has(key))&&!Number.isInteger(number))return `${name} must be a whole number.`;
    if(limits.min!==undefined&&number<Number(limits.min))return `${name} minimum is ${limits.min}.`;
    if(limits.max!==undefined&&number>Number(limits.max))return `${name} maximum is ${limits.max}.`;
    if(moneyKeys.has(key)&&!/^[-]?\d{1,16}(\.\d{1,2})?$/.test(text))return `${name}: use a number with at most 2 decimal places.`;
    if(!Number.isInteger(number)&&Math.abs(number*100-Math.round(number*100))>0.0001)return `${name} allows at most 2 decimal places.`;
 }
 if(['email'].includes(key)&&! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))return `${name} is not valid.`;
  if(['phone','mobilePhone','phoneFax'].includes(key)&&(!/^\+?[\d\s().-]+$/.test(text)||text.replace(/\D/g,'').length<7||text.replace(/\D/g,'').length>15))return `${name}: use 7–15 digit phone number.`;
  if(['rt','rw'].includes(key)&&!/^\d{1,3}$/.test(text))return `${name} must be 1–3 digits.`;
  if(key==='nib'&&!/^\d{13}$/.test(text))return 'NIB must be exactly 13 digits.';
  if(key==='npwp'&&!/^\d{15,16}$/.test(text.replace(/[.\-\s]/g,'')))return 'NPWP must be 15 or 16 digits.';
 return '';
}
export function validateInput(value:any,now=new Date(),requireCompleteOwnership=false):void{
 function walk(node:any,path:string){
  if(!node||typeof node!=='object')return;
  if(Array.isArray(node)){node.forEach((x,i)=>walk(x,x?.deedNumber?`Deed ${x.deedNumber}`:`${path}[${i+1}]`));return;}
  for(const [key,item] of Object.entries(node)){
   if(Array.isArray(node.deeds)&&['establishment','amendment'].includes(key))continue;

   const error=fieldInputError(key,item,now);if(error)throw Error(`${path?path+': ':''}${error}`);
   if(item&&typeof item==='object')walk(item,path?`${path} / ${key}`:key);
  }
  const required=(record:any,keys:string[],context:string)=>{for(const key of keys)if(record[key]===undefined||record[key]===null||String(record[key]).trim()==='')throw Error(`${context}: ${names[key]||key} is required.`);};
  if(node.pic&&typeof node.pic==='object'&&requireCompleteOwnership)required(node.pic,['picName','position','phone','email','currentAddress','city','province','postalCode'],'Primary contact (PIC)');
  if(Array.isArray(node.projects))node.projects.forEach((r:any)=>required(r,['projectOwner','projectLocation','projectRole','contractStatus'],'Project contract'));
  if(Array.isArray(node.bankReferences))node.bankReferences.forEach((r:any)=>required(r,['bankOrFinInstitution','currency','creditFacility','monthlyInstallment','yearStarted','interestRate','paymentRecord','facilityStatus'],'Bank facility'));
  if(Array.isArray(node.units))node.units.forEach((r:any)=>required(r,['quantity','unitCategory','brand','modelName'],'Equipment unit'));
  if(node.idNumber){
    const id=String(node.idNumber).trim();
    const rawType=String(node.idType||'').toUpperCase();
    const idType = rawType === 'PASSPORT_KITAS' ? 'PASSPORT' : (rawType === 'KTP_NPWP' ? 'KTP' : rawType);
    if(idType==='NPWP'){if(!/^\d{15,16}$/.test(id.replace(/[.\-\s]/g,'')))throw Error('NPWP stakeholder must be 15 or 16 digits.');}
    else if(idType==='PASSPORT'){if(!/^[A-Za-z0-9]{5,20}$/.test(id))throw Error('Passport number must be 5–20 alphanumeric characters.');}
    else if(idType==='KITAS'){if(!/^[A-Za-z0-9]{5,25}$/.test(id.replace(/\s/g,'')))throw Error('KITAS number must be 5–25 alphanumeric characters.');}
    else if(idType==='KTP'){if(!/^\d{16}$/.test(id.replace(/\D/g,'')))throw Error('KTP stakeholder must be exactly 16 digits.');}
  }
  if(node.idNumberSecondary){
    const secId=String(node.idNumberSecondary).trim();
    const rawType=String(node.idType||'').toUpperCase();
    if(rawType==='KTP_NPWP'||rawType==='NPWP'){
      const cleanDigits=secId.replace(/\D/g,'');
      if(cleanDigits.length>0&&cleanDigits.length<15)throw Error('NPWP stakeholder must be 15 or 16 digits.');
    }
  }
  if(node.deedDate&&node.ministerialDecreeDate&&String(node.ministerialDecreeDate).slice(0,10)<String(node.deedDate).slice(0,10))throw Error('Ministerial Decree date cannot be earlier than the deed date.');
    if(node.registrationDate&&node.expiredDate&&String(node.expiredDate).slice(0,10)<String(node.registrationDate).slice(0,10))throw Error('Expiry date cannot be earlier than the registration date.');
    if(node.financingValue!==undefined&&node.downPaymentValue!==undefined&&Number(node.financingValue)>0&&Number(node.downPaymentValue)>=Number(node.financingValue))throw Error('Down payment must be less than the financing value.');
  if(Array.isArray(node.financialStatements)){const years=node.financialStatements.map((r:any)=>Number(r.fiscalYear));if(new Set(years).size!==years.length)throw Error('Fiscal years must not contain duplicates.');if(years.length>3)throw Error('Maximum 3 fiscal years allowed.');const cents=(v:any)=>{const text=String(v??0),negative=text.startsWith('-'),[whole,part='']=text.replace(/^-/, '').split('.');return (negative?-1n:1n)*(BigInt(whole||'0')*100n+BigInt(part.padEnd(2,'0')));};for(const r of node.financialStatements){const assets=cents(r.currentAssets)+cents(r.nonCurrentAssets),liabilities=cents(r.currentLiabilities)+cents(r.nonCurrentLiabilities);if(assets!==cents(r.totalAssets)||liabilities!==cents(r.totalLiabilities)||assets!==liabilities+cents(r.equity)||assets!==cents(r.totalLiabAndEquity))throw Error(`Financial statement ${r.fiscalYear}: balance sheet does not balance.`);}}
  if(Array.isArray(node.stakeholders)&&node.stakeholders.length){const total=node.stakeholders.reduce((sum:number,r:any)=>sum+Number(r.sharePercentage||0),0);if(total>100.01)throw Error(`Total share ownership cannot exceed 100%. Currently ${total.toFixed(2)}%.`);if(requireCompleteOwnership&&Math.abs(total-100)>.01)throw Error(`Total share ownership must equal 100%. Currently ${total.toFixed(2)}%.`);}
 }
 walk(value,'');
}
export function validateWrite(path:string,method:string,body:any){
  // Open draft save policy: allow incomplete/draft saves to proceed as-is.
  // Mandatory field verification and validations are strictly enforced on submit/stage progression.
  return;
}

