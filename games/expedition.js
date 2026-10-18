/* NOVA FORGE: STAR RESCUE
 * Physical two-dimensional arcade game with mathematical crystal choices.
 * All gameplay, progress and assets remain on the device. No third-party services.
 */
(() => {
"use strict";
const data = window.SpeedyArcadeMaths;
const $ = id => document.getElementById(id);
if (!data || !$("world")) return;
const canvas = $("world"), ctx = canvas.getContext("2d", {alpha:false});
const TAU = Math.PI * 2;
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const rand = (a,b) => a + Math.random()*(b-a);
const keys = new Set(), held = new Set();
let w = 900, h = 540, pixelRatio = 1, lastFrame = 0;
let year = data.stages.includes(new URLSearchParams(location.search).get("stage"))
  ? new URLSearchParams(location.search).get("stage") : "Year 3";
let motion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let sound = false, audio = null;
const state = {
  mode:"intro", t:0, level:0, stars:0, shield:3, combo:0, completed:0,
  mission:null, options:[], hazards:[], sparks:[], starsInWorld:[],
  x:.13, y:.70, vx:0, vy:0, aim:null, facing:0, flash:0, invulnerable:0,
  dashTime:0, dashCooldown:0, pulseTime:0, pulseCooldown:0,
  pickupCooldown:0, messageUntil:0, touchId:null, pad:null, points:0
};
function storeKey(){ return "speedy-rescue-progress|"+year; }
function history(){
  try { const p=JSON.parse(localStorage.getItem(storeKey())||"{}");
    return {completed:Math.max(0,Number(p.completed)||0),stars:Math.max(0,Number(p.stars)||0)};
  } catch {return {completed:0,stars:0};}
}
function saveHistory(){
  try {localStorage.setItem(storeKey(),JSON.stringify({completed:state.completed,stars:state.stars}));} catch {}
}
const fmt = n => Math.round(n).toLocaleString("en-GB");
function tone(freq=460,duration=.15,type="triangle"){
  if(!sound)return;
  try {
    audio ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==="suspended") audio.resume();
    const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;
    osc.type=type;osc.frequency.setValueAtTime(freq,t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(90,freq*.55),t+duration);
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.055,t+.015);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+duration+.015);
  }catch{}
}
function message(text,seconds=3){
  $("message").textContent=text;
  $("message").hidden=false;
  state.messageUntil=state.t+seconds;
}
function updateHUD(){
  $("level").textContent=String(Math.min(3,state.level+1))+" / 3";
  $("shield").textContent="♥".repeat(state.shield)+"♡".repeat(3-state.shield);
  $("starCount").textContent=fmt(state.stars);
  $("skill").textContent=state.mission ? state.mission.skill : "Maths adventure";
  $("question").textContent=state.mission ? state.mission.prompt : "Fly into the crystal with the right answer.";
  $("pulse").disabled=state.mode!=="playing"||state.pulseCooldown>0;
  $("dash").disabled=state.mode!=="playing"||state.dashCooldown>0;
  $("pulse").textContent=state.pulseCooldown>0
    ? "◉ PULSE "+Math.ceil(state.pulseCooldown)+"s" : "◉ PULSE";
  $("dash").textContent=state.dashCooldown>0
    ? "➤ DASH "+Math.ceil(state.dashCooldown)+"s" : "➤ DASH";
  $("pause").textContent=state.mode==="paused"?"▶ RESUME":"Ⅱ PAUSE";
  $("pause").setAttribute("aria-pressed", String(state.mode==="paused"));
}
function sparksAt(x,y,color,count=16){
  if(!motion) return;
  for(let i=0;i<count;i++) {
    const a=Math.random()*TAU,v=rand(60,180);
    state.sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,
      ttl:rand(.35,.9),age:0,color,r:rand(2,5)});
  }
  if(state.sparks.length>90)state.sparks.splice(0,state.sparks.length-90);
}
function optionValues(answer,seed){
  const v=new Set([answer]);
  const stride=Math.max(1,Math.round(answer*.1));
  const candidates=[
    answer+stride,answer-stride,answer+stride*2,answer-stride*2,
    answer+1,answer-1,answer+10,answer-10,
    answer+Math.max(2,Math.round(answer*.25))
  ];
  for(const candidate of candidates)if(candidate>0&&candidate!==answer&&v.size<4)v.add(candidate);
  while(v.size<4)v.add(answer+v.size+3);
  const opts=[...v]; // Shuffle deterministically by mission index, not answer correctness.
  let n=(seed+1)*1103515245;
  for(let i=opts.length-1;i>0;i--){
    n=(Math.imul(n,1664525)+1013904223)|0;
    const j=(n>>>0)%(i+1);
    [opts[i],opts[j]]=[opts[j],opts[i]];
  }
  return opts;
}
function makeWorld(){
  const starts=[[.25,.34],[.49,.26],[.76,.35],[.62,.66]];
  const offset=state.level%4;
  state.options=optionValues(state.mission.answer,state.mission.round).map((value,i)=>{
    const p=starts[(i+offset)%4];
    return {value,x:p[0],y:p[1],phase:i*1.8+state.level,wrongUntil:0};
  });
  state.hazards=[
    {cx:.40,cy:.48,rx:.105,ry:.15,phase:.7+state.level,spd:1.05,stun:0},
    {cx:.71,cy:.49,rx:.085,ry:.13,phase:2.1+state.level,spd:.87,stun:0},
    {cx:.52,cy:.76,rx:.12,ry:.05,phase:3.3,spd:1.38,stun:0}
  ];
  state.starsInWorld=[
    {x:.20,y:.55,taken:false},{x:.30,y:.73,taken:false},
    {x:.54,y:.46,taken:false},{x:.84,y:.54,taken:false},
    {x:.81,y:.73,taken:false},{x:.42,y:.19,taken:false}
  ];
  state.x=.13;state.y=.69;state.vx=0;state.vy=0;state.aim=null;
  state.pickupCooldown=.5;state.invulnerable=.8;
}
function accessibleChoices(){
  const row=$("accessibleChoices");
  row.replaceChildren();
  for(const option of state.options){
    const b=document.createElement("button");
    b.type="button";b.className="answer-button";
    b.textContent=fmt(option.value);
    b.setAttribute("aria-label","Choose the crystal labelled "+fmt(option.value));
    b.addEventListener("click",()=>answerCrystal(option));
    row.append(b);
  }
}
function loadMission(){
  const previous=history().completed;
  state.mission=data.getGameData(year,previous*3+state.level);
  makeWorld();accessibleChoices();updateHUD();
  message("Fly into the crystal showing the answer. Watch out for the drones!",3.7);
}
function start(){
  state.mode="playing";state.level=0;state.shield=3;state.stars=0;
  state.combo=0;state.completed=history().completed;state.t=0;
  state.pulseCooldown=0;state.dashCooldown=0;state.pulseTime=0;state.dashTime=0;
  $("intro").hidden=true;$("victory").hidden=true;$("paused").hidden=true;
  loadMission();canvas.focus({preventScroll:true});tone(700,.21);
}
function answerCrystal(option){
  if(state.mode!=="playing"||state.pickupCooldown>0)return;
  state.pickupCooldown=1.1;
  const px=option.x*w,py=(option.y+.02*Math.sin(state.t*1.35+option.phase))*h;
  if(option.value!==state.mission.answer){
    option.wrongUntil=state.t+.9;state.combo=0;state.flash=.24;
    message("Not quite — check the question and try another crystal. "+state.mission.help,4);
    tone(190,.24,"sine");return;
  }
  state.combo++;
  state.stars+=20+5*state.combo;
  sparksAt(px,py,"#75f9dc",28);tone(910,.28);
  state.level++;
  if(state.level>=3) {
    finish();return;
  }
  loadMission();
  message("Brilliant maths! Rift "+state.level+" repaired. Find the next answer!",3.3);
}
function finish(){
  state.mode="victory";state.completed=history().completed+1;
  saveHistory();
  $("intro").hidden=true;$("paused").hidden=true;$("victory").hidden=false;
  $("finalStars").textContent=fmt(state.stars);
  $("completedTotal").textContent=fmt(state.completed);
  message("Three rifts restored! Your maths powered a new constellation.",4);
  updateHUD();tone(1100,.5);
}
function doPulse(){
  if(state.mode!=="playing"||state.pulseCooldown>0)return;
  state.pulseTime=.65;state.pulseCooldown=4;
  for(const hz of state.hazards){
    const p=hazardPos(hz);
    if(Math.hypot((p.x-state.x)*w,(p.y-state.y)*h)<220){
      hz.stun=3.5;sparksAt(p.x*w,p.y*h,"#78fcfd",12);
    }
  }
  tone(270,.3,"sawtooth");
  message("Pulse wave! Nearby drones are disabled for a few seconds.",2.5);
  updateHUD();
}
function doDash(){
  if(state.mode!=="playing"||state.dashCooldown>0)return;
  state.dashTime=.34;state.dashCooldown=3;
  const v=movementAxis();
  const mag=Math.hypot(v.x,v.y);
  const dx=mag>.12?v.x/mag:Math.cos(state.facing);
  const dy=mag>.12?v.y/mag:Math.sin(state.facing);
  state.vx=dx*820;state.vy=dy*820;state.invulnerable=Math.max(state.invulnerable,.38);
  sparksAt(state.x*w,state.y*h,"#ffca6c",14);tone(420,.2);
  updateHUD();
}
function hazardPos(hz){
  const t=state.t*hz.spd+hz.phase;
  return {x:hz.cx+Math.sin(t)*hz.rx,y:hz.cy+Math.cos(t*1.14)*hz.ry};
}
function movementAxis(){
  let x=Number(keys.has("ArrowRight")||keys.has("d")||held.has("right"))
        -Number(keys.has("ArrowLeft")||keys.has("a")||held.has("left"));
  let y=Number(keys.has("ArrowDown")||keys.has("s")||held.has("down"))
        -Number(keys.has("ArrowUp")||keys.has("w")||held.has("up"));
  if(state.pad){x+=state.pad.x;y+=state.pad.y;}
  const gp=Array.from(navigator.getGamepads?.()||[]).find(g=>g&&g.connected);
  if(gp&&Math.abs(gp.axes[0]||0)>.16)x+=gp.axes[0];
  if(gp&&Math.abs(gp.axes[1]||0)>.16)y+=gp.axes[1];
  if(state.aim&&Math.abs(x)+Math.abs(y)<.1){
    const dx=(state.aim.x-state.x)*w,dy=(state.aim.y-state.y)*h;
    if(Math.hypot(dx,dy)>22){x=dx/100;y=dy/100;}
    else state.aim=null;
  }
  const mag=Math.hypot(x,y);
  return mag>1?{x:x/mag,y:y/mag}:{x,y};
}
let prevButtons=[false,false];
function update(dt){
  if(state.mode!=="playing")return;
  state.t+=dt;
  state.invulnerable=Math.max(0,state.invulnerable-dt);
  state.pickupCooldown=Math.max(0,state.pickupCooldown-dt);
  state.pulseCooldown=Math.max(0,state.pulseCooldown-dt);
  state.dashCooldown=Math.max(0,state.dashCooldown-dt);
  state.pulseTime=Math.max(0,state.pulseTime-dt);
  state.dashTime=Math.max(0,state.dashTime-dt);
  state.flash=Math.max(0,state.flash-dt);
  if(state.messageUntil<state.t) $("message").hidden=true;
  for(const hz of state.hazards)hz.stun=Math.max(0,hz.stun-dt);
  const axis=movementAxis(), drag=state.dashTime>0?1:Math.exp(-6*dt);
  if(state.dashTime<=0){
    state.vx=state.vx*drag+axis.x*385*(1-drag);
    state.vy=state.vy*drag+axis.y*385*(1-drag);
  }
  if(Math.hypot(state.vx,state.vy)>25)state.facing=Math.atan2(state.vy,state.vx);
  state.x=clamp(state.x+state.vx*dt/w,.045,.95);
  state.y=clamp(state.y+state.vy*dt/h,.22,.83);
  if(state.x===.045||state.x===.95)state.vx=0;
  if(state.y===.22||state.y===.83)state.vy=0;
  if(state.dashTime>0) sparksAt(state.x*w,state.y*h,"#7cdafa",2);
  const dist=obj=>Math.hypot((obj.x-state.x)*w,(obj.y-state.y)*h);
  for(const orb of state.starsInWorld){
    if(!orb.taken&&dist(orb)<33){
      orb.taken=true;state.stars+=5;
      sparksAt(orb.x*w,orb.y*h,"#ffde7b",8);tone(740,.12);
      updateHUD();
    }
  }
  if(state.pickupCooldown<=0){
    for(const option of state.options){
      const p={x:option.x,y:option.y+.02*Math.sin(state.t*1.35+option.phase)};
      if(dist(p)<42){answerCrystal(option);break;}
    }
  }
  for(const hz of state.hazards) {
    const p=hazardPos(hz);
    if(hz.stun<=0&&state.invulnerable<=0&&state.dashTime<=0&&dist(p)<38){
      state.shield=Math.max(0,state.shield-1);state.invulnerable=1.6;state.flash=.4;
      sparksAt(state.x*w,state.y*h,"#ff708e",24);tone(150,.22,"sawtooth");
      if(state.shield===0){
        state.shield=3;state.x=.13;state.y=.69;state.vx=0;state.vy=0;
        message("Your ship was repaired. Have another go — keep using Pulse and Dash!",4);
      }else message("Drone bump! You have "+state.shield+" shields left. Try Pulse to disable it.",3);
      updateHUD();
    }
  }
  for(let i=state.sparks.length-1;i>=0;i--){
    const p=state.sparks[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.age+=dt;
    if(p.age>=p.ttl)state.sparks.splice(i,1);
  }
  const gp=Array.from(navigator.getGamepads?.()||[]).find(g=>g&&g.connected);
  const now=[Boolean(gp?.buttons?.[0]?.pressed),Boolean(gp?.buttons?.[1]?.pressed)];
  if(now[0]&&!prevButtons[0])doPulse();
  if(now[1]&&!prevButtons[1])doDash();
  prevButtons=now;
  // Keep cooldown labels responsive without producing new DOM on every frame.
  if(Math.floor(state.t*6)!==Math.floor((state.t-dt)*6))updateHUD();
}
function resize(){
  const box=canvas.getBoundingClientRect();
  w=Math.max(280,box.width);h=Math.max(310,box.height);
  pixelRatio=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.floor(w*pixelRatio);
  canvas.height=Math.floor(h*pixelRatio);
}
function circle(x,y,r,color,shadow=0){
  ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,TAU);
  ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=shadow;ctx.fill();ctx.restore();
}
function background(){
  const grad=ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,"#061732");grad.addColorStop(.45,"#19143c");grad.addColorStop(1,"#092244");
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  const n=ctx.createRadialGradient(w*.65,h*.28,2,w*.65,h*.28,w*.50);
  n.addColorStop(0,"#7b47dc49");n.addColorStop(.56,"#3c70cb22");n.addColorStop(1,"#06162c00");
  ctx.fillStyle=n;ctx.fillRect(0,0,w,h);
  ctx.save();
  for(let i=0;i<98;i++){
    const x=((i*119.7+(motion?state.t*12*(i%3+1):0))%(w+40)+w+40)%(w+40);
    const y=(i*71.31)%(h*.86);
    ctx.globalAlpha=.35+(i%5)*.11;
    circle(x,y,(i%7===0?1.9:.9),"#c6e9ff");
  }
  ctx.restore();
  ctx.save();ctx.strokeStyle="#3fdde52d";ctx.lineWidth=1;
  for(let i=0;i<13;i++){
    ctx.beginPath();ctx.moveTo(w*.5,h*.87);ctx.lineTo(w*i/12,h);ctx.stroke();
  }
  for(let i=0;i<7;i++){
    const y=h*(.86+.14*i*i/36);
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
  }
  ctx.restore();
  const planet=ctx.createRadialGradient(w*.88,h*.2,4,w*.88,h*.2,85);
  planet.addColorStop(0,"#d5f5fe");planet.addColorStop(.3,"#73baff");planet.addColorStop(.8,"#27457c");planet.addColorStop(1,"#10254700");
  circle(w*.88,h*.2,84,planet);
}
function drawCrystal(opt){
  const yy=(opt.y+.02*Math.sin(state.t*1.35+opt.phase))*h;
  const x=opt.x*w, size=26+Math.min(8,w/70),flash=opt.wrongUntil>state.t;
  ctx.save();ctx.translate(x,yy);
  ctx.shadowColor=flash?"#ff466a":"#4fffe0";ctx.shadowBlur=flash?32:25;
  ctx.rotate(motion?Math.sin(state.t+opt.phase)*.12:0);
  ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.78,-size*.3);
  ctx.lineTo(size*.66,size*.55);ctx.lineTo(0,size);
  ctx.lineTo(-size*.72,size*.55);ctx.lineTo(-size*.78,-size*.3);ctx.closePath();
  const g=ctx.createLinearGradient(-size,-size,size,size);
  g.addColorStop(0,"#f5ffff");g.addColorStop(.28,flash?"#ff658a":"#64f9e8");
  g.addColorStop(1,"#2967b3");ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle="#dbffff";ctx.lineWidth=2;ctx.stroke();ctx.shadowBlur=0;
  ctx.rotate(motion?-Math.sin(state.t+opt.phase)*.12:0);
  ctx.fillStyle="#031d37";ctx.font="900 "+clamp(w*.023,17,25)+"px system-ui";
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(fmt(opt.value),0,0,78);
  ctx.restore();
}
function drawHazard(hz){
  const p=hazardPos(hz),x=p.x*w,y=p.y*h,stunned=hz.stun>0;
  ctx.save();ctx.translate(x,y);ctx.rotate(state.t*(stunned?.15:1.2)+hz.phase);
  ctx.shadowColor=stunned?"#5bfcfc":"#ff729d";ctx.shadowBlur=stunned?10:20;
  for(let i=0;i<4;i++){
    ctx.rotate(TAU/4);ctx.fillStyle=stunned?"#409ea9":"#e15580";
    ctx.beginPath();ctx.moveTo(-9,-7);ctx.lineTo(0,-29);ctx.lineTo(9,-7);ctx.fill();
  }
  circle(0,0,17,stunned?"#79f7fb":"#f9a1b9",12);
  circle(0,0,8,"#1e2949");
  ctx.restore();
}
function drawShip(){
  const x=state.x*w,y=state.y*h,s=Math.max(19,Math.min(31,w*.032));
  ctx.save();ctx.translate(x,y);ctx.rotate(state.facing);
  if(state.invulnerable>0&&Math.floor(state.t*10)%2===0)ctx.globalAlpha=.58;
  if(state.dashTime>0){
    ctx.strokeStyle="#a4faff";ctx.lineWidth=3;
    for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(-s*(1.2+j*.5),-s*.6);ctx.lineTo(-s*(2+j*.5),0);ctx.stroke();}
  }
  ctx.shadowColor="#40f6ec";ctx.shadowBlur=32;
  ctx.fillStyle="#3ddbdc";
  ctx.beginPath();ctx.moveTo(s*1.45,0);ctx.lineTo(-s,-s*.75);
  ctx.lineTo(-s*.52,0);ctx.lineTo(-s,s*.75);ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle="#e7faff";
  ctx.beginPath();ctx.moveTo(s*.98,0);ctx.lineTo(-s*.38,-s*.35);
  ctx.lineTo(-s*.38,s*.35);ctx.closePath();ctx.fill();
  circle(s*.14,0,s*.21,"#31548e");
  const glow=ctx.createRadialGradient(-s*.9,0,0,-s*1.1,0,s*1.3);
  glow.addColorStop(0,"#a6fff9e8");glow.addColorStop(1,"#16ffe900");
  circle(-s*1.1,0,s*1.3,glow);
  ctx.restore();
}
function draw(){
  if(!ctx)return;
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  background();
  if(state.mission&&(state.mode==="playing"||state.mode==="paused"||state.mode==="victory")){
    for(const s of state.starsInWorld)if(!s.taken) {
      const x=s.x*w,y=s.y*h,r=6+(motion?2*Math.sin(state.t*3+x):0);
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);
      ctx.fillStyle="#ffe89b";ctx.shadowBlur=15;ctx.shadowColor="#ffdc75";
      ctx.fillRect(-r*.75,-r*.75,r*1.5,r*1.5);ctx.restore();
    }
    for(const opt of state.options)drawCrystal(opt);
    for(const hz of state.hazards)drawHazard(hz);
    drawShip();
    if(state.pulseTime>0){
      ctx.save();ctx.beginPath();ctx.arc(state.x*w,state.y*h,220*(1-state.pulseTime/.65),0,TAU);
      ctx.strokeStyle="rgba(111,255,237,"+(state.pulseTime/.65)+")";
      ctx.lineWidth=7;ctx.shadowBlur=25;ctx.shadowColor="#5affed";ctx.stroke();ctx.restore();
    }
  }else{
    const cx=w*.48,cy=h*.52;
    const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,h*.45);
    glow.addColorStop(0,"#65f2ef55");glow.addColorStop(1,"#6b3def00");
    circle(cx,cy,h*.45,glow);
    ctx.save();ctx.strokeStyle="#87f7f6b8";ctx.lineWidth=3;
    for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(cx,cy,w*.17+i*18,h*.15+i*13,state.t*.13+i*.5,0,TAU);ctx.stroke();}
    ctx.restore();
    state.x=.37;state.y=.50;state.facing=0;drawShip();
  }
  for(const p of state.sparks){
    ctx.globalAlpha=Math.max(0,1-p.age/p.ttl);
    circle(p.x,p.y,p.r,p.color);
  }
  ctx.globalAlpha=1;
  if(state.flash>0){
    ctx.fillStyle="rgba(255,95,142,"+(state.flash*.18)+")";
    ctx.fillRect(0,0,w,h);
  }
}
function frame(now){
  const dt=lastFrame?clamp((now-lastFrame)/1000,0,.045):0;
  lastFrame=now;
  if(state.mode==="playing")update(dt);
  else if(state.mode==="intro"&&motion)state.t+=dt*.55;
  draw();
  requestAnimationFrame(frame);
}
function pause(){
  if(state.mode==="playing"){state.mode="paused";$("paused").hidden=false;keys.clear();held.clear();state.aim=null;}
  else if(state.mode==="paused"){state.mode="playing";$("paused").hidden=true;canvas.focus({preventScroll:true});}
  updateHUD();
}
function selectYear(value){
  if(!data.stages.includes(value))return;
  year=value;
  try{localStorage.setItem("speedy-rescue-year",year);}catch{}
  $("year").value=year;
  if(state.mode==="playing"||state.mode==="paused"){
    state.mode="intro";$("intro").hidden=false;$("paused").hidden=true;
    $("victory").hidden=true;state.aim=null;keys.clear();held.clear();
  }
  $("focus").textContent=data.skills[year];
  updateHUD();
}
function bindDirection(name){
  const button=$(name);
  const start=e=>{e.preventDefault();held.add(name);state.aim=null;button.classList.add("pressed");};
  const end=e=>{if(e)e.preventDefault();held.delete(name);button.classList.remove("pressed");};
  button.addEventListener("pointerdown",start);
  button.addEventListener("pointerup",end);
  button.addEventListener("pointerleave",end);
  button.addEventListener("pointercancel",end);
  button.addEventListener("blur",()=>held.delete(name));
  button.addEventListener("click",e=>{if(e.detail===0){held.add(name);setTimeout(()=>held.delete(name),180);}});
}
for(const k of ["up","down","left","right"])bindDirection(k);
canvas.addEventListener("pointerdown",e=>{
  if(state.mode!=="playing")return;
  canvas.setPointerCapture?.(e.pointerId);
  state.touchId=e.pointerId;state.aim={x:clamp(e.offsetX/w,.04,.95),y:clamp(e.offsetY/h,.22,.83)};
});
canvas.addEventListener("pointermove",e=>{
  if(state.touchId===e.pointerId&&state.mode==="playing")
    state.aim={x:clamp(e.offsetX/w,.04,.95),y:clamp(e.offsetY/h,.22,.83)};
});
canvas.addEventListener("pointerup",e=>{if(state.touchId===e.pointerId)state.touchId=null;});
canvas.addEventListener("pointercancel",()=>{state.touchId=null;state.aim=null;});
document.addEventListener("keydown",e=>{
  if(["SELECT","INPUT","TEXTAREA"].includes(e.target?.tagName))return;
  const k=e.key.toLowerCase();
  if(["arrowup","arrowdown","arrowleft","arrowright"," ","shift"].includes(k))e.preventDefault();
  keys.add(k);keys.add(e.key);
  if(e.repeat)return;
  if(k===" "){doPulse();}
  else if(k==="shift"){doDash();}
  else if(k==="p"||k==="escape"){pause();}
  else if(k==="enter"&&state.mode==="intro"){start();}
});
document.addEventListener("keyup",e=>{keys.delete(e.key.toLowerCase());keys.delete(e.key);});
window.addEventListener("blur",()=>{keys.clear();held.clear();if(state.mode==="playing")pause();});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.mode==="playing")pause();});
$("launch").addEventListener("click",start);
$("replay").addEventListener("click",start);
$("pulse").addEventListener("click",doPulse);
$("dash").addEventListener("click",doDash);
$("pause").addEventListener("click",pause);
$("resume").addEventListener("click",pause);
$("year").addEventListener("change",e=>selectYear(e.target.value));
$("calm").addEventListener("click",()=>{
  motion=!motion;
  $("calm").textContent=motion?"◌ Calm view":"◉ Calm on";
  $("calm").setAttribute("aria-pressed",String(!motion));
});
$("sound").addEventListener("click",()=>{
  sound=!sound;$("sound").textContent=sound?"♫ Sound on":"♫ Sound off";
  $("sound").setAttribute("aria-pressed",String(sound));if(sound)tone(700);
});
$("read").addEventListener("click",()=>{
  if(!state.mission||!window.speechSynthesis)return;
  speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(state.mission.prompt);
  utterance.lang="en-GB";utterance.rate=.88;
  speechSynthesis.speak(utterance);
});
for(const label of data.stages)$("year").add(new Option(label,label));
try {const saved=localStorage.getItem("speedy-rescue-year");
  if(data.stages.includes(saved)&&!new URLSearchParams(location.search).has("stage"))year=saved;
}catch{}
selectYear(year);
$("totalSaved").textContent=fmt(history().completed);
updateHUD();resize();
window.addEventListener("resize",resize,{passive:true});
requestAnimationFrame(frame);
window.SpeedyRescueDiagnostics=Object.freeze({
  mode:()=>state.mode,
  year:()=>year,
  position:()=>({x:state.x,y:state.y}),
  options:()=>state.options.map(v=>({x:v.x,y:v.y,value:v.value})),
  mission:()=>state.mission?{prompt:state.mission.prompt,answer:state.mission.answer}:null,
  progress:()=>state.level,
  shield:()=>state.shield,
  stars:()=>state.stars,
  pulseCooldown:()=>state.pulseCooldown,
  dashCooldown:()=>state.dashCooldown
});
})();