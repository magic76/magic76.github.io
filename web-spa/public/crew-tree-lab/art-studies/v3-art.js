/* Crew Fantasy Art V3: real juveniles, portraits, four storybook climates.
 * All shapes and characters are original Canvas drawings; no emoji or web assets.
 * Motion is deterministic for a given seed, topic and render time.
 */
(function(root){'use strict';
const TAU=Math.PI*2,lerp=(a,b,t)=>a+(b-a)*t;
const THEMES=Object.freeze({
 cosmos:{name:'星海宇宙',sky:['#182747','#424e78','#718bb2','#c2bac0'],glow:'#b4d4f0',accent:'#e6e0b0'},
 warmth:{name:'暖陽黃昏',sky:['#e28b81','#f0b391','#e9bba4','#e6d4be'],glow:'#ffe8b6',accent:'#e7aa9b'},
 music:{name:'音樂花園',sky:['#647997','#9e9cc1','#b4c4ba','#e8dfd3'],glow:'#e9d7ef',accent:'#f0d393'},
 travel:{name:'旅行綠洲',sky:['#92bcaf','#c1d5c0','#e4ddbb','#d2c7ac'],glow:'#e6deb4',accent:'#d29b83'}
});
const pal=t=>THEMES[t]||THEMES.cosmos;
function rng(seed){let x=seed>>>0;return ()=>{x=(x+0x6D2B79F5)>>>0;let v=x;v=Math.imul(v^(v>>>15),v|1);v^=v+Math.imul(v^(v>>>7),v|61);return ((v^(v>>>14))>>>0)/4294967296;};}
function glow(c,x,y,r,color){
 const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#ffffff00');
 c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
}
function themeBackdrop(c,topic,seed,scene){
 const th=pal(topic),sky=c.createLinearGradient(0,0,0,820);
 th.sky.forEach((p,i)=>sky.addColorStop(i/3,p));
 c.fillStyle=sky;c.fillRect(0,0,800,820);
 const sunx=topic==='warmth'?593:topic==='music'?204:614,suny=topic==='warmth'?242:176;
 glow(c,sunx,suny,topic==='warmth'?286:185,topic==='warmth'?'#ffe4b9a8':'#e7e8ce67');
 if(topic==='warmth'){
  c.fillStyle='#ffe6be';c.beginPath();c.arc(603,257,52,0,TAU);c.fill();
  c.globalAlpha=.23;c.fillStyle='#f5b2a8';c.beginPath();c.ellipse(598,333,285,30,-.12,0,TAU);c.fill();c.globalAlpha=1;
 } else if(topic==='cosmos'){
  const r=rng(seed^0xA4A482);
  for(let i=0;i<125;i++){
   const x=r()*800,y=r()*615,rad=.6+r()*2.2;
   c.fillStyle=i%5===0?'#ffedc6':'#dce8fb';c.globalAlpha=.25+r()*.72;
   c.beginPath();c.arc(x,y,rad,0,TAU);c.fill();
  }
  c.globalAlpha=.94;c.fillStyle='#f8eecb';c.beginPath();c.arc(643,129,29,0,TAU);c.fill();
  c.fillStyle=th.sky[0];c.beginPath();c.arc(653,117,28,0,TAU);c.fill();
  c.globalAlpha=1;
  for(const constellation of [[[82,100],[121,78],[177,114],[205,82]],[[358,73],[410,109],[450,68],[502,107]],[[688,337],[716,289],[766,317]]]){
   c.strokeStyle='#c5d6ee8c';c.lineWidth=1.2;c.beginPath();
   constellation.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
   for(const [x,y] of constellation){glow(c,x,y,12,'#d9eef8b8');c.fillStyle='#e7f4e8';c.beginPath();c.arc(x,y,2.8,0,TAU);c.fill();}
  }
 } else if(topic==='music'){
  // Staves across the distant sky, as botanical rhythms rather than pasted music emoji.
  c.strokeStyle='#dce8d378';c.lineWidth=1.5;
  for(let i=0;i<4;i++){c.beginPath();c.moveTo(16,150+i*15);
   c.bezierCurveTo(218,78+i*15,399,233+i*14,790,141+i*15);c.stroke();}
  for(let i=0;i<7;i++) {
   const x=58+i*100,y=150+Math.sin(i*.8)*24;
   c.fillStyle=i%2?'#f3deac':'#d4d1ee';c.beginPath();c.ellipse(x,y,6,9,.7,0,TAU);c.fill();
   c.strokeStyle='#e5e8ce';c.lineWidth=2.5;c.beginPath();c.moveTo(x+5,y);c.lineTo(x+5,y-33);c.stroke();
  }
 } else {
  // Travel: sunrise at the horizon and map-like trails through the atmosphere.
  c.strokeStyle='#f6f0d298';c.lineWidth=2;c.setLineDash([12,10]);
  c.beginPath();c.moveTo(34,168);c.bezierCurveTo(150,104,226,233,325,172);
  c.bezierCurveTo(445,111,562,216,714,157);c.stroke();c.setLineDash([]);
  for(const [x,y] of [[122,144],[323,172],[536,174],[714,157]]){
   c.strokeStyle='#faf0d1';c.lineWidth=1.8;c.beginPath();c.arc(x,y,8,0,TAU);c.stroke();
   c.fillStyle='#d4c19a';c.beginPath();c.arc(x,y,2.5,0,TAU);c.fill();
  }
 }
 // Soft colored horizon connects the worlds but does not drown out the main character.
 const haze=c.createLinearGradient(0,530,0,820);
 haze.addColorStop(0,'#dfe3d300');haze.addColorStop(1,topic==='cosmos'?'#adb2c268':'#f2efdf71');
 c.fillStyle=haze;c.fillRect(0,530,800,290);
 void scene;
}
function leaf(c,x,y,side,s,color){
 c.save();c.translate(x,y);c.scale(side*s,s);c.fillStyle=color;c.strokeStyle='#548579';c.lineWidth=.8;
 c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-24,-28,-31,-10,-4,11);
 c.quadraticCurveTo(6,4,0,0);c.closePath();c.fill();c.stroke();c.restore();
}
function islandBud(c,u,model,time,still,art){
 const r=rng(model.seed^0x1403),x=u.x,y=u.y+116,w=173;
 const drift=still?0:Math.sin(time*.0007+model.phase)*3;
 const ground=y-w*.29+w*.17+drift;
 c.save();c.translate(0,drift);
 const shadow=c.createRadialGradient(x,y+61,0,x,y+61,76);shadow.addColorStop(0,'#53695b35');shadow.addColorStop(1,'#53695b00');
 c.fillStyle=shadow;c.beginPath();c.ellipse(x,y+61,83,15,0,0,TAU);c.fill();
 art(c,'floating-island.svg',x-w/2,y-w*.29,w,w*.62);
 // Seedling from the soil; no adult spiral sprite appears at this stage.
 c.strokeStyle='#608b76';c.lineWidth=5;c.lineCap='round';c.beginPath();
 c.moveTo(x,ground+1);c.quadraticCurveTo(x+6,ground-24,x+2,ground-43);c.stroke();
 leaf(c,x+3,ground-35,1,1.15,'#b7d6a4');
 leaf(c,x-2,ground-25,-1,.94,'#96bfa2');
 c.fillStyle='#ead7a7';c.beginPath();c.ellipse(x+2,ground-48,6,10,-.24,0,TAU);c.fill();
 c.fillStyle='#70968a';c.beginPath();c.ellipse(x+2,ground-54,3.5,5,0,0,TAU);c.fill();
 for(let i=0;i<5;i++){const sx=x+(r()-.5)*w*.74,sy=ground+r()*7;
  c.fillStyle=i%2?'#c1bd9e':'#789e87';c.beginPath();c.ellipse(sx,sy,3+r()*3,2,0,0,TAU);c.fill();}
 c.restore();
}
function islandHollow(c,x,ground,w,time,still,stage,seed){
 if(stage<8)return;
 const xx=x-w*.015,yy=ground-w*(stage>=16?.155:.115);
 const open=still?1:(Math.cos(time*.00112+seed*.01)>.93?.10:1);
 c.save();
 c.translate(xx,yy);
 const width=stage>=16?29:21,height=stage>=16?36:27;
 c.fillStyle='#5a4c51';c.strokeStyle='#e0c8a4';c.lineWidth=4.1;
 c.beginPath();c.ellipse(0,0,width,height,0,0,TAU);c.fill();c.stroke();
 glow(c,0,0,width*1.8,'#f8db9e94');
 // Shy tree hollow resident: two cream eyes under a blinking leafy eyebrow.
 for(const side of [-1,1]){
  c.fillStyle='#fff0c6';c.beginPath();c.ellipse(side*9,-4,4.3,6.2*open,0,0,TAU);c.fill();
  if(open>.8){c.fillStyle='#44585b';c.beginPath();c.arc(side*9+1,-3,2.1,0,TAU);c.fill();}
 }
 c.strokeStyle='#f2d2b3';c.lineWidth=2.1;c.beginPath();c.arc(0,11,7,.2,Math.PI-.2);c.stroke();
 c.fillStyle='#ecb9a8';for(const side of [-1,1]){c.beginPath();c.arc(side*18,8,3.7,0,TAU);c.fill();}
 root.CrewFantasyV8.hollowMotion(c,stage,time,still,seed);
 c.restore();
}
function juvenileMedusa(c,model,time,still,art){
 const x=401,ground=711,sway=still?0:Math.sin(time*.001+model.phase)*2.4;
 c.save();c.translate(0,sway);const inheritedAlpha=c.globalAlpha;
 // Shallow seawater/sand cradle establishes the creature's newborn scale.
 const tide=c.createRadialGradient(x,ground+3,4,x,ground+3,135);
 tide.addColorStop(0,'#94c8c3b0');tide.addColorStop(.7,'#aad6c65a');tide.addColorStop(1,'#f1ddcb00');
 c.fillStyle=tide;c.beginPath();c.ellipse(x,ground+6,124,25,0,0,TAU);c.fill();
 c.strokeStyle='#e4efe2c5';c.lineWidth=2;c.beginPath();c.ellipse(x,ground+6,96,16,0,Math.PI,TAU);c.stroke();
 c.strokeStyle='#8bb0a9';c.lineWidth=5;c.lineCap='round';
 c.beginPath();c.moveTo(x,ground);c.quadraticCurveTo(x+3,ground-29,x,ground-49);c.stroke();
 const w=136,h=87,top=ground-138;
 glow(c,x,top+65,100,'#e4d5e794');
 c.globalAlpha=inheritedAlpha*.80;art(c,'jelly-canopy.svg',x-w/2,top,w,h);
 c.globalAlpha=inheritedAlpha*.54;art(c,'jelly-inner-membrane.svg',x-w*.46,top+8,w*.92,h*.79);
 c.globalAlpha=inheritedAlpha;
 for(let i=0;i<4;i++){
  const dx=(i-1.5)*20;
  c.strokeStyle=i%2?'#79afb1a8':'#b7c3aba8';c.lineWidth=1.5;
  c.beginPath();c.moveTo(x+dx,top+65);c.quadraticCurveTo(x+dx+Math.sin(i*1.4)*8,top+85,x+dx+2,top+101+(i%2)*9);c.stroke();
 }
 // Little larva eyes and fin buds are inside its cap, not emoji or a sticker.
 c.fillStyle='#485e72';
 for(const side of [-1,1]){c.beginPath();c.ellipse(x+side*12,top+46,2.8,3.5,0,0,TAU);c.fill();}
 c.strokeStyle='#f4e8d0';c.lineWidth=1.7;c.beginPath();c.arc(x,top+48,8,.2,Math.PI-.2);c.stroke();
 c.restore();
}
function fishResident(c,spec,time,still,seed,stage){
 if(stage<=3)return;
 const t=still?0:time*.00032+seed*.02;
 const s=stage>=16?1:.71;
 const x=400+(still?0:Math.sin(t)*23),y=spec.y+spec.h*.38+(still?0:Math.sin(t*1.1)*7);
 c.save();c.translate(x,y);c.scale(s,s);
 glow(c,0,0,46,'#e5f8d3a0');
 c.fillStyle='#f6e5b2';c.strokeStyle='#e8d3ac';c.lineWidth=2;
 c.beginPath();c.ellipse(0,0,23,13,0,0,TAU);c.fill();c.stroke();
 c.fillStyle='#9ac9bb';c.beginPath();c.moveTo(-20,0);c.lineTo(-38,-17);c.quadraticCurveTo(-32,0,-38,17);c.closePath();c.fill();
 c.fillStyle='#dfe8d0';c.beginPath();c.moveTo(-6,-9);c.lineTo(5,-21);c.lineTo(10,-8);c.closePath();c.fill();
 c.fillStyle='#fff9e7';c.beginPath();c.arc(11,-3,5.8,0,TAU);c.fill();
 c.fillStyle='#3d6070';c.beginPath();c.arc(12,-2,2.5,0,TAU);c.fill();
 c.fillStyle='#f1b9ae';c.beginPath();c.arc(19,5,2.7,0,TAU);c.fill();
 for(let i=0;i<3;i++){c.fillStyle='#fffbe2';c.beginPath();c.arc(-8+i*7,3,1.6,0,TAU);c.fill();}
 c.restore();
}
function topicAccessories(c,model,time,still){
 if(model.stage<=3)return;
 const t=model.topic,theme=pal(t),s=model.scene,x=s==='island'?model.units[0].x:430;
 const y=s==='island'?model.units[0].y-66:460;
 if(t==='music'){
  // Music note berries dangle from actual sprig stems, never from empty sky.
  for(let i=0;i<(model.stage>=16?6:3);i++){
   const px=x+(i-2.5)*23,py=y-28+(i%3)*11;
   c.strokeStyle='#698e83';c.lineWidth=2;c.beginPath();c.moveTo(px,py-40);c.quadraticCurveTo(px+9,py-13,px,py);c.stroke();
   c.fillStyle=i%2?'#e9d4b2':'#d0bde0';c.beginPath();c.ellipse(px,py,6,7,.7,0,TAU);c.fill();
   c.strokeStyle='#f4e6ce';c.lineWidth=2;c.beginPath();c.moveTo(px+5,py);c.lineTo(px+5,py-28);
   c.lineTo(px+13,py-23);c.stroke();
  }
 }else if(t==='travel'){
  // Staked expedition map flag and journey trail on the local botanical structure.
  const bx=x+48,by=y-15;
  c.strokeStyle='#6d7a78';c.lineWidth=3;c.beginPath();c.moveTo(bx,by+19);c.lineTo(bx,by-77);c.stroke();
  c.fillStyle='#f0e4c1';c.strokeStyle='#a78c7c';c.lineWidth=1.5;
  c.beginPath();c.moveTo(bx,by-77);c.lineTo(bx+57,by-69);c.lineTo(bx+36,by-51);c.lineTo(bx,by-56);c.closePath();c.fill();c.stroke();
  c.strokeStyle='#a67c6b';c.beginPath();c.moveTo(bx+9,by-68);c.quadraticCurveTo(bx+25,by-79,bx+37,by-60);c.stroke();
  for(let i=0;i<4;i++){c.fillStyle='#a47f6f';c.beginPath();c.arc(bx+6+i*8,by+17+i%2*5,2,0,TAU);c.fill();}
 }else if(t==='warmth'){
  glow(c,x,y-38,90,'#ffd7a3a8');
  c.strokeStyle='#bd9c81';c.lineWidth=3;c.beginPath();c.moveTo(x-21,y+8);c.quadraticCurveTo(x-50,y-33,x-8,y-46);
  c.moveTo(x+21,y+8);c.quadraticCurveTo(x+50,y-33,x+8,y-46);c.stroke();
  for(const side of [-1,1]){c.fillStyle='#eebdb0';c.beginPath();c.ellipse(x+side*20,y-30,11,15,side*.3,0,TAU);c.fill();}
 }else if(t==='cosmos'&&model.stage>=16){
  c.strokeStyle='#d9e7dfbd';c.lineWidth=1.5;c.beginPath();
  c.moveTo(x+77,y-92);c.lineTo(x+93,y-123);c.lineTo(x+114,y-107);c.stroke();
  for(const [dx,dy] of [[77,-92],[93,-123],[114,-107]]){glow(c,x+dx,y+dy,11,'#f1e9bcab');c.fillStyle='#fff6de';c.beginPath();c.arc(x+dx,y+dy,2.2,0,TAU);c.fill();}
 }
 void theme;void time;void still;
}
root.CrewFantasyV3=Object.freeze({themes:THEMES,themeBackdrop,islandBud,islandHollow,juvenileMedusa,fishResident,topicAccessories});
})(window);
