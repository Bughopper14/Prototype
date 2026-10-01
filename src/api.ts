import {validateWrite} from './input-validation';
async function remoteApi(path:string,method='GET',body?:any){const form=body instanceof FormData;let response:Response;try{response=await fetch('/api/v1'+path,{method,credentials:'same-origin',headers:body&&!form?{'Content-Type':'application/json'}:{},body:body?(form?body:JSON.stringify(body)):undefined});}catch{throw new Error('Cannot connect to the server. Please try again.');}const text=await response.text();let data:any;try{data=JSON.parse(text);}catch{throw new Error('The server is temporarily unavailable. Please try again.');}if(!response.ok)throw new Error(data.errors?.length?data.errors.map((x:any)=>`${x.field}: ${x.detail}`).join('\n'):data.message||'Request failed');return data;}

import {demoApi} from './demo-api';
export async function api(path:string,method='GET',body?:any){validateWrite(path,method,body);return import.meta.env.VITE_DEMO_MODE==='true'?demoApi(path,method,body):remoteApi(path,method,body);}
