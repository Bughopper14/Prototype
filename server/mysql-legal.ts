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
const mapStakeholder=(row:any)=>({...Object.fromEntries(stakeholderFields.map(f=>[f.key,f.type==='date'?asDate(row[col(f.key)]):row[col(f.key)]])),id:row.id,name:[row.first_name,row.middle_name,row.last_name].filter(Boolean).join(' '),createdAt:row.created_at,updatedAt:row.updated_at});
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
  const [stakeholders]=await pool!.execute<any[]>('SELECT * FROM legal_stakeholder WHERE akta_id=? AND deleted_at IS NULL ORDER BY created_at,id',[row.id]);
  return {id:row.id,type:table==='akta_pendirian'?'establishment':'amendment',deedNumber:row.nomor_akta,deedDate:asDate(row.tanggal),ministerialDecreeNumber:row.sk_menteri,ministerialDecreeDate:asDate(row.tanggal_sk_menteri),remarkCategoryId:row.kategori_remarks||null,remarks:typed[0]?.remarks||row.remarks||'',parties:{representative:typed[0]?.representative||'',companyShareholder:typed[0]?.pemegang_saham_perusahaan||''},status:row.status,expiryDate:asDate(row.berlaku_sampai),shareholders:Number(row.jumlah_shareholder),stakeholders:stakeholders.map(mapStakeholder),createdAt:row.created_at,updatedAt:row.updated_at,infoAdded:stakeholders.length>0};
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
 if(!Array.isArray(incoming?.deeds)||incoming.deeds.length>100)throw Object.assign(Error('Daftar akta tidak valid'),{status:422});
 const deeds=structuredClone(incoming.deeds),ids=new Set<string>();
 for(const d of deeds){
  d.id=d.id||crypto.randomUUID();if(ids.has(d.id)||!['establishment','amendment'].includes(d.type))throw Object.assign(Error('ID atau jenis akta tidak valid'),{status:422});ids.add(d.id);
  for(const key of ['deedNumber','deedDate','ministerialDecreeNumber','ministerialDecreeDate'])if(!d[key])throw Object.assign(Error(key+' wajib diisi'),{status:422});
  validateInput({...d,stakeholders:undefined});if(d.type==='amendment'&&!d.remarkCategoryId)throw Object.assign(Error('Kategori Remarks wajib diisi'),{status:422});
  d.stakeholders=d.stakeholders||[];if(d.stakeholders.length>100)throw Object.assign(Error('Maksimal 100 stakeholder per akta'),{status:422});
  let total=new Decimal(0);const stakeholderIds=new Set<string>();
  for(const s of d.stakeholders){s.id=s.id||crypto.randomUUID();if(stakeholderIds.has(s.id))throw Object.assign(Error('ID stakeholder duplikat'),{status:422});stakeholderIds.add(s.id);validateInput(s);if(!s.email||!s.mobilePhone||s.primaryCapital===undefined||s.primaryCapital===null||s.primaryCapital==='')throw Object.assign(Error('Email, Mobile phone dan Primary capital wajib diisi'),{status:422});if(![s.firstName,s.lastName,s.name].some((x:any)=>String(x||'').trim()))throw Object.assign(Error('Nama stakeholder wajib diisi'),{status:422});const pct=new Decimal(s.sharePercentage||0);if(pct.lt(0)||pct.gt(100))throw Object.assign(Error('Percentage share harus antara 0 dan 100'),{status:422});total=total.plus(pct);}
  if(total.gt(100)||final&&!total.eq(100))throw Object.assign(Error('Total Percentage share pada setiap akta wajib tepat 100% sebelum Save changes.'),{status:422});
 }
 const c=await pool.getConnection();
 try{
  await c.beginTransaction();await c.execute('SELECT application_id FROM all_applications WHERE application_id=? FOR UPDATE',[applicationId]);
  for(const d of deeds){
   const expiry=new Date(d.deedDate+'T00:00:00Z');expiry.setUTCFullYear(expiry.getUTCFullYear()+5);const until=expiry.toISOString().slice(0,10),active=until>=new Date().toISOString().slice(0,10);
   await upsert(c,'daftar_akta',d.id,{application_id:applicationId,akta:d.type==='establishment'?'Akta pendirian':'Akta perubahan',nomor_akta:d.deedNumber||'',tanggal:d.deedDate,status:active?'Aktif':'Tidak aktif',berlaku_sampai:until,sk_menteri:d.ministerialDecreeNumber||null,tanggal_sk_menteri:d.ministerialDecreeDate||null,kategori_remarks:d.remarkCategoryId||null,remarks:d.remarks||null,stakeholders:d.stakeholders.length,jumlah_shareholder:d.stakeholders.filter((s:any)=>Number(s.sharePercentage)>0).length,total_kepemilikan:d.stakeholders.reduce((v:Decimal,s:any)=>v.plus(s.sharePercentage||0),new Decimal(0)).toFixed(2),is_selected:d.id===incoming.selectedDeedId});
   const table=d.type==='establishment'?'akta_pendirian':'akta_perubahan',other=d.type==='establishment'?'akta_perubahan':'akta_pendirian';const [typed]=await c.execute<any[]>(`SELECT id FROM ${table} WHERE akta_id=?`,[d.id]);
   await upsert(c,table,typed[0]?.id||crypto.randomUUID(),{akta_id:d.id,application_id:applicationId,nomor_akta:d.deedNumber||null,tanggal_akta:d.deedDate||null,nomor_sk_menteri:d.ministerialDecreeNumber||null,tanggal_sk_menteri:d.ministerialDecreeDate||null,representative:d.parties?.representative||null,pemegang_saham_perusahaan:d.parties?.companyShareholder||null,kategori_remarks:d.remarkCategoryId||null,remarks:d.remarks||null});
   await c.execute(`UPDATE ${other} SET deleted_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3) WHERE akta_id=? AND deleted_at IS NULL`,[d.id]);
   for(const s of d.stakeholders){const value=Object.fromEntries(stakeholderFields.map(f=>[col(f.key),s[f.key]===''||s[f.key]===undefined?null:s[f.key]]));const [old]=await c.execute<any[]>('SELECT id FROM legal_stakeholder WHERE id=?',[s.id]);await upsert(c,'legal_stakeholder',old[0]?.id||s.id,{akta_id:d.id,application_id:applicationId,...value});}
   const stakeholderIds=d.stakeholders.map((s:any)=>s.id);await c.execute(`UPDATE legal_stakeholder SET deleted_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3) WHERE akta_id=? AND deleted_at IS NULL ${stakeholderIds.length?'AND id NOT IN ('+stakeholderIds.map(()=>'?').join(',')+')':''}`,[d.id,...stakeholderIds]);
  }
  const savedIds=deeds.map((d:any)=>d.id);for(const table of ['legal_stakeholder','akta_pendirian','akta_perubahan','daftar_akta'])await c.execute(`UPDATE ${table} SET deleted_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=? AND deleted_at IS NULL ${savedIds.length?'AND '+(table==='daftar_akta'?'id':'akta_id')+' NOT IN ('+savedIds.map(()=>'?').join(',')+')':''}`,[applicationId,...savedIds]);
  await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
 return readLegal(applicationId);
}
