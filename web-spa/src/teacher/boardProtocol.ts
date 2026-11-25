/** Session-only, data-only board protocol. Never render model-authored HTML. */
export type CardKind="explanation"|"example"|"comparison"|"timeline"|"vocabulary"|"quiz"|"correction"|"steps"|"flashcard"|"dialogue"|"speaking";
export type BoardPair={source:string;target:string;pronunciation?:string};
export type BoardPoint={label:string;note:string};
export type BoardQuestion={question:string;options:string[];answerIndex:number;explanation:string};
export type SpeakingGoal={prompt:string;goal:string;example:string;checks:string[][];minWords:number;minSentences:number};
export type BoardCard={
 id:string;type:CardKind;title:string;body:string;
 pairs:BoardPair[];points:BoardPoint[];questions:BoardQuestion[];speaking?:SpeakingGoal;
};
export type BoardPatch={action:"upsert"|"replace"|"remove";cards:BoardCard[];ids:string[]};
const kinds:CardKind[]=["explanation","example","comparison","timeline","vocabulary","quiz","correction","steps","flashcard","dialogue","speaking"];
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const clean=(v:unknown,max=240):string=>typeof v==="string"?v.replace(/[<>\u0000-\u001f]/g," ").trim().slice(0,max):"";
const safeId=(v:unknown):v is string=>typeof v==="string"&&/^[a-z0-9_-]{1,40}$/i.test(v);
export function validateBoardPatch(value:unknown):BoardPatch|null{
 if(!object(value))return null;
 // Hard cap before traversing untrusted nested objects.
 try{if(JSON.stringify(value).length>16000)return null}catch{return null}
 const action=value.action;
 if(action!=="upsert"&&action!=="replace"&&action!=="remove")return null;
 const ids=Array.isArray(value.ids)?value.ids.filter(safeId).slice(0,24):[];
 if(action==="remove")return ids.length?{action,cards:[],ids}:null;
 if(!Array.isArray(value.cards)||!value.cards.length||value.cards.length>12)return null;
 const cards:BoardCard[]=[];
 for(const input of value.cards){
  if(!object(input)||!safeId(input.id)||!kinds.includes(input.type as CardKind)||!clean(input.title,100))return null;
  const pairs=Array.isArray(input.pairs)?input.pairs.slice(0,8).filter(object).map(p=>({source:clean(p.source,200),target:clean(p.target,220),pronunciation:clean(p.pronunciation,100)})).filter(p=>p.source):[];
  const points=Array.isArray(input.points)?input.points.slice(0,8).filter(object).map(p=>({label:clean(p.label,90),note:clean(p.note,180)})).filter(p=>p.label):[];
  const questions=Array.isArray(input.questions)?input.questions.slice(0,5).filter(object).map(q=>({
   question:clean(q.question,260),
   options:Array.isArray(q.options)?q.options.slice(0,4).map(o=>clean(o,120)).filter(Boolean):[],
   answerIndex:Number.isInteger(q.answerIndex)?Number(q.answerIndex):-1,
   explanation:clean(q.explanation,260)
  })).filter(q=>q.question&&q.options.length>=2&&q.answerIndex>=0&&q.answerIndex<q.options.length):[];
  let speaking:SpeakingGoal|undefined;
  if(input.type==="speaking"&&object(input.speaking)){
   const s=input.speaking;
   const checks=Array.isArray(s.checks)?s.checks.slice(0,4).filter(Array.isArray).map(group=>group.slice(0,6).map(term=>clean(term,50)).filter(Boolean)).filter(group=>group.length>0):[];
   const prompt=clean(s.prompt,260),goal=clean(s.goal,260);
   const minWords=typeof s.minWords==="number"&&Number.isInteger(s.minWords)?Math.max(1,Math.min(80,s.minWords)):5;
   const minSentences=typeof s.minSentences==="number"&&Number.isInteger(s.minSentences)?Math.max(1,Math.min(5,s.minSentences)):1;
   if(!prompt||!goal||!checks.length)return null;
   speaking={prompt,goal,example:clean(s.example,300),checks,minWords,minSentences};
  }
  if(input.type==="speaking"&&!speaking)return null;
  cards.push({id:input.id,type:input.type as CardKind,title:clean(input.title,100),body:clean(input.body,640),pairs,points,questions,...(speaking?{speaking}:{})});
 }
 return {action,cards,ids:[]};
}
export function applyBoardPatch(current:BoardCard[],patch:BoardPatch):BoardCard[]{
 if(patch.action==="remove")return current.filter(c=>!patch.ids.includes(c.id));
 const next=patch.action==="replace"?[]:current.slice();
 for(const c of patch.cards){
  const existing=next.findIndex(x=>x.id===c.id);
  if(existing>=0)next[existing]=c;
  else next.push(c);
 }
 return next.slice(-24);
}
const str={type:"STRING"};const arr=(items:Record<string,unknown>)=>({type:"ARRAY",items});
export const BOARD_FUNCTION="update_teaching_board";
export const BOARD_TOOLS=[{functionDeclarations:[{
 name:BOARD_FUNCTION,
 description:"Update the interactive lesson stage while speaking. Create concise visual blocks matching the lesson: comparison for differences, timeline for chronological ideas, steps with points (label and note) for a procedure, dialogue with pairs (source=speaker, target=utterance) for roleplay, flashcard with pairs (source=front, target=back) for recall, vocabulary with pronunciation, quiz with questions, example for example/meaning pairs, correction for before/after, speaking with speaking {prompt,goal,example,checks as required keyword-alternative groups,minWords,minSentences} for oral practice, explanation for concepts. Vary formats meaningfully, do not default to explanation. Each update focuses the latest changed card. Reuse stable IDs to edit; action replace for a wholly new lesson, not every turn. Send small patches early during speech. Data only, never HTML.",
 parameters:{type:"OBJECT",properties:{
  action:{type:"STRING",enum:["upsert","replace","remove"]},
  ids:arr(str),cards:arr({type:"OBJECT",properties:{
   id:str,type:{type:"STRING",enum:kinds},title:str,body:str,
   pairs:arr({type:"OBJECT",properties:{source:str,target:str,pronunciation:str},required:["source","target"]}),
   points:arr({type:"OBJECT",properties:{label:str,note:str},required:["label","note"]}),
   questions:arr({type:"OBJECT",properties:{question:str,options:arr(str),answerIndex:{type:"INTEGER"},explanation:str},required:["question","options","answerIndex"]}),
   speaking:{type:"OBJECT",properties:{prompt:str,goal:str,example:str,checks:arr(arr(str)),minWords:{type:"INTEGER"},minSentences:{type:"INTEGER"}},required:["prompt","goal","checks"]}
  },required:["id","type","title"]})
 },required:["action","cards"]}
}]}];
const hasBeenQuiz:BoardQuestion[]=[
 {question:"I ___ learning English for two years.",options:["have been","had been"],answerIndex:0,explanation:"從過去持續到現在，用 have been。"},
 {question:"Before I moved, I ___ living in Taipei.",options:["have been","had been"],answerIndex:1,explanation:"另一件過去事件之前，用 had been。"},
 {question:"She ___ working here since May (and still does).",options:["has been","had been"],answerIndex:0,explanation:"主詞 she 的現在完成進行式用 has been。"}
];

