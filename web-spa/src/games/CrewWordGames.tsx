import {useState} from "react";
import {copy,correctGuess,twentyQuestions,type TwentyItem,type MysteryCase} from "./playPuzzles";

type Props={
 kind:"twenty-questions"|"mystery";english:boolean;friendName:string;
 item:TwentyItem;caseFile:MysteryCase;onEvent:(message:string)=>void;onNext:()=>void;
};
type Asked={id:string;question:string;answer:string};
export function CrewWordGames({kind,english,friendName,item,caseFile,onEvent,onNext}:Props){
 const [asked,setAsked]=useState<Asked[]>([]);
 const [guess,setGuess]=useState("");
 const [result,setResult]=useState<"won"|"lost"|"revealed"|null>(null);
 const questionMode=kind==="twenty-questions";
 const limit=20;
 const count=asked.length;
 const ended=Boolean(result)||count>=limit;
 const yes=english?"Yes":"是";
 const no=english?"No":"不是";
 const secret=copy(item.name,english);
 const hints=questionMode?twentyQuestions:caseFile.clues;
 function ask(id:string){
  if(ended||asked.some(entry=>entry.id===id))return;
  const hint=hints.find(h=>h.id===id);
  if(!hint)return;
  const positive=questionMode?item.traits.includes(id):caseFile.clues.find(h=>h.id===id)?.answer===true;
  const answer=positive?yes:no;
  const question=copy(hint.label??(hint as typeof caseFile.clues[number]).question,english);
  const next=[...asked,{id,question,answer}];
  setAsked(next);
  const exhausted=next.length>=limit;
  if(exhausted)setResult("lost");
  onEvent(`[GAME QUESTION] The learner selected "${question}". The verified answer is "${positive?"YES":"NO"}". Say this answer in your selected spoken language, optionally with one short personality reaction. Do not invent extra clues or reveal the secret.`+
   (exhausted?" The learner has used all their questions. Now reveal the answer and congratulate them for playing.":""));
 }
 function submitGuess(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!questionMode||ended||!guess.trim())return;
  const correct=correctGuess(item,guess);
  const nextCount=count+1;
  const next=[...asked,{id:"guess-"+nextCount,question:guess.trim(),answer:correct?(english?"Correct!":"答對了！"):(english?"Not quite":"不對")}];
  setAsked(next);
  setResult(correct?"won":nextCount>=limit?"lost":null);
  onEvent(`[20 QUESTIONS GUESS] The learner guessed "${guess.trim().slice(0,80)}". This is ${correct?"CORRECT":"INCORRECT"}. ${correct||nextCount>=limit?"The secret is "+item.name.en+". Reveal and react warmly.":"Do not reveal the secret. React briefly and invite another question."}`);
  setGuess("");
 }
 const reveal=()=>{
  if(result)return;
  setResult("revealed");
  onEvent("[MYSTERY REVEAL] The solution is: "+caseFile.solution.en+" Respond naturally and briefly.");
 };
 return <section className="crew-play-word-panel">
  <div className="crew-play-word-heading">
   <span className="crew-play-round-label">{questionMode?(english?"Find the secret object":"猜出神秘物品"):(english?"Solve the strange story":"破解離奇事件")}</span>
   <span className="crew-play-count" aria-live="polite">{questionMode?`${count} / ${limit}`:`${count} ${english?"clues":"條線索"}`}</span>
  </div>
  <div className="crew-play-riddle">
   <span className="crew-play-riddle-icon" aria-hidden="true">{questionMode?"?":"✧"}</span>
   <h2>{questionMode?(english?`${friendName} has picked a secret thing.`:`${friendName} 已經想好一個東西了！`):copy(caseFile.story,english)}</h2>
   <p>{questionMode?(english?"Ask yes/no questions, then type your answer. You have 20 total guesses or questions.":"問是非題，再輸入你的答案；提問或猜測一共 20 次。"):(english?"Ask for a clue, then tell your friend your theory. Reveal the solution when ready.":"選線索向朋友提問，也可以直接用語音說你的推理；想知道真相就揭曉答案。")}</p>
  </div>
  <div className="crew-play-word-options">
   <h3>{english?"Choose a question":"選擇一個問題"}</h3>
   <div className="crew-play-question-grid">{hints.map(h=>{
    const visited=asked.find(entry=>entry.id===h.id);
    const label=copy(h.label??(h as typeof caseFile.clues[number]).question,english);
    return <button type="button" key={h.id} className={visited?"asked":""} disabled={ended||Boolean(visited)} onClick={()=>ask(h.id)}>
      <span>{label}</span>{visited?<strong>{visited.answer}</strong>:<span className="crew-play-question-arrow">↗</span>}
    </button>;
   })}</div>
  </div>
  {asked.length>0?<div className="crew-play-question-history" aria-live="polite"><strong>{english?"Your clues so far":"目前的線索"}</strong>
   <ul>{asked.slice(-6).map(row=><li key={row.id}><span>{row.question}</span><b>{row.answer}</b></li>)}</ul>
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
  <p className="crew-play-hint">{english?"Voice lets you talk through your guesses naturally. Only on-screen questions count toward the displayed total.":"語音可以自由和朋友推理；畫面的提問次數只計算你點選或輸入的操作。"}</p>
 </section>;
}
