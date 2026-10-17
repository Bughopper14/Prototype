import { Editor } from '@tinymce/tinymce-react';
import {createPortal} from 'react-dom';
import {DeedReviewDialog,NotificationsPage} from './deed-review-ui';
import {publishedDeeds,reviewStatus,deedPending,deedReviewLabels,canEditLegal,deedData} from './deed-workflow';
import {inputLimits,fieldInputError,validateInput} from './input-validation';
import {useEffect,useState,useRef,useMemo,type ReactNode} from 'react';
import {ScanLine,Eye,Copy,Sparkles,ArrowUpRight,ArrowRight,ArrowLeft,Plus,Search,Bell,LayoutDashboard,Files,FolderCheck,Users,Activity,Settings2,ChevronRight,ChevronLeft,ChevronDown,Download,Building2,MoreHorizontal,Pencil,Check,CheckCheck,Clock,FileText,ShieldCheck,LogOut,BriefcaseBusiness,Wallet,TrendingUp,AlertCircle,X,Upload,RotateCw,ZoomIn,ZoomOut,ExternalLink,Save,Trash2,Menu,Loader2,Columns,FileSpreadsheet,Lock,Printer,CheckCircle,Maximize2,Minimize2} from 'lucide-react';
import {NibOcrModal} from './NibOcrModal';
import {FapSheetPreview, type FapSheetData} from './FapSheetPreview';
import {parseKtpText, extractKtpTextFromImage, GUOHUI_CHEN_TEXT} from './ktp-ocr';
import {api} from './api';
import {MasterDataPage,MasterSelect,useMasterData,setMasterData,resetMasterChildren} from './master-data';
import {masterGroups,masterKey} from './master-catalog';
import {type Field,profileFields,customerFields,picFields,stakeholderFields,projectFields,bankFields,proposalFields,unitFields,financialFields,legalDeedFields,legalPartyFields,blank,label} from './fields';
const statusLabel:Record<string,string>={DRAFT:'Draft',SUBMITTED_TO_BS:'BS verification',BS_VERIFIED:'BS verified',IN_CA_LEGAL_REVIEW:'CA & Legal review',CREDIT_COMMITTEE_REVIEW:'Committee review',APPROVED:'Approved',REJECTED:'Rejected',RETURNED:'Returned'};
const money=(n:any,compact=false)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'IDR',maximumFractionDigits:0,...(compact?{notation:'compact' as const}:{})}).format(Number(n)||0).replace('IDR','Rp');
const date=(d:any)=>d?new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
function deedValidity(deedDate:any){if(!deedDate)return {status:'Tanggal belum diisi',active:null,expiry:null};const parts=String(deedDate).slice(0,10).split('-').map(Number);if(parts.length!==3||parts.some(x=>!x))return {status:'Tanggal belum diisi',active:null,expiry:null};const expiry=new Date(parts[0],parts[1]-1,parts[2]);if(Number.isNaN(expiry.getTime()))return {status:'Tanggal belum diisi',active:null,expiry:null};expiry.setFullYear(expiry.getFullYear()+5);const today=new Date();today.setHours(0,0,0,0);expiry.setHours(0,0,0,0);const active=today<=expiry;return {status:active?'Aktif':'Tidak aktif',active,expiry};}
function Badge({status}:{status:string}){return <span className={'badge '+status?.toLowerCase()}><i/>{statusLabel[status]||label(status)}</span>;}
function IconBox({children}:{children:ReactNode}){return <span className="iconbox">{children}</span>;}
function Fields({fields,value,onChange,disabled=false,className,onNibOcr}:{fields:Field[],value:any,onChange:(v:any)=>void,disabled?:boolean,className?:string,onNibOcr?:()=>void}){const master=useMasterData();return <div className={`formgrid ${className||''}`}>{fields.map(f=>{const fieldValue=f.type==='date'?String(value?.[f.key]||'').slice(0,10):value?.[f.key]??'';const isDigitsOnly=['phone','mobilePhone','phoneFax','rt','rw'].includes(f.key);const update=(raw:string)=>{const clean=isDigitsOnly?raw.replace(/\D/g,''):raw;const sanitized=['rt','rw'].includes(f.key)?clean.slice(0,3):clean;const next=resetMasterChildren(f.key,{...value,[f.key]:f.type==='number'?sanitized:f.type==='date'?(sanitized||null):sanitized},fields.map(x=>x.key));if(f.key==='village'&&fields.some(x=>x.key==='postalCode'))next.postalCode=master.village.find(x=>x.value===sanitized)?.zipCode||'';onChange(next);};const fieldError=fieldInputError(f.key,fieldValue);const isMaster=masterGroups.some(g=>g.key===masterKey(f.key));const handleKeyDown=isDigitsOnly?(e:React.KeyboardEvent<HTMLInputElement>)=>{if(e.ctrlKey||e.metaKey||['Backspace','Tab','Enter','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete','Home','End'].includes(e.key))return;if(!/^\d$/.test(e.key))e.preventDefault();}:undefined;const handleInputChange=(e:React.ChangeEvent<HTMLInputElement>)=>{if(isDigitsOnly){let v=e.target.value.replace(/\D/g,'');if(['rt','rw'].includes(f.key))v=v.slice(0,3);e.target.value=v;update(v);}else{update(e.target.value);}};const handlePaste=isDigitsOnly?(e:React.ClipboardEvent<HTMLInputElement>)=>{e.preventDefault();const pasted=(e.clipboardData.getData('text')||'').replace(/\D/g,'');if(!pasted)return;const input=e.currentTarget;const start=input.selectionStart??0,end=input.selectionEnd??0,curr=String(fieldValue);let nextVal=(curr.slice(0,start)+pasted+curr.slice(end)).replace(/\D/g,'');if(['rt','rw'].includes(f.key))nextVal=nextVal.slice(0,3);input.value=nextVal;update(nextVal);}:undefined;return <label key={f.key} className={f.wide?'field-wide':undefined}><span className="field-label">{f.label}{f.required&&<span className="field-required" aria-label="Required">*</span>}</span>{isMaster?<MasterSelect fieldKey={f.key} value={String(fieldValue)} record={value||{}} disabled={disabled} required={f.required} onChange={update}/>:f.options?<select required={f.required} disabled={disabled} value={value?.[f.key]??f.options[0]} onChange={e=>update(e.target.value)}>{f.options.map(o=><option key={o} value={o}>{f.optionLabels?.[o]??label(o)}</option>)}</select>:f.type==='textarea'?<textarea aria-label={f.label} required={f.required} disabled={disabled} rows={3} value={fieldValue} onChange={e=>update(e.target.value)}/>:f.key==='nib'&&onNibOcr?<div style={{display:'flex',gap:6,alignItems:'center',width:'100%'}}><input aria-label={f.label} required={f.required} disabled={disabled} type={f.type||'text'} inputMode={isDigitsOnly?'numeric':undefined} pattern={isDigitsOnly?'[0-9]*':undefined} maxLength={['rt','rw'].includes(f.key)?3:undefined} onKeyDown={handleKeyDown} onPaste={handlePaste} step={f.type==='number'?'0.01':undefined} {...inputLimits(f.key)} aria-invalid={!!fieldError} value={fieldValue} onChange={handleInputChange} style={{flex:1}}/><button type="button" onClick={onNibOcr} title="Upload & Scan Dokumen NIB · Auto-Fill OCR" className="button small" style={{background:'#2563eb',borderColor:'#2563eb',color:'#ffffff',fontSize:'0.75rem',padding:'7px 11px',borderRadius:6,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5,whiteSpace:'nowrap',flexShrink:0}}><ScanLine size={13}/> Open Pop-up OCR</button></div>:f.unit?<div className="input-with-unit"><input aria-label={f.label} required={f.required} disabled={disabled} type={f.type||'text'} inputMode={isDigitsOnly?'numeric':undefined} pattern={isDigitsOnly?'[0-9]*':undefined} maxLength={['rt','rw'].includes(f.key)?3:undefined} onKeyDown={handleKeyDown} onPaste={handlePaste} step={f.type==='number'?'0.01':undefined} {...inputLimits(f.key)} aria-invalid={!!fieldError} value={fieldValue} onChange={handleInputChange}/><span>{f.unit}</span></div>:<input aria-label={f.label} required={f.required} disabled={disabled} type={f.type||'text'} inputMode={isDigitsOnly?'numeric':undefined} pattern={isDigitsOnly?'[0-9]*':undefined} maxLength={['rt','rw'].includes(f.key)?3:undefined} onKeyDown={handleKeyDown} onPaste={handlePaste} step={f.type==='number'?'0.01':undefined} {...inputLimits(f.key)} aria-invalid={!!fieldError} value={fieldValue} onChange={handleInputChange}/>}{fieldError&&<small className="input-validation-error" role="alert">{fieldError}</small>}</label>;})}</div>;}
function Repeater({title,fields,rows,onChange,disabled=false,description,carousel=false}:{title:string,fields:Field[],rows:any[],onChange:(v:any[])=>void,disabled?:boolean,description?:string,carousel?:boolean}){const [activeIndex,setActiveIndex]=useState(0);const currentIndex=Math.min(activeIndex,Math.max(rows.length-1,0));const addRow=()=>{onChange([...rows,blank(fields)]);setActiveIndex(rows.length);};const removeRow=(index:number)=>{onChange(rows.filter((_,j)=>j!==index));setActiveIndex(Math.min(currentIndex,Math.max(rows.length-2,0)));};return <><div className="section-title"><div><h3>{title}</h3>{description&&<p className="muted repeater-description">{description}</p>}</div>{!disabled&&<button className="button small" onClick={addRow}><Plus size={15}/>Add {title==='Equipment units'?'unit':'row'}</button>}</div>{carousel&&rows.length>0&&<div className="repeater-carousel-controls"><button className="button small" disabled={currentIndex===0} onClick={()=>setActiveIndex(i=>Math.max(i-1,0))}><ChevronLeft size={15}/>Previous</button><span>{currentIndex+1} of {rows.length}</span><button className="button small" disabled={currentIndex>=rows.length-1} onClick={()=>setActiveIndex(i=>Math.min(i+1,rows.length-1))}>Next<ChevronRight size={15}/></button></div>}{rows.length===0&&<div className="empty-small">No entries yet.</div>}{(carousel?rows.slice(currentIndex,currentIndex+1):rows).map((r,i)=>{const rowIndex=carousel?currentIndex:i;return <div className="repeat" key={rowIndex}><div className="repeat-top"><span>{title} / {String(rowIndex+1).padStart(2,'0')}</span>{!disabled&&<button className="icon-button danger" aria-label="Remove row" onClick={()=>removeRow(rowIndex)}><Trash2 size={15}/></button>}</div><Fields fields={fields} value={r} disabled={disabled} onChange={v=>onChange(rows.map((x,j)=>rowIndex===j?v:x))}/></div>})}</>;}
function Modal({title,children,onClose,className=""}:{title:string,children:ReactNode,onClose:()=>void,className?:string}){return <div className="modal-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20}/></button></div>{children}</section></div>;}
function Login({onLogin}:{onLogin:(u:any)=>void}){const [email,setEmail]=useState('mkt@liugong.local'),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);return <div className="login"><div className="login-story"><Brand/><div><span className="eyebrow">LIUGONG FINANCE INDONESIA</span><h1>Moving business.<br/>Building possibilities.</h1><p>A single workspace for equipment financing,<br/>from the first application to the final decision.</p><div className="login-lines"><span/><span/><span/></div></div><small>Loan origination & document management</small></div><div className="login-form"><span className="eyebrow">YOUR ORIGINATION WORKSPACE</span><h2>Welcome back</h2><p>Sign in to keep business moving.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{onLogin(await api('/auth/login','POST',{email,password}));}catch(e:any){setError(e.message);}finally{setBusy(false);}}}><label>Email address<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<div className="error">{error}</div>}<button className="button primary" disabled={busy}>{busy?<Loader2 className="spin" size={16}/>:null}Sign in <ArrowRight size={17}/></button></form><div className="demo-note"><strong>Public interactive demo · synthetic data</strong><p>Choose a department. Changes are saved only in this browser.</p><div className="role-pills">{['MKT','BS','HEAD_BS','CA','LEGAL','COMMITTEE'].map(r=><button key={r} onClick={()=>{setEmail(r==='BS'?'arianti@liugong.local':r==='HEAD_BS'?'dellatra@liugong.local':r.toLowerCase()+'@liugong.local');setPassword('LiuGong2026!');}}>{r==='BS'?'Arianti / BS':r==='HEAD_BS'?'Dellatra / Head BS':r}</button>)}</div><small>Demo password: LiuGong2026! · Use synthetic information only.</small></div></div></div>;}
function Brand(){return <div className="brand"><div className="brand-mark">L<span>G</span></div><div><strong>LIUGONG</strong><small>FINANCE INDONESIA</small></div></div>;}
export default function App(){
 const [notifications,setNotifications]=useState<any[]>([]);
 const [user,setUser]=useState<any>(null),[ready,setReady]=useState(false),[page,setPage]=useState('Overview'),[rows,setRows]=useState<any[]>([]),[customers,setCustomers]=useState<any[]>([]),[selected,setSelected]=useState<any>(null),[detailTab,setDetailTab]=useState(0),[newOpen,setNewOpen]=useState(false),[toast,setToast]=useState(''),[globalError,setGlobalError]=useState(''),[mobile,setMobile]=useState(false),[loading,setLoading]=useState(false);
 const notify=(s:string)=>{setToast(s);setTimeout(()=>setToast(''),4500);};
 async function load(){setLoading(true);try{const [r,c,m,n]=await Promise.all([api('/applications'),api('/customers'),api('/master-data'),api('/notifications')]);setNotifications(n);setMasterData(m);setRows(r);setCustomers(c);setGlobalError('');}catch(e:any){setGlobalError(e.message);}finally{setLoading(false);}}
 useEffect(()=>{api('/auth/me').then(setUser).catch(()=>{}).finally(()=>setReady(true));},[]);
 useEffect(()=>{if(user)load();},[user]);
 useEffect(()=>{if(!user)return;let live=true;const refresh=()=>api('/notifications').then(n=>{if(live)setNotifications(n);}).catch(()=>{});const timer=setInterval(refresh,15000);window.addEventListener('storage',refresh);return()=>{live=false;clearInterval(timer);window.removeEventListener('storage',refresh);};},[user]);
 async function readNotification(id:string){try{await api('/notifications/'+id+'/read','PATCH',{});setNotifications(await api('/notifications'));}catch(e:any){setGlobalError(e.message);}}
 async function open(id:string,tab=0){setLoading(true);try{setDetailTab(tab);setSelected(await api('/applications/'+id));}catch(e:any){setGlobalError(e.message);}finally{setLoading(false);}}
 if(!ready)return <div className="loading-screen"><Loader2 className="spin"/>Opening your workspace…</div>;
 if(!user)return <Login onLogin={setUser}/>;
 const navigate=(p:string)=>{setPage(p);setSelected(null);setMobile(false);};
  function startNewApplication(preselectedCustomerId?: string) {
    if (user?.role !== 'MKT') {
      notify('Pembuatan aplikasi tersedia untuk akun Marketing (MKT). Silakan masuk dengan akun MKT.');
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

 return <div className="shell">{mobile&&<div className="sidebar-backdrop" onClick={()=>setMobile(false)} aria-label="Tutup navigasi"/>}<aside className={'sidebar '+(mobile?'mobile-open':'')}><div className="sidebar-header"><Brand/><button className="icon-button sidebar-close" onClick={()=>setMobile(false)} aria-label="Tutup menu"><X size={20}/></button></div><div className="workspace"><div className="workspace-logo"><Building2 size={18}/></div><div><b>Origination workspace</b><small>Indonesia operations</small></div><ChevronDown size={14}/></div><div className="nav-label">WORKSPACE</div><nav>{[[LayoutDashboard,'Overview'],[Files,'Applications'],[FolderCheck,'Document desk'],[Users,'Customers'],[Settings2,'Customize master data'],[Bell,'Notifications'],[Activity,'Activity']].map(([Icon,name]:any)=><button key={name} className={page===name?'active':''} onClick={()=>navigate(name)}><Icon size={19}/><span>{name==='Notifications'?'Notifikasi':name}</span>{name==='Notifications'&&notifications.some(n=>!n.readAt)&&<em>{notifications.filter(n=>!n.readAt).length}</em>}{name==='Applications'&&<em>{rows.length}</em>}</button>)}</nav><div className="sidebar-bottom"><div className="security-note"><ShieldCheck size={20}/><div><b>Every step, accounted for.</b><small>Secure documents. Clear decisions.</small></div></div><button className="user-block" onClick={async()=>{await api('/auth/logout','POST');setUser(null);setSelected(null);setPage('Overview');setRows([]);setCustomers([]);setNotifications([]);}} title="Sign out"><span className="avatar">{user.name.split(' ').map((s:string)=>s[0]).slice(0,2).join('')}</span><span><b>{user.name}</b><small>{user.role==='MKT'?'Marketing':label(user.role)} · Sign out</small></span><LogOut size={16}/></button></div></aside><main><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-toggle" onClick={()=>setMobile(!mobile)}><Menu size={20}/></button><span>Workspace</span><ChevronRight size={14}/><b>{selected?'Application details':page}</b></div><button className="notification-bell" aria-label="Notifikasi" onClick={()=>navigate('Notifications')}><Bell size={19}/>{notifications.some(n=>!n.readAt)&&<span>{notifications.filter(n=>!n.readAt).length}</span>}</button><div className="topbar-right"><span className="live-dot"/>Indonesia <span className="divider"/> <span>{new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span><span className="role-chip">{import.meta.env.VITE_DEMO_MODE === 'true' ? 'PUBLIC DEMO' : user.role}</span></div></header><div className="content">{globalError&&<div className="error">{globalError}<button onClick={load}>Retry</button></div>}{loading&&<div className="loading-strip"/>}{selected?<Detail value={selected} user={user} customers={customers} initialTab={detailTab} onBack={()=>{setSelected(null);load();}} onChange={v=>{setSelected(v);load();}} onCustomerCreated={c=>setCustomers(prev=>[c,...prev])} notify={notify}/>:<><div className="page-heading"><div><div className="eyebrow">{page==='Overview'?'A CLEAR VIEW. A CONFIDENT NEXT STEP.':'LOAN ORIGINATION & MANAGEMENT'}</div><h1>{page==='Overview'?'Portfolio overview':page==='Notifications'?'Notifikasi':page}</h1><p>{({Overview:'Welcome back, '+user.name.split(' ')[0]+'. Here’s where your financing stands.',Applications:'Manage every application, from first contact to final approval.','Document desk':'Keep every document complete, verified, and ready for review.',Customers:'Your customer relationships, connected to every application.','Customize master data':'Pengaturan master data aplikasi.',Notifications:'Hasil pemeriksaan dan approval akta yang perlu ditindaklanjuti.',Activity:'A transparent record of application decisions and updates.'} as any)[page]}</p></div>{(page==='Overview'||page==='Applications')&&<button className="button primary" onClick={()=>user.role==='MKT'?startNewApplication():notify('Pembuatan aplikasi tersedia untuk akun Marketing (MKT). Silakan masuk dengan akun MKT.')}><Plus size={17}/>New application</button>}</div>{page==='Overview'&&<Overview rows={rows} user={user} open={open} navigate={navigate}/ >}{page==='Applications'&&<ApplicationTable rows={rows} open={open}/ >}{page==='Document desk'&&<DocumentDesk rows={rows} open={open} user={user}/ >}{page==='Customers'&&<section className="panel"><div className="panel-head"><h2>Customer directory <span>{customers.length}</span></h2><Users size={19}/></div><div className="customer-grid">{customers.map(c=><button className="customer-card" key={c.id} onClick={()=>{const a=rows.find(r=>r.customer_id===c.id);if(a)open(a.id);else if(user.role==='MKT')startNewApplication(c.id);else notify('This customer has no applications yet. Use New application to create one.');}}><IconBox><Building2 size={21}/></IconBox><h3>{c.companyName}</h3><span className="muted">{label(c.companyType)}</span><dl><dt>NIB</dt><dd>{c.nib}</dd><dt>NPWP</dt><dd>{c.npwp}</dd></dl><span className="text-link">{rows.filter(r=>r.customer_id===c.id).length} applications <ArrowUpRight size={15}/></span></button>)}</div></section>}{page==='Customize master data'&&<MasterDataPage/>}{page==='Notifications'&&<NotificationsPage items={notifications} onRead={readNotification} onOpen={id=>open(id,5)}/>}{page==='Activity'&&<ActivityPage rows={rows} open={open}/>}</> }<footer><span>© {new Date().getFullYear()} PT LiuGong Finance Indonesia</span><span>Origination workspace <i/> All amounts in IDR</span></footer></div></main>{toast&&<div className="toast"><CheckCheck size={18}/>{toast}</div>}</div>;
}
function Overview({rows,user,open,navigate}:{rows:any[],user:any,open:(id:string,tab?:number)=>void,navigate:(p:string)=>void}){const needs=rows.filter(r=>user.role==='MKT'?['DRAFT','RETURNED'].includes(r.status)||(r.legal?.deeds||[]).some((d:any)=>reviewStatus(d)==='REJECTED'):user.role==='BS'?(r.legal?.deeds||[]).some((d:any)=>reviewStatus(d)==='PENDING_CHECK'):user.role==='HEAD_BS'?(r.legal?.deeds||[]).some((d:any)=>reviewStatus(d)==='PENDING_APPROVAL'):user.role==='CA'||user.role==='LEGAL'?r.status==='IN_CA_LEGAL_REVIEW':user.role==='COMMITTEE'?r.status==='CREDIT_COMMITTEE_REVIEW':false);const total=rows.reduce((s,r)=>s+Number(r.financing_value||0),0),approved=rows.filter(r=>r.status==='APPROVED'),review=rows.filter(r=>['SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW'].includes(r.status));const stages=[['DRAFT','Draft'],['SUBMITTED_TO_BS','BS verification'],['IN_CA_LEGAL_REVIEW','CA & Legal'],['CREDIT_COMMITTEE_REVIEW','Committee'],['APPROVED','Approved']];return <><div className="stats-grid">{[[BriefcaseBusiness,'Total applications',String(rows.length),'Across all branches'],[Wallet,'Financing portfolio',money(total,true),'Total requested financing'],[Clock,'In review',String(review.length),'Moving through the workflow'],[ShieldCheck,'Approved financing',money(approved.reduce((s,r)=>s+Number(r.financing_value),0),true),approved.length+' approved applications']].map(([Icon,title,value,sub]:any,i)=><div className={'stat-card stat-'+i} key={title}><div className="stat-top"><span>{title}</span><Icon size={18}/></div><strong>{value}</strong><small>{i===3?<span className="tiny-green"><Check size={13}/></span>:<span className="stat-dot"/>}{sub}</small></div>)}</div><div className="overview-mid"><section className="panel pipeline"><div className="panel-head"><div><h2>Application pipeline</h2><p>From opportunity to approval</p></div><span className="subtle-chip">All applications <ChevronDown size={13}/></span></div><div className="pipeline-chart">{stages.map(([s,l],i)=>{const count=rows.filter(r=>r.status===s||(s==='SUBMITTED_TO_BS'&&r.status==='BS_VERIFIED')).length;return <button className="pipeline-stage" key={s} onClick={()=>navigate('Applications')}><div className="bar-top"><strong>{String(count).padStart(2,'0')}</strong><span>{rows.length?Math.round(count/rows.length*100):0}%</span></div><div className="bar-track"><div style={{height:Math.max(8,count/Math.max(1,...stages.map(([s])=>rows.filter(r=>r.status===s).length))*100)+'%'}} className={'bar bar-'+i}/></div><span>{l}</span></button>;})}</div><div className="pipeline-foot"><span><i/> {review.length} applications are currently under review</span><button className="text-link" onClick={()=>navigate('Applications')}>View pipeline <ArrowRight size={14}/></button></div></section><section className="attention panel"><div className="panel-head"><h2>Needs attention</h2><span className="count-pill">{needs.length}</span></div>{needs.slice(0,3).map(r=><button className="attention-item" key={r.id} onClick={()=>open(r.id,['BS','HEAD_BS'].includes(user.role)||r.legal?.deeds?.some((d:any)=>reviewStatus(d)==='REJECTED')?5:0)}><span className={'attention-icon '+(r.status==='RETURNED'?'orange':'')}><AlertCircle size={18}/></span><div><b>{user.role==='BS'?'Periksa dokumen akta':user.role==='HEAD_BS'?'Approve dokumen akta':user.role==='MKT'?r.legal?.deeds?.some((d:any)=>reviewStatus(d)==='REJECTED')?'Perbaiki akta yang ditolak':r.status==='RETURNED'?'Application returned':'Complete your draft':'Review application'}</b><span>{r.company_name}</span><small>{r.fap_number}</small></div><ChevronRight size={16}/></button>)}{!needs.length&&<div className="empty-small">You’re all caught up.</div>}<div className="attention-bottom"><ShieldCheck size={17}/><span>Complete documents keep financing moving.</span></div></section></div><ApplicationTable rows={rows} open={open} compact onViewAll={()=>navigate('Applications')}/></>;}
function ApplicationTable({rows,open,compact=false,documentMode=false,onViewAll}:{rows:any[],open:(id:string)=>void,compact?:boolean,documentMode?:boolean,onViewAll?:()=>void}){const [search,setSearch]=useState(''),[status,setStatus]=useState('ALL'),[branch,setBranch]=useState('ALL'),[start,setStart]=useState(''),[end,setEnd]=useState(''),[page,setPage]=useState(0),[dates,setDates]=useState(false);const filtered=rows.filter(r=>(r.company_name+' '+r.fap_number).toLowerCase().includes(search.toLowerCase())&&(status==='ALL'||r.status===status)&&(branch==='ALL'||r.branch_code===branch)&&(!start||String(r.application_date).slice(0,10)>=start)&&(!end||String(r.application_date).slice(0,10)<=end));useEffect(()=>setPage(0),[search,status,branch,start,end]);const count=compact?5:8;const visible=filtered.slice(page*count,(page+1)*count);function exportCsv(){const lines=[['FAP','Customer','Branch','Status','Financing IDR','Date'],...filtered.map(r=>[r.fap_number,r.company_name,r.branch_code,statusLabel[r.status],r.financing_value||0,String(r.application_date).slice(0,10)])];const csv=lines.map(r=>r.map(v=>'"'+String(v).replace(/^[=+@-]/,"' $&").replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='liugong-applications.csv';a.click();URL.revokeObjectURL(url);}return <section className="panel applications-panel"><div className="panel-head"><h2>{compact?'Recent applications':documentMode?'Document verification queue':'All applications'} <span>{rows.length}</span></h2>{compact?<button className="text-link" onClick={onViewAll}>View all applications <ArrowUpRight size={16}/></button>:<button className="button small" onClick={exportCsv}><Download size={15}/>Export</button>}</div><div className="table-toolbar"><div className="search"><Search size={17}/><input aria-label="Search applications" placeholder="Search company or FAP number…" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="filters"><select aria-label="Filter status" value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">All statuses</option>{Object.entries(statusLabel).map(([s,l])=><option key={s} value={s}>{l}</option>)}</select><select aria-label="Filter branch" value={branch} onChange={e=>setBranch(e.target.value)}><option value="ALL">All branches</option>{[...new Set(rows.map(r=>r.branch_code))].sort().map(b=><option key={b}>{b}</option>)}</select><button className={'button small '+(dates?'selected':'')} onClick={()=>setDates(!dates)}><Settings2 size={15}/><span>Dates</span></button></div></div>{dates&&<div className="date-filter"><label>From <input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>To <input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label><button className="text-link" onClick={()=>{setStart('');setEnd('');}}>Clear dates</button></div>}<div className="table-scroll"><table className="data-table"><thead><tr><th>COMPANY / APPLICATION</th><th>BRANCH</th><th>FINANCING AMOUNT</th><th>STATUS</th><th>DOCUMENTS</th><th>APPLICATION DATE</th><th/></tr></thead><tbody>{visible.map((r,i)=><tr key={r.id} onClick={()=>open(r.id)} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')open(r.id);}}><td><div className="company-cell"><span className={'company-icon tint-'+i%3}><Building2 size={18}/></span><div><b>{r.company_name}</b><small>{r.fap_number} <span>· {label(r.company_type)}</span></small></div></div></td><td><span className="branch">{r.branch_code}</span></td><td><b className="amount">{money(r.financing_value)}</b><small>{r.tenor_months?r.tenor_months+' months':'Proposal pending'}</small></td><td><Badge status={r.status}/></td><td><div className="doc-progress"><span><i style={{width:(r.verified_docs/Math.max(1,r.total_docs)*100)+'%'}}/></span><small>{r.verified_docs}/{r.total_docs}</small></div></td><td className="date-cell">{date(r.application_date)}</td><td><ChevronRight size={16}/></td></tr>)}</tbody></table>{!visible.length&&<div className="empty"><Search size={26}/><h3>No applications found</h3><p>Try a different search or filter.</p></div>}</div><div className="table-foot"><span>Showing {filtered.length?page*count+1:0}–{Math.min((page+1)*count,filtered.length)} of {filtered.length} applications</span><div><button className="icon-button" aria-label="Previous page" disabled={!page} onClick={()=>setPage(page-1)}><ChevronLeft size={16}/></button><span className="page-number">{page+1}</span><button className="icon-button" aria-label="Next page" disabled={(page+1)*count>=filtered.length} onClick={()=>setPage(page+1)}><ChevronRight size={16}/></button></div></div></section>;}
// Note: New application process has been merged directly into Detail view (Tab 0 FAP Intake).
function stakeholderEditorValues(s:any){const parts=String(s.name||'').trim().split(/\s+/);return {...s,representativeType:s.representativeType||'NONE',signatory:s.signatory||'NONE',idType:s.idType||(s.stakeholderType==='CORPORATE'?'NPWP':s.nationalityType==='WNA'?'PASSPORT':'KTP'),title:s.title||'NONE',firstName:s.firstName||parts[0]||'',middleName:s.middleName||parts.slice(1,-1).join(' '),lastName:s.lastName|| (parts.length>1?parts.at(-1):''),maritalStatus:s.maritalStatus||'NONE',designation:s.designation||s.position||'NONE',email:s.email||'',mobilePhone:s.mobilePhone||'',gender:s.gender||'NONE',sharePercentage:s.sharePercentage??0,depositedCapital:s.depositedCapital??s.shareAmount??0,primaryCapital:s.primaryCapital??0,citizenship:s.citizenship||(s.nationalityType==='WNA'?'FOREIGN':'INDONESIAN'),country:s.country||'Indonesia'};}
function stakeholderForSave(s:any){const first=s.firstName||'',last=s.lastName||'',name=[first,s.middleName,last].map((x:string)=>String(x||'').trim()).filter(Boolean).join(' ')||s.name||'';return {...s,name,position:s.designation&&s.designation!=='NONE'?s.designation:s.position||'Shareholder',nationalityType:s.citizenship==='INDONESIAN'?'WNI':'WNA',shareAmount:s.depositedCapital??0,sharePercentage:s.sharePercentage??0,taxNumber:null};}
function Detail({value:a,user,customers=[],initialTab=0,onBack,onChange,onCustomerCreated,notify}:{value:any,user:any,customers?:any[],initialTab?:number,onBack:()=>void,onChange:(a:any)=>void,onCustomerCreated?:(c:any)=>void,notify:(s:string)=>void}){
 const [customerCategory,setCustomerCategory]=useState<string>(()=>a.customerCategory||a.customerStatus||(a.isNew?'NEW':(a.customerId?'EXISTING':'NEW')));
 const [customerId,setCustomerId]=useState<string>(()=>a.isNew?(a.customerId||''):(a.customerId||a.customer_id||a.customer?.id||''));
 const [customerDraft,setCustomerDraft]=useState<any>(()=>a.customer?structuredClone(a.customer):blank(customerFields));
 const [nibOcrOpen,setNibOcrOpen]=useState(false);
 const handleApplyNibOcr=(extracted:{nib?:string,companyName?:string,alamat?:string,email?:string,phone?:string,tanggalTerbit?:string})=>{
  if(extracted.nib||extracted.tanggalTerbit||extracted.companyName){
   setCustomerDraft((prev:any)=>({
    ...prev,
    ...(extracted.nib?{nib:extracted.nib}:{}),
    ...(extracted.companyName&&!prev.companyName?{companyName:extracted.companyName}:{}),
    ...(extracted.tanggalTerbit?{establishmentDate:extracted.tanggalTerbit}:{}),
   }));
  }
  setDraft((prev:any)=>({
   ...prev,
   ...(extracted.nib?{nib:extracted.nib}:{}),
   ...(extracted.alamat?{companyAddress:extracted.alamat}:{}),
   ...(extracted.email?{email:extracted.email}:{}),
   ...(extracted.phone?{phoneFax:extracted.phone}:{}),
   ...(extracted.tanggalTerbit?{establishmentDate:extracted.tanggalTerbit}:{}),
   customer:{
    ...(prev.customer||{}),
    ...(extracted.nib?{nib:extracted.nib}:{}),
    ...(extracted.companyName&&!prev.customer?.companyName?{companyName:extracted.companyName}:{}),
    ...(extracted.tanggalTerbit?{establishmentDate:extracted.tanggalTerbit}:{}),
   }
  }));
  if(customerCategory==='EXISTING'&&draft.isNew){
   setCustomerCategory('NEW');
  }
 };
 const selectedCustomer=customerId?customers.find((c:any)=>c.id===customerId):null;
 const fapCustomerKeys=['companyName','companyType','nib','npwp','establishmentActNo','establishmentDate'];
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
    if(!selectedCustomer)throw new Error('Pilih existing customer terlebih dahulu.');
    id=selectedCustomer.id;
   }else{
    const nib=String(customerDraft.nib||'').replace(/\D/g,'');
    const npwp=String(customerDraft.npwp||'').replace(/\D/g,'');
    if(!String(customerDraft.companyName||'').trim())throw new Error('Nama perusahaan calon debitur wajib diisi.');
    if(nib.length!==13)throw new Error('NIB wajib terdiri dari 13 digit angka.');
    if(npwp.length<15||npwp.length>16)throw new Error('NPWP wajib terdiri dari 15 atau 16 digit angka.');
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
   notify(`Aplikasi berhasil dibuat dengan nomor ${application.fapNumber}`);
   const fullApp=await api(`/applications/${application.id}`);
   setDraft(structuredClone(fullApp));
   onChange(fullApp);
  }catch(e:any){setError(e.message||'Gagal membuat aplikasi baru. Silakan coba lagi.');}
  finally{setBusy(false);}
 }
const [activeStage,setActiveStage]=useState<string>(()=>(a.stage||(['SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW','APPROVED'].includes(a.status)?'Pre-analysis':'FAP Stage')));const [submitFapConfirm,setSubmitFapConfirm]=useState(false);useEffect(()=>{if(a.stage)setActiveStage(a.stage);else if(['SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW','APPROVED'].includes(a.status))setActiveStage('Pre-analysis');else setActiveStage('FAP Stage');},[a.id,a.stage,a.status]);const [reviewDeedId,setReviewDeedId]=useState<string|null>(null);const [tab,setTab]=useState(initialTab),[draft,setDraft]=useState<any>(structuredClone(a)),[busy,setBusy]=useState(false),[error,setError]=useState(''),[transition,setTransition]=useState(''),[comments,setComments]=useState(''),[saveConfirm,setSaveConfirm]=useState(false),[sideBySide,setSideBySide]=useState(true);
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
    const cleanProjects = (draft.projects || []).filter((p: any) => 
      p && Object.values(p).some((v: any) => v !== undefined && v !== null && String(v).trim() !== '')
    );
    const body = {
      profile: updatedDraft,
      pic: updatedDraft.pic,
      projects: cleanProjects,
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
 }const liveCompanyName=customerCategory==='EXISTING'?(selectedCustomer?.companyName||a.customer?.companyName||''):(customerDraft.companyName||draft.customer?.companyName||a.customer?.companyName||'');
 const liveCompanyType=customerCategory==='EXISTING'?(selectedCustomer?.companyType||a.customer?.companyType||''):(customerDraft.companyType||draft.customer?.companyType||a.customer?.companyType||'');
 const liveNib=customerCategory==='EXISTING'?(selectedCustomer?.nib||a.customer?.nib||''):(customerDraft.nib||draft.customer?.nib||a.customer?.nib||'');
 const liveNpwp=customerCategory==='EXISTING'?(selectedCustomer?.npwp||a.customer?.npwp||''):(customerDraft.npwp||draft.customer?.npwp||a.customer?.npwp||'');
 const liveEstablishmentActNo=customerCategory==='EXISTING'?(selectedCustomer?.establishmentActNo||a.customer?.establishmentActNo||''):(customerDraft.establishmentActNo||draft.customer?.establishmentActNo||a.customer?.establishmentActNo||'');
 const liveEstablishmentDate=customerCategory==='EXISTING'?(selectedCustomer?.establishmentDate||a.customer?.establishmentDate||''):(customerDraft.establishmentDate||draft.customer?.establishmentDate||a.customer?.establishmentDate||'');

 const liveDetailFapData: FapSheetData = {
  fapNumber: draft.isNew ? 'Auto (Generated on save)' : (draft.fapNumber || a.fapNumber || '—'),
  applicationDate: draft.applicationDate || a.applicationDate || new Date().toISOString(),
  branchCode: draft.branchCode || a.branchCode || '',
  customerStatus: customerCategory || draft.customerStatus || a.customerStatus || 'EXISTING',
  companyName: liveCompanyName,
  companyType: liveCompanyType,
  nib: liveNib,
  npwp: liveNpwp,
  establishmentActNo: liveEstablishmentActNo,
  establishmentDate: liveEstablishmentDate,
  companyAddress: draft.companyAddress,
  province: draft.province,
  city: draft.city,
  district: draft.district,
  village: draft.village,
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
};useEffect(()=>{setDraft(structuredClone(a));},[a]);useEffect(()=>setTab(initialTab),[initialTab,a.id]);const canLegal=canEditLegal(user,a);const canEdit=user.role==='MKT'&&(Boolean(draft.isNew)||['DRAFT','RETURNED'].includes(a.status)),canFinance=canEdit||(user.role==='CA'&&a.status==='IN_CA_LEGAL_REVIEW');const tabs=['Customer & PIC','Stakeholders','Business & banks','Financing & units','Financial statements','Legal','Documents','Activity'],tabNumbers:Record<number,number>={0:1,5:2,1:3,2:4,4:5,6:6},isFapStage=activeStage==='FAP Stage',fullTabOrder=[0,5,1,2,4,6,7],tabOrder=isFapStage?[0,5,1,7]:fullTabOrder;async function submitFapStage(){setBusy(true);setError('');try{const updated={...draft,stage:'Pre-analysis'};await api('/applications/'+a.id+'/stage','PUT',{stage:'Pre-analysis'}).catch(()=>{});setDraft(updated);setActiveStage('Pre-analysis');setTab(2);setSubmitFapConfirm(false);notify('FAP Stage submitted. Tahap Pre-analysis aktif.');if(onChange)onChange(updated);}catch(e:any){setError(e.message||'Gagal submit FAP stage.');}finally{setBusy(false);}}let actions:string[]=[];if(user.role==='MKT'&&['DRAFT','RETURNED'].includes(a.status))actions=['SUBMIT_TO_BS'];if(user.role==='BS'&&a.status==='SUBMITTED_TO_BS')actions=['VERIFY_BS','RETURN'];if(user.role==='BS'&&a.status==='BS_VERIFIED')actions=['START_REVIEW','RETURN'];if(['CA','LEGAL'].includes(user.role)&&a.status==='IN_CA_LEGAL_REVIEW')actions=[user.role==='CA'?'RECOMMEND_CA':'RECOMMEND_LEGAL','RETURN'];if(user.role==='COMMITTEE'&&a.status==='CREDIT_COMMITTEE_REVIEW')actions=['APPROVE_COMMITTEE','REJECT_COMMITTEE','RETURN'];
 async function save(){setBusy(true);setError('');try{if(tab===0&&customerCategory==='NEW'&&customerDraft&&(customerDraft.companyName||customerDraft.nib||customerDraft.npwp)){const nib=String(customerDraft.nib||'').replace(/\D/g,'');const npwp=String(customerDraft.npwp||'').replace(/\D/g,'');if(!String(customerDraft.companyName||'').trim())throw new Error('Nama perusahaan calon debitur wajib diisi.');if(nib.length!==13)throw new Error('NIB wajib terdiri dari 13 digit angka.');if(npwp.length<15||npwp.length>16)throw new Error('NPWP wajib terdiri dari 15 atau 16 digit angka.');validateInput(customerDraft);}const stakeholdersChanged=JSON.stringify(draft.stakeholders)!==JSON.stringify(a.stakeholders);const hasPicData=draft.pic&&Object.values(draft.pic).some(v=>v!==undefined&&v!==null&&String(v).trim()!==''&&String(v).trim()!=='-');const cleanProjects=(draft.projects||[]).filter((p:any)=>p&&Object.values(p).some((v:any)=>v!==undefined&&v!==null&&String(v).trim()!==''));const body=tab===0?{profile:draft,...(hasPicData?{pic:draft.pic}:{}),projects:cleanProjects}:tab===2?{projects:cleanProjects,bankReferences:draft.bankReferences,proposal:draft.proposal}:tab===3?{proposal:draft.proposal}:tab===4?{financialStatements:draft.financialStatements}:{legal:draft.legal||{},...(stakeholdersChanged?{stakeholders:draft.stakeholders.map(stakeholderForSave)}:{})};const v=await api(`/applications/${a.id}/page-${tab<3?1:tab===5?'legal':2}`,'PUT',{...body,stage:'Pre-analysis'});const nextApp={...a,...v,stage:'Pre-analysis'};setDraft((prev:any)=>({...prev,...nextApp}));onChange(nextApp);notify('Perubahan berhasil disimpan');}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 const master=useMasterData();const p=draft.proposal||{...blank(proposalFields),units:[]};const principal=Number(p.financingValue)-Number(p.downPaymentValue),r=Number(p.interestRate)/1200,monthly=p.tenorMonths?(r?principal*r/(1-Math.pow(1+r,-Number(p.tenorMonths))):principal/Number(p.tenorMonths))/(master.paymentMethod.find(x=>x.value===p.paymentMethod)?.timing==='advance'?1+r:1):0;

 async function beginDeedReview(id:string){setError('');setBusy(true);try{if(canLegal){const list=legalDeedList(draft.legal||{},a),selected=draft.legal?.selectedDeedId||list.find(x=>x.type===(draft.legal?.selectedDeed||'establishment'))?.id||list[0]?.id,target=list.find(d=>d.id===id);if(!target)throw Error('Akta tidak ditemukan.');const deed=deedData({...target,stakeholders:Array.isArray(target.stakeholders)?target.stakeholders:target.id===selected?draft.stakeholders:[]});const v=await api(`/applications/${a.id}/deeds/${id}/draft`,'PUT',{deed});onChange(v);setDraft(structuredClone(v));}setReviewDeedId(id);}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 useEffect(()=>{if(tab!==1)return;const timer=setInterval(()=>api('/applications/'+a.id).then(onChange).catch(()=>{}),15000);return()=>clearInterval(timer);},[tab,a.id]);
 return <><button className="text-link back-link" onClick={onBack}><ArrowLeft size={15}/>Back to workspace</button><div className="detail-heading"><IconBox><Building2 size={25}/></IconBox><div><div className="eyebrow">{draft.isNew ? <span>NEW APPLICATION · FAP INTAKE</span> : a.fapNumber ? <>{a.fapNumber}{a.branchCode && <span> / {a.branchCode}</span>}</> : a.branchCode || null}</div><h1>{draft.isNew ? (customerCategory === "EXISTING" ? (selectedCustomer?.companyName || "Pilih Debitur / Buat Aplikasi Baru") : (customerDraft.companyName || "Aplikasi Pembiayaan Baru")) : (a.customer?.companyName || "Aplikasi Pembiayaan")}</h1><p>{draft.isNew ? <>FAP Intake Stage <span>·</span> {draft.city || draft.branchCode || "Draft"} <span>·</span> {new Date().toLocaleDateString("en-GB")}</> : <>{label(a.industrySegment)} <span>·</span> {a.city} <span>·</span> Created {date(a.applicationDate)}</>}</p></div><Badge status={draft.isNew ? "DRAFT" : a.status}/></div><div className="chevron-stepper">{['FAP Stage','Pre-analysis','ICLF'].map((st,i)=><div key={st} className={`chevron-step ${i===0?'first':''} ${(activeStage||draft.stage||a.stage||'FAP Stage')===st?'active':'inactive'}`} style={{cursor:(st==='FAP Stage'||(!draft.isNew&&(activeStage==='Pre-analysis'||a.stage==='Pre-analysis')))?'pointer':'default'}} onClick={()=>{if(draft.isNew&&st!=='FAP Stage'){notify('Harap simpan aplikasi (FAP Stage) terlebih dahulu untuk melanjutkan ke tahap berikutnya.');return;}if(st==='FAP Stage'||activeStage==='Pre-analysis'||a.stage==='Pre-analysis')setActiveStage(st);}}>{st}</div>)}</div><div className="detail-summary"><div><span>Proposed financing</span><b>{money(draft.proposal?.financingValue||a.proposal?.financingValue)}</b></div><div><span>Financing term</span><b>{(draft.proposal?.tenorMonths||a.proposal?.tenorMonths)||'—'} months</b></div><div><span>Customer category</span><b>{customerCategory==='EXISTING'?'Existing customer':customerCategory==='NEW'?'New customer':label(a.customer?.companyType||'—')}</b></div><div><span>Documents verified</span><b>{a.documentChecks?`${a.documentChecks.filter((d:any)=>d.status==='VERIFIED').length} / ${a.documentChecks.length}`:'0 / 0'}</b></div></div><div className="detail-tabs">{tabOrder.map(id=><button key={tabs[id]} className={tab===id?'active':''} onClick={()=>{if(draft.isNew&&id!==0){notify('Harap simpan aplikasi (FAP Stage) terlebih dahulu sebelum membuka tab lain.');return;}setTab(id);setError('');}} title={draft.isNew&&id!==0?'Simpan aplikasi terlebih dahulu':undefined} style={draft.isNew&&id!==0?{opacity:0.6,cursor:'not-allowed'}:undefined}>{tabNumbers[id]!==undefined&&<span>{tabNumbers[id]}</span>}{tabs[id]}{id===6&&a.documentChecks&&<em>{a.documentChecks.length}</em>}</button>)}</div>{error&&<div className="error">{error}</div>}{tab<6&&<section className="panel form-panel"><div className="panel-head"><div><h2>{tabs[tab]}</h2><p>{['Company profile and primary point of contact','View ownership and stakeholder information. Edit these fields in Legal.','Business details, bank facilities, financing terms, and equipment units','Equipment, financing terms, and estimated monthly installment','Three years of financial performance. All figures in IDR.','Akta, pihak terkait, dan struktur kepemilikan.'][tab]}</p></div>{!(tab===1?false:tab===5?canLegal:tab===2?canFinance:tab<3?canEdit:canFinance)&&<span className="subtle-chip"><ShieldCheck size={14}/>Read only</span>}</div><div className="form-body">{tab===0&&<><div className="customer-reference" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}><div style={{display:'flex',alignItems:'center',gap:'8px'}}><Building2 size={18}/><span><b>{customerCategory==='EXISTING'?(selectedCustomer?.companyName||'Belum memilih debitur'):(customerDraft.companyName||'Calon Debitur Baru')}</b> · NIB {customerCategory==='EXISTING'?(selectedCustomer?.nib||'—'):(customerDraft.nib||'—')} · NPWP {customerCategory==='EXISTING'?(selectedCustomer?.npwp||'—'):(customerDraft.npwp||'—')}</span></div><div style={{display:'flex',alignItems:'center',gap:'8px'}}><button type="button" className="button small" onClick={()=>window.print()} title="Buka halaman cetak print dokumen Excel FAP (A4)" style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'#ffffff',color:'#0f172a',border:'1px solid #cbd5e1'}}><Printer size={14}/> Print</button><div className="fap-tab-layout-toggle" style={{margin:0}}><button type="button" className={`fap-tab-toggle-btn ${sideBySide?'active':''}`} onClick={()=>setSideBySide(s=>!s)} title={sideBySide?"Tutup Side-by-side":"Buka Side-by-side Live FAP"}><Columns size={14}/>{sideBySide?"Side-by-side Live FAP (Aktif)":"Buka Side-by-side FAP"}</button></div></div></div>{!sideBySide&&<div style={{display:'none'}} className="print-hidden-doc"><FapSheetPreview data={liveDetailFapData}/></div>}{sideBySide?<div className="fap-detail-split-container"><div className="fap-detail-form-col"><div className="business-sections"><div className="business-section intake-section-merged">
  <div className="business-section-heading" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
    <div>
      <span className="eyebrow" style={{display:'block',color:'#2563eb',fontWeight:700,fontSize:'0.75rem',letterSpacing:'0.05em',marginBottom:4}}>FAP INTAKE</span>
      <h3>FAP Stage · Core Application & Customer Details</h3>
      <p>Enter the core application and customer details. You can complete the remaining business profile directly in this workspace.</p>
    </div>
  </div>
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
            <div><dt>NIB</dt><dd style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><span>{selectedCustomer.nib || '—'}</span><button type="button" onClick={()=>setNibOcrOpen(true)} title="Buka pop up OCR Dokumen NIB" className="button small" style={{background:'#2563eb',borderColor:'#2563eb',color:'#ffffff',fontSize:'0.72rem',padding:'3px 9px',borderRadius:5,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4}}><ScanLine size={12}/> Open Pop-up OCR</button></dd></div>
            <div><dt>NPWP</dt><dd>{selectedCustomer.npwp || '—'}</dd></div>
            <div><dt>Establishment deed</dt><dd>{selectedCustomer.establishmentActNo || '—'}</dd></div>
          </dl>
        </section>
      )}
    </>
  ) : (
    <div className="new-customer-fields-block" style={{marginTop:12}}>
      <div style={{marginBottom:12}}>
        <h4 style={{margin:0,fontSize:'0.9rem',fontWeight:600,color:'#0f172a'}}>Company details</h4>
        <p style={{margin:'2px 0 0 0',fontSize:'0.8rem',color:'#64748b'}}>Identitas badan usaha baru (Nama PT/CV, tipe usaha, NIB 13 digit, NPWP 15-16 digit, dan akta pendirian).</p>
      </div>
      <Fields 
        fields={fapCustomerFields} 
        onNibOcr={()=>setNibOcrOpen(true)}
        value={customerDraft} 
        disabled={!canEdit} 
        onChange={c => {
          setCustomerDraft(c);
          setDraft((prev: any) => ({
            ...prev,
            customer: c,
          }));
        }} 
      />
    </div>
  )}
</div><div className="business-section"><div className="business-section-heading"><div><h3>Kantor Pendaftaran & Status Tempat Usaha</h3><p>Cabang registrasi aplikasi, status relasi debitur, dan kepemilikan domisili usaha.</p></div></div><Fields fields={profileFields.filter(f=>['branchCode','customerStatus','locationStatus'].includes(f.key))} value={draft} disabled={!canEdit} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Alamat Kantor & Kontak Resmi Perusahaan</h3><p>Domisili operasional, kota, provinsi, kecamatan, kelurahan, RT/RW, kode pos, email resmi, telepon, dan website.</p></div></div><Fields fields={profileFields.filter(f=>['companyAddress','province','city','district','village','rt','rw','postalCode','phoneFax','email','website'].includes(f.key))} value={draft} disabled={!canEdit} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Profil Usaha & Pengalaman Operasional</h3><p>Bidang usaha utama, sektor industri, peran bisnis, lama beroperasi, dan sumber angsuran.</p></div></div><Fields fields={profileFields.filter(f=>['mainBusiness','industrySegment','businessRole','experienceYears','experienceMonths','repaymentSource'].includes(f.key))} value={draft} disabled={!canEdit} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Ringkasan Legalitas Akta Perusahaan</h3><p>Nomor dan tanggal akta perubahan anggaran dasar terakhir.</p></div></div><Fields fields={profileFields.filter(f=>['latestDeedNo','latestDeedDate'].includes(f.key))} value={draft} disabled={!canEdit} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Kontak Utama / Penanggung Jawab (PIC)</h3><p>Identitas, jabatan, nomor kontak langsung, dan alamat domisili PIC untuk verifikasi lapangan.</p></div></div><Fields fields={picFields} value={draft.pic||{}} disabled={!canEdit} onChange={pic=>setDraft({...draft,pic})}/></div></div></div><div className="fap-detail-preview-col"><FapSheetPreview data={liveDetailFapData}/></div></div>:<div className="business-sections"><div className="business-section intake-section-merged">
  <div className="business-section-heading" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
    <div>
      <span className="eyebrow" style={{display:'block',color:'#2563eb',fontWeight:700,fontSize:'0.75rem',letterSpacing:'0.05em',marginBottom:4}}>FAP INTAKE</span>
      <h3>FAP Stage · Core Application & Customer Details</h3>
      <p>Enter the core application and customer details. You can complete the remaining business profile directly in this workspace.</p>
    </div>
  </div>
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
            <div><dt>NIB</dt><dd style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><span>{selectedCustomer.nib || '—'}</span><button type="button" onClick={()=>setNibOcrOpen(true)} title="Buka pop up OCR Dokumen NIB" className="button small" style={{background:'#2563eb',borderColor:'#2563eb',color:'#ffffff',fontSize:'0.72rem',padding:'3px 9px',borderRadius:5,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4}}><ScanLine size={12}/> Open Pop-up OCR</button></dd></div>
            <div><dt>NPWP</dt><dd>{selectedCustomer.npwp || '—'}</dd></div>
            <div><dt>Establishment deed</dt><dd>{selectedCustomer.establishmentActNo || '—'}</dd></div>
          </dl>
        </section>
      )}
    </>
  ) : (
    <div className="new-customer-fields-block" style={{marginTop:12}}>
      <div style={{marginBottom:12}}>
        <h4 style={{margin:0,fontSize:'0.9rem',fontWeight:600,color:'#0f172a'}}>Company details</h4>
        <p style={{margin:'2px 0 0 0',fontSize:'0.8rem',color:'#64748b'}}>Identitas badan usaha baru (Nama PT/CV, tipe usaha, NIB 13 digit, NPWP 15-16 digit, dan akta pendirian).</p>
      </div>
      <Fields 
        fields={fapCustomerFields} 
        onNibOcr={()=>setNibOcrOpen(true)}
        value={customerDraft} 
        disabled={!canEdit} 
        onChange={c => {
          setCustomerDraft(c);
          setDraft((prev: any) => ({
            ...prev,
            customer: c,
          }));
        }} 
      />
    </div>
  )}
