import type {BoardCard} from "./boardProtocol";
import {cardKindName} from "./TeachingCard";

export type CaptionBlock={text:string;kind:"text"|"point"|"example"|"term";label?:string;detail?:string};
const exampleLead=/^(?:for example|e\.g\.|example\s*[:：]|例如|舉例|举例|比如|たとえば|例えば|예를 들어)\s*/iu;
const pointLead=/^(?:first(?:ly)?|second(?:ly)?|third(?:ly)?|finally|next|首先|其次|最後|最后|接著|接着|第[一二三四五六七八九十\d]+(?:點|点|種|种|個|个|步|項|项)|\d+[.)、])(?:\b|[\s,，:：、]|(?=[\p{Script=Han}]))/iu;
// Use spoken definitions only; a label and its explanation must both be in
// the actual caption. No generated examples, invented translations or topic catalog.
const termPattern=/^((?:而|但|至於|至于|或者|或|while\s+|whereas\s+|but\s+|and\s+)?\s*(?:["“「]?[A-Za-z][A-Za-z0-9'’/-]{0,35}["”」]?|\/[^/\n]{1,20}\/)(?:\s+(?:[A-Za-z][A-Za-z'’-]{0,20})){0,2}?)(\s*(?:(?:則|则)?(?:表示|代表|指的是|意思是|用於|用于|適用於|适用于|是指|是|的意思是)|(?:[:,：]\s*|\s+)(?:means?|refers to|is used (?:for|to)|is pronounced|is for|expresses?|describes?)\b|\s*[:：]\s*))(.+)$/iu;
function termBlock(text:string):CaptionBlock|null{
 const match=text.match(termPattern);
 if(!match||!match[3].trim()||/^(?:i|you|he|she|it|we|they|this|that|there|what|who)\s*$/i.test(match[1]))return null;
 return {kind:"term",text,label:match[1],detail:match[2]+match[3]};
}
// Sentence boundaries are ignored inside quotation marks (including the
// punctuation in spoken example sentences). Keep unfinished tails visible.
function captionSentences(text:string):string[]{
 const out:string[]=[];let start=0,closing="";
 const quoteEnds:Record<string,string>={'"':'"',"“":"”","「":"」","『":"』","‘":"’"};
 for(let i=0;i<text.length;i++){
  const char=text[i];
  if(closing){if(char===closing)closing="";continue}
  if(quoteEnds[char]){closing=quoteEnds[char];continue}
  if(char==="\n"||/[。！？]/u.test(char)||(/[.!?]/.test(char)&&(/\s/.test(text[i+1]||"")||i===text.length-1))){
   // Abbreviations and decimal numbers are not separate lesson points.
   if(char==="."&&/(?:\be\.g|\bi\.e|\bMr|\bMrs|\bDr)$/i.test(text.slice(start,i)))continue;
   const end=char==="\n"?i:i+1;
   const sentence=text.slice(start,end).trim();if(sentence)out.push(sentence);start=i+1;
  }
 }
 const tail=text.slice(start).trim();if(tail)out.push(tail);return out;
}
function quoteBlocks(text:string):CaptionBlock[]{
 // A closing quote is evidence of a complete spoken example. Isolate the
 // quote from the surrounding explanation and follow-up question.
 const result:CaptionBlock[]=[];let start=0;
 const quotes=/"[^"\n]+"|“[^”\n]+”|「[^」\n]+」|『[^』\n]+』/gu;
 for(const match of text.matchAll(quotes)){
  const prefix=text.slice(start,match.index).trim();
  if(prefix)result.push({kind:exampleLead.test(prefix)?"example":"text",text:prefix});
  result.push({kind:"example",text:match[0]});start=match.index!+match[0].length;
 }
 const tail=text.slice(start).trim();if(tail)result.push({kind:"text",text:tail});return result;
}
export function liveCaptionBlocks(raw:string):CaptionBlock[]{
 const text=raw.trim();if(!text)return [];
 const blocks:CaptionBlock[]=[];
 for(const sentence of captionSentences(text)){
  // Contrast connectors split only if every clause has an explicit spoken
  // term-definition structure. Preserve the connector and punctuation.
  const clauses=sentence.split(/(?<=[,，；;])\s*(?=(?:而|但|至於|至于|while\b|whereas\b|but\b|and\b))|(?<=[；;])\s*(?=[A-Za-z/])/iu).filter(Boolean);
  const terms=clauses.map(termBlock);
  if(terms.every(Boolean)){blocks.push(...terms as CaptionBlock[]);continue}
  // A quoted example may contain punctuation or be immediately followed by
  // Chinese text. Keep example spans separate from the rest of the reply.
  if(exampleLead.test(sentence)&&/["“「『]/u.test(sentence)&&/"[^"]+"|“[^”]+”|「[^」]+」|『[^』]+』/u.test(sentence)){
   blocks.push(...quoteBlocks(sentence));continue;
  }
  blocks.push({text:sentence,kind:exampleLead.test(sentence)?"example":pointLead.test(sentence)?"point":"text"});
 }
 return blocks;
}
export function LiveCaptionText({text,language}:{text:string;language:string}){
 const blocks=liveCaptionBlocks(text);
 return <div className="teacher-live-caption" lang={language} data-caption-layout={blocks.some(b=>b.kind!=="text")?"structured":"text"}>{blocks.map((b,i)=>b.kind==="term"?<p key={i} className="teacher-live-caption-term"><strong>{b.label}</strong><span>{b.detail}</span></p>:<p key={i} className={"teacher-live-caption-"+b.kind}>{b.text}</p>)}</div>
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
