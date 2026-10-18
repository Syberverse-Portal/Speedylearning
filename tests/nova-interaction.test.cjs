/* Fast deterministic tests for the actual free-flight version of Nova Forge.
 * This mounts the game in a small fake DOM, with a real animation tick clock.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Maths=require('../games/maths-data.js');
const js=fs.readFileSync(path.join(__dirname,'../games/expedition.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../games/index.html'),'utf8');

class FakeElement {
  constructor(tagName='DIV') {
    this.tagName=tagName;this.children=[];this.handlers={};
    this.hidden=false;this.textContent='';this.value='';this.disabled=false;this.style={};
    this.width=900;this.height=540;this.attrs={};this.classValues=new Set();
    this.classList={
      add:v=>this.classValues.add(v),remove:v=>this.classValues.delete(v),
      contains:v=>this.classValues.has(v)
    };
  }
  addEventListener(type,fn){(this.handlers[type]||=[]).push(fn)}
  dispatch(type,event={}){for(const fn of this.handlers[type]||[])fn(event)}
  click(){if(this.disabled)return;this.dispatch('click',{detail:1,preventDefault(){}})}
  setAttribute(k,v){this.attrs[k]=v}
  getAttribute(k){return this.attrs[k]}
  replaceChildren(...items){this.children.splice(0,this.children.length,...items)}
  appendChild(x){this.children.push(x);return x}
  append(...items){this.children.push(...items)}
  add(o){this.children.push(o)}
  focus(){}
  setPointerCapture(){}
  getBoundingClientRect(){return {width:900,height:540,left:0,top:0}}
  getContext(){
    const ctx={};
    for(const method of ['save','restore','translate','rotate','setTransform','fillRect','strokeRect',
      'beginPath','moveTo','lineTo','closePath','arc','ellipse','fill','stroke','fillText','clearRect'])
      ctx[method]=()=>{};
    ctx.createLinearGradient=ctx.createRadialGradient=()=>({addColorStop(){}});
    return ctx;
  }
}
function mount(stage="Year 3"){
  const elements=new Map();
  for(const item of html.matchAll(/id="([^"]+)"/g))elements.set(item[1],new FakeElement());
  const document=new FakeElement('DOCUMENT');
  document.hidden=false;
  document.getElementById=id=>elements.get(id)||null;
  document.createElement=t=>new FakeElement(t.toUpperCase());
  const localStorage={
    map:new Map(),
    getItem(k){return this.map.get(k)||null},
    setItem(k,v){this.map.set(k,String(v))}
  };
  const navigator={getGamepads:()=>[]};
  const window={
    SpeedyArcadeMaths:Maths,
    matchMedia:()=>({matches:false}),
    devicePixelRatio:1,
    addEventListener(){}
  };
  const location={search:"?stage="+encodeURIComponent(stage)};
  const Option=function(label,value){const e=new FakeElement('OPTION');e.label=label;e.value=value;return e;};
  let queued=null,now=0;
  const requestAnimationFrame=fn=>{queued=fn};
  const tick=(n=1)=>{
    for(let i=0;i<n;i++){
      assert.ok(queued,'animation is live');
      const fn=queued;queued=null;now+=40;fn(now);
    }
  };
  (new Function('window','document','navigator','localStorage','location','Option',
    'requestAnimationFrame',js))(window,document,navigator,localStorage,location,Option,
    requestAnimationFrame);
  return {window,document,elements,localStorage,tick,
    el:id=>elements.get(id),
    key:(type,key)=>document.dispatch(type,{key,target:{tagName:'DIV'},repeat:false,preventDefault(){}})};
}

test('new game is an interactive 2D world at every primary year level',()=>{
  const env=mount('Reception');
  for(const y of Maths.stages){
    env.el('year').value=y;env.el('year').dispatch('change',{target:{value:y}});
    assert.equal(env.window.SpeedyRescueDiagnostics.year(),y);
    env.el('launch').click();
    assert.equal(env.window.SpeedyRescueDiagnostics.mode(),'playing');
    assert.equal(env.window.SpeedyRescueDiagnostics.options().length,4);
    const m=env.window.SpeedyRescueDiagnostics.mission();
    assert.ok(m.prompt.length>10);
    assert.ok(m.answer>=3);
  }
});
test('steering and physical Dash visibly move the spaceship',()=>{
  const env=mount(),game=env.window.SpeedyRescueDiagnostics;
  env.el('launch').click();
  const before=game.position();
  env.key('keydown','ArrowRight');env.tick(6);env.key('keyup','ArrowRight');
  assert.ok(game.position().x>before.x+.05,'Right steering must move the actual ship');
  const y=game.position().y;
  env.key('keydown','ArrowUp');env.tick(4);env.key('keyup','ArrowUp');
  assert.ok(game.position().y<y,'Up steering must move the actual ship');
  env.el('dash').click();
  assert.ok(game.dashCooldown()>0,'Dash activates a real cooldown');
  env.tick(3);
  assert.ok(Math.hypot(game.position().x-before.x,game.position().y-before.y)>.08);
  env.el('pulse').click();
  assert.ok(game.pulseCooldown()>0,'Pulse activates a real shockwave');
});
test('age-specific correct crystals advance three missions into victory',()=>{
  const env=mount('Year 5'),game=env.window.SpeedyRescueDiagnostics;
  env.el('launch').click();
  for(let level=0;level<3;level++){
    env.tick(16);
    const mission=game.mission(),choices=game.options();
    const correct=choices.findIndex(v=>v.value===mission.answer);
    const wrong=choices.findIndex(v=>v.value!==mission.answer);
    assert.ok(correct>=0&&wrong>=0);
    if(level===0){
      env.el('accessibleChoices').children[wrong].click();
      assert.equal(game.progress(),0,'Wrong answer cannot finish a mission');
      env.tick(30);
    }
    env.el('accessibleChoices').children[correct].click();
    if(level<2){
      assert.equal(game.progress(),level+1,'Correct answer opens next physical challenge');
      assert.equal(game.mode(),'playing');
    }
  }
  assert.equal(game.mode(),'victory');
  assert.equal(JSON.parse(env.localStorage.getItem('speedy-rescue-progress|Year 5')).completed,1);
  env.el('replay').click();
  assert.equal(game.mode(),'playing');
  assert.equal(game.progress(),0);
});
test('pause freezes game and resume restores it',()=>{
  const env=mount(),g=env.window.SpeedyRescueDiagnostics;
  env.el('launch').click();
  env.el('pause').click();
  assert.equal(g.mode(),'paused');
  assert.equal(env.el('paused').hidden,false);
  env.el('resume').click();
  assert.equal(g.mode(),'playing');
  assert.equal(env.el('paused').hidden,true);
});
test('visual options are safe and default sound off',()=>{
  const env=mount();
  assert.match(html,/id="sound"[^>]*>♫ Sound off/);
  env.el('sound').click();
  assert.match(env.el('sound').textContent,/on/i);
  env.el('calm').click();
  assert.match(env.el('calm').textContent,/on/i);
});
