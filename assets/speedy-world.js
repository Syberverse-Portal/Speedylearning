/* Shared SpeedyLearning navigation: no analytics or external requests. */
(function(){
 const current=location.pathname;
 const navigation=[["Home","/"],["Learning games","/games/"],["Home quests","/quests/"],["For grown-ups","/#parents"]];
 function makeHeader(){
  const header=document.createElement("header");header.className="speed-top";
  header.innerHTML='<a class="speed-logo" href="/" aria-label="SpeedyLearning homepage"><img src="/assets/mascot-dash.svg" alt=""><span><b>Speedy</b><em>Learning</em></span></a><nav aria-label="Main navigation">'+navigation.map(([label,url],i)=>'<a href="'+url+'"'+((i===0&&current==="/")||(i===1&&current.startsWith("/games"))||(i===2&&current.startsWith("/quests"))?' aria-current="page"':'')+'>'+label+'</a>').join("")+'</nav>';
  document.body.insertBefore(header,document.body.firstChild);
 }
 function home(){
  document.body.classList.add("speedy-world");
  const hero=document.createElement("section");hero.className="speed-homehero";hero.id="speedHero";
  hero.innerHTML='<div><span class="speed-eyebrow">Welcome to your happy place to learn</span><h2>Big adventures.<br><strong>Brilliant little minds.</strong></h2><p>Explore exciting games, practise school skills, tell stories and celebrate every new discovery. Made for curious children, from Reception to Year 6.</p><div class="speed-hero-actions"><button type="button" class="speed-action" id="speedStart">Choose a subject →</button><a href="/games/" class="speed-action alt">Play the maths adventure</a></div><p class="speed-modalhint" style="margin-top:16px">Free to explore · No adverts in our games · Made for children</p></div><div class="speed-mascot-stage" aria-hidden="true"><img src="/assets/mascot-story.svg" alt=""><img src="/assets/mascot-dash.svg" alt=""><img src="/assets/mascot-spark.svg" alt=""></div>';
  const rules=document.getElementById("rules"),menu=document.getElementById("menu");
  if(!rules||!menu)return;
  rules.parentNode.insertBefore(hero,rules);
  const intro=document.createElement("div");intro.className="speed-module-intro";intro.id="speedModules";intro.innerHTML='<div><h2>Pick your next adventure</h2><p>Every brilliant journey starts with a little curiosity.</p></div><a href="/quests/" class="speed-action alt">Try a real-world quest ↗</a>';
  menu.parentNode.insertBefore(intro,menu);
  const start=document.getElementById("speedStart");start.addEventListener("click",()=>menu.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"}));
  let formerlyVisible=false;
  const observer=new MutationObserver(()=>{
   const atHome=!menu.hidden&&rules&&!rules.hidden;
   if(formerlyVisible!==atHome){hero.hidden=!atHome;intro.hidden=!atHome;formerlyVisible=atHome;}
  });
  observer.observe(document.body,{attributes:true,attributeFilter:["hidden"],subtree:true});
  if(location.hash==="#parents"){setTimeout(()=>{const el=[...document.querySelectorAll("#menu button")].find(e=>/parent/i.test(e.textContent));el?.click()},250)}
 }
 function footer(){const f=document.createElement("footer");f.className="speed-page-footer";f.innerHTML='Made for curious minds · SpeedyLearning · <a href="/privacy.html">Privacy for families</a>';document.body.appendChild(f)}
 document.addEventListener("DOMContentLoaded",()=>{if(current.startsWith("/console")||document.body.hasAttribute("data-speed-no-nav"))return;makeHeader();if(current==="/")home();footer()});
})();