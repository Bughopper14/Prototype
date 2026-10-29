import {initializeApplicationDocuments,syncApplicationDocuments,readApplicationDocuments,readDocumentFile,uploadApplicationDocument,deleteApplicationDocumentFile,verifyApplicationDocument,getSubmitLock,saveFapComparison,syncSubmitLock,saveFapRemarks} from './mysql-documents';
import {syncLegacyDocumentChecklists,syncLegacyDocumentCatalog} from './legacy-document-sync';
import {initializeUsers,initializeAudit,findUser,publicUser,userCount,createUser} from './mysql-users';
import {mysqlActor} from './mysql-audit-context';
import {initializeLocation,locationCatalog,saveLocations} from './mysql-location';
import {initializeBusiness,saveBusiness} from './mysql-business';
import {initializeCustomerMasters,customerMasterCatalog,saveCustomerMasters} from './mysql-customer-masters';
import {initializeBusinessMasters,businessMasterCatalog,saveBusinessMasters} from './mysql-business-masters';
import {initializeLegalMasters,legalMasterCatalog,saveLegalMasters} from './mysql-legal-masters';
import {initializeFinanceMasters,financeMasterCatalog,saveFinanceMasters} from './mysql-finance-masters';
import {initializeEquipmentMasters,equipmentMasterCatalog,saveEquipmentMasters} from './mysql-equipment-masters';
import {initializeDocumentMasters,documentMasterCatalog,saveDocumentMasters} from './mysql-document-masters';
import {initializeFinancialStatements,saveFinancialStatements} from './mysql-financial-statements';
import {initPreAnalysisStore,getPreAnalysisData,savePreAnalysisData} from './pre-analysis-store';
import {mergeLegal,deedTransition,reviewStatus,deedBaseline,canEditLegal,saveSingleDeed} from '../src/deed-workflow';
import {validateWrite} from '../src/input-validation';
import {experienceFromEstablishmentDate} from '../src/experience';
import 'dotenv/config';
import express,{type Request,type Response,type NextFunction} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import zlib from 'node:zlib';
import {execFile} from 'node:child_process';
import util from 'node:util';
const execFileAsync=util.promisify(execFile);
import {z} from 'zod';
import {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {all,insert,update,replace,query,transaction,initialize,dataDir,decode,type Query} from './db';
import {seed} from './seed';
import {defaultMasterCatalog,validateMasterCatalog,type MasterCatalog} from '../src/master-catalog';
import {checkMysql,readMenu,writeMenu,pool} from './mysql-store';
import {initializeIntake,listIntake,intakeDetail,intakeCustomers,createIntake,saveCustomerPic,transitionIntake} from './mysql-intake';
import {initializeLegal,saveLegal,migrateStakeholderLocationNames} from './mysql-legal';
import {ensure,Problem,modelInput,validateStakeholders,validateFinancials,validateProposal,checklistTemplate,fapNumber,ratios,installment} from './domain';
await initialize();await seed();
await initializeUsers();
await initializeIntake();
await initializeLegal();
await initializeBusiness();
await initializeFinancialStatements();
await initializeLocation();
await migrateStakeholderLocationNames();
await query('INSERT INTO master_data(id,catalog) VALUES(1,$1) ON CONFLICT(id) DO NOTHING',[JSON.stringify(defaultMasterCatalog())]);
const initialCatalog=(await query('SELECT catalog FROM master_data WHERE id=1')).rows[0].catalog as MasterCatalog;
await initializeCustomerMasters({...defaultMasterCatalog(),...initialCatalog});
await initializeBusinessMasters({...defaultMasterCatalog(),...initialCatalog});
await initializeLegalMasters({...defaultMasterCatalog(),...initialCatalog});
await initializeFinanceMasters({...defaultMasterCatalog(),...initialCatalog});
await initializeEquipmentMasters({...defaultMasterCatalog(),...initialCatalog});
await initializeDocumentMasters({...defaultMasterCatalog(),...initialCatalog});
await initializeApplicationDocuments();
await initializeAudit();
await initPreAnalysisStore();
async function refreshDocuments(){if(!pool)return;const documents=(await documentMasterCatalog(defaultMasterCatalog())).documents;await syncApplicationDocuments();await syncLegacyDocumentChecklists(documents);await syncLegacyDocumentCatalog(documents);}
await refreshDocuments();
let cachedMasterData:{catalog:any,revision:number}|null=null;
let cachedMasterDataGzip:Buffer|null=null;
async function masterData(q:Query=query,forceRefresh=false){
  if(cachedMasterData&&!forceRefresh&&q===query)return cachedMasterData;
  const row=(await q('SELECT catalog,revision FROM master_data WHERE id=1')).rows[0];
  const def=defaultMasterCatalog();
  const merged:any={...def,...(row?.catalog||{})};
  for(const k of ['district','village','postalCode'] as const){
    merged[k] = merged[k] || [];
    const seen = new Set(merged[k].map((x:any)=>x.value));
    for(const item of (def as any)[k]||[]){
      if(!seen.has(item.value)){
        merged[k].push(item);
        seen.add(item.value);
      }
    }
  }
  const catalog=await locationCatalog(merged as MasterCatalog);
  const result={catalog:await documentMasterCatalog(await equipmentMasterCatalog(await financeMasterCatalog(await legalMasterCatalog(await businessMasterCatalog(await customerMasterCatalog(catalog)))))),revision:row?.revision||0};
  if(q===query)cachedMasterData=result;
  return result;
}
let secret=process.env.JWT_SECRET;
if(!secret){if(process.env.NODE_ENV==='production')throw new Error('JWT_SECRET is required in production');const file=path.join(dataDir,'session-secret');try{secret=await fs.readFile(file,'utf8');}catch{secret=crypto.randomBytes(48).toString('hex');await fs.writeFile(file,secret);}}
const jwtSecret=secret;
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'30mb'}));
const documentsDir = path.resolve('Documents');
fs.mkdir(documentsDir, { recursive: true }).catch(() => {});
for (const sub of ['ktp', 'npwp', 'nib', 'passport', 'kitas', 'akta', 'id_types']) {
  fs.mkdir(path.join(documentsDir, sub), { recursive: true }).catch(() => {});
}
app.use('/documents', express.static(documentsDir));
app.use('/pre_analysis', express.static(path.resolve('public/pre_analysis')));

function getPaddedDateParts(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return { dateStr: `${yyyy}${mm}${dd}`, timeStr: `${hh}${mi}${ss}`, fullStamp: `${yyyy}${mm}${dd}_${hh}${mi}${ss}` };
}

