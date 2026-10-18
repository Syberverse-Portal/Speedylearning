/* Run: node --test tests/maths-methods.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../maths-methods.js');
test('supports familiar school calculation signs and decimal numbers',()=>{
 const cases=[['48 + 27','+',48,27],['300 − 145','−',300,145],['23 × 14','×',23,14],
 ['84 ÷ 4','÷',84,4],['12.5 x 3','×',12.5,3],['1,234 + 56 = ?','+',1234,56]];
 for(const [q,op,a,b] of cases){const got=M.parseExpression(q);assert.ok(got,q);assert.equal(got.operator,op);assert.equal(got.left,a);assert.equal(got.right,b);}
});
test('does not invent a numeric expression for word problems or fractions',()=>{
 for(const q of ['How many groups of 8 fit in 48?','3/4 + 1/2','I have 5 apples and buy 3 more','3 + ? = 10','',null])assert.equal(M.parseExpression(q),null);
});
test('offers familiar stages without forcing one specific school method',()=>{
 assert.equal(M.defaultMethod('9 + 3','Maths · Reception','Mixed'),'numberline');
 assert.equal(M.defaultMethod('14 × 4','Maths · Year 2','Mixed'),'array');
 assert.equal(M.defaultMethod('32 × 15','Maths · Year 3','Mixed'),'grid');
 assert.equal(M.defaultMethod('324 + 56','Maths · Year 4','Mixed'),'column');
 assert.equal(M.defaultMethod('728 ÷ 8','Maths · Year 5','Mixed'),'busstop');
 assert.equal(M.defaultMethod('What is 3/4 of 120?','Maths · Year 6','Mixed'),'fractions');
});
test('grid multiplication partitions factors but never performs the multiplication',()=>{
 assert.deepEqual(M.placeValueParts(304),[300,4]);
 assert.deepEqual(M.gridFactors('23 × 14'),{columns:[20,3],rows:[10,4]});
 assert.equal(M.gridFactors('1024 × 2'),null);
 assert.equal(M.gridFactors('2 + 5'),null);
});
test('working pad is added to all sum cards including school maths and SATs, not spelling',()=>{
 assert.equal(M.isMathsCard({kind:'sum'},'maths','Year 3'),true);
 assert.equal(M.isMathsCard({kind:'sum'},'sats','Arithmetic'),true);
 assert.equal(M.isMathsCard({kind:'quiz'},'sats','Reasoning Paper 2'),true);
 assert.equal(M.isMathsCard({kind:'quiz'},'sats','Reading'),false);
 assert.equal(M.isMathsCard({kind:'spell'},'spelling','Year 2'),false);
});
test('every named method gives a hint and separate worked example',()=>{
 assert.ok(M.methods.length>=10);
 const ids=new Set();
 for(const method of M.methods){assert.ok(method.label);assert.ok(method.hint);assert.ok(method.example);assert.ok(!ids.has(method.id));ids.add(method.id);}
});
