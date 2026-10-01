import 'dotenv/config';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import metadata from './metadata.json';
export const dataDir=path.resolve(process.env.DATA_DIR||'.data');fs.mkdirSync(dataDir,{recursive:true});
type Result={rows:any[]};
const engine=process.env.DATABASE_URL?new pg.Pool({connectionString:process.env.DATABASE_URL}):new PGlite(path.join(dataDir,'db'));
export type Query=(sql:string,args?:any[])=>Promise<Result>;
export const query:Query=async(sql,args=[])=>engine instanceof pg.Pool?engine.query(sql,args):args.length?engine.query(sql,args):(await engine.exec(sql)).at(-1)||{rows:[]};
let tail=Promise.resolve();
export async function transaction<T>(fn:(q:Query)=>Promise<T>):Promise<T>{
 if(engine instanceof pg.Pool){const client=await engine.connect();try{await client.query('BEGIN');const out=await fn((s,a)=>client.query(s,a));await client.query('COMMIT');return out;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
 let release!:()=>void;const prev=tail;tail=new Promise(r=>release=r);await prev;
 try{return await engine.transaction(tx=>fn(async(s,a=[])=>a.length?tx.query(s,a):(await tx.exec(s)).at(-1)||{rows:[]}));}finally{release();}
}
export const meta=metadata as Record<string,{table:string,fields:Record<string,{column:string,type:string,optional:boolean,generated:boolean}>}>;
export function decode(model:string,row:any):any{if(!row)return null;return Object.fromEntries(Object.entries(meta[model].fields).map(([k,v])=>[k,row[v.column]]));}
export async function all(model:string,where:Record<string,any>={},q=query){const m=meta[model];const entries=Object.entries(where);const rows=await q(`SELECT * FROM "${m.table}"${entries.length?' WHERE '+entries.map(([k],i)=>`"${m.fields[k].column}" = $${i+1}`).join(' AND '):''}`,entries.map(([,v])=>v));return rows.rows.map(r=>decode(model,r));}
export async function insert(model:string,data:any,q=query){const m=meta[model];const entries=Object.entries(data).filter(([k,v])=>k in m.fields&&v!==undefined);const result=await q(`INSERT INTO "${m.table}" (${entries.map(([k])=>'"'+m.fields[k].column+'"').join(',')}) VALUES (${entries.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,entries.map(([,v])=>v));return decode(model,result.rows[0]);}
export async function update(model:string,id:string,data:any,q=query){const m=meta[model];const entries=Object.entries(data).filter(([k,v])=>k in m.fields&&!m.fields[k].generated&&v!==undefined);if(!entries.length)return (await all(model,{id},q))[0];const result=await q(`UPDATE "${m.table}" SET ${entries.map(([k],i)=>'"'+m.fields[k].column+'"=$'+(i+1)).join(',')}${m.fields.updatedAt?',updated_at=CURRENT_TIMESTAMP':''} WHERE id=$${entries.length+1} RETURNING *`,[...entries.map(([,v])=>v),id]);return decode(model,result.rows[0]);}
export async function replace(model:string,key:string,id:string,rows:any[],q:Query){await q(`DELETE FROM "${meta[model].table}" WHERE "${meta[model].fields[key].column}"=$1`,[id]);for(const row of rows)await insert(model,{...row,id:undefined,[key]:id},q);}
export async function initialize(){
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
  await q("CREATE TABLE master_data (id INTEGER PRIMARY KEY CHECK(id=1), catalog JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 0)");
  for(const [table,column] of [['customers','company_type'],['applications','industry_segment'],['applications','business_role'],['financing_proposals','facility_purpose'],['financing_proposals','financing_method'],['financing_unit_items','unit_category']])await q(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_${column}_check"`);
  await q('INSERT INTO schema_migrations VALUES(4)');
 });

}
export async function close(){if(engine instanceof pg.Pool)await engine.end();else await engine.close();}
