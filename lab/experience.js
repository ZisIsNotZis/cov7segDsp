/* Presentation and design workshop. All verification is delegated to SignalLab. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const Catalog = globalThis.SignalCatalog, Channel = globalThis.SignalLab;
  const STORE = 'cov7seg-design-v1';
  const names = {top:'上',right:'右',bottom:'下',left:'左'};
  const state = {layout:'seven',charset:'decimal',font:'standard',glyphs:{},baseline:{},selected:'8',preview:'right',mission:'repair',analysis:null};
  const controls = ['cover','fault','budget','goal','known'];
  let renderTimer, generation = 0;

  function el(tag, cls, text) { const n=document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=text; return n; }
  function option(select,value,label) { const n=el('option','',label);n.value=value;select.append(n); }
  function clear(n) { n.replaceChildren(); return n; }
  function currentLayout() { return Catalog.layouts[state.layout]; }
  function fonts() { return Catalog.fontsFor(state.layout,state.charset); }
  function font() { return fonts().find(f=>f.id===state.font)||fonts()[0]; }
  function bitNames(mask,layout=currentLayout()) { return layout.segments.filter((s,i)=>mask>>i&1).map(s=>s.id).join('、')||'无'; }
  function coverName(mask,layout=currentLayout()) { if(!mask)return '无遮挡';const exact=Object.entries(layout.covers).find(([k,m])=>m===mask);if(exact)return names[exact[0]]+'侧遮挡';if(mask===(layout.covers.left|layout.covers.right))return '左右同时遮挡';if(mask===Object.values(layout.covers).reduce((a,b)=>a|b,0))return '四侧同时遮挡';return '遮挡 '+bitNames(mask,layout); }
  function chosenCovers() {
    const c=currentLayout().covers;
    switch($('#cover-select').value){case 'none':return[0];case 'lr':return[c.left,c.right];case 'both':return[c.left|c.right];case 'all':return[c.left|c.right|c.top|c.bottom];case 'top':return[c.top];case 'lrt':return[c.left,c.right,c.top];default:return[c.top,c.right,c.bottom,c.left];}
  }
  function scenario() { return {covers:chosenCovers(),fault:$('#fault-select').value,budget:Number($('#budget-select').value),goal:$('#goal-select').value,coverKnown:$('#known-select').value==='known'}; }
  function glyphSVG(layout,pattern,{cover=0,edit=false,onToggle,label='字形',labels=false}={}) {
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('class','signal-glyph');svg.setAttribute('role',edit?'group':'img');svg.setAttribute('aria-label',label);
    layout.segments.forEach((s,i)=>{
      const pixel=s.pixel||s.x1===s.x2&&s.y1===s.y2;
      const line=document.createElementNS(ns,pixel?'circle':'line');
      if(pixel){line.setAttribute('cx',s.x1*100);line.setAttribute('cy',s.y1*100);line.setAttribute('r',s.pixel?8:3.3);}else{line.setAttribute('x1',s.x1*100);line.setAttribute('y1',s.y1*100);line.setAttribute('x2',s.x2*100);line.setAttribute('y2',s.y2*100);line.setAttribute('stroke-width',layout.segments.length>12?3.8:5.2);}
      const erased=!!(cover>>i&1),on=!!(pattern>>i&1);
      line.setAttribute('class','seg-line '+(erased?'seg-erased':on?'seg-on':'seg-off')+(edit?' seg-edit':''));
      if(pixel)line.setAttribute('style',erased?'fill:transparent;stroke:transparent':`fill:${on?'#ffd17d':'#314345'};stroke:none`);
      svg.append(line);
      if(edit){
        line.style.pointerEvents='none';
        const hit=document.createElementNS(ns,pixel?'circle':'polygon');
        if(pixel){hit.setAttribute('cx',s.x1*100);hit.setAttribute('cy',s.y1*100);hit.setAttribute('r',s.pixel?10:6);}
        else {const x1=s.x1*100,y1=s.y1*100,x2=s.x2*100,y2=s.y2*100,dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1,pad=4.5,px=-dy/len*pad,py=dx/len*pad;hit.setAttribute('points',`${x1+px},${y1+py} ${x2+px},${y2+py} ${x2-px},${y2-py} ${x1-px},${y1-py}`);}
        hit.setAttribute('class','seg-hit');hit.setAttribute('tabindex','0');hit.setAttribute('role','button');hit.setAttribute('aria-label',s.id+' 段，'+(on?'已点亮，点击关闭':'未点亮，点击开启'));hit.setAttribute('aria-pressed',String(on));hit.dataset.segment=s.id;
        hit.addEventListener('click',()=>onToggle(i));hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onToggle(i);}});svg.append(hit);
      }
      if(labels){const t=document.createElementNS(ns,'text');t.setAttribute('x',(s.x1+s.x2)*50+2);t.setAttribute('y',(s.y1+s.y2)*50-3);t.setAttribute('class','seg-label');t.textContent=s.id;svg.append(t);}
    });return svg;
  }
  function draw(host,layout,pattern,opts) { clear(host).append(glyphSVG(layout,pattern,opts)); }
  function status(text,error=false) { $('#design-status').textContent=text;$('#design-status').classList.toggle('error-message',error); }
  function intro() {
    const l=Catalog.layouts.seven,C=globalThis.COV,p6=C.maskOf(C.STANDARD['6']),p8=C.maskOf(C.STANDARD['8']);
    draw($('#intro-glyph'),l,p6,{cover:l.covers.right,label:'右边被遮住的数码管；请选择可能的原数字'});
    draw($('#reveal-six'),l,p6,{label:'标准数字 6'});draw($('#reveal-eight'),l,p8,{label:'标准数字 8'});draw($('#reveal-same'),l,p6,{cover:l.covers.right,label:'6 和 8 右边被遮后完全相同'});
    $$('[data-guess]').forEach(b=>b.addEventListener('click',()=>{
      $$('[data-guess]').forEach(x=>x.classList.toggle('chosen',x===b));
      $('#intro-feedback').textContent=b.dataset.guess==='unknown'?'你发现了关键：仅凭可见部分，确实无法确定。':'选 '+b.dataset.guess+' 完全说得通。但另一个数字，也能留下完全相同的图案。';
      $('#intro-reveal').hidden=false;
    }));
    $('#intro-reveal').addEventListener('click',()=>{
      $('#intro-explanation').hidden=false;$('#intro-reveal').textContent='原来如此：差别恰好被挡住了 ↓';
      $('#intro-explanation').scrollIntoView({behavior:'smooth',block:'center'});
    });
    $('#intro-to-challenge').addEventListener('click',()=>setMission('repair'));
  }
  function populate() {
    Object.entries(Catalog.layouts).forEach(([key,l])=>option($('#layout-select'),key,l.name));
    Object.entries(Catalog.charsets).forEach(([key,c])=>option($('#charset-select'),key,c.name));
    $('#layout-select').value=state.layout;$('#charset-select').value=state.charset;
    $('#layout-select').addEventListener('change',()=>{state.layout=$('#layout-select').value;state.mission='custom';loadFont('standard');});
    $('#charset-select').addEventListener('change',()=>{state.charset=$('#charset-select').value;state.mission='custom';loadFont('standard');});
    $('#font-select').addEventListener('change',()=>loadFont($('#font-select').value));
    controls.forEach(k=>$('#'+k+'-select').addEventListener('change',()=>{state.mission='custom';scheduleRender(true);}));
    $$('[data-mission]').forEach(b=>b.addEventListener('click',()=>setMission(b.dataset.mission)));
    $('#reset-glyph').addEventListener('click',()=>{state.glyphs[state.selected]=state.baseline[state.selected];scheduleRender();});
    $('#reset-font').addEventListener('click',()=>{state.glyphs={...state.baseline};scheduleRender();status('已恢复当前参考起点；其余场景条件保持不变。');});
    $('#try-detection').addEventListener('click',()=>{setMission('fault');$('#goal-select').value='detect';scheduleRender();$('#workshop').scrollIntoView({behavior:'smooth'});});
    $('#try-unknown').addEventListener('click',()=>{setMission('sides');$('#known-select').value='unknown';$('#advanced').open=true;scheduleRender();$('#workshop').scrollIntoView({behavior:'smooth'});});
    $('#try-layouts').addEventListener('click',()=>{setMission('diagonal');$('#workshop').scrollIntoView({behavior:'smooth'});});
    $$('[data-capacity]').forEach(b=>b.addEventListener('click',()=>{
      setMission(b.dataset.capacity==='lr'?'sides':'fault');
      if(b.dataset.capacity==='both'){$('#cover-select').value='both';$('#budget-select').value='0';}
      if(b.dataset.capacity==='detect')$('#goal-select').value='detect';
      if(b.dataset.capacity==='flip')$('#fault-select').value='flip';
      state.mission='custom';scheduleRender(true);$('#workshop').scrollIntoView({behavior:'smooth'});
    }));
    $('#try-hamming').addEventListener('click',()=>{
      setMission('diagonal');state.charset='hex';$('#charset-select').value='hex';loadFont('hamming');
      $('#workshop').scrollIntoView({behavior:'smooth'});status('已载入 16 字符纠错编码：左右任一侧遮挡 + 至多一次未知翻转。验证通过的是编码，不是人眼可读性。');
    });
    loadFont('standard');
  }
  function loadFont(id) {
    const list=fonts(),f=list.find(x=>x.id===id)||list[0];state.font=f.id;state.glyphs={...f.glyphs};state.baseline={...f.glyphs};
    if(!(state.selected in state.glyphs))state.selected=Object.keys(state.glyphs)[0];
    clear($('#font-select'));list.forEach(f=>option($('#font-select'),f.id,f.name));$('#font-select').value=state.font;
    scheduleRender(true);
  }
  function setMission(id) {
    state.mission=id;state.charset='decimal';state.layout=id==='diagonal'?'cell-x11':'seven';state.selected='8';state.preview='right';
    $('#layout-select').value=state.layout;$('#charset-select').value=state.charset;
    $('#cover-select').value=id==='fault'?'lr':id==='diagonal'?'lr':id==='sides'?'lr':'four';
    $('#fault-select').value=id==='diagonal'?'flip':'off';$('#budget-select').value=['fault','diagonal'].includes(id)?'1':'0';$('#goal-select').value='correct';$('#known-select').value='known';$('#advanced').open=['fault','diagonal'].includes(id);
    loadFont(id==='diagonal'?'standard':'standard');
    status(id==='diagonal'?'先看常规字形是否能抗故障，再从参考起点选择“纠错编码 · 借助内部冗余”进行比较。':'新的实验已准备好。改一根段，观察具体变化。');
  }
  function scheduleRender(references=false) {
    clearTimeout(renderTimer);const mine=++generation;
    renderTimer=setTimeout(()=>{if(mine!==generation)return;render(references);},20);
  }
  function render(references=false) {
    try {
      state.analysis=Channel.analyze(currentLayout(),state.glyphs,{...scenario(),maxWitnesses:24});
      renderEditor();renderGallery();renderVerdict();renderGuidance();if(references)renderReferences();
      $$('[data-mission]').forEach(b=>b.classList.toggle('active',b.dataset.mission===state.mission));
    } catch(e) { $('#verdict-title').textContent='暂时无法验证';$('#verdict-explanation').textContent=e.message;status('验证遇到问题：'+e.message,true); }
  }
  function renderEditor() {
    const l=currentLayout(),p=state.glyphs[state.selected];$('#selected-label').textContent=state.selected;
    draw($('#editor-glyph'),l,p,{edit:true,labels:true,label:'编辑 '+state.selected+' 的发光段',onToggle:i=>{
      state.glyphs[state.selected]^=1<<i;render();
      const target=$('#editor-glyph [data-segment="'+l.segments[i].id+'"]');if(target)target.focus({preventScroll:true});
    }});
    $('#edit-count').textContent=Channel.popcount(p^(state.baseline[state.selected]??0))+' 段修改';
    const segments=clear($('#segment-controls'));
    l.segments.forEach((seg,i)=>{const b=el('button',p>>i&1?'on':'',seg.id);b.type='button';b.setAttribute('aria-label','切换 '+seg.id+' 段');b.setAttribute('aria-pressed',String(!!(p>>i&1)));b.addEventListener('click',()=>{state.glyphs[state.selected]^=1<<i;render();$('#segment-controls button[data-index="'+i+'"]').focus({preventScroll:true});});b.dataset.index=i;segments.append(b);});
    const preview=clear($('#preview-covers'));
    [['none','无'],['top','上'],['right','右'],['bottom','下'],['left','左'],['both','左右'],['all','四侧']].forEach(([k,name])=>{const b=el('button',k===state.preview?'active':'',name);b.setAttribute('aria-pressed',String(k===state.preview));b.addEventListener('click',()=>{state.preview=k;renderEditor();});preview.append(b);});
    const cover=state.preview==='none'?0:state.preview==='both'?l.covers.left|l.covers.right:state.preview==='all'?Object.values(l.covers).reduce((a,b)=>a|b,0):l.covers[state.preview];
    draw($('#preview-glyph'),l,p,{cover,label:state.selected+' 在'+coverName(cover)+'之后的图案'});
    $('#preview-caption').textContent=coverName(cover)+' · 预览不加入故障';
  }
  function renderGallery() {
    const box=clear($('#font-gallery')),l=currentLayout(),bad=new Set(state.analysis.conflicts.flatMap(w=>[w.a,w.b]));
    for(const [label,p]of Object.entries(state.glyphs)){
      const b=el('button','glyph-card'+(label===state.selected?' selected':'')+(bad.has(label)?' conflicting':''));b.setAttribute('aria-label','选择字符 '+label);b.setAttribute('aria-pressed',String(label===state.selected));
      const thumb=el('div','glyph-thumb');thumb.append(glyphSVG(l,p,{label:'字符 '+label}));b.append(thumb,el('span','glyph-card-label',label));b.addEventListener('click',()=>{state.selected=label;renderEditor();renderGallery();});box.append(b);
    }
    $('#glyph-count').textContent=Object.keys(state.glyphs).length+' 个';
    const f=font(),missing=f.missingSymbols?.length?' 缺少独立符号：'+f.missingSymbols.join('、')+'。':'';
    $('#font-note').textContent=(f.note||'')+missing+' 结构约定：'+(l.note||'');
    const changed=Object.entries(state.glyphs).reduce((n,[k,p])=>n+Channel.popcount(p^(state.baseline[k]??0)),0);
    const summary=clear($('#design-summary'));
    [[Object.keys(state.glyphs).length,'个字符'],[l.segments.length,'个独立段'],[changed,'段修改'],[state.analysis.totalPairs,'对冲突']].forEach(([n,t])=>{const d=el('span');d.append(el('strong','',n),document.createTextNode(t));summary.append(d);});
  }
  function renderGuidance() {
    const n=state.analysis.totalPairs;
    if(state.mission==='repair'){
      const pair=Channel.analyze(currentLayout(),{'6':state.glyphs['6'],'8':state.glyphs['8']},scenario()).ok;
      $('#mission-guidance').textContent=pair?(n?'第一步做到了：6 和 8 已能区分。但整套数字还有 '+n+' 对冲突。试着解决一个，再检查有没有产生新冲突。':'你做到了：整套数字通过了当前四向遮挡检查。再看看修改后的字形还像原来的数字吗？'):'第一步：选中 8，试着改变一根遮挡后仍看得见的段，让它和 6 不同。右侧被遮住的段改了也没有用。橙色点标出出现在反例中的字符。';
    }else if(state.mission==='sides')$('#mission-guidance').textContent='假设只有左、右两侧可能被挡。观察标准字形的冲突还剩哪些。只遮左右时，七段数学容量仍是 32；较少的限制不一定带来更大的最大容量。';
    else if(state.mission==='fault')$('#mission-guidance').textContent='重要边界：七段屏在“左右任一侧遮挡 + 至多一段坏灭”下，最多只能唯一恢复 6 种图案，放不下十个数字。先比较“发现异常”与“唯一恢复”，再试试增加内部段。';
    else if(state.mission==='diagonal')$('#mission-guidance').textContent='多出的内部斜线在这个边界遮挡模型中仍然可见。先检验常规字形，再载入“纠错编码 · 借助内部冗余”：它能抗左右单侧遮挡与一次未知翻转，但图案未必像数字。';
    else $('#mission-guidance').textContent='自由实验：每次只改变一个条件，更容易发现原因。验证穷举所选方向与至多 k 段故障的最坏情况，不是随机抽样。下方反例会告诉你具体哪两个字符无法区分。';
  }
  function renderVerdict() {
    const a=state.analysis,s=scenario(),missing=font().missingSymbols?.length;
    $('#verdict-title').textContent=a.ok?(s.goal==='detect'?'不会悄悄变成另一个完好字符':'每种观测，都能指向唯一字符'):'找到 '+a.totalPairs+' 对'+(s.goal==='detect'?'可能静默误读的字符':'无法唯一恢复的字符');
    $('#verdict-badge').textContent=a.ok?'PASS / 当前模型':'COUNTEREXAMPLE';$('#verdict-badge').classList.toggle('ok',a.ok);
    $('#verdict-explanation').textContent=a.ok?(s.goal==='detect'?'在选定场景下，允许的损坏不会产生另一个字符的完好观测。这不代表每个物理故障都能被发现，也不代表损坏后能唯一恢复。':'已检查所选字符的所有允许观测；没有两个原字符能产生同一个观测。这个结论假设解码器知道字库和模型，并不等于人眼能认出这些图案。'):(s.goal==='detect'?'存在这样的情况：一个字符损坏后，看起来和另一个完好字符相同。只看结果，无法察觉发生了误读。':'两个不同原字符，在允许的遮挡和故障下可能留下同一个观测。再好的解码器也无法总是唯一判断。');
    const list=clear($('#witness-list'));
    const ws=[...a.conflicts].sort((u,v)=>Number(v.a===state.selected||v.b===state.selected)-Number(u.a===state.selected||u.b===state.selected)).slice(0,4);
    ws.forEach(w=>list.append(witness(w)));
    $('#verification-note').textContent=(a.totalPairs>4?'这里展示 '+ws.length+' 个代表性反例；完整验证检查了所有字符对。 ':'')+'遮挡位置'+(s.coverKnown?'已知':'未知')+'；'+(s.budget?'至多 '+s.budget+' 段'+({off:'坏灭',on:'常亮',flip:'翻转'}[s.fault]):'没有故障')+'。'+(missing?'当前起点缺少独立小数点，验证通过也不能说明支持科学计数法。':'');
    let capNote=$('#capacity-note');if(!capNote){capNote=el('p','capacity-note');capNote.id='capacity-note';$('#verification-note').after(capNote);}
    const mode=({four:'all',lr:'lr',both:'both-lr',all:'all-simultaneous',none:'none',lrt:'lrt'})[$('#cover-select').value];
    const cap=state.layout==='seven'&&globalThis.SignalResearch?.rows.find(r=>r.mode===mode&&r.known===s.coverKnown&&r.fault===s.fault&&r.budget===s.budget&&r.goal===s.goal);
    const size=Object.keys(state.glyphs).length;
    capNote.classList.toggle('impossible',!!cap&&cap.status==='exact'&&size>cap.value);
    capNote.textContent=cap&&cap.status==='exact'?(size>cap.value?'硬件上限：当前规则最多容纳 '+cap.value+' 种图案，少于你的 '+size+' 个字符。即使任意重画字形也无法整套通过；试着放宽规则或增加内部冗余。':'硬件容量：当前规则最多容纳 '+cap.value+' 种任意图案。容量够用是必要条件，不代表这套设计有效或人眼易读。'):'这里精确验证当前字库；尚未给这个结构与场景的最优容量下结论。';
  }
  function witness(w) {
    const l=currentLayout(),card=el('article','witness-card'),top=el('div','witness-top');top.append(el('strong','',w.a+' / '+w.b));
    const edit=el('button','','编辑 '+w.a+' ↗');edit.addEventListener('click',()=>{state.selected=w.a;renderEditor();renderGallery();$('#editor-glyph').scrollIntoView({behavior:'smooth',block:'center'});});top.append(edit);card.append(top);
    const flow=el('div','witness-flow');
    const fig=(p,label,observation=false)=>{const f=el('figure'),g=el('div','witness-glyph'+(observation?' witness-observation':''));g.append(glyphSVG(l,p,{label}));f.append(g,el('figcaption','',label));return f;};
    flow.append(fig(state.glyphs[w.a],'原字符 '+w.a),el('span','','↘'),fig(w.observation,'相同观测',true),el('span','','↙'),fig(state.glyphs[w.b],'原字符 '+w.b));card.append(flow);
    const explain=el('p','witness-explanation');
    const path=(label,cover,fault)=>label+'：'+coverName(cover)+(fault?'，改变 '+bitNames(fault)+' 段':'，无额外故障');
    explain.append(document.createTextNode(path(w.a,w.coverA,w.faultA)),el('br'),document.createTextNode(path(w.b,w.coverB,w.faultB)));card.append(explain);return card;
  }
  function renderReferences() {
    const box=clear($('#reference-list')),l=currentLayout(),sc=scenario();
    const list=fonts(),priority=['standard','opt-dec','alternate','protected-hamming','hamming'];const chosen=list.filter(f=>priority.includes(f.id)).sort((a,b)=>priority.indexOf(a.id)-priority.indexOf(b.id)).slice(0,4);if(!chosen.length)chosen.push(list[0]);
    box.dataset.count=String(chosen.length);
    chosen.forEach((f,i)=>{
      const card=el('article','reference-card');card.append(el('p','eyebrow','REFERENCE / '+String(i+1).padStart(2,'0')),el('h3','',f.name));
      const preview=el('div','reference-preview'),labels=['1','5','6','8'].filter(k=>k in f.glyphs);if(!labels.length)labels.push(...Object.keys(f.glyphs).slice(0,4));
      labels.forEach(label=>{const d=el('div');d.append(glyphSVG(l,f.glyphs[label],{label}));preview.append(d);});card.append(preview,el('p','',f.note||'参考图案，请按当前场景验证。'));
      const a=Channel.analyze(l,f.glyphs,{...sc,maxWitnesses:1}),meta=el('div','reference-meta');meta.append(el('span',a.ok?'success':'failure',a.ok?'当前场景通过':'当前场景 '+a.totalPairs+' 对冲突'),el('span','',Object.keys(f.glyphs).length+' 个字符'));card.append(meta);
      const b=el('button','quiet-link','载入这套图案，继续修改 ↗');b.addEventListener('click',()=>{state.mission='custom';loadFont(f.id);$('#workshop').scrollIntoView({behavior:'smooth'});status('已载入 '+f.name+'。当前场景条件保持不变。');});card.append(b);box.append(card);
    });
  }
  function design() { return {schema:'cov7seg-design-v1',layout:state.layout,charset:state.charset,font:state.font,glyphs:{...state.glyphs},scenario:scenario(),ui:{cover:$('#cover-select').value},created:new Date().toISOString()}; }
  function validateDesign(d) {
    if(!d||d.schema!=='cov7seg-design-v1'||!Catalog.layouts[d.layout]||!Catalog.charsets[d.charset])throw Error('这不是受支持的设计文件。');
    if(!d.glyphs||typeof d.glyphs!=='object'||Array.isArray(d.glyphs))throw Error('字形表格式有误。');
    const labels=Catalog.charsets[d.charset].labels,keys=Object.keys(d.glyphs),full=(1<<Catalog.layouts[d.layout].segments.length)-1;
    if(keys.length!==labels.length||keys.some(k=>!labels.includes(k)))throw Error('字形标签必须与所选字符集完全一致。');
    if(Object.values(d.glyphs).some(p=>!Number.isInteger(p)||p<0||p>full))throw Error('字形超出结构的段数范围。');
    const s=d.scenario;if(!s||![0,1,2].includes(s.budget)||!['off','on','flip'].includes(s.fault)||!['detect','correct'].includes(s.goal)||typeof s.coverKnown!=='boolean')throw Error('场景参数有误。');
    if(!Array.isArray(s.covers)||s.covers.length<1||s.covers.length>4)throw Error('遮挡列表无效。');
    Channel.normalize(Catalog.layouts[d.layout],s);
    const c=Catalog.layouts[d.layout].covers,combos={none:[0],four:[c.top,c.right,c.bottom,c.left],lr:[c.left,c.right],both:[c.left|c.right],all:[c.left|c.right|c.top|c.bottom],top:[c.top],lrt:[c.left,c.right,c.top]};
    const equal=(a,b)=>a.length===b.length&&a.every(m=>b.includes(m));const match=Object.entries(combos).find(([k,v])=>equal(v,s.covers));if(!match)throw Error('该文件使用了页面尚不支持的遮挡组合。');
    return {...d,cover:match[0]};
  }
  function applyDesign(data) {
    const d=validateDesign(data);state.layout=d.layout;state.charset=d.charset;state.mission='custom';$('#layout-select').value=d.layout;$('#charset-select').value=d.charset;
    loadFont(d.font||'standard');state.glyphs={...d.glyphs};state.selected=Object.keys(state.glyphs)[0];$('#cover-select').value=d.cover;$('#fault-select').value=d.scenario.fault;$('#budget-select').value=d.scenario.budget;$('#goal-select').value=d.scenario.goal;$('#known-select').value=d.scenario.coverKnown?'known':'unknown';$('#advanced').open=d.scenario.budget>0||!d.scenario.coverKnown;scheduleRender(true);status('已恢复设计和验证条件。');
  }
  function storage() {
    $('#save-design').addEventListener('click',()=>{try{localStorage.setItem(STORE,JSON.stringify(design()));$('#restore-design').hidden=false;status('已保存到本机。下次打开可点击“恢复上次保存的设计”。');}catch(e){status('浏览器未允许本机保存，请使用“导出设计”。',true);}});
    $('#export-design').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(design(),null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='cov7seg-'+state.layout+'-'+state.charset+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('已导出完整字形与验证条件；可以分享文件，或稍后导入继续。');});
    $('#import-design').addEventListener('click',()=>$('#design-file').click());
    $('#design-file').addEventListener('change',async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>65536)throw Error('设计文件超过 64 KB。');applyDesign(JSON.parse(await f.text()));}catch(err){status('无法导入：'+err.message,true);}finally{e.target.value='';}});
    try{$('#restore-design').hidden=!localStorage.getItem(STORE);}catch(e){}
    $('#restore-design').addEventListener('click',()=>{try{const raw=localStorage.getItem(STORE);if(!raw||raw.length>65536)throw Error('没有可恢复的设计。');applyDesign(JSON.parse(raw));}catch(err){status('无法恢复：'+err.message,true);}});
  }
  if(!Catalog||!Channel){$('#verdict-title').textContent='实验组件未能加载';$('#verdict-explanation').textContent='请通过本地 HTTP 服务器打开此页面，并检查 lab/catalog.js 与 lab/channel.js 是否存在。';return;}
  intro();populate();storage();
  globalThis.CovExperience={state,scenario,setMission,render,design,applyDesign,validateDesign};
})();
