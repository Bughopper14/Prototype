import { Editor } from '@tinymce/tinymce-react';
import {createPortal} from 'react-dom';
import {DeedReviewDialog,NotificationsPage} from './deed-review-ui';
import {publishedDeeds,reviewStatus,deedPending,deedReviewLabels,canEditLegal,deedData} from './deed-workflow';
import {inputLimits,fieldInputError,validateInput} from './input-validation';
import {useEffect,useState,useRef,useMemo,type ReactNode} from 'react';
import {ScanLine,Eye,Copy,Sparkles,ArrowUpRight,ArrowRight,ArrowLeft,Plus,Search,Bell,LayoutDashboard,Files,FolderCheck,Users,Activity,Settings2,ChevronRight,ChevronLeft,ChevronDown,Download,Building2,MoreHorizontal,Pencil,Check,CheckCheck,Clock,FileText,ShieldCheck,LogOut,BriefcaseBusiness,Wallet,TrendingUp,AlertCircle,AlertTriangle,X,Upload,UploadCloud,RefreshCw,RotateCw,ZoomIn,ZoomOut,ExternalLink,Save,Trash2,Menu,Loader2,Columns,FileSpreadsheet,Lock,Printer,CheckCircle,Maximize2,Minimize2,Globe,CreditCard} from 'lucide-react';
import {NibOcrModal} from './NibOcrModal';
import {FapSheetPreview, printFapDocument, type FapSheetData} from './FapSheetPreview';
import {
  parseKtpText, 
  extractKtpTextFromImage, 
  extractPassportTextFromImage,
  extractNpwpTextFromImage,
  extractKitasTextFromImage,
  normalizeBirthDate,
  splitPersonName,
  resolveGender,
  type ParsedKtpData,
  type ParsedPassportData,
  type ParsedNpwpData,
  type ParsedKitasData
} from './ktp-ocr';
import {api} from './api';
import {MasterDataPage,MasterSelect,useMasterData,setMasterData,resetMasterChildren,useMandatoryRules,isFieldMandatory,resolveWilayahUpwards} from './master-data';
import {masterGroups,masterKey} from './master-catalog';
import {type Field,profileFields,customerFields,picFields,stakeholderFields,projectFields,bankFields,proposalFields,unitFields,financialFields,legalDeedFields,legalPartyFields,blank,label} from './fields';
const statusLabel:Record<string,string>={DRAFT:'Draft',SUBMITTED_TO_BS:'BS verification',BS_VERIFIED:'BS verified',IN_CA_LEGAL_REVIEW:'CA & Legal review',CREDIT_COMMITTEE_REVIEW:'Committee review',APPROVED:'Approved',REJECTED:'Rejected',RETURNED:'Returned'};
const money=(n:any,compact=false)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'IDR',maximumFractionDigits:0,...(compact?{notation:'compact' as const}:{})}).format(Number(n)||0).replace('IDR','Rp');
const date=(d:any)=>d?new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
export function calculateAgeYearsMonths(dobString?:string|null):{years:number,months:number}{
  if(!dobString)return{years:0,months:0};
  const normalized = normalizeBirthDate(dobString) || String(dobString).slice(0,10);
  const parts=normalized.split('-').map(Number);
  if(parts.length!==3||parts.some(n=>isNaN(n)||n===0))return{years:0,months:0};
  const [y,m,d]=parts;
  const dob=new Date(y,m-1,d);
  if(isNaN(dob.getTime())) return {years:0,months:0};
  const today=new Date();
  let years=today.getFullYear()-dob.getFullYear();
  let months=today.getMonth()-dob.getMonth();
  if(today.getDate()<dob.getDate()){months--;}
  if(months<0){years--;months+=12;}
  return{years:Math.max(0,years),months:Math.max(0,months)};
}
/** Derive synced deed fields from legal.deeds list.
 *  - establishmentActNo / establishmentDate  → from establishment deed (type='establishment')
 *  - latestDeedNo / latestDeedDate           → from latest deed (most recent amendment, or establishment if no amendment)
 *  - experienceYears / experienceMonths       → today - establishmentDate
 */
