import {comparePasswords,issueSession,loginCookie} from '../../../serverlib/auth.js';
import {errorResponse,isSameOrigin,json} from '../../../serverlib/http.js';
export async function onRequestPost({request,env}) {
  if(!isSameOrigin(request))return errorResponse('Cross-origin request refused.',403);
  if(!env.CONSOLE_PASSWORD||!env.SESSION_SECRET)return errorResponse('Set CONSOLE_PASSWORD and SESSION_SECRET in Cloudflare first.',503);
  try {
    const text=await request.text();
    if(text.length>512)return errorResponse('Invalid request.',400);
    const input=JSON.parse(text);
    if(!await comparePasswords(input.password,env.CONSOLE_PASSWORD))return errorResponse('Incorrect password.',401);
    return json({ok:true},200,{'Set-Cookie':loginCookie(await issueSession(env.SESSION_SECRET))});
  }catch{return errorResponse('Invalid request.',400);}
}
