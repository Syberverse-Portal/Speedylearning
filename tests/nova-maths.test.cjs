/* node --test tests/nova-maths.test.cjs
 * Pure mission-system regression tests; no external packages required.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Maths=require('../games/maths-data.js');
const dir=path.join(__dirname,'..');
test('7 stages from Reception to Year 6 have 1000 valid mission variants each',()=>{
 assert.deepEqual(Maths.stages,["Reception","Year 1","Year 2","Year 3","Year 4","Year 5","Year 6"]);
 for(const stage of Maths.stages){
  const prompts=new Set();
  for(let round=0;round<1000;round++){
   const m=Maths.getGameData(stage,round);
   prompts.add(m.prompt);
   assert.equal(m.year,stage);
   assert.ok(m.skill.length>3);
   assert.ok(m.help.length>4);
   assert.ok(Number.isInteger(m.answer) && m.answer>=3,m.id);
   assert.equal(m.values.length,9);
   assert.ok(m.values.every(x=>Number.isInteger(x)&&x>=1&&x<m.answer),m.id);
   const pairs=m.values.some((v,i)=>m.values.slice(i+1).some(x=>v+x===m.answer));
   assert.ok(pairs,'There must be at least one constructible answer: '+m.id);
   assert.equal(Maths.getGameData(stage,round).prompt,m.prompt,'Seed must remain deterministic');
  }
  assert.ok(prompts.size>=Math.min(10,Maths.stages.length));
 }
});
test('site menu and seven age routes to real playable arcade exist',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 assert.match(html,/NOVA FORGE · GAMES/);
 assert.match(html,/if \(s === "maths"\) button\("🎮"/);
 assert.match(html,/encodeURIComponent\(name\)/);
 const page=fs.readFileSync(path.join(dir,'games/index.html'),'utf8');
 for(const id of ['world','start','year','forgeControls','shards','ignite','missionLabel',
  'flightControls','up','down','pause','victoryPanel','replay','next','method','work']){
  assert.ok(page.includes('id="'+id+'"'),'Missing '+id);
 }
});
test('game engine, missions and static assets contain no external game service',()=>{
 const engine=fs.readFileSync(path.join(dir,'games/arcade.js'),'utf8');
 assert.doesNotMatch(engine,/\bfetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\/|localStorage\.setItem\(["']child/i);
 assert.match(engine,/getGamepads/);
 assert.match(engine,/aria-pressed/);
 assert.match(engine,/prefers-reduced-motion/);
 assert.match(engine,/requestAnimationFrame\(frameLoop\)/);
 new Function(engine);
 const builder=fs.readFileSync(path.join(dir,'scripts/build-static.mjs'),'utf8');
 const service=fs.readFileSync(path.join(dir,'learning-sw.js'),'utf8');
 for(const file of ['games/index.html','games/arcade.css','games/arcade.js','games/maths-data.js']){
  assert.ok(builder.includes('"'+file+'"'),'Build missing '+file);
  assert.ok(service.includes("'/"+file+"'"),'Offline missing '+file);
 }
});
