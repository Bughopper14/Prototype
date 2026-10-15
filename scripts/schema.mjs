import fs from 'node:fs';
const source=fs.readFileSync('specification.txt','utf8');
const enums={};
for(const m of source.matchAll(/enum (\w+) \{([^}]+)\}/g)) enums[m[1]]=m[2].trim().split(/\s+/);
const models=[...source.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)];
const metadata={}; let ddl=''; const foreign=[];
for(const [,name,body] of models){
 const table=body.match(/@@map\("([^"]+)"\)/)?.[1]||name;const fields={};const cols=[];
 for(const line of body.split('\n')){
  const m=line.trim().match(/^(\w+)\s+(\w+)(\?|\[\])?\s*(.*)$/);if(!m)continue;
  const [,key,type,optional,attrs]=m;if(!['String','Int','Decimal','DateTime','Boolean'].includes(type)&&!enums[type])continue;
  const col=attrs.match(/@map\("([^"]+)"\)/)?.[1]||key;
  fields[key]={column:col,type,optional:optional==='?',generated:key==='id'||key==='createdAt'||key==='updatedAt'};
  let sqltype=enums[type]?'TEXT':({String:'TEXT',Int:'INTEGER',Decimal:'NUMERIC(18,2)',DateTime:attrs.includes('@db.Date')?'DATE':'TIMESTAMPTZ',Boolean:'BOOLEAN'})[type];
  if(attrs.includes('@db.VarChar'))sqltype='VARCHAR('+attrs.match(/VarChar\((\d+)\)/)[1]+')';
  if(attrs.includes('@db.Decimal'))sqltype='NUMERIC('+attrs.match(/Decimal\(([^)]+)\)/)[1]+')';
  let colsql=`"${col}" ${sqltype}${optional==='?'?'':' NOT NULL'}`;
  if(attrs.includes('@id'))colsql+=' PRIMARY KEY';else if(attrs.includes('@unique'))colsql+=' UNIQUE';
  if(attrs.includes('@default(uuid())'))colsql+=' DEFAULT gen_random_uuid()';
  else if(attrs.includes('@default(now())')||attrs.includes('@updatedAt'))colsql+=' DEFAULT CURRENT_TIMESTAMP';
  else {const d=attrs.match(/@default\(([^)]+)\)/)?.[1];if(d)colsql+=' DEFAULT '+(enums[type]||type==='String'?`'${d.replaceAll('"','')}'`:d);}
  if(enums[type])colsql+=` CHECK ("${col}" IN (${enums[type].map(x=>`'${x}'`).join(',')}))`;
  cols.push(colsql);
 }
 for(const u of body.matchAll(/@@unique\(\[([^\]]+)\]\)/g))cols.push(`UNIQUE (${u[1].split(',').map(x=>'"'+fields[x.trim()].column+'"').join(',')})`);
 metadata[name]={table,fields};ddl+=`CREATE TABLE IF NOT EXISTS "${table}" (\n  ${cols.join(',\n  ')}\n);\n`;
 for(const r of body.matchAll(/\w+\s+(\w+)\??\s+@relation\(fields: \[(\w+)\], references: \[(\w+)\]([^)]*)\)/g))foreign.push({name,ref:r[1],key:r[2],refKey:r[3],cascade:r[4].includes('Cascade')});
}
for(const f of foreign){const m=metadata[f.name],r=metadata[f.ref];ddl+=`ALTER TABLE "${m.table}" ADD CONSTRAINT "fk_${m.table}_${f.key}" FOREIGN KEY ("${m.fields[f.key].column}") REFERENCES "${r.table}" ("${r.fields[f.refKey].column}")${f.cascade?' ON DELETE CASCADE':''};\n`;}
fs.writeFileSync('server/schema.sql',ddl);
fs.writeFileSync('server/metadata.json',JSON.stringify(metadata,null,2));
