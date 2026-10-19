import {validateWrite} from './input-validation';

export const getApiBase = () => {
  if (typeof window !== 'undefined') {
    const p = window.location.pathname;
    if (p.startsWith('/crm-dashboard')) return '/crm-dashboard/api/v1';
    if (p.startsWith('/los-dashboard')) return '/los-dashboard/api/v1';
  }
  return '/api/v1';
};

async function remoteApi(path:string,method='GET',body?:any){
  const form=body instanceof FormData;
  const baseUrl = getApiBase();
  let response:Response;
  try{
    response=await fetch(baseUrl+path,{
      method,
      credentials:'same-origin',
      headers:body&&!form?{'Content-Type':'application/json'}:{},
      body:body?(form?body:JSON.stringify(body)):undefined
    });
  }catch{
    throw new Error('Cannot connect to the server. Please try again.');
  }

  if(response.status===401){
    window.location.replace('/login?timeout=1&reason='+encodeURIComponent('Sesi Anda telah berakhir. Silakan login kembali.'));
    throw new Error('Sesi Anda telah berakhir. Mengalihkan ke login...');
  }

  const text=await response.text();
  let data:any;
  try{data=JSON.parse(text);}catch{throw new Error('The server is temporarily unavailable. Please try again.');}
  if(!response.ok){
    if(data?.code==='SESSION_TIMEOUT'||data?.code==='NO_SESSION'||data?.code==='SESSION_EXPIRED'){
      window.location.replace('/login?timeout=1&reason='+encodeURIComponent(data.error||'Sesi Anda telah berakhir. Silakan login kembali.'));
      throw new Error(data.error||'Sesi berakhir');
    }
    throw new Error(data.errors?.length?data.errors.map((x:any)=>`${x.field}: ${x.detail}`).join('\n'):data.message||data.error||'Request failed');
  }
  return data;
}

export async function api(path:string,method='GET',body?:any){validateWrite(path,method,body);return remoteApi(path,method,body);}

let _currentUser: any = null;
export function setCurrentUser(u: any) {
  _currentUser = u;
}
export function getCurrentUser() {
  return _currentUser;
}
export function hasAuth(authName: string, userObj?: any): boolean {
  const u = userObj || _currentUser;
  if (!u) return false;
  if (u.isAdmin || u.displayRole === 'Admin' || u.username === 'admin') return true;
  if (!Array.isArray(u.authorities)) return false;
  return u.authorities.includes(authName);
}

let _lastActivityText = '';
export function logActivity(action: string) {
  if (!action || _lastActivityText === action) return;
  _lastActivityText = action;
  api('/user-activity', 'POST', { action }).catch(() => {});
}
