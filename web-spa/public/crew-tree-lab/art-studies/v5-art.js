/* Crew Tree Fantasy Art V5 — original 10-leaf spiral stair, staged growth,
 * accessible touch responses and composited water canopy.
 * Pure Canvas2D, deterministic, no storage, no network, no new packages.
 */
(function(root){'use strict';
const TAU=Math.PI*2,limit=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=p=>{const t=limit(p);return t*t*(3-2*t);};
function rand(seed){let x=seed>>>0;return ()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function glow(c,x,y,r,center){
 const g=c.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,center);g.addColorStop(1,'#ffffff00');
 c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
}
// A measured ten-leaf spiral staircase, NOT a continuous doodle ring.
// Each tier is one individually bounded, beveled leaf with a dark underside,
// one cream edge-light, and a stem; nested space remains transparent.
function spiralStair(c,x,top,w,h,stage,growth=1,time=0,still=true){
 const cx=x+w*.52,cy=top+h*.43;
 const mature=stage>=16,leaves=mature?10:8;
 const p=limit(growth);
 c.save();
 const baseY=top+h*.97;
 const vine=c.createLinearGradient(cx-30,baseY,cx+40,top);
 vine.addColorStop(0,'#735a64');vine.addColorStop(.55,'#9c9180');vine.addColorStop(1,'#476d70');
 c.lineCap='round';c.strokeStyle=vine;c.lineWidth=Math.max(7,w*.036);
 c.beginPath();c.moveTo(cx,baseY);
 c.bezierCurveTo(cx-w*.045,baseY-h*.28,cx+w*.12,cy+h*.17,cx,cy);c.stroke();
 c.strokeStyle='#e2cfad91';c.lineWidth=2.5;
 c.beginPath();c.moveTo(cx+3,baseY-5);c.bezierCurveTo(cx-w*.03,baseY-h*.31,cx+w*.14,cy+h*.10,cx,cy);c.stroke();
 // Open curling arm: one clean path through the leaf junctions.
 const centerline=[];
 for(let i=0;i<leaves;i++){
  const a=-2.45+i*.74,rad=w*(.36-i*.0185);
  centerline.push([cx+Math.cos(a)*rad,cy+Math.sin(a)*rad*.67+(leaves-1-i)*h*.010]);
 }
 c.beginPath();centerline.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));
 c.strokeStyle='#586f67';c.lineWidth=Math.max(5,w*.027);c.stroke();
 c.strokeStyle='#d6c99ca8';c.lineWidth=2;c.stroke();
 // Large tiered leaves with spatial overlap, one physical blade per tier.
 for(let i=0;i<leaves;i++){
  const reveal=ease((p-i*.067)/.35);
  if(reveal<=.001)continue;
  const [px,py]=centerline[i];
  const angle=-1.38+i*.74,wind=still?0:Math.sin(time*.00105+i*1.17)*.043;
  const lw=w*(mature?.215:.225)*(1-i*.018),lh=h*.118*(1-i*.012);
  c.save();c.translate(px,py);c.rotate(angle+wind);c.scale(reveal,reveal);
  c.shadowColor='#283f4255';c.shadowBlur=6;c.shadowOffsetY=4;
  c.beginPath();c.moveTo(-lw*.70,5);
  c.bezierCurveTo(-lw*.38,-lh*.85,lw*.18,-lh*.84,lw*.77,-lh*.15);
  c.quadraticCurveTo(lw*.95,lh*.43,lw*.40,lh*.58);
  c.bezierCurveTo(-lw*.18,lh*.62,-lw*.58,lh*.25,-lw*.70,5);
  const g=c.createLinearGradient(-lw*.24,-lh*.70,lw*.40,lh*.80);
  g.addColorStop(0,i%3===0?'#d5dfb0':'#c4d9b1');
  g.addColorStop(.43,i%2===0?'#8ebb9a':'#9abf9b');
  g.addColorStop(.66,'#5c998e');g.addColorStop(1,'#3a606d');
  c.fillStyle=g;c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
  c.strokeStyle='#315e63';c.lineWidth=2.6;c.stroke();
  // Distinct readable bright rim and vein, no misty circle behind it.
  c.strokeStyle='#f3e6b8d4';c.lineWidth=2.8;c.beginPath();
  c.moveTo(-lw*.53,-lh*.04);
  c.bezierCurveTo(-lw*.16,-lh*.83,lw*.30,-lh*.73,lw*.70,-lh*.16);c.stroke();
  c.strokeStyle='#d9e5c6ac';c.lineWidth=1.8;c.beginPath();
  c.moveTo(-lw*.61,5);c.quadraticCurveTo(0,-lh*.02,lw*.64,lh*.05);c.stroke();
  c.restore();
 }
 // A single illuminated unfurling bud in the open curl, not more confetti.
 if(mature){
  const last=centerline[centerline.length-1];
  glow(c,last[0]+9,last[1]-12,w*.076,'#fff1c986');
  c.fillStyle='#eedbb1';c.beginPath();c.ellipse(last[0]+9,last[1]-10,4.2,7,-.2,0,TAU);c.fill();
 }
 c.restore();
}
function capOcclusion(c,spec){
 // Translucent tissue must sit IN FRONT of green trunk geometry, and behind
 // transparent canopy highlights. A dark pearlescent mask hides stalk crossing.
 const x=400,y=spec.y+spec.h*.48,w=spec.w*.81,h=spec.h*.49;
 c.save();c.beginPath();
 c.moveTo(x-w*.5,y+h*.2);
 c.bezierCurveTo(x-w*.47,y-h*.76,x+w*.42,y-h*.78,x+w*.5,y+h*.20);
 c.quadraticCurveTo(x,y+h*.53,x-w*.5,y+h*.2);
 c.closePath();c.clip();
 const g=c.createLinearGradient(x-w*.38,y-h*.5,x+w*.3,y+h*.38);
 g.addColorStop(0,'#536d8999');g.addColorStop(.48,'#607d8cc9');g.addColorStop(.8,'#7c8c93d9');g.addColorStop(1,'#617b8cc9');
 c.fillStyle=g;c.fillRect(x-w*.6,y-h,w*1.2,h*2);
 c.restore();
}
function emergence(c,u,i,p){
 if(i===0)return;
 const t=ease(limit((p-(i-1)*.19)/(.7+(i-1)*.02)));
 const x=u.x,y=u.y;
 c.translate(x,y+145*(1-t));c.scale(.22+.78*t,.18+.82*t);c.translate(-x,-y);
 c.globalAlpha*=t;
}
function jellyGrowth(c,from,to,p){
 const t=ease(p),stageJump=from<=3?.48:.71;
 const s=stageJump+(1-stageJump)*t;
 // A medusa swells upward from its anchored roots, not from canvas center.
 c.translate(400,748);c.scale(s,s);c.translate(-400,-748);
 c.globalAlpha*=limit((t+.045)*1.15);
}
function capBounce(c,p,stage){
 const impulse=Math.sin(limit(p)*Math.PI)*Math.exp(-1.3*limit(p));
 const y=stage>=16?295:stage>=8?395:530;
 const sx=1+impulse*.085,sy=1-impulse*.21;
 c.translate(400,y);c.scale(sx,sy);c.translate(-400,-y);
}
function particles(c,seed,scene,p,kind){
 if(p<=0||p>=1)return;
 const r=rand(seed^0x6A39),e=ease(p);
 for(let i=0;i<(kind==='growth'?13:9);i++){
  const tx=400+(r()-.5)*(scene==='jelly'?300:435),ty=(scene==='jelly'?485:410)+r()*180;
  const lift=46*e*(.45+r()),size=1.2+r()*3;
  c.globalAlpha=(.24+r()*.42)*Math.sin(Math.PI*p);
  c.fillStyle=i%3?'#fff3c8':'#c5eed7';c.beginPath();
  c.arc(tx,ty-lift,size*(.7+.3*Math.sin(Math.PI*p)),0,TAU);c.fill();
 }
 c.globalAlpha=1;
}
function reactionOverlay(c,scene,p,seed,m){
 const e=ease(p);if(p>=1||p<0)return;
 if(scene==='island'){
  if(m.stage<8)return;
  const u=m.units[0],w=u.w*(m.stage===8?.82:1),ground=u.y-w*.12;
  const x=u.x-w*.015,y=ground-w*(m.stage>=16?.155:.115);
  // Two leaf-like arms wave from the actual tree-hollow's position.
  c.save();c.translate(x,y);
  c.strokeStyle='#f0d7ab';c.lineWidth=4;c.lineCap='round';
  const wave=Math.sin(p*Math.PI*4)*.30;
  for(const side of [-1,1]){
   c.beginPath();c.moveTo(side*15,9);
   c.quadraticCurveTo(side*(27+wave*12),-2,side*(29+wave*15),-20);c.stroke();
   c.fillStyle='#bfd9a5';c.beginPath();c.ellipse(side*(30+wave*15),-24,7.5,11,side*.6,0,TAU);c.fill();
  }
  glow(c,0,-8,40,'#ffe4b5a5');c.restore();
 }else{
  // Shrink/bounce is applied to the actual cap separately; these fall down.
  for(let i=0;i<6;i++){
   const r=rand(seed^((i+1)*2917)),x=346+i*22+(r()-.5)*15;
   const y=(m.stage>=16?422:m.stage>=8?504:584)+i%3*7+p*(132+i*13);
   glow(c,x,y,16,'#fff1bbb0');
   c.fillStyle='#fff0c2';c.beginPath();c.arc(x,y,2.4+(i%3),0,TAU);c.fill();
  }
 }
 particles(c,seed,scene,p,'touch');void e;
}
function hitTest(scene,stage,x,y,model){
 if(scene==='island'){
  if(stage<8)return false;
  const u=model.units[0],w=u.w*(stage<=8?.82:1);
  return Math.hypot(x-(u.x-w*.015),y-(u.y-w*.12-w*(stage>=16?.155:.115)))<Math.max(36,w*.12);
 }
 const centerY=stage<=3?490:stage<=8?401:294;
 return Math.hypot((x-400)*.77,y-centerY)<(stage<=3?88:stage<=8?130:180);
}
root.CrewFantasyV5=Object.freeze({spiralStair,capOcclusion,emergence,jellyGrowth,capBounce,particles,reactionOverlay,hitTest,ease});
})(window);
