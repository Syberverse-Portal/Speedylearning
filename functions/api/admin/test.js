import {requireAdmin} from '../../../serverlib/auth.js';
import {json} from '../../../serverlib/http.js';
import {sendNotifications} from '../../../serverlib/push.js';
export async function onRequestPost({request,env}) {
  const blocked=await requireAdmin(request,env,{mutating:true});
  if(blocked)return blocked;
  return json(await sendNotifications(env,{test:true}));
}
