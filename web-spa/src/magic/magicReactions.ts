// Pure reaction vocabulary; no imports so Node can evaluate this module directly.
export const MAGIC_ELEMENTS=["fire","ice","water","flower","star","music","wind","heart","leaf","cat","fish","dragon","bird","rabbit","fox","robot","cloud","tower"] as const;
export type MagicElement=typeof MAGIC_ELEMENTS[number];
export const MAGIC_REACTIONS_ALL=[
 {id:"cat_fish_chase",a:"cat",b:"fish"},{id:"dragon_fireworks",a:"dragon",b:"fire"},
 {id:"forge_sparks",a:"robot",b:"fire"},{id:"steam_rainbow",a:"fire",b:"ice"},
 {id:"flower_ring",a:"flower",b:"water"},{id:"frost_carpet",a:"ice",b:"water"},
 {id:"golden_pollen",a:"fire",b:"flower"},{id:"petal_swirl",a:"wind",b:"flower"},
 {id:"ember_whirl",a:"fire",b:"wind"},{id:"snow_fairy",a:"ice",b:"wind"},
 {id:"ripple_splash",a:"water",b:"wind"},{id:"star_lake",a:"star",b:"water"},
 {id:"heart_bouquet",a:"heart",b:"flower"},{id:"meteor_shower",a:"star",b:"night"},
 {id:"dragon_frost",a:"dragon",b:"castleIce"},{id:"music_dance",a:"music",b:"any"},
] as const;
export type MagicReactionId=typeof MAGIC_REACTIONS_ALL[number]["id"];
// Rollout gate: enable verified reactions incrementally without losing recipe definitions.
export const MAGIC_REACTIONS_ENABLED:readonly MagicReactionId[]=MAGIC_REACTIONS_ALL.map(r=>r.id);
export const MAGIC_REACTIONS=MAGIC_REACTIONS_ALL.filter(r=>MAGIC_REACTIONS_ENABLED.includes(r.id));
export type MagicReactionEnvironment={night:boolean;castleIce:boolean;distanceToCastle:number};
export function magicCreationElements(c:{label:string;idea:string;parts?:readonly {color?:string;material?:string}[]},traits:{aura?:string;kind?:string}):MagicElement[]{
 const found:MagicElement[]=[];
 const put=(v:string)=>{if((MAGIC_ELEMENTS as readonly string[]).includes(v)&&!found.includes(v as MagicElement)&&found.length<4)found.push(v as MagicElement)};
 const aura:{[key:string]:string}={bubbles:"water",stars:"star",flowers:"flower",hearts:"heart",leaves:"leaf",fire:"fire",ice:"ice",music:"music"};
 if(traits.aura)put(aura[traits.aura]??traits.aura);
 const kind=traits.kind==="jelly"?"fish":traits.kind; if(kind)put(kind);
 const s=(c.label+" "+c.idea).slice(0,180).toLowerCase();
 const rules:[string,string[]][]=[
  ["fire",["fire","flame","火","炎","ほのお"]],["ice",["ice","frost","冰","雪","氷"]],
  ["water",["water","ocean","sea","rain","泡","水","海","雨","あわ"]],
  ["flower",["flower","花","はな"]],["star",["star","星","ほし"]],
  ["music",["music","musical","song","音樂","音楽","歌","うた"]],
  ["wind",["wind","breeze","cloud","風","风","雲","かぜ"]],
  ["heart",["heart","愛心","愛","ハート"]],["leaf",["leaf","leaves","森林","葉","葉っぱ"]],
  ["cat",["cat","貓","猫","ねこ"]],["fish",["fish","jellyfish","魚","水母","さかな"]],
  ["dragon",["dragon","龍","竜","ドラゴン"]],["bird",["bird","鳥","とり"]],
  ["rabbit",["rabbit","兔","うさぎ"]],["fox",["fox","狐","きつね"]],
  ["robot",["robot","機器人","ロボット"]],["cloud",["cloud","雲","くも"]],
  ["tower",["tower","城堡","塔","タワー"]]
 ];
 for(const [tag,words] of rules)if(words.some(word=>s.includes(word)))put(tag);
 if(!found.length){const part=c.parts?.[0];if(part?.color==="coral"&&part.material==="glow")put("fire");else if(part?.color==="azure"&&part.material==="glass")put("water");else if(part?.color==="ivory"&&part.material==="glass")put("ice")}
 return found;
}
export function magicFindReaction(a:readonly string[],b:readonly string[],env:MagicReactionEnvironment):MagicReactionId|undefined{
 const all=new Set([...a,...b]);
 for(const r of MAGIC_REACTIONS){
  if(!MAGIC_REACTIONS_ENABLED.includes(r.id))continue;
  if(r.b==="night"){if(env.night&&((a.length===1&&a.includes(r.a))||(b.length===1&&b.includes(r.a))))return r.id;continue}
  if(r.b==="castleIce"){if(env.castleIce&&env.distanceToCastle<=8&&((a.length===1&&a.includes(r.a))||(b.length===1&&b.includes(r.a))))return r.id;continue}
  if(r.b==="any"){if((a.includes(r.a)&&b!==a)||(b.includes(r.a)&&a!==b))return r.id;continue}
  if((a.includes(r.a)&&b.includes(r.b))||(a.includes(r.b)&&b.includes(r.a)))return r.id;
 }
}
export function magicFindSoloReaction(tags:readonly string[],env:MagicReactionEnvironment):MagicReactionId|undefined{
 if(MAGIC_REACTIONS_ENABLED.includes("meteor_shower")&&env.night&&tags.includes("star"))return "meteor_shower";
 if(MAGIC_REACTIONS_ENABLED.includes("dragon_frost")&&env.castleIce&&env.distanceToCastle<=8&&tags.includes("dragon"))return "dragon_frost";
 return undefined;
}
export type ReactionCandidate={id:MagicReactionId;key:string;distance:number;focused?:boolean;discovered?:boolean;asleep?:boolean};
export type ReactionPickState={pairs:Record<string,number>;lastStart:number;active:number;limit:number};
export function magicPickReaction(candidates:readonly ReactionCandidate[],state:ReactionPickState,now:number):ReactionCandidate|undefined{
 if(state.active>=state.limit||now-state.lastStart<8)return undefined;
 let best:ReactionCandidate|undefined,bestScore=-Infinity;
 for(const c of candidates){if(c.asleep||c.distance>7.2||(state.pairs[c.key]!==undefined&&now-state.pairs[c.key]<40))continue;
  const score=(c.focused?1000:0)+(c.discovered?0:100)-c.distance;
  if(score>bestScore){bestScore=score;best=c}
 }
 return best;
}
