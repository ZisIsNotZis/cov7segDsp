const assert=require('node:assert/strict');
const D=require('./designer-core.js');
const seven=D.buildLayout({cols:2,rows:3});
assert.equal(seven.segments.find(s=>s.id==='f').x1,0);
assert.equal(seven.segments.find(s=>s.id==='b').x1,1);
assert.equal(seven.segments.find(s=>s.id==='a').y1,0);
assert.equal(seven.segments.find(s=>s.id==='d').y1,1);
assert.equal(D.coverFor(seven,{}).mask,0n);
// Zero is a genuinely uncovered case. Every strictly positive depth covers
// the outer edge, without a drawing-margin dead zone or an epsilon dead zone.
for(const depth of [Number.MIN_VALUE,1e-12,.01,1,49.999999]){
  assert.equal(D.coverFor(seven,{top:depth}).mask,1n);
  assert.equal(D.coverFor(seven,{bottom:depth}).mask,8n);
  assert.equal(D.coverFor(seven,{left:depth}).mask,48n);
  assert.equal(D.coverFor(seven,{right:depth}).mask,6n);
}
assert.equal(D.coverFor(seven,{top:50}).mask,99n);
assert.equal(D.coverFor(seven,{bottom:50}).mask,92n);
const midVertical={id:'m',x1:.5,y1:0,x2:.5,y2:1};
for(const side of ['left','right']){
  assert(D.clipSegment(midVertical,{[side]:49.999999}));
  assert.equal(D.clipSegment(midVertical,{[side]:50}),null);
}
const midHorizontal={id:'m',x1:0,y1:.5,x2:1,y2:.5};
for(const side of ['top','bottom']){
  assert(D.clipSegment(midHorizontal,{[side]:49.999999}));
  assert.equal(D.clipSegment(midHorizontal,{[side]:50}),null);
}
const point={id:'p',x1:.5,y1:.5,x2:.5,y2:.5};
assert(D.clipSegment(point,{}));
assert.equal(D.clipSegment(point,{left:50}),null);
assert.equal(D.clipSegment(midHorizontal,{left:50,right:50}),null);
for(const side of ['left','right','top','bottom'])assert.equal(D.coverFor(seven,{[side]:100}).mask,127n);
const diag={id:'d',x1:0,y1:0,x2:1,y2:1};
assert(D.clipSegment(diag,{left:50}),'A surviving positive-length diagonal still carries a bit');
assert.equal(D.clipSegment(diag,{left:100}),null);
// Unknown-depth sampling must include zero and the exact middle boundary,
// not only offset samples that can miss an inclusive equality transition.
const rule=D.normalizedRules([{sides:['top'],coverKnown:false,thresholds:{top:{correct:50,detect:null}}}])[0];
const masks=new Set(D.scenarios(seven,rule,'correct').covers.map(c=>c.mask));
assert.deepEqual(masks,new Set([0n,1n,99n]));
console.log('Zero-width inclusive boundary verified at 0, any positive depth, 50%, and 100% on every side');
