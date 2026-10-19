import {readApplicationDocuments,seedApplicationDocuments} from './mysql-documents';
import {readBusiness} from './mysql-business';
import {readFinancialStatements} from './mysql-financial-statements';
import {readLegal} from './mysql-legal';
import {pool} from './mysql-store';
import {customerFields,profileFields,picFields} from '../src/fields';
import {experienceFromEstablishmentDate} from '../src/experience';
import {businessToday,validateInput} from '../src/input-validation';
import crypto from 'node:crypto';

const fapCustomer=['companyName','companyType','nib','nibDate','npwp','establishmentActNo','establishmentDate','experienceYears','experienceMonths'];
const fapProfile=['branchCode','companyAddress','province','city','district','village','rt','rw','postalCode'];
const fapFields=[...customerFields.filter(f=>fapCustomer.includes(f.key)),...profileFields.filter(f=>fapProfile.includes(f.key))];
const preFields=[...customerFields.filter(f=>!fapCustomer.includes(f.key)),...profileFields.filter(f=>f.key!=='customerStatus'&&!fapProfile.includes(f.key)&&!fapCustomer.includes(f.key))];
const directoryFields=[...customerFields,...profileFields.filter(f=>f.key!=='customerStatus')];
const appTables=['legal_stakeholder','akta_pendirian','akta_perubahan','daftar_akta','equipment_units','financing_detail','bank_facilities','project_contract','customer_pic','new_application_fap_stage','new_application_pre_analisis','all_applications'];
const column=(s:string)=>s.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
const picColumn=(s:string)=>s==='district'?'kecamatan':s==='village'?'kelurahan':s==='currentAddress'?'alamat_pic':column(s);
const same=(a:any,b:any)=>String(a??'')===String(b??'');
const databaseValue=(value:any,type?:string)=>value instanceof Date&&type==='date'?value.toISOString().slice(0,10):value;
const fieldType=(f:any)=>f.key==='experienceYears'||f.key==='experienceMonths'?'INT':f.type==='date'?'DATE':f.type==='number'?'INT':'TEXT';
const readFields=(row:any,fields:readonly any[])=>Object.fromEntries(fields.map(f=>[f.key,databaseValue(row[column(f.key)],f.type)]));
const inputFields=(input:any,fields:readonly any[])=>Object.fromEntries(fields.map(f=>{const value=input?.[f.key];return [column(f.key),value===undefined||value===''?null:value];}));
const fieldValues=(input:any,fields:readonly any[])=>fields.map(f=>input?.[f.key]===undefined||input?.[f.key]===''?null:input[f.key]);
const customerDirectoryValues=(customer:any,profile:any,relationship:string)=>({...inputFields({...customer,...profile},directoryFields),customer_relationship:relationship});
const mysqlError=(message:string,status=422)=>Object.assign(new Error(message),{status});

/**
 * The previous intake schema stored application data in JSON and linked the
 * stage tables back to all_applications. The user requested a clean start, so
 * the one-time schema transition drops only transaction/application tables;
 * users, location masters, and ui_master_data remain untouched.
 */
async function resetOldApplicationSchema(){
 if(!pool)return;
 const [existing]=await pool.query<any[]>('SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=\'all_applications\'');
 if(!existing.length||existing.some(r=>r.COLUMN_NAME==='id_fap_stage'&&existing.some(x=>x.COLUMN_NAME==='id_pre_analysis')))return;
 const c=await pool.getConnection();
 try{
  await c.query('SET FOREIGN_KEY_CHECKS=0');
  const [tables]=await c.query<any[]>('SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type=\'BASE TABLE\'');
  const names=new Set(tables.map(r=>r.TABLE_NAME));
  for(const table of appTables)if(names.has(table))await c.query(`DROP TABLE \`${table}\``);
  await c.query('SET FOREIGN_KEY_CHECKS=1');
  console.info('Reset application data for the FAP/pre-analysis schema change. Master data and users were retained.');
 }catch(e){try{await c.query('SET FOREIGN_KEY_CHECKS=1');}catch{}throw e;}finally{c.release();}
}

