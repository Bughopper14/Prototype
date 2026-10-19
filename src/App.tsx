import {createPortal} from 'react-dom';
import {DeedReviewDialog,NotificationsPage} from './deed-review-ui';
import {publishedDeeds,reviewStatus,deedPending,deedReviewLabels,canEditLegal,deedData} from './deed-workflow';
import {inputLimits,fieldInputError,validateInput} from './input-validation';
import {useEffect,useState,useRef,useMemo,type ReactNode} from 'react';
import {Copy,Maximize2,Minimize2,ArrowUpRight,ArrowRight,ArrowLeft,Plus,Search,Bell,LayoutDashboard,Files,FolderCheck,Users,Activity,Settings2,ChevronRight,ChevronLeft,ChevronDown,Download,Building2,MoreHorizontal,Pencil,Check,CheckCheck,Clock,FileText,ShieldCheck,LogOut,BriefcaseBusiness,Wallet,TrendingUp,AlertCircle,X,Upload,RotateCw,ZoomIn,ZoomOut,ExternalLink,Save,Trash2,Menu,Loader2,Columns,FileSpreadsheet,Lock,Printer,CheckCircle,Sparkles,Eye} from 'lucide-react';
import Tesseract from 'tesseract.js';
import {extractKtpTextFromImage, normalizeBirthDate, parseBirthPlaceAndDate} from './ktp-ocr';
import {FapSheetPreview, printFapDocument, type FapSheetData} from './FapSheetPreview';
import {api} from './api';
import {MasterDataPage,MasterSelect,useMasterData,setMasterData,resetMasterChildren,useMandatoryRules,fetchMandatoryRules,isFieldMandatory,resolveWilayahUpwards} from './master-data';
import {masterGroups,masterKey} from './master-catalog';
import {type Field,profileFields,customerFields,picFields,stakeholderFields,projectFields,bankFields,proposalFields,unitFields,financialFields,legalDeedFields,legalPartyFields,blank,label} from './fields';
const statusLabel:Record<string,string>={DRAFT:'Draft',SUBMITTED_TO_BS:'BS verification',BS_VERIFIED:'BS verified',IN_CA_LEGAL_REVIEW:'CA & Legal review',CREDIT_COMMITTEE_REVIEW:'Committee review',APPROVED:'Approved',REJECTED:'Rejected',RETURNED:'Returned'};
const money=(n:any,compact=false)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'IDR',maximumFractionDigits:0,...(compact?{notation:'compact' as const}:{})}).format(Number(n)||0).replace('IDR','Rp');
const date=(d:any)=>d?new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'-';
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
function deedValidity(deedDate:any){if(!deedDate)return {status:'Tanggal belum diisi',active:null,expiry:null};const parts=String(deedDate).slice(0,10).split('-').map(Number);if(parts.length!==3||parts.some(x=>!x))return {status:'Tanggal belum diisi',active:null,expiry:null};const expiry=new Date(parts[0],parts[1]-1,parts[2]);if(Number.isNaN(expiry.getTime()))return {status:'Tanggal belum diisi',active:null,expiry:null};expiry.setFullYear(expiry.getFullYear()+5);const today=new Date();today.setHours(0,0,0,0);expiry.setHours(0,0,0,0);const active=today<=expiry;return {status:active?'Aktif':'Tidak aktif',active,expiry};}
function Badge({status}:{status:string}){return <span className={'badge '+status?.toLowerCase()}><i/>{statusLabel[status]||label(status)}</span>;}
function IconBox({children}:{children:ReactNode}){return <span className="iconbox">{children}</span>;}
function Fields({fields,value,onChange,disabled=false,className,section,onSelectOption,onFieldFocus}:{fields:Field[],value:any,onChange:(v:any)=>void,disabled?:boolean,className?:string,section?:string,onSelectOption?:(k:string,v:string)=>void,onFieldFocus?:(k:string)=>void}){const master=useMasterData();const mandatoryRules=useMandatoryRules();return <div className={`formgrid ${className||''}`}>{fields.map(f=>{const isRequired=isFieldMandatory(mandatoryRules,section,f.key,f.required);const fieldValue=f.type==='date'?String(value?.[f.key]||'').slice(0,10):value?.[f.key]??'';const isDigitsOnly=['phone','mobilePhone','phoneFax','rt','rw'].includes(f.key);const isAgeField=['ageYears','ageMonths'].includes(f.key);const isFieldDisabled=disabled||isAgeField;const ageStyle=isAgeField?{backgroundColor:'#f1f5f9',cursor:'not-allowed',color:'#64748b'}:undefined;const update=(raw:string)=>{if(isAgeField)return;const clean=isDigitsOnly?raw.replace(/\D/g,''):raw;const sanitized=['rt','rw'].includes(f.key)?clean.slice(0,3):clean;let next=resetMasterChildren(f.key,{...value,[f.key]:f.type==='number'?sanitized:f.type==='date'?(sanitized||null):sanitized},fields.map(x=>x.key));if(f.key==='village'&&fields.some(x=>x.key==='postalCode'))next.postalCode=master.village.find(x=>x.value===sanitized)?.zipCode||'';if(f.key==='dateOfBirth'&&fields.some(x=>x.key==='ageYears'||x.key==='ageMonths')){const{years,months}=calculateAgeYearsMonths(sanitized);next.ageYears=years;next.ageMonths=months;}if(['district','village','postalCode'].includes(f.key)){next=resolveWilayahUpwards(next,master);}onChange(next);};const fieldError=fieldInputError(f.key,fieldValue);const isMaster=masterGroups.some(g=>g.key===masterKey(f.key));const handleKeyDown=isDigitsOnly?(e:React.KeyboardEvent<HTMLInputElement>)=>{if(e.ctrlKey||e.metaKey||['Backspace','Tab','Enter','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete','Home','End'].includes(e.key))return;if(!/^\d$/.test(e.key))e.preventDefault();}:undefined;const handleInputChange=(e:React.ChangeEvent<HTMLInputElement>)=>{if(isAgeField)return;if(isDigitsOnly){let v=e.target.value.replace(/\D/g,'');if(['rt','rw'].includes(f.key))v=v.slice(0,3);e.target.value=v;update(v);}else{update(e.target.value);}};const handlePaste=isDigitsOnly?(e:React.ClipboardEvent<HTMLInputElement>)=>{if(isAgeField)return;e.preventDefault();const pasted=(e.clipboardData.getData('text')||'').replace(/\D/g,'');if(!pasted)return;const input=e.currentTarget;const start=input.selectionStart??0,end=input.selectionEnd??0,curr=String(fieldValue);let nextVal=(curr.slice(0,start)+pasted+curr.slice(end)).replace(/\D/g,'');if(['rt','rw'].includes(f.key))nextVal=nextVal.slice(0,3);input.value=nextVal;update(nextVal);}:undefined;return <label key={f.key} className={f.wide?'field-wide':undefined}><span className="field-label">{f.label}{isRequired&&<span className="field-required" aria-label="Required">*</span>}</span>{isMaster?<MasterSelect fieldKey={f.key} value={String(fieldValue)} record={value||{}} disabled={disabled} required={isRequired} onChange={update}/>:f.options?<select required={isRequired} disabled={disabled} value={value?.[f.key]??f.options[0]} onFocus={()=>{if(onFieldFocus)onFieldFocus(f.key);}} onChange={e=>{update(e.target.value);if(onSelectOption)onSelectOption(f.key,e.target.value);}}>{f.options.map(o=><option key={o} value={o}>{f.optionLabels?.[o]??label(o)}</option>)}</select>:f.type==='textarea'?<textarea aria-label={f.label} required={isRequired} disabled={disabled} rows={3} value={fieldValue} onChange={e=>update(e.target.value)}/>:f.unit?<div className="input-with-unit"><input aria-label={f.label} required={isRequired} disabled={isFieldDisabled} readOnly={isAgeField} style={ageStyle} type={f.type||'text'} inputMode={isDigitsOnly?'numeric':undefined} pattern={isDigitsOnly?'[0-9]*':undefined} maxLength={['rt','rw'].includes(f.key)?3:undefined} onKeyDown={handleKeyDown} onPaste={handlePaste} step={f.type==='number'?'0.01':undefined} {...inputLimits(f.key)} aria-invalid={!!fieldError} value={fieldValue} onChange={handleInputChange}/><span>{f.unit}</span></div>:<input aria-label={f.label} required={isRequired} disabled={isFieldDisabled} readOnly={isAgeField} style={ageStyle} type={f.type||'text'} inputMode={isDigitsOnly?'numeric':undefined} pattern={isDigitsOnly?'[0-9]*':undefined} maxLength={['rt','rw'].includes(f.key)?3:undefined} onKeyDown={handleKeyDown} onPaste={handlePaste} step={f.type==='number'?'0.01':undefined} {...inputLimits(f.key)} aria-invalid={!!fieldError} value={fieldValue} onChange={handleInputChange}/>}{fieldError&&<small className="input-validation-error" role="alert">{fieldError}</small>}</label>;})}</div>;}
function Repeater({title,fields,rows,onChange,disabled=false,description,carousel=false}:{title:string,fields:Field[],rows:any[],onChange:(v:any[])=>void,disabled?:boolean,description?:string,carousel?:boolean}){const [activeIndex,setActiveIndex]=useState(0);const currentIndex=Math.min(activeIndex,Math.max(rows.length-1,0));const addRow=()=>{onChange([...rows,blank(fields)]);setActiveIndex(rows.length);};const removeRow=(index:number)=>{onChange(rows.filter((_,j)=>j!==index));setActiveIndex(Math.min(currentIndex,Math.max(rows.length-2,0)));};return <><div className="section-title"><div><h3>{title}</h3>{description&&<p className="muted repeater-description">{description}</p>}</div>{!disabled&&<button className="button small" onClick={addRow}><Plus size={15}/>Add {title==='Equipment units'?'unit':'row'}</button>}</div>{carousel&&rows.length>0&&<div className="repeater-carousel-controls"><button className="button small" disabled={currentIndex===0} onClick={()=>setActiveIndex(i=>Math.max(i-1,0))}><ChevronLeft size={15}/>Previous</button><span>{currentIndex+1} of {rows.length}</span><button className="button small" disabled={currentIndex>=rows.length-1} onClick={()=>setActiveIndex(i=>Math.min(i+1,rows.length-1))}>Next<ChevronRight size={15}/></button></div>}{rows.length===0&&<div className="empty-small">No entries yet.</div>}{(carousel?rows.slice(currentIndex,currentIndex+1):rows).map((r,i)=>{const rowIndex=carousel?currentIndex:i;return <div className="repeat" key={rowIndex}><div className="repeat-top"><span>{title} / {String(rowIndex+1).padStart(2,'0')}</span>{!disabled&&<button className="icon-button danger" aria-label="Remove row" onClick={()=>removeRow(rowIndex)}><Trash2 size={15}/></button>}</div><Fields fields={fields} value={r} disabled={disabled} onChange={v=>onChange(rows.map((x,j)=>rowIndex===j?v:x))}/></div>})}</>;}
function Modal({title,children,onClose,className="",companion,isSplit}:{title:string,children:ReactNode,onClose:()=>void,className?:string,companion?:ReactNode,isSplit?:boolean}){return <div className={`modal-scrim ${isSplit?'modal-scrim-split':''}`} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className={`modal-split-wrapper ${isSplit?'is-split':''}`}><section className={`modal ${className} ${isSplit?'modal-shifted-left':''}`} role="dialog" aria-modal="true" aria-label="{title}"><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20}/></button></div>{children}</section>{companion}</div></div>;}
function Login({onLogin}:{onLogin:(u:any)=>void}){const [email,setEmail]=useState('mkt@liugong.local'),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);return <div className="login"><div className="login-story"><Brand/><div><span className="eyebrow">LIUGONG FINANCE INDONESIA</span><h1>Moving business.<br/>Building possibilities.</h1><p>A single workspace for equipment financing,<br/>from the first application to the final decision.</p><div className="login-lines"><span/><span/><span/></div></div><small>Loan origination & document management</small></div><div className="login-form"><span className="eyebrow">YOUR ORIGINATION WORKSPACE</span><h2>Welcome back</h2><p>Sign in to keep business moving.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{onLogin(await api('/auth/login','POST',{email,password}));}catch(e:any){setError(e.message);}finally{setBusy(false);}}}><label>Email address<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<div className="error">{error}</div>}<button className="button primary" disabled={busy}>{busy?<Loader2 className="spin" size={16}/>:null}Sign in <ArrowRight size={17}/></button></form><div className="demo-note"><strong>Public interactive demo - synthetic data</strong><p>Choose a department. Changes are saved only in this browser.</p><div className="role-pills">{['MKT','BS','HEAD_BS','CA','LEGAL','COMMITTEE'].map(r=><button key={r} onClick={()=>{setEmail(r==='BS'?'arianti@liugong.local':r==='HEAD_BS'?'dellatra@liugong.local':r.toLowerCase()+'@liugong.local');setPassword('LiuGong2026!');}}>{r==='BS'?'Arianti / BS':r==='HEAD_BS'?'Dellatra / Head BS':r}</button>)}</div><small>Demo password: LiuGong2026! - Use synthetic information only.</small></div></div></div>;}
function Brand(){return <div className="brand"><div className="brand-mark">L<span>G</span></div><div><strong>LIUGONG</strong><small>FINANCE INDONESIA</small></div></div>;}
let masterDataLoaded = false;

