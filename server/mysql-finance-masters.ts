import {auditTable} from './mysql-users';
import {pool} from './mysql-store';
import type {MasterCatalog,MasterItem} from '../src/master-catalog';
import crypto from 'node:crypto';

const groups=[
 ['facilityPurpose','master_finance_facility_purpose'],
 ['financingMethod','master_finance_facility_method'],
 ['currency','master_finance_currency'],
 ['paymentMethod','master_finance_payment_timing'],
] as const;

export async function initializeFinanceMasters(seed:MasterCatalog){
 if(!pool)return;
 for(const [key,table] of groups){
  await pool.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (
   id CHAR(36) PRIMARY KEY,code VARCHAR(150) NOT NULL UNIQUE,name VARCHAR(150) NOT NULL,
   ${key==='paymentMethod'?"timing ENUM('advance','arrear') NOT NULL DEFAULT 'arrear',":''}is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await auditTable(table);
  const [count]=await pool.query<any[]>(`SELECT COUNT(*) AS total FROM \`${table}\``);
  if(Number(count[0].total)===0)for(const item of seed[key])await pool.execute(`INSERT INTO \`${table}\` (id,code,name,is_active${key==='paymentMethod'?',timing':''}) VALUES (?,?,?,?${key==='paymentMethod'?',?':''})`,[crypto.randomUUID(),item.value,item.name,item.active?1:0,...(key==='paymentMethod'?[item.timing||'arrear']:[])]);
 }
}

export async function financeMasterCatalog(catalog:MasterCatalog):Promise<MasterCatalog>{
 if(!pool)return catalog;
 const result={...catalog};
 for(const [key,table] of groups){
  const [rows]=await pool.query<any[]>(`SELECT code,name,is_active${key==='paymentMethod'?',timing':''} FROM \`${table}\` ORDER BY created_at,id`);
  result[key]=rows.map(row=>({value:row.code,name:row.name,active:!!row.is_active,...(key==='paymentMethod'?{timing:row.timing}:{})} satisfies MasterItem));
 }
 return result;
}

export async function saveFinanceMasters(catalog:MasterCatalog){
 if(!pool)throw new Error('MySQL is not configured');
 const c=await pool.getConnection();
 try{
  await c.beginTransaction();
  for(const [key,table] of groups){
   for(const item of catalog[key]){
    const [rows]=await c.execute<any[]>(`SELECT name,is_active${key==='paymentMethod'?',timing':''} FROM \`${table}\` WHERE code=? FOR UPDATE`,[item.value]);
    if(rows.length){if(rows[0].name!==item.name||!!rows[0].is_active!==item.active||key==='paymentMethod'&&rows[0].timing!==item.timing)await c.execute(`UPDATE \`${table}\` SET name=?,is_active=?${key==='paymentMethod'?',timing=?':''},updated_at=CURRENT_TIMESTAMP(3) WHERE code=?`,[item.name,item.active?1:0,...(key==='paymentMethod'?[item.timing||'arrear']:[]),item.value]);}
    else await c.execute(`INSERT INTO \`${table}\` (id,code,name,is_active) VALUES (?,?,?,?)`,[crypto.randomUUID(),item.value,item.name,item.active?1:0]);
   }
  }
  await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}
