import {pool} from './mysql-store';
import {mysqlActor} from './mysql-audit-context';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import {z} from 'zod';
import {query} from './db';
export async function initializeUsers(){
 if(!pool)return;
 await pool.query(`CREATE TABLE IF NOT EXISTS users (id CHAR(36) PRIMARY KEY,username VARCHAR(100) NOT NULL UNIQUE,email VARCHAR(255) NOT NULL UNIQUE,password_hash VARCHAR(255) NOT NULL,name VARCHAR(150) NOT NULL,role VARCHAR(30) NOT NULL,department VARCHAR(100) NULL,phone VARCHAR(30) NULL,is_active BOOLEAN NOT NULL DEFAULT TRUE,is_admin BOOLEAN NOT NULL DEFAULT FALSE,is_placeholder BOOLEAN NOT NULL DEFAULT FALSE,last_login_at TIMESTAMP(3) NULL,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL) ENGINE=InnoDB`);
 const [columns]=await pool.query<any[]>('SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=\'users\'');
 if(!columns.some(c=>c.COLUMN_NAME==='is_placeholder'))await pool.query('ALTER TABLE users ADD COLUMN is_placeholder BOOLEAN NOT NULL DEFAULT FALSE AFTER is_admin');
 // Copy the repository's existing demo identities and password hashes as read-only MySQL placeholders.
 // The source users table remains unchanged; no JSON data is migrated or removed.
 const template=(await query('SELECT id,name,email,password_hash,role FROM users')).rows;
 for(const user of template){
  const username=String(user.email).split('@')[0].replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,100);
  await pool.execute('INSERT IGNORE INTO users (id,username,email,password_hash,name,role,is_active,is_admin,is_placeholder) VALUES (?,?,?,?,?,?,1,0,1)',[user.id,username,String(user.email).toLowerCase(),user.password_hash,user.name,user.role]);
  // The department shortcuts are local-only demo accounts; explicitly opt in before enabling writes.
  if(process.env.MYSQL_DEMO_USERS_ACTIVE==='true')await pool.execute('UPDATE users SET is_placeholder=0 WHERE id=? AND is_placeholder=1',[user.id]);
 }
}
export const publicUser=(u:any)=>({id:u.id,username:u.username,name:u.name,email:u.email,role:u.role,department:u.department,phone:u.phone,isActive:!!u.is_active,isAdmin:!!u.is_admin,isPlaceholder:!!u.is_placeholder,source:u.is_placeholder?'placeholder':'mysql'});
export async function userCount(){if(!pool)return 0;const [r]=await pool.query<any[]>('SELECT COUNT(*) n FROM users WHERE is_placeholder=0');return Number(r[0].n);}
export async function findUser(login:string,byId=false){if(!pool)return null;const [r]=await pool.execute<any[]>(byId?'SELECT * FROM users WHERE id=?':'SELECT * FROM users WHERE email=? OR username=?',byId?[login]:[login.toLowerCase(),login]);return r[0]||null;}
export async function createUser(body:any,bootstrap=false){
 if(!pool)throw new Error('MySQL is not configured');
 const v=z.object({username:z.string().trim().min(3).max(100).regex(/^[A-Za-z0-9_.-]+$/),email:z.string().email().max(255),password:z.string().min(8).max(72),name:z.string().trim().min(1).max(150),role:z.enum(['MKT','BS','HEAD_BS','CA','LEGAL','COMMITTEE']).default('MKT'),department:z.string().max(100).optional(),phone:z.string().max(30).optional(),isAdmin:z.boolean().optional()}).parse(body);
 const id=crypto.randomUUID(),hash=await bcrypt.hash(v.password,12);
 // The initial administrator has no prior author. Later accounts are attributed to the active administrator.
 return mysqlActor.run(bootstrap?null:mysqlActor.getStore()||null,async()=>{const c=await pool!.getConnection();try{await c.query("SELECT GET_LOCK('internaltest1-user-create',10) acquired");await c.beginTransaction();if(bootstrap){const [rows]=await c.query<any[]>('SELECT COUNT(*) n FROM users WHERE is_placeholder=0');if(rows[0].n)throw Object.assign(new Error('Akun awal sudah dibuat. Login sebagai administrator untuk menambah user.'),{status:409});}await c.execute('INSERT INTO users (id,username,email,password_hash,name,role,department,phone,is_admin,is_placeholder) VALUES (?,?,?,?,?,?,?,?,?,0)',[id,v.username,v.email.toLowerCase(),hash,v.name,v.role,v.department||null,v.phone||null,bootstrap||v.isAdmin?1:0]);await c.commit();return publicUser(await findUser(id,true));}catch(e){await c.rollback();throw e;}finally{await c.query("SELECT RELEASE_LOCK('internaltest1-user-create')");c.release();}});
}
export async function auditTable(table:string){
 if(!pool||!/^[\w$]+$/.test(table))return;
 let [cols]=await pool.query<any[]>('SELECT COLUMN_NAME,DATA_TYPE,CHARACTER_MAXIMUM_LENGTH FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? ORDER BY ORDINAL_POSITION',[table]);
 const [keys]=await pool.query<any[]>("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME IN ('created_by','updated_by') AND REFERENCED_TABLE_NAME IS NOT NULL",[table]);
 const [triggers]=await pool.query<any[]>('SELECT TRIGGER_NAME,ACTION_STATEMENT FROM information_schema.triggers WHERE trigger_schema=DATABASE() AND event_object_table=?',[table]);
 const auditTriggers=triggers.filter(t=>[`audit_${table}_insert`,`audit_${table}_update`].includes(t.TRIGGER_NAME));
 // Migrate old ID-based triggers and audit columns once; subsequent startups leave them intact.
 const needsMigration=keys.length||['created_by','updated_by'].some(field=>{const col=cols.find(c=>c.COLUMN_NAME===field);return col&&(col.DATA_TYPE!=='varchar'||Number(col.CHARACTER_MAXIMUM_LENGTH)<150);})||auditTriggers.some(t=>!String(t.ACTION_STATEMENT).toLowerCase().includes('@app_username'));
 if(needsMigration){
  for(const trigger of auditTriggers)await pool.query(`DROP TRIGGER IF EXISTS \`${trigger.TRIGGER_NAME}\``);
  for(const key of keys)await pool.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${key.CONSTRAINT_NAME}\``);
 }
 for(const field of ['created_by','updated_by']){
  if(!cols.some(c=>c.COLUMN_NAME===field))await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${field} VARCHAR(150) NULL`);
  else if(needsMigration||cols.find(c=>c.COLUMN_NAME===field)?.DATA_TYPE!=='varchar'||Number(cols.find(c=>c.COLUMN_NAME===field)?.CHARACTER_MAXIMUM_LENGTH)<150)await pool.query(`ALTER TABLE \`${table}\` MODIFY COLUMN ${field} VARCHAR(150) NULL`);
 }
 // Convert prior UUID, display-name and email audit values into login usernames.
 for(const field of ['created_by','updated_by']){
  await pool.query(`UPDATE \`${table}\` t JOIN users u ON BINARY t.\`${field}\`=BINARY u.id SET t.\`${field}\`=u.username WHERE t.\`${field}\` IS NOT NULL`);
  await pool.query(`UPDATE \`${table}\` t JOIN users u ON BINARY t.\`${field}\`=BINARY u.name SET t.\`${field}\`=u.username WHERE t.\`${field}\` IS NOT NULL`);
  await pool.query(`UPDATE \`${table}\` t JOIN users u ON BINARY t.\`${field}\`=BINARY u.email SET t.\`${field}\`=u.username WHERE t.\`${field}\` IS NOT NULL`);
 }
 const [currentTriggers]=await pool.query<any[]>('SELECT TRIGGER_NAME FROM information_schema.triggers WHERE trigger_schema=DATABASE() AND event_object_table=?',[table]);
 if(!currentTriggers.some(t=>t.TRIGGER_NAME===`audit_${table}_insert`))await pool.query(`CREATE TRIGGER audit_${table}_insert BEFORE INSERT ON \`${table}\` FOR EACH ROW SET NEW.created_by=@app_username,NEW.updated_by=NULL`);
 if(!currentTriggers.some(t=>t.TRIGGER_NAME===`audit_${table}_update`)){
  const changed=cols.filter(c=>!['id','created_by','updated_by','created_at','updated_at','last_login_at'].includes(c.COLUMN_NAME)).map(c=>`NOT(OLD.\`${c.COLUMN_NAME}\` <=> NEW.\`${c.COLUMN_NAME}\`)`).join(' OR ')||'FALSE';
  await pool.query(`CREATE TRIGGER audit_${table}_update BEFORE UPDATE ON \`${table}\` FOR EACH ROW BEGIN SET NEW.created_by=OLD.created_by;IF (${changed}) THEN SET NEW.updated_by=COALESCE(@app_username,OLD.updated_by);ELSE SET NEW.updated_by=OLD.updated_by;END IF;END`);
 }
}
export async function initializeAudit(){if(!pool)return;const [tables]=await pool.query<any[]>('SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type=\'BASE TABLE\'');for(const t of tables)await auditTable(t.TABLE_NAME);}
