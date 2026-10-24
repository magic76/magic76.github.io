import {useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import type {BoardCard} from "./boardProtocol";

export type FlashReview={source:string;target:string;rating:"known"|"again"};
type Props={card:BoardCard;english:boolean;focusIndex?:number;revealCount?:number|null;
 onPractice?:(card:BoardCard,reviews:FlashReview[],scope:"item"|"weak")=>void};

/** Self-rated active recall; these marks are not an AI assessment or a pronunciation grade. */
export function BoardFlashcards({card,english,focusIndex=-1,revealCount=null,onPractice}:Props){
 const {t}=useTranslation("teacher");
 const [position,setPosition]=useState(Math.max(0,focusIndex)),[flipped,setFlipped]=useState(false);
 const [ratings,setRatings]=useState<Record<number,"known"|"again">>({});
 const visible=card.pairs.slice(0,revealCount===null?undefined:revealCount);
 const index=Math.min(position,Math.max(0,visible.length-1));
 useEffect(()=>{if(focusIndex>=0){setPosition(focusIndex);setFlipped(false)}},[focusIndex]);
 const pair=visible[index];
 const finished=visible.length>0&&visible.every((_,i)=>ratings[i]!==undefined);
 const marked=visible.filter((_,i)=>ratings[i]!==undefined).length;
 const weak=visible.filter((_,i)=>ratings[i]==="again").length;
 const go=(i:number)=>{setPosition(i);setFlipped(false)};
 const rate=(rating:"known"|"again")=>{
  setRatings(old=>({...old,[index]:rating}));
  const next=visible.findIndex((_,i)=>i>index&&ratings[i]===undefined);
  if(next>=0)go(next);
  else{
   const first=visible.findIndex((_,i)=>i!==index&&ratings[i]===undefined);
   if(first>=0)go(first);
  }
 };
 const practice=(scope:"item"|"weak")=>{
  const targets=scope==="item"
   ?[{source:pair.source,target:pair.target,rating:ratings[index]||"again"}]
   :visible.flatMap((p,i)=>ratings[i]==="again"?[{source:p.source,target:p.target,rating:"again" as const}]:[]);
  const chosen=targets.length?targets:visible.slice(0,3).map(p=>({source:p.source,target:p.target,rating:"known" as const}));
  if(chosen.length)onPractice?.(card,chosen.slice(0,5),scope);
 };
 if(!pair)return <p className="teaching-board-pending">{t("board.flash.waiting")}</p>;
 return <section className="teaching-board-flash-study" aria-label={t("board.flash.title")}>
  <div className="teaching-board-flash-progress">
   <strong>{t("board.flash.title")}</strong><span>{index+1} / {visible.length} · {t("board.flash.marked",{count:marked,total:visible.length})}</span>
  </div>
  <div className="teaching-board-flash-grid">
   <button type="button" className={"teaching-board-flash"+(flipped?" is-flipped":"")+(focusIndex===index?" is-highlighted":"")}
    onClick={()=>setFlipped(old=>!old)} aria-pressed={flipped}
    aria-label={t("board.flash.flipLabel",{side:flipped?t("board.flash.back"):t("board.flash.front"),term:flipped?pair.target:pair.source})}>
    <span className="teaching-board-flash-inner">
     <span className="teaching-board-flash-face teaching-board-flash-front" aria-hidden={flipped}>
      <small>{t("board.flash.front")} · {t("board.flash.tap")}</small><strong>{pair.source}</strong>
      {pair.pronunciation&&<em>{pair.pronunciation}</em>}
     </span>
     <span className="teaching-board-flash-face teaching-board-flash-back" aria-hidden={!flipped}>
      <small>{t("board.flash.back")} · {t("board.flash.tap")}</small><strong>{pair.target}</strong><em>{pair.source}</em>
     </span>
    </span>
   </button>
  </div>
  <p className="teaching-board-flash-instruction">{t("board.flash.recallFirst")}</p>
  {flipped&&<div className="teaching-board-flash-ratings">
   <button type="button" className={ratings[index]==="again"?"is-selected":""} onClick={()=>rate("again")}>{t("board.flash.again")}</button>
   <button type="button" className={ratings[index]==="known"?"is-selected":""} onClick={()=>rate("known")}>{t("board.flash.known")}</button>
   <button type="button" className="teaching-board-flash-coach" onClick={()=>practice("item")} disabled={!onPractice}>{t("board.flash.practice")}</button>
  </div>}
  <div className="teaching-board-pager teaching-board-flash-pager">
   <button type="button" disabled={index===0} onClick={()=>go(index-1)}>{t("board.flash.previous")}</button>
   <span role="status" aria-live="polite">{finished?t("board.flash.completed",{count:weak}):t("board.flash.progress",{count:marked,total:visible.length})}</span>
   <button type="button" disabled={index===visible.length-1} onClick={()=>go(index+1)}>{t("board.flash.next")}</button>
  </div>
  {finished&&<div className="teaching-board-flash-complete">
   <strong>{t("board.flash.completed",{count:weak})}</strong>
   <button type="button" disabled={!onPractice} onClick={()=>practice("weak")}>{t("board.flash.reviewWithTeacher")}</button>
   <button type="button" onClick={()=>{setRatings({});go(0)}}>{t("board.flash.restart")}</button>
  </div>}
 </section>;
}
