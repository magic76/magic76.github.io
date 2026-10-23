import {useEffect,useMemo,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {useLiveSession} from "../live/useLiveSession";
import {LiveControls} from "../live/LiveControls";
import {geminiKey,vocabularyLevel} from "../lib/runtime";
import {GeminiSetupNotice} from "../components/GeminiSetupNotice";
import {getTeacherProfile} from "./teacherProfiles";
import {TeacherAvatar} from "./TeacherAvatar";
import {buildTeacherSessionPolicy} from "./teacherPolicy";
import {teacherLanguageReminder,unexpectedTeacherKorean} from "./teacherLanguage";
import {normalizeLiveVoice,voiceIdentityPrompt} from "../live/voiceIdentity";
import {effectiveSpeakingLevel} from "./speakingLevelMemory";
import {personalMemoryEnabled} from "./studentMemory";
import {boardNotes,BOARD_FUNCTION,BOARD_TOOLS,applyBoardPatch,fallbackBoard,validateBoardPatch,type BoardCard,type BoardPatch} from "./boardProtocol";
import {TeachingCard,cardKindName} from "./TeachingCard";
import "./teachingBoard.css";

const speakingStates=["requesting-mic","connecting","listening","speaking","ending","reporting"];
const letterIndex=(spoken:string):number=>{
 const match=spoken.match(/(?:第\s*[一二三123]\s*題\s*(?:我\s*)?(?:選擇?|答案\s*是|是)?|(?:answer|答案|我選|選擇))\s*[，,.:：]?\s*([ABCD])/i);
 return match?match[1].toUpperCase().charCodeAt(0)-65:-1;
};
export function TeacherBoardPage(){
 const {t,i18n}=useTranslation("teacher");
 const s=useTeacherStore();
 const profile=getTeacherProfile(s.teacherProfile);
 const level=effectiveSpeakingLevel(s.targetLanguage,s.learnerSpeakingLevel,personalMemoryEnabled());
 const [cards,setCards]=useState<BoardCard[]>([]);
 const [answers,setAnswers]=useState<Record<string,number>>({});
 const [notesOpen,setNotesOpen]=useState(false);
 const [hint,setHint]=useState("");
 const [copyStatus,setCopyStatus]=useState("");
 const [hasLivePatch,setHasLivePatch]=useState(false);
 const [toolsUnavailable,setToolsUnavailable]=useState(false);
 const [latestId,setLatestId]=useState<string|null>(null);
 const [focusedId,setFocusedId]=useState<string|null>(null);
 const [following,setFollowing]=useState(true);
 const [revision,setRevision]=useState(0);
 const stageRef=useRef<HTMLDivElement>(null);
 const cardRef=useRef<BoardCard[]>([]);
 const patchCountRef=useRef(0),lastTurnPatchRef=useRef(0);
 const liveEnabled=s.liveModel==="gemini-3.1-flash-live-preview";
 const english=i18n.resolvedLanguage==="en";
 const localeHelp=teacherLanguageReminder(s.targetLanguage,s.nativeLanguage,s.teachingMode,level);
 const system=useMemo(()=>buildTeacherSessionPolicy({
  language:s.targetLanguage,scene:"白板語言學習",goals:[],mode:"tutor",profile,
  teachingMode:s.teachingMode,conversationMode:"practice",languageStyle:s.languageStyle,
  accentStrength:s.accentStrength,customAccent:s.customAccent,speakingPace:s.speakingPace,
  level:vocabularyLevel(),nativeLanguage:s.nativeLanguage,learnerSpeakingLevel:level
 })+"\n"+voiceIdentityPrompt("teacher",profile.id,s.targetLanguage)+
 "\n[TEACHING BOARD, session only] Answer the learner aloud, and maintain a coherent visual teaching board. "+
 "When a tool named update_teaching_board exists, call it early DURING your spoken explanation, then update relevant cards in small increments. "+
 "Use stable IDs for edits; do not repeat old cards. Respond to 'make it simpler' by editing existing cards, and 'quiz me' with a QuizCard of three actual multiple-choice questions. "+
 "Have/has been and had been require a two-timeline comparison and examples. "+
 "Choose visually distinct teaching formats: comparison, timeline, steps, flashcards, dialogue, quiz, examples, vocabulary or correction according to the lesson. Avoid always using explanation cards. "+
 "The board is teaching data, not a transcript. Keep text succinct. Never output HTML, scripts or markdown code. "+
 "The current board lives only in this session. Do not memorize it, and never treat a generated example as a fact about the student.",
 [s.targetLanguage,s.nativeLanguage,s.teachingMode,s.languageStyle,s.accentStrength,s.customAccent,s.speakingPace,profile,level]);
 const opening="[SILENT LESSON BOARD CONTROL] Await the learner's question. Ask what they want to understand in one short spoken sentence. "+
  (cardRef.current.length?"Continue from this existing board, never reset it:\n"+boardNotes(cardRef.current).slice(0,1800):"Start with an empty board.")+"\n"+localeHelp;
 function commitPatch(patch:BoardPatch){
  const next=applyBoardPatch(cardRef.current,patch);
  cardRef.current=next;setCards(next);
  const changed=patch.cards[patch.cards.length-1];
  setLatestId((changed&&next.some(c=>c.id===changed.id)?changed.id:next[next.length-1]?.id)||null);
  setRevision(v=>v+1);
  if(patch.action==="replace"){setAnswers({});setFollowing(true);setFocusedId(null);}
 }
 const live=useLiveSession({
  pageKey:"teacher-board",title:"AI 即時教學板 · "+profile.name,
  system,openingPrompt:opening,languageDirective:localeHelp,
  languageDriftGuard:(text)=>unexpectedTeacherKorean(text,s.targetLanguage,s.nativeLanguage,s.teachingMode),
  voice:normalizeLiveVoice(s.voice),language:s.targetLanguage,nativeLanguage:s.nativeLanguage,
  teacherReport:false,trackSpeakingLevel:false,persistHistory:false,sessionKind:"teacher",
  tools:liveEnabled?BOARD_TOOLS:undefined,
  onToolsUnavailable:()=>setToolsUnavailable(true),
  onToolCall:(call)=>{
   if(call.name!==BOARD_FUNCTION)return {ok:false,error:"unknown-tool"};
   const patch=validateBoardPatch(call.args);
   if(!patch)return {ok:false,error:"invalid-board-patch"};
   commitPatch(patch);
   patchCountRef.current++;
   setHasLivePatch(true);
   return {ok:true,updated:patch.cards.length,action:patch.action};
  },
  onRecovered:()=>{
   // Reassert session teaching context, not a new learner turn.
   const summary=boardNotes(cardRef.current).slice(0,1300);
   live.sendControl("[BOARD CONTINUITY] Reconnected. Preserve the board state and continue the same lesson. "+summary+"\n"+localeHelp);
  },
  onTurnComplete:(turn)=>{
   const updatedByLive=patchCountRef.current!==lastTurnPatchRef.current;
   lastTurnPatchRef.current=patchCountRef.current;
   if(!updatedByLive){
    const patch=fallbackBoard(turn,cardRef.current);
    if(patch)commitPatch(patch);
   }
   // Voice quiz answers are only recognized with explicit answer cues.
   const spoken=turn.input||"";
   const selected=letterIndex(spoken);
   const first=cardRef.current.find(c=>c.type==="quiz"&&c.questions.length);
   if(first&&selected>=0){
    const match=spoken.match(/第\s*([一二三123])\s*題/);
    const number=match?({一:1,二:2,三:3}[match[1] as "一"|"二"|"三"]||Number(match[1])):1;
    const index=number-1;
    if(first.questions[index]&&selected<first.questions[index].options.length)
     setAnswers(prev=>({...prev,[first.id+":"+index]:selected}));
   }
  }
 });
 const active=speakingStates.includes(live.state);
 const focusedCard=cards.find(c=>c.id===(following?latestId:focusedId))||cards[cards.length-1];
 useEffect(()=>{if(stageRef.current)stageRef.current.scrollTop=0},[focusedCard?.id,following,revision]);
 useEffect(()=>{document.body.classList.add("teacher-theme","session-page");return()=>{document.body.classList.remove("teacher-theme","session-page")}},[]);
 useEffect(()=>{if(live.state==="error")setHint(t("board.disconnect"));},[live.state,t]);
 function ask(text:string){
  if(!active||!live.sendText(text+"\n"+localeHelp)){setHint(t("board.startFirst"));return}
  setHint("");
 }
 function clickAnswer(card:BoardCard,index:number,selected:number){
  setAnswers(prev=>({...prev,[card.id+":"+index]:selected}));
  const q=card.questions[index];
  if(active)live.sendText("For whiteboard question "+(index+1)+", my answer is "+String.fromCharCode(65+selected)+": "+q.options[selected]+". Please explain whether it is correct.\n"+localeHelp);
 }
 async function copyNotes(){
  try{await navigator.clipboard.writeText(boardNotes(cards));setCopyStatus(t("board.copied"))}
  catch{setCopyStatus(t("board.copyFailed"))}
 }
 const phase=live.state==="speaking"?t("board.speaking"):live.state==="listening"?t("board.listening"):live.state==="connecting"||live.state==="requesting-mic"?t("board.connecting"):live.state==="error"?t("board.offline"):t("board.ready");
 return <>
  <header className="teaching-board-top"><Link to="/learn" className="teaching-board-back" aria-label={t("board.back")}>‹</Link>
   <div><strong>{t("board.title")}</strong><small>{s.targetLanguage} · {s.learnerSpeakingLevel} · {profile.name}</small></div>
   <span className="teaching-board-connection" data-state={live.state}>{phase}</span>
  </header>
  <main className="teaching-board-layout">
   <section className="teaching-board-tutor" aria-label={t("board.teacher")}>
    <div className="teaching-board-teacher"><TeacherAvatar profile={profile}/><div><b>{profile.name}</b><small>{s.targetLanguage} · {t("board.teacher")}</small></div></div>
    <p className="teaching-board-state" role="status">{live.status}</p>
    {!geminiKey()&&<GeminiSetupNotice returnTo="/teacher/board"/>}
    <details className="teaching-board-transcript"><summary>{t("board.recentSpeech")}</summary><div aria-live="off">
     {live.input&&<p><b>{t("board.you")}：</b>{live.input}</p>}
     {live.output&&<p><b>{profile.name}：</b>{live.output}</p>}
    </div></details>
    <div className="teaching-board-suggestions">
     <span>{t("board.try")}</span>
     <button type="button" onClick={()=>ask(t("board.examplePrompt"))}>{t("board.examplePrompt")}</button>
     <button type="button" onClick={()=>ask(t("board.simplifyPrompt"))}>{t("board.simplifyPrompt")}</button>
     <button type="button" onClick={()=>ask(t("board.quizPrompt"))}>{t("board.quizPrompt")}</button>
     <button type="button" onClick={()=>ask(t("board.moreExamples"))}>{t("board.moreExamples")}</button>
     <button type="button" onClick={()=>ask(t("board.nativeExplanation")+"\n[BOARD ONLY: change written explanation language, keep configured spoken language]")}>{t("board.nativeExplanation")}</button>
    </div>
    {hint&&<p className="teaching-board-hint" role="alert">{hint}</p>}
    <div className="teaching-board-voice"><LiveControls live={live} compact prominentInterrupt english={english}/></div>
   </section>
   <section className="teaching-board-canvas" aria-label={t("board.canvas")}>
    <div className="teaching-board-canvas-head"><div><span className="kicker">CREW · LIVE BOARD</span><h1>{t("board.canvas")}</h1>
     <p>{t(hasLivePatch?"board.liveHint":(liveEnabled&&!toolsUnavailable)?"board.fallbackHint":"board.modelFallbackHint")}</p>
    </div><span className="teaching-board-mode">{hasLivePatch?t("board.liveMode"):t("board.turnMode")}</span></div>
    <div className={"teaching-board-stage"+(focusedCard?" has-card":"")} ref={stageRef} role="tabpanel" id="teaching-board-active-panel"
     aria-label={focusedCard?.title||t("board.canvas")} aria-labelledby={focusedCard?"teaching-board-tab-"+focusedCard.id:undefined}>
     {!focusedCard?<div className="teaching-board-empty"><strong>{t("board.emptyTitle")}</strong><p>{t("board.emptyDesc")}</p></div>:
      <TeachingCard key={focusedCard.id} card={focusedCard} answers={answers} onAnswer={clickAnswer} onExplain={text=>ask(t("board.explainPrefix")+text)} english={english}/>}
    </div>
    {cards.length>0&&<div className="teaching-board-navigator">
     <div className="teaching-board-navigator-head"><strong>{t("board.lessonCards",{count:cards.length})}</strong>
      <small>{following?t("board.following"):t("board.paused")}</small>
      {!following&&<button className="teaching-board-follow" type="button" onClick={()=>{setFollowing(true);setFocusedId(null)}}>{t("board.followLatest")} ↗</button>}
     </div>
     <div className="teaching-board-deck" role="tablist" aria-label={t("board.lessonCards",{count:cards.length})}>
      {cards.map((card,index)=><button key={card.id} type="button" role="tab" id={"teaching-board-tab-"+card.id}
       aria-controls="teaching-board-active-panel" aria-selected={focusedCard?.id===card.id}
       className={"teaching-board-deck-tab"+(focusedCard?.id===card.id?" is-active":"")}
       onClick={()=>{setFollowing(false);setFocusedId(card.id)}}>
       <small>{index+1} · {cardKindName(card.type,english)}{latestId===card.id?" · "+t("board.latest"):""}</small><span>{card.title}</span>
      </button>)}
     </div>
    </div>}
    {cards.length>0&&<div className="teaching-board-footer">
     <button type="button" onClick={()=>setNotesOpen(!notesOpen)} aria-expanded={notesOpen}>{t("board.notes")}</button>
     <button type="button" onClick={()=>void copyNotes()}>{t("board.copy")}</button>
     <button type="button" onClick={()=>{cardRef.current=[];setCards([]);setAnswers({});setNotesOpen(false);setLatestId(null);setFocusedId(null);setFollowing(true)}}>{t("board.clear")}</button>
     {copyStatus&&<small role="status">{copyStatus}</small>}
    </div>}
    {notesOpen&&<section className="teaching-board-notes"><h2>{t("board.notes")}</h2><pre>{boardNotes(cards)}</pre></section>}
   </section>
  </main>
 </>;
}
