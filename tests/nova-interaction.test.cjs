/* node --test tests/nova-interaction.test.cjs — console-like arcade DOM tests.
 * No browser or external dependency required.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../games/maths-data.js');
const code=fs.readFileSync(path.join(__dirname,'../games/arcade.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../games/index.html'),'utf8');

class Element{
 constructor(tagName='div'){
  this.tagName=tagName;this.children=[];this.handlers={};this.hidden=false;this.textContent='';
  this.value='';this.disabled=false;this.style={setProperty(){}};this.aria={};this.options=this.children;
  this.classValues=new Set();this.classList={
   add:v=>this.classValues.add(v),remove:v=>this.classValues.delete(v),
   toggle:(v,on)=>{if(on)this.classValues.add(v);else this.classValues.delete(v)},
   contains:v=>this.classValues.has(v)};
  this.width=1100;this.height=620;this.attrs={};
 }
 append(...items){this.children.push(...items)}
 appendChild(x){this.children.push(x);return x}
 replaceChildren(...items){this.children.splice(0,this.children.length,...items)}
 add(o){this.children.push(o)}
 setAttribute(k,v){this.attrs[k]=v}
 getAttribute(k){return this.attrs[k]}
 addEventListener(k,f){(this.handlers[k]||=[]).push(f)}
 fire(k,event={}){for(const f of this.handlers[k]||[])f(event)}
 click(){if(this.disabled)return;this.fire('click',{detail:1,preventDefault(){}})}
 scrollIntoView(){}
 getBoundingClientRect(){return {width:1100,height:620,left:0,top:0}}
 setPointerCapture(){}
 getContext(){
  const ctx={};const methods=['save','restore','translate','rotate','setTransform','fillRect','strokeRect',
   'beginPath','moveTo','lineTo','closePath','arc','ellipse','fill','stroke','fillText','clearRect'];
  for(const method of methods)ctx[method]=()=>{};
  ctx.createLinearGradient=ctx.createRadialGradient=()=>({addColorStop(){}});
  return ctx;
 }
}
function mount(search='?stage=Year%203'){
 const elements=new Map();
 for(const item of html.matchAll(/id="([^"]+)"/g)){elements.set(item[1],new Element(item[1]==='world'?'CANVAS':'DIV'))}
 const dom={
  hidden:false,body:new Element("BODY"),
  getElementById:id=>elements.get(id)||null,
  createElement:tag=>new Element(tag.toUpperCase()),
  addEventListener(){}
 };
 const data={map:new Map(),getItem(k){return this.map.get(k)||null},setItem(k,v){this.map.set(k,String(v))}};
 let queued=null;
 const requestAnimationFrame=fn=>{queued=fn};
 let time=0;
 const pad={connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false}))};
 const navigator={vibrate(){},getGamepads:()=>[pad]};
 const window={SpeedyArcadeMaths:D,matchMedia:()=>({matches:false}),devicePixelRatio:1,
  scrollTo(){},addEventListener(){}};
 const Option=function(label,value){const o=new Element('OPTION');o.label=label;o.value=value;return o};
 const location={search};
 const setTimeout=fn=>{fn();return 1};
 const clearTimeout=()=>{};
 const raf=()=>{const fn=queued;queued=null;time+=40;if(!fn)throw Error('No next frame');fn(time)};
 (new Function('window','document','navigator','localStorage','location','Option',
 'requestAnimationFrame','setTimeout','clearTimeout',code))(window,dom,navigator,data,location,
 Option,requestAnimationFrame,setTimeout,clearTimeout);
 return {window,dom,elements,storage:data,pad,tick:raf};
}
test('all seven year selections open playable, age-specific Maths forge missions',()=>{
 const env=mount();
 for(const year of D.stages){
  const input=env.elements.get('year');input.value=year;input.fire('change');
  assert.equal(env.window.SpeedyNovaDiagnostics.year(),year);
  assert.equal(env.window.SpeedyNovaDiagnostics.currentMode(),'intro');
  env.elements.get('start').click();
  assert.equal(env.window.SpeedyNovaDiagnostics.currentMode(),'forge');
  assert.equal(env.elements.get('shards').children.length,9);
  assert.match(env.elements.get('skill').textContent,new RegExp(year,'i'));
 }
});
test('player solves Maths with a flexible two-crystal route then actually pilots to victory',()=>{
 const env=mount('?stage=Year%205'),g=env.window.SpeedyNovaDiagnostics;
 assert.equal(g.currentMode(),'intro');
 env.elements.get('start').click();
 assert.equal(g.currentMode(),'forge');
 const mission=D.getGameData('Year 5',0);
 const vals=mission.values;
 let pair=null;for(let i=0;i<vals.length;i++)for(let j=i+1;j<vals.length;j++)
  if(vals[i]+vals[j]===mission.answer){pair=[i,j];break}
 assert.ok(pair);
 const crystals=env.elements.get('shards');
 crystals.children[pair[0]].click();
 crystals.children[pair[1]].click();
 assert.equal(g.selectedEnergy(),2);
 assert.match(env.elements.get('forgeFeedback').textContent,/Energy balanced/);
 env.elements.get('ignite').click();
 assert.equal(g.currentMode(),'flight');
 for(let i=0;i<450;i++)env.tick();
 assert.equal(g.currentMode(),'victory');
 assert.equal(g.completed(),1);
 const store=JSON.parse(env.storage.getItem('speedy-nova-v1|Year 5'));
 assert.equal(store.finished,1);
 env.elements.get('next').click();
 assert.equal(g.currentMode(),'forge');
 assert.notEqual(g.mission(),mission.prompt);
});
test('controller D-pad and action button can choose a shard',()=>{
 const env=mount();
 env.elements.get('start').click();
 const btn=env.pad.buttons;
 btn[0].pressed=true;env.tick();btn[0].pressed=false;env.tick();
 assert.equal(env.window.SpeedyNovaDiagnostics.selectedEnergy(),1);
 btn[15].pressed=true;env.tick();btn[15].pressed=false;env.tick();
 btn[0].pressed=true;env.tick();
 assert.equal(env.window.SpeedyNovaDiagnostics.selectedEnergy(),2);
});
test('calm view, contrast, sound and pause are never mandatory',()=>{
 const env=mount();
 env.elements.get('motion').click();
 assert.match(env.elements.get('motion').textContent,/Calm on/);
 env.elements.get('contrast').click();
 assert.equal(env.elements.get('contrast').getAttribute('aria-pressed'),'true');
 env.elements.get('sound').click();
 assert.equal(env.elements.get('sound').getAttribute('aria-pressed'),'true');
});
