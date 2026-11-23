import{useMemo,useRef,useState}from"react";
import{addDeckItem,dueDeckItems,learningDeck,removeDeckItem,reviewDeckItem,reviewStage,type DeckItem}from"./learningDeck";
import{dailyPhrases}from"./dailyPhrases";
import{normalizeLearningLanguage,speakLearningText}from"./learningSpeech";
import{useTeacherStore}from"../store/teacherStore";
import"./learningFlow.css";

function tag(x:DeckItem){return{correction:"道地糾錯",hint:"回答小抄",vocab:"重點單字",phrase:"實用金句"}[x.category]||"收藏"}
function unique<T extends{text:string}>(items:T[]){const seen=new Set<string>();return items.filter(item=>{const key=item.text.trim().toLocaleLowerCase();if(seen.has(key))return false;seen.add(key);return true})}

export function PhrasebookPage(){
 const target=useTeacherStore(s=>s.targetLanguage),code=normalizeLearningLanguage(target);
 const[items,setItems]=useState(()=>learningDeck()),[speechStatus,setSpeechStatus]=useState(""),[shadowing,setShadowing]=useState(""),[quizIndex,setQuizIndex]=useState(0),[quizAnswer,setQuizAnswer]=useState("");
 const shadowTimer=useRef<number|null>(null),due=dueDeckItems().length,daily=useMemo(()=>dailyPhrases(code),[code]);
 function refresh(){setItems(learningDeck())}
 async function listen(text:string,language=code,slow=false){
  setSpeechStatus("正在準備發音…");
  try{const result=await speakLearningText(text,language,{speed:slow?"slow":"normal",mode:"phrase"});setSpeechStatus((result.engine==="kokoro"?"Kokoro":result.engine==="pico"?"Pico":"系統語音")+" · "+(result.cached?"已快取":"已播放"))}
  catch{setSpeechStatus("發音失敗，請再試一次。")}
 }
 async function shadow(text:string,language=code){
  if(shadowTimer.current)window.clearTimeout(shadowTimer.current);
  setShadowing("先聽一次…");
  try{await speakLearningText(text,language,{mode:"phrase"});setShadowing("換你說：跟著剛才的節奏完整說一次。");shadowTimer.current=window.setTimeout(()=>setShadowing(""),5000)}
  catch{setShadowing("發音失敗，請再試一次。")}
 }
 function saveDaily(text:string,translation:string){addDeckItem({category:"phrase",originalText:text,translation,notes:"今日 5 句",language:code});refresh()}
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
  <section className="hero crew-learning-page-heading"><span className="kicker">My Learning Deck</span><h1>片語學習</h1><p>把單字變成真的會說的句子：聽、慢速、跟讀，再用聽力小遊戲複習。</p></section>

  <section className="crew-learning-quiz crew-phrase-daily">
   <div className="section-head"><div><span className="kicker">TODAY</span><h2>今天 5 句</h2></div><small>{target}</small></div>
   <div className="crew-phrase-daily-list">{daily.map((phrase,index)=><article key={phrase.text} className="crew-phrase-row">
    <span className="crew-phrase-number">{index+1}</span><div><strong>{phrase.text}</strong><small>{phrase.translation}</small></div>
    <div className="crew-phrase-inline-actions"><button className="btn secondary small" onClick={()=>void listen(phrase.text)}>🔊 聽</button><button className="btn secondary small" onClick={()=>saveDaily(phrase.text,phrase.translation)}>＋ 收藏</button></div>
   </article>)}</div>
  </section>

  {current&&choices.length>=3&&<section className="crew-learning-quiz crew-listening-game">
   <div className="section-head"><div><span className="kicker">LISTENING</span><h2>聽力小遊戲</h2></div><small>第 {quizIndex%pool.length+1} 題</small></div>
   <p>先聽，不看答案。你剛剛聽到哪一句？</p>
   <button className="btn primary crew-learning-full-cta" onClick={()=>void listen(current.text,current.language)}>▶ 播放題目</button>
   <div className="crew-listening-choices">{choices.map(choice=><button key={choice.text} className={"quiz-choice "+(quizAnswer?(choice.text===current.text?"correct":choice.text===quizAnswer?"wrong":""):"")} disabled={Boolean(quizAnswer)} onClick={()=>setQuizAnswer(choice.text)}>{choice.text}</button>)}</div>
   {quizAnswer&&<div className="crew-learning-answer-feedback" role="status"><strong>{quizAnswer===current.text?"答對了 ✓":"再聽一次就會更熟"}</strong><p>{current.text} · {current.translation}</p><button className="btn secondary small" onClick={()=>{setQuizAnswer("");setQuizIndex(value=>value+1)}}>下一題</button></div>}
  </section>}

  <section className="section"><div className="section-head"><h2>我的收藏</h2><small>{items.length} 張 · {due} 張待複習</small></div>
   {speechStatus&&<p className="crew-learning-secondary-meta" role="status">{speechStatus}</p>}
   {shadowing&&<p className="crew-shadowing-cue" role="status">{shadowing}</p>}
   <div className="learning-deck-list">{items.length?items.map(x=><article className="learning-deck-card" key={x.id}>
    <div className="row" style={{justifyContent:"space-between"}}><span className="pill">{tag(x)} · {reviewStage(x)}</span><button className="text-button danger-text" onClick={()=>{removeDeckItem(x.id);refresh()}}>刪除</button></div>
    <h3>{x.originalText}</h3>{x.translation&&<p className="translation">{x.translation}</p>}{x.notes&&<p className="meta">{x.notes}</p>}
    <div className="crew-phrase-card-actions"><button className="btn secondary small" onClick={()=>void listen(x.originalText,legacyLanguage(x))}>🔊 聽</button><button className="btn secondary small" onClick={()=>void listen(x.originalText,legacyLanguage(x),true)}>🐢 慢速</button><button className="btn secondary small" onClick={()=>void shadow(x.originalText,legacyLanguage(x))}>🎙 跟著說</button></div>
    <div className="actions"><button className="btn secondary small" onClick={()=>{reviewDeckItem(x.id);refresh()}}>我複習過了</button>{x.nextReviewAt&&<small className="meta">下次：{new Date(x.nextReviewAt).toLocaleDateString()}</small>}</div>
   </article>):<div className="notice"><div><b>你的學習卡還是空的</b><p>先把上面的「今天 5 句」加入收藏，或從 Zoe 對話裡收藏你想真的學會的句子。</p></div></div>}</div>
  </section>
 </div>;
}