async function generateDocumentStorageInfo(docTypeRaw: string, appIdRaw: string, stakeholderIdRaw: string, originalName: string) {
  const docType = String(docTypeRaw || 'general').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'general';
  const cleanApp = String(appIdRaw || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '') || 'app';
  const cleanStk = String(stakeholderIdRaw || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const ext = (path.extname(originalName) || '.jpg').toLowerCase();
  const { fullStamp } = getPaddedDateParts();

  const typeDir = path.join(documentsDir, docType);
  await fs.mkdir(typeDir, { recursive: true });

  let baseName = `${docType}_${cleanApp}`;
  if (cleanStk && cleanStk !== cleanApp && cleanStk !== 'unknown') {
    baseName += `_${cleanStk}`;
  }
  baseName += `_${fullStamp}`;

  let fileName = `${baseName}${ext}`;
  let counter = 1;
  while (true) {
    try {
      await fs.access(path.join(typeDir, fileName));
      fileName = `${baseName}_${counter}${ext}`;
      counter++;
    } catch {
      break;
    }
  }

  const savedFilePath = path.join(typeDir, fileName);
  const relativePath = `Documents/${docType}/${fileName}`;
  const fileUrl = `/documents/${docType}/${fileName}`;

  return { docType, fileName, savedFilePath, relativePath, fileUrl, typeDir };
}

app.use((req,res,next)=>{
    if (req.url.startsWith('/crm-dashboard/api/')) {
      req.url = req.url.replace('/crm-dashboard/api/', '/api/');
    }
    if (req.url.startsWith('/los-dashboard/api/')) {
      req.url = req.url.replace('/los-dashboard/api/', '/api/');
    }
    if (req.url.startsWith('/crm/api/')) {
      req.url = req.url.replace('/crm/api/', '/api/');
    }
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    if(req.path.startsWith('/api'))res.setHeader('Cache-Control','no-store');
    if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin){
        try{
            const origin=new URL(req.headers.origin);
            const isLocal=origin.hostname==='localhost'||origin.hostname==='127.0.0.1'||origin.hostname.startsWith('192.168.')||origin.hostname.startsWith('10.')||origin.hostname.startsWith('172.');
            const isKnownPort=['8086','8087','5173','4174','3001','3002'].includes(origin.port);
            const isMiddleware=Boolean(req.headers['x-middleware-gateway']);
            if(!isMiddleware&&!isLocal&&!isKnownPort&&!['http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:4174','http://localhost:4174',`http://${req.headers.host}`,process.env.APP_ORIGIN].includes(origin.origin)){
                return next(new Problem(403,'Origin is not allowed'));
            }
        }catch(e){
            // Ignore URL parse error
        }
    }
    next();
});
type Actor={id:string,name:string,email:string,role:string,username?:string,isAdmin?:boolean,source?:string};
declare global{namespace Express{interface Request{actor:Actor}}}
const attempts=new Map<string,{count:number,until:number}>();
const session=(res:Response,actor:Actor)=>res.cookie('los_session',jwt.sign(actor,jwtSecret,{expiresIn:'8h',audience:'los-api'}),{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:28800000,path:'/'});
app.get('/api/v1/auth/setup',async(_req,res)=>res.json({needsSetup:await userCount()===0}));
app.post('/api/v1/auth/setup',async(req,res)=>{const actor=await createUser(req.body,true);session(res,actor);res.status(201).json(actor);});
app.post('/api/v1/auth/login',async(req,res)=>{const key=req.ip||'local',entry=attempts.get(key);ensure(!entry||entry.count<10||entry.until<Date.now(),'Too many login attempts. Try again in 15 minutes.',429);const body=z.object({email:z.string().optional(),username:z.string().optional(),password:z.string().min(1)}).parse(req.body);const login=(body.username||body.email||'').trim();ensure(login,'Enter username or email',422);const actual=await findUser(login);if(actual&&actual.is_active&&!actual.is_placeholder&&await bcrypt.compare(body.password,actual.password_hash)){attempts.delete(key);const actor=publicUser(actual);await mysqlActor.run(actual.user_id,async()=>{const {pool}=await import('./mysql-store');await pool!.execute('UPDATE crm_users SET last_login_at=CURRENT_TIMESTAMP(3) WHERE user_id=?',[actual.user_id]);});session(res,actor);return res.json(actor);}const pgUser=(await query('SELECT * FROM users WHERE email=$1',[login.toLowerCase()])).rows[0];if(pgUser&&await bcrypt.compare(body.password,pgUser.password_hash)){attempts.delete(key);const isAdmin=pgUser.role==='ADMIN'||pgUser.email==='admin@liugong.local'||pgUser.email==='axel@liugongfinance.com';const actor={id:pgUser.id,name:pgUser.name,email:pgUser.email,role:pgUser.role,isAdmin};session(res,actor);return res.json(actor);}attempts.set(key,{count:(entry&&entry.until>Date.now()?entry.count:0)+1,until:Date.now()+900000});throw new Problem(401,'Username/email or password is incorrect');});
app.post('/api/v1/auth/logout',(_req,res)=>{res.clearCookie('los_session',{path:'/'});res.json({ok:true});});
app.get('/api/v1/health',(_req,res)=>res.json({status:'ok'}));
app.get('/api/v1/mysql/health',async(_req,res)=>{await checkMysql();res.json({status:'ok',database:process.env.MYSQL_DATABASE});});
app.get('/api/v1/wilayah/reverse-lookup',async(req,res)=>{
  const {kelurahan,kecamatan,postalCode}=req.query as Record<string,string>;
  const clean=(s:any)=>String(s||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase();
  const cKec=clean(kecamatan),cKel=clean(kelurahan),cPos=clean(postalCode);
  if(!pool)return res.json({found:false});
  try{
    let row:any=null;
    if(cKec&&cKel){
      const [rows]:any=await pool.query(`
        SELECT v.id AS village_id, v.name AS village_name, v.postal_code,
               d.id AS district_id, d.name AS district_name,
               c.id AS city_id, c.name AS city_name,
               p.id AS province_id, p.name AS province_name
        FROM master_kelurahan_desa v
        JOIN master_kecamatan d ON v.kecamatan_id=d.id
        JOIN master_kabupaten_kota c ON d.kabupaten_kota_id=c.id
        JOIN master_provinsi p ON c.provinsi_id=p.id
        WHERE REPLACE(UPPER(d.name),' ','')=? AND REPLACE(UPPER(v.name),' ','')=?
        LIMIT 1
      `,[cKec,cKel]);
      if(rows&&rows.length>0)row=rows[0];
    }
    if(!row&&cPos&&cKec){
      const [rows]:any=await pool.query(`
        SELECT v.id AS village_id, v.name AS village_name, v.postal_code,
               d.id AS district_id, d.name AS district_name,
               c.id AS city_id, c.name AS city_name,
               p.id AS province_id, p.name AS province_name
        FROM master_kelurahan_desa v
        JOIN master_kecamatan d ON v.kecamatan_id=d.id
        JOIN master_kabupaten_kota c ON d.kabupaten_kota_id=c.id
        JOIN master_provinsi p ON c.provinsi_id=p.id
        WHERE v.postal_code=? AND REPLACE(UPPER(d.name),' ','')=?
        LIMIT 1
      `,[cPos,cKec]);
      if(rows&&rows.length>0)row=rows[0];
    }
    if(!row&&cPos){
      const [rows]:any=await pool.query(`
        SELECT v.id AS village_id, v.name AS village_name, v.postal_code,
               d.id AS district_id, d.name AS district_name,
               c.id AS city_id, c.name AS city_name,
               p.id AS province_id, p.name AS province_name
        FROM master_kelurahan_desa v
        JOIN master_kecamatan d ON v.kecamatan_id=d.id
        JOIN master_kabupaten_kota c ON d.kabupaten_kota_id=c.id
        JOIN master_provinsi p ON c.provinsi_id=p.id
        WHERE v.postal_code=?
        LIMIT 1
      `,[cPos]);
      if(rows&&rows.length>0)row=rows[0];
    }
    if(!row&&cKec){
      const [rows]:any=await pool.query(`
        SELECT NULL AS village_id, NULL AS village_name, NULL AS postal_code,
               d.id AS district_id, d.name AS district_name,
               c.id AS city_id, c.name AS city_name,
               p.id AS province_id, p.name AS province_name
        FROM master_kecamatan d
        JOIN master_kabupaten_kota c ON d.kabupaten_kota_id=c.id
        JOIN master_provinsi p ON c.provinsi_id=p.id
        WHERE REPLACE(UPPER(d.name),' ','')=?
        LIMIT 1
      `,[cKec]);
      if(rows&&rows.length>0)row=rows[0];
    }
    if(!row&&cKel){
      const [rows]:any=await pool.query(`
        SELECT v.id AS village_id, v.name AS village_name, v.postal_code,
               d.id AS district_id, d.name AS district_name,
               c.id AS city_id, c.name AS city_name,
               p.id AS province_id, p.name AS province_name
        FROM master_kelurahan_desa v
        JOIN master_kecamatan d ON v.kecamatan_id=d.id
        JOIN master_kabupaten_kota c ON d.kabupaten_kota_id=c.id
        JOIN master_provinsi p ON c.provinsi_id=p.id
        WHERE REPLACE(UPPER(v.name),' ','')=?
        LIMIT 1
      `,[cKel]);
      if(rows&&rows.length>0)row=rows[0];
    }
    if(row){
      return res.json({
        found:true,
        province:row.province_name,
        provinceId:row.province_id,
        city:row.city_name,
        cityRegency:row.city_name,
        cityId:row.city_id,
        district:row.district_name,
        districtId:row.district_id,
        village:row.village_name,
        villageId:row.village_id,
        postalCode:row.postal_code
      });
    }
    res.json({found:false});
  }catch(err:any){
    res.status(500).json({error:err.message||String(err)});
  }
});
app.use('/api',async(req,res,next)=>{try{const isOcrScan=req.path.startsWith('/v1/ocr/scan')||req.path.includes('fap-comparison');const token=(req.headers.cookie||'').split('; ').find(x=>x.startsWith('los_session='))?.slice(12);if(!token&&isOcrScan){req.actor={id:'ocr-scanner',name:'OCR Scanner',email:'system@los.local',role:'MKT',isAdmin:false} as any;return next();}ensure(token,'Please sign in',401);const decoded=jwt.verify(token,jwtSecret,{audience:'los-api'}) as Actor;const actual=['mysql','placeholder'].includes(decoded.source||'')?await findUser(decoded.id,true):null;const user=actual?publicUser(actual):decoded.source==='mysql'?null:(await query('SELECT id,name,email,role FROM users WHERE id=$1',[decoded.id])).rows[0];ensure(user&&(!actual||actual.is_active),'Session is no longer valid',401);const placeholder=pool?(!actual||!!actual.is_placeholder):false;req.actor=placeholder?{...user,source:'placeholder'}:user;if(decoded.role==='ADMIN'||(decoded as any).isAdmin||req.actor.email==='admin@liugong.local'||req.actor.email==='axel@liugongfinance.com'){req.actor.isAdmin=true;req.actor.role='ADMIN';}if(placeholder&&!['GET','HEAD','OPTIONS'].includes(req.method)&&!req.actor.isAdmin)throw new Problem(403,'Akun placeholder hanya untuk melihat. Perubahan memerlukan user MySQL aktif.');mysqlActor.run(placeholder?null:actual?.user_id||null,()=>next());}catch(e){next(e instanceof Problem?e:new Problem(401,'Session expired. Please sign in again.'));}});
app.get('/api/v1/users',async(req,res)=>{ensure(req.actor.isAdmin,'Only administrator can manage users',403);const {pool}=await import('./mysql-store');const [users]=await pool!.query<any[]>('SELECT * FROM crm_users ORDER BY created_at');res.json(users.map(publicUser));});
app.post('/api/v1/users',async(req,res)=>{ensure(req.actor.isAdmin,'Only administrator can manage users',403);res.status(201).json(await createUser(req.body));});
app.get('/api/v1/workspace-data/:menu',async(req,res)=>res.json(await readMenu(String(req.params.menu))));
app.post('/api/v1/workspace-data/:menu',async(req,res)=>res.status(201).json(await writeMenu(String(req.params.menu),req.body?.payload)));
app.post('/api/v1/intake/drafts',async(req,res)=>{ensure(req.actor.isAdmin||req.actor.role==='ADMIN'||req.actor.role==='MKT','Only Marketing can create a draft',403);if(req.body.customerCategory==='EXISTING'){const mysqlCustomers=await intakeCustomers(),seedCustomers=await all('Customer');ensure([...mysqlCustomers,...seedCustomers].some(c=>c.id===req.body.customerId),'Existing customer was not found',404);}res.status(201).json(await createIntake(req.body));});
app.get('/api/v1/applications/:id/pre-analysis',async(req,res)=>{const id=String(req.params.id);const appRecord=await intakeDetail(id)||(await detail(id).catch(()=>null));const data=await getPreAnalysisData(id,appRecord);res.json({success:true,data});});
app.put('/api/v1/applications/:id/pre-analysis',async(req,res)=>{const id=String(req.params.id);const data=req.body;await savePreAnalysisData(id,data);res.json({success:true,data});});
app.get('/api/v1/applications/:id',async(req,res,next)=>{const detail=await intakeDetail(String(req.params.id));if(detail)return res.json(detail);next();});
app.put('/api/v1/applications/:id/business',async(req,res)=>{const id=String(req.params.id);let a=await intakeDetail(id);const fallback=a?null:await detail(id);a=a||fallback;const marketing=(req.actor.isAdmin||req.actor.role==='ADMIN'||req.actor.role==='MKT')&&['DRAFT','RETURNED'].includes(a.status),finance=(req.actor.isAdmin||req.actor.role==='ADMIN'||req.actor.role==='CA')&&a.status==='IN_CA_LEGAL_REVIEW';ensure(req.actor.isAdmin||req.actor.role==='ADMIN'||marketing||finance,'Business information is locked at this workflow stage',403);if(fallback)await saveCustomerPic(id,{profile:fallback},fallback);await saveBusiness(id,{...req.body,...(finance?{projects:a.projects,bankReferences:a.bankReferences}:{})});res.json(await intakeDetail(id));});
async function checkIsPreAnalysis(id: string, existing?: any): Promise<boolean> {
  const a = existing || (await intakeDetail(id));
  if (!a) return false;
  if (a.stage === 'Pre-analysis' || ['SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW','APPROVED'].includes(a.status)) {
    return true;
  }
  try {
    const lock = await getSubmitLock(id);
    if (lock && lock.stage === 'PRE_ANALYSIS') return true;
  } catch {}
  return false;
}

app.put('/api/v1/applications/:id/page-1',async(req,res,next)=>{
  if(!req.body.profile&&!req.body.pic)return next();
  const id=String(req.params.id);
  const existing=await intakeDetail(id);
  if(!existing)return next();
  if (await checkIsPreAnalysis(id, existing)) {
    return res.status(403).json({ error: 'FAP Stage is locked because the application has advanced to Pre-analysis.' });
  }
  if(Array.isArray(req.body.projects)){try{await saveBusiness(id,{projects:req.body.projects});}catch(e:any){console.warn('saveBusiness projects error:',e);}}
  res.json(await saveCustomerPic(id,req.body));
});
app.put('/api/v1/applications/:id/stage',async(req,res)=>{const id=String(req.params.id);const stage=String(req.body.stage||'Pre-analysis');if(stage==='Pre-analysis'){try{const lock=await getSubmitLock(id);if(lock.isLocked){return res.status(403).json({error:'Tombol submit terkunci. Harap upload dokumen FAP terlebih dahulu pada tab Dokumen.'});}}catch{}}try{if(pool){const dbStage=stage==='Pre-analysis'?'PRE_ANALYSIS':'FAP_STAGE';await pool.query('UPDATE application_submit_lock SET stage=?, updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=?',[dbStage,id]);await pool.query('UPDATE applications SET stage=? WHERE id=?',[stage,id]);}}catch{}res.json({success:true,stage});});
app.put(['/api/v1/applications/:id/legal/draft','/api/v1/applications/:id/page-legal'],async(req,res,next)=>{
  const id=String(req.params.id);
  let a=await intakeDetail(id);
  if(!a)return next();
  if (await checkIsPreAnalysis(id, a)) {
    return res.status(403).json({ error: 'Legal data in FAP Stage is locked because the application has advanced to Pre-analysis.' });
  }
  ensure(canEditLegal(req.actor,a),'Legal information is locked at this workflow stage',403);
  const legalData=req.body.legal||(req.body.deeds?req.body:(Array.isArray(req.body)?{deeds:req.body}:{}));
  if(req.body.stakeholders&&Array.isArray(legalData?.deeds)){
    const selId=legalData.selectedDeedId||legalData.deeds[0]?.id;
    const targetDeed=legalData.deeds.find((d:any)=>d.id===selId)||legalData.deeds[0];
    if(targetDeed){
      targetDeed.stakeholders=req.body.stakeholders;
      targetDeed._stakeholdersPassed=true;
    }
  }
  await saveLegal(id,legalData,false);
  res.json(await intakeDetail(id));
});
app.use('/api/v1',(req,res,next)=>{try{validateWrite(req.path,req.method,req.body);next();}catch(e:any){next(new Problem(422,e.message));}});
const permit=(req:Request,roles:string[])=>ensure(req.actor.isAdmin||req.actor.role==='ADMIN'||roles.includes(req.actor.role),'Your role cannot perform this action',403);
async function application(id:string,q=query){const a=(await all('Application',{id},q))[0];ensure(a,'Application not found',404);return a;}
async function detail(id:string,q=query){const a=await application(id,q);a.legal=(await q('SELECT legal FROM applications WHERE id=$1',[id])).rows[0]?.legal||{};a.customer=(await all('Customer',{id:a.customerId},q))[0];a.pic=(await all('ApplicationPic',{applicationId:id},q))[0]||null;for(const [key,model] of Object.entries({stakeholders:'Stakeholder',projects:'ProjectContract',bankReferences:'BankReference',financialStatements:'FinancialStatement',documentChecks:'DocumentChecklist',approvalLogs:'ApprovalLog'}))a[key]=await all(model,{applicationId:id},q);a.proposal=(await all('FinancingProposal',{applicationId:id},q))[0]||null;if(a.proposal){a.proposal.units=await all('FinancingUnitItem',{proposalId:a.proposal.id},q);const timing=(await masterData(q)).catalog.paymentMethod.find((x:any)=>x.value===a.proposal.paymentMethod)?.timing;a.proposal.estimatedInstallment=installment({...a.proposal,paymentMethod:timing==='advance'?'In Advance':'In Arrear'});}for(const d of a.documentChecks)d.files=await all('DocumentFile',{checklistId:d.id},q);a.financialStatements.sort((x:any,y:any)=>x.fiscalYear-y.fiscalYear);a.ratios=a.financialStatements.map((r:any)=>({fiscalYear:r.fiscalYear,...ratios(r)}));a.approvalLogs.sort((x:any,y:any)=>new Date(y.actionTimestamp).getTime()-new Date(x.actionTimestamp).getTime());a.signoffs=(await q('SELECT * FROM review_signoffs WHERE application_id=$1',[id])).rows;return a;}
app.get('/api/v1/auth/me',(req,res)=>res.json(req.actor));
app.get('/api/v1/master-data',async(req,res)=>{
  const data=await masterData();
  const accept=req.headers['accept-encoding']||'';
  if(typeof accept==='string'&&accept.includes('gzip')){
    if(!cachedMasterDataGzip){
      cachedMasterDataGzip=zlib.gzipSync(Buffer.from(JSON.stringify(data),'utf-8'));
    }
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Content-Encoding','gzip');
    return res.send(cachedMasterDataGzip);
  }
  res.json(data);
});
app.put('/api/v1/master-data',async(req,res)=>{let catalog:MasterCatalog;try{catalog=validateMasterCatalog(req.body.catalog);}catch(e:any){throw new Problem(422,e.message);}const result=await transaction(async q=>{await q('SELECT id FROM master_data WHERE id=1 FOR UPDATE');const previous=await masterData(q,true);ensure(req.body.revision===previous.revision,'Master data telah berubah. Muat ulang lalu simpan kembali.',409);for(const [key,rows] of Object.entries(previous.catalog as Record<string,any[]>)){const values=new Set((rows||[]).map(x=>x.value));for(const row of (rows||[]))ensure(values.has(row.value),'Data lama harus dipertahankan. Gunakan status tidak aktif untuk menonaktifkan pilihan.');}if(pool){await saveLocations(catalog,previous.catalog);await saveCustomerMasters(catalog);await saveBusinessMasters(catalog);await saveLegalMasters(catalog);await saveFinanceMasters(catalog);await saveEquipmentMasters(catalog);await saveDocumentMasters(catalog);}await q('UPDATE master_data SET catalog=$1,revision=revision+1 WHERE id=1',[JSON.stringify(catalog)]);cachedMasterData=null;cachedMasterDataGzip=null;return masterData(q,true);});res.json(result);});
app.get('/api/v1/customers',async(_req,res)=>{const original=await all('Customer'),current=await intakeCustomers(),byIdentity=new Map<string,any>(),customers:any[]=[];for(const customer of [...original,...current]){const nib=String(customer.nib||'').replace(/\D/g,''),npwp=String(customer.npwp||'').replace(/\D/g,''),identity=nib&&npwp?`${nib}|${npwp}`:`id:${customer.id}`;const existing=byIdentity.get(identity);if(existing){const savedCreatedAt=existing.createdAt||existing.created_at;const savedFirstApp=existing.firstApplicationDate;Object.assign(existing,customer,{id:existing.id});if(savedCreatedAt&&!existing.createdAt)existing.createdAt=savedCreatedAt;if(savedFirstApp&&!existing.firstApplicationDate)existing.firstApplicationDate=savedFirstApp;}else{const row={...customer};if(!row.createdAt&&row.created_at)row.createdAt=row.created_at;byIdentity.set(identity,row);customers.push(row);}}res.json(customers);});
app.post('/api/v1/customers',async(req,res)=>{
  permit(req,['MKT']);
  const data=modelInput('Customer',req.body,['companyName','companyType','nib','npwp']);
  ensure(/^\d{13}$/.test(data.nib),'NIB must contain 13 digits');
  ensure(/^\d{15,16}$/.test(data.npwp.replace(/\D/g,'')),'NPWP must contain 15 or 16 digits');
  const existingRows = (await query(`SELECT * FROM "business_partner" WHERE "nib" = $1 OR "npwp" = $2`, [data.nib, data.npwp])).rows;
  let cust: any;
  if(existingRows.length > 0) {
    const existing = decode('Customer', existingRows[0]);
    cust = await update('Customer', existing.id, data);
  } else {
    cust = await insert('Customer',data);
  }
  if (pool) {
    try {
      await pool.execute(`
        INSERT INTO business_partner (id, company_name, company_type, nib, npwp)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE company_name=VALUES(company_name), company_type=VALUES(company_type), nib=VALUES(nib), npwp=VALUES(npwp)
      `, [cust.id, cust.companyName, cust.companyType, cust.nib, cust.npwp]);
    } catch (e) {
      console.warn('MySQL business_partner sync error:', e);
    }
  }
  res.status(200).json(cust);
});
app.get('/api/v1/applications',async(_req,res)=>{const current=await listIntake(),original=(await query(`SELECT a.*,c.company_name,c.company_type,(SELECT count(*)::integer FROM document_checklists d WHERE d.application_id=a.id AND d.status='VERIFIED') AS verified_docs,(SELECT count(*)::integer FROM document_checklists d WHERE d.application_id=a.id) AS total_docs,p.financing_value,p.tenor_months,p.financing_method FROM applications a JOIN business_partner c ON c.id=a.customer_id LEFT JOIN financing_proposals p ON p.application_id=a.id ORDER BY a.created_at DESC`)).rows;res.json([...current,...original.filter((row:any)=>!current.some((saved:any)=>saved.id===row.id))].sort((a:any,b:any)=>new Date(b.created_at||b.createdAt||0).getTime()-new Date(a.created_at||a.createdAt||0).getTime()));});
const appRequired=['branchCode','customerStatus','companyAddress','city','province','postalCode','phoneFax','email','mainBusiness','locationStatus','repaymentSource','industrySegment','businessRole'];
const defaultAppFields:Record<string,string>={branchCode:'JKT01',customerStatus:'NEW',companyAddress:'',city:'',province:'',postalCode:'',phoneFax:'',email:'',mainBusiness:'',locationStatus:'OWNED',repaymentSource:'Operating Cash Flow',industrySegment:'MINING',businessRole:'CONTRACTOR'};

async function getNextFapNumber(date = new Date()): Promise<string> {
  const year = date.getUTCFullYear();
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const romanMonth = romanMonths[date.getUTCMonth()];
  let maxN = 0;

  // 1. Scan PostgreSQL applications table
  try {
    const pgRows = (await query(`SELECT fap_number FROM applications WHERE fap_number LIKE $1`, [`%/AF/%/${year}`])).rows;
    for (const r of pgRows) {
      const match = /^(\d+)\/AF\//.exec(r.fap_number || '');
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxN) maxN = val;
      }
    }
  } catch (e) {
    console.warn('Error reading Postgres fap_numbers:', e);
  }

  // 2. Scan MySQL new_application_fap_stage table
  if (pool) {
    try {
      const [myRows]: any = await pool.query(
        `SELECT fap_registration_number FROM new_application_fap_stage WHERE fap_registration_number LIKE ?`,
        [`%/AF/%/${year}`]
      );
      for (const r of myRows) {
        const match = /^(\d+)\/AF\//.exec(r.fap_registration_number || '');
        if (match) {
          const val = parseInt(match[1], 10);
          if (val > maxN) maxN = val;
        }
      }
    } catch (e) {
      console.warn('Error reading MySQL fap numbers:', e);
    }
  }

  // 3. Scan PostgreSQL fap_sequences table
  try {
    const seqRow = (await query(`SELECT value FROM fap_sequences WHERE year=$1`, [year])).rows[0];
    if (seqRow && Number(seqRow.value) > maxN) {
      maxN = Number(seqRow.value);
    }
  } catch (e) {
    console.warn('Error reading fap_sequences:', e);
  }

  const nextVal = maxN + 1;

  // 4. Sync PostgreSQL fap_sequences
  try {
    await query(`
      INSERT INTO fap_sequences (year, value) VALUES ($1, $2)
      ON CONFLICT (year) DO UPDATE SET value = GREATEST(fap_sequences.value, EXCLUDED.value)
    `, [year, nextVal]);
  } catch (e) {
    console.warn('Error updating fap_sequences:', e);
  }

  return `${String(nextVal).padStart(3, '0')}/AF/${romanMonth}/${year}`;
}

