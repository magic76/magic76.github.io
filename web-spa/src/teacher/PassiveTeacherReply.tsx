import type {BoardCard} from "./boardProtocol";
import {cardKindName} from "./TeachingCard";

import type {ReplyBlock} from "./liveReplyLayout";
function SemanticCaptionBlock({block}:{block:ReplyBlock}){
 const {kind,parts}=block;
 if(kind==="heading")return <h4>{parts[0]}</h4>;
 if(kind==="quote")return <blockquote>{parts[0]}</blockquote>;
 if(kind==="formula")return <div className="teacher-semantic-formula">{parts[0]}</div>;
 if(kind==="list"||kind==="steps"){
  const Tag=kind==="steps"?"ol":"ul";
  return <Tag>{parts.map((p,i)=><li key={i}>{p}</li>)}</Tag>
 }
 if(kind==="table"||kind==="dialogue"){
  const columns=block.columns||2,rows=Array.from({length:parts.length/columns},(_,i)=>parts.slice(i*columns,(i+1)*columns));
  return kind==="table"?<div className="teacher-semantic-table-wrap"><table><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>:<dl className="teacher-semantic-dialogue">{rows.map((row,i)=><div key={i}><dt>{row[0]}</dt><dd>{row[1]}</dd></div>)}</dl>;
 }
 return <p>{parts[0]}</p>;
}
export function LiveReplyLayout({blocks}:{blocks:ReadonlyArray<ReplyBlock>}){
 return <div className="teacher-live-caption teacher-native-reply" data-caption-layout="structured" data-visual-source="live-tool">{blocks.map((block,i)=><SemanticCaptionBlock key={i} block={block}/>)}</div>;
}
export function LiveCaptionText({text,language,structured=false,completed=false,english=true}:{text:string;language:string;structured?:boolean;completed?:boolean;english?:boolean}){
 if(structured&&completed)return <details className="teacher-reply-transcript"><summary>{english?"Spoken transcript":"語音原文"}</summary><p lang={language}>{text}</p></details>;
 return <div className={"teacher-live-caption"+(structured?" teacher-live-spoken":"")} lang={language} data-caption-layout="text"><p>{text}</p></div>;
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
