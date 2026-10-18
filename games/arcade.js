/* NOVA FORGE — a bespoke SpeedyLearning console-like game, not a quiz wrapper.
 * Original procedural missions, multiple solution routes, 2.5D canvas arcade
 * flight, synthesised effects, keyboard/touch/gamepad support, offline-ready.
 * No network requests, profiles, tracking, ads, purchases or leaderboards.
 */
(() => {
"use strict";
const Data=window.SpeedyArcadeMaths;
if(!Data)return;
const $=id=>document.getElementById(id);
const canvas=$("world"),c=canvas.getContext("2d",{alpha:false});
const STAGES=Data.stages;
const state={
 mode:"intro",paused:false,year:"Year 3",round:0,mission:null,selected:[],
 totalLights:0,completionCount:0,lights:0,flightTime:0,duration:16,
 shipY:.5,shipV:0,shipAim:null,holdingUp:false,holdingDown:false,
 shots:[],particles:[],ts:0,worldTime:0,
 sound:false,calm:false,contrast:false,hints:0,gamepadA:false
};
const keyState=new Set();
const colors=[
 ["#66f7bf","#fce68b","#61a8fb"],
 ["#74ddff","#ff8ed1","#9d87ff"],
 ["#85ffda","#ffce78","#6b9aff"],
 ["#5af7eb","#fd93e4","#73a6ff"],
 ["#72fdc6","#ffc580","#cd91ff"],
 ["#65defa","#ffe28c","#ab8dff"],
 ["#82e7ff","#ff88ce","#a680ff"]];
const particles=[];
let cssW=960,cssH=530,scale=1,frame=0,last=0,toastTimer=null,audioCtx=null;
const read=(k,otherwise)=>{
 try{const value=localStorage.getItem(k);return value==null?otherwise:JSON.parse(value)}
 catch{return otherwise}
};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const count=(key)=>read("speedy-nova-v1|"+key,{finished:0,lights:0});
function yearIndex(){return STAGES.indexOf(state.year);}
const col=(index=0)=>colors[Math.max(0,yearIndex())][index%3];
function clamp(n,a,b){return Math.min(b,Math.max(a,n));}
function lerp(a,b,t){return a+(b-a)*t;}
function smooth(a,b,t){return lerp(a,b,clamp(t,0,1));}
function announce(text,positive=false){
 $("forgeFeedback").textContent=text;
 $("forgeFeedback").className="tip"+(positive?" good":"");
}
function alertToast(text,ms=1700){
 const el=$("toast");el.textContent=text;el.hidden=false;
 if(toastTimer)clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>el.hidden=true,ms);
}
function setMode(mode){
 state.mode=mode;
 $("startPanel").hidden=mode!=="intro";
 $("victoryPanel").hidden=mode!=="victory";
 $("forgeControls").hidden=mode!=="forge";
 $("flightControls").hidden=mode!=="flight";
 $("stage").classList.toggle("flying",mode==="flight");
 $("missionLabel").textContent=mode==="intro"?"NOVA FIELD · READY":
    mode==="victory"?"SKY REPAIRED":state.mission?state.mission.title.toUpperCase():"NOVA FORGE";
 $("lightLabel").textContent=mode==="flight"?state.lights+" / "+state.shots.length+" LIGHTS":"✧ REBUILD THE SKY";
}
const optionsForYear=()=>{
 $("year").replaceChildren();
 for(const y of STAGES)$("year").add(new Option(y,y));
 const requested=new URLSearchParams(location.search).get("stage");
 const stored=read("speedy-nova-last-year","Year 3");
 state.year=STAGES.includes(requested)?requested:STAGES.includes(stored)?stored:"Year 3";
 $("year").value=state.year;
};
function refreshProgress(){
 const v=count(state.year);
 state.completionCount=Number(v.finished)||0;
 state.totalLights=Number(v.lights)||0;
 $("totalWinsTop").textContent=String(state.completionCount);
}
function initYear(year){
 state.year=STAGES.includes(year)?year:"Year 3";
 $("year").value=state.year;
 save("speedy-nova-last-year",state.year);
 refreshProgress();
 state.round=state.completionCount;
 state.selected=[];
 state.shipY=.5;
 state.hints=0;
 $("skillFocus").textContent=Data.skills[state.year]+". Activities reflect age-appropriate themes for England, not certified objective-by-objective mapping.";
 state.mission=Data.getGameData(state.year,state.round);
 setMode("intro");
}
function burst(x,y,color,n=16){
 if(state.calm)return;
 for(let i=0;i<n;i++){
  const angle=(Math.PI*2*i/n)+(Math.random()-.5)*.3,v=30+Math.random()*130;
  particles.push({x,y,vx:Math.cos(angle)*v,vy:Math.sin(angle)*v,
    life:.7+Math.random()*.5,age:0,r:2+Math.random()*3,color});
 }
 if(particles.length>110)particles.splice(0,particles.length-110);
}
function playSound(freq=400,type="sine",duration=.16,volume=.055){
 if(!state.sound)return;
 try{
  if(!audioCtx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audioCtx=new Audio();}
  if(audioCtx.state==="suspended")audioCtx.resume();
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  const t=audioCtx.currentTime;
  o.type=type;o.frequency.setValueAtTime(freq,t);
  o.frequency.exponentialRampToValueAtTime(Math.max(80,freq*.56),t+duration);
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(volume,t+.014);
  g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+duration+.02);
 }catch{}
}
function sequence(){
 playSound(390,"triangle",.24);
 setTimeout(()=>playSound(590,"triangle",.23),90);
 setTimeout(()=>playSound(820,"sine",.45),220);
}
function pulseVibrate(){try{navigator.vibrate?.(15)}catch{}}
function choose(index){
 if(state.mode!=="forge")return;
 const picks=state.selected,position=picks.indexOf(index);
 if(position>=0)picks.splice(position,1);
 else if(picks.length<3)picks.push(index);
 else {announce("Three crystals is the maximum. Undo one or tap a selected crystal to remove it.");return}
 playSound(220+(index%9)*38,"triangle",.12,.045);
 pulseVibrate();updateSelection();
 burst(cssW*.5,cssH*.46,col(0),5);
}
function sumSelected(){return state.selected.reduce((t,i)=>t+state.mission.values[i],0);}
function updateSelection(){
 const picks=state.selected;
 const values=picks.map(i=>state.mission.values[i]);
 const total=values.reduce((a,b)=>a+b,0);
 $("equation").textContent=(values.length?values.join(" + ")+" = ":"")+" "+total;
 [...$("shards").children].forEach((b,i)=>{
  const on=picks.includes(i);
  b.classList.toggle("selected",on);
  b.setAttribute("aria-pressed",String(on));
  b.disabled=!on&&picks.length>=3;
 });
 $("ignite").disabled=picks.length===0;
 if(!picks.length)announce("Choose crystals that add up to the answer you worked out.");
 else if(total===state.mission.answer)announce("Energy balanced! Your maths has unlocked the engine. Press Ignite.",true);
 else announce("Energy: "+total+". Compare this with the answer you found using your school method.");
}
function setupMission(same=false){
 if(!same){
  state.mission=Data.getGameData(state.year,state.round);
 }
 state.selected=[];state.hints=0;state.shots=[];
 state.shipY=.5;state.shipV=0;state.shipAim=null;
 $("prompt").textContent=state.mission.prompt;
 $("skill").textContent=state.year.toUpperCase()+" · "+state.mission.skill.toUpperCase();
 $("work").value="";
 $("method").value=state.mission.method;
 $("methodHint").textContent=methodText();
 const crystals=$("shards");crystals.replaceChildren();
 state.mission.values.forEach((value,i)=>{
  const b=document.createElement("button");
  b.type="button";b.className="shard";
  b.setAttribute("aria-pressed","false");
  b.setAttribute("aria-label","Crystal "+(i+1)+", value "+value);
  const hotkey=document.createElement("span");hotkey.className="key";hotkey.textContent=String(i+1);
  const number=document.createElement("span");number.textContent=String(value);
  b.append(hotkey,number);b.addEventListener("click",()=>choose(i));
  crystals.appendChild(b);
 });
 setMode("forge");updateSelection();
 $("forgeControls").scrollIntoView({behavior:state.calm?"instant":"smooth",block:"nearest"});
}
function methodText(){
 const method=$("method").value;
 const advice={
  numberline:"Use jumps forwards or backwards and label each landing number.",
  tenframe:"Draw two ten frames or counters. Make ten first if useful.",
  partition:"Separate tens, hundreds and ones. Recombine the place-value parts.",
  column:"Line up matching place values. Show each exchange in the column.",
  grid:"Partition the factors, multiply each section, then add the partial products.",
  array:"Draw equal groups or rows. Use repeated addition or the multiplication fact.",
  busstop:"Show division steps and any carried remainder.",
  bar:"Draw equal bar sections and label the whole and parts.",
  fractions:"Sketch equal-sized parts; find one part then multiply by the parts needed.",
  steps:"Show any method your teacher taught, with your reasoning."};
 return (advice[method]||advice.steps)+" Mission thinking tip: "+state.mission.help;
}
function ignite(){
 if(state.mode!=="forge")return;
 const total=sumSelected();
 if(!state.selected.length){announce("Choose one or more power crystals first.");playSound(140,"sawtooth",.12);return}
 if(total!==state.mission.answer){
  const hint=total>state.mission.answer?"You may have too much energy. Try exchanging a crystal.":
    "Your engine needs a little more energy. Can a different combination work?";
  announce("That doesn't power the engine yet. "+hint);
  playSound(180,"triangle",.18);burst(cssW*.5,cssH*.5,"#ffb575",7);
  return;
 }
 announce("Perfect energy balance! Launching your lightship…",true);
 sequence();burst(cssW*.5,cssH*.5,col(0),42);
 $("ignite").disabled=true;
 setTimeout(()=>{if(state.mode==="forge")beginFlight()},670);
}
function buildFlight(){
 const positions=[.46,.32,.64,.41,.7,.27,.56,.38,.74,.51];
 state.shots=positions.map((v,i)=>({start:.35+i*1.14,y:v,passed:false,hit:false,size:i%3===0?1.22:1}));
 state.lights=0;state.flightTime=0;state.shipY=.5;state.shipV=0;
 state.shipAim=null;state.paused=false;
 $("flightFill").style.width="0%";
 $("flightStatus").textContent="Sail through glowing rings to collect starlight.";
 $("pause").textContent="Ⅱ Pause";
 $("pause").setAttribute("aria-pressed","false");
}
function beginFlight(){
 buildFlight();setMode("flight");
 burst(cssW*.25,cssH*.5,col(1),30);playSound(230,"sawtooth",.55,.035);
 $("flightControls").scrollIntoView({behavior:state.calm?"instant":"smooth",block:"nearest"});
}
function finishMission(){
 if(state.mode!=="flight")return;
 const prog=count(state.year);
 const updated={finished:(Number(prog.finished)||0)+1,lights:(Number(prog.lights)||0)+state.lights};
 save("speedy-nova-v1|"+state.year,updated);
 refreshProgress();
 state.round=state.completionCount;
 $("victoryText").textContent="You completed "+state.mission.skill.toLowerCase()+
 ". Your different solution routes helped rebuild the sky.";
 $("winLights").textContent=String(state.lights);
 setMode("victory");sequence();
 burst(cssW*.5,cssH*.4,col(1),48);
 window.scrollTo({top:0,behavior:state.calm?"instant":"smooth"});
}
function togglePause(){
 if(state.mode!=="flight")return;
 state.paused=!state.paused;
 $("pause").textContent=state.paused?"▶ Resume":"Ⅱ Pause";
 $("pause").setAttribute("aria-pressed",String(state.paused));
 $("flightStatus").textContent=state.paused?"Paused. Come back whenever you're ready.":"Lightship engines reactivated.";
}
function updateFlight(dt){
 if(state.paused)return;
 state.flightTime+=dt;
 let axis=Number(keyState.has("ArrowDown")||keyState.has("s")||state.holdingDown)-
          Number(keyState.has("ArrowUp")||keyState.has("w")||state.holdingUp);
 try{
  const gp=[...(navigator.getGamepads?.()||[])].find(g=>g&&g.connected);
  if(gp){const y=gp.axes?.[1]||0;if(Math.abs(y)>.18)axis=y;
    if(gp.buttons?.[9]?.pressed&&!state.gamepadA){state.gamepadA=true;togglePause()}
    else if(!gp.buttons?.[9]?.pressed)state.gamepadA=false;
  }
 }catch{}
 if(state.shipAim!==null)axis=clamp((state.shipAim-state.shipY)*7,-1,1);
 const thrust=axis*4.9;
 state.shipV+=(thrust-state.shipV*3.8)*dt;
 state.shipY=clamp(state.shipY+state.shipV*dt,.10,.90);
 if(state.shipY===.1||state.shipY===.9)state.shipV=0;
 const speed=cssW*.57;
 for(const gate of state.shots){
  if(gate.passed)continue;
  const x=cssW+75-(state.flightTime-gate.start)*speed;
  if(x<=cssW*.25){
   gate.passed=true;
   if(Math.abs(state.shipY-gate.y)<.158){
    gate.hit=true;state.lights++;
    playSound(590+state.lights*42,"sine",.3,.045);
    burst(cssW*.25,cssH*state.shipY,col(0),22);
    $("flightStatus").textContent="✦ Light restored! Keep flying.";
    $("lightLabel").textContent=state.lights+" / "+state.shots.length+" LIGHTS";
   }
  }
 }
 $("flightFill").style.width=Math.min(100,100*state.flightTime/state.duration)+"%";
 if(state.flightTime>=state.duration)finishMission();
}
function shapeCrystal(x,y,r,hue,selected=false,value=""){
 c.save();c.translate(x,y);
 c.shadowBlur=selected?38:18;c.shadowColor=selected?"#74ffdf":hue;
 c.beginPath();c.moveTo(0,-r);c.lineTo(r*.87,-r*.27);
 c.lineTo(r*.73,r*.55);c.lineTo(0,r);c.lineTo(-r*.75,r*.56);
 c.lineTo(-r*.89,-r*.3);c.closePath();
 const g=c.createLinearGradient(-r,-r,r,r);
 g.addColorStop(0,selected?"#c5fff7":"#c5e4ff");
 g.addColorStop(.33,selected?"#299fad":hue);
 g.addColorStop(.8,selected?"#1a598a":"#1d2863");
 g.addColorStop(1,"#080e3b");
 c.fillStyle=g;c.fill();c.lineWidth=2;c.strokeStyle=selected?"#b8fff4":"#96c1ff";
 c.stroke();c.shadowBlur=0;
 c.beginPath();c.moveTo(0,-r);c.lineTo(0,r*.15);c.lineTo(r*.73,r*.55);
 c.moveTo(0,r*.15);c.lineTo(-r*.75,r*.56);
 c.strokeStyle="#e1f6ff47";c.lineWidth=1.5;c.stroke();
 if(value!==""&&r>22){c.fillStyle="white";c.font="900 "+Math.max(12,r*.53)+"px system-ui";c.textAlign="center";c.textBaseline="middle";c.shadowBlur=8;c.shadowColor="#08122a";c.fillText(value,0,r*.05);}
 c.restore();
}
function drawWorldBackground(w,h,t){
 const bg=c.createLinearGradient(0,0,w,h);
 bg.addColorStop(0,"#05142e");bg.addColorStop(.48,"#120d39");bg.addColorStop(1,"#061e3a");
 c.fillStyle=bg;c.fillRect(0,0,w,h);
 const planet=c.createRadialGradient(w*.78,h*.18,3,w*.78,h*.18,w*.52);
 planet.addColorStop(0,col(2)+"46");planet.addColorStop(.28,"#46358744");planet.addColorStop(1,"#030a1d00");
 c.fillStyle=planet;c.fillRect(0,0,w,h);
 // Bioluminescent sky fields shift independently at three depths.
 for(let i=0;i<3;i++){
  c.save();c.globalAlpha=.13-i*.023;c.lineWidth=24-i*6;c.strokeStyle=col(i);
  c.shadowBlur=30;c.shadowColor=col(i);c.beginPath();
  for(let x=-40;x<=w+40;x+=12){
   const y=h*(.19+i*.15)+Math.sin(x/(w*.24)+t*(state.calm?0:.21+i*.1)+i*.8)*h*.075;
   if(x===-40)c.moveTo(x,y);else c.lineTo(x,y);
  }c.stroke();c.restore();
 }
 // Spatial starfield. Drawn deterministically, no external assets.
 for(let i=0;i<110;i++){
  const x=((i*1337.71+(state.calm?0:t*([4,10,16][i%3])))%(w+90)+w+90)%(w+90);
  const y=(i*271.3+Math.sin(i*9.4)*51)%(h*.81);
  const twinkle=state.calm?1:.67+.33*Math.sin(t*1.6+i*2.3);
  c.fillStyle=i%8===0?"#b4fbea":"#bad2ff";c.globalAlpha=twinkle*(i%3===0?.85:.42);
  c.beginPath();c.arc(x,y,Math.max(.7,(i%5===0?1.8:1)*Math.min(w/680,1.5)),0,Math.PI*2);c.fill();
 }
 c.globalAlpha=1;
 // High-altitude dark islands add parallax and texture.
 for(let layer=0;layer<3;layer++){
  const dy=h*(.69+layer*.1),unit=95+layer*62;
  c.beginPath();c.moveTo(0,h);
  for(let x=0;x<=w+unit;x+=8){
   const wave=Math.sin(x/unit+(state.calm?0:t*.055*(layer+1))+layer*2)*
     (15+layer*13)+Math.sin(x/(unit*.53)+layer)*8;
   c.lineTo(x,dy+wave);
  }c.lineTo(w,h);c.closePath();
  c.fillStyle=["#142d4c92","#091a37db","#08142a"][layer];c.fill();
  c.strokeStyle=["#7ce7e02f","#7b9fff28","#1d8da22b"][layer];c.lineWidth=1;c.stroke();
 }
 // Horizon perspective grid and moving circuitry trails.
 c.save();c.globalAlpha=.24;c.lineWidth=1;c.strokeStyle=col(0);
 const base=h*.83;for(let i=0;i<17;i++){
  const xp=w*(i/16);c.beginPath();c.moveTo(w*.5,base);c.lineTo(xp,h);c.stroke();
 }
 for(let k=1;k<9;k++){
  let q=k/9;let yy=base+(h-base)*q*q;
  c.beginPath();c.moveTo(0,yy);c.lineTo(w,yy);c.stroke();
 }
 c.restore();
}
function drawReactor(w,h,t){
 const cx=w*.50,cy=h*.46;
 const radius=Math.min(w*.21,h*.27);
 c.save();c.translate(cx,cy);
 for(let i=0;i<4;i++){
  c.beginPath();c.ellipse(0,0,radius*(1+i*.18),radius*(.7+i*.12),
    i*.23+(state.calm?0:t*.065*(i%2?1:-1)),0,Math.PI*2);
  c.strokeStyle=i%2===0?col(0)+"52":col(1)+"48";
  c.lineWidth=i===0?2.5:1.4;c.shadowBlur=i===0?15:0;c.shadowColor=col(0);c.stroke();
 }
 const coreRadius=Math.max(27,Math.min(w,h)*.115);
 const glow=c.createRadialGradient(0,0,2,0,0,coreRadius*2.2);
 glow.addColorStop(0,"#f3fffcdd");glow.addColorStop(.13,col(0)+"9c");
 glow.addColorStop(.4,col(2)+"58");glow.addColorStop(1,"#19305a00");
 c.fillStyle=glow;c.beginPath();c.arc(0,0,coreRadius*2.2,0,Math.PI*2);c.fill();
 shapeCrystal(0,0,coreRadius*.68,col(0),state.selected.length>0);
 c.restore();
 if(state.mode==="forge"&&state.mission){
  state.mission.values.forEach((value,i)=>{
   const angle=-Math.PI*.88+i*Math.PI*1.76/8;
   const rx=w*.29,ry=h*.27;
   const x=cx+Math.cos(angle)*rx,y=cy+Math.sin(angle)*ry;
   const selected=state.selected.includes(i);
   if(selected){
    c.strokeStyle=col(0)+"a8";c.shadowColor=col(0);c.shadowBlur=12;
    c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(cx,cy);c.stroke();c.shadowBlur=0;
   }
   shapeCrystal(x,y,Math.max(13,Math.min(w,h)*.056),col(i),selected,
     Math.min(w,h)>390?String(value):"");
  });
 }
}
function ring(x,y,r,spin,index){
 c.save();c.translate(x,y);c.rotate(spin);
 c.lineWidth=Math.max(3,r*.12);c.shadowBlur=25;c.shadowColor=col(index);
 c.strokeStyle=col(index);c.beginPath();c.ellipse(0,0,r,r*.78,0,0,Math.PI*2);c.stroke();
 c.shadowBlur=0;c.strokeStyle="#ecffffd0";c.lineWidth=Math.max(1,r*.042);
 c.beginPath();c.ellipse(0,0,r*.78,r*.59,0,Math.PI*1.08,Math.PI*1.84);c.stroke();
 for(let j=0;j<4;j++){
  const a=j*Math.PI/2+spin*.8;
  c.fillStyle="#f2f8ff";c.beginPath();c.arc(Math.cos(a)*r,Math.sin(a)*r*.78,2.5,0,Math.PI*2);c.fill();
 }
 c.restore();
}
function ship(x,y,w,t){
 const r=Math.max(28,Math.min(w*.067,65));
 c.save();c.translate(x,y);
 c.rotate(clamp(state.shipV,-1,1)*.11);
 // Engine ion trail reacts to velocity even if sound or motion is off.
 for(let j=0;j<4;j++){
  let len=r*(.7+j*.27)+(state.calm?0:Math.sin(t*13+j)*6);
  const g=c.createLinearGradient(-r-len,0,-r*.35,0);
  g.addColorStop(0,"#24ffd000");g.addColorStop(.72,col(j%3)+"8f");g.addColorStop(1,"#e6ffffa9");
  c.strokeStyle=g;c.lineWidth=(4-j)*3;c.beginPath();
  c.moveTo(-r*.4,-r*.18+j*r*.11);c.lineTo(-r-len,-r*.18+j*r*.11);c.stroke();
 }
 c.shadowColor=col(0);c.shadowBlur=34;
 c.fillStyle="#2ad0df";c.beginPath();
 c.moveTo(r*1.3,0);c.lineTo(-r*.27,-r*.68);c.lineTo(-r*.86,-r*.55);
 c.lineTo(-r*.49,0);c.lineTo(-r*.86,r*.55);c.lineTo(-r*.27,r*.68);
 c.closePath();c.fill();
 const hull=c.createLinearGradient(0,-r,0,r);
 hull.addColorStop(0,"#effeff");hull.addColorStop(.5,col(2));hull.addColorStop(1,"#187b9c");
 c.fillStyle=hull;c.beginPath();c.moveTo(r*1.32,0);c.lineTo(-r*.28,-r*.35);
 c.lineTo(-r*.25,r*.35);c.closePath();c.fill();
 c.shadowBlur=0;c.strokeStyle="#defbff";c.lineWidth=2;c.stroke();
 c.fillStyle="#072447";c.beginPath();c.ellipse(r*.17,0,r*.4,r*.16,0,0,Math.PI*2);c.fill();
 c.fillStyle="#fff";c.globalAlpha=.78;c.beginPath();c.ellipse(r*.22,-r*.052,r*.14,r*.035,0,0,Math.PI*2);c.fill();
 c.globalAlpha=1;c.restore();
}
function drawFlight(w,h,t){
 const ft=state.flightTime,speed=w*.57;
 // Layered speed streaks make navigation feel like acceleration.
 if(!state.calm&&ft>0){
  for(let i=0;i<36;i++){
   const x=((i*197.71-ft*speed*(.6+(i%5)*.12))%(w+80)+w+80)%(w+80);
   const y=((i*79.13)%(h*.73))+h*.10;
   c.strokeStyle=i%3===0?col(0)+"4d":"#b8d5ff27";
   c.lineWidth=i%4===0?2.2:1;c.beginPath();c.moveTo(x,y);c.lineTo(x+18+i%8*3,y);c.stroke();
  }
 }
 for(let i=0;i<state.shots.length;i++){
  const g=state.shots[i];
  if(g.passed)continue;
  const x=w+75-(ft-g.start)*speed,cy=h*g.y;
  if(x<-60||x>w+90)continue;
  const r=Math.max(21,Math.min(w,h)*.061)*g.size;
  c.strokeStyle=col(i%3)+"37";c.lineWidth=1;
  c.beginPath();c.moveTo(x,cy-r*2);c.lineTo(x,cy+r*2);c.stroke();
  ring(x,cy,r,t*.7+i*.5,i%3);
 }
 ship(w*.25,h*state.shipY,w,t);
 c.save();c.fillStyle="#dafbff";c.textAlign="right";c.font="800 12px system-ui";
 c.fillText("PILOT YOUR LIGHTSHIP",w-24,h-24);c.restore();
 if(state.paused){
  c.fillStyle="#020a21d4";c.fillRect(0,0,w,h);
  c.textAlign="center";c.fillStyle="white";c.font="900 "+Math.min(44,w*.07)+"px system-ui";
  c.fillText("PAUSED",w*.5,h*.48);
  c.font="600 "+Math.min(18,w*.037)+"px system-ui";c.fillStyle="#bbe9e5";
  c.fillText("Tap Resume or press P to continue",w*.5,h*.55);
 }
}
function updateParticles(dt){
 for(let i=particles.length-1;i>=0;i--){
  const p=particles[i];p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.985;p.vy*=.985;
  if(p.age>p.life)particles.splice(i,1);
 }
}
function drawParticles(){
 for(const p of particles){
  c.globalAlpha=1-p.age/p.life;c.fillStyle=p.color;
  c.beginPath();c.arc(p.x,p.y,p.r*(.5+.5*(1-p.age/p.life)),0,Math.PI*2);c.fill();
 }
 c.globalAlpha=1;
}
function draw(t,dt){
 const w=cssW,h=cssH;
 c.save();c.setTransform(scale,0,0,scale,0,0);
 drawWorldBackground(w,h,state.worldTime);
 if(state.mode==="forge"){
  drawReactor(w,h,state.worldTime);
 }else if(state.mode==="flight"){
  drawFlight(w,h,state.worldTime);
 }else if(state.mode==="intro"){
  drawReactor(w,h,state.worldTime);
  // World starts mysterious; the reactor is visible behind the start briefing.
 }else if(state.mode==="victory"){
  for(let i=0;i<9;i++){
   const x=w*(.13+i*.092),y=h*(.18+.11*Math.sin(i*.95+state.worldTime*.8));
   ring(x,y,Math.min(24,w*.022),state.worldTime*.7,i%3);
  }
  ship(w*.76,h*.54,w,state.worldTime);
 }
 drawParticles();
 c.restore();
}
function fit(){
 const rect=canvas.getBoundingClientRect();
 const width=Math.max(260,Math.floor(rect.width)),height=Math.max(200,Math.floor(rect.height));
 const ratio=Math.min(window.devicePixelRatio||1,2);
 const pxW=Math.round(width*ratio),pxH=Math.round(height*ratio);
 if(canvas.width!==pxW||canvas.height!==pxH){canvas.width=pxW;canvas.height=pxH;}
 cssW=width;cssH=height;scale=ratio;
}
function frameLoop(t){
 if(!last)last=t;
 const dt=Math.min(.045,Math.max(0,(t-last)/1000));last=t;
 if(!document.hidden){
  state.worldTime+=state.calm?0:dt;
  if(state.mode==="flight")updateFlight(dt);
  updateParticles(dt);draw(t,dt);
 }
 requestAnimationFrame(frameLoop);
}
function flightAxisFromCanvas(event){
 if(state.mode!=="flight")return;
 const rect=canvas.getBoundingClientRect();
 state.shipAim=clamp((event.clientY-rect.top)/Math.max(1,rect.height),.1,.9);
}
function ctrlButton(id,name){
 const b=$(id);
 const press=event=>{event.preventDefault();state[name]=true;state.shipAim=null};
 const release=event=>{if(event)event.preventDefault();state[name]=false};
 b.addEventListener("pointerdown",press);
 b.addEventListener("pointerup",release);
 b.addEventListener("pointerleave",release);
 b.addEventListener("pointercancel",release);
 b.addEventListener("blur",release);
 b.addEventListener("click",event=>{
  if(event.detail===0){
   state.shipAim=null;state.shipY=clamp(state.shipY+(name==="holdingUp"?-.12:.12),.1,.9);
  }
 });
}
function restoreSettings(){
 state.sound=read("speedy-nova-sound",false);
 state.calm=read("speedy-nova-calm",window.matchMedia?.("(prefers-reduced-motion:reduce)")?.matches||false);
 state.contrast=read("speedy-nova-contrast",false);
 $("sound").textContent=state.sound?"♫ Sound on":"♫ Sound off";
 $("sound").setAttribute("aria-pressed",String(state.sound));
 $("motion").textContent=state.calm?"◉ Calm on":"◌ Calm view";
 $("motion").setAttribute("aria-pressed",String(state.calm));
 document.body.classList.toggle("high-contrast",state.contrast);
 $("contrast").setAttribute("aria-pressed",String(state.contrast));
}
function connectControls(){
 $("year").addEventListener("change",()=>initYear($("year").value));
 $("start").addEventListener("click",()=>setupMission(false));
 $("next").addEventListener("click",()=>setupMission(false));
 $("replay").addEventListener("click",()=>{state.round=state.mission.round;setupMission(false)});
 $("ignite").addEventListener("click",ignite);
 $("undo").addEventListener("click",()=>{if(state.mode==="forge"&&state.selected.length){state.selected.pop();playSound(200);updateSelection()}});
 $("reset").addEventListener("click",()=>{if(state.mode==="forge"){state.selected=[];updateSelection()}});
 $("help").addEventListener("click",()=>{
  if(state.mode!=="forge")return;
  state.hints++;
  const msg=state.hints===1?"Use the same method as your lesson. "+state.mission.help:
    "Try finding two chunks that combine to the answer, or use your school-method notebook.";
  announce(msg);alertToast("💡 "+msg,4000);
 });
 $("method").addEventListener("change",()=>{
  $("methodHint").textContent=methodText();
  save("speedy-nova-class-method", $("method").value);
 });
 $("sound").addEventListener("click",()=>{
  state.sound=!state.sound;save("speedy-nova-sound",state.sound);
  $("sound").textContent=state.sound?"♫ Sound on":"♫ Sound off";
  $("sound").setAttribute("aria-pressed",String(state.sound));
  if(state.sound)playSound(630,"triangle",.27,.035);
 });
 $("motion").addEventListener("click",()=>{
  state.calm=!state.calm;save("speedy-nova-calm",state.calm);
  $("motion").textContent=state.calm?"◉ Calm on":"◌ Calm view";
  $("motion").setAttribute("aria-pressed",String(state.calm));
 });
 $("contrast").addEventListener("click",()=>{
  state.contrast=!state.contrast;save("speedy-nova-contrast",state.contrast);
  document.body.classList.toggle("high-contrast",state.contrast);
  $("contrast").setAttribute("aria-pressed",String(state.contrast));
 });
 $("pause").addEventListener("click",togglePause);
 $("introHow").addEventListener("click",()=>{
  $("how").open=true;$("how").scrollIntoView({behavior:"smooth",block:"center"});
 });
 ctrlButton("up","holdingUp");ctrlButton("down","holdingDown");
 canvas.addEventListener("pointerdown",event=>{
  if(state.mode==="flight"){canvas.setPointerCapture?.(event.pointerId);flightAxisFromCanvas(event);return}
  // Crystal pointer interaction is duplicated by normal buttons for accessibility.
  if(state.mode==="forge"){
   const rect=canvas.getBoundingClientRect();
   const x=event.clientX-rect.left,y=event.clientY-rect.top;
   const cx=cssW*.5,cy=cssH*.46,rx=cssW*.29,ry=cssH*.27;
   let pick=-1,d=Infinity;
   state.mission.values.forEach((v,i)=>{
    const a=-Math.PI*.88+i*Math.PI*1.76/8;
    const px=cx+Math.cos(a)*rx,py=cy+Math.sin(a)*ry;
    const dd=Math.hypot(px-x,py-y);
    if(dd<Math.max(20,Math.min(cssW,cssH)*.072)&&dd<d){pick=i;d=dd}
   });
   if(pick>=0)choose(pick);
  }
 });
 canvas.addEventListener("pointermove",event=>{if(state.mode==="flight"&&event.buttons)flightAxisFromCanvas(event)});
 canvas.addEventListener("pointerup",()=>{if(state.mode==="flight")state.shipAim=null});
 document.addEventListener("keydown",event=>{
  const tag=event.target?.tagName||"";
  if(["INPUT","SELECT","TEXTAREA"].includes(tag))return;
  if(event.key==="ArrowUp"||event.key==="ArrowDown"||event.key===" "||event.key==="Backspace")event.preventDefault();
  keyState.add(event.key.toLowerCase());
  keyState.add(event.key);
  if(state.mode==="forge"){
   if(/^[1-9]$/.test(event.key))choose(Number(event.key)-1);
   if(event.key==="Backspace")$("undo").click();
   if(event.key==="Enter")ignite();
   if(event.key.toLowerCase()==="h")$("help").click();
  }else if(state.mode==="flight"){
   if(event.key.toLowerCase()==="p"||event.key===" "||event.key==="Escape")togglePause();
  }else if(state.mode==="intro"&&event.key==="Enter")$("start").click();
 });
 document.addEventListener("keyup",event=>{keyState.delete(event.key.toLowerCase());keyState.delete(event.key)});
 window.addEventListener("blur",()=>{keyState.clear();state.holdingUp=false;state.holdingDown=false;state.shipAim=null;if(state.mode==="flight")state.paused=true});
 document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.mode==="flight"){state.paused=true;$("pause").textContent="▶ Resume"}});
 window.addEventListener("resize",fit,{passive:true});
}
restoreSettings();optionsForYear();connectControls();initYear(state.year);fit();
requestAnimationFrame(frameLoop);
// Expose narrowly scoped diagnostic data for in-browser smoke tests. Nothing networked.
window.SpeedyNovaDiagnostics=Object.freeze({
 currentMode:()=>state.mode,
 year:()=>state.year,
 mission:()=>state.mission?.prompt,
 selectedEnergy:()=>state.selected.length,
 completed:()=>count(state.year).finished,
 isPaused:()=>state.paused
});
})();