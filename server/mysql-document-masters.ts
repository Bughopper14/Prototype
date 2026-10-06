import {pool} from './mysql-store';
import {auditTable} from './mysql-users';
import type {MasterCatalog,MasterItem} from '../src/master-catalog';
import crypto from 'node:crypto';

const table='master_document_jenis_dokumen_wajib';
export async function initializeDocumentMasters(seed:MasterCatalog){
 if(!pool)return;
 await pool.query(`CREATE TABLE IF NOT EXISTS ${table} (
  id CHAR(36) PRIMARY KEY,code VARCHAR(150) NOT NULL UNIQUE,name VARCHAR(150) NOT NULL,
  department VARCHAR(20) NOT NULL,is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await auditTable(table);
 const [rows]=await pool.query<any[]>(`SELECT COUNT(*) AS total FROM ${table}`);
 if(Number(rows[0].total)===0)for(const item of seed.documents)await pool.execute(`INSERT INTO ${table} (id,code,name,department,is_required,is_active) VALUES (?,?,?,?,?,?)`,[crypto.randomUUID(),item.value,item.name,item.role||'BS',item.required?1:0,item.active?1:0]);
}
export async function documentMasterCatalog(catalog:MasterCatalog):Promise<MasterCatalog>{
 if(!pool)return catalog;
 const [rows]=await pool.query<any[]>(`SELECT code,name,department,is_required,is_active FROM ${table} ORDER BY created_at,id`);
 return {...catalog,documents:rows.map(row=>({value:row.code,name:row.name,role:row.department,required:!!row.is_required,active:!!row.is_active} satisfies MasterItem))};
}
export async function saveDocumentMasters(catalog:MasterCatalog){
 if(!pool)throw new Error('MySQL is not configured');
 const c=await pool.getConnection();
 try{
  await c.beginTransaction();
  for(const item of catalog.documents){
   const [rows]=await c.execute<any[]>(`SELECT name,department,is_required,is_active FROM ${table} WHERE code=? FOR UPDATE`,[item.value]);
   if(rows.length){const old=rows[0];if(old.name!==item.name||old.department!==item.role||!!old.is_required!==item.required||!!old.is_active!==item.active)await c.execute(`UPDATE ${table} SET name=?,department=?,is_required=?,is_active=?,updated_at=CURRENT_TIMESTAMP(3) WHERE code=?`,[item.name,item.role||'BS',item.required?1:0,item.active?1:0,item.value]);}
   else await c.execute(`INSERT INTO ${table} (id,code,name,department,is_required,is_active) VALUES (?,?,?,?,?,?)`,[crypto.randomUUID(),item.value,item.name,item.role||'BS',item.required?1:0,item.active?1:0]);
  }
  await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}
