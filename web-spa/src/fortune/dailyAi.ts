import type {DailyCard} from "./dailyCard";
import {findExistingAiForKind,readCachedDaily,saveCachedDaily} from "./dailyStore";

export const DAILY_AI_OPTIONS={preferLive:false,maxOutputTokens:600,thinking:"low",requireComplete:true,timeoutMs:30000} as const;
export type DailyAiResponse={status:"ready"|"used"|"quota"|"error";text:string};
export function dailyAiPrompt(card:DailyCard,lang:string):string{
 // Explicit allowlist: profile, birth details, location, and chart metadata never enter this prompt.
 const facts={date:card.date,kind:card.kind,headline:card.headline,theme:card.theme,
  do:card.do,avoid:card.avoid,luckyColor:card.luckyColor.name,basis:card.basis};
 return "Crew Fortune reflection. Output language: "+lang+
  ". Respond in plain text, at most 120 characters or words as appropriate for the language. "+
  "No Markdown. Be calm, non-deterministic and supportive. No medical, investing or legal advice. "+
  "Only use these daily card facts (do not infer personal data): "+JSON.stringify(facts);
}
export async function generateDailyAi(
 card:DailyCard,profileHash:string,lang:string,
 call:(prompt:string,options:typeof DAILY_AI_OPTIONS)=>Promise<string>
):Promise<DailyAiResponse>{
 const cached=readCachedDaily(card.date,card.kind,profileHash);
 if(cached?.ai)return {status:"ready",text:cached.ai};
 // One successful generation per date and kind across profiles. Never display
 // an AI reading generated for someone else's birth profile.
 if(findExistingAiForKind(card.date,card.kind))return {status:"used",text:""};
 try{
  const output=(await call(dailyAiPrompt(card,lang),DAILY_AI_OPTIONS)).replace(/[*#]/g,"").trim();
  if(!output)return {status:"error",text:""};
  saveCachedDaily(card,profileHash,output);
  return {status:"ready",text:output};
 }catch(error){
  const message=String(error instanceof Error?error.message:error);
  return {status:/\b429\b|quota|resource.exhausted|rate.limit|額度|配額/i.test(message)?"quota":"error",text:""};
 }
}
