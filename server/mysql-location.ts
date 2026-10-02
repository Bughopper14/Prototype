import {pool} from './mysql-store';
import crypto from 'node:crypto';
import {type MasterCatalog,type MasterItem} from '../src/master-catalog';
const levels=[['province','master_provinsi',null],['city','master_kabupaten_kota','provinsi_id'],['district','master_kecamatan','kabupaten_kota_id'],['village','master_kelurahan_desa','kecamatan_id']] as const;
export async function initializeLocation(){
 if(!pool)return;
 for(const [i,[,table,parent]] of levels.entries())await pool.query(`CREATE TABLE IF NOT EXISTS ${table} (id CHAR(36) PRIMARY KEY,name VARCHAR(150) NOT NULL,${parent?`${parent} CHAR(36) NOT NULL,`:'country VARCHAR(150) NOT NULL,'}${i===0?'region VARCHAR(100) NULL,':''}${i===3?'postal_code VARCHAR(20) NULL,':''}is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL${parent?`,CONSTRAINT fk_${table}_parent FOREIGN KEY (${parent}) REFERENCES ${levels[i-1][1]}(id)`:''}) ENGINE=InnoDB`);
}
export async function locationCatalog(base:MasterCatalog):Promise<MasterCatalog>{
 if(!pool)return base;
 const result={...base};
 for(const [i,[key,table,parent]] of levels.entries()){
 const [rows]=await pool.query<any[]>(parent?`SELECT a.*,p.id parent_id FROM ${table} a JOIN ${levels[i-1][1]} p ON p.id=a.${parent} ORDER BY a.created_at,a.id`:`SELECT * FROM ${table} ORDER BY created_at,id`);
 const saved:MasterItem[]=rows.map(r=>({value:r.id,name:r.name,active:!!r.is_active,parentValue:parent?r.parent_id:r.country,...(r.region?{region:r.region}:{}),...(r.postal_code?{zipCode:r.postal_code}:{})}));
 result[key]=saved;
 }
 const zips=new Set(result.village.map(r=>r.zipCode).filter((x):x is string=>!!x));const zipValues=new Set(base.postalCode.map(x=>x.value));result.postalCode=[...base.postalCode,...[...zips].filter(z=>!zipValues.has(z)).sort().map(value=>({value,name:value,active:true}))];
 return result;
}
const equal=(a:any,b:any)=>JSON.stringify([a?.value,a?.name,a?.active,a?.parentValue||'',a?.region||'',a?.zipCode||''])===JSON.stringify([b?.value,b?.name,b?.active,b?.parentValue||'',b?.region||'',b?.zipCode||'']);
export async function saveLocations(catalog:MasterCatalog,previous:MasterCatalog){
 if(!pool)throw new Error('MySQL is not configured');
 const c=await pool.getConnection();
 try{await c.beginTransaction();
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
 await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}

