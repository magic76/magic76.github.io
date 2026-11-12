(()=>{'use strict';
const $=id=>document.getElementById(id);
const families=window.CrewTreeV5.families,stages=[3,8,16],seeds=[103,241];
const names=window.CrewTreeV5.labels;
let family='all',stage='all',busy=false,resizePending=false,compareSilhouette=false;
const topics=['nature','food','cosmos','weather','love','tech','music','travel'];
function createTree(seed,turns,family){
 const r=window.CrewBotany.seeded(seed);
 const tree={seed,genome:{treeFamily:family,crownVariant:seed===103?0:1,
  silhouette:6,leaf:Math.floor(r()*8),palette:0,lean:0,twist:0,fruit:0},
  growth:[],mutations:[],tags:{},createdAt:0};
 for(let i=0;i<turns;i++){
  const topic=topics[(i+seed)%topics.length];
  tree.growth.push({topic,mood:(i%5-2)*.1,energy:.5+(i%4)*.11});
  tree.tags[topic]=(tree.tags[topic]||0)+2;
 }
 return tree;
}
function background(c,w,h){
 const floor=h*.83,grad=c.createLinearGradient(0,0,0,h);
 grad.addColorStop(0,'#d7e6d9');grad.addColorStop(.73,'#f4f0dc');grad.addColorStop(1,'#aac4aa');
 c.fillStyle=grad;c.fillRect(0,0,w,h);
 c.fillStyle='#a3bfa8';c.globalAlpha=.24;c.beginPath();c.moveTo(0,floor-23);
 c.quadraticCurveTo(w*.45,floor-58,w,floor-31);c.lineTo(w,floor);c.lineTo(0,floor);c.fill();
 c.globalAlpha=1;c.fillStyle='#6b9075';c.fillRect(0,floor,w,h-floor);
}
function drawOne(canvas,seed,age,family,silhouette=false){
 const tree=createTree(seed,age,family),geo=window.CrewTreeV5.generate(tree);
 const rect=canvas.getBoundingClientRect();
 const w=Math.max(120,Math.round(rect.width||245)),h=Math.max(150,Math.round(rect.height||308));
 const dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
 if(silhouette){c.fillStyle='#f6f5eb';c.fillRect(0,0,w,h);}else background(c,w,h);
 const xy=window.CrewTreeV5.layout(geo.bounds,w,h);
 c.save();if(silhouette)c.filter='brightness(0)';
 window.CrewTreeV5.paint(c,tree,geo,xy.ox,xy.oy,xy.factor,0,{reducedMotion:true});c.restore();
 return geo;
}
function specimen(f,seed,age){
 const article=document.createElement('article');article.className='specimen';
 article.dataset.family=f;article.dataset.stage=String(age);
 const canvas=document.createElement('canvas');
 canvas.setAttribute('aria-label',names[f]+'，變體 '+(seed===103?1:2)+'，'+age+' 句');
 const head=document.createElement('div');head.className='specimen-head';
 const title=document.createElement('strong');title.textContent=names[f];
 const step=document.createElement('span');step.textContent=age+' 句 · V'+(seed===103?1:2);
 head.append(title,step);
 const foot=document.createElement('div');foot.className='specimen-foot';
 foot.textContent='Seed '+seed+' · '+(seed===103?'輪廓 A':'輪廓 B');
 article.append(canvas,head,foot);
 return {article,canvas};
}
function populate(){
 if(busy)return;busy=true;
 const list=$('reviewGallery'),compare=$('matureCompare');
 list.innerHTML='';compare.innerHTML='';
 let count=0;
 for(const f of families){
  const featured=specimen(f,103,16);
  compare.append(featured.article);drawOne(featured.canvas,103,16,f,compareSilhouette);
 }
 for(const f of families)for(const seed of seeds)for(const age of stages){
  if(family!=='all'&&family!==f)continue;
  if(stage!=='all'&&stage!==String(age))continue;
  const item=specimen(f,seed,age);
  list.append(item.article);drawOne(item.canvas,seed,age,f);count++;
 }
 $('shownCount').textContent=String(count);
 const assets=window.CrewTreeV5.assetStatus();
 $('artStatus').textContent=assets.loaded.length+'/4 家族手繪素材已載入';
 busy=false;
}
for(const b of document.querySelectorAll('[data-family]'))b.addEventListener('click',()=>{
 family=b.dataset.family;
 document.querySelectorAll('[data-family]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
 populate();
});
for(const b of document.querySelectorAll('[data-stage]'))b.addEventListener('click',()=>{
 stage=b.dataset.stage;
 document.querySelectorAll('[data-stage]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
 populate();
});
$('silhouetteBtn').addEventListener('click',()=>{
 compareSilhouette=!compareSilhouette;
 $('silhouetteBtn').setAttribute('aria-pressed',String(compareSilhouette));
 $('silhouetteBtn').textContent=compareSilhouette?'恢復彩色樹木':'切換純黑剪影';
 populate();
});
window.addEventListener('crew-tree-art-ready',populate);
window.addEventListener('resize',()=>{
 if(resizePending)return;resizePending=true;
 window.requestAnimationFrame(()=>{resizePending=false;populate();});
});
populate();
if(new URLSearchParams(location.search).get('qa')==='1')window.__TREE_ART_QA__={
 families,stages,seeds,createTree,drawOne,
 getCount:()=>document.querySelectorAll('#reviewGallery .specimen').length,
 status:()=>window.CrewTreeV5.assetStatus(),
 metrics:(f,seed=103,n=16)=>window.CrewTreeV5.generate(createTree(seed,n,f)).metrics
};
})();
