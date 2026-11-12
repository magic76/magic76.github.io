/* Crew Fantasy V4: close-up beginnings, spiral leaf glazing, expedition
 * storytelling and refracted living-lantern canopy. Original drawing only.
 * Deterministic from seed, stage, topic, render time; supports reduced motion.
 */
(function(root){'use strict';
const TAU=Math.PI*2;
function seeded(seed){let x=seed>>>0;return ()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function glow(c,x,y,r,color){
 const gr=c.createRadialGradient(x,y,0,x,y,r);
 gr.addColorStop(0,color);gr.addColorStop(1,'#fff9d900');
 c.fillStyle=gr;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
}
function sproutGhost(c,x,y,w,seed,art,scene){
 c.save();c.globalAlpha=.11;c.filter='saturate(.58)';
 if(scene==='island'){
  art(c,'floating-island.svg',x-w*.5,y-w*.26,w,w*.62);
  c.strokeStyle='#dceacdb9';c.lineWidth=4;c.lineCap='round';
  c.beginPath();c.moveTo(x,y-w*.24);c.quadraticCurveTo(x+9,y-w*.48,x-1,y-w*.7);c.stroke();
  c.fillStyle='#b5dbc3';c.beginPath();
  c.ellipse(x-14,y-w*.53,19,8,-.55,0,TAU);c.fill();
 }else{
  c.strokeStyle='#cae6d5';c.lineWidth=4;c.setLineDash([7,10]);
  c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-15,y+65,x+12,y+125);c.stroke();
  c.setLineDash([]);
  art(c,'lantern-bud.svg',x-w*.36,y-w*.32,w*.72,w*.98);
 }
 c.restore();
 glow(c,x,y-w*.12,w*.45,'#eff5e123');
 void seed;
}
function openWorld(c,scene,seed,time,still,art){
 // Whispers of unreached places; these remain pale and non-interactive.
 c.save();
 if(scene==='island'){
  sproutGhost(c,166,385,170,seed,art,scene);
  sproutGhost(c,651,319,147,seed+7,art,scene);
  sproutGhost(c,588,555,111,seed+13,art,scene);
  c.strokeStyle='#e5ecdd50';c.lineWidth=1.7;c.setLineDash([3,12]);
  c.beginPath();c.moveTo(264,422);c.bezierCurveTo(314,314,490,344,563,328);c.stroke();
  c.setLineDash([]);
 }else{
  sproutGhost(c,179,363,90,seed,art,scene);
  sproutGhost(c,614,349,109,seed+1,art,scene);
  sproutGhost(c,266,612,58,seed+2,art,scene);
  c.strokeStyle='#e4e2de54';c.lineWidth=1.3;
  for(let i=0;i<6;i++){
   const x=125+i*107,y=340+(i%3)*27;
   c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x-7,y+32,x+12,y+52,x+8,y+70);c.stroke();
  }
 }
 c.restore();void time;void still;
}
function islandSeedling(c,u,m,time,still,art){
 // Stage 3 composition is deliberately portrait-sized; never re-use adult art.
 openWorld(c,'island',m.seed,time,still,art);
 c.save();
 const pivotY=u.y+116;
 c.translate(0,-142);c.translate(u.x,pivotY);
 c.scale(2.00,2.00);c.translate(-u.x,-pivotY);
 root.CrewFantasyV3.islandBud(c,u,m,time,still,art);
 c.restore();
 glow(c,u.x,436,70,'#f6e5bd6e');
 c.save();
 const r=seeded(m.seed^0x77BC);
 for(let i=0;i<13;i++){
  const x=u.x-130+r()*260,y=395+r()*200;
  c.fillStyle=i%3?'#f3ead0a6':'#badbc3ad';
  c.beginPath();c.ellipse(x,y,1.4+r()*2.2,2+r()*2.8,r()*TAU,0,TAU);c.fill();
 }
 c.restore();
}
function jellyHatchling(c,m,time,still,art){
 openWorld(c,'jelly',m.seed,time,still,art);
 c.save();const pivotY=711;
 c.translate(0,-171);c.translate(401,pivotY);
 c.scale(2.18,2.18);c.translate(-401,-pivotY);
 root.CrewFantasyV3.juvenileMedusa(c,m,time,still,art);
 c.restore();
 // A few living ripples frame the newborn rather than an empty upper sky.
 const bob=still?0:Math.sin(time*.001+m.phase)*3;
 c.strokeStyle='#dbece3a9';c.lineWidth=2;
 for(const rx of [166,218,265]){
  c.beginPath();c.ellipse(401,605+bob,rx,16+(rx-166)*.08,0,Math.PI*.08,Math.PI*.95);c.stroke();
 }
}
function travelBalloon(c,x,y,scale,seed,time,still){
 const swing=still?0:Math.sin(time*.00055+seed*.1)*5;
 c.save();c.translate(x,y+swing);c.scale(scale,scale);
 glow(c,0,-64,87,'#ffebc16d');
 const g=c.createLinearGradient(-50,-150,52,-10);
 g.addColorStop(0,'#fae7b6');g.addColorStop(.43,'#d99890');g.addColorStop(.73,'#a3afa5');g.addColorStop(1,'#698f98');
 c.fillStyle=g;c.strokeStyle='#987f86';c.lineWidth=2.6;
 c.beginPath();c.moveTo(0,-162);c.bezierCurveTo(-94,-158,-80,-57,-33,-24);
 c.quadraticCurveTo(-13,-8,0,-12);c.quadraticCurveTo(12,-8,33,-24);
 c.bezierCurveTo(84,-56,91,-158,0,-162);c.fill();c.stroke();
 c.strokeStyle='#fceaccb7';c.lineWidth=4;c.beginPath();
 c.moveTo(-6,-159);c.bezierCurveTo(-43,-135,-31,-63,-13,-18);
 c.moveTo(9,-159);c.bezierCurveTo(44,-129,30,-62,12,-18);c.stroke();
 for(let q of [-1,1]){c.strokeStyle='#927b7b';c.lineWidth=2;c.beginPath();
 c.moveTo(q*22,-16);c.lineTo(q*18,4);c.stroke();}
 c.fillStyle='#947366';c.fillRect(-21,1,42,30);
 c.fillStyle='#d5aa83';c.fillRect(-16,5,32,20);
 c.strokeStyle='#f1e6c4';c.strokeRect(-21,1,42,30);
 c.fillStyle='#f7eccd';c.beginPath();c.arc(0,14,4.5,0,TAU);c.fill();
 c.restore();
}
function paperPlane(c,x,y,s,angle){
 c.save();c.translate(x,y);c.rotate(angle);c.scale(s,s);
 c.fillStyle='#f9ecd2';c.strokeStyle='#7f8d88';c.lineWidth=2;c.lineJoin='round';
 c.beginPath();c.moveTo(-38,6);c.lineTo(49,-18);c.lineTo(7,22);c.lineTo(-3,5);c.closePath();c.fill();c.stroke();
 c.beginPath();c.moveTo(-3,5);c.lineTo(49,-18);c.lineTo(7,22);c.lineTo(13,3);c.closePath();
 c.fillStyle='#bcc9b9';c.fill();c.stroke();
 c.strokeStyle='#e2bca3';c.beginPath();c.moveTo(-38,6);c.lineTo(13,3);c.stroke();
 c.restore();
}
function travelSky(c,seed,stage,time,still){
 c.save();
 // Map line winds behind the island world; plane and balloons have distinct parallax.
 c.strokeStyle='#f3dfb5b5';c.lineWidth=3;c.setLineDash([9,12]);c.lineCap='round';
 c.beginPath();c.moveTo(20,240);
 c.bezierCurveTo(124,355,251,105,394,215);
 c.bezierCurveTo(490,299,612,100,778,206);c.stroke();c.setLineDash([]);
 const t=still?.56:(.56+Math.sin(time*.00032+seed*.01)*.13);
 paperPlane(c,395+t*190,202-Math.sin(t*Math.PI)*68,1.05,-.20);
 travelBalloon(c,644,276,stage<=3?.67:.98,seed,time,still);
 travelBalloon(c,135,175,.48,seed+5,time,still);
 c.restore();
}
function travelCliff(c,x,ground,w,seed,index){
 // Parchment map fibers live inside the mineral face, not over the open sky.
 c.save();c.beginPath();
 c.moveTo(x-w*.43,ground+w*.025);
 c.bezierCurveTo(x-w*.31,ground+w*.13,x-w*.18,ground+w*.26,x-w*.08,ground+w*.35);
 c.quadraticCurveTo(x,ground+w*.40,x+w*.07,ground+w*.34);
 c.bezierCurveTo(x+w*.20,ground+w*.24,x+w*.36,ground+w*.10,x+w*.42,ground+w*.03);
 c.closePath();c.clip();
 const g=c.createLinearGradient(x-w*.4,ground,x+w*.4,ground+w*.37);
 g.addColorStop(0,'#f3e4c27a');g.addColorStop(.50,'#ccb48b73');g.addColorStop(1,'#8b816b6b');
 c.fillStyle=g;c.fillRect(x-w*.45,ground,w*.9,w*.43);
 const r=seeded(seed^Math.imul(index+13,7477));
 c.strokeStyle='#896e5780';c.lineWidth=1.2;
 for(let i=0;i<20;i++){const px=x+(r()-.5)*w*.87,py=ground+r()*w*.34;
  c.beginPath();c.moveTo(px-5,py);c.quadraticCurveTo(px+r()*13,py-4,px+8,py+3);c.stroke();}
 c.strokeStyle='#6d827eab';c.lineWidth=2;c.setLineDash([4,8]);
 c.beginPath();c.moveTo(x-w*.33,ground+w*.085);
 c.bezierCurveTo(x-w*.07,ground+w*.33,x+w*.16,ground+w*.03,x+w*.34,ground+w*.20);
 c.stroke();c.setLineDash([]);
 // Tiny compass stamp, etched into rock.
 const cx=x+w*.18,cy=ground+w*.16,rad=w*.055;
 c.strokeStyle='#7b6459ba';c.lineWidth=1.5;c.beginPath();c.arc(cx,cy,rad,0,TAU);c.stroke();
 c.beginPath();c.moveTo(cx,cy-rad*.82);c.lineTo(cx+rad*.38,cy);c.lineTo(cx,cy+rad*.70);c.lineTo(cx-rad*.38,cy);c.closePath();
 c.fillStyle='#7c827c9c';c.fill();c.restore();
}
function postageStamp(c,x,y,size,seed){
 c.save();c.translate(x,y);c.rotate(-.08+(seed%3)*.03);
 c.fillStyle='#f5e5ca';c.strokeStyle='#bd958b';c.lineWidth=2;
 c.fillRect(-size*.5,-size*.53,size,size*.91);
 c.strokeRect(-size*.5,-size*.53,size,size*.91);
 c.strokeStyle='#bd8b84';c.lineWidth=1.7;c.setLineDash([3,4]);
 c.strokeRect(-size*.43,-size*.45,size*.86,size*.75);c.setLineDash([]);
 c.fillStyle='#a3b2a5';c.beginPath();c.moveTo(-size*.24,-size*.25);c.lineTo(size*.27,-size*.25);
 c.lineTo(size*.08,size*.13);c.closePath();c.fill();
 c.strokeStyle='#9a7872';c.lineWidth=2.5;c.beginPath();
 c.arc(size*.35,size*.26,size*.27,.3,Math.PI*1.85);c.stroke();
 c.restore();
}
function travelStamp(c,m){
 if(m.stage<8)return;
 const u=m.units[0],scale=m.stage===8?.85:1;
 postageStamp(c,u.x+u.w*.23,u.y-148*scale,52*scale,m.seed);
}
function refract(c,spec,time,still,seed){
 if(spec.w<450)return;
 const x=400,y=spec.y+spec.h*.49,w=spec.w*.71,h=spec.h*.53;
 c.save();c.beginPath();
 c.moveTo(x-w*.48,y-h*.16);
 c.bezierCurveTo(x-w*.49,y-h*.69,x+w*.37,y-h*.66,x+w*.48,y-h*.13);
 c.quadraticCurveTo(x+w*.38,y+h*.48,x,y+h*.43);
 c.quadraticCurveTo(x-w*.40,y+h*.42,x-w*.48,y-h*.16);c.closePath();c.clip();
 const g=c.createLinearGradient(x-w*.5,y-h*.4,x+w*.44,y+h*.42);
 g.addColorStop(0,'#465e80a0');g.addColorStop(.32,'#607c94a5');
 g.addColorStop(.63,'#3c6d81a8');g.addColorStop(1,'#977c94aa');
 c.fillStyle=g;c.fillRect(x-w*.55,y-h*.6,w*1.1,h*1.2);
 const t=still?0:Math.sin(time*.00067+seed*.02)*9;
 for(let i=0;i<7;i++){
  const xx=x-w*.43+i*w*.15+t*.5,yy=y-h*.43+(i%3)*h*.15;
  c.strokeStyle=i%2?'#b0e6e1a3':'#e8d1e6a3';c.lineWidth=6-i%3;
  c.beginPath();c.moveTo(xx,yy);
  c.bezierCurveTo(xx+20,yy+h*.13,xx-26,yy+h*.25,xx+9,yy+h*.44);c.stroke();
 }
 // Crisp luminous refraction edges and pockets of darkness restore volume.
 for(let i=0;i<4;i++){
  c.strokeStyle=i%2?'#fff5d490':'#f4ddd088';c.lineWidth=1.5;
  c.beginPath();c.ellipse(x,y+h*.04,w*(.29+i*.06),h*(.08+i*.055),-.08,Math.PI*.12,Math.PI*.84);c.stroke();
 }
 c.restore();
}
function fishHero(c,spec,time,still,seed){
 const t=still?0:time*.00043+seed*.02;
 const x=400+Math.sin(t)*27, y=spec.y+spec.h*.42+Math.sin(t*1.2)*8;
 const size=1.25;
 c.save();c.translate(x,y);c.scale(size,size);
 glow(c,0,0,81,'#faedc6aa');
 c.fillStyle='#91cac6';c.strokeStyle='#5c888e';c.lineWidth=2.5;
 c.beginPath();c.moveTo(-34,0);c.lineTo(-66,-22);c.quadraticCurveTo(-58,0,-66,25);c.closePath();c.fill();c.stroke();
 const body=c.createLinearGradient(-35,-29,35,24);
 body.addColorStop(0,'#fff0c6');body.addColorStop(.50,'#e8c9bb');body.addColorStop(1,'#d49d9e');
 c.fillStyle=body;c.strokeStyle='#826f86';c.lineWidth=2.1;
 c.beginPath();c.moveTo(-35,0);c.bezierCurveTo(-31,-32,12,-35,41,-5);
 c.bezierCurveTo(46,15,11,33,-18,23);c.quadraticCurveTo(-37,14,-35,0);c.fill();c.stroke();
 c.fillStyle='#aed7c8';c.beginPath();c.moveTo(-18,-20);c.lineTo(1,-40);c.lineTo(14,-22);c.closePath();c.fill();
 c.beginPath();c.moveTo(-14,20);c.lineTo(5,33);c.lineTo(12,17);c.closePath();c.fill();
 for(let i=0;i<5;i++){c.fillStyle=i%2?'#f7e5ae':'#e5b8af';c.beginPath();
 c.arc(-22+i*11,4+Math.sin(i)*8,2.7,0,TAU);c.fill();}
 // Character face: oversized expressive pupil, blink and warm blush.
 c.fillStyle='#fffcee';c.beginPath();c.ellipse(23,-5,10.5,12,0,0,TAU);c.fill();
 c.fillStyle='#44697b';c.beginPath();c.ellipse(25,-4,5.3,7.2,0,0,TAU);c.fill();
 c.fillStyle='#ffffff';c.beginPath();c.arc(27,-8,2.7,0,TAU);c.fill();
 c.fillStyle='#efabab';c.beginPath();c.ellipse(30,11,7,3.8,-.3,0,TAU);c.fill();
 c.strokeStyle='#8b657e';c.lineWidth=1.7;c.beginPath();c.arc(30,5,6,.28,Math.PI*.84);c.stroke();
 c.fillStyle='#ffffffb0';c.beginPath();c.ellipse(-13,-18,12,3.2,-.25,0,TAU);c.fill();
 c.restore();
 const r=seeded(seed^0x94FDA);
 for(let i=0;i<6;i++){
  const bx=x-91-r()*55,by=y-32-r()*32-i*7;
  c.strokeStyle='#f8eedaad';c.lineWidth=1.8;c.beginPath();c.arc(bx,by,3+r()*4,0,TAU);c.stroke();
 }
}
root.CrewFantasyV4=Object.freeze({islandSeedling,jellyHatchling,travelSky,travelCliff,travelStamp,refract,fishHero});
})(window);
