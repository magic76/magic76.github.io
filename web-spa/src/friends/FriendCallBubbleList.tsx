import {useEffect,useRef,type ReactNode} from "react";
import type {SuggestedReply} from "../live/suggestReplies";
import "./friendCallBubbles.css";

type Turn={input?:string;output?:string};
type TranslationRow={kind:string;value:string};
type Props={name:string;turns:ReadonlyArray<Turn>;input:string;output:string;source:string;nativeLanguage:string;translationRows:TranslationRow[];historicalTranslations:ReadonlyMap<string,string[]>;suggestions:SuggestedReply[];suggestionsEnabled:boolean;translationEnabled:boolean;needTranslation:boolean;speaking:boolean;speakerAvatar?:ReactNode;waitingText:string;youLabel:string;recognizingLabel:string;recognizedLabel:string;translateStatus:(value:string)=>string;headerAccessory?:ReactNode;replyExtra?:ReactNode};
export function FriendCallBubbleList({name,turns,input,output,source,nativeLanguage,translationRows,historicalTranslations,suggestions,suggestionsEnabled,translationEnabled,needTranslation,speaking,speakerAvatar,waitingText,youLabel,recognizingLabel,recognizedLabel,translateStatus,headerAccessory,replyExtra}:Props){
 const scrollRef=useRef<HTMLDivElement>(null),followRef=useRef(true);
 const lastInput=[...turns].reverse().find(turn=>turn.input?.trim())?.input?.trim()||"";
 const lastOutput=[...turns].reverse().find(turn=>turn.output?.trim())?.output?.trim()||"";
 const completed=turns.map((turn,index)=>({...turn,index})).filter(turn=>turn.input?.trim()||turn.output?.trim());
 const currentOutput=output.trim();
 const currentInput=input.trim();
 const lastCompletedOutput=completed.filter(turn=>turn.output?.trim()).at(-1)?.output?.trim()||"";
 const showCurrentOutput=!!currentOutput&&currentOutput!==lastCompletedOutput;
 const showCurrentInput=!!currentInput&&currentInput!==lastInput;
 const latestAiKey=showCurrentOutput?"stream":completed.filter(turn=>turn.output?.trim()).at(-1)?.index;
 const renderSuggestions=(key:number|"stream")=>suggestionsEnabled&&latestAiKey===key&&suggestions.length>0?
  <div className="friend-bubble-suggestions" aria-label="Reply suggestions">{suggestions.slice(0,3).map((item,index)=><div className="friend-bubble-suggestion" key={index}><span>{index+1}.</span><div><strong lang={source}>{item.text}</strong><small lang={nativeLanguage}>{item.translation}</small></div></div>)}</div>:null;
 const renderTranslation=(key:string,latest:boolean)=>!translationEnabled||!needTranslation?null:latest&&translationRows.length?
  <div className="friend-bubble-translation" lang={nativeLanguage}>{translationRows.map((row,index)=><span key={index}>{row.kind==="text"?row.value:translateStatus(row.value)}</span>)}</div>:
  historicalTranslations.has(key)?<div className="friend-bubble-translation" lang={nativeLanguage}>{historicalTranslations.get(key)?.map((text,index)=><span key={index}>{text}</span>)}</div>:null;
 // Compare visible content, not newly allocated arrays or unrelated Live state.
 const contentKey=JSON.stringify([
  completed.map(turn=>[turn.input?.trim()||"",turn.output?.trim()||""]),
  showCurrentInput?currentInput:"",showCurrentOutput?currentOutput:"",
  translationEnabled&&needTranslation?translationRows.filter(row=>row.kind==="text").map(row=>row.value):[],
  suggestionsEnabled?suggestions.slice(0,3).map(item=>[item.text,item.translation]):[]
 ]);
 useEffect(()=>{const pane=scrollRef.current;if(!pane||!followRef.current)return;pane.scrollTop=pane.scrollHeight},[contentKey]);
 return <div ref={scrollRef} onScroll={event=>{const pane=event.currentTarget;followRef.current=pane.scrollHeight-pane.clientHeight-pane.scrollTop<=48}} className="friend-phone-captions friend-chat-bubbles" aria-label={name}>
  {headerAccessory}
  {completed.map(turn=><div className="friend-bubble-turn" key={turn.index}>
   {turn.input?.trim()?<section className="friend-bubble friend-bubble-user" aria-label={youLabel}><small>{youLabel}</small><p lang={source}>{turn.input.trim()}</p></section>:null}
   {turn.output?.trim()?<section className="friend-bubble friend-bubble-ai" aria-label={name}>
    <small>{name}</small><p lang={source}>{turn.output.trim()}</p>
    {renderTranslation(turn.output.trim(),!showCurrentOutput&&latestAiKey===turn.index)}
    {renderSuggestions(turn.index)}
   </section>:null}
  </div>)}
  {showCurrentInput?<section className="friend-bubble friend-bubble-user" aria-label={youLabel}><small>{youLabel} · {recognizingLabel}</small><p lang={source}>{currentInput}</p></section>:null}
  {showCurrentOutput?<section className="friend-bubble friend-bubble-ai" aria-label={name}>
   {speakerAvatar?<div className="friend-caption-speaker"><span className="friend-caption-avatar teacher-call-caption-avatar">{speakerAvatar}</span><small>{name}{speaking?" · …":""}</small></div>:<small>{name}</small>}
   <p lang={source}>{currentOutput}</p>{replyExtra}
   {renderTranslation(currentOutput,true)}
   {renderSuggestions("stream")}
  </section>:null}
  {!completed.length&&!showCurrentOutput&&!showCurrentInput?<section className="friend-bubble friend-bubble-ai" aria-label={name}><small>{name}</small><p>{waitingText}</p></section>:null}
 </div>;
}
