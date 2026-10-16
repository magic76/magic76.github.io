import{useEffect,useMemo,useState}from"react";import{useTranslation}from"react-i18next";import{useTeacherStore}from"../store/teacherStore";import{teacherText}from"./teacherLocale";import{contentReady,ensureVocabularyContent,localizedVocabulary}from"./vocabularyContent";
import{VOCABULARY_WORDS,type VocabularyWord}from"./vocabularyCatalog";
import{chooseVocabulary,vocabularyChoices}from"./vocabularyQueue";
import{placementState,placementLabel,recordPlacement}from"./adaptivePlacement";
import{incrementTodayVocabulary,recordVocab,todayVocabulary,vocabStats}from"./vocabularyProgress";
import{trackUsageEvent}from"../analytics/usage";

function speak(t:string){if(!("speechSynthesis"in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang="en-US";u.rate=.9;speechSynthesis.speak(u)}

export function VocabularyPage(){
 const {t}=useTranslation("teacher");
 const native=useTeacherStore(s=>s.nativeLanguage),initialScore=placementState().score;
 const[refresh,setRefresh]=useState(0),[contentError,setContentError]=useState("");
 const[score,setScore]=useState(initialScore),[done,setDone]=useState(todayVocabulary()),[streak,setStreak]=useState(0),[word,setWord]=useState<VocabularyWord>(()=>chooseVocabulary(initialScore,undefined,0,native)),[locked,setLocked]=useState(false),[feedback,setFeedback]=useState(teacherText(native,"vocabQuestion")),[picked,setPicked]=useState("");
 const options=useMemo(()=>vocabularyChoices(word,native),[word,native,refresh]);
 const needsContent=!contentReady(native,score);
 useEffect(()=>{let cancelled=false;setContentError("");void ensureVocabularyContent(native,score).then(()=>{if(cancelled)return;setRefresh(v=>v+1);setWord(w=>chooseVocabulary(score,w,done,native))}).catch(e=>{if(!cancelled)setContentError(e instanceof Error?e.message:t("vocabulary.contentError"))});return()=>{cancelled=true}},[native,Math.floor(score/20)]);
 const stats=vocabStats(localizedVocabulary(native).map(x=>x[0]));

 function answer(choice:string){
  if(locked||needsContent)return;trackUsageEvent("vocabulary_practice");setLocked(true);setPicked(choice);
  const correct=choice===word[1],nextStreak=correct?streak+1:0;
  const nextPlacement=recordPlacement(word,correct),ns=nextPlacement.score,nd=incrementTodayVocabulary();
  recordVocab(word[0],correct);setScore(ns);setDone(nd);setStreak(nextStreak);
  setFeedback(correct?teacherText(native,"right")+(word[2]?" · "+word[2]:""):teacherText(native,"wrong")+"：「"+word[1]+"」"+(word[2]?" · "+word[2]:""));
  speak(word[0]);
  window.setTimeout(()=>{setWord(w=>chooseVocabulary(ns,w,nd,native));setLocked(false);setPicked("");setFeedback(teacherText(native,"vocabQuestion"))},correct?650:3000);
 }

 return <><section className="hero"><span className="kicker">Vocabulary</span><h1>{t("vocabulary.title")}</h1><p>{t("vocabulary.intro")}</p></section>
 <section className="section panel"><div className="row" style={{justifyContent:"space-between"}}><div><strong>{t("vocabulary.progress")}</strong><div className="meta">{t("vocabulary.progressStats",{done,due:stats.due,mastered:stats.mastered})}</div></div><span className="pill">{streak>=2?"⚡ ":""}{t("vocabulary.streak",{count:streak})}</span></div><div className="progress-track"><div className="progress-fill" style={{width:Math.min(100,done/20*100)+"%"}}/></div></section>
 <section className="section quiz-card" data-feedback={locked?(picked===word[1]?"correct":"wrong"):"idle"} data-streak={streak>=5?"high":"normal"}><div className="quiz-meta"><span className="pill">{placementLabel({...placementState(),score})}</span><span className="pill">{word[4]}</span></div><div className="quiz-word" key={word[0]} data-word={word[0]}>{word[0]}</div><button className="btn secondary small" onClick={()=>speak(word[0])}>{t("vocabulary.listen")}</button>{word[2]&&<p className="quiz-example">{word[2]}</p>}{needsContent&&<p className="meta" role="status">{contentError?t("vocabulary.contentFailed",{reason:contentError}):t("vocabulary.preparing")} {contentError&&<button className="btn secondary small" onClick={()=>{setContentError("");void ensureVocabularyContent(native,score).then(()=>setRefresh(v=>v+1)).catch(e=>setContentError(String(e)))}}>{t("vocabulary.retry")}</button>}</p>}<div className="quiz-list">{options.map(x=><button key={x} className={"quiz-choice "+(locked?(x===word[1]?"correct":x===picked?"wrong":""):"")} disabled={locked||needsContent} onClick={()=>answer(x)}>{x}</button>)}</div><div className="quiz-feedback">{feedback}</div></section></>;
}
