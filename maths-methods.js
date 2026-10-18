/* Methods are optional representations used in many UK primary classrooms.
   A school's calculation policy and a child's current teaching method take precedence.
   This module never calculates or reveals the answer to the active question. */
(function (root) {
"use strict";
const METHODS = Object.freeze([
  {id:"squared",label:"Squared paper / my own method",hint:"Set out your working in the way your teacher showed you. Use the drawing space or type your steps.",example:"For 14 + 5, you might draw five small jumps from 14, or write 14 + 5 = 19."},
  {id:"numberline",label:"Number line / counting on and back",hint:"Write your starting number. Show each jump and record where you land. For subtraction, jumps can go backwards.",example:"For 13 + 4, start at 13 and hop forward four ones: 14, 15, 16, 17."},
  {id:"tenframe",label:"Ten frames and counters",hint:"Use the two ten frames to show groups, fill a ten and spot number bonds. A dot can be selected or removed.",example:"For 8 + 5, fill eight boxes, then add two more to complete a ten and count the remaining three."},
  {id:"partwhole",label:"Part–whole model",hint:"Label the whole and its two parts. Use the model to understand what is known and what is missing.",example:"If 9 and 6 are parts of a whole, write 9 and 6 in the part boxes and find their whole."},
  {id:"partition",label:"Partitioning / place value",hint:"Separate numbers into place-value parts such as tens and ones. Work with the parts, then recombine.",example:"For 34 + 25: 30 + 20 = 50, 4 + 5 = 9, then 50 + 9 = 59."},
  {id:"column",label:"Column addition, subtraction or multiplication",hint:"Line up place values carefully. Write your carry, exchange or partial products in the empty boxes.",example:"For 143 + 28, put ones under ones and tens under tens. Add each column, exchanging a ten when needed."},
  {id:"grid",label:"Grid / area multiplication",hint:"Split each factor into hundreds, tens and ones. Multiply each pair in the grid, then add the partial products.",example:"For 23 × 14, split into (20 + 3) and (10 + 4). Find 200, 80, 30 and 12; add the parts."},
  {id:"array",label:"Arrays / equal groups",hint:"Use rows and columns to represent equal-sized groups. Count by the group size or link to a known times-table fact.",example:"For 4 × 3, draw four rows of three; you can see four equal groups."},
  {id:"busstop",label:"Short division / bus stop",hint:"Put the divisor outside and the number being divided inside. Write quotient digits above, recording exchanges or remainders.",example:"For 84 ÷ 4, divide eight tens into four groups, then four ones; write the result above."},
  {id:"bar",label:"Bar model / ratio",hint:"Draw or label parts and the whole. This shows the structure of the problem, but you still need to choose a calculation.",example:"If a total of 30 is split into two parts, show one long bar and two smaller sections."},
  {id:"fractions",label:"Fraction strips",hint:"Colour equal parts in two fraction strips. Compare fractions or show equivalent parts.",example:"To compare 1/2 and 2/4, shade one of two parts and two of four parts. The shaded lengths match."},
  {id:"steps",label:"My written steps / reasoning",hint:"Write the calculation in stages. Say what you did and why, using number facts, units and checking.",example:"For a word problem: What is known? Which operation makes sense? What should the units be?"}
]);
const IDS=new Set(METHODS.map(x=>x.id));
function parseExpression(raw) {
 if(typeof raw!=="string"||raw.length>120)return null;
 const q=raw.trim().replace(/,/g,"");
 const m=q.match(/^(-?\d+(?:\.\d+)?)\s*([+−\-×xX*÷/])\s*(-?\d+(?:\.\d+)?)\s*(?:=\s*\??|\?)?\s*$/);
 if(!m)return null;
 const left=Number(m[1]),right=Number(m[3]);
 if(!Number.isFinite(left)||!Number.isFinite(right))return null;
 const op={"+":"+","−":"−","-":"−","×":"×","x":"×","X":"×","*":"×","÷":"÷","/":"÷"}[m[2]];
 return {left,right,operator:op,leftText:m[1],rightText:m[3]};
}
function category(question) {
 const p=parseExpression(question);
 if(p)return {"+":"add","−":"subtract","×":"multiply","÷":"divide"}[p.operator];
 const q=String(question||"").toLowerCase();
 if(/fraction|equivalent|denominator|numerator|\d+\s*\/\s*\d+/.test(q))return "fraction";
 if(/percent|%|proportion|ratio|scale factor/.test(q))return "proportion";
 if(/area|perimeter|measure|volume|length|angle|shape|time|money|mass/.test(q))return "measurement";
 if(/share|divide|divided|groups of|quotient|remainder/.test(q))return "divide";
 if(/multipl|times|lots of|each|product of/.test(q))return "multiply";
 if(/minus|difference|subtract|take away|left over/.test(q))return "subtract";
 if(/plus|sum of|altogether|add|in total/.test(q))return "add";
 return "general";
}
function defaultMethod(question,tag,deck) {
 const cat=category(question);
 const y=String(tag||"")+" "+String(deck||"");
 const early=/Reception|Year 1\b|Years 1–2|Year 2\b/i.test(y),upper=/Year [456]\b|Years 5–6/i.test(y);
 if(cat==="fraction")return "fractions";
 if(cat==="proportion")return "bar";
 if(cat==="multiply")return early?"array":upper?"column":"grid";
 if(cat==="divide")return early?"array":upper?"busstop":"bar";
 if(cat==="add"||cat==="subtract")return early?"numberline":upper?"column":"partition";
 return "squared";
}
function placeValueParts(n){
 if(!Number.isInteger(n)||n<0||n>9999)return [];
 return [...String(n)].map((digit,i,a)=>Number(digit)*10**(a.length-i-1)).filter(v=>v!==0);
}
function gridFactors(question) {
 const p=parseExpression(question);
 if(!p||p.operator!=="×"||![p.left,p.right].every(x=>Number.isInteger(x)&&x>=1&&x<=999))return null;
 return {columns:placeValueParts(p.left),rows:placeValueParts(p.right)};
}
function isMathsCard(card,subject,deck) {
 if(!card||typeof card!=="object")return false;
 if(card.kind==="sum")return true;
 if(subject==="maths")return card.kind==="quiz";
 if(subject==="sats"&&card.kind==="quiz"&&/maths?|arithmetic|reasoning|times tables/i.test(String(deck||"")))return true;
 return false;
}
const api=Object.freeze({methods:METHODS,ids:IDS,parseExpression,category,defaultMethod,placeValueParts,gridFactors,isMathsCard});
root.SpeedyMathsMethods=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
