import {Arrow} from "../components/Arrow";
import {useState} from "react";
import type {BoardCard,BoardQuestion} from "./boardProtocol";
import type {SpeakingAssessment} from "./boardLessons";
import {BoardFlashcards,type FlashReview} from "./BoardFlashcards";

type Props={readOnly?:boolean;disabled?:boolean;card:BoardCard;answers:Record<string,number>;onAnswer:(card:BoardCard,index:number,selected:number)=>void;onExplain:(text:string)=>void;english?:boolean;focusIndex?:number;revealCount?:number|null;quizIndex?:number;onNavigate?:(index:number)=>void;onSpeakingSubmit?:(text:string)=>void;speakingAssessment?:SpeakingAssessment|null;onFlashcardPractice?:(card:BoardCard,reviews:FlashReview[],scope:"item"|"weak")=>void;onFlashcardRate?:(card:BoardCard,review:FlashReview)=>void};

const names:Record<BoardCard["type"],[string,string]>={
 explanation:["概念","Concept"],example:["例句","Examples"],comparison:["比較","Compare"],
 timeline:["時間軸","Timeline"],vocabulary:["單字","Vocabulary"],quiz:["測驗","Quiz"],
 correction:["修正","Correction"],steps:["步驟","Steps"],flashcard:["翻面卡","Flashcards"],dialogue:["情境對話","Dialogue"],speaking:["口說任務","Speaking"]
};

export function cardKindName(type:BoardCard["type"],english=false){return names[type][english?1:0]}

