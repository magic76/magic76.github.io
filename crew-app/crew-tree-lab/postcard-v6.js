/* Crew Tree V6 postcard layout — deliberately isolated from forest-v6.js art.
 * The forest painter supplies a static scene; this module only formats PNG.
 */
(function(root){'use strict';
const WIDTH=1080,HEIGHT=1920,ART_HEIGHT=1440,FOOTER=480;
const text=(c,str,x,y,font,color)=>{
 c.font=font;c.fillStyle=color;c.fillText(str,x,y);
};
// Omit the revealed tree's matching slot, preserving all other slot positions.
function sceneGarden(g,tree){
 if(!g||!Array.isArray(g.slots)||tree?.seed==null)return g;
 if(!g.slots.some(s=>s?.seed===tree.seed))return g;
 return {...g,slots:g.slots.map(s=>s?.seed===tree.seed?null:s)};
}
function forestLabel(n){
 return n>=5?{icon:'🌌',name:'極光'}:
  n>=4?{icon:'💧',name:'小池塘'}:
  n>=3?{icon:'🍄',name:'螢光菇小路'}:
  {icon:'🌱',name:'森林奇景待解鎖'};
}
function forestEvent(engine,g,active,options){
 if(options.forestEvent)return options.forestEvent;
 const total=Math.max(0,Math.floor(g.totalCompleted||0));
 const age=active?.growth?.length||0;
 if(age>=1&&age<16)return age>=8?'小樹托起了一座發光浮島':
  age>=3?'種子破殼，長出一棵小樹':'這顆種子已聽見 '+age+' 句話';
 if(total===5)return '🌌 森林亮起了極光';
 if(total===4)return '💧 森林長出了一座小池塘';
 if(total===3)return '🍄 螢光菇小路出現了';
 const last=options.reveal?.tree||(age>=16?active:g.slots?.[g.slots.length-1]);
 return total>0&&last?.seed!=null?
  '森林長出了一棵'+engine.form(last.seed).name:'一顆發光種子正等待第一句話';
}
function render(out,garden,active,time=1000,options={}){
 const engine=root.CrewGlowForestV6;
 if(!engine||!out||!garden||typeof out.getContext!=='function')return false;
 const art=document.createElement('canvas');art.width=WIDTH;art.height=ART_HEIGHT;
 if(!engine.paint(art,sceneGarden(garden,options.reveal?.tree||active),active,time,{width:WIDTH,height:ART_HEIGHT,still:true,
   reveal:options.reveal||null}))return false;
 out.width=WIDTH;out.height=HEIGHT;
 const c=out.getContext('2d');if(!c)return false;
 c.setTransform(1,0,0,1,0,0);
 c.fillStyle='#12101C';c.fillRect(0,0,WIDTH,HEIGHT);
 c.drawImage(art,0,0,WIDTH,ART_HEIGHT);

 // Delicate printed border lives *above* the supplied scene, never in the art engine.
 c.save();c.strokeStyle='#e1d0ff77';c.lineWidth=2;
 c.strokeRect(24,24,WIDTH-48,ART_HEIGHT-48);
 c.strokeStyle='#ffffff26';c.lineWidth=1;
 c.strokeRect(34,34,WIDTH-68,ART_HEIGHT-68);c.restore();

 // Bottom quarter: a readable midnight-violet postcard inscription.
 c.fillStyle='#12101C';c.fillRect(0,ART_HEIGHT,WIDTH,FOOTER);
 c.fillStyle='#6257E7';c.fillRect(0,ART_HEIGHT,WIDTH,8);
 c.fillStyle='#e9deff20';c.fillRect(64,1816,952,1);
 const completed=Math.max(0,Math.floor(garden.totalCompleted||0));
 const level=forestLabel(completed);
 const event=forestEvent(engine,garden,active,options);
 const maxTurns=engine.MAX||16;
 // A completed tree already contributes to totalCompleted; never count
 // the 16th sentence again when saving the frozen reveal moment.
 const inForest=!!options.reveal||
  !!garden.slots?.some(item=>item.seed===active?.seed);
 const ongoing=inForest?0:Math.min(maxTurns,active?.growth?.length||0);
 const turns=completed*maxTurns+ongoing;
 c.textAlign='left';c.textBaseline='alphabetic';
 text(c,'CREW TREE LAB   ·   '+level.icon+' '+level.name,64,1512,'700 27px system-ui','#a9a0ff');
 const living=garden.slots?.length||0;
 const retired=Math.max(0,completed-living);
 text(c,'共種了 '+completed+' 棵樹',64,1580,'800 52px system-ui','#F7F7F4');
 text(c,'和 Zoe 聊了 '+turns+' 句 · 森林現有 '+living+' 棵'+
  (retired?'，'+retired+' 棵已退休':''),64,1641,'500 30px system-ui','#cbc6d8');
 c.fillStyle='#6257E7';c.fillRect(64,1676,8,85);
 text(c,'森林最新的成長',90,1700,'700 27px system-ui','#F7F7F4');
 text(c,event,90,1751,'500 32px system-ui','#F7F7F4');
 const d=options.date instanceof Date?options.date:new Date();
 const stamp=d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+
  '.'+String(d.getDate()).padStart(2,'0');
 text(c,stamp+' · Crew 種樹',64,1845,'500 25px system-ui','#b9b4cb');
 c.textAlign='right';
 text(c,'3sssi.com',1016,1845,'750 29px system-ui','#F7F7F4');
 // Signed and numbered as a keepsake, without leaking seed/user identity.
 c.textAlign='right';
 text(c,'✦  GLOW FOREST / POSTCARD',1016,1512,'700 19px system-ui','#d7c4f1');
 c.textAlign='left';return true;
}
root.CrewForestPostcardV6=Object.freeze({render,sceneGarden,forestLabel,forestEvent,WIDTH,HEIGHT,ART_HEIGHT,FOOTER});
})(typeof window!=='undefined'?window:globalThis);
