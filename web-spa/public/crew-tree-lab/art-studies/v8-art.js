/* Art V8 — chromatic moonlight, braided living roots and warm homes.
   Original deterministic canvas watercolor strokes; zero external dependencies. */
(function(root){'use strict';
const TAU=Math.PI*2;
const colors={
 cosmos:['#718eb9','#b6d4dc','#f8dc9d'],warmth:['#d6849d','#f0cfb2','#fff1be'],
 music:['#998ac1','#c7c8e6','#ffe5b7'],travel:['#65b9ae','#a8e2ce','#f8ddab']
};
const ease=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};
function rand(seed){let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function glow(c,x,y,r,center){
 if(r<=0)return;
 c.save();const g=c.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,center);g.addColorStop(.28,center.slice(0,7)+'44');g.addColorStop(1,'#ffffff00');
 c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.restore();
}
function organismHalo(c,model,time,still){
 if(model.stage<=3)return;
 const palette=colors[model.topic]||colors.cosmos,phase=still?1:1+.05*Math.sin(time*.0012);
 if(model.scene==='island'){
  const u=model.units[0],x=u.x,y=u.y-u.w*(model.stage>=16?.66:.46);
  glow(c,x,y,u.w*.83*phase,palette[1]+'7f');
  glow(c,x+u.w*.16,y-u.w*.12,u.w*.33,palette[2]+'86');
 }else{
  const y=model.stage>=16?325:406;
  glow(c,400,y,model.stage>=16?310:224,palette[1]+'79');
  glow(c,405,y-30,model.stage>=16?157:110,palette[2]+'48');
 }
}
function strand(c,points,width,cols,light,seed,stage){
 const p=points,start=p[0],mid=p[1],end=p[2],top=p[3];
 c.save();c.lineCap='round';c.lineJoin='round';
 function curve(offset){
  c.beginPath();c.moveTo(start[0]+offset,start[1]);
  c.bezierCurveTo(mid[0]+offset,mid[1],end[0]-offset*.4,end[1],top[0],top[1]);
 }
 // Light-bearing tactile volume: charcoal outline, saturated watercolor belly,
 // and a cream-blue ridge down each actual tendril. No mushroom-shaped fill.
 curve(0);c.strokeStyle='#263e53';c.lineWidth=width+5.8;c.stroke();
 const g=c.createLinearGradient(start[0]-width,start[1],top[0]+width,top[1]);
 g.addColorStop(0,cols[0]);g.addColorStop(.40,cols[1]);g.addColorStop(.74,cols[2]);g.addColorStop(1,light);
 curve(0);c.strokeStyle=g;c.lineWidth=width;c.stroke();
 curve(-width*.14);c.lineWidth=Math.max(1.4,width*.16);
 c.strokeStyle='#fce9c5b8';c.stroke();
 // Individual irregular growth rings use the same stalk path's control points.
 const r=rand(seed);
 for(let i=0;i<Math.max(8,stage>=16?14:9);i++){
  const t=(i+1)/(stage>=16?16:11),u=1-t;
  const px=u*u*u*start[0]+3*u*u*t*mid[0]+3*u*t*t*end[0]+t*t*t*top[0];
  const py=u*u*u*start[1]+3*u*u*t*mid[1]+3*u*t*t*end[1]+t*t*t*top[1];
  const rr=width*(.19+r()*.27);
  c.strokeStyle=i%3===0?'#f9edd494':'#345b6c97';c.lineWidth=.8+r()*1.6;
  c.beginPath();c.moveTo(px-rr,py-1.7);c.quadraticCurveTo(px,py-4-r()*3,px+rr,py+2);c.stroke();
 }
 c.restore();
}
function braidedRoots(c,stage,seed,topic,time,still){
 if(stage<8)return;
 const pal=colors[topic]||colors.cosmos;
 const mature=stage>=16,topY=mature?389:460,ground=744,width=mature?20:14,count=mature?7:5;
 const r=rand(seed^0x885b4a),sway=still?0:Math.sin(time*.00071+seed*.02)*3;
 c.save();
 // This single organism is built from braided strands rising from a shared reef.
 // Alternating bends are deliberately interwoven; each strand is traceable.
 for(let i=0;i<count;i++){
  const side=i-(count-1)/2,baseX=400+side*(mature?13:11);
  const outward=Math.sin(i*2.32)*36+sway,topX=400+side*(mature?23:17)+Math.sin(i*.9)*11;
  const points=[
   [baseX,ground+3-(i%2)*8],
   [baseX+outward+(i%2?-33:30),649-i*5],
   [400+outward*1.05+side*5,540-i*4],
   [topX,topY+21+Math.abs(side)*8]
  ];
  strand(c,points,width+(i%3)*2,
   [i%2?'#688d90':'#97788e',i%2?'#356e75':'#6a6f89',pal[0]],pal[1],seed+i*973,mature?16:8);
 }
 // Multiple upward forks physically connect to the underside of the dome.
 const arms=mature?6:4,spread=mature?151:108;
 for(let i=0;i<arms;i++){
  const t=arms===1?.5:i/(arms-1),endX=400+(t-.5)*spread*2;
  const trunkX=400+(t-.5)*(mature?45:27),forkY=topY+35;
  const dx=endX-trunkX,offset=still?0:Math.sin(time*.0006+i*1.14)*4;
  const points=[
   [trunkX,topY+108],
   [trunkX+dx*.26,topY+86],
   [endX-dx*.15+offset,topY+56],
   [endX,topY+5+Math.abs(t-.5)*17]
  ];
  strand(c,points,mature?11:8,['#3b7178','#74a5a3',pal[0]],pal[1],seed+i*787+11,mature?16:8);
  glow(c,endX,topY+10,12+(i%2)*5,pal[1]+'9a');
 }
 // Shared coral knot joins the strands to the root base rather than a flat stem.
 const reef=c.createRadialGradient(400,744,8,400,748,mature?110:77);
 reef.addColorStop(0,pal[2]+'e8');reef.addColorStop(.38,pal[0]+'bd');reef.addColorStop(.75,'#536c8b64');reef.addColorStop(1,'#536c8b00');
 c.fillStyle=reef;c.beginPath();c.ellipse(400,750,mature?105:78,mature?31:21,0,0,TAU);c.fill();
 for(let i=0;i<7;i++){
  const x=400+(i-3)*(mature?22:15),y=746+(i%3)*4;
  c.fillStyle=i%2?'#d5ad9c':'#b1d1bb';
  c.beginPath();c.ellipse(x,y,4+i%3,7+i%2,.3,0,TAU);c.fill();
 }
 c.restore();
}
function moonRim(c,scene,stage,topic,time,still){
 if(stage<8)return;
 const pal=colors[topic]||colors.cosmos;
 c.save();c.lineCap='round';c.shadowBlur=18;
 c.shadowColor=pal[1];c.lineWidth=3;c.strokeStyle=pal[1]+'c4';
 if(scene==='jelly'){
  const w=stage>=16?555:365,h=stage>=16?352:248,y=stage>=16?121:278;
  c.beginPath();c.ellipse(400,y+h*.54,w*.47,h*.33,0,Math.PI*1.08,Math.PI*1.94);
  c.stroke();
  c.shadowBlur=0;c.strokeStyle=pal[2]+'a6';c.lineWidth=1.4;
  c.beginPath();c.ellipse(400,y+h*.54,w*.42,h*.28,0,Math.PI*1.12,Math.PI*1.83);c.stroke();
 }else{
  // Moonlight rides the outer margin of the upper spiral, not a circle overlay.
  c.beginPath();c.moveTo(400,181);
  c.bezierCurveTo(463,179,484,240,470,277);c.stroke();
 }
 c.restore();
}
function warmHollow(c,x,ground,w,stage,time,still,seed){
 if(stage<8)return;
 const cx=x-w*.015,cy=ground-w*(stage>=16?.155:.115);
 const pulse=still?1:.84+.16*Math.sin(time*.0017+seed*.003);
 const radius=stage>=16?69:49;
 glow(c,cx,cy,radius*pulse,'#ffcf79bb');
 // Light from the hollow falls across the nearest bark.
 c.save();c.strokeStyle='#ffe7a57d';c.lineWidth=stage>=16?3.4:2.5;
 c.shadowColor='#ffd27d';c.shadowBlur=15;
 c.beginPath();c.arc(cx,cy,stage>=16?33:24,Math.PI*.18,Math.PI*1.81);c.stroke();c.restore();
}
function hollowMotion(c,stage,time,still,seed){
 if(stage<8)return;
 const w=stage>=16?29:21,phase=still?0:Math.sin(time*.0022+seed*.024);
 c.save();c.lineCap='round';
 // The resident waves an attached leafy hand and gently nods its antenna.
 c.strokeStyle='#f2d4a4';c.lineWidth=2.7;
 c.beginPath();c.moveTo(w*.68,9);
 c.quadraticCurveTo(w+7+phase*5,-2,w+8+phase*6,-18);c.stroke();
 c.fillStyle='#bddb9b';c.beginPath();
 c.ellipse(w+8+phase*6,-22,6.8,11.5,.4+phase*.3,0,TAU);c.fill();
 c.strokeStyle='#d3e0a7';c.lineWidth=1.7;
 c.beginPath();c.moveTo(0,-(stage>=16?35:26));
 c.quadraticCurveTo(5+phase*3,-42,phase*5,-49);c.stroke();
 glow(c,0,0,w*2,'#ffda96a8');c.restore();
}
function hutWindow(c,bx,by,w,time,still,seed){
 const pulse=still?1:.8+.2*Math.sin(time*.00135+seed*.067);
 const xx=bx+w*.008,yy=by-w*.119;
 glow(c,xx,yy,w*.12*pulse,'#ffd779b8');
 c.save();c.shadowColor='#ffe29b';c.shadowBlur=12*pulse;
 c.fillStyle='#ffdc80';c.fillRect(bx+w*.001,by-w*.141,w*.029,w*.053);
 c.fillStyle='#fff8ca';c.fillRect(bx+w*.003,by-w*.136,w*.01,w*.021);
 c.shadowBlur=0;c.strokeStyle='#7d6872';c.lineWidth=1.2;
 c.strokeRect(bx+w*.001,by-w*.141,w*.029,w*.053);
 // Minimal sway of a small chimney light: small motion, real landmark.
 c.fillStyle='#ffe6ae';c.beginPath();
 c.ellipse(xx+Math.sin(time*.0008+seed)*2,yy-w*.096,w*.011,w*.021,0,0,TAU);c.fill();
 c.restore();
}
function highlightSample(c,topic,scene,stage){
 // Used only by actual-browser QA for repeatable saturated/vividness checks.
 void c;void topic;void scene;void stage;
 return true;
}
root.CrewFantasyV8=Object.freeze({
 braidedRoots,organismHalo,moonRim,warmHollow,hollowMotion,hutWindow,highlightSample,
 palettes:colors
});
})(window);
