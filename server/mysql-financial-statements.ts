import {pool} from './mysql-store';
import {validateFinancials,ratios} from './domain';
import {z} from 'zod';
import crypto from 'node:crypto';

const metrics={currentAssets:'current_assets',nonCurrentAssets:'non_current_assets',totalAssets:'total_assets',currentLiabilities:'current_liabilities',nonCurrentLiabilities:'non_current_liabilities',totalLiabilities:'total_liabilities',equity:'equity',totalLiabAndEquity:'total_liabilities_and_equity',revenue:'revenue',grossMargin:'gross_profit',operatingMargin:'operating_profit_ebit',tax:'tax',netIncome:'net_income'} as const;
export async function initializeFinancialStatements(){
 if(!pool)return;
 await pool.query(`CREATE TABLE IF NOT EXISTS financial_statement (
  id CHAR(36) PRIMARY KEY,application_id CHAR(36) NOT NULL,fiscal_year INT NOT NULL,is_audited BOOLEAN NOT NULL DEFAULT FALSE,
  ${Object.values(metrics).map(column=>`\`${column}\` DECIMAL(20,2) NOT NULL`).join(',')},
  balance_check BOOLEAN NOT NULL,current_ratio DECIMAL(30,8) NULL,debt_equity DECIMAL(30,8) NULL,net_profit_margin DECIMAL(30,8) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,deleted_at TIMESTAMP(3) NULL,
  UNIQUE KEY application_year(application_id,fiscal_year),
  CONSTRAINT fk_financial_statement_application FOREIGN KEY(application_id) REFERENCES all_applications(application_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
export async function readFinancialStatements(applicationId:string){
 if(!pool)return {financialStatements:[],ratios:[]};
 const [rows]=await pool.execute<any[]>('SELECT * FROM financial_statement WHERE application_id=? AND deleted_at IS NULL ORDER BY fiscal_year',[applicationId]);
 const statements=rows.map(row=>({id:row.id,fiscalYear:row.fiscal_year,isAudited:!!row.is_audited,...Object.fromEntries(Object.entries(metrics).map(([key,column])=>[key,row[column]]))}));
 return {financialStatements:statements,ratios:statements.map(row=>({fiscalYear:row.fiscalYear,...ratios(row)}))};
}
export async function saveFinancialStatements(applicationId:string,input:unknown,role:string){
 if(!pool)throw new Error('MySQL is not configured');
 const amount=z.union([z.string().regex(/^-?\d{1,18}(\.\d{1,2})?$/),z.number().finite()]).transform(String);
 const schema=z.object({fiscalYear:z.number().int().min(1900).max(new Date().getFullYear()),isAudited:z.boolean(),...Object.fromEntries(Object.keys(metrics).map(key=>[key,amount]))});
 const rows=z.array(schema).max(3).parse(input);
 validateFinancials(rows);
 const c=await pool.getConnection();
 try{
  await c.beginTransaction();
  const [apps]=await c.execute<any[]>('SELECT p.application_status FROM all_applications a JOIN new_application_pre_analisis p ON p.id_pre_analysis=a.id_pre_analysis WHERE a.application_id=? FOR UPDATE',[applicationId]);
  if(!apps.length)throw Object.assign(new Error('Application not found'),{status:404});
  const status=apps[0].application_status;
  if(!(role==='MKT'&&['DRAFT','RETURNED'].includes(status)||role==='CA'&&status==='IN_CA_LEGAL_REVIEW'))throw Object.assign(new Error('Financial statements are locked at this workflow stage'),{status:403});
  const years=rows.map(row=>row.fiscalYear);
  await c.execute(`UPDATE financial_statement SET deleted_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=? AND deleted_at IS NULL ${years.length?'AND fiscal_year NOT IN ('+years.map(()=>'?').join(',')+')':''}`,[applicationId,...years]);
  for(const row of rows){
   const ratio=ratios(row),columns=['is_audited',...Object.values(metrics),'balance_check','current_ratio','debt_equity','net_profit_margin'];
   const values=[row.isAudited?1:0,...Object.keys(metrics).map(key=>(row as any)[key]),1,ratio.currentRatio,ratio.debtToEquity,ratio.netProfitMargin];
   const [old]=await c.execute<any[]>('SELECT * FROM financial_statement WHERE application_id=? AND fiscal_year=?',[applicationId,row.fiscalYear]);
   if(old.length){if(old[0].deleted_at||columns.some((col,i)=>Number(old[0][col])!==Number(values[i])||(old[0][col]===null)!==(values[i]===null)))await c.execute(`UPDATE financial_statement SET ${columns.map(col=>`\`${col}\`=?`).join(',')},deleted_at=NULL,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,[...values,old[0].id]);}
   else await c.execute(`INSERT INTO financial_statement (id,application_id,fiscal_year,${columns.map(col=>`\`${col}\``).join(',')}) VALUES (${Array(columns.length+3).fill('?').join(',')})`,[crypto.randomUUID(),applicationId,row.fiscalYear,...values]);
  }
  await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}
