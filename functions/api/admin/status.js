import {requireAdmin} from '../../../serverlib/auth.js';
import {errorResponse,json} from '../../../serverlib/http.js';
export async function onRequestGet({request,env}) {
  const blocked=await requireAdmin(request,env);
  if(blocked)return blocked;
  if(!env.DB)return errorResponse('Cloudflare D1 binding DB is missing.',503);
  try{
    const now=Date.now();
    const results=await env.DB.batch([
      env.DB.prepare('SELECT COUNT(*) AS n FROM visits'),
      env.DB.prepare('SELECT COUNT(*) AS n FROM visits WHERE visited_at >= ?').bind(now-3600000),
      env.DB.prepare('SELECT COUNT(*) AS n FROM visits WHERE visited_at >= ?').bind(now-86400000),
      env.DB.prepare('SELECT COUNT(*) AS n FROM visits WHERE visited_at >= ?').bind(now-7*86400000),
      env.DB.prepare('SELECT id, visited_at FROM visits ORDER BY id DESC LIMIT 35'),
      env.DB.prepare('SELECT CAST(visited_at / 3600000 AS INTEGER) AS hour, COUNT(*) AS n FROM visits WHERE visited_at >= ? GROUP BY hour').bind(now-24*3600000),
      env.DB.prepare('SELECT COUNT(*) AS n FROM push_subscriptions')
    ]);
    const first=i=>Number(results[i]?.results?.[0]?.n||0);
    const counts=new Map((results[5]?.results||[]).map(x=>[Number(x.hour),Number(x.n)]));
    const present=Math.floor(now/3600000);
    const hourly=Array.from({length:24},(_,i)=>{
      const hour=present-23+i;return {time:hour*3600000,visits:counts.get(hour)||0};
    });
    return json({
      total:first(0),lastHour:first(1),last24Hours:first(2),last7Days:first(3),
      recent:(results[4]?.results||[]).map(x=>({id:x.id,time:Number(x.visited_at)})),
      hourly,pushDevices:first(6),vapidPublicKey:env.VAPID_PUBLIC_KEY||null,
      pushConfigured:Boolean(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY),updatedAt:now
    });
  }catch(e){console.error('Console query failed',e?.message);return errorResponse('Database needs schema.sql or there was a database error.',503);}
}
