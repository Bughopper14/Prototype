import {pool} from './mysql-store';
import crypto from 'node:crypto';
import {auditTable} from './mysql-users';
import {type MasterCatalog,type MasterItem} from '../src/master-catalog';
const levels=[['province','master_provinsi',null],['city','master_kabupaten_kota','provinsi_id'],['district','master_kecamatan','kabupaten_kota_id'],['village','master_kelurahan_desa','kecamatan_id']] as const;
export async function initializeLocation(){
 if(!pool)return;
 for(const [i,[,table,parent]] of levels.entries())await pool.query(`CREATE TABLE IF NOT EXISTS ${table} (id CHAR(36) PRIMARY KEY,name VARCHAR(150) NOT NULL,${parent?`${parent} CHAR(36) NOT NULL,`:'country VARCHAR(150) NOT NULL,'}${i===0?'region VARCHAR(100) NULL,':''}${i===3?'postal_code VARCHAR(20) NULL,':''}is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL${parent?`,CONSTRAINT fk_${table}_parent FOREIGN KEY (${parent}) REFERENCES ${levels[i-1][1]}(id)`:''}) ENGINE=InnoDB`);
 await pool.query(`CREATE TABLE IF NOT EXISTS master_country (
  id CHAR(36) PRIMARY KEY,code VARCHAR(150) NOT NULL UNIQUE,name VARCHAR(150) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await auditTable('master_country');
 await pool.query(`INSERT IGNORE INTO master_country (id,code,name) SELECT UUID(),country,country FROM master_provinsi GROUP BY country`);
 await pool.query(`CREATE TABLE IF NOT EXISTS master_kode_pos (
  id CHAR(36) PRIMARY KEY,postal_code VARCHAR(20) NOT NULL,name VARCHAR(150) NOT NULL,
  kabupaten_kota_id CHAR(36) NOT NULL,is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,
  UNIQUE KEY city_postal_code(kabupaten_kota_id,postal_code),
  FOREIGN KEY(kabupaten_kota_id) REFERENCES master_kabupaten_kota(id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await auditTable('master_kode_pos');
 await pool.query(`INSERT IGNORE INTO master_kode_pos (id,postal_code,name,kabupaten_kota_id,is_active)
 SELECT UUID(),v.postal_code,v.postal_code,c.id,MAX(v.is_active AND d.is_active AND c.is_active AND p.is_active)
 FROM master_kelurahan_desa v JOIN master_kecamatan d ON d.id=v.kecamatan_id
 JOIN master_kabupaten_kota c ON c.id=d.kabupaten_kota_id JOIN master_provinsi p ON p.id=c.provinsi_id
 WHERE v.postal_code IS NOT NULL AND v.postal_code<>'' GROUP BY c.id,v.postal_code`);
}
export async function locationCatalog(base:MasterCatalog):Promise<MasterCatalog>{
 if(!pool)return base;
 const result={...base};
 const [countries]=await pool.query<any[]>('SELECT code,name,is_active FROM master_country ORDER BY created_at,id');
 result.country=countries.map(x=>({value:x.code,name:x.name,active:!!x.is_active}));
 for(const item of base.country)if(!result.country.some(x=>x.value===item.value))result.country.push(item);
 for(const [i,[key,table,parent]] of levels.entries()){
 const [rows]=await pool.query<any[]>(parent?`SELECT a.*,p.id parent_id FROM ${table} a JOIN ${levels[i-1][1]} p ON p.id=a.${parent} ORDER BY a.created_at,a.id`:`SELECT * FROM ${table} ORDER BY created_at,id`);
 const saved:MasterItem[]=rows.map(r=>({value:r.id,name:r.name,active:!!r.is_active,parentValue:parent?r.parent_id:r.country,...(r.region?{region:r.region}:{}),...(r.postal_code?{zipCode:r.postal_code}:{})}));
 result[key]=saved;
 }
 const [zipRows]=await pool.query<any[]>(`SELECT z.postal_code,z.name,z.kabupaten_kota_id AS city_id,(z.is_active AND c.is_active AND p.is_active) AS is_active FROM master_kode_pos z JOIN master_kabupaten_kota c ON c.id=z.kabupaten_kota_id JOIN master_provinsi p ON p.id=c.provinsi_id ORDER BY z.kabupaten_kota_id,z.postal_code`);
 const postalItems:MasterItem[]=zipRows.map(r=>({value:String(r.postal_code),name:r.name,active:!!r.is_active,parentValue:String(r.city_id)}));
 const cityIds=new Set(result.city.map(x=>x.value));for(const item of base.postalCode)if(item.parentValue&&cityIds.has(item.parentValue)&&!postalItems.some(x=>x.value===item.value&&x.parentValue===item.parentValue))postalItems.push(item);
 result.postalCode=postalItems;
 return result;
}
const equal=(a:any,b:any)=>JSON.stringify([a?.value,a?.name,a?.active,a?.parentValue||'',a?.region||'',a?.zipCode||''])===JSON.stringify([b?.value,b?.name,b?.active,b?.parentValue||'',b?.region||'',b?.zipCode||'']);
export async function saveLocations(catalog:MasterCatalog,previous:MasterCatalog){
 if(!pool)throw new Error('MySQL is not configured');
 const c=await pool.getConnection();
 try{await c.beginTransaction();
 const [storedCountries]=await c.query<any[]>('SELECT * FROM master_country FOR UPDATE');
 for(const row of catalog.country){
  const old=storedCountries.find(x=>x.code===row.value);
  if(!old)await c.execute('INSERT INTO master_country (id,code,name,is_active) VALUES (?,?,?,?)',[crypto.randomUUID(),row.value,row.name,row.active?1:0]);
  else if(old.name!==row.name||!!old.is_active!==row.active)await c.execute('UPDATE master_country SET name=?,is_active=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?',[row.name,row.active?1:0,old.id]);
 }
 const ensureRow=async(index:number,row:MasterItem):Promise<string>=>{
 const [,table,parent]=levels[index];let parentId:string|undefined;
 if(parent){const p=catalog[levels[index-1][0]].find(p=>p.value===row.parentValue);if(!p)throw Object.assign(new Error('Wilayah induk wajib dipilih.'),{status:422});parentId=await ensureRow(index-1,p);}
 const [old]=await c.query<any[]>(`SELECT * FROM ${table} WHERE id=? FOR UPDATE`,[row.value]);
 const keys=['name',parent||'country',...(index===0?['region']:[]),...(index===3?['postal_code']:[]),'is_active'];
 const values=[row.name,parent?parentId!:row.parentValue||'Indonesia',...(index===0?[row.region||null]:[]),...(index===3?[row.zipCode||null]:[]),row.active?1:0];
 if(old.length){if(keys.some((k,i)=>String(old[0][k]??'')!==String(values[i]??'')))await c.execute(`UPDATE ${table} SET ${keys.map(k=>k+'=?').join(',')},updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,[...values,old[0].id]);return old[0].id;}
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.value))throw Object.assign(new Error('ID wilayah tidak valid.'),{status:422});const id=row.value;await c.execute(`INSERT INTO ${table} (id,${keys.join(',')}) VALUES (${Array(keys.length+1).fill('?').join(',')})`,[id,...values]);return id;
 };
 for(const [i,[key]] of levels.entries()){const old=new Map(previous[key].map(x=>[x.value,x]));for(const row of catalog[key])if(!equal(row,old.get(row.value)))await ensureRow(i,row);}
 const [storedPostalCodes]=await c.query<any[]>('SELECT * FROM master_kode_pos FOR UPDATE');
 const postalLookup=new Map(storedPostalCodes.map(row=>[`${row.kabupaten_kota_id}|${row.postal_code}`,row]));
 for(const row of catalog.postalCode){
  const city=catalog.city.find(x=>x.value===row.parentValue);
  if(!city)throw Object.assign(new Error('Kota/kabupaten wajib dipilih untuk ZIP code.'),{status:422});
  const old=postalLookup.get(`${city.value}|${row.value}`);
  if(!old)await c.execute('INSERT INTO master_kode_pos (id,postal_code,name,kabupaten_kota_id,is_active) VALUES (?,?,?,?,?)',[crypto.randomUUID(),row.value,row.name,city.value,row.active?1:0]);
  else if(old.name!==row.name||!!old.is_active!==row.active)await c.execute('UPDATE master_kode_pos SET name=?,is_active=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?',[row.name,row.active?1:0,old.id]);
 }
 await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}

