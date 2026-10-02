import {validateInput} from './input-validation';
export const deedReviewLabels:Record<string,string>={DRAFT:'Draft',PENDING_CHECK:'Menunggu Arianti',PENDING_APPROVAL:'Menunggu Dellatra',APPROVED:'Disetujui',REJECTED:'Ditolak'};
export class DeedWorkflowError extends Error{constructor(message:string,public status=422){super(message);}}
const assert=(ok:unknown,message:string,status=422)=>{if(!ok)throw new DeedWorkflowError(message,status);};
const fields=['id','type','source','createdAt','deedNumber','deedDate','ministerialDecreeNumber','ministerialDecreeDate','remarks','remarkCategoryId','infoAdded','parties','stakeholders'];
export function deedData(deed:any){return Object.fromEntries(fields.filter(key=>deed[key]!==undefined).map(key=>[key,structuredClone(deed[key])]));}
export function reviewStatus(deed:any){return deed?.review?.status||'DRAFT';}
export const deedPending=(deed:any)=>['PENDING_CHECK','PENDING_APPROVAL'].includes(reviewStatus(deed));
export function publishedDeeds(legal:any){return (legal?.deeds||[]).filter((d:any)=>d.approvedSnapshot).map((d:any)=>({...d.approvedSnapshot,id:d.id,approvedAt:d.approvedAt}));}
export function mergeLegal(previous:any,incoming:any){
 const prior=Array.isArray(previous?.deeds)?previous.deeds:[],ids=new Set<string>();
 const deeds=(incoming.deeds||[]).map((input:any)=>{assert(input.id&&typeof input.id==='string','Setiap akta wajib memiliki ID.');assert(!ids.has(input.id),'ID akta tidak boleh duplikat.');ids.add(input.id);const old=prior.find((d:any)=>d.id===input.id),data=deedData(input);
  if(!old)return {...data,review:{status:'DRAFT',revision:1},reviewHistory:[]};
  const changed=JSON.stringify(deedData(old))!==JSON.stringify(data);
  assert(!changed||!deedPending(old),'Akta sedang diperiksa. Tunggu hasil pemeriksaan sebelum mengubah data.',409);
  return {...data,review:changed?{status:'DRAFT',revision:(old.review?.revision||0)+1}:old.review||{status:'DRAFT',revision:1},reviewHistory:old.reviewHistory||[],...(old.approvedSnapshot?{approvedSnapshot:old.approvedSnapshot,approvedAt:old.approvedAt}:{})};
 });
 for(const old of prior)assert(ids.has(old.id)||!deedPending(old)&&!old.approvedSnapshot,'Akta dalam proses approval atau sudah disetujui tidak boleh dihapus. Buat perubahan dan ajukan ulang.',409);
 return {...incoming,deeds};
}
export function deedTransition(deed:any,action:string,actor:{id:string,name:string,role:string},options:{revision:number,documentId?:string,comments?:string},now=new Date()){
 assert(deed,'Akta tidak ditemukan.',404);assert(options.revision===(deed.review?.revision||1),'Akta telah berubah. Buka ulang sebelum melanjutkan.',409);
 const status=reviewStatus(deed),comments=String(options.comments||'').trim(),date=now.toISOString(),revision=(deed.review?.revision||1)+1;
 assert(comments.length<=10000,'Catatan maksimal 10.000 karakter.');
 let next='';
 if(action==='SUBMIT'){
  assert(actor.role==='MKT','Hanya MKT yang dapat mengajukan akta.',403);assert(['DRAFT','REJECTED'].includes(status),'Akta sudah diajukan atau disetujui.',409);
  for(const key of ['deedNumber','deedDate','ministerialDecreeNumber','ministerialDecreeDate'])assert(String(deed[key]||'').trim(),`${key} wajib diisi sebelum mengajukan akta.`);
  assert(['establishment','amendment'].includes(deed.type),'Pilih jenis akta.');if(deed.type==='amendment')assert(deed.remarkCategoryId,'Kategori akta perubahan wajib dipilih.');
  assert(Array.isArray(deed.stakeholders)&&deed.stakeholders.length,'Tambahkan stakeholder/shareholder sebelum mengajukan akta.');
  validateInput(deedData(deed),now);
  for(const r of deed.stakeholders){validateInput({...r,nationalityType:r.citizenship==='FOREIGN'?'WNA':r.nationalityType||'WNI'},now);assert([r.firstName,r.lastName,r.name].some(x=>String(x||'').trim()),'Nama stakeholder wajib diisi.');for(const key of ['email','mobilePhone','primaryCapital','idNumber'])assert(String(r[key]??'').trim(),`${key} stakeholder wajib diisi.`);}
  next='PENDING_CHECK';
 }else if(action==='CHECK'){
  assert(actor.role==='BS','Pemeriksaan akta dilakukan oleh Arianti / BS.',403);assert(status==='PENDING_CHECK','Akta belum menunggu pemeriksaan.',409);assert(deed.review.submittedById!==actor.id,'Pengaju dan pemeriksa harus berbeda.',403);next='PENDING_APPROVAL';
 }else if(action==='APPROVE'){
  assert(actor.role==='HEAD_BS','Approval akta dilakukan oleh Dellatra / Head BS.',403);assert(status==='PENDING_APPROVAL','Akta harus lolos pemeriksaan Arianti terlebih dahulu.',409);assert(deed.review.checkedById!==actor.id,'Pemeriksa dan approver harus berbeda.',403);next='APPROVED';
 }else if(action==='REJECT'){
  assert(actor.role==='BS'&&status==='PENDING_CHECK'||actor.role==='HEAD_BS'&&status==='PENDING_APPROVAL','Penolakan tidak tersedia untuk akun/status ini.',403);assert(comments,'Alasan penolakan wajib diisi.');next='REJECTED';
 }else throw new DeedWorkflowError('Aksi approval tidak valid.');
 const review:any={...deed.review,status:next,revision};
 if(action==='SUBMIT')Object.assign(review,{...(options.documentId?{documentId:options.documentId}:{}),submittedById:actor.id,submittedBy:actor.name,submittedAt:date,checkedById:null,checkedBy:null,checkedAt:null,approvedBy:null,rejectedBy:null,rejectionReason:null});
 if(action==='CHECK')Object.assign(review,{checkedById:actor.id,checkedBy:actor.name,checkedAt:date});
 if(action==='APPROVE')Object.assign(review,{approvedBy:actor.name,approvedAt:date});
 if(action==='REJECT')Object.assign(review,{rejectedBy:actor.name,rejectedAt:date,rejectionReason:comments});
 return {...deed,review,reviewHistory:[...(deed.reviewHistory||[]),{action,status:next,actor:actor.name,role:actor.role,at:date,comments,documentId:review.documentId,revision}],...(next==='APPROVED'?{approvedSnapshot:deedData(deed),approvedAt:date}:{})};
}

export function canEditLegal(actor:any,application:any){return actor.role==='MKT'&&(['DRAFT','RETURNED'].includes(application.status)||!['APPROVED','REJECTED','CREDIT_COMMITTEE_REVIEW'].includes(application.status)&&(application.legal?.deeds||[]).some((d:any)=>reviewStatus(d)==='REJECTED'));}
