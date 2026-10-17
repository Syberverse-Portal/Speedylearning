(()=>{'use strict';
const D=window.SpeedyQuestCatalog;
if(!D){document.body.textContent='The learning library could not load. Please refresh.';return}
const $=id=>document.getElementById(id);
const key='speedy-quest-atlas-v1',prefsKey='speedy-quest-preferences-v1';
const val=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const prefs=val(prefsKey,{nation:'en',stage:'Y3'});let completed=val(key,{}),filter='all',active=null;
function nation(){return D.sources[prefs.nation]||D.sources.en}
function stage(){return nation().stages.find(x=>x.id===prefs.stage)||nation().stages[0]}
function storePrefs(){set(prefsKey,prefs)}
function tier(){return stage().tier}
function records(){return completed[prefs.nation+':'+prefs.stage]||{}}
function updateNation(){const n=$('nation');n.replaceChildren();for(const [code,item] of Object.entries(D.sources)){const option=new Option(item.label,code);n.add(option)}n.value=prefs.nation in D.sources?prefs.nation:'en';prefs.nation=n.value;updateStages()}
function updateStages(){const sel=$('stage');sel.replaceChildren();for(const s of nation().stages)sel.add(new Option(s.name,s.id));if(!nation().stages.some(x=>x.id===prefs.stage))prefs.stage=nation().stages[0].id;sel.value=prefs.stage;storePrefs();$('curriculum').replaceChildren();const anchor=document.createElement('a');anchor.href=nation().url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.textContent='Read the official '+nation().name+' guidance ↗';$('curriculum').append('Activities inspired by ',anchor);render()}
function changeNation(value){prefs.nation=value;const next=D.sources[value].stages.find(s=>s.tier===tier())||D.sources[value].stages[0];prefs.stage=next.id;updateStages()}
function recommended(){const rec=records(),xs=D.quests.filter(x=>!rec[x.id]);const options=xs.length?xs:D.quests;const last=(Object.entries(rec).sort((a,b)=>b[1].time-a[1].time)[0]||[])[0];const from=options.filter(q=>q.id!==last);return (from.length?from:options).slice().sort((a,b)=>{const ca=D.quests.filter(q=>q.area===a.area).length;return ca - D.quests.filter(q=>q.area===b.area).length})[Math.floor(Math.random()*Math.min(options.length,5))]||options[0]}
function render(){
 const rec=records(),done=Object.keys(rec).filter(k=>D.quests.some(q=>q.id===k)).length;
 const percent=Math.round(100*done/D.quests.length);$('progressFill').style.width=percent+'%';$('progress').setAttribute('aria-valuenow',String(percent));
 $('progressText').textContent=done+' of '+D.quests.length+' starter adventures explored at this stage · Each can be repeated';
 $('nextText').textContent=done?'Nice work! Which skill will you explore next?':'Your first quest can take just ten minutes. Nobody has to be perfect.';
 const filters=$('filters');filters.replaceChildren();addFilter('all','All themes');for(const [id,area] of Object.entries(D.areas))addFilter(id,area.icon+' '+area.label);
 const cards=$('cards');cards.replaceChildren();
 for(const quest of D.quests.filter(q=>filter==='all'||filter===q.area)){
  const card=document.createElement('article');card.className='quest';
  const emoji=document.createElement('span');emoji.className='emoji';emoji.textContent=quest.icon;
  const title=document.createElement('h3');title.textContent=quest.title;
  const tag=document.createElement('span');tag.className='tag';tag.textContent=(rec[quest.id]?'✓ Explored · ':'')+quest.duration+' minutes · '+D.areas[quest.area].names[prefs.nation];
  const p=document.createElement('p');p.textContent=quest.why;
  const btn=document.createElement('button');btn.type='button';btn.className='primary';btn.textContent=rec[quest.id]?'Try again':'Start quest';btn.onclick=()=>openQuest(quest.id);
  card.append(emoji,title,tag,p,btn);cards.appendChild(card);
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
 const actions=document.createElement('div');actions.className='actions';for(const [value,display] of [['explored','✓ We explored this'],['more','🔁 We want to try it again']]){const b=document.createElement('button');b.type='button';b.className=value==='explored'?'primary':'secondary';b.textContent=display;b.onclick=()=>finish(value);actions.appendChild(b)}
 const feedback=document.createElement('p');feedback.id='feedback';feedback.setAttribute('role','status');pane.append(h,info,goal,mat,stages,label,actions,feedback);$('questDetail').hidden=false;$('questDetail').scrollIntoView({behavior:'smooth',block:'start'});
}
function finish(result){if(!active)return;if(result==='explored'){const k=prefs.nation+':'+prefs.stage;completed[k]||={};const current=completed[k][active.id]||{repeats:0};completed[k][active.id]={time:Date.now(),repeats:(current.repeats||0)+1};set(key,completed);$('feedback').textContent='Lovely effort. This adventure is saved on your device. Explored is not the same as mastering a subject.'}else{$('feedback').textContent='No problem — try a different explanation or ask a grown-up for help. Your quest stays open.'}render()}
$('nation').addEventListener('change',e=>{prefs.nation=e.target.value;prefs.stage=D.sources[prefs.nation].stages[0].id;updateStages();$('questDetail').hidden=true});
$('stage').addEventListener('change',e=>{prefs.stage=e.target.value;storePrefs();render();$('questDetail').hidden=true});
$('suggest').onclick=()=>openQuest(recommended().id);
$('practice').onclick=()=>{const ids=Object.keys(records());const q=D.quests.find(x=>ids.includes(x.id));openQuest((q||recommended()).id)};
$('backQuests').onclick=()=>{$('questDetail').hidden=true;$('questList').scrollIntoView({behavior:'smooth',block:'start'})};
$('parentPrint').onclick=()=>{const done=Object.keys(records()).filter(id=>D.quests.some(q=>q.id===id));const text='Home Quest Atlas learning summary\\nNation: '+nation().label+'\\nStage: '+stage().name+'\\nDate: '+new Date().toLocaleDateString('en-GB')+'\\n\\nAdventures explored ('+done.length+' of '+D.quests.length+'):\\n'+done.map(id=>'- '+D.quests.find(q=>q.id===id).title).join('\\n')+'\\n\\nExplored means attempted; it does not establish mastery.\\nProgress was recorded only on this device.';
 const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='SpeedyLearning-Quest-Summary.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)};
updateNation();
})();