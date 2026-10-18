(()=>{'use strict';
const D=window.SpeedyQuestCatalog, E=window.SpeedyQuestEngine;
if(!D||!E){document.body.textContent='The learning library could not load. Please refresh.';return}
const $=id=>document.getElementById(id);
const key='speedy-quest-atlas-v3',legacyKey='speedy-quest-atlas-v1',prefsKey='speedy-quest-preferences-v1',accessKey='speedy-quest-access-v3';
const val=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const prefs=val(prefsKey,{nation:'en',stage:'Y3'});let completed=val(key,{}),filter='all',active=null;let access=val(accessKey,{large:false,contrast:false,motion:false});
if(!Object.keys(completed).length){completed=E.migrateV1(val(legacyKey,{}),D.quests);set(key,completed)}
function nation(){return D.sources[prefs.nation]||D.sources.en}
function stage(){return nation().stages.find(x=>x.id===prefs.stage)||nation().stages[0]}
function storePrefs(){set(prefsKey,prefs)}
function tier(){return stage().tier}
function scope(){return E.keyFor('Me',prefs.nation,prefs.stage)}
function records(){return E.readStore(completed,scope(),D.quests)}
function answers(){let name='Me';try{name=localStorage.getItem('speedy-player')||'Me'}catch{}return val('speedy-log|'+name,[])}
function updateNation(){const n=$('nation');n.replaceChildren();for(const [code,item] of Object.entries(D.sources)){const option=new Option(item.label,code);n.add(option)}n.value=prefs.nation in D.sources?prefs.nation:'en';prefs.nation=n.value;updateStages()}
function updateStages(){const sel=$('stage');sel.replaceChildren();for(const s of nation().stages)sel.add(new Option(s.name,s.id));if(!nation().stages.some(x=>x.id===prefs.stage))prefs.stage=nation().stages[0].id;sel.value=prefs.stage;storePrefs();$('curriculum').replaceChildren();const anchor=document.createElement('a');anchor.href=nation().url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.textContent='Read the official '+nation().name+' guidance ↗';$('curriculum').append('Activities inspired by ',anchor);render()}
function changeNation(value){prefs.nation=value;prefs.stage=D.sources[value].stages[0].id;updateStages()}
function ranked(){return E.recommendations(records(),D.quests,D.areas,answers(),Date.now())}
function recommended(){return ranked()[0]?.quest||D.quests[0]}
function coverage(){
 const p=$('coverageMap');p.replaceChildren();
 for(const [id,area] of Object.entries(D.areas)){
  const row=document.createElement('div');row.className='learning-area';
  const title=document.createElement('strong');title.textContent=area.icon+' '+area.names[prefs.nation];row.appendChild(title);
  const n=D.quests.filter(q=>q.area===id).length;
  const info=document.createElement('p');info.className='context';info.textContent=n+' starter quests · broad thematic association · objective-level verification pending';row.appendChild(info);p.appendChild(row);
 }
}
function report(){
 const rec=records(),summary=E.summary(rec,D.quests,Date.now()),list=D.quests.filter(q=>rec[q.id]);
 const lines=['SpeedyLearning — Home Quest Atlas',nation().label+' · '+stage().name,
 'Report date: '+new Date().toLocaleDateString('en-GB'),'',
 'Explored: '+summary.explored+' of '+summary.total,'Reflections saying “explained”: '+summary.explained,'Due for a gentle revisit: '+summary.due,'',
 ...list.map(q=>'- '+q.title+' | '+E.MODES[rec[q.id].mode].label+' | Revisit from '+E.reviewDate(rec[q.id].nextAt)),
 '',
 'This is a self-reflection record, not a certified assessment or proof of mastery. Progress is stored in this browser.'];
 return lines.join(String.fromCharCode(10));
}
function printSummary(){
 const p=$('printBody');p.textContent=report();
 p.style.whiteSpace='pre-wrap';window.print();
}
function preferences(){
 document.body.classList.toggle('text-large',Boolean(access.large));
 document.body.classList.toggle('high-contrast',Boolean(access.contrast));
 document.body.classList.toggle('no-motion',Boolean(access.motion));
}
preferences();
function render(){
 const rec=records(),sum=E.summary(rec,D.quests,Date.now());
 $('progressFill').style.width=sum.percent+'%';$('progress').setAttribute('aria-valuenow',String(sum.percent));
 $('progressText').textContent=sum.explored+' of '+sum.total+' adventures explored · '+sum.explained+' explained reflections (not mastery)';
 $('reviewText').textContent=sum.due?sum.due+' adventure'+(sum.due===1?' is':'s are')+' ready for a gentle revisit.':'No revisits due right now. Explore something new!';
 $('nextText').textContent=sum.explored?'Learning takes practice. Trying again helps ideas stick.':'Start with a short hands-on adventure. Nobody has to get everything right.';
 const focus=E.areaWeakness(answers(),D.areas,Date.now());
 const evidence=Object.entries(focus).filter(([,x])=>x.focus).map(([id])=>D.areas[id].label);
 $('personalisationText').textContent=evidence.length?'Suggested themes based on previous answers stored on this device: '+evidence.join(', ')+'.':'Recommendations use your local quest history and gently revisit older adventures.';
 const p=$('myPlan');p.textContent='Today’s idea: 2 minutes to recall, 6 minutes to explore, 2 minutes to explain your thinking.';
 coverage();
 const filters=$('filters');filters.replaceChildren();addFilter('all','All themes');for(const [id,area] of Object.entries(D.areas))addFilter(id,area.icon+' '+area.label);
 const cards=$('cards');cards.replaceChildren();
 for(const quest of D.quests.filter(q=>filter==='all'||filter===q.area)){
  const card=document.createElement('article');card.className='quest';
  const emoji=document.createElement('span');emoji.className='emoji';emoji.textContent=quest.icon;
  const title=document.createElement('h3');title.textContent=quest.title;
  const tag=document.createElement('span');tag.className='tag';tag.textContent=(rec[quest.id]?'✓ Explored · ':'')+quest.duration+' min · '+D.areas[quest.area].names[prefs.nation];
  const desc=document.createElement('p');desc.textContent=quest.why;
  const b=document.createElement('button');b.type='button';b.className='primary';b.textContent=rec[quest.id]?'Revisit quest':'Try quest';b.onclick=()=>openQuest(quest.id);
  card.append(emoji,title,tag,desc,b);cards.appendChild(card);
 }
}
function addFilter(id,label){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String(filter===id));b.onclick=()=>{filter=id;render()};$('filters').appendChild(b)}
function openQuest(id){active=D.quests.find(q=>q.id===id);if(!active)return;const level=active.levels[tier()]||active.levels.e;
 const pane=$('detailBody');pane.replaceChildren();const h=document.createElement('h2');h.textContent=active.icon+' '+active.title;
 const info=document.createElement('p');info.className='sub';info.textContent=stage().name+' · '+active.duration+' minutes · '+D.tiers[tier()];
 const goal=document.createElement('p');goal.textContent=active.why;
 const mat=document.createElement('p');const bold=document.createElement('strong');bold.textContent='What you need: ';mat.append(bold,active.materials);
 const stages=document.createElement('div');stages.className='steps';for(let i=0;i<3;i++){const el=document.createElement('div');el.className='step';const title=document.createElement('strong');title.textContent=['🧠 1. Learn','👐 2. Do','💬 3. Explain'][i];const desc=document.createElement('p');desc.textContent=level[i];el.append(title,desc);stages.append(el)}
 const label=document.createElement('p');label.className='note small';label.textContent='Guide: '+D.areas[active.area].names[prefs.nation]+' · This quest is a thematic learning suggestion, not a fully validated curriculum objective.';
 const actions=document.createElement('div');actions.className='actions';for(const [value,display] of [['explained','✓ I can explain this'],['tried','🙂 I gave it a go'],['help','🤝 I need a little help']]){const b=document.createElement('button');b.type='button';b.className=value==='explored'?'primary':'secondary';b.textContent=display;b.onclick=()=>finish(value);actions.appendChild(b)}
 const feedback=document.createElement('p');feedback.id='feedback';feedback.setAttribute('role','status');pane.append(h,info,goal,mat,stages,label,actions,feedback);$('questDetail').hidden=false;$('questDetail').scrollIntoView({behavior:'smooth',block:'start'});
}
function finish(mode){
 if(!active)return;
 completed=E.addReflection(completed,scope(),active.id,mode,Date.now(),D.quests);set(key,completed);
 $('feedback').textContent=E.MODES[mode].label+'. '+E.MODES[mode].detail+'. Progress saved on this device; this does not establish mastery.';
 render();
}
$('nation').addEventListener('change',e=>{prefs.nation=e.target.value;prefs.stage=D.sources[prefs.nation].stages[0].id;updateStages();$('questDetail').hidden=true});
$('stage').addEventListener('change',e=>{prefs.stage=e.target.value;storePrefs();render();$('questDetail').hidden=true});
$('suggest').onclick=()=>openQuest(recommended().id);
$('practice').onclick=()=>{const due=ranked().find(q=>q.due);const prior=ranked().find(q=>records()[q.id]);openQuest((due||prior||ranked()[0]).id)};
$('backQuests').onclick=()=>{$('questDetail').hidden=true;$('questList').scrollIntoView({behavior:'smooth',block:'start'})};
$('parentPrint').onclick=()=>{
 const blob=new Blob([report()],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='SpeedyLearning-Home-Quest-Report.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
};
$('printReport').onclick=printSummary;
$('accessToggle').onclick=()=>{const panel=$('accessPanel');panel.hidden=!panel.hidden;$('accessToggle').setAttribute('aria-expanded',String(!panel.hidden))};
for(const [id,k] of [['largeToggle','large'],['contrastToggle','contrast'],['motionToggle','motion']]){
 $(id).checked=Boolean(access[k]);$(id).onchange=e=>{access[k]=e.target.checked;set(accessKey,access);preferences()};
}
let resetArmed=false;
$('resetLocal').onclick=()=>{
 if(!resetArmed){resetArmed=true;$('storageAlert').textContent='Press again to confirm that all Home Quest Atlas progress on this device will be cleared.';return}
 completed={};set(key,completed);try{localStorage.removeItem(legacyKey)}catch{};resetArmed=false;$('storageAlert').textContent='Quest progress cleared on this device.';render();
};
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('accessPanel').hidden=true});
updateNation();
})();