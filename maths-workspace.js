/* SpeedyLearning Maths Working Studio.
 * Children can use their school's own layout. No final answers calculated, hints do
 * not reveal the current solution, and workings are never sent to a server.
 * Canvas and notes stay in memory for the current deck, while the preferred method
 * and open/closed choice are saved locally in this browser.
 */
(() => {
"use strict";
const M=window.SpeedyMathsMethods;
const $=id=>document.getElementById(id);
const el=(tag,className,text)=>{
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=String(text);
 return node;
};
if(!M||!$('mathsWorkbench'))return;
const ui={
 panel:$('mathsWorkbench'),toggle:$('mwToggle'),content:$('mwContent'),
 method:$('mwMethod'),hint:$('mwHint'),example:$('mwExample'),
 exampleButton:$('mwExampleButton'),stage:$('mwStructure'),
 notes:$('mwNotes'),canvas:$('mwCanvas'),undo:$('mwUndo'),
 clear:$('mwClear'),download:$('mwDownload'),picture:$('mwSavePicture'),toAnswer:$('mwToAnswer'),status:$('mwStatus')
};
const prefsPrefix='speedy-class-method:';
const readPref=(key)=>{
 try{return localStorage.getItem(key)}catch{return null}
};
const writePref=(key,value)=>{
 try{localStorage.setItem(key,String(value))}catch{}
};
let currentCard=null,current=null,ctx=ui.canvas.getContext('2d'),drawing=false,activeStroke=null;
let deckWork=new WeakMap();
let pencilWidth=3;
for(const entry of M.methods){
 const option=new Option(entry.label,entry.id);
 ui.method.add(option);
}
function newDeck(){
 deckWork=new WeakMap();
 currentCard=null;current=null;
 ui.panel.hidden=true;
}
function getField(key,fallback=''){
 if(!current)return String(fallback);
 const id=current.method+'|'+key;
 return Object.hasOwn(current.fields,id)?current.fields[id]:String(fallback);
}
function setField(key,value){
 if(current)current.fields[current.method+'|'+key]=String(value).slice(0,250);
}
function input(label,key,initial='',limit=80){
 const wrap=el('label');
 wrap.textContent=label;
 const control=el('input');
 control.type='text';
 control.autocomplete='off';
 control.spellcheck=false;
 control.value=getField(key,initial);
 control.maxLength=limit;
 control.setAttribute('aria-label',label);
 control.addEventListener('input',()=>setField(key,control.value));
 wrap.appendChild(control);
 return wrap;
}
function section(title,help){
 const box=el('div','mw-stage');
 const h=el('strong','',title);box.appendChild(h);
 if(help)box.appendChild(el('p','mw-small',help));
 ui.stage.appendChild(box);
 return box;
}
function fieldGrid(parent,fields){
 const grid=el('div','mw-fieldgrid');
 for(const [label,key,value] of fields)grid.appendChild(input(label,key,value));
 parent.appendChild(grid);
 return grid;
}
function simpleNumberline(){
 const p=M.parseExpression(current.card.question);
 const box=section('Number-line jumps','Mark your starting number, then write the landing number after each jump. Use the drawn grid underneath if you want longer jumps.');
 fieldGrid(box,[
  ['Starting number','start',p?p.leftText:''],
  ['Jump size','jump',p?p.rightText:''],
  ['Direction','direction',p&&p.operator==='−'?'back':'forward']
 ]);
 box.appendChild(el('div','mw-numberline'));
 const jumps=el('div','mw-numbersteps');
 for(let k=0;k<8;k++)jumps.appendChild(input('After jump '+(k+1),'landing'+k,'',12));
 box.appendChild(jumps);
}
function tenFrames(){
 const box=section('Counters on ten frames','Tap squares to fill or empty them. Use two frames to find 10, compare groups or show a number bond.');
 const area=el('div','mw-tenframes');
 for(let frame=0;frame<2;frame++){
  const frameWrap=el('div');
  frameWrap.appendChild(el('strong','mw-small','Frame '+(frame+1)));
  const grid=el('div','mw-tenframe');
  for(let n=0;n<10;n++){
   const id='counter-'+frame+'-'+n;
   const button=el('button','mw-counter');
   button.type='button';
   const active=getField(id)==='1';
   button.setAttribute('aria-pressed',String(active));
   button.setAttribute('aria-label','Frame '+(frame+1)+' counter '+(n+1));
   button.onclick=()=>{
    const next=button.getAttribute('aria-pressed')!=='true';
    button.setAttribute('aria-pressed',String(next));setField(id,next?'1':'0');
   };
   grid.appendChild(button);
  }
  frameWrap.appendChild(grid);area.appendChild(frameWrap);
 }
 box.appendChild(area);
}
function partWhole(){
 const box=section('Part–whole drawing','This helps show what the question tells us and what is missing. Fill in whichever numbers you know.');
 const grid=el('div','mw-bars');
 const whole=input('Whole / total','whole');whole.classList.add('mw-whole');
 grid.appendChild(whole);grid.appendChild(input('First part','part1'));grid.appendChild(input('Second part','part2'));
 box.appendChild(grid);
}
function partition(){
 const box=section('Separate into place-value parts','Write the parts underneath the relevant place values. Then add, subtract or combine the parts.');
 const p=M.parseExpression(current.card.question);
 const grid=el('div','mw-fieldgrid');
 for(const name of ['First number','Second number','Thousands','Hundreds','Tens','Ones','Working total']){
  let val='';
  if(name==='First number'&&p)val=p.leftText;
  if(name==='Second number'&&p)val=p.rightText;
  grid.appendChild(input(name,'pv-'+name,val,25));
 }
 box.appendChild(grid);
}
function column(){
 const p=M.parseExpression(current.card.question);
 const box=section('Column layout','Keep ones under ones, tens under tens, and decimal points aligned. Write carry/exchange digits in the top row; use the answer row yourself.');
 if(!p||!['+','−','×'].includes(p.operator)){
  fieldGrid(box,[['First number','first'],['Second number','second'],['Operation (+, −, ×)','symbol']]);
  box.appendChild(el('p','mw-small','This question is written in words or has more than one step. Copy each calculation to the squared paper below.'));
  return;
 }
 const parts=[p.leftText,p.rightText].map(x=>x.split('.'));
 const digits=Math.max(parts[0][0].length,parts[1][0].length)+1;
 const places=Math.max((parts[0][1]||'').length,(parts[1][1]||'').length);
 const length=digits+(places?1+places:0);
 if(length>11){
  box.appendChild(el('p','mw-small','This number is too long for a single row on a phone. Use the squared paper to set it out.'));
  return;
 }
 const aligned=parts.map(part=>
  part[0].padStart(digits,' ')+(places?'.'+(part[1]||'').padEnd(places,' '):'')
 );
 const wrapper=el('div','mw-columnwrap');
 function row(name,value,op,editable,marker){
  const bar=el('div','mw-colrow'+(marker?' mw-answer':''));
  bar.style.setProperty('--mw-places',String(length));
  bar.appendChild(el('span','mw-coltext',op||''));
  for(let i=0;i<length;i++){
   const ch=value?value[i]||' ':' ';
   if(ch==='.' || !editable){
    bar.appendChild(el('span','mw-coltext',ch===' '?' ':ch));
   }else{
    const field=el('input');
    field.type='text';field.inputMode='text';field.maxLength=2;
    field.autocomplete='off';field.value=getField(name+i);
    field.setAttribute('aria-label',name+' at column '+(i+1));
    field.oninput=()=>setField(name+i,field.value);
    bar.appendChild(field);
   }
  }
  wrapper.appendChild(bar);
 }
 box.appendChild(el('p','mw-reading','Carry / exchange | first number | '+p.operator+' second number | your result'));
 row('carry','', '',true,false);
 row('first',aligned[0],'',false,false);
 row('second',aligned[1],p.operator,false,false);
 if(p.operator==='×'&&Math.abs(p.right)>=10){
  row('partial-one','', '',true,false);
  row('partial-two','', '+',true,false);
  box.appendChild(el('p','mw-small','For long multiplication, the middle rows are partial products. Put the total in the result row, or draw your class layout below.'));
 }
 row('result','', '=',true,true);
 box.appendChild(wrapper);
}
function gridMultiply(){
 const box=section('Grid multiplication','Break each factor into place-value parts. Multiply every row by every column, then add the partial products.');
 const factors=M.gridFactors(current.card.question);
 const rows=factors?.rows||['',''],cols=factors?.columns||['',''];
 if(!factors)box.appendChild(el('p','mw-small','Write the two factors as their place-value parts in the blank headings. No example numbers have been inserted into your question.'));
 const table=el('table','mw-grid');
 const headingCell=(value,key,label)=>{
  const th=el('th');
  if(factors)th.textContent=String(value);
  else {
   const field=el('input');field.type='text';field.inputMode='numeric';field.maxLength=16;
   field.value=getField(key);
   field.setAttribute('aria-label',label);
   field.placeholder='?';
   field.oninput=()=>setField(key,field.value);
   th.appendChild(field);
  }
  return th;
 };
 const head=el('tr');head.appendChild(el('th','','×'));
 cols.forEach((c,j)=>head.appendChild(headingCell(c,'col'+j,'First factor: part '+(j+1))));
 table.appendChild(head);
 rows.forEach((rv,ri)=>{
  const tr=el('tr');tr.appendChild(headingCell(rv,'row'+ri,'Second factor: part '+(ri+1)));
  cols.forEach((cv,ci)=>{
   const td=el('td'),field=el('input');
   field.type='text';field.inputMode='numeric';field.maxLength=18;
   field.value=getField('grid'+ri+':'+ci);
   field.setAttribute('aria-label',factors?String(rv)+' times '+String(cv)+' partial product':'Row '+(ri+1)+' times column '+(ci+1)+' partial product');
   field.oninput=()=>setField('grid'+ri+':'+ci,field.value);
   td.appendChild(field);tr.appendChild(td);
  });table.appendChild(tr);
 });
 box.appendChild(table);
}
function arrayModel(){
 const box=section('Arrays and equal groups','Write how many equal groups there are and how many counters each contains. Build the array, then explain the multiplication relationship.');
 const p=M.parseExpression(current.card.question);
 const known=Boolean(p&&p.operator==='×'&&p.left>=1&&p.left<=12&&p.right>=1&&p.right<=12);
 const grid=fieldGrid(box,[
  ['Number of rows / groups','rows',known?p.leftText:''],
  ['Counters in each row','cols',known?p.rightText:'']
 ]);
 const result=el('div');box.appendChild(result);
 const controls=[...grid.querySelectorAll('input')];
 const update=()=>{
  const a=controls[0].value.trim(),b=controls[1].value.trim();
  result.replaceChildren();
  if(!/^\d{1,2}$/.test(a)||!/^\d{1,2}$/.test(b)||Number(a)<1||Number(a)>12||Number(b)<1||Number(b)>12){
   result.appendChild(el('p','mw-small','Enter one to twelve rows and one to twelve counters per row to build your own array.'));
   return;
  }
  const rows=Number(a),cols=Number(b);
  const dots=el('div','mw-array');dots.style.setProperty('--mw-cols',String(cols));
  for(let n=0;n<rows*cols;n++)dots.appendChild(el('span'));
  dots.setAttribute('role','img');
  dots.setAttribute('aria-label',rows+' equal groups with '+cols+' counters in each group');
  result.appendChild(dots);
 };
 for(const control of controls)control.addEventListener('input',update);
 update();
}
function busStop(){
 const box=section('Short division / bus-stop bracket','The divisor sits outside the bracket. Carry any remaining value to the next place. Use the working area for exchanges.');
 const p=M.parseExpression(current.card.question),parts=el('div','mw-busstop');
 const out=input('Divisor','divisor',p&&p.operator==='÷'?p.rightText:'');
 const inside=input('Number to divide','dividend',p&&p.operator==='÷'?p.leftText:'');
 inside.classList.add('mw-dividend');
 parts.appendChild(out);parts.appendChild(inside);box.appendChild(parts);
 fieldGrid(box,[['Quotient (your working)','quotient'],['Remainder, if any','remainder']]);
}
function barModel(){
 const box=section('Bar model','Represent the quantities with a whole bar and parts. It helps you decide which calculation to do, but does not solve it for you.');
 const grid=el('div','mw-bars');
 const top=input('Whole / total','barwhole');top.classList.add('mw-whole');grid.appendChild(top);
 grid.appendChild(input('Part / group 1','barpart1'));grid.appendChild(input('Part / group 2','barpart2'));box.appendChild(grid);
}
function fractionStrips(){
 const box=section('Fraction strips','Shade equal parts to see the structure of fractions. Use different numbers of parts to compare or show equivalence.');
 const chooser=fieldGrid(box,[
  ['Top strip equal parts (2–12)','denom0','2'],
  ['Bottom strip equal parts (2–12)','denom1','4']
 ]);
 const controls=[...chooser.querySelectorAll('input')];
 const area=el('div');box.appendChild(area);
 const build=()=>{
  area.replaceChildren();
  for(let bar=0;bar<2;bar++){
   const parts=Math.max(2,Math.min(12,Math.floor(Number(controls[bar].value)||4)));
   area.appendChild(el('strong','mw-small','Strip '+(bar+1)+' — '+parts+' equal parts'));
   const strip=el('div','mw-fractionparts');strip.style.setProperty('--mw-denom',String(parts));
   for(let n=0;n<parts;n++){
    const key='strip'+bar+':'+parts+':'+n;
    const b=el('button');b.type='button';
    const active=getField(key)==='1';
    b.setAttribute('aria-pressed',String(active));
    b.setAttribute('aria-label','Shade section '+(n+1)+' of '+parts+' on strip '+(bar+1));
    b.onclick=()=>{
     const on=b.getAttribute('aria-pressed')!=='true';
     b.setAttribute('aria-pressed',String(on));setField(key,on?'1':'0');
    };
    strip.appendChild(b);
   }area.appendChild(strip);
  }
 };
 controls.forEach(c=>c.addEventListener('input',build));build();
}
function stepsOnly(){
 section('Your calculation, step by step','Explain each step in the writing box, or draw a diagram in the squared-paper area. There is no single required layout.');
}
const templates={
 numberline:simpleNumberline,tenframe:tenFrames,partwhole:partWhole,partition,column,
 grid:gridMultiply,array:arrayModel,busstop:busStop,bar:barModel,
 fractions:fractionStrips,steps:stepsOnly,squared:stepsOnly
};
function renderTemplate(){
 if(!current)return;
 ui.method.value=current.method;
 const meta=M.methods.find(x=>x.id===current.method)||M.methods[0];
 ui.hint.textContent=meta.hint;
 ui.example.textContent='A different example (not your answer): '+meta.example;
 ui.example.hidden=true;
 ui.exampleButton.setAttribute('aria-expanded','false');
 ui.stage.replaceChildren();
 (templates[current.method]||stepsOnly)();
 drawPaper();
}
function openState(open){
 if(!current)return;
 current.open=Boolean(open);
 ui.content.hidden=!current.open;
 ui.toggle.setAttribute('aria-expanded',String(current.open));
 ui.toggle.textContent=current.open?'Hide working ▴':'✏️ Show my working ▾';
 writePref('speedy-working-open',current.open?'1':'0');
 if(current.open)requestAnimationFrame(drawPaper);
}
function show({card,subject,deckName}){
 const canShow=M.isMathsCard(card,subject,deckName);
 if(!canShow){currentCard=null;current=null;ui.panel.hidden=true;return}
 if(!card||typeof card.question!=='string'){currentCard=null;current=null;ui.panel.hidden=true;return}
 currentCard=card;
 clearArmed=false;ui.clear.textContent='Clear drawing';
 current=deckWork.get(card);
 if(!current){
  const cat=M.category(card.question);
  let method=readPref(prefsPrefix+cat);
  if(!M.ids.has(method))method=M.defaultMethod(card.question,card.tag,deckName);
  const savedOpen=readPref('speedy-working-open');
  current={card,cat,method,fields:{},notes:'',strokes:[],
    open:card.timer?false:savedOpen!=='0'};
  deckWork.set(card,current);
 }
 ui.panel.hidden=false;
 ui.notes.value=current.notes;
 ui.status.textContent=card.timer?'This question is timed. Its timer carries on while you work.':'Your method and drawing stay on this question until you move on; nothing is sent online.';
 renderTemplate();
 // Render without changing the stored open preference when the timed question is closed.
 ui.content.hidden=!current.open;
 ui.toggle.setAttribute('aria-expanded',String(current.open));
 ui.toggle.textContent=current.open?'Hide working ▴':'✏️ Show my working ▾';
 if(current.open)requestAnimationFrame(drawPaper);
}
ui.toggle.addEventListener('click',()=>openState(!current?.open));
ui.method.addEventListener('change',()=>{
 if(!current||!M.ids.has(ui.method.value))return;
 current.method=ui.method.value;
 writePref(prefsPrefix+current.cat,current.method);
 renderTemplate();
});
ui.exampleButton.addEventListener('click',()=>{
 ui.example.hidden=!ui.example.hidden;
 ui.exampleButton.setAttribute('aria-expanded',String(!ui.example.hidden));
});
ui.notes.addEventListener('input',()=>{if(current)current.notes=ui.notes.value.slice(0,5000)});
function paperSize(){
 const rect=ui.canvas.getBoundingClientRect();
 const w=Math.max(220,Math.floor(rect.width||320)),h=225;
 const scale=Math.min(2,window.devicePixelRatio||1);
 if(ui.canvas.width!==Math.round(w*scale)||ui.canvas.height!==Math.round(h*scale)){
  ui.canvas.width=Math.round(w*scale);ui.canvas.height=Math.round(h*scale);
 }
 ctx.setTransform(scale,0,0,scale,0,0);
 return {w,h};
}
function drawPaper(){
 if(!current||ui.content.hidden)return;
 const {w,h}=paperSize();
 ctx.clearRect(0,0,w,h);
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='#d7e6ee';ctx.lineWidth=.7;
 for(let x=0;x<=w;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
 for(let y=0;y<=h;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
 for(const stroke of current.strokes){
  if(!stroke.length)continue;
  ctx.strokeStyle='#174f99';ctx.fillStyle='#174f99';ctx.lineWidth=pencilWidth;
  ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  ctx.moveTo(stroke[0].x*w,stroke[0].y*h);
  if(stroke.length===1){
   ctx.arc(stroke[0].x*w,stroke[0].y*h,pencilWidth/2,0,Math.PI*2);ctx.fill();continue;
  }
  for(let k=1;k<stroke.length;k++)ctx.lineTo(stroke[k].x*w,stroke[k].y*h);
  ctx.stroke();
 }
}
const point=e=>{
 const rect=ui.canvas.getBoundingClientRect();
 return {x:Math.min(1,Math.max(0,(e.clientX-rect.left)/Math.max(1,rect.width))),
 y:Math.min(1,Math.max(0,(e.clientY-rect.top)/Math.max(1,rect.height)))};
};
ui.canvas.addEventListener('pointerdown',e=>{
 if(!current||!current.open||(e.pointerType==='mouse'&&e.button!==0))return;
 e.preventDefault();drawing=true;activeStroke=[point(e)];
 current.strokes.push(activeStroke);
 try{ui.canvas.setPointerCapture(e.pointerId)}catch{}
 drawPaper();
});
ui.canvas.addEventListener('pointermove',e=>{
 if(!drawing||!activeStroke||!current)return;
 e.preventDefault();activeStroke.push(point(e));
 if(activeStroke.length>3000)activeStroke.splice(1,activeStroke.length-3000);
 drawPaper();
});
function finishStroke(){drawing=false;activeStroke=null}
ui.canvas.addEventListener('pointerup',finishStroke);
ui.canvas.addEventListener('pointercancel',finishStroke);
ui.undo.addEventListener('click',()=>{if(current){current.strokes.pop();drawPaper()}});
let clearArmed=false;
ui.clear.addEventListener('click',()=>{
 if(!current)return;
 if(!clearArmed){
  clearArmed=true;ui.clear.textContent='Confirm clear drawing';ui.status.textContent='Press again only if you want to erase all the drawing on this question.';return;
 }
 current.strokes=[];drawPaper();clearArmed=false;ui.clear.textContent='Clear drawing';
 ui.status.textContent='Drawing cleared. Your typed steps and classroom layout are unchanged.';
});
ui.download.addEventListener('click',()=>{
 if(!current)return;
 const inputs=Object.entries(current.fields).filter(([k,v])=>v.trim()).map(([k,v])=>k+': '+v).join('\n');
 const body=['SpeedyLearning — My Maths Working','Question: '+current.card.question,
 'Chosen school method: '+(M.methods.find(x=>x.id===current.method)?.label||current.method),
 '','Steps / explanation:',current.notes||'(No typed notes)','',
 'Layout entries:',inputs||'(No entries)',
 '','Drawing can be saved separately by taking a screenshot.','No data was uploaded.'].join('\n');
 const blob=new Blob([body],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='SpeedyLearning-my-maths-working.txt';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),10000);
});
ui.picture.addEventListener('click',()=>{
 if(!current)return;
 drawPaper();
 ui.canvas.toBlob(blob=>{
  if(!blob){ui.status.textContent='This browser could not save the drawing. You can take a screenshot instead.';return;}
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='SpeedyLearning-maths-working.png';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
 },'image/png');
});
ui.toAnswer.addEventListener('click',()=>{
 const input=document.getElementById('spellIn');
 const form=document.getElementById('spellForm');
 const choices=document.getElementById('opts');
 const target=form&&!form.hidden?input:choices&&!choices.hidden?choices:null;
 if(!target)return;
 target.scrollIntoView({behavior:'smooth',block:'center'});
 if(target===input&&!input.disabled)input.focus({preventScroll:true});
});
window.addEventListener('resize',()=>{if(current?.open)requestAnimationFrame(drawPaper)});
window.SpeedyMathsWorkspace={show,newDeck};
})();
