/* Crew Flat Forest V6 — independent Canvas 2D garden scene and pure garden model.
 * Flat vector redesign (style C): dense pre-rendered leaf sprites in three
 * layers, warm brown bark trunk, horizontal spreading limbs, faceted island.
 * It never reads chat messages, touches the backend, uses WebGL or adds a
 * dependency. Four final botanical forms are determined by seed; nothing is
 * pre-revealed.
 */
(function(root){'use strict';
const W=780,H=1120,TAU=Math.PI*2,MAX=16,MAX_RETIRED=18;
// Art slots: the art images are wider than the procedural trees, so the
// back row sits further toward the centre and the front row toward the
// edges, or the back row would hide entirely behind the front row.
// (Layout only — the garden data in `empty/restore/complete` is untouched.)
const slots=[{x:235,y:905,s:.36,a:.70},{x:545,y:905,s:.36,a:.70},
 {x:105,y:965,s:.46,a:.90},{x:675,y:965,s:.46,a:.90}];
const forms=[
 {id:'constellation',name:'星空樹',icon:'✦',note:'每片枝梢都連成星座。'},
 {id:'crystal',name:'水晶樹',icon:'💎',note:'冰藍晶簇順著枝幹向天空生長。'},
 {id:'lantern',name:'燈籠樹',icon:'🏮',note:'琥珀燈籠掛滿枝條，照亮整座森林。'},
 {id:'petal',name:'花瀑樹',icon:'🌸',note:'粉色花瀑傾瀉而下，花瓣落滿小島。'}];
const topicColors={food:'#ffc978',cosmos:'#6ee7ff',travel:'#ffb37e',animals:'#ffb5cc',
 music:'#c5b8ff',daily:'#7fe7c4',tech:'#9bf3e7',love:'#ffb5cc',
 weather:'#9fd8ff',nature:'#7fe7c4',dream:'#c5b8ff',stress:'#ffc978',play:'#ffdf91'};
const colorFamilies=['#7fe7c4','#6ee7ff','#ffc978'];
// Flat palettes (style C): back (large, dark), mid, front (family color),
// gold accents. Indexed by seed%3 so the same seed always looks the same.
// The final forms override the palette; lantern has no override and keeps
// its family palette with the lanterns as the accent.
const FLAT_PALETTES=[
 {back:'#5b4390',mid:'#2e9d8f',front:'#7fe7c4',gold:'#ffd98f'},
 {back:'#4a3670',mid:'#3a86c8',front:'#6ee7ff',gold:'#ffe9a8'},
 {back:'#6b4a8f',mid:'#c98a4a',front:'#ffc978',gold:'#fff3c3'}];
const FLAT_FORMS={
 constellation:{back:'#8a7bb8',mid:'#c9b8e8',front:'#ffe9a8',gold:'#fff7e0'},
 crystal:{back:'#5a7bb8',mid:'#7cc8ff',front:'#bfe9ff',gold:'#ffffff'},
 petal:{back:'#c97ba8',mid:'#f6a1d3',front:'#ffb5cc',gold:'#ffe7f7'}};
// AI evolution art (Digimon-style): every growth stage is a generated
// image, one per (line, stage). A line is a form (seed%4); a stage is
// seed/sprout/sapling/island/final. Adding a line = 5 images + one entry
// in ART_LINES; no other code changes. The procedural painter stays as
// the fallback (and is what the Node tests exercise, since Image does
// not exist there).
// The images are generated on a flat solid background and chroma-keyed
// to transparent, so the game's own night is the only sky — several
// trees side by side share one background and there is no seam between
// images. No feathering is needed (and it would eat the canopy edge).
const ART_DIR='./art/evolution/';
const ART_STAGES=['seed','sprout','sapling','island','final'];
// Per-stage target: subject height as a fraction of the canvas height
// at scale 1. The image is scaled so the subject hits `target` and
// positioned so its base lands on the anchor point. The sapling target
// is .70 because the active tree's growth scale (.5-.7) multiplies it
// to .35-.49.
const ART_STAGE={
 seed:{target:.12},
 sprout:{target:.30},
 sapling:{target:.70},
 island:{target:.65},
 final:{target:.85}};
// Per-image placement, measured from the chroma-keyed images
// (largest connected opaque component): base = fraction of the image
// height where the subject's base sits, subj = fraction of the image
// height that is the subject's height. A new image only needs its
// base/subj measured and added here.
const ART_LINES={
 constellation:{
  seed:{file:'constellation-seed.webp',base:.925,subj:.180},
  sprout:{file:'constellation-sprout.webp',base:.938,subj:.253},
  sapling:{file:'constellation-sapling.webp',base:.899,subj:.746},
  island:{file:'constellation-island.webp',base:.885,subj:.760},
  final:{file:'constellation-final.webp',base:.884,subj:.775}},
 crystal:{
  seed:{file:'crystal-seed.webp',base:.917,subj:.196},
  sprout:{file:'crystal-sprout.webp',base:.982,subj:.375},
  sapling:{file:'crystal-sapling.webp',base:.925,subj:.850},
  island:{file:'crystal-island.webp',base:.915,subj:.836},
  final:{file:'crystal-final.webp',base:.963,subj:.923}},
 lantern:{
  seed:{file:'lantern-seed.webp',base:.828,subj:.217},
  sprout:{file:'lantern-sprout.webp',base:.899,subj:.318},
  sapling:{file:'lantern-sapling.webp',base:.907,subj:.816},
  island:{file:'lantern-island.webp',base:.813,subj:.623},
  final:{file:'lantern-final.webp',base:.944,subj:.901}},
 petal:{
  seed:{file:'petal-cherry-seed.webp',base:.979,subj:.164},
  sprout:{file:'petal-cherry-sprout.webp',base:.941,subj:.313},
  sapling:{file:'petal-cherry-sapling.webp',base:.896,subj:.666},
  island:{file:'petal-cherry-island.webp',base:.825,subj:.648},
  final:{file:'petal-cherry-final.webp',base:.916,subj:.830}}};
const artCache=new Map();
function artImage(line,stageName){
 if(typeof Image!=='function')return null;
 const key=line+'|'+stageName;
 if(artCache.has(key))return artCache.get(key);
 const entry=ART_LINES[line]&&ART_LINES[line][stageName];
 const file=entry&&entry.file;
 if(!file){artCache.set(key,null);return null;}
 const img=new Image();
 img.src=ART_DIR+file;
 artCache.set(key,img);
 return img;
}
function artReady(img){return !!(img&&img.complete&&img.naturalWidth>0&&img.naturalHeight>0);}
// Preload every evolution image up front so a stage change never shows the
// procedural fallback while the new stage's image is still downloading.
// Without this the tree flickers between the painter and the image as it
// grows. Safe in tests: artImage returns null when Image does not exist.
function preloadArt(){
 for(const line of Object.keys(ART_LINES))
  for(const st of ART_STAGES)artImage(line,st);
}
// Draw one evolution image, anchored so the subject's base sits at (x,y)
// and the subject is `target` of the canvas height tall at scale 1.
// `scale` multiplies the subject size (growth scale for the active tree,
// the slot scale for forest trees). The image is already transparent,
// so it is drawn directly. Returns true when an image was drawn.
function drawArt(c,line,stageName,x,y,scale,alpha){
 const entry=ART_LINES[line]&&ART_LINES[line][stageName];
 const spec=ART_STAGE[stageName];
 if(!entry||!spec)return false;
 const img=artImage(line,stageName);
 if(!artReady(img))return false;
 const iw=img.naturalWidth,ih=img.naturalHeight;
 if(!iw||!ih)return false;
 const targetH=spec.target*H*scale;
 const s=targetH/(entry.subj*ih);
 const dw=iw*s,dh=ih*s;
 const dx=x-(iw/2)*s,dy=y-(entry.base*ih)*s;
 c.save();c.globalAlpha*=alpha;
 c.drawImage(img,dx,dy,dw,dh);
 c.restore();
 return true;
}
// Per-sentence topic marks on the art: small glowing dots scattered on
// the canopy at deterministic positions (seeded by the tree's seed), so
// every sentence still leaves a visible trace while a stage's image
// stays the same. Same colors as the procedural marks.
function artMarks(c,x,y,scale,stageName,seedNum,marks,time){
 if(!Array.isArray(marks)||!marks.length)return;
 const spec=ART_STAGE[stageName];if(!spec)return;
 const targetH=spec.target*H*scale;
 const top=y-targetH,canopyH=targetH*.65,halfW=targetH*.38;
 const r=rng(seedNum);
 const shown=Math.min(marks.length,16);
 for(let i=0;i<shown;i++){
  const px=x+(r()*2-1)*halfW,py=top+r()*canopyH;
  const col=topicColors[marks[i]]||topicColors.daily,latest=i===shown-1;
  glow(c,px,py,latest?26:16,col,latest?.75:.4);
  ellipse(c,px,py,3.8,3.8,'#ffffff');
  ellipse(c,px+1,py,2.6,2.6,col);
 }
}
// Try the evolution art first; fall back to the procedural painter when
// the image is not loaded yet (or Image does not exist, as in tests).
function drawTree(c,tree,n,x,y,scale,alpha,time,still,marks){
 if(!tree||!goodSeed(tree.seed)){shape(c,tree,n,x,y,scale,alpha,time,still,marks);return;}
 const line=form(tree.seed).id,st=stage(n);
 if(drawArt(c,line,st,x,y,scale,alpha)){
  artMarks(c,x,y,scale,st,tree.seed,marks,time);
  return;
 }
 shape(c,tree,n,x,y,scale,alpha,time,still,marks);
}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rng(seed){let x=seed>>>0;return ()=>{x=(x+0x6d2b79f5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function stage(n){return n===0?'seed':n<3?'sprout':n<8?'sapling':n<16?'island':'final';}
function form(seed){return forms[(seed>>>0)%4];}
function rarity(seed){const v=(seed>>>0)%100;return v<2?{key:'legend',name:'傳說',color:'#ffd76a'}:
 v<12?{key:'epic',name:'史詩',color:'#c5b8ff'}:
 v<40?{key:'rare',name:'稀有',color:'#6ee7ff'}:
 {key:'common',name:'普通',color:'#b9b3c9'};}
function empty(){return {version:6,totalCompleted:0,slots:[],retired:[]};}
const goodSeed=n=>Number.isSafeInteger(n)&&n>=0&&n<=4294967295;
const topicNames=Object.keys(topicColors);
function snapshot(tree){
 return {seed:tree.seed>>>0,topics:tree.growth.slice(0,16).map(e=>topicColors[e.topic]?e.topic:'daily')};
}
function cleanSlot(s){
 if(!s||!goodSeed(s.seed)||!Array.isArray(s.topics))return null;
 return {seed:s.seed,topics:s.topics.slice(0,16).filter(x=>topicNames.includes(x))};
}
function restore(raw){
 const base=empty();
 if(!raw||raw.version!==6||!Number.isSafeInteger(raw.totalCompleted)||raw.totalCompleted<0)return base;
 const seen=new Set();
 const cleaned=(xs,limit)=>Array.isArray(xs)?xs.slice(0,32).map(cleanSlot).filter(s=>{
  if(!s||seen.has(s.seed))return false;seen.add(s.seed);return true;
 }).slice(0,limit):[];
 base.slots=cleaned(raw.slots,4);
 base.retired=cleaned(raw.retired,MAX_RETIRED);
 base.totalCompleted=Math.max(raw.totalCompleted,base.slots.length+base.retired.length);
 return base;
}
function complete(g,tree){
 const done=snapshot(tree);
 if(!goodSeed(done.seed)||done.topics.length!==16)return null;
 g.totalCompleted++;
 if(g.slots.length===4)g.retired.unshift(g.slots.shift());
 g.slots.push(done);
 g.retired=g.retired.slice(0,MAX_RETIRED);
 const forestEvent={3:'🍄 螢光菇小路出現了',4:'💧 森林長出一座小池塘',5:'🌌 極光點亮森林'}[g.totalCompleted]||null;
 return {form:form(done.seed),rarity:rarity(done.seed),forestEvent,tree:done};
}
function progress(g,n){return {
 stage:stage(n),completed:g.totalCompleted,visible:g.slots.length,retired:g.retired.length,
 next:g.totalCompleted<3?'再長滿 '+(3-g.totalCompleted)+' 棵，解鎖螢光菇小路':
 g.totalCompleted===3?'再長滿 1 棵，解鎖小池塘':
 g.totalCompleted===4?'再長滿 1 棵，解鎖極光':'極光已點亮 · 森林仍會成長',
 revealed:n>=16,form:n>=16?form(0):null
};}
const shapeCache=new Map();
function bones(seed){
 if(shapeCache.has(seed))return shapeCache.get(seed);
 const r=rng(seed^0x9F7A113),branches=[],tips=[],fruits=[];
 const lean=(r()-.5)*.5;
 function branch(x,y,a,len,w,d){
  if(d>5||len<10)return;
  const x1=x+Math.cos(a)*len,y1=y+Math.sin(a)*len;
  branches.push({x,y,x1,y1,w,d});
  if(d>=4)tips.push({x:x1,y:y1,phase:r()*TAU,size:2.2+r()*3.2,a});
  if(d>=5)return;
  if(d===3&&r()<.4)fruits.push({x:x1,y:y1,phase:r()*TAU});
  // Tip fork (sympodial, the spreading-broadleaf pattern): the branch
  // splits into 2-3 children at the tip. The children always span the
  // same total angle (±baseSpread) no matter how many there are, so the
  // crown's width does not depend on the child count. The main limbs
  // leave the trunk almost horizontally (up to ~80°), then each
  // generation curves back toward the light (depth-dependent pull).
  const pull=[.02,.08,.12,.15,.18][Math.min(d,4)];
  const baseSpread=[1.30,.95,.70,.50,.35][Math.min(d,4)];
  const n=d===0?3:r()<.72?2:3;
  for(let i=0;i<n;i++){
   const frac=n===1?0:(i/(n-1))*2-1;
   let na=a+frac*baseSpread+(r()-.5)*.3;
   na+=(-Math.PI/2-na)*pull;
   branch(x1,y1,na,len*(.70+r()*.12),Math.max(1.2,w*.66),d+1);
  }
  // Laterals along the segment (density): a short branch from a point
  // part-way along this segment, filling the interior so the crown is
  // not a hollow fan. Fewer higher up (density falloff).
  const nLat=d===0?1:d===1?r()<.6?1:0:d===2?r()<.4?1:0:0;
  for(let k=0;k<nLat;k++){
   const t=.6+r()*.2;
   const px=x+Math.cos(a)*len*t,py=y+Math.sin(a)*len*t;
   const side=r()<.5?-1:1;
   let na=a+side*baseSpread*.9+(r()-.5)*.3;
   na+=(-Math.PI/2-na)*pull;
   branch(px,py,na,len*(.5+r()*.1),Math.max(1.2,w*.6),d+1);
  }
 }
 // Trunk 105: the branches start low, like a broadleaf tree, but not so
 // low the tree turns squat and flat-topped. Base (390,940) is the game's
 // island anchor; the trunk base sits 18px below the island top.
 branch(390,940,-Math.PI/2+lean,105,13,0);
 const obj={branches,tips,fruits};
 if(shapeCache.size>110)shapeCache.delete(shapeCache.keys().next().value);
 shapeCache.set(seed,obj);return obj;
}
function ellipse(c,x,y,rx,ry,color,rot=0){
 c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,rot,0,TAU);c.fill();
}
function glow(c,x,y,r,color,alpha=1){
 c.save();c.globalAlpha*=alpha;
 const g=c.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,color);g.addColorStop(.24,color+'a8');g.addColorStop(1,color+'00');
 c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.restore();
}
// Pre-rendered glow sprites (the prototype's soft canopy). One 64px sprite per
// color, stamped with drawImage: far cheaper than a gradient per leaf, and the
// overlapping stamps are what make the crown read as one luminous cloud.
// Falls back to the gradient glow when there is no document (bare Node).
const spriteCache=new Map();
function glowSprite(color){
 if(spriteCache.has(color))return spriteCache.get(color);
 let s=null;
 if(typeof document!=='undefined'&&document.createElement){
  try{
   s=document.createElement('canvas');s.width=s.height=64;
   const sc=s.getContext('2d');
   if(sc){
    const g=sc.createRadialGradient(32,32,2,32,32,32);
    g.addColorStop(0,'#ffffff');g.addColorStop(.25,color);g.addColorStop(1,color+'00');
    sc.fillStyle=g;sc.fillRect(0,0,64,64);
   }
  }catch(e){s=null;}
 }
 spriteCache.set(color,s);return s;
}
function stampGlow(c,x,y,size,color,alpha){
 const s=glowSprite(color);
 if(s&&typeof c.drawImage==='function'){
  c.save();c.globalAlpha*=clamp(alpha,0,1);
  c.drawImage(s,x-size,y-size,size*2,size*2);c.restore();return;
 }
 glow(c,x,y,size,color,alpha);
}
// Flat leaf sprites (style C): each leaf is pre-rendered once to an
// offscreen canvas (gradient from a darker base to a lighter tip, central
// vein, side veins, edge highlight) and stamped with drawImage. Three
// shapes break the uniform "blob" look. Falls back to a simple painted
// leaf when there is no document (bare Node in tests).
function shadeHex(hex,amt){
 const n=parseInt(hex.slice(1),16);
 let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
 const t=amt<0?0:255,p=Math.abs(amt);
 r=Math.round(r+(t-r)*p);g=Math.round(g+(t-g)*p);b=Math.round(b+(t-b)*p);
 return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
const leafSpriteCache=new Map();
function leafSprite(color,variant){
 const key=color+'|'+variant;
 if(leafSpriteCache.has(key))return leafSpriteCache.get(key);
 let cv=null;
 if(typeof document!=='undefined'&&document.createElement){
  try{
   cv=document.createElement('canvas');cv.width=64;cv.height=96;
   const g=cv.getContext('2d');
   if(g){
    const cx=32,top=5,bot=91,len=bot-top;
    const grad=g.createLinearGradient(0,bot,0,top);
    grad.addColorStop(0,shadeHex(color,-.28));
    grad.addColorStop(.6,color);
    grad.addColorStop(1,shadeHex(color,.24));
    g.fillStyle=grad;g.beginPath();
    if(variant===0){
     g.moveTo(cx,top);
     g.bezierCurveTo(cx+22,top+len*.25,cx+20,top+len*.65,cx,bot);
     g.bezierCurveTo(cx-20,top+len*.65,cx-22,top+len*.25,cx,top);
    }else if(variant===1){
     g.moveTo(cx,top);
     g.bezierCurveTo(cx+27,top+len*.2,cx+27,top+len*.75,cx,bot);
     g.bezierCurveTo(cx-27,top+len*.75,cx-27,top+len*.2,cx,top);
    }else{
     g.moveTo(cx,top);
     g.bezierCurveTo(cx+14,top+len*.3,cx+15,top+len*.7,cx,bot);
     g.bezierCurveTo(cx-15,top+len*.7,cx-14,top+len*.3,cx,top);
    }
    g.fill();
    g.strokeStyle='rgba(255,255,255,0.30)';g.lineWidth=2;g.lineCap='round';
    g.beginPath();g.moveTo(cx,bot-4);g.lineTo(cx,top+6);g.stroke();
    g.strokeStyle='rgba(255,255,255,0.16)';g.lineWidth=1.4;
    for(const t of [.3,.5,.7]){
     const y=top+len*t;
     g.beginPath();g.moveTo(cx,y);g.lineTo(cx+13,y+8);g.stroke();
     g.beginPath();g.moveTo(cx,y);g.lineTo(cx-13,y+8);g.stroke();
    }
    g.strokeStyle='rgba(255,255,255,0.22)';g.lineWidth=2;
    g.beginPath();g.moveTo(cx,top);
    g.bezierCurveTo(cx-20,top+len*.3,cx-18,top+len*.65,cx,bot);g.stroke();
   }
  }catch(e){cv=null;}
 }
 leafSpriteCache.set(key,cv);return cv;
}
function drawLeafSprite(c,sprite,x,y,len,angle,color){
 const wid=len*.62;
 if(sprite&&typeof c.drawImage==='function'){
  c.save();c.translate(x,y);c.rotate(angle);
  c.drawImage(sprite,-wid/2,-len/2,wid,len);c.restore();return;
 }
 // No sprite (bare Node): a simple flat leaf so the shape still reads.
 c.save();c.translate(x,y);c.rotate(angle);
 c.fillStyle=color||'#7fe7c4';
 c.beginPath();c.moveTo(0,-len/2);
 c.bezierCurveTo(wid/2,-len*.2,wid/2,len*.3,0,len/2);
 c.bezierCurveTo(-wid/2,len*.3,-wid/2,-len*.2,0,-len/2);
 c.fill();c.restore();
}
function flatSparkle(c,x,y,r,color){
 c.fillStyle=color;c.beginPath();
 c.moveTo(x,y-r);c.quadraticCurveTo(x,y,x+r,y);c.quadraticCurveTo(x,y,x,y+r);
 c.quadraticCurveTo(x,y,x-r,y);c.quadraticCurveTo(x,y,x,y-r);c.fill();
}
// One three-layer leaf cluster: back (large, dark), mid, front (family
// color). Coordinates are tree/design units; the caller (shape) already
// has the canvas scale applied through paint().
function flatLeafAt(c,pal,x,y,a,size,phase){
 const variant=Math.abs(Math.floor(((phase||0)/TAU)*3))%3;
 const layers=[
  {col:pal.back,size:1.80,off:-6,rot:-.35},
  {col:pal.mid,size:1.15,off:0,rot:.12},
  {col:pal.front,size:.95,off:6,rot:.38}];
 for(const L of layers){
  const ox=Math.cos(a)*L.off,oy=Math.sin(a)*L.off;
  const len=size*8*L.size;
  const wob=Math.sin(phase||0)*.5;
  drawLeafSprite(c,leafSprite(L.col,variant),x+ox,y+oy,len,a+Math.PI/2+L.rot+wob,L.col);
 }
}
function stroke(c,x,y,xx,yy,color,w){
 c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.beginPath();
 c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();
}
function night(c,time,seed,count,still){
 const sky=c.createLinearGradient(0,0,0,H);
 sky.addColorStop(0,'#12101c');sky.addColorStop(.55,'#1e1a33');sky.addColorStop(1,'#2a2140');
 c.fillStyle=sky;c.fillRect(0,0,W,H);
 const moon=c.createRadialGradient(590,257,4,590,257,380);
 moon.addColorStop(0,'#9385c426');moon.addColorStop(1,'#6b4c9400');
 c.fillStyle=moon;c.fillRect(0,0,W,800);
 const r=rng(seed^0x15A2DC);
 for(let i=0;i<100;i++){
  const x=r()*W,y=r()*760,rad=.5+r()*1.8;
  c.globalAlpha=still?.62:.35+.48*Math.abs(Math.sin(time*.001+i*2.1));
  c.fillStyle=i%11?'#f3f0ef':'#77e8dd';c.beginPath();c.arc(x,y,rad,0,TAU);c.fill();
 }
 c.globalAlpha=1;
 if(count>=5){
  for(let b=0;b<3;b++){
   c.save();c.globalCompositeOperation='screen';
   const y=128+b*76,grad=c.createLinearGradient(0,y-70,0,y+130);
   grad.addColorStop(0,'#7ff8db00');grad.addColorStop(.45,b===1?'#bc90ff4a':'#72f4c84a');
   grad.addColorStop(1,'#7fe7c400');
   c.fillStyle=grad;c.beginPath();c.moveTo(-50,y+105);
   for(let x=-50;x<=W+50;x+=28)c.lineTo(x,y+Math.sin(x*.010+b*1.8+(still?0:time*.00035))*44);
   c.lineTo(W+50,y+155);c.closePath();c.fill();c.restore();
  }
 }
 if(count>=1){
  glow(c,600,236,138,'#ffe3a6',.45);
  ellipse(c,600,236,33,33,'#ffe8b9');
  ellipse(c,589,231,6,6,'#e9cd96');
 }
 c.fillStyle='#110e22';c.beginPath();c.moveTo(0,H);
 c.lineTo(0,976);c.quadraticCurveTo(370,918,W,966);c.lineTo(W,H);c.closePath();c.fill();
 const hill=c.createLinearGradient(0,970,0,H);
 hill.addColorStop(0,'#203044');hill.addColorStop(1,'#100e21');c.fillStyle=hill;
 c.beginPath();c.moveTo(0,1023);c.quadraticCurveTo(430,968,W,1044);c.lineTo(W,H);c.lineTo(0,H);c.fill();
 if(count>=3){
  for(let i=0;i<8;i++){
   const x=102+i*81,y=1026+Math.sin(i*1.25)*8;
   glow(c,x,y,19,i%2?'#7fe7c4':'#c8abff',.48);
   ellipse(c,x,y,7,4,'#bdf1d4');stroke(c,x,y,x,y+8,'#d5d4cf',2);
  }
 }
 if(count>=4){
  ellipse(c,220,1038,120,21,'#1d3550');
  c.strokeStyle='#74e4f6a8';c.lineWidth=2;
  for(let i=0;i<3;i++){c.beginPath();c.ellipse(218,1036+i*4,70-i*13,7,0,0,Math.PI);c.stroke();}
  ellipse(c,302,1025,15,6,'#63bc87');
 }
}
function island(c,y,lift=0){
 // Flat faceted island (style C): a low-poly rock with a flat grass top,
 // a glowing pond and tiny geometric bushes. No soft mound, no legs.
 const top=y-18+lift;
 const X=dx=>390+dx,Y=dy=>top+dy;
 c.fillStyle='#3a2f5e';
 c.beginPath();
 c.moveTo(X(-150),Y(0));c.lineTo(X(-90),Y(-12));c.lineTo(X(0),Y(-14));
 c.lineTo(X(90),Y(-12));c.lineTo(X(150),Y(0));c.lineTo(X(110),Y(48));
 c.lineTo(X(0),Y(80));c.lineTo(X(-110),Y(48));c.closePath();c.fill();
 c.fillStyle='#4a3f7a';
 c.beginPath();c.moveTo(X(-150),Y(0));c.lineTo(X(0),Y(-14));c.lineTo(X(0),Y(80));c.closePath();c.fill();
 c.fillStyle='#2e4a6b';
 c.beginPath();c.moveTo(X(150),Y(0));c.lineTo(X(0),Y(-14));c.lineTo(X(0),Y(80));c.closePath();c.fill();
 c.fillStyle='#2a2140';
 c.beginPath();c.moveTo(X(-110),Y(48));c.lineTo(X(110),Y(48));c.lineTo(X(0),Y(80));c.closePath();c.fill();
 c.fillStyle='#5ec8a8';
 c.beginPath();
 c.moveTo(X(-150),Y(0));c.lineTo(X(-90),Y(-12));c.lineTo(X(0),Y(-14));
 c.lineTo(X(90),Y(-12));c.lineTo(X(150),Y(0));c.lineTo(X(150),Y(7));
 c.lineTo(X(-150),Y(7));c.closePath();c.fill();
 c.strokeStyle='#8fe8c6';c.lineWidth=1.6;
 c.beginPath();
 c.moveTo(X(-150),Y(0));c.lineTo(X(-90),Y(-12));c.lineTo(X(0),Y(-14));
 c.lineTo(X(90),Y(-12));c.lineTo(X(150),Y(0));c.stroke();
 c.fillStyle='#6ee7ff';
 c.beginPath();c.ellipse(X(52),Y(1),52,9,0,0,TAU);c.fill();
 c.strokeStyle='rgba(255,255,255,0.75)';c.lineWidth=1.4;
 c.beginPath();c.ellipse(X(52),Y(0),38,5,0,Math.PI*1.15,Math.PI*1.85);c.stroke();
 for(const [bx,s2] of [[-108,1],[118,.8]]){
  c.fillStyle='#7fe7c4';
  c.beginPath();
  c.moveTo(X(bx-12*s2),Y(0));c.lineTo(X(bx),Y(-14*s2));c.lineTo(X(bx+12*s2),Y(0));
  c.closePath();c.fill();
 }
 c.fillStyle='#bfe9ff';
 c.beginPath();
 c.moveTo(X(-32),Y(-16));c.lineTo(X(-26),Y(-2));c.lineTo(X(-38),Y(-2));
 c.closePath();c.fill();
}
function seed(c,s,time,topic){
 const pulse=.85+(time?Math.sin(time*.002)*.10:0),y=950;
 glow(c,390,y,108,topic||'#7fe7c4',.7*pulse);
 ellipse(c,390,y,36,47,'#261b42');
 const gr=c.createLinearGradient(363,y-48,412,y+49);
 gr.addColorStop(0,'#5e467b');gr.addColorStop(1,'#24182e');
 ellipse(c,390,y,30,41,gr,-.16);
 c.strokeStyle='#d6e9dc';c.lineWidth=2;c.beginPath();c.ellipse(390,y,31,42,.1,Math.PI*.93,Math.PI*1.56);c.stroke();
 if(s>0){stroke(c,387,y-40,383,y-24,'#ffecbf',2.2);stroke(c,383,y-24,393,y-15,'#ffecbf',2.2);}
 if(s>1)stroke(c,399,y-24,395,y-3,'#ffecbf',2);
 if(s>0){
  const h=s===1?51:81;
  stroke(c,390,y-27,390,y-h,'#53c5a7',6);
  for(const side of [-1,1]){
   c.save();c.translate(390+side*14,y-h+8);c.rotate(side*.7);
   ellipse(c,0,0,20,9,topic||'#7fe7c4');c.restore();
  }
  glow(c,390,y-h,35,topic||'#7fe7c4',.65);
 }
}
function paintLeaves(c,shape,pal,time,n,shown){
 // Flat canopy: real leaf clusters in three layers at every visible tip,
 // plus clusters at depth-2/3 branch ends and at depth-1/2 branch
 // midpoints, so the crown is a solid mass, not a hollow shell. No flat
 // wash behind it and no glow stamps for the tree body: the back layer
 // of big leaves IS the mass.
 const tips=shape.tips;
 const tipCount=Math.floor(tips.length*Math.min(1,n/16));
 for(let i=0;i<tipCount;i++){
  const tp=tips[i];
  flatLeafAt(c,pal,tp.x,tp.y,(tp.a!==undefined?tp.a:-Math.PI/2),tp.size,tp.phase);
 }
 for(const b of shown){
  if(b.d!==3&&b.d!==2)continue;
  const a=Math.atan2(b.y1-b.y,b.x1-b.x);
  // Leaf clusters follow the branches and taper outward: depth-3 ends get
  // full leaves, depth-2 ends get smaller ones, so the crown fills from
  // the inside out instead of being a shell.
  flatLeafAt(c,pal,b.x1,b.y1,a,b.d===3?3.4:2.5,b.x1);
 }
 // Fill the middle: leaf clusters along the inner branches, not just at
 // their ends. Without this the trunk and the bare limbs show through
 // the middle of the crown and it reads as a ring with a hole in it.
 for(const b of shown){
  if(b.d!==1&&b.d!==2)continue;
  const a=Math.atan2(b.y1-b.y,b.x1-b.x);
  flatLeafAt(c,pal,(b.x+b.x1)/2,(b.y+b.y1)/2,a,b.d===1?3.0:2.5,(b.x+b.x1)/2);
 }
 // A few gold accent leaves.
 for(let i=0;i<tipCount;i+=6){
  const tp=tips[i],a=(tp.a!==undefined?tp.a:-Math.PI/2);
  const variant=Math.abs(Math.floor(((tp.phase||0)/TAU)*3))%3;
  drawLeafSprite(c,leafSprite(pal.gold,variant),tp.x,tp.y,tp.size*4.5,a+Math.PI/2+.5,pal.gold);
 }
 // Golden geometric fruits from 8 turns on.
 if(n>=8){
  for(const f of (shape.fruits||[])){
   const pulse=.7+.3*Math.sin(time*.0016+f.phase);
   const r=4.5;
   c.save();c.globalAlpha*=pulse;c.fillStyle='#ffd98f';
   c.beginPath();c.moveTo(f.x,f.y-r);c.lineTo(f.x+r,f.y);c.lineTo(f.x,f.y+r);c.lineTo(f.x-r,f.y);c.closePath();c.fill();c.restore();
  }
 }
}
function stars(c,tips,time){
 // Flat constellation: star sparkles at every third tip. No connecting
 // lines — with the wide horizontal limbs the tips are far apart, and
 // lines across the gaps read as stray strings.
 for(let i=0;i<tips.length;i+=3){
  const p=tips[i];
  flatSparkle(c,p.x,p.y,10,'#fff7e0');
  flatSparkle(c,p.x,p.y,5,'#ffffff');
 }
 void time;
}
function crystals(c,tips){
 // Flat crystal: small faceted ice shards at every third tip.
 for(let i=0;i<tips.length;i+=3){
  const p=tips[i],h=26,w=9;
  const g=c.createLinearGradient(p.x,p.y-h,p.x,p.y);
  g.addColorStop(0,'#e8f7ff');g.addColorStop(.55,'#7cc8ff');g.addColorStop(1,'#3a86c8');
  c.fillStyle=g;
  c.beginPath();c.moveTo(p.x,p.y-h);c.lineTo(p.x+w,p.y+2);c.lineTo(p.x-w,p.y+2);c.closePath();c.fill();
  c.strokeStyle='rgba(255,255,255,0.7)';c.lineWidth=1;
  c.beginPath();c.moveTo(p.x,p.y-h);c.lineTo(p.x,p.y+2);c.stroke();
 }
}
function lanterns(c,tips,time){
 // Flat lantern: warm paper lanterns hanging at every fifth tip.
 for(let i=0;i<tips.length;i+=5){
  const p=tips[i];
  const wiggle=Math.sin(time*.0015+i)*3;
  const x=p.x+wiggle,y=p.y+12;
  stampGlow(c,x,y,24,'#ffc978',.55);
  const lg=c.createLinearGradient(x,y-13,x,y+13);
  lg.addColorStop(0,'#ffe7a6');lg.addColorStop(.45,'#ffad69');lg.addColorStop(1,'#e07856');
  c.fillStyle=lg;
  c.beginPath();c.ellipse(x,y,11,13,0,0,TAU);c.fill();
  c.strokeStyle='rgba(255,241,195,0.8)';c.lineWidth=1.2;
  c.beginPath();c.moveTo(x,y-13);c.lineTo(x,y+13);c.stroke();
  c.strokeStyle='#f9c49d';c.lineWidth=1.5;
  c.beginPath();c.moveTo(x,y+13);c.lineTo(x,y+20);c.stroke();
  c.fillStyle='#fff5d0';
  c.beginPath();c.arc(x,y,3,0,TAU);c.fill();
 }
}
function petals(c,tips,time){
 // Flat petal: the pink palette already makes the canopy a blossom fall;
 // this adds only the drifting petals below the crown.
 for(let i=0;i<34;i++){
  const x=200+(i*53)%380,y=635+(i*61+(time*.012||0))%245;
  ellipse(c,x+Math.sin(i)*7,y,5,2.5,'#ffd0e8',i*.85);
 }
 void tips;
}
function shape(c,tree,n,x,y,scale,alpha,time,staticMode,marks){
 if(!tree||!goodSeed(tree.seed))return;
 const seedNum=tree.seed,stageNow=stage(n),shape=bones(seedNum);
 const palette=colorFamilies[seedNum%3],sx=scale,sy=scale;
 c.save();c.globalAlpha*=alpha;c.translate(x,y);c.scale(sx,sy);c.translate(-390,-940);
 if(stageNow==='seed'||stageNow==='sprout'){
  seed(c,n,time,marks&&marks.length?topicColors[marks[0]]:palette);c.restore();return;
 }
 const vis=Math.ceil(shape.branches.length*clamp(n/16,.2,1)),tips=shape.tips;
 const end=stageNow==='final';
 // Branches stay one quiet dark stroke each, prototype-thin (b.w, never
 // thicker): warm dark wood rather than near-black, so they read as
 // branches, not black sticks. Slot trees get their branches dimmed
 // further so their leaves, not their skeleton, are what shows through
 // the tree in front of them.
 c.save();
 if(alpha<1)c.globalAlpha*=.62;
 for(let i=0;i<vis;i++){
  const b=shape.branches[i],sway=staticMode?0:Math.sin(time*.0012+seedNum*.01)*Math.max(0,(5-b.d))*1.1;
  c.lineCap='round';c.strokeStyle='#2e2118';c.lineWidth=Math.max(1,b.w);
  c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x1+sway,b.y1);c.stroke();
 }
 // Warm brown bark trunk: a gradient quad over the first branch, with
 // wavy bark ridges, a knot and moss. The thin dark branch stroke
 // underneath reads as a bark edge.
 if(vis>0){
  const b0=shape.branches[0];
  const sway0=staticMode?0:Math.sin(time*.0012+seedNum*.01)*5.5;
  const dx=b0.x1+sway0-b0.x,dy=b0.y1-b0.y,len=Math.hypot(dx,dy)||1;
  const ux=dx/len,uy=dy/len,px=-uy,py=ux;
  const w0=8,w1=4.5;
  const g=c.createLinearGradient(b0.x,b0.y,b0.x1+sway0,b0.y1);
  g.addColorStop(0,'#7a4e2d');g.addColorStop(1,'#a9714b');
  c.fillStyle=g;
  c.beginPath();
  c.moveTo(b0.x+px*w0,b0.y+py*w0);
  c.lineTo(b0.x1+sway0+px*w1,b0.y1+py*w1);
  c.lineTo(b0.x1+sway0-px*w1,b0.y1-py*w1);
  c.lineTo(b0.x-px*w0,b0.y-py*w0);
  c.closePath();c.fill();
  c.fillStyle='rgba(200,150,100,0.5)';
  c.beginPath();
  c.moveTo(b0.x+px*w0,b0.y+py*w0);
  c.lineTo(b0.x1+sway0+px*w1,b0.y1+py*w1);
  c.lineTo(b0.x1+sway0+px*w1*.15,b0.y1+py*w1*.15);
  c.lineTo(b0.x+px*w0*.15,b0.y+py*w0*.15);
  c.closePath();c.fill();
  c.strokeStyle='rgba(60,35,15,0.4)';c.lineWidth=1.4;c.lineCap='round';
  for(const off of [-.55,0,.55]){
   const bx0=b0.x+px*w0*off,by0=b0.y+py*w0*off;
   const bx1=b0.x1+sway0+px*w1*off,by1=b0.y1+py*w1*off;
   const mxp=(bx0+bx1)/2+px*3*off,myp=(by0+by1)/2+py*3*off;
   c.beginPath();c.moveTo(bx0,by0);
   c.quadraticCurveTo(mxp,myp,bx1,by1);c.stroke();
  }
  const kx=b0.x+dx*.55,ky=b0.y+dy*.55;
  c.fillStyle='rgba(60,35,15,0.45)';
  c.beginPath();c.ellipse(kx,ky,3.2,4.5,0,0,TAU);c.fill();
  c.strokeStyle='rgba(45,25,10,0.5)';c.lineWidth=1;
  c.beginPath();c.ellipse(kx,ky,4.6,6.5,0,0,TAU);c.stroke();
  c.fillStyle='rgba(127,231,196,0.75)';
  c.beginPath();c.ellipse(b0.x+dx*.3+px*w0*.5,b0.y+dy*.3,3,2,0,0,TAU);c.fill();
  c.beginPath();c.ellipse(b0.x+dx*.72-px*w0*.4,b0.y+dy*.72,2.4,1.8,0,0,TAU);c.fill();
 }
 c.restore();
 // The leaf canopy is the tree itself. Every stage from sapling on draws
 // the dense flat leaves first; the final form is a palette change plus
 // a small accent laid on top of the canopy, never a replacement for it.
 const formId=form(seedNum).id;
 const pal=end&&FLAT_FORMS[formId]?FLAT_FORMS[formId]:FLAT_PALETTES[seedNum%3];
 const shown=shape.branches.slice(0,vis);
 paintLeaves(c,shape,pal,time,n,shown);
 if(stageNow==='sapling'){
  // A young tree needs a crown, not a bare twig: small flat leaf
  // clusters gather around the highest visible tips.
  const shownTips=tips.slice(0,Math.max(1,Math.ceil(tips.length*n/16)));
  const top=shownTips.slice().sort((a,b)=>a.y-b.y).slice(0,4);
  for(const tp of top){
   flatLeafAt(c,pal,tp.x,tp.y,(tp.a!==undefined?tp.a:-Math.PI/2),3,tp.phase);
  }
 }
 if(end){
  // Slot trees sit behind the active tree and behind each other: their
  // solid forms (lantern bodies, crystal facets, blossoms) are dimmed so
  // the tree behind still shows through. Their glow stays brighter.
  c.save();if(alpha<1)c.globalAlpha*=.75;
  if(formId==='constellation')stars(c,tips,time);
  else if(formId==='crystal')crystals(c,tips);
  else if(formId==='lantern')lanterns(c,tips,time);
  else petals(c,tips,time);
  c.restore();
 }
 if(Array.isArray(marks)){
  // Persistent leaf geometry for every sentence: not transient UI confetti.
  // Use newly revealed branch tips, never a detached row of identical dots.
  // Each topic gets a physical luminous pair of leaves that remains afterward.
  const shown=Math.min(n,marks.length,16);
  for(let i=2;i<shown;i++){
   const idx=Math.min(shape.branches.length-1,
    Math.max(0,Math.ceil(shape.branches.length*(i+1)/16)-1));
   const b=shape.branches[idx],xx=b.x1,yy=b.y1,topic=marks[i];
   const col=topicColors[topic]||topicColors.daily,latest=i===shown-1;
   const phase=seedNum*.001+i*1.618;
   const sway=staticMode?0:Math.sin(time*.0013+phase)*1.7;
   const size=latest?13:9.5;
   if(latest)stampGlow(c,xx,yy,46,col,.55+.3*Math.sin(time*.003+phase));
   else stampGlow(c,xx,yy,19,col,.27);
   c.save();c.translate(xx+sway,yy);
   c.rotate(Math.sin(phase)*.24);
   for(const side of [-1,1]){
    c.save();c.rotate(side*.53);
    ellipse(c,side*size*.67,-size*.35,size*.90,size*.42,col,side*.36);
    ellipse(c,side*size*.73,-size*.45,size*.37,size*.16,'#f7fff3cc',side*.36);
    c.restore();
   }
   c.restore();
   if(latest){
    // The newest sentence stays visibly alive: three sparks orbit its leaves.
    for(let k=0;k<3;k++){
     const a=time*.0022+k*TAU/3+phase;
     const gx=xx+Math.cos(a)*17,gy=yy+Math.sin(a)*13;
     stampGlow(c,gx,gy,7,'#ffffff',.7);
     ellipse(c,gx,gy,1.8,1.8,'#ffffff');
    }
   }
  }
  // Keep the original per-topic dots as tiny veins / pollen accents.
  for(let i=0;i<shown;i++){
   const p=tips[(i*7+seedNum%5)%Math.max(1,tips.length)];
   if(!p)continue;
   const col=topicColors[marks[i]]||topicColors.daily;
   glow(c,p.x,p.y,i===shown-1?28:19,col,i===shown-1?.80:.42);
   ellipse(c,p.x,p.y,3.8,3.8,'#ffffff');
   ellipse(c,p.x+1,p.y,2.6,2.6,col);
  }
 }
 c.restore();
}
function paint(canvas,g,active,time=0,opts={}){
 if(!canvas||typeof canvas.getContext!=='function')return false;
 const c=canvas.getContext('2d');if(!c)return false;
 const width=opts.width||canvas.width||W,height=opts.height||canvas.height||H;
 const dpr=opts.dpr||1,still=!!opts.still;
 c.save();c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);
 c.scale(width/W,height/H);
 const n=clamp(Number(active?.growth?.length)||0,0,16);
 const display=opts.reveal?.tree||active;
 const showN=opts.reveal?16:n;
 night(c,time,display?.seed||314159,g.totalCompleted,still);
 const current=display&&goodSeed(display.seed)?display:{seed:314159,growth:[]};
 const p=opts.motion&&!still?clamp((time-opts.motion.start)/1250,0,1):1;
 const prev=opts.motion?opts.motion.fromTurns:n;
 const turns=prev+(showN-prev)*p;
 const st=stage(showN);
 // Prototype growth scale: the sapling stays small, the tree is full size
 // from the island stage on. No overshoot at the reveal: the flash and the
 // burst sell the transformation, and a 17% wider crown would swallow the
 // trees behind it.
 let growth=st==='seed'||st==='sprout'?1:st==='sapling'?.5+.2*clamp((turns-3)/4,0,1):1;
 // The art carries its own ground (mound / floating island), so the
 // procedural island platform is only drawn when the art is not ready.
 const artActive=artReady(artImage(form(current.seed).id,st));
 if(showN>=8&&!artActive)island(c,940,(1-p)*(opts.motion?.fromTurns<8?86:0));
 // The foreground tree is anchored in the same place at every age.
 drawTree(c,current,showN,390,940,growth,1,time,still,current.growth?.map(x=>x.topic));
 // Forest trees are drawn after the active tree: the art images carry
 // an opaque sky, so a slot drawn first would be hidden behind the
 // active tree's image. The slots sit at the sides, so they read as
 // trees flanking the hero, not trees in front of it.
 for(let i=0;i<g.slots.length;i++){
  const slot=slots[i],tree=g.slots[i];
  if(!slot||!tree)continue;
  drawTree(c,tree,16,slot.x,slot.y,slot.s,slot.a,time,still,tree.topics);
 }
 if(opts.reveal){
  glow(c,390,553,240,'#ffde9f',.20);
  for(let i=0;i<20;i++){
   const angle=i*2.39996,rad=32+i*9;
   const x=390+Math.cos(angle)*rad,y=560+Math.sin(angle)*rad;
   glow(c,x,y,12,i%3?'#7fe7c4':'#ffeab6',.76);
  }
  if(opts.reveal.started&&time-opts.reveal.started<260&&!still){
   c.fillStyle='#fff1c58c';c.fillRect(0,0,W,H);
  }
 }
 for(let i=0;i<Math.min(3+g.totalCompleted*2,15);i++){
  const a=i*2.29+current.seed*.001,x=390+Math.sin(a)*250,
   y=680+Math.cos(a)*220+(still?0:Math.sin(time*.001+i)*10);
  glow(c,x,y,15,i%2?'#7fe7c4':'#ffe9a8',.59);
 }
 c.restore();return true;
}
const forestLevels=[
 {at:0,name:'新芽森林',icon:'🌱'},
 {at:3,name:'螢菇森林',icon:'🍄'},
 {at:4,name:'月池森林',icon:'💧'},
 {at:5,name:'極光森林',icon:'🌌'}
];
function forestLevel(n){
 return forestLevels.reduce((level,item)=>n>=item.at?item:level,forestLevels[0]);
}
// Copy is generated from the latest topic marker, not from the user's private
// message. Only topic features are persisted, including in retired trees.
const leafQuotes={
 food:'今天長出一片琥珀色的香甜。',
 cosmos:'剛剛那顆星，落在了新生的枝梢。',
 travel:'這一片葉子，想帶我們去遠方。',
 animals:'有小腳印，悄悄走進森林裡。',
 music:'夜風一吹，枝葉就輕輕唱起歌。',
 daily:'今天的小小一句，成為森林的新光。',
 tech:'一點靈感，正在枝頭閃閃發亮。',
 love:'溫柔的話，讓樹開出一盞暖燈。',
 weather:'雨後的夜色，把新葉洗得明亮。',
 nature:'綠色的生命，又向天空長了一點。',
 dream:'一個夢，讓月亮多了一條小路。',
 stress:'今天的心事，變成一片柔軟的葉。',
 play:'奇妙的笑聲，種出一個新驚喜。'
};
function latestTopic(g,active){
 const live=active?.growth;
 if(Array.isArray(live)&&live.length)return live[live.length-1]?.topic||'daily';
 const last=g?.slots?.[g.slots.length-1];
 return last?.topics?.[last.topics.length-1]||'daily';
}
function poster(canvas,g,active,now,opts={}){
 if(!canvas||!g)return false;
 canvas.width=1080;canvas.height=1920;
 const c=canvas.getContext('2d');if(!c)return false;
 const art=document.createElement('canvas');
 art.width=1080;art.height=1440;
 if(!paint(art,g,active,now,{width:1080,height:1440,still:true,reveal:opts.reveal||null}))return false;
 c.setTransform(1,0,0,1,0,0);
 c.fillStyle='#12101C';c.fillRect(0,0,1080,1920);
 c.drawImage(art,0,0,1080,1440);
 // Exactly the bottom quarter of the poster is the information zone.
 c.fillStyle='#12101C';c.fillRect(0,1440,1080,480);
 c.fillStyle='#6257E7';c.fillRect(0,1440,1080,8);
 const level=forestLevel(g.totalCompleted);
 const topic=opts.topic||latestTopic(g,active);
 const quote=leafQuotes[topic]||leafQuotes.daily;
 c.textAlign='left';c.textBaseline='alphabetic';
 c.fillStyle='#a9a0ff';c.font='700 27px system-ui';
 c.fillText('CREW TREE LAB    ·    '+level.icon+' '+level.name,64,1512);
 c.fillStyle='#F7F7F4';c.font='800 52px system-ui';
 c.fillText('我的森林 · '+g.totalCompleted+' 棵樹',64,1580);
 const total=g.totalCompleted*MAX+Math.min(MAX,active?.growth?.length||0);
 c.fillStyle='#cbc6d8';c.font='500 30px system-ui';
 c.fillText('和 Zoe 聊了 '+total+' 句，讓這片森林慢慢發光',64,1641);
 c.fillStyle='#6257E7';c.fillRect(64,1676,8,85);
 c.fillStyle='#F7F7F4';c.font='700 27px system-ui';
 c.fillText('今天新長出的一句話',90,1700);
 c.font='500 32px system-ui';
 c.fillText('「'+quote+'」',90,1751);
 const dt=opts.date instanceof Date?opts.date:new Date();
 const stamp=dt.getFullYear()+'/'+String(dt.getMonth()+1).padStart(2,'0')+'/'+String(dt.getDate()).padStart(2,'0');
 c.fillStyle='#b9b4cb';c.font='500 25px system-ui';c.fillText(stamp+' · Crew 種樹',64,1845);
 c.textAlign='right';c.fillStyle='#F7F7F4';c.font='750 29px system-ui';c.fillText('3sssi.com',1016,1845);
 return true;
}

preloadArt();
root.CrewGlowForestV6=Object.freeze({
 W,H,MAX,forms,slots,topicColors,stage,form,rarity,empty,restore,snapshot,complete,progress,
 paint,poster,forestLevel,leafQuotes,latestTopic,preloadArt
});
})(typeof window!=='undefined'?window:globalThis);