/** Explicit *format examples*, not generated facts about the current lesson. */
export function exampleBoardFormats():BoardCard[]{
 const simple=(id:string,type:CardKind,title:string,body:string,pairs:BoardPair[]=[],points:BoardPoint[]=[],questions:BoardQuestion[]=[]):BoardCard=>({id,type,title,body,pairs,points,questions});
 return [
  simple("demo-explanation","explanation","格式示範 · Explanation","這是概念說明卡，適合先定義觀念。"),
  simple("demo-comparison","comparison","格式示範 · Compare","現在完成式 vs. 過去完成式",[{source:"have been",target:"連結到現在"},{source:"had been",target:"以另一個過去時間點為參考"}]),
  simple("demo-timeline","timeline","格式示範 · Timeline","同一個概念的時間參考點",[],[{label:"have been",note:"從過去延續到現在"},{label:"had been",note:"早於另一件過去的事"}]),
  simple("demo-example","example","格式示範 · Examples","兩句示範例句",[{source:"I have been busy today.",target:"我今天一直很忙。"},{source:"I had been busy before you called.",target:"你打電話來之前，我一直很忙。"}]),
  simple("demo-vocabulary","vocabulary","格式示範 · Vocabulary","飯店英語用詞",[{source:"reservation",target:"預約、訂房",pronunciation:"/ˌrez.əˈveɪ.ʃən/"},{source:"check in",target:"辦理入住"}]),
  simple("demo-flashcard","flashcard","格式示範 · Flashcards","點擊卡片翻面",[{source:"reservation",target:"訂房、預約"},{source:"check in",target:"辦理入住"}]),
  simple("demo-dialogue","dialogue","格式示範 · Dialogue","飯店入住情境",[{source:"Receptionist",target:"Welcome! Do you have a reservation?"},{source:"Guest",target:"Yes, under the name Chen."}]),
  simple("demo-steps","steps","格式示範 · Steps","如何辦理飯店入住",[],[{label:"1",note:"向櫃檯打招呼"},{label:"2",note:"說明有訂房"},{label:"3",note:"提供訂房姓名"}]),
  simple("demo-correction","correction","格式示範 · Correction","常見用法修正",[{source:"I have reservation.",target:"I have a reservation."}]),
  simple("demo-quiz","quiz","格式示範 · Quiz","選出正確的入住說法",[],[],[{question:"Which sentence is natural?",options:["I have a reservation.","I have reservation."],answerIndex:0,explanation:"reservation 是可數名詞，此處需要 a。"}]),
  {id:"demo-speaking",type:"speaking",title:"格式示範 · Speaking",body:"實際開口或輸入練習",pairs:[],points:[],questions:[],speaking:{
   prompt:"Tell the hotel clerk you booked a room.",goal:"用完整句子說出有訂房",
   example:"Hello, I have a reservation under Chen.",checks:[["reservation","booking","booked"]],minWords:5,minSentences:1
  }}
 ];
}
/** Only extracts formats supported by actual spoken data; never invent facts or translation. */
function extractedFormatBoard(question:string,answer:string,current:BoardCard[]):BoardPatch|null{
 const demo=/展示.{0,12}(?:卡片|種類|形式|樣式)|各種卡片|多.{0,5}(?:卡片種類|種類|卡片類型)|不同.{0,8}(?:卡片|形式)|show.{0,14}(?:card|format|type)|all card (?:types|formats)/i.test(question);
 if(demo)return {action:"replace",ids:[],cards:exampleBoardFormats()};
 const flash=/翻面卡|單字卡|flashcards?|記憶卡/i.test(question);
 const vocab=/單字卡|單字表|詞彙卡|vocabulary/i.test(question);
 const quiz=/考我|測驗|quiz|test me|three questions|三題/i.test(question);
 const dialogue=/情境對話|對話卡|對話練習|dialogue|role.?play/i.test(question);
 const compare=/比較卡|對照卡|comparison|compare|vs\.?|差別|差異|不同/i.test(question);
 const chronology=/時間軸|timeline|chronolog|先後順序/i.test(question);
 const sources=current.flatMap(card=>card.pairs.filter(p=>p.source&&p.target)).slice(0,8);
 // Reuse verified, already visible teaching material for recall/test modes.
 if(flash&&sources.length)return {action:"upsert",ids:[],cards:[{id:"recall-"+current.length,type:"flashcard",title:"翻面複習卡",body:"點擊翻面，回想老師先前教過的內容。",pairs:sources,points:[],questions:[]}]};
 if(quiz&&sources.length>=2){
  const unique=sources.filter((p,i)=>sources.findIndex(x=>x.source===p.source)===i);
  if(unique.length>=2){
   const questions=unique.slice(0,3).map((p,i)=>({question:"哪一項對應「"+p.target+"」？",options:[p.source,unique[(i+1)%unique.length].source],answerIndex:0,explanation:p.source+" — "+p.target}));
   return {action:"upsert",ids:[],cards:[{id:"recall-quiz-"+current.length,type:"quiz",title:"從剛才內容複習",body:"答案依照前面白板上的真實教學內容建立。",pairs:[],points:[],questions}]};
  }
 }
 const lines=(answer.match(/[^。！？!?\n]+[。！？!?]?/g)||[]).flatMap(line=>line.split(/(?<=[.!?])\s+(?=[A-Z])/)).map(s=>s.trim()).filter(Boolean);
 // Use only explicitly structured spoken pairs.
 const pairs=answer.split(/\n/).map(line=>line.match(/^\s*([^:：—–\-]{2,80})\s*[:：—–]\s*(.{3,180})$/)).filter((m):m is RegExpMatchArray=>!!m).slice(0,8).map(m=>({source:m[1].trim(),target:m[2].trim()}));
 // Natural role-labelled speech can be visualized as dialogue without the user
 // having to say "make a dialogue card". Never guess speaker identities.
 const role=/^(?:guest|clerk|staff|teacher|student|receptionist|customer|waiter|cashier|you|me|顧客|客人|櫃檯|店員|老師|學生|服務員|顧問|面試官|應徵者|a|b)$/i;
 if((dialogue||(pairs.length>=2&&pairs.every(p=>role.test(p.source))))&&pairs.length>=2)return {action:"upsert",ids:[],cards:[{id:"dialogue-"+current.length,type:"dialogue",title:"老師剛才的對話",body:"從老師實際說出的角色台詞整理。",pairs,points:[],questions:[]}]};
 if((vocab||(!compare&&!chronology&&pairs.length>=2&&pairs.every(p=>p.source.split(/\s+/).length<=3)))&&pairs.length)return {action:"upsert",ids:[],cards:[{id:"vocab-"+current.length,type:"vocabulary",title:"單字與用法",body:"從老師剛才的說明整理。",pairs,points:[],questions:[]}]};
 if(compare&&pairs.length>=2)return {action:"upsert",ids:[],cards:[{id:"compare-"+current.length,type:"comparison",title:"差異對照",body:"從老師剛才的說明整理。",pairs: pairs.slice(0,4),points:[],questions:[]}]};
 if(chronology&&lines.length>=2)return {action:"upsert",ids:[],cards:[{id:"timeline-"+current.length,type:"timeline",title:"先後順序",body:"依老師剛才的說明順序呈現，不推測未提及的時間。",pairs:[],points:lines.slice(0,6).map((note,i)=>({label:String(i+1),note:note.slice(0,180)})),questions:[]}]};
 return null;
}

