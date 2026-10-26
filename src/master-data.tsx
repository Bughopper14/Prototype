import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {Plus,Pencil,Search,Settings2,X,Save,MapPin,ChevronRight,Check,Trash2} from 'lucide-react';
import {api} from './api';
import {defaultMasterCatalog,masterGroups,masterKey,validateMasterCatalog,type MasterCatalog,type MasterItem} from './master-catalog';

const equipmentChildren=new Set(['brand','unitType','modelName','assetName']);
const locationGroups=new Set(['province','city','district','village']);

let catalog=defaultMasterCatalog(),revision=0;
export function setMasterData(data:{catalog:MasterCatalog,revision:number}){
  const def = defaultMasterCatalog();
  const next = { ...def, ...data.catalog };
  for (const k of ['district', 'village', 'postalCode'] as const) {
    if (!next[k] || next[k].length === 0) {
      next[k] = def[k];
    }
  }
  catalog = next;
  revision = data.revision;
  window.dispatchEvent(new Event('master-data-updated'));
}
export function useMasterData(){const [data,setData]=useState(catalog);useEffect(()=>{const update=()=>setData(catalog);window.addEventListener('master-data-updated',update);return()=>window.removeEventListener('master-data-updated',update);},[]);return data;}

const MANDATORY_STORAGE_KEY = 'liugong_mandatory_rules_cache';

function getInitialMandatoryRules(): any[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(MANDATORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}
  return [];
}

let mandatoryCatalogCache: any[] = getInitialMandatoryRules();
let mandatoryMapCache = new Map<string, boolean>();

function buildMandatoryMap(rules: any[]) {
  const map = new Map<string, boolean>();
  for (const r of rules) {
    if (!r) continue;
    const isMandatory = Boolean(r.mandatory);
    const fKey = String(r.field_key || '');
    const sec = String(r.section || '').toLowerCase();
    if (fKey) {
      map.set(`*:${fKey}`, isMandatory);
      if (sec) {
        map.set(`${sec}:${fKey}`, isMandatory);
      }
    }
  }
  return map;
}

mandatoryMapCache = buildMandatoryMap(mandatoryCatalogCache);

export function setMandatoryRules(data: any[]) {
  mandatoryCatalogCache = data;
  mandatoryMapCache = buildMandatoryMap(data);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(MANDATORY_STORAGE_KEY, JSON.stringify(data));
    }
  } catch {}
  window.dispatchEvent(new Event('mandatory-updated'));
}

let inFlightMandatoryPromise: Promise<any[]> | null = null;
export function fetchMandatoryRules(): Promise<any[]> {
  if (inFlightMandatoryPromise) return inFlightMandatoryPromise;
  inFlightMandatoryPromise = api('/mandatory').then((data: any) => {
    inFlightMandatoryPromise = null;
    if (Array.isArray(data)) {
      setMandatoryRules(data);
      return data;
    }
    return mandatoryCatalogCache;
  }).catch(() => {
    inFlightMandatoryPromise = null;
    return mandatoryCatalogCache;
  });
  return inFlightMandatoryPromise;
}

export function useMandatoryRules() {
  const [rules, setRules] = useState<any[]>(mandatoryCatalogCache);
  useEffect(() => {
    let active = true;
    if (!mandatoryCatalogCache.length) {
      fetchMandatoryRules().then(data => {
        if (active) setRules(data);
      });
    }
    const handleUpdate = () => {
      if (active) setRules([...mandatoryCatalogCache]);
    };
    window.addEventListener('mandatory-updated', handleUpdate);
    return () => {
      active = false;
      window.removeEventListener('mandatory-updated', handleUpdate);
    };
  }, []);
  return rules;
}

export function isFieldMandatory(rules: any[], section: string | undefined, fieldKey: string, defaultRequired?: boolean): boolean {
  if (!mandatoryMapCache.size && rules && rules.length) {
    mandatoryMapCache = buildMandatoryMap(rules);
  }
  if (!mandatoryMapCache.size) return false;
  const normSec = (section || '').toLowerCase();
  if (normSec) {
    if (mandatoryMapCache.has(`${normSec}:${fieldKey}`)) {
      return mandatoryMapCache.get(`${normSec}:${fieldKey}`)!;
    }
    if (normSec.includes('profile')) {
      for (const [k, v] of mandatoryMapCache) {
        if (k.endsWith(`:${fieldKey}`) && k.includes('profile')) return v;
      }
    }
    if (normSec.includes('pic')) {
      for (const [k, v] of mandatoryMapCache) {
        if (k.endsWith(`:${fieldKey}`) && k.includes('pic')) return v;
      }
    }
    if (normSec.includes('customer')) {
      for (const [k, v] of mandatoryMapCache) {
        if (k.endsWith(`:${fieldKey}`) && k.includes('customer')) return v;
      }
    }
  }
  if (mandatoryMapCache.has(`*:${fieldKey}`)) {
    return mandatoryMapCache.get(`*:${fieldKey}`)!;
  }
  return false;
}

