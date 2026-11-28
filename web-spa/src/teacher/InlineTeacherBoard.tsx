import {useEffect,useRef,useState} from "react";
import {TeachingCard} from "./TeachingCard";
import {FriendCallControls} from "../friends/FriendCallControls";
import type {ReturnTypeOfLive} from "../live/types";
import type {BoardCard} from "./boardProtocol";
import {currentBuild} from "../runtime/buildUpdates";
import type {LiveToolDiagnostic} from "../lib/runtime";
import {backupCard} from "./inlineBoardFallback";
import {inlineLessonLanguage,inlineLessonsFor,findInlineLesson} from "./inlineLessonCatalog";
import {startGuidedLesson,guidedCard,guidedPhase,guidedAnswer,guidedAttempt,guidedExplained,guidedCanAdvance,advanceGuidedLesson,guidedPrompt,GUIDED_END_PROMPT,type GuidedSession} from "./inlineLessonEngine";
import {INLINE_TEACHER_BOARD_ENABLED,INLINE_BOARD_POLICY,INLINE_BOARD_TOOLS,newInlineGate,proposeInlineBoard,finishInlineTurn,dismissInlineBoard,observeInlineInput,recordInlineEvent,INLINE_FOCUS_FUNCTION,inlineFocusIndex,inlineModePrompt} from "./inlineBoardGate";
import "./teachingBoard.css";
import "./inlineTeacherBoard.css";

