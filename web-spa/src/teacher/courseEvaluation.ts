import type{CourseLesson}from"./courseCatalog";
import type{LiveTurn}from"../lib/runtime";
export type CourseEvaluation={hits:boolean[];done:number;total:number;score:number;stars:number;evidence:string[]};
const inFlight=new Map<string,Promise<CourseEvaluation>>();
const norm=(s:string)=>s.normalize("NFKC").toLowerCase().replace(/[\s.,!?。，！？"'“”「」]/g,"");
function result(flags:boolean[],evidence:string[]):CourseEvaluation{
 const done=flags.filter(Boolean).length,total=Math.max(1,flags.length);
 return{hits:flags,done,total,score:Math.round(done/total*100),
 stars:done===total&&done>0?3:done>=Math.ceil(total*2/3)?2:done>=1?1:0,evidence};
}
/** Require a verbatim quote from the student, never the AI side of the transcript. */
export function parseCourseAssessment(value:any,missions:number,turns:LiveTurn[]):CourseEvaluation|null{
 const rows=value?.mission_results;
 if(!Array.isArray(rows)||rows.length!==missions)return null;
 if(!rows.every((x:any)=>x&&typeof x.completed==="boolean"))return null;
 const inputs=turns.map(t=>norm(String(t.input||""))).filter(Boolean);
 const evidence=rows.map((r:any)=>String(r.evidence_quote||r.evidence||"").trim().slice(0,200));
 const hits=rows.map((r:any,i:number)=>{
  if(r.completed!==true)return false;
  const quoted=norm(evidence[i]);
  return quoted.length>=4&&inputs.some(text=>text.includes(quoted));
 });
 return result(hits,evidence);
}
function keyFor(lesson:CourseLesson,turns:LiveTurn[]){
 let h=2166136261;
 for(const c of lesson.id+"|"+turns.map(t=>t.input||"").join("|")){
  h^=c.charCodeAt(0);h=Math.imul(h,16777619);
 }
 return"crew_course_eval_v2_"+lesson.id+"_"+(h>>>0).toString(16);
}
export async function evaluateCourseSession(lesson:CourseLesson,turns:LiveTurn[],report?:any):Promise<CourseEvaluation>{
 const existing=parseCourseAssessment(report,lesson.missions.length,turns);
 if(existing)return existing;
 const key=keyFor(lesson,turns);
 try{
  const stored=JSON.parse(localStorage.getItem(key)||"null");
  const cached=parseCourseAssessment(stored,lesson.missions.length,turns);
  if(cached)return cached;
 }catch{}
 if(inFlight.has(key))return inFlight.get(key)!;
 const student=turns.filter(t=>t.input?.trim());
 if(!student.length)throw new Error("這次還沒有學生發言，無法評估。");
 if(!window.CrewAI?.call)throw new Error("課程評分服務尚未就緒。");
 const transcript=turns.map(t=>["Student: "+String(t.input||"").slice(0,600),"Role character: "+String(t.output||"").slice(0,440)].join("\n")).join("\n");
 const prompt=[
  "Assess a scenario lesson. Grade whether each COMMUNICATION GOAL was achieved SEMANTICALLY, including equivalent natural wording.",
  "NEVER count role character speech as student evidence.",
  "Return ONLY JSON: {mission_results:[{completed:boolean,evidence_quote:string}]} one entry per mission, same order.",
  "evidence_quote must be a short EXACT CONTIGUOUS substring from a Student utterance, never a paraphrase or the scene character's reply.",
  "Mark false and evidence_quote empty if proof is missing or ambiguous. Do not invent quotes.",
  "Goals: "+JSON.stringify(lesson.missions.map(x=>x.titleZh)),
  "Scenario: "+lesson.scene,
  "Transcript:\n"+transcript.slice(-13000)
 ].join("\n");
 const request=(async()=>{
  const raw=await window.CrewAI.call(prompt,{preferLive:false,temperature:0,maxOutputTokens:850,json:true});
  let data:any;try{data=typeof raw==="string"?JSON.parse(raw.replace(/^\x60{3}(?:json)?\s*/i,"").replace(/\x60{3}$/,"")):raw}catch{throw new Error("課程評分格式不完整")}
  const result=parseCourseAssessment(data,lesson.missions.length,turns);
  if(!result)throw new Error("課程評估資料不完整。");
  try{localStorage.setItem(key,JSON.stringify(data))}catch{}
  return result;
 })().finally(()=>inFlight.delete(key));
 inFlight.set(key,request);return request;
}
