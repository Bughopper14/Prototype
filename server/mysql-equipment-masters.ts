import {pool} from './mysql-store';
import type {MasterCatalog,MasterItem} from '../src/master-catalog';
import crypto from 'node:crypto';

const groups=[
 ['unitCategory','master_equipment_unit_category',null],
 ['brand','master_equipment_brand','unit_category'],
 ['unitType','master_equipment_type','brand'],
 ['modelName','master_equipment_model','type'],
 ['assetName','master_equipment_asset_name','model'],
] as const;

export async function initializeEquipmentMasters(seed:MasterCatalog){
 if(!pool)return;
 for(const [key,table,parentColumn] of groups){
  await pool.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (
   id CHAR(36) PRIMARY KEY,code VARCHAR(150) NOT NULL UNIQUE,name VARCHAR(150) NOT NULL,
   ${parentColumn?`\`${parentColumn}\` VARCHAR(150) NULL,`:''}is_active BOOLEAN NOT NULL DEFAULT TRUE,
   created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const [columns]=await pool.query<any[]>('SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=?',[table]);
  const names=new Set(columns.map(row=>row.COLUMN_NAME));
  if(names.has('parent_value')){
   if(parentColumn&&!names.has(parentColumn))await pool.query(`ALTER TABLE \`${table}\` RENAME COLUMN parent_value TO \`${parentColumn}\``);
   else if(!parentColumn)await pool.query(`ALTER TABLE \`${table}\` DROP COLUMN parent_value`);
   else throw new Error(`Both parent_value and ${parentColumn} exist in ${table}; resolve the duplicate columns before startup.`);
  }else if(parentColumn&&!names.has(parentColumn))await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${parentColumn}\` VARCHAR(150) NULL`);
  const [count]=await pool.query<any[]>(`SELECT COUNT(*) AS total FROM \`${table}\``);
  if(Number(count[0].total)===0)for(const item of seed[key])await pool.execute(`INSERT INTO \`${table}\` (id,code,name,is_active${parentColumn?`,\`${parentColumn}\``:''}) VALUES (?,?,?,?${parentColumn?',?':''})`,[crypto.randomUUID(),item.value,item.name,item.active?1:0,...(parentColumn?[item.parentValue||null]:[])]);
 }
}

export async function equipmentMasterCatalog(catalog:MasterCatalog):Promise<MasterCatalog>{
 if(!pool)return catalog;
 const result={...catalog};
 for(const [key,table,parentColumn] of groups){
  const [rows]=await pool.query<any[]>(`SELECT code,name,is_active,${parentColumn?`\`${parentColumn}\``:'NULL'} AS parent_value FROM \`${table}\` ORDER BY created_at,id`);
  result[key]=rows.map(row=>({value:row.code,name:row.name,active:!!row.is_active,...(row.parent_value?{parentValue:row.parent_value}:{})} satisfies MasterItem));
 }
 return result;
}

export async function saveEquipmentMasters(catalog:MasterCatalog){
 if(!pool)throw new Error('MySQL is not configured');
 const c=await pool.getConnection();
 try{
  await c.beginTransaction();
  for(const [key,table,parentColumn] of groups)for(const item of catalog[key]){
   const parent=parentColumn?item.parentValue||null:null;
   const [rows]=await c.execute<any[]>(`SELECT name,is_active,${parentColumn?`\`${parentColumn}\``:'NULL'} AS parent_value FROM \`${table}\` WHERE code=? FOR UPDATE`,[item.value]);
   if(rows.length){if(rows[0].name!==item.name||(rows[0].parent_value||null)!==parent||!!rows[0].is_active!==item.active)await c.execute(`UPDATE \`${table}\` SET name=?,is_active=?,updated_at=CURRENT_TIMESTAMP(3)${parentColumn?`,\`${parentColumn}\`=?`:''} WHERE code=?`,[item.name,item.active?1:0,...(parentColumn?[parent]:[]),item.value]);}
   else await c.execute(`INSERT INTO \`${table}\` (id,code,name,is_active${parentColumn?`,\`${parentColumn}\``:''}) VALUES (?,?,?,?${parentColumn?',?':''})`,[crypto.randomUUID(),item.value,item.name,item.active?1:0,...(parentColumn?[parent]:[])]);
  }
  await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}
