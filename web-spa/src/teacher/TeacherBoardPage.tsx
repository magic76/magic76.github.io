import {Arrow} from "../components/Arrow";
import {useEffect,useMemo,useRef,useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {LiveControls} from "../live/LiveControls";
import {createBoardDiagnostics,boardViewport} from "./boardDiagnostics.mjs";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {useLiveSession} from "../live/useLiveSession";
import {vocabularyLevel} from "../lib/runtime";
import {getTeacherProfile} from "./teacherProfiles";
import {buildTeacherSessionPolicy} from "./teacherPolicy";
import {teacherLanguageReminder,unexpectedTeacherKorean} from "./teacherLanguage";
import {normalizeLiveVoice,voiceIdentityPrompt} from "../live/voiceIdentity";
import {effectiveSpeakingLevel} from "./speakingLevelMemory";
import {personalMemoryEnabled} from "./studentMemory";
import {boardNotes,BOARD_FUNCTION,BOARD_TOOLS,applyBoardPatch,fallbackBoard,validateBoardPatch,type BoardCard,type BoardPatch} from "./boardProtocol";
import {TeachingCard,cardKindName} from "./TeachingCard";
import type {FlashReview} from "./BoardFlashcards";
import {flashcardTeacherPrompt} from "./boardRecallCoach";
import {DIRECTOR_FUNCTION,DIRECTOR_TOOL,EMPTY_DIRECTOR,applyDirectorCommand,directorAfterAnswer,directorAfterPatch,validateDirectorCommand,type DirectorState} from "./teachingDirector";
import {findLesson,lessonPrompt,lessonProgress,evaluateSpeakingTask,type LessonId,type SpeakingAssessment} from "./boardLessons";
import {GuidedLessonPanel} from "./GuidedLessonPanel";
import {BoardQuickControls} from "./BoardQuickControls";
import {BoardTutorPanel} from "./BoardTutorPanel";
import {BoardPresentationBar,boardPresentationRequest,PRESENTATION_CUES,type BoardPresentation} from "./BoardPresentationBar";
import {BOARD_VISUAL_POLICY} from "./boardVisualPolicy";
import {planAdaptiveNext} from "./boardAdaptive";
import {parseBoardVoiceAnswer} from "./boardVoiceAnswer";
import {BoardReviewBanner} from "./BoardReviewBanner";
import {useBoardReviewState} from "./useBoardReviewState";
import "./teachingBoard.css";
import "./boardReview.css";

const speakingStates=["requesting-mic","connecting","listening","speaking","ending","reporting"];
export function TeacherBoardPage(){
 const {t,i18n}=useTranslation("teacher");
 const navigate=useNavigate();
 const journal=useRef<ReturnType<typeof createBoardDiagnostics>|null>(null);
 if(!journal.current)journal.current=createBoardDiagnostics();
 const [includeDiagnosticText,setIncludeDiagnosticText]=useState(false);
 const [diagnosticStatus,setDiagnosticStatus]=useState("");
 const record=(kind:string,data:Record<string,unknown>={},detail?:unknown)=>journal.current?.record(kind,data,detail);
 const s=useTeacherStore();
 const profile=getTeacherProfile(s.teacherProfile);
 const memoryEnabled=personalMemoryEnabled();
 const level=effectiveSpeakingLevel(s.targetLanguage,s.learnerSpeakingLevel,memoryEnabled);
 const reviews=useBoardReviewState(s.targetLanguage,profile.id,memoryEnabled);
 const [cards,setCards]=useState<BoardCard[]>([]);
 const [answers,setAnswers]=useState<Record<string,number>>({});
 const answersRef=useRef<Record<string,number>>({});
 const [director,setDirector]=useState<DirectorState>(EMPTY_DIRECTOR);
 const [lessonId,setLessonId]=useState<LessonId|null>(null);
 const [lessonStep,setLessonStep]=useState(0);
 const [completedSteps,setCompletedSteps]=useState<Record<string,boolean>>({});
 const [lessonExplained,setLessonExplained]=useState(false);
 const [lessonTransitioning,setLessonTransitioning]=useState(false);
 const [topicEnded,setTopicEnded]=useState(false);
 const topicEndedRef=useRef(false);
 const [speakingAssessment,setSpeakingAssessment]=useState<SpeakingAssessment|null>(null);
 const [reviewReturn,setReviewReturn]=useState<{cardId:string;index:number}|null>(null);
 const directorRef=useRef<DirectorState>(EMPTY_DIRECTOR);
 const [notesOpen,setNotesOpen]=useState(false);
 const [hint,setHint]=useState("");
 const [copyStatus,setCopyStatus]=useState("");
 const [hasLivePatch,setHasLivePatch]=useState(false);
 const [showingDemo,setShowingDemo]=useState(false);
 const [toolsUnavailable,setToolsUnavailable]=useState(false);
 const [latestId,setLatestId]=useState<string|null>(null);
 const [focusedId,setFocusedId]=useState<string|null>(null);
 const [following,setFollowingState]=useState(true);
 const followingRef=useRef(true);
 function setFollowing(value:boolean){followingRef.current=value;setFollowingState(value)}
 const [revision,setRevision]=useState(0);
 const deckRef=useRef<HTMLDivElement>(null);
 const cardRef=useRef<BoardCard[]>([]);
 const speechAssessmentRef=useRef<SpeakingAssessment|null>(null);
 const lessonRef=useRef<LessonId|null>(null);
 const reviewReturnRef=useRef<{cardId:string;index:number}|null>(null);
 const patchCountRef=useRef(0),lastTurnPatchRef=useRef(0);
 const formatRequestRef=useRef<BoardPresentation|null>(null);
 const pendingQuizRef=useRef<{cardId:string;index:number;correct:boolean}|null>(null);
 const english=i18n.resolvedLanguage==="en";
 const localeHelp=teacherLanguageReminder(s.targetLanguage,s.nativeLanguage,s.teachingMode,level);
 const system=useMemo(()=>buildTeacherSessionPolicy({
  language:s.targetLanguage,scene:"白板語言學習",goals:[],mode:"tutor",profile,
  teachingMode:s.teachingMode,conversationMode:"practice",languageStyle:s.languageStyle,
  accentStrength:s.accentStrength,customAccent:s.customAccent,speakingPace:s.speakingPace,
  level:vocabularyLevel(),nativeLanguage:s.nativeLanguage,learnerSpeakingLevel:level
 })+"\n"+voiceIdentityPrompt("teacher",profile.id,s.targetLanguage)+"\n"+BOARD_VISUAL_POLICY,
 [s.targetLanguage,s.nativeLanguage,s.teachingMode,s.languageStyle,s.accentStrength,s.customAccent,s.speakingPace,profile,level]);
 const opening="[SILENT LESSON BOARD CONTROL] Await the learner's question. Ask what they want to understand in one short spoken sentence. "+
  (cardRef.current.length?"Continue from this existing board, never reset it:\n"+boardNotes(cardRef.current).slice(0,1800):"Start with an empty board.")+"\n"+
  (lessonRef.current?lessonPrompt(findLesson(lessonRef.current)!,0):"")+"\n"+localeHelp;
 function changeDirector(next:DirectorState){
  directorRef.current=next;setDirector(next);
  record("director-state",{phase:next.phase,cardId:next.cardId,quizIndex:next.quizIndex,focusIndex:next.focusIndex,result:next.result});
 }
 function commitPatch(patch:BoardPatch,source:"live"|"fallback"|"local"="local"):boolean{
  const waiting=directorRef.current.phase==="awaiting";
  const guided=!!lessonRef.current;
  if(guided){record("patch-rejected",{source,reason:"guided"},patch);return false;}
  if(waiting&&(patch.action!=="upsert"||patch.cards.some(c=>c.id===directorRef.current.cardId||c.type==="quiz"||c.type==="speaking"))){record("patch-rejected",{source,reason:"awaiting-answer"},patch);return false;}
  const next=applyBoardPatch(cardRef.current,patch);
  cardRef.current=next;setCards(next);setShowingDemo(false);
  if(patch.cards.length)formatRequestRef.current=null;
  const stage=guided?directorRef.current:directorAfterPatch(directorRef.current,next,patch.cards);
  changeDirector(stage);
  const changedId=stage.cardId;
  setLatestId(changedId);setRevision(v=>v+1);
  // Follow new material by default; manual browsing is the only pause.
  if(changedId&&followingRef.current){setFocusedId(null)}
  record("patch-applied",{source,action:patch.action,cards:patch.cards.map(c=>({id:c.id,type:c.type})),ids:patch.ids,latestId:changedId,following:followingRef.current,total:next.length},patch);
  if(patch.action==="replace"){pendingQuizRef.current=null;answersRef.current={};setAnswers({});setSpeakingAssessment(null);speechAssessmentRef.current=null;}
  return true;
 }
 function selectAnswer(card:BoardCard,index:number,selected:number,fromVoice=false):boolean{
  const key=card.id+":"+index;
  if(answersRef.current[key]!==undefined)return false;
  const next=directorAfterAnswer(directorRef.current,card,index,selected,cardRef.current);
  if(!next)return false;
  record("quiz-answer",{cardId:card.id,index,selected,fromVoice,result:next.result});
  answersRef.current={...answersRef.current,[key]:selected};
  setAnswers(answersRef.current);
  changeDirector(next);
  pendingQuizRef.current={cardId:card.id,index,correct:next.result==="correct"};
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
  record("speaking-answer",{cardId:card.id,met:assessment.met},text);
  speechAssessmentRef.current=assessment;setSpeakingAssessment(assessment);
  changeDirector({...d,phase:"feedback",result:assessment.met?"correct":"incorrect"});
  if(sendToTeacher&&active)live.sendText("[LEARNER SPEAKING PRACTICE] "+text.slice(0,640)+
   "\nPlease respond naturally as a conversation partner. Offer one actionable correction. Do not claim pronunciation accuracy from a text transcript.\n"+localeHelp);
  return true;
 }
 function processConfirmedSpeech(raw:string){
  const answer=parseBoardVoiceAnswer(raw,directorRef.current,cardRef.current.find(c=>c.id===directorRef.current.cardId));
  if(answer?.kind==="speaking")submitSpeaking(answer.text,false);
  else if(answer?.kind==="quiz")selectAnswer(cardRef.current.find(c=>c.id===directorRef.current.cardId)!,answer.index,answer.selected,true);
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
 function endTopic(){
  record("topic-end");
  topicEndedRef.current=true;
  if(active)live.interrupt();
  setTopicEnded(true);setLessonTransitioning(false);
  changeDirector(EMPTY_DIRECTOR);
 }
 function startFreeTopic(topic:string){
  record("topic-start",{mode:"free"},topic);
  topicEndedRef.current=false;
  if(active)live.interrupt();
  lessonRef.current=null;setLessonId(null);setLessonStep(0);
  setCompletedSteps({});setLessonExplained(false);setLessonTransitioning(false);
  pendingQuizRef.current=null;reviewReturnRef.current=null;setReviewReturn(null);
  cardRef.current=[];setCards([]);answersRef.current={};setAnswers({});
  speechAssessmentRef.current=null;setSpeakingAssessment(null);
  changeDirector(EMPTY_DIRECTOR);setLatestId(null);setFocusedId(null);setFollowing(true);
  setTopicEnded(false);setHint("");setHasLivePatch(false);
  if(active)live.sendText("[NEW LEARNER-CHOSEN TOPIC] The learner ended the previous topic. Start teaching ONLY this new topic: "+topic+". Introduce one concise concept and use the board tools to create appropriate material. Do not return to the previous topic unless asked.\n"+localeHelp);
 }
 function startLesson(id:LessonId){
  const lesson=findLesson(id);
  if(!lesson)return;
  if(active)live.interrupt();
  setLessonTransitioning(active);setLessonExplained(false);setCompletedSteps({});
  setTopicEnded(false);
  topicEndedRef.current=false;
  lessonRef.current=id;setLessonId(id);setLessonStep(0);
  cardRef.current=lesson.cards;setCards(lesson.cards);
  answersRef.current={};setAnswers({});
  speechAssessmentRef.current=null;setSpeakingAssessment(null);
  reviewReturnRef.current=null;setReviewReturn(null);
  moveToCard(lesson.cards[0].id);
  pendingQuizRef.current=null;setHasLivePatch(false);setNotesOpen(false);setHint("");
  if(active&&!live.sendText(lessonPrompt(lesson,0)+"\n"+localeHelp))setLessonTransitioning(false);
 }
 function goLessonStep(index:number){
  const lesson=lessonRef.current?findLesson(lessonRef.current):undefined;
  if(!lesson||index<0||index>=lesson.cards.length)return;
  topicEndedRef.current=false;setTopicEnded(false);
  if(active)live.interrupt();
  setLessonTransitioning(active);setLessonExplained(false);
  setLessonStep(index);
  speechAssessmentRef.current=null;setSpeakingAssessment(null);
  moveToCard(lesson.cards[index].id);
  if(active&&!live.sendText(lessonPrompt(lesson,index)+"\n"+localeHelp))setLessonTransitioning(false);
 }
 const live=useLiveSession({
  pageKey:"teacher-board",learningFeedback:true,title:"AI 即時教學板 · "+profile.name,
  system,openingPrompt:opening,languageDirective:localeHelp,
  languageDriftGuard:(text)=>unexpectedTeacherKorean(text,s.targetLanguage,s.nativeLanguage,s.teachingMode),
  voice:normalizeLiveVoice(s.voice),language:s.targetLanguage,nativeLanguage:s.nativeLanguage,
  teacherReport:false,trackSpeakingLevel:false,persistHistory:false,sessionKind:"teacher",
  tools:[{functionDeclarations:[...BOARD_TOOLS[0].functionDeclarations,...DIRECTOR_TOOL.functionDeclarations]}],
  onToolsUnavailable:()=>{record("tools-unavailable");setToolsUnavailable(true)},
  onConfirmedTranscript:turn=>{record("confirmed-input",{},turn.input||"");processConfirmedSpeech(turn.input||"")},
  onToolCall:(call)=>{
   record("tool-call",{name:call.name===BOARD_FUNCTION||call.name===DIRECTOR_FUNCTION?call.name:"unknown"});
   const reply=(result:{ok:boolean;error?:string;updated?:number;action?:string;phase?:string;cardId?:string|null})=>{record("tool-result",result);return result};
   if(topicEndedRef.current)return reply({ok:false,error:"topic-finished"});
   if(call.name===BOARD_FUNCTION){
    const patch=validateBoardPatch(call.args);
    if(!patch)return reply({ok:false,error:"invalid-board-patch"});
    if(!commitPatch(patch,"live"))return reply({ok:false,error:"learner-answer-pending"});
    patchCountRef.current++;setHasLivePatch(true);
    return reply({ok:true,updated:patch.cards.length,action:patch.action});
   }
   if(call.name===DIRECTOR_FUNCTION){
    const command=validateDirectorCommand(call.args,cardRef.current);
    if(!command)return reply({ok:false,error:"invalid-stage-command"});
    record("stage-command",{action:command.action,cardId:command.cardId},command);
    if(lessonRef.current)return reply({ok:false,error:"learner-controls-curriculum"});
    const next=applyDirectorCommand(directorRef.current,command,cardRef.current,answersRef.current);
    if(!next)return reply({ok:false,error:"stage-locked-or-no-answer"});
    changeDirector(next);
    setLatestId(next.cardId);if(followingRef.current)setFocusedId(null);
    setRevision(v=>v+1);setHasLivePatch(true);
    return reply({ok:true,phase:next.phase,cardId:next.cardId});
   }
   return reply({ok:false,error:"unknown-tool"});
  },
  onRecovered:()=>{
   record("reconnected");
   const summary=boardNotes(cardRef.current).slice(0,1300);
   live.sendControl("[BOARD CONTINUITY] Reconnected. Preserve lesson and stage. Current phase="+directorRef.current.phase+", focused card="+directorRef.current.cardId+", quiz question="+(directorRef.current.quizIndex+1)+". If awaiting, wait for learner and do not change cards. "+summary+"\n"+localeHelp);
  },
  onTurnComplete:(turn)=>{
   record("turn-complete",{validOutput:turn.hasValidOutput!==false,livePatch:patchCountRef.current!==lastTurnPatchRef.current},{input:turn.input||"",output:turn.output||""});
   if(topicEndedRef.current)return;
   if(lessonRef.current){
    setLessonTransitioning(false);
    if(turn.hasValidOutput&&turn.output?.trim())setLessonExplained(true);
   }
   processConfirmedSpeech(turn.input||"");
   const updatedByLive=patchCountRef.current!==lastTurnPatchRef.current;
   lastTurnPatchRef.current=patchCountRef.current;
   const format=formatRequestRef.current;
   if(turn.hasValidOutput!==false)formatRequestRef.current=null;
   if(!updatedByLive&&!lessonRef.current&&directorRef.current.phase==="explaining"){
    const requested=format?{...turn,input:PRESENTATION_CUES[format]+" "+(turn.input||"")}:turn;
    const patch=fallbackBoard(requested,cardRef.current);
    if(patch)commitPatch(patch,"fallback");
   }
   const pending=pendingQuizRef.current,d=directorRef.current;
   if(pending&&!lessonRef.current&&turn.output?.trim()&&d.phase==="feedback"&&d.cardId===pending.cardId&&d.quizIndex===pending.index){
    pendingQuizRef.current=null;
    const card=cardRef.current.find(c=>c.id===pending.cardId);
    if(card){
     const next=planAdaptiveNext(card,pending.index,pending.correct,cardRef.current,!!lessonRef.current);
     if(next.kind==="review")reviewCard();
     else if(next.kind==="next-question")navigateCard(card.id,next.index);
     else if(next.kind==="next-lesson")goLessonStep(next.index);
     else if(next.kind==="next-exercise")nextExercise();
    }
   }
  }
 });
 const active=speakingStates.includes(live.state);
 const focusedCard=cards.find(c=>c.id===(following?latestId:focusedId))||cards[cards.length-1];
 const lesson=lessonId?findLesson(lessonId):undefined;
 const progress=lesson?lessonProgress(lesson,answers,speakingAssessment):null;
 const currentStepDone=!!lesson&&!!completedSteps[lesson.cards[lessonStep]?.id];
 function completeCurrentStep(){
  if(!lesson)return;
  const card=lesson.cards[lessonStep];
  if(card.type==="quiz"&&!card.questions.every((q,i)=>answers[card.id+":"+i]===q.answerIndex))return;
  if(card.type==="speaking"&&!speakingAssessment?.met)return;
  if(card.type!=="quiz"&&card.type!=="speaking"&&!lessonExplained)return;
  setCompletedSteps(old=>({...old,[card.id]:true}));
 }
 useEffect(()=>{
  const rail=deckRef.current,selected=rail?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
  if(!rail||!selected)return;
  const a=rail.getBoundingClientRect(),b=selected.getBoundingClientRect();
  if(b.left<a.left)rail.scrollLeft-=a.left-b.left+8;
  else if(b.right>a.right)rail.scrollLeft+=b.right-a.right+8;
 },[focusedCard?.id,following,revision]);
 useEffect(()=>{document.body.classList.add("teacher-theme","session-page");return()=>{document.body.classList.remove("teacher-theme","session-page")}},[]);
 useEffect(()=>{if(live.state==="error")setHint(t("board.disconnect"));},[live.state,t]);
 useEffect(()=>{record("connection",{state:live.state});},[live.state]);
 useEffect(()=>{record("view",{cardId:focusedCard?.id||null,following,latestId,lessonId,lessonStep});},[focusedCard?.id,following,latestId,lessonId,lessonStep]);
 async function copyDiagnostics(){
  try{const report=journal.current!.exportReport(includeDiagnosticText,{language:s.targetLanguage,teacher:profile.id,state:live.state,following,visibleCard:focusedCard?.id||null,latestId,viewport:boardViewport(),cards:cards.map(c=>({id:c.id,type:c.type}))});
   await navigator.clipboard.writeText(JSON.stringify(report,null,2));setDiagnosticStatus(english?"Report copied":"診斷報告已複製");
  }catch{setDiagnosticStatus(english?"Copy failed":"複製失敗");}
 }
 function ask(text:string){
  record("learner-action",{action:"ask"},text);
  if(!active||!live.sendText(text+"\n"+localeHelp)){setHint(t("board.startFirst"));return}
  setHint("");
 }
 function showFormats(){
  lessonRef.current=null;setLessonId(null);setLessonStep(0);
  pendingQuizRef.current=null;changeDirector(EMPTY_DIRECTOR);
  reviewReturnRef.current=null;setReviewReturn(null);
  const patch=fallbackBoard({input:"展示不同卡片種類的格式示範"},[]);
  if(patch&&commitPatch(patch)){
   const first=patch.cards.find(card=>card.type==="comparison")||patch.cards[0];
   if(first){changeDirector({...EMPTY_DIRECTOR,cardId:first.id});setLatestId(first.id);setFocusedId(null);setFollowing(true)}
   setHasLivePatch(false);setShowingDemo(true)
  }
  if(active)live.sendControl("[BOARD FORMAT SHOWCASE] The learner is viewing locally curated example formats, not live AI output. Please do not change them unless they ask about a specific example.");
  setHint("");
 }
 function startDueReview(){
  if(directorRef.current.phase==="awaiting"||!reviews.due.length)return;
  lessonRef.current=null;setLessonId(null);setLessonStep(0);changeDirector(EMPTY_DIRECTOR);
  reviewReturnRef.current=null;setReviewReturn(null);
  const pairs=reviews.due.map(item=>({source:item.source,target:item.target}));
  commitPatch({action:"replace",ids:[],cards:[{id:"scheduled-review",type:"flashcard",title:t("board.review.title"),body:"",pairs,points:[],questions:[]}]});
  if(active)live.sendControl("[REVIEW MODE] Due cards were self-rated, not graded. Wait for learner recall or oral practice.");
 }
 function coachFlashcard(card:BoardCard,reviews:FlashReview[],scope:"item"|"weak"){
  ask(flashcardTeacherPrompt(card,reviews,scope));
 }
 function rateFlashcard(card:BoardCard,review:FlashReview){
  if(!showingDemo&&!card.id.startsWith("demo-"))reviews.rate(review,review.rating);
 }
 function choosePresentation(kind:BoardPresentation){
  if(!active){setHint(t("board.startFirst"));return;}
  formatRequestRef.current=kind;
  ask(boardPresentationRequest(kind,cardRef.current));
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
  const key=card.id+":"+prior.index;
  const next={...answersRef.current};delete next[key];answersRef.current=next;setAnswers(next);
  reviewReturnRef.current=null;setReviewReturn(null);
  pendingQuizRef.current=null;
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
  <header className="teaching-board-top"><Link to="/learn" className="teaching-board-back" aria-label={t("board.back")}><Arrow direction="left"/></Link>
   <div><strong>{t("board.title")}</strong><small>{s.targetLanguage} · {s.learnerSpeakingLevel} · {profile.name}</small></div>
   <span className="teaching-board-connection" data-state={live.state}>{phase}</span>
   <details className="teaching-board-diagnostics"><summary aria-label={english?"Report lesson problem":"回報教學問題"}>{english?"Report":"回報"}</summary><div className="teaching-board-diagnostics-panel"><strong>{english?"Lesson diagnostics":"教學診斷報告"}</strong><p>{english?"Session only. Nothing is uploaded. Optionally include transcript and card content. No audio or credential configuration is collected.":"僅保留本頁工作階段，不會上傳。勾選後才會在報告加入對話與教材內容；不收集原始錄音或金鑰設定。"}</p><label><input type="checkbox" checked={includeDiagnosticText} onChange={e=>{setIncludeDiagnosticText(e.target.checked);setDiagnosticStatus("")}}/>{english?"Include transcript and card content":"包含對話及教材內容"}</label><button type="button" onClick={()=>void copyDiagnostics()}>{english?"Copy diagnostics":"複製診斷報告"}</button><small role="status">{diagnosticStatus}</small></div></details>
  </header>
  <main className="teaching-board-layout">
   <GuidedLessonPanel lesson={lesson} lessonId={lessonId} lessonStep={lessonStep} progress={progress} english={english}
    quizLocked={focusedCard?.type==="quiz"&&director.phase==="awaiting"} onStart={startLesson} onStep={goLessonStep}/>
   <section className="teaching-board-workspace">
   <BoardTutorPanel live={live} profile={profile} targetLanguage={s.targetLanguage} english={english} hint={hint} onAsk={ask}/>
   <section className="teaching-board-canvas" aria-label={t("board.canvas")}>
    <BoardQuickControls english={english} guided={!!lesson} hasCards={cards.length>0&&!topicEnded} step={lessonStep} steps={lesson?.cards.length||0} onNext={()=>goLessonStep(lessonStep+1)} onEnd={endTopic} onLesson={startLesson} onTopic={startFreeTopic} voiceControls={<LiveControls live={live} compact prominentInterrupt english={english} onEnd={async()=>{record("call-end");await live.stop(true);navigate("/learn")}}/>}/>
    {topicEnded&&<p className="teaching-board-topic-ended" role="status">{english?"Topic finished. Your notes remain below for review. Choose a new topic above when ready.":"這個話題已結束。下方教材保留供回顧，想繼續時可從上方選新話題。"}</p>}
    <div className="teaching-board-canvas-head"><div><span className="kicker">{lesson?(english?"CURRENT LESSON":"目前教材"):"CREW · LIVE BOARD"}</span><h1>{lesson?lesson.title:t("board.canvas")}</h1>
     <p>{lesson?(english?"The teacher explains this material. You choose when to change steps.":"老師依照這份教材講解，只有你切換步驟時才換頁。"):t(showingDemo?"board.demoHint":hasLivePatch?"board.liveHint":(!toolsUnavailable)?"board.fallbackHint":"board.modelFallbackHint")}</p>
    </div></div>
    <details className="teaching-board-more"><summary>{english?"Board tools & review":"白板工具與複習"}{reviews.due.length>0?" · "+reviews.due.length:""}</summary><div className="teaching-board-canvas-actions">{!lesson&&<button type="button" className="teaching-board-formats-button" onClick={showFormats}>{t("board.showFormats")}</button>}
     <span className="teaching-board-mode">{showingDemo?t("board.demoMode"):hasLivePatch?t("board.liveMode"):t("board.turnMode")}</span></div>
    <BoardReviewBanner due={reviews.due.length} total={reviews.total} enabled={memoryEnabled}
     blocked={director.phase==="awaiting"} onStart={startDueReview} onClear={reviews.clear}/>
    {!lessonId&&<BoardPresentationBar onChoose={choosePresentation} disabled={!active||director.phase==="awaiting"}/>}</details>
    {cards.length>0&&<div className="teaching-board-navigator">
     <div className="teaching-board-navigator-head"><strong>{t("board.lessonCards",{count:cards.length})}</strong>
      <small>{following?t("board.following"):t("board.paused")}</small>
      {!following&&<button className="teaching-board-follow" type="button" onClick={()=>{record("follow-latest");setFollowing(true);setFocusedId(null)}}>{t("board.followLatest")} <Arrow direction="right"/></button>}
     </div>
     <div className="teaching-board-deck" ref={deckRef} role="tablist" aria-label={t("board.lessonCards",{count:cards.length})}>
      {cards.map((card,index)=><button key={card.id} type="button" role="tab" id={"teaching-board-tab-"+card.id}
       aria-controls="teaching-board-active-panel" aria-selected={focusedCard?.id===card.id}
       className={"teaching-board-deck-tab"+(focusedCard?.id===card.id?" is-active":"")}
       onClick={()=>{if(lessonId)goLessonStep(index);else{record("card-selected",{cardId:card.id});setFollowing(false);setFocusedId(card.id)}}}>
       <small>{index+1} · {cardKindName(card.type,english)}{latestId===card.id?" · "+t("board.latest"):""}</small><span>{card.title}</span>
      </button>)}
     </div>
    </div>}
    {lesson&&<div className="teaching-board-curriculum-note" role="status"><p>{english?"Step":"教材"} {lessonStep+1} / {lesson.cards.length} · {lesson.goal}</p><p>{lessonTransitioning?(english?"Switching explanation…":"正在切換講解…"):(lessonExplained?(english?"Explanation ready":"老師已完成本段講解"):(english?"Listen to this lesson before completing it":"先聽老師講解這份教材"))}</p><button type="button" disabled={currentStepDone||lessonTransitioning||((focusedCard?.type==="quiz")?!progress?.quiz:(focusedCard?.type==="speaking")?!progress?.speaking:!lessonExplained)} onClick={completeCurrentStep}>{currentStepDone?(english?"Completed ✓":"已完成 ✓"):(english?"Mark this step complete":"完成這一節")}</button><span>{Object.keys(completedSteps).filter(id=>completedSteps[id]&&lesson.cards.some(card=>card.id===id)).length} / {lesson.cards.length}</span></div>}
     <div className={"teaching-board-stage"+(focusedCard?" has-card":"")} data-following={following} role="tabpanel" id="teaching-board-active-panel"
     aria-label={focusedCard?.title||t("board.canvas")} aria-labelledby={focusedCard?"teaching-board-tab-"+focusedCard.id:undefined}>
     {!focusedCard?<div className="teaching-board-empty"><strong>{t("board.emptyTitle")}</strong><p>{t("board.emptyDesc")}</p></div>:
      <TeachingCard key={focusedCard.id} card={focusedCard} answers={answers} onAnswer={clickAnswer} onExplain={text=>ask(t("board.explainPrefix")+text)} english={english}
       focusIndex={director.cardId===focusedCard.id?director.focusIndex:-1}
       revealCount={director.cardId===focusedCard.id?director.revealed:null}
       quizIndex={director.cardId===focusedCard.id?director.quizIndex:0} onNavigate={index=>navigateCard(focusedCard.id,index)}
       onSpeakingSubmit={text=>submitSpeaking(text,true)} onFlashcardPractice={coachFlashcard} onFlashcardRate={rateFlashcard} speakingAssessment={director.cardId===focusedCard.id?speakingAssessment:null}/>}
    </div>
    {focusedCard&&following&&director.cardId===focusedCard.id&&<div className="teaching-board-director-status" role="status">
     {director.phase==="awaiting"&&<button type="button" onClick={requestHint}>{t("board.lessonPicker.hint")}</button>}
     {director.phase==="awaiting"&&director.hintText&&<span className="teaching-board-director-hint">{director.hintText}</span>}
     {reviewReturn&&<button type="button" onClick={returnToQuestion}>{t("board.lessonPicker.retry")}</button>}
     <span className={"teaching-board-director-phase is-"+director.phase}>{t("board.director."+director.phase)}</span>
     {director.phase==="feedback"&&director.result==="incorrect"&&director.reviewCardId&&<button type="button" onClick={reviewCard}>{t("board.director.review")}</button>}
     {director.phase==="feedback"&&focusedCard.type==="quiz"&&<button type="button" onClick={nextExercise}>{director.quizIndex+1<focusedCard.questions.length?t("board.director.next"):t("board.director.another")}</button>}
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
