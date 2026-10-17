import {useEffect,useRef,useState,type FormEvent} from "react";
import {geminiKey} from "../lib/runtime";
import {copy,correctGuess,twentyQuestions,type TwentyItem,type MysteryCase} from "./playPuzzles";
import {judgeTwentySpeech,type TwentyJudgement} from "./judgeTwentySpeech";

type Props={
 kind:"twenty-questions"|"mystery";english:boolean;friendName:string;
 item:TwentyItem;caseFile:MysteryCase;onEvent:(message:string)=>void;onNext:()=>void;
 mysterySource?:"generating"|"generated"|"fallback"|"local";
 itemSource?:"generating"|"generated"|"fallback"|"local";
 voiceTurns?:{id:number;text:string}[];
};
type Asked={id:string;question:string;answer:string;source?:"voice"|"screen"};
type Outcome="won"|"lost"|"revealed"|null;
export function CrewWordGames({
 kind,english,friendName,item,caseFile,onEvent,onNext,mysterySource="local",
 itemSource="local",voiceTurns=[]
}:Props){
 const [asked,setAsked]=useState<Asked[]>([]);
 const [guess,setGuess]=useState("");
 const [freeQuestion,setFreeQuestion]=useState("");
 const [processing,setProcessing]=useState(false);
 const [speechNotice,setSpeechNotice]=useState("");
 const [result,setResult]=useState<Outcome>(null);
 const askedRef=useRef<Asked[]>([]);
 const resultRef=useRef<Outcome>(null);
 const handledRef=useRef<Set<number>>(new Set());
 const voiceQueueRef=useRef<Promise<void>>(Promise.resolve());
 const mountedRef=useRef(true);
 useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false}},[]);
 const questionMode=kind==="twenty-questions";
 const canAskFree=questionMode&&typeof window!=="undefined"&&Boolean(geminiKey());
 const limit=20;
 const count=asked.length;
 const ended=Boolean(result)||count>=limit;
 const yes=english?"Yes":"是",no=english?"No":"不是";
 const unknown=english?"Not sure":"不確定";
 const secret=copy(item.name,english);
 const hints=questionMode?twentyQuestions:caseFile.clues;

 function record(entry:Asked,correct=false){
  if(resultRef.current||askedRef.current.length>=limit)return false;
  const next=[...askedRef.current,entry];
  askedRef.current=next;setAsked(next);
  const outcome:Outcome=correct?"won":next.length>=limit?"lost":null;
  if(outcome){resultRef.current=outcome;setResult(outcome)}
  return true;
 }
 function ask(id:string){
  if(ended||askedRef.current.some(entry=>entry.id===id))return;
  const hint=hints.find(h=>h.id===id);
  if(!hint)return;
  const positive=questionMode?item.traits.includes(id):caseFile.clues.find(h=>h.id===id)?.answer===true;
  const answer=positive?yes:no;
  const question=copy("label" in hint?hint.label:hint.question,english);
  if(!record({id,question,answer,source:"screen"}))return;
  const exhausted=askedRef.current.length>=limit;
  onEvent(`[GAME QUESTION] The learner selected "${question}". The verified answer is "${positive?"YES":"NO"}". Say this answer in your selected spoken language, optionally with one short personality reaction. Do not invent extra clues or reveal the secret.`+
   (exhausted?" The learner has used all their questions. Now reveal the answer and congratulate them for playing.":""));
 }
 function applyGuess(value:string,voice=false){
  const guess=value.trim().slice(0,80);
  if(!questionMode||!guess||resultRef.current||askedRef.current.length>=limit)return;
  const correct=correctGuess(item,guess);
  if(!record({id:"guess-"+(askedRef.current.length+1),question:guess,answer:correct?(english?"Correct!":"答對了！"):(english?"Not quite":"不對"),source:voice?"voice":"screen"},correct))return;
  if(!voice){
   onEvent(`[20 QUESTIONS GUESS] The learner guessed "${guess}". This is ${correct?"CORRECT":"INCORRECT"}. ${correct||askedRef.current.length>=limit?"The secret is "+item.name.en+". Reveal and react warmly.":"Do not reveal the secret. React briefly and invite another question."}`);
  }
 }
 function submitGuess(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!questionMode||ended||!guess.trim())return;
  applyGuess(guess);
  setGuess("");
 }
 async function evaluateFree(value:string,voice=false){
  const speech=value.trim().slice(0,300);
  if(!questionMode||!speech||resultRef.current||askedRef.current.length>=limit)return;
  if(!mountedRef.current)return;
  setProcessing(true);setSpeechNotice("");
  try{
   const judgement:TwentyJudgement=await judgeTwentySpeech(item,speech);
   if(!mountedRef.current||resultRef.current||askedRef.current.length>=limit)return;
   if(judgement.type==="chat"){
    setSpeechNotice(english?"That sounded like conversation, so no attempt was used.":"這句比較像聊天，不扣猜題次數。");
    return;
   }
   if(judgement.type==="guess"){
    applyGuess(judgement.guess,voice);
    return;
   }
   const answer=judgement.answer==="yes"?yes:judgement.answer==="no"?no:unknown;
   if(!record({id:"free-"+(askedRef.current.length+1),question:speech,answer,source:voice?"voice":"screen"}))return;
   if(!voice){
    onEvent(`[20 QUESTIONS VERIFIED ANSWER] The learner asked "${speech}". The game adjudicator's answer is ${judgement.answer.toUpperCase()}. Repeat only this answer in one natural sentence. If UNKNOWN, say you are not certain. Do not reveal the secret.`);
   }
  }catch{
   if(mountedRef.current)setSpeechNotice(english?"Couldn't verify that question. No attempt deducted. Please try again.":"這題暫時無法驗證，沒有扣次數，可以再問一次。");
  }finally{if(mountedRef.current)setProcessing(false)}
 }
 useEffect(()=>{
  if(!questionMode)return;
  for(const turn of voiceTurns){
   if(handledRef.current.has(turn.id))continue;
   handledRef.current.add(turn.id);
   voiceQueueRef.current=voiceQueueRef.current.then(()=>evaluateFree(turn.text,true)).catch(()=>{});
  }
 },[voiceTurns,questionMode,item]);
 function submitFreeQuestion(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!freeQuestion.trim()||processing||ended)return;
  const phrase=freeQuestion;
  setFreeQuestion("");
  void evaluateFree(phrase);
 }
 const reveal=()=>{
  if(resultRef.current)return;
  resultRef.current="revealed";setResult("revealed");
  onEvent("[MYSTERY REVEAL] The solution is: "+caseFile.solution.en+" Respond naturally and briefly.");
 };
 return <section className="crew-play-word-panel">
  <div className="crew-play-word-heading">
   <span className="crew-play-round-label">{questionMode?(english?"Find the secret object":"猜出神秘物品"):(english?"Solve the strange story":"破解離奇事件")}</span>
   {questionMode?<span className="crew-play-mystery-source" aria-label={english?"Object source":"物品來源"}>
    {itemSource==="generated"?(english?"AI-generated object":"Gemini 全新物品"):
     itemSource==="fallback"?(english?"Built-in object · AI unavailable":"AI 生成失敗 · 內建物品"):
     english?"Built-in object":"內建物品"}
   </span>:<span className="crew-play-mystery-source" aria-label={english?"Puzzle source":"謎題來源"}>
    {mysterySource==="generated"?(english?"AI-original mystery":"Gemini 原創謎題"):
     mysterySource==="fallback"?(english?"Built-in puzzle · AI unavailable":"AI 生成失敗 · 使用內建題庫"):
     english?"Built-in puzzle":"內建謎題"}
   </span>}
   <span className="crew-play-count" aria-live="polite">{questionMode?`${count} / ${limit}`:`${count} ${english?"clues":"條線索"}`}</span>
  </div>
  <div className="crew-play-riddle">
   <span className="crew-play-riddle-icon" aria-hidden="true">{questionMode?"?":"✧"}</span>
   <h2>{questionMode?(english?`${friendName} has picked a secret thing.`:`${friendName} 已經想好一個東西了！`):copy(caseFile.story,english)}</h2>
   <p>{questionMode?(english?"Ask naturally by voice, choose a prompt or type a guess. Questions and guesses share 20 attempts.":"直接用語音問是非題，或點選提示、輸入猜測；所有提問與猜答案共用 20 次額度。"):(english?"Ask for a clue, then tell your friend your theory. Reveal the solution when ready.":"選線索向朋友提問，也可以直接用語音說你的推理；想知道真相就揭曉答案。")}</p>
  </div>
  {questionMode?<div className="crew-play-voice-tip">
   <strong>{english?"Try saying":"試著開口說"}</strong>
   <span>“Is it something I can eat?”</span>
   <span>“I think it's a bicycle!”</span>
  </div>:null}
  {questionMode&&canAskFree&&!ended?<form className="crew-play-free-form" onSubmit={submitFreeQuestion}>
   <label htmlFor="crew-free-question">{english?"Or ask your own yes/no question":"或輸入你自己的英文／中文問題"}</label>
   <div><input id="crew-free-question" value={freeQuestion} onChange={event=>setFreeQuestion(event.target.value)} maxLength={250} placeholder={english?"Is it bigger than a chair?":"Is it bigger than a chair?"}/>
   <button type="submit" disabled={processing||!freeQuestion.trim()}>{processing?(english?"Checking…":"判斷中…"):(english?"Ask":"提問")}</button></div>
  </form>:null}
  {speechNotice?<p className="crew-play-speech-notice" role="status">{speechNotice}</p>:null}
  <div className="crew-play-word-options">
   <h3>{questionMode?(english?"Suggested questions (optional)":"不知道怎麼問？試試這些句子"):(english?"Choose a question":"選擇一個問題")}</h3>
   <div className="crew-play-question-grid">{hints.map(h=>{
    const visited=asked.find(entry=>entry.id===h.id);
    const label=copy("label" in h?h.label:h.question,english);
    return <button type="button" key={h.id} className={visited?"asked":""} disabled={ended||Boolean(visited)} onClick={()=>ask(h.id)}>
     <span>{label}</span>{visited?<strong>{visited.answer}</strong>:<span className="crew-play-question-arrow">↗</span>}
    </button>;
   })}</div>
  </div>
  {asked.length>0?<div className="crew-play-question-history" aria-live="polite"><strong>{english?"Your clues so far":"目前的線索"}</strong>
   <ul>{asked.slice(-6).map((row,i)=><li key={row.id+"-"+i}><span>{row.source==="voice"?"🎙️ ":""}{row.question}</span><b>{row.answer}</b></li>)}</ul>
  </div>:null}
  {questionMode&&!ended?<form className="crew-play-guess-form" onSubmit={submitGuess}>
   <label htmlFor="crew-guess">{english?"I think the answer is…":"我猜答案是……"}</label>
   <div><input id="crew-guess" type="text" autoComplete="off" maxLength={60} value={guess} onChange={event=>setGuess(event.target.value)} placeholder={english?"Type an object":"輸入物品名稱"}/><button type="submit" disabled={!guess.trim()}>{english?"Guess":"猜答案"}</button></div>
  </form>:null}
  {!questionMode&&!ended?<button type="button" className="crew-play-reveal" onClick={reveal}>{english?"Reveal the solution":"揭曉答案"}</button>:null}
  {ended?<div className="crew-play-solution" role="status">
   <strong>{questionMode?(result==="won"?(english?"You got it!":"答對了！"):(english?"The answer was…":"正確答案是……")):(english?"The truth":"故事真相")}</strong>
   <p>{questionMode?secret:copy(caseFile.solution,english)}</p>
   <button type="button" onClick={onNext}>{english?"Play another":"下一題 →"}</button>
  </div>:null}
  <p className="crew-play-hint">{questionMode
   ?english?"Voice and on-screen questions share the same 20-attempt counter. Normal conversation is not counted.":"語音提問、語音猜答案與畫面操作都會計入同一個 20 次額度；一般聊天不扣次數。"
   :english?"Each new round creates a fresh Gemini puzzle when your Key is available; otherwise, a built-in mystery is used.":"有 Gemini Key 時，每次新局都會產生新海龜湯；沒有 Key 或生成失敗則使用內建題庫。"}
  </p>
 </section>;
}
