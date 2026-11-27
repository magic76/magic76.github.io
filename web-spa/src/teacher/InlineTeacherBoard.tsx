import {useEffect,useRef,useState} from "react";
import {TeachingCard} from "./TeachingCard";
import type {BoardCard} from "./boardProtocol";
import {currentBuild} from "../runtime/buildUpdates";
import {backupCard} from "./inlineBoardFallback";
import {INLINE_TEACHER_BOARD_ENABLED,INLINE_BOARD_POLICY,INLINE_BOARD_TOOLS,newInlineGate,proposeInlineBoard,finishInlineTurn,dismissInlineBoard,observeInlineInput,recordInlineEvent} from "./inlineBoardGate";
import "./teachingBoard.css";
import "./inlineTeacherBoard.css";

const PREF="koolo_teacher_inline_board_auto_v1";
function readAuto(){try{return localStorage.getItem(PREF)!=="off"}catch{return true}}
type Send=(text:string)=>boolean;
export function useInlineTeacherBoard(eligible:boolean){
 const enabled=INLINE_TEACHER_BOARD_ENABLED&&eligible;
 const gate=useRef(newInlineGate());
 const [auto,setAuto]=useState(readAuto);
 const autoRef=useRef(auto);
 const [card,setCard]=useState<BoardCard|null>(null);
 const [available,setAvailable]=useState(true);
 const [delivery,setDelivery]=useState<"idle"|"pending"|"missing">("idle");
 const [answers,setAnswers]=useState<Record<string,number>>({});
 const [quizIndex,setQuizIndex]=useState(0);
 const answerRef=useRef<Record<string,number>>({});
 const cardRef=useRef<BoardCard|null>(null);
 const quizRef=useRef(0);
 const rendered=useRef(0);
 useEffect(()=>{if(card){rendered.current++;recordInlineEvent(gate.current,"card-react-committed")}},[card]);
 function clearCard(){cardRef.current=null;setCard(null);answerRef.current={};setAnswers({});quizRef.current=0;setQuizIndex(0)}
 function reset(){gate.current=newInlineGate();rendered.current=0;clearCard();setAvailable(true);setDelivery("idle")}
 function close(){dismissInlineBoard(gate.current);clearCard();setDelivery("idle")}
 function toggle(){const next=!autoRef.current;autoRef.current=next;setAuto(next);try{localStorage.setItem(PREF,next?"on":"off")}catch{}if(!next)close()}
 function unavailable(){recordInlineEvent(gate.current,"tools-unavailable","model-tools-unavailable");setAvailable(false)}
 function observe(input:string){if(enabled)observeInlineInput(gate.current,input)}
 function show(next:BoardCard){clearCard();cardRef.current=next;setCard(next);setDelivery("idle")}
 function tool(call:{name:string;args?:unknown}){
  if(!enabled)return {ok:false,error:"disabled"};
  const result=proposeInlineBoard(gate.current,call,autoRef.current);
  if(result.card){show(result.card);return {ok:true,accepted:true,displayRequested:true}}
  return {ok:false,error:result.error||"rejected"};
 }
 function report(){const g=gate.current;return {schema:1,build:currentBuild.buildId,commit:currentBuild.commit,enabled,auto:autoRef.current,toolConfigured:enabled,toolsUnavailable:!available,toolCalls:g.toolCalls,validCards:g.validCards,accepted:g.accepted,reactCommits:rendered.current,fallbacks:g.fallbacks,completedTurns:g.completedTurns,lastReason:g.lastReason,reasons:g.reasons,events:g.events,cardPresent:Boolean(cardRef.current),delivery};}
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
  const next=finishInlineTurn(gate.current,input,turn.hasValidOutput===true,autoRef.current,Date.now(),backupCard,turn.output||"");
  setDelivery(gate.current.outcome==="missing"?"missing":"idle");
  if(gate.current.outcome==="dismissed")clearCard();
  if(next)show(next)
 }
 function request(send:Send){
  if(!enabled)return false;
  gate.current.requested=true;recordInlineEvent(gate.current,"manual-request");
  const sent=send("[LEARNER WHITEBOARD REQUEST] Explain our current learning topic aloud, giving concrete examples. If the optional tool is available, propose one useful card; never say a card has been displayed. If there is no learning topic yet, ask what I want to learn.");
  if(!sent){gate.current.requested=false;recordInlineEvent(gate.current,"manual-send-failed","send-failed")}
  setDelivery(sent?"pending":"missing");
  return sent
 }
 function navigate(index:number){quizRef.current=index;setQuizIndex(index)}
 return {
  enabled,available,delivery,auto,toggle,card,answers,quizIndex,navigate,close,reset,request,answer,finish,observe,report,
  policy:enabled?INLINE_BOARD_POLICY:"",
  tools:enabled?INLINE_BOARD_TOOLS:undefined,
  onToolCall:tool,
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
 const [admin,setAdmin]=useState(false),[copyStatus,setCopyStatus]=useState("");
 useEffect(()=>{const controller=new AbortController();void fetch("/api/usage/admin",{credentials:"same-origin",cache:"no-store",signal:controller.signal}).then(async r=>r.ok?await r.json():null).then(v=>{if(!controller.signal.aborted)setAdmin(v?.admin===true)}).catch(()=>{});return()=>controller.abort()},[]);
 async function copyReport(){try{await navigator.clipboard.writeText(JSON.stringify(board.report(),null,2));setCopyStatus(zh?"已複製":"Copied")}catch{setCopyStatus(zh?"複製失敗":"Copy failed")}}
 if(!board.enabled&&!admin)return null;
 return <div className="teacher-live-entry-actions">{board.enabled&&<>{!board.available&&<small>{zh?"此連線未支援即時白板工具，部分教材仍可備援。":"Live whiteboard tool unavailable; some lesson cards remain available."}</small>}<button type="button" onClick={()=>{if(board.request(send))onRequested()}} disabled={!canSend}>{zh?"請老師使用白板":"Ask for whiteboard"}</button><button type="button" aria-pressed={board.auto} onClick={board.toggle}>{zh?"自動白板":"Automatic whiteboard"}: {board.auto?(zh?"開":"On"):(zh?"關":"Off")}</button></>}{admin&&<><button type="button" onClick={()=>void copyReport()}>{zh?"複製白板診斷報告":"Copy whiteboard diagnostics"}</button>{copyStatus&&<small role="status">{copyStatus}</small>}</>}</div>
}
