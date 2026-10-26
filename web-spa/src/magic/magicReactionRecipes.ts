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
 cat_fish_chase:{kind:"bubble",color:0xa8e9ff,ring:0xa8e9ff,radius:1.7},dragon_fireworks:{kind:"star",color:0xffd27a,ring:0xffd27a,radius:1.8},
 forge_sparks:{kind:"sparkle",color:0xff8a3d,ring:0xff8a3d,radius:1.3},steam_rainbow:{kind:"glow",color:0xf3f4fa,ring:0xbfe9ff,radius:1.9},
 flower_ring:{kind:"flower",color:0xff9fc7,ring:0xa8e9ff,radius:1.8},frost_carpet:{kind:"crystal",color:0xbfe9ff,ring:0xbfe9ff,radius:1.9},
 golden_pollen:{kind:"glow",color:0xffd25e,ring:0xffd25e,radius:1.6},petal_swirl:{kind:"petal",color:0xff9fc7,ring:0xa6f0d6,radius:1.8},
 ember_whirl:{kind:"flame",color:0xff8a3d,ring:0xff8a3d,radius:1.6},snow_fairy:{kind:"snow",color:0xe9f9ff,ring:0xbfe9ff,radius:1.8},
 ripple_splash:{kind:"drop",color:0x6ec8ff,ring:0x6ec8ff,radius:2},star_lake:{kind:"star",color:0xfff1a8,ring:0x2a3f8f,radius:1.8},
 heart_bouquet:{kind:"heart",color:0xff8fb8,ring:0xff8fb8,radius:1.6},meteor_shower:{kind:"star",color:0xffd27a,ring:0xffd27a,radius:1.8},
 dragon_frost:{kind:"crystal",color:0xbfe9ff,ring:0xbfe9ff,radius:1.5},music_dance:{kind:"note",color:0xc9a8ff,ring:0xc9a8ff,radius:1.5}
};
export function makeReactionPool(kinds:readonly MagicParticleKind[]):ReactionPool{
 const points={} as Record<MagicParticleKind,MagicParticle[]>,counts={} as Record<MagicParticleKind,number>;
 for(const k of kinds){points[k]=Array.from({length:64},()=>({x:0,y:0,z:0,size:1,alpha:0,color:0,minPx:3}));counts[k]=0}
 return {points,counts};
}
export function resetReactionPool(pool:ReactionPool){for(const k in pool.counts)pool.counts[k as MagicParticleKind]=0}
export function renderMagicReaction(id:MagicReactionId,t:number,x:number,z:number,ground:number,pool:ReactionPool,animated=true,heading=0){
 const f=fade(t),u=Math.max(0,t-1.4),b=ease(u/1.8),v=REACTION_VISUALS[id];
 const put=(k:MagicParticleKind,px:number,py:number,pz:number,c:number,minPx:number,a=1,size=1)=>{
  const index=pool.counts[k];if(index>=64)return;
  const p=pool.points[k][index];p.x=px;p.y=py;p.z=pz;p.color=c;p.minPx=minPx;p.alpha=cap(a)*f;p.size=size;pool.counts[k]=index+1;
 };
 const ring=(k:MagicParticleKind,i:number,n:number,r:number,h:number,c:number,minPx:number,a=1,s=1)=>{
  const theta=angle(i,n);put(k,x+Math.cos(theta)*r,ground+h,z+Math.sin(theta)*r,c,minPx,a,s)
 };
 if(!animated){for(let i=0;i<8;i++)ring(v.kind,i,8,1,1.2,v.color,14,.7,1.3);return}
 switch(id){
 case "cat_fish_chase":{
  for(let i=0;i<30;i++){const age=t-1.1-i*.07;if(age<0||age>.7)continue;const a=(t-1)*TAU*2/2.8-i*.16;
   put("bubble",x+Math.cos(a)*1.3,ground+1+.5*age,z+Math.sin(a)*1.3,0xa8e9ff,12,(1-age/.7)*.95,1.2)}
  for(let i=0;i<2;i++){const a=(t-1)*TAU*2/2.8+i*.35;put("glow",x+Math.cos(a)*1.3,ground+.15,z+Math.sin(a)*1.3,0xffe6ae,16,.5)}break}
 case "dragon_fireworks":{
  for(let shot=0;shot<3;shot++){const age=t-1.4-shot*.45;if(age<0||age>1.85)continue;const col=[0xffd27a,0xff9fc7,0xc9a8ff][shot],sx=x+(shot-1)*.75;
   if(age<.45){put("glow",sx,ground+1.6+age*12.5,z,col,14,.85);for(let j=1;j<5;j++)put("sparkle",sx,ground+1.6+Math.max(0,age-j*.04)*12.5,z,col,7,(1-j/5)*.7)}
   else{const a=age-.45,rad=2.4*a*Math.exp(-a*.23);for(let i=0;i<24;i++){const [dx,dy,dz]=fib(i,24),xx=sx+dx*rad,yy=ground+7+dy*rad-1.1*a*a,zz=z+dz*rad;
    put("star",xx,yy,zz,col,12,.9*(1-a/1.45));for(let j=1;j<=2;j++)put("sparkle",xx-dx*j*.12,yy-dy*j*.12,zz-dz*j*.12,col,j===1?7:5,(1-a/1.45)*(1-j/3))}}}break}
 case "forge_sparks":{
  if(t>=1&&t<3.4)put("glow",x,ground+1.25,z+.6,t<1.4?0xfff6e0:0xff8a3d,22,.9,1+Math.sin(t*TAU*2)*.12);
  for(let i=0;i<30;i++){const a=u-i*.022;if(a<0||a>1.3)continue;const phi=(-50+i*100/29)*PI/180,spd=2.3+(i%5)*.22,xx=x+Math.sin(phi)*spd*a,yy=ground+.9+Math.cos(phi)*spd*a-3*a*a,zz=z+.5+a*.6;
   put("sparkle",xx,Math.max(ground+.15,yy),zz,0xff8a3d,7,.9*(1-a/1.3));put("sparkle",xx-Math.sin(phi)*.12,Math.max(ground+.15,yy+.1),zz-.08,0xffd27a,6,.55*(1-a/1.3))}break}
 case "steam_rainbow":{
  for(let i=0;i<12;i++){const age=cap((t-1.1-i*.09)/2);if(!age)continue;ring("glow",i,12,.35+age*.55,.7+age*3,0xf3f4fa,18+age*18,.55*(1-age),1+age)}
  for(let i=0;i<20;i++)ring("sparkle",i,20,.6+b*.8,.6+b*1.4,i%2?0xffa66d:0x8fd3ff,7,(1-b)*.85);break}
 case "flower_ring":{
  for(let i=0;i<16;i++){const age=cap((t-1.4-i*.05)/.28);if(age){ring("flower",i,16,1.4,.16,i%4?0xff9fc7:0xffd1e3,14,age,1.15*age);ring("sparkle",i,16,1.4,.19,0xffe58a,6,age)}}
  for(let i=0;i<6;i++){const age=cap((t-1-i*.08)/.75);if(age>0&&age<1){ring("drop",i,6,.65+age*.75,1.3+Math.sin(age*PI),0x6ec8ff,12,1-age);for(let j=0;j<3;j++)if(age>.85)ring("drop",i*3+j,18,1.4,.18,0x6ec8ff,6,(age-.85)*4)}}break}
 case "frost_carpet":{
  put("crystal",x,ground+.7,z,0xbfe9ff,26,b,Math.min(1.2,b*1.4));
  for(let i=0;i<24;i++){const rad=Math.sqrt((i+.5)/24)*1.9,age=cap((t-1.4-rad*.12)/.25);if(age)ring("crystal",i,24,rad,.15+(i%3)*.05,0xbfe9ff,14,age,Math.min(1.2,age*1.45))}
  for(let i=0;i<14;i++)ring("snow",i,14,.65+i%4*.27,2.5-(t* .3+i*.17)%1.4,0xe9f9ff,8,.5);break}
 case "golden_pollen":{
  for(let i=0;i<28;i++){const age=cap((t-1.4-i*.028)/2);if(!age)continue;const a=angle(i,28)+age*TAU*1.2;put("glow",x+Math.cos(a)*(1.1-.6*age),ground+.25+3.2*age,z+Math.sin(a)*(1.1-.6*age),0xffd25e,9,.5+.5*Math.abs(Math.sin(t*TAU*3+i)))}
  for(let i=0;i<6;i++)ring("petal",i,6,1.2,2.7-(t+i*.14)*.3,0xff9fc7,14,.8,1.5);break}
 case "petal_swirl":{
  for(let i=0;i<24;i++){const age=cap((t-1.4-i*.023)/1.7);if(!age)continue;const a=angle(i,24)+age*TAU*1.4;put("petal",x+Math.cos(a)*(1.2-.6*age),ground+.2+3*age,z+Math.sin(a)*(1.2-.6*age),0xff9fc7,13,.95,1.6)}
  for(let i=0;i<18;i++){const age=cap((t-1.4-i*.04)/1.8),a=angle(i,18)+age*TAU;ring("glow",i,18,1.25-age*.45,.3+age*3,0xa6f0d6,8,.45*(1-age))}break}
 case "ember_whirl":{
  if(t>=1&&t<3.5)put("glow",x,ground+.5,z,0xff8a3d,22,.8);
  for(let i=0;i<26;i++){const age=cap((t-1.4-i*.03)/1.9);if(!age)continue;const a=angle(i,26)+age*TAU*1.8;put("flame",x+Math.cos(a)*(1.2-.8*age),ground+.2+3.4*age,z+Math.sin(a)*(1.2-.8*age),age>.5?0xffd27a:0xff8a3d,11-5*age,.9*(1-age*.5))}break}
 case "snow_fairy":{
  for(let s=0;s<2;s++){const a=(t-1.4)*TAU/1.6+s*PI;if(t<1.4)continue;const xx=x+Math.sin(a)*1.8,zz=z+Math.sin(2*a)*.85;
   put("snow",xx,ground+1.5+.3*Math.cos(a),zz,0xe9f9ff,16,.9);for(let j=1;j<=6;j++){const p=a-j*.16;put("glow",x+Math.sin(p)*1.8,ground+1.5+.3*Math.cos(p),z+Math.sin(2*p)*.85,0xbfe9ff,12-j*1.3,.5*(1-j/7))}}
  for(let i=0;i<12;i++)ring("sparkle",i,12,1.4,1.2+(i%4)*.3,0xe9f9ff,6,.65);break}
 case "ripple_splash":{
  for(let i=0;i<16;i++){const age=u-i*.04;if(age<0||age>1.1)continue;ring("drop",i,16,Math.min(1.8,age*2),.25+2*age-2.8*age*age,0x6ec8ff,11,1-age/1.1,1.3)}break}
 case "star_lake":{
  for(let i=0;i<20;i++){const pulse=.5+.5*Math.abs(Math.sin(t*(2+i%3)+i*1.73));ring("star",i,20,.25+(i%5)*.28,.18+(i%4)*.04,0xfff1a8,9+(i%3)*3,pulse)}
  for(let i=0;i<6;i++)ring("glow",i,6,.9,.6+2*b,0x6ec8ff,9,.45);break}
 case "heart_bouquet":{
  for(let i=0;i<8;i++){const age=cap((t-1.4-i*.06)/.3);if(age)ring("flower",i,8,1.2,.2,0xffd1e3,13,age,age*1.2)}
  for(let i=0;i<10;i++){const age=cap((t-1.4-i*.1)/1.9);if(!age)continue;put("heart",x+Math.sin(age*5+i)*.25,ground+.4+2.8*age,z+Math.cos(i)*.4,0xff8fb8,18,.95*(1-age*.25),2)}break}
 case "meteor_shower":{
  for(let i=0;i<8;i++){const age=(t-1.4-i*.25)/.6;if(age<0||age>1)continue;const tx=x+Math.cos(i*2.4)*2,tz=z+Math.sin(i*2.4)*2;
   put("star",tx-2.1*(1-age),ground+.25+6*(1-age),tz-1.4*(1-age),0xffd27a,14,.95);for(let j=1;j<=5;j++)put("glow",tx-2.1*(1-age)-j*.12,ground+.25+6*(1-age)+j*.22,tz-1.4*(1-age),0xffd27a,11-j*1.4,.75*(1-j/6));
   if(age>.8)for(let j=0;j<4;j++)ring("sparkle",i*4+j,32,.3,.3+(age-.8)*2,0xfff1a8,7,.8)}break}
 case "dragon_frost":{
  if(t<1.4||t>3.1)break;
  const dx=Math.sin(heading),dz=Math.cos(heading);for(let i=0;i<48;i++){const age=cap((t-1.4-i*.017)/1.55);if(!age)continue;const a=angle(i,48),spread=Math.tan(25*PI/180)*4*age*((i%6+1)/6);
   put("crystal",x+dx*4*age+Math.cos(a)*spread,ground+1.9+Math.sin(a)*spread,z+dz*4*age+Math.sin(a)*spread,0xbfe9ff,10+8*age,.9-.5*age,1.1)}break}
 case "music_dance":{
  for(let i=0;i<18;i++){const age=cap((t-1.4-i*.075)/1.8);if(!age)continue;put("note",x+(i%2?-.85:.85)+Math.sin(age*TAU*2+i)*.4,ground+1+3*age,z+Math.cos(i)*.65,i%2?0xc9a8ff:0xffd6f5,16,.95*(1-age*.2),1.6)}break}
 }
}
