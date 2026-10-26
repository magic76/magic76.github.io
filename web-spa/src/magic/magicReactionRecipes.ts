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
 // Individual visual signatures; a few particles begin at 1.0s as the ground ring grows.
 switch(id){
 case "cat_fish_chase":{
  const theta=q*TAU*2;for(let i=0;i<40;i++){
   const lag=i*.052;const th=theta-lag*4.5;const h=.9+(i%4)*.16;
   put("bubble",x+Math.cos(th)*2.3,ground+h,z+Math.sin(th)*2.3,0x3aa0ff,16,1-(i/40)*.7);
  }
  for(let i=0;i<2;i++){const th=theta+i*.35;put("glow",x+Math.cos(th)*2.3,ground+.35,z+Math.sin(th)*2.3,0xffb347,18,.6)}break}
 case "dragon_fireworks":{
  for(let shot=0;shot<3;shot++){const col=[0xff6b6b,0xffd23f,0x7b61ff][shot];
   const local=Math.max(0,a-shot*.42),r=.22+Math.min(1,local)*2.1;
   put("glow",x+(shot-1)*2,ground+3.2,z,col,48,local<.18?.85:.15);
   for(let i=0;i<16;i++){const [dx,dy,dz]=fib(i,16);const px=x+(shot-1)*2+dx*r,py=ground+2.8+dy*r*.6,pz=z+dz*r;
    put("star",px,py,pz,col,22,.95);for(let j=1;j<=3;j++)put("sparkle",px-dx*j*.13,py-dy*j*.13,pz-dz*j*.13,col,14-j*2,.65*(1-j/4));}
  }break}
 case "forge_sparks":{
  put("glow",x,ground+1.5,z+.6,0xff7a1a,34,.95,1+Math.sin(a*TAU/.35)*.12);
  for(let i=0;i<42;i++){const beat=(a+i*.03)%1.2,ang=(-1+2*(i%14)/13)*.95;
   const r=.5+beat*2.5,yy=1.2+beat*2.9-2.3*beat*beat;
   put("sparkle",x+Math.sin(ang)*r,ground+Math.max(.2,yy),z+Math.cos(ang)*r*.55,0xffb000,12,.9);
  }break}
 case "steam_rainbow":{
  for(let i=0;i<12;i++){const theta=angle(i,12),h=.6+(i%6)*.34+q*1.2;
   put("glow",x+Math.cos(theta)*(1.2+(i%3)*.4),ground+h,z+Math.sin(theta)*(1.2+(i%3)*.4),0xd9dde8,26+(i%4)*6,.68)}
  for(let i=0;i<20;i++)dot("sparkle",i,20,2.3,1.1+(i%3)*.36,i%2?0xff8a3d:0x3aa0ff,12,.82);break}
 case "flower_ring":{
  for(let i=0;i<16;i++){const bloom=ease((a-i*.035)/.28);dot("flower",i,16,2.3,.25,0xff72a9,22,.85,); 
   if(bloom>0)dot("sparkle",i,16,2.3,.3,0xffd23f,8,bloom)}
  for(let i=0;i<12;i++){const th=angle(i,12),u=(i%6)/5;
   put("drop",x+Math.cos(th)*(.7+u*2.2),ground+1+Math.sin(u*PI)*1.5,z+Math.sin(th)*(.7+u*2.2),0x3aa0ff,16,.92);
  }break}
 case "frost_carpet":{
  put("crystal",x,ground+1.3,z,0x2f8fff,36,.95);
  for(let i=0;i<24;i++){const spoke=i%6,step=Math.floor(i/6),th=angle(spoke,6),r=.5+step*.42;
   dot("crystal",i,24,2.3,.3+(i%4)*.22,0x5ab4ff,20,.9);
   put("crystal",x+Math.cos(th)*r,ground+.2+step*.08,z+Math.sin(th)*r,0x2f8fff,16,.85);
  }break}
 case "golden_pollen":{
  for(let i=0;i<40;i++){const th=angle(i,40)+q*TAU*1.5,r=2-.95*q-(i%5)*.06;
   put("glow",x+Math.cos(th)*r,ground+.5+2.5*((i%10)/10+q*.3),z+Math.sin(th)*r,0xffc21a,12,.6+.4*Math.abs(Math.sin(t*7+i)))}
  for(let i=0;i<4;i++)dot("petal",i,4,2.4,2.6-i*.38,0xff72ac,14,.7);break}
 case "petal_swirl":{
  for(let i=0;i<24;i++){const u=(i+.5)/24,th=angle(i,24)+q*TAU*1.5,r=2.2-u*1.4;
   put("petal",x+Math.cos(th)*r,ground+.45+u*2.8,z+Math.sin(th)*r,0xff72ac,20,.95)}
  for(let i=0;i<24;i++){const u=(i%8)/8,th=angle(Math.floor(i/8),3)+q*TAU+u*2;
   put("glow",x+Math.cos(th)*(2.2-u*.5),ground+.6+u*2.4,z+Math.sin(th)*(2.2-u*.5),0x3fcf8e,12-u*6,.45*(1-u))}break}
 case "ember_whirl":{
  put("glow",x,ground+.55,z,0xff5a1f,40,.8);
  for(let i=0;i<32;i++){const u=(i+.5)/32,th=angle(i,32)+q*TAU*2,r=2-u*1.4;
   put("flame",x+Math.cos(th)*r,ground+.3+u*3.2,z+Math.sin(th)*r,u>.5?0xffc21a:0xff5a1f,20-u*10,.95)}break}
 case "snow_fairy":{
  for(let n=0;n<2;n++){const th=q*TAU*2+n*PI;
   for(let j=0;j<9;j++){const p=th-j*.22;
    put(j===0?"snow":"glow",x+Math.sin(p)*2.2,ground+1.8+.25*Math.cos(p),z+Math.sin(2*p)*.8,0x5ab4ff,j===0?26:18-j*1.5,.95-j*.085)}
  }for(let i=0;i<16;i++)dot("snow",i,16,2.4,.24+(i%3)*.12,0x5ab4ff,12,.7);break}
 case "ripple_splash":{
  for(let i=0;i<28;i++){const th=angle(i,28),r=.7+1.7*((i%7)/6);
   put("drop",x+Math.cos(th)*r,ground+.4+1.8*Math.abs(Math.sin(q*PI+i*.3)),z+Math.sin(th)*r,0x2f8fff,18,.9)}
  for(let i=0;i<16;i++)dot("drop",i,16,2.5,.2+(i%3)*.3,0x3aa0ff,12,.75);break}
 case "star_lake":{
  for(let i=0;i<20;i++){const th=angle(i,20),r=.4+(i%5)*.52;
   put("star",x+Math.cos(th)*r,ground+.27+(i%3)*.1,z+Math.sin(th)*r,0xffd23f,16+(i%3)*4,.75+.2*Math.sin(t*4+i));
   put("glow",x+Math.cos(th)*r,ground+.12,z+Math.sin(th)*r,0x345bc8,12,.42);
  }for(let i=0;i<6;i++)dot("glow",i,6,2.6,1+q*2,0x3aa0ff,14,.8);break}
 case "heart_bouquet":{
  for(let i=0;i<8;i++)dot("flower",i,8,2.3,.26,0xff72a9,16,.83);
  for(let i=0;i<10;i++){const u=(i%5)/4,xx=(i<5?-1:1)*(1.1+u*1.3);
   put("heart",x+xx,ground+.7+u*2+q*.35,z+Math.sin(i)*.3,0xff4f8b,26,.95)}break}
 case "meteor_shower":{
  for(let i=0;i<8;i++){const th=angle(i,8),r=1.5+(i%3)*.5,progress=(a+i*.08)%1.4/1.4;
   const tx=x+Math.cos(th)*r,zz=z+Math.sin(th)*r;
   for(let j=0;j<7;j++){const u=cap(progress-j*.075);
    put(j===0?"star":"glow",tx-1.4*(1-u),ground+.3+3.3*(1-u),zz-.8*(1-u),0xffd23f,j===0?22:16-j*1.6,.95-j*.09);
   }
  }for(let i=0;i<12;i++)dot("sparkle",i,12,2.4,.4+(i%3)*.3,0xffc21a,10,.8);break}
 case "dragon_frost":{
  const dx=Math.sin(heading),dz=Math.cos(heading),nx=dz,nz=-dx;
  for(let i=0;i<40;i++){const u=(i+.5)/40,spread=(i%9-4)/4*1.7*u;
   put("crystal",x+dx*(.5+u*2.7)+nx*spread,ground+1.5+Math.sin(i*3)*.35+u*.5,z+dz*(.5+u*2.7)+nz*spread,0x2f8fff,16+u*14,.9)}
  for(let i=0;i<20;i++){const th=angle(i,20),u=.25+(i%8)/8*.7;
   put("glow",x+dx*(.5+u*2.6)+nx*Math.cos(th)*1.5,ground+1.4+Math.sin(th)*1.1,z+dz*(.5+u*2.6)+nz*Math.cos(th)*1.5,0x5ab4ff,28,.6)}break}
 case "music_dance":{
  for(let i=0;i<18;i++){const u=(i%9)/8,side=i<9?-1:1;
   put("note",x+side*(1.2+.5*Math.sin(u*TAU)),ground+.7+u*2.6,z+Math.sin(i*2)*1.35,i<9?0x7b4dff:0xff4fa3,24,.95,1+.25*Math.abs(Math.sin(t*TAU/.625)))}break}
 }
 // Every recipe has its own primary glyph and saturated ring; no generic shared glow core.
 // A sparse outer signature makes the act legible from the 50–60-unit overview camera.
 for(let i=0;i<12;i++)dot(vis.kind,i,12,2.65,1.15+(i%4)*.53,vis.color,22,.68*phase);
}