export async function initializeIntake(){
 if(!pool)return;
 await resetOldApplicationSchema();
 const [partnerTables]=await pool.query<any[]>(`SELECT TABLE_NAME FROM information_schema.tables
  WHERE table_schema=DATABASE() AND table_name IN ('customers','business_partner')`);
 const tableNames=new Set(partnerTables.map(row=>row.TABLE_NAME));
 if(tableNames.has('customers')&&tableNames.has('business_partner'))throw new Error('Both customers and business_partner exist; resolve the duplicate tables before starting the API.');
 if(tableNames.has('customers'))await pool.query('RENAME TABLE customers TO business_partner');
 await pool.query(`CREATE TABLE IF NOT EXISTS business_partner (
  id CHAR(36) PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,company_type VARCHAR(50) NULL,nib VARCHAR(32) NULL,npwp VARCHAR(32) NULL,
  business_partner_type VARCHAR(50) NOT NULL DEFAULT 'Prorpect Customer',
  skt_no VARCHAR(100) NULL,sppkp_no VARCHAR(100) NULL,establishment_act_no VARCHAR(100) NULL,establishment_date DATE NULL,
  branch_code VARCHAR(30) NULL,customer_relationship VARCHAR(30) NULL,company_address TEXT NULL,city VARCHAR(150) NULL,province VARCHAR(150) NULL,postal_code VARCHAR(20) NULL,
  phone_fax VARCHAR(50) NULL,email VARCHAR(255) NULL,website VARCHAR(255) NULL,main_business TEXT NULL,experience_years INT NULL,experience_months INT NULL,
  location_status VARCHAR(50) NULL,repayment_source TEXT NULL,latest_deed_no VARCHAR(100) NULL,latest_deed_date DATE NULL,
  industry_segment VARCHAR(100) NULL,business_role VARCHAR(100) NULL,asset_summary_he_liu_gong INT NULL,asset_summary_truck_liu_gong INT NULL,
  asset_summary_he_non_liu_gong INT NULL,asset_summary_truck_non_liu_gong INT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,
  created_by VARCHAR(150) NULL,updated_by VARCHAR(150) NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 const [partnerTypeColumns]=await pool.query<any[]>(`SELECT COLUMN_NAME FROM information_schema.columns
  WHERE table_schema=DATABASE() AND table_name='business_partner' AND column_name='business_partner_type'`);
 if(!partnerTypeColumns.length)await pool.query("ALTER TABLE business_partner ADD COLUMN business_partner_type VARCHAR(50) NOT NULL DEFAULT 'Prorpect Customer' AFTER company_type");
 else{
  const [columnOrder]=await pool.query<any[]>(`SELECT ORDINAL_POSITION FROM information_schema.columns
   WHERE table_schema=DATABASE() AND table_name='business_partner' AND column_name='business_partner_type'`);
  if(Number(columnOrder[0]?.ORDINAL_POSITION)!==4)await pool.query("ALTER TABLE business_partner MODIFY COLUMN business_partner_type VARCHAR(50) NOT NULL DEFAULT 'Prorpect Customer' AFTER company_type");
 }
 await pool.query(`CREATE TABLE IF NOT EXISTS new_application_fap_stage (
  id_fap_stage CHAR(36) PRIMARY KEY,customer_category VARCHAR(30) NOT NULL,customer_id CHAR(36) NOT NULL,
  application_date DATE NOT NULL,fap_registration_number VARCHAR(80) NOT NULL UNIQUE,
  ${fapFields.map(f=>`\`${column(f.key)}\` ${fieldType(f)} ${f.key==='experienceYears'||f.key==='experienceMonths'?'NOT NULL DEFAULT 0':'NULL'}`).join(',')},
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await pool.query(`CREATE TABLE IF NOT EXISTS new_application_pre_analisis (
  id_pre_analysis CHAR(36) PRIMARY KEY,application_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  ${preFields.map(f=>`\`${column(f.key)}\` ${fieldType(f)} NULL`).join(',')},
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await pool.query(`CREATE TABLE IF NOT EXISTS all_applications (
  application_id CHAR(36) PRIMARY KEY,id_fap_stage CHAR(36) NOT NULL UNIQUE,id_pre_analysis CHAR(36) NOT NULL UNIQUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,
  CONSTRAINT fk_all_applications_fap_stage FOREIGN KEY(id_fap_stage) REFERENCES new_application_fap_stage(id_fap_stage),
  CONSTRAINT fk_all_applications_pre_analysis FOREIGN KEY(id_pre_analysis) REFERENCES new_application_pre_analisis(id_pre_analysis)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await pool.query(`CREATE TABLE IF NOT EXISTS customer_pic (
  id CHAR(36) PRIMARY KEY,application_id CHAR(36) NOT NULL UNIQUE,customer_id CHAR(36) NOT NULL,
  ${picFields.map(f=>`\`${picColumn(f.key)}\` ${fieldType(f)} NULL`).join(',')},
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,
  CONSTRAINT fk_customer_pic_application FOREIGN KEY(application_id) REFERENCES all_applications(application_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 for(const col of ['rt','rw']){
  const [hasCol]=await pool.query<any[]>(`SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='new_application_fap_stage' AND column_name=?`,[col]);
  if(!hasCol.length)await pool.query(`ALTER TABLE new_application_fap_stage ADD COLUMN \`${col}\` TEXT NULL`);
  const [hasBpCol]=await pool.query<any[]>(`SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='business_partner' AND column_name=?`,[col]);
  if(!hasBpCol.length)await pool.query(`ALTER TABLE business_partner ADD COLUMN \`${col}\` TEXT NULL`);
 }
 await migrateCustomerPicLocations();
}

/** Store customer PIC location labels as plaintext while keeping the UI's
 * dropdown values linked to the location masters. Safe to rerun on startup. */
export async function migrateCustomerPicLocations(){
 if(!pool)return;
 const [exists]=await pool.query<any[]>(`SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='customer_pic'`);
 if(!exists.length)return;
 let columns=new Set(exists.map(r=>String(r.COLUMN_NAME)));
 const migrations=[['district','kecamatan','master_kecamatan'],['village','kelurahan','master_kelurahan_desa']] as const;
 for(const [oldName,newName,table] of migrations){const current=columns.has(newName)?newName:columns.has(oldName)?oldName:null;if(!current)continue;const [unmapped]=await pool.query<any[]>(`SELECT COUNT(*) AS n FROM customer_pic p WHERE p.\`${current}\` REGEXP '^[0-9a-fA-F-]{32,36}$' AND NOT EXISTS (SELECT 1 FROM ${table} m WHERE m.id=p.\`${current}\`)`);if(Number(unmapped[0]?.n||0)>0)throw new Error(`Tidak dapat memetakan ${unmapped[0].n} nilai ${current} ke master lokasi.`);}
 const [updateTrigger]=await pool.query<any[]>(`SELECT TRIGGER_NAME FROM information_schema.triggers WHERE trigger_schema=DATABASE() AND event_object_table='customer_pic' AND trigger_name='audit_customer_pic_update'`);
 if(updateTrigger.length)await pool.query('DROP TRIGGER audit_customer_pic_update');
 for(const [oldName,newName,table] of migrations){const current=columns.has(newName)?newName:columns.has(oldName)?oldName:null;if(!current)continue;await pool.query(`UPDATE customer_pic p JOIN ${table} m ON m.id=p.\`${current}\` SET p.\`${current}\`=m.name`);if(current===oldName){await pool.query(`ALTER TABLE customer_pic CHANGE COLUMN \`${oldName}\` \`${newName}\` TEXT NULL`);columns.delete(oldName);columns.add(newName);}}
 if(updateTrigger.length){const {auditTable}=await import('./mysql-users');await auditTable('customer_pic');}
}

function listSelect(){
 return `SELECT a.application_id AS id,f.customer_id,f.customer_category,f.application_date,f.fap_registration_number AS fap_number,f.company_name,f.company_type,f.nib,f.nib_date,f.npwp,f.establishment_act_no,f.establishment_date,f.branch_code,f.company_address,f.city,f.province,f.postal_code,f.experience_years,f.experience_months,p.application_status AS status,p.skt_no,p.sppkp_no,p.phone_fax,p.email,p.website,p.main_business,p.location_status,p.repayment_source,p.latest_deed_no,p.latest_deed_date,p.industry_segment,p.business_role,p.asset_summary_he_liu_gong,p.asset_summary_truck_liu_gong,p.asset_summary_he_non_liu_gong,p.asset_summary_truck_non_liu_gong,fd.financing_value,fd.tenor_months,fd.financing_method,(SELECT COUNT(*) FROM application_document_checklist d WHERE d.application_id=a.application_id AND d.status='VERIFIED') AS verified_docs,(SELECT COUNT(*) FROM application_document_checklist d WHERE d.application_id=a.application_id) AS total_docs,a.created_at FROM all_applications a JOIN new_application_fap_stage f ON f.id_fap_stage=a.id_fap_stage JOIN new_application_pre_analisis p ON p.id_pre_analysis=a.id_pre_analysis LEFT JOIN financing_detail fd ON fd.application_id=a.application_id AND fd.deleted_at IS NULL ORDER BY a.created_at DESC,a.application_id`;
}
export async function listIntake(){if(!pool)return [];const [rows]=await pool.query<any[]>(listSelect());return rows;}

export async function intakeDetail(id:string){
 if(!pool)return null;
 const [rows]=await pool.execute<any[]>(`SELECT a.application_id,a.created_at app_created_at,a.updated_at app_updated_at,f.*,p.* FROM all_applications a JOIN new_application_fap_stage f ON f.id_fap_stage=a.id_fap_stage JOIN new_application_pre_analisis p ON p.id_pre_analysis=a.id_pre_analysis WHERE a.application_id=?`,[id]);
 if(!rows.length)return null;
 const row=rows[0];
 const customer={...readFields(row,fapFields.filter(f=>customerFields.some(x=>x.key===f.key))),...readFields(row,preFields.filter(f=>customerFields.some(x=>x.key===f.key))),id:row.customer_id};
 const profile={...readFields(row,fapFields.filter(f=>profileFields.some(x=>x.key===f.key))),...readFields(row,preFields.filter(f=>profileFields.some(x=>x.key===f.key))),customerStatus:row.customer_category};
 if(row.district||row.village){
  const [pLocs]=await pool.execute<any[]>(`SELECT d.id AS district_master_id,v.id AS village_master_id FROM master_provinsi pr LEFT JOIN master_kabupaten_kota c ON c.name=? AND c.provinsi_id=pr.id LEFT JOIN master_kecamatan d ON (d.name=? OR d.id=?) AND d.kabupaten_kota_id=c.id LEFT JOIN master_kelurahan_desa v ON (v.name=? OR v.id=?) AND v.kecamatan_id=d.id WHERE pr.name=?`,[row.city||'',row.district||'',row.district||'',row.village||'',row.village||'',row.province||'']);
  if(pLocs.length){
   if(pLocs[0].district_master_id) profile.district=pLocs[0].district_master_id;
   if(pLocs[0].village_master_id) profile.village=pLocs[0].village_master_id;
  }
 }
 const [pics]=await pool.execute<any[]>(`SELECT cp.*,d.id AS district_master_id,v.id AS village_master_id FROM customer_pic cp LEFT JOIN master_provinsi pr ON pr.name=cp.province LEFT JOIN master_kabupaten_kota c ON c.name=cp.city AND c.provinsi_id=pr.id LEFT JOIN master_kecamatan d ON (d.name=cp.kecamatan OR d.id=cp.kecamatan) AND d.kabupaten_kota_id=c.id LEFT JOIN master_kelurahan_desa v ON (v.name=cp.kelurahan OR v.id=cp.kelurahan) AND v.kecamatan_id=d.id WHERE cp.application_id=?`,[id]);
 const legal=await readLegal(id);
 const pic=pics[0]?{...Object.fromEntries(picFields.map(f=>[f.key,databaseValue(pics[0][picColumn(f.key)],f.type)])),district:pics[0].district_master_id||pics[0].kecamatan,village:pics[0].village_master_id||pics[0].kelurahan,id:pics[0].id,createdAt:pics[0].created_at,updatedAt:pics[0].updated_at}:null;
 const [docRows]=await pool.execute<any[]>(`SELECT COALESCE(MAX(is_mandatory), 0) AS is_doc_mandatory FROM application_document_checklist WHERE application_id = ?`,[id]);
 const [mandatoryList]=await pool.query<any[]>('SELECT section, field_key, field_label, mandatory FROM master_mandatory');
 const mandatoryConfig={
   customerPic:mandatoryList.some(r=>['Company Profile','Primary Contact (PIC)','Customer'].includes(r.section)&&Boolean(r.mandatory)),
   financing:mandatoryList.some(r=>r.section==='Financing'&&Boolean(r.mandatory)),
   financialStatements:mandatoryList.some(r=>r.section==='Financial Statements'&&Boolean(r.mandatory)),
   legal:mandatoryList.some(r=>r.section==='Legal'&&Boolean(r.mandatory)),
   documents:Boolean(docRows[0]?.is_doc_mandatory)
 };
 return {...profile,id:row.application_id,customerId:row.customer_id,customer,establishmentActNo:customer.establishmentActNo,establishmentDate:customer.establishmentDate,nibDate:customer.nibDate,fapNumber:row.fap_registration_number,applicationDate:databaseValue(row.application_date,'date'),createdAt:row.app_created_at,updatedAt:row.app_updated_at||row.updated_at,status:row.application_status,legal,pic,stakeholders:legal.deeds.find((d:any)=>d.id===legal.selectedDeedId)?.stakeholders||[],...await readBusiness(id),...await readFinancialStatements(id),documentChecks:await readApplicationDocuments(id),mandatoryConfig,approvalLogs:[],signoffs:[]};
}

export async function intakeCustomers(){
 const rows=await listIntake(),seen=new Set<string>();
 return rows.filter(r=>{if(seen.has(r.customer_id))return false;seen.add(r.customer_id);return true;}).map(r=>({id:r.customer_id,companyName:r.company_name,companyType:r.company_type,nib:r.nib,npwp:r.npwp,establishmentActNo:r.establishment_act_no,establishmentDate:databaseValue(r.establishment_date,'date')}));
}

export async function createIntake(body:any,identity?:{id:string,fapNumber?:string,status?:string}){
 if(!pool)throw mysqlError('MySQL is not configured',503);
 const customer=body.customer||{},profile=body.profile||{},category=body.customerCategory||'NEW';
 try{validateInput(customer);validateInput(profile);}catch(e:any){}
 const compName=String(customer.companyName||'').trim()||'Perusahaan Baru (Draft)';
 const nibRaw=String(customer.nib||'').replace(/\D/g,'');
 const nibVal=nibRaw.length===13?nibRaw:(nibRaw||'0000000000000').padEnd(13,'0').slice(0,13);
 const npwpRaw=String(customer.npwp||'').replace(/\D/g,'');
 const npwpVal=npwpRaw.length>=15?npwpRaw:(npwpRaw||'000000000000000').padEnd(15,'0').slice(0,15);
 const normalizedCustomer={
  ...customer,
  companyName: compName,
  nib: nibVal,
  npwp: npwpVal,
  companyType: customer.companyType || 'CORPORATE'
 };
 if(category==='EXISTING'&&!body.customerId)throw mysqlError('Select an existing customer');
 const companyId=category==='EXISTING'?String(body.customerId):crypto.randomUUID();
 const experience=experienceFromEstablishmentDate(normalizedCustomer.establishmentDate);
 const normalizedProfile={...profile,...experience};
 try{validateInput(normalizedProfile);}catch(e:any){}
 const appId=identity?.id||crypto.randomUUID(),fapId=crypto.randomUUID(),preId=crypto.randomUUID();
 const today=businessToday();
 const c=await pool.getConnection();let lock=false;
 try{
  await c.beginTransaction();
  await c.query("SELECT GET_LOCK(CONCAT('lfi-fap-',YEAR(CURRENT_DATE)),10)");lock=true;
  const [numberRows]=await c.execute<any[]>(`SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(fap_registration_number, '/', 1) AS UNSIGNED)), 0) AS n FROM new_application_fap_stage WHERE fap_registration_number LIKE ?`,[`%/AF/%/${today.slice(0,4)}`]);
  const months=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  const fap=identity?.fapNumber||`${String(Number(numberRows[0].n)+1).padStart(3,'0')}/AF/${months[Number(today.slice(5,7))-1]}/${today.slice(0,4)}`;
  const fapData: Record<string, any>={...inputFields({...normalizedCustomer,...normalizedProfile},fapFields),customer_category:category,customer_id:companyId,application_date:today,fap_registration_number:fap};
  if(fapData.district){
   const [districts]=await c.execute<any[]>(`SELECT d.name FROM master_kecamatan d WHERE d.id=? OR d.name=?`,[fapData.district,fapData.district]);
   if(districts.length) fapData.district=districts[0].name;
   if(fapData.village){
    const [villages]=await c.execute<any[]>(`SELECT v.name FROM master_kelurahan_desa v WHERE v.id=? OR v.name=?`,[fapData.village,fapData.village]);
    if(villages.length) fapData.village=villages[0].name;
   }
  }
  const preData={...inputFields({...normalizedCustomer,...normalizedProfile},preFields),application_status:identity?.status||'DRAFT'};
  const insertRow=async(table:string,values:Record<string,any>)=>{const keys=Object.keys(values);await c.execute(`INSERT INTO ${table} (${keys.map(k=>`\`${k}\``).join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,Object.values(values));};
  const directoryData:Record<string,any>=customerDirectoryValues(normalizedCustomer,normalizedProfile,normalizedProfile.customerStatus||category);
  const directoryKeys=Object.keys(directoryData);
  await c.execute(`INSERT IGNORE INTO business_partner (id,${directoryKeys.map(k=>`\`${k}\``).join(',')}) VALUES (${Array(directoryKeys.length+1).fill('?').join(',')})`,[companyId,...Object.values(directoryData)]);
  await insertRow('new_application_fap_stage',{id_fap_stage:fapId,...fapData});
  await insertRow('new_application_pre_analisis',{id_pre_analysis:preId,...preData});
  await insertRow('all_applications',{application_id:appId,id_fap_stage:fapId,id_pre_analysis:preId});
  await seedApplicationDocuments(c,appId);
  await c.commit();return {id:appId};
 }catch(e){await c.rollback();throw e;}finally{if(lock)try{await c.query("SELECT RELEASE_LOCK(CONCAT('lfi-fap-',YEAR(CURRENT_DATE)))");}catch{}c.release();}
}

export async function saveCustomerPic(id:string,body:any,fallback?:any){
 if(!pool)throw mysqlError('MySQL is not configured',503);
 const profile=Object.fromEntries(profileFields.map(f=>[f.key,body.profile?.[f.key]??fallback?.[f.key]??null]));
 const pic=Object.fromEntries(picFields.map(f=>[f.key,body.pic?.[f.key]??null]));
 try{validateInput(profile);validateInput(pic);}catch(e:any){}
 const current=await intakeDetail(id);
 const customerInput=body.customer||{};
 const customer={...(current?.customer||{}),...customerInput};
 const experience=experienceFromEstablishmentDate(customer?.establishmentDate);
 const fapData: Record<string, any>=Object.fromEntries(fapFields.map(f=>{
  if (f.key==='experienceYears') return [column(f.key), experience.experienceYears];
  if (f.key==='experienceMonths') return [column(f.key), experience.experienceMonths];
  if (customer && customer[f.key] !== undefined && customer[f.key] !== null) return [column(f.key), customer[f.key]];
  return [column(f.key), profile[f.key] ?? null];
 }));
 const preData=inputFields({...customer,...profile},preFields);
 if(Object.hasOwn(profile,'customerStatus')&&profile.customerStatus)fapData.customer_category=profile.customerStatus;
 const c=await pool.getConnection();let changed=false;
 try{
  await c.beginTransaction();const [app]=await c.execute<any[]>('SELECT id_fap_stage,id_pre_analysis FROM all_applications WHERE application_id=? FOR UPDATE',[id]);if(!app.length)throw mysqlError('Application not found',404);
  if(fapData.district){
   const [districts]=await c.execute<any[]>(`SELECT d.name FROM master_kecamatan d WHERE d.id=? OR d.name=?`,[fapData.district,fapData.district]);
   if(districts.length) fapData.district=districts[0].name;
   if(fapData.village){
    const [villages]=await c.execute<any[]>(`SELECT v.name FROM master_kelurahan_desa v WHERE v.id=? OR v.name=?`,[fapData.village,fapData.village]);
    if(villages.length) fapData.village=villages[0].name;
   }
  }
  const storedPic={...pic};
  if(pic.district){
   const [districts]=await c.execute<any[]>(`SELECT d.id,d.name,c.name AS city_name,p.name AS province_name FROM master_kecamatan d JOIN master_kabupaten_kota c ON c.id=d.kabupaten_kota_id JOIN master_provinsi p ON p.id=c.provinsi_id WHERE (d.id=? OR d.name=?) AND (?='' OR c.name=?) AND (?='' OR p.name=?)`,[pic.district,pic.district,pic.city||'',pic.city||'',pic.province||'',pic.province||'']);
   if(districts.length!==1)throw mysqlError('Pilih kecamatan yang sesuai dengan kota/kabupaten dan provinsi.');
   const district=districts[0];storedPic.district=district.name;
   if(pic.village){const [villages]=await c.execute<any[]>('SELECT id,name FROM master_kelurahan_desa WHERE (id=? OR name=?) AND kecamatan_id=?',[pic.village,pic.village,district.id]);if(villages.length!==1)throw mysqlError('Pilih kelurahan/desa yang sesuai dengan kecamatan.');storedPic.village=villages[0].name;}
  }else if(pic.village)throw mysqlError('Pilih kecamatan sebelum memilih kelurahan/desa.');
  const updateTable=async(table:string,idColumn:string,rowId:string,values:Record<string,any>)=>{const [old]=await c.execute<any[]>(`SELECT * FROM ${table} WHERE ${idColumn}=? FOR UPDATE`,[rowId]);if(!old.length)throw mysqlError('Application stage was not found',404);const keys=Object.keys(values),isChanged=keys.some(k=>!same(databaseValue(old[0][k],String(old[0][k] instanceof Date?'date':'')),databaseValue(values[k],String(values[k] instanceof Date?'date':''))));if(isChanged){await c.execute(`UPDATE ${table} SET ${keys.map(k=>`\`${k}\`=?`).join(',')},updated_at=CURRENT_TIMESTAMP(3) WHERE ${idColumn}=?`,[...Object.values(values),rowId]);changed=true;}};
  await updateTable('new_application_fap_stage','id_fap_stage',app[0].id_fap_stage,fapData);
  await updateTable('new_application_pre_analisis','id_pre_analysis',app[0].id_pre_analysis,preData);
  const directoryData:Record<string,any>=customerDirectoryValues({...customer,...experience},profile,profile.customerStatus||current?.customerStatus||'EXISTING');
  const directoryKeys=Object.keys(directoryData);
  const [directoryRows]=await c.execute<any[]>('SELECT * FROM business_partner WHERE id=? FOR UPDATE',[current?.customerId]);
  if(!directoryRows.length){await c.execute(`INSERT INTO business_partner (id,${directoryKeys.map(k=>`\`${k}\``).join(',')}) VALUES (${Array(directoryKeys.length+1).fill('?').join(',')})`,[current?.customerId,...Object.values(directoryData)]);changed=true;}
  else{
   const directoryChanged=directoryFields.some(f=>!same(databaseValue(directoryRows[0][column(f.key)],f.type),databaseValue(directoryData[column(f.key)],f.type)))||!same(directoryRows[0].customer_relationship,directoryData.customer_relationship);
   if(directoryChanged){await c.execute(`UPDATE business_partner SET ${directoryKeys.map(k=>`\`${k}\`=?`).join(',')},updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,[...Object.values(directoryData),current?.customerId]);changed=true;}
  }
  const [existing]=await c.execute<any[]>('SELECT * FROM customer_pic WHERE application_id=? FOR UPDATE',[id]);
  const picNonempty=Object.values(pic).some(v=>v!==null&&v!=='');
  const picChanged=!existing.length||picFields.some(f=>!same(databaseValue(existing[0][picColumn(f.key)],f.type),storedPic[f.key]));
  if((existing.length||picNonempty)&&picChanged){
   const keys=picFields.map(f=>picColumn(f.key)),values=fieldValues(storedPic,picFields);
   if(existing.length)await c.execute(`UPDATE customer_pic SET ${keys.map(k=>`\`${k}\`=?`).join(',')},updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=?`,[...values,id]);
   else {const [stage]=await c.execute<any[]>('SELECT customer_id FROM new_application_fap_stage WHERE id_fap_stage=?',[app[0].id_fap_stage]);await c.execute(`INSERT INTO customer_pic (id,application_id,customer_id,${keys.map(k=>`\`${k}\``).join(',')}) VALUES (${Array(keys.length+3).fill('?').join(',')})`,[crypto.randomUUID(),id,stage[0].customer_id,...values]);}
   changed=true;
  }
  if(changed)await c.execute('UPDATE all_applications SET updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=?',[id]);
  await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
 return intakeDetail(id);
}

export async function transitionIntake(id:string,action:string,actor:{name:string,role:string},comments:string=''){
 if(!pool)throw mysqlError('MySQL is not configured',503);
 const detail=await intakeDetail(id);
 if(!detail)throw mysqlError('Application not found',404);

 let currentStatus=detail.status||'DRAFT';

 if(action==='SUBMIT_TO_BS'){
  if(!['MKT'].includes(actor.role)){
   throw mysqlError('Hanya tim Marketing yang dapat mengajukan ke Branch Support',403);
  }
  if(!['DRAFT','RETURNED'].includes(currentStatus)){
   throw mysqlError('Hanya aplikasi dengan status DRAFT atau RETURNED yang dapat diajukan',409);
  }

  // 1. Check mandatory constraints from mandatory table
  const [mandatoryList]=await pool.query<any[]>('SELECT section, field_key, field_label, mandatory FROM master_mandatory WHERE mandatory = 1');
  const picMandatory=mandatoryList.filter(m=>m.section==='Primary Contact (PIC)').map(m=>m.field_key);
  if(picMandatory.length){
   const [picRows]=await pool.execute<any[]>('SELECT * FROM customer_pic WHERE application_id = ?',[id]);
   const picRow=picRows[0];
   for(const key of picMandatory){
     const col=picColumn(key);
     if(!picRow||!String(picRow[col]||'').trim()){
       throw mysqlError(`Bagian Customer & PIC (${key}) wajib diisi dan disimpan sebelum submit ke BS.`, 422);
     }
   }
  }

  // 5. Check Document Checklist mandatory constraint
  const [docRows]=await pool.execute<any[]>(
   `SELECT adc.document_name 
    FROM application_document_checklist adc 
    LEFT JOIN application_document_file adf ON adf.checklist_id = adc.id 
    WHERE adc.application_id = ? AND adc.is_mandatory = 1 
    GROUP BY adc.id, adc.document_name 
    HAVING COUNT(adf.id) = 0`,
   [id]
  );
  if(docRows.length>0){
   const missingDocNames=docRows.map((r:any)=>r.document_name).join(', ');
   throw mysqlError(
    `Unggah dokumen wajib terlebih dahulu: ${missingDocNames}`,
    422
   );
  }

  // 6. Check Legal deeds & total percentage share constraint before submit
  const [deedRows]=await pool.execute<any[]>(
   'SELECT id, akta, nomor_akta, total_kepemilikan FROM daftar_akta WHERE application_id = ? AND deleted_at IS NULL',
   [id]
  );
  if(!deedRows.length){
   throw mysqlError('Minimal harus ada 1 akta (Akta pendirian) sebelum diajukan ke BS.', 422);
  }
  for(const d of deedRows){
   const total=Number(d.total_kepemilikan||0);
   if(Math.abs(total-100)>0.01){
     throw mysqlError(`Total kepemilikan saham pada ${d.akta} (${d.nomor_akta||'tanpa nomor'}) wajib tepat 100% sebelum submit ke BS. Saat ini ${total.toFixed(2)}%.`, 422);
   }
  }

  // All mandatory checks passed (or optional if is_mandatory=0)
  currentStatus='SUBMITTED_TO_BS';
 } else if(action==='VERIFY_BS'){
  if(!['BS'].includes(actor.role))throw mysqlError('Hanya Branch Support yang dapat memverifikasi berkas',403);
  currentStatus='BS_VERIFIED';
 } else if(action==='START_REVIEW'){
  if(!['BS'].includes(actor.role))throw mysqlError('Hanya Branch Support yang dapat memulai review',403);
  currentStatus='IN_CA_LEGAL_REVIEW';
 } else if(action==='RECOMMEND_CA'||action==='RECOMMEND_LEGAL'){
  const role=action==='RECOMMEND_CA'?'CA':'LEGAL';
  if(![role].includes(actor.role))throw mysqlError(`Hanya ${role} yang dapat melakukan sign-off ini`,403);
  currentStatus='CREDIT_COMMITTEE_REVIEW';
 } else if(action==='APPROVE_COMMITTEE'||action==='REJECT_COMMITTEE'){
  if(!['COMMITTEE'].includes(actor.role))throw mysqlError('Hanya Komite Kredit yang dapat memutuskan',403);
  currentStatus=action==='APPROVE_COMMITTEE'?'APPROVED':'REJECTED';
 } else if(action==='RETURN'){
  currentStatus='RETURNED';
 }

 const c=await pool.getConnection();
 try{
  await c.beginTransaction();
  const [appRows]=await c.execute<any[]>(
   'SELECT id_pre_analysis FROM all_applications WHERE application_id = ? FOR UPDATE',
   [id]
  );
  if(appRows.length){
   await c.execute(
    'UPDATE new_application_pre_analisis SET application_status = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id_pre_analysis = ?',
    [currentStatus,appRows[0].id_pre_analysis]
   );
   await c.execute(
    'UPDATE all_applications SET updated_at = CURRENT_TIMESTAMP(3) WHERE application_id = ?',
    [id]
   );
  }
  await c.commit();
 }catch(e){
  await c.rollback();
  throw e;
 }finally{
  c.release();
 }

 return await intakeDetail(id);
}

