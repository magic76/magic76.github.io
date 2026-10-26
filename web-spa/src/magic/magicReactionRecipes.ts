import type {MagicParticle,MagicParticleKind} from "./MagicParticleLayers3D";
import type {MagicReactionId} from "./magicReactions";
export type ReactionPool={points:Record<MagicParticleKind,MagicParticle[]>;counts:Record<MagicParticleKind,number>};
const PI=Math.PI,TAU=PI*2;
const cap=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>{const t=cap(x);return t*t*(3-2*t)};
const fade=(t:number)=>cap(t/.12)*Math.pow(cap((4.4-t)/1),2);
const angle=(i:number,n:number)=>TAU*i/n;
const fib=(i:number,n:number)=>{const y=1-2*(i+.5)/n,a=i*2.399963229728653;const r=Math.sqrt(1-y*y);return [Math.cos(a)*r,y,Math.sin(a)*r] as const};
export const REACTION_VISUALS:Record<MagicReactionId,{kind:MagicParticleKind;color:number;ring:number;radius:number}>= {
 cat_fish_chase:{kind:"bubble",color:0x3aa0ff,ring:0x3aa0ff,radius:2.4},
 dragon_fireworks:{kind:"star",color:0xff6b6b,ring:0xff6b6b,radius:2.4},
 forge_sparks:{kind:"sparkle",color:0xffb000,ring:0xff7a1a,radius:2.3},
 steam_rainbow:{kind:"glow",color:0xd9dde8,ring:0x749bd8,radius:2.4},
 flower_ring:{kind:"flower",color:0xff72a9,ring:0x3aa0ff,radius:2.5},
 frost_carpet:{kind:"crystal",color:0x5ab4ff,ring:0x2f8fff,radius:2.5},
 golden_pollen:{kind:"glow",color:0xffc21a,ring:0xe5a600,radius:2.3},
 petal_swirl:{kind:"petal",color:0xff72ac,ring:0x3fcf8e,radius:2.5},
 ember_whirl:{kind:"flame",color:0xff5a1f,ring:0xff5a1f,radius:2.4},
 snow_fairy:{kind:"snow",color:0x5ab4ff,ring:0x2f8fff,radius:2.5},
 ripple_splash:{kind:"drop",color:0x2f8fff,ring:0x2f8fff,radius:2.6},
 star_lake:{kind:"star",color:0xffd23f,ring:0x345bc8,radius:2.5},
 heart_bouquet:{kind:"heart",color:0xff4f8b,ring:0xff4f8b,radius:2.5},
 meteor_shower:{kind:"star",color:0xffd23f,ring:0xd69b2e,radius:2.4},
 dragon_frost:{kind:"crystal",color:0x2f8fff,ring:0x2f8fff,radius:2.5},
 music_dance:{kind:"note",color:0x7b4dff,ring:0x7b4dff,radius:2.5}
};
export function makeReactionPool(kinds:readonly MagicParticleKind[]):ReactionPool{
 const points={} as Record<MagicParticleKind,MagicParticle[]>,counts={} as Record<MagicParticleKind,number>;
 for(const k of kinds){points[k]=Array.from({length:64},()=>({x:0,y:0,z:0,size:1,alpha:0,color:0,minPx:3}));counts[k]=0}
 return {points,counts};
}
export function resetReactionPool(pool:ReactionPool){for(const k in pool.counts)pool.counts[k as MagicParticleKind]=0}
// Particle positions are deterministic and allocation-free at render time.
// Time is measured from the reaction start; all recipes have a readable 1.4–3.6s main act.
// Camera-safe cone tracing against the castle collision cylinder.
export function dragonFrostLayout(dragonX:number,dragonZ:number,camX:number,camZ:number){
 const cx=0,cz=-.55,rad=4.5;
 const ox=dragonX-cx,oz=dragonZ-cz;
 const toX=-ox,toZ=-oz,dist=Math.hypot(toX,toZ)||1;
 const vx=(camX-dragonX),vz=(camZ-dragonZ),cl=Math.hypot(vx,vz)||1;
 const ux=vx/cl,uz=vz/cl;
 const initial=Math.atan2(toX,toZ);
 let best=initial,bestScore=-1e9;
 for(let step=0;step<=12;step++)for(const sign of (step===0?[1]:[1,-1])){
  const h=initial+sign*step*Math.PI/12,dx=Math.sin(h),dz=Math.cos(h);
  const facing=dx*ux+dz*uz;
  const minDist=Math.hypot(ox+dx*.8,oz+dz*.8);
  const score=(facing>=-.2?100:0)+facing*.3+minDist*.08-step*.05;
  if(score>bestScore){bestScore=score;best=h}
 }
 let dx=Math.sin(best),dz=Math.cos(best);
 const B=2*(ox*dx+oz*dz),C=ox*ox+oz*oz-rad*rad;
 const discriminant=B*B-4*C;
 let hit=Infinity;
 if(discriminant>=0){const root=Math.sqrt(discriminant);for(const v of [(-B-root)/2,(-B+root)/2])if(v>0&&v<hit)hit=v}
 let length=Number.isFinite(hit)?Math.max(1.2,Math.min(3,hit-.3)):2.4;
 // If already near the wall, sweep tangentially instead of spraying inside it.
 if(dist-rad<1.5||Math.hypot(ox+dx*(.5+length),oz+dz*(.5+length))<rad){
  const tangent=Math.atan2(-oz,ox);
  const alternatives=[tangent,tangent+Math.PI];
  best=alternatives.reduce((a,b)=>Math.sin(a)*ux+Math.cos(a)*uz>=Math.sin(b)*ux+Math.cos(b)*uz?a:b);
  dx=Math.sin(best);dz=Math.cos(best);length=2.4;
 }
 const endX=dragonX+dx*(.5+length),endZ=dragonZ+dz*(.5+length);
 return {heading:best,length,impact:[endX,endZ] as [number,number]};
}