app.post('/api/v1/applications',async(req,res)=>{
  permit(req,['MKT']);
  const safeInput={...defaultAppFields,...req.body};
  for(const k of appRequired){
    if(!safeInput[k] || String(safeInput[k]).trim()===''){
      safeInput[k]=defaultAppFields[k]||'';
    }
  }
  if (!safeInput.locationStatus || safeInput.locationStatus === '') safeInput.locationStatus = 'OWNED';
  if (!safeInput.repaymentSource || safeInput.repaymentSource === '') safeInput.repaymentSource = 'Operating Cash Flow';
  if (!safeInput.industrySegment || safeInput.industrySegment === '') safeInput.industrySegment = 'MINING';
  if (!safeInput.businessRole || safeInput.businessRole === '') safeInput.businessRole = 'CONTRACTOR';
  if (!safeInput.branchCode || safeInput.branchCode === '') safeInput.branchCode = 'JKT01';
  const body=modelInput('Application',safeInput,appRequired);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email||'').trim()))body.email='draft@liugong.local';
  z.string().email().parse(body.email);
  const customerId=z.string().uuid().parse(req.body.customerId);

  // Sync customer from MySQL to PostgreSQL if missing in PostgreSQL
  let existingCust = (await all('Customer',{id:customerId}))[0];
  if(!existingCust && pool){
    let custData: any = null;
    const [bpRows]: any = await pool.query('SELECT * FROM business_partner WHERE id=?', [customerId]);
    if (bpRows && bpRows.length > 0) {
      custData = bpRows[0];
    } else {
      const [fapRows]: any = await pool.query('SELECT * FROM new_application_fap_stage WHERE customer_id=?', [customerId]);
      if (fapRows && fapRows.length > 0) custData = fapRows[0];
    }
    if (custData) {
      const cType = String(custData.company_type || req.body.companyType || 'CORPORATE').toUpperCase();
      const safeType = ['CORPORATE','COMMERCIAL','MICRO','LIUGONG_USER'].includes(cType) ? cType : 'CORPORATE';
      const cNib = String(custData.nib || req.body.nib || '0000000000000').replace(/\D/g,'').slice(0, 13).padEnd(13, '0');
      const cNpwp = String(custData.npwp || req.body.npwp || '000000000000000').replace(/\D/g,'').slice(0, 20).padEnd(15, '0');
      await query(`
        INSERT INTO business_partner (id, company_name, company_type, nib, npwp, establishment_act_no, establishment_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          company_type = EXCLUDED.company_type,
          nib = EXCLUDED.nib,
          npwp = EXCLUDED.npwp,
          establishment_act_no = EXCLUDED.establishment_act_no,
          establishment_date = EXCLUDED.establishment_date
      `, [
        customerId,
        custData.company_name || req.body.companyName || 'Existing Customer',
        safeType,
        cNib,
        cNpwp,
        custData.establishment_act_no || req.body.establishmentActNo || null,
        custData.establishment_date ? new Date(custData.establishment_date).toISOString().slice(0, 10) : null
      ]);
      existingCust = (await all('Customer',{id:customerId}))[0];
    }
  }
  ensure(Boolean(existingCust),'Customer not found',404);

  const nextFapNo = await getNextFapNumber();
  const a=await transaction(async q=>{
    const a=await insert('Application',{...body,customerId,fapNumber:nextFapNo},q);
    for(const doc of (await masterData(q)).catalog.documents.filter((x:any)=>x.active))await insert('DocumentChecklist',{applicationId:a.id,documentCode:doc.value,documentName:doc.name,assignedRole:doc.role,isMandatory:doc.required},q);
    await insert('ApprovalLog',{applicationId:a.id,actionBy:req.actor.name,userRole:req.actor.role,previousStatus:'DRAFT',newStatus:'DRAFT',comments:'Application created'},q);
    return a;
  });
  if(pool){
    try{
      const custRows = (await query('SELECT * FROM "business_partner" WHERE id=$1',[customerId])).rows;
      const cust = custRows[0] || {};
      await createIntake({
        customerCategory: req.body.customerCategory || req.body.customerStatus || 'NEW',
        customerId,
        customer: {
          companyName: cust.company_name || req.body.companyName,
          companyType: cust.company_type || req.body.companyType || 'CORPORATE',
          nib: cust.nib || req.body.nib,
          npwp: cust.npwp || req.body.npwp,
          establishmentActNo: cust.establishment_act_no || req.body.establishmentActNo,
          establishmentDate: cust.establishment_date || req.body.establishmentDate,
          nibDate: cust.nib_date || req.body.nibDate
        },
        profile: {
          ...body,
          companyName: cust.company_name || req.body.companyName || safeInput.companyName
        }
      }, {
        id: a.id,
        fapNumber: a.fapNumber,
        status: a.status
      });
    }catch(err: any){
      console.error('CRITICAL: createIntake sync error:', err);
      throw new Problem(500, `Failed to save application to MySQL intake: ${err?.message || String(err)}`);
    }
  }
  res.status(201).json(a);
});
app.get('/api/v1/document-desk',async(_req,res)=>{const rows=await query("SELECT d.id AS checklist_id,d.application_id,d.document_code,d.document_name,d.assigned_role,d.is_mandatory,d.status,a.fap_number,c.company_name,(SELECT count(*)::integer FROM document_files f WHERE f.checklist_id=d.id) AS file_count FROM document_checklists d JOIN applications a ON a.id=d.application_id JOIN business_partner c ON c.id=a.customer_id ORDER BY CASE d.status WHEN 'REJECTED' THEN 0 WHEN 'PENDING' THEN 1 WHEN 'UPLOADED' THEN 2 ELSE 3 END,a.created_at DESC,d.document_name");res.json(rows.rows);});
app.get('/api/v1/applications/:id',async(req,res)=>res.json(await detail(String(req.params.id))));
const editable=(a:any,req:Request,ca=false)=>{if(req.actor?.isAdmin||req.actor?.role==='ADMIN')return;permit(req,ca?['MKT','CA']:['MKT']);ensure(req.actor.role==='CA'?a.status==='IN_CA_LEGAL_REVIEW':['DRAFT','RETURNED'].includes(a.status),'This application is locked at its current workflow stage',409);};
app.put('/api/v1/applications/:id/page-1',async(req,res)=>{const id=String(req.params.id);await transaction(async q=>{await q('SELECT id FROM applications WHERE id=$1 FOR UPDATE',[id]);const a=await application(id,q);editable(a,req);const body=req.body;
 if(body.profile){const safeProfile={...body.profile};for(const k of appRequired)if(safeProfile[k]===undefined||safeProfile[k]===null)safeProfile[k]=a[k]||defaultAppFields[k]||'';if(!safeProfile.latestDeedDate||String(safeProfile.latestDeedDate).trim()===''||String(safeProfile.latestDeedDate)==='null')safeProfile.latestDeedDate=null;if(!safeProfile.latestDeedNo||String(safeProfile.latestDeedNo).trim()==='')safeProfile.latestDeedNo=null;const data=modelInput('Application',safeProfile,appRequired);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email||'').trim()))data.email=a.email||'draft@liugong.local';z.string().email().parse(data.email);await update('Application',id,data,q);}
 if(body.customer&&a.customerId){const safeCust={...body.customer};if(!safeCust.establishmentDate||String(safeCust.establishmentDate).trim()===''||String(safeCust.establishmentDate)==='null')safeCust.establishmentDate=null;if(!safeCust.establishmentActNo||String(safeCust.establishmentActNo).trim()==='')safeCust.establishmentActNo=null;try{const custData=modelInput('Customer',safeCust,[]);await update('Customer',a.customerId,custData,q);}catch{}}
 if(body.pic){const hasPicContent=Object.values(body.pic).some(v=>v!==undefined&&v!==null&&String(v).trim()!==''&&String(v).trim()!=='-');if(hasPicContent){const safePic={picName:'',position:'',phone:'',email:'',currentAddress:'',city:'',province:'',postalCode:'',...body.pic};for(const k of ['picName','position','phone','email','currentAddress','city','province','postalCode'])if(safePic[k]===undefined||safePic[k]===null)safePic[k]=(safePic as any)[k]||'';if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(safePic.email||'').trim()))safePic.email='pic.draft@liugong.local';const p=modelInput('ApplicationPic',safePic,['picName','position','phone','email','currentAddress','city','province','postalCode']);z.string().email().parse(p.email);await replace('ApplicationPic','applicationId',id,[p],q);}}
  if(body.stakeholders){
    const rows=z.array(z.any()).max(100).parse(body.stakeholders).map(x=>{
      const safe = {
        email: x.email || 'shareholder@liugong.local',
        mobilePhone: x.mobilePhone || '08123456789',
        primaryCapital: x.primaryCapital !== undefined && x.primaryCapital !== null && x.primaryCapital !== '' ? x.primaryCapital : (x.shareAmount || 0),
        ...x
      };
      return modelInput('Stakeholder', safe, ['name','position','stakeholderType','nationalityType','idNumber','shareAmount','sharePercentage']);
    });
    if(rows.length)validateStakeholders(rows,true);
    await replace('Stakeholder','applicationId',id,rows,q);
    const d=(await all('DocumentChecklist',{applicationId:id,documentCode:'EKITAS'},q))[0];
    await update('DocumentChecklist',d.id,{isMandatory:rows.some(s=>s.stakeholderType==='INDIVIDUAL'&&s.nationalityType==='WNA')},q);
  }
 for(const [key,model,required] of [['projects','ProjectContract',['projectOwner','projectLocation','projectRole','contractStatus']],['bankReferences','BankReference',['bankOrFinInstitution','currency','creditFacility','monthlyInstallment','yearStarted','interestRate','paymentRecord','facilityStatus']]] as const)if(body[key])await replace(model,'applicationId',id,z.array(z.any()).max(100).parse(body[key]).map(x=>modelInput(model,x,[...required])),q);
 await insert('ApprovalLog',{applicationId:id,actionBy:req.actor.name,userRole:req.actor.role,previousStatus:a.status,newStatus:a.status,comments:'Profile and business information updated'},q);
 });res.json(await detail(id));});
