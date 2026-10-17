/* Encrypted Web Push for Cloudflare using RFC8291 aes128gcm + RFC8292 VAPID. */
const encoder = new TextEncoder();
export function fromBase64Url(input) {
  if(typeof input!=='string'||!/^[A-Za-z0-9_-]+$/.test(input)) throw new Error('Invalid base64url');
  return Uint8Array.from(atob(input.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-input.length%4)%4)), c=>c.charCodeAt(0));
}
export function toBase64Url(input) {
  let chars='';for(const byte of input)chars+=String.fromCharCode(byte);
  return btoa(chars).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
}
function concat(...parts) {
  const out=new Uint8Array(parts.reduce((sum,part)=>sum+part.length,0));
  let start=0;for(const part of parts){out.set(part,start);start+=part.length;}return out;
}
async function hkdf(salt,secret,info,length) {
  const key=await crypto.subtle.importKey('raw',secret,'HKDF',false,['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,length*8));
}
export function allowedEndpoint(endpoint) {
  try {
    const url=new URL(endpoint);
    return url.protocol==='https:'&&['fcm.googleapis.com','updates.push.services.mozilla.com','push.services.mozilla.com','web.push.apple.com'].includes(url.hostname)
      &&url.pathname.length>5&&!url.username&&!url.password&&!url.port;
  }catch{return false;}
}
export function validSubscription(subscription) {
  if(!subscription||typeof subscription!=='object'||!allowedEndpoint(subscription.endpoint))return false;
  try {
    const publicKey=fromBase64Url(subscription.keys?.p256dh),auth=fromBase64Url(subscription.keys?.auth);
    return publicKey.length===65&&publicKey[0]===4&&auth.length===16;
  }catch{return false;}
}
async function vapidJWT(env,endpoint) {
  const publicBytes=fromBase64Url(env.VAPID_PUBLIC_KEY),privateBytes=fromBase64Url(env.VAPID_PRIVATE_KEY);
  if(publicBytes.length!==65||publicBytes[0]!==4||privateBytes.length!==32)throw new Error('Invalid VAPID keys');
  const jwk={kty:'EC',crv:'P-256',x:toBase64Url(publicBytes.slice(1,33)),y:toBase64Url(publicBytes.slice(33,65)),d:toBase64Url(privateBytes)};
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const header=toBase64Url(encoder.encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
  const claims=toBase64Url(encoder.encode(JSON.stringify({aud:new URL(endpoint).origin,exp:Math.floor(Date.now()/1000)+12*3600,sub:'https://speedylearning.co.uk/'})));
  const message=header+'.'+claims;
  const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,encoder.encode(message)));
  return message+'.'+toBase64Url(signature);
}
export async function encryptPushPayload(subscription,message) {
  if(!validSubscription(subscription))throw new Error('Invalid subscription');
  const clientBytes=fromBase64Url(subscription.keys.p256dh),auth=fromBase64Url(subscription.keys.auth);
  const clientKey=await crypto.subtle.importKey('raw',clientBytes,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const serverBytes=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey));
  const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:clientKey},pair.privateKey,256));
  const ikm=await hkdf(auth,shared,concat(encoder.encode('WebPush: info\0'),clientBytes,serverBytes),32);
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const keyBits=await hkdf(salt,ikm,encoder.encode('Content-Encoding: aes128gcm\0'),16);
  const nonce=await hkdf(salt,ikm,encoder.encode('Content-Encoding: nonce\0'),12);
  const key=await crypto.subtle.importKey('raw',keyBits,'AES-GCM',false,['encrypt']);
  const text=encoder.encode(JSON.stringify(message));
  if(text.length>3800)throw new Error('Push payload too large');
  const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,tagLength:128},key,concat(text,new Uint8Array([2]))));
  return concat(salt,new Uint8Array([0,0,16,0,65]),serverBytes,encrypted);
}
async function sendOne(env,subscription,payload) {
  if(!validSubscription(subscription))return {accepted:false,expired:true};
  const body=await encryptPushPayload(subscription,payload),token=await vapidJWT(env,subscription.endpoint);
  const response=await fetch(subscription.endpoint,{method:'POST',headers:{Authorization:`vapid t=${token}, k=${env.VAPID_PUBLIC_KEY}`,
    'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream',TTL:'3600',Urgency:'high'},body});
  return {accepted:response.ok,expired:response.status===404||response.status===410};
}
export async function sendNotifications(env,{test=false}={}) {
  if(!env.DB||!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY)
    return {attempted:0,accepted:0,failed:0,reason:'Push notifications are not configured'};
  const result=await env.DB.prepare('SELECT id, subscription_json FROM push_subscriptions ORDER BY updated_at DESC LIMIT 20').all();
  const list=result.results||[],payload={
    title:test?'SpeedyLearning test notification':'SpeedyLearning: website visited',
    body:test?'Your phone is connected to your private console.':'Someone has just visited speedylearning.co.uk.',
    url:'/console/',time:Date.now()
  };
  let accepted=0,failed=0;
  await Promise.all(list.map(async row=>{
    try {
      const subscription=JSON.parse(row.subscription_json),result=await sendOne(env,subscription,payload);
      if(result.accepted)accepted++;
      else {failed++;if(result.expired)await env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(row.id).run();}
    }catch(err){console.error('SpeedyLearning push delivery failed',err?.message||'Unknown error');failed++;}
  }));
  return {attempted:list.length,accepted,failed};
}
