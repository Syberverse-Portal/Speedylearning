/* SpeedyLearning's illustrated learning world. Existing lessons and scoring stay unchanged. */
(() => {
 "use strict";
 const current=location.pathname;
 const icon=(name)=>'/assets/mascot-'+name+'.svg';
 const nav=[
  ['Home','/'],
  ['Subjects','/#subjects'],
  ['Games','/games/'],
  ['Rewards','/#rewards'],
  ['Learning Journey','/#journey'],
  ['For Parents','/#parents']
 ];
 const create=(tag,cls,html)=>{const e=document.createElement(tag);e.className=cls;if(html!==undefined)e.innerHTML=html;return e};
 const mascot=(name,extra='')=>'<img src="'+icon(name)+'" alt="" loading="eager" '+extra+'>';
 function header(){
  const h=create('header','speed-top');
  h.innerHTML='<a class="speed-logo" href="/" aria-label="SpeedyLearning homepage"><span class="logo-spark" aria-hidden="true">✦</span><span><b>Speedy</b><em>Learning</em></span></a>'+
  '<nav aria-label="Main navigation">'+nav.map(([title,url])=>'<a href="'+url+'"'+(url==='/'&&current==='/'||url==='/games/'&&current.startsWith('/games/')?' aria-current="page"':'')+'>'+title+'</a>').join('')+'</nav>'+
  '<a class="speed-nav-cta" href="/#subjects">Start an adventure <span aria-hidden="true">➜</span></a>';
  document.body.insertBefore(h,document.body.firstChild);
 }
 function footer(){
  const f=create('footer','speed-page-footer','<span>Small steps, big bright futures. ✨</span><span><a href="/privacy.html">Privacy for families</a> · <a href="/quests/">Home Quest Atlas</a></span>');
  document.body.appendChild(f);
 }
 function home(){
  const menu=document.getElementById('menu'),rules=document.getElementById('rules');
  const top=document.getElementById('topbar');
  if(!menu||!rules||!top)return;
  document.body.classList.add('speedy-world');
  const hero=create('section','speed-homehero');
  hero.id='speedHero';
  hero.setAttribute('aria-labelledby','speedHeroTitle');
  hero.innerHTML=`
   <div class="speed-copy">
    <div class="speed-hello"><span aria-hidden="true">⭐</span> Welcome to SpeedyLearning!</div>
    <h2 id="speedHeroTitle">Big Learning <strong>Adventures</strong><span>for Brighter Futures!</span></h2>
    <p>Join the SpeedyLearning mascot family on a magical journey where every subject is an adventure!</p>
    <button class="speed-start" id="speedStart" type="button">Start Your Adventure <span aria-hidden="true">➜</span></button>
    <div class="speed-promise">Free learning fun · Reception to Year 6 · No adverts in our games</div>
    <div class="speed-crew" aria-label="Meet the six SpeedyLearning characters" role="img">
      ${['dash','sum','story','scribble','scout','spark'].map(n=>mascot(n)).join('')}
    </div>
   </div>
   <div class="speed-world-map" aria-label="Explore the learning islands">
     <img class="speed-island-picture" src="/assets/speedy-island-map.svg" alt="A colourful world of floating islands for maths, reading, writing, science and games." width="1024" height="645">
     <div class="speed-cloud cloud-one" aria-hidden="true"></div>
     <div class="speed-cloud cloud-two" aria-hidden="true"></div>
     <button class="map-hotspot map-maths" type="button" data-speed-target="Maths" aria-label="Explore Maths Mountain"><span>➕</span> Maths</button>
     <button class="map-hotspot map-reading" type="button" data-speed-target="Reading" aria-label="Explore Reading Forest"><span>📖</span> Reading</button>
     <button class="map-hotspot map-writing" type="button" data-speed-target="Writing" aria-label="Explore Writing Woods"><span>✏️</span> Writing</button>
     <button class="map-hotspot map-science" type="button" data-speed-target="Science" aria-label="Explore the Science Lab"><span>🔬</span> Science</button>
     <a class="map-hotspot map-games" href="/games/" aria-label="Explore Game Galaxy"><span>🎮</span> Games</a>
   </div>`;
  rules.parentNode.insertBefore(hero,rules);
  const cards=[
   {id:'Maths',name:'Maths',desc:'Build skills step by step!',mascot:'sum',tone:'maths'},
   {id:'Reading',name:'Reading',desc:'Discover amazing stories!',mascot:'story',tone:'reading'},
   {id:'Writing',name:'Writing',desc:'Big ideas start here!',mascot:'scribble',tone:'writing'},
   {id:'Science',name:'Science',desc:'Explore the world around you!',mascot:'scout',tone:'science'},
   {id:'Games',name:'Games',desc:'Learn through play!',mascot:'spark',tone:'games'}
  ];
  const modules=create('section','speed-subjects');
  modules.id='subjects';modules.setAttribute('aria-label','Choose a subject');
  modules.innerHTML='<h2 class="speed-section-title"><span>✦</span> Pick a learning adventure <span>✦</span></h2>'+
   '<div class="speed-subject-grid">'+cards.map(c=>'<button type="button" class="speed-subject-card '+c.tone+'" data-speed-target="'+c.id+'">'+
   '<img src="'+icon(c.mascot)+'" alt="" width="130" height="130" loading="lazy"><span class="speed-subject-label">'+c.name+'</span>'+
   '<span class="speed-subject-desc">'+c.desc+'</span><span class="speed-card-go" aria-hidden="true">➜</span></button>').join('')+'</div>';
  hero.after(modules);
  const journey=create('section','speed-journey');
  journey.id='journey';journey.setAttribute('aria-label','Your learning journey');
  journey.innerHTML='<div class="speed-journey-head"><h2>🗺️ Your Learning Journey</h2><p>Choose a destination. Every adventure is a chance to learn something new.</p></div>'+
  '<div class="speed-journey-stops">'+[
   ['🏁','Start Here','Maths'],['⛰️','Maths Mountain','Maths'],
   ['📚','Reading Forest','Reading'],['✏️','Writing Woods','Writing'],
   ['🧪','Science Lab','Science'],['🎮','Game Galaxy','Games'],['🎁','Celebrate Progress','Progress']
  ].map(([emoji,title,target],index)=>'<button type="button" class="speed-journey-stop" data-speed-target="'+target+'" aria-label="'+title+'"><span class="journey-emoji">'+emoji+'</span><span>'+title+'</span></button>').join('')+'</div>';
  const rewards=create('section','speed-rewards');
  rewards.id='rewards';rewards.setAttribute('aria-label','Rewards and achievements');
  rewards.innerHTML='<div class="speed-rewards-head"><div><h2>🌟 Earn Amazing Rewards!</h2><p>Practise, build confidence and discover your personal achievements.</p></div>'+mascot('spark')+'</div>'+
   '<div class="speed-reward-icons" aria-hidden="true"><span>⭐</span><span>👑</span><span>🏅</span><span>💎</span><span>🏆</span></div>'+
   '<button class="speed-rewards-btn" type="button" data-speed-target="Progress">See My Progress ➜</button>';
  const lower=create('div','speed-lower');lower.append(journey,rewards);modules.after(lower);
  // Contextual adventure title: the same mascots follow children into lessons.
  const banner=create('section','speed-play-banner');
  banner.hidden=true; banner.setAttribute('aria-label','Current learning adventure');
  banner.innerHTML='<div class="speed-play-content"><span class="speed-play-eyebrow">✨ The adventure continues</span><h2 id="speedPlayTitle">Let’s learn something brilliant!</h2><p id="speedPlayDescription">Take your time, try your best and collect those little wins.</p></div><img id="speedPlayMascot" src="'+icon('dash')+'" alt="" loading="lazy">';
  top.before(banner);
  const setHidden=(el,v)=>{if(el&&el.hidden!==v)el.hidden=v};
  function themeFor(label){
    const l=(label||'').toLowerCase();
    if(/math|sum|table|numeracy|sats/.test(l))return ['sum','Maths Mountain','Solve, explore and discover! Every question is a step forward.','maths'];
    if(/read|book|story|spell|vocab|grammar|word|english/.test(l))return ['story','Reading Forest','New words and incredible stories are waiting for you.','reading'];
    if(/writ|sentence|paragraph/.test(l))return ['scribble','Writing Woods','Let your imagination grow, one sentence at a time.','writing'];
    if(/animal|flag|world|science|nature/.test(l))return ['scout','Discovery Island','Look closely, ask questions and explore the wonderful world.','science'];
    if(/progress|badge|score|achievement/.test(l))return ['spark','Your Learning Journey','Look at the skills you have practised and what comes next.','progress'];
    if(/parents|worksheets|method|grown-up/.test(l))return ['dash','For Grown-ups','Helpful worksheets, learning methods and progress information.','parents'];
    return ['dash','Your Learning Adventure','Explore, practise and learn something new today.','learning'];
  }
  const more=create('section','speed-more');
  more.innerHTML='<div class="speed-more-title"><div><h2 id="speedMoreHeading">Even more to explore!</h2><p id="speedMoreDescription">Animals, flags, books, spelling, SATs and activities for every curious mind.</p></div><button type="button" class="speed-how" id="speedHow" aria-controls="rules" aria-expanded="false">❔ How to play</button></div>';
  lower.after(more); more.append(menu);more.after(rules);
  function find(tileName){
   const titles={Maths:/^Maths/i,Reading:/Story Time/i,Writing:/Writing Workshop|^Writing/i,Progress:/My Progress/i,Parents:/Parents' Corner/i};
   const query=titles[tileName]||new RegExp(tileName,'i');
   return [...menu.querySelectorAll('button.cat')].find(b=>query.test(b.textContent.replace(/\\s+/g,' ').trim()));
  }
  function go(target){
    if(target==='Games'){location.assign('/games/');return}
    if(target==='Science'){location.assign('/quests/');return}
    const button=find(target);
    if(button){button.click();window.scrollTo({top:0,behavior:'instant'})}
    else{document.getElementById('home')?.click();setTimeout(()=>find(target)?.click(),0)}
  }
  document.querySelectorAll('[data-speed-target]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.speedTarget)));
  document.getElementById('speedStart').addEventListener('click',()=>modules.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));
  let howOpen=false;
  const how=document.getElementById('speedHow');
  how.addEventListener('click',()=>{howOpen=!howOpen;how.setAttribute('aria-expanded',String(howOpen));rules.hidden=!howOpen;if(howOpen)rules.scrollIntoView({behavior:'smooth',block:'start'})});
  function state(){
    const activeGame=document.getElementById('game')?.hidden===false;
    const activeProgress=document.getElementById('progress')?.hidden===false;
    const activeParents=document.getElementById('parents')?.hidden===false;
    const activeWriting=document.getElementById('writing')?.hidden===false;
    const activeEditor=document.getElementById('editor')?.hidden===false;
    const atHome=!menu.hidden&&top.hidden&&!activeGame&&!activeProgress&&!activeParents&&!activeWriting&&!activeEditor;
    setHidden(hero,!atHome);setHidden(modules,!atHome);setHidden(lower,!atHome);
    setHidden(how,!atHome);setHidden(banner,atHome);
    more.classList.toggle('subpage',!atHome);
    const headline=document.getElementById('speedMoreHeading');
    const sub=(document.getElementById('sub')?.textContent||'').trim();
    const isProgress=activeProgress,isParents=activeParents;
    const friendly=themeFor(isProgress?'progress':isParents?'parents':activeWriting?'writing':sub);
    if(!atHome){
      const title=isProgress?'My Progress':isParents?"Parents’ Corner":activeWriting?'Writing Workshop':sub.replace(/: pick a deck$/,'').replace(/: pick a paper.*$/,'');
      document.getElementById('speedPlayTitle').textContent=title||friendly[1];
      document.getElementById('speedPlayDescription').textContent=friendly[2];
      const avatar=document.getElementById('speedPlayMascot');
      const chosen=icon(friendly[0]);
      if(avatar.getAttribute('src')!==chosen)avatar.setAttribute('src',chosen);
      document.body.dataset.adventureSubject=friendly[3];
    }else{delete document.body.dataset.adventureSubject}
    headline.textContent=atHome?'Even more to explore!':(sub||'Choose an adventure');
    setHidden(document.getElementById('speedMoreDescription'),!atHome);
    if(atHome)setHidden(rules,!howOpen);
    setHidden(more,menu.hidden&&!atHome);
  }
  new MutationObserver(state).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});
  state();
  const hash=location.hash;
  if(hash==='#parents'||hash==='#progress')setTimeout(()=>go(hash==='#parents'?'Parents':'Progress'),180);
  else if(['#subjects','#journey','#rewards'].includes(hash))setTimeout(()=>document.querySelector(hash)?.scrollIntoView({block:'start'}),260);
  if(hash==='#parents'){
    // Parents' Corner is an existing interactive screen, not a public sign-in.
    setTimeout(()=>{const b=[...menu.querySelectorAll('button.cat')].find(x=>/Parents' Corner/i.test(x.textContent));if(b)b.click()},240);
  }
 }
 document.addEventListener('DOMContentLoaded',()=>{
   if(current.startsWith('/console'))return;
   header();if(current==='/')home();footer();
 });
})();