import {pool} from './mysql-store';
import {mysqlActor} from './mysql-audit-context';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import {z} from 'zod';
import {query} from './db';
export async function initializeUsers(){
 if(!pool)return;
 await pool.query(`CREATE TABLE IF NOT EXISTS users (user_id CHAR(36) PRIMARY KEY,username VARCHAR(100) NOT NULL UNIQUE,email VARCHAR(255) NOT NULL UNIQUE,password_hash VARCHAR(255) NOT NULL,name VARCHAR(150) NOT NULL,role VARCHAR(30) NOT NULL,department VARCHAR(100) NULL,phone VARCHAR(30) NULL,is_active BOOLEAN NOT NULL DEFAULT TRUE,is_admin BOOLEAN NOT NULL DEFAULT FALSE,is_placeholder BOOLEAN NOT NULL DEFAULT FALSE,last_login_at TIMESTAMP(3) NULL,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL) ENGINE=InnoDB`);
 const [columns]=await pool.query<any[]>('SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=\'users\'');
 if(!columns.some(c=>c.COLUMN_NAME==='user_id')&&columns.some(c=>c.COLUMN_NAME==='id'))await pool.query('ALTER TABLE users RENAME COLUMN id TO user_id');
 if(!columns.some(c=>c.COLUMN_NAME==='is_placeholder'))await pool.query('ALTER TABLE users ADD COLUMN is_placeholder BOOLEAN NOT NULL DEFAULT FALSE AFTER is_admin');
 // Copy the repository's existing demo identities and password hashes as read-only MySQL placeholders.
 // The source users table remains unchanged; no JSON data is migrated or removed.
 const template=(await query('SELECT id,name,email,password_hash,role FROM users')).rows;
 for(const user of template){
  const username=String(user.email).split('@')[0].replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,100);
  await pool.execute('INSERT IGNORE INTO users (user_id,username,email,password_hash,name,role,is_active,is_admin,is_placeholder) VALUES (?,?,?,?,?,?,1,0,1)',[user.id,username,String(user.email).toLowerCase(),user.password_hash,user.name,user.role]);
  // The department shortcuts are local-only demo accounts; explicitly opt in before enabling writes.
  if(process.env.MYSQL_DEMO_USERS_ACTIVE==='true')await pool.execute('UPDATE users SET is_placeholder=0 WHERE user_id=? AND is_placeholder=1',[user.id]);
 }
}
export const publicUser=(u:any)=>({id:u.user_id??u.id,username:u.username,name:u.name,email:u.email,role:u.role,department:u.department,phone:u.phone,isActive:!!u.is_active,isAdmin:!!u.is_admin,isPlaceholder:!!u.is_placeholder,source:u.is_placeholder?'placeholder':'mysql'});
export async function userCount(){if(!pool)return 0;const [r]=await pool.query<any[]>('SELECT COUNT(*) n FROM users WHERE is_placeholder=0');return Number(r[0].n);}
export async function findUser(login:string,byId=false){if(!pool)return null;const [r]=await pool.execute<any[]>(byId?'SELECT * FROM users WHERE user_id=?':'SELECT * FROM users WHERE email=? OR username=?',byId?[login]:[login.toLowerCase(),login]);return r[0]||null;}
export async function createUser(body:any,bootstrap=false){
 if(!pool)throw new Error('MySQL is not configured');
 const v=z.object({username:z.string().trim().min(3).max(100).regex(/^[A-Za-z0-9_.-]+$/),email:z.string().email().max(255),password:z.string().min(8).max(72),name:z.string().trim().min(1).max(150),role:z.enum(['MKT','BS','HEAD_BS','CA','LEGAL','COMMITTEE']).default('MKT'),department:z.string().max(100).optional(),phone:z.string().max(30).optional(),isAdmin:z.boolean().optional()}).parse(body);
 const id=crypto.randomUUID(),hash=await bcrypt.hash(v.password,12);
 // The initial administrator has no prior author. Later accounts are attributed to the active administrator.
 return mysqlActor.run(bootstrap?null:mysqlActor.getStore()||null,async()=>{const c=await pool!.getConnection();try{await c.query("SELECT GET_LOCK('internaltest1-user-create',10) acquired");await c.beginTransaction();if(bootstrap){const [rows]=await c.query<any[]>('SELECT COUNT(*) n FROM users WHERE is_placeholder=0');if(rows[0].n)throw Object.assign(new Error('Akun awal sudah dibuat. Login sebagai administrator untuk menambah user.'),{status:409});}await c.execute('INSERT INTO users (user_id,username,email,password_hash,name,role,department,phone,is_admin,is_placeholder) VALUES (?,?,?,?,?,?,?,?,?,0)',[id,v.username,v.email.toLowerCase(),hash,v.name,v.role,v.department||null,v.phone||null,bootstrap||v.isAdmin?1:0]);await c.commit();return publicUser(await findUser(id,true));}catch(e){await c.rollback();throw e;}finally{await c.query("SELECT RELEASE_LOCK('internaltest1-user-create')");c.release();}});
}
export async function auditTable(table:string){
 if(!pool||!/^[\w$]+$/.test(table))return;
 let [cols]=await pool.query<any[]>('SELECT COLUMN_NAME,DATA_TYPE,CHARACTER_MAXIMUM_LENGTH FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? ORDER BY ORDINAL_POSITION',[table]);
 const [keys]=await pool.query<any[]>("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME IN ('created_by','updated_by') AND REFERENCED_TABLE_NAME IS NOT NULL",[table]);
 const [triggers]=await pool.query<any[]>('SELECT TRIGGER_NAME,ACTION_STATEMENT FROM information_schema.triggers WHERE trigger_schema=DATABASE() AND event_object_table=?',[table]);
 const auditTriggers=triggers.filter(t=>[`audit_${table}_insert`,`audit_${table}_update`].includes(t.TRIGGER_NAME));
 const [userRows]=await pool.query<any[]>('SELECT user_id,username,email,name,role,is_placeholder FROM users');const userIds=new Set(userRows.map(u=>String(u.user_id)));
 const aliases=new Map<string,string>(),ambiguous=new Set<string>();
 const addAlias=(alias:any,id:any)=>{if(!alias)return;const key=String(alias),value=String(id);if(ambiguous.has(key))return;const previous=aliases.get(key);if(previous&&previous!==value){aliases.delete(key);ambiguous.add(key);}else aliases.set(key,value);};
 for(const u of userRows)addAlias(u.username,u.user_id);for(const u of userRows)addAlias(u.email,u.user_id);
 const nameCounts=new Map<string,number>();for(const u of userRows)if(u.name)nameCounts.set(String(u.name),(nameCounts.get(String(u.name))||0)+1);
 for(const u of userRows)if(u.name&&nameCounts.get(String(u.name))===1)addAlias(u.name,u.user_id);
 const auditValues:Record<string,string[]>={};let needsValueMigration=false;
 for(const field of ['created_by','updated_by'])if(cols.some(c=>c.COLUMN_NAME===field)){const [values]=await pool.query<any[]>(`SELECT DISTINCT \`${field}\` AS value FROM \`${table}\` WHERE \`${field}\` IS NOT NULL`);auditValues[field]=values.map(x=>String(x.value));if(auditValues[field].some(value=>!userIds.has(value)))needsValueMigration=true;}
 // Recreate outdated triggers and convert any previous username/name values to user IDs.
 const validColumns=new Set(cols.map(c=>String(c.COLUMN_NAME)));const hasStaleColumnReference=(statement:string)=>[...statement.matchAll(/(?:OLD|NEW)\.\`([^\`]+)\`/gi)].some(m=>!validColumns.has(m[1]));
 const needsMigration=keys.length||needsValueMigration||['created_by','updated_by'].some(field=>{const col=cols.find(c=>c.COLUMN_NAME===field);return col&&(col.DATA_TYPE!=='varchar'||Number(col.CHARACTER_MAXIMUM_LENGTH)<150);})||auditTriggers.some(t=>!String(t.ACTION_STATEMENT).toLowerCase().includes('@app_user_id')||hasStaleColumnReference(String(t.ACTION_STATEMENT)));
 if(needsMigration){
  for(const trigger of auditTriggers)await pool.query(`DROP TRIGGER IF EXISTS \`${trigger.TRIGGER_NAME}\``);
  for(const key of keys)await pool.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${key.CONSTRAINT_NAME}\``);
 }
 for(const field of ['created_by','updated_by']){
  if(!cols.some(c=>c.COLUMN_NAME===field))await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${field} VARCHAR(150) NULL`);
  else if(needsMigration||cols.find(c=>c.COLUMN_NAME===field)?.DATA_TYPE!=='varchar'||Number(cols.find(c=>c.COLUMN_NAME===field)?.CHARACTER_MAXIMUM_LENGTH)<150)await pool.query(`ALTER TABLE \`${table}\` MODIFY COLUMN ${field} VARCHAR(150) NULL`);
 }
 // Remove the audit hooks while repairing values, since the update hook preserves
 // created_by and would otherwise restore NULL during the MKT backfill.
 await pool.query(`DROP TRIGGER IF EXISTS audit_${table}_insert`);
 await pool.query(`DROP TRIGGER IF EXISTS audit_${table}_update`);
 // Preserve valid IDs, map known aliases, and clear orphan plaintext values.
 for(const field of ['created_by','updated_by']){
  for(const value of auditValues[field]||[]){if(userIds.has(value))continue;await pool.query(`UPDATE \`${table}\` SET \`${field}\`=? WHERE BINARY \`${field}\`=BINARY ?`,[aliases.get(value)||null,value]);}
 }
 const [mktRows]=await pool.query<any[]>("SELECT user_id FROM users WHERE role='MKT' ORDER BY (username='mkt') DESC,is_placeholder ASC,created_at ASC LIMIT 1");const mktUserId=mktRows[0]?.user_id||null;
 if(cols.some(c=>c.COLUMN_NAME==='created_by')&&mktUserId)await pool.query(`UPDATE \`${table}\` SET created_by=? WHERE created_by IS NULL OR created_by=''`,[mktUserId]);
 // Refresh both hooks after repairs; inserts without an application actor belong to MKT.
 await pool.query(`CREATE TRIGGER audit_${table}_insert BEFORE INSERT ON \`${table}\` FOR EACH ROW SET NEW.created_by=COALESCE(@app_user_id,${mktUserId?`'${String(mktUserId).replaceAll("'","''")}'`:'NULL'}),NEW.updated_by=NULL`);
 const changed=cols.filter(c=>!['id','created_by','updated_by','created_at','updated_at','last_login_at'].includes(c.COLUMN_NAME)).map(c=>`NOT(OLD.\`${c.COLUMN_NAME}\` <=> NEW.\`${c.COLUMN_NAME}\`)`).join(' OR ')||'FALSE';
 await pool.query(`CREATE TRIGGER audit_${table}_update BEFORE UPDATE ON \`${table}\` FOR EACH ROW BEGIN SET NEW.created_by=OLD.created_by;IF (${changed}) THEN SET NEW.updated_by=COALESCE(@app_user_id,OLD.updated_by);ELSE SET NEW.updated_by=OLD.updated_by;END IF;END`);
}
export async function initializeAudit(){if(!pool)return;const [tables]=await pool.query<any[]>('SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type=\'BASE TABLE\'');for(const t of tables)await auditTable(t.TABLE_NAME);}
