import type {BoardCard} from "./boardProtocol";
import {cardKindName} from "./TeachingCard";

export type CaptionBlock={text:string;kind:"text"|"point"|"example"};
// Format the actual transcript, never infer missing lesson content or wait for
// a second model. The same projection is used during speech and after sealing.
export function liveCaptionBlocks(raw:string):CaptionBlock[]{
 const text=raw.trim();if(!text)return [];
 const lines=text.split(/(?<=[。！？])\s*|(?<=[.!?])\s+|\n+/u).map(s=>s.trim()).filter(Boolean);
 return lines.map(text=>({text,kind:/^(?:for example|e\.g\.|example\s*[:：]|例如|舉例|举例|比如|たとえば|例えば|예를 들어)\s*/iu.test(text)?"example":/^(?:first(?:ly)?|second(?:ly)?|third(?:ly)?|finally|next|首先|其次|最後|最后|接著|接着|第[一二三四五六七八九十\d]+(?:點|点|種|种|個|个|步|項|项)|\d+[.)、])(?:\b|[\s,，:：、]|(?=[\p{Script=Han}]))/iu.test(text)?"point":"text"}));
}
export function LiveCaptionText({text,language}:{text:string;language:string}){
 const blocks=liveCaptionBlocks(text);
 return <div className="teacher-live-caption" lang={language} data-caption-layout={blocks.some(b=>b.kind!=="text")?"structured":"text"}>{blocks.map((b,i)=><p key={i} className={"teacher-live-caption-"+b.kind}>{b.text}</p>)}</div>
}
/** Display-only content. No clickable cards, quiz answers, lesson controls or
 * audio requests; the existing Live voice session owns conversation. */
export function PassiveTeachingMaterial({card,english,focus=-1}:{card:BoardCard;english:boolean;focus?:number}){
 return <article className="teacher-passive-material" data-kind={card.type}>
  <header><small>{cardKindName(card.type,english)}</small><h3>{card.title}</h3></header>
  {card.body&&<p className="teacher-passive-body">{card.body}</p>}
  {card.pairs.length>0&&<dl>{card.pairs.map((pair,i)=><div className={"teacher-passive-row"+(focus===i?" is-highlighted":"")} key={i}><dt>{pair.source}{pair.pronunciation&&<small>{pair.pronunciation}</small>}</dt><dd>{pair.target}</dd></div>)}</dl>}
  {card.points.length>0&&<ol>{card.points.map((point,i)=><li className={"teacher-passive-point"+(focus===i?" is-highlighted":"")} key={i}><strong>{point.label}</strong><p>{point.note}</p></li>)}</ol>}
  {card.questions.map((question,i)=><div className="teacher-passive-question" key={i}><strong>{question.question}</strong><ol type="A">{question.options.map((option,j)=><li key={j}>{option}</li>)}</ol></div>)}
  {card.speaking&&<p>{card.speaking.prompt}</p>}
 </article>
}
