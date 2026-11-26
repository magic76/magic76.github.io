import {learningLanguageCode} from "./learningLanguages";
import{useEffect,useMemo,useState}from"react";
import{PhraseRecording}from"./PhraseRecording";
import{useTranslation}from"react-i18next";
import{addDeckItem,dueDeckItems,readLearningDeck,removeDeckItem,reviewDeckItem,type DeckItem}from"./learningDeck";
import{dailyPhrases}from"./dailyPhrases";
import{normalizeLearningLanguage,speakLearningText}from"./learningSpeech";
import{useTeacherStore}from"../store/teacherStore";
import"./learningFlow.css";

function unique<T extends{text:string}>(items:T[]){const seen=new Set<string>();return items.filter(item=>{const key=item.text.trim().toLocaleLowerCase();if(seen.has(key))return false;seen.add(key);return true})}

export function PhrasebookPage(){
 const target=useTeacherStore(s=>s.targetLanguage),code=learningLanguageCode(target)||"en";
 return <PhrasebookSession key={code} code={code} target={target}/>;
}
function PhrasebookSession({code,target}:{code:NonNullable<ReturnType<typeof learningLanguageCode>>;target:string}){
 const{t}=useTranslation("teacher");
 const[items,setItems]=useState<DeckItem[]>([]);
 const[deckState,setDeckState]=useState<"loading"|"ready"|"error">("loading");
 const[speechStatus,setSpeechStatus]=useState(""),[activePhrase,setActivePhrase]=useState<string|null>(null),[quizIndex,setQuizIndex]=useState(0),[quizAnswer,setQuizAnswer]=useState("");
 const due=dueDeckItems(items).length,daily=useMemo(()=>dailyPhrases(code),[code]);
 const tag=(x:DeckItem)=>t("phrasebook.tags."+x.category,{defaultValue:t("phrasebook.tags.saved")});
 const stage=(x:DeckItem)=>t("phrasebook.stages."+(x.reviewCount>=5?"familiar":x.reviewCount>=2?"review":x.reviewCount>=1?"learning":"new"));
 function refresh(){
  try{setItems(readLearningDeck().filter(item=>(item.language?learningLanguageCode(item.language):"en")===code));setDeckState("ready")}
  catch{setItems([]);setDeckState("error")}
 }
 useEffect(refresh,[]);
 async function listen(text:string,language=code,slow=false){
  if(activePhrase)return;setSpeechStatus("");
  try{
   await speakLearningText(text,language,{speed:slow?"slow":"normal"});
  }catch(error){console.warn("[learning-speech]",error);setSpeechStatus(t("phrasebook.failed"))}
 }
 function togglePractice(id:string){setActivePhrase(value=>value===id?null:id)}
 function practiceButton(id:string){return <button type="button" className="btn secondary small" aria-expanded={activePhrase===id} onClick={()=>togglePractice(id)}>🎙 {t(activePhrase===id?"phrasebook.recordClose":"phrasebook.shadow")}</button>}
 function practicePanel(id:string,text:string,language:string){return activePhrase===id?<PhraseRecording key={id} text={text} language={language}/>:null}
 function saveDaily(text:string,translation:string){addDeckItem({category:"phrase",originalText:text,translation,notes:t("phrasebook.dailyNote"),language:code});refresh()}
 const legacyLanguage=(item:DeckItem)=>item.language?normalizeLearningLanguage(item.language):"en";
 const pool=useMemo(()=>unique([
  ...items.map(item=>({text:item.originalText,translation:item.translation,language:legacyLanguage(item)})),
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

  <section className="crew-learning-quiz crew-phrase-daily">
   <div className="section-head"><div><span className="kicker">{t("phrasebook.todayKicker")}</span><h2>{t("phrasebook.todayTitle")}</h2></div><small>{target}</small></div>
   <div className="crew-phrase-daily-list">{daily.map((phrase,index)=><article key={phrase.text} className="crew-phrase-row">
    <span className="crew-phrase-number">{index+1}</span><div><strong>{phrase.text}</strong><small>{phrase.translation}</small></div>
    <div className="crew-phrase-inline-actions"><button className="btn secondary small" disabled={activePhrase!==null} onClick={()=>void listen(phrase.text)}>🔊 {t("phrasebook.listen")}</button><button className="btn secondary small" disabled={deckState!=="ready"} onClick={()=>saveDaily(phrase.text,phrase.translation)}>＋ {t("phrasebook.save")}</button>{practiceButton("daily:"+phrase.text)}</div>
    {practicePanel("daily:"+phrase.text,phrase.text,code)}
   </article>)}</div>
  </section>

  {current&&choices.length>=3&&<section className="crew-learning-quiz crew-listening-game">
   <div className="section-head"><div><span className="kicker">{t("phrasebook.listeningKicker")}</span><h2>{t("phrasebook.listeningTitle")}</h2></div><small>{t("phrasebook.questionNumber",{count:quizIndex%pool.length+1})}</small></div>
   <p>{t("phrasebook.listeningPrompt")}</p>
   <button className="btn primary crew-learning-full-cta" disabled={activePhrase!==null} onClick={()=>void listen(current.text,current.language)}>▶ {t("phrasebook.playQuestion")}</button>
   <div className="crew-listening-choices">{choices.map(choice=><button key={choice.text} className={"quiz-choice "+(quizAnswer?(choice.text===current.text?"correct":choice.text===quizAnswer?"wrong":""):"")} disabled={Boolean(quizAnswer)} onClick={()=>setQuizAnswer(choice.text)}>{choice.text}</button>)}</div>
   {quizAnswer&&<div className="crew-learning-answer-feedback" role="status"><strong>{quizAnswer===current.text?t("phrasebook.correct"):t("phrasebook.tryAgain")}</strong><p>{current.text} · {current.translation}</p><button className="btn secondary small" onClick={()=>{setQuizAnswer("");setQuizIndex(value=>value+1)}}>{t("phrasebook.next")}</button></div>}
  </section>}

  <section className="section"><div className="section-head"><h2>{t("phrasebook.mySaved")}</h2>{deckState==="ready"&&<small>{t("phrasebook.savedCount",{count:items.length,due})}</small>}</div>
   <div className="learning-deck-list" aria-busy={deckState==="loading"}>
    {deckState==="loading"?<div className="learning-deck-card crew-learning-placeholder" role="status" aria-label={t("common:loading")}/>:
     deckState==="error"?<div className="notice" role="alert"><span>{t("phrasebook.readFailed")}</span><button className="btn secondary small" onClick={refresh}>{t("vocabulary.retry")}</button></div>:
     items.length?items.map(x=><article className="learning-deck-card" key={x.id}>
    <div className="row" style={{justifyContent:"space-between"}}><span className="pill">{tag(x)} · {stage(x)}</span><button className="text-button danger-text" onClick={()=>{if(activePhrase==="saved:"+x.id)setActivePhrase(null);removeDeckItem(x.id);refresh()}}>{t("phrasebook.delete")}</button></div>
    <h3>{x.originalText}</h3>{x.translation&&<p className="translation">{x.translation}</p>}{x.notes&&<p className="meta">{x.notes}</p>}
    <div className="crew-phrase-card-actions"><button className="btn secondary small" disabled={activePhrase!==null} onClick={()=>void listen(x.originalText,legacyLanguage(x))}>🔊 {t("phrasebook.listen")}</button><button className="btn secondary small" disabled={activePhrase!==null} onClick={()=>void listen(x.originalText,legacyLanguage(x),true)}>🐢 {t("phrasebook.slow")}</button>{practiceButton("saved:"+x.id)}</div>
    {practicePanel("saved:"+x.id,x.originalText,legacyLanguage(x))}
    <div className="actions"><button className="btn secondary small" onClick={()=>{reviewDeckItem(x.id);refresh()}}>{t("phrasebook.reviewed")}</button>{x.nextReviewAt&&<small className="meta">{t("phrasebook.nextReview",{date:new Date(x.nextReviewAt).toLocaleDateString()})}</small>}</div>
   </article>):<div className="notice"><div><b>{t("phrasebook.emptyTitle")}</b><p>{t("phrasebook.emptyDesc")}</p></div></div>}</div>
  </section>
 </div>;
}