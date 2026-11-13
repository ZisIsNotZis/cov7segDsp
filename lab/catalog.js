/* Geometry and teaching font data. Code demos are deliberately not legibility claims. */
(function(root){
  'use strict';
  const geom=[[.12,.06,.88,.06],[.94,.12,.94,.44],[.94,.56,.94,.88],[.12,.94,.88,.94],[.06,.56,.06,.88],[.06,.12,.06,.44],[.12,.5,.88,.5]];
  const names=['a','b','c','d','e','f','g'];
  const segments=()=>geom.map((p,i)=>({id:names[i],x1:p[0],y1:p[1],x2:p[2],y2:p[3]}));
  const base={top:1,right:6,bottom:8,left:48};
  const layouts={};
  function add(id,name,segs,covers,note){layouts[id]={id,name,segments:segs,covers,note};}
  add('seven','七段 · 经典数码管',segments(),{...base},'理想边界遮挡：上 a、右 b/c、下 d、左 e/f。每段可独立亮灭。');
  const dot={id:'dp',x1:.98,y1:.97,x2:.98,y2:.97};
  add('seven-dot','八段 · 七段 + 小数点',[...segments(),dot],{top:1,right:134,bottom:136,left:48},'小数点为独立第八段，位于右下；右遮挡或下遮挡也会遮住它。');
  const diagonals=[[.08,.10,.92,.46],[.08,.46,.92,.10],[.08,.54,.92,.90],[.08,.90,.92,.54]];
  const whole=diagonals.map((p,i)=>({id:'x'+i,x1:p[0],y1:p[1],x2:p[2],y2:p[3]}));
  add('cell-x11','十一段 · 两格各一个 X',[...segments(),...whole],{...base},'每条完整斜线是一段；X 位于边框内，理想外边遮挡不移除内部斜线。这是段级擦除假设，不是像素裁切。');
  const halves=whole.flatMap(s=>{const x=(s.x1+s.x2)/2,y=(s.y1+s.y2)/2;return [{id:s.id+'a',x1:s.x1,y1:s.y1,x2:x,y2:y},{id:s.id+'b',x1:x,y1:y,x2:s.x2,y2:s.y2}];});
  let left=48,right=6;halves.forEach((s,i)=>{if(s.x1<.1)left|=1<<(7+i);if(s.x2>.9)right|=1<<(7+i);});
  add('split-x15','十五段 · X 交点拆成半段',[...segments(),...halves],{...base},'X 的交点拆开独立驱动：每格四根半斜线。斜线位于边框内，理想外边遮挡保留它们。');
  const pixels=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)pixels.push({id:`p${r}${c}`,x1:.18+c*.32,y1:.18+r*.32,x2:.18+c*.32,y2:.18+r*.32,pixel:true});
  add('pixels9','九像素 · 3 × 3',pixels,{top:7,bottom:448,left:73,right:292},'每个点是一个独立像素，边缘一行或一列被遮住；角点同时属于两个方向。');
  const lines=[];for(let r=0;r<3;r++)for(let c=0;c<2;c++)lines.push({id:`h${r}${c}`,x1:.08+c*.42,y1:.08+r*.42,x2:.5+c*.42,y2:.08+r*.42});
  for(let r=0;r<2;r++)for(let c=0;c<3;c++)lines.push({id:`v${r}${c}`,x1:.08+c*.42,y1:.08+r*.42,x2:.08+c*.42,y2:.5+r*.42});
  const corners=[[.13,.13],[.87,.13],[.13,.87],[.87,.87]];for(let i=0;i<4;i++)lines.push({id:'d'+i,x1:corners[i][0],y1:corners[i][1],x2:.5,y2:.5});
  add('grid16','十六段 · 3 × 3 顶点 + 中心斜线',lines,{top:3,bottom:48,left:64|512,right:256|2048},'3 × 3 个顶点形成 12 条格边，再加四角内侧到中心的 4 根斜线。只擦除外边框线，内侧斜线与中心十字保留。');
  const charsets={decimal:{name:'数字 · 0–9',labels:[...'0123456789']},scientific:{name:'科学记数符号 · 0–9 − E .',labels:[...'0123456789','−','E','.']},hex:{name:'十六进制 · 0–9 A–F',labels:[...'0123456789ABCDEF']},upper:{name:'数字 + 大写 · 36 字符',labels:[...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ']},alnum:{name:'数字 + 大小写 · 62 字符',labels:[...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz']},base64:{name:'Base64 · 64 字符',labels:[...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/']}};
  const bits=s=>[...s].reduce((a,c,i)=>a|(c==='1'?1<<i:0),0);
  const std={'0':'1111110','1':'0110000','2':'1101101','3':'1111001','4':'0110011','5':'1011011','6':'1011111','7':'1110000','8':'1111111','9':'1111011',A:'1110111',B:'0011111',C:'1001110',D:'0111101',E:'1001111',F:'1000111','−':'0000001','.':'0000000'};
  const optimized={...std,'1':'0111000','3':'1110001','5':'1010011','8':'0111111'};
  const alternate={...std,'1':'0111000','3':'1110001','5':'0011011','6':'1001111','8':'0111111'};
  const pixelDecimal=['111101111','010010010','110010011','110010110','101111001','011010110','100111111','111001001','111111111','111111001'].map(bits);
  const gridMap=[3,256,2048,48,512,64,12];
  function project7(p,layout){if(layout!=='grid16')return p;let o=0;for(let i=0;i<7;i++)if(p>>i&1)o|=gridMap[i];return o;}
  function hamming7(value){
    const b=Array(8).fill(0);[3,5,6,7].forEach((pos,i)=>b[pos]=value>>i&1);
    b[1]=b[3]^b[5]^b[7];b[2]=b[3]^b[6]^b[7];b[4]=b[5]^b[6]^b[7];
    return b.slice(1).reduce((p,v,i)=>p|v<<i,0);
  }
  function fontsFor(layoutKey,charsetKey){
    const layout=layouts[layoutKey],cs=charsets[charsetKey];if(!layout||!cs)throw Error('未知布局或字符集');
    const out=[], labels=cs.labels;
    if(layoutKey!=='pixels9' && labels.every(l=>l in std)){
      const make=table=>Object.fromEntries(labels.map(l=>[l,l==='.'?(layoutKey==='seven-dot'?128:0):project7(bits(table[l]),layoutKey)]));
      const missingSymbols=labels.includes('.')&&layoutKey!=='seven-dot'?['.']:[];
      out.push({id:'standard',name:charsetKey==='hex'?'常规十六进制（B/D 借用小写）':'常规字形',glyphs:make(std),missingSymbols,note:charsetKey==='scientific'?(missingSymbols.length?'此布局没有独立小数点；点暂为空白占位，不能据此宣称支持科学计数法。':'')+'科学字符按单字符验证；整串语法、多位位置及小数点与数字同时点亮不在本模型中。':'熟悉的数码管字形是比较起点；遮挡后可能混淆，试着找出一个反例。'});
      if(charsetKey==='decimal')out.push({id:'opt-dec',name:'四段修改 · 抗四向遮挡候选',glyphs:make(optimized),note:'七段四向遮挡下无冲突的参考解；不保证抗未知故障或真实人眼更好读。'});
      if(charsetKey==='decimal')out.push({id:'alternate',name:'另一种解 · 原始笔记字形',glyphs:make(alternate),note:'七段四向遮挡下的另一组参考字形，修改五段；与四段候选比较熟悉程度，不把模型当真人识别结论。'});
    }
    if(layoutKey==='pixels9'&&charsetKey==='decimal')out.push({id:'standard',name:'3 × 3 数字草案',glyphs:Object.fromEntries(labels.map((l,i)=>[l,pixelDecimal[i]])),note:'低分辨率数字草案，等待你的检验和改进；未做真人可读性验证。'});
    if(labels.length<=16 && ['seven','seven-dot','cell-x11','split-x15'].includes(layoutKey)){
      const extended=layoutKey==='cell-x11'||layoutKey==='split-x15',positions=extended?[0,3,6,7,8,9,10]:[0,1,2,3,4,5,6];
      out.push({id:'hamming',name:extended?'纠错编码 · 借助内部冗余':'纠错编码 · Hamming(7,4)',glyphs:Object.fromEntries(labels.map((l,i)=>{const h=hamming7(i);let p=extended?54:0;positions.forEach((pos,j)=>{if(h>>j&1)p|=1<<pos;});return [l,p];})),note:extended?'编码示范，不是可读字体。把 Hamming 码放在左右遮挡保留的七段上，可同时恢复任一侧遮挡与一个未知翻转；改成上下方向必须重新验证。':'编码示范，不是可读字体。无遮挡时能唯一恢复一个未知翻转（包含坏灭/常亮），加遮挡后必须重新验证。'});
    }
    if(layoutKey==='split-x15'&&labels.length<=16&&labels.every(l=>l in std))out.push({id:'protected-hamming',name:'轮廓 + 内部纠错码 · 四向单错参考',glyphs:Object.fromEntries(labels.map((l,i)=>[l,bits(std[l])|(hamming7(i)<<7)])),note:'保留常规外轮廓，在七根内部半斜线放入 Hamming 码。任意边框组合遮挡加一个未知翻转，理想解码仍唯一；附加线的真实可读性尚未验证。不是新的编码理论。'});
    out.push({id:'code-demo',name:'二进制编码草案 · 非可读字体',glyphs:Object.fromEntries(labels.map((l,i)=>[l,i^(i>>1)])),note:'按格雷码分配图案，用来探索字符数量与冗余；不是字母形状，也不是可读性参考答案。'});
    return out;
  }
  root.SignalCatalog={layouts,charsets,fontsFor};if(typeof module!=='undefined')module.exports=root.SignalCatalog;
})(globalThis);
