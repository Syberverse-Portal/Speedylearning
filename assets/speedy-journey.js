/* SpeedyLearning Journey - a genuine saved, replayable learning adventure. No accounts or tracking. */
(()=>{
 "use strict";
 const KEY='speedy-island-journey-v1';
 const worlds=[
  {id:'maths',name:'Maths Mountain',icon:'🔢',mascot:'sum',color:'#36a8fa',intro:'Climb Number Mountain to collect your first star.',task:'Solve the number puzzle',kind:'choice'},
  {id:'reading',name:'Reading Forest',icon:'📚',mascot:'story',color:'#a66cf2',intro:'Find the hidden meaning among the story trees.',task:'Read and choose the answer',kind:'choice'},
  {id:'writing',name:'Writing Woods',icon:'✏️',mascot:'scribble',color:'#28bfb7',intro:'Use your own brilliant words to wake the word sprites.',task:'Write a tiny story',kind:'writing'},
  {id:'science',name:'Science Lab',icon:'🔬',mascot:'scout',color:'#41c778',intro:'Become a scientist and uncover the secret.',task:'Solve the science mystery',kind:'choice'},
  {id:'games',name:'Game Galaxy',icon:'🎮',mascot:'spark',color:'#7b64ea',intro:'Train your memory before flying into Nova Forge.',task:'Match the secret pattern',kind:'choice'}
 ];
 const quiz={
  maths:[
   [{q:'What is 6 + 7?',a:['11','12','13','14'],correct:2},{q:'What is 12 − 5?',a:['6','7','8','9'],correct:1}],
   [{q:'What is 9 × 6?',a:['54','45','63','56'],correct:0},{q:'What is 84 ÷ 7?',a:['13','12','11','14'],correct:1}],
  ],
  reading:[
   [{q:'Milo the fox sat beneath the old oak tree. Where was Milo?',a:['Inside a cave','Under a tree','On a hill','In a boat'],correct:1},{q:'Lena whispered because the baby was asleep. Why did she whisper?',a:['She was singing','She wanted to wake the baby','She wanted to be quiet','She was outside'],correct:2}],
   [{q:'The path was treacherous after the storm. What does treacherous mean here?',a:['Easy','Colourful','Dangerous','Short'],correct:2},{q:'Which word is closest in meaning to joyful?',a:['Happy','Nervous','Hungry','Quiet'],correct:0}]
  ],
  science:[
   [{q:'What do plants need to grow?',a:['Sunlight and water','Only rocks','Only darkness','Plastic'],correct:0},{q:'Which material is attracted to a magnet?',a:['Wood','Glass','Iron','Paper'],correct:2}],
   [{q:'What is the name of the process plants use to make food?',a:['Evaporation','Condensation','Photosynthesis','Freezing'],correct:2},{q:'Which force pulls objects towards Earth?',a:['Gravity','Light','Sound','Heat'],correct:0}]
  ],
  games:[
   [{q:'Remember this: ⭐ 🌙 ⭐. What comes next?',a:['🌙','☀️','⭐','💎'],correct:0},{q:'Which is different?',a:['Circle','Sphere','Square','Triangle'],correct:1}],
   [{q:'Continue the sequence: 2, 4, 8, 16, ...',a:['18','24','30','32'],correct:3},{q:'Which comes next? ▲ ● ▲ ● ▲',a:['●','▲','■','♥'],correct:0}]
  ]
 };
 const initial=()=>({year:'Year 3',hero:'dash',complete:{},stars:0,visited:[],updated:Date.now()});
 let save;
 try{save={...initial(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{save=initial()}
 save.complete=save.complete&&typeof save.complete==='object'?save.complete:{};
 try{const who=localStorage.getItem('speedy-player')||'Me',y=localStorage.getItem('speedy-year|'+who);if(y)save.year=y;}catch{}
 const persist=()=>{save.updated=Date.now();try{localStorage.setItem(KEY,JSON.stringify(save))}catch{}};
 let selected='maths',question=0,correctCount=0,answers=[],active=false;
 const $=(sel,root=document)=>root.querySelector(sel);
 const numberOfDone=()=>worlds.filter(x=>save.complete[x.id]).length;
 const safe=(text)=>String(text).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function getQuestion(world,step){
  const secondary=/[456]/.test(save.year);
  return quiz[world][secondary?1:0][step%2];
 }
 function render(){
  const root=$('#speedJourneyApp');if(!root)return;
  const done=numberOfDone(),total=worlds.length;
  root.innerHTML=`
   <div class="sj-heading"><div><span class="sj-kicker">✦ YOUR ADVENTURE STARTS HERE</span><h2>Journey through the Learning Islands</h2><p>Choose your character, discover each island, complete real missions and earn your stars!</p></div><div class="sj-progress"><b>${done} / ${total} islands</b><div class="sj-progress-track"><span style="width:${done/total*100}%"></span></div><strong>⭐ ${save.stars} stars</strong></div></div>
   <div class="sj-personalise"><label>My school year <select id="sjYear">${['Reception','Year 1','Year 2','Year 3','Year 4','Year 5','Year 6'].map(x=>'<option '+(save.year===x?'selected':'')+'>'+x+'</option>').join('')}</select></label><div class="sj-hero-choice"><span>My adventure buddy:</span>${['dash','sum','story','scribble','scout','spark'].map(n=>'<button class="sj-avatar '+(save.hero===n?'selected':'')+'" type="button" data-avatar="'+n+'" aria-label="Choose '+n+'" aria-pressed="'+(save.hero===n)+'"><img src="/assets/mascot-'+n+'.svg" alt=""></button>').join('')}<span class="sj-buddy-name" aria-live="polite">${save.hero.charAt(0).toUpperCase()+save.hero.slice(1)} is your buddy!</span></div></div>
   <div class="sj-map-wrap" aria-label="Learning island quest map">
    <img class="sj-map-image" src="/assets/reference-world-islands.webp" alt="Beautiful floating islands with a maths mountain, reading forest, writing woods, science laboratory and games galaxy.">
    <div class="sj-map-links">${worlds.map((w,i)=>'<button type="button" data-island="'+w.id+'" class="sj-map-pin sj-pin-'+w.id+(save.complete[w.id]?' achieved':'')+'"><span>'+(save.complete[w.id]?'✓':i+1)+'</span><b>'+w.name+'</b></button>').join('')}</div>
   </div>
   <div class="sj-path">${worlds.map((w,i)=>'<button type="button" class="sj-stop '+(save.complete[w.id]?'complete':'')+'" data-island="'+w.id+'"><span class="sj-stop-icon">'+(save.complete[w.id]?'⭐':w.icon)+'</span><strong>'+w.name+'</strong><small>'+(save.complete[w.id]?'Island star earned!':'Explore & play')+'</small></button>').join('')}</div>
   <div class="sj-finale"><div>🏆 <strong>${done===5?'Adventure champion!':'Your treasure chest awaits!'}</strong><span>${done===5?'You completed all five islands! Replay any mission.':'Earn one star on each island to unlock your champion celebration.'}</span></div><button type="button" id="sjContinue">${done===5?'Play again':'Next adventure →'}</button></div>
  `;
  $('#sjYear',root).addEventListener('change',e=>{save.year=e.target.value;persist();try{const who=localStorage.getItem('speedy-player')||'Me';localStorage.setItem('speedy-year|'+who,save.year);}catch{}render()});
  root.querySelectorAll('[data-avatar]').forEach(b=>b.addEventListener('click',()=>{const y=scrollY;save.hero=b.dataset.avatar;persist();render();scrollTo({top:y,behavior:'instant'});const again=$('[data-avatar="'+save.hero+'"]');if(again)again.focus({preventScroll:true})}));
  root.querySelectorAll('[data-island]').forEach(b=>b.addEventListener('click',()=>openIsland(b.dataset.island)));
  $('#sjContinue',root).addEventListener('click',()=>openIsland((worlds.find(w=>!save.complete[w.id])||worlds[0]).id));
 }
 function openIsland(id){
  selected=id;question=0;correctCount=0;answers=[];active=true;
  if(!save.visited.includes(id)){save.visited.push(id);persist()}
  drawQuest();
 }
 function drawQuest(){
  const world=worlds.find(w=>w.id===selected),root=$('#speedQuestOverlay');
  if(!root)return;
  const isWriting=world.kind==='writing';
  root.hidden=false;document.body.classList.add('sj-modal-open');
  const q=isWriting?null:getQuestion(selected,question);
  root.innerHTML=`
   <div class="sj-backdrop" data-close="1"></div>
   <section class="sj-dialog" role="dialog" aria-modal="true" aria-labelledby="sjQuestHeading" tabindex="-1" style="--island-color:${world.color}">
    <button class="sj-close" type="button" aria-label="Close adventure">✕</button>
    <div class="sj-dialog-hero"><img src="/assets/mascot-${world.mascot}.svg" alt=""><div><span class="sj-kicker">ISLAND ${worlds.indexOf(world)+1} • ${safe(save.year)}</span><h2 id="sjQuestHeading">${world.name}</h2><p>${world.intro}</p></div></div>
    <div class="sj-quest-progress">Mission ${isWriting?'1':question+1} of ${isWriting?'1':'2'} • ${world.task}</div>
    ${isWriting?'<label class="sj-write-label" for="sjWriting">Imagine a secret door in a magical forest. What happens when you open it?</label><textarea id="sjWriting" rows="5" maxlength="1200" placeholder="I opened the glowing door and…"></textarea><p class="sj-wordcount" id="sjWords">Use at least 12 words to finish your mission.</p><button id="sjSubmitWriting" type="button" class="sj-big-button">Finish my story ✨</button>':
    '<h3 class="sj-question">'+safe(q.q)+'</h3><div class="sj-options">'+q.a.map((a,i)=>'<button type="button" class="sj-answer" data-answer="'+i+'">'+safe(a)+'</button>').join('')+'</div><p class="sj-feedback" aria-live="polite" id="sjFeedback">Pick an answer to continue your adventure!</p>'}
    <a class="sj-curriculum-link" href="${world.id==='games'?'/games/':world.id==='science'?'/quests/':'/#subjects'}">Explore more ${world.name} activities →</a>
   </section>`;
  $('.sj-close',root).addEventListener('click',close);$('.sj-backdrop',root).addEventListener('click',close);
  if(isWriting){const tx=$('#sjWriting',root),btn=$('#sjSubmitWriting',root);
   tx.addEventListener('input',()=>{$('#sjWords',root).textContent=tx.value.trim().split(/\s+/).filter(Boolean).length+' words • aim for at least 12'});
   btn.addEventListener('click',()=>{if(tx.value.trim().split(/\s+/).filter(Boolean).length<12){$('#sjWords',root).textContent='Add a little more detail to your story (at least 12 words).';return}completeWorld()});
  }else root.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>{
   const answer=Number(b.dataset.answer);const right=answer===q.correct;
   root.querySelectorAll('[data-answer]').forEach(b=>{b.disabled=true;if(+b.dataset.answer===q.correct)b.classList.add('right')});
   $('#sjFeedback',root).textContent=right?'Brilliant! 🌟 You found the answer!':'Good try! The answer is '+q.a[q.correct]+'. Keep exploring!';
   correctCount+=Number(right);
   const next=document.createElement('button');next.type='button';next.className='sj-big-button';next.textContent=question===1?'Finish mission →':'Next challenge →';next.addEventListener('click',()=>{if(++question>=2)completeWorld();else drawQuest()});
   $('#sjFeedback',root).after(next);
  }));
  $('.sj-dialog',root).focus();
 }
 function completeWorld(){
  const first=!save.complete[selected],w=worlds.find(x=>x.id===selected);
  save.complete[selected]=true;if(first)save.stars+=1;persist();render();
  const root=$('#speedQuestOverlay');
  root.innerHTML='<div class="sj-backdrop" data-close="1"></div><section class="sj-dialog sj-win" role="dialog" aria-modal="true" aria-labelledby="sjWinTitle" tabindex="-1"><div class="sj-win-spark">⭐ 🏆 ⭐</div><img src="/assets/mascot-'+w.mascot+'.svg" alt="" class="sj-win-mascot"><h2 id="sjWinTitle">'+(first?'New island star earned!':'Mission replay complete!')+'</h2><p>You explored '+w.name+'. '+(first?'A new star has been added to your treasure chest!':'Keep practising to grow your skills.')+'</p><button type="button" class="sj-big-button" id="sjBack">Back to my island map →</button></section>';
  $('#sjBack',root).addEventListener('click',()=>{close();$('#speedJourneyApp').scrollIntoView({behavior:'smooth'})});
  $('.sj-backdrop',root).addEventListener('click',close);$('.sj-dialog',root).focus();
 }
 function close(){const root=$('#speedQuestOverlay');if(root)root.hidden=true;document.body.classList.remove('sj-modal-open');active=false}
 document.addEventListener('keydown',e=>{if(active&&e.key==='Escape')close()});
 document.addEventListener('DOMContentLoaded',()=>{if($('#speedJourneyApp'))render()});
})();