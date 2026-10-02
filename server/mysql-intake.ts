import {readBusiness} from './mysql-business';
import {readLegal} from './mysql-legal';
import {pool} from './mysql-store';
import {customerFields,profileFields,picFields} from '../src/fields';
import {validateInput} from '../src/input-validation';
import crypto from 'node:crypto';
const fapCustomer=['companyName','companyType','nib','npwp','establishmentActNo','establishmentDate'];
const fapProfile=['branchCode','companyAddress','city','province','postalCode','experienceYears','experienceMonths'];
const fapFields=[...customerFields.filter(f=>fapCustomer.includes(f.key)),...profileFields.filter(f=>fapProfile.includes(f.key))];
const preFields=[...customerFields.filter(f=>!fapCustomer.includes(f.key)),...profileFields.filter(f=>f.key!=='customerStatus'&&!fapProfile.includes(f.key))];
const column=(s:string)=>s.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
const decode=(v:any)=>typeof v==='string'?JSON.parse(v):v;
const canonical=(v:any):string=>JSON.stringify(v,(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value);
export async function initializeIntake(){
 if(!pool)return;
 await pool.query(`CREATE TABLE IF NOT EXISTS all_applications (sequence_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,id CHAR(36) NOT NULL UNIQUE,customer_id CHAR(36) NOT NULL,company_name VARCHAR(255) NOT NULL,company_type VARCHAR(50),fap_number VARCHAR(80) UNIQUE,branch_code VARCHAR(80),financing_value DECIMAL(20,2) NULL,tenor_months INT NULL,status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',verified_docs INT NOT NULL DEFAULT 0,total_docs INT NOT NULL DEFAULT 0,application_date DATE NOT NULL,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB`);
 for(const [table,fields] of [['new_application_fap_stage',fapFields],['new_application_pre_analisis',preFields]] as const){
 await pool.query(`CREATE TABLE IF NOT EXISTS ${table} (application_id CHAR(36) PRIMARY KEY,${table==='new_application_fap_stage'?'customer_category VARCHAR(30),existing_customer_id CHAR(36),application_date DATE,fap_registration_number VARCHAR(80),':''}${fields.map(f=>`\`${column(f.key)}\` ${f.type==='number'?'DECIMAL(20,2)':f.type==='date'?'DATE':'TEXT'} NULL`).join(',')},payload JSON NOT NULL,CONSTRAINT fk_${table} FOREIGN KEY (application_id) REFERENCES all_applications(id)) ENGINE=InnoDB`);
 }
 await pool.query(`CREATE TABLE IF NOT EXISTS customer_pic (id CHAR(36) PRIMARY KEY,application_id CHAR(36) NOT NULL UNIQUE,customer_id CHAR(36) NOT NULL,${picFields.map(f=>'`'+column(f.key)+'` TEXT NULL').join(',')},payload JSON NOT NULL,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,CONSTRAINT fk_customer_pic_application FOREIGN KEY (application_id) REFERENCES all_applications(id)) ENGINE=InnoDB`);
 for(const table of ['all_applications','new_application_fap_stage','new_application_pre_analisis']){
 const [columns]=await pool.query<any[]>('SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=?',[table]);const names=new Set(columns.map(r=>r.COLUMN_NAME));
 if(!names.has('id')){await pool.query(`ALTER TABLE ${table} ADD COLUMN id CHAR(36) NULL`);await pool.query(`UPDATE ${table} SET id=UUID() WHERE id IS NULL`);await pool.query(`ALTER TABLE ${table} MODIFY id CHAR(36) NOT NULL`);}
 if(!names.has('created_at'))await pool.query(`ALTER TABLE ${table} ADD COLUMN created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)`);
 if(!names.has('updated_at'))await pool.query(`ALTER TABLE ${table} ADD COLUMN updated_at TIMESTAMP(3) NULL`);
 const [primary]=await pool.query<any[]>('SELECT COLUMN_NAME FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND table_name=? AND constraint_name=\'PRIMARY\'',[table]);
 if(primary[0]?.COLUMN_NAME!=='id'){await pool.query(`ALTER TABLE ${table} ADD UNIQUE KEY legacy_key (${table==='all_applications'?'sequence_id':'application_id'})`);await pool.query(`ALTER TABLE ${table} DROP PRIMARY KEY, ADD PRIMARY KEY (id)`);}
 }
}
export async function listIntake(){if(!pool)return [];const [rows]=await pool.query<any[]>('SELECT * FROM all_applications ORDER BY sequence_id DESC');return rows;}
export async function intakeDetail(id:string){
 if(!pool)return null;
 const [rows]=await pool.query<any[]>('SELECT a.*,f.payload AS fap,f.customer_category,p.payload AS pre FROM all_applications a JOIN new_application_fap_stage f ON f.application_id=a.id JOIN new_application_pre_analisis p ON p.application_id=a.id WHERE a.id=?',[id]);
 if(!rows.length)return null;const row=rows[0],f=decode(row.fap),p=decode(row.pre);
 const [pics]=await pool.query<any[]>('SELECT id,payload,created_at,updated_at FROM customer_pic WHERE application_id=?',[id]);
 return {...f.profile,...p.profile,id:row.id,customerStatus:f.category||row.customer_category||'NEW',customerId:row.customer_id,customer:{...f.customer,...p.customer,id:row.customer_id},fapNumber:row.fap_number,applicationDate:row.application_date,createdAt:row.created_at,updatedAt:row.updated_at,status:row.status,legal:await readLegal(id),pic:pics[0]?{...decode(pics[0].payload),id:pics[0].id,createdAt:pics[0].created_at,updatedAt:pics[0].updated_at}:null,stakeholders:[],...await readBusiness(id),financialStatements:[],documentChecks:[],approvalLogs:[],signoffs:[],ratios:[]};
}
export async function intakeCustomers(){const rows=await listIntake();const customers=await Promise.all(rows.map(r=>intakeDetail(r.id)));return customers.map(r=>r.customer).filter((r,i,a)=>a.findIndex(x=>x.id===r.id)===i);}
export async function createIntake(body:any,identity?:{id:string,fapNumber?:string,status?:string}){
 if(!pool)throw new Error('MySQL is not configured');
 const customer=body.customer||{},profile=body.profile||{},category=body.customerCategory;
 if(!['NEW','EXISTING'].includes(category))throw Object.assign(new Error('Select a customer category'),{status:422});
 validateInput(customer);validateInput(profile);
 if(!String(customer.companyName||'').trim()||!/^\d{13}$/.test(String(customer.nib||''))||!/^\d{15,16}$/.test(String(customer.npwp||'').replace(/\D/g,'')))throw Object.assign(new Error('Complete company name, NIB and NPWP'),{status:422});
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(profile.email||'')))throw Object.assign(new Error('Enter a valid company email'),{status:422});
 if(category==='EXISTING'&&!body.customerId)throw Object.assign(new Error('Select an existing customer'),{status:422});
 const id=identity?.id||crypto.randomUUID(),customerId=category==='EXISTING'?body.customerId:crypto.randomUUID();
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const c=await pool.getConnection();
 try{await c.beginTransaction();
 const [result]=await c.execute<any>('INSERT INTO all_applications (id,customer_id,company_name,company_type,branch_code,application_date) VALUES (?,?,?,?,?,?)',[id,customerId,customer.companyName,customer.companyType||null,profile.branchCode||null,date]);
 const months=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];const fap=identity?.fapNumber||`${String(result.insertId).padStart(3,'0')}/AF/${months[Number(date.slice(5,7))-1]}/${date.slice(0,4)}`;
 await c.execute('UPDATE all_applications SET fap_number=?,status=? WHERE id=?',[fap,identity?.status||'DRAFT',id]);
 for(const [table,fields] of [['new_application_fap_stage',fapFields],['new_application_pre_analisis',preFields]] as const){
 const values={...customer,...profile};const isFap=table==='new_application_fap_stage';
 const keys=['id','application_id',...(isFap?['customer_category','existing_customer_id','application_date','fap_registration_number']:[]),...fields.map(f=>column(f.key)),'payload'];
 const payload={customer:Object.fromEntries(fields.filter(f=>customerFields.some(x=>x.key===f.key)).map(f=>[f.key,customer[f.key]??null])),profile:Object.fromEntries(fields.filter(f=>profileFields.some(x=>x.key===f.key)).map(f=>[f.key,profile[f.key]??null]))};
 if(isFap)(payload as any).category=category;
 const args=[crypto.randomUUID(),id,...(isFap?[category,category==='EXISTING'?customerId:null,date,fap]:[]),...fields.map(f=>values[f.key]===undefined||values[f.key]===null||values[f.key]===''?null:values[f.key]),JSON.stringify(payload)];
 await c.execute(`INSERT INTO ${table} (${keys.map(k=>'`'+k+'`').join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,args);
 }
 await c.commit();return {id};
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}

