import {useEffect,useRef,useState,type ReactNode} from "react";
import {TeachingCard} from "./TeachingCard";
import {appendVisualReply,sealVisualReplies,updateVisualReply,discardPendingVisualReplies,visualRepliesAt,type VisualReply} from "./visualReplyJournal";
import type {BoardCard} from "./boardProtocol";
import {currentBuild} from "../runtime/buildUpdates";
import type {LiveToolDiagnostic} from "../lib/runtime";
import {backupCard} from "./inlineBoardFallback";
import {teacherReplyTemplates,type TeacherReplyTemplate} from "./teacherReplyTemplates";
import {inlineLessonLanguage,inlineLessonsFor,findInlineLesson} from "./inlineLessonCatalog";
import {startGuidedLesson,guidedCard,guidedPhase,guidedAnswer,guidedAttempt,guidedExplained,guidedCanAdvance,advanceGuidedLesson,guidedPrompt,GUIDED_END_PROMPT,type GuidedSession} from "./inlineLessonEngine";
import {INLINE_TEACHER_BOARD_ENABLED,INLINE_BOARD_POLICY,INLINE_BOARD_TOOLS,newInlineGate,proposeInlineBoard,finishInlineTurn,observeInlineInput,recordInlineEvent,INLINE_FOCUS_FUNCTION,inlineFocusIndex} from "./inlineBoardGate";
import "./teachingBoard.css";
import "./inlineTeacherBoard.css";

