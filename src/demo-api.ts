import { SCENARIO_CUSTOMERS, SCENARIO_APPLICATIONS, KTP_SAMPLE_IMAGE, FAP_SAMPLE_PDF } from './demo-scenarios-data';
import {profileFields} from './fields';
import {mergeLegal,deedTransition,deedBaseline,canEditLegal,reviewStatus,saveSingleDeed} from './deed-workflow';
import {validateWrite} from './input-validation';
import {defaultMasterCatalog,validateMasterCatalog} from './master-catalog';
import {nextFapNumber} from './fap-number';
const key='liugong-los-public-demo-v1';const fileUrls=new Map<string,string>();
const roles:any=[['MKT','Marketing'],['BS','Business Support'],['HEAD_BS','Head BS'],['CA','Credit Analyst'],['LEGAL','Legal'],['COMMITTEE','Credit Committee']];
const names=['PT Bumi Karya Nusantara','PT Cipta Infrastruktur','PT Sumber Alam Lestari','PT Mitra Tambang Sejahtera','PT Agro Prima Indonesia','PT Konstruksi Mandiri'];
const stages=['IN_CA_LEGAL_REVIEW','SUBMITTED_TO_BS','DRAFT','CREDIT_COMMITTEE_REVIEW','APPROVED','RETURNED'];
const docTypes:any=[
  ['FAP','fap','MKT',true,'FAP (Financing Application Form)','FAP Intake'],
  ['PREANALYSIS','Preanalysis','CA',true,'Pre-analysis Document','Pre-analysis'],
  ['ICLF','Iclf','COMMITTEE',true,'ICLF (Credit Committee Review)','Credit Committee']
];
const copy=(x:any)=>JSON.parse(JSON.stringify(x));
const generateUUID=()=>{if(typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function")return crypto.randomUUID();return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=(Math.random()*16)|0,v=c==="x"?r:(r&0x3)|0x8;return v.toString(16);});};
const sampleDeedsForApp=(i:number)=>[
 {id:`seed-deed-${i}-1`,type:"establishment",deedNumber:`AHU-001860${i}.AH.01.01.Tahun 2021`,deedDate:"2021-08-10",ministerialDecreeNumber:`SK-AHU-001860${i}.2021`,ministerialDecreeDate:"2021-08-12",remarkCategoryIds:["establishment-deed"],remarkCategoryId:"establishment-deed",remarks:"<ol><li>Akta pendirian awal perseroan dengan modal dasar Rp 50 Miliar dan modal disetor Rp 15 Miliar.</li><li>Bidang usaha utama perdagangan besar dan penyewaan alat berat.</li></ol>",source:"Sistem",parties:{representative:"Budi Santoso",notaryName:"H. Ahmad Fauzi, S.H., M.Kn.",notaryLocation:"Jakarta Selatan"}},
 {id:`seed-deed-${i}-2`,type:"amendment",deedNumber:`AHU-004512${i}.AH.01.02.Tahun 2023`,deedDate:"2023-04-15",ministerialDecreeNumber:`SK-AHU-004512${i}.2023`,ministerialDecreeDate:"2023-04-18",remarkCategoryIds:["amendment-share-change","amendment-management-change"],remarkCategoryId:"amendment-share-change",remarks:"<ol><li>Peningkatan modal disetor perseroan menjadi Rp 25 Miliar sehubungan penambahan setoran modal.</li><li>Pengangkatan Hendra Pratama selaku Direktur Operasional menggantikan direksi sebelumnya.</li></ol>",source:"Input Legal",parties:{representative:"Hendra Pratama",notaryName:"Siti Rahmawati, S.H., M.Kn.",notaryLocation:"Jakarta Selatan"}},
 {id:`seed-deed-${i}-3`,type:"amendment",deedNumber:`AHU-009182${i}.AH.01.02.Tahun 2025`,deedDate:"2025-06-20",ministerialDecreeNumber:`SK-AHU-009182${i}.2025`,ministerialDecreeDate:"2025-06-22",remarkCategoryIds:["amendment-share-change","amendment-business-activity-change","amendment-articles-change"],remarkCategoryId:"amendment-share-change",remarks:"<ol><li>Penambahan pemegang saham baru PT Investama Mandiri dengan kepemilikan 20%.</li><li>Perluasan kegiatan usaha jasa pertambangan batubara dan mineral (KBLI 09900).</li><li>Perubahan Pasal 3 Anggaran Dasar mengenai maksud dan tujuan perseroan.</li></ol>",source:"Input Legal",parties:{representative:"Budi Santoso",notaryName:"H. Ahmad Fauzi, S.H., M.Kn.",notaryLocation:"Jakarta Selatan"}}
];
function initial(){
  return {
    customers: JSON.parse(JSON.stringify(SCENARIO_CUSTOMERS)),
    applications: JSON.parse(JSON.stringify(SCENARIO_APPLICATIONS)),
    user: null as any,
    events: [] as any[]
  };
}

const SEED_VERSION = 'v14_all_24_scenarios_complete';
const read = () => {
  try {
    const s = localStorage.getItem(key);
    const ver = localStorage.getItem('liugong-los-seed-ver');
    if (!s || ver !== SEED_VERSION) {
      const fresh = initial();
      try {
        localStorage.setItem(key, JSON.stringify(fresh));
        localStorage.setItem('liugong-los-seed-ver', SEED_VERSION);
      } catch {}
      return fresh;
    }
    const data = JSON.parse(s);
    return data;
  } catch {
    const fresh = initial();
    try {
      localStorage.setItem(key, JSON.stringify(fresh));
      localStorage.setItem('liugong-los-seed-ver', SEED_VERSION);
    } catch {}
    return fresh;
  }
};

const save=(s:any)=>{try{localStorage.setItem(key,JSON.stringify(s));}catch(e:any){if(e.name==='QuotaExceededError')throw Error('Penyimpanan browser demo penuh. Gunakan dokumen yang lebih kecil atau jalankan versi backend untuk file besar.');throw e;}};
const safeFile=(f:any)=>{const {demoBlob,demoPreview,demoData,...publicFile}=f;return publicFile;};
export async function demoApi(path:string,method='GET',body?:any):Promise<any>{validateWrite(path,method,body);
 const s=read(),parts=path.split('/').filter(Boolean);
 const normalizeUserId=(id:string)=>id==='demo-user-MKT'?'demo-user-mkt@liugong.local':id;
 if(s.user?.id==='demo-user-MKT'){s.user.id=normalizeUserId(s.user.id);for(const n of s.notifications||[])n.recipientUserId=normalizeUserId(n.recipientUserId);for(const a of s.applications)for(const d of a.legal?.deeds||[])if(d.review?.submittedById)d.review.submittedById=normalizeUserId(d.review.submittedById);save(s);}

 if(path==='/auth/login'&&method==='POST'){const alias=body?.email==='arianti@liugong.local'?['BS','Arianti']:body?.email==='dellatra@liugong.local'?['HEAD_BS','Dellatra']:null;const role=alias||roles.find((x:any)=>body?.email===x[0].toLowerCase()+'@liugong.local');if(!role||body?.password!=='LiuGong2026!')throw Error('Choose a sample department and use the demo password shown below.');s.user={id:'demo-user-'+body.email,name:alias?role[1]:role[1]+' Demo',email:body.email,role:role[0]};save(s);return copy(s.user);}
 if(path==='/auth/me'){if(!s.user)throw Error('Please sign in');return copy(s.user);}if(path==='/auth/logout'){for(const url of fileUrls.values())URL.revokeObjectURL(url);fileUrls.clear();s.user=null;save(s);return {ok:true};}if(!s.user)throw Error('Please sign in');

 if(path==='/notifications'&&method==='GET')return copy((s.notifications||[]).filter((n:any)=>n.recipientUserId===s.user.id));
 if(parts[0]==='notifications'&&parts[2]==='read'&&method==='PATCH'){const n=(s.notifications||[]).find((n:any)=>n.id===parts[1]&&n.recipientUserId===s.user.id);if(!n)throw Error('Notifikasi tidak ditemukan.');n.readAt=n.readAt||new Date().toISOString();save(s);return {ok:true};}
 
  if(path==='/demo/reset-scenarios'&&method==='POST'){
    const fresh = initial();
    try {
      localStorage.setItem(key, JSON.stringify(fresh));
      localStorage.setItem('liugong-los-seed-ver', SEED_VERSION);
    } catch {}
    return { ok: true, message: 'Seluruh 6 skenario dummy berhasil dimuat ulang dengan data lengkap!' };
  }
if(path==='/master-data'&&method==='GET'){
  const def=defaultMasterCatalog();
  if(!s.masterData){
    s.masterData=def;s.masterRevision=0;
    try{
      const old=JSON.parse(localStorage.getItem('liugong-los-remarks-master-v1')||'[]');
      if(Array.isArray(old))for(const row of old){
        const value=String(row.id||'').trim().slice(0,150),name=String(row.name||'').trim().slice(0,150);
        if(value&&name&&!s.masterData.remarkCategoryId.some((x:any)=>x.value===value||x.name.toLowerCase()===name.toLowerCase()))
          s.masterData.remarkCategoryId.push({value,name,active:true});
      }
    }catch{}
    save(s);
  } else {
    let touched=false;
    for(const k of ['district','village','postalCode'] as const){
      if(!s.masterData[k]||!Array.isArray(s.masterData[k])||s.masterData[k].length===0){
        s.masterData[k]=def[k];
        touched=true;
      }
    }
    if(touched)save(s);
  }
  return copy({catalog:s.masterData,revision:s.masterRevision||0});
}
 if(path==='/master-data'&&method==='PUT'){if(body.revision!==(s.masterRevision||0))throw Error('Master data telah berubah. Coba simpan kembali.');const catalog=validateMasterCatalog(body.catalog);s.masterData=catalog;s.masterRevision=(s.masterRevision||0)+1;save(s);return copy({catalog,revision:s.masterRevision});}
 if(path==='/customers'&&method==='GET')return copy(s.customers);
 if(path==='/customers'&&method==='POST'){const c={...body,id:generateUUID()};s.customers.push(c);save(s);return copy(c);}
 if(path==='/applications'&&method==='GET')return copy(s.applications.map((a:any)=>({...a,company_name:a.customer.companyName,company_type:a.customer.companyType,customer_id:a.customerId,fap_number:a.fapNumber,branch_code:a.branchCode,application_date:a.applicationDate,verified_docs:a.documentChecks.filter((d:any)=>d.status==='VERIFIED').length,total_docs:a.documentChecks.length,financing_value:a.proposal?.financingValue||0,tenor_months:a.proposal?.tenorMonths,financing_method:a.proposal?.financingMethod})));
 if(path==='/document-desk'&&method==='GET')return copy(s.applications.flatMap((a:any)=>a.documentChecks.map((d:any)=>({checklist_id:d.id,application_id:a.id,document_code:d.documentCode,document_name:d.documentName,assigned_role:d.assignedRole,is_mandatory:d.isMandatory,status:d.status,fap_number:a.fapNumber,company_name:a.customer.companyName,file_count:d.files?.length||0}))));
 if(path==='/applications'&&method==='POST'){const customer=s.customers.find((c:any)=>c.id===body.customerId);if(!customer)throw Error('Customer not found');const id=generateUUID(),idx=s.applications.length,a={...body,id,customer,legal:{deeds:sampleDeedsForApp(idx),selectedDeedId:`seed-deed-${idx}-1`},status:'DRAFT',fapNumber:nextFapNumber(s.applications),applicationDate:new Date().toISOString().slice(0,10),pic:null,stakeholders:[],projects:[],bankReferences:[],proposal:null,financialStatements:[],documentChecks:(s.masterData||defaultMasterCatalog()).documents.filter((d:any)=>d.active).map((d:any,j:number)=>({id:`${id}-doc-${j}`,applicationId:id,documentCode:d.value,documentName:d.name,assignedRole:d.role,isMandatory:d.required,status:'PENDING',checkedByMkt:false,checkedByBs:false,checkedByCa:false,checkedByLegal:false,registrationDate:null,expiredDate:null,dataSummary:'',notes:'',files:[]})),approvalLogs:[],signoffs:[],ratios:[],verified_docs:0,total_docs:10};s.applications.unshift(a);save(s);return copy(a);}
 if(parts[0]==='applications'&&parts[1]){const a=s.applications.find((x:any)=>x.id===parts[1]);if(!a)throw Error('Application not found');
  if(parts.length===2&&method==='GET'){const out=copy(a);out.documentChecks=out.documentChecks.map((d:any)=>({...d,files:d.files.map(safeFile)}));return out;}
   // Open draft save policy: draft saves do not block on incomplete fields or percentage sums

  if(parts[2]==='deeds'&&parts[4]==='draft'&&method==='PUT'){if(!canEditLegal(s.user,a))throw Error('Akun/tahap ini tidak dapat mengubah akta.');if(!['DRAFT','RETURNED'].includes(a.status)&&reviewStatus(a.legal?.deeds?.find((d:any)=>d.id===parts[3]))!=='REJECTED')throw Error('MKT hanya boleh memperbaiki akta yang ditolak.');a.legal=saveSingleDeed(a.legal||{},parts[3],body.deed);save(s);return copy(a);}
  if(parts[2]==='deeds'&&parts[4]==='review'&&method==='POST'){
   if(['APPROVED','REJECTED','CREDIT_COMMITTEE_REVIEW'].includes(a.status))throw Error('Approval akta terkunci pada tahap ini.');
   const deed=a.legal?.deeds?.find((d:any)=>d.id===parts[3]);if(!deed)throw Error('Simpan akta terlebih dahulu.');
   if(body.action==='SUBMIT'){if(!canEditLegal(s.user,a))throw Error('Akun/tahap ini tidak dapat mengajukan akta.');if(body.documentId&&!a.documentChecks.find((d:any)=>d.documentCode==='DEED')?.files.some((f:any)=>f.id===body.documentId))throw Error('Pilih dokumen akta dari aplikasi ini.');}
   const updated=deedTransition(deed,body.action,s.user,{...body,...(body.action==='SUBMIT'?{beforeSnapshot:deedBaseline(a.legal,deed)}:{})});a.legal.deeds=a.legal.deeds.map((d:any)=>d.id===deed.id?updated:d);
   if(['REJECT','APPROVE'].includes(body.action)){s.notifications=s.notifications||[];s.notifications.unshift({id:generateUUID(),recipientUserId:deed.review.submittedById,applicationId:a.id,deedId:deed.id,title:body.action==='REJECT'?'Akta ditolak — perlu diperbaiki':'Akta disetujui',message:`${a.fapNumber} · Akta ${deed.deedNumber} ${body.action==='REJECT'?'ditolak':'disetujui'} oleh ${s.user.name}.${body.comments?' Alasan: '+body.comments: ' Data sudah tampil di Stakeholders.'}`,createdAt:new Date().toISOString(),readAt:null});}
   a.approvalLogs.unshift({id:generateUUID(),applicationId:a.id,actionBy:s.user.name,userRole:s.user.role,previousStatus:a.status,newStatus:a.status,comments:`Akta ${deed.deedNumber} — ${body.action}${body.comments?': '+body.comments:''}`,actionTimestamp:new Date().toISOString()});save(s);return copy(a);
  }
 if(parts[2]==='stage'&&method==='PUT'){a.stage=body.stage;save(s);return copy(a);}
  if(parts[2]==='page-1'&&method==='PUT'){if(body.profile)for(const field of profileFields)if(field.key in body.profile)a[field.key]=copy(body.profile[field.key]);for(const k of ['pic','stakeholders','projects','bankReferences','proposal','stage'])if(k in body)a[k]=copy(body[k]);save(s);return copy(a);}
  if(parts[2]==='page-legal'&&method==='PUT'){if(!canEditLegal(s.user,a))throw Error('Akun/tahap ini tidak dapat mengubah akta.');const merged=mergeLegal(a.legal||{},body.legal);if(!['DRAFT','RETURNED'].includes(a.status))for(const d of merged.deeds){const old=(a.legal?.deeds||[]).find((x:any)=>x.id===d.id);if(!old||JSON.stringify(old)!==JSON.stringify(d)&&reviewStatus(old)!=='REJECTED')throw Error('MKT hanya boleh memperbaiki akta yang ditolak.');}a.legal=copy(merged);if(body.stakeholders)a.stakeholders=copy(body.stakeholders);save(s);return copy(a);}
  if(parts[2]==='page-2'&&method==='PUT'){if(body.proposal)a.proposal=copy(body.proposal);if(body.financialStatements)a.financialStatements=copy(body.financialStatements);save(s);return copy(a);}
  if(parts[2]==='checklist'&&parts[4]==='verify'&&method==='PATCH'){const d=a.documentChecks.find((x:any)=>x.id===parts[3]);if(!d)throw Error('Checklist item not found');const field:any={BS:'checkedByBs',CA:'checkedByCa',LEGAL:'checkedByLegal'};d[field[body.department]]=body.isVerified;if(body.department===d.assignedRole)d.status=body.isVerified?'VERIFIED':'REJECTED';Object.assign(d,{registrationDate:body.registrationDate,expiredDate:body.expiredDate,dataSummary:body.dataSummary,notes:body.notes});save(s);return copy(a);}
  if(parts[2]==='documents'&&parts[3]==='upload'&&method==='POST'){
    const file = body.get('file');
    const chkId = body.get('checklistId');
    const docCode = String(body.get('documentCode') || '').toUpperCase();
    if(!file) throw Error('Pilih berkas yang ingin diunggah.');
    
    let d = a.documentChecks.find((x:any)=>
      x.id===chkId || 
      (docCode && String(x.documentCode).toUpperCase()===docCode) ||
      (chkId && String(chkId).toUpperCase().includes(String(x.documentCode).toUpperCase()))
    );

    if(!d){
      const resolvedCode = docCode || (chkId && String(chkId).toUpperCase().includes('PREANALYSIS')?'PREANALYSIS':chkId && String(chkId).toUpperCase().includes('ICLF')?'ICLF':'FAP');
      const foundDef = docTypes.find((item:any)=>item[0]===resolvedCode) || docTypes[0];
      d = {
        id: chkId || `demo-doc-${a.id}-${foundDef[0]}`,
        documentCode: foundDef[0],
        documentName: foundDef[1],
        assignedRole: foundDef[2],
        isMandatory: true,
        status: 'PENDING',
        files: []
      };
      a.documentChecks.push(d);
    }

    if(file.size > 20*1024*1024) throw Error('Ukuran file maksimal 20 MB.');
    
    const demoData = await new Promise<string>((resolve, reject) => {
      if (typeof FileReader !== 'undefined') {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Gagal membaca file di browser.'));
        reader.readAsDataURL(file);
      } else {
        resolve('data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwgL0xlbmd0aCA1IDAgUiAvRmlsdGVyIC9GbGF0ZURlY29kZSA+PgpzdHJlYW0KeAErVAhUKC4pysxLVchPU0jLz0nVy81MLVbITyxJ1cvOz02tBAACrAy0CmVuZHN0cmVhbQplbmRvYmoK');
      }
    });

    const fileId = generateUUID();
    const newFile = {
      id: fileId,
      checklistId: d.id,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      uploadedBy: s.user ? s.user.name : 'User',
      uploadedAt: new Date().toISOString(),
      demoData
    };

    d.files = d.files || [];
    d.files.push(newFile);
    d.status = 'UPLOADED';
    save(s);
    return copy(newFile);
   }
   if(parts[2]==='documents'&&method==='DELETE'){if(!['MKT','BS','CA','LEGAL','COMMITTEE'].includes(s.user.role))throw Error('Akun ini tidak dapat menghapus dokumen.');const fileId=parts[3];const d=a.documentChecks.find((chk:any)=>chk.files?.some((f:any)=>f.id===fileId));if(!d)throw Error('Dokumen tidak ditemukan.');const isUsedByDeed=(a.legal?.deeds||[]).some((deed:any)=>deed.review?.documentId===fileId);if(isUsedByDeed)throw Error('Dokumen sedang digunakan oleh akta.');d.files=d.files.filter((f:any)=>f.id!==fileId);if(d.files.length===0){d.status='PENDING';d.checkedByMkt=d.checkedByBs=d.checkedByCa=d.checkedByLegal=false;}else{d.status='UPLOADED';d.checkedByBs=d.checkedByCa=d.checkedByLegal=false;}fileUrls.delete(fileId);save(s);return {success:true};}
  if(parts[2]==='transition'&&method==='POST'){const action=body.action,from=a.status,next:any={SUBMIT_TO_BS:'SUBMITTED_TO_BS',VERIFY_BS:'BS_VERIFIED',START_REVIEW:'IN_CA_LEGAL_REVIEW',APPROVE_COMMITTEE:'APPROVED',REJECT_COMMITTEE:'REJECTED'};if(action==='SUBMIT_TO_BS'&&(!a.pic||!a.proposal?.units?.length))throw Error('Complete PIC and add an equipment unit first.');if(action==='VERIFY_BS'&&a.documentChecks.some((d:any)=>d.isMandatory&&d.assignedRole==='BS'&&d.status!=='VERIFIED'))throw Error('Verify mandatory BS documents first.');if(action==='RETURN')a.status='RETURNED';else if(action==='RECOMMEND_CA'||action==='RECOMMEND_LEGAL'){const role=action==='RECOMMEND_CA'?'CA':'LEGAL';a.signoffs=a.signoffs.filter((x:any)=>x.role!==role);a.signoffs.push({role,actor:s.user.name,signed_at:new Date().toISOString()});if(a.signoffs.length===2)a.status='CREDIT_COMMITTEE_REVIEW';}else if(next[action])a.status=next[action];else throw Error('Unsupported demo action');a.approvalLogs.unshift({id:generateUUID(),applicationId:a.id,actionBy:s.user.name,userRole:s.user.role,previousStatus:from,newStatus:a.status,comments:body.comments||action,actionTimestamp:new Date().toISOString()});save(s);return copy(a);}
 }
 if(parts[0]==='files'&&parts[2]==='url'){
  const f=s.applications.flatMap((a:any)=>a.documentChecks.flatMap((d:any)=>d.files)).find((x:any)=>x.id===parts[1]);
  if(!f)throw Error('File not found');
  const sampleData = f.demoData || (f.mimeType?.startsWith('image/') ? KTP_SAMPLE_IMAGE : FAP_SAMPLE_PDF);
  if(!fileUrls.has(f.id)){
    const bytes=Uint8Array.from(atob(sampleData.split(',')[1]),c=>c.charCodeAt(0));
    fileUrls.set(f.id,URL.createObjectURL(new Blob([bytes],{type:f.mimeType || 'application/pdf'})));
  }
  return {url:fileUrls.get(f.id),expiresIn:900};
 }
 if(parts[0]==='applications'&&parts[2]==='document-events')return copy(s.events.filter((x:any)=>x.applicationId===parts[1]));
 throw Error('This action is not included in the public demo. Changes are saved only in this browser.');
}