type Send=(text:string)=>boolean;
export function useInlineTeacherBoard(eligible:boolean,target="英文"){
 const enabled=INLINE_TEACHER_BOARD_ENABLED&&eligible;
 const gate=useRef(newInlineGate());
 const [mode,setModeState]=useState(false);
 const [focus,setFocus]=useState(-1);
 const modePending=useRef(false);
 const modeTouched=useRef(false);
 const modeRef=useRef(false);
 const [guided,setGuided]=useState<GuidedSession|null>(null);
 const guidedRef=useRef<GuidedSession|null>(null);
 const lessons=inlineLessonsFor(target);
 function syncGuided(next:GuidedSession|null){guidedRef.current=next;setGuided(next)}
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
  if(event.event==="setup-ack"){w.setupAcknowledged++;w.setupTools=event.tools.filter(name=>name==="update_teaching_board"||name==="show_learning_feedback"||name===INLINE_FOCUS_FUNCTION);recordInlineEvent(gate.current,"setup-ack");}
  else{const kind=event.name==="update_teaching_board"?"whiteboard":event.name==="show_learning_feedback"?"learningFeedback":"other";w.received[kind]++;recordInlineEvent(gate.current,"received-"+kind)}
 }
 useEffect(()=>{if(card&&mode){rendered.current++;recordInlineEvent(gate.current,"card-react-committed")}},[card,mode]);
 function clearCard(){setFocus(-1);cardRef.current=null;setCard(null);answerRef.current={};setAnswers({});quizRef.current=0;setQuizIndex(0)}
 function reset(){modeRef.current=false;modePending.current=false;modeTouched.current=false;setModeState(false);syncGuided(null);gate.current=newInlineGate();rendered.current=0;wire.current={model:"",setupAcknowledged:0,setupTools:[],received:{whiteboard:0,learningFeedback:0,other:0}};clearCard();setAvailable(true);setDelivery("idle")}
 function setMode(next:boolean){
  if(!enabled||modeRef.current===next)return;
  modeRef.current=next;setModeState(next);modePending.current=true;modeTouched.current=true;
  gate.current.requested=false;gate.current.input="";gate.current.shownThisTurn=false;
  setDelivery("idle");recordInlineEvent(gate.current,next?"mode-on":"mode-off");
 }
 function syncMode(send:Send){
  if(!enabled||!modePending.current)return;
  const lesson=guidedRef.current;
  const prompt=modeRef.current&&lesson
   ?"[APP WHITEBOARD MODE ON — RESUME PAUSED LESSON] Resume the existing stage; do not restart or advance. "+guidedPrompt(lesson,target)+(lesson.total?" The learner has already submitted "+lesson.total+" quiz answer(s) in this lesson. Respect the saved progress.":"")
   :inlineModePrompt(modeRef.current);
  if(send(prompt)){modePending.current=false;recordInlineEvent(gate.current,"mode-control-sent")}
 }
 function recover(){if(modeTouched.current)modePending.current=true}
 function close(){setMode(false)}
 function unavailable(){recordInlineEvent(gate.current,"tools-unavailable","model-tools-unavailable");setAvailable(false)}
 function observe(input:string){if(enabled&&modeRef.current&&!modePending.current)observeInlineInput(gate.current,input)}
 function show(next:BoardCard){clearCard();cardRef.current=next;setCard(next);setDelivery("idle")}
 function tool(call:{name:string;args?:unknown}){
  if(!enabled)return {ok:false,error:"disabled"};
  if(!modeRef.current||modePending.current){recordInlineEvent(gate.current,"tool-rejected","mode-off-or-pending");return {ok:false,error:"whiteboard-mode-off-or-pending"}}
  if(call.name===INLINE_FOCUS_FUNCTION){
   const index=inlineFocusIndex(cardRef.current,call.args);
   if(index===null)return {ok:false,error:"invalid-focus"};
   setFocus(index);recordInlineEvent(gate.current,"item-focused");return {ok:true,index};
  }
  if(guidedRef.current){recordInlineEvent(gate.current,"tool-rejected","guided-curriculum");return {ok:false,error:"guided-curriculum"}}
  const result=proposeInlineBoard(gate.current,call,modeRef.current);
  if(result.card){show(result.card);return {ok:true,accepted:true,displayRequested:true,cardId:result.card.id}}
  return {ok:false,error:result.error||"rejected"};
 }
 function report(){const g=gate.current;return {schema:2,model:wire.current.model,setupAcknowledged:wire.current.setupAcknowledged,setupTools:wire.current.setupTools,receivedTools:wire.current.received,build:currentBuild.buildId,commit:currentBuild.commit,enabled,mode:modeRef.current,modePending:modePending.current,guidedStage:guidedRef.current?.index??null,toolConfigured:enabled,toolsUnavailable:!available,toolCalls:g.toolCalls,validCards:g.validCards,accepted:g.accepted,reactCommits:rendered.current,fallbacks:g.fallbacks,completedTurns:g.completedTurns,lastReason:g.lastReason,reasons:g.reasons,events:g.events,cardPresent:Boolean(cardRef.current),delivery};}
 function beginLesson(id:string,send:Send){
  const lesson=findInlineLesson(target,id);if(!enabled||!lesson||guidedRef.current)return false;
  const next=startGuidedLesson(lesson);if(!send("[APP WHITEBOARD MODE ON — GUIDED LESSON] "+guidedPrompt(next,target)))return false;
  modeTouched.current=true;modeRef.current=true;setModeState(true);modePending.current=false;syncGuided(next);show(guidedCard(next));recordInlineEvent(gate.current,"guided-start");return true;
 }
 function endLesson(send:Send){if(!guidedRef.current||!send(GUIDED_END_PROMPT+" Whiteboard mode remains ON; use it for future substantive teaching questions, not for this ending."))return false;syncGuided(null);clearCard();setDelivery("idle");recordInlineEvent(gate.current,"guided-end");return true}
 function nextLesson(send:Send){const current=guidedRef.current;if(!current||!modeRef.current||modePending.current)return false;if(guidedPhase(current)==="recap"&&guidedCanAdvance(current))return endLesson(send);
  const next=advanceGuidedLesson(current);if(!next||!send(guidedPrompt(next,target)))return false;
  syncGuided(next);show(guidedCard(next));recordInlineEvent(gate.current,"guided-next");return true;
 }
 function submitPractice(text:string,send:Send){const current=guidedRef.current;if(!current||!modeRef.current||modePending.current||guidedPhase(current)!=="practice"||!text.trim()||!send("[GUIDED PRACTICE ANSWER] "+JSON.stringify(text.slice(0,640))+". Give brief feedback, then wait."))return false;
  syncGuided(guidedAttempt(current,text));return true;
 }
 function answer(c:BoardCard,index:number,selected:number){
  const q=c.questions[index],key=c.id+":"+index;
  if(!modeRef.current||modePending.current||c!==cardRef.current||!q||!Number.isInteger(selected)||selected<0||selected>=q.options.length||answerRef.current[key]!==undefined)return false;
  if(guidedRef.current){const next=guidedAnswer(guidedRef.current,index,selected);if(next===guidedRef.current)return false;syncGuided(next)}
  answerRef.current={...answerRef.current,[key]:selected};setAnswers(answerRef.current);return true
 }
 function finish(turn:{input?:string;output?:string;hasValidOutput?:boolean}){
  if(!enabled)return;
  if(!modeRef.current||modePending.current){gate.current.input="";gate.current.requested=false;gate.current.shownThisTurn=false;gate.current.completedTurns++;return}
  const input=turn.input||"",current=cardRef.current;
  const spoken=input.trim().match(/^(?:(?:option|answer|選項|答案)[ :：]*)?([a-d])[。.!！]?$/i);
  if(guidedRef.current){
   const stage=guidedRef.current;
   if(stage.explained&&current?.type==="quiz"&&spoken)answer(current,quizRef.current,spoken[1].toUpperCase().charCodeAt(0)-65);
   let next=guidedRef.current!;if(stage.explained&&turn.hasValidOutput===true)next=guidedAttempt(next,input);
   syncGuided(guidedExplained(next,turn.hasValidOutput===true));recordInlineEvent(gate.current,"guided-turn-complete");return;
  }
  if(current?.type==="quiz"&&spoken)answer(current,quizRef.current,spoken[1].toUpperCase().charCodeAt(0)-65);
  const next=finishInlineTurn(gate.current,input,turn.hasValidOutput===true,modeRef.current,Date.now(),(topic,output,manual,previous)=>backupCard(topic,output,manual,previous,inlineLessonLanguage(target)),turn.output||"");
  setDelivery(gate.current.outcome==="missing"?"missing":"idle");
  if(gate.current.outcome==="dismissed")setMode(false);
  if(next)show(next)
 }
 function request(send:Send){
  if(!enabled||!modeRef.current||modePending.current||guidedRef.current)return false;
  gate.current.requested=true;recordInlineEvent(gate.current,"manual-request");
  const sent=send("[LEARNER WHITEBOARD REQUEST] Explain our current learning topic aloud, giving concrete examples. If there is a learning topic, CALL update_teaching_board now with one useful card before or during your spoken explanation. Do not merely describe the card; never say it has been displayed. If there is no learning topic yet, ask what I want to learn.");
  if(!sent){gate.current.requested=false;recordInlineEvent(gate.current,"manual-send-failed","send-failed")}
  setDelivery(sent?"pending":"missing");
  return sent
 }
 function navigate(index:number){quizRef.current=index;setQuizIndex(index);if(cardRef.current?.type==="steps")setFocus(index)}
 return {
  enabled,available,delivery,mode,setMode,syncMode,recover,focus,card,answers,quizIndex,navigate,close,reset,request,answer,finish,observe,report,diagnostics,guided,lessons,beginLesson,endLesson,nextLesson,submitPractice,
  policy:enabled?INLINE_BOARD_POLICY+"\nTeach "+target+"; use examples in this target language, not English unless English is the target. A guided lesson control from the app supersedes automatic board generation; focus calls remain available while the board is ON.":"",
  tools:enabled?INLINE_BOARD_TOOLS:undefined,
  onToolCall:tool,
  onToolsUnavailable:unavailable
 };
}
type Board=ReturnType<typeof useInlineTeacherBoard>;
export function InlineTeacherBoard({board,english,send,canSend}:{board:Board;english:boolean;send:Send;canSend:boolean}){
 const card=board.card;
 const scroll=useRef<HTMLDivElement>(null);
 const followingRef=useRef(true);
 const [following,setFollowing]=useState(true);
 const touchStart=useRef<number|null>(null);
 function follow(next:boolean){followingRef.current=next;setFollowing(next)}
 function position(){const el=scroll.current;if(!el||!board.mode)return;const item=el.querySelector<HTMLElement>(".is-highlighted");const top=item?el.scrollTop+item.getBoundingClientRect().top-el.getBoundingClientRect().top-8:0;el.scrollTo({top:Math.max(0,top),behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})}
 useEffect(()=>{if(board.mode&&followingRef.current)position()},[card,board.focus,board.mode]);
 if(!board.enabled||(!board.mode&&!card))return null;
 return <section hidden={!board.mode} className="inline-teacher-board" aria-label={english?"Teacher whiteboard":"老師的白板"}>
  <header><strong>{board.guided?(english?board.guided.lesson.title:board.guided.lesson.zhTitle||board.guided.lesson.title):(english?"Teacher whiteboard":"老師的白板")}</strong><button type="button" onClick={board.close} aria-label={english?"Hide whiteboard":"收起白板"}>×</button></header>
  {board.guided&&<div className="inline-lesson-progress"><span>{english?"Stage":"教學階段"} {board.guided.index+1}/{board.guided.lesson.cards.length+1}</span><progress value={board.guided.index+1} max={board.guided.lesson.cards.length+1}/></div>}
  {board.delivery!=="idle"&&<div className="inline-board-delivery" role="status">{board.delivery==="pending"?(english?"Preparing a card…":"正在準備白板…"):(english?"No card was displayed. You can try again or keep speaking.":"這次沒有成功顯示教材，可以重試或繼續對話。")}{board.delivery==="missing"&&<button type="button" disabled={!canSend} onClick={()=>board.request(send)}>{english?"Try again":"重試"}</button>}</div>}
  {!card&&board.delivery==="idle"&&<div className="inline-board-delivery">{english?"Ask the teacher a question to start visual teaching.":"問老師想學的內容，老師會搭配白板教學。"}<button type="button" disabled={!canSend} onClick={()=>board.request(send)}>{english?"Show material":"展示教材"}</button></div>}
  {card&&!following&&<button className="inline-board-follow" type="button" onClick={()=>{follow(true);position()}}>{english?"Follow teacher":"跟隨老師"}</button>}
  {card&&<div ref={scroll} className="inline-teacher-board-content" tabIndex={0} onWheel={()=>follow(false)} onTouchStart={e=>{touchStart.current=e.touches[0]?.clientY??null}} onTouchMove={e=>{if(touchStart.current!==null&&Math.abs((e.touches[0]?.clientY??touchStart.current)-touchStart.current)>8)follow(false)}} onTouchEnd={()=>{touchStart.current=null}} onKeyDown={e=>{if(["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"," "].includes(e.key))follow(false)}} onPointerDown={e=>{if(e.pointerType==="mouse"&&e.clientX>=e.currentTarget.getBoundingClientRect().right-18)follow(false)}}><TeachingCard key={card.id} card={card} answers={board.answers} english={english}
    quizIndex={board.quizIndex} focusIndex={board.focus>=0?board.focus:card.type==="steps"?board.quizIndex:-1} onNavigate={board.navigate}
    onSpeakingSubmit={text=>{if(canSend)board.submitPractice(text,send)}}
    onAnswer={(c,i,selected)=>{if(!canSend)return;const q=c.questions[i];if(!q)return;if(board.guided){if(send("[GUIDED QUIZ ANSWER] "+JSON.stringify({question:q.question,selected:q.options[selected]})+". Give brief feedback, then wait for the next app-controlled stage."))board.answer(c,i,selected)}else if(board.answer(c,i,selected))send("[LEARNER QUIZ ANSWER] "+JSON.stringify({question:q.question,selected:q.options[selected]})+". Give brief feedback and continue the conversation.")}}
    onExplain={text=>{if(canSend)send("[LEARNER BOARD QUESTION] Please explain this board item: "+JSON.stringify(text))}}/></div>}
  {board.guided&&<div className="inline-lesson-footer"><button className="inline-lesson-end" type="button" disabled={!canSend} onClick={()=>board.endLesson(send)}>{english?"End lesson":"結束課程"}</button><button type="button" disabled={!canSend||!guidedCanAdvance(board.guided)} onClick={()=>board.nextLesson(send)}>{guidedPhase(board.guided)==="recap"?(english?"Finish lesson":"完成課程"):(english?"Next stage":"下一階段")}</button></div>}
 </section>
}