app.put('/api/v1/applications/:id/page-2',async(req,res,next)=>{if(!req.body.financialStatements)return next();const id=String(req.params.id);const existing=await intakeDetail(id);if(!existing)return next();await saveFinancialStatements(id,req.body.financialStatements,req.actor.role);res.json(await intakeDetail(id));});
app.put('/api/v1/applications/:id/page-2',async(req,res)=>{const id=String(req.params.id);await transaction(async q=>{await q('SELECT id FROM applications WHERE id=$1 FOR UPDATE',[id]);const a=await application(id,q);editable(a,req,true);
 if(req.body.proposal){const p=modelInput('FinancingProposal',req.body.proposal,['facilityPurpose','financingMethod','currency','financingValue','downPaymentValue','interestRate','tenorMonths','paymentMethod']);const units=z.array(z.any()).max(100).parse(req.body.proposal.units).map(x=>modelInput('FinancingUnitItem',x,['brand','unitCategory','modelName','quantity','unitPrice','totalPrice']));validateProposal(p,units);let existing=(await all('FinancingProposal',{applicationId:id},q))[0];existing=existing?await update('FinancingProposal',existing.id,p,q):await insert('FinancingProposal',{...p,applicationId:id},q);await replace('FinancingUnitItem','proposalId',existing.id,units,q);}
 if(req.body.financialStatements){const rows=z.array(z.any()).max(3).parse(req.body.financialStatements).map(x=>modelInput('FinancialStatement',x,['fiscalYear','isAudited','currentAssets','nonCurrentAssets','totalAssets','currentLiabilities','nonCurrentLiabilities','totalLiabilities','equity','totalLiabAndEquity','revenue','grossMargin','operatingMargin','tax','netIncome']));validateFinancials(rows);await replace('FinancialStatement','applicationId',id,rows,q);}
 await q('DELETE FROM review_signoffs WHERE application_id=$1 AND role=$2',[id,'CA']);await insert('ApprovalLog',{applicationId:id,actionBy:req.actor.name,userRole:req.actor.role,previousStatus:a.status,newStatus:a.status,comments:'Financing and financial statements updated'},q);
 });res.json(await detail(id));});
app.put('/api/v1/applications/:id/page-legal',async(req,res)=>{const id=String(req.params.id);await transaction(async q=>{await q('SELECT id FROM applications WHERE id=$1 FOR UPDATE',[id]);const a=await application(id,q);a.legal=(await q('SELECT legal FROM applications WHERE id=$1',[id])).rows[0]?.legal||{};ensure(canEditLegal(req.actor,a),'Legal information is locked at this workflow stage',403);const parties=z.object({representative:z.string().max(1000).optional(),shareholder:z.string().max(1000).optional(),shareholders:z.array(z.string().max(1000)).max(100).optional(),companyShareholder:z.string().max(1000).optional()});const deed=z.object({id:z.string().max(100).optional(),type:z.enum(['establishment','amendment']).optional(),source:z.string().max(100).optional(),createdAt:z.string().optional(),deedNumber:z.string().max(1000).optional(),deedDate:z.string().nullable().optional(),ministerialDecreeNumber:z.string().max(1000).optional(),ministerialDecreeDate:z.string().nullable().optional(),remarks:z.string().max(10000).optional(),remarkCategoryId:z.string().max(150).optional(),remarkCategoryIds:z.array(z.string().max(150)).optional(),infoAdded:z.boolean().optional(),parties:parties.optional(),stakeholders:z.array(z.record(z.string(),z.any())).max(100).optional()});const legalInput=z.object({deeds:z.array(deed).max(100).optional(),hiddenDeedIds:z.array(z.string().max(100)).max(100).optional(),selectedDeedId:z.string().max(100).optional(),selectedDeed:z.enum(['establishment','amendment']).optional(),establishment:deed.optional(),amendment:deed.optional(),representative:z.string().max(1000).optional(),shareholder:z.string().max(1000).optional(),companyShareholder:z.string().max(1000).optional()}).parse(req.body.legal);const legal=mergeLegal(a.legal,legalInput);const today=new Date().toISOString().slice(0,10);for(const d of legal.deeds||[]){if(d.deedDate&&d.deedDate>today)throw new Problem(422,'Tanggal akta tidak boleh di masa depan.');if(d.ministerialDecreeDate&&d.ministerialDecreeDate>today)throw new Problem(422,'Tanggal SK tidak boleh di masa depan.');}if(!['DRAFT','RETURNED'].includes(a.status) && !(req.actor?.isAdmin || req.actor?.role === 'ADMIN')){for(const d of legal.deeds){const old=(a.legal.deeds||[]).find((x:any)=>x.id===d.id);ensure(old&&JSON.stringify(old)===JSON.stringify(d)||old&&reviewStatus(old)==='REJECTED','Pada tahap ini MKT hanya boleh memperbaiki akta yang ditolak.',409);}}  if(req.body.stakeholders){
    const rows=z.array(z.any()).max(100).parse(req.body.stakeholders).map(x=>{
      const safe = {
        email: x.email || 'shareholder@liugong.local',
        mobilePhone: x.mobilePhone || '08123456789',
        primaryCapital: x.primaryCapital !== undefined && x.primaryCapital !== null && x.primaryCapital !== '' ? x.primaryCapital : (x.shareAmount || 0),
        ...x
      };
      return modelInput('Stakeholder', safe, ['name','position','stakeholderType','nationalityType','idNumber','shareAmount','sharePercentage']);
    });
    if(rows.length)validateStakeholders(rows,false);
    await replace('Stakeholder','applicationId',id,rows,q);
    const d=(await all('DocumentChecklist',{applicationId:id,documentCode:'EKITAS'},q))[0];
    await update('DocumentChecklist',d.id,{isMandatory:rows.some(s=>s.stakeholderType==='INDIVIDUAL'&&s.nationalityType==='WNA')},q);
  }await q('UPDATE applications SET legal=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2',[JSON.stringify(legal),id]);await q('DELETE FROM review_signoffs WHERE application_id=$1 AND role=$2',[id,'LEGAL']);await insert('ApprovalLog',{applicationId:id,actionBy:req.actor.name,userRole:req.actor.role,previousStatus:a.status,newStatus:a.status,comments:'Legal information updated'},q);});res.json(await detail(id));});


