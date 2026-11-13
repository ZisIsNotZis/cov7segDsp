const assert=require('node:assert/strict');
require('./data.js');require('./core.js');require('./expectations.js');
const D=require('./designer-core.js');
const C=require('./channel.js');
const seven=D.buildLayout({cols:2,rows:3,orthogonal:true,diagonals:'none'});
const thresholds=Object.fromEntries(['top','right','bottom','left'].map(s=>[s,{correct:10,detect:null}]));
const rule={id:'four',sides:Object.keys(thresholds),thresholds,mode:'either',budget:0,fault:'off',coverKnown:true};
assert.deepEqual(rule.sides.map(s=>Number(D.coverFor(seven,{[s]:10}).mask)),[1,6,8,48]);

// A clipped diagonal keeps its bit until the entire stroke disappears.
const diag={id:'d',x1:0,y1:0,x2:1,y2:1};
const c=D.clipSegment(diag,{left:25,bottom:25});
assert.equal(c.x1,.25);assert.equal(c.y1,.25);assert.equal(c.x2,.75);assert.equal(c.y2,.75);
assert.equal(D.clipSegment(diag,{left:80,right:30}),null);
const big={segments:Array.from({length:65},(_,i)=>({id:'p'+i,x1:.5,y1:.5,x2:.5,y2:.5,enabled:true}))};
assert.equal(D.activeMask(big),(1n<<65n)-1n);
assert(D.analyzeHard(big,{a:1n<<64n,b:0n},[]).ok);
big.segments[64].enabled=false;
assert.equal(D.analyzeHard(big,{a:1n<<64n,b:0n},[]).ok,false);

// Independently enumerate all fault masks, including no-op physical failures.
function physical(p,cover,k,mode){const out=new Set();for(let f=0;f<128;f++)if(C.popcount(f)<=k)out.add((mode==='off'?p&~f:mode==='on'?p|f:p^f)&~cover);return out;}
for(const mode of ['off','on','flip'])for(let k=0;k<=2;k++)for(const goal of ['correct','detect']){
  const r={...rule,fault:mode,budget:k,thresholds:Object.fromEntries(rule.sides.map(s=>[s,{correct:goal==='correct'?10:null,detect:goal==='detect'?10:null}]))};
  for(let p=0;p<128;p+=7)for(let q=1;q<128;q+=11){
    let bad=p===q;
    for(const cover of [1,6,8,48]){const a=physical(p,cover,k,mode),b=physical(q,cover,k,mode);bad ||= goal==='correct'?[...a].some(x=>b.has(x)):a.has(q&~cover)||b.has(p&~cover);}
    const got=D.analyzeHard(seven,{A:BigInt(p),B:BigInt(q)},[r]);
    assert.equal(got.ok,!bad,`${mode}/${k}/${goal}/${p}/${q}`);
    for(const w of got.pairs){
      const budget=w.ruleId==='intact'?0:k;
      assert(physical(p,Number(w.coverA.mask),budget,mode).has(Number(w.observation)));
      assert(physical(q,Number(w.coverB.mask),budget,mode).has(Number(w.observation)));
    }
  }
}
const opt=Object.fromEntries(Object.entries(globalThis.COV.FONTS['opt-dec'].glyphs).map(([l,p])=>[l,BigInt(globalThis.COV.maskOf(p))]));
const legacy=D.analyze(seven,opt,[rule]);
assert.equal(legacy.ok,true);
assert(Math.abs(legacy.meanScore-globalThis.COV.setInfo(globalThis.COV.FONTS['opt-dec']).meanScore)<1e-10,'The original weighted visible/occluded model must remain accessible');
assert(legacy.perGlyph.every(g=>g.metrics.model==='seven-segment-baseline'));
const missing=D.analyze(seven,{'中':3n},[]);
assert.equal(missing.meanScore,null);
assert.equal(missing.perGlyph[0].similarity,null);
const customTarget={A:1n};D.analyze(seven,{A:2n},[],{targets:customTarget});assert.equal(customTarget.A,1n);
const many=Object.fromEntries(Array.from({length:40},(_,i)=>['x'+i,0n]));
const all=D.analyze(seven,many,[]);
assert.equal(all.conflictCount,780);
assert(all.perGlyph.every(g=>g.errors.length===39),'No glyph may disappear behind a witness display limit');

(async()=>{
  const tiny={id:'test',segments:[{id:'x',x1:.2,y1:.2,x2:.2,y2:.8},{id:'y',x1:.8,y1:.2,x2:.8,y2:.8}]};
  const answer=await D.search(tiny,['A','B'],[],{targets:{A:1n,B:1n},budgetMs:500});
  assert.equal(answer.analysis.ok,true);
  assert.notEqual(answer.glyphs.A,answer.glyphs.B);
  assert.equal(D.analyze(tiny,answer.glyphs,[]).ok,true);
  const impossible=await D.search(tiny,['A','B'],[{id:'bad',sides:[],budget:1,fault:'flip',correctEnabled:true}],{budgetMs:200});
  assert.equal(impossible.provedImpossible,true);
  const copy=D.deserialize(D.serialize({layout:seven,glyphs:opt,targets:customTarget,rules:[rule]}));
  assert.equal(copy.glyphs['8'],opt['8']);assert.equal(copy.targets.A,1n);
  console.log('Custom design independently checked: clipping, >32-bit masks, physical-fault oracle, full glyph errors, original model regression, dynamic search, persistence');
})().catch(e=>{console.error(e);process.exitCode=1;});
