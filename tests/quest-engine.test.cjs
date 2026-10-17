/* Run with: node --test tests/quest-engine.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../quests/engine.js');
const now=Date.UTC(2026,9,17,12,0,0);
const quests=[
{id:'a',area:'number'},{id:'b',area:'language'},{id:'c',area:'science'},{id:'d',area:'number'}
];
const areas={
number:{subjectKeys:['maths']},
language:{subjectKeys:['spelling']},
science:{subjectKeys:['science']}
};
test('Empty progress is private, stable and contains no user identifier beyond local scope key',()=>{
const k=E.keyFor('Me','sc','FIRST');
assert.equal(k,'["Me","sc","FIRST"]');
assert.deepEqual(E.readStore({},k,quests),{});
assert.deepEqual(E.summary({},quests,now),{explored:0,total:4,due:0,percent:0,explained:0,attempts:0});
});
test('A new learner can record an attempt and return to the same stage',()=>{
const k=E.keyFor('Me','en','Y3');
const stored=E.addReflection({},k,'a','tried',now,quests);
assert.equal(E.readStore(stored,k,quests).a.attempts,1);
assert.equal(E.readStore(stored,k,quests).a.nextAt,now+2*E.DAY);
assert.deepEqual(E.readStore(stored,E.keyFor('Me','wa','PS2'),quests),{});
});
test('Reflecting never marks statutory mastery; self-report only',()=>{
const k=E.keyFor('Me','en','Y3');
let stored=E.addReflection({},k,'b','explained',now,quests);
stored=E.addReflection(stored,k,'b','explained',now+4*E.DAY,quests);
assert.equal(E.readStore(stored,k,quests).b.attempts,2);
assert.equal(E.readStore(stored,k,quests).b.nextAt,now+12*E.DAY);
assert.equal(E.summary(E.readStore(stored,k,quests),quests,now).explained,1);
assert.equal(E.summary(E.readStore(stored,k,quests),quests,now).explored,1);
assert.equal(Object.hasOwn(E.readStore(stored,k,quests).b,'mastered'),false);
});
test('Review due comes before brand-new adventures',()=>{
const k=E.keyFor('Me','en','Y3');
const stored=E.addReflection({},k,'a','help',now-2*E.DAY,quests);
const picks=E.recommendations(E.readStore(stored,k,quests),quests,areas,[],now);
assert.equal(picks[0].id,'a');assert.equal(picks[0].due,true);
});
test('Local weak-subject evidence can prioritise a fresh quest',()=>{
const log=Array.from({length:8},(_,i)=>({s:'spelling',t:now-1000-i,ok:i>5?1:0}));
const ranked=E.recommendations({},quests,areas,log,now);
assert.equal(ranked[0].id,'b');assert.equal(ranked[0].focus,true);
});
test('Unknown quests and unsafe inputs are rejected',()=>{
const k=E.keyFor('Me','en','Y1');
assert.throws(()=>E.addReflection({},k,'missing','tried',now,quests));
assert.throws(()=>E.addReflection({},k,'a','mastered',now,quests));
assert.deepEqual(E.normaliseRecords({'missing':{lastAt:now,attempts:1},'a':{time:now,repeats:1}},quests),{a:{attempts:1,lastAt:now,firstAt:now,nextAt:now+2*E.DAY,mode:'tried'}});
});
test('Legacy v1 completion can be migrated without mixing learning stages',()=>{
const legacy={'en:Y3':{a:{time:now,repeats:2}},'sc:FIRST':{b:{time:now,repeats:1}}};
const newer=E.migrateV1(legacy,quests);
assert.equal(E.readStore(newer,E.keyFor('Me','en','Y3'),quests).a.attempts,2);
assert.equal(E.readStore(newer,E.keyFor('Me','sc','FIRST'),quests).b.attempts,1);
});
