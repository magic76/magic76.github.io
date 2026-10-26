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
 cat_fish_chase:{kind:"bubble",color:0xa8e9ff,ring:0x3aa0ff,radius:2.4},
 dragon_fireworks:{kind:"burst",color:0xff6b6b,ring:0xff6b6b,radius:2.4},
 forge_sparks:{kind:"spark",color:0xffb000,ring:0xff7a1a,radius:2.3},
 steam_rainbow:{kind:"glow",color:0xd9dde8,ring:0x749bd8,radius:2.4},
 flower_ring:{kind:"flower",color:0xff72a9,ring:0x3aa0ff,radius:2.5},
 frost_carpet:{kind:"crystal",color:0x5ab4ff,ring:0x2f8fff,radius:2.5},
 golden_pollen:{kind:"glow",color:0xffc21a,ring:0xe5a600,radius:2.3},
 petal_swirl:{kind:"petal",color:0xff72ac,ring:0x3fcf8e,radius:2.5},
 ember_whirl:{kind:"ember",color:0xff5a1f,ring:0xff5a1f,radius:2.4},
 snow_fairy:{kind:"snow",color:0x5ab4ff,ring:0x2f8fff,radius:2.5},
 ripple_splash:{kind:"drop",color:0x2f8fff,ring:0x2f8fff,radius:2.6},
 star_lake:{kind:"star",color:0xffd23f,ring:0x345bc8,radius:2.5},
 heart_bouquet:{kind:"heart",color:0xff4f8b,ring:0xff4f8b,radius:2.5},
 meteor_shower:{kind:"burst",color:0xffd23f,ring:0xd69b2e,radius:2.4},
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
// The dragon can stand behind the castle. Keep its facing vector outside the
// collision cylinder, but draw the breath along the camera-visible castle rim.
// The same view direction is used by the static/reduced-motion renderer.
export function dragonFrostLayout(dragonX:number,dragonZ:number,camX:number,camZ:number){
 const cx=0,cz=-.55,rad=4.5,ox=dragonX-cx,oz=dragonZ-cz;
 const camAngle=Math.atan2(camZ-cz,camX-cx);
 const dragonAngle=Math.atan2(oz,ox);
 const delta=Math.atan2(Math.sin(dragonAngle-camAngle),Math.cos(dragonAngle-camAngle));
 const side=Math.max(-1.02,Math.min(1.02,delta));
 // An outward tangent is safe even for a dragon near the ice wall.
 const target=dragonAngle+(delta>=0?1:-1)*Math.PI/2;
 let heading=Math.PI/2-target;
 const ux=Math.sin(heading),uz=Math.cos(heading);
 const outside=Math.hypot(ox,oz)>=rad+.02;
 if(!outside){heading=Math.PI/2-dragonAngle}
 const length=2.4;
 const impact:[number,number]=[cx+Math.cos(camAngle)*6.05,cz+Math.sin(camAngle)*6.05];
 return {heading,length,impact,cameraAngle:camAngle,arcStart:camAngle+side};
}
export type FrostAim={heading:number;length:number;impact:[number,number];cameraAngle?:number;arcStart?:number};
export function renderMagicReaction(id:MagicReactionId,t:number,x:number,z:number,ground:number,pool:ReactionPool,animated=true,heading:number|FrostAim=0,cameraX=12.5,cameraZ=18.7){
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
  // A pale bubble wake follows each fish; blue filled dots show movement.
  for(let side=0;side<2;side++){
   const head=q*TAU*2+side*PI;
   for(let i=0;i<7;i++){const th=head-i*.15;
    put("bubble",x+Math.cos(th)*2.3,ground+2.1+(i%3)*.14,z+Math.sin(th)*2.3,0xa8e9ff,14-i*.4,.87-i*.06);
   }
   for(let i=0;i<8;i++){const th=head-(i+1)*.10;
    put("trail",x+Math.cos(th)*2.35,ground+1.78+.18*Math.sin(th*2),z+Math.sin(th)*2.35,0x3aa0ff,10-i*5/7,.86-i*.055);
   }
  }break}
 case "dragon_fireworks":{
  // Three independent, colored five-point bursts stay apart at the key 2.4s frame.
  for(let shot=0;shot<3;shot++){
   const col=[0xff6b6b,0xffd23f,0x7b61ff][shot];
   const dt=t-(1.4+shot*.2),age=cap(dt/.62),spread=.47+.60*age;
   for(let i=0;i<14;i++){const [dx,dy,dz]=fib(i,14);
    put("burst",x+(shot-1)*2.35+dx*spread,ground+3.8+dy*spread,z+dz*spread,col,20,.96);
   }
   for(let i=0;i<3;i++)put("trail",x+(shot-1)*2.35,ground+2.1+i*.31,z,col,8-i,.65-i*.12);
  }break}
 case "forge_sparks":{
  // A 360-degree fan, ten evenly spaced azimuths per half-second strike.
  const strike=Math.max(0,Math.min(4,Math.floor((t-1.4)/.5)));
  const age=Math.max(0,t-1.4-strike*.5);
  put("glow",x,ground+1,z+.7,0xff7a1a,30,Math.max(.1,.45-age*.7));
  for(let n=Math.max(0,strike-1);n<=strike;n++){
   const dt=t-1.4-n*.5;if(dt<.05||dt>.72)continue;
   for(let i=0;i<10;i++){
    const az=angle(i,10)+n*.045,elev=(30+(i*17+n*7)%41)*PI/180;
    const speed=2.5+(i%4)*.24;
    const at=(sec:number)=>{
     const d=speed*Math.cos(elev)*sec;
     return [x+Math.cos(az)*d,ground+Math.max(.14,1+speed*Math.sin(elev)*sec-3.8*sec*sec),z+.7+Math.sin(az)*d] as const;
    };
    const [px,py,pz]=at(dt);put("spark",px,py,pz,0xffb000,17,.95);
    for(let j=1;j<=3;j++){const [tx,ty,tz]=at(Math.max(0,dt-j*.036));
     put("trail",tx,ty,tz,0xffae23,9-j, .78-j*.16);
    }
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
   // No particle may enter the creature's r<1, y=0..2.2 body zone.
   const radius=2.15-u*.85,height=.6+u*3;
   put("sparkle",x+Math.cos(th)*radius,ground+height,z+Math.sin(th)*radius,0xffc21a,10,.9);
  }put("flower",x,ground+3.6,z,0xffa04b,26,.85);break}
 case "petal_swirl":{
  for(let i=0;i<14;i++){const arm=i%2,u=Math.floor(i/2)/7,th=arm*PI+u*TAU*1.5+q*TAU*.45;
   const radius=2.30-u*1.4,height=.5+u*3.25;
   put("petal",x+Math.cos(th)*radius,ground+height,z+Math.sin(th)*radius,0xff72ac,20,.95);
  }
  // Three continuous dotted air currents rather than isolated leaf stamps.
  for(let arm=0;arm<3;arm++)for(let j=0;j<6;j++){
   const u=j/5,th=arm*TAU/3+u*.24+q;
   put("trail",x+Math.cos(th)*2.45,ground+1.75+u*.20,z+Math.sin(th)*2.45,0x4fbf6a,10,.83-u*.28);
  }break}
 case "ember_whirl":{
  for(let i=0;i<24;i++){const arm=i%2,u=Math.floor(i/2)/12,th=arm*PI+u*TAU*2+q*TAU*.5;
   const color=u<.333?0xff5a1f:u<.667?0xff8c1a:0xffc21a;
   put("ember",x+Math.cos(th)*(2-u*1.3),ground+.45+u*3.2,z+Math.sin(th)*(2-u*1.3),color,12,.95);
  }break}
 case "snow_fairy":{
  for(let n=0;n<2;n++){
   const head=q*TAU*2+n*PI;
   const hx=x+Math.sin(head)*2.2,hy=ground+2.3+.2*Math.cos(head),hz=z+Math.sin(2*head)*1.1;
   put("glow",hx,hy,hz,0x9fd8ff,38,.45);
   put("snow",hx,hy,hz,0xffffff,28,.96);
   for(let j=0;j<10;j++){const th=head-(j+1)*.07;
    put("trail",x+Math.sin(th)*2.2,ground+2.3+.2*Math.cos(th),z+Math.sin(2*th)*1.1,0x9fd8ff,12-j*7/9,.9-j*.55/9);
   }
  }break}
 case "ripple_splash":{
  // The central jet rises before droplets peel away. Ripples belong to the decal.
  const rise=Math.sin(cap((t-1.4)/2.2)*PI);
  for(let i=0;i<10;i++){
   const u=i/9,peel=cap((t-2.55)/.85)*u;
   const th=angle(i,10)+.25;
   put("drop",x+Math.cos(th)*(.13+peel*1.25),ground+.28+1.6*rise*(1-u*.60)+u*.45,z+Math.sin(th)*(.13+peel*1.25),0x2f8fff,18-i*.4,.94);
  }break}
 case "star_lake":{
  for(let i=0;i<12;i++){const th=angle(i,12),r=.6+(i%3)*.62;
   put("star",x+Math.cos(th)*r,ground+.16,z+Math.sin(th)*r,0xffd23f,18,.91)}break}
 case "heart_bouquet":{
  // Seven separate heads form a fan instead of an overlapping ribbon.
  for(let i=0;i<7;i++){const th=(i-3)*.38;
   put("heart",x+Math.sin(th)*2.45,ground+2.1+Math.cos(th)*1.18+q*.22,z+.22+Math.cos(th)*.55,0xff4f8b,24,.95);
  }
  for(let i=0;i<8;i++)dot("flower",i,8,2.2,.2,0xff72a9,15,.9);break}
 case "meteor_shower":{
  const camLen=Math.hypot(cameraX,cameraZ)||1,cx=cameraX/camLen,cz=cameraZ/camLen;
  for(let i=0;i<6;i++){
   const dt=t-1.4-i*.32;if(dt<0||dt>.78)continue;
   const u=cap(dt/.64),az=angle(i,12)-PI/2;
   const radius=1.5+(i%3)*.43,landX=x+cx*radius+cz*Math.sin(az)*.95,landZ=z+cz*radius-cx*Math.sin(az)*.95;
   const xx=landX-1.1*(1-u),yy=ground+.30+3.7*(1-u),zz=landZ-1.0*(1-u);
   put("burst",xx,yy,zz,0xffe48a,26,.97);
   for(let j=1;j<=8;j++){
    const f=j/8;
    put("trail",xx-j*.095,yy+j*.12,zz-j*.085,j<=3?0xffe48a:0xff9f1a,14-j*9/8,.87-f*.55);
   }
   if(u>.91)for(let j=0;j<8;j++){const th=angle(j,8);put("trail",landX+Math.cos(th)*.8,ground+.16,landZ+Math.sin(th)*.8,0xffe48a,8,.62)}
  }break}
 case "dragon_frost":{
  const aim=typeof heading==="number"?dragonFrostLayout(x,z,cameraX,cameraZ):heading;
  // Camera-facing rim arc: even dragons concealed behind the ice castle produce
  // visible azure breath. All crystals remain outside the r=4.5 cylinder.
  const cameraAngle=aim.cameraAngle??Math.atan2(cameraZ+.55,cameraX);
  const arcStart=aim.arcStart??cameraAngle+.65;
  for(let i=0;i<28;i++){
   const u=(i+.5)/28,th=arcStart+(cameraAngle-arcStart)*u;
   const rad=5.75+.25*Math.sin(u*PI),height=1.35+1.15*u;
   put("crystal",Math.cos(th)*rad,ground+height,-.55+Math.sin(th)*rad,0x2f8fff,16+u*12,.94);
  }
  const [ix,iz]=aim.impact;
  for(let i=0;i<12;i++){
   const th=angle(i,12),rad=.24+(i%3)*.18;
   const px=ix+Math.cos(th)*rad,pz=iz+Math.sin(th)*rad;
   put("crystal",px,ground+.38+(i%4)*.48,pz,0x2f8fff,22,.93);
  }
  put("glow",ix,ground+1.7,iz,0x5ab4ff,30,.4);break}
 case "music_dance":{
  for(let i=0;i<12;i++){const u=(i%6)/5,side=i<6?-1:1;
   put("note",x+side*(2+.40*Math.sin(u*PI)),ground+1.6+u*2.2,z-side*.35,i<6?0x7b4dff:0xff4fa3,22,.95,1+.25*Math.abs(Math.sin(t*TAU/.625)))}break}
 }
}
