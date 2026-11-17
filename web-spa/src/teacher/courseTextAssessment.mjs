/** Pure scenario check; only confirmed user->assistant exchanges count. */
const normalized=s=>String(s||"").normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
const letterOrDigit=/[\p{L}\p{N}]/u;
function containsPhrase(message,keyword){
 const value=normalized(message),term=normalized(keyword);
 if(!term)return false;
 let index=value.indexOf(term);
 while(index!==-1){
  const before=index?value[index-1]:"";
  const after=value[index+term.length]||"";
  if((!before||!letterOrDigit.test(before))&&(!after||!letterOrDigit.test(after)))return true;
  index=value.indexOf(term,index+1);
 }
 return false;
}
/** Require two successful reply pairs and evidence for all task goals. */
export function textCourseTasksDone(missions,messages){
 if(!Array.isArray(missions)||!missions.length||!Array.isArray(messages))return false;
 const student=[];let pending=null;
 for(const message of messages){
  if(message?.role==="user")pending=String(message.text||"").trim();
  if(message?.role==="assistant"&&pending){student.push(pending);pending=null}
 }
 if(student.length<2)return false;
 return missions.every(goal=>Array.isArray(goal.keywords)&&goal.keywords.some(keyword=>
  student.some(text=>containsPhrase(text,keyword))));
}
