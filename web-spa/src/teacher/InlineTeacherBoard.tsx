import {useEffect,useRef,useState} from "react";
import {TeachingCard} from "./TeachingCard";
import type {BoardCard} from "./boardProtocol";
import {currentBuild} from "../runtime/buildUpdates";
import type {LiveToolDiagnostic} from "../lib/runtime";
import {backupCard} from "./inlineBoardFallback";
import {inlineLessonLanguage,inlineLessonsFor,findInlineLesson} from "./inlineLessonCatalog";
import {startGuidedLesson,guidedCard,guidedPhase,guidedAnswer,guidedAttempt,guidedExplained,guidedCanAdvance,advanceGuidedLesson,guidedPrompt,GUIDED_END_PROMPT,type GuidedSession} from "./inlineLessonEngine";
import {INLINE_TEACHER_BOARD_ENABLED,INLINE_BOARD_POLICY,INLINE_BOARD_TOOLS,newInlineGate,proposeInlineBoard,finishInlineTurn,dismissInlineBoard,observeInlineInput,recordInlineEvent} from "./inlineBoardGate";
import "./teachingBoard.css";
import "./inlineTeacherBoard.css";

const PREF="koolo_teacher_inline_board_auto_v1";
function readAuto(){try{return localStorage.getItem(PREF)!=="off"}catch{return true}}
type Send=(text:string)=>boolean;
export function useInlineTeacherBoard(eligible:boolean,target="英文"){
 const enabled=INLINE_TEACHER_BOARD_ENABLED&&eligible;
 const gate=useRef(newInlineGate());
 const [auto,setAuto]=useState(readAuto);
 const [guided,setGuided]=useState<GuidedSession|null>(null);
 const guidedRef=useRef<GuidedSession|null>(null);
 const lessons=inlineLessonsFor(target);
 function syncGuided(next:GuidedSession|null){guidedRef.current=next;setGuided(next)}
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
 const wire=useRef({model:"",setupAcknowledged:0,setupTools:[] as string[],received:{whiteboard:0,learningFeedback:0,other:0}});
 function diagnostics(event:LiveToolDiagnostic){
  if(!enabled)return;
  const w=wire.current;w.model=event.model;
  if(event.event==="setup-ack"){w.setupAcknowledged++;w.setupTools=event.tools.filter(name=>name==="update_teaching_board"||name==="show_learning_feedback");recordInlineEvent(gate.current,"setup-ack");}
  else{const kind=event.name==="update_teaching_board"?"whiteboard":event.name==="show_learning_feedback"?"learningFeedback":"other";w.received[kind]++;recordInlineEvent(gate.current,"received-"+kind)}
 }
 useEffect(()=>{if(card){rendered.current++;recordInlineEvent(gate.current,"card-react-committed")}},[card]);
 function clearCard(){cardRef.current=null;setCard(null);answerRef.current={};setAnswers({});quizRef.current=0;setQuizIndex(0)}
 function reset(){syncGuided(null);gate.current=newInlineGate();rendered.current=0;wire.current={model:"",setupAcknowledged:0,setupTools:[],received:{whiteboard:0,learningFeedback:0,other:0}};clearCard();setAvailable(true);setDelivery("idle")}
 function close(){dismissInlineBoard(gate.current);clearCard();setDelivery("idle")}
 function toggle(){const next=!autoRef.current;autoRef.current=next;setAuto(next);try{localStorage.setItem(PREF,next?"on":"off")}catch{}if(!next&&!guidedRef.current)close()}
 function unavailable(){recordInlineEvent(gate.current,"tools-unavailable","model-tools-unavailable");setAvailable(false)}
 function observe(input:string){if(enabled)observeInlineInput(gate.current,input)}
 function show(next:BoardCard){clearCard();cardRef.current=next;setCard(next);setDelivery("idle")}
 function tool(call:{name:string;args?:unknown}){
  if(!enabled)return {ok:false,error:"disabled"};
  if(guidedRef.current){recordInlineEvent(gate.current,"tool-rejected","guided-curriculum");return {ok:false,error:"guided-curriculum"}}
  const result=proposeInlineBoard(gate.current,call,autoRef.current);
  if(result.card){show(result.card);return {ok:true,accepted:true,displayRequested:true}}
  return {ok:false,error:result.error||"rejected"};
 }
 function report(){const g=gate.current;return {schema:2,model:wire.current.model,setupAcknowledged:wire.current.setupAcknowledged,setupTools:wire.current.setupTools,receivedTools:wire.current.received,build:currentBuild.buildId,commit:currentBuild.commit,enabled,auto:autoRef.current,toolConfigured:enabled,toolsUnavailable:!available,toolCalls:g.toolCalls,validCards:g.validCards,accepted:g.accepted,reactCommits:rendered.current,fallbacks:g.fallbacks,completedTurns:g.completedTurns,lastReason:g.lastReason,reasons:g.reasons,events:g.events,cardPresent:Boolean(cardRef.current),delivery};}
 function beginLesson(id:string,send:Send){
  const lesson=findInlineLesson(target,id);if(!enabled||!lesson||guidedRef.current)return false;
  const next=startGuidedLesson(lesson);if(!send(guidedPrompt(next,target)))return false;
  syncGuided(next);show(guidedCard(next));recordInlineEvent(gate.current,"guided-start");return true;
 }
 function endLesson(send:Send){if(!guidedRef.current||!send(GUIDED_END_PROMPT))return false;syncGuided(null);close();recordInlineEvent(gate.current,"guided-end");return true}
 function nextLesson(send:Send){const current=guidedRef.current;if(!current)return false;if(guidedPhase(current)==="recap"&&guidedCanAdvance(current))return endLesson(send);
  const next=advanceGuidedLesson(current);if(!next||!send(guidedPrompt(next,target)))return false;
  syncGuided(next);show(guidedCard(next));recordInlineEvent(gate.current,"guided-next");return true;
 }
 function submitPractice(text:string,send:Send){const current=guidedRef.current;if(!current||guidedPhase(current)!=="practice"||!text.trim()||!send("[GUIDED PRACTICE ANSWER] "+JSON.stringify(text.slice(0,640))+". Give brief feedback, then wait."))return false;
  syncGuided(guidedAttempt(current,text));return true;
 }
 function answer(c:BoardCard,index:number,selected:number){
  const q=c.questions[index],key=c.id+":"+index;
  if(c!==cardRef.current||!q||!Number.isInteger(selected)||selected<0||selected>=q.options.length||answerRef.current[key]!==undefined)return false;
  if(guidedRef.current){const next=guidedAnswer(guidedRef.current,index,selected);if(next===guidedRef.current)return false;syncGuided(next)}
  answerRef.current={...answerRef.current,[key]:selected};setAnswers(answerRef.current);return true
 }
 function finish(turn:{input?:string;output?:string;hasValidOutput?:boolean}){
  if(!enabled)return;
  const input=turn.input||"",current=cardRef.current;
  const spoken=input.trim().match(/^(?:(?:option|answer|選項|答案)[ :：]*)?([a-d])[。.!！]?$/i);
  if(guidedRef.current){
   const stage=guidedRef.current;
   if(stage.explained&&current?.type==="quiz"&&spoken)answer(current,quizRef.current,spoken[1].toUpperCase().charCodeAt(0)-65);
   let next=guidedRef.current!;if(stage.explained&&turn.hasValidOutput===true)next=guidedAttempt(next,input);
   syncGuided(guidedExplained(next,turn.hasValidOutput===true));recordInlineEvent(gate.current,"guided-turn-complete");return;
  }
  if(current?.type==="quiz"&&spoken)answer(current,quizRef.current,spoken[1].toUpperCase().charCodeAt(0)-65);
  const next=finishInlineTurn(gate.current,input,turn.hasValidOutput===true,autoRef.current,Date.now(),(topic,output,manual,previous)=>backupCard(topic,output,manual,previous,inlineLessonLanguage(target)),turn.output||"");
  setDelivery(gate.current.outcome==="missing"?"missing":"idle");
  if(gate.current.outcome==="dismissed")clearCard();
  if(next)show(next)
 }
 function request(send:Send){
  if(!enabled||guidedRef.current)return false;
  gate.current.requested=true;recordInlineEvent(gate.current,"manual-request");
  const sent=send("[LEARNER WHITEBOARD REQUEST] Explain our current learning topic aloud, giving concrete examples. If there is a learning topic, CALL update_teaching_board now with one useful card before or during your spoken explanation. Do not merely describe the card; never say it has been displayed. If there is no learning topic yet, ask what I want to learn.");
  if(!sent){gate.current.requested=false;recordInlineEvent(gate.current,"manual-send-failed","send-failed")}
  setDelivery(sent?"pending":"missing");
  return sent
 }
 function navigate(index:number){quizRef.current=index;setQuizIndex(index)}
 return {
  enabled,available,delivery,auto,toggle,card,answers,quizIndex,navigate,close,reset,request,answer,finish,observe,report,diagnostics,guided,lessons,beginLesson,endLesson,nextLesson,submitPractice,
  policy:enabled?INLINE_BOARD_POLICY+"\nTeach "+target+"; use examples in this target language, not English unless English is the target. A guided lesson control from the app supersedes automatic board calls.":"",
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
  <header><strong>{board.guided?(english?board.guided.lesson.title:board.guided.lesson.zhTitle||board.guided.lesson.title):(english?"Teacher whiteboard":"老師的白板")}</strong><button type="button" disabled={Boolean(board.guided)&&!canSend} onClick={()=>board.guided?board.endLesson(send):board.close()} aria-label={board.guided?(english?"End lesson":"結束課程"):(english?"Close whiteboard":"收起白板")}>×</button></header>
  {board.guided&&<div className="inline-lesson-progress"><span>{english?"Stage":"教學階段"} {board.guided.index+1}/{board.guided.lesson.cards.length+1}</span><progress value={board.guided.index+1} max={board.guided.lesson.cards.length+1}/></div>}
  {board.delivery!=="idle"&&<div className="inline-board-delivery" role="status">{board.delivery==="pending"?(english?"Preparing a card…":"正在準備白板…"):(english?"No card was displayed. You can try again or keep speaking.":"這次沒有成功顯示教材，可以重試或繼續對話。")}{board.delivery==="missing"&&<button type="button" disabled={!canSend} onClick={()=>board.request(send)}>{english?"Try again":"重試"}</button>}</div>}
  {card&&<div className="inline-teacher-board-content"><TeachingCard key={card.id} card={card} answers={board.answers} english={english}
    quizIndex={board.quizIndex} focusIndex={card.type==="steps"?board.quizIndex:-1} onNavigate={board.navigate}
    onSpeakingSubmit={text=>{if(canSend)board.submitPractice(text,send)}}
    onAnswer={(c,i,selected)=>{if(!canSend)return;const q=c.questions[i];if(!q)return;if(board.guided){if(send("[GUIDED QUIZ ANSWER] "+JSON.stringify({question:q.question,selected:q.options[selected]})+". Give brief feedback, then wait for the next app-controlled stage."))board.answer(c,i,selected)}else if(board.answer(c,i,selected))send("[LEARNER QUIZ ANSWER] "+JSON.stringify({question:q.question,selected:q.options[selected]})+". Give brief feedback and continue the conversation.")}}
    onExplain={text=>{if(canSend)send("[LEARNER BOARD QUESTION] Please explain this board item: "+JSON.stringify(text))}}/></div>}
  {board.guided&&<div className="inline-lesson-footer"><button type="button" disabled={!canSend||!guidedCanAdvance(board.guided)} onClick={()=>board.nextLesson(send)}>{guidedPhase(board.guided)==="recap"?(english?"Finish lesson":"完成課程"):(english?"Next stage":"下一階段")}</button></div>}
 </section>
}

export function InlineTeacherBoardMenu({board,zh,send,canSend,onRequested}:{board:Board;zh:boolean;send:Send;canSend:boolean;onRequested:()=>void}){
 const [admin,setAdmin]=useState(false),[copyStatus,setCopyStatus]=useState("");
 useEffect(()=>{const controller=new AbortController();void fetch("/api/usage/admin",{credentials:"same-origin",cache:"no-store",signal:controller.signal}).then(async r=>r.ok?await r.json():null).then(v=>{if(!controller.signal.aborted)setAdmin(v?.admin===true)}).catch(()=>{});return()=>controller.abort()},[]);
 async function copyReport(){try{await navigator.clipboard.writeText(JSON.stringify(board.report(),null,2));setCopyStatus(zh?"已複製":"Copied")}catch{setCopyStatus(zh?"複製失敗":"Copy failed")}}
 if(!board.enabled&&!admin)return null;
 return <div className="teacher-live-entry-actions">{board.enabled&&<>{!board.guided&&board.lessons.length>0&&<label className="inline-lesson-picker"><span>{zh?"開始主題課程":"Start a guided lesson"}</span><select value="" disabled={!canSend} onChange={e=>{if(board.beginLesson(e.target.value,send))onRequested()}}><option value="" disabled>{zh?"選擇教材":"Choose a lesson"}</option>{board.lessons.map(l=><option key={l.id} value={l.id}>{zh?l.zhTitle||l.title:l.title}</option>)}</select></label>}{!board.available&&<small>{zh?"此連線未支援即時白板工具，部分教材仍可備援。":"Live whiteboard tool unavailable; some lesson cards remain available."}</small>}<button type="button" onClick={()=>{if(board.request(send))onRequested()}} disabled={!canSend||Boolean(board.guided)}>{zh?"請老師使用白板":"Ask for whiteboard"}</button><button type="button" aria-pressed={board.auto} onClick={board.toggle}>{zh?"自動白板":"Automatic whiteboard"}: {board.auto?(zh?"開":"On"):(zh?"關":"Off")}</button></>}{admin&&<><button type="button" onClick={()=>void copyReport()}>{zh?"複製白板診斷報告":"Copy whiteboard diagnostics"}</button>{copyStatus&&<small role="status">{copyStatus}</small>}</>}</div>
}
