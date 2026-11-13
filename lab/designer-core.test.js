'use strict';
const assert=require('node:assert/strict');
require('./expectations.js');
require('./data.js');
const C=require('./core.js'),D=require('./designer-core.js');

const seven=D.buildLayout({cols:2,rows:3}),full=127n;
assert.deepEqual(seven.segments.map(s=>s.id),[...'abcdefg']);
assert.equal(seven.segments.length,7);
assert.equal(D.buildLayout({cols:2,rows:3,diagonals:'both'}).segments.length,11);
const pixels=D.buildLayout({cols:3,rows:3,orthogonal:false,diagonals:'none',points:true});
assert.equal(pixels.segments.length,9);
assert.ok(pixels.segments.every(s=>s.pixel&&s.x1===s.x2&&s.y1===s.y2));
assert.equal(D.activeMask(pixels),511n);
assert.equal(D.coverFor(pixels,{left:10}).mask,73n);
assert.equal(D.renderClip(pixels,{left:10}).length,6);
assert.notEqual(D.seedGlyph(pixels,'.'),0n);
assert.equal(D.analyze(pixels,{x:256n,y:1n},[],{targets:{x:256n,y:1n}}).ok,true);
const mixed=D.buildLayout({cols:2,rows:3,points:true});
assert.equal(mixed.segments.length,13);
assert.equal(mixed.config.points,true);
assert.equal(D.analyze(mixed,{'8':127n},[]).perGlyph[0].metrics.model,'geometry-proxy');
assert.throws(()=>D.buildLayout({cols:12,rows:12,diagonals:'both'}),/128/);
const large=D.buildLayout({cols:6,rows:6,diagonals:'both'});
assert.equal(large.segments.length,110);
const high=(1n<<109n)|(1n<<70n);
assert.equal(D.deserialize(D.serialize({glyphs:{x:high}})).glyphs.x,high);
assert.equal(D.popcount(high),2);
assert.throws(()=>D.popcount(-1n));
assert.equal(D.analyze(large,{x:high,y:1n},[],{metrics:false}).ok,true);

// Actual clipping: a horizontal line survives a partial cover as a shorter
// stroke; it is not erased merely because one endpoint touches a covered side.
const line={id:'line',x1:.1,y1:.4,x2:.9,y2:.4};
const clipped=D.clipSegment(line,{left:30});
assert.ok(Math.abs(clipped.x1-.3)<1e-8);
assert.ok(Math.abs(clipped.x2-.9)<1e-8);
assert.equal(D.clipSegment(line,{left:95}),null);
assert.equal(D.coverFor(seven,{right:10}).mask,6n);
assert.equal(D.coverFor(seven,{left:10}).mask,48n);
assert.equal(D.coverFor(seven,{top:10}).mask,1n);
assert.equal(D.coverFor(seven,{bottom:10}).mask,8n);
assert.equal(D.renderClip(seven,{left:30}).find(s=>s.id==='a').x1,.3);

const original={x:3n,y:12n},hardware=D.buildLayout({cols:2,rows:3});
const litBefore=D.rasterize(hardware,full).reduce((a,b)=>a+b,0);
hardware.segments[0].enabled=false;
assert.equal(D.activeMask(hardware)&1n,0n);
assert.ok(D.rasterize(hardware,full).reduce((a,b)=>a+b,0)<litBefore);
hardware.segments[1].x1=.5;
assert.doesNotThrow(()=>D.rasterize(hardware,full));
const disabledTarget=D.analyze(hardware,{x:0n},[],{targets:{x:1n}}).perGlyph[0];
assert.equal(disabledTarget.metrics.flips,1);
assert.ok(disabledTarget.metrics.score<1);

// Independent physical-fault enumeration checks fast asymmetric-distance
// predicates and witnesses, including budgets beyond the old 0/1/2 limit.
const three={segments:[{id:'a',x1:.1,y1:.2,x2:.9,y2:.2},{id:'b',x1:.1,y1:.5,x2:.9,y2:.5},{id:'c',x1:.1,y1:.8,x2:.9,y2:.8}]};
function observations(p,fault,k){const out=new Set();for(let f=0;f<8;f++)if(D.popcount(BigInt(f))<=k)out.add(fault==='off'?p&~f:fault==='on'?p|f:p^f);return out;}
function intersects(a,b){return [...a].some(x=>b.has(x));}
for(const fault of ['off','on','flip'])for(let k=0;k<=3;k++)for(const goal of ['correct','detect']){
  const rule={id:'f',sides:[],fault,budget:k,correctPct:goal==='correct'?0:null,detectPct:goal==='detect'?0:null};
  for(let p=0;p<8;p++)for(let q=p+1;q<8;q++){
    const a=observations(p,fault,k),b=observations(q,fault,k),bad=goal==='correct'?intersects(a,b):a.has(q)||b.has(p);
    const analysis=D.analyze(three,{p:BigInt(p),q:BigInt(q)},[rule],{metrics:false});
    assert.equal(analysis.ok,!bad,`${fault} k${k} ${goal} ${p}/${q}`);
    for(const w of analysis.pairs){assert.equal((BigInt(p)&~w.coverA.mask)^w.faultA,w.observation);assert.equal((BigInt(q)&~w.coverB.mask)^w.faultB,w.observation);assert.ok(D.popcount(w.faultA)<=k);assert.ok(D.popcount(w.faultB)<=k);}
  }
}

