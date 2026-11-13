/* Crew Tree V6 postcard layout — deliberately isolated from forest-v6.js art.
 * The forest painter supplies a static scene; this module only formats PNG.
 */
(function(root){'use strict';
const WIDTH=1080,HEIGHT=1920,ART_HEIGHT=1440,FOOTER=480;
const text=(c,str,x,y,font,color)=>{
 c.font=font;c.fillStyle=color;c.fillText(str,x,y);
};
function render(out,garden,active,time=1000,options={}){
 const engine=root.CrewGlowForestV6;
 if(!engine||!out||!garden||typeof out.getContext!=='function')return false;
 const art=document.createElement('canvas');art.width=WIDTH;art.height=ART_HEIGHT;
 if(!engine.paint(art,garden,active,time,{width:WIDTH,height:ART_HEIGHT,still:true,
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
 const level=engine.forestLevel(completed);
 const topic=options.topic||engine.latestTopic(garden,active);
 const quote=engine.leafQuotes[topic]||engine.leafQuotes.daily;
 const maxTurns=engine.MAX||16;
 // A completed tree already contributes to totalCompleted; never count
 // the 16th sentence again when saving the frozen reveal moment.
 const inForest=!!options.reveal||
  !!garden.slots?.some(item=>item.seed===active?.seed);
 const ongoing=inForest?0:Math.min(maxTurns,active?.growth?.length||0);
 const turns=completed*maxTurns+ongoing;
 c.textAlign='left';c.textBaseline='alphabetic';
 text(c,'CREW TREE LAB   ·   '+level.icon+' '+level.name,64,1512,'700 27px system-ui','#a9a0ff');
 text(c,'我的森林 · '+completed+' 棵樹',64,1580,'800 52px system-ui','#F7F7F4');
 text(c,'和 Zoe 聊了 '+turns+' 句，讓這片森林慢慢發光',
  64,1641,'500 30px system-ui','#cbc6d8');
 c.fillStyle='#6257E7';c.fillRect(64,1676,8,85);
 text(c,'今天新長出的一句話',90,1700,'700 27px system-ui','#F7F7F4');
 text(c,'「'+quote+'」',90,1751,'500 32px system-ui','#F7F7F4');
 const d=options.date instanceof Date?options.date:new Date();
 const stamp=d.getFullYear()+'/'+String(d.getMonth()+1).padStart(2,'0')+
  '/'+String(d.getDate()).padStart(2,'0');
 text(c,stamp+' · Crew 種樹',64,1845,'500 25px system-ui','#b9b4cb');
 c.textAlign='right';
 text(c,'3sssi.com',1016,1845,'750 29px system-ui','#F7F7F4');
 // Signed and numbered as a keepsake, without leaking seed/user identity.
 c.textAlign='right';
 text(c,'✦  GLOW FOREST / POSTCARD',1016,1512,'700 19px system-ui','#d7c4f1');
 c.textAlign='left';return true;
}
root.CrewForestPostcardV6=Object.freeze({render,WIDTH,HEIGHT,ART_HEIGHT,FOOTER});
})(typeof window!=='undefined'?window:globalThis);
