import {isSameOrigin,errorResponse} from '../../serverlib/http.js';
import {sendNotifications} from '../../serverlib/push.js';
export async function onRequestPost(context) {
  const {request,env}=context;
  if(!isSameOrigin(request))return errorResponse('Cross-origin request refused.',403);
  if(!env.DB)return errorResponse('Cloudflare D1 binding DB is missing.',503);
  try {
    await env.DB.prepare('INSERT INTO visits (visited_at) VALUES (?)').bind(Date.now()).run();
    if(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY)context.waitUntil(sendNotifications(env).catch(e=>console.error('Push error',e?.message)));
    return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
  }catch(err){console.error('Visit write failed',err?.message);return errorResponse('Visit could not be recorded.',503)}
}
