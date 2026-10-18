/* Run: node --test tests/maths-workspace-smoke.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const M=require('../maths-methods.js');
const source=fs.readFileSync(path.join(__dirname,'..','maths-workspace.js'),'utf8');

class Node {
 constructor(tag='div'){
  this.tagName=tag;this.children=[];this.events={};this.hidden=false;this.value='';this.textContent='';
  this.attrs={};this.width=400;this.height=225;this.style={setProperty(){}};
  this.classList={add(){},remove(){},toggle(){}};
 }
 appendChild(x){this.children.push(x);return x}
 append(...xs){this.children.push(...xs)}
 replaceChildren(...xs){this.children=[...xs]}
 add(x){this.appendChild(x)}
 click(){this.clicked=true}
 addEventListener(n,fn){this.events[n]=fn}
 setAttribute(k,v){this.attrs[k]=v}
 getAttribute(k){return this.attrs[k]}
 querySelectorAll(tag){
  const found=[];
  for(const c of this.children){
   if(c.tagName===tag)found.push(c);
   if(typeof c.querySelectorAll==='function')found.push(...c.querySelectorAll(tag));
  }
  return found;
 }
 querySelector(tag){return this.querySelectorAll(tag)[0]||null}
 getContext(){
  return {setTransform(){},clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}};
 }
 getBoundingClientRect(){return {width:320,height:225,left:0,top:0}}
 setPointerCapture(){}
 scrollIntoView(){this.scrolled=true}
 focus(){this.focused=true}
 toBlob(cb){cb({size:1200})}
}
function mount(){
 const ids=['mathsWorkbench','mwToggle','mwContent','mwMethod','mwHint',
 'mwExample','mwExampleButton','mwStructure','mwNotes','mwCanvas','mwUndo',
 'mwClear','mwDownload','mwSavePicture','mwToAnswer','mwStatus','spellIn','spellForm','opts'];
 const nodes=Object.fromEntries(ids.map(id=>[id,new Node(id==='mwCanvas'?'canvas':'div')]));
 nodes.mwContent.hidden=true;
 nodes.spellForm.hidden=false;nodes.opts.hidden=true;
 const document={getElementById:id=>nodes[id],createElement:tag=>new Node(tag)};
 const storage=new Map();
 const localStorage={
  getItem:key=>storage.get(key)??null,
  setItem:(key,value)=>storage.set(key,String(value))
 };
 const window={SpeedyMathsMethods:M,devicePixelRatio:1,addEventListener(){}};
 function Option(label,value){const opt=new Node('option');opt.label=label;opt.value=value;return opt}
 const URL={createObjectURL:()=>'/unit-test-file',revokeObjectURL(){}};
 const Blob=function(){};
 (new Function('window','document','localStorage','Option','requestAnimationFrame',
    'Blob','URL','setTimeout',source))(
  window,document,localStorage,Option,fn=>fn(),Blob,URL,()=>{}
 );
 return {api:window.SpeedyMathsWorkspace,nodes,storage};
}
test('12 named classroom methods render for ordinary Maths without errors',()=>{
 const {api,nodes}=mount();
 assert.ok(api);
 api.show({card:{kind:'sum',question:'48 + 27',tag:'Maths · Year 3'},subject:'maths',deckName:'Year 3'});
 assert.equal(nodes.mathsWorkbench.hidden,false);
 assert.equal(nodes.mwContent.hidden,false);
 for(const method of M.methods){
  nodes.mwMethod.value=method.id;nodes.mwMethod.events.change();
  assert.ok(nodes.mwStructure.children.length>0,method.id);
 }
});
test('working opens/closes and leads back to the normal final answer input',()=>{
 const {api,nodes}=mount();
 api.show({card:{kind:'sum',question:'143 − 27',tag:'Maths · Year 5'},subject:'maths',deckName:'Year 5'});
 nodes.mwToggle.events.click();assert.equal(nodes.mwContent.hidden,true);
 nodes.mwToggle.events.click();assert.equal(nodes.mwContent.hidden,false);
 nodes.mwToAnswer.events.click();assert.equal(nodes.spellIn.scrolled,true);assert.equal(nodes.spellIn.focused,true);
});
test('children can safely erase, save drawings and keep spell/reading screens unmodified',()=>{
 const {api,nodes}=mount();
 api.show({card:{kind:'sum',question:'23 × 14',tag:'Maths · Year 5'},subject:'maths',deckName:'Year 5'});
 const touch={clientX:23,clientY:34,pointerId:1,pointerType:'touch',preventDefault(){}};
 nodes.mwCanvas.events.pointerdown(touch);nodes.mwCanvas.events.pointermove(touch);nodes.mwCanvas.events.pointerup();
 nodes.mwUndo.events.click();
 nodes.mwClear.events.click();assert.equal(nodes.mwClear.textContent,'Confirm clear drawing');
 nodes.mwClear.events.click();assert.equal(nodes.mwClear.textContent,'Clear drawing');
 assert.doesNotThrow(()=>nodes.mwSavePicture.events.click());
 api.show({card:{kind:'quiz',question:'What word is a verb?'},subject:'sats',deckName:'Reading'});
 assert.equal(nodes.mathsWorkbench.hidden,true);
 api.newDeck();assert.equal(nodes.mathsWorkbench.hidden,true);
});
test('timed maths has an optional collapsed working area',()=>{
 const {api,nodes}=mount();
 api.show({card:{kind:'sum',question:'72 ÷ 8',tag:'Year 6',timer:6},subject:'sats',deckName:'Arithmetic'});
 assert.equal(nodes.mathsWorkbench.hidden,false);
 assert.equal(nodes.mwContent.hidden,true);
 nodes.mwToggle.events.click();
 assert.equal(nodes.mwContent.hidden,false);
});