export function deriveDeedSync(legal:any, application?:any):{
  establishmentActNo:string, establishmentDate:string,
  latestDeedNo:string, latestDeedDate:string,
  experienceYears:number, experienceMonths:number
}{
  const deeds:any[] = Array.isArray(legal?.deeds) ? legal.deeds : [];
  // establishment deed
  const estDeed = deeds.find((d:any)=>d.type==='establishment');
  const estActNo   = estDeed?.deedNumber  || application?.customer?.establishmentActNo || '';
  const estDateRaw = estDeed?.deedDate    || application?.customer?.establishmentDate  || '';
  const estDate    = String(estDateRaw||'').slice(0,10);
  // latest deed: most recent amendment by deedDate, fallback to establishment
  const amendments = deeds.filter((d:any)=>d.type==='amendment' && d.deedDate);
  const latestAmendment = amendments.sort((a:any,b:any)=>String(b.deedDate).localeCompare(String(a.deedDate)))[0];
  const latestDeed = latestAmendment || estDeed;
  const latestNo   = latestDeed?.deedNumber || application?.latestDeedNo || '';
  const latestDate = String(latestDeed?.deedDate||'').slice(0,10) || application?.latestDeedDate || '';
  // experience from establishment date
  const {years, months} = calculateAgeYearsMonths(estDate);
  return {
    establishmentActNo: estActNo,
    establishmentDate: estDate,
    latestDeedNo: latestNo,
    latestDeedDate: latestDate,
    experienceYears: years,
    experienceMonths: months,
  };
}
function deedValidity(deedDate:any){if(!deedDate)return {status:'Date not filled',active:null,expiry:null};const parts=String(deedDate).slice(0,10).split('-').map(Number);if(parts.length!==3||parts.some(x=>!x))return {status:'Date not filled',active:null,expiry:null};const expiry=new Date(parts[0],parts[1]-1,parts[2]);if(Number.isNaN(expiry.getTime()))return {status:'Date not filled',active:null,expiry:null};expiry.setFullYear(expiry.getFullYear()+5);const today=new Date();today.setHours(0,0,0,0);expiry.setHours(0,0,0,0);const active=today<=expiry;return {status:active?'Active':'Inactive',active,expiry};}
function Badge({status}:{status:string}){return <span className={'badge '+status?.toLowerCase()}><i/>{statusLabel[status]||label(status)}</span>;}
function IconBox({children}:{children:ReactNode}){return <span className="iconbox">{children}</span>;}
function Fields({fields,value,onChange,disabled=false,className,section,onSelectOption,onFieldFocus,onNibOcr}:{fields:Field[],value:any,onChange:(v:any)=>void,disabled?:boolean,className?:string,section?:string,onSelectOption?:(k:string,v:string)=>void,onFieldFocus?:(k:string)=>void,onNibOcr?:()=>void}){
  const master=useMasterData();
  const mandatoryRules=useMandatoryRules();
  return <div className={`formgrid ${className||''}`}>{fields.map(f=>{
    const isRequired=isFieldMandatory(mandatoryRules,section,f.key,f.required);
    const fieldValue=f.type==='date'?String(value?.[f.key]||'').slice(0,10):value?.[f.key]??'';
    const isDigitsOnly=['phone','mobilePhone','phoneFax','rt','rw'].includes(f.key);
    const isLettersOnly=['repaymentSource'].includes(f.key);
    const isTitleCaseField=['projectLocation'].includes(f.key);
    const isAgeField=['ageYears','ageMonths','experienceYears','experienceMonths'].includes(f.key);
    const isFieldDisabled=disabled||isAgeField;
    const ageStyle=isAgeField?{backgroundColor:'#f1f5f9',cursor:'not-allowed',color:'#64748b'}:undefined;
    const update=(raw:string)=>{
      if(isAgeField)return;
      const clean=isDigitsOnly?raw.replace(/\D/g,''):isLettersOnly?raw.replace(/\d/g,''):raw;
      const sanitized=['rt','rw'].includes(f.key)?clean.slice(0,3):clean;
      let next=resetMasterChildren(f.key,{...value,[f.key]:f.type==='number'?sanitized:f.type==='date'?(sanitized||null):sanitized},fields.map(x=>x.key));
      if(f.key==='village'&&fields.some(x=>x.key==='postalCode'))next.postalCode=master.village.find(x=>x.value===sanitized)?.zipCode||'';
      if(f.key==='dateOfBirth'&&fields.some(x=>x.key==='ageYears'||x.key==='ageMonths')){
        const{years,months}=calculateAgeYearsMonths(sanitized);
        next.ageYears=years;
        next.ageMonths=months;
      }
      if(['district','village','postalCode'].includes(f.key)){
        next=resolveWilayahUpwards(next,master);
      }
      onChange(next);
    };
    const fieldError=fieldInputError(f.key,fieldValue);
    const isMaster=masterGroups.some(g=>g.key===masterKey(f.key));
    const handleKeyDown=isDigitsOnly?(e:React.KeyboardEvent<HTMLInputElement>)=>{
      if(e.ctrlKey||e.metaKey||['Backspace','Tab','Enter','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete','Home','End'].includes(e.key))return;
      if(!/^\d$/.test(e.key))e.preventDefault();
    }:isLettersOnly?(e:React.KeyboardEvent<HTMLInputElement>)=>{
      if(e.ctrlKey||e.metaKey||['Backspace','Tab','Enter','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete','Home','End'].includes(e.key))return;
      if(/^\d$/.test(e.key))e.preventDefault();
    }:undefined;
    const handleInputChange=(e:React.ChangeEvent<HTMLInputElement>)=>{
      if(isAgeField)return;
      if(isDigitsOnly){
        let v=e.target.value.replace(/\D/g,'');
        if(['rt','rw'].includes(f.key))v=v.slice(0,3);
        e.target.value=v;
        update(v);
      }else if(isLettersOnly){
        const v=e.target.value.replace(/\d/g,'');
        e.target.value=v;
        update(v);
      }else if(isTitleCaseField){
        let v=e.target.value;
        if(/^[a-z]/.test(v)||/\s[a-z]/.test(v)){
          v=v.replace(/(^|\s|-)[a-z]/g,c=>c.toUpperCase());
          e.target.value=v;
        }
        update(v);
      }else{
        update(e.target.value);
      }
    };
    const handlePaste=(isDigitsOnly||isLettersOnly)?(e:React.ClipboardEvent<HTMLInputElement>)=>{
      if(isAgeField)return;
      e.preventDefault();
      const rawPasted=(e.clipboardData.getData('text')||'');
      const pasted=isDigitsOnly?rawPasted.replace(/\D/g,''):rawPasted.replace(/\d/g,'');
      if(!pasted)return;
      const input=e.currentTarget;
      const start=input.selectionStart??0,end=input.selectionEnd??0,curr=String(fieldValue);
      let nextVal=isDigitsOnly
        ?(curr.slice(0,start)+pasted+curr.slice(end)).replace(/\D/g,'')
        :(curr.slice(0,start)+pasted+curr.slice(end)).replace(/\d/g,'');
      if(['rt','rw'].includes(f.key))nextVal=nextVal.slice(0,3);
      input.value=nextVal;
      update(nextVal);
    }:undefined;
    return <label key={f.key} className={f.wide?'field-wide':undefined}>
      <div className="field-label-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',minHeight:22,marginBottom:4,gap:6}}>
        <span className="field-label" title={f.label} style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',flex:1,minWidth:0}}>{f.label}{isRequired&&<span className="field-required" aria-label="Required">*</span>}</span>
        {f.key==='nib'&&onNibOcr&&!disabled&&<button type="button" onClick={onNibOcr} title="Upload & Scan Dokumen OSS/NIB · Auto-Fill OCR" className="nib-header-ocr-btn" style={{flexShrink:0}}><ScanLine size={11}/><span>Scan OCR NIB</span></button>}
      </div>
      {isMaster?<MasterSelect fieldKey={f.key} value={String(fieldValue)} record={value||{}} disabled={disabled} required={isRequired} onChange={update}/>:f.options?<select required={isRequired} disabled={disabled} value={value?.[f.key]??f.options[0]} onFocus={()=>{if(onFieldFocus)onFieldFocus(f.key);}} onChange={e=>{update(e.target.value);if(onSelectOption)onSelectOption(f.key,e.target.value);}}>{f.options.map(o=><option key={o} value={o}>{f.optionLabels?.[o]??label(o)}</option>)}</select>:f.type==='textarea'?<textarea aria-label={f.label} required={isRequired} disabled={disabled} rows={3} value={fieldValue} onChange={e=>update(e.target.value)}/>:f.unit?<div className="input-with-unit"><input aria-label={f.label} required={isRequired} disabled={isFieldDisabled} readOnly={isAgeField} style={ageStyle} type={f.type||'text'} inputMode={isDigitsOnly?'numeric':undefined} pattern={isDigitsOnly?'[0-9]*':undefined} maxLength={['rt','rw'].includes(f.key)?3:undefined} onKeyDown={handleKeyDown} onPaste={handlePaste} step={f.type==='number'?'0.01':undefined} {...inputLimits(f.key)} aria-invalid={!!fieldError} value={fieldValue} onChange={handleInputChange}/><span>{f.unit}</span></div>:<input aria-label={f.label} required={isRequired} disabled={isFieldDisabled} readOnly={isAgeField} style={ageStyle} type={f.type||'text'} inputMode={isDigitsOnly?'numeric':undefined} pattern={isDigitsOnly?'[0-9]*':undefined} maxLength={['rt','rw'].includes(f.key)?3:undefined} onKeyDown={handleKeyDown} onPaste={handlePaste} step={f.type==='number'?'0.01':undefined} {...inputLimits(f.key)} aria-invalid={!!fieldError} value={fieldValue} onChange={handleInputChange}/>}{fieldError&&<small className="input-validation-error" role="alert">{fieldError}</small>}
    </label>;
  })}</div>;
}
function Repeater({title,fields,rows,onChange,disabled=false,description,carousel=false}:{title:string,fields:Field[],rows:any[],onChange:(v:any[])=>void,disabled?:boolean,description?:string,carousel?:boolean}){const [activeIndex,setActiveIndex]=useState(0);const currentIndex=Math.min(activeIndex,Math.max(rows.length-1,0));const addRow=()=>{onChange([...rows,blank(fields)]);setActiveIndex(rows.length);};const removeRow=(index:number)=>{onChange(rows.filter((_,j)=>j!==index));setActiveIndex(Math.min(currentIndex,Math.max(rows.length-2,0)));};return <><div className="section-title"><div><h3>{title}</h3>{description&&<p className="muted repeater-description">{description}</p>}</div>{!disabled&&<button className="button small" onClick={addRow}><Plus size={15}/>Add {title==='Equipment units'?'unit':'row'}</button>}</div>{carousel&&rows.length>0&&<div className="repeater-carousel-controls"><button className="button small" disabled={currentIndex===0} onClick={()=>setActiveIndex(i=>Math.max(i-1,0))}><ChevronLeft size={15}/>Previous</button><span>{currentIndex+1} of {rows.length}</span><button className="button small" disabled={currentIndex>=rows.length-1} onClick={()=>setActiveIndex(i=>Math.min(i+1,rows.length-1))}>Next<ChevronRight size={15}/></button></div>}{rows.length===0&&<div className="empty-small">No entries yet.</div>}{(carousel?rows.slice(currentIndex,currentIndex+1):rows).map((r,i)=>{const rowIndex=carousel?currentIndex:i;return <div className="repeat" key={rowIndex}><div className="repeat-top"><span>{title} / {String(rowIndex+1).padStart(2,'0')}</span>{!disabled&&<button className="icon-button danger" aria-label="Remove row" onClick={()=>removeRow(rowIndex)}><Trash2 size={15}/></button>}</div><Fields fields={fields} value={r} disabled={disabled} onChange={v=>onChange(rows.map((x,j)=>rowIndex===j?v:x))}/></div>})}</>;}
function Modal({title,children,onClose,className=""}:{title:string,children:ReactNode,onClose:()=>void,className?:string}){return <div className="modal-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20}/></button></div>{children}</section></div>;}
function Login({onLogin}:{onLogin:(u:any)=>void}){const [email,setEmail]=useState('mkt@liugong.local'),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);return <div className="login"><div className="login-story"><Brand/><div><span className="eyebrow">LIUGONG FINANCE INDONESIA</span><h1>Moving business.<br/>Building possibilities.</h1><p>A single workspace for equipment financing,<br/>from the first application to the final decision.</p><div className="login-lines"><span/><span/><span/></div></div><small>Loan origination & document management</small></div><div className="login-form"><span className="eyebrow">YOUR ORIGINATION WORKSPACE</span><h2>Welcome back</h2><p>Sign in to keep business moving.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{onLogin(await api('/auth/login','POST',{email,password}));}catch(e:any){setError(e.message);}finally{setBusy(false);}}}><label>Email address<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<div className="error">{error}</div>}<button className="button primary" disabled={busy}>{busy?<Loader2 className="spin" size={16}/>:null}Sign in <ArrowRight size={17}/></button></form><div className="demo-note"><strong>Public interactive demo · synthetic data</strong><p>Choose a department. Changes are saved only in this browser.</p><div className="role-pills">{['MKT','BS','HEAD_BS','CA','LEGAL','COMMITTEE'].map(r=><button key={r} onClick={()=>{setEmail(r==='BS'?'arianti@liugong.local':r==='HEAD_BS'?'dellatra@liugong.local':r.toLowerCase()+'@liugong.local');setPassword('LiuGong2026!');}}>{r==='BS'?'Arianti / BS':r==='HEAD_BS'?'Dellatra / Head BS':r}</button>)}</div><small>Demo password: LiuGong2026! · Use synthetic information only.</small></div></div></div>;}
function Brand(){return <div className="brand"><div className="brand-mark">L<span>G</span></div><div><strong>LIUGONG</strong><small>FINANCE INDONESIA</small></div></div>;}
export default function App(){
 const [notifications,setNotifications]=useState<any[]>([]);
 const [user,setUser]=useState<any>(null),[ready,setReady]=useState(false),[page,setPage]=useState('Overview'),[rows,setRows]=useState<any[]>([]),[customers,setCustomers]=useState<any[]>([]),[selected,setSelected]=useState<any>(null),[detailTab,setDetailTab]=useState(0),[newOpen,setNewOpen]=useState(false),[toast,setToast]=useState(''),[globalError,setGlobalError]=useState(''),[mobile,setMobile]=useState(false),[loading,setLoading]=useState(false);
 const notify=(s:string)=>{setToast(s);setTimeout(()=>setToast(''),4500);};
 async function load(){setLoading(true);try{const [r,c,m,n]=await Promise.all([api('/applications'),api('/customers'),api('/master-data'),api('/notifications')]);setNotifications(n);setMasterData(m);setRows(r);setCustomers(c);setGlobalError('');}catch(e:any){setGlobalError(e.message);}finally{setLoading(false);}}
 useEffect(()=>{
   api('/auth/me')
     .then(u=>{
       if(!u || (!u.username && !u.name && !u.id && !u.email)){
         if(window.location.pathname.startsWith('/crm-dashboard')){
           window.location.replace('/login?timeout=1&reason=' + encodeURIComponent('Your session has expired. Please log in again.'));
                   }
                 } else {
                   setUser(u);
                 }
               })
               .catch(()=>{
                 if(window.location.pathname.startsWith('/crm-dashboard')){
                   window.location.replace('/login?timeout=1&reason=' + encodeURIComponent('Your session has expired. Please log in again.'));
       }
     })
     .finally(()=>setReady(true));
 },[]);
 useEffect(()=>{if(user)load();},[user]);
 useEffect(()=>{if(!user)return;let live=true;const refresh=()=>api('/notifications').then(n=>{if(live)setNotifications(n);}).catch(()=>{});const timer=setInterval(refresh,15000);window.addEventListener('storage',refresh);return()=>{live=false;clearInterval(timer);window.removeEventListener('storage',refresh);};},[user]);
 async function readNotification(id:string){try{await api('/notifications/'+id+'/read','PATCH',{});setNotifications(await api('/notifications'));}catch(e:any){setGlobalError(e.message);}}
 async function open(id:string,tab=0){setLoading(true);try{setDetailTab(tab);setSelected(await api('/applications/'+id));}catch(e:any){setGlobalError(e.message);}finally{setLoading(false);}}
 if(!ready)return <div className="loading-screen"><Loader2 className="spin"/>Opening your workspace…</div>;
 if(!user)return <Login onLogin={setUser}/>;
 const navigate=(p:string)=>{setPage(p);setSelected(null);setMobile(false);};
  function startNewApplication(preselectedCustomerId?: string) {
    const isAdminUser = Boolean(user?.isAdmin || user?.role === 'ADMIN');
    if (!isAdminUser && user?.role !== 'MKT') {
      notify('Application creation is available for Marketing (MKT) and Administrator accounts.');
      return;
    }
    const defaultCategory = preselectedCustomerId ? 'EXISTING' : 'NEW';
    const targetCust = preselectedCustomerId ? customers.find((c: any) => c.id === preselectedCustomerId) : null;
    const newAppDraft = {
      ...blank(profileFields),
      id: 'new',
      isNew: true,
      fapNumber: 'Auto (Generated on save)',
      applicationDate: new Date().toISOString().slice(0, 10),
      status: 'DRAFT',
      stage: 'FAP Stage',
      customerStatus: defaultCategory,
      customerCategory: defaultCategory,
      customerId: targetCust?.id || '',
      customer: targetCust ? structuredClone(targetCust) : blank(customerFields),
      branchCode: '',
      locationStatus: '',
      industrySegment: '',
      businessRole: '',
      mainBusiness: '',
      repaymentSource: '',
      companyAddress: '',
      province: '',
      city: '',
      district: '',
      village: '',
      rt: '',
      rw: '',
      postalCode: '',
      phoneFax: '',
      email: '',
      website: '',
      pic: blank(picFields),
      stakeholders: [],
      projects: [],
      bankReferences: [],
      proposal: { ...blank(proposalFields), units: [] },
      financialStatements: [],
      documentChecks: [],
      legal: { deeds: [] },
      signoffs: [],
      approvalLogs: [],
    };
    setDetailTab(0);
    setSelected(newAppDraft);
  }

  return <div className="shell">{mobile&&<div className="sidebar-backdrop" onClick={()=>setMobile(false)} aria-label="Close navigation"/>}<aside className={'sidebar '+(mobile?'mobile-open':'')}><div className="sidebar-header"><Brand/><button className="icon-button sidebar-close" onClick={()=>setMobile(false)} aria-label="Close menu"><X size={20}/></button></div><div className="workspace"><div className="workspace-logo"><Building2 size={18}/></div><div><b>Origination workspace</b><small>Indonesia operations</small></div><ChevronDown size={14}/></div><div className="nav-label">WORKSPACE</div><nav>{[[LayoutDashboard,'Overview'],[Files,'Applications'],[FolderCheck,'Document desk'],[Users,'Customers'],[Settings2,'Customize master data'],[Bell,'Notifications'],[Activity,'Activity']].map(([Icon,name]:any)=><button key={name} className={page===name?'active':''} onClick={()=>navigate(name)}><Icon size={19}/><span>{name}</span>{name==='Notifications'&&notifications.some(n=>!n.readAt)&&<em>{notifications.filter(n=>!n.readAt).length}</em>}{name==='Applications'&&<em>{rows.length}</em>}</button>)}</nav><div className="sidebar-bottom"><div className="security-note"><ShieldCheck size={20}/><div><b>Every step, accounted for.</b><small>Secure documents. Clear decisions.</small></div></div><button className="user-block" onClick={async()=>{if(window.location.pathname.startsWith('/crm-dashboard')){window.location.href='/logout';return;}await api('/auth/logout','POST');setUser(null);setSelected(null);setPage('Overview');setRows([]);setCustomers([]);setNotifications([]);}} title="Sign out"><span className="avatar">{user.name.split(' ').map((s:string)=>s[0]).slice(0,2).join('')}</span><span><b>{user.name}</b><small>{user.displayRole || (user.isAdmin || user.role === 'ADMIN' ? 'Administrator' : user.role === 'MKT' ? 'Marketing' : label(user.role))} · Sign out</small></span><LogOut size={16}/></button></div></aside><main><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-toggle" onClick={()=>setMobile(!mobile)}><Menu size={20}/></button><span>Workspace</span><ChevronRight size={14}/><b>{selected?'Application details':page}</b></div><button className="notification-bell" aria-label="Notifikasi" onClick={()=>navigate('Notifications')}><Bell size={19}/>{notifications.some(n=>!n.readAt)&&<span>{notifications.filter(n=>!n.readAt).length}</span>}</button><div className="topbar-right"><span className="live-dot"/>Indonesia <span className="divider"/> <span>{new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span><span className="role-chip">{import.meta.env.VITE_DEMO_MODE === 'true' ? 'PUBLIC DEMO' : (user.roleBadge || user.displayRole || (user.isAdmin || user.role === 'ADMIN' ? 'ADMIN' : user.role))}</span></div></header><div className="content">{globalError&&<div className="error">{globalError}<button onClick={load}>Retry</button></div>}{loading&&<div className="loading-strip"/>}{selected?<Detail value={selected} user={user} customers={customers} initialTab={detailTab} onBack={()=>{setSelected(null);load();}} onChange={v=>{setSelected(v);load();}} onCustomerCreated={c=>setCustomers(prev=>[c,...prev])} notify={notify}/>:<><div className="page-heading"><div><div className="eyebrow">{page==='Overview'?'A CLEAR VIEW. A CONFIDENT NEXT STEP.':'LOAN ORIGINATION & MANAGEMENT'}</div><h1>{page==='Overview'?'Portfolio overview':page==='Notifications'?'Notifikasi':page}</h1><p>{({Overview:'Welcome back, '+user.name.split(' ')[0]+'. Here’s where your financing stands.',Applications:'Manage every application, from first contact to final approval.','Document desk':'Keep every document complete, verified, and ready for review.',Customers:'Your customer relationships, connected to every application.','Customize master data':'Pengaturan master data aplikasi.',Notifications:'Deed review and approval results that need follow-up.',Activity:'A transparent record of application decisions and updates.'} as any)[page]}</p></div>{(page==='Overview'||page==='Applications')&&<button className="button primary" onClick={()=>(user.role==='MKT'||user.isAdmin||user.role==='ADMIN')?startNewApplication():notify('Application creation is available for Marketing (MKT) and Administrator accounts.')}><Plus size={17}/>New application</button>}</div>{page==='Overview'&&<Overview rows={rows} user={user} open={open} navigate={navigate}/ >}{page==='Applications'&&<ApplicationTable rows={rows} open={open}/ >}{page==='Document desk'&&<DocumentDesk rows={rows} open={open} user={user}/ >}{page==='Customers'&&<section className="panel"><div className="panel-head"><h2>Customer directory <span>{customers.length}</span></h2><Users size={19}/></div><div className="customer-grid">{customers.map(c=><button className="customer-card" key={c.id} onClick={()=>{const a=rows.find(r=>r.customer_id===c.id);if(a)open(a.id);else if(user.role==='MKT'||user.isAdmin||user.role==='ADMIN')startNewApplication(c.id);else notify('This customer has no applications yet. Use New application to create one.');}}><IconBox><Building2 size={21}/></IconBox><h3>{c.companyName}</h3><span className="muted">{label(c.companyType)}</span><dl><dt>NIB</dt><dd>{c.nib}</dd><dt>NPWP</dt><dd>{c.npwp}</dd></dl><span className="text-link">{rows.filter(r=>r.customer_id===c.id).length} applications <ArrowUpRight size={15}/></span></button>)}</div></section>}{page==='Customize master data'&&<MasterDataPage/>}{page==='Notifications'&&<NotificationsPage items={notifications} onRead={readNotification} onOpen={id=>open(id,5)}/>}{page==='Activity'&&<ActivityPage rows={rows} open={open}/>}</> }<footer><span>© {new Date().getFullYear()} PT LiuGong Finance Indonesia</span><span>Origination workspace <i/> All amounts in IDR</span></footer></div></main>{toast&&<div className="toast"><CheckCheck size={18}/>{toast}</div>}</div>;
}
function Overview({rows,user,open,navigate}:{rows:any[],user:any,open:(id:string,tab?:number)=>void,navigate:(p:string)=>void}){const needs=rows.filter(r=>user.role==='MKT'?['DRAFT','RETURNED'].includes(r.status)||(r.legal?.deeds||[]).some((d:any)=>reviewStatus(d)==='REJECTED'):user.role==='BS'?(r.legal?.deeds||[]).some((d:any)=>reviewStatus(d)==='PENDING_CHECK'):user.role==='HEAD_BS'?(r.legal?.deeds||[]).some((d:any)=>reviewStatus(d)==='PENDING_APPROVAL'):user.role==='CA'||user.role==='LEGAL'?r.status==='IN_CA_LEGAL_REVIEW':user.role==='COMMITTEE'?r.status==='CREDIT_COMMITTEE_REVIEW':false);const total=rows.reduce((s,r)=>s+Number(r.financing_value||0),0),approved=rows.filter(r=>r.status==='APPROVED'),review=rows.filter(r=>['SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW'].includes(r.status));const stages=[['DRAFT','Draft'],['SUBMITTED_TO_BS','BS verification'],['IN_CA_LEGAL_REVIEW','CA & Legal'],['CREDIT_COMMITTEE_REVIEW','Committee'],['APPROVED','Approved']];return <><div className="stats-grid">{[[BriefcaseBusiness,'Total applications',String(rows.length),'Across all branches'],[Wallet,'Financing portfolio',money(total,true),'Total requested financing'],[Clock,'In review',String(review.length),'Moving through the workflow'],[ShieldCheck,'Approved financing',money(approved.reduce((s,r)=>s+Number(r.financing_value),0),true),approved.length+' approved applications']].map(([Icon,title,value,sub]:any,i)=><div className={'stat-card stat-'+i} key={title}><div className="stat-top"><span>{title}</span><Icon size={18}/></div><strong>{value}</strong><small>{i===3?<span className="tiny-brand"><Check size={13}/></span>:<span className="stat-dot"/>}{sub}</small></div>)}</div><div className="overview-mid"><section className="panel pipeline"><div className="panel-head"><div><h2>Application pipeline</h2><p>From opportunity to approval</p></div><span className="subtle-chip">All applications <ChevronDown size={13}/></span></div><div className="pipeline-chart">{stages.map(([s,l],i)=>{const count=rows.filter(r=>r.status===s||(s==='SUBMITTED_TO_BS'&&r.status==='BS_VERIFIED')).length;return <button className="pipeline-stage" key={s} onClick={()=>navigate('Applications')}><div className="bar-top"><strong>{String(count).padStart(2,'0')}</strong><span>{rows.length?Math.round(count/rows.length*100):0}%</span></div><div className="bar-track"><div style={{height:Math.max(8,count/Math.max(1,...stages.map(([s])=>rows.filter(r=>r.status===s).length))*100)+'%'}} className={'bar bar-'+i}/></div><span>{l}</span></button>;})}</div><div className="pipeline-foot"><span><i/> {review.length} applications are currently under review</span><button className="text-link" onClick={()=>navigate('Applications')}>View pipeline <ArrowRight size={14}/></button></div></section><section className="attention panel"><div className="panel-head"><h2>Needs attention</h2><span className="count-pill">{needs.length}</span></div>{needs.slice(0,3).map(r=><button className="attention-item" key={r.id} onClick={()=>open(r.id,['BS','HEAD_BS'].includes(user.role)||r.legal?.deeds?.some((d:any)=>reviewStatus(d)==='REJECTED')?5:0)}><span className={'attention-icon '+(r.status==='RETURNED'?'orange':'')}><AlertCircle size={18}/></span><div><b>{user.role==='BS'?'Review deed document':user.role==='HEAD_BS'?'Approve deed document':user.role==='MKT'?r.legal?.deeds?.some((d:any)=>reviewStatus(d)==='REJECTED')?'Fix the rejected deed':r.status==='RETURNED'?'Application returned':'Complete your draft':'Review application'}</b><span>{r.company_name}</span><small>{r.fap_number}</small></div><ChevronRight size={16}/></button>)}{!needs.length&&<div className="empty-small">You’re all caught up.</div>}<div className="attention-bottom"><ShieldCheck size={17}/><span>Complete documents keep financing moving.</span></div></section></div><ApplicationTable rows={rows} open={open} compact onViewAll={()=>navigate('Applications')}/></>;}
function ApplicationTable({rows,open,compact=false,documentMode=false,onViewAll}:{rows:any[],open:(id:string)=>void,compact?:boolean,documentMode?:boolean,onViewAll?:()=>void}){const [search,setSearch]=useState(''),[status,setStatus]=useState('ALL'),[branch,setBranch]=useState('ALL'),[start,setStart]=useState(''),[end,setEnd]=useState(''),[page,setPage]=useState(0),[dates,setDates]=useState(false);const filtered=rows.filter(r=>(r.company_name+' '+r.fap_number).toLowerCase().includes(search.toLowerCase())&&(status==='ALL'||r.status===status)&&(branch==='ALL'||r.branch_code===branch)&&(!start||String(r.application_date).slice(0,10)>=start)&&(!end||String(r.application_date).slice(0,10)<=end));useEffect(()=>setPage(0),[search,status,branch,start,end]);const count=compact?5:8;const visible=filtered.slice(page*count,(page+1)*count);function exportCsv(){const lines=[['FAP','Customer','Branch','Status','Financing IDR','Date'],...filtered.map(r=>[r.fap_number,r.company_name,r.branch_code,statusLabel[r.status],r.financing_value||0,String(r.application_date).slice(0,10)])];const csv=lines.map(r=>r.map(v=>'"'+String(v).replace(/^[=+@-]/,"' $&").replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='liugong-applications.csv';a.click();URL.revokeObjectURL(url);}return <section className="panel applications-panel"><div className="panel-head"><h2>{compact?'Recent applications':documentMode?'Document verification queue':'All applications'} <span>{rows.length}</span></h2>{compact?<button className="text-link" onClick={onViewAll}>View all applications <ArrowUpRight size={16}/></button>:<button className="button small" onClick={exportCsv}><Download size={15}/>Export</button>}</div><div className="table-toolbar"><div className="search"><Search size={17}/><input aria-label="Search applications" placeholder="Search company or FAP number…" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="filters"><select aria-label="Filter status" value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">All statuses</option>{Object.entries(statusLabel).map(([s,l])=><option key={s} value={s}>{l}</option>)}</select><select aria-label="Filter branch" value={branch} onChange={e=>setBranch(e.target.value)}><option value="ALL">All branches</option>{[...new Set(rows.map(r=>r.branch_code))].sort().map(b=><option key={b}>{b}</option>)}</select><button className={'button small '+(dates?'selected':'')} onClick={()=>setDates(!dates)}><Settings2 size={15}/><span>Dates</span></button></div></div>{dates&&<div className="date-filter"><label>From <input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>To <input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label><button className="text-link" onClick={()=>{setStart('');setEnd('');}}>Clear dates</button></div>}<div className="table-scroll"><table className="data-table"><thead><tr><th>COMPANY / APPLICATION</th><th>BRANCH</th><th>FINANCING AMOUNT</th><th>STATUS</th><th>DOCUMENTS</th><th>APPLICATION DATE</th><th/></tr></thead><tbody>{visible.map((r,i)=><tr key={r.id} onClick={()=>open(r.id)} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')open(r.id);}}><td><div className="company-cell"><span className={'company-icon tint-'+i%3}><Building2 size={18}/></span><div><b>{r.company_name}</b><small>{r.fap_number} <span>· {label(r.company_type)}</span></small></div></div></td><td><span className="branch">{r.branch_code}</span></td><td><b className="amount">{money(r.financing_value)}</b><small>{r.tenor_months?r.tenor_months+' months':'Proposal pending'}</small></td><td><Badge status={r.status}/></td><td><div className="doc-progress"><span><i style={{width:(r.verified_docs/Math.max(1,r.total_docs)*100)+'%'}}/></span><small>{r.verified_docs}/{r.total_docs}</small></div></td><td className="date-cell">{date(r.application_date)}</td><td><ChevronRight size={16}/></td></tr>)}</tbody></table>{!visible.length&&<div className="empty"><Search size={26}/><h3>No applications found</h3><p>Try a different search or filter.</p></div>}</div><div className="table-foot"><span>Showing {filtered.length?page*count+1:0}–{Math.min((page+1)*count,filtered.length)} of {filtered.length} applications</span><div><button className="icon-button" aria-label="Previous page" disabled={!page} onClick={()=>setPage(page-1)}><ChevronLeft size={16}/></button><span className="page-number">{page+1}</span><button className="icon-button" aria-label="Next page" disabled={(page+1)*count>=filtered.length} onClick={()=>setPage(page+1)}><ChevronRight size={16}/></button></div></div></section>;}
// Note: New application process has been merged directly into Detail view (Tab 0 FAP Intake).
function normalizeStakeholderIdType(rawType: string | undefined, s?: any): 'NONE' | 'KTP_NPWP' | 'PASSPORT_KITAS' {
  const t = String(rawType || '').toUpperCase().trim();
  if (t === 'KTP_NPWP' || t === 'PASSPORT_KITAS') return t;
  if (['KTP', 'NPWP'].includes(t)) return 'KTP_NPWP';
  if (['PASSPORT', 'KITAS'].includes(t)) return 'PASSPORT_KITAS';
  if (s) {
    if (s.passportUrl || s.passportOcrText || s.kitasUrl || s.kitasOcrText) return 'PASSPORT_KITAS';
    if (s.ktpUrl || s.ktpOcrText || s.npwpUrl || s.npwpOcrText) return 'KTP_NPWP';
    if (s.nationalityType === 'WNA' || s.citizenship === 'FOREIGN') return 'PASSPORT_KITAS';
  }
  return 'NONE';
}

function stakeholderEditorValues(s:any){
  const parts=String(s.name||'').trim().split(/\s+/);
  const resolvedIdType = normalizeStakeholderIdType(s.idType, s);
  const idNumberSecondary = s.idNumberSecondary || s.taxId || s.npwp || s.permitNumber || s.niora || '';
  return {...s,representativeType:s.representativeType||'NONE',signatory:s.signatory||'NONE',idType:resolvedIdType,idNumberSecondary,title:s.title||'NONE',firstName:s.firstName||parts[0]||'',middleName:s.middleName||parts.slice(1,-1).join(' '),lastName:s.lastName|| (parts.length>1?parts.at(-1):''),maritalStatus:s.maritalStatus||'NONE',designation:s.designation||s.position||'NONE',email:s.email||'',mobilePhone:s.mobilePhone||'',gender:s.gender||'NONE',sharePercentage:s.sharePercentage??0,depositedCapital:s.depositedCapital??s.shareAmount??0,primaryCapital:s.primaryCapital??0,citizenship:s.citizenship||(s.nationalityType==='WNA'?'FOREIGN':'INDONESIAN'),country:s.country||'Indonesia'};
}
function stakeholderForSave(s:any){
  const first=s.firstName||'',last=s.lastName||'',name=[first,s.middleName,last].map((x:string)=>String(x||'').trim()).filter(Boolean).join(' ')||s.name||'';
  const rawIdType = String(s.idType || '').toUpperCase().trim();
  const idType = rawIdType === 'PASSPORT_KITAS' || ['PASSPORT', 'KITAS'].includes(rawIdType)
    ? 'PASSPORT_KITAS'
    : rawIdType === 'KTP_NPWP' || ['KTP', 'NPWP'].includes(rawIdType)
    ? 'KTP_NPWP'
    : rawIdType === 'NONE'
    ? 'NONE'
    : 'NONE';
  return {
    ...s,
    name,
    position:s.designation&&s.designation!=='NONE'?s.designation:s.position||'Shareholder',
    nationalityType:s.citizenship==='FOREIGN'?'WNA':'WNI',
    idType,
    idNumber: s.idNumber || s.nik || s.passportNumber || '',
    idNumberSecondary: s.idNumberSecondary || s.taxId || s.npwp || s.permitNumber || '',
    taxNumber: s.idNumberSecondary || s.taxId || s.npwp || null,
    shareAmount:s.depositedCapital??0,
    sharePercentage:s.sharePercentage??0
  };
}
function Detail({value:a,user,customers=[],initialTab=0,onBack,onChange,onCustomerCreated,notify}:{value:any,user:any,customers?:any[],initialTab?:number,onBack:()=>void,onChange:(a:any)=>void,onCustomerCreated?:(c:any)=>void,notify:(s:string)=>void}){
  const master=useMasterData();
  const [customerCategory,setCustomerCategory]=useState<string>(()=>a.customerCategory||a.customerStatus||(a.isNew?'NEW':(a.customerId?'EXISTING':'NEW')));
  const [customerId,setCustomerId]=useState<string>(()=>a.isNew?(a.customerId||''):(a.customerId||a.customer_id||a.customer?.id||''));
  const sanitizeCustomer=(c:any)=>{if(!c)return c;const npwpRaw=String(c.npwp||'').replace(/\D/g,'');return{...c,npwp:/^0+$/.test(npwpRaw)?'':c.npwp};};
  const [customerDraft,setCustomerDraft]=useState<any>(()=>a.customer?sanitizeCustomer(structuredClone(a.customer)):blank(customerFields));
  const [nibOcrOpen,setNibOcrOpen]=useState(false);
  const handleApplyNibOcr=(extracted:{
    nib?:string,
    companyName?:string,
    alamat?:string,
    email?:string,
    phone?:string,
    tanggalTerbit?:string,
    province?:string,
    city?:string,
    district?:string,
    village?:string,
    postalCode?:string,
    rt?:string,
    rw?:string
  })=>{
   const rawComp=extracted.companyName?String(extracted.companyName).trim():'';
   const rawNib=extracted.nib?String(extracted.nib).replace(/\D/g,'').slice(0,13):'';
   const rawDate=extracted.tanggalTerbit?String(extracted.tanggalTerbit).trim():'';
   if(rawNib||rawDate||rawComp){
    setCustomerDraft((prev:any)=>({
     ...prev,
     ...(rawNib?{nib:rawNib}:{}),
     ...(rawComp?{companyName:rawComp}:{}),
     ...(rawDate?{nibDate:rawDate}:{}),
    }));
   }
   setDraft((prev:any)=>{
    let next = {
     ...prev,
     ...(rawNib?{nib:rawNib}:{}),
     ...(rawComp?{companyName:rawComp}:{}),
     ...(extracted.alamat?{companyAddress:extracted.alamat}:{}),
     ...(extracted.email?{email:extracted.email}:{}),
     ...(extracted.phone?{phoneFax:extracted.phone}:{}),
     ...(rawDate?{nibDate:rawDate}:{}),
     ...(extracted.province?{province:extracted.province}:{}),
     ...(extracted.city?{city:extracted.city,cityRegency:extracted.city}:{}),
     ...(extracted.district?{district:extracted.district}:{}),
     ...(extracted.village?{village:extracted.village}:{}),
     ...(extracted.postalCode?{postalCode:extracted.postalCode}:{}),
     ...(extracted.rt?{rt:extracted.rt}:{}),
     ...(extracted.rw?{rw:extracted.rw}:{}),
     customer:{
      ...(prev.customer||{}),
      ...(rawNib?{nib:rawNib}:{}),
      ...(rawComp?{companyName:rawComp}:{}),
      ...(rawDate?{nibDate:rawDate}:{}),
     }
    };
    next = resolveWilayahUpwards(next, master);
    return next;
   });
   if(customerCategory==='EXISTING'){
    setCustomerCategory('NEW');
   }
  };
 const selectedCustomer=customerId?customers.find((c:any)=>c.id===customerId):null;
 const fapCustomerKeys=['companyName','companyType','nib','nibDate','npwp','establishmentActNo','establishmentDate'];
 const fapCustomerFields=customerFields.filter(f=>fapCustomerKeys.includes(f.key));
 function changeCategory(value:string){
  setCustomerCategory(value);setError('');
  setDraft((prev:any)=>({...prev,customerStatus:value,customerCategory:value}));
 }
 async function saveNewApplication(){
  setBusy(true);setError('');
  try{
   let id=customerId;
   if(customerCategory==='EXISTING'){
    if(!selectedCustomer)throw new Error('Please select an existing customer first.');
    id=selectedCustomer.id;
   }else{
    const nib=String(customerDraft.nib||'').replace(/\D/g,'');
    const npwp=String(customerDraft.npwp||'').replace(/\D/g,'');
    if(!String(customerDraft.companyName||'').trim())throw new Error('Company name of the new debtor is required.');
    if(nib.length!==13)throw new Error('NIB must consist of 13 digits.');
    if(npwp.length<15||npwp.length>16)throw new Error('NPWP must consist of 15 or 16 digits.');
    validateInput(customerDraft);
    const createdCust=await api('/customers','POST',customerDraft);
    id=createdCust.id;
    setCustomerId(id);
    if(onCustomerCreated)onCustomerCreated(createdCust);
   }
   const {isNew,customer,id:_draftId,...profileData}=draft;
   const safePayload = {
     branchCode: profileData.branchCode || 'JKT01',
     companyAddress: profileData.companyAddress || '-',
     city: profileData.city || '-',
     province: profileData.province || '-',
     postalCode: profileData.postalCode || '00000',
     phoneFax: profileData.phoneFax || '-',
     email: profileData.email || (customerDraft.email || 'draft@liugong.local'),
     mainBusiness: profileData.mainBusiness || '-',
     locationStatus: profileData.locationStatus || 'OWNED',
     repaymentSource: profileData.repaymentSource || 'Operating Cash Flow',
     industrySegment: profileData.industrySegment || 'MINING',
     businessRole: profileData.businessRole || 'CONTRACTOR',
     ...profileData,
     customerId: id,
     customerStatus: customerCategory,
     stage: 'FAP Stage'
   };
   const application=await api('/applications','POST',safePayload);
   notify(`Application created successfully with number ${application.fapNumber}`);
   const fullApp=await api(`/applications/${application.id}`);
   setDraft(structuredClone(fullApp));
   onChange(fullApp);
   setTab(0);
  }catch(e:any){setError(e.message||'Failed to create new application. Please try again.');}
  finally{setBusy(false);}
 }
const [activeStage,setActiveStage]=useState<string>(()=>(a.stage||(['SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW','APPROVED'].includes(a.status)?'Pre-analysis':'FAP Stage')));const [submitFapConfirm,setSubmitFapConfirm]=useState(false);useEffect(()=>{if(a.stage)setActiveStage(a.stage);else if(['SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW','APPROVED'].includes(a.status))setActiveStage('Pre-analysis');else setActiveStage('FAP Stage');},[a.id,a.stage,a.status]);const [reviewDeedId,setReviewDeedId]=useState<string|null>(null);const [tab,setTab]=useState(initialTab),[draft,setDraft]=useState<any>(structuredClone(a)),[busy,setBusy]=useState(false),[error,setError]=useState(''),[transition,setTransition]=useState(''),[comments,setComments]=useState(''),[saveConfirm,setSaveConfirm]=useState(false),[sideBySide,setSideBySide]=useState(true);
 const [openSections, setOpenSections] = useState<Record<string, boolean>>({
   'fap-preview-sec-header': true,
   'fap-preview-sec-company': true,
   'fap-preview-sec-business': true,
   'fap-preview-sec-pic': true,
   'fap-preview-sec-projects': true,
 });
 const [activeSyncSection, setActiveSyncSection] = useState<string>('fap-preview-sec-header');
 const [syncTick, setSyncTick] = useState<number>(() => Date.now());

 const handleTriggerSync = (secId: string) => {
   setActiveSyncSection(secId);
   setSyncTick(Date.now());
 };

 const toggleSection = (secId: string) => {
   setOpenSections(prev => {
     const willOpen = !prev[secId];
     if (willOpen) {
       handleTriggerSync(secId);
     }
     return { ...prev, [secId]: willOpen };
   });
 };

 const handlePreviewSectionClick = (secId: string) => {
   handleTriggerSync(secId);
   setOpenSections(prev => ({ ...prev, [secId]: true }));
   const formTarget = document.getElementById('acc-' + secId);
   if (formTarget) {
     formTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
   }
 };
 
  const [fapComparisonModal, setFapComparisonModal] = useState<any>(null);

  const handlePrintFap = async () => {
    if (draft.isNew) {
      notify('Please save the new application before printing the FAP document.');
      return;
    }
    setBusy(true);
    try {
      await save();
      notify('All FAP data saved to database. Opening print form...');
      printFapDocument(a.fapNumber || draft.fapNumber);
    } catch (err: any) {
      console.error('Auto-save before print error:', err);
      notify('Failed to save data to database before printing: ' + (err.message || ''));
    } finally {
      setBusy(false);
    }
  };

  const handleApproveFapChangesInDetail = async (extractedData: any) => {
    setBusy(true);
    try {
      const res = await api(`/applications/${a.id}/fap-changes/approve`, 'POST', {
        approvedData: extractedData
      });
      if (res.application) {
        onChange(res.application);
        setDraft(structuredClone(res.application));
      }
      setFapComparisonModal(null);
      notify('FAP document data changes approved and updated to database.');
    } catch (err: any) {
      notify('Failed to update data: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCorrectFapDataInDetail = async () => {
    try {
      await api(`/applications/${a.id}/fap-changes/dismiss`, 'POST');
    } catch {}
    setFapComparisonModal(null);
    notify('Data differences noted. You can review and correct the data in the FAP form manually.');
  };

const [customerDetailLocked,setCustomerDetailLocked]=useState<boolean>(()=>Boolean(a.customerDetailLocked || localStorage.getItem(`crm_locked_customer_${a.id}`) === 'true'));
 async function submitCustomerDetail(){
  setError('');
  const missing: string[] = [];
  if (!draft.companyAddress?.trim()) missing.push('Company Address');
  if (!draft.province?.trim()) missing.push('Province');
  if (!draft.city?.trim()) missing.push('City/Regency');
  if (!draft.postalCode?.trim()) missing.push('Postal Code');
  if (!draft.mainBusiness?.trim()) missing.push('Main Business Sector');

  const pic = draft.pic || {};
  if (!pic.picName?.trim() && !pic.name?.trim()) missing.push('PIC Name');
  if (!pic.phone?.trim() && !pic.mobilePhone?.trim()) missing.push('PIC Phone Number');
  if (!pic.position?.trim()) missing.push('PIC Position');

  if (missing.length > 0) {
    setError(`Please complete the required Customer Detail & PIC fields before submitting: ${missing.join(', ')}.`);
    return;
  }

  setBusy(true);
  try {
    const updatedDraft = {
      ...draft,
      customerDetailLocked: true,
      pic: draft.pic || blank(picFields),
      latestDeedDate: (!draft.latestDeedDate || String(draft.latestDeedDate).trim() === '' || String(draft.latestDeedDate) === 'null') ? null : draft.latestDeedDate,
      latestDeedNo: (!draft.latestDeedNo || String(draft.latestDeedNo).trim() === '') ? null : draft.latestDeedNo,
    };
    const cleanProjects = (draft.projects || []).filter((p: any) => 
      p && Object.values(p).some((v: any) => v !== undefined && v !== null && String(v).trim() !== '')
    );
    const customerPayload = customerCategory === 'NEW'
      ? { 
          ...customerDraft, 
          companyName: liveCompanyName, 
          nib: liveNib, 
          npwp: liveNpwp,
          establishmentActNo: (liveEstablishmentActNo || customerDraft?.establishmentActNo || draft.customer?.establishmentActNo || '').trim() || null,
          establishmentDate: (customerDraft?.establishmentDate || draft.customer?.establishmentDate || null) || null,
          nibDate: (customerDraft?.nibDate || draft.customer?.nibDate || null) || null
        }
      : { ...(draft.customer || {}), ...(selectedCustomer || {}) };
    const body = {
      profile: { ...updatedDraft, companyName: liveCompanyName },
      customer: customerPayload,
      pic: updatedDraft.pic,
      projects: cleanProjects,
    };
    const v = await api(`/applications/${a.id}/page-1`, 'PUT', { ...body, stage: 'Pre-analysis' });
    const nextApp = { ...a, ...v, customerDetailLocked: true };
    setDraft((prev: any) => ({ ...prev, ...nextApp, customerDetailLocked: true }));
    setCustomerDetailLocked(true);
    localStorage.setItem(`crm_locked_customer_${a.id}`, 'true');
    onChange(nextApp);
    notify('Customer details validated and locked. Switching to the Legal tab.');
    setTab(5);
  } catch (e: any) {
    setError(e.message || 'Failed to save and lock customer details.');
  } finally {
    setBusy(false);
  }
 }
  const liveCompanyName = String(
    draft.customer?.companyName || 
    customerDraft.companyName || 
    draft.companyName || 
    (customerCategory === 'EXISTING' ? selectedCustomer?.companyName : '') || 
    a.customer?.companyName || 
    a.companyName || 
    ''
  ).trim();

  const liveCompanyType = String(
    draft.customer?.companyType || 
    customerDraft.companyType || 
    draft.companyType || 
    (customerCategory === 'EXISTING' ? selectedCustomer?.companyType : '') || 
    a.customer?.companyType || 
    'CORPORATE'
  ).trim();

  const liveNib = String(
    draft.customer?.nib || 
    customerDraft.nib || 
    draft.nib || 
    (customerCategory === 'EXISTING' ? selectedCustomer?.nib : '') || 
    a.customer?.nib || 
    ''
  ).trim();

  const liveNpwp = (() => {
    const raw = String(
      draft.customer?.npwp || 
      customerDraft.npwp || 
      draft.npwp || 
      (customerCategory === 'EXISTING' ? selectedCustomer?.npwp : '') || 
      a.customer?.npwp || 
      ''
    ).trim();
    // If it contains only zeros (e.g. '000000000000000'), treat as empty
    return /^0+$/.test(raw) ? '' : raw;
  })();

  const liveEstablishmentActNo = String(
    draft.customer?.establishmentActNo || 
    customerDraft.establishmentActNo || 
    draft.establishmentActNo || 
    (customerCategory === 'EXISTING' ? selectedCustomer?.establishmentActNo : '') || 
    a.customer?.establishmentActNo || 
    ''
  ).trim();

  const liveEstablishmentDate = String(
    draft.customer?.establishmentDate || 
    customerDraft.establishmentDate || 
    draft.establishmentDate || 
    (customerCategory === 'EXISTING' ? selectedCustomer?.establishmentDate : '') || 
    a.customer?.establishmentDate || 
    ''
  ).trim();

  const liveNibDate = String(
    draft.customer?.nibDate || 
    customerDraft.nibDate || 
    draft.nibDate || 
    (customerCategory === 'EXISTING' ? selectedCustomer?.nibDate : '') || 
    a.customer?.nibDate || 
    ''
  ).trim();

 const liveDetailFapData: FapSheetData = {
  fapNumber: draft.isNew ? 'Auto (Generated on save)' : (draft.fapNumber || a.fapNumber || '—'),
  applicationDate: draft.applicationDate || a.applicationDate || new Date().toISOString(),
  branchCode: draft.branchCode || a.branchCode || '',
  customerStatus: customerCategory || draft.customerStatus || a.customerStatus || 'EXISTING',
  companyName: liveCompanyName,
  companyType: liveCompanyType,
  nib: liveNib,
  nibDate: liveNibDate || '',
  npwp: liveNpwp,
  establishmentActNo: liveEstablishmentActNo,
  establishmentDate: liveEstablishmentDate || '',
  companyAddress: draft.companyAddress,
  province: master.province?.find(x => x.value === draft.province || x.name.toLowerCase() === String(draft.province || '').toLowerCase())?.name || draft.province,
  city: master.city?.find(x => x.value === draft.city || x.name.toLowerCase() === String(draft.city || '').toLowerCase())?.name || draft.city,
  district: master.district?.find(x => x.value === draft.district || x.name.toLowerCase() === String(draft.district || '').toLowerCase())?.name || (/^[0-9a-f-]{36}$/i.test(String(draft.district || '')) ? '' : draft.district),
  village: master.village?.find(x => x.value === draft.village || x.name.toLowerCase() === String(draft.village || '').toLowerCase())?.name || (/^[0-9a-f-]{36}$/i.test(String(draft.village || '')) ? '' : draft.village),
  rt: draft.rt,
  rw: draft.rw,
  postalCode: draft.postalCode,
  mainBusiness: draft.mainBusiness,
  experienceYears: draft.experienceYears,
  experienceMonths: draft.experienceMonths,
  latestDeedNo: draft.latestDeedNo,
  latestDeedDate: draft.latestDeedDate,
  phoneFax: draft.phoneFax,
  website: draft.website,
  email: draft.email,
  repaymentSource: draft.repaymentSource,
  locationStatus: draft.locationStatus,
  industrySegment: draft.industrySegment || a.industrySegment,
  businessRole: draft.businessRole || a.businessRole,
  pic: draft.pic,
  stakeholders: draft.stakeholders || a.stakeholders,
  selectedDeedNo: draft.legal?.selectedDeedNo || draft.latestDeedNo || a.customer?.establishmentActNo,
  proposal: draft.proposal || a.proposal,
  projects: draft.projects || a.projects,
  bankReferences: draft.bankReferences || a.bankReferences,
  financialStatements: draft.financialStatements || a.financialStatements,
  facilityPurpose: (draft.proposal || a.proposal)?.facilityPurpose,
  financingMethod: (draft.proposal || a.proposal)?.financingMethod,
  financingValue: (draft.proposal || a.proposal)?.financingValue,
  downPaymentValue: (draft.proposal || a.proposal)?.downPaymentValue,
  interestRate: (draft.proposal || a.proposal)?.interestRate,
  tenorMonths: (draft.proposal || a.proposal)?.tenorMonths,
  paymentMethod: (draft.proposal || a.proposal)?.paymentMethod,
  units: (draft.proposal || a.proposal)?.units,
  assetSummaryHeLiuGong: a.assetSummaryHeLiuGong,
  assetSummaryTruckLiuGong: a.assetSummaryTruckLiuGong,
  assetSummaryHeNonLiuGong: a.assetSummaryHeNonLiuGong,
  assetSummaryTruckNonLiuGong: a.assetSummaryTruckNonLiuGong,
};

 useEffect(()=>{
  const base = structuredClone(a);
  // Sync deed fields from legal when loading existing data
  if(a.legal){
    const sync = deriveDeedSync(a.legal, a);
    if(sync.establishmentActNo) base.latestDeedNo = base.latestDeedNo || sync.latestDeedNo;
    if(sync.latestDeedDate)     base.latestDeedDate = base.latestDeedDate || sync.latestDeedDate;
    if(sync.establishmentDate){ const exp = calculateAgeYearsMonths(sync.establishmentDate); base.experienceYears = exp.years; base.experienceMonths = exp.months; }
    if(sync.establishmentActNo && a.customer){
      base.customer = {...(base.customer||{}), establishmentActNo: base.customer?.establishmentActNo || sync.establishmentActNo, establishmentDate: base.customer?.establishmentDate || sync.establishmentDate};
    }
  }
  setDraft(base);
  if(a.customer){
    setCustomerDraft(sanitizeCustomer(structuredClone(a.customer)));
  }
 },[a]);
 useEffect(()=>setTab(initialTab),[initialTab,a.id]);
 const isFapStage = activeStage === 'FAP Stage';
 const fapChk = (a.documentChecks || []).find((d: any) => String(d.documentCode).toUpperCase() === 'FAP' || String(d.documentName).toLowerCase() === 'fap');
 const hasSignedFap = Boolean(fapChk && Array.isArray(fapChk.files) && fapChk.files.length > 0);
 const isDbLocked = a.submitLock !== undefined ? (Number(a.submitLock.isLocked) === 1) : !hasSignedFap;
  const isSubmitLocked = !draft.isNew && isDbLocked;
 const isPreAnalysisReached = (a.stage === 'Pre-analysis' || draft.stage === 'Pre-analysis') || ['SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW','APPROVED'].includes(a.status);
 const currentAppStage = isPreAnalysisReached ? 'Pre-analysis' : 'FAP Stage';

 const tabs=['Customer & PIC','Stakeholders','Business & banks','Financing & units','Financial statements','Legal','Documents','Activity'];
 const tabNumbers:Record<number,number>={0:1,5:2,1:3,2:4,4:5,6:6};

 const stageTabOrder = activeStage === 'FAP Stage' 
   ? [0, 5, 1, 6, 7] 
   : activeStage === 'Pre-analysis' 
   ? [2, 4, 6, 7] 
   : [6, 7];
 const tabOrder = stageTabOrder;

 const isAdminUser = Boolean(user?.isAdmin || user?.role === 'ADMIN');
 const isFapLocked = !isAdminUser && isPreAnalysisReached && activeStage === 'FAP Stage';
 const canLegal = isAdminUser || (!isFapLocked && canEditLegal(user, a));
 const canEdit = isAdminUser || (!isFapLocked && (user.role === 'MKT' && (Boolean(draft.isNew) || ['DRAFT', 'RETURNED'].includes(a.status))));
 const canFinance = isAdminUser || (user.role === 'MKT' && ['DRAFT', 'RETURNED'].includes(a.status)) || (user.role === 'CA' && a.status === 'IN_CA_LEGAL_REVIEW');
 
 async function submitFapStage(){
   setBusy(true);setError('');
   try{
     const updated={...draft,stage:'Pre-analysis'};
     await api('/applications/'+a.id+'/stage','PUT',{stage:'Pre-analysis'});
     setDraft(updated);
     setActiveStage('Pre-analysis');
     setTab(2);
     setSubmitFapConfirm(false);
     notify('FAP Stage submitted. Pre-analysis stage is now active.');
     if(onChange)onChange(updated);
   }catch(e:any){
     setError(e.message||'Failed to submit FAP stage.');
   }finally{
     setBusy(false);
   }
 }
 
 let actions:string[]=[];
 if(user.isAdmin || user.role === 'ADMIN') {
   if(['DRAFT','RETURNED'].includes(a.status)) actions=['SUBMIT_TO_BS'];
   else if(a.status==='SUBMITTED_TO_BS') actions=['VERIFY_BS','RETURN'];
   else if(a.status==='BS_VERIFIED') actions=['START_REVIEW','RETURN'];
   else if(a.status==='IN_CA_LEGAL_REVIEW') actions=['RECOMMEND_CA','RECOMMEND_LEGAL','RETURN'];
   else if(a.status==='CREDIT_COMMITTEE_REVIEW') actions=['APPROVE_COMMITTEE','REJECT_COMMITTEE','RETURN'];
 } else {
   if(user.role==='MKT'&&['DRAFT','RETURNED'].includes(a.status))actions=['SUBMIT_TO_BS'];
   if(user.role==='BS'&&a.status==='SUBMITTED_TO_BS')actions=['VERIFY_BS','RETURN'];
   if(user.role==='BS'&&a.status==='BS_VERIFIED')actions=['START_REVIEW','RETURN'];
   if(['CA','LEGAL'].includes(user.role)&&a.status==='IN_CA_LEGAL_REVIEW')actions=[user.role==='CA'?'RECOMMEND_CA':'RECOMMEND_LEGAL','RETURN'];
   if(user.role==='COMMITTEE'&&a.status==='CREDIT_COMMITTEE_REVIEW')actions=['APPROVE_COMMITTEE','REJECT_COMMITTEE','RETURN'];
 }

 async function save(){
   setBusy(true);
   setError('');
   try{
     const stakeholdersChanged=JSON.stringify(draft.stakeholders)!==JSON.stringify(a.stakeholders);
     const hasPicData=draft.pic&&Object.values(draft.pic).some(v=>v!==undefined&&v!==null&&String(v).trim()!==''&&String(v).trim()!=='-');
     const cleanProjects=(draft.projects||[]).filter((p:any)=>p&&Object.values(p).some((v:any)=>v!==undefined&&v!==null&&String(v).trim()!==''));
     const safeProfileData=Object.fromEntries(Object.entries(draft).filter(([k])=>!['proposal','financialStatements','legal','stakeholders','documentChecks','approvalLogs','signoffs','ratios'].includes(k)));
     if (!safeProfileData.latestDeedDate || String(safeProfileData.latestDeedDate).trim() === '' || String(safeProfileData.latestDeedDate) === 'null') {
       safeProfileData.latestDeedDate = null;
     }
     if (!safeProfileData.latestDeedNo || String(safeProfileData.latestDeedNo).trim() === '') {
       safeProfileData.latestDeedNo = null;
     }
     
     const resolvedName = liveCompanyName || customerDraft?.companyName || draft.customer?.companyName || draft.companyName || 'New Company (Draft)';
     const customerPayload = {
       ...(draft.customer||{}),
       ...(customerDraft||{}),
       companyName: resolvedName,
       companyType: liveCompanyType || 'CORPORATE',
       nib: liveNib || customerDraft?.nib || draft.customer?.nib || '',
       npwp: liveNpwp || customerDraft?.npwp || draft.customer?.npwp || '',
       establishmentActNo: (liveEstablishmentActNo || customerDraft?.establishmentActNo || draft.customer?.establishmentActNo || '').trim() || null,
       establishmentDate: (liveEstablishmentDate || customerDraft?.establishmentDate || draft.customer?.establishmentDate || null) || null,
       nibDate: (liveNibDate || customerDraft?.nibDate || draft.customer?.nibDate || null) || null
     };

     const body=tab===0?{
       profile:{
         ...safeProfileData,
         companyName: resolvedName,
         customerStatus: customerCategory
       },
       customer: customerPayload,
       customerCategory: customerCategory,
       ...(hasPicData?{pic:draft.pic}:{}),
       projects: cleanProjects
     }:tab===2?{
       projects:cleanProjects,
       bankReferences:draft.bankReferences,
       proposal:draft.proposal
     }:tab===3?{
       proposal:draft.proposal
     }:tab===4?{
       financialStatements:draft.financialStatements
     }:{
       legal:draft.legal||{},
       ...(stakeholdersChanged?{stakeholders:draft.stakeholders.map(stakeholderForSave)}:{})
     };

     const currentStage=activeStage||draft.stage||a.stage||'FAP Stage';
     const v=await api(`/applications/${a.id}/page-${tab<3?1:tab===5?'legal':2}`,'PUT',{...body,stage:currentStage});
     const nextApp={
       ...a,
       ...v,
       stage:currentStage,
       customer: {
         ...(a.customer||{}),
         ...(v?.customer||{}),
         ...customerPayload
       }
     };
     setDraft((prev:any)=>({...prev,...nextApp}));
     setCustomerDraft((prev:any)=>({...prev,...customerPayload}));
     onChange(nextApp);
     notify('Changes saved successfully');
   }catch(e:any){
     setError(e.message||'Failed to save changes.');
   }finally{
     setBusy(false);
   }
 }
 const p=draft.proposal||{...blank(proposalFields),units:[]};const principal=Number(p.financingValue)-Number(p.downPaymentValue),r=Number(p.interestRate)/1200,monthly=p.tenorMonths?(r?principal*r/(1-Math.pow(1+r,-Number(p.tenorMonths))):principal/Number(p.tenorMonths))/(master.paymentMethod.find(x=>x.value===p.paymentMethod)?.timing==='advance'?1+r:1):0;

 async function beginDeedReview(id:string){setError('');setBusy(true);try{if(canLegal){const list=legalDeedList(draft.legal||{},a),selected=draft.legal?.selectedDeedId||list.find(x=>x.type===(draft.legal?.selectedDeed||'establishment'))?.id||list[0]?.id,target=list.find(d=>d.id===id);if(!target)throw Error('Deed not found.');const deed=deedData({...target,stakeholders:Array.isArray(target.stakeholders)?target.stakeholders:target.id===selected?draft.stakeholders:[]});const v=await api(`/applications/${a.id}/deeds/${id}/draft`,'PUT',{deed});onChange(v);setDraft(structuredClone(v));}setReviewDeedId(id);}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 useEffect(()=>{if(tab!==1)return;const timer=setInterval(()=>api('/applications/'+a.id).then(onChange).catch(()=>{}),15000);return()=>clearInterval(timer);},[tab,a.id]);
   const renderCustomerDetailSections = () => (
    <div className="fap-accordion-group">
      {/* 01: Debtor Identity & Classification */}
      <div 
        className={`fap-accordion-card ${openSections['fap-preview-sec-header'] ? 'is-open' : 'is-closed'}`}
        id="acc-fap-preview-sec-header"
        onFocus={() => handleTriggerSync('fap-preview-sec-header')}
      >
        <div 
          className="fap-accordion-header" 
          onClick={() => toggleSection('fap-preview-sec-header')}
        >
          <div className="fap-acc-header-left">
            <span className="fap-acc-step-badge">01</span>
            <div className="fap-acc-titles">
              <div className="fap-acc-title-row">
                <h4 className="fap-acc-title">Debtor Identity & Classification</h4>
                <span className={`fap-acc-badge ${liveCompanyName ? 'success' : ''}`}>
                  {customerCategory === 'EXISTING' ? (selectedCustomer ? selectedCustomer.companyName : 'Select Debtor') : (liveCompanyName || 'New Debtor')}
                </span>
              </div>
              <p className="fap-acc-subtitle">Customer category (Existing / New), FAP registration number, NIB, and NPWP</p>
            </div>
          </div>
          <div className="fap-acc-header-right">
            <button 
              type="button" 
              className="fap-acc-sync-btn"
              title="Sync preview document to this section"
              onClick={(e) => {
                e.stopPropagation();
                handleTriggerSync('fap-preview-sec-header');
                setOpenSections(s => ({ ...s, ['fap-preview-sec-header']: true }));
              }}
            >
              <Eye size={12}/> Sync View
            </button>
            <span className={`fap-acc-chevron ${openSections['fap-preview-sec-header'] ? 'rotate' : ''}`}>
              <ChevronDown size={17} />
            </span>
          </div>
        </div>
        {openSections['fap-preview-sec-header'] && (
          <div className="fap-accordion-content">
            <div className="intake-system-fields" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:12,padding:'12px 14px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,marginBottom:16}}>
              <div>
                <span style={{fontSize:'0.75rem',color:'#64748b',display:'block'}}>Application date</span>
                <b style={{fontSize:'0.875rem',color:'#0f172a'}}>{new Date(draft.applicationDate || Date.now()).toLocaleDateString('en-GB')}</b>
              </div>
              <div>
                <span style={{fontSize:'0.75rem',color:'#64748b',display:'block'}}>FAP registration number</span>
                <b style={{fontSize:'0.875rem',color:'#0f172a'}}>{draft.isNew ? 'Generated automatically upon saving' : (draft.fapNumber || a.fapNumber || '—')}</b>
              </div>
            </div>
            <div className="customer-category-selector-box" style={{marginBottom:16}}>
              <label className="customer-category-select">
                Customer category
                <select 
                  value={customerCategory} 
                  disabled={!canEdit || (!draft.isNew && Boolean(a.customerId || a.customer_id))} 
                  onChange={e => changeCategory(e.target.value)}
                >
                  <option value="EXISTING">Existing customer</option>
                  <option value="NEW">New customer</option>
                </select>
              </label>
            </div>
            {customerCategory === 'EXISTING' ? (
              <>
                <div className="existing-customer-picker" style={{marginBottom:16}}>
                  <label>
                    Existing customer
                    <select 
                      value={customerId} 
                      disabled={!canEdit || (!draft.isNew && Boolean(a.customerId || a.customer_id))}
                      onChange={e => {
                        const cid = e.target.value;
                        setCustomerId(cid);
                        setError('');
                        const cust = customers.find((c: any) => c.id === cid);
                        if (cust) {
                          setDraft((prev: any) => ({
                            ...prev,
                            customerId: cid,
                            customer: cust,
                          }));
                        }
                      }}
                    >
                      <option value="">Select an existing customer</option>
                      {customers.map((c: any) => <option value={c.id} key={c.id}>{c.companyName}</option>)}
                    </select>
                  </label>
                </div>
                {selectedCustomer && (
                  <section className="existing-customer-summary" aria-label="FAP customer details">
                    <div>
                      <h3>{selectedCustomer.companyName}</h3>
                      <span>{label(selectedCustomer.companyType)} customer</span>
                    </div>
                    <dl>
                      <div><dt>NIB</dt><dd style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><span>{selectedCustomer.nib || '—'}</span><button type="button" onClick={()=>setNibOcrOpen(true)} title="Scan & Verifikasi Dokumen NIB via OCR" className="nib-header-ocr-btn"><ScanLine size={11}/><span>Scan OCR NIB</span></button></dd></div>
                      <div><dt>NPWP</dt><dd>{selectedCustomer.npwp || '—'}</dd></div>
                      <div><dt>Establishment Deed No</dt><dd>{selectedCustomer.establishmentActNo || '—'}</dd></div>
                    </dl>
                  </section>
                )}
              </>
            ) : (
              <div className="new-customer-fields-block" style={{marginTop:12}}>
                <div style={{marginBottom:12}}>
                  <h4 style={{margin:0,fontSize:'0.9rem',fontWeight:600,color:'#0f172a'}}>Company details</h4>
                  <p style={{margin:'2px 0 0 0',fontSize:'0.8rem',color:'#64748b'}}>New company identity (Company Name PT/CV, business type, NIB 13 digits, NPWP 15-16 digits, and establishment deed).</p>
                </div>
                <Fields 
                  fields={fapCustomerFields} 
                  onNibOcr={()=>setNibOcrOpen(true)}
                  value={customerDraft} 
                  disabled={!canEdit} 
                  onChange={c => {
                    setCustomerDraft(c);
                    // Sync establishment deed to latestDeed and experience if no deeds in legal yet
                    const legalDeeds:any[] = Array.isArray(draft.legal?.deeds) ? draft.legal.deeds : [];
                    const hasLegalEstablishment = legalDeeds.some((d:any)=>d.type==='establishment');
                    const hasLegalAmendment = legalDeeds.some((d:any)=>d.type==='amendment');
                    const estDate = String(c.establishmentDate||'').slice(0,10);
                    const exp = calculateAgeYearsMonths(estDate);
                    setDraft((prev: any) => ({
                      ...prev,
                      customer: c,
                      // If no establishment deed in legal yet, use manual input as latest
                      ...(!hasLegalAmendment && !hasLegalEstablishment ? {
                        latestDeedNo: c.establishmentActNo || prev.latestDeedNo || '',
                        latestDeedDate: estDate || prev.latestDeedDate || '',
                      } : {}),
                      // Experience always calculated from establishmentDate
                      ...(estDate ? {experienceYears: exp.years, experienceMonths: exp.months} : {}),
                    }));
                  }} 
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 02: Registration Office & Domicile */}
      <div 
        className={`fap-accordion-card ${openSections['fap-preview-sec-company'] ? 'is-open' : 'is-closed'}`}
        id="acc-fap-preview-sec-company"
        onFocus={() => handleTriggerSync('fap-preview-sec-company')}
      >
        <div 
          className="fap-accordion-header" 
          onClick={() => toggleSection('fap-preview-sec-company')}
        >
          <div className="fap-acc-header-left">
            <span className="fap-acc-step-badge">02</span>
            <div className="fap-acc-titles">
              <div className="fap-acc-title-row">
                <h4 className="fap-acc-title">Registration Office & Company Domicile</h4>
                <span className={`fap-acc-badge ${draft.city && draft.companyAddress ? 'success' : ''}`}>
                  {draft.city ? `${draft.city} (${draft.branchCode || 'Branch'})` : 'Not filled'}
                </span>
              </div>
              <p className="fap-acc-subtitle">Application branch, domicile ownership, full address, and official contact</p>
            </div>
          </div>
          <div className="fap-acc-header-right">
            <button 
              type="button" 
              className="fap-acc-sync-btn"
              title="Sync preview document to this section"
              onClick={(e) => {
                e.stopPropagation();
                handleTriggerSync('fap-preview-sec-company');
                setOpenSections(s => ({ ...s, ['fap-preview-sec-company']: true }));
              }}
            >
              <Eye size={12}/> Sync View
            </button>
            <span className={`fap-acc-chevron ${openSections['fap-preview-sec-company'] ? 'rotate' : ''}`}>
              <ChevronDown size={17} />
            </span>
          </div>
        </div>
        {openSections['fap-preview-sec-company'] && (
          <div className="fap-accordion-content">
            <div style={{marginBottom:14}}>
              <h5 style={{margin:'0 0 6px 0',fontSize:'0.82rem',color:'#1e293b',fontWeight:700}}>Office & Branch Status</h5>
              <Fields fields={profileFields.filter(f=>['branchCode','customerStatus','locationStatus'].includes(f.key))} value={draft} disabled={!canEdit} onChange={setDraft}/>
            </div>
            <div style={{borderTop:'1px dashed #e2e8f0',paddingTop:14}}>
              <h5 style={{margin:'0 0 6px 0',fontSize:'0.82rem',color:'#1e293b',fontWeight:700}}>Office Address & Official Contact</h5>
              <Fields fields={profileFields.filter(f=>['companyAddress','province','city','district','village','rt','rw','postalCode','phoneFax','email','website'].includes(f.key))} value={draft} disabled={!canEdit} onChange={setDraft}/>
            </div>
          </div>
        )}
      </div>

      {/* 03: Business Profile & Deed Legality */}
      <div 
        className={`fap-accordion-card ${openSections['fap-preview-sec-business'] ? 'is-open' : 'is-closed'}`}
        id="acc-fap-preview-sec-business"
        onFocus={() => handleTriggerSync('fap-preview-sec-business')}
      >
        <div 
          className="fap-accordion-header" 
          onClick={() => toggleSection('fap-preview-sec-business')}
        >
          <div className="fap-acc-header-left">
            <span className="fap-acc-step-badge">03</span>
            <div className="fap-acc-titles">
              <div className="fap-acc-title-row">
                <h4 className="fap-acc-title">Business Profile & Deed Legality</h4>
                <span className={`fap-acc-badge ${draft.mainBusiness ? 'success' : ''}`}>
                  {draft.mainBusiness || 'Not filled'}
                </span>
              </div>
              <p className="fap-acc-subtitle">Main business sector, operational experience, source of funds, and latest deed number</p>
            </div>
          </div>
          <div className="fap-acc-header-right">
            <button 
              type="button" 
              className="fap-acc-sync-btn"
              title="Sync preview document to this section"
              onClick={(e) => {
                e.stopPropagation();
                handleTriggerSync('fap-preview-sec-business');
                setOpenSections(s => ({ ...s, ['fap-preview-sec-business']: true }));
              }}
            >
              <Eye size={12}/> Sync View
            </button>
            <span className={`fap-acc-chevron ${openSections['fap-preview-sec-business'] ? 'rotate' : ''}`}>
              <ChevronDown size={17} />
            </span>
          </div>
        </div>
        {openSections['fap-preview-sec-business'] && (
          <div className="fap-accordion-content">
            <div style={{marginBottom:14}}>
              <h5 style={{margin:'0 0 6px 0',fontSize:'0.82rem',color:'#1e293b',fontWeight:700}}>Business Experience & Operations</h5>
              {(() => {
                const calculatedExp = liveEstablishmentDate ? calculateAgeYearsMonths(liveEstablishmentDate) : null;
                const operationalValues = {
                  ...draft,
                  experienceYears: calculatedExp ? String(calculatedExp.years) : (draft.experienceYears ?? ''),
                  experienceMonths: calculatedExp ? String(calculatedExp.months) : (draft.experienceMonths ?? ''),
                };
                const opFields: Field[] = [
                  profileFields.find(f => f.key === 'mainBusiness')!,
                  profileFields.find(f => f.key === 'repaymentSource')!,
                  profileFields.find(f => f.key === 'industrySegment')!,
                  profileFields.find(f => f.key === 'businessRole')!,
                  { ...profileFields.find(f => f.key === 'experienceYears')!, type: 'text' },
                  { ...profileFields.find(f => f.key === 'experienceMonths')!, type: 'text' },
                ].filter(Boolean);
                return (
                  <>
                    <Fields 
                      fields={opFields} 
                      value={operationalValues} 
                      disabled={!canEdit} 
                      onChange={v => {
                        const exp = liveEstablishmentDate ? calculateAgeYearsMonths(liveEstablishmentDate) : null;
                        setDraft({
                          ...v,
                          experienceYears: exp ? exp.years : (v.experienceYears ?? draft.experienceYears ?? 0),
                          experienceMonths: exp ? exp.months : (v.experienceMonths ?? draft.experienceMonths ?? 0)
                        });
                      }}
                    />
                    <small style={{color:'#64748b',fontSize:'0.72rem',display:'block',marginTop:6}}>
                      * Experience years & months are calculated automatically from the Establishment Deed Date
                    </small>
                  </>
                );
              })()}
            </div>
            <div style={{borderTop:'1px dashed #e2e8f0',paddingTop:14}}>
              <h5 style={{margin:'0 0 6px 0',fontSize:'0.82rem',color:'#1e293b',fontWeight:700}}>Amendment Deed Legal Summary</h5>
              <Fields fields={profileFields.filter(f=>['latestDeedNo','latestDeedDate'].includes(f.key))} value={draft} disabled={!canEdit} onChange={v=>{const exp=calculateAgeYearsMonths(liveEstablishmentDate);setDraft({...v,experienceYears:exp.years,experienceMonths:exp.months});}}/>
              {liveEstablishmentDate&&<small style={{color:'#94a3b8',fontSize:'0.72rem',display:'block',marginTop:4}}>Latest deed synced automatically from the Legal tab.</small>}
            </div>
          </div>
        )}
      </div>

      {/* 04: Primary Contact / PIC */}
      <div 
        className={`fap-accordion-card ${openSections['fap-preview-sec-pic'] ? 'is-open' : 'is-closed'}`}
        id="acc-fap-preview-sec-pic"
        onFocus={() => handleTriggerSync('fap-preview-sec-pic')}
      >
        <div 
          className="fap-accordion-header" 
          onClick={() => toggleSection('fap-preview-sec-pic')}
        >
          <div className="fap-acc-header-left">
            <span className="fap-acc-step-badge">04</span>
            <div className="fap-acc-titles">
              <div className="fap-acc-title-row">
                <h4 className="fap-acc-title">Primary Contact / Person in Charge (PIC)</h4>
                <span className={`fap-acc-badge ${draft.pic?.picName ? 'success' : ''}`}>
                  {draft.pic?.picName ? `${draft.pic.picName} (${draft.pic.position || 'PIC'})` : 'Not filled'}
                </span>
              </div>
              <p className="fap-acc-subtitle">PIC personal data, position/title, mobile number, and PIC domicile address</p>
            </div>
          </div>
          <div className="fap-acc-header-right">
            <button 
              type="button" 
              className="fap-acc-sync-btn"
              title="Sync preview document to this section"
              onClick={(e) => {
                e.stopPropagation();
                handleTriggerSync('fap-preview-sec-pic');
                setOpenSections(s => ({ ...s, ['fap-preview-sec-pic']: true }));
              }}
            >
              <Eye size={12}/> Sync View
            </button>
            <span className={`fap-acc-chevron ${openSections['fap-preview-sec-pic'] ? 'rotate' : ''}`}>
              <ChevronDown size={17} />
            </span>
          </div>
        </div>
        {openSections['fap-preview-sec-pic'] && (
          <div className="fap-accordion-content">
            <Fields fields={picFields} value={draft.pic||{}} disabled={!canEdit} onChange={pic=>setDraft({...draft,pic})}/>
          </div>
        )}
      </div>

      {/* 05: Segmentation & Active Projects */}
      <div 
        className={`fap-accordion-card ${openSections['fap-preview-sec-projects'] ? 'is-open' : 'is-closed'}`}
        id="acc-fap-preview-sec-projects"
        onFocus={() => handleTriggerSync('fap-preview-sec-projects')}
      >
        <div 
          className="fap-accordion-header" 
          onClick={() => toggleSection('fap-preview-sec-projects')}
        >
          <div className="fap-acc-header-left">
            <span className="fap-acc-step-badge">05</span>
            <div className="fap-acc-titles">
              <div className="fap-acc-title-row">
                <h4 className="fap-acc-title">Industry Segmentation & Active Projects</h4>
                <span className={`fap-acc-badge ${(draft.projects?.length || 0) > 0 ? 'success' : ''}`}>
                  {draft.projects?.length || 0} Projects
                </span>
              </div>
              <p className="fap-acc-subtitle">Debtor's active project contracts and business activities</p>
            </div>
          </div>
          <div className="fap-acc-header-right">
            <button 
              type="button" 
              className="fap-acc-sync-btn"
              title="Sync preview document to this section"
              onClick={(e) => {
                e.stopPropagation();
                handleTriggerSync('fap-preview-sec-projects');
                setOpenSections(s => ({ ...s, ['fap-preview-sec-projects']: true }));
              }}
            >
              <Eye size={12}/> Sync View
            </button>
            <span className={`fap-acc-chevron ${openSections['fap-preview-sec-projects'] ? 'rotate' : ''}`}>
              <ChevronDown size={17} />
            </span>
          </div>
        </div>
        {openSections['fap-preview-sec-projects'] && (
          <div className="fap-accordion-content">
            <Repeater title="Project contracts" description="Active project contracts and business activities (filled by Marketing)." fields={projectFields} rows={draft.projects||[]} disabled={!canEdit} carousel onChange={projects=>setDraft({...draft,projects})}/>
          </div>
        )}
      </div>
    </div>
  );

  return <><button className="text-link back-link" onClick={onBack}><ArrowLeft size={15}/>Back to workspace</button><div className="detail-heading"><IconBox><Building2 size={25}/></IconBox><div><div className="eyebrow">{draft.isNew ? <span>NEW APPLICATION · FAP INTAKE</span> : a.fapNumber ? <>{a.fapNumber}{a.branchCode && <span> / {a.branchCode}</span>}</> : a.branchCode || null}</div><div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}><h1>{liveCompanyName || (draft.isNew ? "New Financing Application" : "Financing Application")}</h1><span className={`stage-pill-indicator ${currentAppStage==='FAP Stage'?'stage-fap':'stage-preanalysis'}`}>Active Stage: {currentAppStage}</span></div><p>{draft.isNew ? <>FAP Intake Stage <span>·</span> {draft.city || draft.branchCode || "Draft"} <span>·</span> {new Date().toLocaleDateString("en-GB")}</> : <>{label(draft.industrySegment || a.industrySegment)} <span>·</span> {draft.city || a.city || '—'} <span>·</span> Created {date(draft.applicationDate || a.applicationDate)}</>}</p></div><Badge status={draft.isNew ? "DRAFT" : a.status}/></div><div className="chevron-stepper">{['FAP Stage','Pre-analysis','ICLF'].map((st,i)=><div key={st} className={`chevron-step ${i===0?'first':''} ${activeStage===st?'active':'inactive'}`} style={{cursor:draft.isNew&&st!=='FAP Stage'?'not-allowed':'pointer'}} title={draft.isNew&&st!=='FAP Stage'?'Please save the application first':`Switch to ${st} view tab`} onClick={()=>{if(draft.isNew&&st!=='FAP Stage'){notify('Please save the application (FAP Stage) first to unlock the next stage.');return;}setActiveStage(st);if(st==='FAP Stage')setTab(0);else if(st==='Pre-analysis')setTab(2);else if(st==='ICLF')setTab(6);}}>{st}</div>)}</div><div className="detail-summary"><div><span>Proposed financing</span><b>{money(draft.proposal?.financingValue||a.proposal?.financingValue)}</b></div><div><span>Financing term</span><b>{(draft.proposal?.tenorMonths||a.proposal?.tenorMonths)||'—'} months</b></div><div><span>Customer category</span><b>{customerCategory==='EXISTING'?'Existing customer':customerCategory==='NEW'?'New customer':label(a.customer?.companyType||'—')}</b></div><div><span>Documents verified</span><b>{a.documentChecks?`${a.documentChecks.filter((d:any)=>d.status==='VERIFIED').length} / ${a.documentChecks.length}`:'0 / 0'}</b></div></div><div className="detail-tabs">{tabOrder.map(id=><button key={tabs[id]} className={tab===id?'active':''} onClick={()=>{if(draft.isNew&&id!==0){notify('Please save the application (FAP Stage) before opening other tabs.');return;}setTab(id);setError('');}} title={draft.isNew&&id!==0?'Save application first':undefined} style={draft.isNew&&id!==0?{opacity:0.6,cursor:'not-allowed'}:undefined}>{tabs[id]}</button>)}</div>{error&&<div className="error">{error}</div>}{tab<6&&<section className="panel form-panel"><div className="panel-head"><div><h2>{tabs[tab]}</h2><p>{['Company profile and primary point of contact','View ownership and stakeholder information. Edit these fields in Legal.','Business details, bank facilities, financing terms, and equipment units','Equipment, financing terms, and estimated monthly installment','Three years of financial performance. All figures in IDR.','Deeds, related parties, and ownership structure.'][tab]}</p></div>{!(tab===1?false:tab===5?canLegal:tab===2?canFinance:tab<3?canEdit:canFinance)&&<span className="subtle-chip"><ShieldCheck size={14}/>Read only</span>}</div><div className="form-body">{isFapLocked&&<div className="stage-readonly-banner"><Lock size={16}/><span><strong>FAP Stage has been locked:</strong> The FAP Stage form has been signed and the application has advanced to the <strong>Pre-analysis</strong> stage. All FAP Stage data is read-only and cannot be modified.</span></div>}{tab===0&&<>
  <div className="customer-reference" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
      <Building2 size={18}/>
      <span><b>{customerCategory==='EXISTING'?(selectedCustomer?.companyName||'No debtor selected'):(liveCompanyName||'New Applicant')}</b> · NIB {customerCategory==='EXISTING'?(selectedCustomer?.nib||'—'):(liveNib||'—')} · NPWP {customerCategory==='EXISTING'?(selectedCustomer?.npwp||'—'):(liveNpwp||'—')}</span>
      {customerDetailLocked&&<span className="subtle-chip locked-chip" style={{display:'inline-flex',alignItems:'center',gap:'4px',color:'#047857',background:'#ecfdf5',borderColor:'#a7f3d0',fontWeight:600}}><Lock size={13}/> Locked</span>}
    </div>
    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
      <div className="fap-tab-layout-toggle" style={{margin:0}}>
        <button type="button" className={`fap-tab-toggle-btn ${sideBySide?'active':''}`} onClick={()=>setSideBySide(s=>!s)} title={sideBySide?"Close Side-by-side":"Open Side-by-side Live FAP"}><Columns size={14}/>{sideBySide?"Side-by-side Live FAP (Active)":"Open Side-by-side FAP"}</button>
      </div>
    </div>
  </div>
  {!sideBySide&&<div style={{display:'none'}} className="print-hidden-doc"><FapSheetPreview data={liveDetailFapData} onPrint={handlePrintFap}/></div>}
  {sideBySide ? (
    <div className="fap-detail-split-container">
      <div className="fap-detail-form-col">
        {renderCustomerDetailSections()}
      </div>
      <div className="fap-detail-preview-col">
        <FapSheetPreview 
          data={liveDetailFapData} 
          activeSection={activeSyncSection} 
          syncTick={syncTick} 
          onSectionClick={handlePreviewSectionClick} 
          onPrint={handlePrintFap} 
        />
      </div>
    </div>
  ) : (
    <div className="business-sections" style={{marginTop:14}}>
      {renderCustomerDetailSections()}
    </div>
  )}
</>}{tab===1&&<><StakeholderDeedView legal={draft.legal||{}} application={a} fallbackRows={draft.stakeholders}/></>}{tab===2&&<div className="business-sections"><section className="business-section"><Repeater title="Bank facilities" description="Existing company credit facilities and loans." fields={bankFields} rows={draft.bankReferences} disabled={!canEdit} carousel onChange={bankReferences=>setDraft({...draft,bankReferences})}/></section><section className="business-section"><div className="business-section-heading"><div><h3>Financing details</h3><p className="muted">Set the financing value, tenor, and terms.</p></div></div><Fields fields={proposalFields} value={p} disabled={!canFinance} onChange={proposal=>setDraft({...draft,proposal})}/><div className="simulation"><div><Wallet size={22}/><span>Estimated monthly installment<strong>{money(monthly)}</strong></span></div><p>Reducing balance estimate. Excludes fees, insurance, and taxes.<br/>Net principal: {money(principal)} · {p.paymentMethod||'In Arrear'}</p></div></section><section className="business-section"><Repeater title="Equipment units" description="Register details for each financed equipment unit." fields={unitFields} rows={p.units||[]} disabled={!canFinance} onChange={units=>setDraft({...draft,proposal:{...p,units}})}/></section></div>}{tab===4&&<FinancialEditor rows={draft.financialStatements} disabled={!canFinance} onChange={financialStatements=>setDraft({...draft,financialStatements})}/>}{tab===5&&<LegalEditor value={draft.legal||{}} application={a} stakeholders={draft.stakeholders} disabled={!canLegal} user={user} onReview={beginDeedReview} onChange={legal=>{const sync=deriveDeedSync(legal,a);const updCustomer={...(draft.customer||{}),establishmentActNo:sync.establishmentActNo||draft.customer?.establishmentActNo||"",establishmentDate:sync.establishmentDate||draft.customer?.establishmentDate||""};if(sync.establishmentActNo)setCustomerDraft((prev:any)=>({...prev,...updCustomer}));setDraft({...draft,legal,latestDeedNo:sync.latestDeedNo||draft.latestDeedNo||"",latestDeedDate:sync.latestDeedDate||draft.latestDeedDate||"",experienceYears:sync.experienceYears,experienceMonths:sync.experienceMonths,customer:sync.establishmentActNo?updCustomer:(draft.customer||{})});}} onStakeholdersChange={(legal,stakeholders)=>{const sync=deriveDeedSync(legal,a);const updCustomer={...(draft.customer||{}),establishmentActNo:sync.establishmentActNo||draft.customer?.establishmentActNo||"",establishmentDate:sync.establishmentDate||draft.customer?.establishmentDate||""};if(sync.establishmentActNo)setCustomerDraft((prev:any)=>({...prev,...updCustomer}));setDraft({...draft,legal,stakeholders,latestDeedNo:sync.latestDeedNo||draft.latestDeedNo||"",latestDeedDate:sync.latestDeedDate||draft.latestDeedDate||"",experienceYears:sync.experienceYears,experienceMonths:sync.experienceMonths,customer:sync.establishmentActNo?updCustomer:(draft.customer||{})});}}/>}</div><div className="form-bottom-actions"><div className="form-bottom-left">{draft.isNew ? <button type="button" className="button" onClick={onBack}><ArrowLeft size={15}/>Cancel / Return to Workspace</button> : !(tab===1?false:tab===5?canLegal:tab===2?canFinance:tab<3?canEdit:canFinance)&&<span className="subtle-chip"><ShieldCheck size={14}/>Read only</span>}</div><div className="form-bottom-right">{draft.isNew ? <button type="button" className="button primary" disabled={busy} onClick={saveNewApplication}>{busy?<Loader2 size={15} className="spin"/>:<Save size={15}/>}Save & Create Application</button> : (tab===1?false:tab===5?canLegal:tab===2?canFinance:tab<3?canEdit:canFinance)&&<button className="button primary" disabled={busy} onClick={tab===5?()=>setSaveConfirm(true):save}>{busy?<Loader2 size={15} className="spin"/>:<Save size={15}/>}Save changes</button>}{actions.length>0&&<div className="workflow-buttons">{actions.map(action=>{const isSubmitFap=isFapStage&&action==='SUBMIT_TO_BS';const isActionLocked=(isSubmitFap||action==='SUBMIT_TO_BS')&&isSubmitLocked;return <button key={action} className={'button '+(action==='RETURN'||action==='REJECT_COMMITTEE'?'':'primary')} disabled={isActionLocked} title={isActionLocked?"Tombol submit terkunci di database (is_locked = 1). Please upload the FAP Stage document in the Documents tab first.":undefined} onClick={()=>{if(isSubmitFap){setSubmitFapConfirm(true);}else{setComments('');setTransition(action);setError('');}}}>{isActionLocked&&<Lock size={13} style={{marginRight:4}}/>}{isSubmitFap?'Submit':({SUBMIT_TO_BS:'Submit to BS',VERIFY_BS:'Complete BS verification',START_REVIEW:'Start CA & Legal review',RECOMMEND_CA:'Sign off · CA',RECOMMEND_LEGAL:'Sign off · Legal',APPROVE_COMMITTEE:'Approve',REJECT_COMMITTEE:'Reject',RETURN:'Return'} as any)[action]}{!['RETURN','REJECT_COMMITTEE'].includes(action)&&<ArrowRight size={14}/>}</button>;})}</div>}</div></div></section>}{tab===6&&<Documents a={a} user={user} onChange={onChange} notify={notify} filterStage={activeStage}/>}{tab===7&&<section className="panel"><div className="panel-head"><h2>Application audit trail</h2><span className="subtle-chip"><ShieldCheck size={14}/>Append-only record</span></div><Audit logs={a.approvalLogs}/>{a.signoffs.length>0&&<div className="signoffs">{a.signoffs.map((s:any)=><div key={s.role}><CheckCheck size={16}/>{s.role} signed off by {s.actor} · {date(s.signed_at)}</div>)}</div>}</section>}{tab>=6&&actions.length>0&&<div className="form-bottom-actions"><div className="form-bottom-left"></div><div className="form-bottom-right"><div className="workflow-buttons">{actions.map(action=>{const isSubmitFap=isFapStage&&action==='SUBMIT_TO_BS';const isActionLocked=(isSubmitFap||action==='SUBMIT_TO_BS')&&isSubmitLocked;return <button key={action} className={'button '+(action==='RETURN'||action==='REJECT_COMMITTEE'?'':'primary')} disabled={isActionLocked} title={isActionLocked?"Tombol submit terkunci di database (is_locked = 1). Please upload the FAP Stage document in the Documents tab first.":undefined} onClick={()=>{if(isSubmitFap){setSubmitFapConfirm(true);}else{setComments('');setTransition(action);setError('');}}}>{isActionLocked&&<Lock size={13} style={{marginRight:4}}/>}{({SUBMIT_TO_BS:'Submit',VERIFY_BS:'Complete BS verification',START_REVIEW:'Start CA & Legal review',RECOMMEND_CA:'Sign off · CA',RECOMMEND_LEGAL:'Sign off · Legal',APPROVE_COMMITTEE:'Approve',REJECT_COMMITTEE:'Reject',RETURN:'Return'} as any)[action]}{!['RETURN','REJECT_COMMITTEE'].includes(action)&&<ArrowRight size={14}/>}</button>;})}</div></div></div>}{reviewDeedId&&<DeedReviewDialog application={a} user={user} deedId={reviewDeedId} onClose={()=>setReviewDeedId(null)} onUpdated={onChange}/ >}{saveConfirm&&<Modal title="Save Legal changes" onClose={()=>setSaveConfirm(false)}><div className="modal-body"><p>Save deed changes and Stakeholders on this application?</p></div><div className="modal-actions"><button className="button" onClick={()=>setSaveConfirm(false)}>Cancel</button><button className="button primary" onClick={()=>{setSaveConfirm(false);save();}}><Save size={15}/>Save changes</button></div></Modal>}{submitFapConfirm&&<Modal title="Submit FAP Stage" onClose={()=>setSubmitFapConfirm(false)}><div className="modal-body"><p className="muted">{a.customer?.companyName||draft.customer?.companyName} · {a.fapNumber}</p><p>Submit data FAP Stage dan lanjutkan ke tahap <strong>Pre-analysis</strong>?</p><p className="muted">Setelah disubmit, tab Pre-analysis (Business & banks, Financial statements, Documents) akan dibuka untuk pengisian informasi bisnis dan keuangan.</p>{isSubmitLocked&&<div className="error" style={{display:'flex',alignItems:'center',gap:6,marginBottom:12}}><Lock size={15}/> <span><b>Submit Button Locked:</b> FAP Stage form document not yet uploaded di tab Documents (is_locked = 1). Please upload the document on the Documents tab first to unlock the submit button.</span></div>}{error&&<div className="error">{error}</div>}</div><div className="modal-actions"><button className="button" onClick={()=>setSubmitFapConfirm(false)}>Cancel</button><button className="button primary" disabled={busy||isSubmitLocked} onClick={submitFapStage}>{busy?<Loader2 size={15} className="spin"/>:<ArrowRight size={15}/>}Submit ke Pre-analysis</button></div></Modal>}{transition&&<Modal title={label(transition)} onClose={()=>setTransition('')}><div className="modal-body"><p className="muted">{a.customer.companyName} · {a.fapNumber}</p><p>Required information and documents will be checked before this action is recorded.</p><label>Decision notes<textarea rows={4} value={comments} onChange={e=>setComments(e.target.value)} placeholder="Add context for the next reviewer…"/></label>{error&&<div className="error">{error}</div>}</div><div className="modal-actions"><button className="button" onClick={()=>setTransition('')}>Cancel</button><button className="button primary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{onChange(await api(`/applications/${a.id}/transition`,'POST',{action:transition,comments}));setTransition('');notify('Workflow action recorded');}catch(e:any){setError(e.message);}finally{setBusy(false);}}}>Confirm {label(transition).toLowerCase()}</button></div></Modal>}<NibOcrModal open={nibOcrOpen} onClose={()=>setNibOcrOpen(false)} onApply={handleApplyNibOcr} notify={notify}/>
    {fapComparisonModal && (
      <FapComparisonModal
        comparison={fapComparisonModal}
        onClose={() => setFapComparisonModal(null)}
        onApprove={handleApproveFapChangesInDetail}
        onCorrect={handleCorrectFapDataInDetail}
        busy={busy}
      />
    )}</>;
}
function StakeholderEditor({rows,onChange,disabled}:{rows:any[],onChange:(rows:any[])=>void,disabled:boolean}){const total=rows.reduce((sum,x)=>sum+Number(x.sharePercentage||0),0),isExceeded=total>100.01;return <><div className={'ownership '+(isExceeded?'unbalanced':'balanced')}><div><strong>{total.toFixed(2)}%</strong><span>Total ownership · max 100% (not required to be 100%)</span></div><div className="ownership-bar"><i style={{width:Math.min(100,total)+'%',background:isExceeded?'#dc2626':'#002c5f'}}/></div></div>{isExceeded&&<p style={{color:'#dc2626',fontSize:'12px',marginTop:'6px',fontWeight:600}}>⚠ Total share ownership exceeds 100%. Please readjust each party's share portion.</p>}<Repeater title="Stakeholders" fields={stakeholderFields} rows={rows.map(stakeholderEditorValues)} disabled={disabled} onChange={onChange}/></>;}
function FinancialEditor({rows,onChange,disabled}:{rows:any[],onChange:(r:any[])=>void,disabled:boolean}){const change=(i:number,k:string,v:any)=>onChange(rows.map((r,j)=>j===i?{...r,[k]:v}:r));return <><div className="section-title"><span className="muted">Enter exact values; totals are checked when saved.</span>{!disabled&&rows.length<3&&<button className="button small" onClick={()=>onChange([...rows,{...blank(financialFields),fiscalYear:new Date().getFullYear()-3+rows.length,isAudited:false}])}><Plus size={15}/>Add fiscal year</button>}</div><div className="table-scroll"><table className="financial-table"><thead><tr><th>FINANCIAL METRIC</th>{rows.map((r,i)=><th key={i}><div className="year-input"><input aria-label="Fiscal year" type="number" {...inputLimits('fiscalYear')} disabled={disabled} value={r.fiscalYear} onChange={e=>change(i,'fiscalYear',e.target.value)}/>{!disabled&&<button className="icon-button" onClick={()=>onChange(rows.filter((_,j)=>j!==i))}><X size={14}/></button>}</div><label className="checkbox"><input type="checkbox" disabled={disabled} checked={r.isAudited} onChange={e=>change(i,'isAudited',e.target.checked)}/>Audited</label></th>)}</tr></thead><tbody>{financialFields.map(f=><tr key={f.key} className={f.key.startsWith('total')||f.key==='netIncome'?'total-row':''}><td>{f.label}</td>{rows.map((r,i)=><td key={i}><input aria-label={`${r.fiscalYear} ${f.label}`} type="number" step="0.01" disabled={disabled} value={r[f.key]} onChange={e=>change(i,f.key,e.target.value)}/></td>)}</tr>)}<tr className="balance-row"><td>Balance check</td>{rows.map((r,i)=>{const ok=Number(r.currentAssets)+Number(r.nonCurrentAssets)===Number(r.totalAssets)&&Number(r.currentLiabilities)+Number(r.nonCurrentLiabilities)===Number(r.totalLiabilities)&&Number(r.totalAssets)===Number(r.totalLiabilities)+Number(r.equity)&&Number(r.totalAssets)===Number(r.totalLiabAndEquity);return <td key={i}><span className={ok?'text-brand':'text-red'}>{ok?'✓ Balanced':'! Unbalanced'}</span></td>;})}</tr>{[['Current ratio','currentAssets','currentLiabilities'],['Debt / equity','totalLiabilities','equity'],['Net profit margin','netIncome','revenue']].map(([name,n,d])=><tr key={name}><td>{name}</td>{rows.map((r,i)=><td key={i} className="ratio">{Number(r[d])?((Number(r[n])/Number(r[d]))*(name==='Net profit margin'?100:1)).toFixed(2)+(name==='Net profit margin'?'%':'×'):'N/A'}</td>)}</tr>)}</tbody></table></div>{!rows.length&&<div className="empty-small">Add three fiscal years to begin financial spreading.</div>}<p className="field-note">DSCR is unavailable because the specification does not capture depreciation. Zero-denominator ratios are shown as N/A.</p></>;}

function FapComparisonModal({
  comparison,
  onClose,
  onApprove,
  onCorrect,
  busy
}: {
  comparison: any;
  onClose: () => void;
  onApprove: (data: any) => void;
  onCorrect: () => void;
  busy: boolean;
}) {
  if (!comparison) return null;
  const diffs: Array<{ field: string; label: string; oldValue: string; newValue: string }> = comparison.diffs || [];

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} style={{zIndex: 9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div 
        className="modal fap-comparison-modal" 
        onClick={e => e.stopPropagation()} 
        style={{
          width: '94vw',
          maxWidth: '920px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          background: '#ffffff'
        }}
      >
        <div className="modal-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #e2e8f0', background:'#f8fafc'}}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <div style={{width: 36, height: 36, borderRadius: '8px', background: '#fef3c7', color: '#d97706', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{margin:0, fontSize:'16px', fontWeight:600, color:'#0f172a'}}>Signed FAP Form OCR Verification</h3>
              <p style={{margin:0, fontSize:'12px', color:'#64748b'}}>Differences detected between initial system data and physical document OCR results</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} style={{border:'none', background:'transparent', cursor:'pointer', padding:'4px'}}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{padding:'20px', overflowY:'auto', flex:1}}>
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <AlertCircle size={18} style={{flexShrink:0, marginTop:'2px'}} />
            <div>
              <strong>Non-Blocking Notice:</strong> The signed FAP form has been uploaded and the submit button is now unlocked. Below are the fields where data differences were detected between the system database and the physical document:
            </div>
          </div>

          <div style={{border:'1px solid #e2e8f0', borderRadius:'8px', overflow:'hidden', marginBottom:'16px'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
              <thead>
                <tr style={{background:'#f1f5f9', borderBottom:'1px solid #cbd5e1', textAlign:'left'}}>
                  <th style={{padding:'10px 14px', fontWeight:600, color:'#334155', width:'30%'}}>Field Name</th>
                  <th style={{padding:'10px 14px', fontWeight:600, color:'#334155', width:'35%'}}>Current System Data (Previous)</th>
                  <th style={{padding:'10px 14px', fontWeight:600, color:'#047857', width:'35%'}}>FAP Document Data (OCR Detected)</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((d, i) => (
                  <tr key={d.field || i} style={{borderBottom: i < diffs.length - 1 ? '1px solid #e2e8f0' : 'none', background: i % 2 === 0 ? '#ffffff' : '#f8fafc'}}>
                    <td style={{padding:'10px 14px', fontWeight:500, color:'#1e293b'}}>
                      {d.label}
                      <div style={{fontSize:'11px', color:'#94a3b8', fontFamily:'monospace'}}>{d.field}</div>
                    </td>
                    <td style={{padding:'10px 14px', color:'#64748b'}}>
                      <span style={{background:'#f1f5f9', padding:'3px 8px', borderRadius:'4px', border:'1px solid #e2e8f0', display:'inline-block'}}>
                        {d.oldValue || '—'}
                      </span>
                    </td>
                    <td style={{padding:'10px 14px', color:'#047857', fontWeight:500}}>
                      <span style={{background:'#ecfdf5', color:'#065f46', padding:'3px 8px', borderRadius:'4px', border:'1px solid #a7f3d0', display:'inline-block'}}>
                        {d.newValue}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{fontSize:'12px', color:'#64748b', lineHeight:1.5}}>
            Choose the next action:
            <ul style={{margin:'6px 0 0 18px', padding:0}}>
              <li><strong>Approve Changes:</strong> Updates the database values with the latest data from the physical FAP document and continues the process.</li>
              <li><strong>Correct Data:</strong> Closes this dialog and keeps the current data, allowing you to review or correct the data in the form manually.</li>
            </ul>
          </div>
        </div>

        <div className="modal-actions" style={{display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'10px', padding:'14px 20px', borderTop:'1px solid #e2e8f0', background:'#f8fafc'}}>
          <button 
            type="button" 
            className="button" 
            disabled={busy} 
            onClick={onCorrect} 
            style={{display:'inline-flex', alignItems:'center', gap:'6px'}}
          >
            <Pencil size={14} /> Correct Data
          </button>
          <button 
            type="button" 
            className="button primary" 
            disabled={busy} 
            onClick={() => onApprove(comparison.extractedData)} 
            style={{display:'inline-flex', alignItems:'center', gap:'6px', background:'#059669', borderColor:'#059669'}}
          >
            {busy ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />} Approve Changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function FapRemarksTinyMCE({
  initialContent,
  disabled,
  onChange,
}: {
  initialContent: string;
  disabled?: boolean;
  onChange: (html: string) => void;
}) {
  const [initialValue] = useState(() => initialContent);

  return (
    <div className="legal-tinymce-wrapper" style={{ width: '100%' }}>
      <Editor
        licenseKey="gpl"
        tinymceScriptSrc="/crm/tinymce/tinymce.min.js"
        initialValue={initialValue}
        disabled={disabled}
        onEditorChange={onChange}
        init={{
          height: 220,
          menubar: false,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'charmap',
            'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'table', 'help', 'wordcount'
          ],
          toolbar: 'undo redo | blocks | bold italic underline forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
          content_style: `
            body { 
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              font-size: 13px; 
              line-height: 1.6; 
              color: #0f172a; 
              padding: 10px 14px; 
            }
            ol {
              margin: 0 0 8px 0;
              padding-left: 24px;
              list-style-type: decimal !important;
            }
            ol li {
              margin-bottom: 4px;
              line-height: 1.6;
            }
            ul {
              margin: 0 0 8px 0;
              padding-left: 24px;
              list-style-type: disc !important;
            }
            ul li {
              margin-bottom: 4px;
              line-height: 1.6;
            }
            p {
              margin: 0 0 6px 0;
              line-height: 1.6;
            }
          `,
          branding: false,
          promotion: false,
          statusbar: true,
          setup: (ed: any) => {
            ed.on('init', () => {
              if (!disabled) {
                ed.mode.set('design');
              }
            });
          }
        }}
      />
    </div>
  );
}

function Documents({a,user,onChange,notify,filterStage}:{a:any,user:any,onChange:(a:any)=>void,notify:(s:string)=>void,filterStage?:string}){
  const evidenceDefs = [
    { code: 'FAP', name: 'fap', title: 'FAP (Financing Application Form)', stage: 'FAP Intake', badgeClass: 'stage-badge-fap', role: 'MKT', desc: 'Official signed financing application form from debtor' },
    { code: 'PREANALYSIS', name: 'Preanalysis', title: 'Pre-analysis Document', stage: 'Pre-analysis', badgeClass: 'stage-badge-preanalysis', role: 'CA', desc: 'Initial review and credit feasibility analysis by Credit Analyst' },
    { code: 'ICLF', name: 'Iclf', title: 'ICLF (Credit Committee Review)', stage: 'Credit Committee', badgeClass: 'stage-badge-iclf', role: 'COMMITTEE', desc: 'Approval recommendation and minutes of the financing committee meeting' },
  ];

  const defaultCode = filterStage === 'Pre-analysis' ? 'PREANALYSIS' : filterStage === 'ICLF' ? 'ICLF' : 'FAP';
  const [selectedCode, setSelectedCode] = useState<string>(defaultCode);
  useEffect(() => {
    if (filterStage === 'Pre-analysis') setSelectedCode('PREANALYSIS');
    else if (filterStage === 'ICLF') setSelectedCode('ICLF');
    else if (filterStage === 'FAP Stage') setSelectedCode('FAP');
  }, [filterStage]);

  const [activeFileUrl, setActiveFileUrl] = useState<string>('');
  const [activeFile, setActiveFile] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pdfZoom, setPdfZoom] = useState<string>('FitH');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const [fapComparison, setFapComparison] = useState<any>(null);
  const [fapRemarks, setFapRemarks] = useState<string>('');
  const [remarksSaveStatus, setRemarksSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [rightViewMode, setRightViewMode] = useState<'ocr' | 'pdf'>('ocr');
  const [systemZoom, setSystemZoom] = useState<number>(0.72);
  const [autoFitSystem, setAutoFitSystem] = useState<boolean>(true);
  const [fapNavFilter, setFapNavFilter] = useState<string>('all');

  const sectionFieldMap: Record<string, string[]> = {
    'fap-preview-sec-header': ['fapNumber', 'branchCode', 'customerStatus', 'companyType', 'applicationDate'],
    'fap-preview-sec-company': ['companyName', 'companyAddress', 'province', 'city', 'district', 'village', 'postalCode', 'rt', 'rw', 'nib', 'npwp', 'sktNo', 'sppkpNo', 'phoneFax', 'email', 'website', 'mainBusiness'],
    'fap-preview-sec-pic': ['picName', 'position', 'phone', 'email', 'picAddress', 'currentAddress', 'picCity', 'picProvince', 'picPostalCode', 'shareholders', 'representativeType', 'stakeholderType', 'idNumber'],
    'fap-preview-sec-facility': ['creditFacility', 'monthlyInstallment', 'bankOrFinInstitution', 'units', 'assetSummary', 'years', 'brand', 'modelName', 'quantity'],
    'fap-preview-sec-proposal': ['financingValue', 'downPaymentValue', 'securityDeposit', 'tenorMonths', 'interestRate', 'purposeDetail', 'financingMethod', 'paymentMethod', 'termsNotes']
  };

  const fapSectionTitles: Record<string, string> = {
    'fap-preview-sec-header': '1. Header & Register',
    'fap-preview-sec-company': '2. Company Profile',
    'fap-preview-sec-pic': '3. PIC & Shareholders',
    'fap-preview-sec-facility': '4. Facilities & Fixed Assets',
    'fap-preview-sec-proposal': '5. Financing Value'
  };

  const filteredDiffs = useMemo(() => {
    if (!fapComparison?.diffs) return [];
    if (fapNavFilter === 'all') return fapComparison.diffs;
    const allowed = sectionFieldMap[fapNavFilter] || [];
    return fapComparison.diffs.filter((d: any) => allowed.includes(d.field));
  }, [fapComparison, fapNavFilter]);

  // Reset state when switching application to prevent cross-application data leakage
  useEffect(() => {
    setActiveFile(null);
    setActiveFileUrl('');
    setFapComparison(null);
    setFapRemarks('');
    setRemarksSaveStatus('idle');
    setShowHistoryModal(false);
    setRightViewMode('ocr');
    setFapNavFilter('all');
  }, [a.id]);

  const scrollToFapField = (fieldKey: string) => {
    const el = document.getElementById(`fap-diff-cell-${fieldKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('fap-cell-diff-pulse');
      void el.offsetWidth;
      el.classList.add('fap-cell-diff-pulse');
      setTimeout(() => {
        el.classList.remove('fap-cell-diff-pulse');
      }, 5000);
    }
  };

  const scrollToFapSection = (secId: string) => {
    setFapNavFilter(secId);
    const viewports = document.querySelectorAll('.excel-fap-viewport');
    let scrolled = false;

    viewports.forEach(vp => {
      const target = vp.querySelector(`[id="${secId}"]`) as HTMLElement;
      if (target) {
        const vpRect = vp.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const delta = targetRect.top - vpRect.top;
        
        vp.scrollTo({
          top: vp.scrollTop + delta - 14,
          behavior: 'smooth'
        });

        target.classList.remove('fap-cell-diff-pulse');
        void target.offsetWidth;
        target.classList.add('fap-cell-diff-pulse');
        setTimeout(() => target.classList.remove('fap-cell-diff-pulse'), 3500);
        scrolled = true;
      }
    });

    if (!scrolled) {
      const el = document.getElementById(secId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const items = evidenceDefs.map(def => {
    const chk = (a.documentChecks || []).find((d: any) => 
      String(d.documentCode).toUpperCase() === def.code || 
      String(d.documentName).toLowerCase() === def.name.toLowerCase()
    ) || {
      id: `demo-doc-${a.id}-${def.code}`,
      documentCode: def.code,
      documentName: def.name,
      assignedRole: def.role,
      status: 'PENDING',
      files: []
    };
    return { ...def, chk };
  });

  const totalFilesCount = items.reduce((sum, item) => sum + (item.chk.files?.length || 0), 0);
  const activeItem = items.find(x => x.code === selectedCode) || items[0];
  const activeFiles = activeItem.chk.files || [];

  const pdfViewerSrc = useMemo(() => {
    if (!activeFileUrl || activeFile?.mimeType !== 'application/pdf') return activeFileUrl;
    const base = activeFileUrl.split('#')[0];
    const zoomParam = pdfZoom === 'FitH' ? 'view=FitH' : pdfZoom === 'Fit' ? 'view=Fit' : `zoom=${pdfZoom}`;
    return `${base}#toolbar=1&navpanes=0&${zoomParam}`;
  }, [activeFileUrl, activeFile?.mimeType, pdfZoom]);

  const canUpload = user.isAdmin || user.role === 'ADMIN' || ['MKT','BS','HEAD_BS','CA','LEGAL','COMMITTEE'].includes(user.role);

  // Automatically preview latest file if available and none selected
  useEffect(() => {
    if (activeFiles.length > 0) {
      if (!activeFile || !activeFiles.some((f: any) => f.id === activeFile.id)) {
        previewFile(activeFiles[activeFiles.length - 1]);
      }
    } else {
      setActiveFile(null);
      setActiveFileUrl('');
    }
  }, [selectedCode, activeFiles.length]);

  // Load existing FAP comparison from backend on stage switch or when files change
  useEffect(() => {
    if (selectedCode === 'FAP' && activeFiles.length > 0) {
      api(`/applications/${a.id}/fap-comparison`).then(res => {
        setFapComparison(res?.comparison || null);
        if (res?.comparison?.remarks) {
          setFapRemarks(res.comparison.remarks);
          setRemarksSaveStatus('saved');
        } else {
          setFapRemarks('');
          setRemarksSaveStatus('idle');
        }
      }).catch(() => {
        setFapComparison(null);
        setFapRemarks('');
        setRemarksSaveStatus('idle');
      });
    } else {
      setFapComparison(null);
      setFapRemarks('');
      setRemarksSaveStatus('idle');
    }
  }, [selectedCode, a.id, activeFiles.length]);

  const liveFapData: FapSheetData = useMemo(() => ({
    fapNumber: a.fapNumber || '-',
    applicationDate: a.applicationDate || new Date().toISOString(),
    branchCode: a.branchCode || a.profile?.branchCode || '',
    customerStatus: a.customerCategory || a.profile?.customerStatus || 'EXISTING',
    companyName: a.customer?.companyName || a.companyName || '',
    companyType: a.customer?.companyType || a.companyType || 'PT',
    nib: a.customer?.nib || a.nib || '',
    nibDate: a.customer?.nibDate || a.nibDate || '',
    npwp: a.customer?.npwp || a.npwp || '',
    establishmentActNo: a.customer?.establishmentActNo || a.establishmentActNo || '',
    establishmentDate: a.customer?.establishmentDate || a.establishmentDate || '',
    companyAddress: a.customer?.companyAddress || a.companyAddress || '',
    city: a.customer?.city || a.city || '',
    province: a.customer?.province || a.province || '',
    postalCode: a.customer?.postalCode || a.postalCode || '',
    experienceYears: a.customer?.experienceYears ?? a.experienceYears ?? '',
    experienceMonths: a.customer?.experienceMonths ?? a.experienceMonths ?? '',
    mainBusiness: a.mainBusiness || a.customer?.mainBusiness || '',
    latestDeedNo: a.latestDeedNo || '',
    latestDeedDate: a.latestDeedDate || '',
    phoneFax: a.phoneFax || '',
    website: a.website || '',
    email: a.email || '',
    repaymentSource: a.repaymentSource || '',
    locationStatus: a.locationStatus || '',
    picName: a.pic?.picName || '',
    position: a.pic?.position || '',
    phone: a.pic?.phone || '',
    currentAddress: a.pic?.currentAddress || '',
    picCity: a.pic?.city || '',
    picProvince: a.pic?.province || '',
    picPostalCode: a.pic?.postalCode || '',
    selectedDeedNo: a.selectedDeedNo || a.customer?.establishmentActNo || '',
    stakeholders: a.stakeholders || [],
    facilityPurpose: a.proposal?.facilityPurpose || a.facilityPurpose || '',
    financingMethod: a.proposal?.financingMethod || a.financingMethod || '',
    financingValue: a.proposal?.financingValue || a.financingValue || '',
    downPaymentValue: a.proposal?.downPaymentValue || a.downPaymentValue || '',
    interestRate: a.proposal?.interestRate || a.interestRate || '',
    tenorMonths: a.proposal?.tenorMonths || a.tenorMonths || '',
    paymentMethod: a.proposal?.paymentMethod || a.paymentMethod || 'In Arrear',
    industrySegment: a.industrySegment || '',
    businessRole: a.businessRole || '',
    proposal: a.proposal || {},
    projects: a.projects || [],
    bankReferences: a.bankReferences || [],
    financialStatements: a.financialStatements || []
  }), [a]);

  const ocrFapData: FapSheetData = useMemo(() => {
    const ext = fapComparison?.extractedData || {};
    return {
      fapNumber: ext.fapNumber || a.fapNumber || '',
      applicationDate: ext.applicationDate || '',
      branchCode: ext.branchCode || '',
      customerStatus: ext.customerStatus || '',
      companyName: ext.companyName || '',
      companyType: ext.companyType || '',
      nib: ext.nib || '',
      nibDate: ext.nibDate || '',
      npwp: ext.npwp || '',
      establishmentActNo: ext.establishmentActNo || '',
      establishmentDate: ext.establishmentDate || '',
      latestDeedNo: ext.latestDeedNo || '',
      latestDeedDate: ext.latestDeedDate || '',
      companyAddress: ext.companyAddress || '',
      rt: ext.rt || '',
      rw: ext.rw || '',
      city: ext.city || '',
      province: ext.province || '',
      postalCode: ext.postalCode || '',
      phoneFax: ext.phoneFax || '',
      email: ext.email || '',
      website: ext.website || '',
      repaymentSource: ext.repaymentSource || '',
      locationStatus: ext.locationStatus || '',
      mainBusiness: ext.mainBusiness || '',
      experienceYears: ext.experienceYears || '',
      experienceMonths: ext.experienceMonths || '',
      picName: ext.picName || '',
      position: ext.picPosition || ext.position || '',
      phone: ext.picPhone || ext.phone || '',
      picEmail: ext.picEmail || ext.email || '',
      currentAddress: ext.picAddress || ext.currentAddress || '',
      picCity: ext.picCity || '',
      picProvince: ext.picProvince || '',
      picPostalCode: ext.picPostalCode || '',
      facilityPurpose: ext.facilityPurpose || '',
      financingMethod: ext.financingMethod || '',
      financingValue: ext.financingValue != null ? ext.financingValue : 0,
      downPaymentValue: ext.downPaymentValue != null ? ext.downPaymentValue : 0,
      interestRate: ext.interestRate != null ? ext.interestRate : 0,
      tenorMonths: ext.tenorMonths != null ? ext.tenorMonths : 0,
      paymentMethod: ext.paymentMethod || '',
      stakeholders: ext.stakeholders || [],
      projects: ext.projects || [],
      bankReferences: ext.bankReferences || [],
      financialStatements: ext.financialStatements || [],
      proposal: {
        facilityPurpose: ext.facilityPurpose || '',
        financingMethod: ext.financingMethod || '',
        financingValue: ext.financingValue != null ? ext.financingValue : 0,
        downPaymentValue: ext.downPaymentValue != null ? ext.downPaymentValue : 0,
        interestRate: ext.interestRate != null ? ext.interestRate : 0,
        tenorMonths: ext.tenorMonths != null ? ext.tenorMonths : 0,
        paymentMethod: ext.paymentMethod || ''
      }
    };
  }, [fapComparison, a.fapNumber]);

  async function previewFile(f: any) {
    try {
      if (f.demoData && f.demoData.startsWith('data:')) {
        setActiveFileUrl(f.demoData);
        setActiveFile(f);
        setZoom(1);
        setRotation(0);
        return;
      }
      const v = await api(`/files/${f.id}/url`);
      setActiveFileUrl(v.url);
      setActiveFile(f);
      setZoom(1);
      setRotation(0);
    } catch (e: any) {
      if (f.demoData) {
        setActiveFileUrl(f.demoData);
        setActiveFile(f);
        setZoom(1);
        setRotation(0);
      } else {
        setError(e.message || 'Failed to load document preview.');
      }
    }
  }

  async function handleFileUpload(item: any, file: File) {
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('checklistId', item.chk.id || item.code);
      body.append('documentCode', item.code);
      body.append('file', file);
      const res = await api(`/applications/${a.id}/documents/upload`, 'POST', body);
      const updated = await api(`/applications/${a.id}`);
      onChange(updated);
      notify(`Evidence ${item.title} uploaded successfully.`);
      if (res?.fapComparison?.isFap) {
        setFapComparison(res.fapComparison);
        if (res.fapComparison.hasDifferences) {
          notify(`FAP Document OCR Verification: ${res.fapComparison.diffs?.length || 0} data differences detected.`);
        } else {
          notify('FAP Document OCR Verification: Data matches the system, no differences detected.');
        }
      }
      const updatedChk = (updated.documentChecks || []).find((d: any) => 
        d.id === item.chk.id || 
        String(d.documentCode).toUpperCase() === item.code
      );
      if (updatedChk?.files?.length) {
        previewFile(updatedChk.files[updatedChk.files.length - 1]);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to upload evidence: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteFile(item: any, fileId: string) {
    if (!confirm('Delete this evidence file?')) return;
    setBusy(true);
    setError('');
    try {
      try {
        await api(`/applications/${a.id}/documents/${fileId}`, 'DELETE');
      } catch (err1: any) {
        await api(`/applications/${a.id}/documents/files/${fileId}`, 'DELETE');
      }
      const updated = await api(`/applications/${a.id}`);
      onChange(updated);

      const isFap = item.code === 'FAP' || 
                    String(item.documentCode || '').toUpperCase() === 'FAP' || 
                    String(item.chk?.documentCode || '').toUpperCase() === 'FAP' ||
                    String(item.name || '').toUpperCase().includes('FAP') ||
                    String(item.title || '').toUpperCase().includes('FAP');
      const updatedFap = (updated.documentChecks || []).find((d: any) => 
        String(d.documentCode).toUpperCase() === 'FAP' || String(d.documentName).toLowerCase().includes('fap')
      );
      const remainingFapFiles = updatedFap?.files?.length || 0;

      if (isFap) {
        if (remainingFapFiles === 0) {
          setFapComparison(null);
          setActiveFileUrl('');
          setActiveFile(null);
        } else {
          if (activeFile?.id === fileId) {
            const nextFile = updatedFap.files[updatedFap.files.length - 1];
            previewFile(nextFile);
          }
          try {
            const compRes = await api(`/applications/${a.id}/fap-comparison`);
            setFapComparison(compRes?.comparison || null);
          } catch {
            setFapComparison(null);
          }
        }
      } else {
        if (activeFile?.id === fileId) {
          setActiveFileUrl('');
          setActiveFile(null);
        }
      }
      notify('Evidence file deleted successfully.');
    } catch (e: any) {
      setError(e.message || 'Failed to delete evidence file.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveFapRemarks() {
    setRemarksSaveStatus('saving');
    try {
      await api(`/applications/${a.id}/fap-comparison/remarks`, 'POST', { remarks: fapRemarks });
      setRemarksSaveStatus('saved');
      notify('FAP verification remarks saved successfully.');
    } catch (err: any) {
      setRemarksSaveStatus('unsaved');
      setError('Failed to save verification remarks: ' + (err.message || ''));
    }
  }

  async function handleApproveFapChanges(extractedData: any) {
    setBusy(true);
    setError('');
    try {
      await api(`/applications/${a.id}/fap-changes/approve`, 'POST', {
        approvedData: extractedData,
        remarks: fapRemarks
      });
      const updated = await api(`/applications/${a.id}`);
      onChange(updated);
      setFapComparison(null);
      notify('OCR data changes approved and updated in database.');
    } catch (err: any) {
      setError('Failed to approve data changes: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDismissFapChanges() {
    setBusy(true);
    setError('');
    try {
      await api(`/applications/${a.id}/fap-changes/dismiss`, 'POST', {
        remarks: fapRemarks
      });
      setFapComparison(null);
      notify('OCR changes dismissed. Current system data retained.');
    } catch (err: any) {
      setError('Failed to dismiss data changes: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRunFapComparison() {
    setBusy(true);
    setError('');
    try {
      const res = await api(`/applications/${a.id}/fap-comparison/run`, 'POST');
      if (res?.comparison) {
        setFapComparison(res.comparison);
        if (res.comparison.hasDifferences) {
          notify(`OCR scan complete: ${res.comparison.diffs?.length || 0} data differences found.`);
        } else {
          notify('OCR scan complete: Physical document data matches 100% with the system database.');
        }
      } else {
        notify('OCR scan complete.');
      }
    } catch (err: any) {
      setError('Failed to run OCR verification: ' + (err.message || ''));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="evidence-studio-container">
      {/* Studio Header & Stage Pill Navigation */}
      <div className="evidence-studio-header">
        <div className="evidence-studio-title-area">
          <div className="evidence-studio-badge">
            <FolderCheck size={14} /> Studio Evidence
          </div>
          <h2>Evidence Files & Live Document Studio</h2>
          <p>
            Digital document management for financing application of debtor <strong>{a.customer?.companyName || 'Debtor'}</strong> ({a.fapNumber || 'FAP'}) · <strong>{totalFilesCount} Files Uploaded</strong>
          </p>
        </div>

        {/* Linear/Prolab Segmented Pill Navigation */}
        <div className="evidence-pill-nav" role="tablist" aria-label="Document Stage Navigation">
          {items.map(item => {
            const isSelected = item.code === selectedCode;
            const count = item.chk.files?.length || 0;
            const isDone = item.chk.status === 'VERIFIED' || count > 0;
            return (
              <button
                key={item.code}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`evidence-pill-btn ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedCode(item.code)}
              >
                <span className="evidence-pill-label">{item.stage}</span>
                <span className="evidence-pill-role">{item.role}</span>
                <span className={`evidence-pill-count ${count > 0 ? 'has-files' : ''}`}>
                  {count}
                </span>
                {isDone && <CheckCircle size={13} className="evidence-pill-done-icon" />}
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="error" role="alert" style={{ marginBottom: '14px' }}>{error}</div>}

      {/* When FAP is selected: Full-Width Top Uploader + 50/50 Split Preview + Bottom Diff Panel */}
      {selectedCode === 'FAP' ? (
        <div className="fap-studio-fap-view">
          {/* Top Section: Full-Width Upload Banner with History Pop-up Button */}
          <div className="fap-evidence-full-top">
            <div className="fap-evidence-top-header">
              <div className="fap-evidence-top-title-area">
                <div className="fap-evidence-top-icon">
                  <UploadCloud size={20} />
                </div>
                <div className="fap-evidence-top-text">
                  <h3>Upload Signed FAP Form Evidence (Customer Signed)</h3>
                  <p>Upload a scanned file or PDF of the physically signed FAP form for automatic OCR verification.</p>
                </div>
              </div>
              <div className="fap-evidence-top-actions">
                <button
                  type="button"
                  className="fap-history-popup-btn"
                  onClick={() => setShowHistoryModal(true)}
                  title="Open the list of uploaded FAP document history"
                >
                  <Files size={15} color="#002060" />
                  <span>Upload History ({activeFiles.length})</span>
                </button>
                <Badge status={activeItem.chk.status || (activeFiles.length ? 'UPLOADED' : 'PENDING')} />
              </div>
            </div>

            {/* Full-width Dropzone */}
            {canUpload && (
              <label className="fap-dropzone-full" onClick={e => e.stopPropagation()}>
                <div className="fap-dropzone-full-icon">
                  {busy ? <Loader2 size={22} className="spin" /> : <UploadCloud size={22} />}
                </div>
                <strong>{busy ? 'Uploading and processing OCR...' : 'Drag & drop FAP PDF/Image file here, or click to select a file'}</strong>
                <span>Files are automatically named with application hash and date stamp</span>
                <span className="fap-dropzone-full-hint">
                  Supported formats: PDF, PNG, JPEG · Max 20 MB · Automatic system data vs OCR comparison
                </span>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  disabled={busy}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(activeItem, f);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>

          {/* Unified Section Navigation Bar */}
          <div className="fap-unified-section-nav">
            <div className="fap-nav-left">
              <span className="fap-nav-label">
                <Files size={14} color="#002060" /> Form Navigation:
              </span>
              <button 
                type="button" 
                className={fapNavFilter === 'all' ? 'active' : ''} 
                onClick={() => { setFapNavFilter('all'); scrollToFapSection('fap-preview-sec-header'); }}
              >
                All Sections
              </button>
              <button 
                type="button" 
                className={fapNavFilter === 'fap-preview-sec-header' ? 'active' : ''} 
                onClick={() => scrollToFapSection('fap-preview-sec-header')}
              >
                1. Header & Register
              </button>
              <button 
                type="button" 
                className={fapNavFilter === 'fap-preview-sec-company' ? 'active' : ''} 
                onClick={() => scrollToFapSection('fap-preview-sec-company')}
              >
                2. Company Profile
              </button>
              <button 
                type="button" 
                className={fapNavFilter === 'fap-preview-sec-pic' ? 'active' : ''} 
                onClick={() => scrollToFapSection('fap-preview-sec-pic')}
              >
                3. PIC & Shareholders
              </button>
              <button 
                type="button" 
                className={fapNavFilter === 'fap-preview-sec-facility' ? 'active' : ''} 
                onClick={() => scrollToFapSection('fap-preview-sec-facility')}
              >
                4. Facilities & Fixed Assets
              </button>
              <button 
                type="button" 
                className={fapNavFilter === 'fap-preview-sec-proposal' ? 'active' : ''} 
                onClick={() => scrollToFapSection('fap-preview-sec-proposal')}
              >
                5. Financing Value
              </button>
            </div>
          </div>

          {/* 50 / 50 Comparison Split Grid */}
          <div className="fap-comparison-grid-5050">
            {/* Left Pane (50%): Dokumen Terakhir yang di-generate oleh sistem */}
            <div className="fap-pane-card">
              <div className="fap-pane-head">
                <div className="fap-pane-head-top">
                  <div className="fap-pane-head-info">
                    <h4>
                      <FileSpreadsheet size={16} color="#002060" />
                      System FAP Document (Last Generated)
                    </h4>
                    <span className="fap-pane-head-sub">
                      Current live database data · FAP No: {a.fapNumber || '-'}
                    </span>
                  </div>
                  <div className="fap-pane-head-actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() => printFapDocument(a.fapNumber)}
                      title="Print system FAP form"
                      style={{display:'inline-flex', alignItems:'center', gap:'5px', fontSize:'11.5px', height:'26px', padding:'2px 10px'}}
                    >
                      <Printer size={13} /> Print Form
                    </button>
                  </div>
                </div>
                <div className="fap-pane-head-bottom">
                  <div style={{display:'flex', alignItems:'center', gap:'6px', marginLeft:'auto'}}>
                    <span style={{fontSize:'11px', color:'#64748b', fontWeight:500}}>Zoom:</span>
                    <div className="excel-zoom-controls compact" style={{display:'inline-flex', alignItems:'center', gap:'3px', background:'#f1f5f9', padding:'2px 6px', borderRadius:'6px', border:'1px solid #cbd5e1', height:'26px', boxSizing:'border-box'}}>
                      <button type="button" onClick={() => setSystemZoom(z => Math.max(0.4, Number((z - 0.05).toFixed(2))))} className="button small" style={{padding:'2px 6px', height:'20px'}} title="Zoom Out (-)">
                        <ZoomOut size={12} />
                      </button>
                      <span style={{fontSize:'11px', fontWeight:600, minWidth:'36px', textAlign:'center'}}>{Math.round(systemZoom * 100)}%</span>
                      <button type="button" onClick={() => setSystemZoom(z => Math.min(1.4, Number((z + 0.05).toFixed(2))))} className="button small" style={{padding:'2px 6px', height:'20px'}} title="Zoom In (+)">
                        <ZoomIn size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="fap-pane-body fap-pane-body-system">
                <FapSheetPreview
                  data={liveFapData}
                  isComparison={true}
                  hideToolbar={true}
                  diffSide="system"
                  diffs={activeFiles.length > 0 && fapComparison ? fapComparison.diffs || [] : []}
                  externalZoom={systemZoom}
                  onPrint={() => printFapDocument(a.fapNumber)}
                />
              </div>
            </div>

            {/* Right Pane (50%): Dokumen Hasil OCR (Fisik Terunggah) */}
            <div className="fap-pane-card">
              <div className="fap-pane-head">
                <div className="fap-pane-head-top">
                  <div className="fap-pane-head-info">
                    <h4>
                      <FileSpreadsheet size={16} color="#002060" />
                      OCR Physical Signed FAP
                    </h4>
                    <span className="fap-pane-head-sub" title={activeFile ? activeFile.fileName : ''}>
                      {activeFile ? activeFile.fileName : 'No physical document uploaded yet'}
                    </span>
                  </div>
                  <div className="fap-pane-head-actions">
                    {activeFile && (
                      <>
                        <span className="studio-file-tag" style={{padding:'2px 8px', fontSize:'11px', background:'#e2e8f0', borderRadius:'4px', fontWeight:600, height:'24px', display:'inline-flex', alignItems:'center'}}>
                          {activeFile.mimeType === 'application/pdf' ? 'PDF' : 'IMG'}
                        </span>
                        {activeFileUrl && (
                          <a
                            href={activeFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="button small"
                            style={{display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'11.5px', height:'26px', padding:'2px 10px', textDecoration:'none'}}
                            title="Open document in new tab"
                          >
                            <ExternalLink size={12} /> Open Tab
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="fap-pane-head-bottom">
                  {activeFile && (
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                      <button
                        type="button"
                        className="button small"
                        disabled={busy}
                        onClick={handleRunFapComparison}
                        style={{display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'11px', height:'26px', padding:'2px 10px'}}
                        title="Re-scan the physical document and compare with the latest system data"
                      >
                        {busy ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
                        Re-scan OCR
                      </button>
                      <div style={{display:'inline-flex', background:'#f1f5f9', padding:'2px', borderRadius:'6px', border:'1px solid #cbd5e1'}}>
                        <button
                          type="button"
                          className={`button small ${rightViewMode === 'ocr' ? 'primary' : ''}`}
                          onClick={() => setRightViewMode('ocr')}
                          style={{fontSize:'11px', padding:'2px 10px', height:'22px', borderRadius:'4px'}}
                          title="Show OCR-extracted FAP form with difference highlights"
                        >
                          <FileSpreadsheet size={12} style={{marginRight:4}} /> OCR Form
                        </button>
                        <button
                          type="button"
                          className={`button small ${rightViewMode === 'pdf' ? 'primary' : ''}`}
                          onClick={() => setRightViewMode('pdf')}
                          style={{fontSize:'11px', padding:'2px 10px', height:'22px', borderRadius:'4px'}}
                          title="Show original physical PDF file"
                        >
                          <Eye size={12} style={{marginRight:4}} /> Original File
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="fap-pane-body fap-pane-body-physical">
                {activeFiles.length > 0 && activeFileUrl ? (
                  rightViewMode === 'ocr' ? (
                    <FapSheetPreview
                      data={ocrFapData}
                      isComparison={true}
                      hideToolbar={true}
                      diffSide="ocr"
                      diffs={activeFiles.length > 0 && fapComparison ? fapComparison.diffs || [] : []}
                      externalZoom={systemZoom}
                      onPrint={() => printFapDocument(a.fapNumber)}
                    />
                  ) : activeFile?.mimeType === 'application/pdf' ? (
                    <iframe
                      src={pdfViewerSrc}
                      title="Dokumen Fisik Signed FAP"
                      style={{ width: '100%', height: '100%', border: 'none', background: '#ffffff', flex: 1 }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '16px', flex: 1 }}>
                      <img
                        src={activeFileUrl}
                        alt="Dokumen Fisik Signed FAP"
                        style={{ maxWidth: `${zoom * 100}%`, transform: `rotate(${rotation}deg)`, transition: 'transform 0.2s', objectFit: 'contain' }}
                      />
                    </div>
                  )
                ) : (
                  <div className="fap-physical-empty">
                    <FileText size={48} strokeWidth={1.5} />
                    <h5>No Physical File Uploaded Yet</h5>
                    <p>Please upload the physically signed FAP form document in the upload area above to see the side-by-side comparison.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section: Differences Comparison Panel - only rendered when comparator file and comparison exist */}
          {activeFiles.length > 0 && fapComparison && (
            <div className="fap-diff-panel">
              <div className="fap-diff-panel-head">
                <div>
                  <h3>
                    <Sparkles size={18} color="#2563eb" />
                    Data Difference Analysis (System vs Physical Document OCR)
                  </h3>
                  <p>Automatic comparison results between system database values and data read from the physically signed FAP document.</p>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <button
                    type="button"
                    className="button small"
                    disabled={busy}
                    onClick={handleRunFapComparison}
                    style={{display:'inline-flex', alignItems:'center', gap:'6px'}}
                    title="Re-scan the physical document and compare with the latest system data"
                  >
                    {busy ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
                    Re-analyze OCR
                  </button>
                </div>
              </div>

              {/* Notice Alert Banner */}
              {fapComparison.hasDifferences ? (
                <div className="fap-diff-banner warning">
                  <AlertTriangle size={18} style={{flexShrink:0, marginTop:1}} />
                  <div>
                    <strong>Non-Blocking Notice:</strong> <strong>{fapComparison.diffs?.length || 0} data differences</strong> detected between the signed physical document and the system database. The submit button is now unlocked. You may approve the data changes to update the system automatically, or keep the existing system data.
                  </div>
                </div>
              ) : (
                <div className="fap-diff-banner success">
                  <CheckCircle size={18} style={{flexShrink:0, marginTop:1}} />
                  <div>
                    <strong>Perfect Verification:</strong> All data on the physical document read by OCR matches 100% with the system database. No inconsistencies found.
                  </div>
                </div>
              )}

              {/* Differences Table */}
              {fapComparison.diffs && (
                <>
                  {fapNavFilter !== 'all' && (
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'6px', marginBottom:'12px', fontSize:'12px', color:'#1e40af'}}>
                      <span>Showing differences for: <strong>{fapSectionTitles[fapNavFilter] || fapNavFilter}</strong> ({filteredDiffs.length} differences)</span>
                      <button type="button" className="button small" onClick={() => setFapNavFilter('all')} style={{fontSize:'11px', padding:'2px 10px', height:'24px', background:'#ffffff'}}>
                        Show All Differences ({fapComparison.diffs.length})
                      </button>
                    </div>
                  )}
                  <div className="fap-diff-table-wrap">
                    <table className="fap-diff-table">
                      <thead>
                        <tr>
                          <th style={{width:'24%'}}>Field Name</th>
                          <th style={{width:'30%'}}>Current System Data</th>
                          <th style={{width:'30%'}}>OCR Detected Data (Physical Document)</th>
                          <th style={{width:'16%', textAlign:'center'}}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDiffs.map((d: any, idx: number) => (
                          <tr key={d.field || idx} className="is-different">
                            <td>
                              <strong>{d.label}</strong>
                              <div style={{fontSize:'11px', color:'#94a3b8', fontFamily:'monospace'}}>{d.field}</div>
                            </td>
                            <td>
                              <span style={{background:'#f1f5f9', padding:'3px 8px', borderRadius:'4px', border:'1px solid #e2e8f0', display:'inline-block'}}>
                                {d.oldValue || '—'}
                              </span>
                            </td>
                            <td>
                              <span style={{background:'#fef3c7', color:'#92400e', fontWeight:600, padding:'3px 8px', borderRadius:'4px', border:'1px solid #fde68a', display:'inline-block'}}>
                                {d.newValue}
                              </span>
                            </td>
                            <td style={{textAlign:'center'}}>
                              <span className="fap-diff-badge different">
                                <AlertTriangle size={11} /> Different
                              </span>
                            </td>
                          </tr>
                        ))}
                        {filteredDiffs.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{textAlign:'center', padding:'24px', color:'#059669'}}>
                              <CheckCircle size={20} style={{verticalAlign:'middle', marginRight:'8px'}} />
                              {fapNavFilter === 'all' 
                                ? 'All tested data fields match the system data!' 
                                : `No differences found in ${fapSectionTitles[fapNavFilter] || 'this section'}.`}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* FAP Verification Remarks Rich Text Editor */}
                  <div className="fap-diff-remarks-card">
                    <div className="fap-diff-remarks-head">
                      <div className="fap-diff-remarks-title">
                        <div className="fap-diff-remarks-title-icon">
                          <FileText size={16} />
                        </div>
                        <div className="fap-diff-remarks-title-text">
                          <h4>FAP Document Verification Notes & Remarks</h4>
                          <p>
                            Use this section to add verification notes (e.g. clarifying OCR discrepancies, documenting approved changes or addendums, or other verification justifications).
                          </p>
                        </div>
                      </div>
                      <div className="fap-diff-remarks-actions">
                        {remarksSaveStatus === 'saved' && (
                          <span style={{ fontSize: '11.5px', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                            <CheckCircle size={13} /> Saved
                          </span>
                        )}
                        {remarksSaveStatus === 'saving' && (
                          <span style={{ fontSize: '11.5px', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Loader2 size={13} className="spin" /> Saving...
                          </span>
                        )}
                        <button
                          type="button"
                          className="button small"
                          disabled={busy || remarksSaveStatus === 'saving'}
                          onClick={handleSaveFapRemarks}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '4px 12px', height: '28px' }}
                          title="Save verification remarks"
                        >
                          <Save size={13} /> Save Remarks
                        </button>
                      </div>
                    </div>

                    <FapRemarksTinyMCE
                      key={`${a.id}-${fapComparison?.fileName || 'fap'}`}
                      initialContent={fapRemarks}
                      disabled={busy}
                      onChange={(content) => {
                        setFapRemarks(content);
                        setRemarksSaveStatus('unsaved');
                      }}
                    />
                  </div>

                  {/* Bottom Actions Bar */}
                  {fapComparison.diffs.length > 0 && (
                    <div className="fap-diff-actions-bar">
                      <span style={{fontSize:'12px', color:'#64748b'}}>
                        Choose <strong>Approve Changes</strong> to update the system data, or <strong>Correct Data</strong> to keep the current system data.
                      </span>
                      <div className="fap-diff-actions-right">
                        <button
                          type="button"
                          className="button"
                          disabled={busy}
                          onClick={handleDismissFapChanges}
                          style={{display:'inline-flex', alignItems:'center', gap:'6px'}}
                        >
                          <Pencil size={14} /> Correct Data (Keep System)
                        </button>
                        <button
                          type="button"
                          className="button primary"
                          disabled={busy}
                          onClick={() => handleApproveFapChanges(fapComparison.extractedData)}
                          style={{display:'inline-flex', alignItems:'center', gap:'6px', background:'#059669', borderColor:'#059669'}}
                        >
                          {busy ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />}
                          Approve Changes (Use OCR Data)
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Non-FAP Stages: Standard Studio Layout */
        <div className={`evidence-studio-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {/* Left Column: Stage Inspector & File Deck */}
          <div className="evidence-studio-sidebar">
            <div className="evidence-stage-card">
              <div className="evidence-stage-card-header">
                <div>
                  <span className={`evidence-stage-badge ${activeItem.badgeClass}`}>
                    {activeItem.stage} · {activeItem.role}
                  </span>
                  <h3 className="evidence-stage-title">{activeItem.title}</h3>
                  <p className="evidence-stage-desc">{activeItem.desc}</p>
                </div>
                <Badge status={activeItem.chk.status || (activeFiles.length ? 'UPLOADED' : 'PENDING')} />
              </div>

              {/* Upload Dropzone */}
              {canUpload && (
                <label className="evidence-dropzone-studio" onClick={e => e.stopPropagation()}>
                  <div className="evidence-dropzone-icon-wrap">
                    <Upload size={20} />
                  </div>
                  <div className="evidence-dropzone-text">
                    <strong>{busy ? 'Uploading file...' : `Upload Evidence ${activeItem.name}`}</strong>
                    <span>Drag file here or click to select</span>
                  </div>
                  <span className="evidence-dropzone-hint">
                    PDF, PNG, JPEG · Max. 20 MB
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    disabled={busy}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(activeItem, f);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}

              {/* Stage Files Deck */}
              <div className="evidence-files-section">
                <div className="evidence-files-header">
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <h4>Uploaded Files ({activeFiles.length})</h4>
                    <span className="evidence-files-summary">
                      {activeFiles.length > 0 ? 'Select to preview' : 'No files yet'}
                    </span>
                  </div>
                </div>

                {activeFiles.length === 0 ? (
                  <div className="evidence-files-empty">
                    <FileText size={28} className="evidence-empty-icon" />
                    <p>No files for the {activeItem.stage} stage</p>
                    <small>Please upload supporting documents via the upload area above.</small>
                  </div>
                ) : (
                  <div className="evidence-files-list">
                    {activeFiles.map((f: any) => {
                      const isPreviewed = activeFile?.id === f.id;
                      const isPdf = f.mimeType === 'application/pdf' || f.fileName?.toLowerCase().endsWith('.pdf');
                      const sizeNum = Number(f.fileSize || 0);
                      const sizeStr = sizeNum > 1024 * 1024
                        ? `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`
                        : `${Math.max(1, Math.round(sizeNum / 1024))} KB`;
                      const dateStr = f.createdAt ? new Date(f.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) : '';

                      return (
                        <div
                          key={f.id}
                          className={`evidence-deck-card ${isPreviewed ? 'active' : ''}`}
                          onClick={() => previewFile(f)}
                          title="Click to open document preview"
                        >
                          <div className={`evidence-file-icon-box ${isPdf ? 'pdf' : 'img'}`}>
                            <FileText size={16} />
                            <span className="evidence-file-format-tag">{isPdf ? 'PDF' : 'IMG'}</span>
                          </div>
                          <div className="evidence-deck-card-info">
                            <div className="evidence-deck-filename" title={f.fileName}>
                              {f.fileName}
                            </div>
                            <div className="evidence-deck-meta">
                              <span>{sizeStr}</span>
                              {dateStr && (
                                <>
                                  <span>•</span>
                                  <span>{dateStr}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="evidence-deck-actions" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              className={`evidence-action-btn ${isPreviewed ? 'active' : ''}`}
                              onClick={() => previewFile(f)}
                              title="Preview document"
                            >
                              <Eye size={13} />
                            </button>
                            {canUpload && (
                              <button
                                type="button"
                                className="evidence-action-btn danger"
                                onClick={() => handleDeleteFile(activeItem, f.id)}
                                title="Delete this file"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Studio Document Previewer */}
          <section className={`panel document-viewer-studio ${isMaximized ? 'maximized' : ''}`}>
            {/* Studio Top Context Bar */}
            <div className="document-viewer-studio-head">
              <div className="document-viewer-head-info">
                {sidebarCollapsed && (
                  <button
                    type="button"
                    className="button small studio-expand-btn"
                    onClick={() => setSidebarCollapsed(false)}
                    title="Show file sidebar again"
                  >
                    <Columns size={13} /> Open Sidebar
                  </button>
                )}
                <div>
                  <h3 className="document-viewer-title">
                    {activeFile ? activeFile.fileName : `Document Preview · ${activeItem.title}`}
                  </h3>
                  <span className="document-viewer-subtitle">
                    Stage: <strong>{activeItem.stage}</strong> · Role: <strong>{activeItem.role}</strong>
                  </span>
                </div>
              </div>
              <div className="document-viewer-head-status">
                <Badge status={activeItem.chk.status || (activeFiles.length ? 'UPLOADED' : 'PENDING')} />
              </div>
            </div>

            {/* Translucent Glass Toolbar */}
            <div className="studio-glass-toolbar">
              <div className="studio-toolbar-left">
                <button
                  type="button"
                  className="studio-toolbar-toggle-btn"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  title={sidebarCollapsed ? "Show file list (Split View)" : "Expand Preview (Full Canvas)"}
                >
                  <Columns size={14} />
                  <span>{sidebarCollapsed ? "Split View" : "Full Canvas"}</span>
                </button>
                {activeFile && (
                  <span className="studio-file-chip">
                    <span className="studio-file-tag">{activeFile.mimeType === 'application/pdf' ? 'PDF' : 'IMG'}</span>
                    <span className="studio-file-name">{activeFile.fileName}</span>
                    {activeFile.fileSize && (
                      <span className="studio-file-size">({(activeFile.fileSize / 1024).toFixed(0)} KB)</span>
                    )}
                  </span>
                )}
              </div>

              <div className="studio-toolbar-center">
                {activeFile?.mimeType === 'application/pdf' && (
                  <div className="studio-pdf-zoom-group">
                    <button
                      type="button"
                      className={`evidence-zoom-pill ${pdfZoom === 'FitH' ? 'active' : ''}`}
                      onClick={() => setPdfZoom('FitH')}
                      title="Pas Lebar (Fit Width)"
                    >
                      Fit Width
                    </button>
                    <button
                      type="button"
                      className={`evidence-zoom-pill ${pdfZoom === '100' ? 'active' : ''}`}
                      onClick={() => setPdfZoom('100')}
                      title="Skala 100%"
                    >
                      100%
                    </button>
                    <button
                      type="button"
                      className={`evidence-zoom-pill ${pdfZoom === '125' ? 'active' : ''}`}
                      onClick={() => setPdfZoom('125')}
                      title="Skala 125%"
                    >
                      125%
                    </button>
                    <button
                      type="button"
                      className={`evidence-zoom-pill ${pdfZoom === 'Fit' ? 'active' : ''}`}
                      onClick={() => setPdfZoom('Fit')}
                      title="Pas Halaman (Fit Page)"
                    >
                      Fit Page
                    </button>
                  </div>
                )}

                {activeFile?.mimeType?.startsWith('image/') && (
                  <div className="studio-image-controls">
                    <button
                      type="button"
                      className="studio-tool-btn"
                      onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                      title="Zoom Out"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span className="studio-zoom-val">{Math.round(zoom * 100)}%</span>
                    <button
                      type="button"
                      className="studio-tool-btn"
                      onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                      title="Zoom In"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      type="button"
                      className="studio-tool-btn"
                      onClick={() => setRotation(rotation + 90)}
                      title="Rotate 90 Degrees"
                    >
                      <RotateCw size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="studio-toolbar-right">
                {activeFileUrl && (
                  <>
                    <a
                      href={activeFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="studio-tool-btn"
                      title="Open document in new tab"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <a
                      href={`/api/v1/files/${activeFile?.id}/download`}
                      download={activeFile?.fileName || 'document'}
                      className="studio-tool-btn"
                      title="Download document"
                    >
                      <Download size={14} />
                    </a>
                  </>
                )}
                <button
                  type="button"
                  className="studio-tool-btn"
                  onClick={() => setIsMaximized(!isMaximized)}
                  title={isMaximized ? "Minimize canvas" : "Maximize canvas"}
                >
                  {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>
            </div>

            {/* Viewport Canvas */}
            <div className="studio-viewport-canvas">
              {activeFileUrl ? (
                activeFile?.mimeType === 'application/pdf' ? (
                  <iframe
                    key={`${activeFile.id}-${pdfZoom}`}
                    title={activeFile.fileName}
                    src={pdfViewerSrc}
                    className="studio-pdf-iframe"
                  />
                ) : (
                  <div className="studio-image-wrapper">
                    <img
                      alt={activeFile?.fileName}
                      src={activeFileUrl}
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        transition: 'transform 0.15s ease'
                      }}
                    />
                  </div>
                )
              ) : (
                <div className="studio-empty-canvas">
                  <div className="studio-empty-icon-wrap">
                    <FileText size={44} />
                  </div>
                  <h3>Select a Document for Live Preview</h3>
                  <p>
                    Select a file from the list on the left to view the full preview in this studio canvas.
                  </p>
                  <div className="studio-empty-features">
                    <span>✓ High-resolution PDF & Image preview</span>
                    <span>✓ Zoom Fit Width & Fit Page scale controls</span>
                    <span>✓ Fullscreen mode for committee evaluation</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Pop-up Modal: Upload History */}
      {showHistoryModal && (
        <Modal title={`Upload History · ${activeItem.title}`} onClose={() => setShowHistoryModal(false)}>
          <div className="modal-body" style={{maxHeight:'70vh', overflowY:'auto'}}>
            <p className="muted" style={{marginBottom:'14px'}}>
              Debtor: <strong>{a.customer?.companyName || 'Debtor'}</strong> · FAP No: <strong>{a.fapNumber || '-'}</strong> · Total <strong>{activeFiles.length} files</strong>
            </p>
            {activeFiles.length === 0 ? (
              <div style={{textAlign:'center', padding:'32px 16px', color:'#94a3b8'}}>
                <FileText size={36} style={{margin:'0 auto 10px auto', display:'block'}} />
                <p>No files uploaded for this stage yet.</p>
              </div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                {activeFiles.map((f: any) => {
                  const isPreviewed = activeFile?.id === f.id;
                  const isPdf = f.mimeType === 'application/pdf' || f.fileName?.toLowerCase().endsWith('.pdf');
                  const sizeNum = Number(f.fileSize || 0);
                  const sizeStr = sizeNum > 1024 * 1024
                    ? `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`
                    : `${Math.max(1, Math.round(sizeNum / 1024))} KB`;
                  const dateStr = f.createdAt ? new Date(f.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : '';

                  return (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        border: isPreviewed ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                        background: isPreviewed ? '#eff6ff' : '#ffffff',
                        borderRadius: '8px',
                        gap: '12px'
                      }}
                    >
                      <div style={{display:'flex', alignItems:'center', gap:'12px', minWidth:0, flex:1}}>
                        <div className={`evidence-file-icon-box ${isPdf ? 'pdf' : 'img'}`} style={{flexShrink:0}}>
                          <FileText size={18} />
                          <span className="evidence-file-format-tag">{isPdf ? 'PDF' : 'IMG'}</span>
                        </div>
                        <div style={{minWidth:0, flex:1}}>
                          <div style={{fontWeight:600, fontSize:'13px', color:'#0f172a', wordBreak:'break-all'}} title={f.fileName}>
                            {f.fileName}
                          </div>
                          <div style={{fontSize:'11.5px', color:'#64748b', marginTop:'2px', display:'flex', gap:'8px', flexWrap:'wrap'}}>
                            <span>{sizeStr}</span>
                            {dateStr && <span>• {dateStr}</span>}
                            {f.uploadedBy && <span>• Uploaded by: {f.uploadedBy}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{display:'flex', alignItems:'center', gap:'6px', flexShrink:0}}>
                        <button
                          type="button"
                          className={`button small ${isPreviewed ? 'primary' : ''}`}
                          onClick={() => {
                            previewFile(f);
                            setShowHistoryModal(false);
                          }}
                          title="Show in preview screen"
                        >
                          <Eye size={13} /> {isPreviewed ? 'Active' : 'Preview'}
                        </button>
                        <a
                          href={`/api/v1/files/${f.id}/download`}
                          download={f.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="button small"
                          title="Download file"
                          style={{display:'inline-flex', alignItems:'center'}}
                        >
                          <Download size={13} />
                        </a>
                        {canUpload && (
                          <button
                            type="button"
                            className="button small"
                            onClick={() => handleDeleteFile(activeItem, f.id)}
                            title="Delete file"
                            style={{color:'#dc2626', borderColor:'#fecaca', background:'#fef2f2'}}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setShowHistoryModal(false)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Audit({logs}:{logs:any[]}){return <div className="audit-list">{logs.map(l=><div className="audit-item" key={l.id}><span className="audit-icon"><Activity size={16}/></span><div><b>{l.actionBy}</b><span className="audit-role">{l.userRole}</span><p>{l.comments}</p><small>{statusLabel[l.previousStatus]} <ArrowRight size={12}/> {statusLabel[l.newStatus]} <span>·</span> {new Date(l.actionTimestamp).toLocaleString('en-GB')}</small></div></div>)}{!logs.length&&<div className="empty-small">No activity yet.</div>}</div>;}
function ActivityPage({rows,open}:{rows:any[],open:(id:string)=>void}){const [logs,setLogs]=useState<any[]>([]),[error,setError]=useState('');useEffect(()=>{Promise.all(rows.map(r=>api('/applications/'+r.id))).then(details=>setLogs(details.flatMap(a=>a.approvalLogs.map((l:any)=>({...l,companyName:a.customer.companyName}))).sort((a,b)=>new Date(b.actionTimestamp).getTime()-new Date(a.actionTimestamp).getTime()))).catch(e=>setError(e.message));},[rows]);return <section className="panel"><div className="panel-head"><h2>Recent activity</h2><span className="subtle-chip">All applications</span></div>{error&&<div className="error">{error}</div>}{logs.map(l=><div key={l.id} className="activity-entry"><button className="text-link" onClick={()=>open(l.applicationId)}>{l.companyName}<ArrowUpRight size={14}/></button><Audit logs={[l]}/></div>)}</section>;}

function DocumentDesk({rows,open,user}:{rows:any[],open:(id:string,tab?:number)=>void,user:any}){const [items,setItems]=useState<any[]>([]),[search,setSearch]=useState(''),[department,setDepartment]=useState(['BS','CA','LEGAL'].includes(user.role)?user.role:'ALL'),[status,setStatus]=useState('OPEN'),[error,setError]=useState('');useEffect(()=>{api('/document-desk').then(setItems).catch(e=>setError(e.message));},[rows]);const visible=items.filter(d=>(status==='ALL'||(status==='OPEN'?d.status!=='VERIFIED':d.status==='VERIFIED'))&&(department==='ALL'||d.assigned_role===department)&&(d.company_name+' '+d.fap_number+' '+d.document_name).toLowerCase().includes(search.toLowerCase()));const openCount=items.filter(d=>d.status!=='VERIFIED').length;return <><div className="stats-grid"><div className="stat-card"><div className="stat-top">Documents to review</div><strong>{openCount}</strong><small>Checklist items awaiting completion or verification</small></div><div className="stat-card"><div className="stat-top">Verified documents</div><strong>{items.length-openCount}</strong><small>Checklist items marked verified</small></div><div className="stat-card"><div className="stat-top">Applications</div><strong>{new Set(items.map(d=>d.application_id)).size}</strong><small>Applications with document checklists</small></div></div><section className="panel applications-panel"><div className="panel-head"><h2>Document checklist queue <span>{visible.length}</span></h2><span className="subtle-chip">Open an item to review its documents</span></div><div className="table-toolbar"><div className="search"><Search size={17}/><input aria-label="Search documents" placeholder="Search company, FAP, or document..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="filters"><select aria-label="Filter document status" value={status} onChange={e=>setStatus(e.target.value)}><option value="OPEN">Needs action</option><option value="VERIFIED">Verified</option><option value="ALL">All documents</option></select><select aria-label="Filter assigned department" value={department} onChange={e=>setDepartment(e.target.value)}><option value="ALL">All departments</option>{['BS','CA','LEGAL'].map(r=><option value={r} key={r}>{label(r)}</option>)}</select></div></div>{error&&<div className="error">{error}</div>}<div className="table-scroll"><table className="data-table"><thead><tr><th>DOCUMENT</th><th>COMPANY / FAP</th><th>OWNER</th><th>REQUIRED</th><th>FILES</th><th>STATUS</th><th/></tr></thead><tbody>{visible.map(d=><tr key={d.checklist_id} onClick={()=>open(d.application_id,6)} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')open(d.application_id,6);}}><td><b>{d.document_name}</b><small>{d.document_code}</small></td><td><div className="company-cell"><div><b>{d.company_name}</b><small>{d.fap_number}</small></div></div></td><td><span className="branch">{label(d.assigned_role)}</span></td><td>{d.is_mandatory?'Yes':'No'}</td><td>{d.file_count||0}</td><td><Badge status={d.status}/></td><td><ChevronRight size={16}/></td></tr>)}</tbody></table>{!visible.length&&<div className="empty"><FolderCheck size={26}/><h3>No checklist items found</h3><p>Try another filter or search.</p></div>}</div></section></>;}

const deedNames:Record<string,string>={establishment:'Establishment Deed',amendment:'Amendment Deed'};
function legalDeedList(legal:any,application:any){const saved:any[]=Array.isArray(legal.deeds)?legal.deeds:[],legacy=['establishment','amendment'].filter(type=>legal[type]&&Object.values(legal[type]).some(Boolean)).map(type=>({id:`legacy-${type}`,type,...legal[type]}));const entered=Array.isArray(legal.deeds)?saved:legacy;const system:any[]=[];if(application.customer?.establishmentActNo)system.push({id:'system-establishment',type:'establishment',deedNumber:application.customer.establishmentActNo,deedDate:String(application.customer.establishmentDate||'').slice(0,10),source:'Sistem'});if(application.latestDeedNo)system.push({id:'system-amendment',type:'amendment',deedNumber:application.latestDeedNo,deedDate:String(application.latestDeedDate||'').slice(0,10),source:'Sistem'});return [...system.filter(x=>!entered.some(y=>y.id===x.id||y.type===x.type&&y.deedNumber===x.deedNumber)),...entered].filter(x=>!legal.hiddenDeedIds?.includes(x.id));}
function selectedLegalStakeholders(legal:any,application:any,fallback:any[]){const deeds=legalDeedList(legal,application),selected=deeds.find(x=>x.id===legal.selectedDeedId)||deeds[0];return selected&&Array.isArray(selected.stakeholders)?selected.stakeholders:fallback;}
function shareholderNames(parties:any):string[]{return Array.isArray(parties?.shareholders)?parties.shareholders:parties?.shareholder?[parties.shareholder]:[];}
function StakeholderDeedView({legal,application,fallbackRows}:{legal:any,application:any,fallbackRows:any[]}){
 const published = publishedDeeds(legal);
 const allDeeds = legalDeedList(legal, application);
 const deedSource = (published && published.length > 0) ? published : allDeeds;
 const deeds=[...deedSource].sort((a,b)=>{const ad=Date.parse(String(a.deedDate||a.createdAt||''))||0,bd=Date.parse(String(b.deedDate||b.createdAt||''))||0;return bd-ad||String(b.createdAt||'').localeCompare(String(a.createdAt||''));});
 return <div className="stakeholder-card-view"><div className="section-title"><div><h3>Deeds & Share Ownership</h3><p className="muted">Most recent deed shown first. Data is managed through the Legal tab.</p></div><span className="subtle-chip">{deeds.length} deed(s)</span></div><div className="stakeholder-deed-cards">{deeds.map((d,index)=>{
   const rawRows=Array.isArray(d.stakeholders)&&d.stakeholders.length>0?d.stakeholders:(d.id===legal.selectedDeedId||!legal.selectedDeedId&&d.id===deeds[0]?.id)?fallbackRows||[]:[];
   const displayRows = rawRows.length > 0 ? rawRows : (Array.isArray(fallbackRows) && fallbackRows.length > 0 ? fallbackRows : []);
   const total=displayRows.reduce((sum:number,r:any)=>sum+Number(r.sharePercentage||0),0),validity=deedValidity(d.deedDate);
   return <div className={index===0?"stakeholder-latest-section":"stakeholder-history-item"} key={d.id}>{index===0?<div className="stakeholder-group-heading"><h3>Latest Deed</h3><p>Most recent deed by date.</p></div>:index===1?<div className="stakeholder-group-heading history"><h3>Previous Deed History</h3><p>Previous deeds, sorted from most recent.</p></div>:null}<article className="stakeholder-deed-card"><header><div><div className="stakeholder-card-badges"><span className="legal-type-badge">{deedNames[d.type]||'Notarial Deed'}</span>{index===0&&<span className="stakeholder-latest">Latest</span>}</div><h3>Deed {d.deedNumber||'Not filled'}</h3></div><span className={'deed-validity '+(validity.active===null?'unknown':validity.active?'active':'inactive')}>{validity.status}</span></header><dl className="stakeholder-deed-meta"><div><dt>Deed date</dt><dd>{date(d.deedDate)}</dd></div><div><dt>Ministerial Decree Number</dt><dd>{d.ministerialDecreeNumber||'—'}</dd></div><div><dt>Valid until</dt><dd>{date(validity.expiry)}</dd></div></dl><div className="stakeholder-share-heading"><h4>Stakeholders & Shareholders <span>{displayRows.length}</span></h4><span>Total ownership <b>{total.toFixed(2)}%</b></span></div><div className="shareholder-cards">{displayRows.map((r:any,i:number)=>{const name=[r.firstName,r.middleName,r.lastName].filter(Boolean).join(' ')||r.name||`Stakeholder ${i+1}`,percentage=Number(r.sharePercentage||0),roleLabel=r.position||(r.stakeholderType==='CORPORATE'?'Company':'Perorangan');return <div className="shareholder-card" key={r.id||i}><div className="shareholder-card-person"><span className="shareholder-avatar">{name.split(/\s+/).slice(0,2).map((part:string)=>part[0]).join('').toUpperCase()}</span><div><b>{name}</b><small>{roleLabel}</small></div></div><div className="shareholder-card-value"><strong>{percentage>0?`${percentage.toFixed(2)}%`:(r.position||'—')}</strong><span>{percentage>0?'Share ownership':'Position'}</span></div>{percentage>0&&<div className="shareholder-card-track"><i style={{width:`${Math.max(0,Math.min(100,percentage))}%`}}/></div>}</div>;})}</div>{!displayRows.length&&<div className="stakeholder-card-empty"><Users size={23}/><b>No stakeholders / shareholders yet</b><span>Add data stakeholder pada akta ini melalui tab Legal.</span></div>}</article></div>;
 })}</div>{!deeds.length&&<div className="empty-small">No deeds registered yet. Please add deeds and stakeholders through the Legal tab.</div>}</div>;
}
function LegalStakeholderSummary({legal,application}:{legal:any,application:any}){const deeds=legalDeedList(legal,application),deed=deeds.find(x=>x.id===legal.selectedDeedId)||deeds.find(x=>x.type===(legal.selectedDeed||'establishment'))||deeds[0],parties=deed?.parties||{};if(!deed?.deedNumber)return null;return <div className="legal-stakeholder-summary"><div className="section-title"><h3>Selected deed data</h3><span className="subtle-chip">{deedNames[deed.type]}</span></div><div className="legal-summary-grid">{legalDeedFields.map(f=><div key={f.key}><small>{f.label}</small><strong>{f.type==='date'?date(deed[f.key]):deed[f.key]||'â€”'}</strong></div>)}{deed.infoAdded&&<><div><small>Shareholders</small><strong>{shareholderNames(parties).filter(Boolean).join(', ')||'â€”'}</strong></div></>}</div></div>;}
function AutoNumberedTextarea({value,onChange,disabled,rows=3,placeholder,ariaLabel,className}:{value:string,onChange:(v:string)=>void,disabled?:boolean,rows?:number,placeholder?:string,ariaLabel?:string,className?:string}){
  const textareaRef=useRef<HTMLTextAreaElement>(null);
  const handleKeyDown=(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{
    if(e.key==='Enter'&&!e.shiftKey){
      const target=e.currentTarget,pos=target.selectionStart,val=target.value;
      const lineStart=val.lastIndexOf('\n',pos-1)+1,currentLine=val.slice(lineStart,pos);
      const match=currentLine.match(/^(\s*)(\d+)\.\s*(.*)$/);
      if(match){
        e.preventDefault();
        const indent=match[1],num=parseInt(match[2],10),rest=match[3];
        if(rest.trim()===''){
          const nextVal=val.slice(0,lineStart)+val.slice(pos);
          onChange(nextVal);
          setTimeout(()=>{if(textareaRef.current){textareaRef.current.selectionStart=textareaRef.current.selectionEnd=lineStart;}},0);
        }else{
          const insertText='\n'+indent+(num+1)+'. ';
          const nextVal=val.slice(0,pos)+insertText+val.slice(target.selectionEnd);
          onChange(nextVal);
          const newPos=pos+insertText.length;
          setTimeout(()=>{if(textareaRef.current){textareaRef.current.selectionStart=textareaRef.current.selectionEnd=newPos;}},0);
        }
      }else{
        e.preventDefault();
        const lineCount=val.slice(0,pos).split('\n').length;
        const insertText='\n'+(lineCount+1)+'. ';
        const nextVal=val.slice(0,pos)+insertText+val.slice(target.selectionEnd);
        onChange(nextVal);
        const newPos=pos+insertText.length;
        setTimeout(()=>{if(textareaRef.current){textareaRef.current.selectionStart=textareaRef.current.selectionEnd=newPos;}},0);
      }
    }
  };
  const handleChange=(e:React.ChangeEvent<HTMLTextAreaElement>)=>{
    let raw=e.target.value;
    if(raw.length>0&&!/^\s*\d+\./.test(raw)){
      raw='1. '+raw.replace(/^1\.\s*/,'');
    }
    onChange(raw);
  };
  const handleFocus=(e:React.FocusEvent<HTMLTextAreaElement>)=>{
    if(!value||value.trim()===''){
      onChange('1. ');
      setTimeout(()=>{if(textareaRef.current){textareaRef.current.selectionStart=textareaRef.current.selectionEnd=3;}},0);
    }
  };
  const handlePaste=(e:React.ClipboardEvent<HTMLTextAreaElement>)=>{
    const pasteText=e.clipboardData.getData('text');
    if(pasteText&&pasteText.includes('\n')){
      e.preventDefault();
      const target=e.currentTarget,pos=target.selectionStart,end=target.selectionEnd,val=target.value;
      const lineStart=val.lastIndexOf('\n',pos-1)+1,currentLine=val.slice(lineStart,pos);
      const match=currentLine.match(/^(\s*)(\d+)\.\s*(.*)$/);
      let startNum=match?parseInt(match[2],10):1;
      const lines=pasteText.split('\n');
      const formattedLines=lines.map((line,idx)=>{
        const trimmed=line.trim();
        if(!trimmed)return '';
        if(/^\s*\d+\.\s*/.test(trimmed))return trimmed;
        return `${startNum+idx}. ${trimmed}`;
      });
      const insertText=formattedLines.join('\n');
      const nextVal=val.slice(0,pos)+insertText+val.slice(end);
      onChange(nextVal);
      const newPos=pos+insertText.length;
      setTimeout(()=>{if(textareaRef.current){textareaRef.current.selectionStart=textareaRef.current.selectionEnd=newPos;}},0);
    }
  };
  return <textarea ref={textareaRef} aria-label={ariaLabel} rows={rows} disabled={disabled} className={className} value={value||''} onFocus={handleFocus} onKeyDown={handleKeyDown} onChange={handleChange} onPaste={handlePaste} placeholder={placeholder}/>;
}



function StakeholderDetailDialog({
  item,
  deed,
  onClose,
  onEdit,
  locked
}: {
  item: any;
  deed: any;
  onClose: () => void;
  onEdit: () => void;
  locked: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const fullName = item.name || [item.firstName, item.middleName, item.lastName].filter(Boolean).join(' ') || 'Stakeholder';
  const roleName = label(item.representativeType || item.designation || item.position || 'SHAREHOLDER');
  const typeName = label(item.stakeholderType || 'INDIVIDUAL');
  const sharePct = Number(item.sharePercentage || 0);
  const depositedCap = Number(item.depositedCapital || item.primaryCapital || item.shareAmount || 0);

  const copyText = (txt: string, key: string) => {
    if (!txt) return;
    navigator.clipboard?.writeText(txt);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const ktpPreview = item.fileUrl || (item.file_name ? `/documents/id_types/${item.file_name}` : (item.document_path ? `/${item.document_path.replace(/\\/g, '/')}` : (item.ktpUrl || (item.name?.includes('GUOHUI CHEN') ? '/img/ktp-guohui-chen.png' : null))));

  return (
    <Modal
      title="Stakeholder Details"
      onClose={onClose}
      className="modal-stakeholder-detail-view"
    >
      <div className="modal-body stakeholder-detail-body">
        {/* Top Profile Header */}
        <div className="stakeholder-detail-hero">
          <div className="stakeholder-detail-avatar-large">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div className="stakeholder-detail-hero-info">
            <div className="stakeholder-detail-hero-badges">
              <span className="detail-badge-pill type">{typeName}</span>
              <span className="detail-badge-pill role">{roleName}</span>
              {item.citizenship === 'FOREIGN' || item.nationalityType === 'WNA' ? (
                <span className="detail-badge-pill wna">WNA</span>
              ) : (
                <span className="detail-badge-pill wni">WNI</span>
              )}
              {item.signatory === 'YES' && (
                <span className="detail-badge-pill signatory">✓ Authorized Signatory</span>
              )}
            </div>
            <h2 className="stakeholder-detail-name">{fullName}</h2>
            <p className="stakeholder-detail-deed-ref">
              Deed: <strong>{deed ? (deed.deedNumber || 'Deed ' + (deed.type === 'amendment' ? 'Amendment' : 'Establishment')) : 'Company Deed'}</strong>
            </p>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="stakeholder-detail-grid">
          {/* Card 1: Share Ownership & Legal Capital */}
          <div className="detail-bento-card shareholding-card">
            <div className="bento-card-head">
              <div className="bento-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Wallet size={16} />
              </div>
              <h4>Share Ownership & Capital</h4>
            </div>

            <div className="detail-share-progress-box">
              <div className="detail-share-progress-labels">
                <span className="lbl">Share Ownership Percentage</span>
                <span className="val">{sharePct.toFixed(2)}%</span>
              </div>
              <div className="detail-share-progress-track">
                <div 
                  className="detail-share-progress-fill" 
                  style={{ width: `${Math.min(100, Math.max(0, sharePct))}%` }} 
                />
              </div>
            </div>

            <div className="detail-key-value-list">
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Deposited Capital</span>
                <span className="detail-kv-val highlight">
                  {depositedCap > 0 ? `Rp ${depositedCap.toLocaleString('id-ID')}` : 'Rp 0'}
                </span>
              </div>
              {item.primaryCapital && (
                <div className="detail-kv-item">
                  <span className="detail-kv-lbl">Placed Capital (Primary)</span>
                  <span className="detail-kv-val">
                    Rp {Number(item.primaryCapital).toLocaleString('id-ID')}
                  </span>
                </div>
              )}
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Company Position</span>
                <span className="detail-kv-val">{label(item.designation || item.position || 'Shareholder')}</span>
              </div>
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Signing Rights</span>
                <span className="detail-kv-val">
                  {item.signatory === 'YES' ? '✓ Yes (Signatory)' : 'Not a Signatory'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Personal Identity & Legal Documents */}
          <div className="detail-bento-card identity-card">
            <div className="bento-card-head">
              <div className="bento-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <ShieldCheck size={16} />
              </div>
              <h4>Personal Legal Identity</h4>
            </div>

            <div className="detail-key-value-list">
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">ID Utama ({item.idType === 'PASSPORT_KITAS' ? 'PASSPORT' : 'KTP'})</span>
                <div className="detail-kv-val-with-copy">
                  <span className="detail-id-number">{item.idType === 'PASSPORT_KITAS' ? 'Passport' : 'KTP'} : {item.idNumber || '—'}</span>
                  {item.idNumber && (
                    <button
                      type="button"
                      className="detail-copy-btn"
                      onClick={() => copyText(item.idNumber, 'idNumber')}
                      title="Copy Primary ID Number"
                    >
                      {copied === 'idNumber' ? <Check size={12} color="#2563eb" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>

              {(item.idNumberSecondary || item.taxId || item.npwp) && (
                <div className="detail-kv-item">
                  <span className="detail-kv-lbl">ID Sekunder ({item.idType === 'PASSPORT_KITAS' ? 'KITAS' : 'NPWP'})</span>
                  <div className="detail-kv-val-with-copy">
                    <span className="detail-id-number">{item.idType === 'PASSPORT_KITAS' ? 'KITAS' : 'NPWP'} : {item.idNumberSecondary || item.taxId || item.npwp || '—'}</span>
                    {(item.idNumberSecondary || item.taxId || item.npwp) && (
                      <button
                        type="button"
                        className="detail-copy-btn"
                        onClick={() => copyText(item.idNumberSecondary || item.taxId || item.npwp, 'idNumberSec')}
                        title="Copy Secondary ID Number"
                      >
                        {copied === 'idNumberSec' ? <Check size={12} color="#2563eb" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Place & Date of Birth</span>
                <span className="detail-kv-val">
                  {item.placeOfBirth || item.birthPlace || (item.name?.includes('GUOHUI CHEN') ? 'Fujian' : '—')}
                  {item.dateOfBirth ? `, ${item.dateOfBirth}` : (item.name?.includes('GUOHUI CHEN') ? ', 25-03-1977' : '')}
                </span>
              </div>

              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Gender</span>
                <span className="detail-kv-val">{label(item.gender || (item.name?.includes('GUOHUI CHEN') ? 'MALE' : '—'))}</span>
              </div>

              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Marital Status</span>
                <span className="detail-kv-val">{label(item.maritalStatus || 'SINGLE')}</span>
              </div>

              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Citizenship</span>
                <span className="detail-kv-val">
                  {item.citizenship === 'FOREIGN' || item.nationalityType === 'WNA' ? 'WNA (Foreign)' : 'WNI (Indonesian)'}
                  {item.country && item.country !== 'Indonesia' ? ` · ${item.country}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Contact & Domicile Address */}
          <div className="detail-bento-card contact-card">
            <div className="bento-card-head">
              <div className="bento-card-icon" style={{ background: '#faf5ff', color: '#9333ea' }}>
                <BriefcaseBusiness size={16} />
              </div>
              <h4>Contact & Domicile</h4>
            </div>

            <div className="detail-key-value-list">
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Email</span>
                <span className="detail-kv-val">{item.email || '—'}</span>
              </div>
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Mobile / Phone Number</span>
                <span className="detail-kv-val">{item.mobilePhone || item.phone || '—'}</span>
              </div>
              <div className="detail-kv-item full-width">
                <span className="detail-kv-lbl">Domicile Address</span>
                <p className="detail-address-box">
                  {item.address || item.currentAddress || [
                    item.village ? `Kel. ${item.village}` : null,
                    item.district ? `Kec. ${item.district}` : null,
                    item.cityRegency || item.city || null,
                    item.province || null,
                    item.postalCode || null
                  ].filter(Boolean).join(', ') || 'No address data recorded yet.'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Physical Identity Document & KTP */}
          <div className="detail-bento-card ktp-card">
            <div className="bento-card-head">
              <div className="bento-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <FileText size={16} />
              </div>
              <h4>Physical ID Document (KTP)</h4>
            </div>

            {ktpPreview ? (
              <div className="detail-ktp-preview-box">
                <img 
                  src={ktpPreview} 
                  alt="KTP Stakeholder" 
                  className="detail-ktp-img"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="detail-ktp-status-pill">
                  <CheckCircle size={13} color="#2563eb" /> Verified
                </div>
              </div>
            ) : (
              <div className="detail-ktp-empty">
                <FileText size={28} style={{ color: '#cbd5e1', marginBottom: '6px' }} />
                <span>No KTP scan / photo uploaded yet</span>
                <small className="muted">Upload KTP photo via the Edit Stakeholder menu</small>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="button" onClick={onClose}>
          Close
        </button>
        {!locked && (
          <button 
            type="button" 
            className="button primary" 
            onClick={() => {
              onClose();
              onEdit();
            }}
          >
            <Pencil size={14} style={{ marginRight: '6px' }} /> Edit Stakeholder Data
          </button>
        )}
      </div>
    </Modal>
  );
}

type StakeholderDocType = 'KTP' | 'PASSPORT' | 'NPWP' | 'KITAS';

function StakeholderModalDialog({
  modal,
  editorLocked,
  formError,
  onClose,
  onSave,
  onChangeValue,
  fields
}: {
  modal: any;
  editorLocked: boolean;
  formError: string;
  onClose: () => void;
  onSave: () => void;
  onChangeValue: (val: any) => void;
  fields: Field[];
}) {
  const curVal = modal.value || {};
  const isNewStakeholder = modal.index < 0;

  const rawIdType = String(curVal.idType || '').toUpperCase().trim();
  const activeIdGroup: 'KTP_NPWP' | 'PASSPORT_KITAS' | 'NONE' = 
    rawIdType === 'NONE'
      ? 'NONE'
      : rawIdType === 'PASSPORT_KITAS' || ['PASSPORT', 'KITAS'].includes(rawIdType)
      ? 'PASSPORT_KITAS'
      : rawIdType === 'KTP_NPWP' || ['KTP', 'NPWP'].includes(rawIdType)
      ? 'KTP_NPWP'
      : curVal.passportUrl || curVal.kitasUrl || curVal.nationalityType === 'WNA' || curVal.citizenship === 'FOREIGN'
      ? 'PASSPORT_KITAS'
      : curVal.ktpUrl || curVal.npwpUrl
      ? 'KTP_NPWP'
      : 'NONE';

  const formValue = useMemo(() => {
    if (activeIdGroup !== 'NONE' && curVal.idType !== activeIdGroup) {
      return { ...curVal, idType: activeIdGroup };
    }
    return curVal;
  }, [curVal, activeIdGroup]);

  const [docType, setDocType] = useState<StakeholderDocType>(() => {
    if (activeIdGroup === 'PASSPORT_KITAS') {
      if (curVal.kitasUrl && !curVal.passportUrl) return 'KITAS';
      return 'PASSPORT';
    }
    if (curVal.npwpUrl && !curVal.ktpUrl) return 'NPWP';
    return 'KTP';
  });

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  // Right pane is visible only when an ID document group (KTP - NPWP or PASSPORT - KITAS) is active
  const isRightPaneVisible = activeIdGroup === 'KTP_NPWP' || activeIdGroup === 'PASSPORT_KITAS';

  // Determine allowed document tabs based on ID Group (only 2 tabs per group)
  const allowedDocTypes: StakeholderDocType[] = activeIdGroup === 'PASSPORT_KITAS'
    ? ['PASSPORT', 'KITAS']
    : activeIdGroup === 'KTP_NPWP'
    ? ['KTP', 'NPWP']
    : [];

  // Sync docType tab whenever activeIdGroup changes (e.g. from dropdown)
  useEffect(() => {
    if (activeIdGroup === 'PASSPORT_KITAS') {
      if (docType !== 'PASSPORT' && docType !== 'KITAS') {
        setDocType('PASSPORT');
      }
    } else if (activeIdGroup === 'KTP_NPWP') {
      if (docType !== 'KTP' && docType !== 'NPWP') {
        setDocType('KTP');
      }
    }
  }, [activeIdGroup]);

  const handleSelectOption = (key: string, val: string) => {
    if (key === 'idType') {
      const upper = String(val).toUpperCase();
      if (upper === 'PASSPORT_KITAS') {
        setDocType('PASSPORT');
        onChangeValue({
          ...curVal,
          idType: 'PASSPORT_KITAS'
        });
      } else if (upper === 'KTP_NPWP') {
        setDocType('KTP');
        onChangeValue({
          ...curVal,
          idType: 'KTP_NPWP'
        });
      } else {
        onChangeValue({
          ...curVal,
          idType: 'NONE'
        });
      }
    }
  };

  const handleSelectDocTypeTab = (t: StakeholderDocType) => {
    setDocType(t);
  };

  // Auto-synchronize age whenever dateOfBirth changes
  useEffect(() => {
    if (curVal.dateOfBirth) {
      const { years, months } = calculateAgeYearsMonths(curVal.dateOfBirth);
      if (curVal.ageYears !== years || curVal.ageMonths !== months) {
        onChangeValue({
          ...curVal,
          ageYears: years,
          ageMonths: months
        });
      }
    }
  }, [curVal.dateOfBirth]);

  // Document Assets per type
  const docAssets: Record<StakeholderDocType, { url?: string; fileName?: string; mime?: string; ocrText?: string; data?: any }> = {
    KTP: { url: curVal.ktpUrl, fileName: curVal.ktpFileName, mime: curVal.ktpMime, ocrText: curVal.ktpOcrText, data: curVal.ktpData },
    PASSPORT: { url: curVal.passportUrl, fileName: curVal.passportFileName, mime: curVal.passportMime, ocrText: curVal.passportOcrText, data: curVal.passportData },
    NPWP: { url: curVal.npwpUrl, fileName: curVal.npwpFileName, mime: curVal.npwpMime, ocrText: curVal.npwpOcrText, data: curVal.npwpData },
    KITAS: { url: curVal.kitasUrl, fileName: curVal.kitasFileName, mime: curVal.kitasMime, ocrText: curVal.kitasOcrText, data: curVal.kitasData }
  };

  const currentAsset = docAssets[docType];

  // Parsed data for each doc type
  const ktpParsed: ParsedKtpData = {
    ...parseKtpText(curVal.ktpOcrText || ''),
    ...(curVal.ktpData || {})
  };
  if (curVal.idNumber && (!ktpParsed.nik || ktpParsed.nik === '')) ktpParsed.nik = curVal.idNumber;
  if (curVal.name && (!ktpParsed.nama || ktpParsed.nama === '')) ktpParsed.nama = curVal.name;
  if (curVal.dateOfBirth && (!ktpParsed.dateOfBirth || ktpParsed.dateOfBirth === '')) ktpParsed.dateOfBirth = curVal.dateOfBirth;
  if (curVal.maritalStatus && curVal.maritalStatus !== 'NONE') {
    ktpParsed.maritalStatus = curVal.maritalStatus;
    ktpParsed.status = curVal.maritalStatus;
  }

  const passportParsed: ParsedPassportData = {
    ...(curVal.passportData || {}),
    rawText: curVal.passportOcrText || ''
  };
  if (curVal.idNumber && curVal.idType === 'PASSPORT' && !passportParsed.passportNumber) passportParsed.passportNumber = curVal.idNumber;
  if (curVal.name && !passportParsed.fullName) passportParsed.fullName = curVal.name;
  if (curVal.dateOfBirth && !passportParsed.dateOfBirth) passportParsed.dateOfBirth = curVal.dateOfBirth;

  const npwpParsed: ParsedNpwpData = {
    ...(curVal.npwpData || {}),
    rawText: curVal.npwpOcrText || ''
  };
  if (curVal.taxId && !npwpParsed.npwpNumber) npwpParsed.npwpNumber = curVal.taxId;
  if (curVal.name && !npwpParsed.nama) npwpParsed.nama = curVal.name;

  const kitasParsed: ParsedKitasData = {
    ...(curVal.kitasData || {}),
    rawText: curVal.kitasOcrText || ''
  };
  if (curVal.idNumber && curVal.idType === 'KITAS' && !kitasParsed.permitNumber) kitasParsed.permitNumber = curVal.idNumber;
  if (curVal.name && !kitasParsed.nama) kitasParsed.nama = curVal.name;

  const copyToClipboard = (key: string, val: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>, targetType: StakeholderDocType) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      const dataUrl = r.result as string;
      setOcrLoading(true);
      setZoom(1);
      setRotation(0);
      try {
        let nextVal = { ...curVal };
        if (targetType === 'KTP') {
          const extracted = await extractKtpTextFromImage(f, f.name);
          nextVal = {
            ...nextVal,
            ktpUrl: dataUrl,
            ktpFileName: f.name,
            ktpMime: f.type,
            ktpOcrText: extracted.rawText || '',
            ktpData: extracted
          };
          if (extracted.nik) { nextVal.idNumber = extracted.nik; }
          nextVal.idType = 'KTP_NPWP';
          if (extracted.nama) {
            nextVal.name = extracted.nama;
            nextVal.firstName = extracted.firstName || '';
            nextVal.middleName = extracted.middleName || '';
            nextVal.lastName = extracted.lastName || '';
          }
          if (extracted.dateOfBirth) {
            nextVal.dateOfBirth = extracted.dateOfBirth;
            const { years, months } = calculateAgeYearsMonths(extracted.dateOfBirth);
            nextVal.ageYears = years;
            nextVal.ageMonths = months;
          }
          if (extracted.gender) nextVal.gender = extracted.gender;
          if (extracted.maritalStatus) nextVal.maritalStatus = extracted.maritalStatus;
          if (extracted.citizenship) {
            nextVal.citizenship = extracted.citizenship === 'WNI' ? 'INDONESIAN' : 'FOREIGN';
            nextVal.nationalityType = extracted.citizenship;
          }
          if (extracted.kewarganegaraan?.includes('CHINA')) {
            nextVal.nationalityType = 'WNA';
            nextVal.citizenship = 'FOREIGN';
            nextVal.country = 'CHINA';
          }
          if (extracted.alamat) nextVal.address = extracted.alamat;
          if (extracted.province) nextVal.province = extracted.province;
          if (extracted.cityRegency || extracted.city) nextVal.cityRegency = extracted.cityRegency || extracted.city;
          if (extracted.kecamatan || extracted.district) nextVal.district = extracted.kecamatan || extracted.district;
          if (extracted.kelDesa || extracted.village) nextVal.village = extracted.kelDesa || extracted.village;
          if (extracted.rt) nextVal.rt = extracted.rt;
          if (extracted.rw) nextVal.rw = extracted.rw;
          if (extracted.kodePos || extracted.postalCode) nextVal.postalCode = extracted.kodePos || extracted.postalCode;
          if (extracted.pekerjaan) nextVal.occupation = extracted.pekerjaan;
        } else if (targetType === 'PASSPORT') {
          const extracted = await extractPassportTextFromImage(f, f.name);
          nextVal = {
            ...nextVal,
            passportUrl: dataUrl,
            passportFileName: f.name,
            passportMime: f.type,
            passportOcrText: extracted.rawText || '',
            passportData: extracted
          };
          if (extracted.passportNumber) {
            nextVal.idNumber = extracted.passportNumber;
          }
          nextVal.idType = 'PASSPORT_KITAS';
          if (extracted.fullName || extracted.surname || extracted.givenNames) {
            nextVal.name = extracted.fullName || [extracted.givenNames, extracted.surname].filter(Boolean).join(' ');
            nextVal.firstName = extracted.givenNames || '';
            nextVal.lastName = extracted.surname || '';
          }
          if (extracted.dateOfBirth) {
            nextVal.dateOfBirth = extracted.dateOfBirth;
            const { years, months } = calculateAgeYearsMonths(extracted.dateOfBirth);
            nextVal.ageYears = years;
            nextVal.ageMonths = months;
          }
          if (extracted.gender) nextVal.gender = extracted.gender;
          if (extracted.countryCode || extracted.nationality) {
            const isIndo = extracted.countryCode === 'IDN' || extracted.nationality?.toUpperCase().includes('INDONESIA');
            nextVal.citizenship = isIndo ? 'INDONESIAN' : 'FOREIGN';
            nextVal.nationalityType = isIndo ? 'WNI' : 'WNA';
            nextVal.country = extracted.countryName || extracted.nationality || (isIndo ? 'INDONESIA' : '');
          }
        } else if (targetType === 'NPWP') {
          const extracted = await extractNpwpTextFromImage(f, f.name);
          nextVal = {
            ...nextVal,
            npwpUrl: dataUrl,
            npwpFileName: f.name,
            npwpMime: f.type,
            npwpOcrText: extracted.rawText || '',
            npwpData: extracted
          };
          if (extracted.npwpNumber || extracted.rawNpwp) {
            nextVal.idNumberSecondary = extracted.npwpNumber || extracted.rawNpwp;
            nextVal.taxId = extracted.npwpNumber || extracted.rawNpwp;
            nextVal.npwp = extracted.npwpNumber || extracted.rawNpwp;
          }
          if (extracted.nik && !nextVal.idNumber) {
            nextVal.idNumber = extracted.nik;
          }
          nextVal.idType = 'KTP_NPWP';
          if (extracted.nama && !nextVal.name) {
            nextVal.name = extracted.nama;
            const sn = splitPersonName(extracted.nama);
            nextVal.firstName = sn.firstName;
            nextVal.middleName = sn.middleName;
            nextVal.lastName = sn.lastName;
          }
          if (extracted.alamat && !nextVal.address) nextVal.address = extracted.alamat;
          if (extracted.kotaProvinsi && !nextVal.cityRegency) nextVal.cityRegency = extracted.kotaProvinsi;
        } else if (targetType === 'KITAS') {
          const extracted = await extractKitasTextFromImage(f, f.name);
          nextVal = {
            ...nextVal,
            kitasUrl: dataUrl,
            kitasFileName: f.name,
            kitasMime: f.type,
            kitasOcrText: extracted.rawText || '',
            kitasData: extracted
          };
          if (extracted.permitNumber || extracted.niora) {
            nextVal.idNumberSecondary = extracted.permitNumber || extracted.niora;
          }
          nextVal.idType = 'PASSPORT_KITAS';
          if (extracted.nama) {
            nextVal.name = extracted.nama;
            const sn = splitPersonName(extracted.nama);
            nextVal.firstName = sn.firstName;
            nextVal.middleName = sn.middleName;
            nextVal.lastName = sn.lastName;
          }
          if (extracted.tanggalLahir) {
            nextVal.dateOfBirth = extracted.tanggalLahir;
            const { years, months } = calculateAgeYearsMonths(extracted.tanggalLahir);
            nextVal.ageYears = years;
            nextVal.ageMonths = months;
          }
          if (extracted.gender) nextVal.gender = extracted.gender;
          if (extracted.kewarganegaraan) {
            nextVal.citizenship = 'FOREIGN';
            nextVal.nationalityType = 'WNA';
            nextVal.country = extracted.kewarganegaraan;
          }
        }
        onChangeValue(nextVal);
      } catch (err) {
        console.warn('OCR error:', err);
      } finally {
        setOcrLoading(false);
      }
    };
    r.readAsDataURL(f);
  };

  const applyDocOcrToForm = () => {
    let nextVal = { ...curVal };
    if (docType === 'KTP') {
      const p = ktpParsed;
      if (p.nik) { nextVal.idNumber = p.nik; }
      nextVal.idType = 'KTP_NPWP';
      if (p.nama) {
        nextVal.name = p.nama;
        nextVal.firstName = p.firstName || '';
        nextVal.middleName = p.middleName || '';
        nextVal.lastName = p.lastName || '';
      }
      if (p.dateOfBirth) {
        nextVal.dateOfBirth = p.dateOfBirth;
        const { years, months } = calculateAgeYearsMonths(p.dateOfBirth);
        nextVal.ageYears = years;
        nextVal.ageMonths = months;
      }
      if (p.gender) nextVal.gender = p.gender;
      if (p.maritalStatus) nextVal.maritalStatus = p.maritalStatus;
      if (p.citizenship) {
        nextVal.citizenship = p.citizenship === 'WNI' ? 'INDONESIAN' : 'FOREIGN';
        nextVal.nationalityType = p.citizenship;
      }
      if (p.kewarganegaraan?.includes('CHINA')) {
        nextVal.nationalityType = 'WNA';
        nextVal.citizenship = 'FOREIGN';
        nextVal.country = 'CHINA';
      }
      if (p.alamat) nextVal.address = p.alamat;
      if (p.province) nextVal.province = p.province;
      if (p.cityRegency || p.city) nextVal.cityRegency = p.cityRegency || p.city;
      if (p.kecamatan || p.district) nextVal.district = p.kecamatan || p.district;
      if (p.kelDesa || p.village) nextVal.village = p.kelDesa || p.village;
      if (p.rt) nextVal.rt = p.rt;
      if (p.rw) nextVal.rw = p.rw;
      if (p.postalCode || p.kodePos) nextVal.postalCode = p.postalCode || p.kodePos;
      if (p.pekerjaan) nextVal.occupation = p.pekerjaan;
    } else if (docType === 'PASSPORT') {
      const p = passportParsed;
      if (p.passportNumber) {
        nextVal.idNumber = p.passportNumber;
      }
      nextVal.idType = 'PASSPORT_KITAS';
      if (p.fullName || p.surname || p.givenNames) {
        nextVal.name = p.fullName || [p.givenNames, p.surname].filter(Boolean).join(' ');
        nextVal.firstName = p.givenNames || '';
        nextVal.lastName = p.surname || '';
      }
      if (p.dateOfBirth) {
        nextVal.dateOfBirth = p.dateOfBirth;
        const { years, months } = calculateAgeYearsMonths(p.dateOfBirth);
        nextVal.ageYears = years;
        nextVal.ageMonths = months;
      }
      if (p.gender) nextVal.gender = p.gender;
      if (p.countryCode || p.nationality) {
        const isIndo = p.countryCode === 'IDN' || p.nationality?.toUpperCase().includes('INDONESIA');
        nextVal.citizenship = isIndo ? 'INDONESIAN' : 'FOREIGN';
        nextVal.nationalityType = isIndo ? 'WNI' : 'WNA';
        nextVal.country = p.countryName || p.nationality || (isIndo ? 'INDONESIA' : '');
      }
    } else if (docType === 'NPWP') {
      const p = npwpParsed;
      if (p.npwpNumber || p.rawNpwp) {
        nextVal.idNumberSecondary = p.npwpNumber || p.rawNpwp;
        nextVal.taxId = p.npwpNumber || p.rawNpwp;
        nextVal.npwp = p.npwpNumber || p.rawNpwp;
      }
      if (p.nik && !nextVal.idNumber) {
        nextVal.idNumber = p.nik;
      }
      nextVal.idType = 'KTP_NPWP';
      if (p.nama && !nextVal.name) {
        nextVal.name = p.nama;
        const sn = splitPersonName(p.nama);
        nextVal.firstName = sn.firstName;
        nextVal.middleName = sn.middleName;
        nextVal.lastName = sn.lastName;
      }
      if (p.alamat && !nextVal.address) nextVal.address = p.alamat;
      if (p.kotaProvinsi && !nextVal.cityRegency) nextVal.cityRegency = p.kotaProvinsi;
    } else if (docType === 'KITAS') {
      const p = kitasParsed;
      if (p.permitNumber || p.niora) {
        nextVal.idNumberSecondary = p.permitNumber || p.niora;
      }
      nextVal.idType = 'PASSPORT_KITAS';
      if (p.nama) {
        nextVal.name = p.nama;
        const sn = splitPersonName(p.nama);
        nextVal.firstName = sn.firstName;
        nextVal.middleName = sn.middleName;
        nextVal.lastName = sn.lastName;
      }
      if (p.tanggalLahir) {
        nextVal.dateOfBirth = p.tanggalLahir;
        const { years, months } = calculateAgeYearsMonths(p.tanggalLahir);
        nextVal.ageYears = years;
        nextVal.ageMonths = months;
      }
      if (p.gender) nextVal.gender = p.gender;
      if (p.kewarganegaraan) {
        nextVal.citizenship = 'FOREIGN';
        nextVal.nationalityType = 'WNA';
        nextVal.country = p.kewarganegaraan;
      }
    }
    onChangeValue(nextVal);
    setCopiedKey('applied_all');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRemoveDoc = () => {
    if (docType === 'KTP') {
      onChangeValue({ ...curVal, ktpUrl: undefined, ktpFileName: undefined, ktpMime: undefined, ktpOcrText: '', ktpData: undefined });
    } else if (docType === 'PASSPORT') {
      onChangeValue({ ...curVal, passportUrl: undefined, passportFileName: undefined, passportMime: undefined, passportOcrText: '', passportData: undefined });
    } else if (docType === 'NPWP') {
      onChangeValue({ ...curVal, npwpUrl: undefined, npwpFileName: undefined, npwpMime: undefined, npwpOcrText: '', npwpData: undefined });
    } else if (docType === 'KITAS') {
      onChangeValue({ ...curVal, kitasUrl: undefined, kitasFileName: undefined, kitasMime: undefined, kitasOcrText: '', kitasData: undefined });
    }
  };

  const docTitles: Record<StakeholderDocType, string> = {
    KTP: 'e-KTP (Kependudukan)',
    PASSPORT: 'Paspor (Passport Internasional)',
    NPWP: 'NPWP (Tax Identification Number)',
    KITAS: 'KITAS / ITAS (Izin Tinggal Terbatas)'
  };

  return (
    <Modal
      title={
        !isRightPaneVisible
          ? (isNewStakeholder ? 'Add Stakeholder' : editorLocked ? 'Stakeholder Details' : 'Edit Stakeholder')
          : (isNewStakeholder ? 'Add Stakeholder · Identity Document & OCR' : editorLocked ? 'Stakeholder Details' : 'Edit Stakeholder · Identity Document & OCR')
      }
      onClose={onClose}
      className={isRightPaneVisible ? "modal-side-by-side modal-stakeholder-ktp" : "modal-stakeholder-form-only"}
    >
      <div className="modal-side-by-side-body">
        {/* LEFT PANE: FORM FIELDS */}
        <div className="modal-side-form-pane">
          <div className="ktp-form-header-bar">
            <div>
              <span className="eyebrow" style={{color:'#002060',fontWeight:700,letterSpacing:'0.5px'}}>STAKEHOLDER FORM</span>
              <h3 style={{margin:'2px 0 0 0',fontSize:'15px',color:'#0f172a'}}>Shareholders & Directors Data</h3>
            </div>
            {copiedKey === 'applied_all' && (
              <span className="subtle-chip" style={{background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe',fontWeight:600,fontSize:'11px'}}>
                ✓ Document Data Applied to Form!
              </span>
            )}
          </div>

          {formError && <div className="error" role="alert">{formError}</div>}
          <Fields
            fields={fields.map(f => {
              if (f.key === 'idType') {
                return {
                  ...f,
                  options: ['NONE', 'KTP_NPWP', 'PASSPORT_KITAS'],
                  optionLabels: {
                    NONE: 'None',
                    KTP_NPWP: 'KTP - NPWP',
                    PASSPORT_KITAS: 'PASSPORT - KITAS'
                  }
                };
              }
              if (f.key === 'idNumber') {
                return {
                  ...f,
                  label: activeIdGroup === 'KTP_NPWP'
                    ? 'ID Number - KTP'
                    : activeIdGroup === 'PASSPORT_KITAS'
                    ? 'ID Number - PASSPORT'
                    : 'ID Number - [KTP or PASSPORT]'
                };
              }
              if (f.key === 'idNumberSecondary') {
                return {
                  ...f,
                  label: activeIdGroup === 'KTP_NPWP'
                    ? 'ID Number - NPWP'
                    : activeIdGroup === 'PASSPORT_KITAS'
                    ? 'ID Number - KITAS'
                    : 'ID Number - [NPWP or KITAS]'
                };
              }
              return f;
            })}
            value={formValue}
            disabled={editorLocked}
            onChange={onChangeValue}
            onSelectOption={handleSelectOption}
          />
        </div>

        {/* RIGHT PANE: DOCUMENT PREVIEW & OCR WORKSPACE (Visible only when document is present or ID type selected) */}
        {isRightPaneVisible && (
          <div className="modal-side-preview-pane stakeholder-ktp-pane">
            {/* DOCUMENT TYPE SELECTOR TABS */}
            <div className="doc-type-tabs">
              {allowedDocTypes.map(t => {
                const hasDoc = Boolean(docAssets[t].url);
                return (
                  <button
                    type="button"
                    key={t}
                    className={`doc-type-tab ${docType === t ? 'active' : ''}`}
                    onClick={() => handleSelectDocTypeTab(t)}
                  >
                    {hasDoc && <span className="doc-type-tab-indicator" title="File uploaded" />}
                    {t === 'KTP' ? 'e-KTP' : t === 'PASSPORT' ? 'Passport' : t === 'NPWP' ? 'NPWP' : 'KITAS'}
                  </button>
                );
              })}
            </div>

          {/* TOP TOOLBAR */}
          <div className="ktp-pane-topbar">
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <h4 style={{margin:0,fontSize:'14.5px',color:'#002060',fontWeight:700}}>{docTitles[docType]}</h4>
                {currentAsset.url && (
                  <span className="subtle-chip" style={{background:'#eff6ff',color:'#1d4ed8',fontSize:'10.5px',fontWeight:600}}>
                    ✓ Attached
                  </span>
                )}
              </div>
              <span style={{fontSize:'11px',color:'#64748b'}}>Physical ID document preview & smart data extraction (OCR)</span>
            </div>

            {currentAsset.url && !editorLocked && (
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <label className="button small button-secondary" style={{padding:'4px 10px',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:'4px'}}>
                  <Upload size={13}/> Replace File
                  <input type="file" accept="image/*,application/pdf" style={{display:'none'}} onChange={e => handleUploadDoc(e, docType)}/>
                </label>
                <button type="button" className="button small legal-delete-button" style={{padding:'4px 8px'}} onClick={handleRemoveDoc}>
                  <Trash2 size={13}/> Delete
                </button>
              </div>
            )}
          </div>

          {/* DOCUMENT VIEWER CARD */}
          {currentAsset.url ? (
            <div className="ktp-viewer-card">
              <div className="ktp-viewer-controls">
                <span className="ktp-viewer-filename">{currentAsset.fileName || `${docType} File`}</span>
                <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                  <button type="button" className="ktp-ctrl-btn" onClick={()=>setZoom(z=>Math.max(0.75, z-0.25))} title="Zoom Out"><ZoomOut size={13}/></button>
                  <span style={{fontSize:'10px',color:'#475569',minWidth:'28px',textAlign:'center'}}>{Math.round(zoom*100)}%</span>
                  <button type="button" className="ktp-ctrl-btn" onClick={()=>setZoom(z=>Math.min(2.5, z+0.25))} title="Zoom In"><ZoomIn size={13}/></button>
                  <button type="button" className="ktp-ctrl-btn" onClick={()=>setRotation(r=>(r+90)%360)} title="Putar 90°"><RotateCw size={13}/></button>
                  {(zoom!==1 || rotation!==0) && (
                    <button type="button" className="ktp-ctrl-btn reset" onClick={()=>{setZoom(1);setRotation(0);}} title="Reset View">Reset</button>
                  )}
                </div>
              </div>

              <div className="ktp-img-stage">
                {currentAsset.mime?.includes('pdf') || currentAsset.fileName?.toLowerCase().endsWith('.pdf') ? (
                  <iframe title={`${docType} PDF`} src={currentAsset.url} className="ktp-preview-iframe" />
                ) : (
                  <div className="ktp-img-viewport">
                    <img
                      src={currentAsset.url}
                      alt={`${docType} Preview`}
                      className="ktp-preview-img-interactive"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <label className="ktp-upload-box-enhanced">
              <div className="ktp-upload-icon-circle">
                <Upload size={28}/>
              </div>
              <div style={{textAlign:'center'}}>
                <b style={{fontSize:'14.5px',color:'#0f172a',display:'block'}}>Upload Scan / Photo {docTitles[docType]}</b>
                <span style={{fontSize:'12px',color:'#64748b',display:'block',marginTop:'4px'}}>Select image format (JPG, PNG) or PDF document</span>
              </div>
              <div className="ktp-upload-tip">
                <Sparkles size={14} style={{color:'#002060',flexShrink:0}}/>
                <span>Identity data on the document will be automatically scanned in a structured format according to the {docType} format to facilitate verification.</span>
              </div>
              <input type="file" accept="image/*,application/pdf" style={{display:'none'}} disabled={editorLocked} onChange={e => handleUploadDoc(e, docType)}/>
            </label>
          )}

          {/* OCR RESULTS WORKSPACE */}
          <div className="ktp-ocr-workspace-card">
            {/* OCR CARD HEADER */}
            <div className="ktp-ocr-header">
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div className="ktp-ocr-badge-icon"><Sparkles size={14}/></div>
                <div>
                  <h5 style={{margin:0,fontSize:'13.5px',color:'#002060',fontWeight:700}}>Hasil Pembacaan Dokumen ({docType} OCR)</h5>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'2px'}}>
                    {ocrLoading ? (
                      <span className="ktp-ocr-status loading">⏳ Scanning {docType} image...</span>
                    ) : currentAsset.ocrText ? (
                      <span className="ktp-ocr-status ready">✓ Data Ready to Sync</span>
                    ) : (
                      <span className="ktp-ocr-status empty">Awaiting file upload</span>
                    )}
                  </div>
                </div>
              </div>

              {currentAsset.ocrText && !editorLocked && (
                <button
                  type="button"
                  className="button primary small ktp-autofill-btn"
                  onClick={applyDocOcrToForm}
                  title={`Copy and sync ${docType} OCR data to the left form`}
                >
                  <Sparkles size={13}/> Auto-fill to Left Form
                </button>
              )}
            </div>

            {/* STRUCTURED DATA TILES PER DOCUMENT TYPE */}
            {docType === 'KTP' && (
              <div className="ktp-structured-grid">
                <div className="ktp-field-tile highlight">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NOMOR INDUK KEPENDUDUKAN (NIK)</span>
                    {ktpParsed.nik && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('nik', ktpParsed.nik!)}>
                        {copiedKey==='nik' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='nik' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <b className="ktp-field-val nik-val">{ktpParsed.nik || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NAMA LENGKAP</span>
                    {ktpParsed.nama && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('nama', ktpParsed.nama!)}>
                        {copiedKey==='nama' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='nama' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <b className="ktp-field-val">{ktpParsed.nama || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">TEMPAT / TGL LAHIR & USIA</span>
                  </div>
                  <span className="ktp-field-val">{ktpParsed.tempatTglLahir || (ktpParsed.tempatLahir ? `${ktpParsed.tempatLahir}, ${ktpParsed.dateOfBirth||''}` : '—')}</span>
                  {ktpParsed.dateOfBirth && (
                    <small className="ktp-field-sub">
                      ISO: {ktpParsed.dateOfBirth} · Age: {calculateAgeYearsMonths(ktpParsed.dateOfBirth).years} yr {calculateAgeYearsMonths(ktpParsed.dateOfBirth).months} mo
                    </small>
                  )}
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">JENIS KELAMIN</span>
                  </div>
                  <span className="ktp-field-val">{ktpParsed.gender === 'MALE' ? 'LAKI-LAKI (MALE)' : ktpParsed.gender === 'FEMALE' ? 'PEREMPUAN (FEMALE)' : '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">STATUS PERKAWINAN</span>
                  </div>
                  <span className="ktp-field-val">{ktpParsed.maritalStatus || ktpParsed.status || '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">KEWARGANEGARAAN</span>
                  </div>
                  <span className="ktp-field-val">{ktpParsed.citizenship || ktpParsed.kewarganegaraan || 'WNI'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">PEKERJAAN</span>
                  </div>
                  <span className="ktp-field-val">{ktpParsed.pekerjaan || '—'}</span>
                </div>

                <div className="ktp-field-tile full-width">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">ALAMAT DOMISILI LENGKAP</span>
                    {ktpParsed.alamat && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('alamat', ktpParsed.alamat!)}>
                        {copiedKey==='alamat' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='alamat' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <span className="ktp-field-val address-val">
                    {[ktpParsed.alamat, ktpParsed.rtRw ? `RT/RW ${ktpParsed.rtRw}` : '', ktpParsed.kelDesa ? `Kel. ${ktpParsed.kelDesa}` : '', ktpParsed.kecamatan ? `Kec. ${ktpParsed.kecamatan}` : '', ktpParsed.cityRegency, ktpParsed.province].filter(Boolean).join(', ') || '—'}
                  </span>
                </div>
              </div>
            )}

            {docType === 'PASSPORT' && (
              <div className="ktp-structured-grid">
                <div className="ktp-field-tile highlight">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NOMOR PASPOR (PASSPORT NO.)</span>
                    {passportParsed.passportNumber && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('passNo', passportParsed.passportNumber!)}>
                        {copiedKey==='passNo' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='passNo' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <b className="ktp-field-val nik-val">{passportParsed.passportNumber || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">KODE NEGARA / NATIONALITY</span>
                  </div>
                  <b className="ktp-field-val">{passportParsed.countryCode ? `${passportParsed.countryCode} · ${passportParsed.countryName || passportParsed.nationality || ''}` : passportParsed.nationality || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NAMA LENGKAP</span>
                  </div>
                  <b className="ktp-field-val">{passportParsed.fullName || [passportParsed.givenNames, passportParsed.surname].filter(Boolean).join(' ') || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NAMA DEPAN / SURNAME</span>
                  </div>
                  <span className="ktp-field-val">{passportParsed.givenNames ? `Given: ${passportParsed.givenNames}` : ''} {passportParsed.surname ? `· Surname: ${passportParsed.surname}` : ''}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">TANGGAL LAHIR & USIA</span>
                  </div>
                  <span className="ktp-field-val">{passportParsed.dateOfBirth || '—'}</span>
                  {passportParsed.dateOfBirth && (
                    <small className="ktp-field-sub">
                      Age: {calculateAgeYearsMonths(passportParsed.dateOfBirth).years} yr {calculateAgeYearsMonths(passportParsed.dateOfBirth).months} mo
                    </small>
                  )}
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">JENIS KELAMIN (SEX)</span>
                  </div>
                  <span className="ktp-field-val">{passportParsed.gender === 'MALE' ? 'M / LAKI-LAKI' : passportParsed.gender === 'FEMALE' ? 'F / PEREMPUAN' : '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">TANGGAL BERLAKU / EXPIRY</span>
                  </div>
                  <span className="ktp-field-val">{passportParsed.expiryDate || '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">KANTOR PENERBIT (AUTHORITY)</span>
                  </div>
                  <span className="ktp-field-val">{passportParsed.issuingAuthority || '—'}</span>
                </div>
              </div>
            )}

            {docType === 'NPWP' && (
              <div className="ktp-structured-grid">
                <div className="ktp-field-tile highlight">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NOMOR NPWP (15-16 DIGIT)</span>
                    {npwpParsed.npwpNumber && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('npwp', npwpParsed.npwpNumber!)}>
                        {copiedKey==='npwp' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='npwp' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <b className="ktp-field-val nik-val">{npwpParsed.npwpNumber || npwpParsed.rawNpwp || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NAMA WAJIB PAJAK</span>
                  </div>
                  <b className="ktp-field-val">{npwpParsed.nama || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NIK TERDAFTAR</span>
                  </div>
                  <span className="ktp-field-val">{npwpParsed.nik || '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">KANTOR PELAYANAN PAJAK (KPP)</span>
                  </div>
                  <span className="ktp-field-val">{npwpParsed.kpp || '—'}</span>
                </div>

                <div className="ktp-field-tile full-width">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">ALAMAT TERDAFTAR NPWP</span>
                  </div>
                  <span className="ktp-field-val address-val">
                    {[npwpParsed.alamat, npwpParsed.kelurahanKecamatan, npwpParsed.kotaProvinsi].filter(Boolean).join(', ') || '—'}
                  </span>
                </div>
              </div>
            )}

            {docType === 'KITAS' && (
              <div className="ktp-structured-grid">
                <div className="ktp-field-tile highlight">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NOMOR IZIN TINGGAL / NIORA</span>
                    {kitasParsed.permitNumber && (
                      <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('kitasNo', kitasParsed.permitNumber!)}>
                        {copiedKey==='kitasNo' ? <Check size={11}/> : <Copy size={11}/>}
                        {copiedKey==='kitasNo' ? 'Tersalin' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <b className="ktp-field-val nik-val">{kitasParsed.permitNumber || kitasParsed.niora || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">NAMA LENGKAP</span>
                  </div>
                  <b className="ktp-field-val">{kitasParsed.nama || '—'}</b>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">KEWARGANEGARAAN</span>
                  </div>
                  <span className="ktp-field-val">{kitasParsed.kewarganegaraan || 'WNA'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">TANGGAL LAHIR & USIA</span>
                  </div>
                  <span className="ktp-field-val">{kitasParsed.tanggalLahir || '—'}</span>
                  {kitasParsed.tanggalLahir && (
                    <small className="ktp-field-sub">
                      Age: {calculateAgeYearsMonths(kitasParsed.tanggalLahir).years} yr {calculateAgeYearsMonths(kitasParsed.tanggalLahir).months} mo
                    </small>
                  )}
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">BERLAKU HINGGA</span>
                  </div>
                  <span className="ktp-field-val">{kitasParsed.berlakuHingga || '—'}</span>
                </div>

                <div className="ktp-field-tile">
                  <div className="ktp-field-meta">
                    <span className="ktp-field-key">INSTANSI PENERBIT</span>
                  </div>
                  <span className="ktp-field-val">{kitasParsed.instansiPenerbit || 'Direktorat Jenderal Imigrasi'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      <div className="modal-actions">
        <button type="button" className="button" onClick={onClose}>{editorLocked ? 'Close' : 'Cancel'}</button>
        {!editorLocked && (
          <button type="button" className="button primary" onClick={onSave} style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
            <Save size={15}/> Save Shareholder
          </button>
        )}
      </div>
    </Modal>
  );
}

const normalizeRemarksToHtml = (remarks?: string): string => {
  if (!remarks || !remarks.trim()) return '';
  let html = remarks;
  if (/<(ol|ul)[\s>]/i.test(html)) {
    return html.replace(/<\/ol>\s*<ol[^>]*>/gi, '').replace(/<\/ul>\s*<ul[^>]*>/gi, '');
  }
  const cleaned = html
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|span)[^>]*>/gi, '')
    .trim();
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  const isNumbered = lines.some(l => /^(\d+)[\.\)]\s+/.test(l));
  if (isNumbered) {
    const lis = lines.map(l => {
      const stripped = l.replace(/^(\d+)[\.\)]\s+/, '').trim();
      return `<li>${stripped}</li>`;
    });
    return `<ol>${lis.join('')}</ol>`;
  }
  return lines.map(l => `<p>${l}</p>`).join('');
};

function DeedRemarksTinyMCE({
  initialContent,
  disabled,
  onChange,
}: {
  initialContent: string;
  disabled: boolean;
  onChange: (html: string) => void;
}) {
  const [initialValue] = useState(() => initialContent);

  return (
    <div className="legal-tinymce-wrapper">
      <Editor
        licenseKey="gpl"
        tinymceScriptSrc="/crm/tinymce/tinymce.min.js"
        initialValue={initialValue}
        disabled={disabled}
        onEditorChange={onChange}
        init={{
          height: 260,
          menubar: false,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'charmap',
            'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'table', 'help', 'wordcount'
          ],
          toolbar: 'undo redo | blocks | bold italic underline forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
          content_style: `
            body { 
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              font-size: 13.5px; 
              line-height: 1.6; 
              color: #0f172a; 
              padding: 10px 14px; 
            }
            ol {
              margin: 0 0 10px 0;
              padding-left: 26px;
              list-style-type: decimal !important;
            }
            ol li {
              margin-bottom: 5px;
              line-height: 1.6;
            }
            ul {
              margin: 0 0 10px 0;
              padding-left: 26px;
              list-style-type: disc !important;
            }
            ul li {
              margin-bottom: 5px;
              line-height: 1.6;
            }
            p {
              margin: 0 0 8px 0;
              line-height: 1.6;
            }
          `,
          branding: false,
          promotion: false,
          statusbar: true,
          placeholder: 'Write deed change notes here...',
          setup: (ed: any) => {
            ed.on('init', () => {
              if (!disabled) {
                ed.mode.set('design');
              }
            });
          }
        }}
      />
    </div>
  );
}

function LegalEditor({value,application,stakeholders,onChange,onStakeholdersChange,disabled,user,onReview}:{value:any,application:any,stakeholders:any[],onChange:(v:any)=>void,onStakeholdersChange:(legal:any,rows:any[])=>void,disabled:boolean,user:any,onReview:(id:string)=>void}){
 const [formError,setFormError]=useState('');
 const [actionMenu,setActionMenu]=useState<any>(null);
 const [ocrLoading,setOcrLoading]=useState(false);
 const [editing,setEditing]=useState<any>(null),[deleting,setDeleting]=useState<any>(null),[stakeholderModal,setStakeholderModal]=useState<any>(null),[stakeholderList,setStakeholderList]=useState<any>(null),[viewStakeholderDetail,setViewStakeholderDetail]=useState<any>(null),[deleteStakeholder,setDeleteStakeholder]=useState<any>(null),[shareholderCountDeed,setShareholderCountDeed]=useState<any>(null),[viewRemarkDeed,setViewRemarkDeed]=useState<any>(null),[legacyRemarkCategories]=useState<any[]>(()=>{try{const stored=JSON.parse(localStorage.getItem('liugong-los-remarks-master-v1')||'[]');return Array.isArray(stored)?stored:[];}catch{return [];}});
 useEffect(()=>setFormError(''),[editing?.id,stakeholderModal?.deedId,stakeholderModal?.index]);
 const defaultRemarkCategories=[{id:'establishment-deed',name:'Establishment deed',remarks:''},{id:'amendment-share-change',name:'Shares',remarks:''},{id:'amendment-management-change',name:'Management',remarks:''},{id:'amendment-business-activity-change',name:'Business Activities',remarks:''},{id:'amendment-articles-change',name:'Articles of Association',remarks:''},{id:'amendment-other',name:'Other',remarks:''}];
 const master=useMasterData(),masterCats=master.remarkCategoryId.map(x=>({id:x.value,name:x.name,remarks:''}));
 const remarkCategories=[...defaultRemarkCategories,...masterCats.filter(x=>!defaultRemarkCategories.some(d=>d.id===x.id)),...legacyRemarkCategories];
 const amendmentRemarkCategories=[{id:'amendment-share-change',name:'Shares',remarks:''},{id:'amendment-management-change',name:'Management',remarks:''},{id:'amendment-business-activity-change',name:'Business Activities',remarks:''},{id:'amendment-articles-change',name:'Articles of Association',remarks:''},{id:'amendment-other',name:'Other',remarks:''},...masterCats.filter(x=>!['establishment-deed','amendment-share-change','amendment-management-change','amendment-business-activity-change','amendment-articles-change','amendment-other'].includes(x.id))];
 const getDeedCategoryIds=(d:any):string[]=>{if(Array.isArray(d?.remarkCategoryIds)&&d.remarkCategoryIds.length>0)return d.remarkCategoryIds;if(d?.remarkCategoryId)return [d.remarkCategoryId];return d?.type==='establishment'?['establishment-deed']:[];};
 const deeds=legalDeedList(value,application),selectedId=value.selectedDeedId||deeds.find(x=>x.type===(value.selectedDeed||'establishment'))?.id||deeds[0]?.id,parties=editing?.parties||{};
 const locked=(d:any)=>disabled||deedPending(d)||!['DRAFT','RETURNED'].includes(application.status)&&reviewStatus(d)!=='REJECTED';const listLocked=locked(deeds.find(d=>d.id===stakeholderList));const editorLocked=locked(stakeholderModal?deeds.find(d=>d.id===stakeholderModal.deedId):editing);
 const rowsFor=(x:any):any[]=>Array.isArray(x.stakeholders)?x.stakeholders:x.id===selectedId?stakeholders:[];
 const updateRows=(deedId:string,rows:any[])=>{
   const hydrated=deeds.map(x=>x.id===selectedId&&!Array.isArray(x.stakeholders)?{...x,stakeholders}:x);
   const updated=hydrated.map(x=>x.id===deedId?{...x,stakeholders:rows}:x);
   const nextLegal = {...value,deeds:updated,selectedDeedId:deedId};
   onStakeholdersChange(nextLegal,rows);
   if(application?.id && !application.isNew){
     api(`/applications/${application.id}/page-legal`,'PUT',{legal:nextLegal,stakeholders:rows}).catch(e=>console.warn('Auto-save legal stakeholders error:',e));
   }
 };
 const safeUUID=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():'deed-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
 const openAdd=()=>setEditing({id:safeUUID(),type:deeds.some(x=>x.type==='establishment')?'amendment':'establishment',createdAt:new Date().toISOString(),stakeholders:[]});
 const saveDeed=()=>{
   if(!editing||editorLocked)return;
   setFormError('');
   const catsToSave=getDeedCategoryIds(editing);
   const cleanRemarks=(editing.remarks||'').replace(/<\/ol>\s*<ol[^>]*>/gi,'').replace(/<\/ul>\s*<ul[^>]*>/gi,'');
   const saved={...editing,remarks:cleanRemarks,remarkCategoryIds:catsToSave,remarkCategoryId:catsToSave[0]||''};
   const updatedDeeds = deeds.some(x=>x.id===editing.id)?deeds.map(x=>x.id===editing.id?saved:x):[...deeds,saved];
   const nextLegal = {...value,deeds:updatedDeeds,selectedDeedId:editing.id};
   onChange(nextLegal);
   if(application?.id && !application.isNew){
     api(`/applications/${application.id}/page-legal`,'PUT',{legal:nextLegal}).catch(e=>console.warn('Auto-save legal deed error:',e));
   }
   setEditing(null);
 };
 const removeDeed=()=>{
   if(!deleting||locked(deleting)||deleting.approvedSnapshot)return;
   const remaining=deeds.filter(x=>x.id!==deleting.id),nextId=remaining[0]?.id,legal={...value,deeds:remaining,hiddenDeedIds:[...new Set([...(value.hiddenDeedIds||[]),deleting.id])],selectedDeedId:nextId};
   const nextRows = nextId?rowsFor(remaining[0]):[];
   if(deleting.id===selectedId)onStakeholdersChange(legal,nextRows);
   else onChange(legal);
   if(application?.id && !application.isNew){
     api(`/applications/${application.id}/page-legal`,'PUT',{legal,stakeholders:nextRows}).catch(e=>console.warn('Auto-delete legal deed error:',e));
   }
   setDeleting(null);
 };
  const handleKtpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      const dataUrl = r.result as string;
      setOcrLoading(true);
      setStakeholderModal((prev: any) => ({
        ...prev,
        value: {
          ...prev.value,
          ktpUrl: dataUrl,
          ktpFileName: f.name,
          ktpMime: f.type,
          ktpOcrText: '',
        }
      }));
      try {
        const parsed = await extractKtpTextFromImage(f, f.name);
        setStakeholderModal((prev: any) => {
          if (!prev) return prev;
          const currentVal = prev.value || {};
          const nextVal: any = {
            ...currentVal,
            ktpUrl: dataUrl,
            ktpFileName: f.name,
            ktpMime: f.type,
            ktpOcrText: parsed.rawText || '',
          };
          if (parsed.nik && (!currentVal.idNumber || currentVal.idNumber === '')) {
            nextVal.idNumber = parsed.nik;
            nextVal.idType = 'KTP_NPWP';
          }
          if (parsed.nama && (!currentVal.firstName || currentVal.firstName === '')) {
            nextVal.name = parsed.nama;
            nextVal.firstName = parsed.firstName || '';
            nextVal.middleName = parsed.middleName || '';
            nextVal.lastName = parsed.lastName || '';
          }
          if (parsed.dateOfBirth && !currentVal.dateOfBirth) {
            nextVal.dateOfBirth = parsed.dateOfBirth;
          }
          if (parsed.gender && (!currentVal.gender || currentVal.gender === 'NONE')) {
            nextVal.gender = parsed.gender;
          }
          if (parsed.maritalStatus) {
            nextVal.maritalStatus = parsed.maritalStatus;
          }
          if (parsed.citizenship) {
            nextVal.citizenship = parsed.citizenship === 'WNI' ? 'INDONESIAN' : 'FOREIGN';
            nextVal.nationalityType = parsed.citizenship;
          }
          if (parsed.kewarganegaraan && parsed.kewarganegaraan.includes('CHINA')) {
            nextVal.nationalityType = 'WNA';
            nextVal.citizenship = 'FOREIGN';
            nextVal.country = 'CHINA';
          }
          if (parsed.alamat && !currentVal.address) {
            nextVal.address = parsed.alamat;
          }
          if (parsed.province && !currentVal.province) nextVal.province = parsed.province;
          if ((parsed.cityRegency || parsed.city) && !currentVal.cityRegency) nextVal.cityRegency = parsed.cityRegency || parsed.city;
          if ((parsed.kecamatan || parsed.district) && !currentVal.district) nextVal.district = parsed.kecamatan || parsed.district;
          if ((parsed.kelDesa || parsed.village) && !currentVal.village) nextVal.village = parsed.kelDesa || parsed.village;
          if (parsed.rt && !currentVal.rt) nextVal.rt = parsed.rt;
          if (parsed.rw && !currentVal.rw) nextVal.rw = parsed.rw;
          if ((parsed.kodePos || parsed.postalCode) && !currentVal.postalCode) nextVal.postalCode = parsed.kodePos || parsed.postalCode;
          if (parsed.pekerjaan && !currentVal.occupation) nextVal.occupation = parsed.pekerjaan;
          return { ...prev, value: nextVal };
        });
      } catch (err) {
        console.warn('OCR error:', err);
      } finally {
        setOcrLoading(false);
      }
    };
    r.readAsDataURL(f);
  };

  const applyOcrToForm = () => {
    if (!stakeholderModal?.value?.ktpOcrText) return;
    const parsed = parseKtpText(stakeholderModal.value.ktpOcrText);
    setStakeholderModal((prev: any) => {
      if (!prev) return prev;
      const v = prev.value || {};
      return {
        ...prev,
        value: {
          ...v,
          idNumber: parsed.nik || v.idNumber,
          idType: parsed.nik ? 'KTP' : v.idType,
          firstName: parsed.firstName || v.firstName,
          middleName: parsed.middleName || v.middleName,
          lastName: parsed.lastName || v.lastName,
          name: parsed.nama || v.name,
          dateOfBirth: parsed.dateOfBirth || v.dateOfBirth,
          gender: parsed.gender || v.gender,
          maritalStatus: parsed.maritalStatus || v.maritalStatus,
          citizenship: parsed.citizenship ? (parsed.citizenship === 'WNI' ? 'INDONESIAN' : 'FOREIGN') : v.citizenship,
          nationalityType: parsed.citizenship || v.nationalityType,
          country: parsed.kewarganegaraan?.includes('CHINA') ? 'CHINA' : v.country,
          address: parsed.alamat || v.address,
          province: parsed.province || v.province,
          cityRegency: parsed.cityRegency || parsed.city || v.cityRegency,
          district: parsed.kecamatan || parsed.district || v.district,
          village: parsed.kelDesa || parsed.village || v.village,
          rt: parsed.rt || v.rt,
          rw: parsed.rw || v.rw,
          postalCode: parsed.postalCode || parsed.kodePos || v.postalCode,
          occupation: parsed.pekerjaan || v.occupation
        }
      };
    });
  };

  const saveStakeholder=()=>{
    if(!stakeholderModal||editorLocked)return;
    setFormError('');
    const x=deeds.find(d=>d.id===stakeholderModal.deedId);
    if(!x)return;
    const rows=rowsFor(x);
    let valToSave={...stakeholderModal.value};
    if(valToSave.dateOfBirth){
      const {years,months}=calculateAgeYearsMonths(valToSave.dateOfBirth);
      valToSave.ageYears=years;
      valToSave.ageMonths=months;
    }
    const next=stakeholderModal.index<0?[...rows,valToSave]:rows.map((r,i)=>i===stakeholderModal.index?valToSave:r);
    updateRows(x.id,next);
    setStakeholderModal(null);
  };
  const editingCategoryIds=editing?getDeedCategoryIds(editing):[];const complete=editing&&['deedNumber','deedDate','ministerialDecreeNumber','ministerialDecreeDate'].every(k=>String(editing[k]||'').trim())&&(editing.type!=='amendment'||editingCategoryIds.length>0);

  // Active Deed Classification (Strict Legal) vs Historical Deed (History)
  const establishmentDeeds = deeds.filter((d: any) => d.type === 'establishment');
  const amendmentDeeds = deeds.filter((d: any) => d.type === 'amendment');

  // 1. Primary establishment deed: matches number in customer profile, or the oldest
  const matchedEst = establishmentDeeds.find((d: any) => 
    (application.customer?.establishmentActNo && d.deedNumber === application.customer.establishmentActNo) ||
    (application.establishmentActNo && d.deedNumber === application.establishmentActNo)
  );
  const primaryEstablishmentDeed = matchedEst || establishmentDeeds.slice().sort((a: any, b: any) => {
    const ad = Date.parse(String(a.deedDate || '')) || 0;
    const bd = Date.parse(String(b.deedDate || '')) || 0;
    return ad - bd;
  })[0] || null;

  // 2. Latest amendment deed: sorted by most recent date
  const sortedAmendments = amendmentDeeds.slice().sort((a: any, b: any) => {
    const ad = Date.parse(String(a.deedDate || a.createdAt || '')) || 0;
    const bd = Date.parse(String(b.deedDate || b.createdAt || '')) || 0;
    return bd - ad;
  });
  const latestAmendmentDeed = sortedAmendments[0] || null;

  // 3. Active Deeds (Top Table): 1 Primary Establishment Deed + 1 Latest Amendment Deed (active)
  const activeDeeds: any[] = [];
  if (primaryEstablishmentDeed) {
    activeDeeds.push(primaryEstablishmentDeed);
  }
  if (latestAmendmentDeed && latestAmendmentDeed.id !== primaryEstablishmentDeed?.id) {
    const validity = deedValidity(latestAmendmentDeed.deedDate);
    if (validity.active !== false) {
      activeDeeds.push(latestAmendmentDeed);
    }
  }

  // 4. Historical Deeds (Bottom Table): All deeds other than active ones
  const activeIdSet = new Set(activeDeeds.map((d: any) => d.id));
  const historicalDeeds = deeds.filter((d: any) => !activeIdSet.has(d.id)).sort((a: any, b: any) => {
    const ad = Date.parse(String(a.deedDate || a.createdAt || '')) || 0;
    const bd = Date.parse(String(b.deedDate || b.createdAt || '')) || 0;
    return bd - ad;
  });

  const renderDeedTable = (targetList: any[], isHistory: boolean, emptyMsg: string) => {
    if (!targetList.length) {
      return (
        <div className={`table-scroll legal-table-wrap ${isHistory ? 'legal-table-history' : ''}`}>
          <div className="empty-small" style={{ padding: '24px 20px', color: '#64748b', textAlign: 'center' }}>
            {emptyMsg}
          </div>
        </div>
      );
    }
    return (
      <div className={`table-scroll legal-table-wrap ${isHistory ? 'legal-table-history' : ''}`}>
        <table className="data-table legal-deed-table">
          <thead>
            <tr>
              <th>DEED</th>
              <th>DATE</th>
              <th>STATUS</th>
              <th>VALID UNTIL</th>
              <th>MINISTERIAL DECREE</th>
              <th>REMARKS CATEGORY</th>
              <th>STAKEHOLDERS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {targetList.map((x: any) => {
              const rowLocked = locked(x);
              const total = rowsFor(x).reduce((sum, r) => sum + Number(r.sharePercentage || 0), 0);
              const isExceeded = total > 100.01;
              const isComplete = Math.abs(total - 100) < 0.01;
              const ownershipClass = isExceeded ? 'exceeded' : isComplete ? 'complete' : total > 0 ? 'partial' : 'incomplete';
              const ownershipLabel = isExceeded ? `⚠ ${total.toFixed(2)}% · Exceeds 100%` : isComplete ? '✓ 100%' : total > 0 ? `✓ ${total.toFixed(2)}%` : '0.00% · No data yet';
              const val = deedValidity(x.deedDate);
              const isPrimaryEst = primaryEstablishmentDeed?.id === x.id;
              const isLatestAmend = latestAmendmentDeed?.id === x.id;
              return (
                <tr key={x.id} className={selectedId === x.id ? 'selected' : ''} aria-selected={selectedId === x.id}>
                  <td data-label="Deed">
                    <div className="legal-deed-primary">
                      <span className="legal-type-badge">{deedNames[x.type]}</span>
                      {selectedId === x.id && <span className="legal-current">Selected</span>}
                      {isHistory ? (
                        <span className="legal-history-badge">Historical</span>
                      ) : isPrimaryEst ? (
                        <span className="legal-role-badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>Primary</span>
                      ) : isLatestAmend ? (
                        <span className="legal-role-badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>Latest</span>
                      ) : null}
                    </div>
                    <b className="legal-deed-number">{x.deedNumber || 'Number not filled'}</b>
                    <span className={'deed-review-status compact ' + reviewStatus(x).toLowerCase()}>
                      {deedReviewLabels[reviewStatus(x)]}
                    </span>
                    {x.review?.rejectionReason && <small className="text-red">{x.review.rejectionReason}</small>}
                    <small>{x.source === 'Sistem' ? 'Initial system data' : 'Legal Input'}</small>
                  </td>
                  <td data-label="Date">
                    <span className="legal-cell-main">{date(x.deedDate)}</span>
                  </td>
                  <td data-label="Status">
                    <span className={'deed-validity ' + (val.active === null ? 'unknown' : val.active ? 'active' : 'inactive')}>
                      {val.status}
                    </span>
                  </td>
                  <td data-label="Valid Until">
                    <span className="legal-cell-main">{date(val.expiry)}</span>
                  </td>
                  <td data-label="Ministerial Decree">
                    <span className="legal-cell-main">{x.ministerialDecreeNumber || '—'}</span>
                    <small>{date(x.ministerialDecreeDate)}</small>
                  </td>
                  <td data-label="Remarks Category">
                    {(() => {
                      const rawIds = getDeedCategoryIds(x);
                      if (!rawIds.length) return <span className="legal-category-label">—</span>;
                      return (
                        <div className="legal-categories-wrap">
                          {rawIds.map((id: string) => {
                            const cat = remarkCategories.find(c => c.id === id || c.name === id);
                            const name = cat?.name || id;
                            return (
                              <button
                                key={id}
                                type="button"
                                className="legal-category-badge clickable"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewRemarkDeed({ deed: x, activeCatId: id });
                                }}
                                title={`Click to view ${name} remarks details`}
                              >
                                {name}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </td>
                  <td data-label="Stakeholders">
                    <button
                      className="legal-count-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange({ ...value, selectedDeedId: x.id });
                        setStakeholderList(x.id);
                      }}
                    >
                      {rowsFor(x).length} stakeholder(s) · Manage
                    </button>
                    <button
                      className={'legal-ownership-summary ' + ownershipClass}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareholderCountDeed(x.id);
                      }}
                      title="View share ownership details"
                    >
                      {ownershipLabel}
                    </button>
                  </td>
                  <td className="legal-row-action">
                    <div className="legal-row-buttons">
                      <button
                        className="button primary small deed-review-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReview(x.id);
                        }}
                      >
                        {(user.isAdmin || user.role === 'ADMIN' || user.role === 'MKT') && ['DRAFT', 'REJECTED'].includes(reviewStatus(x))
                          ? 'Submit deed'
                          : (user.isAdmin || user.role === 'ADMIN' || user.role === 'BS') && reviewStatus(x) === 'PENDING_CHECK'
                          ? 'Review deed'
                          : (user.isAdmin || user.role === 'ADMIN' || user.role === 'HEAD_BS') && reviewStatus(x) === 'PENDING_APPROVAL'
                          ? 'Approve deed'
                          : 'View approval'}
                      </button>
                      <button
                        className="button small legal-kebab"
                        aria-label={`Deed action ${x.deedNumber || 'no number'}`}
                        aria-haspopup="menu"
                        aria-expanded={actionMenu?.id === x.id}
                        onClick={e => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActionMenu({
                            id: x.id,
                            left: Math.max(8, Math.min(rect.right - 180, window.innerWidth - 188)),
                            top: Math.min(rect.bottom + 5, window.innerHeight - 110)
                          });
                        }}
                      >
                        <MoreHorizontal size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

 return <>
  {/* 1. TOP TABLE: ACTIVE DEEDS & CURRENT REFERENCE */}
  <div className="section-title legal-table-title">
    <div>
      <div className="legal-list-heading">
        <h3 style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <CheckCircle size={17} style={{color:'#2563eb'}}/> Active deeds &amp; current reference
        </h3>
        <span className="legal-count active-count">{activeDeeds.length}</span>
      </div>
      <p className="muted">
        Showing 1 primary establishment deed and 1 latest effective amendment deed as the current legal reference.
      </p>
    </div>
    {!disabled&&['DRAFT','RETURNED'].includes(application.status)&&(
      <div className="legal-table-actions">
        <button className="button small" onClick={openAdd}><Plus size={15}/>Add deed</button>
      </div>
    )}
  </div>

  {renderDeedTable(activeDeeds, false, 'No active deeds recorded.')}

  {/* 2. BOTTOM TABLE: PREVIOUS DEED HISTORY (HISTORICAL DATA) */}
  <div className="section-title legal-table-title" style={{marginTop:'34px'}}>
    <div>
      <div className="legal-list-heading">
        <h3 style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <Clock size={17} style={{color:'#64748b'}}/> Previous Deed History (historical data)
        </h3>
        <span className="legal-count history-count">{historicalDeeds.length}</span>
      </div>
      <p className="muted">
        Chronological archive of previous amendment deeds and deeds that are no longer active / expired.
      </p>
    </div>
  </div>

  {renderDeedTable(historicalDeeds, true, 'No previous deed history. All deeds are recorded in the active reference table.')}

  {actionMenu&&createPortal(<div className="legal-menu-layer" onClick={()=>setActionMenu(null)} onKeyDown={e=>{if(e.key==='Escape')setActionMenu(null);}}><div className="legal-action-menu" role="menu" aria-label="Deed action" style={{left:actionMenu.left,top:actionMenu.top}} onClick={e=>e.stopPropagation()}>{(()=>{const target=deeds.find(x=>x.id===actionMenu.id);if(!target)return null;return <><button role="menuitem" autoFocus onClick={()=>{setEditing(structuredClone(target));setActionMenu(null);}}><Pencil size={15}/>{locked(target)?'View details':'Edit'}</button><button role="menuitem" className="legal-delete-button" disabled={locked(target)||!!target.approvedSnapshot} title={target.approvedSnapshot?'Approved deeds cannot be deleted':undefined} onClick={()=>{setDeleting(target);setActionMenu(null);}}><Trash2 size={15}/>Delete</button></>;})()}</div></div>,document.body)}
 {editing&&(()=>{const availableChips=editing.type==='amendment'?amendmentRemarkCategories:[{id:'establishment-deed',name:'Establishment deed',remarks:''},...amendmentRemarkCategories];const currentSelectedCategoryIds=getDeedCategoryIds(editing);const toggleCategory=(catId:string)=>{if(editorLocked)return;setEditing((prev:any)=>{if(!prev)return prev;const currentCats=getDeedCategoryIds(prev);const isSelected=currentCats.includes(catId);const next=isSelected?currentCats.filter(id=>id!==catId):[...currentCats,catId];return {...prev,remarkCategoryIds:next,remarkCategoryId:next[0]||''};});};return <Modal title={deeds.some(x=>x.id===editing.id)?editorLocked?'Deed Details':'Edit Deed':'Add Deed'} onClose={()=>setEditing(null)} className="modal-legal-deed-wide"><div className="modal-body legal-deed-modal">{formError&&<div className="error" role="alert">{formError}</div>}<label className="legal-deed-select">Deed type<select aria-label="Deed type" disabled={editorLocked} value={editing.type} onChange={e=>{const newType=e.target.value;const nextCats=newType==='establishment'?['establishment-deed']:(editing.remarkCategoryIds?.filter((x:string)=>x!=='establishment-deed')||[]);setEditing({...editing,type:newType,remarkCategoryIds:nextCats,remarkCategoryId:nextCats[0]||''});}}><option value="establishment">Establishment Deed</option><option value="amendment">Amendment Deed</option></select></label><Fields fields={legalDeedFields} value={editing} disabled={editorLocked} onChange={next=>{setEditing({...editing,...next});const estDeed=deeds.find((x:any)=>x.type==='establishment'&&x.id!==editing.id);const estDate=estDeed?.deedDate||value.establishmentDate||application.customer?.establishmentDate;const dDate=next.deedDate||editing.deedDate;if(editing.type==='amendment'&&dDate&&estDate&&String(dDate).slice(0,10)<String(estDate).slice(0,10)){setFormError(`Amendment deed date (${date(dDate)}) cannot be before the establishment deed date (${date(estDate)}).`);}else if(formError&&formError.includes('cannot be before the establishment deed date')){setFormError('');}}}/><><div className="legal-remarks-category-group"><span className="field-label">Kategori Remarks {editing.type==='amendment'&&<span className="field-required" aria-label="Required">*</span>}</span><div className="legal-remarks-chips" role="group" aria-label="Kategori Remarks">{availableChips.map(cat=>{const isSelected=currentSelectedCategoryIds.includes(cat.id);return <button key={cat.id} type="button" role="checkbox" aria-checked={isSelected} disabled={editorLocked} className={`legal-remark-chip ${isSelected?'selected':''}`} onClick={()=>toggleCategory(cat.id)}><span className="legal-chip-check">{isSelected?'✓':'+'}</span><span>{cat.name}</span></button>;})}</div>{editing.type==='amendment'&&currentSelectedCategoryIds.length===0&&<small className="input-validation-error" role="alert">Pilih minimal satu kategori remarks.</small>}</div><div className="legal-unified-remarks-box">
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
    <div>
      <span className="field-label" style={{fontSize:'13px',fontWeight:700,color:'#002060'}}>
        Notes / Deed Remarks {editing.type==='amendment'&&<span className="field-required" aria-label="Required">*</span>}
      </span>
      <p className="legal-remarks-hint" style={{fontSize:'11px',color:'#64748b',margin:'2px 0 0 0'}}>
        Write notes and details of deed changes below (rich text TinyMCE format supported):
      </p>
    </div>
    <span className="subtle-chip" style={{background:'#eff6ff',color:'#1d4ed8',fontSize:'10.5px',fontWeight:600}}>
      TinyMCE Editor
    </span>
  </div>
  <DeedRemarksTinyMCE
    key={editing.id}
    initialContent={normalizeRemarksToHtml(editing.remarks)}
    disabled={editorLocked}
    onChange={(newContent) => {
      setEditing((prev: any) => prev ? { ...prev, remarks: newContent } : prev);
    }}
  />
</div></></div><div className="modal-actions"><button className="button" onClick={()=>setEditing(null)}>{editorLocked?'Close':'Cancel'}</button>{!editorLocked&&<button className="button primary" onClick={saveDeed} disabled={!complete}><Save size={15}/>Save deed</button>}</div></Modal>;})()}
 {shareholderCountDeed&&<Modal title="Shareholder Count" onClose={()=>setShareholderCountDeed(null)}><ShareholderCountContent rows={rowsFor(deeds.find(x=>x.id===shareholderCountDeed))}/><div className="modal-actions"><button className="button primary" onClick={()=>setShareholderCountDeed(null)}>Close</button></div></Modal>}
 {stakeholderList&&<Modal title="Stakeholders on this deed" onClose={()=>setStakeholderList(null)}><div className="modal-body"><div className="legal-stakeholder-list">{rowsFor(deeds.find(x=>x.id===stakeholderList)).map((r,i)=><div className="legal-stakeholder-item interactive-stakeholder-card" key={r.id||i} onClick={()=>setViewStakeholderDetail({deedId:stakeholderList,index:i,stakeholder:r})} title="Klik untuk melihat detail lengkap stakeholder"><div className="legal-stakeholder-item-info"><div className="legal-stakeholder-avatar">{(r.name||r.firstName||'S').charAt(0).toUpperCase()}</div><div><b>{r.name||[r.firstName,r.lastName].filter(Boolean).join(' ')||`Stakeholder ${i+1}`}</b><small>{label(r.stakeholderType)} · {Number(r.sharePercentage||0).toFixed(2)}% shares · {label(r.representativeType||'SHAREHOLDER')}</small></div></div><div className="legal-row-buttons" onClick={e=>e.stopPropagation()}><button type="button" className="button small" style={{background:'#f8fafc',color:'#002060',borderColor:'#cbd5e1'}} onClick={()=>setViewStakeholderDetail({deedId:stakeholderList,index:i,stakeholder:r})} title="View full stakeholder details"><Eye size={13} style={{marginRight:'4px'}}/>Detail</button><button type="button" className="button small" onClick={()=>{setStakeholderModal({deedId:stakeholderList,index:i,value:stakeholderEditorValues(r)});setStakeholderList(null);}}><Pencil size={13} style={{marginRight:'4px'}}/>{listLocked?'View':'Edit'}</button>{!listLocked&&<button type="button" className="button small legal-delete-button" onClick={()=>{setDeleteStakeholder({deedId:stakeholderList,index:i});setStakeholderList(null);}}><Trash2 size={13}/>Delete</button>}</div></div>)}{!rowsFor(deeds.find(x=>x.id===stakeholderList)).length&&<div className="empty-small">No stakeholders on this deed yet.</div>}</div></div><div className="modal-actions"><button className="button" onClick={()=>setStakeholderList(null)}>Close</button><button className="button primary" disabled={listLocked} onClick={()=>{setStakeholderModal({deedId:stakeholderList,index:-1,value:{...blank(stakeholderFields),representativeType:"SHAREHOLDER",idType:'NONE'}});setStakeholderList(null);}}><Plus size={15}/>Tambah shareholder</button></div></Modal>}
 {stakeholderModal && (
    <StakeholderModalDialog
      modal={stakeholderModal}
      editorLocked={editorLocked}
      formError={formError}
      onClose={() => setStakeholderModal(null)}
      onSave={saveStakeholder}
      onChangeValue={(val) => setStakeholderModal({ ...stakeholderModal, value: val })}
      fields={stakeholderFields}
    />
  )}
  {viewStakeholderDetail && (
    <StakeholderDetailDialog
      item={viewStakeholderDetail.stakeholder}
      deed={deeds.find((x: any) => x.id === viewStakeholderDetail.deedId)}
      onClose={() => setViewStakeholderDetail(null)}
      onEdit={() => {
        const item = viewStakeholderDetail.stakeholder;
        const deedId = viewStakeholderDetail.deedId;
        const idx = viewStakeholderDetail.index;
        setViewStakeholderDetail(null);
        setStakeholderList(null);
        setStakeholderModal({
          deedId: deedId,
          index: idx,
          value: stakeholderEditorValues(item)
        });
      }}
      locked={listLocked}
    />
  )}
 {deleteStakeholder&&<Modal title="Delete Stakeholder" onClose={()=>setDeleteStakeholder(null)}><div className="modal-body"><p>Delete this stakeholder from the deed?</p><p className="muted legal-delete-note">Click Save changes in Legal to keep changes saved.</p></div><div className="modal-actions"><button className="button" onClick={()=>setDeleteStakeholder(null)}>Cancel</button><button className="button legal-confirm-delete" onClick={()=>{const x=deeds.find(d=>d.id===deleteStakeholder.deedId);if(x)updateRows(x.id,rowsFor(x).filter((_,i)=>i!==deleteStakeholder.index));setDeleteStakeholder(null);}}><Trash2 size={15}/>Delete stakeholder</button></div></Modal>}
 {deleting&&<Modal title="Delete Deed" onClose={()=>setDeleting(null)}><div className="modal-body"><p>Delete {deedNames[deleting.type]} <strong>{deleting.deedNumber||'no number'}</strong> from the Legal list?</p>{deleting.source==='Sistem'&&<p className="muted legal-delete-note">Original data in Customer or profile remains; this deed will be hidden from the Legal list.</p>}<p className="muted legal-delete-note">Click Save changes after deleting to keep changes saved.</p></div><div className="modal-actions"><button className="button" onClick={()=>setDeleting(null)}>Cancel</button><button className="button legal-confirm-delete" onClick={removeDeed}><Trash2 size={15}/>Delete deed</button></div></Modal>}
  {viewRemarkDeed&&(()=>{const deed=viewRemarkDeed.deed,rawIds=getDeedCategoryIds(deed);return <Modal title={`Remarks Details · ${deedNames[deed.type]}`} onClose={()=>setViewRemarkDeed(null)}><div className="modal-body legal-category-popup"><div className="legal-popup-meta"><span className="legal-type-badge">{deedNames[deed.type]}</span><span className="legal-popup-deed-no">{deed.deedNumber}</span><span className="legal-popup-date">{date(deed.deedDate)}</span></div><div style={{marginBottom:'14px'}}><span className="field-label" style={{fontSize:'11px',fontWeight:700,color:'#475569',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Change Categories ({rawIds.length} Selected):</span><div className="legal-categories-wrap" style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>{rawIds.map((id:string)=>{const cat=remarkCategories.find(c=>c.id===id||c.name===id),name=cat?.name||id;return <span key={id} className="legal-category-badge" style={{background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe',padding:'4px 10px',borderRadius:'16px',fontSize:'11.5px',fontWeight:600}}>✓ {name}</span>;})}</div></div><div className="legal-single-remark-view"><span className="field-label" style={{fontSize:'11.5px',fontWeight:700,color:'#002060',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Deed Notes / Remarks:</span><div style={{background:'#f8fafc',border:'1px solid #cbd5e1',borderRadius:'8px',padding:'14px 16px',fontSize:'13px',lineHeight:'1.6',color:'#0f172a',minHeight:'80px'}} dangerouslySetInnerHTML={{ __html: deed.remarks || 'No remarks notes for this deed yet.' }} /></div></div><div className="modal-actions"><button className="button primary" onClick={()=>setViewRemarkDeed(null)}>Close</button></div></Modal>;})()}</>;
}

function ShareholderCountContent({rows}:{rows:any[]}){const owners=rows.filter(r=>Number(r.sharePercentage)>0),total=owners.reduce((sum,r)=>sum+Number(r.sharePercentage||0),0),name=(r:any,i:number)=>[r.firstName,r.middleName,r.lastName].filter(Boolean).join(' ')||r.name||`Shareholder ${i+1}`;return <div className="modal-body shareholder-count-modal"><div className="shareholder-count-top"><div><small>SHAREHOLDER COUNT</small><strong>{owners.length}</strong><span>Dihitung dari Percentage share &gt; 0</span></div><div><small>TOTAL OWNERSHIP</small><strong className={total>100.01?'text-red':'text-brand'}>{total.toFixed(2)}%</strong><span>{total>100.01?'Exceeds maximum limit of 100%':'Maximum 100% (not required to be 100%)'}</span></div></div>{owners.length?<div className="shareholder-count-list">{owners.map((r,i)=><div key={r.id||i}><span><b>{String(i+1).padStart(2,'0')}</b>{name(r,i)}</span><strong>{Number(r.sharePercentage).toFixed(2)}%</strong></div>)}</div>:<div className="empty-small">No stakeholders with share percentage greater than 0 on this deed.</div>}<p className="legal-ownership-rule">Total share percentage on the deed must not exceed 100%. Stakeholder data does not need to reach 100% (partial ownership portions may be recorded).</p><p className="field-note">Count and percentage follow Stakeholder data on this deed. Change share percentage via the Stakeholders button on the deed row.</p></div>;}
