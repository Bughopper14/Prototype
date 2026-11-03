import {validateWrite} from '@/lib/shared/input-validation';

export const getApiBase = () => '/api/v1';

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
    if(path==='/auth/me'||path.startsWith('/auth/')){
      return null;
    }
    const loginPath = '/login';
    window.location.replace(loginPath+'?next=/crm-dashboard&reason='+encodeURIComponent('Your session has expired. Please log in again.'));
    throw new Error('Your session has expired. Redirecting to login...');
  }

  const text=await response.text();
  let data:any;
  try{data=JSON.parse(text);}catch{throw new Error('The server is temporarily unavailable. Please try again.');}
  if(!response.ok){
    if(data?.code==='SESSION_TIMEOUT'||data?.code==='NO_SESSION'||data?.code==='SESSION_EXPIRED'){
      const loginPath = '/login';
      window.location.replace(loginPath+'?next=/crm-dashboard&reason='+encodeURIComponent(data.error||'Your session has expired. Please log in again.'));
      throw new Error(data.error||'Session expired');
    }
    throw new Error(data.errors?.length?data.errors.map((x:any)=>`${x.field}: ${x.detail}`).join('\n'):data.message||data.error||'Request failed');
  }
  return data;
}

export async function api(path:string,method='GET',body?:any){
  validateWrite(path,method,body);
  return remoteApi(path,method,body);
}

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
