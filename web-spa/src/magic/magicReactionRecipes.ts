import type {MagicParticle,MagicParticleKind} from "./MagicParticleLayers3D";
import type {MagicReactionId} from "./magicReactions";
export type ReactionPool=Record<MagicParticleKind,MagicParticle[]>;
const TAU=Math.PI*2;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{const v=clamp(x);return v*v*(3-2*v)};
const fade=(t:number)=>clamp(t/.12)*clamp((4.4-t)/1);
const put=(pool:ReactionPool,k:MagicParticleKind,x:number,y:number,z:number,color:number,minPx:number,a=1,size=1)=>{
 const arr=pool[k];if(arr.length>=64)return;
 const p=arr[arr.length]??{x:0,y:0,z:0};p.x=x;p.y=y;p.z=z;p.color=color;p.minPx=minPx;p.alpha=clamp(a);p.size=size;arr.push(p);
};
export function renderMagicReaction(id:MagicReactionId,t:number,x:number,z:number,ground:number,pool:ReactionPool,animated=true){
 const f=fade(t),u=Math.max(0,t-1.4),rise=smooth(u/1.6),orbit=(i:number,n:number)=>TAU*i/n;
 const P=(k:MagicParticleKind,i:number,n:number,r:number,h:number,col:number,px:number,a=1,s=1)=>put(pool,k,x+Math.cos(orbit(i,n))*r,ground+h,z+Math.sin(orbit(i,n))*r,col,px,f*a,s);
 if(!animated){const kind:MagicParticleKind=id.includes("flower")?"flower":id.includes("frost")?"crystal":id.includes("music")?"note":id.includes("heart")?"heart":id.includes("water")?"drop":"star";
  for(let i=0;i<8;i++)P(kind,i,8,.8,.8,0xffe0ab,11,.6);return;
 }
 // Every recipe has a clearly visible anticipation core, primary action and ground accent.
 if(t>=1&&t<3.5)put(pool,"glow",x,ground+.85+rise*.3,z,0xffe8c9,15,Math.min(.7,(t-1)*3)*f,1.3);
 switch(id){
 case "cat_fish_chase":
  for(let i=0;i<14;i++){const age=t-1.1-i*.085;if(age<0||age>2.8)continue;const a=age*TAU*2/2.8;
   put(pool,"bubble",x+Math.cos(a)*1.3,ground+.5+age*.12,z+Math.sin(a)*1.3,0xa8e9ff,7,(1-age/3)*f,1.2);
   if(i%2===0)put(pool,"glow",x+Math.cos(a+.4)*1.1,ground+.12,z+Math.sin(a+.4)*1.1,0xffe6ae,9,.45*f)}break;
 case "dragon_fireworks":for(let shot=0;shot<3;shot++){const age=t-1.4-shot*.45;if(age<0)continue;const col=[0xffd27a,0xff9fc7,0xc9a8ff][shot],sx=x+(shot-1)*.7;
  if(age<.45){put(pool,"glow",sx,ground+1.5+age*12,z,col,12,f);for(let j=0;j<4;j++)put(pool,"sparkle",sx,ground+1.5+Math.max(0,age-j*.045)*12,z,col,5,(1-j/4)*f)}
  else if(age<1.6){const b=age-.45;for(let i=0;i<24;i++){const a=orbit(i,24),v=(i%7)/7*2-1;const rad=b*2.2*Math.exp(-b*.2);
   put(pool,"star",sx+Math.cos(a)*rad,ground+6.9+v*rad-1.25*b*b,z+Math.sin(a)*rad,col,7,(1-b/1.25)*f)}}}break;
 case "forge_sparks":for(let i=0;i<30;i++){const b=u-i*.018;if(b<0||b>1.2)continue;const a=(-50+i*100/29)*Math.PI/180,vel=2+(i%5)*.25;
  put(pool,"sparkle",x+Math.sin(a)*vel*b,ground+.9+Math.cos(a)*vel*b-3*b*b,z+.4+b*.8, i%4?0xff8a3d:0xfff6e0,5,(1-b/1.2)*f)}break;
 case "steam_rainbow":for(let i=0;i<10;i++){const b=clamp((t-1.1-i*.09)/2.2);if(b===0)continue;P("glow",i,10,.35+b*.3, .5+2.5*b,0xececf4,9,.55*(1-b),1+b*1.2)}
  for(let i=0;i<16;i++)P("sparkle",i,16,.5+rise*1.1,.5+rise*.8,i%2?0xffa66d:0x8fd3ff,5,1-rise);break;
 case "flower_ring":for(let i=0;i<16;i++){const b=clamp((t-1.4-i*.05)/.25);if(b)P("flower",i,16,1.4,.14, i%4?0xff9fc7:0xffe58a,10,b*1.15,1.6*b)}
  for(let i=0;i<6;i++){const b=clamp((t-1-i*.07)/.5);if(b<1)P("drop",i,6,.6+b*.7,1+Math.sin(b*Math.PI),0x6ec8ff,7,1-b)}break;
 case "frost_carpet":for(let i=0;i<20;i++){const rad=Math.sqrt((i+.5)/20)*1.8,b=clamp((t-1.4-rad*.3)/.25);if(b)P("crystal",i,20,rad,.15,0xbfe9ff,9,b,1.4*b)}
  for(let i=0;i<12;i++)P("snow",i,12,.7+(i%4)*.3,2.5-(t%3)*.3,0xe4f6ff,5,.55);break;
 case "golden_pollen":for(let i=0;i<28;i++){const b=clamp((t-1.4-i*.035)/2);if(b)P("sparkle",i,28,.8,3*b,0xffd25e,5,(.5+.5*Math.sin(t*TAU*3+i))*f)}
  for(let i=0;i<6;i++)P("petal",i,6,.9,2.5-t*.3,0xffb3d4,10,.8,1.5);break;
 case "petal_swirl":for(let i=0;i<24;i++){const b=clamp((t-1.4-i*.03)/2);if(!b)continue;const a=orbit(i,24)+b*TAU*1.4;
  put(pool,"petal",x+Math.cos(a)*(1.2-.6*b),ground+.2+3*b,z+Math.sin(a)*(1.2-.6*b),0xff9fc7,10,(1-b*.4)*f,1.5)}
  for(let i=0;i<6;i++)P("glow",i,6,.9,1+rise*1.5,0xd8fff1,8,.35);break;
 case "ember_whirl":for(let i=0;i<26;i++){const b=clamp((t-1.4-i*.035)/2);if(!b)continue;const a=orbit(i,26)+b*TAU*1.7;
  put(pool,"flame",x+Math.cos(a)*(1-.6*b),ground+3.2*b,z+Math.sin(a)*(1-.6*b),b>.5?0xffd27a:0xff8a3d,6-b*3,(1-b*.5)*f)}break;
 case "snow_fairy":for(let i=0;i<16;i++){const b=clamp((t-1.4-i*.055)/2);if(!b)continue;const a=b*TAU;
  put(pool,"snow",x+Math.sin(a)*1.7,ground+1+.5*Math.sin(a*2),z+Math.sin(2*a)*.65,0xbfe9ff,7,(1-b*.25)*f)}
  for(let i=0;i<12;i++)P("sparkle",i,12,1.4,1.2,0xe9f9ff,4,.5);break;
 case "ripple_splash":for(let i=0;i<16;i++){const b=u-i*.045;if(b<0||b>1)continue;P("drop",i,16,Math.min(1.8,b*2),.25+2*b-3*b*b,0x6ec8ff,7,1-b,1.3)}break;
 case "star_lake":for(let i=0;i<20;i++){const b=Math.sin(t*4+i*1.73);P("star",i,20,.2+(i%5)*.25,.2+.08*b,0xfff1a8,6+(i%3)*2,.35+.45*Math.abs(b))}
  for(let i=0;i<6;i++)P("glow",i,6,.8,1.2+rise,0x6ec8ff,6,.4);break;
 case "heart_bouquet":for(let i=0;i<8;i++){const b=clamp((t-1.4-i*.07)/.28);if(b)P("flower",i,8,1,.14,0xffd1e3,10,b,1.2*b)}
  for(let i=0;i<10;i++){const b=clamp((t-1.4-i*.12)/2);if(!b)continue;put(pool,"heart",x+Math.sin(b*4+i)*.2,ground+.2+2.5*b,z+Math.cos(i)*.3,0xff8fb8,12,(1-b*.3)*f,2)}break;
 case "meteor_shower":for(let i=0;i<8;i++){const b=(t-1.4-i*.25)/.6;if(b<0||b>1)continue;const tx=x+Math.cos(i*2.4)*2,tz=z+Math.sin(i*2.4)*2;
  put(pool,"star",tx-3*(1-b),ground+.4+8*(1-b),tz-1.7*(1-b),0xfff1a8,10,f);
  for(let j=1;j<=5;j++)put(pool,"glow",tx-3*(1-b)-j*.14,ground+.4+8*(1-b)+j*.3,tz-1.7*(1-b),0xffd27a,4,f*(1-j/6))}break;
 case "dragon_frost":for(let i=0;i<40;i++){const b=clamp((t-1.4-i*.023)/1.6);if(!b)continue;const a=orbit(i,40),rad=Math.tan(Math.PI*25/180)*4*b*((i%5)/5);
  put(pool,i%3?"crystal":"glow",x+Math.cos(a)*rad,ground+1.4+Math.sin(a)*rad,z-4*b,0xbfe9ff,9,(1-b*.5)*f,1.3)}break;
 case "music_dance":for(let i=0;i<16;i++){const b=clamp((t-1.4-i*.09)/2);if(!b)continue;
  put(pool,"note",x+(i%2?-.7:.7)+Math.sin(b*TAU+i)*.4,ground+1+2*b,z+Math.cos(i)*.4,i%2?0xc9a8ff:0xffd6f5,10,(1-b*.4)*f,1.6)}break;
 }
}
