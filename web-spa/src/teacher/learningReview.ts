import {studentMemories,normalizeLearningLanguage} from "./studentMemory";

/** Local, language-scoped retry notes. Never mix targets across languages. */
const REQUEST_KEY="crew_teacher_review_request_v1";
const DONE_PREFIX="crew_teacher_review_practiced_v1_";
const trim=(value:string)=>value.trim().slice(0,180);
const fingerprint=(text:string)=>{
 let value=2166136261;
 for(const char of text){value^=char.charCodeAt(0);value=Math.imul(value,16777619)}
 return (value>>>0).toString(16);
};
const doneKey=(language:string)=>DONE_PREFIX+encodeURIComponent(normalizeLearningLanguage(language));

export function latestReviewFocus(language:string):string{
 const records=studentMemories(language).filter(m=>m.active&&m.confidence>=0.5&&
  (m.type==="weakness"||m.type==="focus")&&m.detail.trim());
 records.sort((a,b)=>(a.type==="weakness"?0:1)-(b.type==="weakness"?0:1)||b.updatedAt-a.updatedAt);
 return trim(records[0]?.detail||"");
}
export function reviewedFocusToday(language:string,focus:string):boolean{
 if(!focus)return false;
 try{
  const data=JSON.parse(localStorage.getItem(doneKey(language))||"null");
  return data?.day===new Date().toDateString()&&data.fingerprint===fingerprint(focus);
 }catch{return false}
}
export function markReviewPracticed(language:string,focus:string):void{
 if(!focus)return;
 try{localStorage.setItem(doneKey(language),JSON.stringify({day:new Date().toDateString(),fingerprint:fingerprint(focus)}))}catch{}
}
export function queueReviewFocus(language:string,focus:string):void{
 const detail=trim(focus);if(!detail)return;
 try{sessionStorage.setItem(REQUEST_KEY,JSON.stringify({language:normalizeLearningLanguage(language),detail,at:Date.now()}))}catch{}
}
/** Explicit report corrections are consumed once; stale requests do not override current language. */
export function consumeReviewFocus(language:string):string{
 try{
  const data=JSON.parse(sessionStorage.getItem(REQUEST_KEY)||"null");
  sessionStorage.removeItem(REQUEST_KEY);
  if(data?.language===normalizeLearningLanguage(language)&&typeof data.detail==="string"&&
   Date.now()-Number(data.at)>=0&&Date.now()-Number(data.at)<15*60*1000)return trim(data.detail);
 }catch{}
 return latestReviewFocus(language);
}
