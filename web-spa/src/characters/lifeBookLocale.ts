import canon from "../../../contracts/crew-character-life-book/v1.json";
import zh from "../../../contracts/crew-character-life-book/locales/zh-TW.json";
export type LifeRole="friend"|"teacher";
export type CharacterLifeView={summary:string;people:string;current:string;moments:string[];teaching:string;language:"en"|"zh-TW"};
export function lifeBookLocale(locale:string):"en"|"zh-TW"{
 const normal=String(locale||"").replace(/_/g,"-").toLowerCase();
 return normal==="zh"||normal==="zh-tw"||normal==="zh-hant"||normal.startsWith("zh-hant-")||normal==="zh-hk"||normal==="zh-mo"?"zh-TW":"en";
}
/** UI-only biography selection. Never use this returned copy as a Live language policy. */
export function characterLifeView(role:LifeRole,id:string,locale:string):CharacterLifeView|null{
 const base:unknown=(canon[role==="friend"?"friends":"teachers"] as Record<string,unknown>)[id];
 if(!base||typeof base!=="object")return null;
 const src=base as Record<string,unknown>;
 const zhEntry:unknown=(zh[role==="friend"?"friends":"teachers"] as Record<string,unknown>)[id];
 const selected=lifeBookLocale(locale)==="zh-TW"&&zhEntry&&typeof zhEntry==="object"?zhEntry as Record<string,unknown>:null;
 const first=(value:unknown,defaultValue:string)=>typeof value==="string"&&value.trim()?value:defaultValue;
 const baseSummary=first(src.background,"");
 const basePeople=Array.isArray(src.people)?src.people.join("; "):"";
 const baseCurrent=first(src.ongoing,"");
 const baseMoments=Array.isArray(src.history)?src.history.slice(0,3):Array.isArray(src.examples)?src.examples.slice(0,2):[];
 const summary=first(selected?.summary,baseSummary);
 const people=first(selected?.people,basePeople);
 const current=first(selected?.current,baseCurrent);
 const teaching=first(selected?.teaching,first(src.teachingPrinciple,""));
 const moments=typeof selected?.moments==="string"&&selected.moments.trim()
  ?selected.moments.split("；").filter(Boolean):baseMoments as string[];
 return {summary,people,current,moments,teaching,language:selected?"zh-TW":"en"};
}
export function lifeBookLabels(role:LifeRole,locale:string){
 const zh=lifeBookLocale(locale)==="zh-TW";
 return {title:zh?"關於我的生活":"My story",people:zh?"身邊的人":"People in my life",current:zh?"最近在煩惱":"On my mind",
  moments:zh?"過去的小故事":"Stories to tell",teaching:zh?"教學想法":"How I teach",
  note:zh?"角色經歷為虛構設定，與你的對話記憶分開。":"Fictional character background, separate from your memories.",
  role};
}