export type FrostAim={heading:number;length:number;impact:[number,number]};
export function renderMagicReaction(id:MagicReactionId,t:number,x:number,z:number,ground:number,pool:ReactionPool,animated=true,heading:number|FrostAim=0){
 if(!animated){renderMagicReaction(id,2.4,x,z,ground,pool,true,heading);for(const k in pool.counts){
  const kind=k as MagicParticleKind;for(let i=0;i<pool.counts[kind];i++)pool.points[kind][i].alpha=.85;
 }return}
 const direction=typeof heading==="number"?heading:heading.heading;
 const phase=cap((t-1)/.4),show=cap((t-1.3)/.12)*Math.pow(cap((4.4-t)/.8),2);
 const a=Math.max(0,t-1.4),q=cap(a/2.2),vis=REACTION_VISUALS[id];
 const put=(k:MagicParticleKind,px:number,py:number,pz:number,c:number,minPx:number,alpha=1,size=1)=>{
  const j=pool.counts[k];if(j>=64)return;const p=pool.points[k][j];
  p.x=px;p.y=py;p.z=pz;p.color=c;p.minPx=minPx;p.alpha=cap(alpha)*show;p.size=size;pool.counts[k]=j+1;
 };
 const dot=(k:MagicParticleKind,i:number,n:number,r:number,h:number,c:number,m:number,alpha=1)=>{
  const th=angle(i,n);put(k,x+Math.cos(th)*r,ground+h,z+Math.sin(th)*r,c,m,alpha);
 };
 // Each recipe uses only its distinctive glyphs; no filler perimeter particles.
 switch(id){
 case "cat_fish_chase":{
  // Bubble trail is confined to the trailing 120 degrees of the fish's path.
  for(let i=0;i<14;i++){const th=q*TAU*2-i*.155;
   put("bubble",x+Math.cos(th)*2.3,ground+2.1+i%3*.16,z+Math.sin(th)*2.3,0x3aa0ff,16,.95-i*.025);
  }
  for(let side=0;side<2;side++)for(let i=0;i<8;i++){
   const th=q*TAU*2-(i/7)*1.8+side*PI;
   put("sparkle",x+Math.cos(th)*2.32,ground+.22,z+Math.sin(th)*2.32,0x3aa0ff,8,.5);
  }break}
 case "dragon_fireworks":{
  for(let shot=0;shot<3;shot++){
   const col=[0xff6b6b,0xffd23f,0x7b61ff][shot];
   const dt=t-(1.4+shot*.45);
   // Reduced-motion still shows all three separated colored flowers.
   const age=cap(dt/.9),spread=.25+1.4*age;
   if(dt<-.12&&t!==2.4)continue;
   for(let i=0;i<14;i++){const [dx,dy,dz]=fib(i,14);
    put("star",x+(shot-1)*2+dx*spread,ground+3.8+dy*spread,z+dz*spread,col,18,.93);
   }
   for(let i=0;i<4;i++)put("sparkle",x+(shot-1)*2,ground+1.35+i*.38,z,col,8,.6-i*.065);
  }break}
 case "forge_sparks":{
  // Five hammer strikes. Three descending particles form each directional streak.
  const strike=Math.max(0,Math.min(4,Math.floor((t-1.4)/.5))),dt=Math.max(0,t-1.4-strike*.5);
  put("glow",x,ground+1,z+.7,0xff7a1a,30,Math.max(.1,.45-dt*.7));
  for(let i=0;i<10;i++){const a=-.85+i*.19,dist=Math.min(1.8,dt*3.2);
   for(let j=0;j<3;j++){const d=Math.max(0,dist-j*.12);
    put("streak",x+Math.sin(a)*d,ground+.95+dt*2.1-dt*dt*5+j*.025,z+.75+Math.cos(a)*d,0xffb000,14-j*3,.9-j*.23);
   }
  }break}
 case "steam_rainbow":{
  for(let col=0;col<2;col++)for(let i=0;i<5;i++){const yy=1.9+i*.24+q*.4;
   put("glow",x+(col?1:-1)*(.7+i*.08),ground+yy,z+(col?-.25:.25),0xd9dde8,18+i*2,.42);
  }break}
 case "flower_ring":{
  for(let i=0;i<16;i++){const th=angle(i,16);put("flower",x+Math.cos(th)*2.3,ground+.22,z+Math.sin(th)*2.3,0xff72a9,20,.92)}
  for(let i=0;i<6;i++){const u=((t-1.4)*.6+i/6)%1;put("drop",x-1.8+u*3.6,ground+2+1.1*Math.sin(PI*u),z+Math.sin(i)*.5,0x3aa0ff,18,.9)}break}
 case "frost_carpet":{
  for(let i=0;i<12;i++){const th=angle(i,6),rad=.9+Math.floor(i/6)*1.3;put("crystal",x+Math.cos(th)*rad,ground+.16,z+Math.sin(th)*rad,0x2f8fff,20,.93)}break}
 case "golden_pollen":{
  for(let i=0;i<30;i++){const arm=i%2,u=Math.floor(i/2)/15,th=arm*PI+u*TAU*1.6+q*TAU*.5;
   const radius=2-u*1.25,height=.6+u*3;
   put("sparkle",x+Math.cos(th)*radius,ground+height,z+Math.sin(th)*radius,0xffc21a,10,.9);
  }put("flower",x,ground+3.6,z,0xffa04b,26,.85);break}
 case "petal_swirl":{
  for(let i=0;i<14;i++){const arm=i%2,u=Math.floor(i/2)/7,th=arm*PI+u*TAU*1.5+q*TAU*.45;
   const radius=2.2-u*1.18,height=.4+u*3.4;
   put("petal",x+Math.cos(th)*radius,ground+height,z+Math.sin(th)*radius,0xff72ac,20,.95);
  }
  for(let arm=0;arm<3;arm++)for(let j=0;j<6;j++){
   const u=j/6,th=arm*TAU/3+u*TAU+q;
   put("leaf",x+Math.cos(th)*2.4,ground+1.8+u*1.2,z+Math.sin(th)*2.4,0x4fbf6a,10-j*.7,.55);
  }break}
 case "ember_whirl":{
  for(let i=0;i<24;i++){const arm=i%2,u=Math.floor(i/2)/12,th=arm*PI+u*TAU*2+q*TAU*.5;
   const color=u<.333?0xff5a1f:u<.667?0xff8c1a:0xffc21a;
   put("flame",x+Math.cos(th)*(2-u*1.3),ground+.45+u*3.2,z+Math.sin(th)*(2-u*1.3),color,12,.9);
  }break}
 case "snow_fairy":{
  for(let n=0;n<2;n++)for(let j=0;j<9;j++){
   const th=q*TAU*2+n*PI-j*.14;
   put("snow",x+Math.sin(th)*2.2,ground+2.2+.2*Math.cos(th),z+Math.sin(2*th)*1.1,0x5ab4ff,j===0?26:Math.max(6,16-j*1.3),j===0?.95:.8-j*.06);
  }break}
 case "ripple_splash":{
  for(let i=0;i<10;i++){const th=angle(i,10),u=.5+.5*Math.sin(q*PI+i*.28);
   put("drop",x+Math.cos(th)*(1.1+u),ground+.6+u*1.6,z+Math.sin(th)*(1.1+u),0x2f8fff,18,.94)}break}
 case "star_lake":{
  for(let i=0;i<12;i++){const th=angle(i,12),r=.6+(i%3)*.62;
   put("star",x+Math.cos(th)*r,ground+.16,z+Math.sin(th)*r,0xffd23f,18,.91)}break}
 case "heart_bouquet":{
  for(let i=0;i<7;i++){const u=(i-3)/3;
   put("heart",x+Math.sin(u*PI*70/180)*1.8,ground+2.25+Math.cos(u*PI/3)*1.8+q*.22,z+.2+Math.cos(u*PI/3)*.5,0xff4f8b,24,.95)}
  for(let i=0;i<8;i++)dot("flower",i,8,2.2,.2,0xff72a9,15,.9);break}
 case "meteor_shower":{
  for(let i=0;i<6;i++){const dt=t-1.4-i*.35;if(dt<0||dt>.7)continue;
   const u=Math.min(1,dt/.58),xx=x-2.5+i*.9+u*1.2,yy=ground+4-u*3.8,zz=z+1.5+(i%3)*.45;
   put("star",xx,yy,zz,0xffd23f,26,.95);
   for(let j=1;j<=8;j++)put("streak",xx-j*.19,yy+j*.24,zz,0xff9f1a,Math.max(5,16-j*1.3),.9-j*.075);
   if(dt>.57)for(let j=0;j<6;j++){const a=angle(j,6);put("sparkle",xx+Math.cos(a)*.8,ground+.2,zz+Math.sin(a)*.8,0xffb347,9,.7)}
  }break}
 case "dragon_frost":{
  const aim=typeof heading==="number"?{heading:direction,length:2.4,impact:[x+Math.sin(direction)*2.9,z+Math.cos(direction)*2.9] as [number,number]}:heading;
  const dx=Math.sin(aim.heading),dz=Math.cos(aim.heading),nx=dz,nz=-dx;
  const castleX=0,castleZ=-.55;
  for(let i=0;i<28;i++){const u=(i+.5)/28,spread=((i%7)-3)/3*.45*u;
   let px=x+dx*(.5+u*aim.length)+nx*spread,pz=z+dz*(.5+u*aim.length)+nz*spread;
   const dist=Math.hypot(px-castleX,pz-castleZ);
   if(dist<4.55){const k=4.55/Math.max(.1,dist);px=castleX+(px-castleX)*k;pz=castleZ+(pz-castleZ)*k;}
   put("crystal",px,ground+1.4+u*.8,pz,0x2f8fff,16+u*12,.92);
  }
  const [ix,iz]=aim.impact;
  for(let i=0;i<12;i++){const th=aim.heading+(i-5.5)*.14;
   let px=ix+Math.sin(th)*(.3+(i%3)*.12),pz=iz+Math.cos(th)*(.3+(i%3)*.12);
   const dist=Math.hypot(px,pz+.55);if(dist<4.8){const k=4.8/Math.max(.1,dist);px*=k;pz=-.55+(pz+.55)*k;}
   put("crystal",px,ground+.2+(i%4)*.45,pz,0x2f8fff,22,.9);
  }
  put("glow",x+dx*.5,ground+1.7,z+dz*.5,0x5ab4ff,30,.4);break}
 case "music_dance":{
  for(let i=0;i<12;i++){const u=(i%6)/6,side=i<6?-1:1;
   put("note",x+side*(1.8+.3*Math.sin(u*TAU)),ground+2.0+u*1.8,z+side*.8,i<6?0x7b4dff:0xff4fa3,26,.95,1+.25*Math.abs(Math.sin(t*TAU/.625)))}break}
 }
}