type Send=(text:string)=>boolean;
export function useInlineTeacherBoard(eligible:boolean,target="英文"){
 const enabled=INLINE_TEACHER_BOARD_ENABLED&&eligible;
 const gate=useRef(newInlineGate());
 const [focus,setFocus]=useState(-1);
 const [guided,setGuided]=useState<GuidedSession|null>(null);
 const guidedRef=useRef<GuidedSession|null>(null);
 const lessons=inlineLessonsFor(target);
 function syncGuided(next:GuidedSession|null){guidedRef.current=next;setGuided(next)}
 const [card,setCard]=useState<BoardCard|null>(null);
 const [journal,setJournal]=useState<VisualReply[]>([]);
 const [latestReplyTurn,setLatestReplyTurn]=useState<number|null>(null);
 const entryRef=useRef(0),activeEntry=useRef<number|null>(null);
 const journalRef=useRef<VisualReply[]>([]);
 function publish(entries:VisualReply[]){journalRef.current=entries;setJournal(entries)}
 const [available,setAvailable]=useState(true);
 const [delivery,setDelivery]=useState<"idle"|"pending"|"missing">("idle");
 const [missingTurn,setMissingTurn]=useState<number|null>(null);
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
 const committed=useRef(new Set<number>());
 function markRendered(id:number){if(committed.current.has(id))return;committed.current.add(id);rendered.current++;recordInlineEvent(gate.current,"card-react-committed")}
 function clearCard(){activeEntry.current=null;setFocus(-1);cardRef.current=null;setCard(null);answerRef.current={};setAnswers({});quizRef.current=0;setQuizIndex(0)}
 function reset(){publish([]);setLatestReplyTurn(null);entryRef.current=0;committed.current.clear();setMissingTurn(null);syncGuided(null);gate.current=newInlineGate();rendered.current=0;wire.current={model:"",setupAcknowledged:0,setupTools:[],received:{whiteboard:0,learningFeedback:0,other:0}};clearCard();setAvailable(true);setDelivery("idle")}
 function recover(){discardInterrupted()}
 function discardInterrupted(){const keep=guidedRef.current?activeEntry.current:null;const entries=discardPendingVisualReplies(journalRef.current,keep);if(entries.length===journalRef.current.length)return;gate.current.shownThisTurn=false;publish(entries);if(!entries.some(e=>e.id===activeEntry.current))clearCard()}
 useEffect(()=>{window.addEventListener("crew-friend-call-interrupt",discardInterrupted);return()=>window.removeEventListener("crew-friend-call-interrupt",discardInterrupted)},[]);
 function unavailable(){recordInlineEvent(gate.current,"tools-unavailable","model-tools-unavailable");setAvailable(false)}
 function observe(input:string){if(enabled){if(input.trim()&&!gate.current.input)setFocus(-1);observeInlineInput(gate.current,input)}}
 function show(next:BoardCard){clearCard();const id=++entryRef.current;activeEntry.current=id;publish(appendVisualReply(journalRef.current,id,next));cardRef.current=next;setCard(next);setDelivery("idle")}
 function tool(call:{name:string;args?:unknown}){
  if(!enabled)return {ok:false,error:"disabled"};
  if(call.name===INLINE_FOCUS_FUNCTION){
   const index=inlineFocusIndex(cardRef.current,call.args);
   if(index===null)return {ok:false,error:"invalid-focus"};
   setFocus(index);recordInlineEvent(gate.current,"item-focused");return {ok:true,index};
  }
  if(guidedRef.current){recordInlineEvent(gate.current,"tool-rejected","guided-curriculum");return {ok:false,error:"guided-curriculum"}}
  const result=proposeInlineBoard(gate.current,call,enabled);
  if(result.card){show(result.card);return {ok:true,accepted:true,displayRequested:true,cardId:result.card.id}}
  return {ok:false,error:result.error||"rejected"};
 }
 function report(){const g=gate.current;return {schema:3,model:wire.current.model,setupAcknowledged:wire.current.setupAcknowledged,setupTools:wire.current.setupTools,receivedTools:wire.current.received,build:currentBuild.buildId,commit:currentBuild.commit,enabled,mode:enabled,guidedStage:guidedRef.current?.index??null,toolConfigured:enabled,toolsUnavailable:!available,toolCalls:g.toolCalls,validCards:g.validCards,accepted:g.accepted,reactCommits:rendered.current,fallbacks:g.fallbacks,completedTurns:g.completedTurns,lastReason:g.lastReason,reasons:g.reasons,events:g.events,cardPresent:Boolean(cardRef.current),visualReplies:journalRef.current.length,delivery};}
 function beginLesson(id:string,send:Send){
  const lesson=findInlineLesson(target,id);if(!enabled||!lesson||guidedRef.current)return false;
  const next=startGuidedLesson(lesson);if(!send(guidedPrompt(next,target)))return false;
  syncGuided(next);show(guidedCard(next));recordInlineEvent(gate.current,"guided-start");return true;
 }
 function endLesson(send:Send){if(!guidedRef.current||!send(GUIDED_END_PROMPT+" Use visual teaching for future substantive questions, not for this ending."))return false;syncGuided(null);clearCard();setDelivery("idle");recordInlineEvent(gate.current,"guided-end");return true}
 function nextLesson(send:Send){const current=guidedRef.current;if(!current||!enabled)return false;if(guidedPhase(current)==="recap"&&guidedCanAdvance(current))return endLesson(send);
  const next=advanceGuidedLesson(current);if(!next||!send(guidedPrompt(next,target)))return false;
  syncGuided(next);show(guidedCard(next));recordInlineEvent(gate.current,"guided-next");return true;
 }
 function submitPractice(text:string,send:Send){const current=guidedRef.current;if(!current||!enabled||guidedPhase(current)!=="practice"||!text.trim()||!send("[GUIDED PRACTICE ANSWER] "+JSON.stringify(text.slice(0,640))+". Give brief feedback, then wait."))return false;
  syncGuided(guidedAttempt(current,text));return true;
 }
 function answer(c:BoardCard,index:number,selected:number){
  const q=c.questions[index],key=c.id+":"+index;
  if(!enabled||c!==cardRef.current||!q||!Number.isInteger(selected)||selected<0||selected>=q.options.length||answerRef.current[key]!==undefined)return false;
  if(guidedRef.current){const next=guidedAnswer(guidedRef.current,index,selected);if(next===guidedRef.current)return false;syncGuided(next)}
  answerRef.current={...answerRef.current,[key]:selected};setAnswers(answerRef.current);if(activeEntry.current!==null)publish(updateVisualReply(journalRef.current,activeEntry.current,{answers:answerRef.current}));return true
 }
 function finishTurn(turn:{input?:string;output?:string;hasValidOutput?:boolean}){
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
  const next=finishInlineTurn(gate.current,input,turn.hasValidOutput===true,enabled,Date.now(),(topic,output,manual,previous)=>backupCard(topic,output,manual,previous,inlineLessonLanguage(target)),turn.output||"");
  setDelivery(gate.current.outcome==="missing"?"missing":"idle");
  if(next)show(next)
 }
 function finish(turn:{input?:string;output?:string;hasValidOutput?:boolean},captionIndex:number|null){
  finishTurn(turn);
  gate.current.input="";
  if(captionIndex!==null&&(turn.output?.trim()||turn.hasValidOutput)){setLatestReplyTurn(captionIndex);if(journalRef.current.some(e=>e.turn===null))publish(sealVisualReplies(journalRef.current,captionIndex))}
  else if(!turn.hasValidOutput)discardInterrupted();
  setMissingTurn(gate.current.outcome==="missing"?captionIndex:null);
 }
 function request(send:Send){
  if(!enabled||guidedRef.current)return false;
  gate.current.requested=true;setMissingTurn(null);recordInlineEvent(gate.current,"manual-request");
  const sent=send("[LEARNER WHITEBOARD REQUEST] Explain our current learning topic aloud, giving concrete examples. If there is a learning topic, CALL update_teaching_board now with one useful card before or during your spoken explanation. Do not merely describe the card; never say it has been displayed. If there is no learning topic yet, ask what I want to learn.");
  if(!sent){gate.current.requested=false;recordInlineEvent(gate.current,"manual-send-failed","send-failed")}
  setDelivery(sent?"pending":"missing");
  return sent
 }
 function navigate(index:number){quizRef.current=index;setQuizIndex(index);if(activeEntry.current!==null)publish(updateVisualReply(journalRef.current,activeEntry.current,{quizIndex:index}));if(cardRef.current?.type==="steps")setFocus(index)}
 return {
  enabled,available,delivery,missingTurn,recover,focus,card,journal,latestReplyTurn,activeEntry:activeEntry.current,answers,quizIndex,navigate,reset,markRendered,request,answer,finish,observe,report,diagnostics,guided,lessons,beginLesson,endLesson,nextLesson,submitPractice,
  policy:enabled?INLINE_BOARD_POLICY+"\nTeach "+target+"; use examples in this target language, not English unless English is the target. A guided lesson control from the app supersedes automatic board generation; focus calls remain available.":"",
  tools:enabled?INLINE_BOARD_TOOLS:undefined,
  onToolCall:tool,
  onToolsUnavailable:unavailable
 };
}
type Board=ReturnType<typeof useInlineTeacherBoard>;
/** The caption thread owns scrolling. No separate whiteboard pane or nested scroller. */
function VisualReplyCard({entryId,board,current,children}:{entryId:number;board:Board;current:boolean;children:ReactNode}){
 useEffect(()=>{board.markRendered(entryId)},[entryId]);
 return <div className="teacher-visual-reply" data-visual-current={current?"true":undefined}>{children}</div>;
}
export function VisualReplyContent({board,english,send,canSend,turn,template}:{board:Board;english:boolean;send:Send;canSend:boolean;turn:number|"stream";template?:TeacherReplyTemplate}){
 if(!board.enabled)return null;
 const entries=visualRepliesAt(board.journal,turn);
 const active=(entry:VisualReply)=>entry.id===board.activeEntry;
 const activeCard=board.journal.find(active);
 const controlTurn=activeCard?.turn===null?"stream":board.latestReplyTurn??activeCard?.turn;
 return <>
  {!entries.length&&template?.kind==="material"&&template.source==="caption"&&<div className="teacher-visual-reply" data-visual-source="caption"><TeachingCard card={template.card} answers={{}} english={english} onAnswer={()=>{}} onExplain={text=>{if(canSend)send("[LEARNER MATERIAL QUESTION] Please explain this item: "+JSON.stringify(text))}} readOnly disabled/></div>}
  {entries.map(entry=>{
   const current=active(entry),card=entry.card,interactive=current&&canSend;
   return <VisualReplyCard key={entry.id} entryId={entry.id} board={board} current={current}>
    {current&&board.guided&&<div className="inline-lesson-progress"><span>{english?"Stage":"教學階段"} {board.guided.index+1}/{board.guided.lesson.cards.length+1}</span><progress value={board.guided.index+1} max={board.guided.lesson.cards.length+1}/></div>}
    <TeachingCard card={card} answers={entry.answers} english={english}
     quizIndex={entry.quizIndex} focusIndex={current?board.focus:-1}
     onNavigate={current?board.navigate:undefined}
     onSpeakingSubmit={text=>{if(interactive)board.submitPractice(text,send)}}
     onAnswer={(c,i,selected)=>{if(!interactive)return;const q=c.questions[i];if(!q)return;if(board.guided){if(send("[GUIDED QUIZ ANSWER] "+JSON.stringify({question:q.question,selected:q.options[selected]})+". Give brief feedback, then wait."))board.answer(c,i,selected)}else if(board.answer(c,i,selected))send("[LEARNER QUIZ ANSWER] "+JSON.stringify({question:q.question,selected:q.options[selected]})+". Give brief feedback.")}}
     onExplain={text=>{if(canSend)send("[LEARNER MATERIAL QUESTION] Please explain this item: "+JSON.stringify(text))}}
     readOnly={!current} disabled={!interactive}/>

   </VisualReplyCard>;
  })}
  {turn===controlTurn&&board.guided&&<div className="inline-lesson-footer"><button className="inline-lesson-end" type="button" disabled={!canSend} onClick={()=>board.endLesson(send)}>{english?"End lesson":"結束課程"}</button><button type="button" disabled={!canSend||!guidedCanAdvance(board.guided)} onClick={()=>board.nextLesson(send)}>{guidedPhase(board.guided)==="recap"?(english?"Finish lesson":"完成課程"):(english?"Next stage":"下一階段")}</button></div>}
  {template?.kind==="missing"&&!(board.delivery==="missing"&&turn===(board.missingTurn??"stream"))&&<div className="inline-board-delivery" role="status">{english?"The teacher did not provide usable material for this reply.":"這則回覆未產生可用教材。"}<button type="button" disabled={!canSend} onClick={()=>board.request(send)}>{english?"Try again":"重試"}</button></div>}
  {template?.kind!=="material"&&turn===(board.delivery==="missing"?board.missingTurn??"stream":"stream")&&board.delivery!=="idle"&&<div className="inline-board-delivery" role="status">{board.delivery==="pending"?(english?"Preparing material…":"正在準備教材…"):(english?"No material was generated.":"這次沒有產生教材。")}{board.delivery==="missing"&&<button type="button" disabled={!canSend} onClick={()=>board.request(send)}>{english?"Try again":"重試"}</button>}</div>}
 </>;
}

