/* Optional SpeedyLearning v2 enhancements; no child progress leaves the browser. */
(() => {
"use strict";
const PREF="speedy-plus-settings";
const defaults={smartPractice:true,reducedMotion:false,largeText:false,highContrast:false,offline:true,activityTotals:false,aiHelp:false};
const $=id=>document.getElementById(id);
const get=()=>{try{return {...defaults,...JSON.parse(localStorage.getItem(PREF)||'{}')}}catch{return {...defaults}}};
const save=s=>{try{localStorage.setItem(PREF,JSON.stringify(s))}catch{}};
let settings=get();
function apply(){
 document.documentElement.classList.toggle('speedy-large',settings.largeText);
 document.documentElement.classList.toggle('speedy-contrast',settings.highContrast);
 document.documentElement.classList.toggle('speedy-still',settings.reducedMotion);
}
apply();
const style=document.createElement('style');
style.textContent=`
.speedy-settings {position:fixed;bottom:12px;right:12px;z-index:9000;display:flex;gap:7px;flex-wrap:wrap;justify-content:end}
.speedy-settings button,.speedy-panel button{background:#176a49;color:white;border:0;padding:11px 14px;border-radius:10px;font:700 14px system-ui;cursor:pointer;box-shadow:0 2px 8px #0003}
.speedy-panel {position:fixed;inset:auto 10px 64px auto;z-index:9001;max-width:min(430px,calc(100vw - 20px));max-height:min(78vh,680px);overflow-y:auto;background:white;color:#17382b;border-radius:18px;padding:22px;box-shadow:0 8px 35px #0007;text-align:left;font:16px/1.5 system-ui;user-select:text}
.speedy-panel h2{font-size:1.5rem;margin:0 0 10px}.speedy-panel p{margin:8px 0}.speedy-panel label{display:flex;align-items:center;gap:9px;margin:12px 0}.speedy-panel label input{width:20px;height:20px;flex:none}
.speedy-panel button{margin:6px 7px 5px 0}.speedy-panel .speedy-quiet{background:#e4eee7;color:#174b36}
.speedy-panel a{color:#075b42}.speedy-panel .speedy-note{font-size:13px;color:#5b7162}
.speedy-large body{font-size:115%!important}.speedy-large .cat{font-size:1.25rem!important}
.speedy-contrast{--bg:#064a35!important;--card:#fff!important;--ink:#111!important;--accent:#f0bd1a!important;--muted:#444!important}
.speedy-still *,.speedy-still *::before,.speedy-still *::after{animation-duration:0.001ms!important;transition-duration:0.001ms!important;scroll-behavior:auto!important}
@media(max-width:550px){.speedy-panel{inset:auto 8px 64px 8px;max-width:none}.speedy-settings{bottom:6px;right:6px}}
`;
document.head.appendChild(style);
const commands=document.createElement('div');commands.className='speedy-settings';
const open=document.createElement('button');open.type='button';open.textContent='⚙️ Settings';open.setAttribute('aria-label','Open learning accessibility and privacy settings');
commands.appendChild(open);
document.body.appendChild(commands);
const panel=document.createElement('section');panel.className='speedy-panel';panel.hidden=true;panel.setAttribute('aria-label','Learning and privacy settings');
document.body.appendChild(panel);
function render(){
 panel.replaceChildren();
 const heading=document.createElement('h2');heading.textContent='Learning settings';panel.appendChild(heading);
 const intro=document.createElement('p');intro.textContent='Choose how SpeedyLearning works on this device. No account needed.';panel.appendChild(intro);
 const opts=[
 ['smartPractice','Suggest practice for topics I am finding tricky'],
 ['largeText','Larger text'],
 ['highContrast','High-contrast colours'],
 ['reducedMotion','Reduce movement and animations'],
 ['offline','Save lessons for offline use'],
 ['activityTotals','Share anonymous subject-use totals (optional)'],
 ['aiHelp','Allow AI help when a safe server is configured (optional)']
 ];
 for(const [key,label] of opts){
   const wrap=document.createElement('label');const checkbox=document.createElement('input');
   checkbox.type='checkbox';checkbox.checked=Boolean(settings[key]);checkbox.addEventListener('change',()=>{
     settings[key]=checkbox.checked;save(settings);apply();
     if(key==='offline')offline();if(key==='aiHelp')toggleAI();
   });wrap.append(checkbox,document.createTextNode(label));panel.appendChild(wrap);
 }
 const report=document.createElement('button');report.textContent='📄 Parent progress report';report.onclick=parentReport;panel.appendChild(report);
 const routine=document.createElement('button');routine.textContent='🎯 My 10-minute plan';routine.onclick=dailyPlan;panel.appendChild(routine);
 const close=document.createElement('button');close.textContent='Close';close.className='speedy-quiet';close.onclick=()=>{panel.hidden=true;open.focus()};panel.appendChild(close);
 const privacy=document.createElement('p');privacy.className='speedy-note';privacy.innerHTML='<a href="/privacy.html" target="_blank" rel="noopener">Privacy and data information</a> · Learning history stays on this device';panel.appendChild(privacy);
}
open.onclick=()=>{render();panel.hidden=!panel.hidden;if(!panel.hidden)panel.querySelector('input')?.focus()};
document.addEventListener('keydown',e=>{if(e.key==='Escape')panel.hidden=true});
function read(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch{return d}}
function person(){return localStorage.getItem('speedy-player')||'Me'}
function history(){return read('speedy-log|'+person(),[]).filter(x=>Number.isFinite(x.t))}
function weakness(log){const tally=new Map();
for(const item of log.slice(-350)){const tag=[item.s,item.topic||item.d||'Practice'].join(' • ');const x=tally.get(tag)||{tag,count:0,ok:0,subject:item.s,deck:item.d||''};x.count++;x.ok+=item.ok?1:0;tally.set(tag,x)}
return [...tally.values()].filter(x=>x.count>=3).sort((a,b)=>(a.ok/a.count)-(b.ok/b.count)||b.count-a.count);
}
function reportText(){
 const who=person(),log=history(),recent=log.filter(x=>x.t>=Date.now()-7*86400000),weak=weakness(log),correct=recent.filter(x=>x.ok).length;
 const done=read('speedy-done|'+who,[]).filter(x=>x.t>=Date.now()-7*86400000);
 let text='SpeedyLearning parent progress report\n';
 text+='Learner on this device: '+who+'\nCreated: '+new Date().toLocaleDateString('en-GB')+'\n\n';
 text+='Last 7 days\nAnswers: '+recent.length+'\nCorrect: '+correct+' ('+(recent.length?Math.round(correct/recent.length*100):0)+'%)\nSections finished: '+done.length+'\n\n';
 text+='Suggested next steps:\n';
 if(!weak.length)text+='Try a new topic or complete a short practice deck.\n';
 else for(const item of weak.slice(0,3))text+='• '+item.tag+' — '+Math.round(item.ok/item.count*100)+'% right in '+item.count+' recent attempts. Practise this topic and offer support.\n';
 text+='\nThis report is made on this device; it is not automatically sent anywhere.\n';
 return text;
}
function parentReport(){
 const blob=new Blob([reportText()],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='SpeedyLearning-parent-report.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function dailyPlan(){
 const log=history(),weak=weakness(log);const targets=weak.slice(0,3).map(x=>x.tag);
 const text='Your 10-minute learning plan\n\n2 minutes: warm up with 3 familiar questions.\n5 minutes: '+(targets.length?'Practise '+targets.join(' and ')+'.':'Choose a subject and try a short activity.')+'\n3 minutes: revisit any mistakes, then finish with a question you can solve.\n\nKeep practising gently; mistakes are part of learning.';
 const popup=window.open('','_blank','width=620,height=650');
 if(!popup){alert(text);return}
 popup.document.title='SpeedyLearning • Daily practice plan';
 const pre=popup.document.createElement('pre');pre.style.cssText='white-space:pre-wrap;font:18px/1.7 system-ui;padding:24px;color:#163b2d';pre.textContent=text;
 popup.document.body.appendChild(pre);
}
function offline(){
 if(!('serviceWorker' in navigator)||location.protocol!=='https:')return;
 if(settings.offline)navigator.serviceWorker.register('/learning-sw.js',{scope:'/'}).catch(()=>{});
 else navigator.serviceWorker.getRegistration('/').then(reg=>reg?.unregister()).catch(()=>{});
}
function toggleAI(){
 // No AI endpoint is activated without a configured backend and a parent-managed setting.
}
function privacyActivity(subject){
 if(!settings.activityTotals||typeof subject!=='string'||!/^[a-z-]{2,32}$/.test(subject))return;
 navigator.sendBeacon?.('/api/activity',new Blob([JSON.stringify({subject})],{type:'text/plain'}));
}
if(settings.offline)window.addEventListener('load',offline,{once:true});
window.SpeedyPlus={settings:()=>({...settings}),reportText,dailyPlan,privacyActivity,parentReport};
})();