export const cleanWilayahStr = (s: string) => String(s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

export const matchesMasterItem = (item: MasterItem, val: string) => {
  if (!item || !val) return false;
  if (item.value === val || item.name === val) return true;
  const cName = cleanWilayahStr(item.name);
  const cVal = cleanWilayahStr(val);
  if (cName === cVal) return true;
  if ((cVal === 'dkijakarta' || cVal === 'jakarta') && cName === 'daerahkhususibukotajakarta') return true;
  if ((cName === 'dkijakarta' || cName === 'jakarta') && cVal === 'daerahkhususibukotajakarta') return true;
  if (cName.length >= 4 && cVal.length >= 4 && (cName.includes(cVal) || cVal.includes(cName))) return true;
  return false;
};

export function resolveWilayahUpwards(record: any, data: MasterCatalog) {
  if (!data || !record) return record;
  const next = { ...record };
  const vList = data.village || [];
  const dList = data.district || [];
  const cList = data.city || [];
  const pList = data.province || [];

  const rawVill = next.village;
  const rawDist = next.district;
  const rawCity = next.city || next.cityRegency;
  const rawProv = next.province;
  const rawZip = next.postalCode;

  // 1. Try finding village
  let villageItem: MasterItem | undefined;
  if (rawVill) {
    villageItem = vList.find(x => matchesMasterItem(x, rawVill));
  }
  if (!villageItem && rawZip) {
    villageItem = vList.find(x => x.zipCode === String(rawZip).trim());
  }

  // 2. Try finding district
  let districtItem: MasterItem | undefined;
  if (villageItem?.parentValue) {
    districtItem = dList.find(x => x.value === villageItem!.parentValue);
  }
  if (!districtItem && rawDist) {
    districtItem = dList.find(x => matchesMasterItem(x, rawDist));
  }

  // 3. Try finding city
  let cityItem: MasterItem | undefined;
  if (districtItem?.parentValue) {
    cityItem = cList.find(x => x.value === districtItem!.parentValue);
  }
  if (!cityItem && rawCity) {
    cityItem = cList.find(x => matchesMasterItem(x, rawCity));
  }

  // 4. Try finding province
  let provItem: MasterItem | undefined;
  if (cityItem?.parentValue) {
    provItem = pList.find(x => x.value === cityItem!.parentValue);
  }
  if (!provItem && rawProv) {
    provItem = pList.find(x => matchesMasterItem(x, rawProv));
  }

  // Auto-populate upward hierarchy if missing
  if (provItem && (!next.province || next.province === '')) {
    next.province = provItem.name;
  }
  if (cityItem && (!next.cityRegency || next.cityRegency === '')) {
    next.cityRegency = cityItem.name;
    next.city = cityItem.name;
  }
  if (districtItem && (!next.district || next.district === '' || cleanWilayahStr(next.district) === cleanWilayahStr(districtItem.name) || next.district === districtItem.value)) {
    next.district = districtItem.name;
  }
  if (villageItem && (!next.village || next.village === '' || cleanWilayahStr(next.village) === cleanWilayahStr(villageItem.name) || next.village === villageItem.value)) {
    next.village = villageItem.name;
    if (!next.postalCode && villageItem.zipCode) {
      next.postalCode = villageItem.zipCode;
    }
  }

  return next;
}

export function masterEntries(data:MasterCatalog,key:string,value:any){
  const group=masterGroups.find(g=>g.key===masterKey(key));
  if(!group)return null;
  if(group.key==='postalCode'){
    const provinceValue=value?.province,cityValue=value?.city||value?.cityRegency;
    if(cityValue){
      const province=provinceValue?data.province?.find(x=>matchesMasterItem(x, provinceValue)):undefined;
      const city=data.city?.find(x=>matchesMasterItem(x, cityValue)&&(!province||x.parentValue===province.value));
      const targetCity=city?.value||cityValue;
      return (data.postalCode||[]).filter(x=>x.active&&x.parentValue===targetCity);
    }
    return (data.postalCode||[]).slice(0,50);
  }
  if(group.key==='village'){
    let parentDistrict=group.parentField?value?.[group.parentField]||value?.[masterKey(group.parentField)]:value?.district;
    if(parentDistrict){
      const pDid=(data.district||[]).find(x=>matchesMasterItem(x, parentDistrict))?.value||parentDistrict;
      return (data.village||[]).filter(x=>x.active&&x.parentValue===pDid);
    }
    const cVal=value?.city||value?.cityRegency;
    if(cVal){
      const cObj=(data.city||[]).find(x=>matchesMasterItem(x, cVal));
      if(cObj){
        const dSet=new Set((data.district||[]).filter(x=>x.parentValue===cObj.value).map(x=>x.value));
        return (data.village||[]).filter(x=>x.active&&!!x.parentValue&&dSet.has(x.parentValue));
      }
    }
    return (data.village||[]).slice(0,50);
  }
  let parentValue=group.parentField?value?.[group.parentField]||value?.[masterKey(group.parentField)]:undefined;
  if(!parentValue&&group.key==='district')parentValue=value?.city||value?.cityRegency;
  if(parentValue&&group.parent){
    const parent=data[group.parent]?.find(x=>matchesMasterItem(x, parentValue));
    parentValue=parent?.value||parentValue;
  }
  if(group.key==='district'||group.key==='city'){
    if(!parentValue)return (data[group.key]||[]).slice(0,50);
    return (data[group.key]||[]).filter(x=>x.active&&x.parentValue===parentValue);
  }
  if(equipmentChildren.has(group.key))return (data[group.key]||[]).filter(x=>x.active&&!!parentValue&&x.parentValue===parentValue);
  return (data[group.key]||[]).filter(x=>x.active&&(!parentValue||!x.parentValue||x.parentValue===parentValue));
}
export function resetMasterChildren(key:string,next:any,fieldKeys:string[]){const changed=new Set([masterKey(key)]);for(let pass=0;pass<masterGroups.length;pass++)for(const group of masterGroups)if(group.parent&&changed.has(group.parent)&&!changed.has(group.key)){changed.add(group.key);for(const child of fieldKeys)if(masterKey(child)===group.key)next[child]='';}return next;}
async function saveCatalog(next:MasterCatalog){validateMasterCatalog(next);const result=await api('/master-data','PUT',{catalog:next,revision});setMasterData(result);return result;}

export function MasterItemDialog({groupKey,item,onClose,onSaved,parentValue}:{groupKey:string,item?:MasterItem,onClose:()=>void,onSaved?:(item:MasterItem)=>void,parentValue?:string}){
 const data=useMasterData(),group=masterGroups.find(x=>x.key===groupKey)!;
 const [draft,setDraft]=useState<MasterItem>(item?{...item}:{value:'',name:'',active:true,parentValue:group.parent?(data[group.parent].find(x=>x.value===parentValue||x.name===parentValue)?.value||(groupKey==='province'?data.country.find(x=>x.active)?.value:'')||''):'',role:'BS',required:false,timing:'arrear'}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy)onClose();};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[busy,onClose]);
 async function save(){setBusy(true);setError('');try{if((locationGroups.has(groupKey)||groupKey==='postalCode'||equipmentChildren.has(groupKey))&&group.parent&&!draft.parentValue)throw new Error('Pilih '+masterGroups.find(x=>x.key===group.parent)?.name+' terlebih dahulu.');const value=locationGroups.has(groupKey)?item?.value||crypto.randomUUID():draft.value.trim()||draft.name.trim(),row={...draft,value,name:draft.name.trim()};const next={...data,[groupKey]:item?data[groupKey].map(x=>x.value===item.value&&(groupKey!=='postalCode'||x.parentValue===item.parentValue)?row:x):[...data[groupKey],row]};await saveCatalog(next);onSaved?.(row);onClose();}catch(e:any){setError(e.message);try{const latest=await api('/master-data');setMasterData(latest);}catch{} }finally{setBusy(false);}}
 return createPortal(<div className="modal-scrim master-modal-scrim"><section className="modal" role="dialog" aria-modal="true" aria-label={`${item?'Edit':'Tambah'} ${group.name}`}><div className="modal-head"><h2>{item?'Edit':'Tambah'} · {group.name}</h2><button className="icon-button" disabled={busy} onClick={onClose} aria-label="Tutup"><X size={20}/></button></div><div className="modal-body"><div className="formgrid"><label>Nama pilihan<input autoFocus maxLength={150} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>{!locationGroups.has(groupKey)&&<label>Kode / nilai<input disabled={!!item} maxLength={150} placeholder="Otomatis mengikuti nama jika kosong" value={draft.value} onChange={e=>setDraft({...draft,value:e.target.value})}/></label>}{group.parent&&<label>{masterGroups.find(x=>x.key===group.parent)?.name}<select value={draft.parentValue||''} onChange={e=>setDraft({...draft,parentValue:e.target.value,...(groupKey==='village'?{zipCode:''}:{})})}><option value="">{locationGroups.has(groupKey)||groupKey==='postalCode'||equipmentChildren.has(groupKey)?'Pilih induk':'Semua / tanpa induk'}</option>{data[group.parent].filter(x=>x.active||x.value===draft.parentValue).map(x=><option key={x.value} value={x.value}>{x.name}</option>)}</select></label>}{groupKey==='province'&&<label>Region<input maxLength={100} placeholder="Nama region (opsional)" value={draft.region||''} onChange={e=>setDraft({...draft,region:e.target.value})}/></label>}{groupKey==='village'&&<label>ZIP code<select aria-label="ZIP code" value={draft.zipCode||''} onChange={e=>setDraft({...draft,zipCode:e.target.value})}><option value="">Pilih ZIP code (opsional)</option>{data.postalCode.filter(x=>x.value===draft.zipCode||x.active&&(!x.parentValue||x.parentValue===data.district.find(d=>d.value===draft.parentValue)?.parentValue)).map(x=><option key={x.value} value={x.value}>{x.name}</option>)}</select></label>}<label>Status<select value={draft.active?'active':'inactive'} onChange={e=>setDraft({...draft,active:e.target.value==='active'})}><option value="active">Aktif</option><option value="inactive">Tidak aktif</option></select></label>{groupKey==='documents'&&<><label>Departemen pemeriksa<select value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value})}>{['BS','CA','LEGAL'].map(x=><option key={x}>{x}</option>)}</select></label><label>Dokumen wajib<select value={draft.required?'yes':'no'} onChange={e=>setDraft({...draft,required:e.target.value==='yes'})}><option value="yes">Wajib</option><option value="no">Opsional</option></select></label></>}{groupKey==='paymentMethod'&&<label>Aturan perhitungan pembayaran<select value={draft.timing} onChange={e=>setDraft({...draft,timing:e.target.value})}><option value="arrear">Dibayar di akhir periode</option><option value="advance">Dibayar di awal periode</option></select></label>}</div>{error&&<div className="error" role="alert">{error}</div>}<p className="master-help">Pilihan aktif akan tersedia di dropdown form. Menonaktifkan pilihan tidak menghapus data aplikasi yang sudah tersimpan.</p></div><div className="modal-actions"><button className="button" disabled={busy} onClick={onClose}>Batal</button><button className="button primary" disabled={busy||!draft.name.trim()} onClick={save}><Save size={15}/>{busy?'Menyimpan…':'Simpan pilihan'}</button></div></section></div>,document.body);
}

