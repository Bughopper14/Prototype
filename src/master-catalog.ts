export type MasterItem={value:string,name:string,active:boolean,parentValue?:string,required?:boolean,role?:string,timing?:string};
export type MasterCatalog=Record<string,MasterItem[]>;
export type MasterGroup={key:string,name:string,section:string,parent?:string,parentField?:string};
export const masterGroups:MasterGroup[]=[
 {key:'branchCode',name:'Branch',section:'Customer & PIC'},
 {key:'companyType',name:'Business category',section:'Customer & PIC'},
 {key:'industrySegment',name:'Industry',section:'Customer & PIC'},
 {key:'businessRole',name:'Business role',section:'Customer & PIC'},
 {key:'position',name:'Position PIC',section:'Customer & PIC'},
 {key:'remarkCategoryId',name:'Kategori Akta Perubahan',section:'Legal'},
 {key:'representativeType',name:'Representative type',section:'Legal'},
 {key:'designation',name:'Designation',section:'Legal'},
 {key:'country',name:'Country',section:'Alamat'},
 {key:'province',name:'Province',section:'Alamat',parent:'country',parentField:'country'},
 {key:'city',name:'Kota / Kabupaten',section:'Alamat',parent:'province',parentField:'province'},
 {key:'district',name:'Kecamatan',section:'Alamat',parent:'city',parentField:'cityRegency'},
 {key:'village',name:'Kelurahan / Desa',section:'Alamat',parent:'district',parentField:'district'},
 {key:'postalCode',name:'ZIP code',section:'Alamat',parent:'city',parentField:'cityRegency'},
 {key:'bankOrFinInstitution',name:'Bank / financial institution',section:'Business & banks'},
 {key:'projectRole',name:'Role in project',section:'Business & banks'},
 {key:'applicationSource',name:'Application source',section:'Business & banks'},
 {key:'unitCategory',name:'Unit category',section:'Equipment'},
 {key:'brand',name:'Brand',section:'Equipment',parent:'unitCategory',parentField:'unitCategory'},
 {key:'unitType',name:'Tipe',section:'Equipment',parent:'brand',parentField:'brand'},
 {key:'modelName',name:'Model',section:'Equipment',parent:'unitType',parentField:'unitType'},
 {key:'assetName',name:'Asset name',section:'Equipment',parent:'modelName',parentField:'modelName'},
 {key:'facilityPurpose',name:'Facility purpose',section:'Financing'},
 {key:'financingMethod',name:'Financing method',section:'Financing'},
 {key:'currency',name:'Currency',section:'Financing'},
 {key:'paymentMethod',name:'Payment timing',section:'Financing'},
 {key:'documents',name:'Jenis & dokumen wajib',section:'Documents'}
];
export const masterKey=(key:string)=>key==='cityRegency'?'city':key;
const options=(values:string[]):MasterItem[]=>values.map(value=>({value,name:value.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,x=>x.toUpperCase()),active:true}));
export function defaultMasterCatalog():MasterCatalog{
 const result:MasterCatalog={
 branchCode:options(['JKT01','BPN01','PLB01','MDN01','SBY01']),companyType:options(['CORPORATE','COMMERCIAL','MICRO','LIUGONG_USER']),
 industrySegment:options(['MINING','AGRICULTURE','FORESTRY','CONSTRUCTION','OIL_AND_GAS','OTHER']),businessRole:options(['CONS_OWNER','CONTRACTORS','SUB_CONT','RENTAL','OTHER']),
 position:options(['Finance Director','Director','Manager','Staff']),representativeType:options(['NONE','DIRECTOR','SHAREHOLDER','AUTHORIZED_SIGNATORY','OTHER']),designation:options(['NONE','DIRECTOR','COMMISSIONER','PRESIDENT_DIRECTOR','OWNER','MANAGER','OTHER']),
 country:options(['Indonesia']),province:options(['DKI Jakarta','Kalimantan Timur','Sumatera Selatan','Sumatera Utara','Jawa Timur']),city:options(['Jakarta Selatan','Jakarta','Balikpapan','Samarinda','Palembang','Medan','Surabaya']),district:options(['Pasar Minggu']),village:options(['Ragunan']),postalCode:[],
 bankOrFinInstitution:options(['Bank Mandiri','Bank BCA','Bank BRI','Bank BNI']),projectRole:options(['Main contractor','Subcontractor','Project owner']),applicationSource:options(['Direct','Dealer','Referral']),
 unitCategory:options(['HE','TRUCK']),brand:options(['LiuGong']),unitType:options(['Hydraulic excavator']),modelName:options(['936E']),assetName:options(['Excavator']),
 facilityPurpose:options(['INVESTMENT','WORKING_CAPITAL']),financingMethod:options(['FINANCIAL_LEASE','SALE_AND_LEASE_BACK','INSTALLMENT_FINANCING']),currency:options(['IDR']),paymentMethod:[{value:'In Arrear',name:'In Arrear',active:true,timing:'arrear'},{value:'In Advance',name:'In Advance',active:true,timing:'advance'}],
 remarkCategoryId:[['amendment-share-change','Perubahan Saham'],['amendment-management-change','Perubahan Kepengurusan'],['amendment-business-activity-change','Perubahan Kegiatan Usaha'],['amendment-articles-change','Perubahan Anggaran Dasar'],['amendment-other','Lainnya']].map(([value,name])=>({value,name,active:true})),
 documents:[['NIB','Business registration (NIB)','BS',true],['NPWP','Company tax registration (NPWP)','BS',true],['DEED','Establishment & latest deed','LEGAL',true],['KTP','Directors’ identification','BS',true],['FINANCIALS','Financial statements · 3 years','CA',true],['BANK','Bank statements · 6 months','CA',true],['CONTRACT','Project contracts / purchase orders','CA',false],['QUOTATION','Equipment quotation','BS',true],['LEGAL_OPINION','Legal opinion','LEGAL',true],['EKITAS','E-KITAS for foreign shareholders','LEGAL',false]].map(([value,name,role,required])=>({value:String(value),name:String(name),role:String(role),required:Boolean(required),active:true}))
 };
 result.province.forEach(x=>x.parentValue='Indonesia');
 const cityParents:Record<string,string>={'Jakarta Selatan':'DKI Jakarta',Jakarta:'DKI Jakarta',Balikpapan:'Kalimantan Timur',Samarinda:'Kalimantan Timur',Palembang:'Sumatera Selatan',Medan:'Sumatera Utara',Surabaya:'Jawa Timur'};result.city.forEach(x=>x.parentValue=cityParents[x.value]);result.district[0].parentValue='Jakarta Selatan';result.village[0].parentValue='Pasar Minggu';result.unitType[0].parentValue='LiuGong';result.modelName[0].parentValue='Hydraulic excavator';result.assetName[0].parentValue='936E';
 for(const key of ['branchCode','currency','unitCategory'])result[key].forEach(x=>x.name=x.value);
 return result;
}
export function validateMasterCatalog(input:unknown):MasterCatalog{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Master data tidak valid.');
 const result:MasterCatalog={};
 for(const group of masterGroups){
  const rows=(input as MasterCatalog)[group.key];
  if(!Array.isArray(rows)||rows.length>1000)throw Error(`Daftar ${group.name} tidak valid.`);
  const seen=new Set<string>();
  result[group.key]=rows.map(row=>{
   if(!row||typeof row.value!=='string'||typeof row.name!=='string'||typeof row.active!=='boolean')throw Error(`Data ${group.name} tidak valid.`);
   const value=row.value.trim(),name=row.name.trim();
   const valueLimit=({postalCode:20,currency:5,branchCode:20,brand:50,paymentMethod:50,position:100,projectRole:100,applicationSource:100,province:100,city:100,district:100,village:100,modelName:100} as Record<string,number>)[group.key]||150;
   if(value.length>valueLimit)throw Error(`Kode ${group.name} maksimal ${valueLimit} karakter.`);
   if(!value||value.length>150||!name||name.length>150)throw Error('Kode dan nama wajib diisi, maksimal 150 karakter.');
   if(seen.has(value.toLowerCase()))throw Error(`Kode duplikat pada ${group.name}.`);seen.add(value.toLowerCase());
   if(group.key==='documents'&&(!['BS','CA','LEGAL'].includes(row.role||'')||typeof row.required!=='boolean'))throw Error('Pilih departemen dokumen dan status wajib.');
   if(group.key==='paymentMethod'&&!['advance','arrear'].includes(row.timing||''))throw Error('Pilih aturan waktu pembayaran.');
   return {value,name,active:row.active,...(row.parentValue?{parentValue:String(row.parentValue)}:{}),...(group.key==='documents'?{role:row.role,required:row.required}:{}),...(group.key==='paymentMethod'?{timing:row.timing}:{})};
  });
 }
 for(const group of masterGroups){
  const seenNames=new Set<string>();
  for(const row of result[group.key]){
   const nameKey=(row.parentValue||'')+'|'+row.name.toLocaleLowerCase();
   if(seenNames.has(nameKey))throw Error(`Nama duplikat pada ${group.name}.`);seenNames.add(nameKey);
   if(group.parent&&row.parentValue&&!result[group.parent].some(p=>p.value===row.parentValue))throw Error(`Data induk tidak tersedia untuk ${group.name}.`);
  }
 }
 if(!result.documents.some(x=>x.value==='EKITAS'&&x.active)||!result.documents.some(x=>x.value==='LEGAL_OPINION'&&x.active&&x.required))throw Error('Dokumen E-KITAS dan Legal opinion wajib dipertahankan untuk alur review.');
 return result;
}
