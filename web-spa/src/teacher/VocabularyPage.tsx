import {useEffect,useMemo,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {teacherText} from "./teacherLocale";
import {contentReady,ensureVocabularyContent,localizedVocabulary} from "./vocabularyContent";
import {type VocabularyWord} from "./vocabularyCatalog";
import {chooseVocabulary,vocabularyChoices,nativeVocabularyChoicesReady} from "./vocabularyQueue";
import {placementState,placementLabel,recordPlacement} from "./adaptivePlacement";
import {incrementTodayVocabulary,recordVocab,todayVocabulary,vocabStats} from "./vocabularyProgress";
import {trackUsageEvent} from "../analytics/usage";
import "./learningFlow.css";

const DAILY_GOAL=20;
function speak(word:string){
 if(!("speechSynthesis" in window))return;
 speechSynthesis.cancel();
 const utterance=new SpeechSynthesisUtterance(word);
 utterance.lang="en-US";
 utterance.rate=.9;
 speechSynthesis.speak(utterance);
}

export function VocabularyPage(){
 const {t}=useTranslation("teacher");
 const native=useTeacherStore(s=>s.nativeLanguage);
 const answerLockRef=useRef(false); // Synchronous guard against rapid double taps before React re-renders.
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
  speak(word[0]);
 }

 function nextQuestion(){
  if(!revealed)return;
  answerLockRef.current=false;
  setRevealed(false);
  setPicked("");
  setFeedback(teacherText(native,"vocabQuestion"));
  if(done>=DAILY_GOAL&&!continueAfterGoal){
   setShowCompletion(true);
   return;
  }
  setWord(previous=>chooseVocabulary(score,previous,done,native));
 }
 function continuePractice(){
  answerLockRef.current=false;
  setContinueAfterGoal(true);
  setShowCompletion(false);
  setRevealed(false);
  setPicked("");
  setFeedback(teacherText(native,"vocabQuestion"));
  setWord(previous=>chooseVocabulary(score,previous,done,native));
 }

 return <div className="crew-learning-focus">
  <section className="crew-learning-quiz" aria-label={t("vocabulary.title")}>
   <div className="crew-learning-quiz-top">
    <div><span className="kicker">Vocabulary</span><h1>{t("vocabulary.title")}</h1></div>
    <span className="pill">{placementLabel({...placementState(),score})}</span>
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
   </div>:<div className="quiz-card crew-learning-question" data-feedback={revealed?(picked===word[1]?"correct":"wrong"):"idle"} data-streak={streak>=5?"high":"normal"}>
    <div className="quiz-meta"><span className="pill">{word[4]}</span><span className="pill">{t("vocabulary.streak",{count:streak})}</span></div>
    <p className="crew-learning-question-prompt">{t("vocabulary.pickMeaning")}</p>
    <div className="quiz-word" key={word[0]} data-word={word[0]}>{word[0]}</div>
    <button className="btn secondary small" onClick={()=>speak(word[0])}>{t("vocabulary.listen")}</button>
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
     {word[2]&&<p>{word[2]}</p>}
    </div>}
    {revealed&&<button className="btn primary crew-learning-full-cta" onClick={nextQuestion}>{t("vocabulary.nextQuestion")} →</button>}
   </div>}
  </section>
  <div className="crew-learning-secondary-meta">{t("vocabulary.progressStats",{done,due:stats.due,mastered:stats.mastered})}</div>
 </div>;
}
