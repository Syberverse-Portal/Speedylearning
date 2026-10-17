/* SpeedyLearning Quest Engine v3. Pure functions: no networking, cookies or analytics.
 * Scores here are self-reflections and NEVER proof of curriculum mastery.
 * Node testable (module.exports) and browser usable (window.SpeedyQuestEngine). */
(function(root){
  "use strict";
  const DAY=86400000;
  const MODES=Object.freeze({
    help:{days:1,label:"Ask for help",detail:"Revisit gently tomorrow"},
    tried:{days:2,label:"I gave it a go",detail:"Try again soon"},
    explained:{days:4,label:"I explained my thinking",detail:"Revisit to check your understanding"}
  });
  const safeDate=n=>Number.isSafeInteger(n)&&n>0?n:0;
  const isObject=o=>o!==null && typeof o==="object" && !Array.isArray(o);
  const keyFor=(player,nation,stage)=>JSON.stringify([String(player||"Me").slice(0,35),String(nation||"en"),String(stage||"Y3")]);
  function normaliseRecord(input){
    if(!isObject(input))return null;
    const attempts=Math.max(0,Math.min(1000,Number(input.attempts)||Number(input.repeats)||0));
    const last=safeDate(Number(input.lastAt)||Number(input.time)||0);
    if(!last||attempts===0)return null;
    const mode=Object.hasOwn(MODES,input.mode)?input.mode:"tried";
    return {
      attempts:Math.floor(attempts),
      lastAt:last,
      firstAt:safeDate(Number(input.firstAt))||last,
      nextAt:safeDate(Number(input.nextAt))||(last+MODES[mode].days*DAY),
      mode
    };
  }
  function normaliseRecords(raw,catalogue){
    if(!isObject(raw))return {};
    const allowed=new Set(catalogue.map(q=>q.id));
    const out={};
    for(const [k,v] of Object.entries(raw)){
      if(!allowed.has(k))continue;
      const entry=normaliseRecord(v);
      if(entry)out[k]=entry;
    }
    return out;
  }
  function readStore(state,scope,catalogue){
    return normaliseRecords(isObject(state)?state[scope]:null,catalogue);
  }
  function migrateV1(v1,catalogue){
    if(!isObject(v1))return {};
    const out={};
    for(const [scope,records] of Object.entries(v1)){
      // Historical v1 records were shared between learners; migrate into "Me" only.
      const cut=scope.indexOf(":");
      if(cut<0)continue;
      const nation=scope.slice(0,cut),stage=scope.slice(cut+1);
      const normalized=normaliseRecords(records,catalogue);
      if(Object.keys(normalized).length)out[keyFor("Me",nation,stage)]=normalized;
    }
    return out;
  }
  function addReflection(state,scope,id,mode,now,catalogue){
    if(!catalogue.some(q=>q.id===id))throw Error("Unknown quest");
    if(!Object.hasOwn(MODES,mode))throw Error("Unknown reflection");
    const at=safeDate(now);
    if(!at)throw Error("Invalid completion date");
    const next={...(isObject(state)?state:{})};
    const rec=readStore(state,scope,catalogue);
    const old=rec[id],attempts=Math.min((old?.attempts||0)+1,1000);
    const interval=MODES[mode].days * (mode==="explained" && attempts>=3?4:mode==="explained" && attempts>=2?2:1);
    rec[id]={attempts,firstAt:old?.firstAt||at,lastAt:at,nextAt:at+interval*DAY,mode};
    next[scope]=rec;
    return next;
  }
  function summary(records,catalogue,now){
    const values=normaliseRecords(records,catalogue),all=Object.values(values);
    const due=all.filter(x=>x.nextAt<=now).length;
    return {explored:all.length,total:catalogue.length,due,percent:catalogue.length?Math.round(100*all.length/catalogue.length):0,
      explained:all.filter(x=>x.mode==="explained").length,attempts:all.reduce((n,x)=>n+x.attempts,0)};
  }
  function areaWeakness(answerLog,areas,now){
    const cutoff=now-45*DAY,result={};
    if(!Array.isArray(answerLog))return result;
    for(const a of Object.keys(areas))result[a]={seen:0,wrong:0};
    for(const x of answerLog.slice(-700)){
      if(!isObject(x)||!safeDate(x.t)||x.t<cutoff||typeof x.s!=="string")continue;
      for(const [a,meta] of Object.entries(areas)){
        if(!meta.subjectKeys?.includes(x.s))continue;
        result[a].seen++;
        if(!x.ok)result[a].wrong++;
      }
    }
    for(const [k,value] of Object.entries(result)){
      value.focus=value.seen>=5 && value.wrong/value.seen>=.3;
      value.score=value.seen>=5?value.wrong/value.seen:0;
    }
    return result;
  }
  function recommendations(records,catalogue,areas,answers,now){
    const store=normaliseRecords(records,catalogue);
    const weaknesses=areaWeakness(answers,areas,now);
    const usedByArea={};
    for(const q of catalogue)if(store[q.id])usedByArea[q.area]=(usedByArea[q.area]||0)+1;
    const countByArea={};for(const q of catalogue)countByArea[q.area]=(countByArea[q.area]||0)+1;
    const due=catalogue.filter(q=>store[q.id]&&store[q.id].nextAt<=now);
    const untried=catalogue.filter(q=>!store[q.id]);
    const review=due.sort((a,b)=>store[a.id].nextAt-store[b.id].nextAt||a.id.localeCompare(b.id));
    const newOnes=untried.sort((a,b)=>{
      const aFocus=weaknesses[a.area]?.focus?1:0,bFocus=weaknesses[b.area]?.focus?1:0;
      const aRatio=(usedByArea[a.area]||0)/(countByArea[a.area]||1),bRatio=(usedByArea[b.area]||0)/(countByArea[b.area]||1);
      return bFocus-aFocus||aRatio-bRatio||a.id.localeCompare(b.id);
    });
    const later=catalogue.filter(q=>store[q.id]&&store[q.id].nextAt>now)
      .sort((a,b)=>store[a.id].nextAt-store[b.id].nextAt||a.id.localeCompare(b.id));
    const queue=[...review,...newOnes,...later];
    return queue.map(q=>({
      id:q.id,quest:q,
      reason:store[q.id]?(store[q.id].nextAt<=now?"Ready for a gentle revisit":"Explored before — try a fresh approach")
        :weaknesses[q.area]?.focus?"A little practice could help":"Something new to explore",
      due:Boolean(store[q.id]&&store[q.id].nextAt<=now),
      focus:Boolean(weaknesses[q.area]?.focus)
    }));
  }
  function reviewDate(milliseconds){
    return new Date(milliseconds).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
  }
  const api=Object.freeze({DAY,MODES,keyFor,normaliseRecords,readStore,migrateV1,addReflection,summary,areaWeakness,recommendations,reviewDate});
  root.SpeedyQuestEngine=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
