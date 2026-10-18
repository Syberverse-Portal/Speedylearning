/* Validation of seven-stage Maths missions plus the new *playable* game.
 * No external test dependencies; runs on every GitHub push.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Maths=require('../games/maths-data.js');
const root=path.join(__dirname,'..');

test('all 7 stages have 1,000 valid and repeatable maths question variants',()=>{
 assert.deepEqual(Maths.stages,["Reception","Year 1","Year 2","Year 3","Year 4","Year 5","Year 6"]);
 for(const stage of Maths.stages){
  const prompts=new Set();
  for(let round=0;round<1000;round++){
   const mission=Maths.getGameData(stage,round);
   assert.equal(mission.year,stage);
   assert.ok(mission.skill.length>3&&mission.help.length>4);
   assert.ok(Number.isInteger(mission.answer)&&mission.answer>=3,mission.id);
   assert.ok(mission.values.length===9);
   assert.ok(mission.values.every(x=>Number.isInteger(x)&&x>=1&&x<mission.answer));
   assert.ok(mission.values.some((v,i)=>mission.values.slice(i+1).some(x=>v+x===mission.answer)));
   assert.equal(Maths.getGameData(stage,round).prompt,mission.prompt);
   prompts.add(mission.prompt);
  }
  assert.ok(prompts.size>=20,'Variety missing for '+stage);
 }
});
test('the primary-school website links to the real new game for each school year',()=>{
 const main=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(main,/NOVA FORGE · GAMES/);
 assert.match(main,/if \(s === "maths"\) button\("🎮"/);
 assert.match(main,/encodeURIComponent\(name\)/);
 const page=fs.readFileSync(path.join(root,'games/index.html'),'utf8');
 for(const id of ['world','launch','year','question','skill','shield','starCount',
  'up','down','left','right','pulse','dash','pause','resume','intro','paused','victory',
  'replay','accessibleChoices','read','totalSaved']){
  assert.ok(page.includes('id="'+id+'"'),'Missing working game element '+id);
 }
 assert.match(page,/expedition\.js/);
 assert.match(page,/expedition\.css/);
});
test('free-flight engine runs locally with no identity capture or third-party game requests',()=>{
 const code=fs.readFileSync(path.join(root,'games/expedition.js'),'utf8');
 assert.doesNotMatch(code,/\bfetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\//);
 assert.match(code,/requestAnimationFrame\(frame\)/);
 assert.match(code,/getGamepads/);
 assert.match(code,/pointerdown/);
 assert.match(code,/state\.vx/);
 assert.match(code,/state\.vy/);
 assert.match(code,/hazardPos/);
 assert.match(code,/doPulse/);
 assert.match(code,/doDash/);
 new Function(code);
 const builder=fs.readFileSync(path.join(root,'scripts/build-static.mjs'),'utf8');
 const sw=fs.readFileSync(path.join(root,'learning-sw.js'),'utf8');
 for(const file of ['games/index.html','games/maths-data.js','games/expedition.js','games/expedition.css']){
  assert.ok(builder.includes('"'+file+'"'),'Cloudflare build missing '+file);
  assert.ok(sw.includes("'/"+file+"'"),'Offline cache missing '+file);
 }
});
