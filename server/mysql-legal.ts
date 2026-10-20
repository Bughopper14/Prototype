import {experienceFromEstablishmentDate} from '../src/experience';
import fs from 'node:fs/promises';
import {auditTable} from './mysql-users';
import {ageFromDateOfBirth} from '../src/age';
import {pool} from './mysql-store';
import {stakeholderFields} from '../src/fields';
import {validateInput} from '../src/input-validation';
import Decimal from 'decimal.js';
import crypto from 'node:crypto';
const col=(s:string)=>s.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
const canonical=(v:any)=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const asDate=(v:any)=>v instanceof Date?v.toISOString().slice(0,10):v?String(v).slice(0,10):null;
const numberFields=new Set(stakeholderFields.filter(f=>f.type==='number').map(f=>col(f.key)));
const dateFields=new Set([...stakeholderFields.filter(f=>f.type==='date').map(f=>col(f.key)),'tanggal','tanggal_akta','tanggal_sk_menteri','berlaku_sampai']);
const comparable=(key:string,value:any)=>value===null||value===undefined?'':numberFields.has(key)?Number(value):dateFields.has(key)?asDate(value):String(value);
const mapStakeholder=(row:any)=>({...Object.fromEntries(stakeholderFields.map(f=>[f.key,f.type==='date'?asDate(row[col(f.key)]):row[col(f.key)]])),...ageFromDateOfBirth(asDate(row.date_of_birth)),district:row.district_master_id||row.district,village:row.village_master_id||row.village,id:row.id,name:[row.first_name,row.middle_name,row.last_name].filter(Boolean).join(' '),createdAt:row.created_at,updatedAt:row.updated_at});
export async function initializeLegal(){
 if(!pool)return;
 await pool.query(`CREATE TABLE IF NOT EXISTS daftar_akta (
  id VARCHAR(100) PRIMARY KEY,application_id CHAR(36) NOT NULL,akta VARCHAR(30) NOT NULL,nomor_akta VARCHAR(1000) NOT NULL,tanggal DATE NOT NULL,
  status VARCHAR(30) NOT NULL,berlaku_sampai DATE,sk_menteri VARCHAR(1000),tanggal_sk_menteri DATE,kategori_remarks VARCHAR(150),remarks TEXT,
  stakeholders INT NOT NULL DEFAULT 0,jumlah_shareholder INT NOT NULL DEFAULT 0,total_kepemilikan DECIMAL(7,2) NOT NULL DEFAULT 0,is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,deleted_at TIMESTAMP(3) NULL,
  CONSTRAINT fk_daftar_akta_application FOREIGN KEY(application_id) REFERENCES all_applications(application_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 for(const table of ['akta_pendirian','akta_perubahan'])await pool.query(`CREATE TABLE IF NOT EXISTS ${table} (
  id CHAR(36) PRIMARY KEY,akta_id VARCHAR(100) NOT NULL UNIQUE,application_id CHAR(36) NOT NULL,nomor_akta VARCHAR(1000),tanggal_akta DATE,
  nomor_sk_menteri VARCHAR(1000),tanggal_sk_menteri DATE,representative TEXT,pemegang_saham_perusahaan TEXT,kategori_remarks VARCHAR(150),remarks TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,deleted_at TIMESTAMP(3) NULL,
  CONSTRAINT fk_${table}_akta FOREIGN KEY(akta_id) REFERENCES daftar_akta(id),CONSTRAINT fk_${table}_application FOREIGN KEY(application_id) REFERENCES all_applications(application_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await pool.query(`CREATE TABLE IF NOT EXISTS legal_stakeholder (
  id CHAR(36) PRIMARY KEY,akta_id VARCHAR(100) NOT NULL,application_id CHAR(36) NOT NULL,
  ${stakeholderFields.map(f=>'`'+col(f.key)+'` '+(f.type==='number'?'DECIMAL(20,2)':f.type==='date'?'DATE':'TEXT')+' NULL').join(',')},
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,deleted_at TIMESTAMP(3) NULL,
  CONSTRAINT fk_legal_stakeholder_akta FOREIGN KEY(akta_id) REFERENCES daftar_akta(id),CONSTRAINT fk_legal_stakeholder_application FOREIGN KEY(application_id) REFERENCES all_applications(application_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
export async function readLegal(applicationId:string){
 if(!pool)return {deeds:[]};
 const [rows]=await pool.execute<any[]>('SELECT * FROM daftar_akta WHERE application_id=? AND deleted_at IS NULL ORDER BY created_at,id',[applicationId]);
 const deeds=await Promise.all(rows.map(async row=>{
  const table=row.akta==='Akta pendirian'?'akta_pendirian':'akta_perubahan';
  const [typed]=await pool!.execute<any[]>(`SELECT * FROM ${table} WHERE akta_id=? AND deleted_at IS NULL`,[row.id]);
  const [stakeholders]=await pool!.execute<any[]>(`SELECT s.*,d.id AS district_master_id,v.id AS village_master_id FROM legal_stakeholder s LEFT JOIN master_provinsi p ON (p.name=s.province OR p.id=s.province) LEFT JOIN master_kabupaten_kota c ON (c.name=s.city_regency OR c.id=s.city_regency) AND c.provinsi_id=p.id LEFT JOIN master_kecamatan d ON (d.name=s.district OR d.id=s.district) AND d.kabupaten_kota_id=c.id LEFT JOIN master_kelurahan_desa v ON (v.name=s.village OR v.id=s.village) AND v.kecamatan_id=d.id WHERE s.akta_id=? AND s.deleted_at IS NULL ORDER BY s.created_at,s.id`,[row.id]);
  return {id:row.id,type:table==='akta_pendirian'?'establishment':'amendment',deedNumber:row.nomor_akta,deedDate:asDate(row.tanggal),ministerialDecreeNumber:row.sk_menteri,ministerialDecreeDate:asDate(row.tanggal_sk_menteri),remarkCategoryId:typed[0]?.kategori_remarks||row.kategori_remarks||null,remarks:typed[0]?.remarks||row.remarks||'',parties:{representative:typed[0]?.representative||'',companyShareholder:typed[0]?.pemegang_saham_perusahaan||''},status:row.status,expiryDate:asDate(row.berlaku_sampai),shareholders:Number(row.jumlah_shareholder),stakeholders:stakeholders.map(mapStakeholder),createdAt:row.created_at,updatedAt:row.updated_at,infoAdded:stakeholders.length>0};
 }));
 const [hidden]=await pool.execute<any[]>('SELECT id FROM daftar_akta WHERE application_id=? AND deleted_at IS NOT NULL',[applicationId]);
 return {deeds,hiddenDeedIds:hidden.map(r=>r.id),selectedDeedId:rows.find(r=>r.is_selected)?.id||deeds[0]?.id};
}
async function upsert(c:any,table:string,id:string,values:Record<string,any>){
 const [rows]=await c.execute(`SELECT * FROM ${table} WHERE id=? FOR UPDATE`,[id]) as any;
 if(rows[0]&&rows[0].application_id!==values.application_id)throw Object.assign(Error('Record belongs to another application'),{status:409});
 if(rows[0]&&values.akta_id&&rows[0].akta_id!==values.akta_id)throw Object.assign(Error('Stakeholder belongs to another deed'),{status:409});
 const keys=Object.keys(values),old=rows[0];
 const changed=!old||Boolean(old.deleted_at)||keys.some(k=>comparable(k,old[k])!==comparable(k,values[k]));
 if(!changed)return;
 if(old)await c.execute(`UPDATE ${table} SET ${keys.map(k=>'`'+k+'`=?').join(',')},deleted_at=NULL,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,[...Object.values(values),id]);
 else await c.execute(`INSERT INTO ${table} (id,${keys.map(k=>'`'+k+'`').join(',')}) VALUES (${Array(keys.length+1).fill('?').join(',')})`,[id,...Object.values(values)]);
}
export async function saveLegal(applicationId:string,incoming:any,final=false){
 if(!pool)throw Error('MySQL is not configured');
 const rawList = Array.isArray(incoming) ? incoming : Array.isArray(incoming?.deeds) ? incoming.deeds : [];
 if(!Array.isArray(rawList)||rawList.length>100)throw Object.assign(Error('Daftar akta tidak valid'),{status:422});
 const deeds=structuredClone(rawList),ids=new Set<string>();
 for(const d of deeds){
  d.id=d.id||crypto.randomUUID();if(ids.has(d.id)||!['establishment','amendment'].includes(d.type))throw Object.assign(Error('ID atau jenis akta tidak valid'),{status:422});ids.add(d.id);
  if(final){
    for(const key of ['deedNumber','deedDate','ministerialDecreeNumber','ministerialDecreeDate'])if(!d[key])throw Object.assign(Error(key+' wajib diisi sebelum submit'),{status:422});
    validateInput({...d,stakeholders:undefined});
  }
  d.stakeholders=d.stakeholders||[];if(d.stakeholders.length>100)throw Object.assign(Error('Maksimal 100 stakeholder per akta'),{status:422});
  let total=new Decimal(0);const stakeholderIds=new Set<string>();
  for(const s of d.stakeholders){
    s.id=s.id||crypto.randomUUID();
    if(stakeholderIds.has(s.id))throw Object.assign(Error('ID stakeholder duplikat'),{status:422});
    stakeholderIds.add(s.id);
    if(final){
      validateInput(s);
      if(!s.email||!s.mobilePhone||s.primaryCapital===undefined||s.primaryCapital===null||s.primaryCapital==='')throw Object.assign(Error('Email, Mobile phone dan Primary capital wajib diisi sebelum submit'),{status:422});
      if(![s.firstName,s.lastName,s.name].some((x:any)=>String(x||'').trim()))throw Object.assign(Error('Nama stakeholder wajib diisi sebelum submit'),{status:422});
    }
    const pct=new Decimal(s.sharePercentage||0);
    total=total.plus(pct);
  }
  if(final&&!total.eq(100))throw Object.assign(Error('Total Percentage share pada setiap akta wajib tepat 100% sebelum submit.'),{status:422});
 }
 const c=await pool.getConnection();
 try{
  await c.beginTransaction();await c.execute('SELECT application_id FROM all_applications WHERE application_id=? FOR UPDATE',[applicationId]);
  for(const d of deeds){
   const deedDateStr=d.deedDate?String(d.deedDate).slice(0,10):new Date().toISOString().slice(0,10);
   const expiry=new Date(deedDateStr+'T00:00:00Z');expiry.setUTCFullYear(expiry.getUTCFullYear()+5);const until=expiry.toISOString().slice(0,10),active=until>=new Date().toISOString().slice(0,10);
   await upsert(c,'daftar_akta',d.id,{application_id:applicationId,akta:d.type==='establishment'?'Akta pendirian':'Akta perubahan',nomor_akta:d.deedNumber||'',tanggal:deedDateStr,status:active?'Aktif':'Tidak aktif',berlaku_sampai:until,sk_menteri:d.ministerialDecreeNumber||null,tanggal_sk_menteri:d.ministerialDecreeDate||null,kategori_remarks:d.remarkCategoryId||null,remarks:d.remarks||null,stakeholders:d.stakeholders.length,jumlah_shareholder:d.stakeholders.filter((s:any)=>Number(s.sharePercentage)>0).length,total_kepemilikan:d.stakeholders.reduce((v:Decimal,s:any)=>v.plus(s.sharePercentage||0),new Decimal(0)).toFixed(2),is_selected:d.id===incoming.selectedDeedId});
   const table=d.type==='establishment'?'akta_pendirian':'akta_perubahan',other=d.type==='establishment'?'akta_perubahan':'akta_pendirian';const [typed]=await c.execute<any[]>(`SELECT id FROM ${table} WHERE akta_id=?`,[d.id]);
   await upsert(c,table,typed[0]?.id||crypto.randomUUID(),{akta_id:d.id,application_id:applicationId,nomor_akta:d.deedNumber||null,tanggal_akta:d.deedDate||null,nomor_sk_menteri:d.ministerialDecreeNumber||null,tanggal_sk_menteri:d.ministerialDecreeDate||null,representative:d.parties?.representative||null,pemegang_saham_perusahaan:d.parties?.companyShareholder||null,kategori_remarks:d.remarkCategoryId||null,remarks:d.remarks||null});
   await c.execute(`UPDATE ${other} SET deleted_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3) WHERE akta_id=? AND deleted_at IS NULL`,[d.id]);
   for(const s of d.stakeholders){Object.assign(s,ageFromDateOfBirth(s.dateOfBirth));const stored=await stakeholderLocationNames(c,s);const value=Object.fromEntries(stakeholderFields.map(f=>[col(f.key),stored[f.key]===''||stored[f.key]===undefined?null:stored[f.key]]));const [old]=await c.execute<any[]>('SELECT id FROM legal_stakeholder WHERE id=?',[s.id]);await upsert(c,'legal_stakeholder',old[0]?.id||s.id,{akta_id:d.id,application_id:applicationId,...value});}
   const stakeholderIds=d.stakeholders.map((s:any)=>s.id);await c.execute(`UPDATE legal_stakeholder SET deleted_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3) WHERE akta_id=? AND deleted_at IS NULL ${stakeholderIds.length?'AND id NOT IN ('+stakeholderIds.map(()=>'?').join(',')+')':''}`,[d.id,...stakeholderIds]);
  }
  const savedIds=deeds.map((d:any)=>d.id);for(const table of ['legal_stakeholder','akta_pendirian','akta_perubahan','daftar_akta'])await c.execute(`UPDATE ${table} SET deleted_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=? AND deleted_at IS NULL ${savedIds.length?'AND '+(table==='daftar_akta'?'id':'akta_id')+' NOT IN ('+savedIds.map(()=>'?').join(',')+')':''}`,[applicationId,...savedIds]);
  const estDeed = deeds.find((d: any) => d.type === 'establishment');
  if (estDeed && estDeed.deedNumber) {
   await c.execute(
    'UPDATE new_application_fap_stage f JOIN all_applications a ON a.id_fap_stage = f.id_fap_stage SET f.establishment_act_no = ?, f.establishment_date = ? WHERE a.application_id = ?',
    [estDeed.deedNumber, estDeed.deedDate || null, applicationId]
   );
  }
  const amendments = deeds
   .filter((d: any) => d.type === 'amendment' && d.deedDate)
   .sort((a: any, b: any) => String(b.deedDate).localeCompare(String(a.deedDate)) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  if (amendments.length > 0 && amendments[0].deedNumber) {
   await c.execute(
    'UPDATE new_application_pre_analisis p JOIN all_applications a ON a.id_pre_analysis = p.id_pre_analysis SET p.latest_deed_no = ?, p.latest_deed_date = ? WHERE a.application_id = ?',
    [amendments[0].deedNumber, amendments[0].deedDate || null, applicationId]
   );
  }
  await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
 return readLegal(applicationId);
}

async function stakeholderLocationNames(c:any,input:any){
 const stored={...input};let parentId:string|undefined;
 for(const [key,table,parent] of [['province','master_provinsi',null],['cityRegency','master_kabupaten_kota','provinsi_id'],['district','master_kecamatan','kabupaten_kota_id'],['village','master_kelurahan_desa','kecamatan_id']] as const){
  if(!input[key]){parentId=undefined;continue;}
  try{
   const [rows]=await c.execute('SELECT id,name FROM '+table+' WHERE (id=? OR name=?)'+(parent&&parentId?' AND '+parent+'=?':''),[input[key],input[key],...(parent&&parentId?[parentId]:[])]);
   if(rows.length>=1){stored[key]=rows[0].name;parentId=rows[0].id;}
  }catch{}
 }
 return stored;
}
export async function migrateStakeholderLocationNames(){
 if(!pool)return;
 const fields=[['province','master_provinsi'],['city_regency','master_kabupaten_kota'],['district','master_kecamatan'],['village','master_kelurahan_desa']] as const;
 try{
  const c=await pool.getConnection();
  try{
   await c.beginTransaction();
   const [backup]=await c.query<any[]>('SELECT id,province,city_regency,district,village FROM legal_stakeholder WHERE '+fields.map(([key,table])=>'EXISTS (SELECT 1 FROM '+table+' m WHERE m.id=legal_stakeholder.'+key+')').join(' OR ')+' FOR UPDATE');
   if(backup.length){await fs.mkdir('.data',{recursive:true});await fs.writeFile('.data/stakeholder-location-backup-'+Date.now()+'.json',JSON.stringify(backup,null,2));}
   for(const [key,table] of fields)await c.query('UPDATE legal_stakeholder s JOIN '+table+' m ON m.id=s.'+key+' SET s.'+key+'=m.name');
   await c.commit();
  }catch(e){
   await c.rollback();
   console.warn('migrateStakeholderLocationNames warning, skipped:', (e as any)?.message || e);
  }finally{
   c.release();
  }
 }catch(connErr){
  console.warn('migrateStakeholderLocationNames connection error:', (connErr as any)?.message || connErr);
 }
}