export function visualReplyProps(board:Board,english:boolean,send:Send,canSend:boolean,turns:ReadonlyArray<{input?:string;output?:string}>,input:string,output:string,target:string){
 if(!board.enabled)return undefined;
 const templates=teacherReplyTemplates(turns,{input,output},board.journal,inlineLessonLanguage(target),Boolean(board.guided));
 const keys:Array<number|"stream">=Array.from(templates).filter(([,v])=>v.kind!=="text").map(([key])=>key);
 for(const entry of board.journal)if(!keys.includes(entry.turn??"stream"))keys.push(entry.turn??"stream");
 if(board.delivery!=="idle")keys.push(board.delivery==="missing"?board.missingTurn??"stream":"stream");
 const activeCard=board.journal.find(e=>e.id===board.activeEntry);
 if(board.guided&&activeCard&&activeCard.turn!==null&&board.latestReplyTurn!==null)keys.push(board.latestReplyTurn);
 return {keys,kind:(turn:number|"stream")=>templates.get(turn)?.kind??"text",revision:JSON.stringify([board.journal.map(e=>[e.id,e.turn,e.quizIndex,e.answers]),Array.from(templates).filter(([,v])=>v.kind!=="text").map(([key,v])=>[key,v.kind,v.kind==="material"?v.card:null]),board.delivery,board.missingTurn,board.guided?.index,board.guided?.explained,board.guided?.attempted,board.latestReplyTurn]),focusKey:board.focus>=0&&board.activeEntry!==null?board.activeEntry+":"+board.focus:"",render:(turn:number|"stream")=><VisualReplyContent board={board} english={english} send={send} canSend={canSend} turn={turn} template={templates.get(turn)}/>};
}