/** No second model request. Fallback is deterministic and intentionally limited. */
export function fallbackBoard(turn:{input?:string;output?:string},current:BoardCard[]):BoardPatch|null{
 const question=clean(turn.input,260),answer=clean(turn.output,640);
 // Preserve spoken line breaks for role/term extraction, but never copy markup or control bytes.
 const structured=typeof turn.output==="string"?turn.output.slice(0,640).replace(/[<>\u0000-\u0009\u000b-\u001f]/g," "):"";
 if(!question&&!answer)return null;
 const topic=current.find(c=>c.id==="grammar-rule")?.title||question||"今日教學";
 const simplified=/簡單|simplif|easier|easy version/i.test(question);
 const quiz=/考我|測驗|quiz|test me|three questions|三題/i.test(question);
 const been=/\b(have|has|had) been\b/i.test(question+" "+topic);
 if(quiz&&been)return {action:"replace",ids:[],cards:[{id:"grammar-quiz",type:"quiz",title:"Have been / Had been · 3 題練習",body:"選出適合的時態，也可以直接用語音回答。",pairs:[],points:[],questions:hasBeenQuiz}]};
 const extracted=extractedFormatBoard(question,structured,current);
 if(extracted)return extracted;
 if(been){
  const cards:BoardCard[]=[
   {id:"grammar-rule",type:"comparison",title:"Have been vs. Had been",body:simplified?"have been：跟現在有關。had been：在另一件過去事件之前。":"have/has been 表示過去到現在的經驗或持續狀態；had been 表示另一個過去時間點之前已存在的狀態。",pairs:[{source:"have/has been",target:"過去 → 現在"},{source:"had been",target:"更早的過去 → 過去"}],points:[],questions:[]},
   {id:"grammar-time",type:"timeline",title:"兩條時間軸",body:"看參考時間點，就能選擇適合的時態。",pairs:[],points:[{label:"have been",note:"過去 ───── ● 現在"},{label:"had been",note:"更早過去 ───── ● 過去"}],questions:[]},
   {id:"grammar-example",type:"example",title:"對照例句",body:"",pairs:[{source:"I have been busy today.",target:"我今天一直很忙。"},{"source":"I had been busy before you called.","target":"你打電話來之前，我一直很忙。"}],points:[],questions:[]}
  ];
  return {action:"upsert",ids:[],cards};
 }
 if(!answer)return null;
 const id="explain-"+String(current.filter(c=>c.id.startsWith("explain-")).length+1);
 // No invented educational facts: turn a real spoken answer into numbered visual steps
 // only when there are enough meaningful, separately spoken sentences.
 const sentences=(answer.match(/[^。！？!?\n]+[。！？!?]?/g)||[])
  .flatMap(line=>line.split(/(?<=[.!?])\s+(?=[A-Z])/))
  .map(line=>line.trim()).filter(line=>line.length>=14).slice(0,6);
 const numbered=sentences.length>=2;
 return {action:"upsert",ids:[],cards:[{id,type:numbered?"steps":"explanation",
  title:simplified?"簡化重點":current.length?"補充講解":"今日教學",
  body:numbered?"":answer,pairs:[],
  points:numbered?sentences.map((line,i)=>({label:String(i+1).padStart(2,"0"),note:line})):[],questions:[]}]};
}
export function boardNotes(cards:BoardCard[]):string{
 return cards.map(c=>[c.title,c.body,...c.pairs.map(x=>x.source+" — "+x.target),...c.points.map(x=>x.label+"："+x.note),...c.questions.map((q,i)=>(i+1)+". "+q.question)].filter(Boolean).join("\n")).join("\n\n");
}
