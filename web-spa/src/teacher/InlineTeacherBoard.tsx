import {useRef,useState} from "react";
import {TeachingCard} from "./TeachingCard";
import {fallbackBoard,type BoardCard} from "./boardProtocol";
import {findLesson} from "./boardLessons";
import {INLINE_TEACHER_BOARD_ENABLED,INLINE_BOARD_POLICY,INLINE_BOARD_TOOLS,newInlineGate,proposeInlineBoard,finishInlineTurn,dismissInlineBoard,edTopic} from "./inlineBoardGate";
import "./teachingBoard.css";
import "./inlineTeacherBoard.css";

const PREF="koolo_teacher_inline_board_auto_v1";
function readAuto(){try{return localStorage.getItem(PREF)!=="off"}catch{return true}}
type Send=(text:string)=>boolean;
function backupCard(topic:string,output:string):BoardCard|null{
 if(!topic.trim())return null;
 // Existing curated English lesson for an explicitly matching topic only.
 if(edTopic(topic))return findLesson("ed-sounds")?.cards.find(c=>c.type==="comparison")||null;
 // Reuse only meaningful, structured spoken examples; never generic notes or demo cards.
 const patch=fallbackBoard({input:topic,output},[]);
 return patch?.cards.find(c=>!c.id.startsWith("demo-")&&["comparison","example","vocabulary"].includes(c.type))||null;
}
export function useInlineTeacherBoard(eligible:boolean){
 const enabled=INLINE_TEACHER_BOARD_ENABLED&&eligible;
 const gate=useRef(newInlineGate());
 const [auto,setAuto]=useState(readAuto);
 const [card,setCard]=useState<BoardCard|null>(null);
 const [available,setAvailable]=useState(true);
 const [delivery,setDelivery]=useState<"idle"|"pending"|"missing">("idle");
 const [answers,setAnswers]=useState<Record<string,number>>({});
 const [quizIndex,setQuizIndex]=useState(0);
 const answerRef=useRef<Record<string,number>>({});
 const cardRef=useRef<BoardCard|null>(null);
 const quizRef=useRef(0);
 function clearCard(){cardRef.current=null;setCard(null);answerRef.current={};setAnswers({});quizRef.current=0;setQuizIndex(0)}
 function reset(){gate.current=newInlineGate();clearCard();setAvailable(true);setDelivery("idle")}
 function close(){dismissInlineBoard(gate.current);clearCard();setDelivery("idle")}
 function toggle(){const next=!auto;setAuto(next);try{localStorage.setItem(PREF,next?"on":"off")}catch{}if(!next)close()}
 function unavailable(){gate.current.pending=null;setAvailable(false)}
 function answer(c:BoardCard,index:number,selected:number){
  const q=c.questions[index],key=c.id+":"+index;
  if(c!==cardRef.current||!q||!Number.isInteger(selected)||selected<0||selected>=q.options.length||answerRef.current[key]!==undefined)return false;
  answerRef.current={...answerRef.current,[key]:selected};setAnswers(answerRef.current);return true
 }
 function finish(turn:{input?:string;output?:string;hasValidOutput?:boolean}){
  if(!enabled)return;
  const input=turn.input||"",current=cardRef.current;
  const spoken=input.trim().match(/^(?:(?:option|answer|選項|答案)[ :：]*)?([a-d])[。.!！]?$/i);
  if(current?.type==="quiz"&&spoken)answer(current,quizRef.current,spoken[1].toUpperCase().charCodeAt(0)-65);
  const next=finishInlineTurn(gate.current,input,turn.hasValidOutput===true,auto,Date.now(),backupCard,turn.output||"");
  setDelivery(gate.current.outcome==="missing"?"missing":"idle");
  if(gate.current.outcome==="dismissed")clearCard();
  if(next){clearCard();cardRef.current=next;setCard(next)}
 }
 function request(send:Send){
  if(!enabled)return false;
  gate.current.requested=true;
  const sent=send("[LEARNER WHITEBOARD REQUEST] Explain our current learning topic aloud, giving concrete examples. If the optional tool is available, propose one useful card; never say a card has been displayed. If there is no learning topic yet, ask what I want to learn.");
  if(!sent)gate.current.requested=false;
  setDelivery(sent?"pending":"missing");
  return sent
 }
 function navigate(index:number){quizRef.current=index;setQuizIndex(index)}
 return {
  enabled,available,delivery,auto,toggle,card,answers,quizIndex,navigate,close,reset,request,answer,finish,
  policy:enabled?INLINE_BOARD_POLICY:"",
  tools:enabled?INLINE_BOARD_TOOLS:undefined,
  onToolCall:(call:{name:string;args?:unknown})=>enabled?proposeInlineBoard(gate.current,call):{ok:false,error:"disabled"},
  onToolsUnavailable:unavailable
 };
}
type Board=ReturnType<typeof useInlineTeacherBoard>;
export function InlineTeacherBoard({board,english,send,canSend}:{board:Board;english:boolean;send:Send;canSend:boolean}){
 const card=board.card;
 if(!board.enabled||(!card&&board.delivery==="idle"))return null;
 return <section className="inline-teacher-board" aria-label={english?"Teacher whiteboard":"老師的白板"}>
  <header><strong>{english?"Teacher whiteboard":"老師的白板"}</strong><button type="button" onClick={board.close} aria-label={english?"Close whiteboard":"收起白板"}>×</button></header>
  {board.delivery!=="idle"&&<div className="inline-board-delivery" role="status">{board.delivery==="pending"?(english?"Preparing a card…":"正在準備白板…"):(english?"No card was displayed. You can try again or keep speaking.":"這次沒有成功顯示教材，可以重試或繼續對話。")}{board.delivery==="missing"&&<button type="button" disabled={!canSend} onClick={()=>board.request(send)}>{english?"Try again":"重試"}</button>}</div>}
  {card&&<div className="inline-teacher-board-content"><TeachingCard key={card.id} card={card} answers={board.answers} english={english}
    quizIndex={board.quizIndex} onNavigate={board.navigate}
    onAnswer={(c,i,selected)=>{if(board.answer(c,i,selected)&&canSend){const q=c.questions[i];send("[LEARNER QUIZ ANSWER] "+JSON.stringify({question:q.question,selected:q.options[selected]})+". Give brief feedback and continue the conversation.")}}}
    onExplain={text=>{if(canSend)send("[LEARNER BOARD QUESTION] Please explain this board item: "+JSON.stringify(text))}}/></div>}
 </section>
}

export function InlineTeacherBoardMenu({board,zh,send,canSend,onRequested}:{board:Board;zh:boolean;send:Send;canSend:boolean;onRequested:()=>void}){
 if(!board.enabled)return null;
 return <div className="teacher-live-entry-actions">{!board.available&&<small>{zh?"此連線未支援即時白板工具，部分教材仍可備援。":"Live whiteboard tool unavailable; some lesson cards remain available."}</small>}<button type="button" onClick={()=>{if(board.request(send))onRequested()}} disabled={!canSend}>{zh?"請老師使用白板":"Ask for whiteboard"}</button><button type="button" aria-pressed={board.auto} onClick={board.toggle}>{zh?"自動白板":"Automatic whiteboard"}: {board.auto?(zh?"開":"On"):(zh?"關":"Off")}</button></div>
}
