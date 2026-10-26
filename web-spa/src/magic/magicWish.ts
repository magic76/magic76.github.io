// Pure, import-free offline wish interpreter: bounded text and enum-only outputs.
export type WishTraits={aura?:"bubbles"|"fire"|"stars"|"flowers"|"ice"|"music"|"hearts"|"leaves";colors:string[];material?:string;motion?:string;mood?:string;assembly?:string;accessory?:"crown"|"hat"|"halo"|"wings"};
const RULES:readonly [string,readonly string[]][]=[
 ["bubbles",["泡泡","bubble","泡"]],["fire",["火焰","火","fire","炎"]],
 ["stars",["星星","星","star","星空"]],["flowers",["花","flower","花びら"]],
 ["ice",["冰","雪","ice","snow","氷"]],["music",["音樂","歌","music","song","音楽"]],
 ["hearts",["愛心","heart","ハート"]],["leaves",["葉","森林","leaf","forest","森"]]
];
export function magicWishTraits(input:string):WishTraits{
 const text=input.slice(0,180).toLowerCase();
 const aura=RULES.find(([,words])=>words.some(word=>text.includes(word)))?.[0] as WishTraits["aura"];
 const result:WishTraits={aura,colors:[]};
 if(aura==="bubbles"||aura==="ice"){result.colors=["azure","ivory"];result.material="glass";result.motion="hover";result.assembly="bloom";result.mood="gentle";}
 else if(aura==="fire"){result.colors=["coral","gold"];result.material="glow";result.motion="orbit";result.assembly="spiral";result.mood="brave";}
 else if(aura==="flowers"||aura==="hearts"){result.colors=["rose","mint"];result.material="wood";result.motion="hover";result.mood="gentle";}
 else if(aura==="music"||aura==="stars"){result.colors=["violet","gold"];result.material="glow";result.motion="spin";result.mood="curious";}
 else if(aura==="leaves"){result.colors=["mint","gold"];result.material="wood";result.motion="walk";}
 if(["藍","blue","青","青い"].some(s=>text.includes(s)))result.colors=["azure","mint"];
 if(["紅","red","赤"].some(s=>text.includes(s)))result.colors=["coral","rose"];
 if(["皇冠","國王","crown","king","王冠"].some(s=>text.includes(s)))result.accessory="crown";
 else if(["帽子","hat","帽"].some(s=>text.includes(s)))result.accessory="hat";
 else if(["翅膀","wing","翼"].some(s=>text.includes(s)))result.accessory="wings";
 else if(["月亮","moon","月"].some(s=>text.includes(s)))result.accessory="halo";
 if(["海","ocean","sea"].some(s=>text.includes(s))){result.colors=["azure","mint"];result.motion="hover";}
 return result;
}
function hashWish(text:string){let h=2166136261;for(const ch of text){h=Math.imul(h^ch.charCodeAt(0),16777619)}return h>>>0;}
export function magicWishCreation(text:string,world:{revision:number;creations:readonly unknown[]},lang:"zh"|"en"="zh",retry=0){
 const source=text.slice(0,180).trim();if(!source)return null;
 const seed=(hashWish(source)+world.revision*977+retry*7919)%1000000;
 const t=magicWishTraits(source);const shape=seed%3;
 const colors=t.colors.length?t.colors:["mint","violet","gold"];
 const col=(i:number)=>colors[i%colors.length];
 const mat=t.material??"wood";
 const num=(i:number)=>Number((.82+((seed+i*173)%17)/100).toFixed(2));
 const parts:Array<Record<string,unknown>>=[
  {shape:shape===0?"capsule":shape===1?"sphere":"cylinder",material:mat,color:col(0),x:0,y:.9,z:0,size:1.02,width:num(2),height:num(3)},
  {shape:"sphere",material:mat,color:col(1),x:0,y:1.92,z:.07,size:.62,detail:"face"},
  {shape:"cone",material:mat,color:col(0),x:-.74,y:.65,z:0,size:.46,yaw:seed%40},
  {shape:"cone",material:mat,color:col(0),x:.74,y:.65,z:0,size:.46,yaw:-(seed%40)},
  {shape:shape===2?"torus":"leaf",material:t.material??"glass",color:col(1),x:0,y:.32,z:-.36,size:.55},
 ];
 if(t.accessory==="crown")parts.push({shape:"cone",material:"metal",color:"gold",x:0,y:2.73,z:0,size:.38});
 if(t.accessory==="hat")parts.push({shape:"cone",material:"wood",color:col(0),x:0,y:2.76,z:0,size:.43});
 if(t.accessory==="halo")parts.push({shape:"torus",material:"glow",color:"gold",x:0,y:2.8,z:0,size:.65});
 if(t.accessory==="wings")for(const sign of [-1,1])parts.push({shape:"leaf",material:mat,color:col(1),x:sign*1.05,y:1.2,z:-.22,size:.58,joint:"flap",pivot:sign<0?"right":"left"});
 return {label:source.slice(0,34),idea:source.slice(0,60),parts,motion:t.motion??"hover",mood:t.mood??"curious",assembly:t.assembly??["gather","bloom","spiral"][shape],x:((seed%7)-3)/8,z:(((seed>>4)%7)-3)/8,seed,aura:t.aura};
}
