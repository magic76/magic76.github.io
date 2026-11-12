(()=>{'use strict';
const $=id=>document.getElementById(id);
const seeds=[103,241,548,871,1296,2039,3597,4407];
const stages=[3,8,16];
const profile={name:'繪本魔法樹',height:1.24,spread:1.12,wiggle:.21,lean:0,droop:.09};
const palettes=[
 ['#7ad5ab','#ccf4a4','#3f9d86'],
 ['#a7dd78','#f4e79a','#5b9c72'],
 ['#aadacc','#fcf4bd','#7ab3c0'],
 ['#7ee3bd','#f0f5ad','#6bbb93']
];
const topicColors={nature:{color:'#a8c890',ornament:'✿'},food:{color:'#e5bd9d',ornament:'✿'},cosmos:{color:'#afc2d0',ornament:'✿'},love:{color:'#dfa9ab',ornament:'✿'},tech:{color:'#9ac3bf',ornament:'✿'},travel:{color:'#d7c298',ornament:'✿'}};
let filter='all',drawing=false;
const pixels=window.devicePixelRatio>=2?2:1;
function createTree(seed,turns){
 const r=window.CrewBotany.seeded(seed);
 const leaf=Math.floor(r()*8);
 const tree={seed,genome:{silhouette:0,leaf,palette:Math.floor(r()*4),lean:(r()*2-1)*.4,twist:(r()*2-1)*.42,fruit:Math.floor(r()*12)},
  growth:[],mutations:[],tags:{},createdAt:0};
 const topics=['nature','food','cosmos','nature','love','tech','nature','travel'];
 for(let i=0;i<turns;i++){
  const topic=topics[(i+seed%7)%topics.length];
  tree.growth.push({topic,mood:((i+seed)%7-3)*.14,energy:.45+(i%4)*.13});
  tree.tags[topic]=(tree.tags[topic]||0)+2;
  if(i===5)tree.mutations=['fireflies'];
  if(i===12)tree.mutations.push('heartvine');
 }
 return tree;
}
function background(c,w,h){
 const floor=h*.85,bg=c.createLinearGradient(0,0,0,h);
 bg.addColorStop(0,'#d8e8d7');bg.addColorStop(.72,'#eeefdb');bg.addColorStop(1,'#a9c1a4');
 c.fillStyle=bg;c.fillRect(0,0,w,h);
 c.fillStyle='#bfd1b6';c.globalAlpha=.34;c.beginPath();c.moveTo(0,floor-25);
 c.bezierCurveTo(w*.3,floor-70,w*.52,floor-23,w,floor-43);c.lineTo(w,floor);c.lineTo(0,floor);c.fill();c.globalAlpha=1;
 c.fillStyle='#5e8568';c.fillRect(0,floor,w,h-floor);
 const earth=c.createLinearGradient(0,floor,0,h);earth.addColorStop(0,'#668c6d');earth.addColorStop(1,'#3e6756');
 c.fillStyle=earth;c.fillRect(0,floor+4,w,h-floor);
}
function drawOne(canvas,seed,stage){
 const tree=createTree(seed,stage),geo=window.CrewBotany.generate(tree,[profile],palettes);
 const r=canvas.getBoundingClientRect(),w=Math.round(r.width)||240,h=Math.round(r.height)||300;
 canvas.width=w*pixels;canvas.height=h*pixels;const c=canvas.getContext('2d');
 c.setTransform(pixels,0,0,pixels,0,0);background(c,w,h);
 const layout=window.CrewBotany.makeSceneLayout(geo.bounds,w,h);
 window.CrewBotany.paint(c,tree,geo,layout.ox,layout.oy,layout.factor,0,{
  progress:1,reducedMotion:true,topics:topicColors,mutations:[
   {key:'fireflies',icon:'✿'},{key:'heartvine',icon:'✿'}
  ]});
}
function paintGallery(){
 if(drawing)return;drawing=true;
 const gallery=$('reviewGallery');
 gallery.innerHTML='';
 for(const stage of stages)for(const seed of seeds){
  if(filter!=='all'&&Number(filter)!==stage)continue;
  const card=document.createElement('article');card.className='specimen';
  const canvas=document.createElement('canvas');
  canvas.setAttribute('aria-label',stage+' 句，種子 '+seed+' 的程序魔法樹');
  const head=document.createElement('div');head.className='specimen-head';
  const title=document.createElement('strong');title.textContent='Seed '+seed;
  const age=document.createElement('span');age.textContent=stage+' 句';
  head.append(title,age);
  const foot=document.createElement('div');foot.className='specimen-foot';
  foot.textContent=stage===3?'觀察幼芽與主幹':stage===8?'檢查分枝與葉叢':'檢查成熟樹冠與留白';
  card.append(canvas,head,foot);gallery.append(card);
  drawOne(canvas,seed,stage);
 }
 const art=window.CrewBotany.artStatus();
 $('artStatus').textContent=art.allLoaded?'✓ 已載入全部 '+art.loaded.length+' 件美術素材':
  '已載入 '+art.loaded.length+' / '+(art.loaded.length+art.missing.length)+' 件（其餘會自動補上）';
 drawing=false;
}
document.querySelectorAll('[data-filter]').forEach(b=>{
 b.addEventListener('click',()=>{
  filter=b.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  paintGallery();
 });
});
window.addEventListener('crew-tree-art-ready',paintGallery);
window.addEventListener('resize',()=>{
 if(resizePending)return;
 resizePending=true;
 window.requestAnimationFrame(()=>{resizePending=false;paintGallery()});
});
let resizePending=false;
paintGallery();
if(new URLSearchParams(location.search).get('qa')==='1'){
 window.__TREE_ART_QA__={seeds,stages,createTree,drawOne,getCount:()=>document.querySelectorAll('.specimen').length,
  status:()=>window.CrewBotany.artStatus()};
}
})();