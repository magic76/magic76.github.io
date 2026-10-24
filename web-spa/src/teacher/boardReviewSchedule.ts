/** Device-only, per-language AND per-teacher flashcard review.
 * Never stores entire turns, images, user answers, or unverified pronunciation scores.
 * The site's personal-memory opt-out is always authoritative.
 */
import type {BoardPair} from "./boardProtocol";
export type ReviewRating="known"|"again";
export type ReviewItem={source:string;target:string;level:number;dueAt:number;updatedAt:number};
const PREFIX="crew_teacher_board_review_v1_";
const MAX=64,DAY=86400000;
const safe=(s:unknown,max:number)=>typeof s==="string"?s.trim().replace(/[<>\u0000-\u001f]/g," ").slice(0,max):"";
const key=(lang:string,teacher:string)=>PREFIX+encodeURIComponent(lang.trim().toLowerCase().slice(0,36))+"_"+encodeURIComponent(teacher.trim().toLowerCase().slice(0,32));
const normalized=(s:string)=>s.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g," ");
const privateContent=/(?:\b(?:password|passport|account|address|ssn|phone|email)\b|@|https?:\/\/|(?:密碼|護照|帳號|住址|電話|身分證|信用卡))/i;
const safePair=(p:BoardPair):BoardPair|null=>{
 const source=safe(p.source,90),target=safe(p.target,160);
 if(!source||!target||privateContent.test(source+" "+target))return null;
 return {source,target};
};
export function loadBoardReviews(lang:string,teacher:string,enabled:boolean,now=Date.now()):ReviewItem[]{
 if(!enabled)return[];
 try{
  const raw=localStorage.getItem(key(lang,teacher));
  const items=JSON.parse(raw||"[]");
  if(!Array.isArray(items))return[];
  return items.filter((v):v is ReviewItem=>v&&typeof v.source==="string"&&typeof v.target==="string"&&Number.isInteger(v.level)&&v.level>=0&&v.level<=5&&Number.isFinite(v.dueAt)&&Number.isFinite(v.updatedAt)&&v.updatedAt<=now&&v.updatedAt>=now-365*DAY)
   .map(v=>({...v,source:safe(v.source,90),target:safe(v.target,160)}))
   .filter(v=>v.source&&v.target&&!privateContent.test(v.source+" "+v.target)).slice(0,MAX);
 }catch{return[]}
}
export function dueBoardReviews(lang:string,teacher:string,enabled:boolean,now=Date.now()):ReviewItem[]{
 return loadBoardReviews(lang,teacher,enabled,now).filter(item=>item.dueAt<=now).sort((a,b)=>a.dueAt-b.dueAt).slice(0,8);
}
export function recordBoardReview(lang:string,teacher:string,pair:BoardPair,rating:ReviewRating,enabled:boolean,now=Date.now()):ReviewItem[]{
 if(!enabled)return[];
 const cleanPair=safePair(pair);if(!cleanPair)return loadBoardReviews(lang,teacher,enabled,now);
 const list=loadBoardReviews(lang,teacher,enabled,now);
 const idx=list.findIndex(v=>normalized(v.source)===normalized(cleanPair.source));
 const old=idx>=0?list[idx]:undefined;
 const level=rating==="again"?0:Math.min(5,(old?.level||0)+1);
 // Again: available at the next session. Known: 1, 3, 7, 14, 30 days.
 const dueAt=now+(rating==="again"?0:[0,1,3,7,14,30][level]*DAY);
 const item={source:cleanPair.source,target:cleanPair.target,level,dueAt,updatedAt:now};
 if(idx>=0)list.splice(idx,1);
 const next=[item,...list].slice(0,MAX);
 try{localStorage.setItem(key(lang,teacher),JSON.stringify(next))}catch{/* session-only when storage is unavailable */}
 return next;
}
export function clearBoardReviews(lang:string,teacher:string):void{
 try{localStorage.removeItem(key(lang,teacher))}catch{}
}
export function clearAllBoardReviews():void{
 try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.startsWith(PREFIX))localStorage.removeItem(k)}}catch{}
}
export function clearBoardReviewsForLanguage(lang:string):void{
 const prefix=PREFIX+encodeURIComponent(lang.trim().toLowerCase().slice(0,36))+"_";
 try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.startsWith(prefix))localStorage.removeItem(k)}}catch{}
}
