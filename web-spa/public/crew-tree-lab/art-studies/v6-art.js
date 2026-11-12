/* Crew Tree Fantasy Art V6
 * One botanical structure: each spiral leaf is attached to a climbing trunk.
 * Medusa bell grows seagrass leaflets and a rooted coral foot.
 * Both families use the same deterministic watercolor paper finish.
 * Stateless Canvas 2D; no storage/network/third-party runtime.
 */
(function(root){'use strict';
const TAU=Math.PI*2, clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const palettes=Object.freeze({
 cosmos:{bell:['#293e81','#6668b4','#9eacd7'],rim:'#b9dbeb',foliage:'#a5cad5',roots:'#759bb4'},
 warmth:{bell:['#a4547a','#d88787','#f4c5a2'],rim:'#ffdfb0',foliage:'#e8bc9e',roots:'#b68c8e'},
 music:{bell:['#514d91','#9480bc','#c5abd6'],rim:'#f4d4eb',foliage:'#c8c0e1',roots:'#9695b8'},
 travel:{bell:['#216c78','#54a1a1','#a3d7bd'],rim:'#cdebd3',foliage:'#a6d7b5',roots:'#73aea5'}
});
function rng(seed){let x=(seed>>>0);return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function glow(c,x,y,r,color){
 const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#ffffff00');
 c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
}
function spiralGeometry(x,top,w,h,ground,stage){
 const rootX=x+w*.51,tipY=top+h*.052,span=ground-tipY;
 const stem=t=>({
  x:rootX+w*.108*Math.sin(t*Math.PI*3.02+.18)*(.16+.84*t),
  y:ground-span*t
 });
 const count=stage>=16?10:8;
 const leaves=Array.from({length:count},(_,i)=>{
  const t=.17+(.76*i)/(count-1),node=stem(t),angle=i*2.399963-.58;
  const radius=w*(.18-i*.0051);
  const center={x:node.x+Math.cos(angle)*radius,
   y:node.y+Math.sin(angle)*h*.035-h*.017};
  const length=w*(.273-i*.011),width=h*(.123-i*.0048);
  return {t,node,center,angle,length,width,index:i};
 });
 return {stem,leaves,count,rootX,ground,tip:stem(1),tipY,span};
}
function taperedStem(c,geo,w,h){
 const seg=30;
 // This central spine is continuous from the island soil to the glowing tip.
 // Gradually narrower slices follow three broad, organic spiral turns.
 for(let k=0;k<seg;k++){
  const t=k/seg,n=(k+1)/seg,a=geo.stem(t),b=geo.stem(n);
  const thickness=w*(.044-.027*t);
  c.lineCap='round';
  c.strokeStyle='#394f57';c.lineWidth=thickness+3.2;
  c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
  const stemGrad=c.createLinearGradient(a.x-thickness,a.y,b.x+thickness,b.y);
  stemGrad.addColorStop(0,'#70656b');stemGrad.addColorStop(.45,'#a58d78');stemGrad.addColorStop(1,'#5c8980');
  c.strokeStyle=stemGrad;c.lineWidth=thickness;c.stroke();
  c.strokeStyle='#e6c99c9d';c.lineWidth=Math.max(1.15,thickness*.16);
  c.beginPath();c.moveTo(a.x-thickness*.16,a.y);c.lineTo(b.x-thickness*.16,b.y);c.stroke();
 }
 for(const side of [-1,1]){
  c.strokeStyle='#6b7c70';c.lineWidth=w*.018;c.beginPath();
  c.moveTo(geo.rootX,geo.ground-6);
  c.quadraticCurveTo(geo.rootX+side*w*.085,geo.ground+10,geo.rootX+side*w*.18,geo.ground+3);
  c.stroke();
 }
 void h;
}
function drawLeaf(c,leaf,i,count,progress,time,still,w){
 const reveal=smooth((progress-i*.059)/.33);
 if(reveal<=.002)return;
 const n=leaf.node,p=leaf.center,angle=Math.atan2(p.y-n.y,p.x-n.x);
 // Dark supporting branch and lit cambium connect each blade back to its trunk.
 c.save();c.globalAlpha*=reveal;
 c.strokeStyle='#4e655e';c.lineWidth=Math.max(2.4,w*(.021-i*.0008));c.lineCap='round';
 c.beginPath();c.moveTo(n.x,n.y);
 c.quadraticCurveTo((p.x+n.x)*.5,n.y-leaf.width*.27,p.x,p.y);c.stroke();
 c.strokeStyle='#f0d7aaab';c.lineWidth=1.8;c.beginPath();
 c.moveTo(n.x,n.y-1.3);
 c.quadraticCurveTo((p.x+n.x)*.5,n.y-leaf.width*.27-1.5,p.x,p.y-1.5);c.stroke();
 const sway=still?0:Math.sin(time*.00082+i*.8)*.027;
 c.translate(p.x,p.y);c.rotate(angle+sway);c.scale(reveal,reveal);
 const len=leaf.length,width=leaf.width,bri=i/(count-1);
 // Each leaf has a recognizable pointed blade, shadowed underside and bright rim.
 const colors=i%3===0?['#497a77','#83b29a','#e5edbe']:['#416973','#80ada0','#c7e5c2'];
 const brightTop=bri>.65?'#edf0bd':colors[2];
 const g=c.createLinearGradient(-len*.55,-width,len*.65,width);
 g.addColorStop(0,brightTop);g.addColorStop(.39,colors[1]);
 g.addColorStop(.77,colors[0]);g.addColorStop(1,'#355868');
 c.shadowColor='#2f53635c';c.shadowBlur=5;c.shadowOffsetY=3;
 c.beginPath();c.moveTo(-len*.60,0);
 c.bezierCurveTo(-len*.18,-width*1.19,len*.45,-width*.92,len*.81,-width*.05);
 c.quadraticCurveTo(len*.92,width*.31,len*.36,width*.65);
 c.bezierCurveTo(-len*.19,width*.72,-len*.47,width*.23,-len*.60,0);
 c.closePath();
 c.fillStyle=g;c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
 // Soft bleed follows the same edge, not a loose halo around the crown.
 c.strokeStyle='#dae5ba3e';c.lineWidth=7.2;c.stroke();
 c.strokeStyle='#345f65d2';c.lineWidth=1.8;c.stroke();
 c.strokeStyle='#fff2c9de';c.lineWidth=3.4;c.beginPath();
 c.moveTo(-len*.47,-width*.16);
 c.bezierCurveTo(-len*.06,-width*1.10,len*.42,-width*.83,len*.73,-width*.08);c.stroke();
 c.strokeStyle='#eef4cfbc';c.lineWidth=1.9;c.beginPath();
 c.moveTo(-len*.50,0);c.quadraticCurveTo(0,-width*.18,len*.65,-width*.04);c.stroke();
 c.restore();
}
function rootedSpiral(c,x,top,w,h,ground,stage,progress=1,time=0,still=true){
 const geo=spiralGeometry(x,top,w,h,ground,stage);
 c.save();taperedStem(c,geo,w,h);
 for(const leaf of geo.leaves)drawLeaf(c,leaf,leaf.index,geo.count,progress,time,still,w);
 // One visibly growing crown bud attached to the end of the same living spine.
 const reveal=smooth((progress-.71)/.29),tip=geo.tip;
 if(reveal>0){
  c.globalAlpha*=reveal;
  const pulse=still?1:(1+.14*Math.sin(time*.00175));
  glow(c,tip.x,tip.y-14,w*.095*pulse,'#ffeabca9');
  for(const side of [-1,1]){
   c.save();c.translate(tip.x,tip.y-10);c.rotate(side*.44);
   c.fillStyle=side===1?'#d8dfa3':'#a1ceb1';c.strokeStyle='#7fa18c';c.lineWidth=1.4;
   c.beginPath();c.moveTo(0,9);c.quadraticCurveTo(side*16,-9,0,-26);
   c.quadraticCurveTo(-side*12,-7,0,9);c.fill();c.stroke();c.restore();
  }
  c.fillStyle='#fff0be';c.beginPath();c.ellipse(tip.x,tip.y-16,4.8,8,0,0,TAU);c.fill();
 }
 c.restore();
 return geo;
}
function coralRoots(c,stage,topic,seed,time,still){
 if(stage<8)return;
 const pal=palettes[topic]||palettes.cosmos;
 const large=stage>=16,m=large?1:.65,n=large?8:5,baseX=401,baseY=743,r=rng(seed^0xC0A7);
 c.save();c.lineCap='round';c.lineJoin='round';
 // Every coral limb grows directly from the trunk foot.
 for(let i=0;i<n;i++){
  const side=i%2?1:-1,depth=1+Math.floor(i/2),reach=(33+depth*21)*m;
  const x=baseX+side*reach,y=baseY+6+(i%3)*4;
  c.strokeStyle=i%2===0?pal.roots:'#d1b19e';c.lineWidth=(large?9:6)-depth*.7;
  c.beginPath();c.moveTo(baseX+side*12,baseY-18);
  c.bezierCurveTo(baseX+side*20,baseY+13,x-side*10,y-21,x,y);c.stroke();
  c.strokeStyle='#f6e0c6bb';c.lineWidth=1.35;c.beginPath();
  c.moveTo(baseX+side*12,baseY-18);
  c.quadraticCurveTo(x-side*13,y-13,x,y);c.stroke();
  // A fork on the distal half gives coral, not root-like straight wires.
  const forkX=x-side*(7+r()*16),forkY=y-17-r()*15;
  c.strokeStyle=pal.roots;c.lineWidth=2.9;c.beginPath();
  c.moveTo(x-side*12,y-18);c.quadraticCurveTo(x-side*18,y-23,forkX,forkY);c.stroke();
  c.fillStyle=pal.foliage;c.beginPath();c.ellipse(forkX,forkY,3.8,6.2,side*.4,0,TAU);c.fill();
 }
 // Submerged bubble-roots are translucent pearls attached to the reef.
 for(let i=0;i<(large?13:7);i++){
  const t=r(),side=i%2?1:-1,x=baseX+side*(18+t*139*m),y=baseY-23-t*53+(i%4)*7;
  const rise=still?0:Math.sin(time*.0011+i*1.7)*3;
  const radius=2.7+r()*5.6;
  c.strokeStyle=i%2?'#d8f7f2b8':'#e8d7d5c1';c.lineWidth=1.45;
  c.beginPath();c.arc(x,y+rise,radius,0,TAU);c.stroke();
  c.fillStyle='#f1fff8a3';c.beginPath();c.arc(x-radius*.25,y+rise-radius*.28,1.2,0,TAU);c.fill();
 }
 c.restore();
}
function capBoundary(c,s){
 const cx=400,x=cx-s.w*.452,y=s.y+hVal(s)*.66;
 c.beginPath();c.moveTo(x,y);
 c.bezierCurveTo(cx-s.w*.48,s.y+s.h*.37,cx-s.w*.25,s.y+s.h*.12,cx,s.y+s.h*.105);
 c.bezierCurveTo(cx+s.w*.25,s.y+s.h*.11,cx+s.w*.49,s.y+s.h*.36,cx+s.w*.452,y);
 c.quadraticCurveTo(cx,s.y+s.h*.89,x,y);c.closePath();
}
function hVal(s){return s.h;}
function tintCanopy(c,spec,topic,stage,time,still){
 if(stage<8)return;
 const pal=palettes[topic]||palettes.cosmos;
 c.save();capBoundary(c,spec);c.clip();
 const g=c.createLinearGradient(400-spec.w*.38,spec.y+spec.h*.23,400+spec.w*.35,spec.y+spec.h*.76);
 g.addColorStop(0,pal.bell[0]);g.addColorStop(.55,pal.bell[1]);g.addColorStop(1,pal.bell[2]);
 const inheritedAlpha=c.globalAlpha;
 c.globalAlpha=inheritedAlpha*(stage>=16?.47:.27);
 c.globalCompositeOperation='multiply';c.fillStyle=g;
 c.fillRect(400-spec.w*.55,spec.y,spec.w*1.1,spec.h);
 c.globalCompositeOperation='source-over';c.globalAlpha=inheritedAlpha*.6;
 c.strokeStyle=pal.rim;c.lineWidth=2.3;c.beginPath();
 c.ellipse(400,spec.y+spec.h*.53,spec.w*.28,spec.h*.125,-.07,.17*Math.PI,.86*Math.PI);c.stroke();
 const sh=still?0:Math.sin(time*.00062)*4;
 for(let i=0;i<4;i++){
  const x=400-spec.w*.25+i*spec.w*.16+sh;
  c.strokeStyle=i%2?'#edf0d7b1':'#b8dfeb98';c.lineWidth=1.7;
  c.beginPath();c.moveTo(x,spec.y+spec.h*.34);
  c.quadraticCurveTo(x+21,spec.y+spec.h*.48,x-7,spec.y+spec.h*.72);c.stroke();
 }
 c.restore();
}
function bellLeaves(c,spec,topic,stage,time,still){
 if(stage<8)return;
 const pal=palettes[topic]||palettes.cosmos;
 const n=stage>=16?15:9;
 c.save();
 for(let i=0;i<n;i++){
  const t=(i+.55)/n,x=400+(t-.5)*spec.w*.87;
  const side=(t-.5)*2,y=spec.y+spec.h*(.61+.095*Math.abs(side));
  const sway=still?0:Math.sin(time*.00072+i*1.2)*.065;
  const leafW=(stage>=16?15:9)*(1-Math.abs(side)*.32);
  c.save();c.translate(x,y);c.rotate(side*.55+sway);
  c.strokeStyle='#709d9bbb';c.lineWidth=2;c.beginPath();c.moveTo(0,8);
  c.quadraticCurveTo(-side*8,-4,-side*2,-19);c.stroke();
  const lg=c.createLinearGradient(-leafW,-15,leafW,8);
  lg.addColorStop(0,'#f7eac3');lg.addColorStop(.54,pal.foliage);lg.addColorStop(1,'#426f77');
  c.fillStyle=lg;c.strokeStyle='#5a9191';c.lineWidth=1.05;
  c.beginPath();c.moveTo(0,3);
  c.bezierCurveTo(-leafW,-11,-leafW*.7,-30,0,-32);
  c.bezierCurveTo(leafW*.93,-25,leafW,-8,0,3);c.fill();c.stroke();
  c.strokeStyle='#f2f0d2bb';c.lineWidth=1;c.beginPath();
  c.moveTo(0,-2);c.lineTo(0,-26);c.stroke();
  c.restore();
 }
 c.restore();
}
function paperWash(c,seed,scene,stage){
 // Same wash and fiber plate over both families. No animated random flicker:
 // all stroke locations depend only on the seed and scene.
 const r=rng(seed^0x614A2B^(scene==='jelly'?0x3000:0)^(stage*103));
 c.save();
 const edge=c.createRadialGradient(400,414,180,400,408,610);
 edge.addColorStop(0,'#fff2d900');edge.addColorStop(.72,'#e6d4bc12');edge.addColorStop(1,'#8b7a7663');
 c.fillStyle=edge;c.fillRect(0,0,800,820);
 // Fine fibers: contrasting warm and cool pigments yield a handmade paper tooth.
 c.lineCap='round';
 for(let i=0;i<245;i++){
  const x=r()*800,y=r()*820,len=1.4+r()*12,angle=(r()-.5)*.46;
  c.globalAlpha=.09+r()*.11;
  c.strokeStyle=i%4===0?'#f9efda':i%3===0?'#354f5e':'#d0b7a4';
  c.lineWidth=.42+r()*.65;
  c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(angle)*len,y+Math.sin(angle)*len);c.stroke();
 }
 c.globalAlpha=1;c.restore();
}
root.CrewFantasyV6=Object.freeze({spiralGeometry,rootedSpiral,coralRoots,tintCanopy,bellLeaves,paperWash,palettes});
})(window);