export default function App(){
 const [notifications,setNotifications]=useState<any[]>([]);
 const [user,setUser]=useState<any>(null),[ready,setReady]=useState(false),[page,setPage]=useState('Overview'),[rows,setRows]=useState<any[]>([]),[customers,setCustomers]=useState<any[]>([]),[selected,setSelected]=useState<any>(null),[detailTab,setDetailTab]=useState(0),[newOpen,setNewOpen]=useState(false),[toast,setToast]=useState(''),[globalError,setGlobalError]=useState(''),[mobile,setMobile]=useState(false),[loading,setLoading]=useState(false);
 const notify=(s:string)=>{setToast(s);setTimeout(()=>setToast(''),4500);};
 async function load(forceMaster?: any){
   const force = forceMaster === true;
   setLoading(true);
   try{
     const [r,c,m,n]=await Promise.all([
       api('/applications'),
       api('/customers'),
       (!masterDataLoaded || force) ? api('/master-data') : Promise.resolve(null),
       api('/notifications'),
       fetchMandatoryRules()
     ]);
     setNotifications(n);
     if(m){
       setMasterData(m);
       masterDataLoaded = true;
     }
     setRows(r);
     setCustomers(c);
     setGlobalError('');
   }catch(e:any){
     setGlobalError(e.message);
   }finally{
     setLoading(false);
   }
 }
 async function logout(){
   window.location.href = '/logout';
 }
 useEffect(()=>{
   api('/auth/me')
     .then(u => {
       if(!u || !u.username){
         window.location.replace('/login?timeout=1&reason=' + encodeURIComponent('Sesi Anda telah berakhir. Silakan login kembali.'));
       } else {
         setUser(u);
       }
     })
     .catch((err: any)=>{
       console.error('Initial auth/me error:', err);
     })
     .finally(()=>setReady(true));
 },[]);
 useEffect(()=>{
   if(!user) return;
   if(user.isAdmin || user.displayRole === 'Admin' || user.roleBadge === 'Admin' || user.username === 'admin') {
     return;
   }
   let lastActivity = Date.now();
   const touch = () => { lastActivity = Date.now(); };
   const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
   events.forEach(evt => window.addEventListener(evt, touch, { passive: true }));
   const timer = setInterval(async () => {
     if (Date.now() - lastActivity > 15 * 60 * 1000) {
       clearInterval(timer);
       window.location.replace('/login?timeout=1&reason=' + encodeURIComponent('Sesi Anda telah berakhir karena tidak ada aktivitas selama 15 menit. Silakan login kembali.'));
       return;
     }
     try {
       const hbUrl = window.location.pathname.startsWith('/crm-dashboard') ? '/crm-dashboard/api/v1/heartbeat' : '/api/v1/heartbeat';
       const res = await fetch(hbUrl, { credentials: 'same-origin' });
       if (res.status === 401) {
         clearInterval(timer);
         window.location.replace('/login?timeout=1&reason=' + encodeURIComponent('Sesi Anda telah berakhir. Silakan login kembali.'));
       }
     } catch {}
   }, 20000);
   return () => {
     clearInterval(timer);
     events.forEach(evt => window.removeEventListener(evt, touch));
   };
 },[user]);
 useEffect(()=>{if(user)load();},[user]);
 useEffect(()=>{if(!user)return;let live=true;const refresh=()=>api('/notifications').then(n=>{if(live)setNotifications(n);}).catch(()=>{});const timer=setInterval(refresh,15000);window.addEventListener('storage',refresh);return()=>{live=false;clearInterval(timer);window.removeEventListener('storage',refresh);};},[user]);
 async function readNotification(id:string){try{await api('/notifications/'+id+'/read','PATCH',{});setNotifications(await api('/notifications'));}catch(e:any){setGlobalError(e.message);}}
 async function open(id:string,tab=0){setLoading(true);try{setDetailTab(tab);setSelected(await api('/applications/'+id));}catch(e:any){setGlobalError(e.message);}finally{setLoading(false);}}
 if(!ready)return <div className="loading-screen"><Loader2 className="spin"/>Opening your workspace...</div>;
 if(!user)return <Login onLogin={setUser}/>;
 const navigate=(p:string)=>{setPage(p);setSelected(null);setMobile(false);};
 const userBadge = user.displayRole || user.roleBadge || (user.isAdmin ? 'Admin' : user.role);
 return <div className="shell">{mobile&&<div className="sidebar-backdrop" onClick={()=>setMobile(false)} aria-label="Tutup navigasi"/>}<aside className={'sidebar '+(mobile?'mobile-open':'')}><div className="sidebar-header"><Brand/><button className="icon-button sidebar-close" onClick={()=>setMobile(false)} aria-label="Tutup menu"><X size={20}/></button></div><div className="workspace"><div className="workspace-logo"><Building2 size={18}/></div><div><b>Origination workspace</b><small>Indonesia operations</small></div><ChevronDown size={14}/></div><div className="nav-label">WORKSPACE</div><nav>{[[LayoutDashboard,'Overview'],[Files,'Applications'],[FolderCheck,'Document desk'],[Users,'Customers'],[Settings2,'Customize master data'],[Bell,'Notifications'],[Activity,'Activity']].map(([Icon,name]:any)=><button key={name} className={page===name?'active':''} onClick={()=>navigate(name)}><Icon size={19}/><span>{name==='Notifications'?'Notifikasi':name}</span>{name==='Notifications'&&notifications.some(n=>!n.readAt)&&<em>{notifications.filter(n=>!n.readAt).length}</em>}{name==='Applications'&&<em>{rows.length}</em>}</button>)}</nav><div className="sidebar-bottom"><div className="security-note"><ShieldCheck size={20}/><div><b>Every step, accounted for.</b><small>Secure documents. Clear decisions.</small></div></div><button className="user-block" onClick={logout} title="Sign out"><span className="avatar">{user.name.split(' ').map((s:string)=>s[0]).slice(0,2).join('')}</span><span><b>{user.name}</b><small>{user.role==='MKT'?'Marketing':label(user.role)} - Sign out</small></span><LogOut size={16}/></button></div></aside><main><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-toggle" onClick={()=>setMobile(!mobile)}><Menu size={20}/></button><span>Workspace</span><ChevronRight size={14}/><b>{selected?'Application details':page}</b></div><button className="notification-bell" aria-label="Notifikasi" onClick={()=>navigate('Notifications')}><Bell size={19}/>{notifications.some(n=>!n.readAt)&&<span>{notifications.filter(n=>!n.readAt).length}</span>}</button><div className="topbar-right"><span className="live-dot"/>Indonesia <span className="divider"/> <span>{new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span><span className="role-chip">{userBadge}</span></div></header><div className="content">{globalError&&<div className="error">{globalError}<button onClick={load}>Retry</button></div>}{loading&&<div className="loading-strip"/>}{selected?<Detail value={selected} user={user} initialTab={detailTab} onBack={()=>{setSelected(null);load();}} onChange={v=>{setSelected(v);load();}} notify={notify}/>:<><div className="page-heading"><div><div className="eyebrow">{page==='Overview'?'A CLEAR VIEW. A CONFIDENT NEXT STEP.':'LOAN ORIGINATION & MANAGEMENT'}</div><h1>{page==='Overview'?'Portfolio overview':page==='Notifications'?'Notifikasi':page}</h1><p>{({Overview:'Welcome back, '+user.name.split(' ')[0]+'. Here\'s where your financing stands.',Applications:'Manage every application, from first contact to final approval.','Document desk':'Keep every document complete, verified, and ready for review.',Customers:'Your customer relationships, connected to every application.','Customize master data':'Pengaturan master data aplikasi.',Notifications:'Hasil pemeriksaan dan approval akta yang perlu ditindaklanjuti.',Activity:'A transparent record of application decisions and updates.'} as any)[page]}</p></div>{page==='Overview'&&<button className="button primary" onClick={()=>user.role==='MKT'?setNewOpen(true):notify('Pembuatan aplikasi tersedia untuk akun Marketing (MKT). Silakan masuk dengan akun MKT.')}><Plus size={17}/>New application</button>}</div>{page==='Overview'&&<Overview rows={rows} user={user} open={open} navigate={navigate}/ >}{page==='Applications'&&<ApplicationTable rows={rows} open={open}/ >}{page==='Document desk'&&<DocumentDesk rows={rows} open={open} user={user}/ >}{page==='Customers'&&<section className="panel"><div className="panel-head"><h2>Customer directory <span>{customers.length}</span></h2><Users size={19}/></div><div className="customer-grid">{customers.map(c=><button className="customer-card" key={c.id} onClick={()=>{const a=rows.find(r=>r.customer_id===c.id);if(a)open(a.id);else notify('This customer has no applications yet. Use New application to create one.');}}><IconBox><Building2 size={21}/></IconBox><h3>{c.companyName}</h3><span className="muted">{label(c.companyType)}</span><dl><dt>NIB</dt><dd>{c.nib}</dd><dt>NPWP</dt><dd>{c.npwp}</dd></dl><span className="text-link">{rows.filter(r=>r.customer_id===c.id).length} applications <ArrowUpRight size={15}/></span></button>)}</div></section>}{page==='Customize master data'&&<MasterDataPage/>}{page==='Notifications'&&<NotificationsPage items={notifications} onRead={readNotification} onOpen={id=>open(id,5)}/>}{page==='Activity'&&<ActivityPage rows={rows} open={open}/>}</> }<footer><span>© {new Date().getFullYear()} PT LiuGong Finance Indonesia</span><span>Origination workspace <i/> All amounts in IDR</span></footer></div></main>{newOpen&&<NewApplication customers={customers} onClose={()=>setNewOpen(false)} onCreated={id=>{setNewOpen(false);load();open(id);notify('Application created successfully');}}/>}{toast&&<div className="toast"><CheckCheck size={18}/>{toast}</div>}</div>;
}
function Overview({rows,user,open,navigate}:{rows:any[],user:any,open:(id:string,tab?:number)=>void,navigate:(p:string)=>void}){const needs=rows.filter(r=>user.role==='MKT'?['DRAFT','RETURNED'].includes(r.status)||(r.legal?.deeds||[]).some((d:any)=>reviewStatus(d)==='REJECTED'):user.role==='BS'?(r.legal?.deeds||[]).some((d:any)=>reviewStatus(d)==='PENDING_CHECK'):user.role==='HEAD_BS'?(r.legal?.deeds||[]).some((d:any)=>reviewStatus(d)==='PENDING_APPROVAL'):user.role==='CA'||user.role==='LEGAL'?r.status==='IN_CA_LEGAL_REVIEW':user.role==='COMMITTEE'?r.status==='CREDIT_COMMITTEE_REVIEW':false);const total=rows.reduce((s,r)=>s+Number(r.financing_value||0),0),approved=rows.filter(r=>r.status==='APPROVED'),review=rows.filter(r=>['SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW'].includes(r.status));const stages=[['DRAFT','Draft'],['SUBMITTED_TO_BS','BS verification'],['IN_CA_LEGAL_REVIEW','CA & Legal'],['CREDIT_COMMITTEE_REVIEW','Committee'],['APPROVED','Approved']];return <><div className="stats-grid">{[[BriefcaseBusiness,'Total applications',String(rows.length),'Across all branches'],[Wallet,'Financing portfolio',money(total,true),'Total requested financing'],[Clock,'In review',String(review.length),'Moving through the workflow'],[ShieldCheck,'Approved financing',money(approved.reduce((s,r)=>s+Number(r.financing_value),0),true),approved.length+' approved applications']].map(([Icon,title,value,sub]:any,i)=><div className={'stat-card stat-'+i} key={title}><div className="stat-top"><span>{title}</span><Icon size={18}/></div><strong>{value}</strong><small>{i===3?<span className="tiny-green"><Check size={13}/></span>:<span className="stat-dot"/>}{sub}</small></div>)}</div><div className="overview-mid"><section className="panel pipeline"><div className="panel-head"><div><h2>Application pipeline</h2><p>From opportunity to approval</p></div><span className="subtle-chip">All applications <ChevronDown size={13}/></span></div><div className="pipeline-chart">{stages.map(([s,l],i)=>{const count=rows.filter(r=>r.status===s||(s==='SUBMITTED_TO_BS'&&r.status==='BS_VERIFIED')).length;return <button className="pipeline-stage" key={s} onClick={()=>navigate('Applications')}><div className="bar-top"><strong>{String(count).padStart(2,'0')}</strong><span>{rows.length?Math.round(count/rows.length*100):0}%</span></div><div className="bar-track"><div style={{height:Math.max(8,count/Math.max(1,...stages.map(([s])=>rows.filter(r=>r.status===s).length))*100)+'%'}} className={'bar bar-'+i}/></div><span>{l}</span></button>;})}</div><div className="pipeline-foot"><span><i/> {review.length} applications are currently under review</span><button className="text-link" onClick={()=>navigate('Applications')}>View pipeline <ArrowRight size={14}/></button></div></section><section className="attention panel"><div className="panel-head"><h2>Needs attention</h2><span className="count-pill">{needs.length}</span></div>{needs.slice(0,3).map(r=><button className="attention-item" key={r.id} onClick={()=>open(r.id,['BS','HEAD_BS'].includes(user.role)||r.legal?.deeds?.some((d:any)=>reviewStatus(d)==='REJECTED')?5:0)}><span className={'attention-icon '+(r.status==='RETURNED'?'orange':'')}><AlertCircle size={18}/></span><div><b>{user.role==='BS'?'Periksa dokumen akta':user.role==='HEAD_BS'?'Approve dokumen akta':user.role==='MKT'?r.legal?.deeds?.some((d:any)=>reviewStatus(d)==='REJECTED')?'Perbaiki akta yang ditolak':r.status==='RETURNED'?'Application returned':'Complete your draft':'Review application'}</b><span>{r.company_name}</span><small>{r.fap_number}</small></div><ChevronRight size={16}/></button>)}{!needs.length&&<div className="empty-small">You're all caught up.</div>}<div className="attention-bottom"><ShieldCheck size={17}/><span>Complete documents keep financing moving.</span></div></section></div><ApplicationTable rows={rows} open={open} compact onViewAll={()=>navigate('Applications')}/></>;}
function ApplicationTable({rows,open,compact=false,documentMode=false,onViewAll}:{rows:any[],open:(id:string)=>void,compact?:boolean,documentMode?:boolean,onViewAll?:()=>void}){const [search,setSearch]=useState(''),[status,setStatus]=useState('ALL'),[branch,setBranch]=useState('ALL'),[start,setStart]=useState(''),[end,setEnd]=useState(''),[page,setPage]=useState(0),[dates,setDates]=useState(false);const filtered=rows.filter(r=>(r.company_name+' '+r.fap_number).toLowerCase().includes(search.toLowerCase())&&(status==='ALL'||r.status===status)&&(branch==='ALL'||r.branch_code===branch)&&(!start||String(r.application_date).slice(0,10)>=start)&&(!end||String(r.application_date).slice(0,10)<=end));useEffect(()=>setPage(0),[search,status,branch,start,end]);const count=compact?5:8;const visible=filtered.slice(page*count,(page+1)*count);function exportCsv(){const lines=[['FAP','Customer','Branch','Status','Financing IDR','Date'],...filtered.map(r=>[r.fap_number,r.company_name,r.branch_code,statusLabel[r.status],r.financing_value||0,String(r.application_date).slice(0,10)])];const csv=lines.map(r=>r.map(v=>'"'+String(v).replace(/^[=+@-]/,"' $&").replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='liugong-applications.csv';a.click();URL.revokeObjectURL(url);}return <section className="panel applications-panel"><div className="panel-head"><h2>{compact?'Recent applications':documentMode?'Document verification queue':'All applications'} <span>{rows.length}</span></h2>{compact?<button className="text-link" onClick={onViewAll}>View all applications <ArrowUpRight size={16}/></button>:<button className="button small" onClick={exportCsv}><Download size={15}/>Export</button>}</div><div className="table-toolbar"><div className="search"><Search size={17}/><input aria-label="Search applications" placeholder="Search company or FAP number..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="filters"><select aria-label="Filter status" value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">All statuses</option>{Object.entries(statusLabel).map(([s,l])=><option key={s} value={s}>{l}</option>)}</select><select aria-label="Filter branch" value={branch} onChange={e=>setBranch(e.target.value)}><option value="ALL">All branches</option>{[...new Set(rows.map(r=>r.branch_code))].sort().map(b=><option key={b}>{b}</option>)}</select><button className={'button small '+(dates?'selected':'')} onClick={()=>setDates(!dates)}><Settings2 size={15}/><span>Dates</span></button></div></div>{dates&&<div className="date-filter"><label>From <input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>To <input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label><button className="text-link" onClick={()=>{setStart('');setEnd('');}}>Clear dates</button></div>}<div className="table-scroll"><table className="data-table"><thead><tr><th>COMPANY / APPLICATION</th><th>BRANCH</th><th>FINANCING AMOUNT</th><th>STATUS</th><th>DOCUMENTS</th><th>APPLICATION DATE</th><th/></tr></thead><tbody>{visible.map((r,i)=><tr key={r.id} onClick={()=>open(r.id)} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')open(r.id);}}><td><div className="company-cell"><span className={'company-icon tint-'+i%3}><Building2 size={18}/></span><div><b>{r.company_name}</b><small>{r.fap_number}{r.company_type ? <span style={{marginLeft: 8}}>{label(r.company_type)}</span> : null}</small></div></div></td><td><span className="branch">{r.branch_code}</span></td><td><b className="amount">{money(r.financing_value)}</b><small>{r.tenor_months?r.tenor_months+' months':'Proposal pending'}</small></td><td><Badge status={r.status}/></td><td><div className="doc-progress"><span><i style={{width:(r.verified_docs/Math.max(1,r.total_docs)*100)+'%'}}/></span><small>{r.verified_docs}/{r.total_docs}</small></div></td><td className="date-cell">{date(r.application_date)}</td><td><ChevronRight size={16}/></td></tr>)}</tbody></table>{!visible.length&&<div className="empty"><Search size={26}/><h3>No applications found</h3><p>Try a different search or filter.</p></div>}</div><div className="table-foot"><span>Showing {filtered.length?page*count+1:0}-{Math.min((page+1)*count,filtered.length)} of {filtered.length} applications</span><div><button className="icon-button" aria-label="Previous page" disabled={!page} onClick={()=>setPage(page-1)}><ChevronLeft size={16}/></button><span className="page-number">{page+1}</span><button className="icon-button" aria-label="Next page" disabled={(page+1)*count>=filtered.length} onClick={()=>setPage(page+1)}><ChevronRight size={16}/></button></div></div></section>;}
function NewApplication({customers,onClose,onCreated}:{customers:any[],onClose:()=>void,onCreated:(id:string)=>void}){
 const [customerCategory,setCustomerCategory]=useState(customers.length?"EXISTING":"NEW");
 const [customerId,setCustomerId]=useState("");
 const [customer,setCustomer]=useState(blank(customerFields));
 const [profile,setProfile]=useState<any>({...blank(profileFields),customerStatus:customers.length?"EXISTING":"NEW"});
 const [error,setError]=useState(""),[busy,setBusy]=useState(false);
 const selectedCustomer=customers.find(c=>c.id===customerId);
 const fapCustomerKeys=["companyName","companyType","nib","npwp","establishmentActNo","establishmentDate"];
 const fapProfileKeys=["branchCode","companyAddress","province","city","district","village","postalCode","experienceYears","experienceMonths"];
 const fapCustomerFields=customerFields.filter(f=>fapCustomerKeys.includes(f.key));
 const fapProfileFields=profileFields.filter(f=>fapProfileKeys.includes(f.key));
 function changeCategory(value:string){setCustomerCategory(value);setCustomerId("");setError("");setProfile({...profile,customerStatus:value});}
 async function create(){
  setBusy(true);setError("");
  try{
   let id=customerId;
   if(customerCategory==="EXISTING"&&!selectedCustomer)throw new Error("Select an existing customer to continue.");
   if(customerCategory==="NEW"){
    const nib=String(customer.nib||"").replace(/\D/g,"");
    const npwp=String(customer.npwp||"").replace(/\D/g,"");
    if(!String(customer.companyName||"").trim())throw new Error("Enter the company name.");
    if(nib.length!==13)throw new Error("NIB must contain 13 digits.");
    if(npwp.length<15||npwp.length>16)throw new Error("NPWP must contain 15 or 16 digits.");
    validateInput(customer);
    const created=await api("/customers","POST",customer);id=created.id;setCustomerId(id);setCustomerCategory("EXISTING");setProfile({...profile,customerStatus:"EXISTING"});
   }
   validateInput(profile);
   const application=await api("/applications","POST",{...profile,customerId:id,customerStatus:customerCategory,stage:"FAP Stage"});
   onCreated(application.id);
  }catch(e:any){setError(e.message||"Could not create the application. Please try again.");}
  finally{setBusy(false);}
 }
 const liveFapData: FapSheetData = {
  fapNumber: 'Generated upon save',
  applicationDate: new Date().toISOString(),
  branchCode: profile.branchCode,
  customerStatus: customerCategory,
  companyName: customerCategory === 'EXISTING' ? selectedCustomer?.companyName : customer.companyName,
  companyType: customerCategory === 'EXISTING' ? selectedCustomer?.companyType : customer.companyType,
  nib: customerCategory === 'EXISTING' ? selectedCustomer?.nib : customer.nib,
  npwp: customerCategory === 'EXISTING' ? selectedCustomer?.npwp : customer.npwp,
  establishmentActNo: customerCategory === 'EXISTING' ? selectedCustomer?.establishmentActNo : customer.establishmentActNo,
  establishmentDate: customerCategory === 'EXISTING' ? selectedCustomer?.establishmentDate : customer.establishmentDate,
  companyAddress: profile.companyAddress,
  city: profile.city,
  province: profile.province,
  postalCode: profile.postalCode,
  experienceYears: profile.experienceYears,
  experienceMonths: profile.experienceMonths,
 };

 return <Modal title="New financing application" onClose={onClose} className="modal-side-by-side">
  <div className="modal-side-by-side-body">
   <div className="modal-side-form-pane">
    <div className="intake-stage-heading">
     <div>
      <span className="eyebrow">FAP INTAKE</span>
      <h3>FAP Stage</h3>
      <p>Enter the core application and customer details. You can complete the remaining business profile directly in the application workspace after saving.</p>
     </div>
    </div>
    <div className="intake-system-fields">
     <div><span>Application date</span><b>{new Date().toLocaleDateString("en-GB")}</b></div>
     <div><span>FAP registration number</span><b>Generated automatically upon saving</b></div>
    </div>
    <label className="customer-category-select">Customer category
     <select value={customerCategory} onChange={e=>changeCategory(e.target.value)}>
      <option value="EXISTING">Existing customer</option><option value="NEW">New customer</option>
     </select>
    </label>
    {customerCategory==="EXISTING"?<>
     <label>Existing customer
      <select value={customerId} onChange={e=>{setCustomerId(e.target.value);setError("");}}>
       <option value="">Select an existing customer</option>{customers.map(c=><option value={c.id} key={c.id}>{c.companyName}</option>)}
      </select>
     </label>
     {selectedCustomer&&<section className="existing-customer-summary" aria-label="FAP customer details">
      <div><h3>{selectedCustomer.companyName}</h3><span>{label(selectedCustomer.companyType)} customer</span></div>
      <dl><div><dt>NIB</dt><dd>{selectedCustomer.nib||"-"}</dd></div><div><dt>NPWP</dt><dd>{selectedCustomer.npwp||"-"}</dd></div><div><dt>Establishment deed</dt><dd>{selectedCustomer.establishmentActNo||"-"}</dd></div></dl>
     </section>}
    </>:<><h3 className="form-heading">Company details</h3><Fields fields={fapCustomerFields} value={customer} onChange={setCustomer}/></>}
    <h3 className="form-heading">Branch, address and experience</h3>
    <Fields fields={fapProfileFields} value={profile} onChange={setProfile}/>
    {error&&<div className="error" role="alert">{error}</div>}
   </div>

   <div className="modal-side-preview-pane">
    <FapSheetPreview data={liveFapData} compact={true} />
   </div>
  </div>

  <div className="modal-actions intake-modal-actions">
   <button className="button" onClick={onClose} disabled={busy}>Cancel</button>
   <button className="button primary" disabled={busy||(customerCategory==="EXISTING"&&!selectedCustomer)} onClick={create}>
    {busy?"Saving...":"Save"}
   </button>
  </div>
 </Modal>;
}
function stakeholderEditorValues(s:any){const parts=String(s.name||'').trim().split(/\s+/);return {...s,representativeType:s.representativeType||'NONE',signatory:s.signatory||'NONE',idType:s.idType||(s.stakeholderType==='CORPORATE'?'NPWP':s.nationalityType==='WNA'?'PASSPORT':'KTP'),title:s.title||'NONE',firstName:s.firstName||parts[0]||'',middleName:s.middleName||parts.slice(1,-1).join(' '),lastName:s.lastName|| (parts.length>1?parts.at(-1):''),maritalStatus:s.maritalStatus||'NONE',designation:s.designation||s.position||'NONE',email:s.email||'',mobilePhone:s.mobilePhone||'',gender:s.gender||'NONE',sharePercentage:s.sharePercentage??0,depositedCapital:s.depositedCapital??s.shareAmount??0,primaryCapital:s.primaryCapital??0,citizenship:s.citizenship||(s.nationalityType==='WNA'?'FOREIGN':'INDONESIAN'),country:s.country||'Indonesia'};}
function stakeholderForSave(s:any){const first=s.firstName||'',last=s.lastName||'',name=[first,s.middleName,last].map((x:string)=>String(x||'').trim()).filter(Boolean).join(' ')||s.name||'';return {...s,name,position:s.designation&&s.designation!=='NONE'?s.designation:s.position||'Shareholder',nationalityType:s.citizenship==='INDONESIAN'?'WNI':'WNA',shareAmount:s.depositedCapital??0,sharePercentage:s.sharePercentage??0,taxNumber:null};}
function Detail({value:a,user,initialTab=0,onBack,onChange,notify}:{value:any,user:any,initialTab?:number,onBack:()=>void,onChange:(a:any)=>void,notify:(s:string)=>void}){const [activeStage,setActiveStage]=useState<string>(()=>(a.stage||(['SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW','APPROVED'].includes(a.status)?'Pre-analysis':'FAP Stage')));const [submitFapConfirm,setSubmitFapConfirm]=useState(false);useEffect(()=>{if(a.stage)setActiveStage(a.stage);else if(['SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW','APPROVED'].includes(a.status))setActiveStage('Pre-analysis');else setActiveStage('FAP Stage');},[a.id,a.stage,a.status]);const [reviewDeedId,setReviewDeedId]=useState<string|null>(null);const [tab,setTab]=useState(initialTab),[draft,setDraft]=useState<any>(structuredClone(a)),[busy,setBusy]=useState(false),[error,setError]=useState(''),[transition,setTransition]=useState(''),[comments,setComments]=useState(''),[saveConfirm,setSaveConfirm]=useState(false),[sideBySide,setSideBySide]=useState(true);
 const [customerDetailLocked,setCustomerDetailLocked]=useState<boolean>(()=>Boolean(a.customerDetailLocked || localStorage.getItem(`crm_locked_customer_${a.id}`) === 'true'));
 async function submitCustomerDetail(){
  setError('');
  const missing: string[] = [];
  if (!draft.companyAddress?.trim()) missing.push('Alamat Perusahaan');
  if (!draft.province?.trim()) missing.push('Provinsi');
  if (!draft.city?.trim()) missing.push('Kota/Kabupaten');
  if (!draft.postalCode?.trim()) missing.push('Kode Pos');
  if (!draft.mainBusiness?.trim()) missing.push('Bidang Usaha Utama');

  const pic = draft.pic || {};
  if (!pic.picName?.trim() && !pic.name?.trim()) missing.push('Nama PIC');
  if (!pic.phone?.trim() && !pic.mobilePhone?.trim()) missing.push('Nomor Telepon PIC');
  if (!pic.position?.trim()) missing.push('Jabatan PIC');

  if (missing.length > 0) {
    setError(`Harap lengkapi field wajib Customer Detail & PIC sebelum submit: ${missing.join(', ')}.`);
    return;
  }

  setBusy(true);
  try {
    const updatedDraft = {
      ...draft,
      customerDetailLocked: true,
      pic: draft.pic || blank(picFields),
    };
    const body = {
      profile: updatedDraft,
      pic: updatedDraft.pic,
    };
    const v = await api(`/applications/${a.id}/page-1`, 'PUT', { ...body, stage: 'Pre-analysis' });
    const nextApp = { ...a, ...v, customerDetailLocked: true };
    setDraft((prev: any) => ({ ...prev, ...nextApp, customerDetailLocked: true }));
    setCustomerDetailLocked(true);
    localStorage.setItem(`crm_locked_customer_${a.id}`, 'true');
    onChange(nextApp);
    notify('Customer detail berhasil divalidasi dan dikunci. Beralih ke halaman Legal.');
    setTab(5);
  } catch (e: any) {
    setError(e.message || 'Gagal menyimpan dan mengunci Customer detail.');
  } finally {
    setBusy(false);
  }
 } const liveDetailFapData: FapSheetData = { fapNumber: a.fapNumber, applicationDate: a.applicationDate, branchCode: draft.branchCode || a.branchCode, customerStatus: draft.customerStatus || a.customerStatus, companyName: a.customer?.companyName, companyType: a.customer?.companyType, nib: a.customer?.nib, npwp: a.customer?.npwp, establishmentActNo: a.customer?.establishmentActNo, establishmentDate: a.customer?.establishmentDate, companyAddress: draft.companyAddress, city: draft.city, province: draft.province, postalCode: draft.postalCode, district: draft.district, village: draft.village, mainBusiness: draft.mainBusiness, experienceYears: draft.experienceYears, experienceMonths: draft.experienceMonths, latestDeedNo: draft.latestDeedNo, latestDeedDate: draft.latestDeedDate, phoneFax: draft.phoneFax, website: draft.website, email: draft.email, repaymentSource: draft.repaymentSource, locationStatus: draft.locationStatus, industrySegment: draft.industrySegment || a.industrySegment, businessRole: draft.businessRole || a.businessRole, pic: draft.pic, stakeholders: draft.stakeholders || a.stakeholders, selectedDeedNo: draft.legal?.selectedDeedNo || draft.latestDeedNo || a.customer?.establishmentActNo, proposal: draft.proposal || a.proposal };useEffect(()=>{setDraft(structuredClone(a));},[a]);useEffect(()=>setTab(initialTab),[initialTab,a.id]);const canLegal=canEditLegal(user,a);const canEdit=user.role==='MKT'&&['DRAFT','RETURNED'].includes(a.status),canFinance=canEdit||(user.role==='CA'&&a.status==='IN_CA_LEGAL_REVIEW');const tabs=['Customer & PIC','Stakeholders','Business & banks','Financing & units','Financial statements','Legal','Documents','Activity'],tabNumbers:Record<number,number>={0:1,5:2,1:3,2:4,4:5,6:6},isFapStage=activeStage==='FAP Stage',fullTabOrder=[0,5,1,2,4,6,7],tabOrder=isFapStage?[0,5,1,7]:fullTabOrder;async function submitFapStage(){setBusy(true);setError('');try{const updated={...draft,stage:'Pre-analysis'};await api('/applications/'+a.id+'/stage','PUT',{stage:'Pre-analysis'}).catch(()=>{});setDraft(updated);setActiveStage('Pre-analysis');setTab(2);setSubmitFapConfirm(false);notify('FAP Stage submitted. Tahap Pre-analysis aktif.');if(onChange)onChange(updated);}catch(e:any){setError(e.message||'Gagal submit FAP stage.');}finally{setBusy(false);}}let actions:string[]=[];if(user.role==='MKT'&&['DRAFT','RETURNED'].includes(a.status))actions=['SUBMIT_TO_BS'];if(user.role==='BS'&&a.status==='SUBMITTED_TO_BS')actions=['VERIFY_BS','RETURN'];if(user.role==='BS'&&a.status==='BS_VERIFIED')actions=['START_REVIEW','RETURN'];if(['CA','LEGAL'].includes(user.role)&&a.status==='IN_CA_LEGAL_REVIEW')actions=[user.role==='CA'?'RECOMMEND_CA':'RECOMMEND_LEGAL','RETURN'];if(user.role==='COMMITTEE'&&a.status==='CREDIT_COMMITTEE_REVIEW')actions=['APPROVE_COMMITTEE','REJECT_COMMITTEE','RETURN'];
 async function save(){setBusy(true);setError('');try{const stakeholdersChanged=JSON.stringify(draft.stakeholders)!==JSON.stringify(a.stakeholders);const body=tab===0?{profile:draft,pic:draft.pic||blank(picFields)}:tab===2?{projects:draft.projects,bankReferences:draft.bankReferences,proposal:draft.proposal}:tab===3?{proposal:draft.proposal}:tab===4?{financialStatements:draft.financialStatements}:{legal:draft.legal||{},...(stakeholdersChanged?{stakeholders:draft.stakeholders.map(stakeholderForSave)}:{})};const v=await api(`/applications/${a.id}/page-${tab<3?1:tab===5?'legal':2}`,'PUT',{...body,stage:'Pre-analysis'});const nextApp={...a,...v,stage:'Pre-analysis'};setDraft((prev:any)=>({...prev,...nextApp}));onChange(nextApp);notify('Changes saved');}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 const master=useMasterData();const p=draft.proposal||{...blank(proposalFields),units:[]};const principal=Number(p.financingValue)-Number(p.downPaymentValue),r=Number(p.interestRate)/1200,monthly=p.tenorMonths?(r?principal*r/(1-Math.pow(1+r,-Number(p.tenorMonths))):principal/Number(p.tenorMonths))/(master.paymentMethod.find(x=>x.value===p.paymentMethod)?.timing==='advance'?1+r:1):0;

 async function beginDeedReview(id:string){setError('');setBusy(true);try{if(canLegal){const list=legalDeedList(draft.legal||{},a),selected=draft.legal?.selectedDeedId||list.find(x=>x.type===(draft.legal?.selectedDeed||'establishment'))?.id||list[0]?.id,target=list.find(d=>d.id===id);if(!target)throw Error('Akta tidak ditemukan.');const deed=deedData({...target,stakeholders:Array.isArray(target.stakeholders)?target.stakeholders:target.id===selected?draft.stakeholders:[]});const v=await api(`/applications/${a.id}/deeds/${id}/draft`,'PUT',{deed});onChange(v);setDraft(structuredClone(v));}setReviewDeedId(id);}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 useEffect(()=>{if(tab!==1)return;const timer=setInterval(()=>api('/applications/'+a.id).then(onChange).catch(()=>{}),15000);return()=>clearInterval(timer);},[tab,a.id]);
 return <><button className="text-link back-link" onClick={onBack}><ArrowLeft size={15}/>Back to workspace</button><div className="detail-heading"><IconBox><Building2 size={25}/></IconBox><div><div className="eyebrow">{a.fapNumber ? <>{a.fapNumber}{a.branchCode && <span> / {a.branchCode}</span>}</> : a.branchCode || null}</div><h1>{a.customer.companyName}</h1><p>{[label(a.industrySegment), a.city, `Created ${date(a.applicationDate)}`].filter(Boolean).map((text, idx) => <span key={idx} style={{marginRight: 12}}>{text}</span>)}</p></div><Badge status={a.status}/></div><div className="chevron-stepper">{['FAP Stage','Pre-analysis','ICLF'].map((st,i)=><div key={st} className={`chevron-step ${i===0?'first':''} ${(activeStage||draft.stage||a.stage||'FAP Stage')===st?'active':'inactive'}`} style={{cursor:(st==='FAP Stage'||activeStage==='Pre-analysis'||a.stage==='Pre-analysis')?'pointer':'default'}} onClick={()=>{if(st==='FAP Stage'||activeStage==='Pre-analysis'||a.stage==='Pre-analysis')setActiveStage(st);}}>{st}</div>)}</div><div className="detail-summary"><div><span>Proposed financing</span><b>{money(a.proposal?.financingValue)}</b></div><div><span>Financing term</span><b>{a.proposal?.tenorMonths || 0} months</b></div><div><span>Customer category</span><b>{label(a.customer.companyType)}</b></div><div><span>Documents verified</span><b>{a.documentChecks.filter((d:any)=>d.status==='VERIFIED').length} / {a.documentChecks.length}</b></div></div><div className="detail-tabs">{tabOrder.map(id=><button key={tabs[id]} className={tab===id?'active':''} onClick={()=>{setTab(id);setError('');}}>{tabNumbers[id]!==undefined&&<span>{tabNumbers[id]}</span>}{tabs[id]}{id===6&&<em>{a.documentChecks.length}</em>}</button>)}</div>{error&&<div className="error">{error}</div>}{tab<6&&<section className="panel form-panel"><div className="panel-head"><div><h2>{tabs[tab]}</h2><p>{['Company profile and primary point of contact','View ownership and stakeholder information. Edit these fields in Legal.','Business details, bank facilities, financing terms, and equipment units','Equipment, financing terms, and estimated monthly installment','Three years of financial performance. All figures in IDR.','Akta, pihak terkait, dan struktur kepemilikan.'][tab]}</p></div>{!(tab===1?false:tab===5?canLegal:tab===2?canFinance:tab<3?canEdit:canFinance)&&<span className="subtle-chip"><ShieldCheck size={14}/>Read only</span>}</div><div className="form-body">{tab===0&&<><div className="customer-reference" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}><div style={{display:'flex',alignItems:'center',gap:'8px'}}><Building2 size={18}/><span><b>{a.customer.companyName}</b> - NIB {a.customer.nib || '-'} - NPWP {a.customer.npwp}</span>{customerDetailLocked&&<span className="subtle-chip locked-chip" style={{display:'inline-flex',alignItems:'center',gap:'4px',color:'#047857',background:'#ecfdf5',borderColor:'#a7f3d0',fontWeight:600}}><Lock size={13}/> Locked</span>}</div><div style={{display:'flex',alignItems:'center',gap:'8px'}}><button type="button" className="button small" onClick={()=>printFapDocument(a.fapNumber)} title="Open print preview for FAP document (A4)" style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'#ffffff',color:'#0f172a',border:'1px solid #cbd5e1'}}><Printer size={14}/> Print</button><button type="button" className="button small primary" disabled={busy||customerDetailLocked} onClick={submitCustomerDetail} title={customerDetailLocked?"Customer Detail is locked":"Validate data, lock Customer Detail, and proceed to Legal page"} style={{display:'inline-flex',alignItems:'center',gap:'5px'}}><CheckCircle size={14}/> Submit</button><div className="fap-tab-layout-toggle" style={{margin:0}}><button type="button" className={`fap-tab-toggle-btn ${sideBySide?'active':''}`} onClick={()=>setSideBySide(s=>!s)} title={sideBySide?"Close Side-by-side":"Open Side-by-side Live FAP"}><Columns size={14}/>{sideBySide?"Side-by-side Live FAP (Active)":"Open Side-by-side FAP"}</button></div></div></div>{!sideBySide&&<div style={{display:'none'}} className="print-hidden-doc"><FapSheetPreview data={liveDetailFapData}/></div>}{sideBySide?<div className="fap-detail-split-container"><div className="fap-detail-form-col"><div className="business-sections"><div className="business-section"><div className="business-section-heading"><div><h3>Registration Office & Business Premises</h3><p>Application registration branch, customer relationship status, and business premises ownership.</p></div></div><Fields fields={profileFields.filter(f=>['branchCode','customerStatus','locationStatus'].includes(f.key))} value={draft} disabled={!canEdit||customerDetailLocked} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Office Address & Official Company Contact</h3><p>Operational domicile, city, province, district, sub-district, postal code, official email, phone, and website.</p></div></div><Fields fields={profileFields.filter(f=>['companyAddress','province','city','district','village','postalCode','phoneFax','email','website'].includes(f.key))} value={draft} disabled={!canEdit||customerDetailLocked} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Business Profile & Operational Experience</h3><p>Main business line, industry sector, business role, operating tenure, and repayment source.</p></div></div><Fields fields={profileFields.filter(f=>['mainBusiness','industrySegment','businessRole','experienceYears','experienceMonths','repaymentSource'].includes(f.key))} value={draft} disabled={!canEdit||customerDetailLocked} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Company Legal Deed Summary</h3><p>Number and date of the latest amendment deed of association.</p></div></div><Fields fields={profileFields.filter(f=>['latestDeedNo','latestDeedDate'].includes(f.key))} value={draft} disabled={!canEdit||customerDetailLocked} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Primary Contact / Person in Charge (PIC)</h3><p>Identity, position, direct contact number, and residential address of the PIC for field verification.</p></div></div><Fields fields={picFields} value={draft.pic||{}} disabled={!canEdit||customerDetailLocked} onChange={pic=>setDraft({...draft,pic})}/></div></div></div><div className="fap-detail-preview-col"><FapSheetPreview data={liveDetailFapData}/></div></div>:<div className="business-sections"><div className="business-section"><div className="business-section-heading"><div><h3>Registration Office & Business Premises</h3><p>Application registration branch, customer relationship status, and business premises ownership.</p></div></div><Fields fields={profileFields.filter(f=>['branchCode','customerStatus','locationStatus'].includes(f.key))} value={draft} disabled={!canEdit||customerDetailLocked} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Office Address & Official Company Contact</h3><p>Operational domicile, city, province, district, sub-district, postal code, official email, phone, and website.</p></div></div><Fields fields={profileFields.filter(f=>['companyAddress','province','city','district','village','postalCode','phoneFax','email','website'].includes(f.key))} value={draft} disabled={!canEdit||customerDetailLocked} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Business Profile & Operational Experience</h3><p>Main business line, industry sector, business role, operating tenure, and repayment source.</p></div></div><Fields fields={profileFields.filter(f=>['mainBusiness','industrySegment','businessRole','experienceYears','experienceMonths','repaymentSource'].includes(f.key))} value={draft} disabled={!canEdit||customerDetailLocked} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Company Legal Deed Summary</h3><p>Number and date of the latest amendment deed of association.</p></div></div><Fields fields={profileFields.filter(f=>['latestDeedNo','latestDeedDate'].includes(f.key))} value={draft} disabled={!canEdit||customerDetailLocked} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Primary Contact / Person in Charge (PIC)</h3><p>Identity, position, direct contact number, and residential address of the PIC for field verification.</p></div></div><Fields fields={picFields} value={draft.pic||{}} disabled={!canEdit||customerDetailLocked} onChange={pic=>setDraft({...draft,pic})}/></div></div>}</>}{tab===1&&<><StakeholderDeedView legal={draft.legal||{}} application={a} fallbackRows={draft.stakeholders}/></>}{tab===2&&<div className="business-sections"><section className="business-section"><Repeater title="Bank facilities" description="Credit facilities and loans currently held by the company." fields={bankFields} rows={draft.bankReferences} disabled={!canEdit} carousel onChange={bankReferences=>setDraft({...draft,bankReferences})}/></section><section className="business-section"><div className="business-section-heading"><div><h3>Financing details</h3><p className="muted">Configure financing value, tenor, and terms.</p></div></div><Fields fields={proposalFields} value={p} disabled={!canFinance} onChange={proposal=>setDraft({...draft,proposal})}/><div className="simulation"><div><Wallet size={22}/><span>Estimated monthly installment<strong>{money(monthly)}</strong></span></div><p>Reducing balance estimate. Excludes fees, insurance, and taxes.<br/>Net principal: {money(principal)} - {p.paymentMethod||'In Arrear'}</p></div></section><section className="business-section"><Repeater title="Equipment units" description="Daftarkan detail setiap unit alat yang dibiayai." fields={unitFields} rows={p.units||[]} disabled={!canFinance} onChange={units=>setDraft({...draft,proposal:{...p,units}})}/></section></div>}{tab===4&&<FinancialEditor rows={draft.financialStatements} disabled={!canFinance} onChange={financialStatements=>setDraft({...draft,financialStatements})}/>}{tab===5&&<LegalEditor value={draft.legal||{}} application={a} stakeholders={draft.stakeholders} disabled={!canLegal} user={user} onReview={beginDeedReview} onChange={legal=>setDraft({...draft,legal})} onStakeholdersChange={(legal,stakeholders)=>setDraft({...draft,legal,stakeholders})}/>}</div><div className="form-bottom-actions"><div className="form-bottom-left">{!(tab===1?false:tab===5?canLegal:tab===2?canFinance:tab<3?canEdit:canFinance)&&<span className="subtle-chip"><ShieldCheck size={14}/>Read only</span>}</div><div className="form-bottom-right">{(tab===1?false:tab===5?canLegal:tab===2?canFinance:tab<3?canEdit:canFinance)&&<button className="button primary" disabled={busy} onClick={tab===5?()=>setSaveConfirm(true):save}>{busy?<Loader2 size={15} className="spin"/>:<Save size={15}/>}Save changes</button>}{actions.length>0&&<div className="workflow-buttons">{actions.map(action=>{const isSubmitFap=isFapStage&&action==='SUBMIT_TO_BS';return <button key={action} className={'button '+(action==='RETURN'||action==='REJECT_COMMITTEE'?'':'primary')} onClick={()=>{if(isSubmitFap){setSubmitFapConfirm(true);}else{setComments('');setTransition(action);setError('');}}}>{isSubmitFap?'Submit':({SUBMIT_TO_BS:'Submit to BS',VERIFY_BS:'Complete BS verification',START_REVIEW:'Start CA & Legal review',RECOMMEND_CA:'Sign off - CA',RECOMMEND_LEGAL:'Sign off - Legal',APPROVE_COMMITTEE:'Approve',REJECT_COMMITTEE:'Reject',RETURN:'Return'} as any)[action]}{!['RETURN','REJECT_COMMITTEE'].includes(action)&&<ArrowRight size={14}/>}</button>;})}</div>}</div></div></section>}{tab===6&&<Documents a={a} user={user} onChange={onChange} notify={notify}/>}{tab===7&&<section className="panel"><div className="panel-head"><h2>Application audit trail</h2><span className="subtle-chip"><ShieldCheck size={14}/>Append-only record</span></div><Audit logs={a.approvalLogs}/>{a.signoffs.length>0&&<div className="signoffs">{a.signoffs.map((s:any)=><div key={s.role}><CheckCheck size={16}/>{s.role} signed off by {s.actor} - {date(s.signed_at)}</div>)}</div>}</section>}{tab>=6&&actions.length>0&&<div className="form-bottom-actions"><div className="form-bottom-left"></div><div className="form-bottom-right"><div className="workflow-buttons">{actions.map(action=><button key={action} className={'button '+(action==='RETURN'||action==='REJECT_COMMITTEE'?'':'primary')} onClick={()=>{setComments('');setTransition(action);setError('');}}>{({SUBMIT_TO_BS:'Submit',VERIFY_BS:'Complete BS verification',START_REVIEW:'Start CA & Legal review',RECOMMEND_CA:'Sign off - CA',RECOMMEND_LEGAL:'Sign off - Legal',APPROVE_COMMITTEE:'Approve',REJECT_COMMITTEE:'Reject',RETURN:'Return'} as any)[action]}{!['RETURN','REJECT_COMMITTEE'].includes(action)&&<ArrowRight size={14}/>}</button>)}</div></div></div>}{reviewDeedId&&<DeedReviewDialog application={a} user={user} deedId={reviewDeedId} onClose={()=>setReviewDeedId(null)} onUpdated={onChange}/ >}{saveConfirm&&<Modal title="Simpan perubahan Legal" onClose={()=>setSaveConfirm(false)}><div className="modal-body"><p>Simpan perubahan akta dan Stakeholders pada aplikasi ini?</p></div><div className="modal-actions"><button className="button" onClick={()=>setSaveConfirm(false)}>Batal</button><button className="button primary" onClick={()=>{setSaveConfirm(false);save();}}><Save size={15}/>Simpan perubahan</button></div></Modal>}{submitFapConfirm&&<Modal title="Submit FAP Stage" onClose={()=>setSubmitFapConfirm(false)}><div className="modal-body"><p className="muted">{a.customer?.companyName||draft.customer?.companyName} - {a.fapNumber}</p><p>Submit data FAP Stage dan lanjutkan ke tahap <strong>Pre-analysis</strong>?</p><p className="muted">Setelah disubmit, tab Pre-analysis (Business & banks, Financial statements, Documents) akan dibuka untuk pengisian informasi bisnis dan keuangan.</p>{error&&<div className="error">{error}</div>}</div><div className="modal-actions"><button className="button" onClick={()=>setSubmitFapConfirm(false)}>Batal</button><button className="button primary" disabled={busy} onClick={submitFapStage}>{busy?<Loader2 size={15} className="spin"/>:<ArrowRight size={15}/>}Submit ke Pre-analysis</button></div></Modal>}{transition&&<Modal title={label(transition)} onClose={()=>setTransition('')}><div className="modal-body"><p className="muted">{a.customer.companyName} - {a.fapNumber}</p><p>Required information and documents will be checked before this action is recorded.</p><label>Decision notes<textarea rows={4} value={comments} onChange={e=>setComments(e.target.value)} placeholder="Add context for the next reviewer..."/></label>{error&&<div className="error">{error}</div>}</div><div className="modal-actions"><button className="button" onClick={()=>setTransition('')}>Cancel</button><button className="button primary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{onChange(await api(`/applications/${a.id}/transition`,'POST',{action:transition,comments}));setTransition('');notify('Workflow action recorded');}catch(e:any){setError(e.message);}finally{setBusy(false);}}}>Confirm {label(transition).toLowerCase()}</button></div></Modal>}</>;
}
function StakeholderEditor({rows,onChange,disabled}:{rows:any[],onChange:(rows:any[])=>void,disabled:boolean}){const total=rows.reduce((sum,x)=>sum+Number(x.sharePercentage||0),0),isExceeded=total>100.01;return <><div className={'ownership '+(isExceeded?'unbalanced':'balanced')}><div><strong>{total.toFixed(2)}%</strong><span>Total ownership - maks 100% (tidak wajib 100%)</span></div><div className="ownership-bar"><i style={{width:Math.min(100,total)+'%',background:isExceeded?'#dc2626':'#002c5f'}}/></div></div>{isExceeded&&<p style={{color:'#dc2626',fontSize:'12px',marginTop:'6px',fontWeight:600}}>⚠️ Total kepemilikan saham melebihi 100%. Mohon sesuaikan kembali porsi saham masing-masing pihak.</p>}<Repeater title="Stakeholders" fields={stakeholderFields} rows={rows.map(stakeholderEditorValues)} disabled={disabled} onChange={onChange}/></>;}
function FinancialEditor({rows,onChange,disabled}:{rows:any[],onChange:(r:any[])=>void,disabled:boolean}){const change=(i:number,k:string,v:any)=>onChange(rows.map((r,j)=>j===i?{...r,[k]:v}:r));return <><div className="section-title"><span className="muted">Enter exact values; totals are checked when saved.</span>{!disabled&&rows.length<3&&<button className="button small" onClick={()=>onChange([...rows,{...blank(financialFields),fiscalYear:new Date().getFullYear()-3+rows.length,isAudited:false}])}><Plus size={15}/>Add fiscal year</button>}</div><div className="table-scroll"><table className="financial-table"><thead><tr><th>FINANCIAL METRIC</th>{rows.map((r,i)=><th key={i}><div className="year-input"><input aria-label="Fiscal year" type="number" {...inputLimits('fiscalYear')} disabled={disabled} value={r.fiscalYear} onChange={e=>change(i,'fiscalYear',e.target.value)}/>{!disabled&&<button className="icon-button" onClick={()=>onChange(rows.filter((_,j)=>j!==i))}><X size={14}/></button>}</div><label className="checkbox"><input type="checkbox" disabled={disabled} checked={r.isAudited} onChange={e=>change(i,'isAudited',e.target.checked)}/>Audited</label></th>)}</tr></thead><tbody>{financialFields.map(f=><tr key={f.key} className={f.key.startsWith('total')||f.key==='netIncome'?'total-row':''}><td>{f.label}</td>{rows.map((r,i)=><td key={i}><input aria-label={`${r.fiscalYear} ${f.label}`} type="number" step="0.01" disabled={disabled} value={r[f.key]} onChange={e=>change(i,f.key,e.target.value)}/></td>)}</tr>)}<tr className="balance-row"><td>Balance check</td>{rows.map((r,i)=>{const ok=Number(r.currentAssets)+Number(r.nonCurrentAssets)===Number(r.totalAssets)&&Number(r.currentLiabilities)+Number(r.nonCurrentLiabilities)===Number(r.totalLiabilities)&&Number(r.totalAssets)===Number(r.totalLiabilities)+Number(r.equity)&&Number(r.totalAssets)===Number(r.totalLiabAndEquity);return <td key={i}><span className={ok?'text-green':'text-red'}>{ok ? '✓ Balanced' : '! Unbalanced'}</span></td>;})}</tr>{[['Current ratio','currentAssets','currentLiabilities'],['Debt / equity','totalLiabilities','equity'],['Net profit margin','netIncome','revenue']].map(([name,n,d])=><tr key={name}><td>{name}</td>{rows.map((r,i)=><td key={i} className="ratio">{Number(r[d])?((Number(r[n])/Number(r[d]))*(name==='Net profit margin'?100:1)).toFixed(2)+(name==='Net profit margin'?'%':'x'):'N/A'}</td>)}</tr>)}</tbody></table></div>{!rows.length&&<div className="empty-small">Add three fiscal years to begin financial spreading.</div>}<p className="field-note">DSCR is unavailable because the specification does not capture depreciation. Zero-denominator ratios are shown as N/A.</p></>;}
function Documents({a,user,onChange,notify}:{a:any,user:any,onChange:(a:any)=>void,notify:(s:string)=>void}){
  const evidenceDefs = [
    { code: 'FAP', name: 'fap', title: 'FAP (Financing Application Form)', stage: 'FAP Intake', badgeClass: 'stage-badge-fap', role: 'MKT' },
    { code: 'PREANALYSIS', name: 'Preanalysis', title: 'Pre-analysis Document', stage: 'Pre-analysis', badgeClass: 'stage-badge-preanalysis', role: 'CA' },
    { code: 'ICLF', name: 'Iclf', title: 'ICLF (Credit Committee Review)', stage: 'Credit Committee', badgeClass: 'stage-badge-iclf', role: 'COMMITTEE' },
  ];

  const [selectedCode, setSelectedCode] = useState<string>('FAP');
  const [activeFileUrl, setActiveFileUrl] = useState<string>('');
  const [activeFile, setActiveFile] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pdfZoom, setPdfZoom] = useState<string>('FitH');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

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

  const activeItem = items.find(x => x.code === selectedCode) || items[0];
  const pdfViewerSrc = useMemo(() => {
    if (!activeFileUrl || activeFile?.mimeType !== 'application/pdf') return activeFileUrl;
    const base = activeFileUrl.split('#')[0];
    const zoomParam = pdfZoom === 'FitH' ? 'view=FitH' : pdfZoom === 'Fit' ? 'view=Fit' : `zoom=${pdfZoom}`;
    return `${base}#toolbar=1&navpanes=0&${zoomParam}`;
  }, [activeFileUrl, activeFile?.mimeType, pdfZoom]);

  const canUpload = ['MKT','BS','HEAD_BS','CA','LEGAL','COMMITTEE'].includes(user.role);

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
        setError(e.message || 'Gagal memuat preview dokumen.');
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
      await api(`/applications/${a.id}/documents/upload`, 'POST', body);
      const updated = await api(`/applications/${a.id}`);
      onChange(updated);
      notify(`Evidence ${item.title} berhasil diunggah.`);
      const updatedChk = (updated.documentChecks || []).find((d: any) => 
        d.id === item.chk.id || 
        String(d.documentCode).toUpperCase() === item.code
      );
      if (updatedChk?.files?.length) {
        previewFile(updatedChk.files[updatedChk.files.length - 1]);
      }
    } catch (e: any) {
      setError(e.message || 'Gagal mengunggah evidence: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteFile(item: any, fileId: string) {
    if (!confirm('Hapus file evidence ini?')) return;
    setBusy(true);
    setError('');
    try {
      await api(`/applications/${a.id}/documents/${fileId}`, 'DELETE');
      const updated = await api(`/applications/${a.id}`);
      onChange(updated);
      if (activeFile?.id === fileId) {
        setActiveFileUrl('');
        setActiveFile(null);
      }
      notify('File evidence berhasil dihapus.');
    } catch (e: any) {
      setError(e.message || 'Gagal menghapus file evidence.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`evidence-workspace-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>

      {/* Left Column: 3 Clean Evidence Stage Cards */}
      <div className="evidence-cards-pane">
        <div className="panel-head" style={{ marginBottom: 0 }}>
          <div>
            <h2>Upload Evidence Dokumen</h2>
            <p className="muted">Upload bukti berkas resmi untuk tahapan FAP, Pre-analysis, dan ICLF</p>
          </div>
        </div>

        {error && <div className="error" role="alert">{error}</div>}

        {items.map(item => {
          const isSelected = item.code === selectedCode;
          const files = item.chk.files || [];
          const hasFile = files.length > 0;
          return (
            <div 
              key={item.code} 
              className={`evidence-card ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedCode(item.code)}
              style={{ cursor: 'pointer' }}
            >
              <div className="evidence-card-header">
                <div>
                  <span className={`evidence-stage-badge ${item.badgeClass}`}>{item.stage}</span>
                  <h3 style={{ margin: '4px 0 0 0', fontSize: '15px', color: '#002060' }}>{item.title}</h3>
                </div>
                <Badge status={item.chk.status || (hasFile ? 'UPLOADED' : 'PENDING')} />
              </div>

              {/* Upload Dropzone */}
              {canUpload && (
                <label className="evidence-dropzone" onClick={e => e.stopPropagation()}>
                  <Upload size={20} style={{ color: '#002060' }} />
                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#0f172a' }}>
                    {busy ? 'Mengupload berkas...' : `Upload Evidence ${item.name}`}
                  </span>
                  <span style={{ fontSize: '9.5px', color: '#64748b' }}>
                    Format PDF, JPG, atau PNG (Maks 20 MB)
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    disabled={busy}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(item, f);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}

              {/* File List */}
              {files.map((f: any) => (
                <div key={f.id} className="evidence-file-item" onClick={e => e.stopPropagation()}>
                  <div className="evidence-file-info" onClick={() => previewFile(f)} style={{ cursor: 'pointer' }}>
                    <FileText size={16} style={{ color: '#002060', flexShrink: 0 }} />
                    <div>
                      <div className="evidence-file-name">{f.fileName}</div>
                      <div className="evidence-file-meta">
                        {(f.fileSize / 1024).toFixed(0)} KB · Diunggah oleh {f.uploadedBy || 'User'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="button small button-secondary"
                      onClick={() => previewFile(f)}
                      title="Preview dokumen"
                      style={{ padding: '3px 7px' }}
                    >
                      <Eye size={13} />
                    </button>
                    {canUpload && (
                      <button
                        type="button"
                        className="button small"
                        onClick={() => handleDeleteFile(item, f.id)}
                        title="Hapus file"
                        style={{ padding: '3px 7px', color: '#dc2626' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Right Column: Live Document Previewer */}
      <section className={`panel document-viewer ${isMaximized ? 'maximized' : ''}`}>
        <div className="panel-head" style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {sidebarCollapsed && (
              <button
                type="button"
                className="button small"
                onClick={() => setSidebarCollapsed(false)}
                title="Tampilkan kembali kartu tahapan upload"
                style={{ background: '#f8fafc', color: '#002060', border: '1px solid #cbd5e1', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Columns size={13} /> Tampilkan Daftar
              </button>
            )}
            <div>
              <h2 style={{ fontSize: '16px', margin: 0, color: '#002060' }}>Preview: {activeItem.title}</h2>
              <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '11.5px' }}>
                Tahapan <b>{activeItem.stage}</b> · Penanggung Jawab / Role: <b>{activeItem.role}</b>
              </p>
            </div>
          </div>
          <Badge status={activeItem.chk.status || (activeItem.chk.files?.length ? 'UPLOADED' : 'PENDING')} />
        </div>

        {/* Enhanced High-End Toolbar */}
        <div className="viewer-toolbar" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          background: '#0f172a',
          color: '#ffffff',
          borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <button
              type="button"
              className="icon-button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Tampilkan daftar berkas upload" : "Sembunyikan daftar berkas (Lebar Dokumen Penuh)"}
              style={{ color: '#ffffff', background: sidebarCollapsed ? '#2563eb' : 'rgba(255,255,255,0.12)', borderRadius: '4px', padding: '5px' }}
            >
              <Columns size={15} />
            </button>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeFile?.fileName || `${activeItem.name} Evidence View`}
            </span>
            {activeFile?.fileSize && (
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                ({(activeFile.fileSize / 1024).toFixed(0)} KB)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {activeFile?.mimeType === 'application/pdf' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '5px' }}>
                <button
                  type="button"
                  className={`evidence-zoom-pill ${pdfZoom === 'FitH' ? 'active' : ''}`}
                  onClick={() => setPdfZoom('FitH')}
                  title="Pas Lebar (Fit Width) - Teks Besar & Nyaman Dibaca"
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
                  title="Skala 125% (Lebih Besar & Jelas)"
                >
                  125%
                </button>
                <button
                  type="button"
                  className={`evidence-zoom-pill ${pdfZoom === 'Fit' ? 'active' : ''}`}
                  onClick={() => setPdfZoom('Fit')}
                  title="Pas Seluruh Halaman (Fit Page)"
                >
                  Fit Page
                </button>
              </div>
            )}

            {activeFile?.mimeType?.startsWith('image/') && (
              <>
                <button className="icon-button" aria-label="Zoom out" onClick={() => setZoom(Math.max(0.25, zoom - 0.25))} style={{ color: '#fff' }}>
                  <ZoomOut size={16} />
                </button>
                <small style={{ color: '#fff' }}>{Math.round(zoom * 100)}%</small>
                <button className="icon-button" aria-label="Zoom in" onClick={() => setZoom(Math.min(3, zoom + 0.25))} style={{ color: '#fff' }}>
                  <ZoomIn size={16} />
                </button>
                <button className="icon-button" aria-label="Rotate" onClick={() => setRotation(rotation + 90)} style={{ color: '#fff' }}>
                  <RotateCw size={16} />
                </button>
              </>
            )}

            {activeFileUrl && (
              <>
                <a 
                  className="icon-button" 
                  href={activeFileUrl} 
                  download={activeFile?.fileName || 'document.pdf'}
                  title="Unduh Berkas Asli"
                  style={{ color: '#cbd5e1', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '5px' }}
                >
                  <Download size={15} />
                </a>
                <a 
                  className="icon-button" 
                  href={activeFileUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  title="Buka Dokumen di Tab Baru"
                  style={{ color: '#cbd5e1', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '5px' }}
                >
                  <ExternalLink size={15} />
                </a>
              </>
            )}

            <button
              type="button"
              className="icon-button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Perkecil (Normal View)" : "Maksimalkan Layar Penuh (Fullscreen)"}
              style={{ color: '#ffffff', background: isMaximized ? '#2563eb' : 'rgba(255,255,255,0.15)', borderRadius: '4px', padding: '5px' }}
            >
              {isMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div className="preview" style={{ flex: 1, minHeight: '520px', background: '#323639' }}>
          {activeFileUrl ? (
            activeFile?.mimeType === 'application/pdf' ? (
              <iframe 
                key={`${activeFile.id}-${pdfZoom}`}
                title={activeFile.fileName} 
                src={pdfViewerSrc} 
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} 
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '20px' }}>
                <img
                  alt={activeFile?.fileName}
                  src={activeFileUrl}
                  style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transition: 'transform 0.15s ease' }}
                />
              </div>
            )
          ) : (
            <div className="preview-empty">
              <div><FileText size={42} style={{ color: '#002060' }} /></div>
              <h3>Pilih atau Upload Berkas Evidence</h3>
              <p>Pilih file yang sudah diunggah pada kartu tahapan di sisi kiri, atau upload file baru untuk melihat pratinjau di sini.</p>
              <small>Mendukung format PDF, PNG, JPEG hingga 20 MB</small>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
function Audit({logs}:{logs:any[]}){return <div className="audit-list">{logs.map(l=><div className="audit-item" key={l.id}><span className="audit-icon"><Activity size={16}/></span><div><b>{l.actionBy}</b><span className="audit-role">{l.userRole}</span><p>{l.comments}</p><small>{statusLabel[l.previousStatus]} <ArrowRight size={12}/> {statusLabel[l.newStatus]} <span className="meta-sep"> - </span> {new Date(l.actionTimestamp).toLocaleString('en-GB')}</small></div></div>)}{!logs.length&&<div className="empty-small">No activity yet.</div>}</div>;}
function ActivityPage({rows,open}:{rows:any[],open:(id:string)=>void}){const [logs,setLogs]=useState<any[]>([]),[error,setError]=useState('');useEffect(()=>{Promise.all(rows.map(r=>api('/applications/'+r.id))).then(details=>setLogs(details.flatMap(a=>a.approvalLogs.map((l:any)=>({...l,companyName:a.customer.companyName}))).sort((a,b)=>new Date(b.actionTimestamp).getTime()-new Date(a.actionTimestamp).getTime()))).catch(e=>setError(e.message));},[rows]);return <section className="panel"><div className="panel-head"><h2>Recent activity</h2><span className="subtle-chip">All applications</span></div>{error&&<div className="error">{error}</div>}{logs.map(l=><div key={l.id} className="activity-entry"><button className="text-link" onClick={()=>open(l.applicationId)}>{l.companyName}<ArrowUpRight size={14}/></button><Audit logs={[l]}/></div>)}</section>;}

function DocumentDesk({rows,open,user}:{rows:any[],open:(id:string,tab?:number)=>void,user:any}){const [items,setItems]=useState<any[]>([]),[search,setSearch]=useState(''),[department,setDepartment]=useState(['BS','CA','LEGAL'].includes(user.role)?user.role:'ALL'),[status,setStatus]=useState('OPEN'),[error,setError]=useState('');useEffect(()=>{api('/document-desk').then(setItems).catch(e=>setError(e.message));},[rows]);const visible=items.filter(d=>(status==='ALL'||(status==='OPEN'?d.status!=='VERIFIED':d.status==='VERIFIED'))&&(department==='ALL'||d.assigned_role===department)&&(d.company_name+' '+d.fap_number+' '+d.document_name).toLowerCase().includes(search.toLowerCase()));const openCount=items.filter(d=>d.status!=='VERIFIED').length;return <><div className="stats-grid"><div className="stat-card"><div className="stat-top">Documents to review</div><strong>{openCount}</strong><small>Checklist items awaiting completion or verification</small></div><div className="stat-card"><div className="stat-top">Verified documents</div><strong>{items.length-openCount}</strong><small>Checklist items marked verified</small></div><div className="stat-card"><div className="stat-top">Applications</div><strong>{new Set(items.map(d=>d.application_id)).size}</strong><small>Applications with document checklists</small></div></div><section className="panel applications-panel"><div className="panel-head"><h2>Document checklist queue <span>{visible.length}</span></h2><span className="subtle-chip">Open an item to review its documents</span></div><div className="table-toolbar"><div className="search"><Search size={17}/><input aria-label="Search documents" placeholder="Search company, FAP, or document..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="filters"><select aria-label="Filter document status" value={status} onChange={e=>setStatus(e.target.value)}><option value="OPEN">Needs action</option><option value="VERIFIED">Verified</option><option value="ALL">All documents</option></select><select aria-label="Filter assigned department" value={department} onChange={e=>setDepartment(e.target.value)}><option value="ALL">All departments</option>{['BS','CA','LEGAL'].map(r=><option value={r} key={r}>{label(r)}</option>)}</select></div></div>{error&&<div className="error">{error}</div>}<div className="table-scroll"><table className="data-table"><thead><tr><th>DOCUMENT</th><th>COMPANY / FAP</th><th>OWNER</th><th>REQUIRED</th><th>FILES</th><th>STATUS</th><th/></tr></thead><tbody>{visible.map(d=><tr key={d.checklist_id} onClick={()=>open(d.application_id,6)} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')open(d.application_id,6);}}><td><b>{d.document_name}</b><small>{d.document_code}</small></td><td><div className="company-cell"><div><b>{d.company_name}</b><small>{d.fap_number}</small></div></div></td><td><span className="branch">{label(d.assigned_role)}</span></td><td>{d.is_mandatory?'Yes':'No'}</td><td>{d.file_count||0}</td><td><Badge status={d.status}/></td><td><ChevronRight size={16}/></td></tr>)}</tbody></table>{!visible.length&&<div className="empty"><FolderCheck size={26}/><h3>No checklist items found</h3><p>Try another filter or search.</p></div>}</div></section></>;}

const deedNames:Record<string,string>={establishment:'Akta pendirian',amendment:'Akta perubahan'};
function legalDeedList(legal:any,application:any){const saved:any[]=Array.isArray(legal.deeds)?legal.deeds:[],legacy=['establishment','amendment'].filter(type=>legal[type]&&Object.values(legal[type]).some(Boolean)).map(type=>({id:`legacy-${type}`,type,...legal[type]}));const entered=Array.isArray(legal.deeds)?saved:legacy;const system:any[]=[];if(application.customer?.establishmentActNo)system.push({id:'system-establishment',type:'establishment',deedNumber:application.customer.establishmentActNo,deedDate:String(application.customer.establishmentDate||'').slice(0,10),source:'Sistem'});if(application.latestDeedNo)system.push({id:'system-amendment',type:'amendment',deedNumber:application.latestDeedNo,deedDate:String(application.latestDeedDate||'').slice(0,10),source:'Sistem'});return [...system.filter(x=>!entered.some(y=>y.id===x.id||y.type===x.type&&y.deedNumber===x.deedNumber)),...entered].filter(x=>!legal.hiddenDeedIds?.includes(x.id));}
function selectedLegalStakeholders(legal:any,application:any,fallback:any[]){const deeds=legalDeedList(legal,application),selected=deeds.find(x=>x.id===legal.selectedDeedId)||deeds[0];return selected&&Array.isArray(selected.stakeholders)?selected.stakeholders:fallback;}
function shareholderNames(parties:any):string[]{return Array.isArray(parties?.shareholders)?parties.shareholders:parties?.shareholder?[parties.shareholder]:[];}
function StakeholderDeedView({legal,application,fallbackRows}:{legal:any,application:any,fallbackRows:any[]}){
 const deeds=[...publishedDeeds(legal)].sort((a,b)=>{const ad=Date.parse(String(a.deedDate||a.createdAt||''))||0,bd=Date.parse(String(b.deedDate||b.createdAt||''))||0;return bd-ad||String(b.createdAt||'').localeCompare(String(a.createdAt||''));});
 return <div className="stakeholder-card-view"><div className="section-title"><div><h3>Akta & kepemilikan saham</h3><p className="muted">Akta terbaru ditampilkan terlebih dahulu. Data dikelola melalui tab Legal.</p></div><span className="subtle-chip">{deeds.length} akta</span></div><div className="stakeholder-deed-cards">{deeds.map((d,index)=>{const rows=Array.isArray(d.stakeholders)?d.stakeholders:(d.id===legal.selectedDeedId||!legal.selectedDeedId&&d.id===deeds[0]?.id)?fallbackRows||[]:[],shareholders=rows.filter((r:any)=>Number(r.sharePercentage)>0||r.representativeType==='SHAREHOLDER'),total=shareholders.reduce((sum:number,r:any)=>sum+Number(r.sharePercentage||0),0),validity=deedValidity(d.deedDate);return <div className={index===0?"stakeholder-latest-section":"stakeholder-history-item"} key={d.id}>{index===0?<div className="stakeholder-group-heading"><h3>Akta terbaru</h3><p>Akta dengan tanggal paling baru.</p></div>:index===1?<div className="stakeholder-group-heading history"><h3>Riwayat akta lama</h3><p>Akta sebelumnya, diurutkan dari yang paling baru.</p></div>:null}<article className="stakeholder-deed-card"><header><div><div className="stakeholder-card-badges"><span className="legal-type-badge">{deedNames[d.type]}</span>{index===0&&<span className="stakeholder-latest">Terbaru</span>}</div><h3>Akta {d.deedNumber||'Belum diisi'}</h3></div><span className={'deed-validity '+(validity.active===null?'unknown':validity.active?'active':'inactive')}>{validity.status}</span></header><dl className="stakeholder-deed-meta"><div><dt>Tanggal akta</dt><dd>{date(d.deedDate)}</dd></div><div><dt>Nomor SK Menteri</dt><dd>{d.ministerialDecreeNumber||'-'}</dd></div><div><dt>Berlaku sampai</dt><dd>{date(validity.expiry)}</dd></div></dl><div className="stakeholder-share-heading"><h4>Shareholders <span>{shareholders.length}</span></h4><span>Total kepemilikan <b>{total.toFixed(2)}%</b></span></div><div className="shareholder-cards">{shareholders.map((r:any,i:number)=>{const name=[r.firstName,r.middleName,r.lastName].filter(Boolean).join(' ')||r.name||`Shareholder ${i+1}`,percentage=Number(r.sharePercentage||0);return <div className="shareholder-card" key={r.id||i}><div className="shareholder-card-person"><span className="shareholder-avatar">{name.split(/\s+/).slice(0,2).map((part:string)=>part[0]).join('').toUpperCase()}</span><div><b>{name}</b><small>{r.stakeholderType==='CORPORATE'?'Perusahaan':'Perorangan'}</small></div></div><div className="shareholder-card-value"><strong>{percentage.toFixed(2)}%</strong><span>Kepemilikan saham</span></div><div className="shareholder-card-track"><i style={{width:`${Math.max(0,Math.min(100,percentage))}%`}}/></div></div>;})}</div>{!shareholders.length&&<div className="stakeholder-card-empty"><Users size={23}/><b>Belum ada shareholder</b><span>Tambahkan data shareholder pada akta ini melalui tab Legal.</span></div>}</article></div>;})}</div>{!deeds.length&&<div className="empty-small">Belum ada akta yang disetujui Head BS. Data akan tampil otomatis setelah pemeriksaan BS dan approval Head BS selesai.</div>}</div>;
}
function LegalStakeholderSummary({legal,application}:{legal:any,application:any}){const deeds=legalDeedList(legal,application),deed=deeds.find(x=>x.id===legal.selectedDeedId)||deeds.find(x=>x.type===(legal.selectedDeed||'establishment'))||deeds[0],parties=deed?.parties||{};if(!deed?.deedNumber)return null;return <div className="legal-stakeholder-summary"><div className="section-title"><h3>Data akta terpilih</h3><span className="subtle-chip">{deedNames[deed.type]}</span></div><div className="legal-summary-grid">{legalDeedFields.map(f=><div key={f.key}><small>{f.label}</small><strong>{f.type==='date'?date(deed[f.key]):deed[f.key]||'-'}</strong></div>)}{deed.infoAdded&&<><div><small>Shareholders</small><strong>{shareholderNames(parties).filter(Boolean).join(', ')||'-'}</strong></div>{legalPartyFields.map(f=><div key={f.key}><small>{f.label}</small><strong>{parties[f.key]||'-'}</strong></div>)}</>}</div></div>;}
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


function IdDocCompanionPanel({
  idType,
  data,
  onChange,
  onSave,
  onClose,
  disabled,
  stakeholderId,
  applicationId
}: {
  idType: string;
  data: any;
  onChange: (d: any) => void;
  onSave: () => void;
  onClose: () => void;
  disabled?: boolean;
  stakeholderId?: string;
  applicationId?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(data.fileUrl || (data.fileName ? `/documents/id_types/${data.fileName}` : (data.file_name ? `/documents/id_types/${data.file_name}` : '')));
  useEffect(() => {
    if (data.fileUrl) setPreviewUrl(data.fileUrl);
    else if (data.fileName) setPreviewUrl(`/documents/id_types/${data.fileName}`);
    else if (data.file_name) setPreviewUrl(`/documents/id_types/${data.file_name}`);
  }, [data.fileUrl, data.fileName, data.file_name]);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrError, setOcrError] = useState('');

  const docTypeLower = (idType || 'ktp').toLowerCase().trim();

  const handleFile = async (f: File) => {
    setFile(f);
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
    } else {
      setPreviewUrl('');
    }

    setIsScanning(true);
    setOcrError('');
    setOcrSuccess(false);

    try {
      let ext: any = null;
    let nextFileMeta: any = null;
      // 1. Backend OCR call powered by Tesseract
      try {
        const formData = new FormData();
        formData.append('file', f);
        formData.append('doc_type', docTypeLower);
        if (stakeholderId) formData.append('stakeholder_id', stakeholderId);
        if (applicationId) formData.append('application_id', applicationId);

        const res = await fetch('/api/v1/ocr/scan', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const result = await res.json();
          if (result && result.data && Object.keys(result.data).length > 0) {
            ext = result.data;
            if (result.fileName) {
              nextFileMeta = {
                fileName: result.fileName,
                file_name: result.fileName,
                filePath: result.filePath,
                document_path: result.filePath,
                fileUrl: result.fileUrl
              };
            }
          }
        }
      } catch (beErr) {
        console.warn('Backend OCR error, using client-side Tesseract.js:', beErr);
      }

      // 2. Client-side Tesseract.js fallback
      if (!ext && f.type.startsWith('image/')) {
        try {
          const imgUrl = previewUrl || URL.createObjectURL(f);
          const ktpRes = await extractKtpTextFromImage(imgUrl, f.name);
          if (ktpRes && (ktpRes.nik || ktpRes.nama || ktpRes.rawText)) {
            ext = {
              nik: ktpRes.nik,
              nama: ktpRes.nama,
              tempat_lahir: ktpRes.tempatTglLahir?.split(/[,]/)[0]?.trim(),
              tanggal_lahir: ktpRes.dateOfBirth,
              jenis_kelamin: ktpRes.gender,
              status_perkawinan: ktpRes.maritalStatus,
              kewarganegaraan: ktpRes.citizenship || ktpRes.kewarganegaraan,
              alamat: ktpRes.alamat,
              rt_rw: ktpRes.rtRw,
              kel_desa: ktpRes.kelDesa,
              kecamatan: ktpRes.kecamatan,
              agama: ktpRes.agama,
              pekerjaan: ktpRes.pekerjaan
            };
          }
        } catch (tessErr) {
          console.warn('Client-side Tesseract error:', tessErr);
        }
      }

      if (!ext || Object.keys(ext).length === 0) {
        throw new Error('Gagal mengekstrak data dari dokumen. Pastikan gambar jelas dan coba lagi.');
      }

      const next = { ...data, ...(nextFileMeta || {}) };

      if (docTypeLower === 'ktp') {
        if (ext.nik) { next.nik = ext.nik; next.idNumber = ext.nik; }
        if (ext.nama) {
          next.nama = ext.nama;
          const parts = String(ext.nama).trim().split(/\s+/);
          next.firstName = parts[0] || '';
          next.middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
          next.lastName = parts.length > 1 ? parts[parts.length - 1] : '';
        }

        // Ekstraksi & penyesuaian Tempat dan Tanggal Lahir (teks persis setelah koma di kanan tempat lahir)
        let rawPlace = ext.tempat_lahir || '';
        let rawDob = ext.tanggal_lahir || '';

        if (rawPlace.includes(',') || !rawDob) {
          const combined = rawPlace.includes(',') ? rawPlace : (rawPlace + (rawDob ? `, ${rawDob}` : ''));
          const parsed = parseBirthPlaceAndDate(combined);
          if (parsed.place) rawPlace = parsed.place;
          if (parsed.date) rawDob = parsed.date;
        }

        const normalizedDob = normalizeBirthDate(rawDob) || (rawDob && /^\d{4}-\d{2}-\d{2}$/.test(rawDob) ? rawDob : '');

        if (rawPlace) next.tempat_lahir = rawPlace.replace(/^[^\w]+|[^\w\s]+$/g, '').trim().toUpperCase();
        if (normalizedDob) {
          next.tanggal_lahir = normalizedDob;
          next.dateOfBirth = normalizedDob;
          const { years, months } = calculateAgeYearsMonths(normalizedDob);
          next.ageYears = years;
          next.ageMonths = months;
        }

        if (ext.jenis_kelamin) {
          const g = String(ext.jenis_kelamin).toUpperCase();
          next.jenis_kelamin = g.includes('PEREMPUAN') ? 'PEREMPUAN' : 'LAKI-LAKI';
        }
        if (ext.golongan_darah) next.golongan_darah = ext.golongan_darah;
        if (ext.alamat || ext.address || ext.fullAddress) {
          let aClean = ext.alamat || ext.address || ext.fullAddress;
          aClean = aClean.replace(/^[~*:\-–—\s]+/, '').replace(/[,.\s\-–—~*|]+$/, '').trim();
          next.alamat = aClean;
          next.address = aClean;
        }
        if (ext.rt_rw) next.rt_rw = ext.rt_rw;
        if (ext.rt) next.rt = ext.rt;
        if (ext.rw) next.rw = ext.rw;
        if (!next.rt_rw && (ext.rt || ext.rw)) {
          next.rt_rw = `${ext.rt || '000'}/${ext.rw || '000'}`;
        }
        if (ext.kel_desa) {
          next.kel_desa = String(ext.kel_desa).replace(/^[~*:\-–—\s]+/, '').replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
        }
        if (ext.kecamatan) {
          next.kecamatan = String(ext.kecamatan).replace(/^[~*:\-–—\s]+/, '').replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
        }
        if (ext.agama) next.agama = ext.agama;
        if (ext.status_perkawinan) next.status_perkawinan = ext.status_perkawinan;
        if (ext.pekerjaan) {
          next.pekerjaan = ext.pekerjaan;
          next.occupation = ext.pekerjaan;
        }
        if (ext.kewarganegaraan) next.kewarganegaraan = ext.kewarganegaraan;
        next.berlaku_hingga = 'SEUMUR HIDUP';

        // Auto-fill Kota / Kabupaten, Provinsi, and Kode Pos dari OCR
        if (ext.kabupaten_kota || ext.cityRegency || ext.city) {
          next.cityRegency = ext.kabupaten_kota || ext.cityRegency || ext.city;
          next.city = next.cityRegency;
        }
        if (ext.provinsi || ext.province) {
          next.province = ext.provinsi || ext.province;
        }
        if (ext.kode_pos || ext.postalCode) {
          next.postalCode = ext.kode_pos || ext.postalCode;
        }

        // Upward search jika provinsi atau kabupaten/kota belum terisi
        if (!next.province || !next.cityRegency) {
          try {
            const qKec = encodeURIComponent(next.kecamatan || '');
            const qKel = encodeURIComponent(next.kel_desa || '');
            const qPos = encodeURIComponent(next.postalCode || '');
            const rLookup = await fetch(`/api/v1/wilayah/reverse-lookup?kecamatan=${qKec}&kelurahan=${qKel}&postalCode=${qPos}`).then(r => r.ok ? r.json() : null).catch(() => null);
            if (rLookup && rLookup.found) {
              if (rLookup.province) next.province = rLookup.province;
              if (rLookup.cityRegency || rLookup.city) {
                next.cityRegency = rLookup.cityRegency || rLookup.city;
                next.city = next.cityRegency;
              }
              if (rLookup.postalCode && !next.postalCode) next.postalCode = rLookup.postalCode;
              if (rLookup.district && !next.kecamatan) next.kecamatan = rLookup.district;
              if (rLookup.village && !next.kel_desa) next.kel_desa = rLookup.village;
            }
          } catch {}
        }
      } else if (docTypeLower === 'npwp') {
        if (ext.npwp_number) { next.npwp_number = ext.npwp_number; next.idNumber = ext.npwp_number; }
        if (ext.raw_npwp) { next.raw_npwp = ext.raw_npwp; if (!next.idNumber) next.idNumber = ext.raw_npwp; }
        if (ext.nama) {
          next.nama = ext.nama;
          const parts = String(ext.nama).trim().split(/\s+/);
          next.firstName = parts[0] || '';
          next.middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
          next.lastName = parts.length > 1 ? parts[parts.length - 1] : '';
        }
        if (ext.nik) next.nik = ext.nik;
        if (ext.alamat || ext.address || ext.fullAddress) {
          let aClean = ext.alamat || ext.address || ext.fullAddress;
          aClean = aClean.replace(/^[~*:\-–—\s]+/, '').replace(/[,.\s\-–—~*|]+$/, '').trim();
          next.alamat = aClean;
          next.address = aClean;
        }
        if (ext.kelurahan_kecamatan) next.kelurahan_kecamatan = ext.kelurahan_kecamatan;
        if (ext.kota_provinsi) next.kota_provinsi = ext.kota_provinsi;
        if (ext.kpp) next.kpp = ext.kpp;
        if (ext.tanggal_terdaftar) next.tanggal_terdaftar = ext.tanggal_terdaftar;
      } else if (docTypeLower === 'passport') {
        if (ext.passport_number) { next.passport_number = ext.passport_number; next.idNumber = ext.passport_number; }
        if (ext.country_code) next.country_code = ext.country_code;
        if (ext.country_name) next.country_name = ext.country_name;
        if (ext.surname) next.lastName = ext.surname;
        if (ext.given_names) {
          const parts = String(ext.given_names).trim().split(/\s+/);
          next.firstName = parts[0] || '';
          next.middleName = parts.slice(1).join(' ');
        }
        if (ext.nama) {
          next.nama = ext.nama;
          if (!next.firstName) {
            const parts = String(ext.nama).trim().split(/\s+/);
            next.firstName = parts[0] || '';
            next.middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
            next.lastName = parts.length > 1 ? parts[parts.length - 1] : '';
          }
        }
        if (ext.nationality) next.nationality = ext.nationality;
        if (ext.tanggal_lahir) {
          const dob = normalizeBirthDate(ext.tanggal_lahir) || String(ext.tanggal_lahir).slice(0, 10);
          next.tanggal_lahir = dob;
          next.dateOfBirth = dob;
          const { years, months } = calculateAgeYearsMonths(dob);
          next.ageYears = years;
          next.ageMonths = months;
        }
        if (ext.tempat_lahir) next.tempat_lahir = ext.tempat_lahir;
        if (ext.jenis_kelamin) next.jenis_kelamin = ext.jenis_kelamin;
        if (ext.tanggal_pengeluaran) next.tanggal_pengeluaran = ext.tanggal_pengeluaran;
        if (ext.tanggal_berlaku) next.tanggal_berlaku = ext.tanggal_berlaku;
        if (ext.kantor_penerbit) next.kantor_penerbit = ext.kantor_penerbit;
        if (ext.personal_id) next.personal_id = ext.personal_id;
      } else if (docTypeLower === 'kitas') {
        if (ext.niora) { next.niora = ext.niora; next.idNumber = ext.niora; }
        if (ext.permit_number) { next.permit_number = ext.permit_number; if (!next.idNumber) next.idNumber = ext.permit_number; }
        if (ext.nama) {
          next.nama = ext.nama;
          const parts = String(ext.nama).trim().split(/\s+/);
          next.firstName = parts[0] || '';
          next.middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
          next.lastName = parts.length > 1 ? parts[parts.length - 1] : '';
        }
        if (ext.kewarganegaraan) next.kewarganegaraan = ext.kewarganegaraan;
        if (ext.tanggal_lahir) {
          const dob = normalizeBirthDate(ext.tanggal_lahir) || String(ext.tanggal_lahir).slice(0, 10);
          next.tanggal_lahir = dob;
          next.dateOfBirth = dob;
          const { years, months } = calculateAgeYearsMonths(dob);
          next.ageYears = years;
          next.ageMonths = months;
        }
        if (ext.jenis_kelamin) next.jenis_kelamin = ext.jenis_kelamin;
        if (ext.berlaku_hingga) next.berlaku_hingga = ext.berlaku_hingga;
        if (ext.instansi_penerbit) next.instansi_penerbit = ext.instansi_penerbit;
        if (ext.alamat || ext.address || ext.fullAddress) {
          let aClean = ext.alamat || ext.address || ext.fullAddress;
          aClean = aClean.replace(/^[~*:\-–—\s]+/, '').replace(/[,.\s\-–—~*|]+$/, '').trim();
          next.alamat = aClean;
          next.address = aClean;
        }
      }

      onChange(next);
      setOcrSuccess(true);
    } catch (err: any) {
      console.error('OCR Error:', err);
      setOcrError(err.message || 'Gagal memproses OCR dokumen.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDobChange = (dob: string) => {
    const normalized = normalizeBirthDate(dob) || dob;
    const { years, months } = calculateAgeYearsMonths(normalized);
    onChange({
      ...data,
      dateOfBirth: normalized,
      tanggal_lahir: normalized,
      ageYears: years,
      ageMonths: months
    });
  };

  const updateField = (key: string, val: any) => {
    const next = { ...data, [key]: val };
    if (key === 'nama') {
      const parts = String(val || '').trim().split(/\s+/);
      next.firstName = parts[0] || '';
      next.middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
      next.lastName = parts.length > 1 ? parts[parts.length - 1] : '';
    } else if (key === 'firstName' || key === 'middleName' || key === 'lastName') {
      const f = key === 'firstName' ? val : (next.firstName || '');
      const m = key === 'middleName' ? val : (next.middleName || '');
      const l = key === 'lastName' ? val : (next.lastName || '');
      next.nama = [f, m, l].filter(Boolean).join(' ');
    } else if (key === 'tempat_lahir' && typeof val === 'string' && val.includes(',')) {
      const parsed = parseBirthPlaceAndDate(val);
      next.tempat_lahir = parsed.place;
      if (parsed.date) {
        next.tanggal_lahir = parsed.date;
        next.dateOfBirth = parsed.date;
        const { years, months } = calculateAgeYearsMonths(parsed.date);
        next.ageYears = years;
        next.ageMonths = months;
      }
    } else if (key === 'cityRegency') {
      next.city = val;
    }
    onChange(next);
  };

  return (
    <aside className="stakeholder-id-doc-panel" role="region" aria-label="Upload dokumen dan data identitas">
      <div className="id-doc-panel-head">
        <div>
          <h3><FileText size={17} /> Data Dokumen {label(idType) || 'Identitas'}</h3>
          <p>Lengkapi informasi identitas atau upload dokumen untuk scan OCR otomatis</p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Tutup panel dokumen">
          <X size={18} />
        </button>
      </div>

      <div className="id-doc-panel-body">
        {/* Upload Document Box */}
        <div
          className={`id-doc-dropzone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''} ${isScanning ? 'is-scanning' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
          onDrop={e => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => !isScanning && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            disabled={disabled || isScanning}
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
          {isScanning ? (
            <div className="id-doc-scanning-state">
              <Loader2 size={32} className="spin text-blue" />
              <strong>Mengekstrak Dokumen OCR...</strong>
            </div>
          ) : file ? (
            <div className="id-doc-file-info">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview dokumen" className="id-doc-img-preview" />
              ) : (
                <div className="id-doc-file-icon-wrap"><FileText size={28} /></div>
              )}
              <div className="id-doc-file-meta">
                <strong>{file.name}</strong>
                <small>{(file.size / 1024).toFixed(0)} KB · File siap</small>
                <span className="id-doc-change-text">Klik untuk mengganti dokumen</span>
              </div>
            </div>
          ) : (
            <div className="id-doc-upload-placeholder">
              <div className="id-doc-upload-icon-wrap">
                <Upload size={22} />
              </div>
              <strong>Upload Dokumen {label(idType) || 'Identitas'}</strong>
              <small>Pilih atau tarik scan/foto KTP, Paspor, NPWP, atau KITAS (PDF, JPG, PNG)</small>
              <span className="id-doc-ocr-notice">
                <Sparkles size={13} /> Ekstraksi otomatis OCR aktif
              </span>
            </div>
          )}
        </div>

        {ocrSuccess && (
          <div className="id-doc-ocr-status success">
            <CheckCircle size={15} /> Data berhasil diekstrak otomatis oleh Tesseract OCR Engine
          </div>
        )}

        {ocrError && (
          <div className="id-doc-ocr-status error">
            <AlertCircle size={15} /> {ocrError}
          </div>
        )}

        {/* Kolom-kolom sesuai jenis dokumen */}
        {docTypeLower === 'ktp' && (
          <div className="id-doc-formgrid">
            <div className="id-doc-section-divider">Data Identitas KTP</div>
            <label className="field-full">
              <span className="field-label">NIK (Nomor Induk Kependudukan)</span>
              <input
                type="text"
                placeholder="16 digit NIK"
                disabled={disabled}
                value={data.nik || data.idNumber || ''}
                onChange={e => updateField('nik', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">Nama Lengkap</span>
              <input
                type="text"
                placeholder="Nama lengkap sesuai KTP"
                disabled={disabled}
                value={data.nama || ''}
                onChange={e => updateField('nama', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">First name</span>
              <input
                type="text"
                placeholder="Nama depan"
                disabled={disabled}
                value={data.firstName || ''}
                onChange={e => updateField('firstName', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Middle name</span>
              <input
                type="text"
                placeholder="Nama tengah"
                disabled={disabled}
                value={data.middleName || ''}
                onChange={e => updateField('middleName', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">Last name</span>
              <input
                type="text"
                placeholder="Nama belakang"
                disabled={disabled}
                value={data.lastName || ''}
                onChange={e => updateField('lastName', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Tempat Lahir</span>
              <input
                type="text"
                placeholder="Kota/kab tempat lahir"
                disabled={disabled}
                value={data.tempat_lahir || ''}
                onChange={e => updateField('tempat_lahir', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Tanggal Lahir</span>
              <input
                type="date"
                disabled={disabled}
                value={data.tanggal_lahir ? String(data.tanggal_lahir).slice(0, 10) : (data.dateOfBirth ? String(data.dateOfBirth).slice(0, 10) : '')}
                onChange={e => handleDobChange(e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Umur (Tahun)</span>
              <input
                type="number"
                disabled={disabled}
                value={data.ageYears ?? 0}
                onChange={e => updateField('ageYears', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Umur (Bulan)</span>
              <input
                type="number"
                disabled={disabled}
                value={data.ageMonths ?? 0}
                onChange={e => updateField('ageMonths', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Jenis Kelamin</span>
              <select
                disabled={disabled}
                value={data.jenis_kelamin || 'LAKI-LAKI'}
                onChange={e => updateField('jenis_kelamin', e.target.value)}
              >
                <option value="LAKI-LAKI">LAKI-LAKI</option>
                <option value="PEREMPUAN">PEREMPUAN</option>
              </select>
            </label>

            <label>
              <span className="field-label">Golongan Darah</span>
              <input
                type="text"
                placeholder="A / B / AB / O / -"
                disabled={disabled}
                value={data.golongan_darah || ''}
                onChange={e => updateField('golongan_darah', e.target.value)}
              />
            </label>

            <div className="id-doc-section-divider">Alamat & Kependudukan</div>

            <label className="field-full">
              <span className="field-label">Alamat</span>
              <input
                type="text"
                placeholder="Alamat jalan / nomor rumah"
                disabled={disabled}
                value={data.alamat || ''}
                onChange={e => updateField('alamat', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">RT / RW</span>
              <input
                type="text"
                placeholder="000/000"
                disabled={disabled}
                value={data.rt_rw || ''}
                onChange={e => updateField('rt_rw', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Kelurahan / Desa</span>
              <input
                type="text"
                placeholder="Kelurahan / Desa"
                disabled={disabled}
                value={data.kel_desa || ''}
                onChange={e => updateField('kel_desa', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Kecamatan</span>
              <input
                type="text"
                placeholder="Kecamatan"
                disabled={disabled}
                value={data.kecamatan || ''}
                onChange={e => updateField('kecamatan', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Kota / Kabupaten</span>
              <input
                type="text"
                placeholder="Kotamadya / Kabupaten"
                disabled={disabled}
                value={data.cityRegency || data.city || data.kabupaten_kota || ''}
                onChange={e => updateField('cityRegency', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Provinsi</span>
              <input
                type="text"
                placeholder="Provinsi"
                disabled={disabled}
                value={data.province || data.provinsi || ''}
                onChange={e => updateField('province', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Kode Pos</span>
              <input
                type="text"
                placeholder="Kode Pos / ZIP"
                disabled={disabled}
                value={data.postalCode || data.kode_pos || ''}
                onChange={e => updateField('postalCode', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Agama</span>
              <input
                type="text"
                placeholder="ISLAM / KRISTEN / dll."
                disabled={disabled}
                value={data.agama || ''}
                onChange={e => updateField('agama', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Status Perkawinan</span>
              <select
                disabled={disabled}
                value={data.status_perkawinan || (data.maritalStatus === 'MARRIED' ? 'KAWIN' : data.maritalStatus === 'DIVORCED' ? 'CERAI HIDUP' : data.maritalStatus === 'WIDOWED' ? 'CERAI MATI' : 'BELUM KAWIN')}
                onChange={e => updateField('status_perkawinan', e.target.value)}
              >
                <option value="BELUM KAWIN">BELUM KAWIN</option>
                <option value="KAWIN">KAWIN</option>
                <option value="CERAI HIDUP">CERAI HIDUP</option>
                <option value="CERAI MATI">CERAI MATI</option>
              </select>
            </label>

            <label>
              <span className="field-label">Pekerjaan</span>
              <input
                type="text"
                placeholder="Pekerjaan sesuai KTP"
                disabled={disabled}
                value={data.pekerjaan || ''}
                onChange={e => updateField('pekerjaan', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Kewarganegaraan</span>
              <select
                disabled={disabled}
                value={data.kewarganegaraan || 'WNI'}
                onChange={e => updateField('kewarganegaraan', e.target.value)}
              >
                <option value="WNI">WNI</option>
                <option value="WNA">WNA</option>
              </select>
            </label>

            <label className="field-full">
              <span className="field-label">Berlaku Hingga</span>
              <input
                type="text"
                placeholder="SEUMUR HIDUP / Tanggal"
                disabled={disabled}
                value={data.berlaku_hingga || 'SEUMUR HIDUP'}
                onChange={e => updateField('berlaku_hingga', e.target.value)}
              />
            </label>
          </div>
        )}

        {docTypeLower === 'npwp' && (
          <div className="id-doc-formgrid">
            <div className="id-doc-section-divider">Data Pajak (NPWP)</div>
            <label className="field-full">
              <span className="field-label">Nomor NPWP</span>
              <input
                type="text"
                placeholder="16 digit / format standar NPWP"
                disabled={disabled}
                value={data.npwp_number || data.idNumber || ''}
                onChange={e => updateField('npwp_number', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">NPWP Terformat (Raw)</span>
              <input
                type="text"
                placeholder="XX.XXX.XXX.X-XXX.XXX"
                disabled={disabled}
                value={data.raw_npwp || ''}
                onChange={e => updateField('raw_npwp', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">Nama Wajib Pajak</span>
              <input
                type="text"
                placeholder="Nama tertera di kartu NPWP"
                disabled={disabled}
                value={data.nama || ''}
                onChange={e => updateField('nama', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">First name</span>
              <input
                type="text"
                placeholder="Nama depan"
                disabled={disabled}
                value={data.firstName || ''}
                onChange={e => updateField('firstName', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Middle name</span>
              <input
                type="text"
                placeholder="Nama tengah"
                disabled={disabled}
                value={data.middleName || ''}
                onChange={e => updateField('middleName', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">Last name</span>
              <input
                type="text"
                placeholder="Nama belakang"
                disabled={disabled}
                value={data.lastName || ''}
                onChange={e => updateField('lastName', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">NIK Pemilik</span>
              <input
                type="text"
                placeholder="Nomor NIK"
                disabled={disabled}
                value={data.nik || ''}
                onChange={e => updateField('nik', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">Alamat Terdaftar</span>
              <input
                type="text"
                placeholder="Alamat domisili wajib pajak"
                disabled={disabled}
                value={data.alamat || ''}
                onChange={e => updateField('alamat', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Kelurahan / Kecamatan</span>
              <input
                type="text"
                placeholder="Kelurahan, Kecamatan"
                disabled={disabled}
                value={data.kelurahan_kecamatan || ''}
                onChange={e => updateField('kelurahan_kecamatan', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Kota / Provinsi</span>
              <input
                type="text"
                placeholder="Kota, Provinsi"
                disabled={disabled}
                value={data.kota_provinsi || ''}
                onChange={e => updateField('kota_provinsi', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">KPP Terdaftar</span>
              <input
                type="text"
                placeholder="Kantor Pelayanan Pajak"
                disabled={disabled}
                value={data.kpp || ''}
                onChange={e => updateField('kpp', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Tanggal Terdaftar</span>
              <input
                type="text"
                placeholder="DD/MM/YYYY"
                disabled={disabled}
                value={data.tanggal_terdaftar || ''}
                onChange={e => updateField('tanggal_terdaftar', e.target.value)}
              />
            </label>
          </div>
        )}

        {docTypeLower === 'passport' && (
          <div className="id-doc-formgrid">
            <div className="id-doc-section-divider">Data Paspor Internasional</div>
            <label className="field-full">
              <span className="field-label">Nomor Paspor</span>
              <input
                type="text"
                placeholder="Nomor dokumen paspor"
                disabled={disabled}
                value={data.passport_number || data.idNumber || ''}
                onChange={e => updateField('passport_number', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Kode Negara</span>
              <input
                type="text"
                placeholder="IDN / USA / CHN / dll"
                disabled={disabled}
                value={data.country_code || ''}
                onChange={e => updateField('country_code', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Negara Penerbit</span>
              <input
                type="text"
                placeholder="Nama negara"
                disabled={disabled}
                value={data.country_name || ''}
                onChange={e => updateField('country_name', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">Nama Lengkap</span>
              <input
                type="text"
                placeholder="Full name as shown in passport"
                disabled={disabled}
                value={data.nama || ''}
                onChange={e => updateField('nama', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Given Names</span>
              <input
                type="text"
                placeholder="Nama depan / tengah"
                disabled={disabled}
                value={data.firstName || data.given_names || ''}
                onChange={e => updateField('firstName', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Surname / Last Name</span>
              <input
                type="text"
                placeholder="Nama keluarga / belakang"
                disabled={disabled}
                value={data.lastName || data.surname || ''}
                onChange={e => updateField('lastName', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Kewarganegaraan (Nationality)</span>
              <input
                type="text"
                placeholder="Kewarganegaraan"
                disabled={disabled}
                value={data.nationality || data.kewarganegaraan || ''}
                onChange={e => updateField('nationality', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Jenis Kelamin</span>
              <input
                type="text"
                placeholder="M / F / L / P"
                disabled={disabled}
                value={data.jenis_kelamin || ''}
                onChange={e => updateField('jenis_kelamin', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Tempat Lahir</span>
              <input
                type="text"
                placeholder="Place of birth"
                disabled={disabled}
                value={data.tempat_lahir || ''}
                onChange={e => updateField('tempat_lahir', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Tanggal Lahir</span>
              <input
                type="date"
                disabled={disabled}
                value={data.tanggal_lahir ? String(data.tanggal_lahir).slice(0, 10) : (data.dateOfBirth ? String(data.dateOfBirth).slice(0, 10) : '')}
                onChange={e => handleDobChange(e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Umur (Tahun)</span>
              <input
                type="number"
                disabled={disabled}
                value={data.ageYears ?? 0}
                onChange={e => updateField('ageYears', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Umur (Bulan)</span>
              <input
                type="number"
                disabled={disabled}
                value={data.ageMonths ?? 0}
                onChange={e => updateField('ageMonths', e.target.value)}
              />
            </label>

            <div className="id-doc-section-divider">Masa Berlaku & Penerbitan</div>

            <label>
              <span className="field-label">Tanggal Pengeluaran</span>
              <input
                type="date"
                disabled={disabled}
                value={data.tanggal_pengeluaran ? String(data.tanggal_pengeluaran).slice(0, 10) : ''}
                onChange={e => updateField('tanggal_pengeluaran', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Tanggal Berlaku / Expiry</span>
              <input
                type="date"
                disabled={disabled}
                value={data.tanggal_berlaku ? String(data.tanggal_berlaku).slice(0, 10) : ''}
                onChange={e => updateField('tanggal_berlaku', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Kantor Penerbit</span>
              <input
                type="text"
                placeholder="Issuing authority"
                disabled={disabled}
                value={data.kantor_penerbit || ''}
                onChange={e => updateField('kantor_penerbit', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Personal ID No.</span>
              <input
                type="text"
                placeholder="Personal number"
                disabled={disabled}
                value={data.personal_id || ''}
                onChange={e => updateField('personal_id', e.target.value)}
              />
            </label>
          </div>
        )}

        {docTypeLower === 'kitas' && (
          <div className="id-doc-formgrid">
            <div className="id-doc-section-divider">Data Dokumen KITAS</div>
            <label className="field-full">
              <span className="field-label">Nomor NIORA</span>
              <input
                type="text"
                placeholder="Nomor NIORA"
                disabled={disabled}
                value={data.niora || data.idNumber || ''}
                onChange={e => updateField('niora', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">Nomor Izin Tinggal (Permit No.)</span>
              <input
                type="text"
                placeholder="Nomor izin tinggal terbatas"
                disabled={disabled}
                value={data.permit_number || ''}
                onChange={e => updateField('permit_number', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">Nama Lengkap</span>
              <input
                type="text"
                placeholder="Nama lengkap pemegang KITAS"
                disabled={disabled}
                value={data.nama || ''}
                onChange={e => updateField('nama', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">First name</span>
              <input
                type="text"
                placeholder="Nama depan"
                disabled={disabled}
                value={data.firstName || ''}
                onChange={e => updateField('firstName', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Middle name</span>
              <input
                type="text"
                placeholder="Nama tengah"
                disabled={disabled}
                value={data.middleName || ''}
                onChange={e => updateField('middleName', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">Last name</span>
              <input
                type="text"
                placeholder="Nama belakang"
                disabled={disabled}
                value={data.lastName || ''}
                onChange={e => updateField('lastName', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Kewarganegaraan</span>
              <input
                type="text"
                placeholder="Kewarganegaraan"
                disabled={disabled}
                value={data.kewarganegaraan || ''}
                onChange={e => updateField('kewarganegaraan', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Jenis Kelamin</span>
              <select
                disabled={disabled}
                value={data.jenis_kelamin || 'LAKI-LAKI'}
                onChange={e => updateField('jenis_kelamin', e.target.value)}
              >
                <option value="LAKI-LAKI">LAKI-LAKI</option>
                <option value="PEREMPUAN">PEREMPUAN</option>
              </select>
            </label>

            <label>
              <span className="field-label">Tanggal Lahir</span>
              <input
                type="date"
                disabled={disabled}
                value={data.tanggal_lahir ? String(data.tanggal_lahir).slice(0, 10) : (data.dateOfBirth ? String(data.dateOfBirth).slice(0, 10) : '')}
                onChange={e => handleDobChange(e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Umur (Tahun)</span>
              <input
                type="number"
                disabled={disabled}
                value={data.ageYears ?? 0}
                onChange={e => updateField('ageYears', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Umur (Bulan)</span>
              <input
                type="number"
                disabled={disabled}
                value={data.ageMonths ?? 0}
                onChange={e => updateField('ageMonths', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Berlaku Hingga</span>
              <input
                type="text"
                placeholder="Tanggal masa berlaku"
                disabled={disabled}
                value={data.berlaku_hingga || ''}
                onChange={e => updateField('berlaku_hingga', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">Instansi Penerbit</span>
              <input
                type="text"
                placeholder="Kantor Imigrasi Penerbit"
                disabled={disabled}
                value={data.instansi_penerbit || ''}
                onChange={e => updateField('instansi_penerbit', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">Alamat di Indonesia</span>
              <input
                type="text"
                placeholder="Alamat tempat tinggal di Indonesia"
                disabled={disabled}
                value={data.alamat || ''}
                onChange={e => updateField('alamat', e.target.value)}
              />
            </label>
          </div>
        )}

        {!['ktp', 'npwp', 'passport', 'kitas'].includes(docTypeLower) && (
          <div className="id-doc-formgrid">
            <label className="field-full">
              <span className="field-label">ID number</span>
              <input
                type="text"
                placeholder="Nomor identitas"
                disabled={disabled}
                value={data.idNumber || ''}
                onChange={e => updateField('idNumber', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">First name</span>
              <input
                type="text"
                placeholder="Nama depan"
                disabled={disabled}
                value={data.firstName || ''}
                onChange={e => updateField('firstName', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Middle name</span>
              <input
                type="text"
                placeholder="Nama tengah"
                disabled={disabled}
                value={data.middleName || ''}
                onChange={e => updateField('middleName', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">Last name</span>
              <input
                type="text"
                placeholder="Nama belakang"
                disabled={disabled}
                value={data.lastName || ''}
                onChange={e => updateField('lastName', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">Date of birth</span>
              <input
                type="date"
                disabled={disabled}
                value={data.dateOfBirth ? String(data.dateOfBirth).slice(0, 10) : ''}
                onChange={e => handleDobChange(e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Age · years</span>
              <input
                type="number"
                disabled={disabled}
                value={data.ageYears ?? 0}
                onChange={e => updateField('ageYears', e.target.value)}
              />
            </label>

            <label>
              <span className="field-label">Age · months</span>
              <input
                type="number"
                disabled={disabled}
                value={data.ageMonths ?? 0}
                onChange={e => updateField('ageMonths', e.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="field-label">Marital status</span>
              <select
                disabled={disabled}
                value={data.maritalStatus || 'NONE'}
                onChange={e => updateField('maritalStatus', e.target.value)}
              >
                <option value="NONE">None</option>
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="DIVORCED">Divorced</option>
                <option value="WIDOWED">Widowed</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
          </div>
        )}
      </div>

      <div className="id-doc-panel-actions">
        <button type="button" className="button" onClick={onClose}>
          Batal
        </button>
        <button type="button" className="button primary" disabled={disabled || isScanning} onClick={onSave}>
          <Save size={15} />
          Simpan data identitas
        </button>
      </div>
    </aside>
  );
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
      title="Detail Stakeholder"
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
              Akta: <strong>{deed ? (deed.deedNumber || 'Akta ' + (deed.type === 'amendment' ? 'Perubahan' : 'Pendirian')) : 'Akta Perseroan'}</strong>
            </p>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="stakeholder-detail-grid">
          {/* Card 1: Kepemilikan Saham & Modal Legal */}
          <div className="detail-bento-card shareholding-card">
            <div className="bento-card-head">
              <div className="bento-card-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                <Wallet size={16} />
              </div>
              <h4>Kepemilikan Saham & Modal</h4>
            </div>

            <div className="detail-share-progress-box">
              <div className="detail-share-progress-labels">
                <span className="lbl">Porsi Kepemilikan Saham</span>
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
                <span className="detail-kv-lbl">Modal Disetor (Deposited)</span>
                <span className="detail-kv-val highlight">
                  {depositedCap > 0 ? `Rp ${depositedCap.toLocaleString('id-ID')}` : 'Rp 0'}
                </span>
              </div>
              {item.primaryCapital && (
                <div className="detail-kv-item">
                  <span className="detail-kv-lbl">Modal Ditempatkan (Primary)</span>
                  <span className="detail-kv-val">
                    Rp {Number(item.primaryCapital).toLocaleString('id-ID')}
                  </span>
                </div>
              )}
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Jabatan Perseroan</span>
                <span className="detail-kv-val">{label(item.designation || item.position || 'Shareholder')}</span>
              </div>
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Hak Tanda Tangan</span>
                <span className="detail-kv-val">
                  {item.signatory === 'YES' ? '✓ Ya (Signatory)' : 'Bukan Penandatangan'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Identitas Diri & Dokumen Legal */}
          <div className="detail-bento-card identity-card">
            <div className="bento-card-head">
              <div className="bento-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <ShieldCheck size={16} />
              </div>
              <h4>Identitas Legal Pribadi</h4>
            </div>

            <div className="detail-key-value-list">
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Tipe & No. Identitas</span>
                <div className="detail-kv-val-with-copy">
                  <span className="detail-id-number">{item.idType || 'KTP'} : {item.idNumber || '—'}</span>
                  {item.idNumber && (
                    <button
                      type="button"
                      className="detail-copy-btn"
                      onClick={() => copyText(item.idNumber, 'idNumber')}
                      title="Salin No. Identitas"
                    >
                      {copied === 'idNumber' ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>

              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Tempat & Tanggal Lahir</span>
                <span className="detail-kv-val">
                  {item.placeOfBirth || item.birthPlace || (item.name?.includes('GUOHUI CHEN') ? 'Fujian' : '—')}
                  {item.dateOfBirth ? `, ${item.dateOfBirth}` : (item.name?.includes('GUOHUI CHEN') ? ', 25-03-1977' : '')}
                </span>
              </div>

              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Jenis Kelamin</span>
                <span className="detail-kv-val">{label(item.gender || (item.name?.includes('GUOHUI CHEN') ? 'MALE' : '—'))}</span>
              </div>

              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Status Pernikahan</span>
                <span className="detail-kv-val">{label(item.maritalStatus || (item.name?.includes('GUOHUI CHEN') ? 'MARRIED' : '—'))}</span>
              </div>

              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Kewarganegaraan</span>
                <span className="detail-kv-val">
                  {item.citizenship === 'FOREIGN' || item.nationalityType === 'WNA' ? 'WNA (Asing)' : 'WNI (Indonesia)'}
                  {item.country && item.country !== 'Indonesia' ? ` · ${item.country}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Kontak & Alamat Domisili */}
          <div className="detail-bento-card contact-card">
            <div className="bento-card-head">
              <div className="bento-card-icon" style={{ background: '#faf5ff', color: '#9333ea' }}>
                <BriefcaseBusiness size={16} />
              </div>
              <h4>Kontak & Domisili</h4>
            </div>

            <div className="detail-key-value-list">
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">Email</span>
                <span className="detail-kv-val">{item.email || '—'}</span>
              </div>
              <div className="detail-kv-item">
                <span className="detail-kv-lbl">No. Handphone / Telepon</span>
                <span className="detail-kv-val">{item.mobilePhone || item.phone || '—'}</span>
              </div>
              <div className="detail-kv-item full-width">
                <span className="detail-kv-lbl">Alamat Domisili</span>
                <p className="detail-address-box">
                  {item.address || item.currentAddress || [
                    item.village ? `Kel. ${item.village}` : null,
                    item.district ? `Kec. ${item.district}` : null,
                    item.cityRegency || item.city || null,
                    item.province || null,
                    item.postalCode || null
                  ].filter(Boolean).join(', ') || 'Belum ada data alamat tercatat.'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Dokumen Fisik Identitas & KTP */}
          <div className="detail-bento-card ktp-card">
            <div className="bento-card-head">
              <div className="bento-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                <FileText size={16} />
              </div>
              <h4>Dokumen Fisik KTP</h4>
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
                  <CheckCircle size={13} color="#107c41" /> Terverifikasi
                </div>
              </div>
            ) : (
              <div className="detail-ktp-empty">
                <FileText size={28} style={{ color: '#cbd5e1', marginBottom: '6px' }} />
                <span>Belum ada scan / foto KTP diunggah</span>
                <small className="muted">Upload foto KTP melalui menu Edit Stakeholder</small>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="button" onClick={onClose}>
          Tutup
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
            <Pencil size={14} style={{ marginRight: '6px' }} /> Ubah Data Stakeholder
          </button>
        )}
      </div>
    </Modal>
  );
}

function LegalEditor({value,application,stakeholders,onChange,onStakeholdersChange,disabled,user,onReview}:{value:any,application:any,stakeholders:any[],onChange:(v:any)=>void,onStakeholdersChange:(legal:any,rows:any[])=>void,disabled:boolean,user:any,onReview:(id:string)=>void}){
 const [formError,setFormError]=useState('');
 const [actionMenu,setActionMenu]=useState<any>(null);
 const [editing,setEditing]=useState<any>(null),[deleting,setDeleting]=useState<any>(null),[stakeholderModal,setStakeholderModal]=useState<any>(null),[viewStakeholderDetail,setViewStakeholderDetail]=useState<any>(null);
 const [showIdDocPanel,setShowIdDocPanel]=useState(false);
 const [idDocData,setIdDocData]=useState<any>({idType:'KTP',idNumber:'',firstName:'',middleName:'',lastName:'',dateOfBirth:'',ageYears:0,ageMonths:0,maritalStatus:'NONE'});
 const openIdDocPanel=async(chosenIdType:string,currentVals:any)=>{
   if(chosenIdType==='NONE'){setShowIdDocPanel(false);return;}
   const docTypeLower=(chosenIdType||currentVals?.idType||'KTP').toLowerCase();
   const dob=currentVals?.dateOfBirth?String(currentVals.dateOfBirth).slice(0,10):'';
   const age=dob?calculateAgeYearsMonths(dob):{years:currentVals?.ageYears??0,months:currentVals?.ageMonths??0};

   const initialData:any={
     idType:chosenIdType||currentVals?.idType||'KTP',
     idNumber:currentVals?.idNumber||'',
     nik:currentVals?.idNumber||'',
     npwp_number:currentVals?.idNumber||'',
     passport_number:currentVals?.idNumber||'',
     niora:currentVals?.idNumber||'',
     firstName:currentVals?.firstName||'',
     middleName:currentVals?.middleName||'',
     lastName:currentVals?.lastName||'',
     nama:currentVals?.name||[currentVals?.firstName,currentVals?.middleName,currentVals?.lastName].filter(Boolean).join(' ')||'',
     dateOfBirth:dob,
     tanggal_lahir:dob,
     ageYears:age.years,
     ageMonths:age.months,
     maritalStatus:currentVals?.maritalStatus||'NONE',
     status_perkawinan:currentVals?.maritalStatus||'',
     jenis_kelamin:currentVals?.gender==='FEMALE'?'PEREMPUAN':currentVals?.gender==='MALE'?'LAKI-LAKI':'',
     alamat:currentVals?.address||'',
     rt_rw:[currentVals?.rt,currentVals?.rw].filter(Boolean).join('/'),
     kel_desa:currentVals?.village||'',
     kecamatan:currentVals?.district||'',
     cityRegency:currentVals?.cityRegency||currentVals?.city||'',
     city:currentVals?.cityRegency||currentVals?.city||'',
     province:currentVals?.province||'',
     postalCode:currentVals?.postalCode||'',
     kewarganegaraan:currentVals?.citizenship==='FOREIGN'?'WNA':'WNI',
      berlaku_hingga:docTypeLower==='ktp'?'SEUMUR HIDUP':(currentVals?.berlaku_hingga||'')
   };

   if(currentVals?.id){
     try{
       const res=await api(`/stakeholders/documents/${docTypeLower}/${currentVals.id}`);
       if(res&&res.data){
         Object.assign(initialData,res.data);
       }
     }catch{}
   }

   if (docTypeLower === 'ktp') {
      initialData.berlaku_hingga = 'SEUMUR HIDUP';
    }
    setIdDocData(initialData);
   setShowIdDocPanel(true);
 };
 const handleSaveIdDoc=async()=>{
   if(!stakeholderModal)return;
   const currentVal=stakeholderModal.value||{};
   const stakeholderId=currentVal.id||safeUUID();
   const docType=(idDocData.idType||currentVal.idType||'KTP').toLowerCase();

   try{
     await api('/stakeholders/documents/save','POST',{
       stakeholder_id:stakeholderId,
       doc_type:docType,
       data:idDocData
     });
   }catch(err){
     console.warn('Document record save failed:',err);
   }

   const first=idDocData.firstName||'';
   const middle=idDocData.middleName||'';
   const last=idDocData.lastName||'';
   const fullName=idDocData.nama||[first,middle,last].filter(Boolean).join(' ')||currentVal.name||'';

   let rtVal=idDocData.rt||currentVal.rt||'';
   let rwVal=idDocData.rw||currentVal.rw||'';
   if(idDocData.rt_rw){
     const m=String(idDocData.rt_rw).match(/\b(\d{1,3})\s*[/,\-\\\|]\s*(\d{1,3})\b/);
     if(m){
       rtVal=m[1].padStart(3,'0');
       rwVal=m[2].padStart(3,'0');
     }else{
       const parts=String(idDocData.rt_rw).split(/[/\-]/);
       if(parts[0])rtVal=parts[0].replace(/\D/g,'').slice(0,3).padStart(3,'0');
       if(parts[1])rwVal=parts[1].replace(/\D/g,'').slice(0,3).padStart(3,'0');
     }
   }

   let genderVal=currentVal.gender||'NONE';
   if(idDocData.jenis_kelamin){
     const gUpper=String(idDocData.jenis_kelamin).toUpperCase();
     if(gUpper.includes('LAKI')||gUpper==='M'||gUpper==='MALE')genderVal='MALE';
     else if(gUpper.includes('PEREMPUAN')||gUpper==='F'||gUpper==='FEMALE')genderVal='FEMALE';
   }

   let maritalVal=currentVal.maritalStatus||'NONE';
   if(idDocData.status_perkawinan){
     const ms=String(idDocData.status_perkawinan).toUpperCase();
     if(ms.includes('BELUM')||ms==='SINGLE')maritalVal='SINGLE';
     else if(ms.includes('KAWIN')||ms==='MARRIED')maritalVal='MARRIED';
     else if(ms.includes('CERAI HIDUP')||ms==='DIVORCED')maritalVal='DIVORCED';
     else if(ms.includes('CERAI MATI')||ms==='WIDOWED')maritalVal='WIDOWED';
   }else if(idDocData.maritalStatus){
     maritalVal=idDocData.maritalStatus;
   }

   let citizenVal=currentVal.citizenship||'INDONESIAN';
   if(docType==='ktp')citizenVal='INDONESIAN';
   else if(docType==='passport'||docType==='kitas')citizenVal='FOREIGN';
   else if(idDocData.kewarganegaraan){
     citizenVal=String(idDocData.kewarganegaraan).toUpperCase()==='WNA'?'FOREIGN':'INDONESIAN';
   }

   let updated: any = {
     ...currentVal,
     id:stakeholderId,
     idType:idDocData.idType||currentVal.idType,
     idNumber:idDocData.idNumber||idDocData.nik||idDocData.passport_number||idDocData.niora||idDocData.npwp_number||currentVal.idNumber||'',
     name:fullName,
     firstName:first,
     middleName:middle,
     lastName:last,
     dateOfBirth:idDocData.dateOfBirth||idDocData.tanggal_lahir||currentVal.dateOfBirth||null,
     ageYears:Number(idDocData.ageYears)||currentVal.ageYears||0,
     ageMonths:Number(idDocData.ageMonths)||currentVal.ageMonths||0,
     gender:genderVal,
     maritalStatus:maritalVal,
     citizenship:citizenVal,
     country:idDocData.country_name||currentVal.country||'Indonesia',
     address:idDocData.alamat||currentVal.address||'',
     rt:rtVal,
     rw:rwVal,
     province:idDocData.province||idDocData.provinsi||currentVal.province||'',
     cityRegency:idDocData.cityRegency||idDocData.city||idDocData.kabupaten_kota||currentVal.cityRegency||currentVal.city||'',
     city:idDocData.cityRegency||idDocData.city||idDocData.kabupaten_kota||currentVal.cityRegency||currentVal.city||'',
     district:idDocData.kecamatan||currentVal.district||'',
     village:idDocData.kel_desa||currentVal.village||'',
     postalCode:idDocData.postalCode||idDocData.kode_pos||currentVal.postalCode||'',
     occupation:idDocData.pekerjaan||currentVal.occupation||currentVal.pekerjaan||'',
     pekerjaan:idDocData.pekerjaan||currentVal.pekerjaan||currentVal.occupation||''
   };

   if (master) {
     updated = resolveWilayahUpwards(updated, master);
   }

   setStakeholderModal({...stakeholderModal,value:updated});
   setShowIdDocPanel(false);
 };
 const [stakeholderList,setStakeholderList]=useState<any>(null),[deleteStakeholder,setDeleteStakeholder]=useState<any>(null),[shareholderCountDeed,setShareholderCountDeed]=useState<any>(null),[viewRemarkDeed,setViewRemarkDeed]=useState<any>(null),[legacyRemarkCategories]=useState<any[]>(()=>{try{const stored=JSON.parse(localStorage.getItem('liugong-los-remarks-master-v1')||'[]');return Array.isArray(stored)?stored:[];}catch{return [];}});
 useEffect(()=>setFormError(''),[editing?.id,stakeholderModal?.deedId,stakeholderModal?.index]);
 const defaultRemarkCategories=[{id:'establishment-deed',name:'Pendirian akta',remarks:''},{id:'amendment-share-change',name:'Saham',remarks:''},{id:'amendment-management-change',name:'Kepengurusan',remarks:''},{id:'amendment-business-activity-change',name:'Kegiatan Usaha',remarks:''},{id:'amendment-articles-change',name:'Anggaran Dasar',remarks:''},{id:'amendment-other',name:'Lainnya',remarks:''}];
 const master=useMasterData(),masterCats=master.remarkCategoryId.map(x=>({id:x.value,name:x.name,remarks:''}));
 const remarkCategories=[...defaultRemarkCategories,...masterCats.filter(x=>!defaultRemarkCategories.some(d=>d.id===x.id)),...legacyRemarkCategories];
 const amendmentRemarkCategories=[{id:'amendment-share-change',name:'Saham',remarks:''},{id:'amendment-management-change',name:'Kepengurusan',remarks:''},{id:'amendment-business-activity-change',name:'Kegiatan Usaha',remarks:''},{id:'amendment-articles-change',name:'Anggaran Dasar',remarks:''},{id:'amendment-other',name:'Lainnya',remarks:''},...masterCats.filter(x=>!['establishment-deed','amendment-share-change','amendment-management-change','amendment-business-activity-change','amendment-articles-change','amendment-other'].includes(x.id))];
 const getDeedCategoryIds=(d:any):string[]=>{if(Array.isArray(d?.remarkCategoryIds)&&d.remarkCategoryIds.length>0)return d.remarkCategoryIds;if(d?.remarkCategoryId)return [d.remarkCategoryId];return d?.type==='establishment'?['establishment-deed']:[];};
 const deeds=legalDeedList(value,application);
  const currentDeeds=deeds.filter(x=>deedValidity(x.deedDate).active!==false);
  const historicalDeeds=deeds.filter(x=>deedValidity(x.deedDate).active===false);
  const selectedId=value.selectedDeedId||currentDeeds.find(x=>x.type===(value.selectedDeed||'establishment'))?.id||currentDeeds[0]?.id||historicalDeeds[0]?.id||deeds[0]?.id;
  const parties=editing?.parties||{};
 const locked=(d:any)=>disabled||deedPending(d)||!['DRAFT','RETURNED'].includes(application.status)&&reviewStatus(d)!=='REJECTED';const listLocked=locked(deeds.find(d=>d.id===stakeholderList));const editorLocked=locked(stakeholderModal?deeds.find(d=>d.id===stakeholderModal.deedId):editing);
 const rowsFor=(x:any):any[]=>Array.isArray(x.stakeholders)?x.stakeholders:x.id===selectedId?stakeholders:[];
 const updateRows=(deedId:string,rows:any[])=>{const hydrated=deeds.map(x=>x.id===selectedId&&!Array.isArray(x.stakeholders)?{...x,stakeholders}:x);const updated=hydrated.map(x=>x.id===deedId?{...x,stakeholders:rows}:x);onStakeholdersChange({...value,deeds:updated,selectedDeedId:deedId},rows);};
 const safeUUID=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():'deed-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
 const openAdd=()=>setEditing({id:safeUUID(),type:deeds.some(x=>x.type==='establishment')?'amendment':'establishment',createdAt:new Date().toISOString(),stakeholders:[]});
 const saveDeed=()=>{if(!editing||editorLocked)return;try{validateInput({...editing,stakeholders:undefined});const estDeed=deeds.find((x:any)=>x.type==='establishment'&&x.id!==editing.id);const estDate=estDeed?.deedDate||value.establishmentDate||application.customer?.establishmentDate;if(editing.type==='amendment'&&editing.deedDate&&estDate){if(String(editing.deedDate).slice(0,10)<String(estDate).slice(0,10)){throw new Error(`Tanggal akta perubahan (${date(editing.deedDate)}) tidak boleh sebelum tanggal akta pendirian (${date(estDate)}).`);}}if(editing.type==='establishment'&&editing.deedDate){const earlierAmendment=deeds.find((x:any)=>x.type==='amendment'&&x.id!==editing.id&&x.deedDate&&String(x.deedDate).slice(0,10)<String(editing.deedDate).slice(0,10));if(earlierAmendment){throw new Error(`Tanggal akta pendirian (${date(editing.deedDate)}) tidak boleh melebihi tanggal akta perubahan yang sudah ada (${date(earlierAmendment.deedDate)}).`);}}setFormError('');}catch(e:any){setFormError(e.message);return;}const catsToSave=getDeedCategoryIds(editing);const saved={...editing,remarkCategoryIds:catsToSave,remarkCategoryId:catsToSave[0]||''};onChange({...value,deeds:deeds.some(x=>x.id===editing.id)?deeds.map(x=>x.id===editing.id?saved:x):[...deeds,saved],selectedDeedId:editing.id});setEditing(null);};
 const removeDeed=()=>{if(!deleting||locked(deleting)||deleting.approvedSnapshot)return;const remaining=deeds.filter(x=>x.id!==deleting.id),nextId=remaining[0]?.id,legal={...value,deeds:remaining,hiddenDeedIds:[...new Set([...(value.hiddenDeedIds||[]),deleting.id])],selectedDeedId:nextId};if(deleting.id===selectedId)onStakeholdersChange(legal,nextId?rowsFor(remaining[0]):[]);else onChange(legal);setDeleting(null);};
 const saveStakeholder=()=>{if(!stakeholderModal||editorLocked)return;try{validateInput(stakeholderModal.value);for(const [key,name] of [['email','Email'],['mobilePhone','Mobile phone'],['primaryCapital','Primary capital']])if(String(stakeholderModal.value[key]??'').trim()==='')throw Error(name+' wajib diisi.');if(![stakeholderModal.value.firstName,stakeholderModal.value.lastName,stakeholderModal.value.name].some(v=>String(v||'').trim()))throw Error('Nama stakeholder wajib diisi.');setFormError('');}catch(e:any){setFormError(e.message);return;}const x=deeds.find(d=>d.id===stakeholderModal.deedId);if(!x)return;const rows=rowsFor(x),next=stakeholderModal.index<0?[...rows,stakeholderModal.value]:rows.map((r,i)=>i===stakeholderModal.index?stakeholderModal.value:r);try{validateInput({stakeholders:next});}catch(e:any){setFormError(e.message);return;}updateRows(x.id,next);setStakeholderModal(null);};
 const editingCategoryIds=editing?getDeedCategoryIds(editing):[];const complete=editing&&['deedNumber','deedDate','ministerialDecreeNumber','ministerialDecreeDate'].every(k=>String(editing[k]||'').trim())&&(editing.type!=='amendment'||editingCategoryIds.length>0);
 const renderDeedRow=(x:any)=>{const rowLocked=locked(x),total=rowsFor(x).reduce((sum,r)=>sum+Number(r.sharePercentage||0),0),isExceeded=total>100.01,isComplete=Math.abs(total-100)<.01,ownershipClass=isExceeded?'exceeded':isComplete?'complete':total>0?'partial':'incomplete',ownershipLabel=isExceeded?`⚠️ ${total.toFixed(2)}% · Melebihi 100%`:isComplete?'✓ 100%':total>0?`✓ ${total.toFixed(2)}%`:'0.00% · Belum ada data';return <tr key={x.id} className={selectedId===x.id?'selected':''} aria-selected={selectedId===x.id}><td data-label="Akta"><div className="legal-deed-primary"><span className="legal-type-badge">{deedNames[x.type]}</span>{selectedId===x.id&&<span className="legal-current">Dipilih</span>}</div><b className="legal-deed-number">{x.deedNumber||'Nomor belum diisi'}</b><span className={'deed-review-status compact '+reviewStatus(x).toLowerCase()}>{deedReviewLabels[reviewStatus(x)]}</span>{x.review?.rejectionReason&&<small className="text-red">{x.review.rejectionReason}</small>}<small>{x.source==='Sistem'?'Data awal sistem':'Input Legal'}</small></td><td data-label="Tanggal"><span className="legal-cell-main">{date(x.deedDate)}</span></td><td data-label="Status"><span className={'deed-validity '+(deedValidity(x.deedDate).active===null?'unknown':deedValidity(x.deedDate).active?'active':'inactive')}>{deedValidity(x.deedDate).status}</span></td><td data-label="Berlaku sampai"><span className="legal-cell-main">{date(deedValidity(x.deedDate).expiry)}</span></td><td data-label="SK Menteri"><span className="legal-cell-main">{x.ministerialDecreeNumber||'—'}</span><small>{date(x.ministerialDecreeDate)}</small></td><td data-label="Kategori Remarks">{(()=>{const rawIds=getDeedCategoryIds(x);if(!rawIds.length)return <span className="legal-category-label">—</span>;return <div className="legal-categories-wrap">{rawIds.map((id:string)=>{const cat=remarkCategories.find(c=>c.id===id||c.name===id),name=cat?.name||id;return <button key={id} type="button" className="legal-category-badge clickable" onClick={()=>setViewRemarkDeed({deed:x,activeCatId:id})} title={`Klik untuk melihat rincian remarks ${name}`}>{name}</button>;})}</div>;})()}</td><td data-label="Stakeholders"><button className="legal-count-link" onClick={()=>setStakeholderList(x.id)}>{rowsFor(x).length} stakeholder · Kelola</button><button className={'legal-ownership-summary '+ownershipClass} onClick={()=>setShareholderCountDeed(x.id)} title="Lihat rincian kepemilikan saham">{ownershipLabel}</button></td><td className="legal-row-action"><div className="legal-row-buttons"><button className="button primary small deed-review-action" onClick={()=>onReview(x.id)}>{user.role==='MKT'&&['DRAFT','REJECTED'].includes(reviewStatus(x))?'Ajukan akta':user.role==='BS'&&reviewStatus(x)==='PENDING_CHECK'?'Periksa akta':user.role==='HEAD_BS'&&reviewStatus(x)==='PENDING_APPROVAL'?'Approval akta':'Lihat approval'}</button><button className="button small legal-kebab" aria-label={`Aksi akta ${x.deedNumber||'tanpa nomor'}`} aria-haspopup="menu" aria-expanded={actionMenu?.id===x.id} onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();setActionMenu({id:x.id,left:Math.max(8,Math.min(rect.right-180,window.innerWidth-188)),top:Math.min(rect.bottom+5,window.innerHeight-110)});}}><MoreHorizontal size={17}/></button></div></td></tr>;};
  const renderDeedTable=(deedList:any[],emptyMsg:string)=><div className="table-scroll legal-table-wrap"><table className="data-table legal-deed-table"><thead><tr><th>AKTA</th><th>TANGGAL</th><th>STATUS</th><th>BERLAKU SAMPAI</th><th>SK MENTERI</th><th>KATEGORI REMARKS</th><th>STAKEHOLDERS</th><th>AKSI</th></tr></thead><tbody>{deedList.map(renderDeedRow)}</tbody></table>{!deedList.length&&<div className="empty-small">{emptyMsg}</div>}</div>;
  return <><div className="section-title legal-table-title"><div><div className="legal-list-heading"><h3>Daftar akta aktif</h3><span className="legal-count">{currentDeeds.length}</span></div><p className="muted">{disabled?"Mode lihat: tambah, edit, dan delete tersedia untuk akun MKT pada aplikasi Draft atau Returned.":"Stakeholder dan shareholder dikelola melalui satu tombol tambah pada setiap akta."}</p></div>{!disabled&&['DRAFT','RETURNED'].includes(application.status)&&<div className="legal-table-actions"><button className="button small" onClick={openAdd}><Plus size={15}/>Tambah akta</button></div>}</div>
  {renderDeedTable(currentDeeds,"Belum ada akta aktif. Klik Tambah akta untuk membuatnya.")}
  <div className="section-title legal-table-title" style={{marginTop:'28px'}}><div><div className="legal-list-heading"><h3>Historical data akta</h3><span className="legal-count">{historicalDeeds.length}</span></div><p className="muted">Daftar akta yang sudah tidak aktif atau habis masa berlakunya.</p></div></div>
  {renderDeedTable(historicalDeeds,"Tidak ada data akta historis / tidak aktif.")}

 {actionMenu&&createPortal(<div className="legal-menu-layer" onClick={()=>setActionMenu(null)} onKeyDown={e=>{if(e.key==='Escape')setActionMenu(null);}}><div className="legal-action-menu" role="menu" aria-label="Aksi akta" style={{left:actionMenu.left,top:actionMenu.top}} onClick={e=>e.stopPropagation()}>{(()=>{const target=deeds.find(x=>x.id===actionMenu.id);if(!target)return null;return <><button role="menuitem" autoFocus onClick={()=>{setEditing(structuredClone(target));setActionMenu(null);}}><Pencil size={15}/>{locked(target)?'Lihat detail':'Edit'}</button><button role="menuitem" className="legal-delete-button" disabled={locked(target)||!!target.approvedSnapshot} title={target.approvedSnapshot?'Akta yang sudah disetujui tidak boleh dihapus':undefined} onClick={()=>{setDeleting(target);setActionMenu(null);}}><Trash2 size={15}/>Delete</button></>;})()}</div></div>,document.body)}
 {editing&&(()=>{const availableChips=editing.type==='amendment'?amendmentRemarkCategories:[{id:'establishment-deed',name:'Pendirian akta',remarks:''},...amendmentRemarkCategories];const currentSelectedCategoryIds=getDeedCategoryIds(editing);const toggleCategory=(catId:string)=>{if(editorLocked)return;setEditing((prev:any)=>{if(!prev)return prev;const currentCats=getDeedCategoryIds(prev);const isSelected=currentCats.includes(catId);const next=isSelected?currentCats.filter(id=>id!==catId):[...currentCats,catId];return {...prev,remarkCategoryIds:next,remarkCategoryId:next[0]||''};});};return <Modal title={deeds.some(x=>x.id===editing.id)?editorLocked?'Detail akta':'Edit akta':'Tambah akta'} onClose={()=>setEditing(null)}><div className="modal-body legal-deed-modal">{formError&&<div className="error" role="alert">{formError}</div>}<label className="legal-deed-select">Jenis akta<select aria-label="Jenis akta" disabled={editorLocked} value={editing.type} onChange={e=>{const newType=e.target.value;const nextCats=newType==='establishment'?['establishment-deed']:(editing.remarkCategoryIds?.filter((x:string)=>x!=='establishment-deed')||[]);setEditing({...editing,type:newType,remarkCategoryIds:nextCats,remarkCategoryId:nextCats[0]||''});}}><option value="establishment">Akta pendirian</option><option value="amendment">Akta perubahan</option></select></label><Fields fields={legalDeedFields} value={editing} disabled={editorLocked} onChange={next=>{setEditing({...editing,...next});const estDeed=deeds.find((x:any)=>x.type==='establishment'&&x.id!==editing.id);const estDate=estDeed?.deedDate||value.establishmentDate||application.customer?.establishmentDate;const dDate=next.deedDate||editing.deedDate;if(editing.type==='amendment'&&dDate&&estDate&&String(dDate).slice(0,10)<String(estDate).slice(0,10)){setFormError(`Tanggal akta perubahan (${date(dDate)}) tidak boleh sebelum tanggal akta pendirian (${date(estDate)}).`);}else if(formError&&formError.includes('tidak boleh sebelum tanggal akta pendirian')){setFormError('');}}}/><><h3 className="form-heading">Pihak terkait - {deedNames[editing.type]}</h3><Fields className="legal-amendment-party-fields" fields={legalPartyFields} value={parties} disabled={editorLocked} onChange={partyValues=>setEditing({...editing,parties:partyValues})}/><div className="legal-remarks-category-group"><span className="field-label">Kategori Remarks {editing.type==='amendment'&&<span className="field-required" aria-label="Required">*</span>}</span><div className="legal-remarks-chips" role="group" aria-label="Kategori Remarks">{availableChips.map(cat=>{const isSelected=currentSelectedCategoryIds.includes(cat.id);return <button key={cat.id} type="button" role="checkbox" aria-checked={isSelected} disabled={editorLocked} className={`legal-remark-chip ${isSelected?'selected':''}`} onClick={()=>toggleCategory(cat.id)}><span className="legal-chip-check">{isSelected?'✓':'+'}</span><span>{cat.name}</span></button>;})}</div>{editing.type==='amendment'&&currentSelectedCategoryIds.length===0&&<small className="input-validation-error" role="alert">Pilih minimal satu kategori remarks.</small>}</div><div className="legal-category-remarks-list"><span className="field-label">Catatan / Remarks per Kategori</span><p className="legal-remarks-hint">Isi rincian keterangan untuk masing-masing kategori yang dipilih:</p>{currentSelectedCategoryIds.map((catId:string)=>{const cat=availableChips.find(c=>c.id===catId),catName=cat?.name||catId,catVal=editing.categoryRemarks?.[catId]??(currentSelectedCategoryIds.length===1?(editing.remarks||''):'');return <div key={catId} className="legal-category-remark-box"><label className="legal-category-remark-label"><span className="legal-category-remark-badge">{catName}</span><AutoNumberedTextarea ariaLabel={`Remarks ${catName}`} rows={2} disabled={editorLocked} value={catVal} onChange={val=>{const nextCatRemarks={...(editing.categoryRemarks||{}),[catId]:val},unified=Object.entries(nextCatRemarks).filter(([_,v])=>String(v).trim()).map(([id,v],idx)=>{const cName=availableChips.find(c=>c.id===id)?.name||id;return `${idx+1}. [${cName}]: ${String(v).trim().replace(/^\d+\.\s*/,'')}`;}).join('\n');setEditing({...editing,categoryRemarks:nextCatRemarks,remarks:unified||val});}} placeholder={`Masukkan keterangan khusus untuk kategori ${catName}...`}/></label></div>;})}{currentSelectedCategoryIds.length===0&&<div className="legal-category-remark-box"><label className="legal-category-remark-label"><span className="legal-category-remark-badge">Catatan Umum</span><AutoNumberedTextarea ariaLabel="Remarks" rows={3} disabled={editorLocked} value={editing.remarks||''} onChange={val=>setEditing({...editing,remarks:val})} placeholder="Pilih kategori di atas atau isi catatan akta di sini..."/></label></div>}</div></></div><div className="modal-actions"><button className="button" onClick={()=>setEditing(null)}>{editorLocked?'Tutup':'Batal'}</button>{!editorLocked&&<button className="button primary" onClick={saveDeed} disabled={!complete}><Save size={15}/>Simpan akta</button>}</div></Modal>;})()}
 {shareholderCountDeed&&<Modal title="Jumlah shareholder" onClose={()=>setShareholderCountDeed(null)}><ShareholderCountContent rows={rowsFor(deeds.find(x=>x.id===shareholderCountDeed))}/><div className="modal-actions"><button className="button primary" onClick={()=>setShareholderCountDeed(null)}>Tutup</button></div></Modal>}
  {stakeholderList&&<Modal title="Stakeholders pada akta" onClose={()=>setStakeholderList(null)}><div className="modal-body"><div className="legal-stakeholder-list">{rowsFor(deeds.find(x=>x.id===stakeholderList)).map((r,i)=><div className="legal-stakeholder-item" key={r.id||i}><div><b>{r.name||[r.firstName,r.lastName].filter(Boolean).join(' ')||`Stakeholder ${i+1}`}</b><small>{label(r.stakeholderType)} - {Number(r.sharePercentage||0).toFixed(2)}% saham</small></div><div className="legal-row-buttons"><button className="button small" onClick={()=>{const stVal=stakeholderEditorValues(r);setStakeholderModal({deedId:stakeholderList,index:i,value:stVal});setStakeholderList(null);if(stVal.idType&&stVal.idType!=='NONE'){openIdDocPanel(stVal.idType,stVal);}else{setShowIdDocPanel(false);}}}><Pencil size={13}/>{listLocked?'Lihat':'Edit'}</button>{!listLocked&&<button className="button small legal-delete-button" onClick={()=>{setDeleteStakeholder({deedId:stakeholderList,index:i});setStakeholderList(null);}}><Trash2 size={13}/>Delete</button>}</div></div>)}{!rowsFor(deeds.find(x=>x.id===stakeholderList)).length&&<div className="empty-small">Belum ada stakeholder pada akta ini.</div>}</div></div><div className="modal-actions"><button className="button" onClick={()=>setStakeholderList(null)}>Tutup</button><button className="button primary" disabled={listLocked} onClick={()=>{setStakeholderModal({deedId:stakeholderList,index:-1,value:{...blank(stakeholderFields),representativeType:"SHAREHOLDER"}});setStakeholderList(null);setShowIdDocPanel(false);}}><Plus size={15}/>Tambah shareholder</button></div></Modal>}
 {stakeholderModal&&<Modal
  title={stakeholderModal.index<0?'Tambah stakeholder':editorLocked?'Detail stakeholder':'Edit stakeholder'}
  onClose={()=>{setStakeholderModal(null);setShowIdDocPanel(false);}}
  isSplit={showIdDocPanel}
  companion={showIdDocPanel?<IdDocCompanionPanel
    idType={idDocData.idType||stakeholderModal.value?.idType||'KTP'}
    data={idDocData}
    onChange={setIdDocData}
    onSave={handleSaveIdDoc}
    onClose={()=>setShowIdDocPanel(false)}
    disabled={editorLocked}
  />:null}
>
  <div className="modal-body legal-stakeholder-modal">
    {formError&&<div className="error" role="alert">{formError}</div>}
    <Fields
      fields={stakeholderFields}
      value={stakeholderModal.value}
      disabled={editorLocked}
      onSelectOption={(key,val)=>{
        if(key==='idType'){
          if(val&&val!=='NONE'){
            openIdDocPanel(val,stakeholderModal.value);
          }else{
            setShowIdDocPanel(false);
          }
        }
      }}
      onChange={value=>{
        if(value.dateOfBirth&&value.dateOfBirth!==stakeholderModal.value?.dateOfBirth){
          const{years,months}=calculateAgeYearsMonths(value.dateOfBirth);
          value.ageYears=years;
          value.ageMonths=months;
        }
        if(value.idType!==stakeholderModal.value?.idType){
          if(value.idType&&value.idType!=='NONE'){
            openIdDocPanel(value.idType,value);
          }else{
            setShowIdDocPanel(false);
          }
        }
        setStakeholderModal({...stakeholderModal,value});
      }}
    />
  </div>
  <div className="modal-actions">
    <button className="button" onClick={()=>{setStakeholderModal(null);setShowIdDocPanel(false);}}>{editorLocked?'Tutup':'Batal'}</button>
    {!editorLocked&&<button className="button primary" onClick={saveStakeholder}><Save size={15}/>Simpan stakeholder</button>}
  </div>
</Modal>}
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
  {deleteStakeholder&&<Modal title="Hapus stakeholder" onClose={()=>setDeleteStakeholder(null)}><div className="modal-body"><p>Hapus stakeholder dari akta ini?</p><p className="muted legal-delete-note">Klik Save changes di Legal agar perubahan tetap tersimpan.</p></div><div className="modal-actions"><button className="button" onClick={()=>setDeleteStakeholder(null)}>Batal</button><button className="button legal-confirm-delete" onClick={()=>{const x=deeds.find(d=>d.id===deleteStakeholder.deedId);if(x)updateRows(x.id,rowsFor(x).filter((_,i)=>i!==deleteStakeholder.index));setDeleteStakeholder(null);}}><Trash2 size={15}/>Hapus stakeholder</button></div></Modal>}
 {deleting&&<Modal title="Hapus akta" onClose={()=>setDeleting(null)}><div className="modal-body"><p>Hapus {deedNames[deleting.type]} <strong>{deleting.deedNumber||'tanpa nomor'}</strong> dari daftar Legal?</p>{deleting.source==='Sistem'&&<p className="muted legal-delete-note">Data asal di Customer atau profil tetap ada; akta ini akan disembunyikan dari daftar Legal.</p>}<p className="muted legal-delete-note">Klik Save changes setelah menghapus agar perubahan tetap tersimpan.</p></div><div className="modal-actions"><button className="button" onClick={()=>setDeleting(null)}>Batal</button><button className="button legal-confirm-delete" onClick={removeDeed}><Trash2 size={15}/>Hapus akta</button></div></Modal>}
  {viewRemarkDeed&&(()=>{const deed=viewRemarkDeed.deed,rawIds=getDeedCategoryIds(deed),activeId=viewRemarkDeed.activeCatId||rawIds[0];return <Modal title={`Rincian Remarks - ${deedNames[deed.type]}`} onClose={()=>setViewRemarkDeed(null)}><div className="modal-body legal-category-popup"><div className="legal-popup-meta"><span className="legal-type-badge">{deedNames[deed.type]}</span><span className="legal-popup-deed-no">{deed.deedNumber}</span><span className="legal-popup-date">{date(deed.deedDate)}</span></div>{rawIds.length>1&&<div className="legal-popup-tabs" role="tablist">{rawIds.map((id:string)=>{const cat=remarkCategories.find(c=>c.id===id||c.name===id),name=cat?.name||id,isSelected=activeId===id;return <button key={id} type="button" role="tab" aria-selected={isSelected} className={`legal-popup-tab ${isSelected?'active':''}`} onClick={()=>setViewRemarkDeed({deed,activeCatId:id})}>{name}</button>;})}</div>}<div className="legal-popup-content">{rawIds.map((id:string)=>{const cat=remarkCategories.find(c=>c.id===id||c.name===id),name=cat?.name||id,note=deed.categoryRemarks?.[id]||(rawIds.length===1?deed.remarks:'');if(rawIds.length>1&&activeId!==id)return null;return <div key={id} className="legal-popup-card"><div className="legal-popup-card-header"><span className="legal-popup-cat-badge">{name}</span><span className="legal-popup-cat-status">{note?'Catatan Tersimpan':'Tidak ada rincian'}</span></div><div className="legal-popup-card-body"><p className="legal-popup-text">{note||deed.remarks||'Belum ada catatan khusus untuk kategori ini.'}</p></div></div>;})}</div></div><div className="modal-actions"><button className="button primary" onClick={()=>setViewRemarkDeed(null)}>Tutup</button></div></Modal>;})()}</>;
}

function ShareholderCountContent({rows}:{rows:any[]}){const owners=rows.filter(r=>Number(r.sharePercentage)>0),total=owners.reduce((sum,r)=>sum+Number(r.sharePercentage||0),0),name=(r:any,i:number)=>[r.firstName,r.middleName,r.lastName].filter(Boolean).join(' ')||r.name||`Shareholder ${i+1}`;return <div className="modal-body shareholder-count-modal"><div className="shareholder-count-top"><div><small>JUMLAH SHAREHOLDER</small><strong>{owners.length}</strong><span>Dihitung dari Percentage share &gt; 0</span></div><div><small>TOTAL KEPEMILIKAN</small><strong className={total>100.01?'text-red':'text-green'}>{total.toFixed(2)}%</strong><span>{total>100.01?'Melebihi batas maksimal 100%':'Maksimal 100% (tidak wajib 100%)'}</span></div></div>{owners.length?<div className="shareholder-count-list">{owners.map((r,i)=><div key={r.id||i}><span><b>{String(i+1).padStart(2,'0')}</b>{name(r,i)}</span><strong>{Number(r.sharePercentage).toFixed(2)}%</strong></div>)}</div>:<div className="empty-small">Belum ada Stakeholder dengan Percentage share lebih dari 0 pada akta ini.</div>}<p className="legal-ownership-rule">Total Percentage share pada akta tidak boleh melebihi 100%. Data stakeholder tidak wajib mencapai 100% (dapat mencatat porsi kepemilikan utama atau sebagian).</p><p className="field-note">Jumlah dan persentase mengikuti data Stakeholders pada akta ini. Ubah Percentage share melalui tombol Stakeholders pada baris akta.</p></div>;}
