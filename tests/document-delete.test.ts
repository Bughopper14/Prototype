import test from 'node:test';import assert from 'node:assert/strict';import {demoApi} from '../src/demo-api';
const storage=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>storage.get(k)||null,setItem:(k:string,v:string)=>storage.set(k,v)},configurable:true});
test('uploaded documents can be removed and replaced, with checks reset and approved attachments protected',async()=>{
 await demoApi('/auth/login','POST',{email:'mkt@liugong.local',password:'LiuGong2026!'});let a=await demoApi('/applications/demo-app-2');const d=a.documentChecks[0];
 const upload=async(name:string)=>{const body=new FormData();body.append('checklistId',d.id);body.append('file',new File([new Uint8Array([137,80,78,71,13,10,26,10])],name,{type:'image/png'}));return demoApi('/applications/demo-app-2/documents/upload','POST',body);};
 const f=await upload('wrong.png'),other=await upload('keep.png');const key='liugong-los-public-demo-v1';let s=JSON.parse(storage.get(key)!);s.applications.find((x:any)=>x.id===a.id).documentChecks[0].checkedByBs=true;storage.set(key,JSON.stringify(s));
 await assert.rejects(demoApi('/applications/demo-app-1/documents/'+f.id,'DELETE'),/tidak ditemukan/);
 await demoApi('/applications/demo-app-2/documents/'+f.id,'DELETE');a=await demoApi('/applications/demo-app-2');assert.equal(a.documentChecks[0].files[0].id,other.id);assert.equal(a.documentChecks[0].status,'UPLOADED');assert.equal(a.documentChecks[0].checkedByBs,false);await assert.rejects(demoApi('/files/'+f.id+'/url'),/File not found/);
 await demoApi('/applications/demo-app-2/documents/'+other.id,'DELETE');a=await demoApi('/applications/demo-app-2');assert.equal(a.documentChecks[0].status,'PENDING');assert.equal(a.documentChecks[0].checkedByMkt,false);
 const replacement=await upload('replacement.png');assert.ok(replacement.id);s=JSON.parse(storage.get(key)!);s.applications.find((x:any)=>x.id===a.id).legal={deeds:[{review:{status:'PENDING_CHECK',documentId:replacement.id}}]};storage.set(key,JSON.stringify(s));await assert.rejects(demoApi('/applications/demo-app-2/documents/'+replacement.id,'DELETE'),/digunakan/);
 await demoApi('/auth/login','POST',{email:'ca@liugong.local',password:'LiuGong2026!'});await assert.rejects(demoApi('/applications/demo-app-2/documents/'+replacement.id,'DELETE'),/tidak dapat/);
});
