/** Small, explicit English mini-lessons. Nothing is saved to personal memory.
 * Language-specific model prompting happens on the live session; these presets
 * also work without tool support or a Gemini connection.
 */
import type {BoardCard} from "./boardProtocol";

export type LessonId="hotel"|"interview"|"grammar";
export type Lesson={
 id:LessonId; title:string; duration:string;goal:string;success:string;
 cards:BoardCard[];
};
const card=(id:string,type:BoardCard["type"],title:string,body="",extras:Partial<BoardCard>={}):BoardCard=>({
 id,type,title,body,pairs:[],points:[],questions:[],...extras
});
export const LESSONS:Lesson[]=[
 {id:"hotel",title:"Hotel check-in",duration:"3–5 min",goal:"Tell the receptionist that you have a booking.",
  success:"Answer the check-in question, then say a complete booking sentence.",
  cards:[
   card("hotel-dialogue","dialogue","At reception","Listen to how check-in works.",{pairs:[
    {source:"Receptionist",target:"Good evening. How can I help you?"},
    {source:"Guest",target:"Hi, I have a reservation under Chen."},
    {source:"Receptionist",target:"Certainly. May I see your passport?"}
   ]}),
   card("hotel-words","vocabulary","Useful phrases","Tap a phrase to ask your teacher.",{pairs:[
    {source:"reservation",target:"A booking made in advance"},
    {source:"under my name",target:"The name used for the booking"},
    {source:"check in",target:"Arrive and register at a hotel"}
   ]}),
   card("hotel-quiz","quiz","Quick check","Which sentence tells the receptionist you booked a room?",{questions:[
    {question:"You arrive at a hotel. What do you say?",options:["I have a reservation.","I leave tomorrow.","Where is the train?"],answerIndex:0,explanation:"Use 'I have a reservation' to tell the receptionist you booked a room."}
   ]}),
   card("hotel-speaking","speaking","Your turn: check in","Pretend the teacher is the receptionist.",{speaking:{
    prompt:"Tell the receptionist you already booked a room.",
    goal:"Say a complete sentence confirming your hotel booking.",
    example:"Hello, I have a reservation under Chen.",
    checks:[["reservation","booking","booked"]],minWords:5,minSentences:1
   }})
  ]},
 {id:"interview",title:"Job interview",duration:"3–5 min",goal:"Introduce your experience in one confident answer.",
  success:"Answer a short interview question and describe your work experience aloud.",
  cards:[
   card("interview-steps","steps","Answer structure","Speak naturally; you do not need to memorize a script.",{points:[
    {label:"Present",note:"Say what you do now."},
    {label:"Experience",note:"Mention a relevant project."},
    {label:"Strength",note:"Explain what you learned or improved."}
   ]}),
   card("interview-example","example","A short example","Change the details to match your real experience.",{pairs:[
    {source:"I work as a software engineer.",target:"Your current work"},
    {source:"I have experience building web products.",target:"One relevant skill"},
    {source:"I enjoy solving complex problems.",target:"Your strength"}
   ]}),
   card("interview-quiz","quiz","Quick check","Choose an interview answer.",{questions:[
    {question:"Which answer best describes professional experience?",options:["I have worked on web products for several years.","Blue is my favorite color.","Can I have a menu?"],answerIndex:0,explanation:"Mention relevant work and use a complete sentence."}
   ]}),
   card("interview-speaking","speaking","Tell me about yourself","The teacher plays the interviewer.",{speaking:{
    prompt:"Tell me about your professional experience in two sentences.",
    goal:"Introduce yourself and describe at least one relevant skill or project.",
    example:"I work as a software engineer. I have experience building web applications.",
    checks:[["work","worked","engineer","developer","experience","built","build"]],minWords:9,minSentences:2
   }})
  ]},
 {id:"grammar",title:"Have been / Had been",duration:"3–5 min",goal:"Choose the tense based on the time reference.",
  success:"Answer the tense question and create two sentences using the target tense.",
  cards:[
   card("grammar-rule","comparison","Have been vs. Had been","Choose the reference point.",{pairs:[
    {source:"have/has been",target:"Started before now; connected to the present."},
    {source:"had been",target:"Before another point in the past."}
   ]}),
   card("grammar-time","timeline","Two timelines","Notice the reference point.",{points:[
    {label:"have been",note:"past → now"},
    {label:"had been",note:"earlier past → later past"}
   ]}),
   card("grammar-quiz","quiz","Quick check","Which tense fits?",{questions:[
    {question:"Before you called, I ___ working.",options:["have been","had been"],answerIndex:1,explanation:"Both events are in the past; working started before the call."}
   ]}),
   card("grammar-speaking","speaking","Use it in two sentences","Create your own examples.",{speaking:{
    prompt:"Say two sentences. Use 'have been' in one and 'had been' in the other.",
    goal:"Produce two separate sentences using both tense forms.",
    example:"I have been learning English. I had been working before you called.",
    checks:[["have been","has been"],["had been"]],minWords:10,minSentences:2
   }})
  ]}
];
export function findLesson(id:string):Lesson|undefined{return LESSONS.find(x=>x.id===id)}
export type SpeakingAssessment={attempt:string;met:boolean;matched:number;required:number;wordCount:number;sentenceCount:number};
export function evaluateSpeakingTask(card:BoardCard,attempt:string):SpeakingAssessment|null{
 const goal=card.speaking;
 if(card.type!=="speaking"||!goal)return null;
 const normalized=attempt.toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ").trim();
 if(!normalized)return null;
 const words=normalized.match(/[\p{L}\p{N}']+/gu)||[];
 const sentences=normalized.split(/[.!?。！？]+/).map(x=>x.trim()).filter(Boolean);
 const matched=goal.checks.filter(group=>group.some(term=>{
  const needle=term.toLowerCase().trim();
  return needle.length>0&&(" "+normalized.replace(/[,.!?。！？]/g," ")+" ").includes(" "+needle+" ");
 })).length;
 return {attempt:attempt.slice(0,640),met:matched===goal.checks.length&&words.length>=goal.minWords&&sentences.length>=goal.minSentences,
  matched,required:goal.checks.length,wordCount:words.length,sentenceCount:sentences.length};
}
export function lessonProgress(lesson:Lesson,answers:Record<string,number>,assessment:SpeakingAssessment|null){
 const quiz=lesson.cards.find(c=>c.type==="quiz");
 const passed=!!quiz&&quiz.questions.every((q,i)=>answers[quiz.id+":"+i]===q.answerIndex);
 return {quiz:passed,speaking:!!assessment?.met,complete:passed&&!!assessment?.met};
}
export function lessonPrompt(lesson:Lesson,step:number):string{
 const card=lesson.cards[Math.min(step,lesson.cards.length-1)];
 const parts=[
  "[GUIDED MINI LESSON: SESSION ONLY]",
  "You are teaching "+lesson.title+". Learning goal: "+lesson.goal,
  "Success criteria: "+lesson.success,
  "Current stage "+(step+1)+"/"+lesson.cards.length+": "+card.title+".",
  "Follow this already displayed teaching card. Do not reset the board, invent personal facts, or advance without learner action.",
  "Exact visible card material (use only the current stage):",
  card.body,
  ...card.pairs.map(p=>p.source+" — "+p.target),
  ...card.points.map(p=>p.label+": "+p.note),
  ...card.questions.map(q=>q.question+" | choices: "+q.options.join(" / ")),
  ...(card.speaking?[card.speaking.prompt,card.speaking.goal]:[]),
  "Teaching sequence for this one card: (1) briefly state the learning goal, (2) explain ONE visible item at a time in the same order as the card, (3) demonstrate with the exact displayed example, (4) ask the learner to try or confirm understanding, (5) WAIT. Never narrate a later card.",
  "Keep each spoken segment short (one or two sentences), pause naturally after an example, and never silently jump to the next card.",
  "Do not reveal quiz answers before the learner answers. Do not call board or director tools for this guided lesson.",
  card.type==="quiz"?"Ask the quiz question briefly and WAIT for student input. Never state or imply the answer until the student responds.":
  card.type==="speaking"?"Act as a conversation partner. Ask the student to say an original complete answer. Wait, then provide one actionable pronunciation or grammar tip. Do not claim rubric success without checking the learner's words.":
  "Explain this stage briefly, refer to its visual items, then ask whether the learner wants to move on."
 ];
 return parts.join("\n");
}
