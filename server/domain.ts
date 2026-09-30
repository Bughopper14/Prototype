import { z } from 'zod';
import Decimal from 'decimal.js';
import metadata from './metadata.json';
const meta=metadata as Record<string,{fields:Record<string,{column:string,type:string,optional:boolean,generated:boolean}>}>;
export class Problem extends Error{constructor(public status:number,message:string,public errors:{field:string,detail:string}[]=[]){super(message);}}
export function ensure(ok:unknown,message:string,status=422,field='application'):asserts ok{if(!ok)throw new Problem(status,message,[{field,detail:message}]);}
export const money=(v:any)=>new Decimal(v??0);
export function modelInput(model:string,body:any,required:string[]=[]){
 const fields:Record<string,z.ZodTypeAny>={};
 for(const [k,v] of Object.entries(meta[model].fields)){
  if(v.generated||['applicationId','proposalId','customerId','checklistId','fapNumber','status'].includes(k))continue;
  let s:z.ZodTypeAny=v.type==='Int'?z.coerce.number().int().min(0).max(2147483647):v.type==='Decimal'?z.union([z.string().regex(/^-?\d{1,16}(\.\d{1,2})?$/),z.number().finite()]).transform(x=>money(x).toFixed(2)):v.type==='Boolean'?z.boolean():v.type==='DateTime'?z.string().regex(/^\d{4}-\d{2}-\d{2}/):z.string().trim().max(20000);
  if(v.type==='String'&&required.includes(k))s=z.string().trim().min(1).max(1000);
  fields[k]=required.includes(k)?s:s.nullable().optional();
 }
 return z.object(fields).parse(body);
}
export function validateStakeholders(rows:any[]){
 ensure(rows.length>0,'At least one shareholder is required',422,'stakeholders');
 const total=rows.reduce((s,x)=>s.plus(x.sharePercentage),money(0));ensure(total.minus(100).abs().lte('.01'),`Sum of shareholder percentage must be exactly 100%. Current sum: ${total.toFixed(2)}%`,422,'stakeholders');
 for(const s of rows){ensure(money(s.sharePercentage).gte(0)&&money(s.sharePercentage).lte(100),'Share percentage must be between 0 and 100');ensure(money(s.shareAmount).gte(0),'Share amount cannot be negative');
  ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s.email||'')),'A valid email is required for each stakeholder');ensure(String(s.mobilePhone||'').trim().length>0,'Mobile phone is required for each stakeholder');ensure(s.primaryCapital!==undefined&&s.primaryCapital!==null&&s.primaryCapital!=='','Primary capital is required for each stakeholder');ensure(money(s.primaryCapital).gte(0),'Primary capital cannot be negative');
  if(s.stakeholderType==='CORPORATE'||s.idType==='NPWP'){ensure(/^\d{15,16}$/.test(s.idNumber.replace(/\D/g,'')),'Corporate stakeholders require a 15 or 16 digit NPWP');}
  else if(s.idType==='PASSPORT'||s.nationalityType==='WNA')ensure(/^[A-Za-z0-9]{5,20}$/.test(s.idNumber),'Foreign stakeholders require a passport number');
  else ensure(/^\d{16}$/.test(s.idNumber),'Indonesian stakeholders require a 16 digit KTP');
 }
}
export function validateFinancials(rows:any[],requireThree=false){
 if(requireThree)ensure(rows.length===3,'Three fiscal years are required',422,'financialStatements');
 ensure(new Set(rows.map(r=>r.fiscalYear)).size===rows.length,'Fiscal years must be unique');
 for(const r of rows){ensure(r.fiscalYear>=1900&&r.fiscalYear<=new Date().getFullYear(),'Invalid fiscal year');
 const assets=money(r.currentAssets).plus(r.nonCurrentAssets),liabilities=money(r.currentLiabilities).plus(r.nonCurrentLiabilities),total=liabilities.plus(r.equity);
 ensure(assets.eq(r.totalAssets)&&liabilities.eq(r.totalLiabilities)&&assets.eq(total)&&total.eq(r.totalLiabAndEquity),'Balance sheet is not balanced',422,`financialStatements.${r.fiscalYear}`);
 }
}
export function validateProposal(p:any,units:any[]){ensure(units.length>0,'Add at least one equipment unit');ensure(p.tenorMonths>0&&p.tenorMonths<=120,'Tenor must be between 1 and 120 months');ensure(money(p.interestRate).gte(0)&&money(p.interestRate).lte(100),'Invalid interest rate');ensure(money(p.financingValue).gt(0),'Financing value must be positive');ensure(money(p.downPaymentValue).gte(0)&&money(p.downPaymentValue).lt(p.financingValue),'Down payment must be less than financing value');ensure(money(p.securityDeposit).gte(0),'Security deposit cannot be negative');
 let sum=money(0);for(const u of units){ensure(u.quantity>0&&money(u.unitPrice).gt(0),'Unit quantity and price must be positive');ensure(money(u.unitPrice).times(u.quantity).eq(u.totalPrice),'Unit total must equal quantity × unit price');sum=sum.plus(u.totalPrice);}ensure(sum.eq(p.financingValue),'Financing value must equal total equipment price');}
export function installment(p:any){const principal=money(p.financingValue).minus(p.downPaymentValue),rate=money(p.interestRate).div(1200);if(!p.tenorMonths)return null;if(rate.isZero())return principal.div(p.tenorMonths).toFixed(2);return principal.times(rate).div(money(1).minus(money(1).plus(rate).pow(-p.tenorMonths))).div(p.paymentMethod==='In Advance'?money(1).plus(rate):1).toFixed(2);}
export function ratios(r:any){const ratio=(a:any,b:any)=>money(b).isZero()?null:money(a).div(b).toFixed(2);return {currentRatio:ratio(r.currentAssets,r.currentLiabilities),debtToEquity:ratio(r.totalLiabilities,r.equity),netProfitMargin:money(r.revenue).isZero()?null:money(r.netIncome).div(r.revenue).times(100).toFixed(2),dscr:null,dscrNote:'Depreciation is not captured in FSD v1; DSCR is unavailable.'};}
export function fapNumber(n:number,date=new Date()){return `${String(n).padStart(3,'0')}/AF/${['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][date.getUTCMonth()]}/${date.getUTCFullYear()}`;}
export const checklistTemplate=[['NIB','Business registration (NIB)','BS',true],['NPWP','Company tax registration (NPWP)','BS',true],['DEED','Establishment & latest deed','LEGAL',true],['KTP','Directors’ identification','BS',true],['FINANCIALS','Financial statements · 3 years','CA',true],['BANK','Bank statements · 6 months','CA',true],['CONTRACT','Project contracts / purchase orders','CA',false],['QUOTATION','Equipment quotation','BS',true],['LEGAL_OPINION','Legal opinion','LEGAL',true],['EKITAS','E-KITAS for foreign shareholders','LEGAL',false]] as const;
export const stages=['DRAFT','SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW','APPROVED','REJECTED','RETURNED'];
