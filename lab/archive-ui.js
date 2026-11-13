/* The research library is generated evidence, not a second set of invented numbers. */
(function(){
  'use strict';const a=globalThis.SignalArchive;if(!a)return;
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  function table(headers,rows){const wrap=el('div',undefined,'archive-table-wrap'),t=el('table',undefined,'archive-table'),head=el('thead'),tr=el('tr');headers.forEach(s=>tr.append(el('th',s)));head.append(tr);t.append(head);const body=el('tbody');rows.forEach(cells=>{const row=el('tr');cells.forEach(c=>{const td=el('td');if(c instanceof Node)td.append(c);else td.textContent=c;row.append(td);});body.append(row);});t.append(body);wrap.append(t);return wrap;}
  const counts=document.querySelector('#archive-counts');
  if(counts){const s=a.seven;counts.append(table(['范围','最小极大集','最大集','极大集总数'],[['固定中段状态',s.per_g_min,s.per_g_max,s.per_g_total.toLocaleString()],['完整七段',s.global_min,s.global_max,s.global_total.toLocaleString()]]));counts.append(el('p','极大集是当前不能再加，最大集是数量最多。17、18 的缺口属于“极大集”，不禁止选择一个仍可继续扩充的 17 字符字库。','research-caveat'));}
  const fonts=document.querySelector('#archive-fonts');
  if(fonts){fonts.append(table(['研究候选','改段数','平均模型匹配','最差字匹配','拓扑不符','最近标准不符','带回实验'],a.fonts.map(f=>{const b=el('button','载入并检验 ↗','archive-load');b.type='button';b.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('cov-load-research',{detail:{...f,name:f.name,layout:'seven',labels:Object.keys(f.glyphs)}})));return [f.name,f.flips,f.mean.toFixed(3),f.minimum.toFixed(3),f.topology.join(' / ')||'无',f.nearest.join(' / ')||'无',b];})));fonts.append(el('p','这些分数沿用原七段研究：可见距离 + 较小权重的遮挡后距离；不是人类识别正确率。保留洞数可以得到很差的字形，所以拓扑、最近标准、最差字形和平均分必须一起看。','research-caveat'));fonts.append(el('p','七段四侧模型下，16 字符 0–F 字库同时满足“各字唯一最近于自己的标准字形”的约束已求解为 '+a.hexNearest.status+'；最少仍有 '+a.hexNearest.minimumViolations+' 个违例。此结论受原位权重与预期字形定义限制。','research-caveat'));}
  const families=document.querySelector('#archive-families');
  if(families)families.append(table(['广义 K₂ □ K₂ □ Kq₃ □ Kq₄','可达极大集大小','极大集总数'],a.families.map(f=>['q₃='+f.q3+'，q₄='+f.q4,f.existence.join('、'),f.total.toLocaleString()])));
  const channels=document.querySelector('#archive-channel-table');
  if(channels&&a.channels)channels.append(table(['经典七段边框情景','检测容量','唯一恢复容量'],a.channels.map(c=>[c.name,c.detection,c.correction])));
})();
