import 'dotenv/config';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import mysql, { type Pool as MySqlPool, type PoolConnection } from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import metadata from './metadata.json';
export const dataDir=path.resolve(process.env.DATA_DIR||'.data');fs.mkdirSync(dataDir,{recursive:true});
type Result={rows:any[]};
const mysqlEnabled=process.env.DB_CLIENT==='mysql';
const mysqlPool:MySqlPool|undefined=mysqlEnabled?mysql.createPool({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,waitForConnections:true,connectionLimit:10,decimalNumbers:false,dateStrings:false,multipleStatements:true}):undefined;
const engine=process.env.DATABASE_URL?new pg.Pool({connectionString:process.env.DATABASE_URL}):mysqlEnabled?null:new PGlite(path.join(dataDir,'db'));
export type Query=(sql:string,args?:any[])=>Promise<Result>;
function mysqlSql(sql:string,args:any[]=[]){
 let statement=sql.replace(/"([A-Za-z_][A-Za-z0-9_]*)"/g,'`$1`').replace(/\bTIMESTAMPTZ\b/g,'DATETIME(3)').replace(/\bJSONB\b/g,'JSON').replace(/\$\d+/g,'?').replace(/count\(\*\)::integer/gi,'CAST(count(*) AS SIGNED)').replace(/'\{\}'::jsonb/g,"(JSON_OBJECT())");
 const values=[...sql.matchAll(/\$(\d+)/g)].map(m=>args[Number(m[1])-1]);
 return {statement,values};
}
async function mysqlQuery(conn:MySqlPool|PoolConnection,sql:string,args:any[]=[]):Promise<Result>{
 const {statement,values}=mysqlSql(sql,args);
 try{
  const [result]=await conn.query(statement,values);
  if(Array.isArray(result))return {rows:result as any[]};
  const packet=result as any;
  return {rows:packet&&Array.isArray(packet.rows)?packet.rows:[]};
 }catch(error:any){
  if(error.code==='ER_DUP_ENTRY')error.code='23505';
  else if(error.code==='ER_NO_REFERENCED_ROW_2'||error.code==='ER_ROW_IS_REFERENCED_2')error.code='23503';
  else if(error.code==='ER_CHECK_CONSTRAINT_VIOLATED')error.code='23514';
  else if(error.code==='ER_BAD_NULL_ERROR')error.code='23502';
  throw error;
 }
}
export const query:Query=async(sql,args=[])=>engine instanceof pg.Pool?engine.query(sql,args):mysqlPool?mysqlQuery(mysqlPool,sql,args):args.length?engine!.query(sql,args):(await engine!.exec(sql)).at(-1)||{rows:[]};
let tail=Promise.resolve();
export async function transaction<T>(fn:(q:Query)=>Promise<T>):Promise<T>{
 if(engine instanceof pg.Pool){const client=await engine.connect();try{await client.query('BEGIN');const out=await fn((s,a)=>client.query(s,a));await client.query('COMMIT');return out;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
 if(mysqlPool){const client=await mysqlPool.getConnection();try{await client.beginTransaction();const out=await fn((s,a=[])=>mysqlQuery(client,s,a));await client.commit();return out;}catch(e){await client.rollback();throw e;}finally{client.release();}}
 let release!:()=>void;const prev=tail;tail=new Promise(r=>release=r);await prev;
 try{return await engine!.transaction(tx=>fn(async(s,a=[])=>a.length?tx.query(s,a):(await tx.exec(s)).at(-1)||{rows:[]}));}finally{release();}
}
export const meta=metadata as Record<string,{table:string,fields:Record<string,{column:string,type:string,optional:boolean,generated:boolean}>}>;
export function decode(model:string,row:any):any{if(!row)return null;return Object.fromEntries(Object.entries(meta[model].fields).map(([k,v])=>[k,row[v.column]]));}
export async function all(model:string,where:Record<string,any>={},q=query){const m=meta[model];const entries=Object.entries(where);const rows=await q(`SELECT * FROM "${m.table}"${entries.length?' WHERE '+entries.map(([k],i)=>`"${m.fields[k].column}" = $${i+1}`).join(' AND '):''}`,entries.map(([,v])=>v));return rows.rows.map(r=>decode(model,r));}
export async function insert(model:string,data:any,q=query){const m=meta[model];const id=data.id??crypto.randomUUID();const entries=Object.entries({...data,id}).filter(([k,v])=>k in m.fields&&v!==undefined);const columns=entries.map(([k])=>'"'+m.fields[k].column+'"').join(',');const values=entries.map((_,i)=>'$'+(i+1)).join(',');const args=entries.map(([,v])=>v);if(mysqlPool){await q(`INSERT INTO "${m.table}" (${columns}) VALUES (${values})`,args);return (await all(model,{id},q))[0];}const result=await q(`INSERT INTO "${m.table}" (${columns}) VALUES (${values}) RETURNING *`,args);return decode(model,result.rows[0]);}
export async function update(model:string,id:string,data:any,q=query){const m=meta[model];const entries=Object.entries(data).filter(([k,v])=>k in m.fields&&!m.fields[k].generated&&v!==undefined);if(!entries.length)return (await all(model,{id},q))[0];const sql=`UPDATE "${m.table}" SET ${entries.map(([k],i)=>'"'+m.fields[k].column+'"=$'+(i+1)).join(',')}${m.fields.updatedAt?',updated_at=CURRENT_TIMESTAMP':''} WHERE id=$${entries.length+1}`;const args=[...entries.map(([,v])=>v),id];if(mysqlPool){await q(sql,args);return (await all(model,{id},q))[0];}const result=await q(sql+' RETURNING *',args);return decode(model,result.rows[0]);}
export async function replace(model:string,key:string,id:string,rows:any[],q:Query){await q(`DELETE FROM "${meta[model].table}" WHERE "${meta[model].fields[key].column}"=$1`,[id]);for(const row of rows)await insert(model,{...row,id:undefined,[key]:id},q);}
export async function initialize(){
 if(mysqlPool){await initializeMysql();return;}
 await query('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)');
 if(!(await query('SELECT * FROM schema_migrations WHERE version=1')).rows.length)await transaction(async q=>{
  await q(fs.readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
  await q(`CREATE TABLE users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('MKT','BS','CA','LEGAL','COMMITTEE')));
   CREATE TABLE fap_sequences (year INTEGER PRIMARY KEY, value INTEGER NOT NULL);
   CREATE TABLE review_signoffs (application_id TEXT NOT NULL REFERENCES applications(id),role TEXT NOT NULL, actor TEXT NOT NULL, signed_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(application_id,role));
   CREATE TABLE document_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),application_id TEXT NOT NULL,checklist_id TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,details JSONB NOT NULL DEFAULT '{}',created_at TIMESTAMPTZ NOT NULL DEFAULT now());
   CREATE FUNCTION prevent_audit_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit records are append-only'; END $$;
   CREATE TRIGGER immutable_approval_logs BEFORE UPDATE OR DELETE ON approval_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
   CREATE TRIGGER immutable_document_events BEFORE UPDATE OR DELETE ON document_events FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
   CREATE INDEX applications_status_idx ON applications(status);
   CREATE INDEX checklist_application_idx ON document_checklists(application_id);
   CREATE UNIQUE INDEX checklist_code_idx ON document_checklists(application_id,document_code);
  INSERT INTO schema_migrations VALUES(1);`);
 });
 if(!(await query('SELECT * FROM schema_migrations WHERE version=2')).rows.length)await transaction(async q=>{
  await q(`ALTER TABLE "stakeholders"
   ADD COLUMN IF NOT EXISTS representative_type TEXT,
   ADD COLUMN IF NOT EXISTS signatory TEXT,
   ADD COLUMN IF NOT EXISTS id_type TEXT,
   ADD COLUMN IF NOT EXISTS title TEXT,
   ADD COLUMN IF NOT EXISTS first_name TEXT,
   ADD COLUMN IF NOT EXISTS middle_name TEXT,
   ADD COLUMN IF NOT EXISTS last_name TEXT,
   ADD COLUMN IF NOT EXISTS date_of_birth DATE,
   ADD COLUMN IF NOT EXISTS age_years INTEGER,
   ADD COLUMN IF NOT EXISTS age_months INTEGER,
   ADD COLUMN IF NOT EXISTS marital_status TEXT,
   ADD COLUMN IF NOT EXISTS email TEXT,
   ADD COLUMN IF NOT EXISTS mobile_phone TEXT,
   ADD COLUMN IF NOT EXISTS gender TEXT,
   ADD COLUMN IF NOT EXISTS primary_capital NUMERIC(18,2),
   ADD COLUMN IF NOT EXISTS citizenship TEXT,
   ADD COLUMN IF NOT EXISTS country TEXT,
   ADD COLUMN IF NOT EXISTS province TEXT,
   ADD COLUMN IF NOT EXISTS city_regency TEXT,
   ADD COLUMN IF NOT EXISTS district TEXT,
   ADD COLUMN IF NOT EXISTS village TEXT,
   ADD COLUMN IF NOT EXISTS rw TEXT,
   ADD COLUMN IF NOT EXISTS rt TEXT,
   ADD COLUMN IF NOT EXISTS address TEXT,
   ADD COLUMN IF NOT EXISTS postal_code TEXT`);
  await q('INSERT INTO schema_migrations VALUES(2)');
 });
 if(!(await query('SELECT * FROM schema_migrations WHERE version=3')).rows.length)await transaction(async q=>{
  await q("ALTER TABLE applications ADD COLUMN IF NOT EXISTS legal JSONB NOT NULL DEFAULT '{}'::jsonb");
  await q('INSERT INTO schema_migrations VALUES(3)');
 });
  if(!(await query('SELECT * FROM schema_migrations WHERE version=4')).rows.length)await transaction(async q=>{
   await q('CREATE TABLE IF NOT EXISTS master_indonesia_regions (code TEXT PRIMARY KEY,name TEXT NOT NULL,level INTEGER NOT NULL,parent_code TEXT,postal_code TEXT)');
   await q('CREATE INDEX IF NOT EXISTS master_indonesia_regions_parent_idx ON master_indonesia_regions(parent_code)');
   await q('CREATE INDEX IF NOT EXISTS master_indonesia_regions_level_name_idx ON master_indonesia_regions(level,name)');
   await q(`ALTER TABLE stakeholders
    ADD COLUMN IF NOT EXISTS province_code TEXT,
    ADD COLUMN IF NOT EXISTS regency_code TEXT,
    ADD COLUMN IF NOT EXISTS district_code TEXT,
    ADD COLUMN IF NOT EXISTS village_code TEXT`);
   await q('INSERT INTO schema_migrations VALUES(4)');
  });
  if(!(await query('SELECT * FROM schema_migrations WHERE version=5')).rows.length)await transaction(async q=>{
   await q('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_province_code_fk FOREIGN KEY(province_code) REFERENCES master_indonesia_regions(code)');
   await q('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_regency_code_fk FOREIGN KEY(regency_code) REFERENCES master_indonesia_regions(code)');
   await q('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_district_code_fk FOREIGN KEY(district_code) REFERENCES master_indonesia_regions(code)');
   await q('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_village_code_fk FOREIGN KEY(village_code) REFERENCES master_indonesia_regions(code)');
   await q('INSERT INTO schema_migrations VALUES(5)');
  });
  if(!(await query('SELECT * FROM schema_migrations WHERE version=6')).rows.length)await transaction(async q=>{
   await createNormalizedLocationMasters(q);
   await copyLegacyLocationMasters(q);
   await q('ALTER TABLE stakeholders DROP CONSTRAINT IF EXISTS stakeholders_province_code_fk');
   await q('ALTER TABLE stakeholders DROP CONSTRAINT IF EXISTS stakeholders_regency_code_fk');
   await q('ALTER TABLE stakeholders DROP CONSTRAINT IF EXISTS stakeholders_district_code_fk');
   await q('ALTER TABLE stakeholders DROP CONSTRAINT IF EXISTS stakeholders_village_code_fk');
   await q('DROP TABLE IF EXISTS master_indonesia_regions');
   await q('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_province_master_fk FOREIGN KEY(province_code) REFERENCES master_provinces(code)');
   await q('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_regency_master_fk FOREIGN KEY(regency_code) REFERENCES master_regencies(code)');
   await q('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_district_master_fk FOREIGN KEY(district_code) REFERENCES master_districts(code)');
   await q('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_village_master_fk FOREIGN KEY(village_code) REFERENCES master_villages(code)');
   await q('INSERT INTO schema_migrations VALUES(6)');
  });
  if(!(await query('SELECT * FROM schema_migrations WHERE version=7')).rows.length)await transaction(async q=>{
   await q('ALTER TABLE master_provinces RENAME TO master_provinsi');
   await q('ALTER TABLE master_regencies RENAME TO master_kabupaten_kota');
   await q('ALTER TABLE master_districts RENAME TO master_kecamatan');
   await q('ALTER TABLE master_villages RENAME TO master_kelurahan_desa');
   await q('INSERT INTO schema_migrations VALUES(7)');
  });
  await seedIndonesiaRegions();
  await initializeLocationMapping();
}
async function initializeMysql(){
 if(!process.env.DB_NAME)throw new Error('DB_NAME is required when DB_CLIENT=mysql');
 const tolerateExisting=async(sql:string,codes:string[])=>{try{await query(sql);}catch(error:any){if(!codes.includes(error.code))throw error;}};
 await query('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY) ENGINE=InnoDB');
 if(!(await query('SELECT * FROM schema_migrations WHERE version=1')).rows.length){
  let schema=fs.readFileSync(new URL('./schema.sql',import.meta.url),'utf8');
  schema=schema.replace(/"([A-Za-z_][A-Za-z0-9_]*)"/g,'`$1`').replace(/`id` TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid\(\)/g,'`id` CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID())').replace(/`([A-Za-z_][A-Za-z0-9_]*_id)` TEXT NOT NULL/g,'`$1` CHAR(36) NOT NULL').replace(/`([A-Za-z_][A-Za-z0-9_]*_id)` TEXT(,|\n)/g,'`$1` CHAR(36)$2').replace(/\bTEXT\b/g,'VARCHAR(255)').replace(/\bTIMESTAMPTZ\b/g,'DATETIME(3)').replace(/DEFAULT CURRENT_TIMESTAMP\b/g,'DEFAULT CURRENT_TIMESTAMP(3)').replace(/`application_date` DATE NOT NULL DEFAULT CURRENT_TIMESTAMP\(3\)/g,'`application_date` DATE NOT NULL DEFAULT (CURRENT_DATE)');
  schema=schema.replace(/`(company_address|repayment_source|current_address|terms_notes|data_summary|notes|comments)` VARCHAR\(255\)/g,'`$1` LONGTEXT');
  for(const statement of schema.split(';').map(x=>x.trim()).filter(Boolean))await tolerateExisting(statement,['ER_FK_DUP_NAME']);
  await query(`CREATE TABLE IF NOT EXISTS users (id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),name VARCHAR(255) NOT NULL,email VARCHAR(320) UNIQUE NOT NULL,password_hash VARCHAR(255) NOT NULL,role VARCHAR(32) NOT NULL CHECK(role IN ('MKT','BS','CA','LEGAL','COMMITTEE'))) ENGINE=InnoDB`);
  await query('CREATE TABLE IF NOT EXISTS fap_sequences (year INTEGER PRIMARY KEY, value INTEGER NOT NULL) ENGINE=InnoDB');
  await query("CREATE TABLE IF NOT EXISTS review_signoffs (application_id CHAR(36) NOT NULL,role VARCHAR(32) NOT NULL,actor VARCHAR(255) NOT NULL,signed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),PRIMARY KEY(application_id,role),FOREIGN KEY(application_id) REFERENCES applications(id)) ENGINE=InnoDB");
  await query("CREATE TABLE IF NOT EXISTS document_events (id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),application_id CHAR(36) NOT NULL,checklist_id CHAR(36) NOT NULL,actor VARCHAR(255) NOT NULL,action VARCHAR(32) NOT NULL,details JSON NOT NULL,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB");
  await tolerateExisting('ALTER TABLE applications ADD COLUMN legal JSON NULL',['ER_DUP_FIELDNAME']);
  await tolerateExisting("CREATE TRIGGER immutable_approval_logs_update BEFORE UPDATE ON approval_logs FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Audit records are append-only'",['ER_TRG_ALREADY_EXISTS']);
  await tolerateExisting("CREATE TRIGGER immutable_approval_logs_delete BEFORE DELETE ON approval_logs FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Audit records are append-only'",['ER_TRG_ALREADY_EXISTS']);
  await tolerateExisting("CREATE TRIGGER immutable_document_events_update BEFORE UPDATE ON document_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Audit records are append-only'",['ER_TRG_ALREADY_EXISTS']);
  await tolerateExisting("CREATE TRIGGER immutable_document_events_delete BEFORE DELETE ON document_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Audit records are append-only'",['ER_TRG_ALREADY_EXISTS']);
  await tolerateExisting('CREATE INDEX applications_status_idx ON applications(status)',['ER_DUP_KEYNAME']);
  await tolerateExisting('CREATE INDEX checklist_application_idx ON document_checklists(application_id)',['ER_DUP_KEYNAME']);
  await tolerateExisting('CREATE UNIQUE INDEX checklist_code_idx ON document_checklists(application_id,document_code)',['ER_DUP_KEYNAME']);
  await query('INSERT INTO schema_migrations VALUES(1)');
 }
 if(!(await query('SELECT * FROM schema_migrations WHERE version=2')).rows.length){
  await query('CREATE TABLE IF NOT EXISTS master_indonesia_regions (code VARCHAR(20) NOT NULL PRIMARY KEY,name VARCHAR(150) NOT NULL,level TINYINT UNSIGNED NOT NULL,parent_code VARCHAR(20) NULL,postal_code VARCHAR(10) NULL,INDEX master_indonesia_regions_parent_idx(parent_code),INDEX master_indonesia_regions_level_name_idx(level,name),CONSTRAINT master_indonesia_regions_parent_fk FOREIGN KEY(parent_code) REFERENCES master_indonesia_regions(code)) ENGINE=InnoDB');
  const columns=[['province_code','VARCHAR(20) NULL'],['regency_code','VARCHAR(20) NULL'],['district_code','VARCHAR(20) NULL'],['village_code','VARCHAR(20) NULL']];
  for(const [column,type] of columns){const exists=await query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=$1 AND COLUMN_NAME=$2',['stakeholders',column]);if(!exists.rows.length)await query(`ALTER TABLE stakeholders ADD COLUMN ${column} ${type}`);}
  await query('INSERT INTO schema_migrations VALUES(2)');
 }
 if(!(await query('SELECT * FROM schema_migrations WHERE version=3')).rows.length){
  await tolerateExisting('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_province_code_fk FOREIGN KEY(province_code) REFERENCES master_indonesia_regions(code)',['ER_FK_DUP_NAME']);
  await tolerateExisting('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_regency_code_fk FOREIGN KEY(regency_code) REFERENCES master_indonesia_regions(code)',['ER_FK_DUP_NAME']);
  await tolerateExisting('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_district_code_fk FOREIGN KEY(district_code) REFERENCES master_indonesia_regions(code)',['ER_FK_DUP_NAME']);
  await tolerateExisting('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_village_code_fk FOREIGN KEY(village_code) REFERENCES master_indonesia_regions(code)',['ER_FK_DUP_NAME']);
  await query('INSERT INTO schema_migrations VALUES(3)');
 }
 if(!(await query('SELECT * FROM schema_migrations WHERE version=4')).rows.length){
  await createNormalizedLocationMasters(query);
  await copyLegacyLocationMasters(query);
  for(const name of ['province','regency','district','village'])await tolerateExisting(`ALTER TABLE stakeholders DROP FOREIGN KEY stakeholders_${name}_code_fk`,['ER_CANT_DROP_FIELD_OR_KEY']);
  await tolerateExisting('DROP TABLE master_indonesia_regions',['ER_BAD_TABLE_ERROR']);
  await tolerateExisting('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_province_master_fk FOREIGN KEY(province_code) REFERENCES master_provinces(code)',['ER_FK_DUP_NAME']);
  await tolerateExisting('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_regency_master_fk FOREIGN KEY(regency_code) REFERENCES master_regencies(code)',['ER_FK_DUP_NAME']);
  await tolerateExisting('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_district_master_fk FOREIGN KEY(district_code) REFERENCES master_districts(code)',['ER_FK_DUP_NAME']);
  await tolerateExisting('ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_village_master_fk FOREIGN KEY(village_code) REFERENCES master_villages(code)',['ER_FK_DUP_NAME']);
  await query('INSERT INTO schema_migrations VALUES(4)');
 }
 if(!(await query('SELECT * FROM schema_migrations WHERE version=5')).rows.length){
  await query('RENAME TABLE master_provinces TO master_provinsi, master_regencies TO master_kabupaten_kota, master_districts TO master_kecamatan, master_villages TO master_kelurahan_desa');
  await query('INSERT INTO schema_migrations VALUES(5)');
 }
 await seedIndonesiaRegions();
 await initializeLocationMapping();
}
async function initializeLocationMapping(){
 const version=mysqlPool?6:8;
 const migrated=(await query('SELECT version FROM schema_migrations WHERE version=$1',[version])).rows.length>0;
 if(!migrated){
  await query(`CREATE TABLE IF NOT EXISTS master_mapping_wilayah (
   provinsi VARCHAR(150) NOT NULL,
   kabupaten_kota VARCHAR(150) NOT NULL,
   kecamatan VARCHAR(150) NOT NULL,
   kelurahan_desa VARCHAR(150) NOT NULL,
   kode_pos VARCHAR(5) NOT NULL CHECK(CHAR_LENGTH(kode_pos)=5),
   kode_provinsi VARCHAR(20) NOT NULL,
   kode_kabupaten_kota VARCHAR(20) NOT NULL,
   kode_kecamatan VARCHAR(20) NOT NULL,
   kode_kelurahan_desa VARCHAR(20) NOT NULL,
   sumber_url VARCHAR(255) NOT NULL,
   sumber_snapshot CHAR(64) NOT NULL,
   PRIMARY KEY(kode_kelurahan_desa,kode_pos),
   FOREIGN KEY(kode_provinsi) REFERENCES master_provinsi(code),
   FOREIGN KEY(kode_kabupaten_kota) REFERENCES master_kabupaten_kota(code),
   FOREIGN KEY(kode_kecamatan) REFERENCES master_kecamatan(code),
   FOREIGN KEY(kode_kelurahan_desa) REFERENCES master_kelurahan_desa(code)
  )`);
  await createLocationIndex(query,'mapping_provinsi_idx','master_mapping_wilayah','kode_provinsi');
  await createLocationIndex(query,'mapping_kabupaten_kota_idx','master_mapping_wilayah','kode_kabupaten_kota');
  await createLocationIndex(query,'mapping_kecamatan_idx','master_mapping_wilayah','kode_kecamatan');
 }
 const file=new URL('./data/mapping-wilayah.json.gz',import.meta.url);
 const snapshot=JSON.parse(gunzipSync(fs.readFileSync(file)).toString('utf8')) as {mappingSha256:string,rowCount:number,rows:Record<string,string>[]};
 if(snapshot.rows.length!==snapshot.rowCount||crypto.createHash('sha256').update(JSON.stringify(snapshot.rows)).digest('hex')!==snapshot.mappingSha256)throw new Error('Location mapping snapshot is invalid');
 const count=Number((await query('SELECT COUNT(*) AS count FROM master_mapping_wilayah WHERE sumber_snapshot=$1',[snapshot.mappingSha256])).rows[0]?.count||0);
 if(migrated&&count===snapshot.rowCount)return;
 const columns=['provinsi','kabupaten_kota','kecamatan','kelurahan_desa','kode_pos','kode_provinsi','kode_kabupaten_kota','kode_kecamatan','kode_kelurahan_desa','sumber_url','sumber_snapshot'];
 const updated=columns.filter(column=>!['kode_kelurahan_desa','kode_pos'].includes(column));
 await transaction(async q=>{
  for(let offset=0;offset<snapshot.rows.length;offset+=250){
   const batch=snapshot.rows.slice(offset,offset+250);
   const placeholders=batch.map((_row,i)=>`(${columns.map((_column,j)=>`$${i*columns.length+j+1}`).join(',')})`).join(',');
   const values=batch.flatMap(row=>columns.map(column=>column==='sumber_snapshot'?snapshot.mappingSha256:row[column]));
   const conflict=mysqlPool?` ON DUPLICATE KEY UPDATE ${updated.map(column=>`${column}=VALUES(${column})`).join(',')}`:` ON CONFLICT(kode_kelurahan_desa,kode_pos) DO UPDATE SET ${updated.map(column=>`${column}=EXCLUDED.${column}`).join(',')}`;
   await q(`INSERT INTO master_mapping_wilayah(${columns.join(',')}) VALUES ${placeholders}${conflict}`,values);
  }
  if(!migrated)await q('INSERT INTO schema_migrations VALUES($1)',[version]);
 });
}
async function createNormalizedLocationMasters(q:Query){
 await q('CREATE TABLE IF NOT EXISTS master_provinces (code VARCHAR(20) PRIMARY KEY,name VARCHAR(150) NOT NULL)');
 await q('CREATE TABLE IF NOT EXISTS master_regencies (code VARCHAR(20) PRIMARY KEY,province_code VARCHAR(20) NOT NULL,name VARCHAR(150) NOT NULL,FOREIGN KEY(province_code) REFERENCES master_provinces(code))');
 await createLocationIndex(q,'master_regencies_province_idx','master_regencies','province_code');
 await q('CREATE TABLE IF NOT EXISTS master_districts (code VARCHAR(20) PRIMARY KEY,regency_code VARCHAR(20) NOT NULL,name VARCHAR(150) NOT NULL,FOREIGN KEY(regency_code) REFERENCES master_regencies(code))');
 await createLocationIndex(q,'master_districts_regency_idx','master_districts','regency_code');
 await q('CREATE TABLE IF NOT EXISTS master_villages (code VARCHAR(20) PRIMARY KEY,district_code VARCHAR(20) NOT NULL,name VARCHAR(150) NOT NULL,postal_code VARCHAR(10),FOREIGN KEY(district_code) REFERENCES master_districts(code))');
 await createLocationIndex(q,'master_villages_district_idx','master_villages','district_code');
}
async function createLocationIndex(q:Query,name:string,table:string,column:string){
 try{await q(`CREATE INDEX ${mysqlPool?'':'IF NOT EXISTS '}${name} ON ${table}(${column})`);}
 catch(error:any){if(!mysqlPool||error.code!=='ER_DUP_KEYNAME')throw error;}
}
async function copyLegacyLocationMasters(q:Query){
 const legacy=await q(mysqlPool?"SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='master_indonesia_regions'":"SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_name='master_indonesia_regions'");
 if(!Number(legacy.rows[0]?.count||0))return;
 const ignore=mysqlPool?'INSERT IGNORE':'INSERT';
 const conflict=mysqlPool?'':' ON CONFLICT(code) DO NOTHING';
 await q(`${ignore} INTO master_provinces(code,name) SELECT code,name FROM master_indonesia_regions WHERE level=1${conflict}`);
 await q(`${ignore} INTO master_regencies(code,province_code,name) SELECT code,parent_code,name FROM master_indonesia_regions WHERE level=2${conflict}`);
 await q(`${ignore} INTO master_districts(code,regency_code,name) SELECT code,parent_code,name FROM master_indonesia_regions WHERE level=3${conflict}`);
 await q(`${ignore} INTO master_villages(code,district_code,name,postal_code) SELECT code,parent_code,name,postal_code FROM master_indonesia_regions WHERE level=4${conflict}`);
}
async function seedIndonesiaRegions(){
 const file=new URL('./data/indonesia-regions.json.gz',import.meta.url);
 if(!fs.existsSync(file))throw new Error('Indonesia region master data file is missing.');
 const rows=JSON.parse(gunzipSync(fs.readFileSync(file)).toString('utf8')) as Array<{id:string,name:string,level:number,parentId:string|null,postalCode:string|null}>;
 const batchSize=300;
 const targets={1:{table:'master_provinsi',parent:null},2:{table:'master_kabupaten_kota',parent:'province_code'},3:{table:'master_kecamatan',parent:'regency_code'},4:{table:'master_kelurahan_desa',parent:'district_code'}} as const;
 for(const level of [1,2,3,4] as const){
  const target=targets[level],source=rows.filter(row=>row.level===level);
  const existing=Number((await query(`SELECT COUNT(*) AS count FROM ${target.table}`)).rows[0]?.count||0);
  if(existing>=source.length)continue;
  for(let offset=0;offset<source.length;offset+=batchSize){
   const batch=source.slice(offset,offset+batchSize),width=target.parent?(level===4?4:3):2;
   const placeholders=batch.map((_,i)=>`(${Array.from({length:width},(_x,j)=>`$${i*width+j+1}`).join(',')})`).join(',');
   const columns=target.parent?`code,${target.parent},name${level===4?',postal_code':''}`:'code,name';
   const values=batch.flatMap(row=>target.parent?[row.id,row.parentId,row.name,...(level===4?[row.postalCode]:[])]:[row.id,row.name]);
   await query(`INSERT INTO ${target.table}(${columns}) VALUES ${placeholders}${mysqlPool?' ON DUPLICATE KEY UPDATE code=code':' ON CONFLICT(code) DO NOTHING'}`,values);
  }
 }
}
export async function close(){if(engine instanceof pg.Pool)await engine.end();else if(mysqlPool)await mysqlPool.end();else await engine!.close();}
