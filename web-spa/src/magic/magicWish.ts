// Pure, import-free offline wish interpreter: bounded text and enum-only outputs.
export type WishTraits={aura?:"bubbles"|"fire"|"stars"|"flowers"|"ice"|"music"|"hearts"|"leaves";colors:string[];material?:string;motion?:string;mood?:string;assembly?:string;accessory?:"crown"|"hat"|"halo"|"wings"};
const RULES:readonly [WishTraits["aura"],readonly string[]][]=[
 ["ice",["冰晶","氷の結晶","ice crystal","snowflake","冰","雪","ice","snow","氷"]],
 ["music",["musical","音樂","音楽","music","song","歌"]],
 ["bubbles",["泡泡","bubbles","bubble","泡"]],
 ["fire",["火焰","flame","fire","炎","火"]],
 ["flowers",["花いっぱい","花朵","flowers","flower","花びら","花"]],
 ["stars",["星星","starlight","stars","star","星"]],
 ["hearts",["愛心","heart","ハート"]],
 ["leaves",["森林","forest","leaves","leaf","葉","森"]]
];
export function magicWishTraits(input:string):WishTraits{
 const text=input.slice(0,180).toLowerCase();
 let winner:WishTraits["aura"];let score=-Infinity;
 for(const [aura,words] of RULES)for(const word of words){
  const at=text.indexOf(word);if(at<0)continue;
  const value=word.length*20-at*.16+(word.length>=3?35:0);
  if(value>score){score=value;winner=aura}
 }
 const result:WishTraits={aura:winner,colors:[]};
 if(winner==="bubbles"||winner==="ice"){result.colors=["azure","ivory"];result.material="glass";result.motion="hover";result.assembly="bloom";result.mood="gentle";}
 else if(winner==="fire"){result.colors=["coral","gold"];result.material="glow";result.motion="orbit";result.assembly="spiral";result.mood="brave";}
 else if(winner==="flowers"||winner==="hearts"){result.colors=["rose","mint"];result.material="wood";result.motion="hover";result.mood="gentle";}
 else if(winner==="music"||winner==="stars"){result.colors=["violet","gold"];result.material="glow";result.motion="spin";result.mood="curious";}
 else if(winner==="leaves"){result.colors=["mint","gold"];result.material="wood";result.motion="walk";}
 if(["藍","blue","青","青い"].some(w=>text.includes(w)))result.colors=["azure","mint"];
 if(["紅","red","赤"].some(w=>text.includes(w)))result.colors=["coral","rose"];
 if(["皇冠","國王","crown","king","王冠"].some(w=>text.includes(w)))result.accessory="crown";
 else if(["帽子","hat","帽"].some(w=>text.includes(w)))result.accessory="hat";
 else if(["翅膀","wing","翼"].some(w=>text.includes(w)))result.accessory="wings";
 else if(["月亮","moon","月"].some(w=>text.includes(w)))result.accessory="halo";
 if(["海","ocean","sea"].some(w=>text.includes(w))){result.colors=["azure","mint"];result.motion="hover";}
 return result;
}
export function magicWishKind(text:string):string{
 const s=text.slice(0,180).toLowerCase();
 const kinds:readonly [string,readonly string[]][]=[
  ["dragon",["飛龍","龍","龙","dragon","ドラゴン","竜"]],
  ["fox",["狐狸","狐","fox","きつね"]],
  ["robot",["機器人","机器人","robot","ロボット"]],
  ["cat",["貓","猫","cat","ねこ"]],
  ["jelly",["水母","jellyfish","くらげ","魚","fish"]],
  ["bird",["鳥","bird","とり"]],
  ["rabbit",["兔","rabbit","うさぎ"]],
  ["flower",["守護者","guardian","花園","garden","flower","花"]],
  ["star",["星","star"]],
  ["cloud",["雲","cloud","くも"]],
  ["tower",["城堡","塔","tower","castle"]]
 ];
 for(const [kind,words] of kinds)if(words.some(w=>s.includes(w)))return kind;
 return "generic";
}
function hashWish(text:string){let h=2166136261;for(const ch of text){h=Math.imul(h^ch.charCodeAt(0),16777619)}return h>>>0;}
export function magicWishCreation(text:string,world:{revision:number;creations:readonly unknown[]},lang:"zh"|"en"="zh",retry=0){
 const source=text.slice(0,180).trim();if(!source)return null;
 const seed=(hashWish(source)+world.revision*977+retry*7919)%1000000;
 const t=magicWishTraits(source),kind=magicWishKind(source);
 const colors=t.colors.length?t.colors:["mint","violet","gold"];
 const col=(i:number)=>colors[i%colors.length],mat=t.material??"wood";
 const motion=t.motion??"hover",mood=t.mood??"curious",assembly=t.assembly??"gather";
 const common={label:source.slice(0,34),idea:source.slice(0,60),motion,mood,assembly,
  x:((seed%7)-3)/8,z:(((seed>>4)%7)-3)/8,seed,...(t.aura?{aura:t.aura}:{})};
 if(kind==="dragon"||kind==="fox"||kind==="robot"){
  const v=(salt:number,lo:number,hi:number)=>Number((lo+((seed+salt*317)%23)/22*(hi-lo)).toFixed(2));
  return {...common,blueprint:{kind,style:kind==="robot"?"sleek":kind==="dragon"?"mystic":"sturdy",
   palette:col(0),body:v(1,.85,1.34),head:v(2,.88,1.38),tail:v(3,.9,1.45),wings:v(4,.9,1.45)},
   motion:kind==="dragon"?"hover":motion,assembly:"gather"};
 }
 const parts:Array<Record<string,unknown>>=[];
 const add=(shape:string,x:number,y:number,z:number,size:number,more:Record<string,unknown>={})=>{
  parts.push({shape,material:mat,color:col(parts.length),x,y,z,size,...more})
 };
 const jitter=((seed%9)-4)*.025;
 switch(kind){
  case "cat":
   add("capsule",0,.95,0,.83,{detail:"face"});add("sphere",0,1.85,.22,.65);
   add("cone",-.43,2.42,.25,.29);add("cone",.43,2.42,.25,.29);
   for(const x of [-.45,.45])for(const z of [-.3,.3])add("capsule",x,.33,z,.3,{joint:"hinge"});
   add("leaf",0,.95,-.83,.65,{joint:"tail"});break;
  case "jelly":
   add("sphere",0,1.8,0,1.13,{width:1.5,height:.72,detail:"face"});
   for(let i=0;i<7;i++){const a=i*6.283/7;add("capsule",Math.cos(a)*.7,.75,Math.sin(a)*.7,.5,{height:1.65,joint:"tail"})}break;
  case "bird":
   add("sphere",0,1.15,0,.94,{detail:"face"});add("sphere",0,2,.34,.56);
   add("cone",0,1.92,.91,.28,{material:"wood",color:"gold",yaw:90});
   add("leaf",-.94,1.35,0,.83,{joint:"flap",pivot:"right"});add("leaf",.94,1.35,0,.83,{joint:"flap",pivot:"left"});break;
  case "rabbit":
   add("capsule",0,.9,0,.86,{detail:"face"});add("sphere",0,1.87,.25,.62);
   add("capsule",-.32,2.72,.22,.43,{height:2});add("capsule",.32,2.72,.22,.43,{height:2});
   add("sphere",0,.7,-.75,.32);break;
  case "flower":
   add("cylinder",0,.9,0,.42,{height:2.1});add("sphere",0,2.05,0,.65);
   for(let i=0;i<7;i++){const a=i*6.283/7;add("leaf",Math.cos(a)*.91,2.05+Math.sin(a)*.91,0,.53,{yaw:(i*51)%180})}break;
  case "star":
   add("octahedron",0,1.5,0,1.1);for(let i=0;i<7;i++){const a=i*6.283/7;add("cone",Math.cos(a)*1.14,1.5+Math.sin(a)*1.14,0,.43,{yaw:(i*51)%180})}break;
  case "cloud":
   for(let i=0;i<7;i++){const a=i*2.399;add("sphere",Math.cos(a)*.7,1.3+Math.sin(i*3)*.23,Math.sin(a)*.36,.74,{width:1.3})}break;
  case "tower":
   add("cylinder",0,.8,0,.9,{height:2.1});add("box",0,1.85,0,1.1);add("cone",0,2.9,0,1.05);
   add("cylinder",-1,.72,.2,.43,{height:2});add("cone",-1,1.85,.2,.5);
   add("cylinder",1,.72,.2,.43,{height:2});add("cone",1,1.85,.2,.5);break;
  default:
   add(seed%3===0?"capsule":seed%3===1?"sphere":"cylinder",0,.9,0,1,{detail:"face"});
   add("sphere",0,1.95,0,.62);add("cone",-.8,.7,0,.5);add("cone",.8,.7,0,.5);add("leaf",0,.5,-.6,.5);break;
 }
 if(t.accessory==="crown")add("cone",0,3.15,0,.43,{material:"metal",color:"gold"});
 if(t.accessory==="hat")add("cone",0,3.1,0,.5);
 if(t.accessory==="halo")add("torus",0,3.15,0,.65,{material:"glow",color:"gold"});
 if(t.accessory==="wings"&&parts.length<=10){add("leaf",-1.2,1.35,-.2,.65,{joint:"flap",pivot:"right"});add("leaf",1.2,1.35,-.2,.65,{joint:"flap",pivot:"left"})}
 // Bounded deterministic geometry changes, while preserving required silhouette.
 for(let i=0;i<parts.length;i++)if(typeof parts[i].x==="number"&&Math.abs(parts[i].x as number)>.01)
  parts[i].x=Number(((parts[i].x as number)+jitter).toFixed(3));
 return {...common,parts:parts.slice(0,12),assembly:kind==="tower"?"stack":assembly};
}
