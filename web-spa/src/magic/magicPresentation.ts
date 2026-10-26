import type {MagicWorld,MagicObjectKind} from "./world";

export const OBJECT_ICONS:Record<MagicObjectKind,string>={
 dragon:"🐉",chest:"🧰",portal:"🌀",tree:"🌳",owl:"🦉",fox:"🦊",crystal:"💎"
};
export const OBJECT_LABELS:Record<MagicObjectKind,[string,string]>={
 dragon:["飛龍","Dragon"],chest:["寶箱","Treasure chest"],portal:["傳送門","Portal"],
 tree:["魔法樹","Magic tree"],owl:["貓頭鷹","Owl"],fox:["小狐狸","Fox"],crystal:["水晶","Crystal"]
};
export const HELPERS=[
 {id:"sculptrobot",zh:"創造流線機器人",en:"Sculpt a robot",emoji:"🤖"},
 {id:"sculptfox",zh:"創造曲線靈狐",en:"Sculpt a fox",emoji:"🦊"},
 {id:"sculptdragon",zh:"創造翼膜飛龍",en:"Sculpt a dragon",emoji:"🐉"},
 {id:"creator",zh:"觀看零件創世",en:"Watch AI-style assembly",emoji:"🪄"},
 {id:"evolve",zh:"讓造物進化",en:"Evolve latest creation",emoji:"🔧"},
 {id:"wonder",zh:"給我一個驚喜",en:"Surprise me",emoji:"✨"},
 {id:"dragon",zh:"召喚一條龍",en:"Summon a dragon",emoji:"🐉"},
 {id:"fox",zh:"召喚漫步狐狸",en:"Summon a wandering fox",emoji:"🦊"},
 {id:"dragonice",zh:"火龍冰封城堡",en:"Dragon freezes castle",emoji:"🏰"},
 {id:"icecastle",zh:"冰封城堡",en:"Freeze the castle",emoji:"🧊"},
 {id:"thawcastle",zh:"融化冰封",en:"Thaw the castle",emoji:"☀️"},
 {id:"night",zh:"讓天空變成星夜",en:"Make it a starry night",emoji:"🌙"},
 {id:"puzzle",zh:"給我一個魔法謎題",en:"Give me a magic riddle",emoji:"🔮"},
 {id:"portal",zh:"打開一扇傳送門",en:"Open a portal",emoji:"🌀"},
 {id:"snow",zh:"冰雪魔法",en:"Snow kingdom",emoji:"❄️"},
 {id:"forest",zh:"精靈森林",en:"Enchanted forest",emoji:"🌲"},
 {id:"candy",zh:"糖果王國",en:"Candy kingdom",emoji:"🍬"},
 {id:"sunny",zh:"回到天空之島",en:"Sunny sky",emoji:"☀️"},
 {id:"rain",zh:"召喚暴風雨",en:"Rainstorm",emoji:"🌧️"},
 {id:"meteor",zh:"流星雨降臨",en:"Meteor shower",emoji:"☄️"},
 {id:"rainbow",zh:"召喚彩虹",en:"Summon rainbow",emoji:"🌈"},
 {id:"aurora",zh:"夜空極光",en:"Northern lights",emoji:"✨"}
] as const;

export function newlySummonedCreature(before:MagicWorld,after:MagicWorld):number|null{
 const creature=after.objects.find(obj=>(obj.kind==="dragon"||obj.kind==="owl"||obj.kind==="fox")&&
  !before.objects.some(previous=>previous.id===obj.id));
 return creature?.id??null;
}

export function newlyBuiltCreation(before:MagicWorld,after:MagicWorld):number|null{
 const changed=after.creations.find(c=>
  !before.creations.some(old=>old.id===c.id&&old.revision===c.revision));
 return changed?.id??null;
}

export function magicCreationSummary(c:MagicWorld["creations"][number],zh:boolean,tr?:(key:string,options?:{count?:number})=>string):string{
 if(c.blueprint){const icon={robot:"🤖",fox:"🦊",dragon:"🐉"}[c.blueprint.kind];return " · "+icon+" "+(tr?.("sculpted")??(zh?"曲面雕塑":"sculpted"));}
 if(c.parts.length)return " · "+(tr?.("Part count: {{count}}",{count:c.parts.length})??(c.parts.length+" "+(zh?"個零件":c.parts.length===1?"part":"parts")));
 return "";
}
export function magicAdventureCopy(zh:boolean,step:number,castle:string,pendingPortal:boolean,tr?:(key:string)=>string){
 const t=(a:string,b:string)=>tr?.(b)??(zh?a:b);
 return [
 {title:t("第一場魔法冒險","Your first magic adventure"),description:t("Lumi 發現一道未知的傳送門。先選一個世界！","Lumi found a mysterious portal. Choose a world to visit!"),action:pendingPortal?t("選擇傳送門目的地","Choose your destination"):t("打開傳送門","Open the portal")},
 {title:t("第 2 步 · 找個新夥伴","Step 2 · Meet a companion"),description:t("你已抵達新世界。召喚飛龍，看看牠如何飛進島嶼。","You reached a new world. Summon a dragon and watch it fly in."),action:t("召喚飛龍","Summon a dragon")},
 {title:t("第 3 步 · 改變這個世界","Step 3 · Transform the world"),description:t("現在讓飛龍施展冰雪魔法，親眼看城堡改變。","Give the dragon a spell. Watch the whole castle transform."),action:castle==="ice"?t("融化冰雪","Melt the ice"):t("冰封城堡","Freeze the castle")},
 {title:t("完成！神祕水晶現身","Complete! A crystal has appeared"),description:t("你完成第一場冒險！點擊水晶，或開始下一場魔法試煉。","Your first adventure is complete! Tap the crystal to uncover your next mystery."),action:t("探索下一道謎題","Explore the next mystery")},
 ][Math.min(3,Math.max(0,step))];
}
