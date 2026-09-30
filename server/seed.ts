import bcrypt from 'bcryptjs';
import {all,insert,query,transaction} from './db';
import {checklistTemplate,fapNumber} from './domain';
export const demoPassword='LiuGong2026!';
export async function seed(){
 if(!(await query('SELECT id FROM users LIMIT 1')).rows.length){
  if(process.env.NODE_ENV==='production'&&!process.env.BOOTSTRAP_PASSWORD)throw new Error('Set BOOTSTRAP_PASSWORD before starting production.');
  const hash=await bcrypt.hash(process.env.BOOTSTRAP_PASSWORD||demoPassword,12);
  for(const [role,name] of [['MKT','Anisa Putri'],['BS','Budi Santoso'],['CA','Dimas Pratama'],['LEGAL','Rina Wijaya'],['COMMITTEE','Hendra Kusuma']])await query('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)',[name,`${role.toLowerCase()}@liugong.local`,hash,role]);
 }
 if(process.env.NODE_ENV==='production'||(await all('Customer')).length)return;
 const companies=[['PT Bumi Karya Nusantara','MINING','Balikpapan','BPN01',12000000000,'IN_CA_LEGAL_REVIEW'],['PT Cipta Infrastruktur','CONSTRUCTION','Jakarta','JKT01',8500000000,'SUBMITTED_TO_BS'],['PT Sumber Alam Lestari','FORESTRY','Samarinda','BPN01',6400000000,'DRAFT'],['PT Mitra Tambang Sejahtera','MINING','Palembang','PLB01',18000000000,'CREDIT_COMMITTEE_REVIEW'],['PT Agro Prima Indonesia','AGRICULTURE','Medan','MDN01',4200000000,'APPROVED'],['PT Konstruksi Mandiri','CONSTRUCTION','Surabaya','SBY01',9600000000,'RETURNED']];
 await transaction(async q=>{for(let i=0;i<companies.length;i++){
  const [companyName,industrySegment,city,branchCode,value,status]=companies[i];
  const c=await insert('Customer',{companyName,companyType:i===2?'COMMERCIAL':'CORPORATE',nib:`12092600000${String(i+1).padStart(2,'0')}`,npwp:`01234567890${String(i+1).padStart(4,'0')}`},q);
  const a=await insert('Application',{customerId:c.id,fapNumber:fapNumber(i+1),branchCode,customerStatus:i%2?'EXISTING':'NEW',status,companyAddress:'Jl. Industri Raya No. 88',city,province:'Indonesia',postalCode:'17530',phoneFax:'021-8989898',email:`finance${i+1}@example.com`,mainBusiness:'Heavy equipment operations',experienceYears:8,experienceMonths:4,locationStatus:'OWNED',repaymentSource:'Operating project contracts',industrySegment,businessRole:'CONTRACTORS',applicationDate:`2026-09-${String(24-i*2).padStart(2,'0')}`},q);
  await insert('ApplicationPic',{applicationId:a.id,picName:'Budi Santoso',position:'Finance Director',phone:'081234567890',email:'budi@example.com',currentAddress:'Jl. Kemang Raya No. 10',city:'Jakarta Selatan',province:'DKI Jakarta',postalCode:'12560'},q);
  await insert('Stakeholder',{applicationId:a.id,name:'Budi Santoso',position:'Director',stakeholderType:'INDIVIDUAL',nationalityType:'WNI',idNumber:'3171010101900001',idType:'KTP',firstName:'Budi',lastName:'Santoso',designation:'DIRECTOR',email:'budi@example.com',mobilePhone:'081234567890',primaryCapital:'5000000000',shareAmount:'5000000000',sharePercentage:100,citizenship:'INDONESIAN',country:'Indonesia'},q);
  await insert('ProjectContract',{applicationId:a.id,projectOwner:'PT Bukit Energi',projectLocation:String(city),projectRole:'Main contractor',contractStatus:'EXISTING'},q);
  await insert('BankReference',{applicationId:a.id,bankOrFinInstitution:'Bank Mandiri',currency:'IDR',creditFacility:15000000000,monthlyInstallment:320000000,yearStarted:2022,interestRate:'9.50',paymentRecord:'Kol 1 / Lancar',facilityStatus:'Active'},q);
  const p=await insert('FinancingProposal',{applicationId:a.id,facilityPurpose:'INVESTMENT',financingMethod:'FINANCIAL_LEASE',financingValue:value,downPaymentValue:Number(value)*.2,interestRate:'10.50',tenorMonths:36,paymentMethod:'In Arrear'},q);
  await insert('FinancingUnitItem',{proposalId:p.id,brand:'LiuGong',unitCategory:'HE',modelName:i%2?'Wheel Loader 856H':'Excavator 936E',quantity:1,unitPrice:value,totalPrice:value},q);
  for(const fiscalYear of [2023,2024,2025])await insert('FinancialStatement',{applicationId:a.id,fiscalYear,isAudited:true,currentAssets:25000000000,nonCurrentAssets:45000000000,totalAssets:70000000000,currentLiabilities:15000000000,nonCurrentLiabilities:20000000000,totalLiabilities:35000000000,equity:35000000000,totalLiabAndEquity:70000000000,revenue:85000000000,grossMargin:22000000000,operatingMargin:14000000000,tax:2500000000,netIncome:11500000000},q);
  for(const [documentCode,documentName,assignedRole,isMandatory] of checklistTemplate)await insert('DocumentChecklist',{applicationId:a.id,documentCode,documentName,assignedRole,isMandatory},q);
  await insert('ApprovalLog',{applicationId:a.id,actionBy:'System · demo data',userRole:'MKT',previousStatus:'DRAFT',newStatus:status,comments:'Illustrative application. Document files have not been supplied.'},q);
 }await q('INSERT INTO fap_sequences(year,value) VALUES($1,$2)',[new Date().getUTCFullYear(),companies.length]);});
}
