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
import {DIRECTOR_FUNCTION,DIRECTOR_TOOL,EMPTY_DIRECTOR,applyDirectorCommand,directorAfterAnswer,directorAfterPatch,validateDirectorCommand,type DirectorState} from "./teachingDirector";
import {LESSONS,findLesson,lessonPrompt,lessonProgress,evaluateSpeakingTask,type LessonId,type SpeakingAssessment} from "./boardLessons";
import "./teachingBoard.css";

const speakingStates=["requesting-mic","connecting","listening","speaking","ending","reporting"];
const letterIndex=(spoken:string):number=>{
 const bare=spoken.trim().match(/^([ABCD])\s*[.!。！]?$/i);
 if(bare)return bare[1].toUpperCase().charCodeAt(0)-65;
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
 const answersRef=useRef<Record<string,number>>({});
 const [director,setDirector]=useState<DirectorState>(EMPTY_DIRECTOR);
 const [lessonId,setLessonId]=useState<LessonId|null>(null);
 const [lessonStep,setLessonStep]=useState(0);
 const [speakingAssessment,setSpeakingAssessment]=useState<SpeakingAssessment|null>(null);
 const [reviewReturn,setReviewReturn]=useState<{cardId:string;index:number}|null>(null);
 const directorRef=useRef<DirectorState>(EMPTY_DIRECTOR);
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
 const deckRef=useRef<HTMLDivElement>(null);
 const cardRef=useRef<BoardCard[]>([]);
 const speechAssessmentRef=useRef<SpeakingAssessment|null>(null);
 const lessonRef=useRef<LessonId|null>(null);
 const reviewReturnRef=useRef<{cardId:string;index:number}|null>(null);
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
 "After creating a card, use control_teaching_stage to focus on the topic and reveal meaningful items sequentially while talking. "+
 "When asking a quiz, issue ask and STOP: wait for a real learner answer by voice or tap. Never reveal a correct option beforehand or advance without learner interaction. "+
 "While awaiting a quiz answer you may use control_teaching_stage hint with a helpful clue, never reveal the answer, and never skip the quiz. Non-quiz support cards are allowed but do not replace the question. "+
 "Once answered, explain briefly; if incorrect revisit a related comparison or timeline, if correct continue with the next unanswered question or example. "+
 "For speaking tasks, wait for the student to produce their own sentence. Give natural-language feedback and one improvement, never claim precise pronunciation scoring from text. "+
 "Reuse existing cards instead of generating more explanation cards. The board is teaching data, not a transcript. Keep text succinct. Never output HTML, scripts or markdown code. "+
 "The current board lives only in this session. Do not memorize it, and never treat a generated example as a fact about the student.",
 [s.targetLanguage,s.nativeLanguage,s.teachingMode,s.languageStyle,s.accentStrength,s.customAccent,s.speakingPace,profile,level]);
 const opening="[SILENT LESSON BOARD CONTROL] Await the learner's question. Ask what they want to understand in one short spoken sentence. "+
  (cardRef.current.length?"Continue from this existing board, never reset it:\n"+boardNotes(cardRef.current).slice(0,1800):"Start with an empty board.")+"\n"+
  (lessonRef.current?lessonPrompt(findLesson(lessonRef.current)!,0):"")+"\n"+localeHelp;
 function changeDirector(next:DirectorState){
  directorRef.current=next;setDirector(next);
 }
 function commitPatch(patch:BoardPatch):boolean{
  // Only allow supporting non-quiz upserts while the learner owns a question.
  const waiting=directorRef.current.phase==="awaiting";
  if(waiting&&(patch.action!=="upsert"||patch.cards.some(c=>c.id===directorRef.current.cardId||c.type==="quiz"||c.type==="speaking")))return false;
  const next=applyBoardPatch(cardRef.current,patch);
  cardRef.current=next;setCards(next);
  const stage=directorAfterPatch(directorRef.current,next,patch.cards);
  changeDirector(stage);
  const changedId=stage.cardId;
  setLatestId(changedId);setRevision(v=>v+1);
  if(changedId&&!waiting){setFollowing(true);setFocusedId(null);}
  if(patch.action==="replace"){answersRef.current={};setAnswers({});setSpeakingAssessment(null);speechAssessmentRef.current=null;}
  return true;
 }
 function selectAnswer(card:BoardCard,index:number,selected:number,fromVoice=false):boolean{
  const key=card.id+":"+index;
  if(answersRef.current[key]!==undefined)return false;
  const next=directorAfterAnswer(directorRef.current,card,index,selected,cardRef.current);
  if(!next)return false;
  answersRef.current={...answersRef.current,[key]:selected};
  setAnswers(answersRef.current);
  changeDirector(next);
  setLatestId(card.id);setFollowing(true);setFocusedId(null);
  if(!fromVoice&&active){
   const q=card.questions[index];
   live.sendText("[LEARNER ANSWER FROM TEACHING BOARD] Question "+(index+1)+": "+q.question+
    "\nLearner chose "+String.fromCharCode(65+selected)+" ("+q.options[selected]+"). "+
    (next.result==="correct"?"The answer is correct.":"The answer is incorrect.")+
    " Explain why briefly, preferably using the current card. If wrong, revisit the comparison/timeline. "+
    "Do not move on to an unanswered question until the learner requests the next one.\n"+localeHelp);
  }
  return true;
 }
 function submitSpeaking(text:string,sendToTeacher:boolean){
  const d=directorRef.current,card=cardRef.current.find(c=>c.id===d.cardId);
  if(!card||card.type!=="speaking"||!text.trim())return false;
  const assessment=evaluateSpeakingTask(card,text);
  if(!assessment)return false;
  speechAssessmentRef.current=assessment;setSpeakingAssessment(assessment);
  changeDirector({...d,phase:"feedback",result:assessment.met?"correct":"incorrect"});
  if(sendToTeacher&&active)live.sendText("[LEARNER SPEAKING PRACTICE] "+text.slice(0,640)+
   "\nPlease respond naturally as a conversation partner. Offer one actionable correction. Do not claim pronunciation accuracy from a text transcript.\n"+localeHelp);
  return true;
 }
 function processConfirmedSpeech(raw:string){
  const spoken=raw.trim(),stage=directorRef.current;
  if(!spoken||/^(can you repeat|repeat please|再說一次|我不懂|please help|給我提示)[?.!。！ ]*$/i.test(spoken))return;
  if(stage.phase!=="awaiting")return;
  const card=cardRef.current.find(c=>c.id===stage.cardId);
  if(!card)return;
  if(card.type==="speaking"){submitSpeaking(spoken,false);return}
  if(card.type!=="quiz")return;
  const selected=letterIndex(spoken);
  if(selected<0)return;
  const match=spoken.match(/第\s*([一二三123])\s*題/);
  const number=match?({一:1,二:2,三:3}[match[1] as "一"|"二"|"三"]||Number(match[1])):stage.quizIndex+1;
  if(number-1===stage.quizIndex)selectAnswer(card,number-1,selected,true);
 }
 function moveToCard(cardId:string){
  const card=cardRef.current.find(c=>c.id===cardId);
  if(!card)return;
  const old=directorRef.current;
  const quizIndex=card.type==="quiz"&&old.cardId===card.id?old.quizIndex:0;
  const prior=answersRef.current[card.id+":"+quizIndex];
  changeDirector({...EMPTY_DIRECTOR,cardId,quizIndex,
   phase:card.type==="speaking"?(speechAssessmentRef.current?"feedback":"awaiting"):
    card.type==="quiz"?(prior===undefined?"awaiting":"feedback"):"explaining",
   result:card.type==="speaking"?(speechAssessmentRef.current?(speechAssessmentRef.current.met?"correct":"incorrect"):null):
    card.type==="quiz"&&prior!==undefined?(prior===card.questions[quizIndex]?.answerIndex?"correct":"incorrect"):null});
  setLatestId(cardId);setFollowing(true);setFocusedId(null);setRevision(v=>v+1);
 }
 function startLesson(id:LessonId){
  const lesson=findLesson(id);
  if(!lesson)return;
  lessonRef.current=id;setLessonId(id);setLessonStep(0);
  cardRef.current=lesson.cards;setCards(lesson.cards);
  answersRef.current={};setAnswers({});
  speechAssessmentRef.current=null;setSpeakingAssessment(null);
  reviewReturnRef.current=null;setReviewReturn(null);
  moveToCard(lesson.cards[0].id);
  setHasLivePatch(false);setNotesOpen(false);setHint("");
  if(active)live.sendText(lessonPrompt(lesson,0)+"\n"+localeHelp);
 }
 function goLessonStep(index:number){
  const lesson=lessonRef.current?findLesson(lessonRef.current):undefined;
  if(!lesson||index<0||index>=lesson.cards.length)return;
  setLessonStep(index);
  moveToCard(lesson.cards[index].id);
  if(active)live.sendText(lessonPrompt(lesson,index)+"\n"+localeHelp);
 }
 const live=useLiveSession({
  pageKey:"teacher-board",title:"AI 即時教學板 · "+profile.name,
  system,openingPrompt:opening,languageDirective:localeHelp,
  languageDriftGuard:(text)=>unexpectedTeacherKorean(text,s.targetLanguage,s.nativeLanguage,s.teachingMode),
  voice:normalizeLiveVoice(s.voice),language:s.targetLanguage,nativeLanguage:s.nativeLanguage,
  teacherReport:false,trackSpeakingLevel:false,persistHistory:false,sessionKind:"teacher",
  tools:liveEnabled?[{functionDeclarations:[...BOARD_TOOLS[0].functionDeclarations,...DIRECTOR_TOOL.functionDeclarations]}]:undefined,
  onToolsUnavailable:()=>setToolsUnavailable(true),
  onConfirmedTranscript:turn=>processConfirmedSpeech(turn.input||""),
  onToolCall:(call)=>{
   if(call.name===BOARD_FUNCTION){
    const patch=validateBoardPatch(call.args);
    if(!patch)return {ok:false,error:"invalid-board-patch"};
    if(!commitPatch(patch))return {ok:false,error:"learner-answer-pending"};
    patchCountRef.current++;setHasLivePatch(true);
    return {ok:true,updated:patch.cards.length,action:patch.action};
   }
   if(call.name===DIRECTOR_FUNCTION){
    const command=validateDirectorCommand(call.args,cardRef.current);
    if(!command)return {ok:false,error:"invalid-stage-command"};
    const next=applyDirectorCommand(directorRef.current,command,cardRef.current,answersRef.current);
    if(!next)return {ok:false,error:"stage-locked-or-no-answer"};
    changeDirector(next);
    setLatestId(next.cardId);setFollowing(true);setFocusedId(null);
    setRevision(v=>v+1);setHasLivePatch(true);
    return {ok:true,phase:next.phase,cardId:next.cardId};
   }
   return {ok:false,error:"unknown-tool"};
  },
  onRecovered:()=>{
   // Reassert session teaching context, not a new learner turn.
   const summary=boardNotes(cardRef.current).slice(0,1300);
   live.sendControl("[BOARD CONTINUITY] Reconnected. Preserve lesson and stage. Current phase="+directorRef.current.phase+", focused card="+directorRef.current.cardId+", quiz question="+(directorRef.current.quizIndex+1)+". If awaiting, wait for learner and do not change cards. "+summary+"\n"+localeHelp);
  },
  onTurnComplete:(turn)=>{
   // Confirmed input is observed as early as the runtime publishes a turn;
   // fall back here when the model does not send a separate transcript event.
   processConfirmedSpeech(turn.input||"");
   const updatedByLive=patchCountRef.current!==lastTurnPatchRef.current;
   lastTurnPatchRef.current=patchCountRef.current;
   if(!updatedByLive&&!lessonRef.current&&directorRef.current.phase==="explaining"){
    const patch=fallbackBoard(turn,cardRef.current);
    if(patch)commitPatch(patch);
   }
  }
 });
 const active=speakingStates.includes(live.state);
 const focusedCard=cards.find(c=>c.id===(following?latestId:focusedId))||cards[cards.length-1];
 const lesson=lessonId?findLesson(lessonId):undefined;
 const progress=lesson?lessonProgress(lesson,answers,speakingAssessment):null;
 useEffect(()=>{
  const stage=stageRef.current;
  if(stage)stage.scrollTop=0;
 },[focusedCard?.id]);
 useEffect(()=>{
  if(!following)return;
  const stage=stageRef.current;
  const focus=stage?.querySelector<HTMLElement>(".is-highlighted,.teaching-board-step-focus,.teaching-board-question");
  if(stage&&focus){
   const a=stage.getBoundingClientRect(),b=focus.getBoundingClientRect();
   if(b.top<a.top+8)stage.scrollTop-=a.top+8-b.top;
   else if(b.bottom>a.bottom-8)stage.scrollTop+=b.bottom-a.bottom+8;
  }
  const rail=deckRef.current,selected=rail?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
  if(rail&&selected){
   const a=rail.getBoundingClientRect(),b=selected.getBoundingClientRect();
   if(b.left<a.left)rail.scrollLeft-=a.left-b.left+8;
   else if(b.right>a.right)rail.scrollLeft+=b.right-a.right+8;
  }
 },[focusedCard?.id,director.focusIndex,director.quizIndex,following,revision]);
 useEffect(()=>{document.body.classList.add("teacher-theme","session-page");return()=>{document.body.classList.remove("teacher-theme","session-page")}},[]);
 useEffect(()=>{if(live.state==="error")setHint(t("board.disconnect"));},[live.state,t]);
 function ask(text:string){
  if(!active||!live.sendText(text+"\n"+localeHelp)){setHint(t("board.startFirst"));return}
  setHint("");
 }
 function clickAnswer(card:BoardCard,index:number,selected:number){
  selectAnswer(card,index,selected);
 }
 function navigateCard(cardId:string,index:number){
  const card=cardRef.current.find(c=>c.id===cardId);
  if(!card)return;
  if(card.type==="quiz"){
   const key=card.id+":"+index,selected=answersRef.current[key],q=card.questions[index];
   if(!q)return;
   // The next question can only be opened after the current one is answered.
   if(card.id===directorRef.current.cardId&&index>directorRef.current.quizIndex&&directorRef.current.phase==="awaiting")return;
   changeDirector({...EMPTY_DIRECTOR,cardId:card.id,phase:selected===undefined?"awaiting":"feedback",
    quizIndex:index,focusIndex:index,result:selected===undefined?null:(selected===q.answerIndex?"correct":"incorrect")});
   if(active&&selected===undefined)live.sendText("[LESSON STAGE] The learner is ready for question "+(index+1)+": "+q.question+". Ask this question aloud, then wait for an answer.\n"+localeHelp);
  }else changeDirector({...directorRef.current,cardId:card.id,focusIndex:index});
  setLatestId(card.id);setFollowing(true);setFocusedId(null);
 }
 function reviewCard(){
  const d=directorRef.current,reviewId=d.reviewCardId;
  if(!reviewId||!cardRef.current.some(c=>c.id===reviewId)||!d.cardId)return;
  const target={cardId:d.cardId,index:d.quizIndex};
  reviewReturnRef.current=target;setReviewReturn(target);
  moveToCard(reviewId);
  if(active)live.sendText("[LESSON REVIEW] Explain the concept on this card without revealing the earlier quiz answer. Then encourage me to return and retry.\n"+localeHelp);
 }
 function returnToQuestion(){
  const prior=reviewReturnRef.current;
  if(!prior)return;
  const card=cardRef.current.find(c=>c.id===prior.cardId);
  if(!card||card.type!=="quiz")return;
  // A review grants an explicit retry; preserve earlier attempts only as
  // anonymous aggregate activity, not as durable user memory.
  const key=card.id+":"+prior.index;
  const next={...answersRef.current};delete next[key];answersRef.current=next;setAnswers(next);
  reviewReturnRef.current=null;setReviewReturn(null);
  changeDirector({...EMPTY_DIRECTOR,cardId:card.id,phase:"awaiting",quizIndex:prior.index,focusIndex:prior.index});
  setLatestId(card.id);setFocusedId(null);setFollowing(true);setRevision(v=>v+1);
  if(active)live.sendText("[LESSON RETRY] Let me attempt question "+(prior.index+1)+" again. Do not reveal the correct option; ask and wait.\n"+localeHelp);
 }
 function requestHint(){
  const d=directorRef.current;
  if(d.phase!=="awaiting")return;
  const fallback=english?"Look for the key time or meaning clue before choosing.":"先找句子中的時間或語意線索，再選答案。";
  changeDirector({...d,hintText:d.hintText||fallback});
  if(active)live.sendText("[LESSON HINT] The student asked for one short clue about the current question or speaking task. Give a hint, not the full answer. Keep the same card and wait.\n"+localeHelp);
 }
 function nextExercise(){
  const d=directorRef.current,card=cardRef.current.find(c=>c.id===d.cardId);
  if(!card||card.type!=="quiz"||d.phase!=="feedback")return;
  if(d.quizIndex+1<card.questions.length)navigateCard(card.id,d.quizIndex+1);
  else if(active)live.sendText("[LESSON STAGE] I finished this quiz. Give me a short next exercise matching how well I answered, or summarize the topic if I have mastered it.\n"+localeHelp);
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
   <section className="teaching-board-lesson-picker" aria-label={t("board.lessonPicker.title")}>
    <div><strong>{t("board.lessonPicker.title")}</strong><small>{t("board.lessonPicker.subtitle")}</small></div>
    <div className="teaching-board-lesson-options">{LESSONS.map(item=><button type="button" key={item.id}
     className={lessonId===item.id?"is-active":""} onClick={()=>startLesson(item.id)}>
     <span>{t("board.lessonPicker."+item.id)}</span><small>{item.duration}</small>
    </button>)}</div>
   </section>
   {lesson&&<section className="teaching-board-lesson-progress" aria-label={t("board.lessonPicker.progress")}>
    <div><strong>{t("board.lessonPicker.progress")}</strong><small>{lesson.goal}</small></div>
    <div className="teaching-board-lesson-steps">{lesson.cards.map((card,i)=><button type="button" key={card.id}
     className={lessonStep===i?"is-active":""} aria-current={lessonStep===i?"step":undefined}
     onClick={()=>goLessonStep(i)}>{i+1}. {cardKindName(card.type,english)}</button>)}</div>
    <div className="teaching-board-lesson-outcome">
     <span>{progress?.quiz?"✓":"○"} {t("board.lessonPicker.quizDone")}</span>
     <span>{progress?.speaking?"✓":"○"} {t("board.lessonPicker.speakingDone")}</span>
     {progress?.complete&&<strong role="status">{t("board.lessonPicker.complete")}</strong>}
    </div>
    <div className="teaching-board-lesson-actions">
     <button type="button" disabled={lessonStep===0} onClick={()=>goLessonStep(lessonStep-1)}>{t("board.lessonPicker.previous")}</button>
     <button type="button" disabled={lessonStep>=lesson.cards.length-1||(focusedCard?.type==="quiz"&&director.phase==="awaiting")}
      onClick={()=>goLessonStep(lessonStep+1)}>{t("board.lessonPicker.forward")}</button>
    </div>
   </section>}
   <section className="teaching-board-workspace">
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
      <TeachingCard key={focusedCard.id} card={focusedCard} answers={answers} onAnswer={clickAnswer} onExplain={text=>ask(t("board.explainPrefix")+text)} english={english}
       focusIndex={director.cardId===focusedCard.id?director.focusIndex:-1}
       revealCount={director.cardId===focusedCard.id?director.revealed:null}
       quizIndex={director.cardId===focusedCard.id?director.quizIndex:0} onNavigate={index=>navigateCard(focusedCard.id,index)}
       onSpeakingSubmit={text=>submitSpeaking(text,true)} speakingAssessment={director.cardId===focusedCard.id?speakingAssessment:null}/>}
    </div>
    {focusedCard&&following&&director.cardId===focusedCard.id&&<div className="teaching-board-director-status" role="status">
     {director.phase==="awaiting"&&<button type="button" onClick={requestHint}>{t("board.lessonPicker.hint")}</button>}
     {director.phase==="awaiting"&&director.hintText&&<span className="teaching-board-director-hint">{director.hintText}</span>}
     {reviewReturn&&<button type="button" onClick={returnToQuestion}>{t("board.lessonPicker.retry")}</button>}
     <span className={"teaching-board-director-phase is-"+director.phase}>{t("board.director."+director.phase)}</span>
     {director.phase==="feedback"&&director.result==="incorrect"&&director.reviewCardId&&<button type="button" onClick={reviewCard}>{t("board.director.review")}</button>}
     {director.phase==="feedback"&&focusedCard.type==="quiz"&&<button type="button" onClick={nextExercise}>{director.quizIndex+1<focusedCard.questions.length?t("board.director.next"):t("board.director.another")}</button>}
    </div>}
    {cards.length>0&&<div className="teaching-board-navigator">
     <div className="teaching-board-navigator-head"><strong>{t("board.lessonCards",{count:cards.length})}</strong>
      <small>{following?t("board.following"):t("board.paused")}</small>
      {!following&&<button className="teaching-board-follow" type="button" onClick={()=>{setFollowing(true);setFocusedId(null)}}>{t("board.followLatest")} ↗</button>}
     </div>
     <div className="teaching-board-deck" ref={deckRef} role="tablist" aria-label={t("board.lessonCards",{count:cards.length})}>
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
     <button type="button" onClick={()=>{cardRef.current=[];setCards([]);setAnswers({});setNotesOpen(false);setLatestId(null);setFocusedId(null);setFollowing(true);changeDirector(EMPTY_DIRECTOR);answersRef.current={};lessonRef.current=null;setLessonId(null);setLessonStep(0);speechAssessmentRef.current=null;setSpeakingAssessment(null);reviewReturnRef.current=null;setReviewReturn(null)}}>{t("board.clear")}</button>
     {copyStatus&&<small role="status">{copyStatus}</small>}
    </div>}
    {notesOpen&&<section className="teaching-board-notes"><h2>{t("board.notes")}</h2><pre>{boardNotes(cards)}</pre></section>}
   </section>
   </section>
  </main>
 </>;
}
