/* Crew Fantasy Paint V2 — original art direction, no additional runtime dependencies.
 * Plates are hand-authored SVGs; light, watercolor, depth and secondary creatures
 * are deterministic Canvas 2D overlays. All scene anchors are world coordinates.
 * Static/reduced-motion and live scenes share the same geometry.
 */
(function(root){'use strict';
const TAU=Math.PI*2;
const mix=(a,b,t)=>a+(b-a)*t,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const families=['crown-spiral.svg','crown-willow.svg','crown-lantern.svg','crown-moon.svg'];
function rand(seed){let a=seed>>>0;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function path(c,pts,fill,stroke,sw){
 c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
 c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=sw||1;c.stroke();}
}
function rockPath(c,x,sy,w){
 const p=w/500;c.beginPath();
 c.moveTo(x-w*.46,sy+w*.019);c.bezierCurveTo(x-w*.29,sy-w*.050,x-w*.06,sy-w*.083,x+w*.32,sy-w*.033);
 c.bezierCurveTo(x+w*.49,sy-w*.007,x+w*.46,sy+w*.075,x+w*.38,sy+w*.113);
 c.bezierCurveTo(x+w*.26,sy+w*.21,x+w*.24,sy+w*.34,x+w*.075,sy+w*.47);
 c.bezierCurveTo(x+w*.01,sy+w*.53,x-w*.04,sy+w*.56,x-w*.09,sy+w*.49);
 c.bezierCurveTo(x-w*.22,sy+w*.36,x-w*.27,sy+w*.21,x-w*.41,sy+w*.105);c.closePath();
 void p;
}
function watercolor(c,x,y,r,color,seed,amount=22){
 const rr=rand(seed);c.save();
 for(let i=0;i<amount;i++){
  const a=rr()*TAU,t=.14+Math.sqrt(rr())*.89,px=x+Math.cos(a)*r*t,py=y+Math.sin(a)*r*.65*t;
  const width=r*(.05+rr()*.16),height=width*(.28+rr()*.42);
  c.globalAlpha=.025+rr()*.055;c.fillStyle=color;c.beginPath();
  c.ellipse(px,py,width,height,rr()*TAU,0,TAU);c.fill();
 }
 c.restore();
}
function islandWash(c,x,sy,w,index,seed){
 const r=rand(seed^Math.imul(index+7,7531));
 c.save();rockPath(c,x,sy,w);c.clip();
 // Alternating mineral wash bands; light to the upper left, deep blue-violet at bottom.
 for(let i=0;i<7;i++){
  const y=sy+w*(.07+i*.057);
  c.strokeStyle=i%2?'#f1cfb253':'#354b6a50';
  c.lineWidth=w*(.016+i*.001);
  c.beginPath();c.moveTo(x-w*.46,y-w*.014);
  c.bezierCurveTo(x-w*.24,y+w*.026,x+w*.15,y-w*.030,x+w*.44,y+w*.016);c.stroke();
 }
 const cliff=c.createLinearGradient(x-w*.5,sy-w*.1,x+w*.36,sy+w*.50);
 cliff.addColorStop(0,'#ffe9bf24');cliff.addColorStop(.51,'#92708008');cliff.addColorStop(1,'#333f6564');
 c.fillStyle=cliff;c.fillRect(x-w*.5,sy-w*.10,w,w*.75);
 for(let i=0;i<25;i++){
  const xx=x+(r()-.5)*w*.88,yy=sy+w*(.04+r()*.40);
  const light=i%3===0;c.fillStyle=light?'#f2dfc05e':'#444c694a';
  path(c,[[xx,yy],[xx+w*(.016+r()*.027),yy-w*(.010+r()*.020)],[xx+w*.02,yy+w*.028]],null,null);
  c.fill();
 }
 c.restore();
 watercolor(c,x,sy+w*.2,w*.36,'#f9d9c7',seed+31,32);
}
function hangingRoots(c,x,sy,w,seed,stage,index,time,staticMode){
 const r=rand(seed^Math.imul(41+index,65599));
 for(let i=0;i<(stage>=16?7:stage>=8?5:3);i++){
  const o=(r()-.5)*w*.78,s=.21+r()*.23,y0=sy+w*(.12+r()*.10),y1=y0+w*s;
  const sway=staticMode?0:Math.sin(time*.00054+i*1.4)*w*.015;
  c.strokeStyle=i%2?'#56766cbb':'#866879b8';c.lineWidth=w*(.004+i%3*.0012);c.lineCap='round';
  c.beginPath();c.moveTo(x+o,y0);
  c.bezierCurveTo(x+o+w*.07,y0+w*.11,x+o-w*.02+sway,y1-w*.10,x+o+sway-w*.035,y1);c.stroke();
  c.fillStyle=i%2?'#93b99e':'#cad4a8';
  c.beginPath();c.ellipse(x+o+sway-w*.034,y1,4+w*.005,7+w*.008,.55,0,TAU);c.fill();
 }
}
function cascade(c,x,sy,w,index,time,staticMode,stage){
 if(stage<8||index>1)return;
 const xx=x+w*(index===0?.36:-.29),yt=sy+w*.045,yy=yt+w*(index===0?.66:.54);
 const d=staticMode?0:Math.sin(time*.0011+index)*w*.01;
 c.save();
 let g=c.createLinearGradient(xx,yt,xx-w*.10,yy);
 g.addColorStop(0,'#def5ecdd');g.addColorStop(.40,'#72c5c9b8');g.addColorStop(1,'#b8e7dc12');
 c.fillStyle=g;c.beginPath();c.moveTo(xx-w*.018,yt);
 c.bezierCurveTo(xx+w*.025,yt+w*.16,xx-w*.062,yt+w*.33,xx-w*.075+d,yy);
 c.quadraticCurveTo(xx-w*.04+d,yy+w*.05,xx+w*.009+d,yy);
 c.bezierCurveTo(xx+w*.031,yt+w*.35,xx-w*.01,yt+w*.13,xx+w*.016,yt);
 c.closePath();c.fill();
 c.strokeStyle='#f8f4e2c9';c.lineWidth=w*.007;c.beginPath();c.moveTo(xx-w*.004,yt);
 c.bezierCurveTo(xx+w*.003,yt+w*.16,xx-w*.057,yt+w*.32,xx-w*.049+d,yy);c.stroke();
 const rr=rand(index+stage+19);
 for(let i=0;i<13;i++){const xx2=xx-w*.078+(rr()-.5)*w*.12,yy2=yy+(rr()-.5)*w*.1;
  c.fillStyle='#effaf1a6';c.beginPath();c.ellipse(xx2,yy2,w*.0025+rr()*w*.006,w*.003+rr()*w*.007,0,0,TAU);c.fill();}
 c.restore();
}
function stones(c,x,sy,w,seed,index,time,staticMode,stage){
 if(stage<8)return;
 const r=rand(seed^Math.imul(index+1,9127)),n=stage>=16?10:5;
 for(let i=0;i<n;i++){
  let xx=x+(r()-.5)*w*.76,yy=sy+w*(.39+r()*.38);
  const motion=staticMode?0:Math.sin(time*.0006+i+index)*2.5;
  const s=w*(.006+r()*.021);
  c.globalAlpha=.35+r()*.45;
  const gr=c.createLinearGradient(xx-s,yy-s,xx+s,yy+s);
  gr.addColorStop(0,'#f5d6b7');gr.addColorStop(1,'#62647b');
  path(c,[[xx-s,yy],[xx-s*.45,yy-s],[xx+s*.7,yy-s*.65],[xx+s,yy+motion+s*.5],[xx,yy+s+motion]],gr,'#65677a95',.7);
 }
 c.globalAlpha=1;
}
function floatUnit(c,u,index,m,time,staticMode,art){
 const r=rand(m.seed^Math.imul(index+1,21919));
 const yDrift=staticMode?0:Math.sin(time*.00062+m.phase+index*1.46)*6;
 const xDrift=staticMode?0:Math.sin(time*.00029+index)*3.5;
 const maturity=m.stage<=3?.70:m.stage<=8?.87:1;
 const w=u.w*(index===0?maturity:1);
 const x=u.x+xDrift,y=u.y+yDrift,sy=y-w*.29;
 // SVG plate grass sits around 17% down from its top. Paint everything from
 // that same ground level — the old independent wash looked like a floating disk.
 const ground=sy+w*.17;
 c.save();c.translate(x,y);c.rotate(u.lean+(staticMode?0:Math.sin(time*.00034+index)*.009));c.translate(-x,-y);
 const sh=c.createRadialGradient(x,y+w*.51,0,x,y+w*.51,w*.43);
 sh.addColorStop(0,'#476b6760');sh.addColorStop(1,'#476b6700');c.fillStyle=sh;
 c.beginPath();c.ellipse(x,y+w*.50,w*.4,w*.08,0,0,TAU);c.fill();
 // Roots and waterfalls grow behind, mineral strata are laid over the plate.
 hangingRoots(c,x,ground,w,m.seed,m.stage,index,time,staticMode);
 art(c,'floating-island.svg',x-w*.5,sy,w,w*.62);
 islandWash(c,x,ground,w,index,m.seed);
 cascade(c,x,ground,w,index,time,staticMode,m.stage);
 stones(c,x,ground,w,m.seed,index,time,staticMode,m.stage);
 const name=index===0?families[0]:index===1?families[1]:index===2?families[2]:families[3];
 const crownFactor=index===0?(m.stage<=3?.64:m.stage<=8?.84:1):index===1?.96:index===2?.94:.84;
 const cw=w*(index===0?.97:.95)*crownFactor;
 const ch=w*(index===0?.94:index===1?1.07:index===2?.97:.87)*crownFactor;
 const top=ground-ch*.95+w*.070;
 art(c,name,x-cw*.50,top,cw,ch);
 // Small grounded details, not emoji pasted over crown.
 if(m.stage>=8&&index===0){
  c.save();c.fillStyle='#eedcb4';c.strokeStyle='#8d7775';c.lineWidth=2;
  const bx=x+w*.20,by=ground+w*.055;
  path(c,[[bx-w*.035,by],[bx-w*.035,by-w*.16],[bx,by-w*.23],[bx+w*.04,by-w*.16],[bx+w*.04,by]],'#f0ccab','#85747c',1.7);
  path(c,[[bx-w*.05,by-w*.15],[bx,by-w*.255],[bx+w*.06,by-w*.15]],'#715d70','#715d70',1.1);
  c.fillStyle='#fff4d1';c.fillRect(bx-w*.002,by-w*.14,w*.021,w*.036);c.restore();
 }
 if(m.stage>=16||index===0)for(let k=0;k<5;k++){
  const px=x+(r()-.5)*w*.75,py=ground+w*(.02+r()*.08);
  const col=k%2?'#e7cd9e':'#bad2a7';
  c.fillStyle=col;c.beginPath();c.ellipse(px,py,2.7+r()*2,3.4+r()*3,r()*TAU,0,TAU);c.fill();
 }
 c.restore();
}
function earthGlow(c,x,y,r,color){
 const gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,color);gr.addColorStop(.35,'#e6e6bd3f');gr.addColorStop(1,'#fff9dc00');
 c.fillStyle=gr;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
}
function forest(c,seed,scene){
 const r=rand(seed^0x922e51);
 c.save();
 const horizon=scene==='island'?610:669;
 for(let depth=0;depth<3;depth++){
  c.beginPath();c.moveTo(-20,horizon+depth*38);
  for(let i=0;i<=14;i++){
   const x=i*66-35,y=horizon+Math.sin(i*.86+depth)*16+Math.cos(i*.46+depth)*22+depth*24;
   c.lineTo(x,y);
  }
  c.lineTo(820,820);c.lineTo(-20,820);c.closePath();
  c.fillStyle=['#9cbab364','#8aa39b47','#607d7560'][depth];c.fill();
 }
 for(let i=0;i<11;i++){
  const x=55+(i*77+seed%41)%735,y=39+(i*43)%140,rx=26+r()*51;
  c.globalAlpha=.035+r()*.065;c.fillStyle='#fff7e4';
  c.beginPath();c.ellipse(x,y,rx,10+r()*16,-.12,0,TAU);c.fill();
 }
 c.globalAlpha=1;c.restore();
}
function frame(c,scene,seed){
 c.save();const gr=c.createRadialGradient(402,380,220,402,399,638);
 gr.addColorStop(0,'#0a3a3300');gr.addColorStop(.80,'#4e6c6f10');gr.addColorStop(1,'#294b5661');
 c.fillStyle=gr;c.fillRect(0,0,800,820);
 // A hand-painted view through foreground fern and leaves, slight translucency for depth.
 const r=rand(seed^0xb37a);for(const side of [-1,1]){
  const bx=side<0?-10:811,by=820,far=side<0?1:-1;
  c.strokeStyle='#3f706d70';c.lineWidth=9;c.beginPath();c.moveTo(bx,by);
  c.bezierCurveTo(bx+far*60,730,bx+far*20,650,bx+far*125,574);c.stroke();
  for(let i=0;i<8;i++){
   const y=800-i*32,x=bx+far*(i*14+15),xx=x+far*(25+r()*40),yy=y-17-r()*25;
   c.fillStyle=i%2?'#6b97916b':'#d8d6a37b';
   c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(xx+far*25,yy,xx,yy);
   c.quadraticCurveTo(x+far*5,yy+4,x,y);c.fill();
  }
 }
 c.restore();
}
function firefly(c,x,y,seed,i,time,still){
 const phase=seed*.09+i*2.39996;
 x+=still?0:Math.sin(time*.00077+phase)*8;
 y+=still?0:Math.sin(time*.00098+phase)*5;
 const glow=still?.78:(.45+.4*(.5+.5*Math.sin(time*.002+phase)));
 earthGlow(c,x,y,12+glow*8,'#fff0bf9a');
 c.fillStyle='#fbf5c6';c.beginPath();c.arc(x,y,2.3+glow*1.5,0,TAU);c.fill();
}
function bird(c,x,y,scale,flap=0){
 c.save();c.translate(x,y);c.scale(scale,scale);
 c.fillStyle='#536f75';c.strokeStyle='#536f75';c.lineWidth=2;c.lineCap='round';
 c.beginPath();c.ellipse(0,2,9,4,-.15,0,TAU);c.fill();
 c.beginPath();c.moveTo(-2,0);c.quadraticCurveTo(-17,-13-flap,-31,-6-flap*.5);c.quadraticCurveTo(-15,-3,-1,5);c.fill();
 c.beginPath();c.moveTo(2,0);c.quadraticCurveTo(21,-20+flap,34,-11+flap*.5);c.quadraticCurveTo(18,-5,2,5);c.fill();
 c.fillStyle='#f8dc9c';c.beginPath();c.moveTo(9,1);c.lineTo(16,2);c.lineTo(9,5);c.fill();c.restore();
}
function fish(c,x,y,s,dir,swim){
 c.save();c.translate(x,y);c.scale(s*dir,s);c.rotate(Math.sin(swim)*.08);
 c.fillStyle='#78b0a4';c.strokeStyle='#4a777f';c.lineWidth=1.2;
 c.beginPath();c.ellipse(0,0,15,7,0,0,TAU);c.fill();c.stroke();
 path(c,[[-13,0],[-25,-10],[-24,9]],'#a4d2bd','#5c8e95',1.3);
 path(c,[[-4,-4],[6,-12],[9,-3]],'#d8d5b0','#669b99',1);
 c.fillStyle='#f5e8c9';c.beginPath();c.arc(8,-1.3,2.3,0,TAU);c.fill();
 c.fillStyle='#4e7080';c.beginPath();c.arc(8,-1.4,1.1,0,TAU);c.fill();c.restore();
}
function life(c,m,time,still){
 const stage=m.stage,seed=m.seed,r=rand(seed^0x96ba2);
 c.save();
 if(m.scene==='island'){
  const cnt=stage<=3?2:stage<=8?5:11;
  const target=m.units[0];
  for(let i=0;i<cnt;i++){
   const xx=target.x-155+r()*310,yy=target.y-265+r()*167;
   firefly(c,xx,yy,seed,i,time,still);
  }
  if(stage>=8)bird(c,137+(still?0:Math.sin(time*.00018)*21),188,stage>=16?.80:.55,still?0:Math.sin(time*.011)*5);
  if(stage>=16){bird(c,610+(still?0:Math.sin(time*.00027+1)*28),112,.54,still?0:Math.sin(time*.008+2)*7);
   fish(c,596+(still?0:Math.sin(time*.00032)*18),458,.73,-1,time*.002);}
 }else{
  const num=stage<=3?2:stage<=8?5:10;
  for(let i=0;i<num;i++){
   const x=190+r()*425,y=440+r()*256;
   if(i%3===0)firefly(c,x,y,seed,i,time,still);
   else fish(c,x+(still?0:Math.sin(time*.00034+i)*20),y,stage<=3?.48:.67,i%2?-1:1,time*.0015+i);
  }
 }
 c.restore();
}
function twistedTrunk(c,stage,seed,time,still){
 const thick=stage<=3?20:stage<=8?34:52, strands=stage<=3?3:stage<=8?4:6;
 c.save();
 // The spiralling stalk has an actual wide body; not several straight lines.
 const center=401,base=764,top=stage<=3?435:stage<=8?412:386;
 const r=rand(seed^0xc681);
 c.beginPath();c.moveTo(center-thick,base);
 c.bezierCurveTo(center-thick*1.2,688,center+thick*1.5,569,center-thick*.72,top);
 c.quadraticCurveTo(center,top-19,center+thick*.70,top);
 c.bezierCurveTo(center+thick*1.4,552,center-thick*1.6,681,center+thick*1.18,base);
 c.closePath();
 let bark=c.createLinearGradient(center-thick*2,top,center+thick*2,base);
 bark.addColorStop(0,'#477a80');bark.addColorStop(.27,'#416e78');
 bark.addColorStop(.62,'#678c87');bark.addColorStop(.86,'#c09b93');bark.addColorStop(1,'#49596e');
 c.fillStyle=bark;c.fill();c.strokeStyle='#445f6d';c.lineWidth=2.7;c.stroke();
 for(let i=0;i<strands;i++){
  const x=center+(i-(strands-1)/2)*thick*.55,amp=thick*(.60+i%2*.42);
  c.beginPath();c.moveTo(x,base-2);
  c.bezierCurveTo(x+amp,680-i*3,x-amp,544+i*2,x+Math.sin(i*1.8)*thick*.45,top+8);
  c.strokeStyle=i%2?'#d7b4a0a1':'#284f668f';c.lineWidth=Math.max(2.8,thick*.22);c.lineCap='round';c.stroke();
  c.beginPath();c.moveTo(x-2,base-12);
  c.bezierCurveTo(x+amp+5,673-i*3,x-amp+3,550+i*2,x+Math.sin(i*1.8)*thick*.45,top+8);
  c.strokeStyle=i%2?'#e1ecc3a2':'#a8dfd9b0';c.lineWidth=1.6+stage/12;c.stroke();
 }
 // Braided living tendrils spiral OUTSIDE the main trunk and visibly
 // return to it. They must not read as parallel lines on a narrow pole.
 const sideCount=stage<=3?1:stage<=8?3:5;
 for(let i=0;i<sideCount;i++){
  const side=i%2?1:-1,baseY=base-36-(i%3)*12;
  const tipY=top+55+(i%4)*54;
  const sway=still?0:Math.sin(time*.00058+i*.91+seed*.002)*5;
  const outX=center+side*(thick*(1.40+i%3*.24))+sway;
  c.strokeStyle=i%2?'#4e817f':'#5b6c77';
  c.lineWidth=Math.max(5,thick*(.25-(i%3)*.023));
  c.lineCap='round';
  c.beginPath();c.moveTo(center+side*thick*.44,baseY);
  c.bezierCurveTo(outX,baseY-79,outX+side*16,tipY+90,
   center+side*(thick*.58),tipY);c.stroke();
  c.strokeStyle=i%2?'#daead5a3':'#c9afba9e';c.lineWidth=1.7;
  c.beginPath();c.moveTo(center+side*thick*.44,baseY-5);
  c.bezierCurveTo(outX-side*3,baseY-74,outX+side*11,tipY+84,
   center+side*(thick*.59),tipY);c.stroke();
 }
 if(stage>=8){
  const coreY=stage>=16?568:615;
  earthGlow(c,center,coreY,stage>=16?42:25,'#c3efe0a0');
  for(const d of [-1,1]){
   const gx=center+d*thick*.26;
   earthGlow(c,gx,coreY-8,10,'#f8eac69c');
   c.fillStyle='#e1ebcd';c.beginPath();c.ellipse(gx,coreY-8,4,9,d*.35,0,TAU);c.fill();
  }
 }
 // Inset glowing branching runes twist over the bark.
 for(let i=0;i<(stage<=3?5:stage<=8?10:16);i++){
  const yy=base-30-i*(stage<=3?46:stage<=8?34:23),o=Math.sin(i*1.9+seed*.03)*thick*.48;
  const glow=still?.67:(.55+.4*Math.sin(time*.0014+i*.53));
  c.strokeStyle='rgba(208,243,202,'+(.31+glow*.45)+')';c.lineWidth=1.2+i%3*.45;
  c.beginPath();c.moveTo(center+o,yy);
  c.quadraticCurveTo(center+o+11,yy-10,center+o+Math.sin(i)*9,yy-19);c.stroke();
  if(i%3===0)earthGlow(c,center+o,yy-10,13,'#c8f2deb0');
 }
 // Fan of root-tentacles anchors the body to the forest floor.
 for(let i=0;i<(stage<=3?4:stage<=8?6:9);i++){
  const side=i%2?1:-1,j=Math.floor(i/2)+1,spread=stage<=3?18:stage<=8?31:42;
  const tip=center+side*(spread+j*(stage<=3?10:stage<=8?16:21)),sy=766+j%3*9;
  c.strokeStyle=i%3?'#4f7675':'#97797a';c.lineWidth=Math.max(1.5,thick*(.57-j*.075));
  c.beginPath();c.moveTo(center+side*thick*.35,730);
  c.bezierCurveTo(center+side*(thick*.75+j*5),755,tip-side*16,755,tip,sy);c.stroke();
  c.strokeStyle='#e2d5afa6';c.lineWidth=1.1;c.beginPath();
  c.moveTo(center+side*thick*.35,735);c.quadraticCurveTo(tip-side*15,756,tip,sy);c.stroke();
 }
 watercolor(c,center,630,thick*2.7,'#adccba',seed+25,16);
 c.restore();
}
function canopy(c,art,stage,time,still,seed){
 const spec=stage<=3?{w:367,h:251,y:260}:stage<=8?{w:465,h:305,y:199}:{w:555,h:352,y:121};
 const x=400-spec.w*.50,phase=still?0:Math.sin(time*.00143+seed*.03);
 const sx=1+(stage>=8?phase*.022:phase*.009),sy=1+(stage>=8?phase*.047:phase*.022);
 c.save();c.translate(400,spec.y+spec.h*.65);c.scale(sx,sy);c.translate(-400,-spec.y-spec.h*.65);
 // Soft transmitted light is visible underneath the watercolored outer cap.
 const halo=c.createRadialGradient(400,spec.y+spec.h*.40,4,400,spec.y+spec.h*.5,spec.w*.5);
 halo.addColorStop(0,'#ffebd3a3');halo.addColorStop(.48,'#dcbed65a');halo.addColorStop(1,'#dbdbb300');
 c.fillStyle=halo;c.beginPath();c.ellipse(400,spec.y+spec.h*.55,spec.w*.52,spec.h*.55,0,0,TAU);c.fill();
 art(c,'jelly-canopy.svg',x,spec.y,spec.w,spec.h);
 if(stage>=8){
  c.save();c.globalAlpha=stage>=16?.64:.41;
  art(c,'jelly-inner-membrane.svg',x+spec.w*.034,spec.y+spec.h*.01,spec.w*.93,spec.h*.91);
  c.restore();
  const n=stage>=16?11:7;
  for(let i=0;i<n;i++){
   const t=(i+1)/(n+1),px=x+t*spec.w,yy=spec.y+spec.h*(.49+.17*Math.abs(t-.5));
   c.strokeStyle='rgba(252,234,207,'+(.24+(i%3)*.10)+')';c.lineWidth=1.4;
   c.beginPath();c.moveTo(400,spec.y+spec.h*.22);
   c.quadraticCurveTo(px,yy-26,px,yy+spec.h*.145);c.stroke();
  }
 }
 if(stage>=16)for(let i=0;i<6;i++){
  const t=(i+1)/7,xx=x+t*spec.w,yy=spec.y+spec.h*.64;
  earthGlow(c,xx,yy,12+phase*2,'#f7eed3bd');
 }
 c.restore();return {x,y:spec.y,w:spec.w,h:spec.h};
}
function lanternLight(c,art,x,y,size,index,time,still,stage){
 const offset=(index*710)%3200;
 const wave=still?(index%3===0?.95:index%3===1?.57:.35):(.52+.48*Math.sin(time*.0021-index*.70-offset*.00037));
 const power=stage<=8?.5:wave;
 earthGlow(c,x+size*.5,y+size*.77,size*(.9+power*.3),'#ffe6bcb5');
 c.save();c.globalAlpha=.68+power*.32;art(c,'lantern-bud.svg',x,y,size,size*1.35);c.restore();
 earthGlow(c,x+size*.51,y+size*.75,size*.44,'#ffe6aeec');
 c.fillStyle='rgba(255,240,188,'+(.55+power*.35)+')';c.beginPath();c.ellipse(x+size*.5,y+size*.76,size*.095,size*.20,0,0,TAU);c.fill();
}
root.CrewFantasyPaint=Object.freeze({families,floatUnit,forest,frame,life,twistedTrunk,canopy,lanternLight});
})(window);