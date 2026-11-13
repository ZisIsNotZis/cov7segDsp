/* Guided custom display designer. The engine owns geometry, evidence, and search. */
(function(){
 'use strict';
 const D=globalThis.DisplayDesigner,E=globalThis.ExpectationGlyphs,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const STORE='cov7seg-designer-v2',SIDES=['left','right','top','bottom'],sideName={left:'左',right:'右',top:'上',bottom:'下'},bit=i=>1n<<BigInt(i);
 const state={config:{cols:2,rows:3,orthogonal:true,diagonals:'none',points:false,disabled:[]},layout:null,pool:[...'0123456789'],labels:[...'0123456789'],caseInsensitive:false,glyphs:{},targets:{},rules:[],weights:{lambdaVisible:1,lambdaOccluded:.3,topologyWeight:.2,nearestWeight:.2,segmentWeights:{}},selected:'8',targetSelected:'8',analysis:null,candidates:[],revision:0};
 let pending,searchController=null,ruleId=1,jobId=0;
 const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const empty=n=>{n.replaceChildren();return n;};
 const selectOption=(s,value,label)=>{const o=node('option','',label);o.value=String(value);s.append(o);};
 const canonical=s=>state.caseInsensitive?s.replace(/[a-z]/g,c=>c.toUpperCase()):s;
 const say=(text,error=false)=>{$('#designer-status').textContent=text;$('#designer-status').classList.toggle('error',error);};
 const cloneGlyphs=g=>Object.fromEntries(Object.entries(g).map(([l,p])=>[l,BigInt(p)]));
 const metric=v=>v===null||v===undefined||!Number.isFinite(v)?'未评分':v.toFixed(3);
 const percent=v=>v===null||v===undefined||!Number.isFinite(v)?'未定义':Math.round(v*100)+'%';
 function rule(){let id;do{id='r'+ruleId++;}while(state.rules.some(r=>r.id===id));return{id,sides:['left','right'],mode:'either',thresholds:Object.fromEntries(SIDES.map(s=>[s,{correct:10,detect:20}])),correctEnabled:true,detectEnabled:true,budget:0,fault:'off',coverKnown:true};}
 function referenceLayout(){return{...state.layout,segments:state.layout.segments.map(s=>({...s,enabled:true}))};}
 function targetMask(label){return state.targets[label]===undefined?D.seedGlyph(referenceLayout(),label):BigInt(state.targets[label]);}
 function options(){return{targets:state.targets,weights:state.weights,maxCoverStates:256,maxObservations:60000};}
 function openStep(id){const n=$('#'+id);if(!n)return;n.open=true;n.scrollIntoView({behavior:'smooth',block:'start'});}
 function makeSVG(layout,p,{hardware=false,edit=null,cover=null,labels=false,aria='发光段图案'}={}){
   p=BigInt(p??0n);const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','-8 -8 116 116');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('class','designer-svg');svg.setAttribute('role',edit?'group':'img');svg.setAttribute('aria-label',aria);
   const clipped=cover?new Map(D.renderClip(layout,cover).map(s=>[s.index,s])):null;
   layout.segments.forEach((original,i)=>{
     const enabled=original.enabled!==false,s=clipped?.get(i)??original;if(!hardware&&(!enabled||clipped&&!clipped.has(i)))return;
     const point=s.pixel||s.x1===s.x2&&s.y1===s.y2,line=document.createElementNS(ns,point?'circle':'line');if(point){line.setAttribute('cx',s.x1*100);line.setAttribute('cy',s.y1*100);line.setAttribute('r',layout.segments.length>30?2:3.1);line.style.fill=hardware?(enabled?'#e4d18b':'#476257'):(p&bit(i)?'#e4d18b':'#39524c');line.style.stroke='none';}else for(const k of ['x1','y1','x2','y2'])line.setAttribute(k,s[k]*100);line.setAttribute('stroke-width',layout.segments.length>30?1.8:layout.segments.length>14?2.8:4.7);line.setAttribute('class','d-line '+(hardware?(enabled?'d-on':'d-removed'):(p&bit(i)?'d-on':'d-off')));svg.append(line);
     if(edit){const x1=s.x1*100,y1=s.y1*100,x2=s.x2*100,y2=s.y2*100,dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1,pad=layout.segments.length>30?2.3:4,px=-dy/len*pad,py=dx/len*pad,h=document.createElementNS(ns,point?'circle':'polygon');if(point){h.setAttribute('cx',x1);h.setAttribute('cy',y1);h.setAttribute('r',pad+1);}else h.setAttribute('points',`${x1+px},${y1+py} ${x2+px},${y2+py} ${x2-px},${y2-py} ${x1-px},${y1-py}`);h.setAttribute('class','d-hit');h.setAttribute('role','button');h.setAttribute('tabindex','0');h.setAttribute('aria-pressed',String(hardware?enabled:!!(p&bit(i))));h.setAttribute('aria-label',(hardware?'硬件 ':'切换 ')+s.id+' 段');h.dataset.segment=s.id;h.addEventListener('click',()=>edit(i));h.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();edit(i);}});svg.append(h);}
     if(labels&&layout.segments.length<=24){const t=document.createElementNS(ns,'text');t.setAttribute('x',(s.x1+s.x2)*50+1.8);t.setAttribute('y',(s.y1+s.y2)*50-2);t.setAttribute('class','d-segment-label');t.textContent=s.id;svg.append(t);}
   });return svg;
 }
 function draw(host,p,opts={}){empty(host).append(makeSVG(opts.reference?referenceLayout():state.layout,p,opts));}
 function segmentButtons(host,p,fn,{hardware=false,all=false}={}){
   empty(host);state.layout.segments.forEach((s,i)=>{if(!hardware&&!all&&s.enabled===false)return;const on=hardware?s.enabled!==false:!!(p&bit(i)),b=node('button',on?'on':'',s.id);b.type='button';b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',(hardware?'硬件开关 ':'切换 ')+s.id+' 段');b.dataset.index=i;b.addEventListener('click',()=>{fn(i);const next=host.querySelector('[data-index="'+i+'"]');if(next)next.focus({preventScroll:true});});host.append(b);});
 }
 function cancelSearch(reason){if(searchController){searchController.abort();searchController=null;$('#d-search').disabled=false;$('#d-cancel-search').hidden=true;if(reason)$('#search-progress').textContent=reason;}jobId++;}
 function changed({all=false,rules=false,targets=false}={}){
   state.revision++;cancelSearch('设计条件已经改变。上次候选仅作历史比较；请按新要求重新搜索。');
   if(all){renderHardware();renderCharacters();renderTarget();renderRules();renderSegmentWeights();}
   else{if(rules)renderRules();if(targets)renderTarget();}
   if(state.candidates.length)renderCandidates();
   schedule();
 }
 function schedule(){clearTimeout(pending);pending=setTimeout(validate,90);}
 function syncRuleControls(){
   $$('#rule-list [data-rule-id][data-field]').forEach(input=>{const r=state.rules.find(x=>x.id===input.dataset.ruleId);if(!r)return;const field=input.dataset.field;
     if(field==='threshold'){const side=input.dataset.side,goal=input.dataset.goal;if(r[goal+'Enabled']===false){r.thresholds[side][goal]=null;return;}if(input.disabled)return;r.thresholds[side][goal]=Math.max(0,Math.min(100,Number(input.value)||0));}
     else r[field]=field==='budget'?Math.max(0,Math.min(D.popcount(D.activeMask(state.layout)),Math.floor(Number(input.value)||0))):field==='coverKnown'?input.value==='true':input.value;
   });
 }
 function validate(){
   try{syncRuleControls();state.analysis=D.analyze(state.layout,state.glyphs,state.rules,options());renderOverview();renderActual();renderResults();renderRuleStatuses();}
   catch(e){state.analysis=null;$('#d-verdict').className='designer-verdict pending';empty($('#d-verdict')).append(node('strong','','需要先完善设计'),node('span','',e.message));if(!state.labels.length){empty($('#actual-canvas'));empty($('#actual-gallery'));empty($('#actual-segments'));empty($('#glyph-detail'));empty($('#designer-witnesses'));empty($('#rule-results'));}say(e.message,true);renderOverview();}
 }
 function remap(p,oldLayout,newLayout){let out=0n;const old=new Map(oldLayout.segments.map((s,i)=>[s.id,i]));newLayout.segments.forEach((s,i)=>{const j=old.get(s.id);if(j!==undefined&&BigInt(p)&bit(j))out|=bit(i);});return out;}
 function changeLayout(){
   const old=state.layout,config={cols:Number($('#d-cols').value)+1,rows:Number($('#d-rows').value)+1,orthogonal:$('#d-orthogonal').checked,diagonals:$('#d-forward').checked?$('#d-back').checked?'both':'forward':$('#d-back').checked?'back':'none',points:$('#d-points').checked,disabled:state.config.disabled};
   try{const layout=D.buildLayout(config);state.config=config;state.layout=layout;
     state.glyphs=Object.fromEntries(state.labels.map(l=>[l,remap(state.glyphs[l]??0n,old,layout)&D.activeMask(layout)]));state.targets=Object.fromEntries(Object.entries(state.targets).map(([l,p])=>[l,remap(p,old,layout)]));
     changed({all:true});say('画布已改变：按线段 ID 保留可对应的实际字形与手动目标，新增线保持关闭。独立期望模板会重新投影；可在第 5 步从期望重新开始。');
   }catch(e){$('#d-cols').value=state.config.cols-1;$('#d-rows').value=state.config.rows-1;$('#d-orthogonal').checked=state.config.orthogonal;$('#d-forward').checked=['forward','both'].includes(state.config.diagonals);$('#d-back').checked=['back','both'].includes(state.config.diagonals);$('#d-points').checked=!!state.config.points;say('未改变画布：'+e.message,true);}
 }
 function toggleHardware(i){const id=state.layout.segments[i].id;state.config.disabled=state.config.disabled.includes(id)?state.config.disabled.filter(x=>x!==id):[...state.config.disabled,id];state.layout=D.buildLayout(state.config);state.glyphs=Object.fromEntries(Object.entries(state.glyphs).map(([l,p])=>[l,p&D.activeMask(state.layout)]));changed({all:true});}
 function renderHardware(){
   const active=state.layout.segments.filter(s=>s.enabled!==false).length;
   $('#hardware-count').textContent=active+' / '+state.layout.segments.length+' 根已启用';$('#grid-meaning').textContent=state.config.cols+' 列 × '+state.config.rows+' 行顶点，形成 '+(state.config.cols-1)+' × '+(state.config.rows-1)+' 个格子。';
   const host=$('#hardware-canvas');host.style.maxWidth=Math.min(300,270*(state.config.cols-1)/(state.config.rows-1))+'px';host.style.minWidth='110px';draw(host,D.activeMask(state.layout),{hardware:true,edit:toggleHardware,labels:true,aria:'硬件画布，点线段决定它是否存在'});segmentButtons($('#hardware-segments'),D.activeMask(state.layout),toggleHardware,{hardware:true});
   $('#layout-summary').textContent=(state.config.cols-1)+' × '+(state.config.rows-1)+' 格 · '+active+' 根段';
 }
 function cleanLabels(raw){const parts=/[\s,，]/u.test(raw)?raw.split(/[\s,，]+/u):Array.from(raw);return [...new Set(parts.filter(Boolean).map(canonical))].filter(l=>l.length<=16&&!/[\u0000-\u001f]/.test(l)&&!['__proto__','constructor','prototype'].includes(l));}
 function addCharacters(chars){const labels=cleanLabels(chars);if(new Set([...state.pool,...labels]).size>128){say('单次最多保留 128 个备选字符，请先缩小字符范围。',true);return;}state.pool=[...new Set([...state.pool,...labels])];state.labels=[...new Set([...state.labels,...labels])];syncCharacters();}
 function syncCharacters(){
   state.labels=state.pool.filter(l=>state.labels.includes(l));const old=state.glyphs;state.glyphs=Object.fromEntries(state.labels.map(l=>[l,old[l]??D.seedGlyph(state.layout,l)]));
   if(!state.labels.includes(state.selected))state.selected=state.labels[0]??'';if(!state.labels.includes(state.targetSelected))state.targetSelected=state.labels[0]??'';
   state.targets=Object.fromEntries(Object.entries(state.targets).filter(([l])=>state.labels.includes(l)));renderCharacters();renderTarget();changed();
 }
 function renderCharacters(){
   empty($('#character-pool'));state.pool.forEach(label=>{const selected=state.labels.includes(label),b=node('button','character-chip'+(selected?' selected':''),label);b.setAttribute('aria-pressed',String(selected));b.setAttribute('aria-label',(selected?'移除字符 ':'加入字符 ')+label);b.addEventListener('click',()=>{state.labels=selected?state.labels.filter(l=>l!==label):[...state.labels,label];syncCharacters();});$('#character-pool').append(b);});
   $('#characters-summary').textContent=state.labels.length+' 个字符'+(state.caseInsensitive?' · 大小写合并':'');$('#character-message').textContent='备选 '+state.pool.length+' 个，本版选中 '+state.labels.length+' 个。'+(state.labels.some(l=>!E?.get(l).known)?'部分自定义符号没有内置期望，请在第 4 步单独画目标；未定义时不冒充可读性评分。':'逐个点选可以缩小设计任务。');
 }
 function renderRules(){
   const host=empty($('#rule-list'));
   state.rules.forEach((r,index)=>{
     const card=node('article','rule-card'),head=node('div','rule-heading'),title=node('div');title.append(node('strong','','要求 '+(index+1)),node('span','',r.id));head.append(title);const remove=node('button','text-button','移除这一条');remove.addEventListener('click',()=>{state.rules=state.rules.filter(x=>x!==r);changed({rules:true});});head.append(remove);card.append(head);
     const controls=node('div','rule-top-controls');
     const field=(label,key,choices)=>{const l=node('label','',label),s=node(key==='budget'?'input':'select');if(key==='budget'){s.type='number';s.min='0';s.max=String(D.popcount(D.activeMask(state.layout)));s.step='1';}else choices.forEach(([v,t])=>selectOption(s,v,t));s.value=String(r[key]);s.dataset.ruleId=r.id;s.dataset.field=key;s.setAttribute('aria-label','要求 '+(index+1)+' '+label);const update=()=>{const current=state.rules.find(x=>x.id===s.dataset.ruleId);if(!current)return;current[key]=key==='budget'?Math.max(0,Math.min(D.popcount(D.activeMask(state.layout)),Math.floor(Number(s.value)||0))):key==='coverKnown'?s.value==='true':s.value;changed();};for(const event of ['input','change','blur'])s.addEventListener(event,update);l.append(s);controls.append(l);};
     field('所选方向如何出现','mode',[['either','分别考验，任一侧出现'],['together','所选方向同时遮挡']]);field('未知故障类型','fault',[['off','坏段不亮 1 → 0'],['on','坏段常亮 0 → 1'],['flip','状态翻转 0 ↔ 1']]);field('至多几个坏段','budget',[[0,'0 段'],[1,'1 段'],[2,'2 段']]);field('知道遮挡在哪里吗','coverKnown',[[true,'知道位置 / 深度'],[false,'也不知道遮挡位置']]);card.append(controls);
     const table=node('table','threshold-table'),thead=node('thead'),tr=node('tr');tr.append(node('th','','启用方向 →'));
     SIDES.forEach(s=>{const th=node('th'),label=node('label'),cb=node('input');cb.type='checkbox';cb.checked=r.sides.includes(s);cb.setAttribute('aria-label','要求 '+(index+1)+' 启用'+sideName[s]+'侧');cb.addEventListener('change',()=>{r.sides=cb.checked?[...r.sides,s]:r.sides.filter(x=>x!==s);changed({rules:true});});label.append(cb,document.createTextNode(sideName[s]+'侧'));th.append(label);tr.append(th);});thead.append(tr);table.append(thead);const body=node('tbody');
     for(const [goal,title]of [['correct','唯一恢复'],['detect','不静默误读']]){
       const row=node('tr'),cell=node('td'),label=node('label','goal-check'),cb=node('input');cb.type='checkbox';cb.checked=r[goal+'Enabled']!==false;cb.setAttribute('aria-label','要求 '+(index+1)+' 启用'+title);cb.addEventListener('change',()=>{r[goal+'Enabled']=cb.checked;for(const s of SIDES)r.thresholds[s][goal]=cb.checked?(goal==='correct'?10:20):null;changed({rules:true});});label.append(cb,document.createTextNode(title+' ≤'));cell.append(label);row.append(cell);
       SIDES.forEach(s=>{const td=node('td'),input=node('input');input.type='number';input.min='0';input.max='100';input.step='1';input.value=r.thresholds[s][goal]??0;input.disabled=!r.sides.includes(s)||!cb.checked;input.dataset.ruleId=r.id;input.dataset.field='threshold';input.dataset.side=s;input.dataset.goal=goal;input.setAttribute('aria-label','要求 '+(index+1)+' '+sideName[s]+'侧'+title+'深度百分比');const update=()=>{const current=state.rules.find(x=>x.id===input.dataset.ruleId);if(!current||input.disabled)return;current.thresholds[s][goal]=Math.min(100,Math.max(0,Number(input.value)||0));changed();};for(const event of ['input','change','blur'])input.addEventListener(event,update);td.append(input,node('span','threshold-label','%'));row.append(td);});body.append(row);
     }table.append(body);card.append(table);const previews=node('div','rule-preview-group');previews.dataset.rule=r.id;card.append(previews);const status=node('p','rule-status','修改后自动检查');status.dataset.rule=r.id;card.append(status);host.append(card);
   });$('#rules-summary').textContent=state.rules.length+' 条要求 · 分别检查';
 }
 function renderRuleStatuses(){
   $$('.rule-status').forEach(n=>{const rows=state.analysis?.ruleResults.filter(r=>r.id===n.dataset.rule)||[],bad=rows.reduce((sum,r)=>sum+r.conflictCount,0),pending=rows.some(r=>!r.exact);n.className='rule-status '+(bad?'bad':pending?'':'good');n.textContent=!rows.length?'没有启用验证目标；完好字形的唯一性仍会检查。':bad?'找到 '+bad+' 项冲突，见第 5 步反例。':pending?'当前未发现冲突，但枚举尚未完成，不能判通过。':'这条要求的已启用目标全部通过。';});
 }
 function renderRulePreviews(){
   $$('.rule-preview-group').forEach(host=>{empty(host);const r=state.rules.find(x=>x.id===host.dataset.rule),p=state.glyphs[state.selected];if(!r||p===undefined)return;
     for(const goal of ['correct','detect']){
       if(r[goal+'Enabled']===false)continue;const sides=r.sides.filter(s=>r.thresholds[s]?.[goal]!==null);if(!sides.length)continue;
       const scenarios=r.mode==='together'?[Object.fromEntries(sides.map(s=>[s,r.thresholds[s][goal]]))]:sides.map(s=>({[s]:r.thresholds[s][goal]}));
       scenarios.forEach(depths=>{const cover=D.coverFor(state.layout,depths),figure=node('figure'),g=node('div','rule-preview-canvas');g.append(makeSVG(state.layout,p,{cover,aria:'字符 '+state.selected+' 在 '+cover.description+' 之后的真实裁切'}));figure.append(g,node('figcaption','',state.selected+' · '+(goal==='correct'?'恢复':'检测')+' '+cover.description));host.append(figure);});
     }
   });
 }
 function renderTarget(){
   const sel=empty($('#target-character'));state.labels.forEach(l=>selectOption(sel,l,l));sel.value=state.targetSelected;const label=state.targetSelected;
   $('#target-source').value=state.targets[label]===undefined?'independent':'custom';
   if(!label){empty($('#target-canvas'));empty($('#target-segments'));return;}
   const toggle=i=>{state.targets[label]=targetMask(label)^bit(i);changed({targets:true});};draw($('#target-canvas'),targetMask(label),{reference:true,edit:toggle,labels:true,aria:'单独编辑 '+label+' 的期望字形'});segmentButtons($('#target-segments'),targetMask(label),toggle,{all:true});
   $('#expectation-summary').textContent=Object.keys(state.targets).length+' 个手动画目标 · 其余用独立模板';
 }
 function renderSegmentWeights(){
   const box=empty($('#segment-weights'));state.layout.segments.forEach(s=>{const label=node('label','',s.id),input=node('input');input.type='number';input.min='0';input.max='10';input.step='0.1';input.value=state.weights.segmentWeights[s.id]??globalThis.COV?.WEIGHTS[s.id]??1;input.setAttribute('aria-label',s.id+' 段重要程度');input.addEventListener('change',()=>{state.weights.segmentWeights[s.id]=Math.max(0,Math.min(10,Number(input.value)||0));input.value=state.weights.segmentWeights[s.id];changed();});label.append(input);box.append(label);});
 }
 function renderOverview(){const box=empty($('#d-overview')),a=state.analysis;[[D.popcount(D.activeMask(state.layout)),'根独立段'],[state.labels.length,'个字符'],[state.rules.length,'条容错要求'],[a?.conflictCount??'—','项冲突']].forEach(([v,t])=>{const n=node('span');n.append(node('strong','',v),document.createTextNode(t));box.append(n);});}
 function renderActual(){
   const selected=state.selected,p=state.glyphs[selected];$('#actual-label').textContent=selected||'未选字符';
   if(p===undefined){empty($('#actual-canvas'));empty($('#actual-segments'));empty($('#actual-gallery'));empty($('#glyph-detail'));return;}
   const toggle=i=>{state.glyphs[selected]^=bit(i);changed();};draw($('#actual-canvas'),p,{edit:toggle,labels:true,aria:'编辑实际字符 '+selected});segmentButtons($('#actual-segments'),p,toggle);
   const box=empty($('#actual-gallery'));for(const g of state.analysis.perGlyph){const b=node('button','actual-card'+(g.label===selected?' selected':'')+(g.pass===false?' failed':'')),similarity=g.metrics.compositeScore??g.metrics.score??null;
     if(similarity!==null)b.style.backgroundColor=`hsl(48 66% ${97-Math.min(1,Math.max(0,1-similarity))*20}%)`;
     b.setAttribute('aria-label','编辑 '+g.label+'，'+(g.pass===false?'容错未通过':g.pass===null?'验证未完成':'容错通过')+'，期望模型匹配 '+percent(similarity));b.setAttribute('aria-pressed',String(g.label===selected));const thumb=node('div','actual-thumb');thumb.append(makeSVG(state.layout,g.pattern,{aria:g.label}));b.append(thumb,node('span','actual-card-label',g.label),node('span','actual-card-meta',g.pass===false?'⚑ '+g.errors.length+' 项冲突':g.pass===null?'待验证':'容错通过'),node('span','actual-card-meta','模型匹配 '+percent(similarity)));b.addEventListener('click',()=>{state.selected=g.label;renderActual();renderWitnesses();});box.append(b);
   }
   const g=state.analysis.perGlyph.find(x=>x.label===selected),detail=empty($('#glyph-detail'));if(g){const add=(l,v)=>{const row=node('div','glyph-metric');row.append(node('span','',l),node('strong','',v));detail.append(row);};add('期望模型匹配',percent(g.metrics.compositeScore??g.metrics.score));add('原距离基线分数',metric(g.metrics.score));add('模板几何重叠',percent(g.similarity));add('完整 / 遮挡距离',(g.metrics.visibleDistance?.toFixed(2)??'—')+' / '+(g.metrics.occludedDistance?.toFixed(2)??'—'));add('最近期望',g.nearest?.labels?.join(' / ')||'未定义');add('实际拓扑',g.topology.components+' 个连通块，'+g.topology.holes+' 个洞');if(g.metrics.targetTopology)add('期望拓扑',g.metrics.targetTopology.components+' 个连通块，'+g.metrics.targetTopology.holes+' 个洞');detail.append(node('p','','匹配是模型分数，不是识别正确率。几何重叠只比较模板像素位置，可能惩罚熟悉的数码管排版。'));if(g.errors.length)detail.append(node('p','glyph-error','未满足 '+g.errors.length+' 项容错检查；反例见下方。'));for(const w of g.warnings.slice(0,2))detail.append(node('p','',w));}renderRulePreviews();
 }
 function renderResults(){
   const a=state.analysis,box=empty($('#d-verdict'));box.className='designer-verdict'+(a.ok===true?' good':a.ok===null?' pending':'');
   box.append(node('strong','',a.ok===true?'当前设计满足所有已启用容错要求':a.ok===null?'暂未发现冲突，但验证尚未完成':'还有 '+a.conflictCount+' 项容错冲突需要解决'),node('span','',a.ok===true?'这意味着知道模型与字库的理想解码器可以满足当前约束；期望匹配与真实人眼识别仍是不同证据。':a.ok===null?'部分未知遮挡组合超出精确枚举边界。未发现反例不等于已证明通过。':'红框标出涉及冲突的字符。调整硬件、字符范围、要求或字形，都可能改变答案。黄色偏离提示独立于红色错误。'));
   $('#result-summary').textContent=a.ok===true?'容错通过 · 模型分 '+metric(a.meanScore):a.ok===null?'验证未完成':a.conflictCount+' 项冲突';
   const results=empty($('#rule-results'));a.ruleResults.forEach(r=>results.append(node('span','rule-result-chip'+(r.ok===true?' good':r.ok===null?' pending':''),(r.id==='intact'?'完好字形':r.id)+' · '+(r.goal==='correct'?'恢复':'检测')+'：'+(r.conflictCount?r.conflictCount+' 项冲突':r.exact?'通过':'未完成'))));renderWitnesses();
 }
 function bitNames(p){p=BigInt(p??0n);return state.layout.segments.filter((s,i)=>p&bit(i)).map(s=>s.id).join('、')||'无';}
 function renderWitnesses(){
   const box=empty($('#designer-witnesses'));if(!state.analysis)return;
   const pairs=[...state.analysis.pairs].sort((a,b)=>Number(b.a===state.selected||b.b===state.selected)-Number(a.a===state.selected||a.b===state.selected)).slice(0,4);
   pairs.forEach(w=>{const c=node('article','designer-witness');c.append(node('h4','',w.a+' / '+w.b+' · '+(w.ruleId==='intact'?'完好就相同':w.ruleId+' '+(w.goal==='correct'?'恢复反例':'静默误读反例'))));const flow=node('div','witness-flow');const fig=(p,label)=>{const f=node('figure'),g=node('div','witness-glyph');g.append(makeSVG(state.layout,p,{aria:label}));f.append(g,node('figcaption','',label));return f;};flow.append(fig(state.glyphs[w.a],w.a+' 原图'),node('span','','↘'),fig(w.observation,'相同位观测'),node('span','','↙'),fig(state.glyphs[w.b],w.b+' 原图'));c.append(flow);
     const description=node('p');description.append(document.createTextNode(w.a+'：'+(w.coverA?.description||'无遮挡')+'；改变 '+bitNames(w.faultA)+' 段'),node('br'),document.createTextNode(w.b+'：'+(w.coverB?.description||'无遮挡')+'；改变 '+bitNames(w.faultB)+' 段'));c.append(description);const inspect=node('button','text-button','在画布上查看几何遮挡 ↗');inspect.addEventListener('click',()=>showWitnessPreview(c,w));c.append(inspect);box.append(c);
   });
 }
 function showWitnessPreview(card,w){
   card.querySelector('.geometry-witness')?.remove();const row=node('div','geometry-witness');row.style.display='flex';row.style.gap='20px';row.style.marginTop='14px';
   for(const [label,cover,fault]of [[w.a,w.coverA,w.faultA],[w.b,w.coverB,w.faultB]]){const figure=node('figure'),g=node('div','witness-glyph');g.append(makeSVG(state.layout,state.glyphs[label]^BigInt(fault??0n),{cover,aria:label+' 遮挡故障后'}));figure.append(g,node('figcaption','fine-print',label+' 的几何残留'));row.append(figure);}card.append(row);
 }
 async function search(){
   syncRuleControls();
   if(!state.labels.length){say('先至少选择一个字符。',true);return;}cancelSearch();const job=++jobId,revision=state.revision,controller=new AbortController();searchController=controller;$('#d-search').disabled=true;$('#d-cancel-search').hidden=false;$('#search-progress').textContent='开始按当前画布、逐侧阈值、故障与期望搜索……';
   try{
     const result=await D.search(state.layout,[...state.labels],state.rules,{...options(),budgetMs:Number($('#d-search-budget').value),signal:controller.signal,seeds:[cloneGlyphs(state.glyphs)],onProgress:p=>{if(job!==jobId)return;$('#search-progress').textContent='已探索 '+p.iterations+' 次 · 当前最好 '+(p.conflicts??'—')+' 项冲突 · 用时 '+((p.elapsedMs??0)/1000).toFixed(1)+' 秒。可随时停止。';}});
     if(job!==jobId||revision!==state.revision)return;const candidate={...result,name:'候选 '+String.fromCharCode(65+state.candidates.length%26),revision,layout:state.layout,labels:[...state.labels]};state.candidates.unshift(candidate);state.candidates=state.candidates.slice(0,4);renderCandidates();
     $('#search-progress').textContent=(result.status==='cancelled'?'已停止，保留截至停止时找到的最好候选。':result.provedImpossible?'当前约束已被必要界限或穷举证明无完整解。':result.analysis.ok===true?'找到了满足当前硬约束的候选。':'预算内仍未解决全部冲突，展示当前最好候选。')+' '+(result.note||'')+' 搜索目标是设计代理，不代表人眼可读性的全局最优。';
   }catch(e){if(job===jobId)$('#search-progress').textContent='搜索未能完成：'+e.message;}
   finally{if(job===jobId){searchController=null;$('#d-search').disabled=false;$('#d-cancel-search').hidden=true;}}
 }
 function renderCandidates(){
   const box=empty($('#search-candidates'));state.candidates.forEach(c=>{const card=node('article','candidate-card');card.append(node('h4','',c.name+' · '+(c.status==='cancelled'?'已停止 / ':'')+(c.analysis.ok===true?'满足原条件':c.analysis.ok===null?'验证未完成':'仍有 '+c.analysis.conflictCount+' 项冲突')));const preview=node('div','candidate-preview');(c.labels||Object.keys(c.glyphs)).slice(0,8).filter(l=>c.glyphs[l]!==undefined).forEach(l=>{const g=node('div');g.append(makeSVG(c.layout||state.layout,c.glyphs[l],{aria:l}));preview.append(g);});card.append(preview,node('p','','模型均分 '+metric(c.analysis.meanScore)+'；'+c.iterations+' 次探索。'+(c.revision===state.revision?'与当前条件一致。':'条件已改变：这是历史候选，载入后将按线段 ID 映射并按新条件重验。')));const b=node('button','small-button','载入这组字形，再继续设计');b.addEventListener('click',()=>{state.glyphs=Object.fromEntries(state.labels.map(l=>[l,(c.glyphs[l]===undefined?D.seedGlyph(state.layout,l):remap(c.glyphs[l],c.layout||state.layout,state.layout))&D.activeMask(state.layout)]));changed();say('已载入 '+c.name+'，当前条件下重新验证。期望字形未被更改。');});card.append(b);box.append(card);});
 }
 function documentData(){syncRuleControls();return{schema:'cov7seg-designer-v2',layoutConfig:{...state.config,disabled:[...state.config.disabled]},pool:[...state.pool],labels:[...state.labels],caseInsensitive:state.caseInsensitive,glyphs:state.glyphs,targets:state.targets,rules:state.rules,weights:state.weights};}
 function load(data){
   if(!data||data.schema!=='cov7seg-designer-v2')throw Error('不是本设计器的 v2 设计文件。');const layout=D.buildLayout(data.layoutConfig);
   if(!Array.isArray(data.labels)||!data.labels.length||data.labels.length>128||new Set(data.labels).size!==data.labels.length||data.labels.some(l=>typeof l!=='string'||!l||l.length>16||['__proto__','constructor','prototype'].includes(l)))throw Error('字符列表无效。');
   const pool=[...new Set([...(Array.isArray(data.pool)?data.pool:[]),...data.labels])];if(pool.length>128||pool.some(l=>typeof l!=='string'||!l||l.length>16||/[\u0000-\u001f]/.test(l)||['__proto__','constructor','prototype'].includes(l)))throw Error('备选字符池无效或超过 128 个字符。');
   if(!data.glyphs||Object.keys(data.glyphs).length!==data.labels.length||data.labels.some(l=>data.glyphs[l]===undefined))throw Error('实际字形与字符列表不一致。');const glyphs=D.normalizeGlyphs(layout,data.glyphs),rules=D.normalizedRules(data.rules??[]).map(r=>({...r,correctEnabled:r.correctEnabled??true,detectEnabled:r.detectEnabled??r.sides.some(s=>r.thresholds[s]?.detect!==null),thresholds:Object.fromEntries(SIDES.map(s=>[s,r.thresholds[s]??{correct:r.correctEnabled===false?null:10,detect:r.detectEnabled===false?null:20}]))}));if(rules.length>12)throw Error('最多导入 12 条容错要求。');if(new Set(rules.map(r=>r.id)).size!==rules.length)throw Error('规则 ID 不能重复。');
   const targets=cloneGlyphs(data.targets??{});if(Object.keys(targets).some(l=>!data.labels.includes(l)))throw Error('期望目标包含未选字符。');for(const p of Object.values(targets))if(p<0n||p>>BigInt(layout.segments.length))throw Error('期望目标超出画布。');
   const weights={lambdaVisible:1,lambdaOccluded:.3,topologyWeight:.2,nearestWeight:.2,segmentWeights:{},...data.weights};D.analyze(layout,glyphs,rules,{targets,weights,maxCoverStates:128,maxObservations:30000});
   cancelSearch();state.config={...layout.config};state.layout=layout;state.pool=pool;state.labels=[...data.labels];state.glyphs=glyphs;state.targets=targets;state.rules=rules;state.weights=weights;state.caseInsensitive=!!data.caseInsensitive;state.selected=state.labels[0];state.targetSelected=state.labels[0];state.candidates=[];
   setInputs();changed({all:true});renderCandidates();say('已导入完整画布、硬件、字符、独立目标、容错与权重。');
 }
 function setInputs(){
   $('#d-cols').value=state.config.cols-1;$('#d-rows').value=state.config.rows-1;$('#d-orthogonal').checked=state.config.orthogonal!==false;$('#d-forward').checked=['forward','both'].includes(state.config.diagonals);$('#d-back').checked=['back','both'].includes(state.config.diagonals);$('#d-points').checked=!!state.config.points;$('#d-case-insensitive').checked=state.caseInsensitive;
   for(const [id,k]of [['lambda-visible','lambdaVisible'],['lambda-occluded','lambdaOccluded'],['topology-weight','topologyWeight'],['nearest-weight','nearestWeight']]){$('#d-'+id).value=state.weights[k];$('#'+id+'-value').value=Number(state.weights[k]).toFixed(1);}
 }
 function loadArchive(detail){
   cancelSearch();state.config={cols:2,rows:3,orthogonal:true,diagonals:'none',disabled:[]};state.layout=D.buildLayout(state.config);state.pool=[...detail.labels];state.labels=[...detail.labels];state.targets={};state.glyphs=Object.fromEntries(state.labels.map(l=>[l,[...detail.glyphs[l]].reduce((p,v,i)=>v==='1'?p|bit(i):p,0n)]));const r=rule();r.sides=[...SIDES];r.thresholds=Object.fromEntries(SIDES.map(s=>[s,{correct:10,detect:10}]));state.rules=[r];state.selected=state.labels.includes('8')?'8':state.labels[0];state.targetSelected=state.selected;state.candidates=[];state.caseInsensitive=false;setInputs();changed({all:true});renderCandidates();openStep('step-result');say('已载入研究字库“'+detail.name+'”。独立期望仍为标准模板，按四向 10% 几何边缘遮挡重新验证；原论文式边框结论与此几何模型分别记录。');
 }
 function bind(){
   ['d-cols','d-rows','d-orthogonal','d-forward','d-back','d-points'].forEach(id=>$('#'+id).addEventListener('change',changeLayout));
   ['d-cols','d-rows'].forEach(id=>{for(const event of ['input','blur'])$('#'+id).addEventListener(event,()=>{if($('#'+id).value&&$('#'+id).validity.valid)changeLayout();});});
   $('#d-enable-all').addEventListener('click',()=>{state.config.disabled=[];state.layout=D.buildLayout(state.config);changed({all:true});});$('#d-disable-all').addEventListener('click',()=>{state.config.disabled=state.layout.segments.map(s=>s.id);state.layout=D.buildLayout(state.config);state.glyphs=Object.fromEntries(state.labels.map(l=>[l,0n]));changed({all:true});});
   const presets={digits:'0123456789',scientific:'−E.',hex:'0123456789ABCDEF',upper:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',lower:'abcdefghijklmnopqrstuvwxyz',base64:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'};
   $$('[data-add-charset]').forEach(b=>b.addEventListener('click',()=>addCharacters(presets[b.dataset.addCharset])));$('#d-add-chars').addEventListener('click',()=>{addCharacters($('#d-custom-chars').value);$('#d-custom-chars').value='';});$('#d-custom-chars').addEventListener('keydown',e=>{if(e.key==='Enter')$('#d-add-chars').click();});
   $('#d-select-all').addEventListener('click',()=>{state.labels=[...state.pool];syncCharacters();});$('#d-select-none').addEventListener('click',()=>{state.labels=[];syncCharacters();});$('#d-case-insensitive').addEventListener('change',()=>{const oldGlyphs=state.glyphs,oldTargets=state.targets;state.caseInsensitive=$('#d-case-insensitive').checked;state.pool=[...new Set(state.pool.map(canonical))];state.labels=[...new Set(state.labels.map(canonical))];state.glyphs={};state.targets={};for(const [l,p]of Object.entries(oldGlyphs))if(state.glyphs[canonical(l)]===undefined)state.glyphs[canonical(l)]=p;for(const [l,p]of Object.entries(oldTargets))if(state.targets[canonical(l)]===undefined)state.targets[canonical(l)]=p;syncCharacters();});
   $('#d-add-rule').addEventListener('click',()=>{if(state.rules.length>=12){say('一次最多 12 条要求。可以合并相同故障条件的逐侧阈值。',true);return;}state.rules.push(rule());changed({rules:true});});
   $('#target-character').addEventListener('change',()=>{state.targetSelected=$('#target-character').value;renderTarget();});$('#target-source').addEventListener('change',()=>{if($('#target-source').value==='independent')delete state.targets[state.targetSelected];else state.targets[state.targetSelected]=targetMask(state.targetSelected);changed({targets:true});});$('#d-reset-target').addEventListener('click',()=>{delete state.targets[state.targetSelected];changed({targets:true});});$('#d-target-from-current').addEventListener('click',()=>{if(!state.targetSelected)return;state.targets[state.targetSelected]=state.glyphs[state.targetSelected];changed({targets:true});say('已按你的明确操作，把这个实际字形设为独立目标。以后编辑实际字形不会跟着改变目标。');});
   for(const [id,k]of [['lambda-visible','lambdaVisible'],['lambda-occluded','lambdaOccluded'],['topology-weight','topologyWeight'],['nearest-weight','nearestWeight']])$('#d-'+id).addEventListener('input',()=>{state.weights[k]=Number($('#d-'+id).value);$('#'+id+'-value').value=state.weights[k].toFixed(1);changed();});
   $('#d-copy-target').addEventListener('click',()=>{if(!state.selected)return;state.glyphs[state.selected]=targetMask(state.selected)&D.activeMask(state.layout);changed();});$('#d-start-from-targets').addEventListener('click',()=>{state.glyphs=Object.fromEntries(state.labels.map(l=>[l,targetMask(l)&D.activeMask(state.layout)]));changed();say('实际字形已从独立期望重新开始，期望本身未改变。');});$('#d-reset-actual').addEventListener('click',()=>{state.glyphs=Object.fromEntries(state.labels.map(l=>[l,0n]));changed();});
   $$('[data-next]').forEach(b=>b.addEventListener('click',()=>{syncRuleControls();validate();const current=b.closest('.designer-step');if(current)current.open=false;openStep(b.dataset.next);}));$('#study-expectations').addEventListener('click',()=>openStep('step-expectation'));
   $('#d-search').addEventListener('click',search);$('#d-cancel-search').addEventListener('click',()=>{searchController?.abort();$('#search-progress').textContent='正在停止，稍后保留当前最好候选……';});
   $('#d-save').addEventListener('click',()=>{try{localStorage.setItem(STORE,D.serialize(documentData()));$('#d-restore').hidden=false;say('完整设计已保存到本机。');}catch(e){say('本机保存失败，请导出 JSON 文件。',true);}});$('#d-restore').addEventListener('click',()=>{try{load(D.deserialize(localStorage.getItem(STORE)||''));}catch(e){say('恢复失败：'+e.message,true);}});try{$('#d-restore').hidden=!localStorage.getItem(STORE);}catch(e){}
   $('#d-export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([D.serialize(documentData())],{type:'application/json'})),a=node('a');a.href=url;a.download='cov7seg-custom-design.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('已导出完整自定义设计，包含硬件、实际字形、独立目标、所有容错规则与权重。');});$('#d-import').addEventListener('click',()=>$('#d-file').click());$('#d-file').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>1048576)throw Error('文件超过 1 MB。');load(D.deserialize(await file.text()));}catch(err){say('导入失败：'+err.message,true);}finally{e.target.value='';}});
   window.addEventListener('cov-load-research',e=>{try{loadArchive(e.detail);}catch(err){say('研究字库载入失败：'+err.message,true);}});
 }
 function intro(){
   const layout=D.buildLayout({cols:2,rows:3}),six=125n,eight=127n,cover={depths:{right:10}};
   empty($('#intro-glyph')).append(makeSVG(layout,six,{cover,aria:'右侧被遮挡的数字，请猜原字符'}));empty($('#reveal-six')).append(makeSVG(layout,six,{aria:'数字6'}));empty($('#reveal-eight')).append(makeSVG(layout,eight,{aria:'数字8'}));empty($('#reveal-same')).append(makeSVG(layout,six,{cover,aria:'6和8右侧被挡后的同一观测'}));
   $$('[data-guess]').forEach(b=>b.addEventListener('click',()=>{$$('[data-guess]').forEach(x=>x.classList.toggle('chosen',x===b));$('#intro-feedback').textContent=b.dataset.guess==='unknown'?'你发现了关键：仅凭这些可见段，无法确定。':'选 '+b.dataset.guess+' 说得通，但另一个数字也会留下相同图案。';$('#intro-reveal').hidden=false;}));$('#intro-reveal').addEventListener('click',()=>{$('#intro-explanation').hidden=false;$('#intro-explanation').scrollIntoView({behavior:'smooth',block:'center'});});$('#intro-to-challenge').addEventListener('click',()=>{state.selected=state.labels.includes('8')?'8':state.labels[0];openStep('step-layout');});
 }
 if(!D){say('设计器核心未加载，请检查 lab/designer-core.js。',true);return;}
 state.layout=D.buildLayout(state.config);state.glyphs=D.seedGlyphs(state.layout,state.labels);state.rules=[rule()];bind();intro();setInputs();renderHardware();renderCharacters();renderRules();renderTarget();renderSegmentWeights();validate();
 globalThis.CovDesigner={state,validate,search,load,loadArchive,documentData,openStep,renderHardware};
})();
