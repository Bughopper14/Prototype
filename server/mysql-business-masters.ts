import {pool} from './mysql-store';
import type {MasterCatalog,MasterItem} from '../src/master-catalog';
import crypto from 'node:crypto';

const groups=[
 ['bankOrFinInstitution','master_busin_banks_Bank_Financial_Institution','busin_banks_Bank_Financial_Institution'],
 ['projectRole','master_busin_banks_Role_In_Project','busin_banks_Role_In_Project'],
 ['applicationSource','master_busin_banks_Application_Source','busin_banks_Application_Source'],
] as const;

export async function initializeBusinessMasters(seed:MasterCatalog){
 if(!pool)return;
 for(const [key,table,legacyTable] of groups){
  const [existing]=await pool.query<any[]>(`SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema=DATABASE() AND TABLE_NAME IN (?,?)`,[table,legacyTable]);
  const names=new Set(existing.map(row=>String(row.TABLE_NAME).toLowerCase()));
  const hasTarget=names.has(table.toLowerCase()),hasLegacy=names.has(legacyTable.toLowerCase());
  if(hasLegacy&&!hasTarget){
   await pool.query(`DROP TRIGGER IF EXISTS \`audit_${legacyTable}_insert\``);
   await pool.query(`DROP TRIGGER IF EXISTS \`audit_${legacyTable}_update\``);
   await pool.query(`RENAME TABLE \`${legacyTable}\` TO \`${table}\``);
  }else if(hasLegacy&&hasTarget){
   await pool.query(`DROP TRIGGER IF EXISTS \`audit_${table}_insert\``);
   await pool.query(`DROP TRIGGER IF EXISTS \`audit_${table}_update\``);
   const [sourceColumns]=await pool.query<any[]>('SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=?',[legacyTable]);
   const [targetColumns]=await pool.query<any[]>('SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=?',[table]);
   const shared=new Set(targetColumns.map(x=>String(x.COLUMN_NAME)));
   const copyColumns=['id','code','name','is_active','created_at','updated_at','created_by','updated_by'].filter(column=>shared.has(column)&&sourceColumns.some(x=>x.COLUMN_NAME===column));
   const updates=copyColumns.filter(column=>column!=='id').map(column=>`\`${column}\`=VALUES(\`${column}\`)`).join(',');
   await pool.query(`INSERT INTO \`${table}\` (${copyColumns.map(column=>`\`${column}\``).join(',')}) SELECT ${copyColumns.map(column=>`\`${column}\``).join(',')} FROM \`${legacyTable}\` ON DUPLICATE KEY UPDATE ${updates}`);
   await pool.query(`DROP TABLE \`${legacyTable}\``);
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (
   id CHAR(36) PRIMARY KEY,code VARCHAR(150) NOT NULL UNIQUE,name VARCHAR(150) NOT NULL,
   is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const [count]=await pool.query<any[]>(`SELECT COUNT(*) AS total FROM \`${table}\``);
  if(Number(count[0].total)===0)for(const item of seed[key])await pool.execute(`INSERT INTO \`${table}\` (id,code,name,is_active) VALUES (?,?,?,?)`,[crypto.randomUUID(),item.value,item.name,item.active?1:0]);
 }
}

export async function businessMasterCatalog(catalog:MasterCatalog):Promise<MasterCatalog>{
 if(!pool)return catalog;
 const result={...catalog};
 for(const [key,table] of groups){
  const [rows]=await pool.query<any[]>(`SELECT code,name,is_active FROM \`${table}\` ORDER BY created_at,id`);
  result[key]=rows.map(row=>({value:row.code,name:row.name,active:!!row.is_active} satisfies MasterItem));
 }
 return result;
}

export async function saveBusinessMasters(catalog:MasterCatalog){
 if(!pool)throw new Error('MySQL is not configured');
 const c=await pool.getConnection();
 try{
  await c.beginTransaction();
  for(const [key,table] of groups){
   for(const item of catalog[key]){
    const [rows]=await c.execute<any[]>(`SELECT name,is_active FROM \`${table}\` WHERE code=? FOR UPDATE`,[item.value]);
    if(rows.length){if(rows[0].name!==item.name||!!rows[0].is_active!==item.active)await c.execute(`UPDATE \`${table}\` SET name=?,is_active=?,updated_at=CURRENT_TIMESTAMP(3) WHERE code=?`,[item.name,item.active?1:0,item.value]);}
    else await c.execute(`INSERT INTO \`${table}\` (id,code,name,is_active) VALUES (?,?,?,?)`,[crypto.randomUUID(),item.value,item.name,item.active?1:0]);
   }
  }
  await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}