function PairRows({card,onExplain,english,focusIndex=-1,revealCount=null}:{card:BoardCard;onExplain:Props["onExplain"];english:boolean;focusIndex?:number;revealCount?:number|null}){
 return <div className={"teaching-board-pairs teaching-board-pairs-"+card.type}>{card.pairs.slice(0,revealCount===null?undefined:revealCount).map((pair,i)=>
  <button type="button" className={"teaching-board-pair"+(focusIndex===i?" is-highlighted":"")} onClick={()=>onExplain(card.type==="vocabulary"?"Please pronounce "+pair.source+" slowly and explain it.":pair.source)} key={i}>
   <strong>{pair.source}</strong>{pair.pronunciation&&<small>{pair.pronunciation}</small>}
   <span>{pair.target}</span>{card.type==="vocabulary"&&<em>▶ {english?"Pronounce and explain":"發音與解釋"}</em>}
  </button>)}</div>;
}
function Timeline({card,focusIndex=-1,revealCount=null}:{card:BoardCard;focusIndex?:number;revealCount?:number|null}){
 return <div className="teaching-board-timelines">{card.points.slice(0,revealCount===null?undefined:revealCount).map((point,i)=><div className={"teaching-board-timeline"+(i===focusIndex?" is-highlighted":"") } key={i}>
  <strong>{point.label}</strong><div aria-hidden="true" className="teaching-board-time-rail"><i/><i/><i/></div>
  <span>{point.note}</span>
 </div>)}</div>;
}
function Steps({card,english,focusIndex=-1,revealCount=null,onNavigate}:{card:BoardCard;english:boolean;focusIndex?:number;revealCount?:number|null;onNavigate?:Props["onNavigate"]}){
 const [localStep,setLocalStep]=useState(0);
 const available=Math.min(card.points.length,revealCount===null?card.points.length:revealCount);
 const active=Math.min(Math.max(0,focusIndex>=0?focusIndex:localStep),Math.max(0,available-1));
 if(!available)return <div className="teaching-board-pending">{english?"The next step will appear as your teacher explains.":"老師講到下一步時，內容會逐步顯示。"}</div>;
 function move(i:number){if(onNavigate)onNavigate(i);else setLocalStep(i)}
 return <div className="teaching-board-stepper">
  <div className="teaching-board-step-dots" aria-label={english?"Lesson steps":"教學步驟"}>{card.points.slice(0,available).map((p,i)=>
   <button type="button" key={i} className={i===active?"is-current":""} onClick={()=>move(i)} aria-current={i===active?"step":undefined} aria-label={p.label||String(i+1)}>{i+1}</button>)}</div>
  <div className="teaching-board-step-focus" key={active}><small>{english?"Step":"步驟"} {active+1} / {card.points.length}</small>
   <h3>{card.points[active].label}</h3><p>{card.points[active].note}</p>
  </div>
  <div className="teaching-board-pager"><button type="button" disabled={active===0} onClick={()=>move(active-1)}><Arrow direction="left" disabled={active===0}/>{english?"Previous":"上一步"}</button>
   <button type="button" disabled={active>=available-1} onClick={()=>move(active+1)}>{english?"Next":"下一步"}<Arrow disabled={active>=available-1}/></button></div>
 </div>;
}
function Flashcards({card,english,focusIndex=-1,revealCount=null,onPractice,onRate}:{card:BoardCard;english:boolean;focusIndex?:number;revealCount?:number|null;onPractice?:Props["onFlashcardPractice"];onRate?:Props["onFlashcardRate"]}){
 return <BoardFlashcards key={JSON.stringify(card.pairs)} card={card} english={english} focusIndex={focusIndex} revealCount={revealCount} onPractice={onPractice} onRate={onRate}/>;
}
function Dialogue({card,english,focusIndex=-1,revealCount=null}:{card:BoardCard;english:boolean;focusIndex?:number;revealCount?:number|null}){
 return <div className="teaching-board-dialogue">{card.pairs.slice(0,revealCount===null?undefined:revealCount).map((p,i)=><div className={"teaching-board-bubble"+(i%2?" is-reply":"")+(focusIndex===i?" is-highlighted":"")} key={i}>
  <small>{p.source|| (english?"Speaker":"說話者")}</small><p>{p.target}</p>
 </div>)}</div>;
}
function Quiz({card,answers,onAnswer,english,quizIndex=0,onNavigate,readOnly=false,disabled=false}:{readOnly?:boolean;disabled?:boolean;card:BoardCard;answers:Props["answers"];onAnswer:Props["onAnswer"];english:boolean;quizIndex?:number;onNavigate?:Props["onNavigate"]}){
 const [localStep,setLocalStep]=useState(quizIndex);
 const index=Math.min(onNavigate?quizIndex:localStep,Math.max(0,card.questions.length-1));
 const q:BoardQuestion|undefined=card.questions[index];
 if(!q)return null;
 const key=card.id+":"+index,selected=answers[key],answered=Number.isInteger(selected);
 const change=(n:number)=>{if(onNavigate)onNavigate(n);else setLocalStep(n)};
 return <div className="teaching-board-questions" key={index}>
  <div className="teaching-board-question-counter">{english?"Question":"題目"} {index+1} / {card.questions.length}</div>
  <div className="teaching-board-question"><strong>{q.question}</strong>
   <div className="teaching-board-options">{q.options.map((option,i)=><button type="button" key={i} disabled={answered||readOnly||disabled}
    className={answered&&i===q.answerIndex?"correct":answered&&i===selected?"incorrect":""}
    onClick={()=>onAnswer(card,index,i)} aria-pressed={selected===i}>{String.fromCharCode(65+i)}. {option}</button>)}</div>
   {answered&&<p className="teaching-board-answer" role="status">{selected===q.answerIndex?"✓":"○"} {q.explanation||(selected===q.answerIndex?(english?"Correct":"答對了"):(english?"Ask your teacher to explain":"問問老師為什麼"))}</p>}
   {!answered&&!readOnly&&<p className="teaching-board-question-wait">{english?"Your turn — choose an answer or say A, B, C or D.":"換你回答：點選選項，或直接說 A、B、C、D。"}</p>}
  </div>
  <div className="teaching-board-pager"><button type="button" disabled={index===0} onClick={()=>change(index-1)}><Arrow direction="left" disabled={index===0}/>{english?"Previous":"上一題"}</button>
   <button type="button" disabled={(!answered&&!readOnly)||index===card.questions.length-1} onClick={()=>change(index+1)}>{english?"Next":"下一題"}<Arrow disabled={(!answered&&!readOnly)||index===card.questions.length-1}/></button></div>
 </div>;
}
function Speaking({card,onSpeakingSubmit,assessment,english,readOnly=false,disabled=false}:{readOnly?:boolean;disabled?:boolean;card:BoardCard;onSpeakingSubmit?:Props["onSpeakingSubmit"];assessment?:SpeakingAssessment|null;english:boolean}){
 const [draft,setDraft]=useState("");
 const [exampleOpen,setExampleOpen]=useState(false);
 const goal=card.speaking;
 if(!goal)return null;
 return <div className="teaching-board-speaking">
  <p className="teaching-board-speaking-prompt">{goal.prompt}</p>
  <p className="teaching-board-speaking-goal">{goal.goal}</p>
  {!readOnly&&<><p className="teaching-board-speaking-hint">{english?"Say it aloud to your teacher, or type your answer below.":"直接說給老師聽，也可以在下方輸入答案。"}</p>
  <form onSubmit={e=>{e.preventDefault();if(draft.trim()){onSpeakingSubmit?.(draft.trim());setDraft("")}}}>
   <label htmlFor={"speaking-draft-"+card.id}>{english?"Your own sentence":"輸入你的句子"}</label>
   <textarea disabled={disabled} id={"speaking-draft-"+card.id} value={draft} rows={2} maxLength={640} onChange={e=>setDraft(e.target.value)} placeholder={english?"Try using your own words…":"試著用自己的話說說看…"} />
   <button type="submit" disabled={disabled||!draft.trim()}>{english?"Submit answer":"送出回答"}</button>
  </form></>}
  <button type="button" className="teaching-board-speaking-example" onClick={()=>setExampleOpen(v=>!v)} aria-expanded={exampleOpen}>
   {exampleOpen?(english?"Hide reference":"隱藏參考"):(english?"Show reference sentence":"查看參考句")}
  </button>
  {exampleOpen&&<p className="teaching-board-speaking-reference">{goal.example}</p>}
  {assessment&&<div className="teaching-board-speaking-result" role="status">
   <strong>{assessment.met?(english?"Goal checks met":"已達成練習條件"):(english?"Try one more time":"再試一次")}</strong>
   <small>{english?"Keyword patterns":"關鍵用法"} {assessment.matched}/{assessment.required} · {english?"Words":"字詞"} {assessment.wordCount}/{goal.minWords} · {english?"Sentences":"句子"} {assessment.sentenceCount}/{goal.minSentences}</small>
   <p>{assessment.attempt}</p>
   <small>{english?"This checks visible language patterns, not pronunciation or meaning. Ask the AI teacher for natural feedback.":"此處只檢查表面用法，不評定發音或語意；自然度請聽老師回饋。"}</small>
  </div>}
 </div>;
}
export function TeachingCard({card,answers,onAnswer,onExplain,english=false,focusIndex=-1,revealCount=null,quizIndex=0,onNavigate,onSpeakingSubmit,speakingAssessment,onFlashcardPractice,onFlashcardRate,readOnly=false,disabled=false}:Props){
 return <article className="teaching-board-card" data-kind={card.type}>
  <div className="teaching-board-card-head"><span className="teaching-board-card-kind">{cardKindName(card.type,english)}</span>
   <h2>{card.title}</h2></div>
  <div className="teaching-board-card-content">
   {card.body&&<p className="teaching-board-lead">{card.body}</p>}
   {(card.type==="example"||card.type==="comparison"||card.type==="vocabulary"||card.type==="correction")&&<PairRows card={card} onExplain={onExplain} english={english} focusIndex={focusIndex} revealCount={revealCount}/>}
   {card.type==="explanation"&&card.pairs.length>0&&<PairRows card={card} onExplain={onExplain} english={english}/>}
   {card.type==="timeline"&&<Timeline card={card} focusIndex={focusIndex} revealCount={revealCount}/>}
   {card.type==="steps"&&<Steps card={card} english={english} focusIndex={focusIndex} revealCount={revealCount} onNavigate={onNavigate}/>}
   {card.type==="flashcard"&&<Flashcards card={card} english={english} focusIndex={focusIndex} revealCount={revealCount} onPractice={onFlashcardPractice} onRate={onFlashcardRate}/>}
   {card.type==="dialogue"&&<Dialogue card={card} english={english} focusIndex={focusIndex} revealCount={revealCount}/>}
   {card.type==="quiz"&&<Quiz card={card} answers={answers} onAnswer={onAnswer} english={english} quizIndex={quizIndex} onNavigate={onNavigate} readOnly={readOnly} disabled={disabled}/>}
   {card.type==="speaking"&&<Speaking key={card.id} card={card} onSpeakingSubmit={onSpeakingSubmit} assessment={speakingAssessment} english={english} readOnly={readOnly} disabled={disabled}/>}
  </div>
 </article>;
}