// Direction-specific thresholds and independent detect/correct requirements.
const thresholds={left:{correct:10,detect:55},right:{correct:0,detect:null},top:{correct:null,detect:10}};
const differentiated=D.analyze(seven,{'6':BigInt(C.maskOf(C.STANDARD['6'])),'8':127n},[{id:'r',sides:['left','right','top'],thresholds,budget:0}],{metrics:false});
assert.equal(differentiated.ruleResults.find(r=>r.id==='r'&&r.goal==='correct').covers.length,2);
assert.equal(differentiated.ruleResults.find(r=>r.id==='r'&&r.goal==='detect').covers.length,2);
assert.equal(differentiated.ruleResults.find(r=>r.id==='r'&&r.goal==='correct').covers.find(c=>c.depths.right===0)?.depths.right,0);
const unknown=D.analyze(large,{x:0n,y:high},[{sides:['left','right'],mode:'either',coverKnown:false,correctPct:60,detectPct:null,budget:8,fault:'flip'}],{metrics:false,maxTotalObservations:50});
assert.equal(unknown.exact,false);
assert.notEqual(unknown.ok,true);
const unknownTogether=D.analyze(seven,{x:0n,y:127n},[{sides:['left','top'],mode:'together',coverKnown:false,correctPct:10,detectPct:null,budget:0}],{metrics:false});
assert.equal(unknownTogether.exact,false);

// All participants are reported, not only an early truncated witness list.
const many=Object.fromEntries(Array.from({length:40},(_,i)=>['label'+i,0n]));
const all=D.analyze(seven,many,[]);
assert.equal(all.pairs.length,40*39/2);
assert.ok(all.perGlyph.every(g=>g.errors.length===39&&g.pass===false));
assert.equal(all.meanScore,null);
assert.ok(all.perGlyph.every(g=>g.similarity===null));

// Retain the existing calibrated-model placeholders exactly for classic
// seven-segment geometry; geometry proxy scores are explicitly separate.
const rules=[{id:'four',sides:['top','right','bottom','left'],correctPct:10,detectPct:null,budget:0}];
for(const fontKey of ['standard-dec','opt-dec','doc-dec']){
  const font=C.FONTS[fontKey],glyphs=Object.fromEntries(Object.entries(font.glyphs).map(([l,p])=>[l,BigInt(C.maskOf(p))])),actual=D.analyze(seven,glyphs,rules),expected=C.setInfo(font);
  assert.ok(Math.abs(actual.meanScore-expected.meanScore)<1e-12);
  for(const glyph of actual.perGlyph){const old=expected.glyphs.find(g=>g.label===glyph.label);assert.equal(glyph.metrics.model,'seven-segment-baseline');assert.ok(Math.abs(glyph.metrics.score-old.score)<1e-12);assert.equal(glyph.nearest.unique,old.nearest.unique);assert.equal(glyph.topology.components,old.topology[0]);assert.equal(glyph.topology.holes,old.topology[1]);}
}
const proxy=D.analyze(D.buildLayout({cols:3,rows:3}),{A:0n},[]).perGlyph[0];
assert.equal(proxy.metrics.model,'geometry-proxy');
assert.ok(proxy.metrics.rasterMismatch>0);
assert.ok(proxy.metrics.score<1);

(async()=>{
  const small=D.buildLayout({cols:2,rows:2});
  const targets={x:1n,y:1n}; // Conflict must be solved, rather than returning a preset.
  const found=await D.search(small,['x','y'],[],{targets,budgetMs:1000,weights:{topologyWeight:0,nearestWeight:0,rasterWeight:0}});
  assert.equal(found.analysis.ok,true);
  assert.notEqual(found.glyphs.x,found.glyphs.y);
  assert.ok(found.iterations>1);
  assert.deepEqual(D.analyze(small,found.glyphs,[],{targets}).glyphs,found.analysis.glyphs);
  assert.ok(Math.abs(found.objectivePenalty-found.analysis.perGlyph.reduce((n,g)=>n+g.metrics.penalty,0))<1e-10);
  const scored=await D.search(small,['A','B'],[{sides:['left'],correctPct:10,budget:0}],{budgetMs:80,weights:{lambdaVisible:.6,lambdaOccluded:2,topologyWeight:2,nearestWeight:3}});
  assert.ok(Math.abs(scored.objectivePenalty-scored.analysis.perGlyph.reduce((n,g)=>n+g.metrics.penalty,0))<1e-10,'Search and displayed objective must use the same full score');
  const impossible=await D.search(small,['x','y','z'],[{sides:['left','right','top','bottom'],mode:'together',correctPct:100,detectPct:null}],{targets,budgetMs:50});
  assert.equal(impossible.status,'impossible');
  assert.equal(impossible.provedImpossible,true);
  const controller=new AbortController();controller.abort();
  const cancelled=await D.search(large,['A','B'],[],{budgetMs:500,signal:controller.signal});
  assert.equal(cancelled.status,'cancelled');
  const responsive=await D.search(D.buildLayout({cols:3,rows:3}),[...'0123456789'],rules,{budgetMs:30});
  assert.ok(responsive.elapsedMs<2000,'Budget must cover candidate preparation and yield');
  console.log('designer-core tests passed: geometry, >32-bit masks, independent fault enumeration k0–3, per-rule thresholds, budget honesty, full issue attribution, legacy scoring, live search/cancellation');
})().catch(e=>{console.error(e);process.exitCode=1;});
