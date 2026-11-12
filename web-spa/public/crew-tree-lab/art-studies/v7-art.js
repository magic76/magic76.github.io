/* Crew Tree Art V7: tactile painted trunk and a visible watercolor paper grain.
   No stored user data. Deterministic frame-to-frame: textures are cached by seed. */
(function(root){'use strict';
const TAU=Math.PI*2;
function rng(seed){let x=(seed>>>0);return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
const moods={cosmos:['#516b89','#91a8b4','#dde4cb'],warmth:['#986f7e','#c19a92','#e9d1ae'],music:['#71658e','#aaa1bb','#e8d9cc'],travel:['#4c8787','#8cb4a4','#d9e0bc']};
function livingTrunk(c,stage,seed,topic,time,still){
 if(stage<8)return;
 const cols=moods[topic]||moods.cosmos,old=c.globalAlpha,wide=stage>=16?67:48;
 const top=stage>=16?399:470,x=400,foot=756,phase=still?0:Math.sin(time*.00055+seed*.04)*2;
 c.save();c.lineJoin='round';c.lineCap='round';
 // Broad, connected corkscrew trunk: taper up, root mass down, with real volume.
 c.beginPath();c.moveTo(x-wide*.93,foot-17);
 c.bezierCurveTo(x-wide*1.04,690,x+wide*.54+phase,610,x-wide*.44,top+49);
 c.quadraticCurveTo(x-wide*.66,top+5,x-wide*.18,top-9);
 c.quadraticCurveTo(x+wide*.43,top-13,x+wide*.49,top+43);
 c.bezierCurveTo(x+wide*1.16,581,x-wide*.08,674,x+wide*.96,foot-17);
 c.closePath();
 const bark=c.createLinearGradient(x-wide,top,x+wide,foot);
 bark.addColorStop(0,cols[1]);bark.addColorStop(.30,cols[0]);bark.addColorStop(.60,'#345d68');
 bark.addColorStop(.77,'#806d72');bark.addColorStop(1,'#bca391');
 c.fillStyle=bark;c.fill();c.strokeStyle='#354e5f';c.lineWidth=3.4;c.stroke();
 const clip=c.save.bind(c);void clip;
 c.save();c.clip();
 // Root-to-crown bark ribbons that read as cellulose grooves, not detached wires.
 const r=rng(seed^0xB44A79);
 for(let i=0;i<24;i++){
  const v=i/24,yy=top+35+v*(foot-top-35);
  const xx=x+(r()-.5)*wide*1.25;
  const length=12+r()*49,curve=(r()-.5)*28;
  c.globalAlpha=old*(.22+r()*.37);
  c.strokeStyle=i%4===0?cols[2]:i%3===0?'#253f58':'#ead4b9';
  c.lineWidth=.8+r()*3.5;
  c.beginPath();c.moveTo(xx,yy);
  c.bezierCurveTo(xx+curve,yy+length*.30,xx-curve,yy+length*.67,xx+curve*.3,yy+length);
  c.stroke();
 }
 // Broad, faint pigment pools and broken edge strokes produce watercolor bark tooth.
 for(let i=0;i<19;i++){
  const y=top+30+r()*(foot-top-45),x0=x+(r()-.5)*wide*.96;
  c.globalAlpha=old*(.04+r()*.07);c.fillStyle=i%2?'#f5e1ba':'#314a64';
  c.beginPath();c.ellipse(x0,y,wide*(.12+r()*.24),9+r()*23,r()*.7,0,TAU);c.fill();
 }
 c.restore();c.globalAlpha=old;
 // Strongly visible coral heel and connected buttress roots, not needle-thin lines.
 const m=stage>=16?1:.75;
 c.beginPath();c.moveTo(x-74*m,foot-15);
 c.bezierCurveTo(x-105*m,foot-30,x-126*m,foot-5,x-129*m,foot+13);
 c.quadraticCurveTo(x-98*m,foot+5,x-74*m,foot+20);
 c.quadraticCurveTo(x,foot+40,x+74*m,foot+20);
 c.quadraticCurveTo(x+102*m,foot+3,x+129*m,foot+13);
 c.bezierCurveTo(x+125*m,foot-12,x+105*m,foot-29,x+74*m,foot-15);
 c.quadraticCurveTo(x,foot-35,x-74*m,foot-15);c.closePath();
 const reef=c.createLinearGradient(x-40,foot-30,x+80,foot+30);
 reef.addColorStop(0,cols[0]);reef.addColorStop(.42,'#cbac99');reef.addColorStop(1,'#526c73');
 c.fillStyle=reef;c.fill();c.strokeStyle='#53616f';c.lineWidth=3;c.stroke();
 for(let i=0;i<13;i++){
  const a=(i/13)*TAU,r0=16+(i%4)*5,px=x+Math.cos(a)*r0*3.8*m,py=foot+Math.sin(a)*12;
  c.fillStyle=i%3?'#ead7c4':'#9eb7a8';
  c.beginPath();c.ellipse(px,py,2.8+i%3,4.5+i%4,.3,0,TAU);c.fill();
 }
 c.restore();
}
const tiles=new Map();
function grainTile(seed){
 if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
 const key=seed>>>0;if(tiles.has(key))return tiles.get(key);
 const cv=document.createElement('canvas');cv.width=256;cv.height=256;
 const ctx=cv.getContext('2d');if(!ctx)return null;
 const a=ctx.createImageData(256,256),pixels=a.data,r=rng(key^0xF12B0A);
 for(let i=0;i<pixels.length;i+=4){
  const d=r(),dark=d<.52;
  pixels[i]=dark?87:253;pixels[i+1]=dark?90:243;pixels[i+2]=dark?93:211;
  pixels[i+3]=Math.round(12+r()*29+(d<.03?58:0));
 }
 ctx.putImageData(a,0,0);
 // A few fibers whose size remains legible after downsampling to 390px.
 for(let i=0;i<155;i++){
  const x=r()*256,y=r()*256,l=3+r()*13;
  ctx.strokeStyle=i%2?'#8c777a35':'#f7eed653';ctx.lineWidth=.5+r()*1.25;
  ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+l*.5,y-1,x+l,y+(r()-.5)*4);ctx.stroke();
 }
 if(tiles.size>=6)tiles.delete(tiles.keys().next().value);
 tiles.set(key,cv);return cv;
}
function picturebookFinish(c,seed,scene,stage){
 c.save();const inherited=c.globalAlpha,r=rng(seed^0xF00D53^(scene==='jelly'?4129:0)^(stage*97));
 const tile=grainTile(seed);
 if(tile){
  const pattern=c.createPattern(tile,'repeat');
  if(pattern){c.globalAlpha*=.81;c.fillStyle=pattern;c.fillRect(0,0,800,820);c.globalAlpha=inherited;}
 }else{
  for(let i=0;i<160;i++){
   c.globalAlpha=inherited*.14;c.fillStyle=i%2?'#836c69':'#f5ebd3';
   c.fillRect(r()*800,r()*820,1+r()*5,1+r()*2);
  }
  c.globalAlpha=inherited;
 }
 // Watercolor pools bleed past each other with irregular and translucent edges.
 for(let i=0;i<68;i++){
  const x=r()*800,y=r()*820,rx=6+r()*28,ry=3+r()*14;
  c.globalAlpha=inherited*(.018+r()*.042);
  c.fillStyle=i%3===0?'#f8e9c5':i%3===1?'#729b9e':'#ad858f';
  c.beginPath();c.ellipse(x,y,rx,ry,(r()-.5)*.6,0,TAU);c.fill();
 }
 c.globalAlpha=inherited;
 // A softly deckled vignette instead of a synthetic hard rectangle.
 const g=c.createRadialGradient(390,390,188,398,405,550);
 g.addColorStop(0,'#fff4e500');g.addColorStop(.75,'#e8cfbd09');g.addColorStop(1,'#a0877d52');
 c.fillStyle=g;c.fillRect(0,0,800,820);
 c.restore();
}
root.CrewFantasyV7=Object.freeze({livingTrunk,picturebookFinish,grainTile});
})(window);