let cachedMandatoryRules: any[] | null = null;
const getMandatoryHandler = async (_req: any, res: any) => {
  if (cachedMandatoryRules) {
    return res.json(cachedMandatoryRules);
  }
  if (!pool) return res.json([]);
  try {
    const [rows] = await pool.query<any[]>('SELECT id, section, field_key, field_label, mandatory FROM master_mandatory ORDER BY section, id');
    cachedMandatoryRules = rows;
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};
const putMandatoryHandler = async (req: any, res: any) => {
  if (!pool) return res.status(503).json({ error: 'MySQL is not configured' });
  try {
    const { id, section, fieldKey, field_key, mandatory } = req.body;
    const isMandatory = mandatory === 1 || mandatory === true || mandatory === '1' ? 1 : 0;
    if (id !== undefined && id !== null) {
      await pool.execute('UPDATE master_mandatory SET mandatory=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [isMandatory, id]);
    } else {
      const fKey = fieldKey || field_key;
      if (section && fKey) {
        await pool.execute('UPDATE master_mandatory SET mandatory=?, updated_at=CURRENT_TIMESTAMP WHERE section=? AND field_key=?', [isMandatory, section, fKey]);
      }
    }
    const [rows] = await pool.query<any[]>('SELECT id, section, field_key, field_label, mandatory FROM master_mandatory ORDER BY section, id');
    cachedMandatoryRules = rows;
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};
app.get('/api/v1/mandatory', getMandatoryHandler);
app.get('/api/v1/master-mandatory', getMandatoryHandler);
app.put('/api/v1/mandatory', putMandatoryHandler);
app.put('/api/v1/master-mandatory', putMandatoryHandler);

app.post('/api/v1/user-activity', async (req, res) => {
  try {
    const { action } = req.body || {};
    res.json({ ok: true, action });
  } catch {
    res.json({ ok: false });
  }
});

app.get('/api/v1/activity', async (_req, res) => {
  try {
    if (pool) {
      const [rows] = await pool.query<any[]>(`
        SELECT l.id, l.application_id AS applicationId, l.action_by AS actionBy,
               l.user_role AS userRole, l.previous_status AS previousStatus,
               l.new_status AS newStatus, l.comments, l.action_timestamp AS actionTimestamp,
               COALESCE(c.company_name, '') AS companyName
        FROM audit_logs l
        LEFT JOIN applications a ON a.id = l.application_id
        LEFT JOIN business_partner c ON c.id = a.customer_id
        ORDER BY l.action_timestamp DESC LIMIT 100
      `);
      if (rows && rows.length) return res.json(rows);
    }
    const rows = (await query('SELECT id, application_id AS "applicationId", action_by AS "actionBy", user_role AS "userRole", previous_status AS "previousStatus", new_status AS "newStatus", comments, action_timestamp AS "actionTimestamp" FROM approval_logs ORDER BY action_timestamp DESC LIMIT 100')).rows;
    res.json(rows);
  } catch {
    res.json([]);
  }
});

app.get('/api/v1/notifications',async(req,res)=>res.json((await query('SELECT id, application_id AS "applicationId", deed_id AS "deedId", title, message, read_at AS "readAt", created_at AS "createdAt" FROM notifications WHERE recipient_user_id=$1 ORDER BY created_at DESC LIMIT 200',[req.actor.id])).rows));
app.patch('/api/v1/notifications/:id/read',async(req,res)=>{const result=await query('UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND recipient_user_id=$2 RETURNING id',[req.params.id,req.actor.id]);ensure(result.rows.length,'Notifikasi tidak ditemukan.',404);res.json({ok:true});});
app.put('/api/v1/applications/:id/deeds/:deedId/draft',async(req,res)=>{const id=String(req.params.id),deedId=String(req.params.deedId);await transaction(async q=>{await q('SELECT id FROM applications WHERE id=$1 FOR UPDATE',[id]);const a=await application(id,q),legal=(await q('SELECT legal FROM applications WHERE id=$1',[id])).rows[0]?.legal||{};ensure(canEditLegal(req.actor,{...a,legal}),'Akun/tahap ini tidak dapat mengubah akta.',403);ensure(Boolean(req.actor?.isAdmin||req.actor?.role==='ADMIN')||['DRAFT','RETURNED'].includes(a.status)||reviewStatus((legal.deeds||[]).find((d:any)=>d.id===deedId))==='REJECTED','MKT hanya boleh memperbaiki akta yang ditolak.',409);const updated=saveSingleDeed(legal,deedId,req.body.deed);await q('UPDATE applications SET legal=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2',[JSON.stringify(updated),id]);await insert('ApprovalLog',{applicationId:id,actionBy:req.actor.name,userRole:req.actor.role,previousStatus:a.status,newStatus:a.status,comments:`Akta ${req.body.deed.deedNumber} saved for review`},q);});res.json(await detail(id));});
app.post('/api/v1/applications/:id/deeds/:deedId/review',async(req,res)=>{
 const id=String(req.params.id),deedId=String(req.params.deedId),body=z.object({action:z.enum(['SUBMIT','CHECK','APPROVE','REJECT']),revision:z.number().int().positive(),documentId:z.string().max(100).optional(),comments:z.string().trim().max(10000).default('')}).parse(req.body);
 await transaction(async q=>{await q('SELECT id FROM applications WHERE id=$1 FOR UPDATE',[id]);const a=await application(id,q),legal=(await q('SELECT legal FROM applications WHERE id=$1',[id])).rows[0]?.legal||{},deed=(legal.deeds||[]).find((d:any)=>d.id===deedId);ensure(deed,'Simpan akta terlebih dahulu sebelum mengajukan.',404);ensure(Boolean(req.actor?.isAdmin||req.actor?.role==='ADMIN')||!['APPROVED','REJECTED','CREDIT_COMMITTEE_REVIEW'].includes(a.status),'Approval akta terkunci pada tahap aplikasi ini.',409);
  if(body.action==='SUBMIT'){ensure(canEditLegal(req.actor,{...a,legal}),'Pengajuan akta tidak tersedia pada tahap ini.',403);if(body.documentId){const checklist=(await all('DocumentChecklist',{applicationId:id,documentCode:'DEED'},q))[0];ensure(checklist,'Checklist dokumen akta belum tersedia.');const file=(await all('DocumentFile',{id:body.documentId||'',checklistId:checklist.id},q))[0];ensure(file,'Pilih dokumen akta yang diupload pada aplikasi ini.');}}
  const updated=deedTransition(deed,body.action,req.actor,{...body,...(body.action==='SUBMIT'?{beforeSnapshot:deedBaseline(legal,deed)}:{})});legal.deeds=legal.deeds.map((d:any)=>d.id===deedId?updated:d);await q('UPDATE applications SET legal=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2',[JSON.stringify(legal),id]);
  if(body.action==='REJECT')await q('INSERT INTO notifications(recipient_user_id,application_id,deed_id,title,message) VALUES($1,$2,$3,$4,$5)',[deed.review.submittedById,id,deedId,'Akta ditolak — perlu diperbaiki',`${a.fapNumber} · Akta ${deed.deedNumber} ditolak oleh ${req.actor.name}. Alasan: ${body.comments}`]);
  if(body.action==='APPROVE')await q('INSERT INTO notifications(recipient_user_id,application_id,deed_id,title,message) VALUES($1,$2,$3,$4,$5)',[deed.review.submittedById,id,deedId,'Akta disetujui',`${a.fapNumber} · Akta ${deed.deedNumber} disetujui oleh ${req.actor.name}. Data shareholder sudah ditampilkan di Stakeholders.`]);
  await insert('ApprovalLog',{applicationId:id,actionBy:req.actor.name,userRole:req.actor.role,previousStatus:a.status,newStatus:a.status,comments:`Akta ${deed.deedNumber} — ${body.action}${body.comments?': '+body.comments:''}`},q);
 });res.json(await detail(id));
});
app.get('/api/v1/applications/:id/checklist',async(req,res)=>res.json((await intakeDetail(String(req.params.id))||await detail(String(req.params.id))).documentChecks));
const s3=process.env.S3_BUCKET?new S3Client({region:process.env.S3_REGION||'ap-southeast-1',endpoint:process.env.S3_ENDPOINT||undefined,forcePathStyle:!!process.env.S3_ENDPOINT,credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID||'',secretAccessKey:process.env.S3_SECRET_ACCESS_KEY||''}}):null;
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:20*1024*1024,files:1}});

const ongoingFapOcr = new Map<string, Promise<any>>();

export function computeFapDiffs(currentApp: any, extracted: any): Array<{ field: string; label: string; oldValue: string; newValue: string }> {
  const toIsoDate = (val: string) => {
    if (!val) return null;
    const s = String(val).trim();
    const mIso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (mIso) return `${mIso[1]}-${mIso[2].padStart(2, '0')}-${mIso[3].padStart(2, '0')}`;
    const mDmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (mDmy) return `${mDmy[3]}-${mDmy[2].padStart(2, '0')}-${mDmy[1].padStart(2, '0')}`;
    return null;
  };

  const diffs: Array<{ field: string; label: string; oldValue: string; newValue: string }> = [];
  const compareField = (key: string, label: string, oldVal: any, newVal: any, isNumber = false) => {
    const sNew = newVal !== undefined && newVal !== null ? String(newVal).trim() : '';
    const sOld = oldVal !== undefined && oldVal !== null ? String(oldVal).trim() : '';

    // If both are empty / blank, no difference
    if (!sNew && !sOld) return;

    if (isNumber) {
      if (key === 'experienceMonths' && ((sOld === '0' && !sNew) || (sNew === '0' && !sOld))) {
        return;
      }
      if (!sNew && sOld) {
        diffs.push({ field: key, label, oldValue: sOld, newValue: '— (Kosong di dokumen)' });
        return;
      }
      if (sNew && !sOld) {
        diffs.push({ field: key, label, oldValue: '—', newValue: sNew });
        return;
      }
      const nNew = Number(sNew.replace(/[^\d.-]/g, ''));
      const nOld = Number(sOld.replace(/[^\d.-]/g, ''));
      if (!isNaN(nNew) && !isNaN(nOld) && nNew === nOld) return;
    } else {
      const cleanNew = sNew.replace(/\s+/g, ' ').toUpperCase();
      const cleanOld = sOld.replace(/\s+/g, ' ').toUpperCase();
      if (cleanNew === cleanOld) return;

      // If one is empty and the other is not, it is a difference!
      if (!cleanNew && cleanOld) {
        diffs.push({ field: key, label, oldValue: sOld, newValue: '— (Kosong di dokumen)' });
        return;
      }
      if (cleanNew && !cleanOld) {
        diffs.push({ field: key, label, oldValue: '—', newValue: sNew });
        return;
      }

      // Date normalization (DD/MM/YYYY vs YYYY-MM-DD)
      if (key.toLowerCase().includes('date') || key.toLowerCase().includes('tanggal')) {
        const dNew = toIsoDate(sNew);
        const dOld = toIsoDate(sOld);
        if (dNew && dOld && dNew === dOld) return;
      }

      // NIB / NPWP digit comparison
      if (key === 'nib' || key === 'npwp') {
        const dNew = sNew.replace(/\D/g, '');
        const dOld = sOld.replace(/\D/g, '');
        if (dNew && dOld && dNew === dOld) return;
      }

      // Phone numbers digit comparison (e.g. 021-52998877 vs 02152998877)
      if (key === 'phoneFax' || key === 'picPhone' || key.toLowerCase().includes('phone')) {
        const dNew = sNew.replace(/\D/g, '');
        const dOld = sOld.replace(/\D/g, '');
        if (dNew && dOld && (dNew === dOld || dNew.endsWith(dOld) || dOld.endsWith(dNew))) return;
      }

      // Province normalization (e.g. Jawa Timu vs Jawa Timur)
      if (key.toLowerCase().includes('province') || key.toLowerCase().includes('provinsi')) {
        const normProv = (s: string) => s.replace(/\s+/g, ' ').replace(/TIMU\b/gi, 'TIMUR').trim().toUpperCase();
        if (normProv(sNew) === normProv(sOld)) return;
      }

      // Address normalization (Jl. vs JI. vs J1., whitespace, punctuation, Timu -> Timur)
      if (key.toLowerCase().includes('address') || key.toLowerCase().includes('alamat')) {
        const normAddr = (s: string) => s.replace(/\bJ[I1L]\.?\s*/gi, 'JL. ').replace(/TIMU\b/gi, 'TIMUR').replace(/[\s,.-]+/g, ' ').trim().toUpperCase();
        if (normAddr(sNew) === normAddr(sOld)) return;
      }

      // Deed numbers (ignore spaces & hyphens differences)
      if (key.toLowerCase().includes('deed') || key.toLowerCase().includes('act')) {
        const normDeed = (s: string) => s.replace(/[\s\-_/.]/g, '').toUpperCase();
        if (normDeed(sNew) === normDeed(sOld)) return;
      }

      // Facility Purpose normalization (Investasi vs Investment vs WORKING_CAPITAL)
      if (key.toLowerCase().includes('purpose') || key.toLowerCase().includes('tujuan')) {
        const normPurpose = (s: string) => {
          const u = s.toUpperCase();
          if (u.includes('INVEST')) return 'INVESTMENT';
          if (u.includes('MODAL') || u.includes('WORKING')) return 'WORKING_CAPITAL';
          return u;
        };
        if (normPurpose(sNew) === normPurpose(sOld)) return;
      }
    }

    diffs.push({
      field: key,
      label,
      oldValue: sOld || '—',
      newValue: sNew || '— (Kosong di dokumen)'
    });
  };

  compareField('companyName', 'Nama Perusahaan', currentApp.customer?.companyName || currentApp.companyName, extracted.companyName);
  compareField('nib', 'Nomor Induk Berusaha (NIB)', currentApp.customer?.nib || currentApp.nib, extracted.nib);
  compareField('npwp', 'NPWP Perusahaan', currentApp.customer?.npwp || currentApp.npwp, extracted.npwp);
  compareField('companyAddress', 'Alamat Perusahaan', currentApp.companyAddress || currentApp.customer?.companyAddress, extracted.companyAddress);
  compareField('rt', 'RT', currentApp.rt || currentApp.customer?.rt, extracted.rt);
  compareField('rw', 'RW', currentApp.rw || currentApp.customer?.rw, extracted.rw);
  compareField('city', 'Kota / Kabupaten', currentApp.city || currentApp.customer?.city, extracted.city);
  compareField('province', 'Provinsi', currentApp.province || currentApp.customer?.province, extracted.province);
  compareField('postalCode', 'Kode Pos', currentApp.postalCode || currentApp.customer?.postalCode, extracted.postalCode);
  compareField('phoneFax', 'Telepon / Fax', currentApp.phoneFax, extracted.phoneFax);
  compareField('email', 'Email Perusahaan', currentApp.email, extracted.email);
  compareField('website', 'Website Perusahaan', currentApp.website, extracted.website);
  compareField('mainBusiness', 'Bidang Usaha Utama', currentApp.mainBusiness, extracted.mainBusiness);
  compareField('establishmentActNo', 'Nomor Akta Pendirian', currentApp.establishmentActNo || currentApp.legal?.establishmentActNo, extracted.establishmentActNo);
  compareField('establishmentDate', 'Tanggal Akta Pendirian', currentApp.establishmentDate || currentApp.legal?.establishmentDate, extracted.establishmentDate);
  
  // Calculate system experience (fallback to establishmentDate)
  const estDateForExp = currentApp.establishmentDate || currentApp.customer?.establishmentDate || currentApp.legal?.establishmentDate;
  let sysExpYears: any = (currentApp.experienceYears !== undefined && currentApp.experienceYears !== null && currentApp.experienceYears !== '')
    ? currentApp.experienceYears
    : (currentApp.customer?.experienceYears !== undefined && currentApp.customer?.experienceYears !== null && currentApp.customer?.experienceYears !== '')
      ? currentApp.customer.experienceYears
      : '';
  let sysExpMonths: any = (currentApp.experienceMonths !== undefined && currentApp.experienceMonths !== null && currentApp.experienceMonths !== '')
    ? currentApp.experienceMonths
    : (currentApp.customer?.experienceMonths !== undefined && currentApp.customer?.experienceMonths !== null && currentApp.customer?.experienceMonths !== '')
      ? currentApp.customer.experienceMonths
      : '';
  if (sysExpYears === '' && estDateForExp) {
    const expCalc = experienceFromEstablishmentDate(estDateForExp);
    sysExpYears = expCalc.experienceYears;
    sysExpMonths = expCalc.experienceMonths;
  }

  // Calculate document experience (fallback to extracted.establishmentDate if not directly extracted)
  const docEstDate = extracted.establishmentDate;
  let docExpYears: any = (extracted.experienceYears !== undefined && extracted.experienceYears !== null && extracted.experienceYears !== '') ? extracted.experienceYears : '';
  let docExpMonths: any = (extracted.experienceMonths !== undefined && extracted.experienceMonths !== null && extracted.experienceMonths !== '') ? extracted.experienceMonths : '';
  if (docExpYears === '' && docEstDate) {
    const docCalc = experienceFromEstablishmentDate(docEstDate);
    docExpYears = docCalc.experienceYears;
    docExpMonths = docCalc.experienceMonths;
  }

  compareField('experienceYears', 'Pengalaman Usaha (Tahun)', sysExpYears, docExpYears, true);
  compareField('experienceMonths', 'Pengalaman Usaha (Bulan)', sysExpMonths, docExpMonths, true);
  
  compareField('latestDeedNo', 'Nomor Akta Perubahan Terakhir', currentApp.latestDeedNo || currentApp.legal?.latestDeedNo, extracted.latestDeedNo);
  compareField('latestDeedDate', 'Tanggal Akta Perubahan Terakhir', currentApp.latestDeedDate || currentApp.legal?.latestDeedDate, extracted.latestDeedDate);
  compareField('repaymentSource', 'Sumber Pengembalian', currentApp.repaymentSource, extracted.repaymentSource);
  compareField('locationStatus', 'Status Lokasi Usaha', currentApp.locationStatus, extracted.locationStatus);
  compareField('picName', 'Nama PIC', currentApp.pic?.picName || currentApp.pic?.name, extracted.picName);
  compareField('picPosition', 'Jabatan PIC', currentApp.pic?.position, extracted.picPosition);
  compareField('picPhone', 'No. HP / Telepon PIC', currentApp.pic?.phone || currentApp.pic?.mobilePhone, extracted.picPhone);
  compareField('picEmail', 'Email PIC', currentApp.pic?.email, extracted.picEmail);
  compareField('picAddress', 'Alamat Domisili PIC', currentApp.pic?.currentAddress || currentApp.pic?.address, extracted.picAddress);
  compareField('picCity', 'Kota PIC', currentApp.pic?.city, extracted.picCity);
  compareField('picProvince', 'Provinsi PIC', currentApp.pic?.province, extracted.picProvince);
  compareField('picPostalCode', 'Kode Pos PIC', currentApp.pic?.postalCode, extracted.picPostalCode);
  compareField('financingValue', 'Nilai Pembiayaan', currentApp.proposal?.financingValue, extracted.financingValue, true);
  compareField('downPaymentValue', 'Uang Muka (DP)', currentApp.proposal?.downPaymentValue, extracted.downPaymentValue, true);
  compareField('tenorMonths', 'Tenor (Bulan)', currentApp.proposal?.tenorMonths, extracted.tenorMonths, true);
  compareField('facilityPurpose', 'Tujuan Pembiayaan', currentApp.proposal?.facilityPurpose || currentApp.facilityPurpose || 'INVESTMENT', extracted.facilityPurpose);
  compareField('financingMethod', 'Metode Pembayaran', currentApp.proposal?.financingMethod, extracted.financingMethod);

  return diffs;
}

