import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {trackUsageEvent} from "../analytics/usage";
import questions from "./edQuizQuestions.json";
import {speakLearningText,stopLearningSpeech} from "../teacher/learningSpeech";

const choices=["/t/","/d/","/ɪd/"] as const;
type Choice=typeof choices[number];
const explanations={
 en:{voiceless:"After a voiceless consonant other than /t/, use /t/.",voiced:"After a vowel or voiced consonant other than /d/, use /d/.",extra:"After /t/ or /d/, use /ɪd/ and add a syllable."},
 zh:{voiceless:"原形以 /t/ 以外的清子音結尾，-ed 念 /t/。",voiced:"原形以母音或 /d/ 以外的濁子音結尾，-ed 念 /d/。",extra:"原形以 /t/ 或 /d/ 結尾，-ed 念 /ɪd/，多一個音節。"}
};

export function EdEndingQuiz({english}:{english:boolean}){
 const [answers,setAnswers]=useState<Choice[]>([]);
 const [index,setIndex]=useState(0);
 const [audio,setAudio]=useState<"idle"|"playing"|"failed">("idle");
 const speechActive=useRef(false),speechRequest=useRef(0);
 const started=useRef(false),completed=useRef(false);
 const question=questions[index];
 const selected=answers[index];
 const complete=index===questions.length;
 const score=answers.filter((answer,i)=>answer===questions[i].ending).length;
 const language=english?"en":"zh";
 useEffect(()=>()=>{speechRequest.current++;if(speechActive.current)stopLearningSpeech()},[]);
 function clearSpeech(){
  speechRequest.current++;
  if(speechActive.current)stopLearningSpeech();
  speechActive.current=false;setAudio("idle");
 }
 function select(choice:Choice){
  if(!started.current){started.current=true;trackUsageEvent("seo_quiz_started","ed_ending")}
  setAnswers(previous=>previous.length===index?[...previous,choice]:previous);
 }
 function advance(){if(!selected)return;if(index===questions.length-1&&!completed.current){completed.current=true;trackUsageEvent("seo_quiz_completed","ed_ending")}clearSpeech();setIndex(i=>Math.min(i+1,questions.length))}
 function reset(){started.current=false;completed.current=false;clearSpeech();setAnswers([]);setIndex(0)}
 async function listen(){
  if(!question||audio==="playing")return;
  const request=++speechRequest.current;
  speechActive.current=true;setAudio("playing");
  try{
   await speakLearningText(question.word,"en-US");
   if(request===speechRequest.current)setAudio("idle");
  }catch{
   if(request===speechRequest.current)setAudio("failed");
  }finally{
   if(request===speechRequest.current)speechActive.current=false;
  }
 }
 return <section id="ed-ending-quiz" className="crew-guide-section crew-ed-quiz" aria-labelledby="ed-quiz-heading">
  <h2 id="ed-quiz-heading">{english?"-ed ending pronunciation quiz":"英文 -ed 結尾發音測驗"}</h2>
  <p>{english?"Choose /t/, /d/ or /ɪd/ for six regular past-tense verbs. Free, no sign-in or API key needed.":"6 題規則過去式發音練習，選出 /t/、/d/ 或 /ɪd/。免費，不需登入或 API Key。"}</p>
  <div className="crew-ed-quiz-progress">
   <progress value={answers.length} max={questions.length} aria-label={english?"Questions answered":"已完成題數"}/>
   <small>{answers.length} / {questions.length}</small>
  </div>
  {complete?<div className="crew-ed-quiz-result" role="status">
   <strong>{english?"Your score":"測驗結果"}：{score} / {questions.length}</strong>
   <p>{score===questions.length?(english?"All correct! Try saying the words aloud.":"全部答對！試著把單字念出來。"):(english?"Review the final sound of each base verb and try again.":"複習動詞原形的最後一個音，再試一次。")}</p>
   <div className="crew-ed-quiz-actions"><button type="button" className="btn secondary" onClick={reset}>{english?"Try again":"再練一次"}</button>
   <Link className="btn" to="/teacher/pronunciation" onClick={()=>trackUsageEvent("seo_quiz_cta_click","ed_ending")}>{english?"Practice pronunciation":"開始發音練習"}</Link></div>
  </div>:<>
   <div className="crew-ed-quiz-question">
    <small>{english?"Question":"第"} {index+1}{english?"":" 題"}</small>
    <strong lang="en">{question.word}</strong>
    <span>{english?"Base verb":"動詞原形"}: <span lang="en">{question.base}</span></span>
   </div>
   <div className="crew-ed-quiz-options" role="group" aria-label={english?"Choose the ending sound":"選擇字尾發音"}>
    {choices.map(choice=><button type="button" key={choice} disabled={Boolean(selected)} className={"crew-ed-quiz-option"+(selected&&choice===question.ending?" is-correct":selected===choice?" is-incorrect":"")} aria-pressed={selected===choice} onClick={()=>select(choice)}>{choice}</button>)}
   </div>
   {selected&&<>
    <div className="crew-ed-quiz-feedback" role="status">
     <strong>{selected===question.ending?(english?"Correct!":"答對了！"):(english?"Not quite.":"答錯了。")} {question.ending}</strong>
     <p><span lang="en">{question.base}</span> {english?"ends in":"最後一個音是"} {question.last}。{explanations[language][question.rule as keyof typeof explanations.en]}</p>
    </div>
    <div className="crew-ed-quiz-actions">
     <button type="button" className="btn secondary" disabled={audio==="playing"} onClick={()=>void listen()}>{audio==="playing"?(english?"Playing…":"播放中…"):(english?"Listen":"聽發音")}</button>
     <button type="button" className="btn" onClick={advance}>{index===questions.length-1?(english?"See score":"查看結果"):(english?"Next question":"下一題")}</button>
    </div>
    {audio==="failed"&&<p role="status">{english?"Speech is unavailable on this device. You can still finish the quiz.":"此裝置無法播放語音，仍可繼續完成測驗。"}</p>}
   </>}
  </>}
 </section>;
}
