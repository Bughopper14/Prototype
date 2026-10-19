export type MasterItem={value:string,name:string,active:boolean,parentValue?:string,required?:boolean,role?:string,timing?:string,areaCode?:string,region?:string,zipCode?:string};
export type MasterCatalog=Record<string,MasterItem[]>;
export type MasterGroup={key:string,name:string,section:string,parent?:string,parentField?:string};
export const masterGroups:MasterGroup[]=[
 {key:'branchCode',name:'Branch',section:'Customer & PIC'},
 {key:'companyType',name:'Business category',section:'Customer & PIC'},
 {key:'industrySegment',name:'Industry',section:'Customer & PIC'},
 {key:'businessRole',name:'Business role',section:'Customer & PIC'},
 {key:'position',name:'Position PIC',section:'Customer & PIC'},
 {key:'remarkCategoryId',name:'Kategori Remarks',section:'Legal'},
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
const initialDistricts: [string, string][] = [
 ['Pasar Minggu', 'Jakarta Selatan'],
 ['Kebayoran Baru', 'Jakarta Selatan'],
 ['Cilandak', 'Jakarta Selatan'],
 ['Setiabudi', 'Jakarta Selatan'],
 ['Tebet', 'Jakarta Selatan'],
 ['Gambir', 'Jakarta'],
 ['Tanah Abang', 'Jakarta'],
 ['Menteng', 'Jakarta'],
 ['Grogol Petamburan', 'Jakarta'],
 ['Kelapa Gading', 'Jakarta'],
 ['Balikpapan Kota', 'Balikpapan'],
 ['Balikpapan Selatan', 'Balikpapan'],
 ['Balikpapan Utara', 'Balikpapan'],
 ['Balikpapan Barat', 'Balikpapan'],
 ['Samarinda Kota', 'Samarinda'],
 ['Samarinda Ulu', 'Samarinda'],
 ['Samarinda Ilir', 'Samarinda'],
 ['Samarinda Utara', 'Samarinda'],
 ['Ilir Barat I', 'Palembang'],
 ['Ilir Timur I', 'Palembang'],
 ['Sukarami', 'Palembang'],
 ['Bukit Kecil', 'Palembang'],
 ['Medan Kota', 'Medan'],
 ['Medan Petisah', 'Medan'],
 ['Medan Barat', 'Medan'],
 ['Medan Sunggal', 'Medan'],
 ['Tegalsari', 'Surabaya'],
 ['Genteng', 'Surabaya'],
 ['Gubeng', 'Surabaya'],
 ['Wonokromo', 'Surabaya'],
 ['Rungkut', 'Surabaya'],
];

const initialPostalCodes: [string, string, string][] = [
 ['12550', '12550 - Ragunan', 'Jakarta Selatan'],
 ['12520', '12520 - Pasar Minggu', 'Jakarta Selatan'],
 ['12510', '12510 - Pejaten Barat', 'Jakarta Selatan'],
 ['12190', '12190 - Senayan', 'Jakarta Selatan'],
 ['12160', '12160 - Melawai', 'Jakarta Selatan'],
 ['12430', '12430 - Cilandak Barat', 'Jakarta Selatan'],
 ['12920', '12920 - Karet Setiabudi', 'Jakarta Selatan'],
 ['12930', '12930 - Karet Semanggi', 'Jakarta Selatan'],
 ['12940', '12940 - Karet Kuningan', 'Jakarta Selatan'],
 ['12810', '12810 - Tebet Barat', 'Jakarta Selatan'],
 ['10110', '10110 - Gambir', 'Jakarta'],
 ['10120', '10120 - Kebon Kelapa', 'Jakarta'],
 ['10250', '10250 - Kampung Bali', 'Jakarta'],
 ['10240', '10240 - Kebon Kacang', 'Jakarta'],
 ['10310', '10310 - Menteng', 'Jakarta'],
 ['11450', '11450 - Tanjung Duren', 'Jakarta'],
 ['14240', '14240 - Kelapa Gading Barat', 'Jakarta'],
 ['76111', '76111 - Prapatan', 'Balikpapan'],
 ['76112', '76112 - Klandasan Ulu', 'Balikpapan'],
 ['76113', '76113 - Klandasan Ilir', 'Balikpapan'],
 ['76115', '76115 - Sepinggan', 'Balikpapan'],
 ['76114', '76114 - Damai', 'Balikpapan'],
 ['76125', '76125 - Muara Rapak', 'Balikpapan'],
 ['76126', '76126 - Batu Ampar', 'Balikpapan'],
 ['75111', '75111 - Bugis', 'Samarinda'],
 ['75112', '75112 - Pelabuhan', 'Samarinda'],
 ['75124', '75124 - Air Putih', 'Samarinda'],
 ['75123', '75123 - Dadi Mulya', 'Samarinda'],
 ['75117', '75117 - Sungai Pinang', 'Samarinda'],
 ['30137', '30137 - Demang Lebar Daun', 'Palembang'],
 ['30139', '30139 - Bukit Baru', 'Palembang'],
 ['30122', '30122 - 16 Ilir', 'Palembang'],
 ['30152', '30152 - Sukarami', 'Palembang'],
 ['30135', '30135 - Bukit Kecil', 'Palembang'],
 ['20212', '20212 - Pasar Baru', 'Medan'],
 ['20213', '20213 - Mesjid', 'Medan'],
 ['20112', '20112 - Petisah Tengah', 'Medan'],
 ['20111', '20111 - Kesawan', 'Medan'],
 ['20122', '20122 - Sunggal', 'Medan'],
 ['60262', '60262 - Tegalsari', 'Surabaya'],
 ['60261', '60261 - Kedungdoro', 'Surabaya'],
 ['60271', '60271 - Embong Kaliasin', 'Surabaya'],
 ['60281', '60281 - Gubeng', 'Surabaya'],
 ['60242', '60242 - Wonokromo', 'Surabaya'],
 ['60293', '60293 - Rungkut Kidul', 'Surabaya'],
];

const initialVillages: [string, string, string][] = [
 ['Ragunan', 'Pasar Minggu', '12550'],
 ['Pasar Minggu', 'Pasar Minggu', '12550'],
 ['Pejaten Barat', 'Pasar Minggu', '12510'],
 ['Senayan', 'Kebayoran Baru', '12190'],
 ['Melawai', 'Kebayoran Baru', '12160'],
 ['Cilandak Barat', 'Cilandak', '12430'],
 ['Karet', 'Setiabudi', '12920'],
 ['Karet Semanggi', 'Setiabudi', '12930'],
 ['Karet Kuningan', 'Setiabudi', '12940'],
 ['Tebet Barat', 'Tebet', '12810'],
 ['Gambir', 'Gambir', '10110'],
 ['Kebon Kelapa', 'Gambir', '10120'],
 ['Kampung Bali', 'Tanah Abang', '10250'],
 ['Kebon Kacang', 'Tanah Abang', '10240'],
 ['Menteng', 'Menteng', '10310'],
 ['Tanjung Duren Utara', 'Grogol Petamburan', '11450'],
 ['Kelapa Gading Barat', 'Kelapa Gading', '14240'],
 ['Prapatan', 'Balikpapan Kota', '76111'],
 ['Klandasan Ulu', 'Balikpapan Kota', '76112'],
 ['Klandasan Ilir', 'Balikpapan Kota', '76113'],
 ['Sepinggan', 'Balikpapan Selatan', '76115'],
 ['Damai', 'Balikpapan Selatan', '76114'],
 ['Muara Rapak', 'Balikpapan Utara', '76125'],
 ['Batu Ampar', 'Balikpapan Utara', '76126'],
 ['Bugis', 'Samarinda Kota', '75111'],
 ['Pelabuhan', 'Samarinda Kota', '75112'],
 ['Air Putih', 'Samarinda Ulu', '75124'],
 ['Dadi Mulya', 'Samarinda Ulu', '75123'],
 ['Sungai Pinang Luar', 'Samarinda Ilir', '75117'],
 ['Demang Lebar Daun', 'Ilir Barat I', '30137'],
 ['Bukit Baru', 'Ilir Barat I', '30139'],
 ['16 Ilir', 'Ilir Timur I', '30122'],
 ['Sukarami', 'Sukarami', '30152'],
 ['24 Ilir', 'Bukit Kecil', '30135'],
 ['Pasar Baru', 'Medan Kota', '20212'],
 ['Mesjid', 'Medan Kota', '20213'],
 ['Petisah Tengah', 'Medan Petisah', '20112'],
 ['Kesawan', 'Medan Barat', '20111'],
 ['Sunggal', 'Medan Sunggal', '20122'],
 ['Tegalsari', 'Tegalsari', '60262'],
 ['Kedungdoro', 'Tegalsari', '60261'],
 ['Embong Kaliasin', 'Genteng', '60271'],
 ['Gubeng', 'Gubeng', '60281'],
 ['Wonokromo', 'Wonokromo', '60242'],
 ['Rungkut Kidul', 'Rungkut', '60293'],
];

export function defaultMasterCatalog():MasterCatalog{
 const result:MasterCatalog={
 branchCode:options(['JKT01','BPN01','PLB01','MDN01','SBY01']),companyType:options(['CORPORATE','COMMERCIAL','MICRO','LIUGONG_USER']),
 industrySegment:options(['MINING','AGRICULTURE','FORESTRY','CONSTRUCTION','OIL_AND_GAS','OTHER']),businessRole:options(['CONS_OWNER','CONTRACTORS','SUB_CONT','RENTAL','OTHER']),
 position:options(['Finance Director','Director','Manager','Staff']),representativeType:options(['NONE','DIRECTOR','SHAREHOLDER','AUTHORIZED_SIGNATORY','OTHER']),designation:options(['NONE','DIRECTOR','COMMISSIONER','PRESIDENT_DIRECTOR','OWNER','MANAGER','OTHER']),
 country:options(['Indonesia']),province:options(['DKI Jakarta','Kalimantan Timur','Sumatera Selatan','Sumatera Utara','Jawa Timur']),city:options(['Jakarta Selatan','Jakarta','Balikpapan','Samarinda','Palembang','Medan','Surabaya']),
 district:initialDistricts.map(([value,parentValue])=>({value,name:value,active:true,parentValue})),
 village:initialVillages.map(([value,parentValue,zipCode])=>({value,name:value,active:true,parentValue,zipCode})),
 postalCode:initialPostalCodes.map(([value,name,parentValue])=>({value,name,active:true,parentValue})),
 bankOrFinInstitution:options(['Bank Mandiri','Bank BCA','Bank BRI','Bank BNI']),projectRole:options(['Main contractor','Subcontractor','Project owner']),applicationSource:options(['Direct','Dealer','Referral']),
 unitCategory:options(['HE','TRUCK']),brand:options(['LiuGong']),unitType:options(['Hydraulic excavator']),modelName:options(['936E']),assetName:options(['Excavator']),
 facilityPurpose:options(['INVESTMENT','WORKING_CAPITAL']),financingMethod:options(['FINANCIAL_LEASE','SALE_AND_LEASE_BACK','INSTALLMENT_FINANCING']),currency:options(['IDR']),paymentMethod:[{value:'In Arrear',name:'In Arrear',active:true,timing:'arrear'},{value:'In Advance',name:'In Advance',active:true,timing:'advance'}],
 remarkCategoryId:[['amendment-share-change','Saham'],['amendment-management-change','Kepengurusan'],['amendment-business-activity-change','Kegiatan Usaha'],['amendment-articles-change','Anggaran Dasar'],['amendment-other','Lainnya'],['establishment-deed','Pendirian akta'],['akta-pendirian','Akta Pendirian'],['akta-perubahan','Akta Perubahan']].map(([value,name])=>({value,name,active:true})),
 documents:[['FAP','fap','MKT',true],['PREANALYSIS','Preanalysis','CA',true],['ICLF','Iclf','COMMITTEE',true],['NIB','Business registration (NIB)','BS',true],['NPWP','Company tax registration (NPWP)','BS',true],['DEED','Establishment & latest deed','LEGAL',true],['KTP','Directors’ identification','BS',true],['FINANCIALS','Financial statements · 3 years','CA',true],['BANK','Bank statements · 6 months','CA',true],['CONTRACT','Project contracts / purchase orders','CA',false],['QUOTATION','Equipment quotation','BS',true],['LEGAL_OPINION','Legal opinion','LEGAL',true],['EKITAS','E-KITAS for foreign shareholders','LEGAL',false]].map(([value,name,role,required])=>({value:String(value),name:String(name),role:String(role),required:Boolean(required),active:true}))
 };
 result.province.forEach(x=>x.parentValue='Indonesia');
 const cityParents:Record<string,string>={'Jakarta Selatan':'DKI Jakarta',Jakarta:'DKI Jakarta',Balikpapan:'Kalimantan Timur',Samarinda:'Kalimantan Timur',Palembang:'Sumatera Selatan',Medan:'Sumatera Utara',Surabaya:'Jawa Timur'};result.city.forEach(x=>x.parentValue=cityParents[x.value]);
 result.unitType[0].parentValue='LiuGong';result.modelName[0].parentValue='Hydraulic excavator';result.assetName[0].parentValue='936E';
 for(const key of ['branchCode','currency','unitCategory'])result[key].forEach(x=>x.name=x.value);
 return result;
}
export function validateMasterCatalog(input:unknown):MasterCatalog{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Master data tidak valid.');
 const result:MasterCatalog={};
 for(const group of masterGroups){
  const rows=(input as MasterCatalog)[group.key];
  if(!Array.isArray(rows)||rows.length>(['province','city','district','village','postalCode'].includes(group.key)?150000:1000))throw Error(`Daftar ${group.name} tidak valid.`);
  const seen=new Set<string>();
  result[group.key]=rows.map(row=>{
   if(!row||typeof row.value!=='string'||typeof row.name!=='string'||typeof row.active!=='boolean')throw Error(`Data ${group.name} tidak valid.`);
   const value=row.value.trim(),name=row.name.trim();
   const valueLimit=({postalCode:20,currency:5,branchCode:20,brand:50,paymentMethod:50,position:100,projectRole:100,applicationSource:100,province:100,city:100,district:100,village:100,modelName:100} as Record<string,number>)[group.key]||150;
   if(value.length>valueLimit)throw Error(`Kode ${group.name} maksimal ${valueLimit} karakter.`);
   if(!value||value.length>150||!name||name.length>150)throw Error('Kode dan nama wajib diisi, maksimal 150 karakter.');
   const uniqueValue=group.key==='postalCode'?`${row.parentValue||''}|${value.toLowerCase()}`:value.toLowerCase();if(seen.has(uniqueValue))throw Error(`Kode duplikat pada ${group.name}.`);seen.add(uniqueValue);
   if(group.key==='documents'&&(!['MKT','BS','CA','LEGAL','COMMITTEE'].includes(row.role||'')||typeof row.required!=='boolean'))throw Error('Pilih departemen dokumen dan status wajib.');
   if(group.key==='paymentMethod'&&!['advance','arrear'].includes(row.timing||''))throw Error('Pilih aturan waktu pembayaran.');
   for(const [key,limit] of [['areaCode',20],['region',100],['zipCode',20]] as const)if(row[key]!==undefined&&(typeof row[key]!=='string'||row[key]!.trim().length>limit))throw Error(`Field ${key} maksimal ${limit} karakter.`);
   return {value,name,active:row.active,...(row.areaCode?{areaCode:row.areaCode.trim()}:{}),...(row.region?{region:row.region.trim()}:{}),...(row.zipCode?{zipCode:row.zipCode.trim()}:{}),...(row.parentValue?{parentValue:String(row.parentValue)}:{}),...(group.key==='documents'?{role:row.role,required:row.required}:{}),...(group.key==='paymentMethod'?{timing:row.timing}:{})};
  });
 }
 for(const group of masterGroups){
  const lookup=Object.fromEntries(Object.entries(result).map(([key,rows])=>[key,new Map(rows.map(x=>[x.value,x]))]));
  const seenNames=new Set<string>();
  for(const row of result[group.key]){
   const nameKey=(row.parentValue||'')+'|'+row.name.toLocaleLowerCase();
   if(seenNames.has(nameKey)&&!['province','city','district','village'].includes(group.key))throw Error(`Nama duplikat pada ${group.name}.`);seenNames.add(nameKey);
   if(group.key==='village'&&row.zipCode){const district=lookup.district.get(row.parentValue||''),zipRows=result.postalCode.filter(zip=>zip.value===row.zipCode);if(!zipRows.length)throw Error('ZIP code tidak tersedia di master data.');if(!district||!zipRows.some(zip=>zip.parentValue===district.parentValue))throw Error('ZIP code harus berasal dari kota/kabupaten yang sama dengan kelurahan.');}
   if(group.parent&&row.parentValue&&!lookup[group.parent].has(row.parentValue))throw Error(`Data induk tidak tersedia untuk ${group.name}.`);
  }
 }
 if(!result.documents.some(x=>x.value==='EKITAS'&&x.active)||!result.documents.some(x=>x.value==='LEGAL_OPINION'&&x.active&&x.required))throw Error('Dokumen E-KITAS dan Legal opinion wajib dipertahankan untuk alur review.');
 return result;
}
