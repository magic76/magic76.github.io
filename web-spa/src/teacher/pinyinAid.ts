import type {TeachingMode} from "../store/teacherStore";

export type PinyinAidMode="auto"|"always"|"tap"|"off";
export const PINYIN_AID_OPTIONS:ReadonlyArray<{value:PinyinAidMode;label:string;labelEn:string}>=[
 {value:"auto",label:"自動 · 零基礎／雙語顯示",labelEn:"Auto · beginner / bilingual"},
 {value:"always",label:"永遠顯示",labelEn:"Always show"},
 {value:"tap",label:"點擊顯示",labelEn:"Tap to reveal"},
 {value:"off",label:"關閉",labelEn:"Off"}
];

export function normalizePinyinAidMode(raw:unknown):PinyinAidMode {
 return raw==="always"||raw==="tap"||raw==="off"?raw:"auto";
}
export function isMandarinTarget(language:string):boolean {
 return /^(中文|華語|汉语|漢語|普通话|普通話|chinese|mandarin|zh(?:[-_](?:cn|tw|hans|hant))?)$/i.test(language.trim());
}
export const containsHan=(text:string)=>/[\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
export function shouldShowPinyin(mode:PinyinAidMode,teachingMode:TeachingMode):boolean {
 return mode==="always"||(mode==="auto"&&teachingMode!=="immersion");
}

// Import the dictionary only for Mandarin sessions; never call Gemini or modify speech.
let dictionary:Promise<typeof import("pinyin-pro")>|null=null;
const cache=new Map<string,string>();
export async function toPinyin(text:string):Promise<string>{
 const source=text.trim().slice(0,360);
 if(!containsHan(source))return "";
 const cached=cache.get(source);
 if(cached!==undefined)return cached;
 dictionary??=import("pinyin-pro").catch(error=>{dictionary=null;throw error});
 const {pinyin}=await dictionary;
 const result=pinyin(source,{type:"string",toneType:"symbol",nonZh:"removed"}).trim();
 if(cache.size>=80)cache.delete(cache.keys().next().value!);
 cache.set(source,result);
 return result;
}
