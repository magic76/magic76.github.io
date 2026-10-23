/** Session-only, data-only board protocol. Never render model-authored HTML. */
export type CardKind="explanation"|"example"|"comparison"|"timeline"|"vocabulary"|"quiz"|"correction";
export type BoardPair={source:string;target:string;pronunciation?:string};
export type BoardPoint={label:string;note:string};
export type BoardQuestion={question:string;options:string[];answerIndex:number;explanation:string};
export type BoardCard={
 id:string;type:CardKind;title:string;body:string;
 pairs:BoardPair[];points:BoardPoint[];questions:BoardQuestion[];
};
export type BoardPatch={action:"upsert"|"replace"|"remove";cards:BoardCard[];ids:string[]};
const kinds:CardKind[]=["explanation","example","comparison","timeline","vocabulary","quiz","correction"];
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
  cards.push({id:input.id,type:input.type as CardKind,title:clean(input.title,100),body:clean(input.body,640),pairs,points,questions});
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
 description:"Update the learner's interactive teaching board WHILE speaking. Send small structured card patches early and throughout the explanation, not only after finishing speech. Reuse stable card IDs to simplify/edit; action replace for a new quiz. Data only, never HTML.",
 parameters:{type:"OBJECT",properties:{
  action:{type:"STRING",enum:["upsert","replace","remove"]},
  ids:arr(str),cards:arr({type:"OBJECT",properties:{
   id:str,type:{type:"STRING",enum:kinds},title:str,body:str,
   pairs:arr({type:"OBJECT",properties:{source:str,target:str,pronunciation:str},required:["source","target"]}),
   points:arr({type:"OBJECT",properties:{label:str,note:str},required:["label","note"]}),
   questions:arr({type:"OBJECT",properties:{question:str,options:arr(str),answerIndex:{type:"INTEGER"},explanation:str},required:["question","options","answerIndex"]})
  },required:["id","type","title"]})
 },required:["action","cards"]}
}]}];
const hasBeenQuiz:BoardQuestion[]=[
 {question:"I ___ learning English for two years.",options:["have been","had been"],answerIndex:0,explanation:"從過去持續到現在，用 have been。"},
 {question:"Before I moved, I ___ living in Taipei.",options:["have been","had been"],answerIndex:1,explanation:"另一件過去事件之前，用 had been。"},
 {question:"She ___ working here since May (and still does).",options:["has been","had been"],answerIndex:0,explanation:"主詞 she 的現在完成進行式用 has been。"}
];
/** No second model request. Fallback is deterministic and intentionally limited. */
export function fallbackBoard(turn:{input?:string;output?:string},current:BoardCard[]):BoardPatch|null{
 const question=clean(turn.input,260),answer=clean(turn.output,640);
 if(!question&&!answer)return null;
 const topic=current.find(c=>c.id==="grammar-rule")?.title||question||"今日教學";
 const simplified=/簡單|simplif|easier|easy version/i.test(question);
 const quiz=/考我|測驗|quiz|test me|three questions|三題/i.test(question);
 const been=/\b(have|has|had) been\b/i.test(question+" "+topic);
 if(quiz&&been)return {action:"replace",ids:[],cards:[{id:"grammar-quiz",type:"quiz",title:"Have been / Had been · 3 題練習",body:"選出適合的時態，也可以直接用語音回答。",pairs:[],points:[],questions:hasBeenQuiz}]};
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
 return {action:"upsert",ids:[],cards:[{id,type:"explanation",title:simplified?"簡化重點":topic.slice(0,80),body:answer,pairs:[],points:[],questions:[]}]};
}
export function boardNotes(cards:BoardCard[]):string{
 return cards.map(c=>[c.title,c.body,...c.pairs.map(x=>x.source+" — "+x.target),...c.points.map(x=>x.label+"："+x.note),...c.questions.map((q,i)=>(i+1)+". "+q.question)].filter(Boolean).join("\n")).join("\n\n");
}
