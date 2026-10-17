export const headers = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};
export function json(data, status=200, extra={}) {
  return new Response(JSON.stringify(data), {status,headers:{...headers,...extra}});
}
export function isSameOrigin(request) {
  const origin=request.headers.get('Origin');
  const site=request.headers.get('Sec-Fetch-Site');
  if(origin && origin!==new URL(request.url).origin) return false;
  if(site && site!=='same-origin' && site!=='none') return false;
  return true;
}
export function errorResponse(message,status=500) {return json({error:message},status)}
