/* Custom display design: geometry, exact finite-channel checks, shape evidence,
 * and bounded live search. No DOM, network, preset selection, or 32-bit masks. */
(function(root){
  'use strict';
  const SIDES=['left','right','top','bottom'], EPS=1e-9;
  const bit=i=>1n<<BigInt(i), pop=n=>{n=BigInt(n);if(n<0n)throw Error('掩码须非负');let c=0;while(n){n&=n-1n;c++;}return c;};
  const clamp=n=>Math.max(0,Math.min(100,Number(n)||0));
  function mask(v){if(typeof v==='bigint')return v;if(typeof v==='number'&&Number.isSafeInteger(v)&&v>=0)return BigInt(v);if(typeof v==='string'&&/^(0x[0-9a-f]+|\d+)$/i.test(v))return BigInt(v);throw Error('字形必须是非负 BigInt、整数或数字字符串');}
  function validateLayout(layout){
    if(!layout||!Array.isArray(layout.segments)||!layout.segments.length||layout.segments.length>128)throw Error('画布必须包含 1–128 根候选段');
    const ids=new Set();for(const s of layout.segments){if(!s.id||ids.has(s.id))throw Error('线段 ID 必须唯一');ids.add(s.id);for(const k of ['x1','y1','x2','y2'])if(!Number.isFinite(s[k])||s[k]<0||s[k]>1)throw Error('线段坐标必须位于 0–1');}
    return layout;
  }
  function activeMask(layout){validateLayout(layout);return layout.segments.reduce((m,s,i)=>s.enabled===false?m:m|bit(i),0n);}
  function buildLayout(config={}){
    const cols=Number(config.cols??2),rows=Number(config.rows??3),orthogonal=config.orthogonal!==false,diagonals=config.diagonals??'none',points=config.points===true;
    if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<2||rows<2||cols>12||rows>12)throw Error('顶点行列数须为 2–12');
    if(!['none','forward','back','both'].includes(diagonals))throw Error('未知斜线设置');
    // Physical coordinates include the outer boundary. Display padding belongs
    // to the SVG viewBox, never to the occlusion model.
    const segs=[],disabled=new Set(config.disabled??[]),x=c=>c/(cols-1),y=r=>r/(rows-1);
    const add=(id,x1,y1,x2,y2)=>segs.push({id,x1,y1,x2,y2,enabled:!disabled.has(id)});
    if(orthogonal){for(let r=0;r<rows;r++)for(let c=0;c<cols-1;c++)add(`h${r}_${c}`,x(c),y(r),x(c+1),y(r));for(let r=0;r<rows-1;r++)for(let c=0;c<cols;c++)add(`v${r}_${c}`,x(c),y(r),x(c),y(r+1));}
    if(orthogonal&&cols===2&&rows===3){const map={h0_0:'a',v0_1:'b',v1_1:'c',h2_0:'d',v1_0:'e',v0_0:'f',h1_0:'g'},order='abcdefg';for(const s of segs){s.gridId=s.id;s.id=map[s.id];s.enabled=!disabled.has(s.id)&&!disabled.has(s.gridId);}segs.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));}
    for(let r=0;r<rows-1;r++)for(let c=0;c<cols-1;c++){
      if(diagonals==='forward'||diagonals==='both')add(`dF${r}_${c}`,x(c),y(r+1),x(c+1),y(r));
      if(diagonals==='back'||diagonals==='both')add(`dB${r}_${c}`,x(c),y(r),x(c+1),y(r+1));
    }
    if(points)for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){add(`p${r}_${c}`,x(c),y(r),x(c),y(r));segs[segs.length-1].pixel=true;}
    const layout={id:'custom',name:`${cols-1} × ${rows-1} 格自定义画布`,cols,rows,segments:segs,config:{cols,rows,orthogonal,diagonals,points,disabled:[...disabled]}};
    validateLayout(layout);layout.active=activeMask(layout);return layout;
  }
  function normalizeGlyphs(layout,glyphs){
    const full=(1n<<BigInt(layout.segments.length))-1n,active=activeMask(layout),out={};
    if(!glyphs||typeof glyphs!=='object'||Array.isArray(glyphs)||!Object.keys(glyphs).length)throw Error('请至少选择一个字符');
    if(Object.keys(glyphs).length>128)throw Error('单次最多验证 128 个标签');
    for(const [label,p]of Object.entries(glyphs)){const n=mask(p);if(n<0n||(n&~full))throw Error('字形超出画布：'+label);out[label]=n&active;}return out;
  }
  function depthsOf(value={}){const d={};for(const s of SIDES){const n=Number(value[s]??0);if(!Number.isFinite(n)||n<0||n>100)throw Error('遮挡深度须为 0–100%');d[s]=n;}return d;}
  function clipSegment(s,depths={}){
    const d=depthsOf(depths),xmin=d.left/100,xmax=1-d.right/100,ymin=d.top/100,ymax=1-d.bottom/100;
    if(xmin>xmax||ymin>ymax)return null;
    const dx=s.x2-s.x1,dy=s.y2-s.y1;let lo=0,hi=1;
    for(const [start,delta,lower,upper,lowerCovered,upperCovered]of [[s.x1,dx,xmin,xmax,d.left>0,d.right>0],[s.y1,dy,ymin,ymax,d.top>0,d.bottom>0]]){
      // A positive-depth closed cover owns its boundary: a stroke or point
      // lying exactly on that boundary is invisible. At depth zero there is
      // no cover, so the physical outer edge remains visible.
      if(delta===0){if(start<lower||start>upper||(lowerCovered&&start<=lower)||(upperCovered&&start>=upper))return null;}
      else{const a=(lower-start)/delta,b=(upper-start)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
    }
    if(hi<=lo)return null;
    return {...s,x1:s.x1+dx*lo,y1:s.y1+dy*lo,x2:s.x1+dx*hi,y2:s.y1+dy*hi,fraction:hi-lo};
  }
  function renderClip(layout,depths={}){if(depths.depths)depths=depths.depths;return layout.segments.map((s,i)=>{const c=s.enabled===false?null:clipSegment(s,depths);return c?{...c,index:i}:null;}).filter(Boolean);}
  function coverFor(layout,depths={}){
    depths=depthsOf(depths);let removed=0n;const fractions=[];
    layout.segments.forEach((s,i)=>{const c=s.enabled===false?null:clipSegment(s,depths);if(!c)removed|=bit(i);fractions.push(c?c.fraction:0);});
    return {mask:removed,depths,fractions,description:SIDES.filter(s=>depths[s]>0).map(s=>({left:'左',right:'右',top:'上',bottom:'下'}[s]+depths[s]+'%')).join(' + ')||'完好无遮挡'};
  }
  function normalizedRules(rules=[]){if(!Array.isArray(rules)||rules.length>32)throw Error('单次最多验证 32 条规则');return rules.map((r,i)=>{
    if(!r||typeof r!=='object')throw Error('规则须为对象');const sides=[...new Set(r.sides??[])];if(sides.some(s=>!SIDES.includes(s)))throw Error('未知遮挡方向');
    const budget=Number(r.budget??0),fault=r.fault??'off';if(!Number.isInteger(budget)||budget<0||budget>128)throw Error('故障预算须为 0–128 的整数');if(!['off','on','flip'].includes(fault))throw Error('未知故障类型');
    const thresholds={};for(const side of sides){const entry=r.thresholds?.[side]??r.levels?.[side]??{};thresholds[side]={};for(const g of ['correct','detect']){const v=Object.prototype.hasOwnProperty.call(entry,g)?entry[g]:r[g+'Pct'];if(v===null||v===false)thresholds[side][g]=null;else {const n=Number(v??(g==='correct'?10:null));if(!Number.isFinite(n)||n<0||n>100)throw Error('逐方向阈值须为 0–100%，或 null 关闭');thresholds[side][g]=v===undefined&&g==='detect'?null:n;}}}
    return {...r,id:r.id??'rule-'+(i+1),sides,budget,fault,mode:r.mode==='together'?'together':'either',coverKnown:r.coverKnown!==false,thresholds};
  });}
  function criticalDepths(layout,side,max){
    const cuts=[0,max];for(const s of layout.segments){if(s.enabled===false)continue;const t=side==='left'?Math.max(s.x1,s.x2)*100:side==='right'?(1-Math.min(s.x1,s.x2))*100:side==='top'?Math.max(s.y1,s.y2)*100:(1-Math.min(s.y1,s.y2))*100;if(t>=0&&t<=max)cuts.push(t);}
    const sorted=[...new Set(cuts)].sort((a,b)=>a-b),vals=[...sorted];for(let i=1;i<sorted.length;i++){const mid=(sorted[i-1]+sorted[i])/2;if(mid>sorted[i-1]&&mid<sorted[i])vals.push(mid);}return vals.sort((a,b)=>a-b);
  }
  function scenarios(layout,rule,goal,limit=512){
    const sides=rule.sides.filter(s=>rule.thresholds[s][goal]!==null),out=[],seen=new Set();let exact=true;
    const add=d=>{const c=coverFor(layout,d),key=c.mask.toString();if(!seen.has(key)){seen.add(key);out.push(c);}};
    if(!rule.sides.length){const enabled=rule[goal+'Enabled']??(goal==='correct'?rule.correctPct!==null:rule.detectPct!==undefined&&rule.detectPct!==null);if(enabled)add({});return {covers:out,exact};}
    if(!sides.length)return {covers:[],exact};
    if(rule.coverKnown){if(rule.mode==='together')add(Object.fromEntries(sides.map(s=>[s,rule.thresholds[s][goal]])));else for(const s of sides)add({[s]:rule.thresholds[s][goal]});}
    else if(rule.mode==='either'){add({});for(const s of sides)for(const d of criticalDepths(layout,s,rule.thresholds[s][goal])){if(out.length>=limit){exact=false;break;}add({[s]:d});}}
    else{const choices=sides.map(s=>criticalDepths(layout,s,rule.thresholds[s][goal]));const visit=(i,d)=>{if(out.length>=limit){exact=false;return;}if(i===sides.length){add(d);return;}for(const x of choices[i])visit(i+1,{...d,[sides[i]]:x});};visit(0,{});if(sides.length>1)exact=false;/* Coupled clip boundaries can create additional interior states: do not certify the continuum from endpoint samples. */}
    return {covers:out,exact};
  }
  function pickBits(n,count){let out=0n;while(n&&count-->0){const b=n&-n;out|=b;n^=b;}return out;}
  function fixedCollision(p,q,cover,rule,goal,full){
    const visible=full&~cover.mask,u=p&visible,v=q&visible,a=u&~v,b=v&~u,A=pop(a),B=pop(b),k=rule.budget;
    let bad=rule.fault==='flip'?(A+B<=(goal==='correct'?2*k:k)):(goal==='correct'?Math.max(A,B)<=k:((A===0&&B<=k)||(B===0&&A<=k)));
    if(!bad)return null;let obs,fa=0n,fb=0n;
    if(rule.fault==='flip'){if(goal==='detect'){obs=v;fa=u^v;}else{fa=pickBits(u^v,Math.min(k,A+B));obs=u^fa;fb=v^obs;}}
    else if(goal==='correct'){obs=rule.fault==='off'?u&v:u|v;fa=u^obs;fb=v^obs;}
    else if((rule.fault==='off'&&B===0)||(rule.fault==='on'&&A===0)){obs=v;fa=u^v;}else{obs=u;fb=u^v;}
    return {observation:obs,coverA:cover,coverB:cover,faultA:fa,faultB:fb};
  }
  function enumerate(p,covers,rule,full,max=120000){
    const all=new Map(),clean=new Map();let visits=0,exact=true;
    for(const cover of covers){const visible=full&~cover.mask,u=p&visible,key=u.toString();clean.set(key,{observation:u,cover,fault:0n});const eligible=rule.fault==='off'?u:rule.fault==='on'?visible&~u:visible,bits=[];for(let n=eligible;n;n&=n-1n)bits.push(n&-n);
      const add=f=>{if(++visits>max){exact=false;return false;}const o=u^f;const k=o.toString();if(!all.has(k))all.set(k,{observation:o,cover,fault:f});return true;};add(0n);
      const combinations=(start,left,chosen)=>{if(!exact)return;if(!left){add(chosen);return;}for(let i=start;i<=bits.length-left&&exact;i++)combinations(i+1,left-1,chosen|bits[i]);};
      for(let count=1;count<=Math.min(rule.budget,bits.length)&&exact;count++)combinations(0,count,0n);
      if(!exact)break;
    }return {all,clean,exact};
  }
  function intersect(a,b){for(const [k,o]of a)if(b.has(k))return [o,b.get(k)];return null;}
  function prepare(layout,rules,options={}){const full=activeMask(layout),prepared=[];for(const r of normalizedRules(rules))for(const goal of ['correct','detect']){const sc=scenarios(layout,r,goal,options.maxCoverStates??512);if(sc.covers.length)prepared.push({rule:r,goal,covers:sc.covers,exact:sc.exact});}return {full,prepared};}
  function analyzeHard(layout,glyphs,rules,options={}){
    glyphs=normalizeGlyphs(layout,glyphs);const entries=Object.entries(glyphs),{full,prepared}=options._prepared??prepare(layout,rules,options),pairs=[],ruleResults=[];let exact=true;
    const intactPairs=[];for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)if(entries[i][1]===entries[j][1]){const c=coverFor(layout,{});const p={a:entries[i][0],b:entries[j][0],ruleId:'intact',goal:'correct',observation:entries[i][1],faultA:0n,faultB:0n,coverA:c,coverB:c};pairs.push(p);intactPairs.push(p);}
    ruleResults.push({id:'intact',goal:'correct',ok:!intactPairs.length,exact:true,conflictCount:intactPairs.length,pairs:intactPairs,covers:[coverFor(layout,{})]});
    const unknownCount=prepared.filter(x=>!x.rule.coverKnown).length,perEnumeration=Math.max(1,Math.floor((options.maxTotalObservations??150000)/Math.max(1,unknownCount*entries.length)));
    for(const item of prepared){const {rule,goal,covers}=item,found=[],observed=rule.coverKnown?null:entries.map(([,p])=>enumerate(p,covers,rule,full,Math.min(options.maxObservations??perEnumeration,perEnumeration)));let itemExact=item.exact&&(!observed||observed.every(o=>o.exact));
      for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
        let witness=null;
        if(rule.coverKnown){for(const c of covers){witness=fixedCollision(entries[i][1],entries[j][1],c,rule,goal,full);if(witness)break;}}
        else{const a=observed[i],b=observed[j];let w=goal==='correct'?intersect(a.all,b.all):intersect(a.all,b.clean);if(!w&&goal==='detect')w=intersect(a.clean,b.all);if(w)witness={observation:w[0].observation,coverA:w[0].cover,coverB:w[1].cover,faultA:w[0].fault,faultB:w[1].fault};}
        if(witness){const p={a:entries[i][0],b:entries[j][0],ruleId:rule.id,goal,...witness};pairs.push(p);found.push(p);}
      }
      exact=exact&&itemExact;ruleResults.push({id:rule.id,goal,ok:found.length?false:itemExact?true:null,exact:itemExact,conflictCount:found.length,pairs:found,covers,budget:rule.budget,fault:rule.fault,coverKnown:rule.coverKnown});
    }
    return {ok:pairs.length?false:exact?true:null,exact,pairs,ruleResults,conflictCount:pairs.length,glyphs,prepared,full};
  }
  const geometryCache=new WeakMap();
  function pointDistance(px,py,s){const dx=s.x2-s.x1,dy=s.y2-s.y1,t=Math.max(0,Math.min(1,((px-s.x1)*dx+(py-s.y1)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(px-s.x1-t*dx,py-s.y1-t*dy);}
  function rasterData(layout,size=28){const signature=layout.segments.map(s=>`${s.id}:${s.x1},${s.y1},${s.x2},${s.y2},${s.enabled!==false}`).join(';');let cache=geometryCache.get(layout);if(cache?.size===size&&cache.signature===signature)return cache;const lists=layout.segments.map(s=>{const a=[];if(s.enabled!==false)for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(pointDistance((x+.5)/size,(y+.5)/size,s)<1.05/size)a.push(y*size+x);return a;});cache={size,lists,signature};geometryCache.set(layout,cache);return cache;}
  function rasterize(layout,p,size=28){p=mask(p);const {lists}=rasterData(layout,size),out=new Uint8Array(size*size);for(let i=0;i<lists.length;i++)if(p&bit(i))for(const j of lists[i])out[j]=1;return out;}
  function topologyFromRaster(pixels,size){const count=(value,holesOnly)=>{const seen=new Uint8Array(pixels.length);let count=0;for(let i=0;i<pixels.length;i++){if(seen[i]||pixels[i]!==value)continue;const q=[i];seen[i]=1;let edge=false;for(let head=0;head<q.length;head++){const p=q[head],x=p%size,y=Math.floor(p/size);if(x===0||y===0||x===size-1||y===size-1)edge=true;for(const n of [x>0?p-1:-1,x<size-1?p+1:-1,y>0?p-size:-1,y<size-1?p+size:-1])if(n>=0&&!seen[n]&&pixels[n]===value){seen[n]=1;q.push(n);}}if(!holesOnly||!edge)count++;}return count;};return {components:count(1,false),holes:count(0,true),method:'28×28 线段几何光栅，4邻接',resolution:size};}
  function topology(layout,p,size=28){return topologyFromRaster(rasterize(layout,p,size),size);}
  function expectation(label,size=28){const E=root.ExpectationGlyphs;if(!E)return null;const g=E.get(label);if(!g?.known)return null;return {bitmap:g.bitmap,raster:E.raster(label,size,size),known:true,note:g.note};}
  function bitmapRaster(bitmap,size=28){if(!Array.isArray(bitmap)||!bitmap.length)return null;const h=bitmap.length,w=bitmap[0].length,out=new Uint8Array(size*size);for(let y=0;y<size;y++)for(let x=0;x<size;x++)out[y*size+x]=String(bitmap[Math.min(h-1,Math.floor(y*h/size))])[Math.min(w-1,Math.floor(x*w/size))]==='1'?1:0;return out;}
  function fitRaster(layout,target){const {lists}=rasterData(layout),counts=new Uint8Array(target.length);let p=0n;for(let pass=0;pass<4;pass++){let changed=false;for(let i=0;i<lists.length;i++){if(!lists[i].length)continue;const on=!!(p&bit(i));let delta=0;for(const j of lists[i]){const before=counts[j]>0,after=counts[j]+(on?-1:1)>0;delta+=Number(after!==!!target[j])-Number(before!==!!target[j]);}if(delta<0){p^=bit(i);for(const j of lists[i])counts[j]+=on?-1:1;changed=true;}}if(!changed)break;}return p&activeMask(layout);}
  function seedGlyph(layout,label){const E=root.ExpectationGlyphs,standard=E?.standard7(label),ids=layout.segments.map(s=>s.id);if(standard!==null&&standard!==undefined&&'abcdefg'.split('').every(id=>ids.includes(id))){let p=0n;for(let i=0;i<7;i++)if(BigInt(standard)&bit(i))p|=bit(ids.indexOf('abcdefg'[i]));return p&activeMask(layout);}const e=expectation(label);return e?fitRaster(layout,e.raster):0n;}
  function seedGlyphs(layout,labels){return Object.fromEntries(labels.map(l=>[l,seedGlyph(layout,l)]));}
  function targetInfo(layout,label,targets={}){const reference={...layout,segments:layout.segments.map(s=>({...s,enabled:true}))},full=(1n<<BigInt(layout.segments.length))-1n,checked=p=>{p=mask(p);if(p&~full)throw Error('目标字形超出候选画布');return p;},custom=targets?.[label];if(custom!==undefined&&custom!==null){if(typeof custom==='bigint'||typeof custom==='number'||typeof custom==='string'){const p=checked(custom);return {mask:p,raster:rasterize(reference,p),known:true,source:'手动设定的独立目标'};}if(custom.bitmap){const raster=bitmapRaster(custom.bitmap);if(raster)return {mask:fitRaster(reference,raster),raster,known:true,source:'手动期望位图'};}if(custom.mask!==undefined){const p=checked(custom.mask);return {mask:p,raster:rasterize(reference,p),known:true,source:'手动设定的独立目标'};}}
    const e=expectation(label);return e?{mask:seedGlyph(reference,label),raster:e.raster,known:true,source:'独立 5×7 期望字形',note:e.note}:{mask:null,raster:null,known:false,source:'无已定义的期望字形'};
  }
  function weightsFor(layout,options={}){const w={lambdaVisible:1,lambdaOccluded:.3,topologyWeight:.2,nearestWeight:.2,rasterWeight:1,...options.weights},base=root.COV?.WEIGHTS??{a:1,b:1,c:1,d:.6,e:1,f:1.2,g:1.1};for(const k of ['lambdaVisible','lambdaOccluded','topologyWeight','nearestWeight','rasterWeight'])if(!Number.isFinite(Number(w[k]))||Number(w[k])<0)throw Error('评分权重必须是非负数');w.segments=layout.segments.map(s=>Number(w.segmentWeights?.[s.id]??s.weight??base[s.id]??1));if(w.segments.some(v=>!Number.isFinite(v)||v<0))throw Error('段权重必须是非负数');return w;}
  function weighted(p,q,weights){let n=p^q,total=0;for(let i=0;i<weights.length;i++)if(n&bit(i))total+=weights[i];return total;}
  function mismatch(a,b){let n=0,d=0;for(let i=0;i<a.length;i++){if(a[i]||b[i])d++;if(a[i]!==b[i])n++;}return d?n/d:0;}
  function analyze(layout,glyphs,rules=[],options={}){
    const hard=analyzeHard(layout,glyphs,rules,options);if(options.metrics===false)return hard;
    const entries=Object.entries(hard.glyphs),targets=Object.fromEntries(entries.map(([l])=>[l,targetInfo(layout,l,options.targets)])),weights=weightsFor(layout,options),covers=new Map();for(const r of hard.ruleResults)for(const c of r.covers??[])if(c.mask)covers.set(c.mask.toString(),c);
    const isSeven=layout.segments.length===7&&'abcdefg'.split('').every(id=>layout.segments.some(s=>s.id===id)),toSeven=p=>'abcdefg'.split('').reduce((n,id,i)=>p&bit(layout.segments.findIndex(s=>s.id===id))?n|(1<<i):n,0),sevenTopo=p=>{const v=root.COV_TOPOLOGY?.[String(toSeven(p))];return v?{components:v[0],holes:v[1],method:'原七段几何拓扑表'}:null;};
    const perGlyph=entries.map(([label,p])=>{
      const target=targets[label],errors=hard.pairs.filter(x=>x.a===label||x.b===label),raster=rasterize(layout,p),top=(isSeven?sevenTopo(p):null)??topologyFromRaster(raster,28),warnings=[];let similarity=null,nearest=null,metrics={};
      if(target.known){const legacy=isSeven&&options.targets?.[label]===undefined&&root.ExpectationGlyphs?.standard7(label)!==null,visibleDistance=weighted(p,target.mask,weights.segments);let occludedDistance=0;for(const c of covers.values())occludedDistance+=weighted(p&~c.mask,target.mask&~c.mask,weights.segments);const targetLayout={...layout,segments:layout.segments.map(s=>({...s,enabled:true}))},topoTarget=(isSeven?sevenTopo(target.mask):null)??topologyFromRaster(rasterize(targetLayout,target.mask),28),actualTopology=(isSeven?sevenTopo(p):null)??top,topologyMismatch=Number(actualTopology.components!==topoTarget.components||actualTopology.holes!==topoTarget.holes),rasterMismatch=mismatch(raster,target.raster);
        const distances=entries.filter(([l])=>targets[l].known&&(!legacy||root.ExpectationGlyphs?.standard7(l)!==null)).map(([l])=>({label:l,distance:weighted(p,targets[l].mask,weights.segments)})).sort((a,b)=>a.distance-b.distance);const intended=distances.find(x=>x.label===label)?.distance??Infinity,best=distances[0]?.distance??Infinity,nearestLabels=distances.filter(x=>Math.abs(x.distance-best)<EPS).map(x=>x.label);nearest={labels:nearestLabels,unique:nearestLabels.length===1&&nearestLabels[0]===label,margin:Math.min(...distances.filter(x=>x.label!==label).map(x=>x.distance))-intended};const basePenalty=weights.lambdaVisible*visibleDistance+weights.lambdaOccluded*occludedDistance,penalty=basePenalty+weights.topologyWeight*topologyMismatch+weights.nearestWeight*Number(!nearest.unique)+(legacy?0:weights.rasterWeight*rasterMismatch),missingRepresentation=target.mask===0n&&target.raster.some(Boolean);
        metrics={model:legacy?'seven-segment-baseline':'geometry-proxy',flips:pop(p^target.mask),visibleDistance,occludedDistance,rasterMismatch,topologyMismatch,nearestMismatch:!nearest.unique,missingRepresentation,penalty,basePenalty,score:Math.exp(-(legacy?basePenalty:penalty)),compositeScore:Math.exp(-penalty),targetMask:target.mask,targetSource:target.source,targetTopology:topoTarget};similarity=1-rasterMismatch;if(missingRepresentation)warnings.push('当前候选线段无法拟合该字符的期望字形；空白映射不代表可读性良好');if(!nearest.unique)warnings.push('与另一个期望字形更近或并列；这是模型提示，不是真人识别结论');
      }else warnings.push('没有该字符的独立期望字形，暂不评分或声称可读');
      if(!hard.exact)warnings.push('未知遮挡观察枚举受预算限制，未完成的规则不能判为通过');
      if(hard.full!==((1n<<BigInt(layout.segments.length))-1n))warnings.push('已禁用的硬件段自动从字形与验证中排除');
      return {label,pattern:p,pass:errors.length?false:hard.exact?true:null,errors,similarity,nearest,topology:top,metrics,warnings};
    });
    const scored=perGlyph.filter(g=>g.metrics.score!==undefined);return {...hard,perGlyph,meanScore:scored.length?scored.reduce((a,g)=>a+g.metrics.score,0)/scored.length:null,meanSimilarity:scored.length?scored.reduce((a,g)=>a+g.similarity,0)/scored.length:null,warnings:['几何裁切：仅完全不可见的段才擦除其位；残留任意非零长度均视为可分辨。','评分来自独立期望字形与几何/距离模型，不是人类识别准确率。'],weights};
  }
  function serialize(value){return JSON.stringify(value,(k,v)=>typeof v==='bigint'?{$bigint:v.toString()}:v,2);}
  function deserialize(value){return JSON.parse(value,(k,v)=>v&&typeof v==='object'&&Object.keys(v).length===1&&typeof v.$bigint==='string'&&/^\d+$/.test(v.$bigint)?BigInt(v.$bigint):v);}
  function decode(layout,glyphs,received,{rule,cover,goal='correct'}={}){const prepared=prepare(layout,[rule??{sides:[],budget:0,correctPct:0}]);const item=prepared.prepared.find(p=>p.goal===goal);if(!item)return [];const covers=cover?[cover]:item.covers;received=mask(received);return Object.entries(normalizeGlyphs(layout,glyphs)).filter(([,p])=>enumerate(p,covers,item.rule,prepared.full).all.has(received.toString())).map(([l])=>l);}
  async function search(layout,labels,rules=[],options={}){
    if(!Array.isArray(labels)||!labels.length||new Set(labels).size!==labels.length)throw Error('搜索需要不重复的字符标签');
    const start=Date.now(),budgetMs=Math.max(25,Number(options.budgetMs??1500)),deadline=start+budgetMs,signal=options.signal,active=activeMask(layout),positions=layout.segments.map((s,i)=>i).filter(i=>active&bit(i)),target=Object.fromEntries(labels.map(l=>[l,targetInfo(layout,l,options.targets)])),w=weightsFor(layout,options);let iterations=0,cancelled=false,complete=false,best=null,lastProgress=0;
    const compiled=prepare(layout,rules,options),searchOptions={...options,_prepared:compiled},scoreCovers=new Map();for(const item of compiled.prepared)for(const c of item.covers)if(c.mask)scoreCovers.set(c.mask.toString(),c);
    const effectiveWeights=w.segments.map((v,i)=>v*(Number(w.lambdaVisible)+Number(w.lambdaOccluded)*[...scoreCovers.values()].filter(c=>!(c.mask&bit(i))).length)),isSeven=layout.segments.length===7&&'abcdefg'.split('').every(id=>layout.segments.some(s=>s.id===id)),reference={...layout,segments:layout.segments.map(s=>({...s,enabled:true}))},toSeven=p=>'abcdefg'.split('').reduce((n,id,i)=>p&bit(layout.segments.findIndex(s=>s.id===id))?n|(1<<i):n,0),topFor=(p,l)=>{const t=isSeven?root.COV_TOPOLOGY?.[String(toSeven(p))]:null;return t?{components:t[0],holes:t[1]}:topology(l,p);},targetTop=Object.fromEntries(labels.filter(l=>target[l].known).map(l=>[l,topFor(target[l].mask,reference)])),rasterCache=new Map(),topCache=new Map(),costCache=new Map();
    const patternRaster=p=>{if(!rasterCache.has(p))rasterCache.set(p,rasterize(layout,p));return rasterCache.get(p);};
    const patternCost=(label,p)=>{if(!target[label].known)return 0;const key=label+'|'+p;if(costCache.has(key))return costCache.get(key);const legacy=isSeven&&options.targets?.[label]===undefined&&root.ExpectationGlyphs?.standard7(label)!==null;let cost=weighted(p,target[label].mask,effectiveWeights);if(w.topologyWeight){if(!topCache.has(p))topCache.set(p,topFor(p,layout));const t=topCache.get(p),tt=targetTop[label];if(t.components!==tt.components||t.holes!==tt.holes)cost+=Number(w.topologyWeight);}if(w.nearestWeight){const distances=labels.filter(l=>target[l].known&&(!legacy||root.ExpectationGlyphs?.standard7(l)!==null)).map(l=>[l,weighted(p,target[l].mask,w.segments)]),intended=distances.find(x=>x[0]===label)?.[1]??Infinity;if(distances.some(([l,d])=>l!==label&&d<=intended+EPS))cost+=Number(w.nearestWeight);}if(!legacy)cost+=Number(w.rasterWeight)*mismatch(patternRaster(p),target[label].raster);costCache.set(key,cost);return cost;};
    const expired=()=>{if(signal?.aborted)cancelled=true;return cancelled||Date.now()>=deadline;},penalty=g=>labels.reduce((n,l)=>n+patternCost(l,g[l]),0);
    const compare=(a,b)=>!b||a.conflicts<b.conflicts||a.conflicts===b.conflicts&&(Number(a.unresolved)<Number(b.unresolved)||a.unresolved===b.unresolved&&a.penalty<b.penalty);
    const evaluate=g=>{iterations++;const analysis=analyzeHard(layout,g,rules,searchOptions),candidate={glyphs:{...analysis.glyphs},conflicts:analysis.pairs.length,unresolved:!analysis.exact,penalty:penalty(analysis.glyphs),analysis};if(compare(candidate,best))best=candidate;return candidate;};
    const progress=async force=>{if(force||Date.now()-lastProgress>50){lastProgress=Date.now();options.onProgress?.({iterations,bestScore:best?Math.exp(-best.penalty/labels.length):null,conflicts:best?.conflicts??null,elapsedMs:Date.now()-start});await new Promise(r=>setTimeout(r,0));}};
    const initial=Object.fromEntries(labels.map(l=>[l,target[l].mask??0n]));evaluate(initial);for(const seed of options.seeds??[])if(labels.every(l=>seed[l]!==undefined))evaluate(Object.fromEntries(labels.map(l=>[l,mask(seed[l])&active])));
    const necessary=[];for(const item of prepare(layout,rules,options).prepared)for(const c of item.covers){const n=pop(active&~c.mask);let upper=2**n;if(item.rule.fault==='flip'){const radius=item.goal==='correct'?item.rule.budget:Math.floor(item.rule.budget/2);let ball=1,choose=1;for(let j=1;j<=Math.min(n,radius);j++){choose=choose*(n-j+1)/j;ball+=choose;}upper=Math.floor(upper/ball);}if(item.goal==='detect'&&item.rule.budget>0&&n)upper=Math.min(upper,2**(n-1));if(labels.length>upper)necessary.push({ruleId:item.rule.id,goal:item.goal,upper,required:labels.length,cover:c});}
    if(labels.length>2**positions.length||necessary.length){const analysis=analyze(layout,best.glyphs,rules,options);return {status:'impossible',optimal:false,provedImpossible:true,bounds:necessary,glyphs:best.glyphs,analysis,iterations,elapsedMs:Date.now()-start,note:'可见段数量/汉明球必要上界已小于所选字符数；此硬件与规则下不存在完整解。'};}
    if(positions.length<=12){
      const patterns=Array.from({length:2**positions.length},(_,n)=>positions.reduce((p,pos,i)=>n>>i&1?p|bit(pos):p,0n)),candidates={};let preprocessingComplete=true;for(const label of labels){const rows=[];for(let i=0;i<patterns.length;i++){if(expired()){preprocessingComplete=false;break;}rows.push({p:patterns[i],c:patternCost(label,patterns[i])});if(i%64===0)await progress(false);}candidates[label]=rows.sort((a,b)=>a.c-b.c);if(!preprocessingComplete)break;}
      const assigned={},pairCache=new Map();let stopped=!preprocessingComplete;
      const compatible=(a,p,b,q)=>{const key=p<q?p+','+q:q+','+p;if(pairCache.has(key))return pairCache.get(key);let ok;if(compiled.prepared.every(i=>i.rule.coverKnown))ok=p!==q&&compiled.prepared.every(i=>i.covers.every(c=>!fixedCollision(p,q,c,i.rule,i.goal,compiled.full)));else ok=analyzeHard(layout,{a:p,b:q},rules,searchOptions).ok!==false;pairCache.set(key,ok);return ok;};
      const dfs=async(depth,cost)=>{if(expired()){stopped=true;return;}if(depth===labels.length){evaluate(assigned);return;}const label=labels[depth];for(const candidate of candidates[label]){if(expired()){stopped=true;break;}if(best?.conflicts===0&&!best.unresolved&&cost+candidate.c>=best.penalty-EPS)break;let valid=true;for(let j=0;j<depth;j++)if(!compatible(label,candidate.p,labels[j],assigned[labels[j]])){valid=false;break;}if(!valid)continue;assigned[label]=candidate.p;iterations++;await dfs(depth+1,cost+candidate.c);if(iterations%64===0)await progress(false);}delete assigned[label];};
      if(preprocessingComplete)await dfs(0,0);complete=!stopped;
    }else{
      let current=best,stagnation=0,seed=1234567;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      while(!expired()){
        const pair=current.analysis.pairs[Math.floor(random()*current.analysis.pairs.length)],label=pair?(random()<.5?pair.a:pair.b):labels[Math.floor(random()*labels.length)];let next=null;
        for(let k=0;k<Math.min(positions.length,24)&&!expired();k++){const pos=positions[(k+Math.floor(random()*positions.length))%positions.length],g={...current.glyphs,[label]:current.glyphs[label]^bit(pos)},candidate=evaluate(g);if(compare(candidate,next))next=candidate;}
        if(next&&compare(next,current)){current=next;stagnation=0;}else{stagnation++;const g={...current.glyphs};for(let k=0;k<Math.min(4,1+Math.floor(stagnation/4));k++){const l=labels[Math.floor(random()*labels.length)],pos=positions[Math.floor(random()*positions.length)];g[l]^=bit(pos);}current=evaluate(g);if(stagnation>12){current=best;stagnation=0;}}
        await progress(false);
      }
    }
    await progress(true);const analysis=analyze(layout,best.glyphs,rules,options),certifiable=compiled.prepared.every(i=>i.rule.coverKnown&&i.exact);return {status:cancelled?'cancelled':analysis.ok===true?'feasible':analysis.ok===null?'unresolved':complete?'exhausted':'budget',optimal:complete&&certifiable&&analysis.ok===true,provedImpossible:complete&&certifiable&&analysis.ok===false,glyphs:best.glyphs,analysis,objectivePenalty:best.penalty,iterations,elapsedMs:Date.now()-start,objective:'先满足全部硬约束，再最小化可见距离 + 遮挡距离 + 拓扑偏差 + 最近目标偏差；通用几何另含光栅形状偏差。各项采用当前评分权重。',note:complete?'候选位图与赋值树已穷尽或由该明确模型目标的界限剪枝；不代表真人可读性最优。':'只报告预算内最佳候选；没有证明全局最优或不存在更好的字形。'};
  }
  const api={buildLayout,validateLayout,activeMask,normalizeGlyphs,clipSegment,renderClip,coverFor,normalizedRules,scenarios,analyze,analyzeHard,seedGlyph,seedGlyphs,topology,rasterize,decode,search,serialize,deserialize,popcount:pop,mask};
  root.DisplayDesigner=api;root.DesignerCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
