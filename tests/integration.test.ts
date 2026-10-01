import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,type ChildProcess} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';
const root=path.resolve('.data/tests');
test('full workflow: authentication, atomic updates, documents, dual review, audit and locks', {timeout:120000}, async()=>{
 await fs.mkdir(root,{recursive:true});const dir=await fs.mkdtemp(path.join(root,'run-'));const port=3300+Math.floor(Math.random()*500);const base=`http://127.0.0.1:${port}/api/v1`;let output='';let child:ChildProcess;
 const start=async()=>{child=spawn(process.execPath,['--import','tsx','server/index.ts'],{cwd:process.cwd(),env:{...process.env,DATA_DIR:dir,PORT:String(port),DATABASE_URL:'',NODE_ENV:'test',S3_BUCKET:'',JWT_SECRET:'test-only-secret-at-least-32-characters'},windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout?.on('data',x=>output+=x);child.stderr?.on('data',x=>output+=x);for(let i=0;i<300;i){try{if((await fetch(base+'/health')).ok)return;}catch{}if(child.exitCode!==null)throw new Error(output);await new Promise(r=>setTimeout(r,100));}throw new Error('Server did not start: '+output);};
 const stop=async()=>{if(child&&child.exitCode===null&&child.signalCode===null){const done=new Promise<void>(r=>child.once('exit',()=>r()));child.kill();await done;}};
 const cookies:Record<string,string>={};const request=async(role:string,url:string,method='GET',body?:any)=>{const response=await fetch(base+url,{method,headers:{...(cookies[role]?{Cookie:cookies[role]}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body?(body instanceof FormData?body:JSON.stringify(body)):undefined});const data=await response.json();return {status:response.status,data,response};};
 const ok=async(role:string,url:string,method='GET',body?:any)=>{const r=await request(role,url,method,body);assert(r.status<300,JSON.stringify(r.data));return r.data;};
 try{await start();assert.equal((await request('none','/applications')).status,401);
  for(const role of ['MKT','BS','CA','LEGAL','COMMITTEE']){const r=await request(role,'/auth/login','POST',{email:role.toLowerCase()+'@liugong.local',password:'LiuGong2026!'});assert.equal(r.status,200);cookies[role]=r.response.headers.get('set-cookie')!.split(';')[0];}
  assert.equal((await request('none','/master-data')).status,401);
  const masterBefore=await ok('MKT','/master-data');
  const masterCatalog=structuredClone(masterBefore.catalog);
  masterCatalog.branchCode.push({value:'TEST01',name:'Test branch',active:true});
  masterCatalog.industrySegment.push({value:'CUSTOM_INDUSTRY',name:'Custom industry',active:true});
  masterCatalog.companyType.push({value:'CUSTOM_COMPANY',name:'Custom company category',active:true});
  masterCatalog.documents.push({value:'CUSTOM_DOC',name:'Additional optional document',active:true,role:'BS',required:false});
  const masterSaved=await ok('MKT','/master-data','PUT',{catalog:masterCatalog,revision:masterBefore.revision});
  assert.equal(masterSaved.revision,masterBefore.revision+1);
  assert.equal((await request('MKT','/master-data','PUT',{catalog:masterCatalog,revision:masterBefore.revision})).status,409);
  const duplicateCatalog=structuredClone(masterCatalog);duplicateCatalog.branchCode.push({...duplicateCatalog.branchCode[0]});
  assert.equal((await request('MKT','/master-data','PUT',{catalog:duplicateCatalog,revision:masterSaved.revision})).status,422);
  const rows=await ok('MKT','/applications');const original=await ok('MKT','/applications/'+rows.find((r:any)=>r.status==='DRAFT').id);const profile={...original,customerId:original.customerId,branchCode:'TEST01',industrySegment:'CUSTOM_INDUSTRY'};assert.equal((await request('CA','/applications','POST',profile)).status,403);
  const created=await Promise.all([ok('MKT','/applications','POST',profile),ok('MKT','/applications','POST',profile)]);assert.notEqual(created[0].fapNumber,created[1].fapNumber);const id=created[0].id;const url='/applications/'+id;
  const customApp=await ok('MKT',url);assert.equal(customApp.industrySegment,'CUSTOM_INDUSTRY');assert(customApp.documentChecks.some((d:any)=>d.documentCode==='CUSTOM_DOC'&&!d.isMandatory));assert(!original.documentChecks.some((d:any)=>d.documentCode==='CUSTOM_DOC'));
  assert.equal((await request('MKT',url+'/transition','POST',{action:'APPROVE_COMMITTEE'})).status,403);
  assert.equal((await request('MKT',url+'/page-1','PUT',{stakeholders:[{...original.stakeholders[0],sharePercentage:50}]})).status,422);assert.equal((await request('MKT',url+'/page-1','PUT',{stakeholders:[{...original.stakeholders[0],email:''}]})).status,422);assert.equal((await ok('MKT',url)).stakeholders.length,0);
  const futureYear=new Date().getFullYear()+1;assert.equal((await request('MKT',url+'/page-1','PUT',{bankReferences:[{...original.bankReferences[0],yearStarted:futureYear}]})).status,422);assert.equal((await request('MKT',url+'/page-legal','PUT',{legal:{deeds:[{id:'future',type:'amendment',deedDate:futureYear+'-01-01'}]}})).status,422);assert.equal((await request('MKT',url+'/page-2','PUT',{proposal:{...original.proposal,units:[{...original.proposal.units[0],quantity:1.5}]}})).status,422);
  const saved=await ok('MKT',url+'/page-1','PUT',{pic:{...original.pic,country:'Indonesia',district:'Pasar Minggu',village:'Ragunan',rt:'002',rw:'001'},stakeholders:original.stakeholders,projects:original.projects,bankReferences:original.bankReferences});assert.equal(saved.pic.district,'Pasar Minggu');assert.equal(saved.pic.village,'Ragunan');assert.equal(saved.pic.rt,'002');assert.equal(saved.pic.rw,'001');assert.equal(saved.pic.country,'Indonesia');assert.equal(saved.stakeholders[0].email,'budi@example.com');assert.equal(saved.stakeholders[0].mobilePhone,'081234567890');assert.equal(saved.stakeholders[0].primaryCapital,'5000000000.00');
  assert.equal((await request('MKT',url+'/page-2','PUT',{proposal:original.proposal,financialStatements:[{...original.financialStatements[0],totalAssets:1}]})).status,422);assert.equal((await ok('MKT',url)).proposal,null);
  await ok('MKT',url+'/page-2','PUT',{proposal:original.proposal,financialStatements:original.financialStatements});
  assert.equal((await request('MKT',url+'/transition','POST',{action:'SUBMIT_TO_BS'})).status,422);
  let detail=await ok('MKT',url);const upload=async(d:any,blob=new Blob(['%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF'],{type:'application/pdf'}))=>{const form=new FormData();form.set('checklistId',d.id);form.set('file',blob,'test.pdf');return request('MKT',url+'/documents/upload','POST',form);};
  assert.equal((await upload(detail.documentChecks[0],new Blob(['not a pdf'],{type:'application/pdf'}))).status,422);
  for(const d of detail.documentChecks.filter((d:any)=>d.isMandatory)){const r=await upload(d);assert.equal(r.status,201,JSON.stringify(r.data));}
  detail=await ok('MKT',url);const file=detail.documentChecks[0].files[0];const signed=await ok('MKT','/files/'+file.id+'/url');assert.equal(signed.expiresIn,900);const fileResponse=await fetch(`http://127.0.0.1:${port}`+signed.url,{headers:{Cookie:cookies.MKT}});assert.equal(fileResponse.status,200);assert((await fileResponse.text()).startsWith('%PDF-'));assert.equal((await fetch(`http://127.0.0.1:${port}`+signed.url,{headers:{Cookie:cookies.BS}})).status,403);assert.equal((await fetch(`http://127.0.0.1:${port}`+signed.url)).status,401);
  await ok('MKT',url+'/transition','POST',{action:'SUBMIT_TO_BS'});assert.equal((await request('MKT',url+'/page-1','PUT',{profile})).status,409);
  assert.equal((await request('BS',url+'/transition','POST',{action:'VERIFY_BS'})).status,422);
  const verify=async(role:string,d:any)=>ok(role,url+'/checklist/'+d.id+'/verify','PATCH',{department:role,isVerified:true,notes:'Verified test document'});
  assert.equal((await request('BS',url+'/checklist/'+detail.documentChecks[0].id+'/verify','PATCH',{department:'LEGAL',isVerified:true})).status,403);
  for(const d of detail.documentChecks.filter((d:any)=>d.isMandatory&&d.assignedRole==='BS'))await verify('BS',d);
  assert.equal((await ok('BS',url+'/transition','POST',{action:'VERIFY_BS'})).status,'BS_VERIFIED');await ok('BS',url+'/transition','POST',{action:'START_REVIEW'});
  for(const role of ['CA','LEGAL'])for(const d of detail.documentChecks.filter((d:any)=>d.isMandatory&&d.assignedRole===role))await verify(role,d);
  assert.equal((await ok('CA',url+'/transition','POST',{action:'RECOMMEND_CA'})).status,'IN_CA_LEGAL_REVIEW');assert.equal((await ok('LEGAL',url+'/transition','POST',{action:'RECOMMEND_LEGAL'})).status,'CREDIT_COMMITTEE_REVIEW');
  detail=await ok('COMMITTEE',url+'/transition','POST',{action:'APPROVE_COMMITTEE',comments:'Synthetic test approval'});assert.equal(detail.status,'APPROVED');assert(detail.approvalLogs.length>=8);assert.equal((await request('CA',url+'/page-2','PUT',{financialStatements:original.financialStatements})).status,409);assert.equal((await upload(detail.documentChecks[0])).status,409);
  assert((await ok('MKT',url+'/document-events')).length>=14);
  await stop();const db=new PGlite(path.join(dir,'db'));await assert.rejects(db.query('UPDATE approval_logs SET comments=$1 WHERE application_id=$2',['tamper',id]),/append-only/);await assert.rejects(db.query('DELETE FROM approval_logs WHERE application_id=$1',[id]),/append-only/);await db.close();await start();assert.equal((await ok('MKT',url)).status,'APPROVED');assert.equal((await ok('MKT','/master-data')).revision,masterSaved.revision);await stop();
 }finally{await stop();}
});

