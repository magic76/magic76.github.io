import{useMemo,useState}from"react";
import{VOCABULARY_WORDS,type VocabularyWord,cefrForScore}from"./vocabularyCatalog";
import{chooseVocabulary,recordFlow,vocabularyChoices}from"./vocabularyQueue";
import{incrementTodayVocabulary,recordVocab,todayVocabulary,vocabStats}from"./vocabularyProgress";

function speak(t:string){if(!("speechSynthesis"in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang="en-US";u.rate=.9;speechSynthesis.speak(u)}

export function VocabularyPage(){
 const initialScore=Number(localStorage.getItem("crew_vocab_score")||50);
 const[score,setScore]=useState(initialScore),[done,setDone]=useState(todayVocabulary()),[streak,setStreak]=useState(0),[word,setWord]=useState<VocabularyWord>(()=>chooseVocabulary(initialScore,undefined,0)),[locked,setLocked]=useState(false),[feedback,setFeedback]=useState("選出最接近的中文意思。"),[picked,setPicked]=useState("");
 const options=useMemo(()=>vocabularyChoices(word),[word]);
 const stats=vocabStats(VOCABULARY_WORDS.map(x=>x[0]));
 const saveScore=(v:number)=>localStorage.setItem("crew_vocab_score",String(Math.round(v)));

 function answer(choice:string){
  if(locked)return;setLocked(true);setPicked(choice);
  const correct=choice===word[1],nextStreak=correct?streak+1:0;
  const gain=correct?Math.min(5,2+Math.floor((nextStreak+1)/4)):word[5]<=score+4?-2:0;
  const ns=Math.max(0,Math.min(100,score+gain)),nd=incrementTodayVocabulary();
  recordVocab(word[0],correct);recordFlow(correct);setScore(ns);setDone(nd);setStreak(nextStreak);saveScore(ns);
  setFeedback(correct?"答對了。"+word[2]:"正確是「"+word[1]+"」。例句："+word[2]+"　可以再聽一次發音。");
  speak(word[0]);
  window.setTimeout(()=>{setWord(w=>chooseVocabulary(ns,w,nd));setLocked(false);setPicked("");setFeedback("選出最接近的中文意思。")},correct?1100:3000);
 }

 return <><section className="hero"><span className="kicker">Vocabulary</span><h1>快速作答，難度跟著你走</h1><p>和 App 一樣：到期複習優先，平常維持舒適 / 邊界 / 挑戰節奏；答錯後先回到較穩定的題目。</p></section>
 <section className="section panel"><div className="row" style={{justifyContent:"space-between"}}><div><strong>今日進度</strong><div className="meta">{done} / 20 · 到期 {stats.due} · 已熟悉 {stats.mastered}</div></div><span className="pill">{streak>=2?"⚡ ":""}{streak} 連擊</span></div><div className="progress-track"><div className="progress-fill" style={{width:Math.min(100,done/20*100)+"%"}}/></div></section>
 <section className="section quiz-card"><div className="quiz-meta"><span className="pill">{done<6?cefrForScore(score)+" · 校準中":cefrForScore(score)}</span><span className="pill">{word[4]}</span></div><div className="quiz-word">{word[0]}</div><button className="btn secondary small" onClick={()=>speak(word[0])}>聽發音</button><p className="quiz-example">{word[2]}</p><div className="quiz-list">{options.map(x=><button key={x} className={"quiz-choice "+(locked?(x===word[1]?"correct":x===picked?"wrong":""):"")} disabled={locked} onClick={()=>answer(x)}>{x}</button>)}</div><div className="quiz-feedback">{feedback}</div></section></>;
}