export function MasterSelect({fieldKey,value,record,disabled,required,onChange,placeholder,onFocus}:{fieldKey:string,value:string,record:any,disabled:boolean,required?:boolean,onChange:(v:string)=>void,placeholder?:string,onFocus?:()=>void}){
 const data=useMasterData(),entries=masterEntries(data,fieldKey,record)||[],group=masterGroups.find(g=>g.key===masterKey(fieldKey))!,cleanVal=(value==='-'||(fieldKey==='postalCode'&&value==='00000'))?'':value,existing=data[group.key]?.find(x=>matchesMasterItem(x, cleanVal)),selectedValue=existing?.value||cleanVal,storeName=group.key==='province'||group.key==='city'||group.key==='district'||group.key==='village';
 const select=(id:string)=>{const item=entries.find(x=>x.value===id)||data[group.key]?.find(x=>x.value===id);onChange(storeName&&item?item.name:id);};
 const emptyLabel = placeholder || (group.key === 'remarkCategoryId' ? 'Pilih Kategori' : `Pilih ${group.name}`);
 return <select required={required} disabled={disabled} value={selectedValue} onFocus={onFocus} onChange={e=>select(e.target.value)}><option value="">{emptyLabel}</option>{selectedValue&&!entries.some(x=>x.value===selectedValue)&&<option value={selectedValue}>{existing?.name||value}{existing&&!existing.active?' · Tidak aktif':''}</option>}{entries.map(x=><option key={x.value} value={x.value}>{x.name}</option>)}</select>;
}

