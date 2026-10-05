import type{FortuneMode,FortuneProfile}from"./types";

const KEY="crew_fortune_presets_v1";
export type FortunePreset={mode:FortuneMode;profile:FortuneProfile;createdAt:string;updatedAt:string};

function clean(v:string){return String(v||"").trim()}
function presetKey(x:FortunePreset){
 const p=x.profile;
 if(x.mode==="tarot")return[x.mode,p.birthDate].join("|");
 if(x.mode==="bazi")return[x.mode,p.birthDate,p.birthTime,p.gender].join("|");
 return[x.mode,p.birthDate,p.birthTime,p.latitude,p.longitude,p.timeZoneId||p.utcOffset].join("|");
}
export function loadFortunePresets():FortunePreset[]{try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}}
export function saveFortunePreset(mode:FortuneMode,profile:FortuneProfile){
 const now=new Date().toISOString(),next:FortunePreset={mode,profile:{...profile},createdAt:now,updatedAt:now},key=presetKey(next);
 const list=loadFortunePresets();const found=list.find(x=>presetKey(x)===key);
 if(found){found.profile={...profile};found.updatedAt=now}else list.unshift(next);
 localStorage.setItem(KEY,JSON.stringify(list.slice(0,12)));return loadFortunePresets()
}
export function clearFortunePresets(){localStorage.removeItem(KEY)}
export function presetLabel(x:FortunePreset){
 const p=x.profile,mode={bazi:"八字",tarot:"塔羅生命靈數",vedic:"印度星盤"}[x.mode];
 return[mode,p.birthDate,(x.mode!=="tarot"&&p.birthTime)||"",x.mode==="vedic"&&clean(p.city)].filter(Boolean).join(" · ")
}
