import type {InlineLesson} from "./inlineLessonCatalog";
import type {BoardCard} from "./boardProtocol";

// Session-only curriculum state. Model calls never mutate stage or scores.
export type GuidedSession={lesson:InlineLesson;index:number;answers:Record<string,number>;attempted:boolean;explained:boolean;correct:number;total:number};
export function startGuidedLesson(lesson:InlineLesson):GuidedSession{return {lesson,index:0,answers:{},attempted:false,explained:false,correct:0,total:0}}
export function guidedCard(s:GuidedSession):BoardCard{
 return s.lesson.cards[s.index]||{id:s.lesson.id+"-recap",type:"explanation",title:"Recap",body:s.lesson.goal,pairs:[],points:[],questions:[]};
}
export function guidedPhase(s:GuidedSession){const c=guidedCard(s);return s.index===s.lesson.cards.length?"recap":c.type==="quiz"?"quiz":c.type==="speaking"?"practice":c.type==="example"?"examples":"explain"}
export function guidedAnswer(s:GuidedSession,index:number,selected:number):GuidedSession{
 const c=guidedCard(s),q=c.questions[index],key=c.id+":"+index;
 if(c.type!=="quiz"||!q||!Number.isInteger(selected)||selected<0||selected>=q.options.length||s.answers[key]!==undefined)return s;
 return {...s,answers:{...s.answers,[key]:selected},correct:s.correct+Number(selected===q.answerIndex),total:s.total+1};
}
export function guidedAttempt(s:GuidedSession,input:string):GuidedSession{
 if(guidedPhase(s)!=="practice"||!input.trim()||/^(?:repeat please|can you repeat|please help|再說一次|我不懂|給我提示)[?.!。！ ]*$/i.test(input.trim()))return s;
 return {...s,attempted:true};
}
export function guidedExplained(s:GuidedSession,valid:boolean):GuidedSession{return valid?{...s,explained:true}:s}
export function guidedCanAdvance(s:GuidedSession){
 const c=guidedCard(s),phase=guidedPhase(s);
 if(phase==="recap")return s.explained;
 if(phase==="quiz")return s.explained&&c.questions.length>0&&c.questions.every((_,i)=>s.answers[c.id+":"+i]!==undefined);
 if(phase==="practice")return s.explained&&s.attempted;
 return s.explained;
}
export function advanceGuidedLesson(s:GuidedSession):GuidedSession|null{
 if(!guidedCanAdvance(s)||guidedPhase(s)==="recap")return null;
 return {...s,index:s.index+1,attempted:false,explained:false};
}
export function guidedPrompt(s:GuidedSession,target:string){
 const c=guidedCard(s),phase=guidedPhase(s);
 return [
  "[GUIDED LESSON CONTROL — curriculum managed by app, not a learner utterance]",
  "Teach the selected target language "+target+". Follow the session's existing explanation-language policy.",
  "Lesson: "+s.lesson.title+". Goal: "+s.lesson.goal+". Stage "+(s.index+1)+"/"+(s.lesson.cards.length+1)+": "+phase+".",
  "The application displays the exact stage locally. Do NOT call update_teaching_board or advance the curriculum in guided mode. If focus_teaching_board is available, use it to point at a visible row (cardId and zero-based index). Wait for the learner or next explicit stage control.",
  "Visible content: "+JSON.stringify({cardId:c.id,title:c.title,body:c.body,pairs:c.pairs,points:c.points,questions:c.questions.map(q=>({question:q.question,options:q.options})),speaking:c.speaking?{prompt:c.speaking.prompt,goal:c.speaking.goal}:undefined}),
  phase==="quiz"?"Ask the first question aloud and wait; do not reveal answers before the learner responds.":phase==="practice"?"Invite an original spoken response and wait. Give brief useful feedback; do not infer pronunciation from text.":phase==="recap"?"Summarize the rule and give one useful follow-up suggestion. The app recorded "+s.correct+" correct out of "+s.total+" submitted quiz answers. Do not claim mastery.": "Explain the visible concept/examples naturally, then wait for the learner to continue."
 ].join("\n");
}
export const GUIDED_END_PROMPT="[GUIDED LESSON END — app control] Return to normal conversational teaching. Do not continue the old curriculum unless the learner requests it.";
