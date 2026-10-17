import {logoutCookie} from '../../../serverlib/auth.js';
import {errorResponse,isSameOrigin,json} from '../../../serverlib/http.js';
export function onRequestPost({request}) {
 if(!isSameOrigin(request))return errorResponse('Cross-origin request refused.',403);
 return json({ok:true},200,{'Set-Cookie':logoutCookie()});
}
