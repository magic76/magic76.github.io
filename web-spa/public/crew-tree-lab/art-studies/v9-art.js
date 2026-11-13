/* Crew Fantasy Art V9 — true layered storybook nights, expressive warm residents
 * and luminous lantern-bell medusae. Original, deterministic Canvas 2D.
 * All artwork works offline; respects still/reduced-motion snapshots.
 */
(function(root){'use strict';
const TAU=Math.PI*2;
const palette=Object.freeze({
 cosmos:{top:'#081428',middle:'#152c4b',low:'#274966',night:.93,moon:'#c6e4ff',edge:'#8df2dc',core:'#ffe8a6',ridge:'#133047'},
 warmth:{top:'#2b233f',middle:'#59405a',low:'#9a6975',night:.84,moon:'#ffe0b7',edge:'#ffdfb0',core:'#fff0ba',ridge:'#41324b'},
 music:{top:'#131f3b',middle:'#353957',low:'#696985',night:.88,moon:'#d7d4ff',edge:'#d1bfff',core:'#ffe7b8',ridge:'#28354c'},
 travel:{top:'#0a2c3d',middle:'#1c5260',low:'#467a75',night:.87,moon:'#a8f1e3',edge:'#98efcf',core:'#f7e8b4',ridge:'#123e49'}
});
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function bloom(c,x,y,r,color,alpha=1){
 const g=c.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,color);g.addColorStop(.27,color.slice(0,7)+'85');g.addColorStop(.58,color.slice(0,7)+'33');g.addColorStop(1,color.slice(0,7)+'00');
 c.save();c.globalAlpha*=alpha;c.fillStyle=g;
 c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.restore();
}
function nightSky(c,topic,seed,scene){
 const p=palette[topic]||palette.cosmos,r=rng(seed^0x697A52);
 c.save();
 // Darken distant night decisively; warm horizon and individual topic hues survive.
 const bg=c.createLinearGradient(0,0,0,820);
 bg.addColorStop(0,p.top);bg.addColorStop(.48,p.middle);
 bg.addColorStop(.83,p.low);bg.addColorStop(1,p.low);
 c.globalAlpha=p.night;c.fillStyle=bg;c.fillRect(0,0,800,820);
 c.globalAlpha=1;
 // Far constellation lamps have crisp warm-white cores, not foggy pale disks.
 const stars=topic==='cosmos'?102:topic==='warmth'?20:topic==='music'?53:37;
 for(let i=0;i<stars;i++){
  const x=18+r()*764,y=18+r()*525,lum=.38+r()*.55;
  c.fillStyle=i%7===0?p.edge:'#fff0d1';c.globalAlpha=lum;
  c.beginPath();c.arc(x,y,.65+r()*1.45,0,TAU);c.fill();
  if(i%19===0){c.strokeStyle=p.moon;c.lineWidth=1;
   c.beginPath();c.moveTo(x-5,y);c.lineTo(x+5,y);c.moveTo(x,y-5);c.lineTo(x,y+5);c.stroke();}
 }
 c.globalAlpha=1;
 // A controlled moon pool cuts through the dark sky without gray haze.
 const mx=topic==='warmth'?628:topic==='music'?154:655,my=topic==='warmth'?167:topic==='travel'?140:151;
 bloom(c,mx,my,155,p.moon,topic==='warmth'?.47:.61);
 c.fillStyle=p.moon;c.beginPath();c.arc(mx,my,topic==='warmth'?17:12,0,TAU);c.fill();
 // Distant ridgelines are quieter and darker than the character layer.
 for(let depth=0;depth<2;depth++){
  const y=scene==='jelly'?655+depth*50:631+depth*53;
  c.fillStyle=depth?'#0a2637a8':p.ridge+'a6';c.beginPath();c.moveTo(0,y+15);
  for(let i=0;i<=12;i++){const x=i*70,cy=y+Math.sin(i*.81+depth+seed*.0005)*12+Math.cos(i*.36)*12;
   c.lineTo(x,cy);}
  c.lineTo(800,820);c.lineTo(0,820);c.closePath();c.fill();
 }
 c.restore();
}
function distantLayer(c,topic,scene){
 const p=palette[topic]||palette.cosmos;
 c.save();c.globalCompositeOperation='multiply';
 const g=c.createLinearGradient(0,520,0,820);
 g.addColorStop(0,'#162c3800');g.addColorStop(.60,p.ridge+'24');g.addColorStop(1,'#0a203e69');
 c.fillStyle=g;c.fillRect(0,525,800,295);c.restore();
 // Two narrow edge silhouettes create depth without hiding the coral base.
 c.save();c.fillStyle='#14323b66';
 for(const side of [-1,1]){
  const x=side<0?0:800;
  c.beginPath();c.moveTo(x,820);c.lineTo(x,648);
  c.quadraticCurveTo(x-side*48,702,x-side*25,745);
  c.quadraticCurveTo(x-side*60,775,x-side*114,820);
  c.closePath();c.fill();
 }
 c.restore();void scene;
}
function foregroundContrast(c,scene,seed){
 c.save();const r=rng(seed^0xBABA44);
 // Dark framing foliage with a little sharp moonlit edge — on top, near viewer.
 for(const side of [-1,1]){
  const x=side<0?3:797,far=side<0?1:-1;
  c.lineCap='round';c.strokeStyle='#153947d9';c.lineWidth=10;
  c.beginPath();c.moveTo(x,815);c.bezierCurveTo(x+far*45,782,x+far*35,722,x+far*82,685);c.stroke();
  for(let i=0;i<5;i++){
   const xx=x+far*(19+i*13),yy=800-i*28;
   c.fillStyle=i%2?'#16424ddc':'#245c59da';
   c.beginPath();c.moveTo(xx,yy);
   c.quadraticCurveTo(xx+far*(25+r()*21),yy-42,xx+far*(41+r()*18),yy-33);
   c.quadraticCurveTo(xx+far*27,yy-12,xx,yy);c.fill();
   c.strokeStyle='#a5e7bf8c';c.lineWidth=1.5;c.beginPath();c.moveTo(xx,yy);c.lineTo(xx+far*36,yy-31);c.stroke();
  }
 }
 c.restore();void scene;
}
function residentWarmth(c,x,ground,w,stage,time,still,seed){
 if(stage<8)return;
 const cx=x-w*.015,cy=ground-w*(stage>=16?.155:.115);
 const pulse=still?1:.89+.11*Math.sin(time*.0017+seed*.021),r=stage>=16?116:78;
 bloom(c,cx,cy,r*pulse,'#ffb34dcc',.93);
 bloom(c,cx,cy,r*.60*pulse,'#ffe9afdf',.83);
 c.save();c.shadowColor='#ffce6c';c.shadowBlur=21;
 c.strokeStyle='#ffe9b5eb';c.lineWidth=stage>=16?4.3:3.1;
 c.beginPath();c.arc(cx,cy,stage>=16?38:27,.20,Math.PI*1.8);c.stroke();c.restore();
}
function smilingResident(c,stage,time,still,seed){
 if(stage<8)return;
 const size=stage>=16?29:21,smile=still?0:Math.sin(time*.0014+seed*.017);
 c.save();
 // Eyes already blink beneath; lifted eyebrows and lashes amplify expression.
 c.strokeStyle='#ffe6ba';c.lineWidth=2.5;c.lineCap='round';
 for(const side of [-1,1]){
  c.beginPath();c.moveTo(side*5,-14);c.quadraticCurveTo(side*11,-23-side*smile*1.5,side*18,-14);c.stroke();
  c.fillStyle='#ffae9b';c.globalAlpha=.88;
  c.beginPath();c.ellipse(side*19,10,5.5,3.8,.1*side,0,TAU);c.fill();
 }
 c.globalAlpha=1;
 // Tiny sparkling nose, wide upturned grin, and a visible little fang.
 c.fillStyle='#ffe2b1';c.beginPath();c.arc(0,3,2.7,0,TAU);c.fill();
 c.strokeStyle='#ffd9a6';c.lineWidth=2.6;c.beginPath();
 c.arc(0,10,9.5,.16,Math.PI-.16);c.stroke();
 c.fillStyle='#fff8de';c.beginPath();c.moveTo(-2.5,18);c.lineTo(1,18);c.lineTo(-.9,22);c.closePath();c.fill();
 for(const side of [-1,1]){
  c.fillStyle='#fffbd5';c.beginPath();c.arc(side*(size*.63),-3,1.6,0,TAU);c.fill();
 }
 c.restore();
}
function cottageBloom(c,bx,by,w,time,still,seed){
 const xx=bx+w*.015,yy=by-w*.117,phase=still?1:.89+.11*Math.sin(time*.0012+seed*.009);
 bloom(c,xx,yy,w*.24*phase,'#ffb54bc9',.84);
 bloom(c,xx,yy,w*.12*phase,'#fff1b7e3',.80);
 c.save();c.shadowBlur=18;c.shadowColor='#ffe19b';
 c.fillStyle='#fff7c8';c.fillRect(xx-w*.016,yy-w*.023,w*.028,w*.048);
 c.fillStyle='#fffef1';c.fillRect(xx-w*.009,yy-w*.016,w*.010,w*.015);
 c.restore();
 // Keep the glow centered on the existing window, not a second floating bulb.
}
function bellGlow(c,spec,topic,stage,time,still){
 if(stage<8)return;
 const p=palette[topic]||palette.cosmos,x=400,y=spec.y+spec.h*.53;
 const pulse=still?1:1+.055*Math.sin(time*.00145),rx=spec.w*.45,ry=spec.h*.39;
 c.save();c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.clip();
 // Colored light is trapped inside the living membrane like a hanging lantern.
 const g=c.createRadialGradient(x,y+spec.h*.04,8,x,y,rx*.99);
 g.addColorStop(0,p.core+'e0');
 g.addColorStop(.23,p.edge+'b2');
 g.addColorStop(.53,p.moon+'67');
 g.addColorStop(.79,p.edge+'19');
 g.addColorStop(1,p.top+'00');
 c.globalCompositeOperation='screen';c.globalAlpha*=.68*pulse;
 c.fillStyle=g;c.fillRect(x-rx,y-ry,rx*2,ry*2);
 c.globalCompositeOperation='source-over';
 // Three restrained rib highlights give inner surface depth / refraction.
 for(let j=-1;j<=1;j++){
  c.strokeStyle=j===0?p.core+'7b':p.moon+'52';c.lineWidth=1.9;
  c.beginPath();c.moveTo(x+j*rx*.36,y-ry*.57);
  c.bezierCurveTo(x+j*rx*.53,y-ry*.12,x+j*rx*.63,y+ry*.23,x+j*rx*.34,y+ry*.59);
  c.stroke();
 }
 c.restore();
}
function rimLights(c,spec,topic,stage,time,still){
 if(stage<8)return;
 const p=palette[topic]||palette.cosmos,x=400,y=spec.y+spec.h*.53,rx=spec.w*.457,ry=spec.h*.33;
 c.save();
 // One coherent rim from left to right + selected suspended pearl-like points.
 c.strokeStyle=p.edge+'c5';c.lineWidth=stage>=16?3.4:2.5;
 c.shadowColor=p.edge;c.shadowBlur=15;
 c.beginPath();c.ellipse(x,y,rx,ry,0,.15*Math.PI,.85*Math.PI);c.stroke();
 c.shadowBlur=0;
 for(let i=0;i<(stage>=16?11:7);i++){
  const theta=Math.PI*(.12+.76*i/((stage>=16?11:7)-1));
  const px=x+rx*Math.cos(theta),py=y+ry*Math.sin(theta);
  const pulse=still?1:.78+.22*Math.sin(time*.002+i*.65);
  bloom(c,px,py,10+(i%3)*4,p.edge+'c6',pulse);
  c.fillStyle=i%3===0?p.core:p.moon;c.beginPath();
  c.arc(px,py,(i%3===0?3.8:2.5)*pulse,0,TAU);c.fill();
  if(i%5===0){c.strokeStyle=p.core+'9c';c.lineWidth=1.3;
   c.beginPath();c.moveTo(px-6,py);c.lineTo(px+6,py);c.moveTo(px,py-6);c.lineTo(px,py+6);c.stroke();}
 }
 c.restore();
}
root.CrewFantasyV9=Object.freeze({nightSky,distantLayer,foregroundContrast,residentWarmth,smilingResident,cottageBloom,bellGlow,rimLights,palettes:palette});
})(window);
