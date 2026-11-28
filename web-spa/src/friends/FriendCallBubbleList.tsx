import {LearningFeedbackCard} from "../live/LearningFeedbackCard";
import type {LearningFeedbackByTurn} from "../live/learningFeedback.mjs";
import {Fragment,useEffect,useRef,type ReactNode} from "react";
import type {SuggestedReply} from "../live/suggestReplies";
import "./friendCallBubbles.css";

type Turn={input?:string;output?:string};
type TranslationRow={kind:string;value:string};
type Props={learningFeedback?:LearningFeedbackByTurn;learningLanguage?:string;name:string;turns:ReadonlyArray<Turn>;input:string;output:string;source:string;nativeLanguage:string;translationRows:TranslationRow[];historicalTranslations:ReadonlyMap<string,string[]>;suggestions:SuggestedReply[];suggestionsEnabled:boolean;translationEnabled:boolean;needTranslation:boolean;speaking:boolean;speakerAvatar?:ReactNode;waitingText:string;youLabel:string;recognizingLabel:string;recognizedLabel:string;translateStatus:(value:string)=>string;headerAccessory?:ReactNode;replyExtra?:ReactNode;visualReply?:{keys:ReadonlyArray<number|"stream">;standalone?:ReadonlyArray<{id:number;before:number;content:ReactNode}>;revision:string;focusKey:string;passive?:boolean;renderCaption?:(text:string,language:string,key?:number|"stream")=>ReactNode;kind?:(key:number|"stream")=>string;render:(key:number|"stream")=>ReactNode}};
export function FriendCallBubbleList({name,turns,learningFeedback={},learningLanguage,input,output,source,nativeLanguage,translationRows,historicalTranslations,suggestions,suggestionsEnabled,translationEnabled,needTranslation,speaking,speakerAvatar,waitingText,youLabel,recognizingLabel,recognizedLabel,translateStatus,headerAccessory,replyExtra,visualReply}:Props){
 const scrollRef=useRef<HTMLDivElement>(null),followRef=useRef(true);
 const hasVisual=(key:number|"stream")=>visualReply?.keys.includes(key)??false;
 const autoTop=useRef<number|null>(null),lastTop=useRef(0),touchStart=useRef<number|null>(null);
 const lastInput=[...turns].reverse().find(turn=>turn.input?.trim())?.input?.trim()||"";
 const lastOutput=[...turns].reverse().find(turn=>turn.output?.trim())?.output?.trim()||"";
 const completed=turns.map((turn,index)=>({...turn,index})).filter(turn=>turn.input?.trim()||turn.output?.trim());
 const standalone=visualReply?.standalone||[];
 const renderStandalone=(after:number,through:number)=>standalone.filter(entry=>entry.before>after&&entry.before<=through).map(entry=><section className="friend-bubble friend-bubble-ai has-visual-reply" key={"visual-"+entry.id} data-reply-key={"visual-"+entry.id} data-reply-template="material" aria-label={name}><small>{name}</small>{entry.content}</section>);
 const currentOutput=output.trim();
 const currentInput=input.trim();
 const lastCompletedOutput=completed.filter(turn=>turn.output?.trim()).at(-1)?.output?.trim()||"";
 const showCurrentOutput=!!currentOutput&&currentOutput!==lastCompletedOutput;
 const showCurrentInput=!!currentInput&&currentInput!==lastInput;
 const latestAiKey=showCurrentOutput?"stream":completed.filter(turn=>turn.output?.trim()).at(-1)?.index;
 const renderSuggestions=(key:number|"stream")=>suggestionsEnabled&&latestAiKey===key&&visualReply?.kind?.(key)!=="missing"&&suggestions.length>0?
  <div className="friend-bubble-suggestions" aria-label="Reply suggestions">{suggestions.slice(0,3).map((item,index)=><div className="friend-bubble-suggestion" key={index}><span>{index+1}.</span><div><strong lang={source}>{item.text}</strong><small lang={nativeLanguage}>{item.translation}</small></div></div>)}</div>:null;
 const renderTranslation=(key:string,latest:boolean)=>!translationEnabled||!needTranslation?null:latest&&translationRows.length?
  <div className="friend-bubble-translation" lang={nativeLanguage}>{translationRows.map((row,index)=><span key={index}>{row.kind==="text"?row.value:translateStatus(row.value)}</span>)}</div>:
  historicalTranslations.has(key)?<div className="friend-bubble-translation" lang={nativeLanguage}>{historicalTranslations.get(key)?.map((text,index)=><span key={index}>{text}</span>)}</div>:null;
 // Compare visible content, not newly allocated arrays or unrelated Live state.
 const contentKey=JSON.stringify([
  completed.map(turn=>[turn.input?.trim()||"",turn.output?.trim()||""]),
  showCurrentInput?currentInput:"",showCurrentOutput?currentOutput:"",learningFeedback,
  translationEnabled&&needTranslation?translationRows.filter(row=>row.kind==="text").map(row=>row.value):[],
  suggestionsEnabled?suggestions.slice(0,3).map(item=>[item.text,item.translation]):[],visualReply?.revision||""
 ]);
 useEffect(()=>{
  const pane=scrollRef.current;if(!pane)return;
  if(!followRef.current)return;
  // A streaming caption must never compete with a finger on the transcript.
  if(touchStart.current!==null)return;
  const top=Math.max(0,pane.scrollHeight-pane.clientHeight);
  if(Math.abs(pane.scrollTop-top)<=1)return;
  pane.scrollTop=pane.scrollHeight;
  autoTop.current=lastTop.current=pane.scrollTop;
 },[contentKey]);
 function onScroll(pane:HTMLDivElement){
  const top=pane.scrollTop,previous=lastTop.current;
  lastTop.current=top;
  if(autoTop.current!==null){
   const automatic=Math.abs(top-autoTop.current)<=2;
   autoTop.current=null;
   if(automatic)return;
  }
  // Do not re-enable follow on upward motion, even within the bottom threshold.
  if(top<previous)followRef.current=false;
  else if(top>previous)followRef.current=pane.scrollHeight-pane.clientHeight-pane.scrollTop<=48;
 }
 function finishTouch(){touchStart.current=null}
 return <div ref={scrollRef} onWheel={e=>{
  if(e.deltaY<0)followRef.current=false;
  else if(e.deltaY>0&&e.currentTarget.scrollHeight-e.currentTarget.clientHeight-e.currentTarget.scrollTop<=48)followRef.current=true;
 }} onTouchStart={e=>{touchStart.current=e.touches[0]?.clientY??null}} onTouchMove={e=>{
  const y=e.touches[0]?.clientY;
  if(y!==undefined&&touchStart.current!==null&&y>touchStart.current)followRef.current=false;
  touchStart.current=y??touchStart.current;
 }} onTouchEnd={finishTouch} onTouchCancel={finishTouch} onScroll={event=>onScroll(event.currentTarget)} className="friend-phone-captions friend-chat-bubbles" aria-label={name}>
  {headerAccessory}
  {completed.map((turn,index)=><Fragment key={turn.index}>{renderStandalone(completed[index-1]?.index??-1,turn.index)}<div className="friend-bubble-turn">
   {turn.input?.trim()?<section className="friend-bubble friend-bubble-user" aria-label={youLabel}><small>{youLabel}</small><p lang={source}>{turn.input.trim()}</p></section>:null}
   {learningFeedback[turn.index]&&<LearningFeedbackCard feedback={learningFeedback[turn.index]} language={learningLanguage||source}/>}
   {turn.output?.trim()||hasVisual(turn.index)?<section className={"friend-bubble friend-bubble-ai"+(hasVisual(turn.index)?" has-visual-reply":"")} data-reply-key={visualReply?turn.index:undefined} data-reply-template={visualReply?.kind?.(turn.index)} aria-label={name}>
    <small>{name}</small>{visualReply?.passive&&visualReply.render(turn.index)}{turn.output?.trim()&&(visualReply?.renderCaption?visualReply.renderCaption(turn.output.trim(),source,turn.index):<p lang={source}>{turn.output.trim()}</p>)}
    {renderTranslation(turn.output?.trim()||"",!showCurrentOutput&&latestAiKey===turn.index)}
    {!visualReply?.passive&&visualReply?.render(turn.index)}
    {renderSuggestions(turn.index)}
   </section>:null}
  </div></Fragment>)}
  {renderStandalone(completed.at(-1)?.index??-1,Infinity)}
  {showCurrentInput?<section className="friend-bubble friend-bubble-user" aria-label={youLabel}><small>{youLabel} · {recognizingLabel}</small><p lang={source}>{currentInput}</p></section>:null}
  {showCurrentOutput||hasVisual("stream")?<section className={"friend-bubble friend-bubble-ai"+(hasVisual("stream")?" has-visual-reply":"")} data-reply-key={visualReply?"stream":undefined} data-reply-template={visualReply?.kind?.("stream")} aria-label={name}>
   {speakerAvatar?<div className="friend-caption-speaker"><span className="friend-caption-avatar teacher-call-caption-avatar">{speakerAvatar}</span><small>{name}{speaking?" · …":""}</small></div>:<small>{name}</small>}
   {visualReply?.passive&&visualReply.render("stream")}
   {showCurrentOutput&&<>{visualReply?.renderCaption?visualReply.renderCaption(currentOutput,source,"stream"):<p lang={source}>{currentOutput}</p>}{replyExtra}{renderTranslation(currentOutput,true)}</>}
   {!visualReply?.passive&&visualReply?.render("stream")}
   {renderSuggestions("stream")}
  </section>:null}
  {!completed.length&&!showCurrentOutput&&!showCurrentInput&&!hasVisual("stream")&&!standalone.length?<section className="friend-bubble friend-bubble-ai" aria-label={name}><small>{name}</small><p>{waitingText}</p></section>:null}
 </div>;
}
