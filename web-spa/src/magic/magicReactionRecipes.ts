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
export function renderMagicReaction(id:MagicReactionId,t:number,x:number,z:number,ground:number,pool:ReactionPool,animated=true,heading=0){
 if(!animated){renderMagicReaction(id,2.4,x,z,ground,pool,true,heading);for(const k in pool.counts){
  const kind=k as MagicParticleKind;for(let i=0;i<pool.counts[kind];i++)pool.points[kind][i].alpha=.85;
 }return}
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
  for(let i=0;i<14;i++){const th=q*TAU*2-i*.25;
   put("bubble",x+Math.cos(th)*2.3,ground+2.05+(i%3)*.22,z+Math.sin(th)*2.3,0x3aa0ff,16,(1-i/15)*.95);
  }for(let i=0;i<2;i++)dot("glow",i,2,2.3,.25,0xffb347,16,.45);break}
 case "dragon_fireworks":{
  for(let shot=0;shot<3;shot++){const start=1.4+shot*.6,dt=t-start;
   if(dt<-.12||dt>1.3)continue;
   const col=[0xff6b6b,0xffd23f,0x7b61ff][shot],r=Math.min(1.4,Math.max(0,dt)*2.0);
   for(let i=0;i<14;i++){const [dx,dy,dz]=fib(i,14);put("star",x+(shot-1)*1.4+dx*r,ground+3.7+dy*r,z+dz*r,col,18,.9*Math.max(0,1-dt/1.4));}
   if(dt<.22)put("glow",x+(shot-1)*1.4,ground+3.7,z,col,40,.4);
  }break}
 case "forge_sparks":{
  const beat=Math.max(0,Math.floor((t-1.4)/.5));put("glow",x,ground+1.5,z+.6,0xff7a1a,30,.42);
  for(let i=0;i<10;i++){const dt=(t-1.4-beat*.5),a=(-.9+i*.2);const speed=2.1+(i%3)*.4;
   put("sparkle",x+Math.sin(a)*speed*dt,ground+.9+Math.max(0,speed*dt-4.5*dt*dt),z+.7+Math.cos(a)*speed*dt,0xffb000,11,.85);
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
   put("sparkle",x+Math.cos(th)*(2-u*1.4),ground+.6+u*2.7,z+Math.sin(th)*(2-u*1.4),0xffc21a,10,.9)}
  put("flower",x,ground+3.2,z,0xffa04b,26,.85);break}
 case "petal_swirl":{
  for(let i=0;i<18;i++){const arm=i%2,u=Math.floor(i/2)/9,th=arm*PI+u*TAU*1.5+q*TAU*.45;
   put("petal",x+Math.cos(th)*(2.2-u*1.4),ground+.6+u*2.8,z+Math.sin(th)*(2.2-u*1.4),0xff72ac,20,.95)}
  for(let i=0;i<6;i++)dot("leaf",i,6,2.5,1.8,0x3fcf8e,10,.55);break}
 case "ember_whirl":{
  for(let i=0;i<24;i++){const arm=i%2,u=Math.floor(i/2)/12,th=arm*PI+u*TAU*2+q*TAU*.5;
   put("flame",x+Math.cos(th)*(2-u*1.3),ground+.45+u*3.2,z+Math.sin(th)*(2-u*1.3),u>.5?0xffc21a:0xff5a1f,18-u*8,.91)}
  put("glow",x,ground+.3,z,0xff5a1f,24,.38);break}
 case "snow_fairy":{
  for(let n=0;n<2;n++)for(let j=0;j<8;j++){const th=q*TAU*2+n*PI-j*.18;
   put(j===0?"snow":"glow",x+Math.sin(th)*2.2,ground+2.2+.2*Math.cos(th),z+Math.sin(2*th)*.8,0x5ab4ff,j===0?26:Math.max(6,18-j*2),j===0?.95:.65-j*.06);
  }break}
 case "ripple_splash":{
  for(let i=0;i<10;i++){const th=angle(i,10),u=.5+.5*Math.sin(q*PI+i*.28);
   put("drop",x+Math.cos(th)*(1.1+u),ground+.6+u*1.6,z+Math.sin(th)*(1.1+u),0x2f8fff,18,.94)}break}
 case "star_lake":{
  for(let i=0;i<12;i++){const th=angle(i,12),r=.6+(i%3)*.62;
   put("star",x+Math.cos(th)*r,ground+.16,z+Math.sin(th)*r,0xffd23f,18,.91)}break}
 case "heart_bouquet":{
  for(let i=0;i<7;i++){const u=(i-3)/3;
   put("heart",x+Math.sin(u*PI/3)*1.55,ground+2.25+Math.cos(u*PI/3)*1.4+q*.22,z+.2+Math.cos(u*PI/3)*.5,0xff4f8b,26,.95)}
  for(let i=0;i<8;i++)dot("flower",i,8,2.2,.2,0xff72a9,15,.9);break}
 case "meteor_shower":{
  for(let i=0;i<6;i++){const dt=t-1.4-i*.35;if(dt<0||dt>.8)continue;
   const u=Math.min(1,dt/.6),xx=x-2.7+i*.95+u*1.2,yy=ground+4-u*3.8,zz=z+(i%3-1)*.9;
   put("star",xx,yy,zz,0xffd23f,22,.92);
   for(let j=1;j<=5;j++)put("glow",xx-j*.19,yy+j*.26,zz,0xffd23f,Math.max(6,14-j*2),.6-j*.08);
  }break}
 case "dragon_frost":{
  const dx=Math.sin(heading),dz=Math.cos(heading),nx=dz,nz=-dx;
  // The caller supplies the camera-safe outward heading. Keep the particles short of the castle wall.
  for(let i=0;i<28;i++){const u=(i+.5)/28,spread=((i%7)-3)/3*.7*u;
   put("crystal",x+dx*(.5+u*2.1)+nx*spread,ground+1.4+u*.8,z+dz*(.5+u*2.1)+nz*spread,0x2f8fff,16+u*12,.9)}
  put("glow",x+dx*.4,ground+1.7,z+dz*.4,0x5ab4ff,24,.35);break}
 case "music_dance":{
  for(let i=0;i<12;i++){const u=(i%6)/6,side=i<6?-1:1;
   put("note",x+side*(1.4+.3*Math.sin(u*TAU)),ground+2.0+u*1.8,z+side*.8,i<6?0x7b4dff:0xff4fa3,24,.95,1+.25*Math.abs(Math.sin(t*TAU/.625)))}break}
 }
}