export function InlineTeacherBoardMenu({board,zh,send,canSend,onRequested}:{board:Board;zh:boolean;send:Send;canSend:boolean;onRequested:()=>void}){
 const [admin,setAdmin]=useState(false),[copyStatus,setCopyStatus]=useState("");
 useEffect(()=>{const controller=new AbortController();void fetch("/api/usage/admin",{credentials:"same-origin",cache:"no-store",signal:controller.signal}).then(async r=>r.ok?await r.json():null).then(v=>{if(!controller.signal.aborted)setAdmin(v?.admin===true)}).catch(()=>{});return()=>controller.abort()},[]);
 async function copyReport(){try{await navigator.clipboard.writeText(JSON.stringify(board.report(),null,2));setCopyStatus(zh?"已複製":"Copied")}catch{setCopyStatus(zh?"複製失敗":"Copy failed")}}
 if(!board.enabled&&!admin)return null;
 return <div className="teacher-live-entry-actions">{board.enabled&&<>{!board.guided&&board.lessons.length>0&&<label className="inline-lesson-picker"><span>{zh?"開始主題課程":"Start a guided lesson"}</span><select value="" disabled={!canSend} onChange={e=>{if(board.beginLesson(e.target.value,send))onRequested()}}><option value="" disabled>{zh?"選擇教材":"Choose a lesson"}</option>{board.lessons.map(l=><option key={l.id} value={l.id}>{zh?l.zhTitle||l.title:l.title}</option>)}</select></label>}{!board.available&&<small>{zh?"此連線未支援即時白板工具，部分教材仍可備援。":"Live whiteboard tool unavailable; some lesson cards remain available."}</small>}</>}{admin&&<><button type="button" onClick={()=>void copyReport()}>{zh?"複製白板診斷報告":"Copy whiteboard diagnostics"}</button>{copyStatus&&<small role="status">{copyStatus}</small>}</>}</div>
}

