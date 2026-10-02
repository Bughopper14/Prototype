import {pool} from './mysql-store';
import {projectFields,bankFields,proposalFields,unitFields} from '../src/fields';
import {validateInput} from '../src/input-validation';
import {installment} from './domain';
import crypto from 'node:crypto';
const groups=[['project_contract',projectFields],['bank_facilities',bankFields],['financing_detail',proposalFields],['equipment_units',unitFields]] as const;
const column=(s:string)=>s.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
const decode=(v:any)=>typeof v==='string'?JSON.parse(v):v;
const canonical=(v:any)=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
export async function initializeBusiness(){
 if(!pool)return;
 for(const [table,fields] of groups)await pool.query(`CREATE TABLE IF NOT EXISTS ${table} (id CHAR(36) PRIMARY KEY,application_id CHAR(36) NOT NULL${table==='financing_detail'?' UNIQUE':''},${table==='equipment_units'?'financing_detail_id CHAR(36) NOT NULL,':''}row_position INT NOT NULL DEFAULT 0,${fields.map(f=>'`'+column(f.key)+'` '+(f.type==='number'?'DECIMAL(20,2)':'TEXT')+' NULL').join(',')},${table==='financing_detail'?'estimated_monthly_installment DECIMAL(20,2) NULL,':''}payload JSON NOT NULL,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,deleted_at TIMESTAMP(3) NULL,CONSTRAINT fk_${table}_application FOREIGN KEY(application_id) REFERENCES all_applications(id)${table==='equipment_units'?',CONSTRAINT fk_equipment_financing FOREIGN KEY(financing_detail_id) REFERENCES financing_detail(id)':''}) ENGINE=InnoDB`);
}
export async function readBusiness(id:string){
 if(!pool)return {projects:[],bankReferences:[],proposal:null};
 const data:any={};
 for(const [table] of groups){const [rows]=await pool.query<any[]>(`SELECT * FROM ${table} WHERE application_id=? AND deleted_at IS NULL ORDER BY row_position,created_at,id`,[id]);data[table]=rows.map(r=>({...decode(r.payload),id:r.id,createdAt:r.created_at,updatedAt:r.updated_at,...(table==='financing_detail'?{estimatedInstallment:r.estimated_monthly_installment}:{})}));}
 return {projects:data.project_contract,bankReferences:data.bank_facilities,proposal:data.financing_detail[0]?{...data.financing_detail[0],units:data.equipment_units}:null};
}
export async function saveBusiness(id:string,body:any){
 if(!pool)throw new Error('MySQL is not configured');
 const bad=(message:string)=>{throw Object.assign(new Error(message),{status:422});};
 const normalize=(row:any,fields:readonly any[])=>Object.fromEntries(fields.map(f=>[f.key,row?.[f.key]===undefined||row?.[f.key]===''?null:f.type==='number'&&row?.[f.key]!==null?Number(row[f.key]):row?.[f.key]??null]));
 const projects=body.projects??[],banks=body.bankReferences??[],units=body.proposal?.units??[];
 for(const rows of [projects,banks,units])if(!Array.isArray(rows)||rows.length>1000)bad('Maksimal 1000 baris per bagian.');
 const proposal=body.proposal?normalize(body.proposal,proposalFields):null;
 try{validateInput({projects:projects.map((r:any)=>normalize(r,projectFields)),banks:banks.map((r:any)=>normalize(r,bankFields)),proposal,units:units.map((r:any)=>normalize(r,unitFields))});}catch(e:any){bad(e.message);}
 if(proposal&&Number(proposal.downPaymentValue||0)>Number(proposal.financingValue||0))bad('Down payment melebihi nilai pembiayaan.');
 const c=await pool.getConnection();let changed=false;
 try{await c.beginTransaction();const [app]=await c.query<any[]>('SELECT id FROM all_applications WHERE id=? FOR UPDATE',[id]);if(!app.length)throw Object.assign(new Error('Application not found'),{status:404});
 let financeId='';
 for(const [table,fields] of groups){
 const [old]=await c.query<any[]>(`SELECT * FROM ${table} WHERE application_id=?`,[id]);
 const rows=table==='project_contract'?projects:table==='bank_facilities'?banks:table==='financing_detail'?(proposal?[body.proposal]:[]):units;
 const seen=new Set<string>();
 for(const [position,row] of rows.entries()){
 const payload=normalize(row,fields);const previous=table==='financing_detail'?old[0]:old.find(r=>r.id===row.id);
 const rowId=previous?.id||crypto.randomUUID();if(seen.has(rowId))bad('ID baris duplikat.');seen.add(rowId);if(table==='financing_detail')financeId=rowId;
 const estimate=table==='financing_detail'?installment({...payload,financingValue:payload.financingValue||0,downPaymentValue:payload.downPaymentValue||0,interestRate:payload.interestRate||0}):null;
 if(previous&&!previous.deleted_at&&canonical(decode(previous.payload))===canonical(payload)&&previous.row_position===position)continue;
 const keys=['application_id','row_position',...fields.map(f=>column(f.key)),...(table==='equipment_units'?['financing_detail_id']:[]),...(table==='financing_detail'?['estimated_monthly_installment']:[]),'payload'];
 const args=[id,position,...fields.map(f=>payload[f.key]),...(table==='equipment_units'?[financeId]:[]),...(table==='financing_detail'?[estimate]:[]),JSON.stringify(payload)];
 if(previous)await c.execute(`UPDATE ${table} SET ${keys.map(k=>'`'+k+'`=?').join(',')},deleted_at=NULL,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,[...args,rowId]);
 else await c.execute(`INSERT INTO ${table} (id,${keys.map(k=>'`'+k+'`').join(',')}) VALUES (${Array(keys.length+1).fill('?').join(',')})`,[rowId,...args]);changed=true;
 }
 for(const row of old)if(!row.deleted_at&&!seen.has(row.id)){await c.execute(`UPDATE ${table} SET deleted_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,[row.id]);changed=true;}
 }
 if(changed)await c.execute('UPDATE all_applications SET financing_value=?,tenor_months=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?',[proposal?.financingValue??null,proposal?.tenorMonths??null,id]);
 await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}

