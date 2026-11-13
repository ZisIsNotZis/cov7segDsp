/* Finite observation channel. At most k unknown segment failures, not pin wiring. */
(function(root){
  'use strict';
  const count = n => {let c=0; for(;n;n&=n-1)c++; return c;};
  function normalize(layout, options={}) {
    const n=layout.segments.length;
    if(n<1 || n>20) throw Error('布局须包含 1–20 个独立段');
    const full=(1<<n)-1, budget=Number(options.budget??0);
    if(!Number.isInteger(budget)||budget<0||budget>2) throw Error('故障预算须为 0、1 或 2');
    const fault=options.fault??'off', goal=options.goal??'correct';
    if(!['off','on','flip'].includes(fault)) throw Error('未知故障类型');
    if(!['detect','correct'].includes(goal)) throw Error('未知验证目标');
    const covers=[...new Set(options.covers??[0])];
    if(!covers.length || covers.some(c=>!Number.isInteger(c)||c<0||(c&full)!==c)) throw Error('遮挡掩码无效');
    return {full,budget,fault,goal,covers,coverKnown:options.coverKnown!==false};
  }
  function observations(pattern,cover,opts) {
    const visible=opts.full&~cover, clean=pattern&visible;
    const susceptible=opts.fault==='off'?clean:opts.fault==='on'?(visible&~clean):visible;
    const bits=[]; for(let b=1;b<=opts.full;b*=2)if(susceptible&b)bits.push(b);
    const result=[{observation:clean,cover,fault:0}];
    const add=f=>result.push({observation:opts.fault==='off'?clean&~f:opts.fault==='on'?clean|f:clean^f,cover,fault:f});
    if(opts.budget>=1)for(const b of bits)add(b);
    if(opts.budget>=2)for(let i=0;i<bits.length;i++)for(let j=i+1;j<bits.length;j++)add(bits[i]|bits[j]);
    return result;
  }
  function analyze(layout,glyphs,options={}) {
    const opts=normalize(layout,options), entries=Object.entries(glyphs);
    if(!entries.length)throw Error('字库不能为空');
    for(const [l,p] of entries)if(!Number.isInteger(p)||p<0||(p&opts.full)!==p)throw Error('无效字形：'+l);
    const key=o=>(opts.coverKnown?o.cover+':':'')+o.observation;
    const sets=entries.map(([label,p])=>{
      const all=new Map(),clean=new Map();
      for(const cover of opts.covers) {
        const c={observation:p&~cover,cover,fault:0}; clean.set(key(c),c);
        for(const o of observations(p,cover,opts))if(!all.has(key(o)))all.set(key(o),o);
      }
      return {label,all,clean};
    });
    const conflicts=[];let totalPairs=0;
    function intersect(a,b){for(const [k,o] of a)if(b.has(k))return [o,b.get(k)];return null;}
    for(let i=0;i<sets.length;i++)for(let j=i+1;j<sets.length;j++){
      const a=sets[i],b=sets[j];
      let w=opts.goal==='correct'?intersect(a.all,b.all):intersect(a.all,b.clean);
      if(!w&&opts.goal==='detect')w=intersect(a.clean,b.all);
      if(!w)continue;
      totalPairs++;
      if(conflicts.length<(options.maxWitnesses??24))conflicts.push({a:a.label,b:b.label,observation:w[0].observation,coverA:w[0].cover,coverB:w[1].cover,faultA:w[0].fault,faultB:w[1].fault});
    }
    return {ok:totalPairs===0,conflicts,totalPairs,observations:sets.reduce((n,s)=>n+s.all.size,0),goal:opts.goal,coverKnown:opts.coverKnown};
  }
  function decode(layout,glyphs,observation,options={}) {
    const opts=normalize(layout,options),labels=[];
    for(const [label,p]of Object.entries(glyphs)){
      if(opts.covers.some(c=>observations(p,c,opts).some(o=>o.observation===observation)))labels.push(label);
    }
    return labels;
  }
  const api={analyze,observations,normalize,decode,popcount:count};
  root.SignalLab=api; if(typeof module!=='undefined')module.exports=api;
})(globalThis);
