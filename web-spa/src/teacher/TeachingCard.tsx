import {useState} from "react";
import type {BoardCard,BoardQuestion} from "./boardProtocol";

type Props={card:BoardCard;answers:Record<string,number>;onAnswer:(card:BoardCard,index:number,selected:number)=>void;onExplain:(text:string)=>void};
function PairRows({card,onExplain}:{card:BoardCard;onExplain:(text:string)=>void}){
 return <div className="teaching-board-pairs">{card.pairs.map((pair,i)=>
  <button type="button" className="teaching-board-pair" onClick={()=>onExplain(pair.source)} key={i}>
   <strong>{pair.source}</strong><span>{pair.target}</span>
  </button>)}</div>;
}
function Timeline({card}:{card:BoardCard}){
 return <div className="teaching-board-timelines">{card.points.map((point,i)=><div className="teaching-board-timeline" key={i}>
  <strong>{point.label}</strong><div aria-hidden="true" className="teaching-board-time-rail"><i/></div><span>{point.note}</span>
 </div>)}</div>;
}
function Quiz({card,answers,onAnswer}:{card:BoardCard;answers:Record<string,number>;onAnswer:Props["onAnswer"]}){
 return <div className="teaching-board-questions">{card.questions.map((q:BoardQuestion,index)=>{
  const key=card.id+":"+index,selected=answers[key],answered=Number.isInteger(selected);
  return <div className="teaching-board-question" key={index}><strong>{index+1}. {q.question}</strong>
   <div className="teaching-board-options">{q.options.map((option,i)=><button type="button" key={i} disabled={answered} className={answered&&i===q.answerIndex?"correct":answered&&i===selected?"incorrect":""} onClick={()=>onAnswer(card,index,i)} aria-pressed={selected===i}>{String.fromCharCode(65+i)}. {option}</button>)}</div>
   {answered&&<p className="teaching-board-answer" role="status">{selected===q.answerIndex?"✓":"○"} {q.explanation|| (selected===q.answerIndex?"Correct":"Try again with your teacher")}</p>}
  </div>})}</div>;
}
export function TeachingCard({card,answers,onAnswer,onExplain}:Props){
 const [collapsed,setCollapsed]=useState(false);
 const names:Record<BoardCard["type"],string>={explanation:"概念",example:"例句",comparison:"比較",timeline:"時間軸",vocabulary:"單字",quiz:"測驗",correction:"修正"};
 return <article className="teaching-board-card" data-kind={card.type}>
  <button className="teaching-board-card-head" type="button" aria-expanded={!collapsed} onClick={()=>setCollapsed(!collapsed)}>
   <span className="teaching-board-card-kind">{names[card.type]}</span><strong>{card.title}</strong><span aria-hidden="true">{collapsed?"+":"−"}</span>
  </button>
  {!collapsed&&<div className="teaching-board-card-content">
   {card.body&&<p>{card.body}</p>}
   {(card.type==="example"||card.type==="comparison"||card.type==="vocabulary"||card.type==="correction")&&<PairRows card={card} onExplain={onExplain}/>}
   {card.type==="timeline"&&<Timeline card={card}/>}
   {card.type==="quiz"&&<Quiz card={card} answers={answers} onAnswer={onAnswer}/>}
   {card.type==="explanation"&&card.pairs.length>0&&<PairRows card={card} onExplain={onExplain}/>}
  </div>}
 </article>;
}
