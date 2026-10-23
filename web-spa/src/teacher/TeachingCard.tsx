import {useState} from "react";
import type {BoardCard,BoardQuestion} from "./boardProtocol";

type Props={card:BoardCard;answers:Record<string,number>;onAnswer:(card:BoardCard,index:number,selected:number)=>void;onExplain:(text:string)=>void;english?:boolean};

const names:Record<BoardCard["type"],[string,string]>={
 explanation:["概念","Concept"],example:["例句","Examples"],comparison:["比較","Compare"],
 timeline:["時間軸","Timeline"],vocabulary:["單字","Vocabulary"],quiz:["測驗","Quiz"],
 correction:["修正","Correction"],steps:["步驟","Steps"],flashcard:["翻面卡","Flashcards"],dialogue:["情境對話","Dialogue"]
};

export function cardKindName(type:BoardCard["type"],english=false){return names[type][english?1:0]}

function PairRows({card,onExplain,english}:{card:BoardCard;onExplain:Props["onExplain"];english:boolean}){
 return <div className={"teaching-board-pairs teaching-board-pairs-"+card.type}>{card.pairs.map((pair,i)=>
  <button type="button" className="teaching-board-pair" onClick={()=>onExplain(card.type==="vocabulary"?"Please pronounce "+pair.source+" slowly and explain it.":pair.source)} key={i}>
   <strong>{pair.source}</strong>{pair.pronunciation&&<small>{pair.pronunciation}</small>}
   <span>{pair.target}</span>{card.type==="vocabulary"&&<em>▶ {english?"Pronounce and explain":"發音與解釋"}</em>}
  </button>)}</div>;
}
function Timeline({card}:{card:BoardCard}){
 return <div className="teaching-board-timelines">{card.points.map((point,i)=><div className="teaching-board-timeline" key={i}>
  <strong>{point.label}</strong><div aria-hidden="true" className="teaching-board-time-rail"><i/><i/><i/></div>
  <span>{point.note}</span>
 </div>)}</div>;
}
function Steps({card,english}:{card:BoardCard;english:boolean}){
 const [step,setStep]=useState(0);
 const active=Math.min(step,Math.max(0,card.points.length-1));
 if(!card.points.length)return null;
 return <div className="teaching-board-stepper">
  <div className="teaching-board-step-dots" aria-label={english?"Lesson steps":"教學步驟"}>{card.points.map((p,i)=>
   <button type="button" key={i} className={i===active?"is-current":""} onClick={()=>setStep(i)} aria-current={i===active?"step":undefined} aria-label={p.label||String(i+1)}>{i+1}</button>)}</div>
  <div className="teaching-board-step-focus" key={active}><small>{english?"Step":"步驟"} {active+1} / {card.points.length}</small>
   <h3>{card.points[active].label}</h3><p>{card.points[active].note}</p>
  </div>
  <div className="teaching-board-pager"><button type="button" disabled={active===0} onClick={()=>setStep(active-1)}>{english?"Previous":"上一步"}</button>
   <button type="button" disabled={active===card.points.length-1} onClick={()=>setStep(active+1)}>{english?"Next":"下一步"} →</button></div>
 </div>;
}
function Flashcards({card,english}:{card:BoardCard;english:boolean}){
 const [shown,setShown]=useState<Record<number,boolean>>({});
 return <div className="teaching-board-flash-grid">{card.pairs.map((p,i)=><button type="button" key={i} className={"teaching-board-flash"+(shown[i]?" is-flipped":"")} onClick={()=>setShown(v=>({...v,[i]:!v[i]}))} aria-expanded={!!shown[i]}>
  <small>{shown[i]?(english?"Back":"背面"):(english?"Front":"正面")} · {english?"Tap to flip":"點擊翻面"}</small>
  <strong>{shown[i]?p.target:p.source}</strong>
  {p.pronunciation&&<span>{p.pronunciation}</span>}
 </button>)}</div>;
}
function Dialogue({card,english}:{card:BoardCard;english:boolean}){
 return <div className="teaching-board-dialogue">{card.pairs.map((p,i)=><div className={"teaching-board-bubble"+(i%2?" is-reply":"")} key={i}>
  <small>{p.source|| (english?"Speaker":"說話者")}</small><p>{p.target}</p>
 </div>)}</div>;
}
function Quiz({card,answers,onAnswer,english}:{card:BoardCard;answers:Props["answers"];onAnswer:Props["onAnswer"];english:boolean}){
 const [step,setStep]=useState(0);
 const index=Math.min(step,Math.max(0,card.questions.length-1));
 const q:BoardQuestion|undefined=card.questions[index];
 if(!q)return null;
 const key=card.id+":"+index, selected=answers[key],answered=Number.isInteger(selected);
 return <div className="teaching-board-questions">
  <div className="teaching-board-question-counter">{english?"Question":"題目"} {index+1} / {card.questions.length}</div>
  <div className="teaching-board-question"><strong>{q.question}</strong>
   <div className="teaching-board-options">{q.options.map((option,i)=><button type="button" key={i} disabled={answered}
    className={answered&&i===q.answerIndex?"correct":answered&&i===selected?"incorrect":""}
    onClick={()=>onAnswer(card,index,i)} aria-pressed={selected===i}>{String.fromCharCode(65+i)}. {option}</button>)}</div>
   {answered&&<p className="teaching-board-answer" role="status">{selected===q.answerIndex?"✓":"○"} {q.explanation||(selected===q.answerIndex?(english?"Correct":"答對了"):(english?"Ask your teacher to explain":"問問老師為什麼"))}</p>}
  </div>
  <div className="teaching-board-pager"><button type="button" disabled={index===0} onClick={()=>setStep(index-1)}>{english?"Previous":"上一題"}</button>
   <button type="button" disabled={index===card.questions.length-1} onClick={()=>setStep(index+1)}>{english?"Next":"下一題"} →</button></div>
 </div>;
}
export function TeachingCard({card,answers,onAnswer,onExplain,english=false}:Props){
 return <article className="teaching-board-card" data-kind={card.type}>
  <div className="teaching-board-card-head"><span className="teaching-board-card-kind">{cardKindName(card.type,english)}</span>
   <h2>{card.title}</h2></div>
  <div className="teaching-board-card-content">
   {card.body&&<p className="teaching-board-lead">{card.body}</p>}
   {(card.type==="example"||card.type==="comparison"||card.type==="vocabulary"||card.type==="correction")&&<PairRows card={card} onExplain={onExplain} english={english}/>}
   {card.type==="explanation"&&card.pairs.length>0&&<PairRows card={card} onExplain={onExplain} english={english}/>}
   {card.type==="timeline"&&<Timeline card={card}/>}
   {card.type==="steps"&&<Steps card={card} english={english}/>}
   {card.type==="flashcard"&&<Flashcards card={card} english={english}/>}
   {card.type==="dialogue"&&<Dialogue card={card} english={english}/>}
   {card.type==="quiz"&&<Quiz card={card} answers={answers} onAnswer={onAnswer} english={english}/>}
  </div>
 </article>;
}