async function compareFapDocumentOcr(id: string, fileName: string, currentApp: any) {
  if (ongoingFapOcr.has(id)) {
    console.log('>>> compareFapDocumentOcr reusing in-flight promise for:', id);
    return await ongoingFapOcr.get(id);
  }

  const task = (async () => {
    console.log('>>> compareFapDocumentOcr called:', { id, fileName });
    try {
    const cliScript = [
      path.resolve(__dirname, 'ocr_cli.py'),
      path.resolve('server/ocr_cli.py'),
      path.resolve('prototype-src/server/ocr_cli.py')
    ].find(p => fsSync.existsSync(p)) || path.resolve('server/ocr_cli.py');
    const pyExe = [
      process.env.PYTHON_PATH,
      'C:/Users/reage/AppData/Local/Python/pythoncore-3.14-64/python.exe',
      'python'
    ].find(p => p && p.trim().length > 0) || 'python';
    
    const possibleDirs = [
      documentsDir,
      path.resolve('Documents'),
      path.resolve('prototype-src/Documents'),
      path.resolve('../LiugongApps_Clean/CRM_Dashboard/Documents'),
      path.resolve('LiugongApps_Clean/CRM_Dashboard/Documents')
    ];
    let docFilePath = '';
    for (const d of possibleDirs) {
      const p = path.join(d, path.basename(fileName));
      if (fsSync.existsSync(p) && fsSync.statSync(p).isFile()) {
        docFilePath = p;
        break;
      }
    }
    if (!docFilePath) {
      const clean = path.basename(fileName).split('_[')[0];
      for (const d of possibleDirs) {
        try {
          const files = await fs.readdir(d);
          const match = files.find(f => f.startsWith(clean) && fsSync.statSync(path.join(d, f)).isFile());
          if (match) {
            docFilePath = path.join(d, match);
            break;
          }
        } catch {}
      }
    }
    if (!docFilePath) {
      docFilePath = path.join(documentsDir, path.basename(fileName));
    }
    const { stdout } = await execFileAsync(pyExe, [cliScript, docFilePath, 'fap'], {
      timeout: 120000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
    });
    const jsonStart = stdout.indexOf('{');
    const jsonEnd = stdout.lastIndexOf('}');
    const ocrRes = jsonStart !== -1 && jsonEnd !== -1 ? JSON.parse(stdout.slice(jsonStart, jsonEnd + 1)) : JSON.parse(stdout.trim());
    const extracted = ocrRes.data || {};

    const diffs = computeFapDiffs(currentApp, extracted);

    const comparison = {
      isFap: true,
      hasDifferences: diffs.length > 0,
      diffs,
      extractedData: extracted,
      fileName,
      comparedAt: new Date().toISOString()
    };

    await saveFapComparison(id, comparison);
    return comparison;
  } catch (err: any) {
    console.warn('compareFapDocumentOcr error:', err);
    return null;
  }
  })();

  ongoingFapOcr.set(id, task);
  try {
    return await task;
  } finally {
    ongoingFapOcr.delete(id);
  }
}

app.post('/api/v1/applications/:id/documents/upload',upload.single('file'),async(req,res)=>{
  permit(req,['MKT','BS','CA','LEGAL','COMMITTEE']);
  const id=String(req.params.id);
  const file=req.file;
  ensure(file,'Choose a file');
  const actual=file.buffer.subarray(0,8);
  const valid=(file.mimetype==='application/pdf'&&actual.subarray(0,5).toString()==='%PDF-')||(file.mimetype==='image/png'&&actual.equals(Buffer.from([137,80,78,71,13,10,26,10])))||(file.mimetype==='image/jpeg'&&actual[0]===255&&actual[1]===216&&actual[2]===255);
  ensure(valid,'Upload a valid PDF, PNG or JPEG file');

  const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.png');
  const rawBase = path.basename(file.originalname, ext);
  const appHash = id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const cleanBase = rawBase.replace(/_[A-Z0-9]{6}_\d{8}_\d{4}$/i, '');
  const formattedFileName = `${cleanBase}_${appHash}_${dateStamp}${ext}`;

  if(await intakeDetail(id)){
    if (await checkIsPreAnalysis(id)) {
      const docs = await readApplicationDocuments(id);
      const targetCheck = docs.find(d => String(d.id) === String(req.body.checklistId));
      const isFap = targetCheck && (String(targetCheck.documentCode).toUpperCase() === 'FAP' || String(targetCheck.documentName).toLowerCase().includes('fap'));
      if (isFap) {
        return res.status(403).json({ error: 'FAP Stage documents are locked because the application has advanced to Pre-analysis.' });
      }
    }
    const result=await uploadApplicationDocument(id,String(req.body.checklistId),{...file,originalname:formattedFileName},req.actor.id,async key=>{
      if(s3)await s3.send(new PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:key,Body:file.buffer,ContentType:file.mimetype,ServerSideEncryption:'AES256'}));
      else{
        await fs.mkdir(path.join(dataDir,'files'),{recursive:true});
        await fs.writeFile(path.join(dataDir,'files',key),file.buffer);
        const docCopyPath = path.join(documentsDir, formattedFileName);
        await fs.writeFile(docCopyPath, file.buffer).catch(() => {});
        try {
          const crmDocPath = path.resolve('../LiugongApps_Clean/CRM_Dashboard/Documents', formattedFileName);
          await fs.mkdir(path.dirname(crmDocPath), { recursive: true }).catch(() => {});
          await fs.writeFile(crmDocPath, file.buffer).catch(() => {});
        } catch {}
      }
    });

    const isFap = String(req.body.checklistId || '').toUpperCase().includes('FAP') || 
                  String(req.body.documentCode || '').toUpperCase() === 'FAP';
    let fapComparison = null;
    if (isFap) {
      try {
        const currentApp = await intakeDetail(id);
        // Wait up to 25 seconds for comparison, otherwise continue in background so upload finishes promptly
        fapComparison = await Promise.race([
          compareFapDocumentOcr(id, formattedFileName, currentApp),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Comparison backgrounded')), 6000))
        ]);
      } catch (ocrErr: any) {
        console.log('[Upload] OCR comparison running in background:', ocrErr?.message);
        fapComparison = { isFap: true, status: 'processing', diffs: [] };
      }
    }

    return res.status(201).json({ ...result, fileName: formattedFileName, fapComparison });
  }
 const result=await transaction(async q=>{await q('SELECT id FROM applications WHERE id=$1 FOR UPDATE',[id]);const a=await application(id,q);ensure(!['APPROVED','REJECTED','CREDIT_COMMITTEE_REVIEW'].includes(a.status),'Documents are locked at this stage',409);const d=(await all('DocumentChecklist',{id:req.body.checklistId,applicationId:id},q))[0];ensure(d,'Checklist item not found',404);const key=crypto.randomUUID();if(s3)await s3.send(new PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:key,Body:file.buffer,ContentType:file.mimetype,ServerSideEncryption:'AES256'}));else{await fs.mkdir(path.join(dataDir,'files'),{recursive:true});await fs.writeFile(path.join(dataDir,'files',key),file.buffer);
    const docCopyPath = path.join(documentsDir, path.basename(file.originalname));
    await fs.writeFile(docCopyPath, file.buffer).catch(() => {});}
 const f=await insert('DocumentFile',{checklistId:d.id,fileName:path.basename(file.originalname),fileKey:key,fileSize:file.size,mimeType:file.mimetype,uploadedBy:req.actor.name},q);await update('DocumentChecklist',d.id,{status:'UPLOADED',checkedByMkt:true,checkedByBs:false,checkedByCa:false,checkedByLegal:false},q);await q('DELETE FROM review_signoffs WHERE application_id=$1',[id]);await q('INSERT INTO document_events(application_id,checklist_id,actor,action,details) VALUES($1,$2,$3,$4,$5)',[id,d.id,req.actor.name,'UPLOAD',JSON.stringify({fileName:f.fileName})]);return f;});res.status(201).json(result);});
app.post('/api/v1/ocr/scan',upload.single('file'),async(req,res)=>{
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'File tidak ditemukan' });
  const docType = String(req.body.doc_type || 'auto').toLowerCase();
  const stakeholderId = String(req.body.stakeholder_id || '').trim();
  const appId = String(req.body.application_id || req.body.app_id || 'APP').trim();

  const storageInfo = await generateDocumentStorageInfo(docType === 'auto' ? 'ktp' : docType, appId, stakeholderId, file.originalname);
  await fs.writeFile(storageInfo.savedFilePath, file.buffer);

  // Sync to LiugongApps_Clean/CRM_Dashboard/Documents as well if directory exists
  try {
    const crmDocPath = path.resolve('../LiugongApps_Clean/CRM_Dashboard', storageInfo.relativePath);
    await fs.mkdir(path.dirname(crmDocPath), { recursive: true }).catch(() => {});
    await fs.writeFile(crmDocPath, file.buffer).catch(() => {});
  } catch {}

  const tempFilePath = storageInfo.savedFilePath;

  try {
    const cliScript = path.resolve('server/ocr_cli.py');
    const pyExe = [
      process.env.PYTHON_PATH,
      'C:/Users/reage/AppData/Local/Python/pythoncore-3.14-64/python.exe',
      'python'
    ].find(p => p && p.trim().length > 0) || 'python';
    const { stdout } = await execFileAsync(pyExe, [cliScript, tempFilePath, docType], { timeout: 45000 });
    const jsonStart = stdout.indexOf('{');
    const jsonEnd = stdout.lastIndexOf('}');
    const result = jsonStart !== -1 && jsonEnd !== -1 ? JSON.parse(stdout.slice(jsonStart, jsonEnd + 1)) : JSON.parse(stdout.trim());
    
    const detectedType = (result.doc_type || storageInfo.docType).toLowerCase();
    result.fileName = storageInfo.fileName;
    result.file_name = storageInfo.fileName;
    result.filePath = storageInfo.relativePath;
    result.document_path = storageInfo.relativePath;
    result.fileUrl = storageInfo.fileUrl;

    if (pool && stakeholderId && ['ktp', 'npwp', 'passport', 'kitas'].includes(detectedType) && result.data) {
      try {
        const type = detectedType;
        const d = result.data;
        const rawJson = JSON.stringify(d);
        const [existing]: any = await pool.query(`SELECT id FROM \`${type}\` WHERE stakeholder_id=?`, [stakeholderId]);
        if (existing && existing.length > 0) {
          await pool.query(`UPDATE \`${type}\` SET file_name=?, document_path=?, raw_ocr_json=?, updated_at=NOW() WHERE stakeholder_id=?`, [storageInfo.fileName, storageInfo.relativePath, rawJson, stakeholderId]);
        } else {
          const id = crypto.randomUUID();
          await pool.query(`INSERT INTO \`${type}\` (id, stakeholder_id, file_name, document_path, raw_ocr_json, created_at, updated_at) VALUES (?,?,?,?,?,NOW(),NOW())`, [id, stakeholderId, storageInfo.fileName, storageInfo.relativePath, rawJson]);
        }
      } catch (dbErr) {
        console.warn('Auto save OCR metadata to DB error:', dbErr);
      }
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'OCR processing error: ' + (err.message || String(err)) });
  }
});