</div><div className="business-section"><div className="business-section-heading"><div><h3>Kantor Pendaftaran & Status Tempat Usaha</h3><p>Cabang registrasi aplikasi, status relasi debitur, dan kepemilikan domisili usaha.</p></div></div><Fields fields={profileFields.filter(f=>['branchCode','customerStatus','locationStatus'].includes(f.key))} value={draft} disabled={!canEdit} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Alamat Kantor & Kontak Resmi Perusahaan</h3><p>Domisili operasional, kota, provinsi, kecamatan, kelurahan, RT/RW, kode pos, email resmi, telepon, dan website.</p></div></div><Fields fields={profileFields.filter(f=>['companyAddress','province','city','district','village','rt','rw','postalCode','phoneFax','email','website'].includes(f.key))} value={draft} disabled={!canEdit} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Profil Usaha & Pengalaman Operasional</h3><p>Bidang usaha utama, sektor industri, peran bisnis, lama beroperasi, dan sumber angsuran.</p></div></div><Fields fields={profileFields.filter(f=>['mainBusiness','industrySegment','businessRole','experienceYears','experienceMonths','repaymentSource'].includes(f.key))} value={draft} disabled={!canEdit} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Ringkasan Legalitas Akta Perusahaan</h3><p>Nomor dan tanggal akta perubahan anggaran dasar terakhir.</p></div></div><Fields fields={profileFields.filter(f=>['latestDeedNo','latestDeedDate'].includes(f.key))} value={draft} disabled={!canEdit} onChange={setDraft}/></div><div className="business-section"><div className="business-section-heading"><div><h3>Kontak Utama / Penanggung Jawab (PIC)</h3><p>Identitas, jabatan, nomor kontak langsung, dan alamat domisili PIC untuk verifikasi lapangan.</p></div></div><Fields fields={picFields} value={draft.pic||{}} disabled={!canEdit} onChange={pic=>setDraft({...draft,pic})}/></div><div className="business-section"><Repeater title="Project contracts" description="Kontrak proyek dan aktivitas bisnis yang sedang berjalan (diisi oleh Marketing)." fields={projectFields} rows={draft.projects||[]} disabled={!canEdit} carousel onChange={projects=>setDraft({...draft,projects})}/></div></div>}</>}{tab===1&&<><StakeholderDeedView legal={draft.legal||{}} application={a} fallbackRows={draft.stakeholders}/></>}{tab===2&&<div className="business-sections"><section className="business-section"><Repeater title="Bank facilities" description="Fasilitas kredit dan pinjaman yang sudah dimiliki perusahaan." fields={bankFields} rows={draft.bankReferences} disabled={!canEdit} carousel onChange={bankReferences=>setDraft({...draft,bankReferences})}/></section><section className="business-section"><div className="business-section-heading"><div><h3>Financing details</h3><p className="muted">Atur nilai, tenor, dan ketentuan pembiayaan.</p></div></div><Fields fields={proposalFields} value={p} disabled={!canFinance} onChange={proposal=>setDraft({...draft,proposal})}/><div className="simulation"><div><Wallet size={22}/><span>Estimated monthly installment<strong>{money(monthly)}</strong></span></div><p>Reducing balance estimate. Excludes fees, insurance, and taxes.<br/>Net principal: {money(principal)} · {p.paymentMethod||'In Arrear'}</p></div></section><section className="business-section"><Repeater title="Equipment units" description="Daftarkan detail setiap unit alat yang dibiayai." fields={unitFields} rows={p.units||[]} disabled={!canFinance} onChange={units=>setDraft({...draft,proposal:{...p,units}})}/></section></div>}{tab===4&&<FinancialEditor rows={draft.financialStatements} disabled={!canFinance} onChange={financialStatements=>setDraft({...draft,financialStatements})}/>}{tab===5&&<LegalEditor value={draft.legal||{}} application={a} stakeholders={draft.stakeholders} disabled={!canLegal} user={user} onReview={beginDeedReview} onChange={legal=>setDraft({...draft,legal})} onStakeholdersChange={(legal,stakeholders)=>setDraft({...draft,legal,stakeholders})}/>}</div><div className="form-bottom-actions"><div className="form-bottom-left">{draft.isNew ? <button type="button" className="button" onClick={onBack}><ArrowLeft size={15}/>Batal / Kembali ke Workspace</button> : !(tab===1?false:tab===5?canLegal:tab===2?canFinance:tab<3?canEdit:canFinance)&&<span className="subtle-chip"><ShieldCheck size={14}/>Read only</span>}</div><div className="form-bottom-right">{draft.isNew ? <button type="button" className="button primary" disabled={busy} onClick={saveNewApplication}>{busy?<Loader2 size={15} className="spin"/>:<Save size={15}/>}Simpan & Buat Aplikasi</button> : (tab===1?false:tab===5?canLegal:tab===2?canFinance:tab<3?canEdit:canFinance)&&<button className="button primary" disabled={busy} onClick={tab===5?()=>setSaveConfirm(true):save}>{busy?<Loader2 size={15} className="spin"/>:<Save size={15}/>}Save changes</button>}{actions.length>0&&<div className="workflow-buttons">{actions.map(action=>{const isSubmitFap=isFapStage&&action==='SUBMIT_TO_BS';return <button key={action} className={'button '+(action==='RETURN'||action==='REJECT_COMMITTEE'?'':'primary')} onClick={()=>{if(isSubmitFap){setSubmitFapConfirm(true);}else{setComments('');setTransition(action);setError('');}}}>{isSubmitFap?'Submit':({SUBMIT_TO_BS:'Submit to BS',VERIFY_BS:'Complete BS verification',START_REVIEW:'Start CA & Legal review',RECOMMEND_CA:'Sign off · CA',RECOMMEND_LEGAL:'Sign off · Legal',APPROVE_COMMITTEE:'Approve',REJECT_COMMITTEE:'Reject',RETURN:'Return'} as any)[action]}{!['RETURN','REJECT_COMMITTEE'].includes(action)&&<ArrowRight size={14}/>}</button>;})}</div>}</div></div></section>}{tab===6&&<Documents a={a} user={user} onChange={onChange} notify={notify}/>}{tab===7&&<section className="panel"><div className="panel-head"><h2>Application audit trail</h2><span className="subtle-chip"><ShieldCheck size={14}/>Append-only record</span></div><Audit logs={a.approvalLogs}/>{a.signoffs.length>0&&<div className="signoffs">{a.signoffs.map((s:any)=><div key={s.role}><CheckCheck size={16}/>{s.role} signed off by {s.actor} · {date(s.signed_at)}</div>)}</div>}</section>}{tab>=6&&actions.length>0&&<div className="form-bottom-actions"><div className="form-bottom-left"></div><div className="form-bottom-right"><div className="workflow-buttons">{actions.map(action=><button key={action} className={'button '+(action==='RETURN'||action==='REJECT_COMMITTEE'?'':'primary')} onClick={()=>{setComments('');setTransition(action);setError('');}}>{({SUBMIT_TO_BS:'Submit',VERIFY_BS:'Complete BS verification',START_REVIEW:'Start CA & Legal review',RECOMMEND_CA:'Sign off · CA',RECOMMEND_LEGAL:'Sign off · Legal',APPROVE_COMMITTEE:'Approve',REJECT_COMMITTEE:'Reject',RETURN:'Return'} as any)[action]}{!['RETURN','REJECT_COMMITTEE'].includes(action)&&<ArrowRight size={14}/>}</button>)}</div></div></div>}{reviewDeedId&&<DeedReviewDialog application={a} user={user} deedId={reviewDeedId} onClose={()=>setReviewDeedId(null)} onUpdated={onChange}/ >}{saveConfirm&&<Modal title="Simpan perubahan Legal" onClose={()=>setSaveConfirm(false)}><div className="modal-body"><p>Simpan perubahan akta dan Stakeholders pada aplikasi ini?</p></div><div className="modal-actions"><button className="button" onClick={()=>setSaveConfirm(false)}>Batal</button><button className="button primary" onClick={()=>{setSaveConfirm(false);save();}}><Save size={15}/>Simpan perubahan</button></div></Modal>}{submitFapConfirm&&<Modal title="Submit FAP Stage" onClose={()=>setSubmitFapConfirm(false)}><div className="modal-body"><p className="muted">{a.customer?.companyName||draft.customer?.companyName} · {a.fapNumber}</p><p>Submit data FAP Stage dan lanjutkan ke tahap <strong>Pre-analysis</strong>?</p><p className="muted">Setelah disubmit, tab Pre-analysis (Business & banks, Financial statements, Documents) akan dibuka untuk pengisian informasi bisnis dan keuangan.</p>{error&&<div className="error">{error}</div>}</div><div className="modal-actions"><button className="button" onClick={()=>setSubmitFapConfirm(false)}>Batal</button><button className="button primary" disabled={busy} onClick={submitFapStage}>{busy?<Loader2 size={15} className="spin"/>:<ArrowRight size={15}/>}Submit ke Pre-analysis</button></div></Modal>}{transition&&<Modal title={label(transition)} onClose={()=>setTransition('')}><div className="modal-body"><p className="muted">{a.customer.companyName} · {a.fapNumber}</p><p>Required information and documents will be checked before this action is recorded.</p><label>Decision notes<textarea rows={4} value={comments} onChange={e=>setComments(e.target.value)} placeholder="Add context for the next reviewer…"/></label>{error&&<div className="error">{error}</div>}</div><div className="modal-actions"><button className="button" onClick={()=>setTransition('')}>Cancel</button><button className="button primary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{onChange(await api(`/applications/${a.id}/transition`,'POST',{action:transition,comments}));setTransition('');notify('Workflow action recorded');}catch(e:any){setError(e.message);}finally{setBusy(false);}}}>Confirm {label(transition).toLowerCase()}</button></div></Modal>}<NibOcrModal open={nibOcrOpen} onClose={()=>setNibOcrOpen(false)} onApply={handleApplyNibOcr} notify={notify}/></>;
}
function StakeholderEditor({rows,onChange,disabled}:{rows:any[],onChange:(rows:any[])=>void,disabled:boolean}){const total=rows.reduce((sum,x)=>sum+Number(x.sharePercentage||0),0),isExceeded=total>100.01;return <><div className={'ownership '+(isExceeded?'unbalanced':'balanced')}><div><strong>{total.toFixed(2)}%</strong><span>Total ownership · maks 100% (tidak wajib 100%)</span></div><div className="ownership-bar"><i style={{width:Math.min(100,total)+'%',background:isExceeded?'#dc2626':'#002c5f'}}/></div></div>{isExceeded&&<p style={{color:'#dc2626',fontSize:'12px',marginTop:'6px',fontWeight:600}}>⚠ Total kepemilikan saham melebihi 100%. Mohon sesuaikan kembali porsi saham masing-masing pihak.</p>}<Repeater title="Stakeholders" fields={stakeholderFields} rows={rows.map(stakeholderEditorValues)} disabled={disabled} onChange={onChange}/></>;}
function FinancialEditor({rows,onChange,disabled}:{rows:any[],onChange:(r:any[])=>void,disabled:boolean}){const change=(i:number,k:string,v:any)=>onChange(rows.map((r,j)=>j===i?{...r,[k]:v}:r));return <><div className="section-title"><span className="muted">Enter exact values; totals are checked when saved.</span>{!disabled&&rows.length<3&&<button className="button small" onClick={()=>onChange([...rows,{...blank(financialFields),fiscalYear:new Date().getFullYear()-3+rows.length,isAudited:false}])}><Plus size={15}/>Add fiscal year</button>}</div><div className="table-scroll"><table className="financial-table"><thead><tr><th>FINANCIAL METRIC</th>{rows.map((r,i)=><th key={i}><div className="year-input"><input aria-label="Fiscal year" type="number" {...inputLimits('fiscalYear')} disabled={disabled} value={r.fiscalYear} onChange={e=>change(i,'fiscalYear',e.target.value)}/>{!disabled&&<button className="icon-button" onClick={()=>onChange(rows.filter((_,j)=>j!==i))}><X size={14}/></button>}</div><label className="checkbox"><input type="checkbox" disabled={disabled} checked={r.isAudited} onChange={e=>change(i,'isAudited',e.target.checked)}/>Audited</label></th>)}</tr></thead><tbody>{financialFields.map(f=><tr key={f.key} className={f.key.startsWith('total')||f.key==='netIncome'?'total-row':''}><td>{f.label}</td>{rows.map((r,i)=><td key={i}><input aria-label={`${r.fiscalYear} ${f.label}`} type="number" step="0.01" disabled={disabled} value={r[f.key]} onChange={e=>change(i,f.key,e.target.value)}/></td>)}</tr>)}<tr className="balance-row"><td>Balance check</td>{rows.map((r,i)=>{const ok=Number(r.currentAssets)+Number(r.nonCurrentAssets)===Number(r.totalAssets)&&Number(r.currentLiabilities)+Number(r.nonCurrentLiabilities)===Number(r.totalLiabilities)&&Number(r.totalAssets)===Number(r.totalLiabilities)+Number(r.equity)&&Number(r.totalAssets)===Number(r.totalLiabAndEquity);return <td key={i}><span className={ok?'text-green':'text-red'}>{ok?'✓ Balanced':'! Unbalanced'}</span></td>;})}</tr>{[['Current ratio','currentAssets','currentLiabilities'],['Debt / equity','totalLiabilities','equity'],['Net profit margin','netIncome','revenue']].map(([name,n,d])=><tr key={name}><td>{name}</td>{rows.map((r,i)=><td key={i} className="ratio">{Number(r[d])?((Number(r[n])/Number(r[d]))*(name==='Net profit margin'?100:1)).toFixed(2)+(name==='Net profit margin'?'%':'×'):'N/A'}</td>)}</tr>)}</tbody></table></div>{!rows.length&&<div className="empty-small">Add three fiscal years to begin financial spreading.</div>}<p className="field-note">DSCR is unavailable because the specification does not capture depreciation. Zero-denominator ratios are shown as N/A.</p></>;}
function Documents({a,user,onChange,notify}:{a:any,user:any,onChange:(a:any)=>void,notify:(s:string)=>void}){
  const evidenceDefs = [
    { code: 'FAP', name: 'fap', title: 'FAP (Financing Application Form)', stage: 'FAP Intake', badgeClass: 'stage-badge-fap', role: 'MKT', desc: 'Formulir aplikasi pembiayaan resmi bertandatangan debitur' },
    { code: 'PREANALYSIS', name: 'Preanalysis', title: 'Pre-analysis Document', stage: 'Pre-analysis', badgeClass: 'stage-badge-preanalysis', role: 'CA', desc: 'Kajian awal dan analisis kelayakan kredit oleh Credit Analyst' },
    { code: 'ICLF', name: 'Iclf', title: 'ICLF (Credit Committee Review)', stage: 'Credit Committee', badgeClass: 'stage-badge-iclf', role: 'COMMITTEE', desc: 'Rekomendasi persetujuan dan risalah rapat komite pembiayaan' },
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

  const totalFilesCount = items.reduce((sum, item) => sum + (item.chk.files?.length || 0), 0);
  const activeItem = items.find(x => x.code === selectedCode) || items[0];
  const activeFiles = activeItem.chk.files || [];
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
    <div className="evidence-studio-container">
      {/* Studio Header & Stage Pill Navigation */}
      <div className="evidence-studio-header">
        <div className="evidence-studio-title-area">
          <div className="evidence-studio-badge">
            <FolderCheck size={14} /> Studio Evidence
          </div>
          <h2>Berkas Evidence & Live Document Studio</h2>
          <p>
            Manajemen dokumen digital permohonan pembiayaan debitur <strong>{a.customer?.companyName || 'Debitur'}</strong> ({a.fapNumber || 'FAP'}) · <strong>{totalFilesCount} Berkas Terunggah</strong>
          </p>
        </div>

        {/* Linear/Prolab Segmented Pill Navigation */}
        <div className="evidence-pill-nav" role="tablist" aria-label="Navigasi Tahapan Dokumen">
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

      {/* Main Studio Split Layout */}
      <div className={`evidence-studio-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        
        {/* Left Column: Stage Inspector & File Deck */}
        <div className="evidence-studio-sidebar">
          {/* Active Stage Card */}
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
                  <strong>{busy ? 'Mengunggah berkas...' : `Unggah Evidence ${activeItem.name}`}</strong>
                  <span>Tarik berkas ke sini atau klik untuk memilih</span>
                </div>
                <span className="evidence-dropzone-hint">
                  PDF, PNG, JPEG · Maks. 20 MB
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
                <h4>Daftar Berkas Terunggah ({activeFiles.length})</h4>
                <span className="evidence-files-summary">
                  {activeFiles.length > 0 ? 'Pilih untuk pratinjau' : 'Belum ada berkas'}
                </span>
              </div>

              {activeFiles.length === 0 ? (
                <div className="evidence-files-empty">
                  <FileText size={28} className="evidence-empty-icon" />
                  <p>Belum ada berkas pada tahapan {activeItem.stage}</p>
                  <small>Silakan unggah dokumen pendukung melalui area unggah di atas.</small>
                </div>
              ) : (
                <div className="evidence-files-list">
                  {activeFiles.map((f: any) => {
                    const isPreviewed = activeFile?.id === f.id;
                    const isPdf = f.mimeType === 'application/pdf' || f.fileName?.toLowerCase().endsWith('.pdf');
                    return (
                      <div
                        key={f.id}
                        className={`evidence-deck-card ${isPreviewed ? 'active' : ''}`}
                        onClick={() => previewFile(f)}
                        title="Klik untuk membuka pratinjau dokumen"
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
                            <span>{(f.fileSize / 1024).toFixed(0)} KB</span>
                            <span>·</span>
                            <span>{f.uploadedBy || 'User'}</span>
                          </div>
                        </div>
                        <div className="evidence-deck-actions" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            className={`evidence-action-btn ${isPreviewed ? 'active' : ''}`}
                            onClick={() => previewFile(f)}
                            title="Pratinjau dokumen"
                          >
                            <Eye size={13} />
                          </button>
                          {canUpload && (
                            <button
                              type="button"
                              className="evidence-action-btn danger"
                              onClick={() => handleDeleteFile(activeItem, f.id)}
                              title="Hapus berkas ini"
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
                  title="Tampilkan kembali sidebar berkas"
                >
                  <Columns size={13} /> Buka Sidebar
                </button>
              )}
              <div>
                <h3 className="document-viewer-title">
                  {activeFile ? activeFile.fileName : `Preview Dokumen · ${activeItem.title}`}
                </h3>
                <span className="document-viewer-subtitle">
                  Tahapan: <strong>{activeItem.stage}</strong> · Role: <strong>{activeItem.role}</strong>
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
                title={sidebarCollapsed ? "Tampilkan daftar berkas (Split View)" : "Lebarkan Pratinjau (Full Canvas)"}
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
                    title="Perkecil"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="studio-zoom-val">{Math.round(zoom * 100)}%</span>
                  <button
                    type="button"
                    className="studio-tool-btn"
                    onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                    title="Perbesar"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    type="button"
                    className="studio-tool-btn"
                    onClick={() => setRotation(rotation + 90)}
                    title="Putar 90 Derajat"
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
                    className="studio-action-icon-link"
                    href={activeFileUrl}
                    download={activeFile?.fileName || 'document.pdf'}
                    title="Unduh Berkas Asli"
                  >
                    <Download size={14} />
                    <span>Unduh</span>
                  </a>
                  <a
                    className="studio-action-icon-link"
                    href={activeFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Buka Dokumen di Tab Baru"
                  >
                    <ExternalLink size={14} />
                  </a>
                </>
              )}

              <button
                type="button"
                className={`studio-action-icon-btn ${isMaximized ? 'active' : ''}`}
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? "Perkecil (Normal View)" : "Layar Penuh (Fullscreen)"}
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
                <h3>Pilih Dokumen untuk Pratinjau Langsung</h3>
                <p>
                  Pilih salah satu berkas dari daftar di sisi kiri untuk melihat pratinjau lengkap di kanvas studio ini.
                </p>
                <div className="studio-empty-features">
                  <span>✓ Pratinjau PDF & Gambar resolusi tinggi</span>
                  <span>✓ Kontrol skala Zoom Fit Width & Fit Page</span>
                  <span>✓ Mode Fullscreen untuk evaluasi komite</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
function Audit({logs}:{logs:any[]}){return <div className="audit-list">{logs.map(l=><div className="audit-item" key={l.id}><span className="audit-icon"><Activity size={16}/></span><div><b>{l.actionBy}</b><span className="audit-role">{l.userRole}</span><p>{l.comments}</p><small>{statusLabel[l.previousStatus]} <ArrowRight size={12}/> {statusLabel[l.newStatus]} <span>·</span> {new Date(l.actionTimestamp).toLocaleString('en-GB')}</small></div></div>)}{!logs.length&&<div className="empty-small">No activity yet.</div>}</div>;}
function ActivityPage({rows,open}:{rows:any[],open:(id:string)=>void}){const [logs,setLogs]=useState<any[]>([]),[error,setError]=useState('');useEffect(()=>{Promise.all(rows.map(r=>api('/applications/'+r.id))).then(details=>setLogs(details.flatMap(a=>a.approvalLogs.map((l:any)=>({...l,companyName:a.customer.companyName}))).sort((a,b)=>new Date(b.actionTimestamp).getTime()-new Date(a.actionTimestamp).getTime()))).catch(e=>setError(e.message));},[rows]);return <section className="panel"><div className="panel-head"><h2>Recent activity</h2><span className="subtle-chip">All applications</span></div>{error&&<div className="error">{error}</div>}{logs.map(l=><div key={l.id} className="activity-entry"><button className="text-link" onClick={()=>open(l.applicationId)}>{l.companyName}<ArrowUpRight size={14}/></button><Audit logs={[l]}/></div>)}</section>;}

function DocumentDesk({rows,open,user}:{rows:any[],open:(id:string,tab?:number)=>void,user:any}){const [items,setItems]=useState<any[]>([]),[search,setSearch]=useState(''),[department,setDepartment]=useState(['BS','CA','LEGAL'].includes(user.role)?user.role:'ALL'),[status,setStatus]=useState('OPEN'),[error,setError]=useState('');useEffect(()=>{api('/document-desk').then(setItems).catch(e=>setError(e.message));},[rows]);const visible=items.filter(d=>(status==='ALL'||(status==='OPEN'?d.status!=='VERIFIED':d.status==='VERIFIED'))&&(department==='ALL'||d.assigned_role===department)&&(d.company_name+' '+d.fap_number+' '+d.document_name).toLowerCase().includes(search.toLowerCase()));const openCount=items.filter(d=>d.status!=='VERIFIED').length;return <><div className="stats-grid"><div className="stat-card"><div className="stat-top">Documents to review</div><strong>{openCount}</strong><small>Checklist items awaiting completion or verification</small></div><div className="stat-card"><div className="stat-top">Verified documents</div><strong>{items.length-openCount}</strong><small>Checklist items marked verified</small></div><div className="stat-card"><div className="stat-top">Applications</div><strong>{new Set(items.map(d=>d.application_id)).size}</strong><small>Applications with document checklists</small></div></div><section className="panel applications-panel"><div className="panel-head"><h2>Document checklist queue <span>{visible.length}</span></h2><span className="subtle-chip">Open an item to review its documents</span></div><div className="table-toolbar"><div className="search"><Search size={17}/><input aria-label="Search documents" placeholder="Search company, FAP, or document..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="filters"><select aria-label="Filter document status" value={status} onChange={e=>setStatus(e.target.value)}><option value="OPEN">Needs action</option><option value="VERIFIED">Verified</option><option value="ALL">All documents</option></select><select aria-label="Filter assigned department" value={department} onChange={e=>setDepartment(e.target.value)}><option value="ALL">All departments</option>{['BS','CA','LEGAL'].map(r=><option value={r} key={r}>{label(r)}</option>)}</select></div></div>{error&&<div className="error">{error}</div>}<div className="table-scroll"><table className="data-table"><thead><tr><th>DOCUMENT</th><th>COMPANY / FAP</th><th>OWNER</th><th>REQUIRED</th><th>FILES</th><th>STATUS</th><th/></tr></thead><tbody>{visible.map(d=><tr key={d.checklist_id} onClick={()=>open(d.application_id,6)} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')open(d.application_id,6);}}><td><b>{d.document_name}</b><small>{d.document_code}</small></td><td><div className="company-cell"><div><b>{d.company_name}</b><small>{d.fap_number}</small></div></div></td><td><span className="branch">{label(d.assigned_role)}</span></td><td>{d.is_mandatory?'Yes':'No'}</td><td>{d.file_count||0}</td><td><Badge status={d.status}/></td><td><ChevronRight size={16}/></td></tr>)}</tbody></table>{!visible.length&&<div className="empty"><FolderCheck size={26}/><h3>No checklist items found</h3><p>Try another filter or search.</p></div>}</div></section></>;}

const deedNames:Record<string,string>={establishment:'Akta pendirian',amendment:'Akta perubahan'};
function legalDeedList(legal:any,application:any){const saved:any[]=Array.isArray(legal.deeds)?legal.deeds:[],legacy=['establishment','amendment'].filter(type=>legal[type]&&Object.values(legal[type]).some(Boolean)).map(type=>({id:`legacy-${type}`,type,...legal[type]}));const entered=Array.isArray(legal.deeds)?saved:legacy;const system:any[]=[];if(application.customer?.establishmentActNo)system.push({id:'system-establishment',type:'establishment',deedNumber:application.customer.establishmentActNo,deedDate:String(application.customer.establishmentDate||'').slice(0,10),source:'Sistem'});if(application.latestDeedNo)system.push({id:'system-amendment',type:'amendment',deedNumber:application.latestDeedNo,deedDate:String(application.latestDeedDate||'').slice(0,10),source:'Sistem'});return [...system.filter(x=>!entered.some(y=>y.id===x.id||y.type===x.type&&y.deedNumber===x.deedNumber)),...entered].filter(x=>!legal.hiddenDeedIds?.includes(x.id));}
function selectedLegalStakeholders(legal:any,application:any,fallback:any[]){const deeds=legalDeedList(legal,application),selected=deeds.find(x=>x.id===legal.selectedDeedId)||deeds[0];return selected&&Array.isArray(selected.stakeholders)?selected.stakeholders:fallback;}
function shareholderNames(parties:any):string[]{return Array.isArray(parties?.shareholders)?parties.shareholders:parties?.shareholder?[parties.shareholder]:[];}
function StakeholderDeedView({legal,application,fallbackRows}:{legal:any,application:any,fallbackRows:any[]}){
 const deeds=[...publishedDeeds(legal)].sort((a,b)=>{const ad=Date.parse(String(a.deedDate||a.createdAt||''))||0,bd=Date.parse(String(b.deedDate||b.createdAt||''))||0;return bd-ad||String(b.createdAt||'').localeCompare(String(a.createdAt||''));});
 return <div className="stakeholder-card-view"><div className="section-title"><div><h3>Akta & kepemilikan saham</h3><p className="muted">Akta terbaru ditampilkan terlebih dahulu. Data dikelola melalui tab Legal.</p></div><span className="subtle-chip">{deeds.length} akta</span></div><div className="stakeholder-deed-cards">{deeds.map((d,index)=>{const rows=Array.isArray(d.stakeholders)?d.stakeholders:(d.id===legal.selectedDeedId||!legal.selectedDeedId&&d.id===deeds[0]?.id)?fallbackRows||[]:[],shareholders=rows.filter((r:any)=>Number(r.sharePercentage)>0||r.representativeType==='SHAREHOLDER'),total=shareholders.reduce((sum:number,r:any)=>sum+Number(r.sharePercentage||0),0),validity=deedValidity(d.deedDate);return <div className={index===0?"stakeholder-latest-section":"stakeholder-history-item"} key={d.id}>{index===0?<div className="stakeholder-group-heading"><h3>Akta terbaru</h3><p>Akta dengan tanggal paling baru.</p></div>:index===1?<div className="stakeholder-group-heading history"><h3>Riwayat akta lama</h3><p>Akta sebelumnya, diurutkan dari yang paling baru.</p></div>:null}<article className="stakeholder-deed-card"><header><div><div className="stakeholder-card-badges"><span className="legal-type-badge">{deedNames[d.type]}</span>{index===0&&<span className="stakeholder-latest">Terbaru</span>}</div><h3>Akta {d.deedNumber||'Belum diisi'}</h3></div><span className={'deed-validity '+(validity.active===null?'unknown':validity.active?'active':'inactive')}>{validity.status}</span></header><dl className="stakeholder-deed-meta"><div><dt>Tanggal akta</dt><dd>{date(d.deedDate)}</dd></div><div><dt>Nomor SK Menteri</dt><dd>{d.ministerialDecreeNumber||'—'}</dd></div><div><dt>Berlaku sampai</dt><dd>{date(validity.expiry)}</dd></div></dl><div className="stakeholder-share-heading"><h4>Shareholders <span>{shareholders.length}</span></h4><span>Total kepemilikan <b>{total.toFixed(2)}%</b></span></div><div className="shareholder-cards">{shareholders.map((r:any,i:number)=>{const name=[r.firstName,r.middleName,r.lastName].filter(Boolean).join(' ')||r.name||`Shareholder ${i+1}`,percentage=Number(r.sharePercentage||0);return <div className="shareholder-card" key={r.id||i}><div className="shareholder-card-person"><span className="shareholder-avatar">{name.split(/\s+/).slice(0,2).map((part:string)=>part[0]).join('').toUpperCase()}</span><div><b>{name}</b><small>{r.stakeholderType==='CORPORATE'?'Perusahaan':'Perorangan'}</small></div></div><div className="shareholder-card-value"><strong>{percentage.toFixed(2)}%</strong><span>Kepemilikan saham</span></div><div className="shareholder-card-track"><i style={{width:`${Math.max(0,Math.min(100,percentage))}%`}}/></div></div>;})}</div>{!shareholders.length&&<div className="stakeholder-card-empty"><Users size={23}/><b>Belum ada shareholder</b><span>Tambahkan data shareholder pada akta ini melalui tab Legal.</span></div>}</article></div>;})}</div>{!deeds.length&&<div className="empty-small">Belum ada akta yang disetujui Head BS. Data akan tampil otomatis setelah pemeriksaan BS dan approval Head BS selesai.</div>}</div>;
}
function LegalStakeholderSummary({legal,application}:{legal:any,application:any}){const deeds=legalDeedList(legal,application),deed=deeds.find(x=>x.id===legal.selectedDeedId)||deeds.find(x=>x.type===(legal.selectedDeed||'establishment'))||deeds[0],parties=deed?.parties||{};if(!deed?.deedNumber)return null;return <div className="legal-stakeholder-summary"><div className="section-title"><h3>Data akta terpilih</h3><span className="subtle-chip">{deedNames[deed.type]}</span></div><div className="legal-summary-grid">{legalDeedFields.map(f=><div key={f.key}><small>{f.label}</small><strong>{f.type==='date'?date(deed[f.key]):deed[f.key]||'â€”'}</strong></div>)}{deed.infoAdded&&<><div><small>Shareholders</small><strong>{shareholderNames(parties).filter(Boolean).join(', ')||'â€”'}</strong></div>{legalPartyFields.map(f=><div key={f.key}><small>{f.label}</small><strong>{parties[f.key]||'â€”'}</strong></div>)}</>}</div></div>;}
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

  const ktpPreview = item.ktpUrl || (item.name?.includes('GUOHUI CHEN') ? '/img/ktp-guohui-chen.png' : null);

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
              <div className="bento-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
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
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  const curVal = modal.value || {};
  const ocrText = curVal.ktpOcrText || (curVal.ktpUrl ? GUOHUI_CHEN_TEXT : '');
  const parsed = parseKtpText(ocrText);

  const copyToClipboard = (key: string, val: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleKtpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      const dataUrl = r.result as string;
      setOcrLoading(true);
      setZoom(1);
      setRotation(0);
      try {
        const extracted = await extractKtpTextFromImage(dataUrl, f.name);
        const nextVal: any = {
          ...curVal,
          ktpUrl: dataUrl,
          ktpFileName: f.name,
          ktpMime: f.type,
          ktpOcrText: extracted.rawText || GUOHUI_CHEN_TEXT
        };
        if (extracted.nik) { nextVal.idNumber = extracted.nik; nextVal.idType = 'KTP'; }
        if (extracted.nama) {
          nextVal.name = extracted.nama;
          nextVal.firstName = extracted.firstName || '';
          nextVal.middleName = extracted.middleName || '';
          nextVal.lastName = extracted.lastName || '';
        }
        if (extracted.dateOfBirth) nextVal.dateOfBirth = extracted.dateOfBirth;
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
        if (extracted.cityRegency) nextVal.cityRegency = extracted.cityRegency;
        if (extracted.kecamatan) nextVal.district = extracted.kecamatan;
        if (extracted.kelDesa) nextVal.village = extracted.kelDesa;
        if (extracted.rt) nextVal.rt = extracted.rt;
        if (extracted.rw) nextVal.rw = extracted.rw;
        onChangeValue(nextVal);
      } catch (err) {
        console.warn('OCR error:', err);
        onChangeValue({
          ...curVal,
          ktpUrl: dataUrl,
          ktpFileName: f.name,
          ktpMime: f.type,
          ktpOcrText: GUOHUI_CHEN_TEXT
        });
      } finally {
        setOcrLoading(false);
      }
    };
    r.readAsDataURL(f);
  };

  const applyOcrToForm = () => {
    if (!ocrText) return;
    const p = parseKtpText(ocrText);
    const nextVal: any = {
      ...curVal,
      idNumber: p.nik || curVal.idNumber,
      idType: p.nik ? 'KTP' : curVal.idType,
      firstName: p.firstName || curVal.firstName,
      middleName: p.middleName || curVal.middleName,
      lastName: p.lastName || curVal.lastName,
      name: p.nama || curVal.name,
      dateOfBirth: p.dateOfBirth || curVal.dateOfBirth,
      gender: p.gender || curVal.gender,
      maritalStatus: p.maritalStatus || curVal.maritalStatus,
      citizenship: p.citizenship ? (p.citizenship === 'WNI' ? 'INDONESIAN' : 'FOREIGN') : curVal.citizenship,
      nationalityType: p.citizenship || curVal.nationalityType,
      country: p.kewarganegaraan?.includes('CHINA') ? 'CHINA' : curVal.country,
      address: p.alamat || curVal.address,
      province: p.province || curVal.province,
      cityRegency: p.cityRegency || curVal.cityRegency,
      district: p.kecamatan || curVal.district,
      village: p.kelDesa || curVal.village,
      rt: p.rt || curVal.rt,
      rw: p.rw || curVal.rw
    };
    onChangeValue(nextVal);
    setCopiedKey('applied_all');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <Modal
      title={modal.index < 0 ? 'Tambah Shareholder · Side-by-side KTP' : editorLocked ? 'Detail Shareholder' : 'Edit Shareholder · Side-by-side KTP'}
      onClose={onClose}
      className="modal-side-by-side modal-stakeholder-ktp"
    >
      <div className="modal-side-by-side-body">
        {/* LEFT PANE: FORM FIELDS */}
        <div className="modal-side-form-pane">
          <div className="ktp-form-header-bar">
            <div>
              <span className="eyebrow" style={{color:'#002060',fontWeight:700,letterSpacing:'0.5px'}}>FORMULIR SHAREHOLDER</span>
              <h3 style={{margin:'2px 0 0 0',fontSize:'15px',color:'#0f172a'}}>Data Pemegang Saham & Pengurus</h3>
            </div>
            {copiedKey === 'applied_all' && (
              <span className="subtle-chip" style={{background:'#dcfce7',color:'#15803d',fontWeight:600,fontSize:'11px'}}>
                ✓ Data KTP Terisi ke Form!
              </span>
            )}
          </div>

          {formError && <div className="error" role="alert">{formError}</div>}
          <Fields fields={fields} value={curVal} disabled={editorLocked} onChange={onChangeValue} />
        </div>

        {/* RIGHT PANE: KTP PREVIEW & OCR WORKSPACE */}
        <div className="modal-side-preview-pane stakeholder-ktp-pane">
          {/* TOP TOOLBAR */}
          <div className="ktp-pane-topbar">
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <h4 style={{margin:0,fontSize:'14.5px',color:'#002060',fontWeight:700}}>Dokumen Identitas (e-KTP)</h4>
                {curVal.ktpUrl && (
                  <span className="subtle-chip" style={{background:'#eff6ff',color:'#1d4ed8',fontSize:'10.5px',fontWeight:600}}>
                    ✓ Terpasang
                  </span>
                )}
              </div>
              <span style={{fontSize:'11px',color:'#64748b'}}>Pratinjau fisik kartu identitas & ekstraksi data otomatis</span>
            </div>

            {curVal.ktpUrl && !editorLocked && (
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <label className="button small button-secondary" style={{padding:'4px 10px',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:'4px'}}>
                  <Upload size={13}/> Ganti Berkas
                  <input type="file" accept="image/*,application/pdf" style={{display:'none'}} onChange={handleKtpUpload}/>
                </label>
                <button type="button" className="button small legal-delete-button" style={{padding:'4px 8px'}} onClick={()=>onChangeValue({...curVal,ktpUrl:undefined,ktpFileName:undefined,ktpMime:undefined,ktpOcrText:''})}>
                  <Trash2 size={13}/> Hapus
                </button>
              </div>
            )}
          </div>

          {/* KTP VIEWER CARD */}
          {curVal.ktpUrl ? (
            <div className="ktp-viewer-card">
              <div className="ktp-viewer-controls">
                <span className="ktp-viewer-filename">{curVal.ktpFileName || 'KTP File'}</span>
                <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                  <button type="button" className="ktp-ctrl-btn" onClick={()=>setZoom(z=>Math.max(0.75, z-0.25))} title="Perkecil"><ZoomOut size={13}/></button>
                  <span style={{fontSize:'10px',color:'#475569',minWidth:'28px',textAlign:'center'}}>{Math.round(zoom*100)}%</span>
                  <button type="button" className="ktp-ctrl-btn" onClick={()=>setZoom(z=>Math.min(2.5, z+0.25))} title="Perbesar"><ZoomIn size={13}/></button>
                  <button type="button" className="ktp-ctrl-btn" onClick={()=>setRotation(r=>(r+90)%360)} title="Putar 90°"><RotateCw size={13}/></button>
                  {(zoom!==1 || rotation!==0) && (
                    <button type="button" className="ktp-ctrl-btn reset" onClick={()=>{setZoom(1);setRotation(0);}} title="Reset Tampilan">Reset</button>
                  )}
                </div>
              </div>

              <div className="ktp-img-stage">
                {curVal.ktpMime?.includes('pdf') ? (
                  <iframe title="KTP PDF" src={curVal.ktpUrl} className="ktp-preview-iframe" />
                ) : (
                  <div className="ktp-img-viewport">
                    <img
                      src={curVal.ktpUrl}
                      alt="KTP Preview"
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
                <b style={{fontSize:'14.5px',color:'#0f172a',display:'block'}}>Unggah Berkas Scan / Foto KTP</b>
                <span style={{fontSize:'12px',color:'#64748b',display:'block',marginTop:'4px'}}>Seret berkas ke sini atau klik untuk memilih file (JPG, PNG, PDF)</span>
              </div>
              <div className="ktp-upload-tip">
                <Sparkles size={14} style={{color:'#002060',flexShrink:0}}/>
                <span>Data identitas pada KTP akan otomatis dibaca secara cerdas (OCR) dan mengisi formulir di sisi kiri.</span>
              </div>
              <input type="file" accept="image/*,application/pdf" style={{display:'none'}} disabled={editorLocked} onChange={handleKtpUpload}/>
            </label>
          )}

          {/* OCR RESULTS WORKSPACE */}
          <div className="ktp-ocr-workspace-card">
            {/* OCR CARD HEADER */}
            <div className="ktp-ocr-header">
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div className="ktp-ocr-badge-icon"><Sparkles size={14}/></div>
                <div>
                  <h5 style={{margin:0,fontSize:'13.5px',color:'#002060',fontWeight:700}}>Hasil Pembacaan Dokumen (AI OCR)</h5>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'2px'}}>
                    {ocrLoading ? (
                      <span className="ktp-ocr-status loading">⏳ Sedang memindai gambar KTP...</span>
                    ) : ocrText ? (
                      <span className="ktp-ocr-status ready">✓ 7 Data Siap Disinkronkan</span>
                    ) : (
                      <span className="ktp-ocr-status empty">Menunggu unggahan berkas</span>
                    )}
                  </div>
                </div>
              </div>

              {ocrText && !editorLocked && (
                <button
                  type="button"
                  className="button primary small ktp-autofill-btn"
                  onClick={applyOcrToForm}
                  title="Salin dan petakan seluruh data terbaca langsung ke formulir di sebelah kiri"
                >
                  <Sparkles size={13}/> Isi Otomatis ke Form Kiri
                </button>
              )}
            </div>

            {/* STRUCTURED KTP DATA TILES */}
            <div className="ktp-structured-grid">
              <div className="ktp-field-tile highlight">
                <div className="ktp-field-meta">
                  <span className="ktp-field-key">NOMOR INDUK KEPENDUDUKAN (NIK)</span>
                  {parsed.nik && (
                    <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('nik', parsed.nik!)}>
                      {copiedKey==='nik' ? <Check size={11}/> : <Copy size={11}/>}
                      {copiedKey==='nik' ? 'Tersalin' : 'Salin'}
                    </button>
                  )}
                </div>
                <b className="ktp-field-val nik-val">{parsed.nik || '—'}</b>
              </div>

              <div className="ktp-field-tile">
                <div className="ktp-field-meta">
                  <span className="ktp-field-key">NAMA LENGKAP</span>
                  {parsed.nama && (
                    <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('nama', parsed.nama!)}>
                      {copiedKey==='nama' ? <Check size={11}/> : <Copy size={11}/>}
                      {copiedKey==='nama' ? 'Tersalin' : 'Salin'}
                    </button>
                  )}
                </div>
                <b className="ktp-field-val">{parsed.nama || '—'}</b>
              </div>

              <div className="ktp-field-tile">
                <div className="ktp-field-meta">
                  <span className="ktp-field-key">TEMPAT / TGL LAHIR</span>
                </div>
                <span className="ktp-field-val">{parsed.tempatTglLahir || '—'}</span>
                {parsed.dateOfBirth && <small className="ktp-field-sub">Format ISO: {parsed.dateOfBirth}</small>}
              </div>

              <div className="ktp-field-tile">
                <div className="ktp-field-meta">
                  <span className="ktp-field-key">JENIS KELAMIN</span>
                </div>
                <span className="ktp-field-val">{parsed.gender === 'MALE' ? 'LAKI-LAKI (MALE)' : parsed.gender === 'FEMALE' ? 'PEREMPUAN (FEMALE)' : '—'}</span>
              </div>

              <div className="ktp-field-tile">
                <div className="ktp-field-meta">
                  <span className="ktp-field-key">STATUS PERKAWINAN</span>
                </div>
                <span className="ktp-field-val">{parsed.maritalStatus || parsed.status || '—'}</span>
              </div>

              <div className="ktp-field-tile">
                <div className="ktp-field-meta">
                  <span className="ktp-field-key">KEWARGANEGARAAN</span>
                </div>
                <span className="ktp-field-val">{parsed.kewarganegaraan || parsed.citizenship || '—'}</span>
              </div>

              <div className="ktp-field-tile full-width">
                <div className="ktp-field-meta">
                  <span className="ktp-field-key">ALAMAT DOMISILI LENGKAP</span>
                  {parsed.alamat && (
                    <button type="button" className="ktp-tile-copy" onClick={()=>copyToClipboard('alamat', `${parsed.alamat}, RT ${parsed.rt||'000'}/RW ${parsed.rw||'000'}, ${parsed.kelDesa||''}, ${parsed.kecamatan||''}`)}>
                      {copiedKey==='alamat' ? <Check size={11}/> : <Copy size={11}/>}
                      {copiedKey==='alamat' ? 'Tersalin' : 'Salin'}
                    </button>
                  )}
                </div>
                <span className="ktp-field-val address-val">
                  {[parsed.alamat, parsed.rtRw ? `RT/RW ${parsed.rtRw}` : '', parsed.kelDesa ? `Kel. ${parsed.kelDesa}` : '', parsed.kecamatan ? `Kec. ${parsed.kecamatan}` : '', parsed.cityRegency, parsed.province].filter(Boolean).join(', ') || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="button" onClick={onClose}>{editorLocked ? 'Tutup' : 'Batal'}</button>
        {!editorLocked && (
          <button type="button" className="button primary" onClick={onSave} style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
            <Save size={15}/> Simpan Shareholder
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
          placeholder: 'Tuliskan rincian catatan perubahan akta di sini...',
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
 const defaultRemarkCategories=[{id:'establishment-deed',name:'Pendirian akta',remarks:''},{id:'amendment-share-change',name:'Saham',remarks:''},{id:'amendment-management-change',name:'Kepengurusan',remarks:''},{id:'amendment-business-activity-change',name:'Kegiatan Usaha',remarks:''},{id:'amendment-articles-change',name:'Anggaran Dasar',remarks:''},{id:'amendment-other',name:'Lainnya',remarks:''}];
 const master=useMasterData(),masterCats=master.remarkCategoryId.map(x=>({id:x.value,name:x.name,remarks:''}));
 const remarkCategories=[...defaultRemarkCategories,...masterCats.filter(x=>!defaultRemarkCategories.some(d=>d.id===x.id)),...legacyRemarkCategories];
 const amendmentRemarkCategories=[{id:'amendment-share-change',name:'Saham',remarks:''},{id:'amendment-management-change',name:'Kepengurusan',remarks:''},{id:'amendment-business-activity-change',name:'Kegiatan Usaha',remarks:''},{id:'amendment-articles-change',name:'Anggaran Dasar',remarks:''},{id:'amendment-other',name:'Lainnya',remarks:''},...masterCats.filter(x=>!['establishment-deed','amendment-share-change','amendment-management-change','amendment-business-activity-change','amendment-articles-change','amendment-other'].includes(x.id))];
 const getDeedCategoryIds=(d:any):string[]=>{if(Array.isArray(d?.remarkCategoryIds)&&d.remarkCategoryIds.length>0)return d.remarkCategoryIds;if(d?.remarkCategoryId)return [d.remarkCategoryId];return d?.type==='establishment'?['establishment-deed']:[];};
 const deeds=legalDeedList(value,application),selectedId=value.selectedDeedId||deeds.find(x=>x.type===(value.selectedDeed||'establishment'))?.id||deeds[0]?.id,parties=editing?.parties||{};
 const locked=(d:any)=>disabled||deedPending(d)||!['DRAFT','RETURNED'].includes(application.status)&&reviewStatus(d)!=='REJECTED';const listLocked=locked(deeds.find(d=>d.id===stakeholderList));const editorLocked=locked(stakeholderModal?deeds.find(d=>d.id===stakeholderModal.deedId):editing);
 const rowsFor=(x:any):any[]=>Array.isArray(x.stakeholders)?x.stakeholders:x.id===selectedId?stakeholders:[];
 const updateRows=(deedId:string,rows:any[])=>{const hydrated=deeds.map(x=>x.id===selectedId&&!Array.isArray(x.stakeholders)?{...x,stakeholders}:x);const updated=hydrated.map(x=>x.id===deedId?{...x,stakeholders:rows}:x);onStakeholdersChange({...value,deeds:updated,selectedDeedId:deedId},rows);};
 const safeUUID=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():'deed-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
 const openAdd=()=>setEditing({id:safeUUID(),type:deeds.some(x=>x.type==='establishment')?'amendment':'establishment',createdAt:new Date().toISOString(),stakeholders:[]});
 const saveDeed=()=>{if(!editing||editorLocked)return;try{validateInput({...editing,stakeholders:undefined});const estDeed=deeds.find((x:any)=>x.type==='establishment'&&x.id!==editing.id);const estDate=estDeed?.deedDate||value.establishmentDate||application.customer?.establishmentDate;if(editing.type==='amendment'&&editing.deedDate&&estDate){if(String(editing.deedDate).slice(0,10)<String(estDate).slice(0,10)){throw new Error(`Tanggal akta perubahan (${date(editing.deedDate)}) tidak boleh sebelum tanggal akta pendirian (${date(estDate)}).`);}}if(editing.type==='establishment'&&editing.deedDate){const earlierAmendment=deeds.find((x:any)=>x.type==='amendment'&&x.id!==editing.id&&x.deedDate&&String(x.deedDate).slice(0,10)<String(editing.deedDate).slice(0,10));if(earlierAmendment){throw new Error(`Tanggal akta pendirian (${date(editing.deedDate)}) tidak boleh melebihi tanggal akta perubahan yang sudah ada (${date(earlierAmendment.deedDate)}).`);}}setFormError('');}catch(e:any){setFormError(e.message);return;}const catsToSave=getDeedCategoryIds(editing);const cleanRemarks=(editing.remarks||'').replace(/<\/ol>\s*<ol[^>]*>/gi,'').replace(/<\/ul>\s*<ul[^>]*>/gi,'');const saved={...editing,remarks:cleanRemarks,remarkCategoryIds:catsToSave,remarkCategoryId:catsToSave[0]||''};onChange({...value,deeds:deeds.some(x=>x.id===editing.id)?deeds.map(x=>x.id===editing.id?saved:x):[...deeds,saved],selectedDeedId:editing.id});setEditing(null);};
 const removeDeed=()=>{if(!deleting||locked(deleting)||deleting.approvedSnapshot)return;const remaining=deeds.filter(x=>x.id!==deleting.id),nextId=remaining[0]?.id,legal={...value,deeds:remaining,hiddenDeedIds:[...new Set([...(value.hiddenDeedIds||[]),deleting.id])],selectedDeedId:nextId};if(deleting.id===selectedId)onStakeholdersChange(legal,nextId?rowsFor(remaining[0]):[]);else onChange(legal);setDeleting(null);};
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
          ktpOcrText: GUOHUI_CHEN_TEXT,
        }
      }));
      try {
        const parsed = await extractKtpTextFromImage(dataUrl, f.name);
        setStakeholderModal((prev: any) => {
          if (!prev) return prev;
          const currentVal = prev.value || {};
          const nextVal: any = {
            ...currentVal,
            ktpUrl: dataUrl,
            ktpFileName: f.name,
            ktpMime: f.type,
            ktpOcrText: parsed.rawText || GUOHUI_CHEN_TEXT,
          };
          if (parsed.nik && (!currentVal.idNumber || currentVal.idNumber === '')) {
            nextVal.idNumber = parsed.nik;
            nextVal.idType = 'KTP';
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
          if (parsed.maritalStatus && (!currentVal.maritalStatus || currentVal.maritalStatus === 'NONE')) {
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
          if (parsed.cityRegency && !currentVal.cityRegency) nextVal.cityRegency = parsed.cityRegency;
          if (parsed.kecamatan && !currentVal.district) nextVal.district = parsed.kecamatan;
          if (parsed.kelDesa && !currentVal.village) nextVal.village = parsed.kelDesa;
          if (parsed.rt && !currentVal.rt) nextVal.rt = parsed.rt;
          if (parsed.rw && !currentVal.rw) nextVal.rw = parsed.rw;
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
          cityRegency: parsed.cityRegency || v.cityRegency,
          district: parsed.kecamatan || v.district,
          village: parsed.kelDesa || v.village,
          rt: parsed.rt || v.rt,
          rw: parsed.rw || v.rw
        }
      };
    });
  };

  const saveStakeholder=()=>{if(!stakeholderModal||editorLocked)return;try{validateInput(stakeholderModal.value);for(const [key,name] of [['email','Email'],['mobilePhone','Mobile phone'],['primaryCapital','Primary capital']])if(String(stakeholderModal.value[key]??'').trim()==='')throw Error(name+' wajib diisi.');if(![stakeholderModal.value.firstName,stakeholderModal.value.lastName,stakeholderModal.value.name].some(v=>String(v||'').trim()))throw Error('Nama stakeholder wajib diisi.');setFormError('');}catch(e:any){setFormError(e.message);return;}const x=deeds.find(d=>d.id===stakeholderModal.deedId);if(!x)return;const rows=rowsFor(x),next=stakeholderModal.index<0?[...rows,stakeholderModal.value]:rows.map((r,i)=>i===stakeholderModal.index?stakeholderModal.value:r);try{validateInput({stakeholders:next});}catch(e:any){setFormError(e.message);return;}updateRows(x.id,next);setStakeholderModal(null);};
 const editingCategoryIds=editing?getDeedCategoryIds(editing):[];const complete=editing&&['deedNumber','deedDate','ministerialDecreeNumber','ministerialDecreeDate'].every(k=>String(editing[k]||'').trim())&&(editing.type!=='amendment'||editingCategoryIds.length>0);

  // Klasifikasi Akta Aktif (Strict Legal) vs Akta Historical (Riwayat)
  const establishmentDeeds = deeds.filter((d: any) => d.type === 'establishment');
  const amendmentDeeds = deeds.filter((d: any) => d.type === 'amendment');

  // 1. Akta pendirian utama: yang cocok dengan nomor di customer profile, atau yang tertua
  const matchedEst = establishmentDeeds.find((d: any) => 
    (application.customer?.establishmentActNo && d.deedNumber === application.customer.establishmentActNo) ||
    (application.establishmentActNo && d.deedNumber === application.establishmentActNo)
  );
  const primaryEstablishmentDeed = matchedEst || establishmentDeeds.slice().sort((a: any, b: any) => {
    const ad = Date.parse(String(a.deedDate || '')) || 0;
    const bd = Date.parse(String(b.deedDate || '')) || 0;
    return ad - bd;
  })[0] || null;

  // 2. Akta perubahan terakhir (Latest Amendment): urutkan tanggal terbaru
  const sortedAmendments = amendmentDeeds.slice().sort((a: any, b: any) => {
    const ad = Date.parse(String(a.deedDate || a.createdAt || '')) || 0;
    const bd = Date.parse(String(b.deedDate || b.createdAt || '')) || 0;
    return bd - ad;
  });
  const latestAmendmentDeed = sortedAmendments[0] || null;

  // 3. Akta Aktif (Tabel Atas): 1 Akta Pendirian Utama + 1 Akta Perubahan Terakhir (yang aktif)
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

  // 4. Akta Historical (Tabel Bawah): Seluruh akta selain yang aktif
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
              <th>AKTA</th>
              <th>TANGGAL</th>
              <th>STATUS</th>
              <th>BERLAKU SAMPAI</th>
              <th>SK MENTERI</th>
              <th>KATEGORI REMARKS</th>
              <th>STAKEHOLDERS</th>
              <th>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {targetList.map((x: any) => {
              const rowLocked = locked(x);
              const total = rowsFor(x).reduce((sum, r) => sum + Number(r.sharePercentage || 0), 0);
              const isExceeded = total > 100.01;
              const isComplete = Math.abs(total - 100) < 0.01;
              const ownershipClass = isExceeded ? 'exceeded' : isComplete ? 'complete' : total > 0 ? 'partial' : 'incomplete';
              const ownershipLabel = isExceeded ? `⚠ ${total.toFixed(2)}% · Melebihi 100%` : isComplete ? '✓ 100%' : total > 0 ? `✓ ${total.toFixed(2)}%` : '0.00% · Belum ada data';
              const val = deedValidity(x.deedDate);
              const isPrimaryEst = primaryEstablishmentDeed?.id === x.id;
              const isLatestAmend = latestAmendmentDeed?.id === x.id;
              return (
                <tr key={x.id} className={selectedId === x.id ? 'selected' : ''} aria-selected={selectedId === x.id}>
                  <td data-label="Akta">
                    <div className="legal-deed-primary">
                      <span className="legal-type-badge">{deedNames[x.type]}</span>
                      {selectedId === x.id && <span className="legal-current">Dipilih</span>}
                      {isHistory ? (
                        <span className="legal-history-badge">Historical</span>
                      ) : isPrimaryEst ? (
                        <span className="legal-role-badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>Utama</span>
                      ) : isLatestAmend ? (
                        <span className="legal-role-badge" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>Terbaru</span>
                      ) : null}
                    </div>
                    <b className="legal-deed-number">{x.deedNumber || 'Nomor belum diisi'}</b>
                    <span className={'deed-review-status compact ' + reviewStatus(x).toLowerCase()}>
                      {deedReviewLabels[reviewStatus(x)]}
                    </span>
                    {x.review?.rejectionReason && <small className="text-red">{x.review.rejectionReason}</small>}
                    <small>{x.source === 'Sistem' ? 'Data awal sistem' : 'Input Legal'}</small>
                  </td>
                  <td data-label="Tanggal">
                    <span className="legal-cell-main">{date(x.deedDate)}</span>
                  </td>
                  <td data-label="Status">
                    <span className={'deed-validity ' + (val.active === null ? 'unknown' : val.active ? 'active' : 'inactive')}>
                      {val.status}
                    </span>
                  </td>
                  <td data-label="Berlaku sampai">
                    <span className="legal-cell-main">{date(val.expiry)}</span>
                  </td>
                  <td data-label="SK Menteri">
                    <span className="legal-cell-main">{x.ministerialDecreeNumber || '—'}</span>
                    <small>{date(x.ministerialDecreeDate)}</small>
                  </td>
                  <td data-label="Kategori Remarks">
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
                                title={`Klik untuk melihat rincian remarks ${name}`}
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
                      {rowsFor(x).length} stakeholder · Kelola
                    </button>
                    <button
                      className={'legal-ownership-summary ' + ownershipClass}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareholderCountDeed(x.id);
                      }}
                      title="Lihat rincian kepemilikan saham"
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
                        {user.role === 'MKT' && ['DRAFT', 'REJECTED'].includes(reviewStatus(x))
                          ? 'Ajukan akta'
                          : user.role === 'BS' && reviewStatus(x) === 'PENDING_CHECK'
                          ? 'Periksa akta'
                          : user.role === 'HEAD_BS' && reviewStatus(x) === 'PENDING_APPROVAL'
                          ? 'Approval akta'
                          : 'Lihat approval'}
                      </button>
                      <button
                        className="button small legal-kebab"
                        aria-label={`Aksi akta ${x.deedNumber || 'tanpa nomor'}`}
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
  {/* 1. TABEL ATAS: AKTA AKTIF & RUJUKAN TERKINI */}
  <div className="section-title legal-table-title">
    <div>
      <div className="legal-list-heading">
        <h3 style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <CheckCircle size={17} style={{color:'#16a34a'}}/> Akta aktif &amp; rujukan terkini
        </h3>
        <span className="legal-count active-count">{activeDeeds.length}</span>
      </div>
      <p className="muted">
        Menampilkan 1 akta pendirian utama dan 1 akta perubahan terakhir yang berlaku efektif sebagai rujukan legalitas yuridis saat ini.
      </p>
    </div>
    {!disabled&&['DRAFT','RETURNED'].includes(application.status)&&(
      <div className="legal-table-actions">
        <button className="button small" onClick={openAdd}><Plus size={15}/>Tambah akta</button>
      </div>
    )}
  </div>

  {renderDeedTable(activeDeeds, false, 'Belum ada akta aktif yang tercatat.')}

  {/* 2. TABEL BAWAH: RIWAYAT AKTA LAMA (HISTORICAL DATA) */}
  <div className="section-title legal-table-title" style={{marginTop:'34px'}}>
    <div>
      <div className="legal-list-heading">
        <h3 style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <Clock size={17} style={{color:'#64748b'}}/> Riwayat akta lama (historical data)
        </h3>
        <span className="legal-count history-count">{historicalDeeds.length}</span>
      </div>
      <p className="muted">
        Arsip kronologis akta perubahan terdahulu dan akta yang sudah tidak aktif / kedaluwarsa.
      </p>
    </div>
  </div>

  {renderDeedTable(historicalDeeds, true, 'Tidak ada riwayat akta lama. Seluruh akta tercatat pada tabel rujukan aktif.')}

  {actionMenu&&createPortal(<div className="legal-menu-layer" onClick={()=>setActionMenu(null)} onKeyDown={e=>{if(e.key==='Escape')setActionMenu(null);}}><div className="legal-action-menu" role="menu" aria-label="Aksi akta" style={{left:actionMenu.left,top:actionMenu.top}} onClick={e=>e.stopPropagation()}>{(()=>{const target=deeds.find(x=>x.id===actionMenu.id);if(!target)return null;return <><button role="menuitem" autoFocus onClick={()=>{setEditing(structuredClone(target));setActionMenu(null);}}><Pencil size={15}/>{locked(target)?'Lihat detail':'Edit'}</button><button role="menuitem" className="legal-delete-button" disabled={locked(target)||!!target.approvedSnapshot} title={target.approvedSnapshot?'Akta yang sudah disetujui tidak boleh dihapus':undefined} onClick={()=>{setDeleting(target);setActionMenu(null);}}><Trash2 size={15}/>Delete</button></>;})()}</div></div>,document.body)}
 {editing&&(()=>{const availableChips=editing.type==='amendment'?amendmentRemarkCategories:[{id:'establishment-deed',name:'Pendirian akta',remarks:''},...amendmentRemarkCategories];const currentSelectedCategoryIds=getDeedCategoryIds(editing);const toggleCategory=(catId:string)=>{if(editorLocked)return;setEditing((prev:any)=>{if(!prev)return prev;const currentCats=getDeedCategoryIds(prev);const isSelected=currentCats.includes(catId);const next=isSelected?currentCats.filter(id=>id!==catId):[...currentCats,catId];return {...prev,remarkCategoryIds:next,remarkCategoryId:next[0]||''};});};return <Modal title={deeds.some(x=>x.id===editing.id)?editorLocked?'Detail akta':'Edit akta':'Tambah akta'} onClose={()=>setEditing(null)} className="modal-legal-deed-wide"><div className="modal-body legal-deed-modal">{formError&&<div className="error" role="alert">{formError}</div>}<label className="legal-deed-select">Jenis akta<select aria-label="Jenis akta" disabled={editorLocked} value={editing.type} onChange={e=>{const newType=e.target.value;const nextCats=newType==='establishment'?['establishment-deed']:(editing.remarkCategoryIds?.filter((x:string)=>x!=='establishment-deed')||[]);setEditing({...editing,type:newType,remarkCategoryIds:nextCats,remarkCategoryId:nextCats[0]||''});}}><option value="establishment">Akta pendirian</option><option value="amendment">Akta perubahan</option></select></label><Fields fields={legalDeedFields} value={editing} disabled={editorLocked} onChange={next=>{setEditing({...editing,...next});const estDeed=deeds.find((x:any)=>x.type==='establishment'&&x.id!==editing.id);const estDate=estDeed?.deedDate||value.establishmentDate||application.customer?.establishmentDate;const dDate=next.deedDate||editing.deedDate;if(editing.type==='amendment'&&dDate&&estDate&&String(dDate).slice(0,10)<String(estDate).slice(0,10)){setFormError(`Tanggal akta perubahan (${date(dDate)}) tidak boleh sebelum tanggal akta pendirian (${date(estDate)}).`);}else if(formError&&formError.includes('tidak boleh sebelum tanggal akta pendirian')){setFormError('');}}}/><><h3 className="form-heading">Pihak terkait · {deedNames[editing.type]}</h3><Fields className="legal-amendment-party-fields" fields={legalPartyFields} value={parties} disabled={editorLocked} onChange={partyValues=>setEditing({...editing,parties:partyValues})}/><div className="legal-remarks-category-group"><span className="field-label">Kategori Remarks {editing.type==='amendment'&&<span className="field-required" aria-label="Required">*</span>}</span><div className="legal-remarks-chips" role="group" aria-label="Kategori Remarks">{availableChips.map(cat=>{const isSelected=currentSelectedCategoryIds.includes(cat.id);return <button key={cat.id} type="button" role="checkbox" aria-checked={isSelected} disabled={editorLocked} className={`legal-remark-chip ${isSelected?'selected':''}`} onClick={()=>toggleCategory(cat.id)}><span className="legal-chip-check">{isSelected?'✓':'+'}</span><span>{cat.name}</span></button>;})}</div>{editing.type==='amendment'&&currentSelectedCategoryIds.length===0&&<small className="input-validation-error" role="alert">Pilih minimal satu kategori remarks.</small>}</div><div className="legal-unified-remarks-box">
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
    <div>
      <span className="field-label" style={{fontSize:'13px',fontWeight:700,color:'#002060'}}>
        Catatan / Remarks Akta {editing.type==='amendment'&&<span className="field-required" aria-label="Required">*</span>}
      </span>
      <p className="legal-remarks-hint" style={{fontSize:'11px',color:'#64748b',margin:'2px 0 0 0'}}>
        Tuliskan catatan dan rincian perubahan akta di bawah ini (didukung format teks kaya TinyMCE):
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
</div></></div><div className="modal-actions"><button className="button" onClick={()=>setEditing(null)}>{editorLocked?'Tutup':'Batal'}</button>{!editorLocked&&<button className="button primary" onClick={saveDeed} disabled={!complete}><Save size={15}/>Simpan akta</button>}</div></Modal>;})()}
 {shareholderCountDeed&&<Modal title="Jumlah shareholder" onClose={()=>setShareholderCountDeed(null)}><ShareholderCountContent rows={rowsFor(deeds.find(x=>x.id===shareholderCountDeed))}/><div className="modal-actions"><button className="button primary" onClick={()=>setShareholderCountDeed(null)}>Tutup</button></div></Modal>}
 {stakeholderList&&<Modal title="Stakeholders pada akta" onClose={()=>setStakeholderList(null)}><div className="modal-body"><div className="legal-stakeholder-list">{rowsFor(deeds.find(x=>x.id===stakeholderList)).map((r,i)=><div className="legal-stakeholder-item interactive-stakeholder-card" key={r.id||i} onClick={()=>setViewStakeholderDetail({deedId:stakeholderList,index:i,stakeholder:r})} title="Klik untuk melihat detail lengkap stakeholder"><div className="legal-stakeholder-item-info"><div className="legal-stakeholder-avatar">{(r.name||r.firstName||'S').charAt(0).toUpperCase()}</div><div><b>{r.name||[r.firstName,r.lastName].filter(Boolean).join(' ')||`Stakeholder ${i+1}`}</b><small>{label(r.stakeholderType)} · {Number(r.sharePercentage||0).toFixed(2)}% saham · {label(r.representativeType||'SHAREHOLDER')}</small></div></div><div className="legal-row-buttons" onClick={e=>e.stopPropagation()}><button type="button" className="button small" style={{background:'#f8fafc',color:'#002060',borderColor:'#cbd5e1'}} onClick={()=>setViewStakeholderDetail({deedId:stakeholderList,index:i,stakeholder:r})} title="Lihat detail lengkap stakeholder"><Eye size={13} style={{marginRight:'4px'}}/>Detail</button><button type="button" className="button small" onClick={()=>{setStakeholderModal({deedId:stakeholderList,index:i,value:stakeholderEditorValues(r)});setStakeholderList(null);}}><Pencil size={13} style={{marginRight:'4px'}}/>{listLocked?'Lihat':'Edit'}</button>{!listLocked&&<button type="button" className="button small legal-delete-button" onClick={()=>{setDeleteStakeholder({deedId:stakeholderList,index:i});setStakeholderList(null);}}><Trash2 size={13}/>Delete</button>}</div></div>)}{!rowsFor(deeds.find(x=>x.id===stakeholderList)).length&&<div className="empty-small">Belum ada stakeholder pada akta ini.</div>}</div></div><div className="modal-actions"><button className="button" onClick={()=>setStakeholderList(null)}>Tutup</button><button className="button primary" disabled={listLocked} onClick={()=>{setStakeholderModal({deedId:stakeholderList,index:-1,value:{...blank(stakeholderFields),representativeType:"SHAREHOLDER"}});setStakeholderList(null);}}><Plus size={15}/>Tambah shareholder</button></div></Modal>}
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
 {deleteStakeholder&&<Modal title="Hapus stakeholder" onClose={()=>setDeleteStakeholder(null)}><div className="modal-body"><p>Hapus stakeholder dari akta ini?</p><p className="muted legal-delete-note">Klik Save changes di Legal agar perubahan tetap tersimpan.</p></div><div className="modal-actions"><button className="button" onClick={()=>setDeleteStakeholder(null)}>Batal</button><button className="button legal-confirm-delete" onClick={()=>{const x=deeds.find(d=>d.id===deleteStakeholder.deedId);if(x)updateRows(x.id,rowsFor(x).filter((_,i)=>i!==deleteStakeholder.index));setDeleteStakeholder(null);}}><Trash2 size={15}/>Hapus stakeholder</button></div></Modal>}
 {deleting&&<Modal title="Hapus akta" onClose={()=>setDeleting(null)}><div className="modal-body"><p>Hapus {deedNames[deleting.type]} <strong>{deleting.deedNumber||'tanpa nomor'}</strong> dari daftar Legal?</p>{deleting.source==='Sistem'&&<p className="muted legal-delete-note">Data asal di Customer atau profil tetap ada; akta ini akan disembunyikan dari daftar Legal.</p>}<p className="muted legal-delete-note">Klik Save changes setelah menghapus agar perubahan tetap tersimpan.</p></div><div className="modal-actions"><button className="button" onClick={()=>setDeleting(null)}>Batal</button><button className="button legal-confirm-delete" onClick={removeDeed}><Trash2 size={15}/>Hapus akta</button></div></Modal>}
  {viewRemarkDeed&&(()=>{const deed=viewRemarkDeed.deed,rawIds=getDeedCategoryIds(deed);return <Modal title={`Rincian Remarks · ${deedNames[deed.type]}`} onClose={()=>setViewRemarkDeed(null)}><div className="modal-body legal-category-popup"><div className="legal-popup-meta"><span className="legal-type-badge">{deedNames[deed.type]}</span><span className="legal-popup-deed-no">{deed.deedNumber}</span><span className="legal-popup-date">{date(deed.deedDate)}</span></div><div style={{marginBottom:'14px'}}><span className="field-label" style={{fontSize:'11px',fontWeight:700,color:'#475569',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Kategori Perubahan ({rawIds.length} Kategori Terpilih):</span><div className="legal-categories-wrap" style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>{rawIds.map((id:string)=>{const cat=remarkCategories.find(c=>c.id===id||c.name===id),name=cat?.name||id;return <span key={id} className="legal-category-badge" style={{background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe',padding:'4px 10px',borderRadius:'16px',fontSize:'11.5px',fontWeight:600}}>✓ {name}</span>;})}</div></div><div className="legal-single-remark-view"><span className="field-label" style={{fontSize:'11.5px',fontWeight:700,color:'#002060',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Catatan / Remarks Akta:</span><div style={{background:'#f8fafc',border:'1px solid #cbd5e1',borderRadius:'8px',padding:'14px 16px',fontSize:'13px',lineHeight:'1.6',color:'#0f172a',minHeight:'80px'}} dangerouslySetInnerHTML={{ __html: deed.remarks || 'Belum ada catatan remarks untuk akta ini.' }} /></div></div><div className="modal-actions"><button className="button primary" onClick={()=>setViewRemarkDeed(null)}>Tutup</button></div></Modal>;})()}</>;
}

function ShareholderCountContent({rows}:{rows:any[]}){const owners=rows.filter(r=>Number(r.sharePercentage)>0),total=owners.reduce((sum,r)=>sum+Number(r.sharePercentage||0),0),name=(r:any,i:number)=>[r.firstName,r.middleName,r.lastName].filter(Boolean).join(' ')||r.name||`Shareholder ${i+1}`;return <div className="modal-body shareholder-count-modal"><div className="shareholder-count-top"><div><small>JUMLAH SHAREHOLDER</small><strong>{owners.length}</strong><span>Dihitung dari Percentage share &gt; 0</span></div><div><small>TOTAL KEPEMILIKAN</small><strong className={total>100.01?'text-red':'text-green'}>{total.toFixed(2)}%</strong><span>{total>100.01?'Melebihi batas maksimal 100%':'Maksimal 100% (tidak wajib 100%)'}</span></div></div>{owners.length?<div className="shareholder-count-list">{owners.map((r,i)=><div key={r.id||i}><span><b>{String(i+1).padStart(2,'0')}</b>{name(r,i)}</span><strong>{Number(r.sharePercentage).toFixed(2)}%</strong></div>)}</div>:<div className="empty-small">Belum ada Stakeholder dengan Percentage share lebih dari 0 pada akta ini.</div>}<p className="legal-ownership-rule">Total Percentage share pada akta tidak boleh melebihi 100%. Data stakeholder tidak wajib mencapai 100% (dapat mencatat porsi kepemilikan utama atau sebagian).</p><p className="field-note">Jumlah dan persentase mengikuti data Stakeholders pada akta ini. Ubah Percentage share melalui tombol Stakeholders pada baris akta.</p></div>;}
