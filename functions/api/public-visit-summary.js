import {json,errorResponse} from '../../serverlib/http.js';
export async function onRequestGet({env}){
  if(!env.DB)return errorResponse('Visit database is not configured in Cloudflare.',503);
  try{
    const now=Date.now();
    const r=await env.DB.batch([
      env.DB.prepare('SELECT COUNT(*) AS n FROM visits'),
      env.DB.prepare('SELECT COUNT(*) AS n FROM visits WHERE visited_at >= ?').bind(now-3600000),
      env.DB.prepare('SELECT COUNT(*) AS n FROM visits WHERE visited_at >= ?').bind(now-86400000),
      env.DB.prepare('SELECT COUNT(*) AS n FROM visits WHERE visited_at >= ?').bind(now-604800000),
      env.DB.prepare('SELECT visited_at FROM visits ORDER BY id DESC LIMIT 35'),
      env.DB.prepare('SELECT CAST(visited_at / 3600000 AS INTEGER) AS hour, COUNT(*) AS n FROM visits WHERE visited_at >= ? GROUP BY hour').bind(now-86400000)
    ]);
    const count=i=>Number(r[i]?.results?.[0]?.n||0);
    const byHour=new Map((r[5]?.results||[]).map(x=>[Number(x.hour),Number(x.n)]));
    const h=Math.floor(now/3600000);
    return json({total:count(0),lastHour:count(1),last24Hours:count(2),last7Days:count(3),recent:(r[4]?.results||[]).map(x=>({time:Number(x.visited_at)})),hourly:Array.from({length:24},(_,i)=>({time:(h-23+i)*3600000,visits:byHour.get(h-23+i)||0})),updatedAt:now});
  }catch{return errorResponse('Database schema is not configured.',503)}
}