app.post('/api/v1/stakeholders/documents/save',async(req,res)=>{
  const {stakeholder_id,doc_type,data}=req.body||{};
  if(!stakeholder_id)return res.status(400).json({error:'stakeholder_id wajib diisi'});
  if(!pool)return res.status(503).json({error:'Database unavailable'});
  const type=String(doc_type||'ktp').toLowerCase();
  const rawJson=JSON.stringify(data||{});
  const fileName = data?.file_name || data?.fileName || null;
  const docPath = data?.document_path || data?.filePath || (fileName ? `Documents/${type}/${fileName}` : null);
  try{
    if(type==='ktp'){
      data.berlaku_hingga = 'SEUMUR HIDUP';
      const [existing]:any=await pool.query('SELECT id FROM ktp WHERE stakeholder_id=?',[stakeholder_id]);
      if(existing&&existing.length>0){
        await pool.query('UPDATE ktp SET nik=?,nama=?,tempat_lahir=?,tanggal_lahir=?,jenis_kelamin=?,golongan_darah=?,alamat=?,rt_rw=?,kel_desa=?,kecamatan=?,agama=?,status_perkawinan=?,pekerjaan=?,kewarganegaraan=?,berlaku_hingga=?,file_name=COALESCE(?,file_name),document_path=COALESCE(?,document_path),raw_ocr_json=?,updated_at=NOW() WHERE stakeholder_id=?',[data.nik||null,data.nama||null,data.tempat_lahir||null,data.tanggal_lahir||null,data.jenis_kelamin||null,data.golongan_darah||null,data.alamat||null,data.rt_rw||null,data.kel_desa||null,data.kecamatan||null,data.agama||null,data.status_perkawinan||null,data.pekerjaan||null,data.kewarganegaraan||null,'SEUMUR HIDUP',fileName,docPath,rawJson,stakeholder_id]);
      }else{
        const id=crypto.randomUUID();
        await pool.query('INSERT INTO ktp (id,stakeholder_id,nik,nama,tempat_lahir,tanggal_lahir,jenis_kelamin,golongan_darah,alamat,rt_rw,kel_desa,kecamatan,agama,status_perkawinan,pekerjaan,kewarganegaraan,berlaku_hingga,file_name,document_path,raw_ocr_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())',[id,stakeholder_id,data.nik||null,data.nama||null,data.tempat_lahir||null,data.tanggal_lahir||null,data.jenis_kelamin||null,data.golongan_darah||null,data.alamat||null,data.rt_rw||null,data.kel_desa||null,data.kecamatan||null,data.agama||null,data.status_perkawinan||null,data.pekerjaan||null,data.kewarganegaraan||null,'SEUMUR HIDUP',fileName,docPath,rawJson]);
      }
    }else if(type==='npwp'){
      const [existing]:any=await pool.query('SELECT id FROM npwp WHERE stakeholder_id=?',[stakeholder_id]);
      if(existing&&existing.length>0){
        await pool.query('UPDATE npwp SET npwp_number=?,raw_npwp=?,nama=?,nik=?,alamat=?,kelurahan_kecamatan=?,kota_provinsi=?,kpp=?,tanggal_terdaftar=?,file_name=COALESCE(?,file_name),document_path=COALESCE(?,document_path),raw_ocr_json=?,updated_at=NOW() WHERE stakeholder_id=?',[data.npwp_number||null,data.raw_npwp||null,data.nama||null,data.nik||null,data.alamat||null,data.kelurahan_kecamatan||null,data.kota_provinsi||null,data.kpp||null,data.tanggal_terdaftar||null,fileName,docPath,rawJson,stakeholder_id]);
      }else{
        const id=crypto.randomUUID();
        await pool.query('INSERT INTO npwp (id,stakeholder_id,npwp_number,raw_npwp,nama,nik,alamat,kelurahan_kecamatan,kota_provinsi,kpp,tanggal_terdaftar,file_name,document_path,raw_ocr_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())',[id,stakeholder_id,data.npwp_number||null,data.raw_npwp||null,data.nama||null,data.nik||null,data.alamat||null,data.kelurahan_kecamatan||null,data.kota_provinsi||null,data.kpp||null,data.tanggal_terdaftar||null,fileName,docPath,rawJson]);
      }
    }else if(type==='passport'){
      const [existing]:any=await pool.query('SELECT id FROM passport WHERE stakeholder_id=?',[stakeholder_id]);
      if(existing&&existing.length>0){
        await pool.query('UPDATE passport SET passport_number=?,country_code=?,country_name=?,nama=?,surname=?,given_names=?,nationality=?,tanggal_lahir=?,tempat_lahir=?,jenis_kelamin=?,tanggal_pengeluaran=?,tanggal_berlaku=?,kantor_penerbit=?,personal_id=?,file_name=COALESCE(?,file_name),document_path=COALESCE(?,document_path),raw_ocr_json=?,updated_at=NOW() WHERE stakeholder_id=?',[data.passport_number||null,data.country_code||null,data.country_name||null,data.nama||null,data.surname||null,data.given_names||null,data.nationality||null,data.tanggal_lahir||null,data.tempat_lahir||null,data.jenis_kelamin||null,data.tanggal_pengeluaran||null,data.tanggal_berlaku||null,data.kantor_penerbit||null,data.personal_id||null,fileName,docPath,rawJson,stakeholder_id]);
      }else{
        const id=crypto.randomUUID();
        await pool.query('INSERT INTO passport (id,stakeholder_id,passport_number,country_code,country_name,nama,surname,given_names,nationality,tanggal_lahir,tempat_lahir,jenis_kelamin,tanggal_pengeluaran,tanggal_berlaku,kantor_penerbit,personal_id,file_name,document_path,raw_ocr_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())',[id,stakeholder_id,data.passport_number||null,data.country_code||null,data.country_name||null,data.nama||null,data.surname||null,data.given_names||null,data.nationality||null,data.tanggal_lahir||null,data.tempat_lahir||null,data.jenis_kelamin||null,data.tanggal_pengeluaran||null,data.tanggal_berlaku||null,data.kantor_penerbit||null,data.personal_id||null,fileName,docPath,rawJson]);
      }
    }else if(type==='kitas'){
      const [existing]:any=await pool.query('SELECT id FROM kitas WHERE stakeholder_id=?',[stakeholder_id]);
      if(existing&&existing.length>0){
        await pool.query('UPDATE kitas SET niora=?,permit_number=?,nama=?,kewarganegaraan=?,tanggal_lahir=?,jenis_kelamin=?,berlaku_hingga=?,instansi_penerbit=?,alamat=?,file_name=COALESCE(?,file_name),document_path=COALESCE(?,document_path),raw_ocr_json=?,updated_at=NOW() WHERE stakeholder_id=?',[data.niora||null,data.permit_number||null,data.nama||null,data.kewarganegaraan||null,data.tanggal_lahir||null,data.jenis_kelamin||null,data.berlaku_hingga||null,data.instansi_penerbit||null,data.alamat||null,fileName,docPath,rawJson,stakeholder_id]);
      }else{
        const id=crypto.randomUUID();
        await pool.query('INSERT INTO kitas (id,stakeholder_id,niora,permit_number,nama,kewarganegaraan,tanggal_lahir,jenis_kelamin,berlaku_hingga,instansi_penerbit,alamat,file_name,document_path,raw_ocr_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())',[id,stakeholder_id,data.niora||null,data.permit_number||null,data.nama||null,data.kewarganegaraan||null,data.tanggal_lahir||null,data.jenis_kelamin||null,data.berlaku_hingga||null,data.instansi_penerbit||null,data.alamat||null,fileName,docPath,rawJson]);
      }
    }
    res.json({status:'saved',stakeholder_id,doc_type:type,file_name:fileName,document_path:docPath});
  }catch(err:any){
    res.status(500).json({error:'DB save error: '+(err.message||String(err))});
  }
});

app.get('/api/v1/stakeholders/documents/:docType/:stakeholderId',async(req,res)=>{
  const {docType,stakeholderId}=req.params;
  const type=String(docType||'ktp').toLowerCase();
  if(!['ktp','npwp','passport','kitas'].includes(type))return res.status(404).json({error:'Invalid doc type'});
  if(!pool)return res.status(503).json({error:'Database unavailable'});
  try{
    const [rows]:any=await pool.query(`SELECT * FROM \`${type}\` WHERE stakeholder_id=? ORDER BY updated_at DESC LIMIT 1`,[stakeholderId]);
    if(!rows||rows.length===0)return res.status(404).json({status:'not_found',data:null});
    const row = rows[0];
    const fileName = row.file_name || (row.document_path ? path.basename(row.document_path) : null);
    const fileUrl = row.document_path 
      ? (row.document_path.startsWith('/') ? row.document_path : `/${row.document_path.replace(/\\/g, '/')}`)
      : (fileName ? `/documents/${type}/${fileName}` : null);
    res.json({status:'success',data:{...row, file_name: fileName, fileName, fileUrl, filePath: row.document_path, document_path: row.document_path}});
  }catch(err:any){
    res.status(500).json({error:'DB query error: '+(err.message||String(err))});
  }
});

async function removeStoredDocument(key:string){
 if(s3)await s3.send(new DeleteObjectCommand({Bucket:process.env.S3_BUCKET,Key:key}));
 else await fs.rm(path.join(dataDir,'files',key),{force:true});
}

app.get('/api/v1/applications/:id/fap-comparison', async (req, res) => {
  const id = String(req.params.id);
  const docs = await readApplicationDocuments(id);
  const fapCheck = docs.find(d => String(d.documentCode).toUpperCase() === 'FAP' || String(d.documentName).toLowerCase().includes('fap'));
  if (!fapCheck || !fapCheck.files || fapCheck.files.length === 0) {
    return res.json({ status: 'success', comparison: null });
  }
  const lock = await getSubmitLock(id);
  let comp = lock.ocrComparison;
  const currentApp = await intakeDetail(id);
  if (!comp || !comp.extractedData || Object.keys(comp.extractedData).length === 0) {
    const file = fapCheck.files[fapCheck.files.length - 1];
    if (file && currentApp) {
      comp = await compareFapDocumentOcr(id, file.fileName, currentApp);
    }
  } else if (currentApp && comp.extractedData) {
    const freshDiffs = computeFapDiffs(currentApp, comp.extractedData);
    comp.diffs = freshDiffs;
    comp.hasDifferences = freshDiffs.length > 0;
    await saveFapComparison(id, comp);
  }
  if (!comp) {
    comp = { isFap: true, hasDifferences: false, diffs: [] };
  }
  comp.remarks = lock.remarks || comp.remarks || fapCheck.notes || '';
  res.json({ status: 'success', comparison: comp });
});

app.post('/api/v1/applications/:id/fap-comparison/remarks', async (req, res) => {
  permit(req, ['MKT', 'BS', 'CA', 'LEGAL', 'COMMITTEE']);
  const id = String(req.params.id);
  const remarks = String(req.body.remarks || '');
  await saveFapRemarks(id, remarks);
  const lock = await getSubmitLock(id);
  res.json({ success: true, remarks, comparison: lock.ocrComparison });
});

app.post('/api/v1/applications/:id/fap-comparison/run', async (req, res) => {
  console.log('>>> Route /api/v1/applications/:id/fap-comparison/run hit for id:', req.params.id);
  permit(req, ['MKT', 'BS', 'CA', 'LEGAL', 'COMMITTEE']);
  const id = String(req.params.id);
  const currentApp = await intakeDetail(id);
  if (!currentApp) return res.status(404).json({ error: 'Application not found' });
  const docs = await readApplicationDocuments(id);
  const fapCheck = docs.find(d => String(d.documentCode).toUpperCase() === 'FAP' || String(d.documentName).toLowerCase().includes('fap'));
  const file = fapCheck?.files?.[fapCheck.files.length - 1];
  if (!file) return res.status(400).json({ error: 'Belum ada dokumen FAP yang diunggah' });
  const comparison = await compareFapDocumentOcr(id, file.fileName, currentApp);
  res.json({ success: true, comparison });
});

app.post('/api/v1/applications/:id/fap-changes/approve', async (req, res) => {
  permit(req, ['MKT', 'BS', 'CA', 'LEGAL', 'COMMITTEE']);
  const id = String(req.params.id);
  const current = await intakeDetail(id);
  if (!current) return res.status(404).json({ error: 'Application not found' });

  // Per user specification: Approving FAP document does NOT modify system/database values.
  // All differences are documented in remarks.
  if (req.body?.remarks !== undefined) {
    await saveFapRemarks(id, String(req.body.remarks || ''));
  }
  const lock = await getSubmitLock(id);
  const existingComp = lock.ocrComparison || {};
  await saveFapComparison(id, {
    ...existingComp,
    isFap: true,
    hasDifferences: false,
    diffs: []
  });
  await syncSubmitLock(id);
  if (pool) {
    try {
      await pool.query("UPDATE application_submit_lock SET stage='PRE_ANALYSIS', is_locked=0, updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=?", [id]);
    } catch (e) {
      console.warn('Update stage to PRE_ANALYSIS error:', e);
    }
  }

  const updated = await intakeDetail(id);
  res.json({ success: true, application: updated, customerDetailLocked: true });
});

