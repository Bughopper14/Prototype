import crypto from 'node:crypto';
import type {PoolConnection} from 'mysql2/promise';
import {pool} from './mysql-store';
import {auditTable} from './mysql-users';
import {ensure} from './domain';

export async function seedApplicationDocuments(c:PoolConnection,id:string){
 const [existing]=await c.execute<any[]>('SELECT id FROM application_document_checklist WHERE application_id=? LIMIT 1',[id]);
 if(existing.length)return;
 const [masters]=await c.query<any[]>('SELECT * FROM master_document_jenis_dokumen_wajib WHERE is_active=1 ORDER BY created_at,id');
 for(const m of masters)await c.execute('INSERT INTO application_document_checklist (id,application_id,document_code,document_name,assigned_role,is_mandatory) VALUES (?,?,?,?,?,?)',[crypto.randomUUID(),id,m.code,m.name,m.department,m.is_required]);
}

export async function initializeApplicationDocuments(){
 if(!pool)return;
 await pool.query(`CREATE TABLE IF NOT EXISTS application_document_checklist (
  id CHAR(36) PRIMARY KEY,application_id CHAR(36) NOT NULL,document_code VARCHAR(150) NOT NULL,
  document_name VARCHAR(150) NOT NULL,assigned_role VARCHAR(20) NOT NULL,is_mandatory BOOLEAN NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',checked_by_mkt BOOLEAN NOT NULL DEFAULT FALSE,
  checked_by_bs BOOLEAN NOT NULL DEFAULT FALSE,checked_by_ca BOOLEAN NOT NULL DEFAULT FALSE,checked_by_legal BOOLEAN NOT NULL DEFAULT FALSE,
  registration_date DATE NULL,expired_date DATE NULL,data_summary TEXT NULL,notes TEXT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,
  UNIQUE KEY application_document_code(application_id,document_code),
  FOREIGN KEY(application_id) REFERENCES all_applications(application_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await pool.query(`CREATE TABLE IF NOT EXISTS application_document_file (
  id CHAR(36) PRIMARY KEY,checklist_id CHAR(36) NOT NULL,file_name VARCHAR(255) NOT NULL,file_key CHAR(36) NOT NULL,
  file_size BIGINT NOT NULL,mime_type VARCHAR(100) NOT NULL,uploaded_by VARCHAR(150) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,
  FOREIGN KEY(checklist_id) REFERENCES application_document_checklist(id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await auditTable('application_document_checklist');await auditTable('application_document_file');
 const c=await pool.getConnection();
 try{
  await c.beginTransaction();
  const [apps]=await c.query<any[]>('SELECT application_id FROM all_applications ORDER BY application_id FOR UPDATE');
  for(const a of apps)await seedApplicationDocuments(c,a.application_id);
  await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}
const fileModel=(f:any)=>({id:f.id,checklistId:f.checklist_id,fileName:f.file_name,fileKey:f.file_key,fileSize:Number(f.file_size),mimeType:f.mime_type,uploadedBy:f.uploaded_by,createdAt:f.created_at});
export async function readDocumentFile(id:string){
 if(!pool)return null;
 const [rows]=await pool.execute<any[]>('SELECT * FROM application_document_file WHERE id=?',[id]);return rows[0]?fileModel(rows[0]):null;
}
export async function readApplicationDocuments(id:string){
 if(!pool)return [];
 const [rows]=await pool.execute<any[]>('SELECT * FROM application_document_checklist WHERE application_id=? ORDER BY created_at,id',[id]);
 const [files]=await pool.execute<any[]>('SELECT f.* FROM application_document_file f JOIN application_document_checklist d ON d.id=f.checklist_id WHERE d.application_id=? ORDER BY f.created_at',[id]);
 const date=(v:any)=>v instanceof Date?`${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`:v;
 return rows.map(d=>({id:d.id,applicationId:d.application_id,documentCode:d.document_code,documentName:d.document_name,assignedRole:d.assigned_role,isMandatory:!!d.is_mandatory,status:d.status,checkedByMkt:!!d.checked_by_mkt,checkedByBs:!!d.checked_by_bs,checkedByCa:!!d.checked_by_ca,checkedByLegal:!!d.checked_by_legal,registrationDate:date(d.registration_date),expiredDate:date(d.expired_date),dataSummary:d.data_summary,notes:d.notes,files:files.filter(f=>f.checklist_id===d.id).map(fileModel)}));
}
export async function uploadApplicationDocument(id:string,checklistId:string,file:any,actorId:string,store:(key:string)=>Promise<void>){
 const c=await pool!.getConnection();
 try{
  await c.beginTransaction();
  const [apps]=await c.execute<any[]>('SELECT p.application_status FROM all_applications a JOIN new_application_pre_analisis p ON p.id_pre_analysis=a.id_pre_analysis WHERE a.application_id=? FOR UPDATE',[id]);
  ensure(apps.length,'Application not found',404);ensure(!['APPROVED','REJECTED','CREDIT_COMMITTEE_REVIEW'].includes(apps[0].application_status),'Documents are locked at this stage',409);
  const [docs]=await c.execute<any[]>('SELECT id FROM application_document_checklist WHERE id=? AND application_id=? FOR UPDATE',[checklistId,id]);ensure(docs.length,'Checklist item not found',404);
  const key=crypto.randomUUID(),fileId=crypto.randomUUID();await store(key);
  await c.execute('INSERT INTO application_document_file (id,checklist_id,file_name,file_key,file_size,mime_type,uploaded_by) VALUES (?,?,?,?,?,?,?)',[fileId,checklistId,file.originalname,key,file.size,file.mimetype,actorId]);
  await c.execute("UPDATE application_document_checklist SET status='UPLOADED',checked_by_mkt=1,checked_by_bs=0,checked_by_ca=0,checked_by_legal=0,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?",[checklistId]);
  await c.commit();return {id:fileId,checklistId,fileName:file.originalname,fileKey:key,fileSize:file.size,mimeType:file.mimetype,uploadedBy:actorId};
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}
export async function verifyApplicationDocument(id:string,checklistId:string,body:any){
 const c=await pool!.getConnection();
 try{
  await c.beginTransaction();
  const [apps]=await c.execute<any[]>('SELECT p.application_status FROM all_applications a JOIN new_application_pre_analisis p ON p.id_pre_analysis=a.id_pre_analysis WHERE a.application_id=? FOR UPDATE',[id]);
  ensure(apps.length,'Application not found',404);ensure(body.department==='BS'?apps[0].application_status==='SUBMITTED_TO_BS':apps[0].application_status==='IN_CA_LEGAL_REVIEW','Verification is unavailable at this workflow stage',409);
  const [docs]=await c.execute<any[]>('SELECT * FROM application_document_checklist WHERE id=? AND application_id=? FOR UPDATE',[checklistId,id]);ensure(docs.length,'Checklist item not found',404);
  const [files]=await c.execute<any[]>('SELECT id FROM application_document_file WHERE checklist_id=? LIMIT 1',[checklistId]);ensure(files.length,'Upload a document before verification');
  if(body.isVerified&&body.expiredDate)ensure(body.expiredDate>=new Date().toISOString().slice(0,10),'An expired document cannot be verified');
  if(body.expiredDate&&body.registrationDate)ensure(body.expiredDate>=body.registrationDate,'Expiry must follow registration');
  const column={BS:'checked_by_bs',CA:'checked_by_ca',LEGAL:'checked_by_legal'}[body.department as 'BS'|'CA'|'LEGAL'];ensure(column,'Invalid department');
  await c.execute(`UPDATE application_document_checklist SET ${column}=?,status=?,registration_date=?,expired_date=?,data_summary=?,notes=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,[body.isVerified,body.department===docs[0].assigned_role?(body.isVerified?'VERIFIED':'REJECTED'):docs[0].status,body.registrationDate??null,body.expiredDate??null,body.dataSummary??'',body.notes??'',checklistId]);
  await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}
