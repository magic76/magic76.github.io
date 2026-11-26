/** Small, explicit English mini-lessons. Nothing is saved to personal memory.
 * Language-specific model prompting happens on the live session; these presets
 * also work without tool support or a Gemini connection.
 */
import type {BoardCard} from "./boardProtocol";

export type LessonId="hotel"|"interview"|"grammar"|"ed-sounds"|"plural-sounds"|"word-stress"|"coffee"|"restaurant"|"directions"|"airport"|"shopping"|"small-talk"|"present-simple"|"past-simple"|"future"|"articles"|"prepositions"|"requests"|"meeting"|"status-update"|"clarify";
export type Lesson={
 id:LessonId; title:string; duration:string;goal:string;success:string;
 cards:BoardCard[]; zhTitle?:string; category?:LessonCategory; level?:"A1"|"A2"|"B1";
};
const card=(id:string,type:BoardCard["type"],title:string,body="",extras:Partial<BoardCard>={}):BoardCard=>({
 id,type,title,body,pairs:[],points:[],questions:[],...extras
});

// Curated English mini-lessons: one concept, examples, a check, and an oral task.
export type LessonCategory="daily"|"travel"|"grammar"|"pronunciation"|"work";
export const LESSON_CATEGORIES: {id:LessonCategory;en:string;zh:string}[]=[{id:"daily",en:"Daily life",zh:"生活會話"},{id:"travel",en:"Travel",zh:"旅遊英文"},{id:"grammar",en:"Grammar",zh:"文法句型"},{id:"pronunciation",en:"Pronunciation",zh:"發音規則"},{id:"work",en:"Work",zh:"職場英文"}];
type Seed=[LessonId,string,string,LessonCategory,"A1"|"A2"|"B1",string,"comparison"|"dialogue"|"vocabulary"|"steps",[string,string][],[string,string][],[string,string[],number,string],string,string,string[][]];
const seeds:Seed[]=[
 ["ed-sounds","-ed endings","-ed 字尾發音","pronunciation","A2","Distinguish the three regular past-tense endings by the final sound.","comparison",[["/t/","walked, watched — after voiceless sounds other than /t/"],["/d/","played, cleaned — after voiced sounds other than /d/"],["/ɪd/","wanted, needed — after /t/ or /d/"]],[["I walked home.","The ending is /t/."],["She played tennis.","The ending is /d/."],["We needed help.","The ending is /ɪd/."]],["Which word adds an extra syllable?",["walked","needed","played"],1,"Needed ends in /ɪd/ because need ends in /d/."],"Say what you did yesterday using one verb from the examples.","Yesterday I walked home and played tennis.",[["walked","played","needed","watched","cleaned","wanted"]]],
 ["plural-sounds","Plural -s endings","複數 -s 發音","pronunciation","A2","Recognize /s/, /z/ and /ɪz/ in common plural nouns.","comparison",[["/s/","cats, books — after most voiceless non-sibilants"],["/z/","dogs, pens — after most voiced non-sibilants"],["/ɪz/","buses, watches — after sibilants"]],[["Two cats are sleeping.","cats: /s/"],["Three dogs are playing.","dogs: /z/"],["The buses are late.","buses: /ɪz/"]],["Which plural adds an extra syllable?",["dogs","cats","buses"],2,"Buses adds /ɪz/ after the final /s/."],"Describe two or more things you can see using a plural from the lesson.","I can see two cats and three dogs.",[["cats","dogs","books","pens","buses","watches"]]],
 ["word-stress","Word stress","單字重音","pronunciation","B1","Recognize stressed syllables in familiar multisyllable words.","vocabulary",[["TA-ble","Stress the first syllable."],["a-BOUT","Stress the second syllable."],["ne-GO-ti-ate","Stress the second syllable."]],[["This table is clean.","TA-ble"],["Let's negotiate the price.","ne-GO-ti-ate"],["Tell me about your day.","a-BOUT"]],["Which syllable is stressed in negotiate?",["First","Second","Third"],1,"The main stress is on GO, the second syllable."],"Use negotiate in a complete sentence; listen to the teacher's stress model.","We need to negotiate the price today.",[["negotiate"]]],
 ["coffee","Ordering coffee","咖啡店點餐","daily","A1","Order a drink politely and specify its size.","dialogue",[["Barista","What can I get for you?"],["Customer","I'd like a medium latte, please."],["Barista","For here or to go?"]],[["Could I have a coffee, please?","A polite request."],["To go, please.","Takeaway."],["For here, please.","Drink at the café."]],["Which is a polite order?",["Give coffee.","I'd like a latte, please.","Where did you go?"],1,"I'd like is a polite way to order."],"Order a drink and specify the size.","I'd like a medium latte, please.",[["latte","coffee","tea","cappuccino","espresso"],["small","medium","large"]]],
 ["restaurant","At a restaurant","餐廳用餐","daily","A2","Ask for a recommendation and order a meal politely.","dialogue",[["Server","Are you ready to order?"],["Guest","What do you recommend?"],["Server","The grilled chicken is popular."]],[["Could I see the menu?","Ask for the menu."],["I'll have the chicken, please.","Order a meal."],["Could we have the bill?","Ask to pay."]],["How do you ask for the bill?",["Could we have the bill?","Do you have a room?","How long is the flight?"],0,"The bill is the amount you need to pay."],"Order a dish from the examples using a polite request.","I'll have the chicken with rice, please.",[["chicken","rice","salad","pasta","soup","fish"]]],
 ["directions","Asking for directions","問路與指路","travel","A1","Ask how to get somewhere and understand simple directions.","dialogue",[["Visitor","Excuse me, how do I get to the station?"],["Local","Go straight and turn left at the corner."],["Visitor","Thank you very much."]],[["Go straight.","Continue forward."],["Turn right at the lights.","Change direction at the traffic lights."],["It's next to the bank.","It is beside the bank."]],["What does 'next to' mean?",["Far away","Beside","Behind the city"],1,"Next to means beside."],"Ask how to reach a station, bank, hotel, museum or airport.","Excuse me, how do I get to the station?",[["station","bank","hotel","museum","airport"]]],
 ["airport","Airport check-in","機場報到","travel","A2","Ask about a flight, luggage or the boarding gate.","dialogue",[["Agent","May I see your passport?"],["Passenger","Here you are. Where is my boarding gate?"],["Agent","Your gate is B12."]],[["I'd like to check in.","Register for a flight."],["Is this my boarding pass?","Confirm the travel document."],["Where is gate B12?","Ask for the gate."]],["Which document lets you board the plane?",["Menu","Hotel key","Boarding pass"],2,"A boarding pass identifies the passenger and flight."],"Ask the agent where your gate is.","Could you tell me where my boarding gate is?",[["gate"]]],
 ["shopping","Shopping and returns","購物與退換貨","daily","A2","Ask about size, price and returning an item.","dialogue",[["Customer","Do you have this in a larger size?"],["Clerk","Yes, would you like to try it on?"],["Customer","Yes, please."]],[["How much is this?","Ask the price."],["Can I try this on?","Ask to wear it before buying."],["I'd like to return this item.","Request a return."]],["What does 'try it on' mean?",["Pay for it","Wear it to check the fit","Return it"],1,"Try on means wear something to see how it fits."],"Ask for another size politely.","Do you have this in a smaller size?",[["size"]]],
 ["small-talk","Making small talk","日常閒聊","daily","A2","Start a conversation and ask a natural follow-up.","dialogue",[["A","How was your weekend?"],["B","Pretty good! I went hiking."],["A","Nice! Where did you go?"]],[["How's your day going?","Start a casual chat."],["That sounds fun.","React to a story."],["What did you do next?","Ask a follow-up."]],["Which is a natural follow-up to 'I went hiking'?",["Where did you go?","Please sign here.","I need a receipt."],0,"Ask about a detail the other person mentioned."],"Tell the teacher what you did last weekend using a past verb such as went, visited or played.","I went hiking with my friends last weekend.",[["went","visited","played","watched","stayed","worked"]]],
 ["present-simple","Present simple vs. continuous","現在簡單式與進行式","grammar","A1","Distinguish habits from actions happening now.","comparison",[["Present simple","Habits and general facts: I work every day."],["Present continuous","An action happening now: I am working."]],[["She drinks coffee every morning.","A habit."],["She is drinking coffee now.","An action happening now."]],["Listen! She ___ a song.",["sings every day","is singing","sang yesterday"],1,"Listen signals an action in progress."],"Describe something happening now using am, is or are and an -ing verb from the lesson.","I am learning English with my teacher now.",[["am","is","are"],["learning","studying","working","reading","speaking","drinking"]]],
 ["past-simple","Past simple vs. present perfect","過去式與現在完成式","grammar","A2","Choose past simple for finished past times and present perfect for experience or present relevance.","comparison",[["Past simple","I visited Tokyo in 2024: finished past time."],["Present perfect","I have visited Tokyo: experience without a finished time."]],[["I saw that movie yesterday.","Finished past time."],["I have seen that movie before.","Experience."]],["I ___ my homework last night.",["have finished","finished"],1,"Last night is a finished past time."],"Tell the teacher something you did yesterday using finished, worked, visited, watched, played or went.","I finished my homework yesterday evening.",[["yesterday"],["finished","worked","visited","watched","played","went"]]],
 ["future","Will vs. going to","Will 與 going to","grammar","A2","Distinguish a spontaneous decision from a prior plan.","comparison",[["will","A decision at the moment: I'll answer the phone."],["be going to","A prior plan: I'm going to study tonight."]],[["The phone is ringing. I'll get it.","Spontaneous decision."],["I bought tickets. I'm going to travel.","Prior plan."]],["You already booked a trip. Which sentence fits?",["I'm going to travel next week.","I traveled yesterday."],0,"Going to naturally expresses a prior plan."],"Tell the teacher a plan for tomorrow using going to.","I am going to study English tomorrow.",[["going to"]]],
 ["articles","A, an and the","冠詞 a、an、the","grammar","A1","Choose indefinite or definite articles in simple contexts.","comparison",[["a / an","One non-specific singular countable noun; choose by sound."],["the","A specific or already identified noun."]],[["I saw a dog.","First mention."],["The dog was friendly.","The same dog."],["She is an engineer.","Engineer starts with a vowel sound."]],["She is ___ engineer.",["a","an","the"],1,"Engineer starts with a vowel sound; use an for a non-specific profession."],"Introduce a person by their profession using a or an.","My sister is an engineer at a company.",[["a","an"]]],
 ["prepositions","In, on and at","時間介系詞 in、on、at","grammar","A1","Use common time prepositions for months, days and clock times.","comparison",[["in","Months, years and longer periods."],["on","Days and dates."],["at","Clock times."]],[["We meet in June.","Month."],["We meet on Monday.","Day."],["We meet at nine.","Clock time."]],["The meeting starts ___ 9 a.m.",["in","on","at"],2,"Use at with a clock time."],"Tell the teacher when you have a meeting using in, on or at.","I have a meeting on Monday at nine.",[["at","on","in"]]],
 ["requests","Polite requests","禮貌請求句型","grammar","A2","Use could and would to make everyday requests politely.","comparison",[["Could you…?","Ask someone to do something."],["Would you mind…?","Ask politely using a verb ending in -ing."]],[["Could you open the window?","A polite request."],["Would you mind closing the door?","Use -ing after mind."]],["Would you mind ___ the door?",["close","closing","closed"],1,"Use a gerund after mind."],"Ask the teacher to repeat something politely using could you or would you mind.","Could you repeat that sentence more slowly?",[["could you","would you mind"]]],
 ["meeting","Speaking in meetings","職場會議英文","work","B1","Express an opinion and invite other people to respond.","dialogue",[["Colleague","What do you think of the proposal?"],["You","I think we should test it first."],["Colleague","That sounds reasonable."]],[["In my opinion, we need more time.","Express an opinion."],["Could you clarify that point?","Ask for clarification."],["What do you think?","Invite feedback."]],["Which phrase asks for clarification?",["Could you clarify that point?","I'll have a latte.","Where is gate B12?"],0,"Clarify means make something easier to understand."],"Give your opinion about a project using I think, I believe or in my opinion.","I think we should test the new feature first.",[["i think","in my opinion","i believe"]]],
 ["status-update","Project status updates","工作進度回報","work","B1","Explain completed work, next steps and a blocker.","steps",[["Done","Say what you completed."],["Next","Say what you plan to do."],["Blocker","State any obstacle clearly."]],[["I finished the first draft yesterday.","Completed work."],["I'll test the changes today.","Next step."],["I'm waiting for feedback.","Blocker."]],["Which sentence describes a blocker?",["I finished the draft.","I'm waiting for approval.","I will test tomorrow."],1,"Waiting for approval can prevent further progress."],"Give an update using a completed action and will or going to for the next step.","I finished the draft and will test it today.",[["finished","completed","fixed","built","tested"],["will","going to"]]],
 ["clarify","Asking for clarification","聽不懂時如何確認","daily","A2","Ask someone to repeat, slow down or explain a word.","dialogue",[["A","The deadline has been moved forward."],["B","Sorry, could you explain what you mean?"],["A","It is now earlier than planned."]],[["Could you say that again?","Ask for repetition."],["Could you speak more slowly?","Ask for a slower pace."],["What does that word mean?","Ask for a definition."]],["Which request asks for repetition?",["Could you say that again?","How much is this?","I'm leaving tomorrow."],0,"Say that again asks the speaker to repeat the message."],"Ask your teacher to repeat a difficult sentence.","Could you say that again more slowly, please?",[["say that again","repeat","more slowly"]]]
];
function curatedLesson(seed:Seed):Lesson{
 const [id,title,zhTitle,category,level,goal,kind,items,examples,q,prompt,example,checks]=seed;
 return {id,title,zhTitle,category,level,duration:"3–5 min",goal,success:"Answer the knowledge check and produce an original spoken response.",cards:[
  card(id+"-concept",kind,title,goal,kind==="steps"?{points:items.map(([label,note])=>({label,note}))}:{pairs:items.map(([source,target])=>({source,target}))}),
  card(id+"-examples","example","Examples in context","Listen, compare, and try saying the examples.",{pairs:examples.map(([source,target])=>({source,target}))}),
  card(id+"-quiz","quiz","Quick check","Choose the best answer.",{questions:[{question:q[0],options:q[1],answerIndex:q[2],explanation:q[3]}]}),
  card(id+"-speaking","speaking","Your turn",prompt,{speaking:{prompt,goal:prompt,example,checks,minWords:5,minSentences:1}})
 ]};
}
export function lessonCategory(lesson:Lesson):LessonCategory{return lesson.category||(lesson.id==="hotel"?"travel":lesson.id==="interview"?"work":"grammar")}
export function lessonLabel(lesson:Lesson,zh:boolean):string{return zh?(lesson.zhTitle||({hotel:"飯店入住",interview:"工作面試",grammar:"Have been / Had been"} as Record<string,string>)[lesson.id]||lesson.title):lesson.title}

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
 ,...seeds.map(curatedLesson)
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