export async function saveCustomerPic(id:string,body:any,fallback?:any){
 if(!pool)throw new Error('MySQL is not configured');
 const profile=Object.fromEntries(profileFields.map(f=>[f.key,body.profile?.[f.key]??fallback?.[f.key]??null]));
 const pic=Object.fromEntries(picFields.map(f=>[f.key,body.pic?.[f.key]??null]));
 validateInput(profile);validateInput(pic);
 if(pic.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(pic.email)))throw Object.assign(new Error('Enter a valid PIC email'),{status:422});
 if(!await intakeDetail(id)){if(!fallback)throw Object.assign(new Error('Application not found'),{status:404});await createIntake({customerCategory:'EXISTING',customerId:fallback.customerId,customer:fallback.customer,profile},{id,fapNumber:fallback.fapNumber,status:fallback.status});}
 const c=await pool.getConnection();let changed=false;
 try{await c.beginTransaction();await c.query('SELECT id FROM all_applications WHERE id=? FOR UPDATE',[id]);
 for(const [table,fields] of [['new_application_fap_stage',fapFields],['new_application_pre_analisis',preFields]] as const){
 const [rows]=await c.query<any[]>(`SELECT payload FROM ${table} WHERE application_id=?`,[id]);const previous=decode(rows[0].payload);const updated={...previous,profile:{...previous.profile}};
 for(const f of fields.filter(f=>profileFields.some(p=>p.key===f.key)))updated.profile[f.key]=profile[f.key];
 if(table==='new_application_fap_stage')updated.category=profile.customerStatus;
 if(canonical(updated)!==canonical(previous)){
 const selected=fields.filter(f=>profileFields.some(p=>p.key===f.key));
 await c.execute(`UPDATE ${table} SET ${selected.map(f=>'`'+column(f.key)+'`=?').join(',')},${table==='new_application_fap_stage'?'customer_category=?,':''}payload=?,updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=?`,[...selected.map(f=>profile[f.key]===''?null:profile[f.key]),...(table==='new_application_fap_stage'?[profile.customerStatus]:[]),JSON.stringify(updated),id]);changed=true;
 }
 }
 const [existing]=await c.query<any[]>('SELECT payload FROM customer_pic WHERE application_id=?',[id]);
 const nonempty=Object.values(pic).some(v=>v!==null&&v!=='');
 if(existing.length||nonempty){if(!existing.length||canonical(decode(existing[0].payload))!==canonical(pic)){
 const [apps]=await c.query<any[]>('SELECT customer_id FROM all_applications WHERE id=?',[id]);
 const keys=picFields.map(f=>column(f.key));
 if(existing.length)await c.execute(`UPDATE customer_pic SET ${keys.map(k=>'`'+k+'`=?').join(',')},payload=?,updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=?`,[...picFields.map(f=>pic[f.key]),JSON.stringify(pic),id]);
 else await c.execute(`INSERT INTO customer_pic (id,application_id,customer_id,${keys.map(k=>'`'+k+'`').join(',')},payload) VALUES (${Array(keys.length+4).fill('?').join(',')})`,[crypto.randomUUID(),id,apps[0].customer_id,...picFields.map(f=>pic[f.key]),JSON.stringify(pic)]);
 changed=true;
 }}
 if(changed)await c.execute('UPDATE all_applications SET branch_code=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?',[profile.branchCode,id]);
 await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
 return intakeDetail(id);
}




