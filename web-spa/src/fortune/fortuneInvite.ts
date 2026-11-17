import type {FortuneMode} from "./types";
import {buildFortuneIdentity} from "./identity";
import {FORTUNE_ARCHETYPE_TRAITS,buildFortuneCardModel} from "./fortuneCardModel";
import {fortuneLocale} from "./fortuneJourneyI18n";

export type FortunePublicInvite={mode:FortuneMode;archetype:string;theme:"identity";src:"card"};
const modes:readonly FortuneMode[]=["bazi","tarot","vedic"];
/** Public invitation contains only four allowlisted, non-personal identifiers.
 * Neither profile, chart facts, history keys nor report text can enter the URL.
 */
export function fortuneInviteUrl(mode:FortuneMode,archetype:string|null,locale="zh-TW"):string{
 const path=fortuneLocale(locale)==="zh-TW"?"/fortune":"/"+fortuneLocale(locale)+"/fortune";
 const base="https://koolo.app"+path;
 if(!archetype||!Object.hasOwn(FORTUNE_ARCHETYPE_TRAITS,archetype)||!archetype.startsWith(mode+"-"))return base;
 const p=new URLSearchParams({m:mode,a:archetype,theme:"identity",src:"card"});
 return base+"?"+p.toString();
}
export function parseFortuneInvite(input:URLSearchParams|string):FortunePublicInvite|null{
 const raw=typeof input==="string"?input:input.toString();
 if(raw.length>256)return null;
 const p=typeof input==="string"?new URLSearchParams(input):input;
 if([...p.keys()].some(key=>!["m","a","theme","src"].includes(key)||p.getAll(key).length!==1))return null;
 const mode=p.get("m") as FortuneMode|null,archetype=p.get("a");
 if(!mode||!modes.includes(mode)||!archetype||p.get("theme")!=="identity"||p.get("src")!=="card")return null;
 if(!Object.hasOwn(FORTUNE_ARCHETYPE_TRAITS,archetype)||!archetype.startsWith(mode+"-"))return null;
 return {mode,archetype,theme:"identity",src:"card"};
}
export function publicFortuneCard(invite:FortunePublicInvite,locale:string){
 const id=invite.archetype,raw=id.slice(invite.mode.length+1);
 let result:Record<string,unknown>;
 if(invite.mode==="bazi")result={dayMaster:raw};
 else if(invite.mode==="tarot")result={personalityCardNumber:Number(raw)};
 else result={lagnaSign:raw[0]?.toUpperCase()+raw.slice(1)};
 const identity=buildFortuneIdentity(invite.mode,result,locale);
 // Fail closed even if future identity rules change.
 if(identity?.id!==id)return null;
 return buildFortuneCardModel(invite.mode,result,locale,"",identity);
}
/** The safe, one-way continuation starts a fresh local calculation without re-sharing any birth data. */
export function fortuneInviteNextUrl(_invite:FortunePublicInvite):string{
 return "/fortune/reading?mode=tarot&src=card";
}