app.post('/api/v1/applications/:id/fap-changes/dismiss', async (req, res) => {
  const id = String(req.params.id);
  if (req.body?.remarks !== undefined) {
    await saveFapRemarks(id, String(req.body.remarks || ''));
  }
  const lock = await getSubmitLock(id);
  const existingComp = lock.ocrComparison || {};
  await saveFapComparison(id, {
    ...existingComp,
    isFap: true,
    hasDifferences: false,
    diffs: []
  });
  await syncSubmitLock(id);
  res.json({ success: true });
});

app.delete(['/api/v1/applications/:id/documents/files/:fileId', '/api/v1/applications/:id/documents/:fileId'],async(req,res)=>{
 permit(req,['MKT','BS','CA','LEGAL','COMMITTEE']);
 const id=String(req.params.id),fileId=String(req.params.fileId);
 if(await intakeDetail(id)){
  if (await checkIsPreAnalysis(id)) {
    const docs = await readApplicationDocuments(id);
    const fapCheck = docs.find(d => String(d.documentCode).toUpperCase() === 'FAP' || String(d.documentName).toLowerCase().includes('fap'));
    if (fapCheck && fapCheck.files?.some((f: any) => String(f.id) === fileId)) {
      return res.status(403).json({ error: 'FAP Stage documents are locked because the application has advanced to Pre-analysis.' });
    }
  }
  await deleteApplicationDocumentFile(id,fileId,removeStoredDocument);
  const docs = await readApplicationDocuments(id);
  const fapCheck = docs.find(d => String(d.documentCode).toUpperCase() === 'FAP' || String(d.documentName).toLowerCase().includes('fap'));
  if (!fapCheck || !fapCheck.files || fapCheck.files.length === 0) {
    await saveFapComparison(id, null);
  }
  return res.json(await intakeDetail(id));
 }
 await transaction(async q=>{
  await q('SELECT id FROM applications WHERE id=$1 FOR UPDATE',[id]);
  const a=await application(id,q);
  ensure(!['APPROVED','REJECTED','CREDIT_COMMITTEE_REVIEW'].includes(a.status),'Documents are locked at this stage',409);
  const f=(await all('DocumentFile',{id:fileId},q))[0];
  ensure(f,'File not found',404);
  const d=(await all('DocumentChecklist',{id:f.checklistId,applicationId:id},q))[0];
  ensure(d,'File not found in this application',404);
  await q('DELETE FROM document_files WHERE id=$1',[fileId]);
  const remaining=(await all('DocumentFile',{checklistId:d.id},q)).length;
  await update('DocumentChecklist',d.id,{status:remaining?'UPLOADED':'PENDING',checkedByMkt:!!remaining,checkedByBs:false,checkedByCa:false,checkedByLegal:false,registrationDate:null,expiredDate:null,dataSummary:null,notes:null},q);
  await q('DELETE FROM review_signoffs WHERE application_id=$1',[id]);
  await q('INSERT INTO document_events(application_id,checklist_id,actor,action,details) VALUES($1,$2,$3,$4,$5)',[id,d.id,req.actor.name,'DELETE_FILE',JSON.stringify({fileId,fileName:f.fileName})]);
  await removeStoredDocument(f.fileKey);
  if ((String(d.documentCode).toUpperCase() === 'FAP' || String(d.documentName).toLowerCase().includes('fap')) && !remaining) {
    await saveFapComparison(id, null);
  }
 });
 res.json(await detail(id));
});
app.patch('/api/v1/applications/:id/checklist/:checklistId/verify',async(req,res)=>{permit(req,['BS','CA','LEGAL']);const body=z.object({department:z.enum(['BS','CA','LEGAL']),isVerified:z.boolean(),registrationDate:z.string().date().nullable().optional(),expiredDate:z.string().date().nullable().optional(),dataSummary:z.string().max(10000).optional(),notes:z.string().max(10000).optional()}).parse(req.body);const isAdmin=Boolean(req.actor?.isAdmin||req.actor?.role==='ADMIN');if(!isAdmin)ensure(body.department===req.actor.role,'Cannot verify for another department',403);const id=String(req.params.id);if(await intakeDetail(id)){await verifyApplicationDocument(id,String(req.params.checklistId),body);return res.json(await intakeDetail(id));}await transaction(async q=>{await q('SELECT id FROM applications WHERE id=$1 FOR UPDATE',[id]);const a=await application(id,q);if(!isAdmin)ensure(req.actor.role==='BS'?a.status==='SUBMITTED_TO_BS':a.status==='IN_CA_LEGAL_REVIEW','Verification is unavailable at this workflow stage',409);const d=(await all('DocumentChecklist',{id:String(req.params.checklistId),applicationId:id},q))[0];ensure(d,'Checklist item not found',404);ensure((await all('DocumentFile',{checklistId:d.id},q)).length,'Upload a document before verification');if(body.isVerified&&body.expiredDate)ensure(body.expiredDate>=new Date().toISOString().slice(0,10),'An expired document cannot be verified');if(body.expiredDate&&body.registrationDate)ensure(body.expiredDate>=body.registrationDate,'Expiry must follow registration');const key={BS:'checkedByBs',CA:'checkedByCa',LEGAL:'checkedByLegal'}[body.department];const updated:any={...body,[key]:body.isVerified};if(body.department===d.assignedRole)updated.status=body.isVerified?'VERIFIED':'REJECTED';await update('DocumentChecklist',d.id,updated,q);await q('DELETE FROM review_signoffs WHERE application_id=$1 AND role=$2',[id,req.actor.role]);await q('INSERT INTO document_events(application_id,checklist_id,actor,action,details) VALUES($1,$2,$3,$4,$5)',[id,d.id,req.actor.name,body.isVerified?'VERIFY':'REJECT',JSON.stringify(body)]);});res.json(await detail(id));});
app.get('/api/v1/files/:id/url',async(req,res)=>{const f=await readDocumentFile(String(req.params.id))||(await all('DocumentFile',{id:String(req.params.id)}))[0];ensure(f,'File not found',404);const url=s3?await getSignedUrl(s3,new GetObjectCommand({Bucket:process.env.S3_BUCKET,Key:f.fileKey,ResponseContentDisposition:'inline'}),{expiresIn:900}):`/api/v1/files/${f.id}/content?token=${jwt.sign({fileId:f.id,userId:req.actor.id},jwtSecret,{expiresIn:'15m',audience:'los-file'})}`;res.json({url,expiresIn:900});});
app.get('/api/v1/files/:id/content',async(req,res)=>{let token:any;try{token=jwt.verify(String(req.query.token),jwtSecret,{audience:'los-file'});}catch{throw new Problem(403,'Document link has expired');}ensure(token.fileId===req.params.id&&token.userId===req.actor.id,'Invalid document link',403);const f=await readDocumentFile(String(req.params.id))||(await all('DocumentFile',{id:String(req.params.id)}))[0];ensure(f,'File not found',404);res.setHeader('Content-Type',f.mimeType);res.setHeader('Content-Disposition',`inline; filename*=UTF-8''${encodeURIComponent(f.fileName)}`);res.sendFile(path.join(dataDir,'files',f.fileKey),{dotfiles:'allow'});});
app.get('/api/v1/applications/:id/document-events',async(req,res)=>{await application(String(req.params.id));res.json((await query('SELECT * FROM document_events WHERE application_id=$1 ORDER BY created_at DESC',[req.params.id])).rows);});
app.post('/api/v1/applications/:id/transition',async(req,res)=>{const id=String(req.params.id);const {action,comments}=z.object({action:z.enum(['SUBMIT_TO_BS','VERIFY_BS','START_REVIEW','RECOMMEND_CA','RECOMMEND_LEGAL','APPROVE_COMMITTEE','REJECT_COMMITTEE','RETURN']),comments:z.string().trim().max(10000).default('')}).parse(req.body);
 if(await intakeDetail(id)){
  const updated=await transitionIntake(id,action,req.actor,comments);
  return res.json(updated);
 }
 await transaction(async q=>{await q('SELECT id FROM applications WHERE id=$1 FOR UPDATE',[id]);const a=await detail(id,q);let status=a.status;
 const docs=(role?:string)=>a.documentChecks.filter((d:any)=>d.isMandatory&&(role?d.assignedRole===role:['BS','CA','LEGAL'].includes(d.assignedRole)));
 const verified=(role?:string)=>{const missing=docs(role).filter((d:any)=>d.status!=='VERIFIED'||(d.expiredDate&&new Date(d.expiredDate).toISOString().slice(0,10)<new Date().toISOString().slice(0,10)));ensure(!missing.length,`Verify required documents: ${missing.map((d:any)=>d.documentName).join(', ')}`);};
 if(action==='SUBMIT_TO_BS'){permit(req,['MKT']);ensure(['DRAFT','RETURNED'].includes(status),'Only draft or returned applications can be submitted',409);ensure(a.pic,'Complete the contact information');validateStakeholders(a.stakeholders);ensure(a.proposal,'Complete financing proposal');validateProposal(a.proposal,a.proposal.units);validateFinancials(a.financialStatements,true);const missing=docs().filter((d:any)=>d.documentCode!=='LEGAL_OPINION'&&!d.files.length);ensure(!missing.length,`Upload required documents: ${missing.map((d:any)=>d.documentName).join(', ')}`);status='SUBMITTED_TO_BS';}
 if(action==='VERIFY_BS'){permit(req,['BS']);ensure(status==='SUBMITTED_TO_BS','Application must be submitted to BS',409);verified('BS');status='BS_VERIFIED';}
 if(action==='START_REVIEW'){permit(req,['BS']);ensure(status==='BS_VERIFIED','BS verification is required',409);status='IN_CA_LEGAL_REVIEW';}
 if(action==='RECOMMEND_CA'||action==='RECOMMEND_LEGAL'){const role=action==='RECOMMEND_CA'?'CA':'LEGAL';permit(req,[role]);ensure(status==='IN_CA_LEGAL_REVIEW','Application must be in CA & Legal review',409);verified(role);if(role==='CA')validateFinancials(a.financialStatements,true);await q('INSERT INTO review_signoffs(application_id,role,actor) VALUES($1,$2,$3) ON CONFLICT(application_id,role) DO UPDATE SET actor=excluded.actor,signed_at=now()',[id,role,req.actor.name]);const signs=(await q('SELECT * FROM review_signoffs WHERE application_id=$1',[id])).rows;if(signs.length===2){verified();status='CREDIT_COMMITTEE_REVIEW';}}
 if(action==='APPROVE_COMMITTEE'||action==='REJECT_COMMITTEE'){permit(req,['COMMITTEE']);ensure(status==='CREDIT_COMMITTEE_REVIEW','Application must be at credit committee',409);if(action==='APPROVE_COMMITTEE')verified();else ensure(comments,'Provide a reason for rejection');status=action==='APPROVE_COMMITTEE'?'APPROVED':'REJECTED';}
 if(action==='RETURN'){permit(req,['BS','CA','LEGAL','COMMITTEE']);const allowed:Record<string,string[]>={BS:['SUBMITTED_TO_BS','BS_VERIFIED'],CA:['IN_CA_LEGAL_REVIEW'],LEGAL:['IN_CA_LEGAL_REVIEW'],COMMITTEE:['CREDIT_COMMITTEE_REVIEW'],ADMIN:['SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW']};ensure((allowed[req.actor.role]||[]).includes(status),'Cannot return from this workflow stage',409);ensure(comments,'Provide a reason for returning the application');await q('DELETE FROM review_signoffs WHERE application_id=$1',[id]);status='RETURNED';}
 await update('Application',id,{status},q);await insert('ApprovalLog',{applicationId:id,actionBy:req.actor.name,userRole:req.actor.role,previousStatus:a.status,newStatus:status,comments:comments||action.replaceAll('_',' ')},q);
 });res.json(await detail(id));});
app.use('/api',(_req,_res,next)=>next(new Problem(404,'Endpoint not found')));
app.use('/crm-dashboard',express.static(path.resolve('dist-dashboard')));app.get('/crm-dashboard/{*path}',(_req,res)=>res.sendFile(path.resolve('dist-dashboard/index.html')));
app.use('/crm',express.static(path.resolve('dist')));app.use(express.static(path.resolve('dist')));app.get('/crm/{*path}',(_req,res)=>res.sendFile(path.resolve('dist/index.html')));app.get('/{*path}',(_req,res)=>res.sendFile(path.resolve('dist/index.html')));
app.use((error:any,req:Request,res:Response,_next:NextFunction)=>{
  console.error('API Handled Error:', error.code, error.message, error.detail, error);
  let status=error.status||500,message=error.message,errors=error.errors||[];if(error instanceof z.ZodError){status=422;message='Validation failed';errors=error.issues.map(x=>({field:x.path.join('.'),detail:x.message}));}else if(error.code==='ER_DUP_ENTRY'){status=409;message='Username/email atau data unik sudah digunakan';}else if(error.code==='23505'){status=409;message='A record with these unique details already exists';}else if(['23514','23502','22001','22003','22007','22P02'].includes(error.code)){status=422;message='One or more fields contain an invalid value';}else if(error.code==='23503'){status=422;message='Referenced record was not found';}else if(error instanceof multer.MulterError){status=422;message=error.code==='LIMIT_FILE_SIZE'?'File exceeds the 20 MB limit':error.message;}if(status>=500){console.error(error);message='An unexpected server error occurred';}res.status(status).type('application/problem+json').json({type:'about:blank',title:message,status,statusCode:status,error:status===422?'Unprocessable Entity':message,message,errors,timestamp:new Date().toISOString()});});
const port=Number(process.env.PORT||3001);app.listen(port,'0.0.0.0',()=>console.log(`LiuGong API running at http://0.0.0.0:${port}`));



