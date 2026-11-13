const assert=require('node:assert/strict');
const E=require('./expectations.js');
const C=require('./core.js');
for(const label of '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/−.'){
  assert(E.get(label).known,label);
  assert.equal(E.raster(label,20,28).length,560);
}
for(const label of '0123456789AbCdEF')assert.equal(E.standard7(label),BigInt(C.maskOf(C.STANDARD[label])),label);
assert.notDeepEqual(E.get('A').bitmap,E.get('a').bitmap,'Case-sensitive expectations must stay distinct');
assert.notDeepEqual(E.get('E').bitmap,E.get('e').bitmap);
assert.equal(E.get('中').known,false);
assert.equal(E.raster('中'),null,'Missing references must not be silently scored as perfect');
require('./archive-data.js');
const a=globalThis.SignalArchive;
assert.equal(a.seven.global_total,364825664064);
for(const f of a.fonts){
  let flips=0,score=0;
  for(const [l,s]of Object.entries(f.glyphs)){
    flips+=C.hamming(C.maskOf(s),C.maskOf(C.STANDARD[l]));
    score+=C.glyphScore(C.maskOf(s),C.maskOf(C.STANDARD[l]));
  }
  assert.equal(flips,f.flips,f.id);
  assert(Math.abs(score/Object.keys(f.glyphs).length-f.mean)<1e-10,f.id);
}
assert.equal(a.hexNearest.status,'INFEASIBLE');
assert.equal(a.hexNearest.minimumViolations,1);
console.log('Independent expectations and the original research archive verified');
