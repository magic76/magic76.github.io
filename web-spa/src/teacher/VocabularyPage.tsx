import {Arrow} from "../components/Arrow";
import {useEffect,useMemo,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {useRouteNamespace} from "../i18n/useRouteNamespace";
import {vocabularyTopicGroup} from "./vocabularyTopics";
import {useTeacherStore} from "../store/teacherStore";
import {teacherText} from "./teacherLocale";
import {contentReady,ensureVocabularyContent,localizedVocabulary} from "./vocabularyContent";
import {type VocabularyWord} from "./vocabularyCatalog";
import {chooseVocabulary,vocabularyChoices,nativeVocabularyChoicesReady} from "./vocabularyQueue";
import {placementState,placementLabel,recordPlacement} from "./adaptivePlacement";
import {incrementTodayVocabulary,recordVocab,todayVocabulary,vocabStats} from "./vocabularyProgress";
import {trackUsageEvent} from "../analytics/usage";
import {speakLearningText} from "./learningSpeech";
import {LearningSpeechOptIn} from "./learningSpeechOptIn";
import {addDeckItem} from "./learningDeck";
import "./learningFlow.css";

const DAILY_GOAL=20;


export function VocabularyPage(){
 const {t}=useTranslation("teacher");
 const {t:tToday}=useTranslation("lesson");
 const stringsReady=useRouteNamespace("lesson");
 const native=useTeacherStore(s=>s.nativeLanguage);
 const[speechError,setSpeechError]=useState(""),[speechNotice,setSpeechNotice]=useState(""),[savedExample,setSavedExample]=useState("");
 const answerLockRef=useRef(false); // Synchronous guard against rapid double taps before React re-renders.
 const autoNextTimeoutRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const[refresh,setRefresh]=useState(0);
 const[contentError,setContentError]=useState("");
 const[score,setScore]=useState(()=>placementState().score);
 const[done,setDone]=useState(()=>todayVocabulary());
 const[streak,setStreak]=useState(0);
 const[word,setWord]=useState<VocabularyWord>(()=>chooseVocabulary(placementState().score,undefined,0,native));
 const[revealed,setRevealed]=useState(false);
 const[picked,setPicked]=useState("");
 const[feedback,setFeedback]=useState(()=>teacherText(native,"vocabQuestion"));
 const[showCompletion,setShowCompletion]=useState(()=>todayVocabulary()>=DAILY_GOAL);
 const[continueAfterGoal,setContinueAfterGoal]=useState(false);
 // Keep the choices stable for the entire question, even if translation finishes
 // while the learner is reading or selecting an answer.
 const options=useMemo(()=>vocabularyChoices(word,native),[word,native]);
 const needsContent=useMemo(()=>!contentReady(native,score),[native,score,refresh]);
 const usingFallback=native!=="zh-TW"&&!nativeVocabularyChoicesReady(native);
 const stats=vocabStats(localizedVocabulary(native).map(x=>x[0]));

 // A pending auto-advance must never update a quiz after navigation away.
 useEffect(()=>()=>{if(autoNextTimeoutRef.current!==null)clearTimeout(autoNextTimeoutRef.current)},[]);

 function pronounce(text:string,slow=false){
  setSpeechError("");
  setSpeechNotice("");
  void speakLearningText(text,"en",{speed:slow?"slow":"normal",mode:"word",onModelStatus:status=>setSpeechNotice(status==="loading"?t("vocabulary.modelDownloading"):"")})
   .catch(error=>{console.warn("[learning-speech]",error);setSpeechNotice("")});
 }

 useEffect(()=>{
  let cancelled=false;
  setContentError("");
  void ensureVocabularyContent(native,score).then(()=>{
   if(!cancelled)setRefresh(v=>v+1);
  }).catch(e=>{
   if(!cancelled)setContentError(e instanceof Error?e.message:t("vocabulary.contentError"));
  });
  return()=>{cancelled=true};
 },[native,Math.floor(score/20)]);

 function answer(choice:string){
  if(answerLockRef.current||revealed||showCompletion)return;
  answerLockRef.current=true;
  trackUsageEvent("vocabulary_practice");
  const correct=choice===word[1];
  setRevealed(true);
  setPicked(choice);
  const nextPlacement=recordPlacement(word,correct);
  const nextDone=incrementTodayVocabulary();
  recordVocab(word[0],correct);
  setScore(nextPlacement.score);
  setDone(nextDone);
  setStreak(previous=>correct?previous+1:0);
  setFeedback(correct?teacherText(native,"right"):teacherText(native,"wrong"));
  pronounce(word[0]);
  if(correct){
   // Show success long enough to register, then advance without another tap.
   autoNextTimeoutRef.current=setTimeout(()=>{
    autoNextTimeoutRef.current=null;
    advanceToQuestion(nextPlacement.score,nextDone);
   },1400);
  }
 }

 function advanceToQuestion(nextScore:number,nextDone:number){
  answerLockRef.current=false;
  setRevealed(false);
  setPicked("");
  setSavedExample("");
  setFeedback(teacherText(native,"vocabQuestion"));
  if(nextDone>=DAILY_GOAL&&!continueAfterGoal){
   setShowCompletion(true);
   return;
  }
  setWord(previous=>chooseVocabulary(nextScore,previous,nextDone,native));
 }
 function nextQuestion(){
  if(!revealed||picked===word[1])return;
  advanceToQuestion(score,done);
 }
 function continuePractice(){
  answerLockRef.current=false;
  setContinueAfterGoal(true);
  setShowCompletion(false);
  setRevealed(false);
  setPicked("");
  setSavedExample("");
  setFeedback(teacherText(native,"vocabQuestion"));
  setWord(previous=>chooseVocabulary(score,previous,done,native));
 }

 return <div className="crew-learning-focus">
  {stringsReady&&<Link className="crew-learn-back-small" to="/learn"><Arrow direction="left"/> {tToday("learnToday.backToLearn")}</Link>}
  <section className="crew-learning-quiz" aria-label={t("vocabulary.title")}>
   <div className="crew-learning-quiz-top">
    <div><span className="kicker">{t("vocabulary.kicker")}</span><h1>{t("vocabulary.title")}</h1></div>
    <span className="pill">{placementState().attempts<8?t("vocabulary.placementEstimating"):placementLabel({...placementState(),score})}</span>
   </div>
   <div className="crew-learning-quiz-progress">
    <span>{t("vocabulary.progress")}</span>
    <strong>{Math.min(done,DAILY_GOAL)} / {DAILY_GOAL}</strong>
   </div>
   <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={DAILY_GOAL} aria-valuenow={Math.min(done,DAILY_GOAL)} aria-label={t("vocabulary.progress")}>
    <div className="progress-fill" style={{width:Math.min(100,done/DAILY_GOAL*100)+"%"}}/>
   </div>
   {showCompletion?<div className="crew-learning-complete" role="status">
    <span aria-hidden="true" className="crew-learning-complete-mark">✓</span>
    <h2>{t("vocabulary.goalComplete")}</h2>
    <p>{t("vocabulary.goalCompleteDesc",{count:done})}</p>
    <button className="btn primary crew-learning-full-cta" onClick={continuePractice}>{t("vocabulary.keepGoing")}</button>
    {stringsReady&&<Link className="btn secondary crew-learning-full-cta" to="/learn">{tToday("learnToday.backToLearn")}</Link>}
   </div>:<div className="quiz-card crew-learning-question" data-feedback={revealed?(picked===word[1]?"correct":"wrong"):"idle"} data-streak={streak>=5?"high":"normal"}>
    <div className="quiz-meta"><span className="pill">{t("vocabulary.topics."+vocabularyTopicGroup(word[4]))}</span><span className="pill">{t("vocabulary.streak",{count:streak})}</span></div>
    <p className="crew-learning-question-prompt">{t("vocabulary.pickMeaning")}</p>
    <div className="quiz-word" key={word[0]} data-word={word[0]}>{word[0]}</div>
    <LearningSpeechOptIn language="en"/>
    <div className="crew-vocab-pronunciation-actions">
     <button className="btn secondary small" type="button" onClick={()=>pronounce(word[0])}>🔊 {t("vocabulary.listen")}</button>
     <button className="btn secondary small" type="button" onClick={()=>pronounce(word[0],true)}>{t("vocabulary.listenSlow")}</button>
    </div>
    {speechNotice&&<p className="crew-vocab-voice-hint" role="status">{speechNotice}</p>}
    {speechError&&<p className="crew-vocab-voice-error" role="alert">{speechError}</p>}
    {needsContent&&<p className="crew-learning-translation-note" role="status">{usingFallback?t("vocabulary.fallbackNotice"):t("vocabulary.partialNotice")}
     {contentError&&<button className="btn secondary small" onClick={()=>{setContentError("");void ensureVocabularyContent(native,score).then(()=>setRefresh(v=>v+1)).catch(e=>setContentError(String(e)))}}>{t("vocabulary.retry")}</button>}
    </p>}
    <div className="quiz-list" role="group" aria-label={t("vocabulary.pickMeaning")}>
     {options.map((choice,index)=><button key={choice} className={"quiz-choice "+(revealed?(choice===word[1]?"correct":choice===picked?"wrong":""):"")} disabled={revealed} onClick={()=>answer(choice)} aria-label={String.fromCharCode(65+index)+". "+choice}>
      <span className="crew-learning-choice-letter" aria-hidden="true">{String.fromCharCode(65+index)}</span>
      <span>{choice}</span>
      {revealed&&choice===word[1]&&<span aria-hidden="true">✓</span>}
     </button>)}
    </div>
    {revealed&&<div className="crew-learning-answer-feedback" role="status">
     <strong>{feedback} {picked!==word[1]&&" · "+word[1]}</strong>
     {word[2]&&<p>{word[2]}</p>}{word[2]&&<div className="crew-vocab-example-actions">
      <button className="btn secondary small" type="button" onClick={()=>pronounce(word[2])}>🔊 {t("vocabulary.listenExample")}</button>
      <button className="btn secondary small" type="button" disabled={savedExample===word[2]} onClick={()=>{addDeckItem({category:"phrase",originalText:word[2],translation:"",notes:t("vocabulary.fromWord",{word:word[0]}),language:"en"});setSavedExample(word[2])}}>{savedExample===word[2]?t("vocabulary.saved"):t("vocabulary.saveExample")}</button>
     </div>}
    </div>}
    {revealed&&picked!==word[1]&&<button className="btn primary crew-learning-full-cta" onClick={nextQuestion}>{t("vocabulary.nextQuestion")} <Arrow/></button>}
   </div>}
  </section>
  <div className="crew-learning-secondary-meta">{t("vocabulary.progressStats",{done,due:stats.due,mastered:stats.mastered})}</div>
 </div>;
}