export function InlineTeacherBoardMenu({board,zh,send,canSend,onRequested}:{board:Board;zh:boolean;send:Send;canSend:boolean;onRequested:()=>void}){
 const [admin,setAdmin]=useState(false),[copyStatus,setCopyStatus]=useState("");
 useEffect(()=>{const controller=new AbortController();void fetch("/api/usage/admin",{credentials:"same-origin",cache:"no-store",signal:controller.signal}).then(async r=>r.ok?await r.json():null).then(v=>{if(!controller.signal.aborted)setAdmin(v?.admin===true)}).catch(()=>{});return()=>controller.abort()},[]);
 async function copyReport(){try{await navigator.clipboard.writeText(JSON.stringify(board.report(),null,2));setCopyStatus(zh?"已複製":"Copied")}catch{setCopyStatus(zh?"複製失敗":"Copy failed")}}
 if(!board.enabled&&!admin)return null;
 return <div className="teacher-live-entry-actions">{board.enabled&&<>{!board.guided&&board.lessons.length>0&&<label className="inline-lesson-picker"><span>{zh?"開始主題課程":"Start a guided lesson"}</span><select value="" disabled={!canSend} onChange={e=>{if(board.beginLesson(e.target.value,send))onRequested()}}><option value="" disabled>{zh?"選擇教材":"Choose a lesson"}</option>{board.lessons.map(l=><option key={l.id} value={l.id}>{zh?l.zhTitle||l.title:l.title}</option>)}</select></label>}{!board.available&&<small>{zh?"此連線未支援即時白板工具，部分教材仍可備援。":"Live whiteboard tool unavailable; some lesson cards remain available."}</small>}</>}{admin&&<><button type="button" onClick={()=>void copyReport()}>{zh?"複製白板診斷報告":"Copy whiteboard diagnostics"}</button>{copyStatus&&<small role="status">{copyStatus}</small>}</>}</div>
}

// Teacher-only accessory; FriendCallControls keeps its existing behavior without it.
export function BoardCallControls({board,live,onEnd,zh}:{board:Board;live:ReturnTypeOfLive;onEnd:()=>void|Promise<unknown>;zh:boolean}){
 const ready=live.state==="listening"&&!live.openingProtected;
 useEffect(()=>{if(live.state==="connecting")board.recover();if(ready)board.syncMode(live.sendControl)},[ready,board.mode,live.state]);
 return <FriendCallControls live={live} onEnd={onEnd} accessory={board.enabled?<button type="button" className="friend-phone-button inline-board-mode-button" aria-pressed={board.mode} aria-label={zh?(board.mode?"關閉白板模式":"開啟白板模式"):(board.mode?"Turn whiteboard off":"Turn whiteboard on")} disabled={!board.mode&&!ready} onClick={()=>board.setMode(!board.mode)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21l4-5 4 5M7 7h10M7 11h7"/></svg><small>{zh?"白板":"Board"}</small></button>:undefined}/>;
}
