import type marketData from "./internationalLearningData.json";
type MarketCopy=typeof marketData;
let copy:MarketCopy|undefined;
let pending:Promise<void>|undefined;
const marketKey=(locale:string|undefined)=>{const key=locale==="pt-BR"?"pt-BR":locale?.split("-")[0];return key==="ja"||key==="vi"||key==="ko"||key==="es"||key==="pt-BR"||key==="id"?key:undefined};

/** Load only for the six launch locales, before locale selection or SSG renders. */
export function loadInternationalLearningCopy(locale:string):Promise<void>{
 if(!marketKey(locale)||copy)return Promise.resolve();
 if(!pending)pending=import("./internationalLearningData.json").then(module=>{copy=module.default;}).catch(error=>{pending=undefined;throw error;});
 return pending;
}
export function internationalLearningCopy(locale:string|undefined){
 const key=marketKey(locale);
 return key?copy?.[key]:undefined;
}
export function internationalTrackTitle(locale:string|undefined,id:string){
 const tracks=internationalLearningCopy(locale)?.tracks as Record<string,string>|undefined;
 return tracks?.[id];
}
