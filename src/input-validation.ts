export function businessToday(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export const historicalDateKeys=new Set(['establishmentDate','latestDeedDate','deedDate','ministerialDecreeDate','dateOfBirth','registrationDate','applicationDate']);
const yearKeys=new Set(['yearStarted','years','fiscalYear']);
const integerKeys=new Set(['quantity','tenorMonths','experienceYears','experienceMonths','ageYears','ageMonths','assetSummaryHeLiuGong','assetSummaryTruckLiuGong','assetSummaryHeNonLiuGong','assetSummaryTruckNonLiuGong']);
const moneyKeys=new Set(['creditFacility','monthlyInstallment','financingValue','downPaymentValue','securityDeposit','depositedCapital','primaryCapital','shareAmount','unitPrice','totalPrice','currentAssets','nonCurrentAssets','totalAssets','currentLiabilities','nonCurrentLiabilities','totalLiabilities','equity','totalLiabAndEquity','revenue','grossMargin','operatingMargin','tax','netIncome']);
const signedMoney=new Set(['equity','grossMargin','operatingMargin','netIncome','tax']);
const names:Record<string,string>={deedDate:'Tanggal akta',ministerialDecreeDate:'Tanggal SK Menteri',establishmentDate:'Tanggal pendirian',latestDeedDate:'Tanggal akta terakhir',dateOfBirth:'Tanggal lahir',registrationDate:'Tanggal registrasi',expiredDate:'Tanggal kedaluwarsa',yearStarted:'Year started',years:'Tahun unit',fiscalYear:'Tahun laporan keuangan',sharePercentage:'Persentase saham',quantity:'Jumlah unit',tenorMonths:'Tenor',interestRate:'Suku bunga',classTon:'Class (ton)',experienceMonths:'Bulan pengalaman',ageMonths:'Bulan usia',email:'Email',mobilePhone:'Nomor HP',phone:'Nomor telepon',rt:'RT',rw:'RW'};
export function inputLimits(key:string,now=new Date()):{min?:number|string,max?:number|string,step?:number|string}{const today=businessToday(now),year=Number(today.slice(0,4));if(historicalDateKeys.has(key))return {min:'1900-01-01',max:today};if(yearKeys.has(key))return {min:1900,max:year,step:1};if(['sharePercentage','interestRate'].includes(key))return {min:0,max:100,step:'0.01'};if(['experienceMonths','ageMonths'].includes(key))return {min:0,max:11,step:1};if(key==='financingValue')return {min:'0.01',step:'0.01'};if(key==='tenorMonths')return {min:1,max:120,step:1};if(key==='quantity')return {min:1,max:1000000,step:1};if(integerKeys.has(key))return {min:0,max:1000000,step:1};if(key==='classTon')return {min:'0.01',max:1000000,step:'0.01'};if(moneyKeys.has(key))return {...(!signedMoney.has(key)?{min:0}:{}),step:'0.01'};return {};}
export function fieldInputError(key:string,value:any,now=new Date()):string{
 if(value===undefined||value===null||String(value).trim()==='')return '';
 const name=names[key]||key,text=String(value).trim();
 if(historicalDateKeys.has(key)||key==='expiredDate'){
  const raw=text.slice(0,10),match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(raw),date=new Date(raw+'T00:00:00Z');
  if(!match||Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==raw||raw<'1900-01-01')return `${name}: tanggal tidak valid (minimal tahun 1900).`;
  if(historicalDateKeys.has(key)&&raw>businessToday(now))return `${name} tidak boleh melewati tanggal hari ini.`;
 }
 if(yearKeys.has(key)||integerKeys.has(key)||moneyKeys.has(key)||['interestRate','sharePercentage','classTon'].includes(key)){
  const number=Number(text),limits=inputLimits(key,now);if(!Number.isFinite(number)||Math.abs(number)>=1e16)return `${name}: angka tidak valid atau terlalu besar.`;
  if((yearKeys.has(key)||integerKeys.has(key))&&!Number.isInteger(number))return `${name} harus berupa bilangan bulat.`;
  if(limits.min!==undefined&&number<Number(limits.min))return `${name} minimal ${limits.min}.`;
  if(limits.max!==undefined&&number>Number(limits.max))return `${name} maksimal ${limits.max}.`;
  if(moneyKeys.has(key)&&!/^[-]?\d{1,16}(\.\d{1,2})?$/.test(text))return `${name}: gunakan angka dengan maksimal 2 desimal.`;
  if(!Number.isInteger(number)&&Math.abs(number*100-Math.round(number*100))>0.0001)return `${name} maksimal 2 angka desimal.`;
 }
 if(['email'].includes(key)&&! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))return `${name} tidak valid.`;
 if(['phone','mobilePhone','phoneFax'].includes(key)&&(!/^\+?[\d\s().-]+$/.test(text)||text.replace(/\D/g,'').length<7||text.replace(/\D/g,'').length>15))return `${name}: gunakan 7–15 digit nomor telepon.`;
 if(['rt','rw'].includes(key)&&!/^\d{1,3}$/.test(text))return `${name} harus berisi 1–3 digit.`;
 if(key==='nib'&&!/^\d{13}$/.test(text))return 'NIB harus berisi 13 digit.';
 if(key==='npwp'&&!/^\d{15,16}$/.test(text.replace(/[.\-\s]/g,'')))return 'NPWP harus berisi 15 atau 16 digit.';
 return '';
}
export function validateInput(value:any,now=new Date(),requireCompleteOwnership=false):void{
 function walk(node:any,path:string){
  if(!node||typeof node!=='object')return;
  if(Array.isArray(node)){node.forEach((x,i)=>walk(x,`${path}[${i+1}]`));return;}
  for(const [key,item] of Object.entries(node)){
   const error=fieldInputError(key,item,now);if(error)throw Error(`${path?path+': ':''}${error}`);
   if(item&&typeof item==='object')walk(item,path?`${path} / ${key}`:key);
  }
  const required=(record:any,keys:string[],context:string)=>{for(const key of keys)if(record[key]===undefined||record[key]===null||String(record[key]).trim()==='')throw Error(`${context}: ${names[key]||key} wajib diisi.`);};
  if(node.pic&&typeof node.pic==='object')required(node.pic,['picName','position','phone','email','currentAddress','city','province','postalCode'],'Primary contact (PIC)');
  if(Array.isArray(node.projects))node.projects.forEach((r:any)=>required(r,['projectOwner','projectLocation','projectRole','contractStatus'],'Project contract'));
  if(Array.isArray(node.bankReferences))node.bankReferences.forEach((r:any)=>required(r,['bankOrFinInstitution','currency','creditFacility','monthlyInstallment','yearStarted','interestRate','paymentRecord','facilityStatus'],'Bank facility'));
  if(Array.isArray(node.units))node.units.forEach((r:any)=>required(r,['quantity','unitCategory','brand','modelName'],'Equipment unit'));
  if(node.idNumber){const id=String(node.idNumber);const idType=String(node.idType||(node.stakeholderType==='CORPORATE'?'NPWP':node.nationalityType==='WNA'||node.citizenship==='FOREIGN'?'PASSPORT':'KTP')).toUpperCase();if(idType==='NPWP'){if(!/^\d{15,16}$/.test(id.replace(/[.\-\s]/g,'')))throw Error('NPWP stakeholder harus berisi 15 atau 16 digit.');}else if(idType==='PASSPORT'){if(!/^[A-Za-z0-9]{5,20}$/.test(id))throw Error('Nomor passport harus berisi 5–20 huruf/angka.');}else if(idType==='KTP'){if(!/^\d{16}$/.test(id))throw Error('KTP stakeholder harus berisi 16 digit.');}}
  if(node.deedDate&&node.ministerialDecreeDate&&String(node.ministerialDecreeDate).slice(0,10)<String(node.deedDate).slice(0,10))throw Error('Tanggal SK Menteri tidak boleh lebih awal dari tanggal akta.');
  if(node.registrationDate&&node.expiredDate&&String(node.expiredDate).slice(0,10)<String(node.registrationDate).slice(0,10))throw Error('Tanggal kedaluwarsa tidak boleh lebih awal dari tanggal registrasi.');
  if(node.financingValue!==undefined&&node.downPaymentValue!==undefined&&Number(node.financingValue)>0&&Number(node.downPaymentValue)>=Number(node.financingValue))throw Error('Down payment harus lebih kecil dari nilai pembiayaan.');
  if(Array.isArray(node.financialStatements)){const years=node.financialStatements.map((r:any)=>Number(r.fiscalYear));if(new Set(years).size!==years.length)throw Error('Tahun laporan keuangan tidak boleh duplikat.');if(years.length>3)throw Error('Maksimal 3 tahun laporan keuangan.');const cents=(v:any)=>{const text=String(v??0),negative=text.startsWith('-'),[whole,part='']=text.replace(/^-/, '').split('.');return (negative?-1n:1n)*(BigInt(whole||'0')*100n+BigInt(part.padEnd(2,'0')));};for(const r of node.financialStatements){const assets=cents(r.currentAssets)+cents(r.nonCurrentAssets),liabilities=cents(r.currentLiabilities)+cents(r.nonCurrentLiabilities);if(assets!==cents(r.totalAssets)||liabilities!==cents(r.totalLiabilities)||assets!==liabilities+cents(r.equity)||assets!==cents(r.totalLiabAndEquity))throw Error(`Laporan keuangan ${r.fiscalYear}: neraca belum seimbang.`);}}
  if(Array.isArray(node.stakeholders)&&node.stakeholders.length){const total=node.stakeholders.reduce((sum:number,r:any)=>sum+Number(r.sharePercentage||0),0);if(total>100.01||requireCompleteOwnership&&Math.abs(total-100)>.01)throw Error(`Total kepemilikan saham wajib 100%. Saat ini ${total.toFixed(2)}%.`);}
 }
 walk(value,'');
}
export function validateWrite(path:string,method:string,body:any){if(['POST','PUT','PATCH'].includes(method)&&!(body instanceof Object&&typeof FormData!=='undefined'&&body instanceof FormData)&&(/^\/customers(?:\/|$)/.test(path)||/^\/applications(?:\/|$)/.test(path)))validateInput(body);}
