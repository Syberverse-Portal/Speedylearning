/* SpeedyLearning Cloudflare Pages advanced-mode worker.
   The static host must support Cloudflare Pages Workers and bind a D1 database as DB.
   No child answers, names, fingerprints or IPs are stored in visitor records. */
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers});
function sameOrigin(req){
  const origin=req.headers.get('Origin'),url=new URL(req.url),site=req.headers.get('Sec-Fetch-Site');
  return (!origin||origin===url.origin)&&(!site||site==='same-origin'||site==='none');
}
const recentDays=30*86400000;
async function visitorSummary(env){
 const now=Date.now();
 const out=await env.DB.batch([
  env.DB.prepare('SELECT COUNT(*) AS n FROM visits'),
  env.DB.prepare('SELECT COUNT(*) AS n FROM visits WHERE visited_at >= ?').bind(now-3600000),
  env.DB.prepare('SELECT COUNT(*) AS n FROM visits WHERE visited_at >= ?').bind(now-86400000),
  env.DB.prepare('SELECT COUNT(*) AS n FROM visits WHERE visited_at >= ?').bind(now-7*86400000),
  env.DB.prepare('SELECT visited_at FROM visits ORDER BY id DESC LIMIT 35'),
  env.DB.prepare('SELECT CAST(visited_at / 3600000 AS INTEGER) AS hour, COUNT(*) AS n FROM visits WHERE visited_at >= ? GROUP BY hour').bind(now-86400000)
 ]);
 const n=i=>Number(out[i]?.results?.[0]?.n||0);
 const hourlyMap=new Map((out[5]?.results||[]).map(x=>[Number(x.hour),Number(x.n)]));
 const currentHour=Math.floor(now/3600000);
 return {total:n(0),lastHour:n(1),last24Hours:n(2),last7Days:n(3),
 recent:(out[4]?.results||[]).map(x=>({time:Number(x.visited_at)})),
 hourly:Array.from({length:24},(_,i)=>({time:(currentHour-23+i)*3600000,visits:hourlyMap.get(currentHour-23+i)||0})),
 updatedAt:now};
}
export default {
 async fetch(request,env,ctx){
  const u=new URL(request.url),path=u.pathname;
  if(path.startsWith('/functions/')||path.startsWith('/serverlib/')||path==='/schema.sql'||path==='/._worker.js'||path==='/worker.js'||path==='/_worker.js')return reply({error:'Not found'},404);
  if(path==='/api/worker-health'){
   return reply({worker:true,databaseConfigured:Boolean(env.DB),pushConfigured:Boolean(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY)});
  }
  if(path==='/api/visit'){
   if(request.method!=='POST')return reply({error:'Method not allowed'},405);
   if(!sameOrigin(request))return reply({error:'Cross-origin request denied'},403);
   if(!env.DB)return reply({error:'Database binding DB missing'},503);
   try{
     await env.DB.prepare('INSERT INTO visits (visited_at) VALUES (?)').bind(Date.now()).run();
     // Retain only a 30-day window. No personal data saved.
     if(Math.random()<0.02)ctx.waitUntil(env.DB.prepare('DELETE FROM visits WHERE visited_at < ?').bind(Date.now()-recentDays).run().catch(()=>{}));
     return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
   }catch{return reply({error:'Visit database not initialized'},503)}
  }
  if(path==='/api/public-visit-summary'){
   if(request.method!=='GET')return reply({error:'Method not allowed'},405);
   if(!env.DB)return reply({error:'Database binding DB missing'},503);
   try{return reply(await visitorSummary(env))}catch{return reply({error:'Visit database not initialized'},503)}
  }
  if(path==='/api/activity'){
   // This feature deliberately remains disabled until privacy review and schema deployment.
   return reply({error:'Optional activity telemetry is disabled'},404);
  }
  // Admin endpoints must NOT be served without authentication.
  if(path.startsWith('/api/admin/'))return reply({error:'Admin service requires authenticated deployment'},503);
  if(path.startsWith('/api/'))return reply({error:'Not found'},404);
  return env.ASSETS.fetch(request);
 }
};
