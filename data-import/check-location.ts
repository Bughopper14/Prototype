import {locationCatalog} from '../server/mysql-location';import {pool} from '../server/mysql-store';import {defaultMasterCatalog,validateMasterCatalog} from '../src/master-catalog';
const data=await locationCatalog(defaultMasterCatalog());validateMasterCatalog(data);console.log(JSON.stringify({province:data.province.length,city:data.city.length,district:data.district.length,village:data.village.length,postalCodes:data.postalCode.length,ragunan:data.village.find(x=>x.value==='31.74.04.1004')},null,2));
for(const table of ['master_provinsi','master_kabupaten_kota','master_kecamatan','master_kelurahan_desa']){const [rows]=await pool!.query<any[]>('SELECT COUNT(*) total FROM '+table);console.log(table,rows[0].total);}
await pool?.end();
