/* SpeedyLearning original game: NOVA FORGE. All missions are generated in-browser.
 * These are curriculum-inspired England maths skills, not independently mapped standards.
 * No pupil answers, names or progress ever leave the device.
 */
(function(root){
"use strict";
const STAGES=["Reception","Year 1","Year 2","Year 3","Year 4","Year 5","Year 6"];
const SKILLS={
"Reception":"Counting, number bonds and adding small groups",
"Year 1":"Adding and subtracting within 20, number bonds",
"Year 2":"Place value, two-digit arithmetic and equal groups",
"Year 3":"Three-digit arithmetic, multiplication, division and fractions",
"Year 4":"Times tables, four-digit numbers and fractions of quantities",
"Year 5":"Multiplication, division, fractions, percentages and squares",
"Year 6":"Ratio, percentage, algebra and multi-step arithmetic"};
const task=(prompt,answer,skill,tip,method)=>({prompt,answer,skill,tip,method});
const BANK={
"Reception":[
R=>{const a=R(2,6),b=R(2,5);return task(a+" tiny stars glow. "+b+" more appear. How many now?",a+b,"Counting on","Count the first stars, then count on each new one.","numberline")},
R=>{const a=R(6,10),b=R(2,a-3);return task("Your lightship has "+a+" sparks and spends "+b+". How many remain?",a-b,"Taking away","Count backwards or show counters leaving.","tenframe")},
R=>{const a=R(4,7);return task("Fill the power cell: "+a+" + ? = 10",10-a,"Number bonds to 10","Start with ten counters; count the empty spaces.","tenframe")},
R=>{const a=R(2,5);return task("Two glowing wings have "+a+" lights each. How many together?",2*a,"Doubles","Make two matching groups then count the lights.","array")},
R=>{const a=R(5,11);return task("What is one more than "+a+"?",a+1,"Counting forwards","Find the number and take one step forward.","numberline")},
R=>{const a=R(7,14);return task("What is one less than "+a+"?",a-1,"Counting backwards","Find the number and step back.","numberline")}
],
"Year 1":[
R=>{const a=R(8,13),b=R(3,20-a);return task(a+" + "+b+" = ?",a+b,"Addition within 20","Make ten first; then add the remaining ones.","numberline")},
R=>{const a=R(13,20),b=R(3,a-6);return task(a+" − "+b+" = ?",a-b,"Subtraction within 20","Count back in jumps, or subtract to ten.","numberline")},
R=>{const a=R(11,16);return task(a+" + ? = 20",20-a,"Number bonds within 20","Partition twenty into tens and ones.","partwhole")},
R=>{const a=R(3,9);return task("Double "+a+". How many?",a*2,"Doubling","Draw two equal groups.","array")},
R=>{const a=R(4,10);return task("Half of "+(a*2)+" lights are switched off. How many stay on?",a,"Halving","Split the lights into two equal groups.","partwhole")},
R=>{const a=R(2,5),b=R(2,4);return task("Count in "+a+"s: "+(a*b)+", "+(a*(b+1))+", "+(a*(b+2))+", ... what next?",a*(b+3),"Number patterns","Look at the same jump each time.","numberline")}
],
"Year 2":[
R=>{const a=R(24,57),b=R(6,29);return task(a+" + "+b+" = ?",a+b,"Two-digit addition","Partition tens and ones, then recombine.","partition")},
R=>{const a=R(48,89),b=R(12,28);return task(a+" − "+b+" = ?",a-b,"Two-digit subtraction","Subtract tens and ones; exchange if needed.","column")},
R=>{const a=R(3,9),b=[2,5,10][R(0,2)];return task(a+" groups of "+b+" sparks. How many in total?",a*b,"Multiplication with 2, 5 and 10","Draw equal groups or an array.","array")},
R=>{const a=R(3,9),b=[2,5,10][R(0,2)];return task((a*b)+" sparks shared between "+b+" ships. How many each?",a,"Equal sharing","Share counters into the same-sized groups.","array")},
R=>{const a=R(12,25);return task("Half of "+(a*2)+" = ?",a,"Halving numbers","Partition the number into two equal parts.","partwhole")},
R=>{const a=R(3,8);return task("A number has "+a+" tens and 4 ones. What is it?",a*10+4,"Place value","Build tens then add four ones.","partition")}
],
"Year 3":[
R=>{const a=[3,4,8][R(0,2)],b=R(4,12);return task(a+" × "+b+" = ?",a*b,"3, 4 and 8 times tables","Break multiplication into simpler known facts.","array")},
R=>{const a=[3,4,8][R(0,2)],b=R(5,12);return task((a*b)+" ÷ "+a+" = ?",b,"Inverse multiplication and division","Which number times the divisor gives the total?","busstop")},
R=>{const a=R(120,580),b=R(20,210);return task(a+" + "+b+" = ?",a+b,"Adding three-digit numbers","Use place value and exchange carefully.","column")},
R=>{const a=R(460,800),b=R(80,320);return task(a+" − "+b+" = ?",a-b,"Subtracting three-digit numbers","Align hundreds, tens and ones.","column")},
R=>{const d=[2,4,5,10][R(0,3)],a=R(4,15);return task("One part of "+d+" equal parts of "+(a*d)+". How much is one part?",a,"Unit fractions of amounts","Divide by the number of equal parts.","bar")},
R=>{const a=R(3,9);return task((a*100)+" is how many hundreds?",a,"Place value to 1,000","Make hundreds blocks.","partition")}
],
"Year 4":[
R=>{const a=R(7,12),b=R(6,12);return task(a+" × "+b+" = ?",a*b,"Times tables to 12","Partition one factor into smaller facts.","grid")},
R=>{const a=R(7,12),b=R(6,12);return task((a*b)+" ÷ "+a+" = ?",b,"Division facts","Use the related multiplication fact.","busstop")},
R=>{const a=R(1200,4500),b=R(500,2900);return task(a+" + "+b+" = ?",a+b,"Four-digit addition","Line up thousands, hundreds, tens and ones.","column")},
R=>{const a=R(2500,6500),b=R(300,1200);return task(a+" − "+b+" = ?",a-b,"Four-digit subtraction","Exchange place values when needed.","column")},
R=>{const a=R(3,9),b=R(2,6);return task(a+" × "+(b*10)+" = ?",a*b*10,"Multiply by multiples of ten","Multiply the small factors then use place value.","partition")},
R=>{const a=R(3,9);return task("Three quarters of "+(a*4)+" = ?",a*3,"Fractions of a quantity","Find one quarter then take three.","fractions")}
],
"Year 5":[
R=>{const a=R(12,38),b=R(5,16);return task(a+" × "+b+" = ?",a*b,"Two-digit multiplication","Use a grid or long multiplication.","grid")},
R=>{const a=R(4,13),b=R(5,15);return task((a*b*10)+" ÷ "+a+" = ?",b*10,"Division and place value","Divide and check by multiplication.","busstop")},
R=>{const a=R(4,12);return task("25% of "+(a*20)+" = ?",a*5,"Percentages of amounts","25% is one quarter. Divide by four.","bar")},
R=>{const a=R(3,12);return task("Three fifths of "+(a*5)+" = ?",a*3,"Fractions of amounts","Find a fifth, then multiply by three.","fractions")},
R=>{const a=R(9,19);return task("What is "+a+" squared?",a*a,"Square numbers","Imagine an array with equal rows and columns.","array")},
R=>{const a=R(1400,5200),b=R(550,1650);return task(a+" − "+b+" = ?",a-b,"Four-digit subtraction","Estimate first then calculate with columns.","column")}
],
"Year 6":[
R=>{const a=R(4,13);return task("35% of "+(a*20)+" = ?",a*7,"Percentages","35% can be 10% + 10% + 10% + 5%.","bar")},
R=>{const a=R(4,12);return task("Five eighths of "+(a*8)+" = ?",a*5,"Fractions of quantities","Find one eighth then take five parts.","fractions")},
R=>{const a=R(15,34),b=R(12,25);return task(a+" × "+b+" = ?",a*b,"Multi-digit multiplication","Use your classroom grid or long-multiplication method.","grid")},
R=>{const a=R(6,18);return task("Share "+(a*5)+" in the ratio 2:3. What is the first share?",a*2,"Ratio and proportion","Five parts in total; work out one then take two.","bar")},
R=>{const a=R(6,24);return task("If 4n + 7 = "+(4*a+7)+", what is n?",a,"Algebra with unknowns","Undo the addition then the multiplication.","steps")},
R=>{const a=R(3,15),b=R(5,16);return task((a*a)+" + "+(b*b)+" = ?",a*a+b*b,"Squares and arithmetic","Square each number, then add.","steps")},
R=>{const a=R(120,620),b=R(6,19);return task((a*b)+" ÷ "+b+" = ?",a,"Related operations","Multiply and divide by the same number.","busstop")}
]
};
function seedFor(s,n){let h=2166136261;for(const ch of s+":"+n){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0;}
function seeded(seed){let x=seed>>>0;return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function getGameData(stage,round=0){
 if(!STAGES.includes(stage))stage="Year 3";
 const index=Number.isFinite(Number(round))?Math.max(0,Math.floor(Number(round))):0;
 const rng=seeded(seedFor(stage,index)),R=(a,b)=>a+Math.floor(rng()*(b-a+1));
 const item=BANK[stage][index%BANK[stage].length](R),answer=item.answer;
 if(!Number.isInteger(answer)||answer<3||answer>15000)throw Error("Maths mission generator produced invalid answer");
 let first=Math.max(1,Math.min(answer-1,Math.floor(answer*.42)));
 let second=Math.max(1,Math.min(answer-1,Math.floor(answer*.67)));
 if(second===first)second=Math.max(1,Math.min(answer-1,first+1));
 const values=[first,answer-first,second,answer-second];
 while(values.length<9)values.push(R(1,answer-1));
 for(let i=values.length-1;i>0;i--){const j=R(0,i);[values[i],values[j]]=[values[j],values[i]];}
 return {id:stage+":"+index,year:stage,round:index,title:"Rift "+(index+1),
  prompt:item.prompt,answer,skill:item.skill,help:item.tip,method:item.method,
  values,focus:SKILLS[stage]};
}
const api=Object.freeze({stages:STAGES,skills:SKILLS,getGameData});
root.SpeedyArcadeMaths=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
