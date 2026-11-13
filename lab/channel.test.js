const assert=require('node:assert/strict');
const S=require('./channel.js'),C=require('./catalog.js');
const L=C.layouts.seven;
const standard=C.fontsFor('seven','decimal').find(f=>f.id==='standard').glyphs;
const opt=C.fontsFor('seven','decimal').find(f=>f.id==='opt-dec').glyphs;
assert.equal(S.analyze(L,standard,{covers:Object.values(L.covers)}).totalPairs,7);
assert.equal(S.analyze(L,opt,{covers:Object.values(L.covers)}).ok,true);
assert.equal(S.analyze(L,standard,{covers:[L.covers.left,L.covers.right]}).totalPairs,6);
for(const k of ['seven','cell-x11','split-x15']){
  const l=C.layouts[k],f=C.fontsFor(k,'hex').find(f=>f.id==='hamming');
  const covers=k==='seven'?[0]:[l.covers.left,l.covers.right];
  assert(S.analyze(l,f.glyphs,{covers,fault:'flip',budget:1}).ok,k);
}
assert(!S.analyze(L,opt,{covers:[6,48],fault:'off',budget:1}).ok);
const split=C.layouts['split-x15'];
const protectedFont=C.fontsFor('split-x15','hex').find(f=>f.id==='protected-hamming');
assert(S.analyze(split,protectedFont.glyphs,{covers:[1,6,8,48,54,63],fault:'flip',budget:1}).ok);
// Independently enumerate physical faulty subsets, including no-op failures.
function brute(p,c,n,k,mode){
  const result=new Set();
  for(let f=0;f<(1<<n);f++)if(S.popcount(f)<=k){
    const y=mode==='off'?p&~f:mode==='on'?p|f:p^f;
    result.add(y&~c);
  }
  return result;
}
for(let n=1;n<=5;n++)for(const mode of ['off','on','flip'])for(let k=0;k<=2;k++){
  const l={segments:Array(n).fill({})}, full=(1<<n)-1;
  for(let p=0;p<=full;p++)for(const c of [0,1,full]){
    const opts=S.normalize(l,{covers:[c],budget:k,fault:mode});
    assert.deepEqual(new Set(S.observations(p,c,opts).map(o=>o.observation)),brute(p,c,n,k,mode));
  }
  for(const known of [true,false])for(const goal of ['correct','detect']){
    const glyphs={A:0,B:full,C:Math.floor(full/2)},covers=[0,1,full];
    const got=S.analyze(l,glyphs,{covers,budget:k,fault:mode,coverKnown:known,goal});
    const pairs=[];const entries=Object.entries(glyphs);
    for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
      let bad=false;
      for(const ca of covers)for(const cb of covers){
        if(known&&ca!==cb)continue;
        const a=brute(entries[i][1],ca,n,k,mode),b=brute(entries[j][1],cb,n,k,mode);
        if(goal==='correct')bad ||= [...a].some(x=>b.has(x));
        else bad ||= a.has(entries[j][1]&~cb)||b.has(entries[i][1]&~ca);
      }
      if(bad)pairs.push([entries[i][0],entries[j][0]]);
    }
    assert.equal(got.totalPairs,pairs.length);
    for(const w of got.conflicts){
      assert(brute(glyphs[w.a],w.coverA,n,k,mode).has(w.observation));
      assert(brute(glyphs[w.b],w.coverB,n,k,mode).has(w.observation));
      if(goal==='detect')assert(w.faultA===0||w.faultB===0);
    }
  }
}
// Larger alphabets are honest code demos, not disguised standard fonts.
for(const layout of Object.keys(C.layouts))for(const charset of Object.keys(C.charsets)){
  for(const font of C.fontsFor(layout,charset)){
    assert.equal(Object.keys(font.glyphs).length,C.charsets[charset].labels.length);
    for(const p of Object.values(font.glyphs))assert(p>=0 && p<(1<<C.layouts[layout].segments.length));
    S.analyze(C.layouts[layout],font.glyphs,{covers:[0],budget:0});
  }
}
console.log('channel tests passed: observation enumeration, detection/correction, witnesses, Hamming constructions, catalog');

// Differential check against the independently implemented Python research model.
const fs=require('node:fs'),path=require('node:path');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../foundation/results/channels.json'),'utf8'));
require('./research.js');
assert.equal(globalThis.SignalResearch.rows.length,data.cases.length);
data.cases.forEach((c,i)=>assert.equal(globalThis.SignalResearch.rows[i].value,c.capacity.value,'Regenerate browser research data'));
const masks=mode=>({none:[0],lr:[48,6],lrt:[48,6,1],all:[1,6,8,48],'both-lr':[54],'all-simultaneous':[63]})[mode];
for(const row of data.cases){
  const options={covers:masks(row.covers),fault:row.fault,budget:row.budget,coverKnown:row.cover_known,goal:row.task==='detection'?'detect':'correct'};
  for(const [key,glyphs]of [['standard-dec',standard],['opt-dec',opt]]){
    assert.equal(S.analyze(L,glyphs,options).totalPairs,row.fonts[key].conflict_count,JSON.stringify(options));
  }
  const cap=row.capacity;
  assert(S.analyze(L,Object.fromEntries(cap.patterns.map((p,i)=>[String(i),p])),options).ok,'invalid capacity witness');
  if(cap.status==='exact')assert.equal(cap.patterns.length,cap.value);
}
for(const [id,layout]of Object.entries(data.layouts)){
  assert.equal(C.layouts[id].segments.length,layout.n_segments,id);
  assert.deepEqual(C.layouts[id].covers,layout.covers,id);
}
console.log('Python / JavaScript agree on all '+data.cases.length+' published cases and capacity witnesses');
