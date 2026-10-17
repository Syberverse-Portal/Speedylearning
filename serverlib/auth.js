import {errorResponse,isSameOrigin} from './http.js';
const encoder=new TextEncoder(), COOKIE_NAME='sl_console_session', DAYS=30;
function b64url(bytes) {
  let str=''; for(const byte of bytes) str+=String.fromCharCode(byte);
  return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
}
function unb64url(s) {
  if(!/^[A-Za-z0-9_-]+$/.test(s)) throw Error('Invalid encoding');
  const text=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));
  return Uint8Array.from(text,c=>c.charCodeAt(0));
}
async function sessionKey(secret) {
  return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
export async function comparePasswords(actual,expected) {
  if(typeof actual!=='string'||typeof expected!=='string')return false;
  const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(actual)),crypto.subtle.digest('SHA-256',encoder.encode(expected))]);
  let difference=0; const aa=new Uint8Array(a),bb=new Uint8Array(b);
  for(let i=0;i<aa.length;i++)difference|=aa[i]^bb[i];
  return difference===0;
}
export async function issueSession(secret) {
  const nonce=new Uint8Array(12);crypto.getRandomValues(nonce);
  const payload=b64url(encoder.encode(JSON.stringify({v:1,e:Date.now()+DAYS*86400000,n:b64url(nonce)})));
  const signature=new Uint8Array(await crypto.subtle.sign('HMAC',await sessionKey(secret),encoder.encode(payload)));
  return payload+'.'+b64url(signature);
}
async function validateSession(token,secret) {
  if(!token||!secret||token.length>600)return false;
  const parts=token.split('.');if(parts.length!==2)return false;
  try{
    const valid=await crypto.subtle.verify('HMAC',await sessionKey(secret),unb64url(parts[1]),encoder.encode(parts[0]));
    if(!valid)return false;
    const payload=JSON.parse(new TextDecoder().decode(unb64url(parts[0])));
    return payload.v===1&&typeof payload.e==='number'&&payload.e>Date.now()&&payload.e<Date.now()+DAYS*86400000+60000;
  }catch{return false;}
}
function extractCookie(request) {
  const match=(request.headers.get('Cookie')||'').match(/(?:^|;\s*)sl_console_session=([^;]+)/);
  return match?match[1]:'';
}
export async function requireAdmin(request,env,{mutating=false}={}) {
  if(!env.SESSION_SECRET||!env.CONSOLE_PASSWORD)return errorResponse('Console secrets have not been configured in Cloudflare.',503);
  if(mutating&&!isSameOrigin(request))return errorResponse('Cross-origin request refused.',403);
  if(!await validateSession(extractCookie(request),env.SESSION_SECRET))return errorResponse('Please sign in to the console.',401);
  return null;
}
export function loginCookie(token) {
  return COOKIE_NAME+'='+token+'; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age='+(DAYS*86400);
}
export function logoutCookie() {
  return COOKIE_NAME+'=; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=0';
}
