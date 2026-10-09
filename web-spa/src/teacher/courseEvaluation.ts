import type{CourseLesson}from"./courseCatalog";
import type{LiveTurn}from"../lib/runtime";
export type CourseEvaluation={hits:boolean[];done:number;total:number;score:number;stars:number;evidence:string[]};
function resultFromFlags(flags:boolean[],evidence:string[]):CourseEvaluation{
 const done=flags.filter(Boolean).length,total=Math.max(1,flags.length),score=Math.round(done/total*100);
 const stars=done===total&&done>0?3:done>=Math.ceil(total*2/3)?2:done>=1?1:0;
 return{hits:flags,done,total,score,stars,evidence};
}
function parseAssessment(value:any,total:number):CourseEvaluation|null{
 const rows=value?.mission_results;
 if(!Array.isArray(rows)||rows.length!==total)return null;
 if(!rows.every((x:any)=>x&&typeof x.completed==="boolean"&&typeof x.evidence==="string"))return null;
 const flags=rows.map((x:any)=>x.completed===true&&x.evidence.trim().length>0);
 return resultFromFlags(flags,rows.map((x:any)=>String(x.evidence||"").slice(0,180)));
}
export async function evaluateCourseSession(lesson:CourseLesson,turns:LiveTurn[],report?:any):Promise<CourseEvaluation>{
 const result=parseAssessment(report,lesson.missions.length);
 if(result)return result;
 const student=turns.filter(t=>t.input?.trim());
 if(!student.length)throw new Error("這次還沒有足夠的學生發言，無法評分。");
 if(!window.CrewAI?.call)throw new Error("課程評分服務尚未就緒。");
 const evidence=turns.map(t=>["Student: "+String(t.input||"").slice(0,550),"Scene: "+String(t.output||"").slice(0,400)].join("\n")).join("\n");
 const prompt=[
 "Evaluate whether the learner achieved each communication mission through their own words in this language roleplay.",
 "Grade SEMANTIC completion, not keyword matching. An equivalent paraphrase counts. Never count the role character's speech as student evidence.",
 "If evidence is missing or ambiguous, mark completed false. Do not make up an event, response, or quote.",
 "Return JSON: {mission_results:[{completed:boolean,evidence:string}]}, one entry per mission, same order.",
 "Scenario: "+lesson.scene,
 "Missions: "+JSON.stringify(lesson.missions.map(m=>m.titleZh)),
 "Transcript:\n"+evidence.slice(-13000)
 ].join("\n");
 const raw=await window.CrewAI.call(prompt,{preferLive:false,temperature:0,maxOutputTokens:650,json:true});
 let data:any;try{data=JSON.parse(String(raw).replace(/^```json\s*/i,"").replace(/```$/,""))}catch{throw new Error("評分格式不完整，請重新評估。")}
 const validated=parseAssessment(data,lesson.missions.length);
 if(!validated)throw new Error("課程評估回傳格式不完整。");
 return validated;
}
