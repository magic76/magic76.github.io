import {useRef,useState} from "react";
import {Link} from "react-router-dom";
import {trackUsageEvent} from "../analytics/usage";
import questions from "./travelQuizQuestions.json";

export function TravelEnglishQuiz({english}:{english:boolean}){
 const [answers,setAnswers]=useState<number[]>([]);
 const [index,setIndex]=useState(0);
 const started=useRef(false),completed=useRef(false),locked=useRef(false);
 const question=questions[index],selected=answers[index];
 const done=index===questions.length;
 const score=answers.filter((answer,i)=>answer===questions[i].correct).length;
 function select(choice:number){
  if(locked.current||done)return;
  locked.current=true;
  if(!started.current){started.current=true;trackUsageEvent("seo_quiz_started","travel_english")}
  setAnswers(previous=>[...previous,choice]);
 }
 function advance(){
  if(selected===undefined||!locked.current||done)return;
  locked.current=false;
  if(index===questions.length-1&&!completed.current){completed.current=true;trackUsageEvent("seo_quiz_completed","travel_english")}
  setIndex(index+1);
 }
 function reset(){started.current=false;completed.current=false;locked.current=false;setAnswers([]);setIndex(0)}
 return <section id="travel-english-quiz" className="crew-guide-section crew-ed-quiz" aria-labelledby="travel-quiz-heading">
  <h2 id="travel-quiz-heading">{english?"Travel English dialogue quiz":"旅遊英文情境對話測驗"}</h2>
  <p>{english?"Choose the most natural reply in six real travel situations. Free, no sign-in or API key needed.":"6 題旅遊英文情境，選出最自然的回覆。免費，不需登入或 API Key。"}</p>
  <div className="crew-ed-quiz-progress"><progress value={answers.length} max={questions.length} aria-label={english?"Questions answered":"已完成題數"}/><small>{answers.length} / {questions.length}</small></div>
  {done?<div className="crew-ed-quiz-result" role="status">
   <strong>{english?"Your score":"測驗結果"}：{score} / {questions.length}</strong>
   <p>{english?"Practice a full conversation with a Koolo tutor next.":"接著可以和 Koolo 老師練習完整對話。"}</p>
   <div className="crew-ed-quiz-actions"><button type="button" className="btn secondary" onClick={reset}>{english?"Try again":"再練一次"}</button><Link className="btn" to="/teacher/course/travel/" onClick={()=>trackUsageEvent("seo_quiz_cta_click","travel_english")}>{english?"Practice travel English":"開始旅遊英文練習"}</Link></div>
  </div>:<>
   <div className="crew-ed-quiz-question"><small>{index+1} / {questions.length} · {english?question.placeEn:question.placeZh}</small><strong lang="en" className="crew-travel-quiz-prompt">{question.prompt}</strong></div>
   <div className="crew-ed-quiz-options crew-travel-quiz-options" role="group" aria-label={english?"Choose a reply":"選擇回覆"}>
    {question.choices.map((choice,i)=><button type="button" key={choice} lang="en" disabled={selected!==undefined} aria-pressed={selected===i} className={"crew-ed-quiz-option"+(selected!==undefined&&i===question.correct?" is-correct":selected===i?" is-incorrect":"")} onClick={()=>select(i)}>{choice}</button>)}
   </div>
   {selected!==undefined&&<><div className="crew-ed-quiz-feedback" role="status"><strong>{selected===question.correct?(english?"Correct!":"答對了！"):(english?"Not quite.":"答錯了。")}</strong><p>{english?question.en:question.zh}</p></div><div className="crew-ed-quiz-actions"><button type="button" className="btn" onClick={advance}>{index===questions.length-1?(english?"See score":"查看結果"):(english?"Next question":"下一題")}</button></div></>}
  </>}
 </section>
}
