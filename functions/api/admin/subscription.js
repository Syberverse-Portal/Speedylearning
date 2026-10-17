import {requireAdmin} from '../../../serverlib/auth.js';
import {json,errorResponse} from '../../../serverlib/http.js';
import {validSubscription,toBase64Url} from '../../../serverlib/push.js';
async function idFor(endpoint) {
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(endpoint));
 return toBase64Url(new Uint8Array(digest));
}
export async function onRequestPost({request,env}) {
 const blocked=await requireAdmin(request,env,{mutating:true});if(blocked)return blocked;
 if(!env.DB||!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY)return errorResponse('Database or VAPID keys not configured.',503);
 try {
  const raw=await request.text();if(raw.length>5000)return errorResponse('Subscription too large.',400);
  const {subscription}=JSON.parse(raw);if(!validSubscription(subscription))return errorResponse('Unsupported or invalid push subscription.',400);
  const id=await idFor(subscription.endpoint);
  await env.DB.prepare('INSERT OR REPLACE INTO push_subscriptions (id, subscription_json, updated_at) VALUES (?, ?, ?)')
    .bind(id,JSON.stringify({endpoint:subscription.endpoint,keys:subscription.keys}),Date.now()).run();
  return json({ok:true});
 }catch{return errorResponse('Subscription could not be saved.',400);}
}
export async function onRequestDelete({request,env}) {
 const blocked=await requireAdmin(request,env,{mutating:true});if(blocked)return blocked;
 if(!env.DB)return errorResponse('Database not configured.',503);
 try {
  const data=await request.json();
  if(typeof data.endpoint!=='string'||data.endpoint.length>2048)return errorResponse('Invalid endpoint.',400);
  await env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(await idFor(data.endpoint)).run();
  return json({ok:true});
 }catch{return errorResponse('Subscription could not be removed.',400);}
}