export function MasterMandatoryView({canManage=true, onLogActivity}:{canManage?:boolean, onLogActivity?:(msg:string)=>void}){
  const rules = useMandatoryRules();
  const [search, setSearch] = useState('');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | '1' | '0'>('ALL');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const sections = ['ALL', 'Company Profile', 'Primary Contact (PIC)', 'Customer'];

  const visible = rules.filter(x => {
    const matchSection = selectedSection === 'ALL' || x.section === selectedSection;
    const matchStatus = statusFilter === 'ALL' || (statusFilter === '1' ? Boolean(x.mandatory) : !x.mandatory);
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      String(x.field_label || '').toLowerCase().includes(q) ||
      String(x.field_key || '').toLowerCase().includes(q) ||
      String(x.section || '').toLowerCase().includes(q);
    return matchSection && matchStatus && matchSearch;
  });

  async function handleToggle(item: any, forceStatus?: number) {
    if (!canManage) return;
    const nextVal = forceStatus !== undefined ? forceStatus : (item.mandatory ? 0 : 1);
    setBusyId(item.id);
    try {
      const res = await api('/mandatory', 'PUT', { id: item.id, mandatory: nextVal });
      if (Array.isArray(res)) {
        setMandatoryRules(res);
      }
      const label = item.field_label || item.field_key;
      const msg = `Kolom "${label}" berhasil diubah menjadi ${nextVal ? 'Wajib (1)' : 'Opsional (0)'}.`;
      setToast(msg);
      onLogActivity?.(`Mengubah status mandatory kolom ${label} (${item.field_key}) menjadi ${nextVal ? 'Wajib' : 'Opsional'}`);
      setTimeout(() => setToast(''), 3500);
    } catch (e: any) {
      alert('Gagal mengubah status mandatory: ' + e.message);
    } finally {
      setBusyId(null);
    }
  }

  const mandatoryCount = rules.filter(x => x.mandatory).length;

  return (
    <div className="master-content">
      <div className="section-title">
        <div>
          <h3>Field Mandatory</h3>
          <p className="muted">
            Kelola aturan kolom apakah wajib diisi (1) atau opsional (0). Perubahan langsung disimpan dan otomatis menampilkan tanda bintang merah (*) pada form aplikasi.
          </p>
        </div>
      </div>

      {toast && (
        <div style={{
          padding: '10px 14px',
          background: '#ecfdf5',
          border: '1px solid #6ee7b7',
          color: '#065f46',
          borderRadius: 6,
          fontSize: 12,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Check size={16} color="#059669" />
          <span>{toast}</span>
        </div>
      )}

      {/* Filter Chips and Search Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <div className="search" style={{ margin: 0, flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={16} />
          <input
            placeholder="Cari label field atau kode kolom..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sections.map(sec => {
            const count = sec === 'ALL' ? rules.length : rules.filter(x => x.section === sec).length;
            const label = sec === 'ALL' ? 'Semua Bagian' : sec === 'Primary Contact (PIC)' ? 'PIC' : sec;
            return (
              <button
                key={sec}
                type="button"
                className={selectedSection === sec ? 'button small primary' : 'button small'}
                onClick={() => setSelectedSection(sec)}
                style={{ fontSize: 11, padding: '5px 10px' }}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)' }}
          >
            <option value="ALL">Semua Status</option>
            <option value="1">Hanya Wajib (1)</option>
            <option value="0">Hanya Opsional (0)</option>
          </select>
        </div>
      </div>

      {/* Summary Box */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        padding: '10px 14px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        fontSize: 11,
        color: '#475569',
        marginBottom: 16,
        alignItems: 'center'
      }}>
        <span>Total Kolom: <b>{rules.length}</b></span>
        <span>•</span>
        <span style={{ color: '#dc2626', fontWeight: 600 }}>
          * Wajib (1): <b>{mandatoryCount}</b>
        </span>
        <span>•</span>
        <span style={{ color: '#475569' }}>
          Opsional (0): <b>{rules.length - mandatoryCount}</b>
        </span>
      </div>

      <div className="table-scroll">
        <table className="data-table master-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>NO</th>
              <th>BAGIAN (SECTION)</th>
              <th>NAMA FIELD (LABEL)</th>
              <th>KODE KOLOM (FIELD KEY)</th>
              <th style={{ textAlign: 'center', width: 140 }}>STATUS MANDATORY</th>
              {canManage && <th style={{ textAlign: 'right', width: 190 }}>AKSI</th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((x, idx) => (
              <tr key={x.id}>
                <td style={{ color: '#9ca3af', fontSize: 11 }}>{idx + 1}</td>
                <td>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: x.section === 'Primary Contact (PIC)' ? '#1d4ed8' : x.section === 'Customer' ? '#6d28d9' : '#047857',
                    background: x.section === 'Primary Contact (PIC)' ? '#eff6ff' : x.section === 'Customer' ? '#f5f3ff' : '#ecfdf5',
                    padding: '2px 7px',
                    borderRadius: 4,
                    display: 'inline-block'
                  }}>
                    {x.section}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: '#0f172a' }}>
                  {x.field_label}
                </td>
                <td>
                  <code style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, color: '#334155' }}>
                    {x.field_key}
                  </code>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {x.mandatory ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#b91c1c',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      padding: '2px 8px',
                      borderRadius: 9999
                    }}>
                      * Wajib (1)
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: 11,
                      color: '#64748b',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '2px 8px',
                      borderRadius: 9999
                    }}>
                      Opsional (0)
                    </span>
                  )}
                </td>
                {canManage && (
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        disabled={busyId === x.id}
                        className={x.mandatory ? 'button small' : 'button primary small'}
                        style={{ fontSize: 11, padding: '3px 8px' }}
                        onClick={() => handleToggle(x)}
                        title={x.mandatory ? 'Ubah menjadi opsional (0)' : 'Jadikan kolom wajib (1)'}
                      >
                        {busyId === x.id ? (
                          'Menyimpan...'
                        ) : x.mandatory ? (
                          <>
                            <X size={12} style={{ marginRight: 3 }} />
                            Set Opsional (0)
                          </>
                        ) : (
                          <>
                            <Check size={12} style={{ marginRight: 3 }} />
                            Set Wajib (1)
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === x.id}
                        className="button small"
                        style={{ fontSize: 11, padding: '3px 7px' }}
                        onClick={() => setEditingItem(x)}
                        title="Edit aturan kolom"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <div className="empty-small">Tidak ada kolom yang cocok dengan pencarian atau filter.</div>
        )}
      </div>

      {editingItem && (
        <EditMandatoryDialog
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={(status) => {
            handleToggle(editingItem, status);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

function EditMandatoryDialog({ item, onClose, onSaved }: { item: any, onClose: () => void, onSaved: (status: number) => void }) {
  const [val, setVal] = useState<number>(item.mandatory ? 1 : 0);
  return createPortal(
    <div className="modal-scrim master-modal-scrim">
      <section className="modal" role="dialog" aria-modal="true" aria-label={`Edit Mandatory · ${item.field_label}`}>
        <div className="modal-head">
          <h2>Edit Aturan Mandatory · {item.field_label}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={20}/></button>
        </div>
        <div className="modal-body">
          <div className="formgrid">
            <label>Bagian (Section)
              <input disabled value={item.section} />
            </label>
            <label>Field Label
              <input disabled value={item.field_label} />
            </label>
            <label>Kode Kolom (Field Key)
              <input disabled value={item.field_key} />
            </label>
            <label>Status Mandatory di Database
              <select value={val} onChange={e => setVal(Number(e.target.value))}>
                <option value={0}>0 — Opsional (Tidak wajib diisi)</option>
                <option value={1}>1 — Wajib (Harus diisi, tanda bintang merah *)</option>
              </select>
            </label>
          </div>
          <p className="master-help">
            Jika diatur ke <b>Wajib (1)</b>, sistem akan memvalidasi pengisian kolom ini sebelum submit aplikasi ke BS, dan menampilkan tanda bintang merah (*) di label form.
          </p>
        </div>
        <div className="modal-actions">
          <button className="button" onClick={onClose}>Batal</button>
          <button className="button primary" onClick={() => onSaved(val)}>
            <Save size={15}/> Simpan Perubahan
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}

export function MasterDataPage(){
  const data=useMasterData(),[selected,setSelected]=useState('location'),[search,setSearch]=useState(''),[editing,setEditing]=useState<MasterItem|null|undefined>(undefined);
  const mandatoryRules=useMandatoryRules();
  const group=masterGroups.find(g=>g.key===selected)||masterGroups[0];
  const visible=(data[selected]||[]).filter(x=>(x.name+' '+x.value).toLowerCase().includes(search.toLowerCase()));

  async function handleDelete(item:MasterItem){
    if(!confirm(`Hapus "${item.name}" dari ${group.name}?`))return;
    const next={...data,[selected]:(data[selected]||[]).filter(x=>x.value!==item.value)};
    try{
      await saveCatalog(next);
    }catch(e:any){
      alert('Gagal menghapus: '+e.message);
    }
  }

  return (
    <section className="panel master-page">
      <div className="panel-head">
        <h2>Daftar master data</h2>
        <label className="master-type-picker">Pilih master data
          <select value={selected} onChange={e=>{setSelected(e.target.value);setSearch('');}}>
            <option value="location">Konfigurasi lokasi</option>
            <optgroup label="ATURAN FORM">
              <option value="master_mandatory">Field Mandatory</option>
            </optgroup>
            {[...new Set(masterGroups.map(x=>x.section))].map(section=><optgroup key={section} label={section}>{masterGroups.filter(x=>x.section===section).map(g=><option key={g.key} value={g.key}>{g.name}</option>)}</optgroup>)}
          </select>
        </label>
      </div>

      {selected==='location'?<LocationConfiguration/>:(
        <div className="master-page-layout">
          <div className="master-group-nav" role="navigation" aria-label="Jenis master data">
            <div key="aturan-mandatory">
              <h3>ATURAN FORM</h3>
              <button
                className={selected==='master_mandatory'?'active':''}
                onClick={()=>{setSelected('master_mandatory');setSearch('');}}
              >
                <span>Field Mandatory</span>
                <span style={{
                  background: mandatoryRules.some(x=>x.mandatory)?'#fee2e2':'#f3f4f6',
                  color: mandatoryRules.some(x=>x.mandatory)?'#b91c1c':'#6b7280',
                  padding:'1px 6px',
                  borderRadius:9999,
                  fontWeight:600
                }}>
                  {mandatoryRules.filter(x=>x.mandatory).length} / {mandatoryRules.length}
                </span>
              </button>
            </div>
            {[...new Set(masterGroups.map(x=>x.section))].map(section=><div key={section}><h3>{section}</h3>{masterGroups.filter(x=>x.section===section).map(g=><button className={selected===g.key?'active':''} key={g.key} onClick={()=>{setSelected(g.key);setSearch('');}}>{g.name}<span>{data[g.key]?.filter(x=>x.active).length||0}</span></button>)}</div>)}
          </div>

          {selected==='master_mandatory' ? (
            <MasterMandatoryView />
          ) : (
            <div className="master-content">
              <div className="section-title">
                <div>
                  <h3>{group.name}</h3>
                  <p className="muted">Kelola pilihan dropdown untuk {group.section}.</p>
                </div>
                <button className="button primary small" onClick={()=>setEditing(null)}><Plus size={15}/>Tambah data</button>
              </div>
              {group.key==='documents'&&<p className="master-help">Jenis dokumen, departemen pemeriksa, dan status wajib diterapkan pada aplikasi baru. Jenis dokumen aktif yang baru ditambahkan juga masuk ke checklist aplikasi lama, tanpa mengubah file dan status yang sudah ada.</p>}
              <div className="search">
                <Search size={16}/>
                <input aria-label="Cari master data" placeholder={locationGroups.has(selected)?"Cari nama…":"Cari nama atau kode…"} value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <div className="table-scroll">
                <table className="data-table master-table">
                  <thead>
                    <tr>
                      <th>NAMA</th>
                      {!locationGroups.has(selected)&&<th>KODE / NILAI</th>}
                      {group.parent&&<th>INDUK</th>}
                      {selected==='documents'&&<><th>DEPARTEMEN</th><th>WAJIB</th></>}
                      <th>STATUS</th>
                      <th>AKSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(x=><tr key={x.value}>
                      <td>{x.name}</td>
                      {!locationGroups.has(selected)&&<td>{x.value}</td>}
                      {group.parent&&<td>{data[group.parent].find(p=>p.value===x.parentValue)?.name||'Semua'}</td>}
                      {selected==='documents'&&<><td>{x.role}</td><td>{x.required?'Wajib':'Opsional'}</td></>}
                      <td><span className={'deed-validity '+(x.active?'active':'inactive')}>{x.active?'Aktif':'Tidak aktif'}</span></td>
                      <td>
                        <div style={{display:'inline-flex',gap:6,alignItems:'center'}}>
                          <button className="button small" onClick={()=>setEditing(x)}><Pencil size={13}/>Edit</button>
                          <button className="button small legal-delete-button" onClick={()=>handleDelete(x)} title={`Hapus ${x.name}`}><Trash2 size={13}/>Hapus</button>
                        </div>
                      </td>
                    </tr>)}
                  </tbody>
                </table>
                {!visible.length&&<div className="empty-small">Belum ada pilihan. Klik Tambah data untuk menambahkan.</div>}
              </div>
            </div>
          )}
        </div>
      )}
      {editing!==undefined&&<MasterItemDialog key={selected} groupKey={selected} item={editing||undefined} onClose={()=>setEditing(undefined)}/>}
    </section>
  );
}

function LocationConfiguration(){
 const data=useMasterData(),[countryValue,setCountry]=useState(''),[path,setPath]=useState<Record<string,string>>({}),[editing,setEditing]=useState<{key:string,item?:MasterItem,parent?:string}|null>(null),[search,setSearch]=useState(''),[showInactive,setShowInactive]=useState(false);
 const countries=data.country.filter(x=>x.active),country=countries.find(x=>x.value===countryValue)||countries[0];
 const groups=['province','city','district','village'];
 const levels:{key:string,parent?:MasterItem,items:MasterItem[],selected?:MasterItem}[]=[];
 for(const key of groups){const parent=levels.length?levels.at(-1)?.selected:country;const items=parent?(data[key]||[]).filter(x=>x.parentValue===parent.value||!x.parentValue):[];const selected=items.find(x=>x.value===path[key]&&x.active)||items.find(x=>x.active);levels.push({key,parent,items,selected});}
 const select=(key:string,value:string)=>setPath(old=>{const next={...old,[key]:value};for(const child of groups.slice(groups.indexOf(key)+1))delete next[child];return next;});
 return <div className="location-config"><div className="location-config-toolbar"><div><span className="location-eyebrow"><MapPin size={14}/>LOCATION CONFIGURATION</span><h3>Konfigurasi lokasi</h3><p>Pilih wilayah dari kiri ke kanan untuk mengelola data turunannya.</p></div><div className="location-country"><label>Country<select aria-label="Country lokasi" value={country?.value||''} onChange={e=>{setCountry(e.target.value);setPath({});}}><option value="">Pilih country</option>{countries.map(x=><option key={x.value} value={x.value}>{x.name}</option>)}</select></label><button className="button small" aria-label="Edit country" disabled={!country} onClick={()=>setEditing({key:'country',item:country})}><Pencil size={14}/></button><button className="button small" onClick={()=>setEditing({key:'country'})}><Plus size={14}/>Country</button></div></div><div className="location-config-controls"><div className="location-breadcrumb">{[country,...levels.map(x=>x.selected)].filter(Boolean).map((x,i)=><span key={i}>{i>0&&<ChevronRight size={12}/>}<b>{x?.name}</b></span>)}</div><div className="location-search"><Search size={14}/><input aria-label="Cari wilayah" placeholder="Cari wilayah..." value={search} onChange={e=>setSearch(e.target.value)}/></div><label className="checkbox"><input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)}/>Tampilkan tidak aktif</label></div><div className="location-columns">{levels.map(({key,parent,items,selected},index)=>{const title=masterGroups.find(g=>g.key===key)!.name,visible=items.filter(x=>(showInactive||x.active)&&x.name.toLowerCase().includes(search.toLowerCase()));return <section className="location-column" key={key} aria-label={title}><header><div><span className="location-step">{index+1}</span><h4>{title}</h4><span className="location-item-count">{items.filter(x=>x.active).length}</span></div><button className="location-add" aria-label={`Tambah ${title}`} title={parent?`Tambah ${title}`:'Pilih wilayah induk terlebih dahulu'} disabled={!parent} onClick={()=>setEditing({key,parent:parent?.value})}><Plus size={17}/></button></header><div className="location-parent-caption">{parent?.name||'Pilih wilayah induk'}</div><div className="location-column-scroll"><table><thead><tr><th>NAMA</th>{key==='province'&&<th>REGION</th>}{key==='village'&&<th>ZIP CODE</th>}<th/></tr></thead><tbody>{visible.map(x=><tr key={x.value} className={(selected?.value===x.value?'selected ':'')+(!x.active?'inactive':'')}><td><button className="location-select-row" disabled={!x.active} aria-pressed={selected?.value===x.value} onClick={()=>select(key,x.value)}><b>{x.name}</b>{!x.active&&<span>Tidak aktif</span>}</button></td>{key==='province'&&<td>{x.region||'—'}</td>}{key==='village'&&<td>{data.postalCode.find(p=>p.value===x.zipCode)?.name||x.zipCode||'—'}</td>}<td><button className="location-edit" aria-label={`Edit ${x.name}`} onClick={()=>setEditing({key,item:x,parent:parent?.value})}><Pencil size={13}/></button></td></tr>)}</tbody></table>{!visible.length&&<div className="location-empty">{!parent?'Pilih wilayah di panel sebelumnya.':search?'Tidak ada wilayah yang cocok.':`Belum ada ${title.toLowerCase()} untuk ${parent.name}.`}</div>}</div></section>;})}</div><div className="location-config-footer"><span>Pilihan aktif tersedia di form aplikasi. Gunakan Edit untuk mengubah data atau menonaktifkan wilayah.</span><button className="button small" onClick={()=>setEditing({key:'postalCode',parent:levels.find(x=>x.key==='city')?.selected?.value})}><Plus size={14}/>Tambah ZIP code</button></div>{editing&&<MasterItemDialog key={editing.key+':'+(editing.item?.value||'new')} groupKey={editing.key} item={editing.item} parentValue={editing.parent} onClose={()=>setEditing(null)} onSaved={item=>{if(editing.key==='country'){setCountry(item.value);setPath({});}else if(groups.includes(editing.key))select(editing.key,item.value);}}/>}</div>;
}
