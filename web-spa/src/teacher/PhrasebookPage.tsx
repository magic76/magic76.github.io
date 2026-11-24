import{useMemo,useRef,useState}from"react";
import{useTranslation}from"react-i18next";
import{addDeckItem,dueDeckItems,learningDeck,removeDeckItem,reviewDeckItem,type DeckItem}from"./learningDeck";
import{dailyPhrases}from"./dailyPhrases";
import{normalizeLearningLanguage,speakLearningText}from"./learningSpeech";
import{useTeacherStore}from"../store/teacherStore";
import"./learningFlow.css";

function unique<T extends{text:string}>(items:T[]){const seen=new Set<string>();return items.filter(item=>{const key=item.text.trim().toLocaleLowerCase();if(seen.has(key))return false;seen.add(key);return true})}

export function PhrasebookPage(){
 const{t}=useTranslation("teacher");
 const target=useTeacherStore(s=>s.targetLanguage),code=normalizeLearningLanguage(target);
 const[items,setItems]=useState(()=>learningDeck()),[speechStatus,setSpeechStatus]=useState(""),[shadowing,setShadowing]=useState(""),[quizIndex,setQuizIndex]=useState(0),[quizAnswer,setQuizAnswer]=useState("");
 const shadowTimer=useRef<number|null>(null),due=dueDeckItems().length,daily=useMemo(()=>dailyPhrases(code),[code]);
 const tag=(x:DeckItem)=>t("phrasebook.tags."+x.category,{defaultValue:t("phrasebook.tags.saved")});
 const stage=(x:DeckItem)=>t("phrasebook.stages."+(x.reviewCount>=5?"familiar":x.reviewCount>=2?"review":x.reviewCount>=1?"learning":"new"));
 const modelStatus=(status:"loading"|"ready")=>setSpeechStatus(status==="loading"?t("phrasebook.modelDownloading"):"");
 function refresh(){setItems(learningDeck())}
 async function listen(text:string,language=code,slow=false){
  setSpeechStatus("");
  try{
   await speakLearningText(text,language,{speed:slow?"slow":"normal",mode:"phrase",onModelStatus:modelStatus});
  }catch(error){console.warn("[learning-speech]",error);setSpeechStatus("")}
 }
 async function shadow(text:string,language=code){
  if(shadowTimer.current)window.clearTimeout(shadowTimer.current);
  setShadowing(t("phrasebook.shadowListen"));
  try{
   await speakLearningText(text,language,{mode:"phrase",onModelStatus:modelStatus});
   setShadowing(t("phrasebook.shadowNow"));
   shadowTimer.current=window.setTimeout(()=>setShadowing(""),5000);
  }catch{setShadowing(t("phrasebook.failed"))}
 }
 function saveDaily(text:string,translation:string){addDeckItem({category:"phrase",originalText:text,translation,notes:t("phrasebook.dailyNote"),language:code});refresh()}
 const legacyLanguage=(item:DeckItem)=>item.language||code;
 const pool=useMemo(()=>unique([
  ...items.filter(item=>!item.language||item.language===code).map(item=>({text:item.originalText,translation:item.translation,language:item.language||code})),
  ...daily.map(item=>({...item,language:code}))
 ]),[items,daily,code]);
 const current=pool.length?pool[quizIndex%pool.length]:null;
 const choices=useMemo(()=>{
  if(!current)return[];
  const alternatives=pool.filter(item=>item.text!==current.text),selected=[current];
  for(let index=0;index<Math.min(2,alternatives.length);index++)selected.push(alternatives[(quizIndex+index)%alternatives.length]);
  const clean=unique(selected);
  if(clean.length<2)return clean;
  const shift=quizIndex%clean.length;
  return [...clean.slice(shift),...clean.slice(0,shift)];
 },[current,pool,quizIndex]);
 return <div className="crew-learning-focus crew-phrase-learning">
  <section className="hero crew-learning-page-heading"><span className="kicker">{t("phrasebook.kicker")}</span><h1>{t("phrasebook.title")}</h1><p>{t("phrasebook.intro")}</p></section>
  {speechStatus&&<p className="crew-learning-secondary-meta crew-phrase-speech-status" role="status">{speechStatus}</p>}
  {shadowing&&<p className="crew-shadowing-cue" role="status">{shadowing}</p>}

  <section className="crew-learning-quiz crew-phrase-daily">
   <div className="section-head"><div><span className="kicker">{t("phrasebook.todayKicker")}</span><h2>{t("phrasebook.todayTitle")}</h2></div><small>{target}</small></div>
   <div className="crew-phrase-daily-list">{daily.map((phrase,index)=><article key={phrase.text} className="crew-phrase-row">
    <span className="crew-phrase-number">{index+1}</span><div><strong>{phrase.text}</strong><small>{phrase.translation}</small></div>
    <div className="crew-phrase-inline-actions"><button className="btn secondary small" onClick={()=>void listen(phrase.text)}>🔊 {t("phrasebook.listen")}</button><button className="btn secondary small" onClick={()=>saveDaily(phrase.text,phrase.translation)}>＋ {t("phrasebook.save")}</button></div>
   </article>)}</div>
  </section>

  {current&&choices.length>=3&&<section className="crew-learning-quiz crew-listening-game">
   <div className="section-head"><div><span className="kicker">{t("phrasebook.listeningKicker")}</span><h2>{t("phrasebook.listeningTitle")}</h2></div><small>{t("phrasebook.questionNumber",{count:quizIndex%pool.length+1})}</small></div>
   <p>{t("phrasebook.listeningPrompt")}</p>
   <button className="btn primary crew-learning-full-cta" onClick={()=>void listen(current.text,current.language)}>▶ {t("phrasebook.playQuestion")}</button>
   <div className="crew-listening-choices">{choices.map(choice=><button key={choice.text} className={"quiz-choice "+(quizAnswer?(choice.text===current.text?"correct":choice.text===quizAnswer?"wrong":""):"")} disabled={Boolean(quizAnswer)} onClick={()=>setQuizAnswer(choice.text)}>{choice.text}</button>)}</div>
   {quizAnswer&&<div className="crew-learning-answer-feedback" role="status"><strong>{quizAnswer===current.text?t("phrasebook.correct"):t("phrasebook.tryAgain")}</strong><p>{current.text} · {current.translation}</p><button className="btn secondary small" onClick={()=>{setQuizAnswer("");setQuizIndex(value=>value+1)}}>{t("phrasebook.next")}</button></div>}
  </section>}

  <section className="section"><div className="section-head"><h2>{t("phrasebook.mySaved")}</h2><small>{t("phrasebook.savedCount",{count:items.length,due})}</small></div>
   <div className="learning-deck-list">{items.length?items.map(x=><article className="learning-deck-card" key={x.id}>
    <div className="row" style={{justifyContent:"space-between"}}><span className="pill">{tag(x)} · {stage(x)}</span><button className="text-button danger-text" onClick={()=>{removeDeckItem(x.id);refresh()}}>{t("phrasebook.delete")}</button></div>
    <h3>{x.originalText}</h3>{x.translation&&<p className="translation">{x.translation}</p>}{x.notes&&<p className="meta">{x.notes}</p>}
    <div className="crew-phrase-card-actions"><button className="btn secondary small" onClick={()=>void listen(x.originalText,legacyLanguage(x))}>🔊 {t("phrasebook.listen")}</button><button className="btn secondary small" onClick={()=>void listen(x.originalText,legacyLanguage(x),true)}>🐢 {t("phrasebook.slow")}</button><button className="btn secondary small" onClick={()=>void shadow(x.originalText,legacyLanguage(x))}>🎙 {t("phrasebook.shadow")}</button></div>
    <div className="actions"><button className="btn secondary small" onClick={()=>{reviewDeckItem(x.id);refresh()}}>{t("phrasebook.reviewed")}</button>{x.nextReviewAt&&<small className="meta">{t("phrasebook.nextReview",{date:new Date(x.nextReviewAt).toLocaleDateString()})}</small>}</div>
   </article>):<div className="notice"><div><b>{t("phrasebook.emptyTitle")}</b><p>{t("phrasebook.emptyDesc")}</p></div></div>}</div>
  </section>
 </div>;
}