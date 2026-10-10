/** Android TeacherPracticeHistory parity: verified counts only, not fictional memories. */
const PREFIX="crew_teacher_practice_history_v1_";
export function completedTutorSessions(profileId:string,targetLanguage:string):number{
 const key=PREFIX+encodeURIComponent(targetLanguage)+"_"+profileId;
 try{return Math.max(0,Math.min(9999,Number(localStorage.getItem(key)||0)||0))}catch{return 0}
}
export function recordCompletedTutorSession(profileId:string,targetLanguage:string,durationMs:number,studentTurns:number,roleplay:boolean):boolean{
 if(roleplay||durationMs<25000||studentTurns<1)return false;
 const key=PREFIX+encodeURIComponent(targetLanguage)+"_"+profileId;
 try{
  localStorage.setItem(key,String(Math.min(9999,completedTutorSessions(profileId,targetLanguage)+1)));
  return true;
 }catch{return false}
}
export function verifiedTutorHistoryContext(profileId:string,targetLanguage:string):string{
 const count=completedTutorSessions(profileId,targetLanguage);
 if(!count)return"";
 return "\n[VERIFIED PRACTICE HISTORY, NOT SHARED BIOGRAPHY]\nThe learner completed "+count+" practice session(s) with this tutor in this language. Welcome them naturally if appropriate, but do not invent previous topics, conversations, accomplishments or emotions. Never announce the count unprompted.";
}
