import{useMemo,useState}from"react";
import{VOCABULARY_WORDS,type VocabularyWord}from"./vocabularyCatalog";
import{chooseVocabulary,vocabularyChoices}from"./vocabularyQueue";
import{placementState,placementLabel,recordPlacement}from"./adaptivePlacement";
import{incrementTodayVocabulary,recordVocab,todayVocabulary,vocabStats}from"./vocabularyProgress";

function speak(t:string){if(!("speechSynthesis"in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang="en-US";u.rate=.9;speechSynthesis.speak(u)}

export function VocabularyPage(){
 const initialScore=placementState().score;
 const[score,setScore]=useState(initialScore),[done,setDone]=useState(todayVocabulary()),[streak,setStreak]=useState(0),[word,setWord]=useState<VocabularyWord>(()=>chooseVocabulary(initialScore,undefined,0)),[locked,setLocked]=useState(false),[feedback,setFeedback]=useState("選出最接近的中文意思。"),[picked,setPicked]=useState("");
 const options=useMemo(()=>vocabularyChoices(word),[word]);
 const stats=vocabStats(VOCABULARY_WORDS.map(x=>x[0]));

 function answer(choice:string){
  if(locked)return;setLocked(true);setPicked(choice);
  const correct=choice===word[1],nextStreak=correct?streak+1:0;
  const nextPlacement=recordPlacement(word,correct),ns=nextPlacement.score,nd=incrementTodayVocabulary();
  recordVocab(word[0],correct);setScore(ns);setDone(nd);setStreak(nextStreak);
  setFeedback(correct?"答對了。"+word[2]:"正確是「"+word[1]+"」。例句："+word[2]+"　可以再聽一次發音。");
  speak(word[0]);
  window.setTimeout(()=>{setWord(w=>chooseVocabulary(ns,w,nd));setLocked(false);setPicked("");setFeedback("選出最接近的中文意思。")},correct?650:3000);
 }

 return <><section className="hero"><span className="kicker">Vocabulary</span><h1>快速作答，難度跟著你走</h1><p>依你的回答調整難度；答對高一級的單字還會再驗證一次，不會因猜對一題就跳級。</p></section>
 <section className="section panel"><div className="row" style={{justifyContent:"space-between"}}><div><strong>今日進度</strong><div className="meta">{done} / 20 · 到期 {stats.due} · 已熟悉 {stats.mastered}</div></div><span className="pill">{streak>=2?"⚡ ":""}{streak} 連擊</span></div><div className="progress-track"><div className="progress-fill" style={{width:Math.min(100,done/20*100)+"%"}}/></div></section>
 <section className="section quiz-card"><div className="quiz-meta"><span className="pill">{placementLabel({...placementState(),score})}</span><span className="pill">{word[4]}</span></div><div className="quiz-word">{word[0]}</div><button className="btn secondary small" onClick={()=>speak(word[0])}>聽發音</button>{word[2]&&<p className="quiz-example">{word[2]}</p>}<div className="quiz-list">{options.map(x=><button key={x} className={"quiz-choice "+(locked?(x===word[1]?"correct":x===picked?"wrong":""):"")} disabled={locked} onClick={()=>answer(x)}>{x}</button>)}</div><div className="quiz-feedback">{feedback}</div></section></>;
}
