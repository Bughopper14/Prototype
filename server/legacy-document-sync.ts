import {transaction} from './db';
import type {MasterItem} from '../src/master-catalog';

// Add newly enabled document types to older applications without changing their existing review records.
export async function syncLegacyDocumentChecklists(documents:MasterItem[]){
 await transaction(async q=>{
  const codes=new Set(documents.map(item=>item.value));
  const stale=(await q(`SELECT d.id,d.document_code FROM document_checklists d
   WHERE d.status='PENDING' AND d.checked_by_mkt=false AND d.checked_by_bs=false
   AND d.checked_by_ca=false AND d.checked_by_legal=false AND NOT EXISTS
   (SELECT 1 FROM document_files f WHERE f.checklist_id=d.id)
   AND NOT EXISTS (SELECT 1 FROM document_events e WHERE e.checklist_id=d.id)`)).rows;
  for(const row of stale)if(!codes.has(row.document_code))await q('DELETE FROM document_checklists WHERE id=$1',[row.id]);
  for(const doc of documents.filter(item=>item.active)){
   await q(`INSERT INTO document_checklists
    (id,application_id,document_code,document_name,assigned_role,is_mandatory)
    SELECT gen_random_uuid(),a.id,$1,$2,$3,$4 FROM applications a
    ON CONFLICT (application_id,document_code) DO NOTHING`,
    [doc.value,doc.name,doc.role||'BS',!!doc.required]);
  }
 });
}

export async function syncLegacyDocumentCatalog(documents:MasterItem[]){
 await transaction(async q=>{
  const row=(await q('SELECT catalog FROM master_data WHERE id=1 FOR UPDATE')).rows[0];
  if(!row)return;
  const catalog=row.catalog;
  if(JSON.stringify(catalog.documents)===JSON.stringify(documents))return;
  await q('UPDATE master_data SET catalog=$1,revision=revision+1 WHERE id=1',[JSON.stringify({...catalog,documents})]);
 });
}
