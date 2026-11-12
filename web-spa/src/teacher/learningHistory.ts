import {completedTutorSessions} from "./teacherPracticeHistory";
import {latestReviewFocus} from "./learningReview";
import {studentMemories} from "./studentMemory";

/** Read persisted evidence only; a generated warmup suggestion is not prior learning. */
function readHistoryRecord(key:string):Record<string,unknown>{
 try{
  const value=JSON.parse(localStorage.getItem(key)||"{}");
  return value&&typeof value==="object"&&!Array.isArray(value)?value:{};
 }catch{return {};}
}

/** Lightweight and synchronous: safe to call only after useClientReady. */
export function hasLearningHistory(targetLanguage:string,profileId:string):boolean{
 if(typeof window==="undefined")return false;
 if(targetLanguage==="英文"){
  const lessons=readHistoryRecord("crew_teacher_course_progress_v1");
  if(Object.values(lessons).some(entry=>{
   if(!entry||typeof entry!=="object")return false;
   const progress=entry as {completed?:boolean;stars?:number};
   return progress.completed===true||Number(progress.stars)>0;
  }))return true;
  const words=readHistoryRecord("crew_teacher_vocab_progress_v1");
  if(Object.values(words).some(entry=>entry&&typeof entry==="object"&&Number((entry as {seen?:number}).seen)>0))return true;
  const today=readHistoryRecord("crew_teacher_vocab_today_v1");
  if(today.date===new Date().toISOString().slice(0,10)&&Number(today.done)>0)return true;
 }
 try{if(completedTutorSessions(profileId,targetLanguage)>0)return true;}catch{/* Blocked storage. */}
 try{if(latestReviewFocus(targetLanguage).trim())return true;}catch{/* No review focus. */}
 try{if(studentMemories(targetLanguage).some(memory=>memory.active))return true;}catch{/* No saved student memory. */}
 return false;
}
