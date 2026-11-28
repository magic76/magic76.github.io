import {LearningFeedbackCard} from "../live/LearningFeedbackCard";
import type {LearningFeedbackByTurn} from "../live/learningFeedback.mjs";
import {useEffect,useRef,useState,type ReactNode} from "react";
import type {SuggestedReply} from "../live/suggestReplies";
import "./friendCallBubbles.css";

type Turn={input?:string;output?:string};
type TranslationRow={kind:string;value:string};
type Props={learningFeedback?:LearningFeedbackByTurn;learningLanguage?:string;name:string;turns:ReadonlyArray<Turn>;input:string;output:string;source:string;nativeLanguage:string;translationRows:TranslationRow[];historicalTranslations:ReadonlyMap<string,string[]>;suggestions:SuggestedReply[];suggestionsEnabled:boolean;translationEnabled:boolean;needTranslation:boolean;speaking:boolean;speakerAvatar?:ReactNode;waitingText:string;youLabel:string;recognizingLabel:string;recognizedLabel:string;translateStatus:(value:string)=>string;headerAccessory?:ReactNode;replyExtra?:ReactNode;visualReply?:{keys:ReadonlyArray<number|"stream">;revision:string;focusKey:string;kind?:(key:number|"stream")=>string;render:(key:number|"stream")=>ReactNode}};
export function FriendCallBubbleList({name,turns,learningFeedback={},learningLanguage,input,output,source,nativeLanguage,translationRows,historicalTranslations,suggestions,suggestionsEnabled,translationEnabled,needTranslation,speaking,speakerAvatar,waitingText,youLabel,recognizingLabel,recognizedLabel,translateStatus,headerAccessory,replyExtra,visualReply}:Props){
 const scrollRef=useRef<HTMLDivElement>(null),followRef=useRef(true);
 const hasVisual=(key:number|"stream")=>visualReply?.keys.includes(key)??false;
 const autoTop=useRef<number|null>(null),lastFocus=useRef("");
 const [paused,setPaused]=useState(false);
 function goLatest(){const pane=scrollRef.current;if(!pane)return;followRef.current=true;setPaused(false);const material=latestMaterial(pane);scrollTo(pane,material)}
 function stopFollowing(){if(!visualReply)return;autoTop.current=null;followRef.current=false;setPaused(true)}
 const lastInput=[...turns].reverse().find(turn=>turn.input?.trim())?.input?.trim()||"";
 const lastOutput=[...turns].reverse().find(turn=>turn.output?.trim())?.output?.trim()||"";
 const completed=turns.map((turn,index)=>({...turn,index})).filter(turn=>turn.input?.trim()||turn.output?.trim());
 const currentOutput=output.trim();
 const currentInput=input.trim();
 const lastCompletedOutput=completed.filter(turn=>turn.output?.trim()).at(-1)?.output?.trim()||"";
 const showCurrentOutput=!!currentOutput&&currentOutput!==lastCompletedOutput;
 const showCurrentInput=!!currentInput&&currentInput!==lastInput;
 const latestAiKey=showCurrentOutput?"stream":completed.filter(turn=>turn.output?.trim()).at(-1)?.index;
 function latestMaterial(pane:HTMLDivElement){if(!visualReply||showCurrentInput&&!showCurrentOutput||latestAiKey===undefined||visualReply.kind?.(latestAiKey)!=="material")return null;return pane.querySelector<HTMLElement>(`[data-reply-key="${latestAiKey}"] .teacher-visual-reply`)}
 function scrollTo(pane:HTMLDivElement,item:HTMLElement|null){const top=item?pane.scrollTop+item.getBoundingClientRect().top-pane.getBoundingClientRect().top-8:pane.scrollHeight-pane.clientHeight;autoTop.current=Math.max(0,Math.min(pane.scrollHeight-pane.clientHeight,top));pane.scrollTop=autoTop.current;}
 const renderSuggestions=(key:number|"stream")=>suggestionsEnabled&&latestAiKey===key&&suggestions.length>0?
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
  if(!visualReply){if(followRef.current)pane.scrollTop=pane.scrollHeight;return}
  if(!followRef.current)return;
  const key=visualReply.focusKey,changed=key!==lastFocus.current;lastFocus.current=key;
  const item=key?pane.querySelector<HTMLElement>('[data-visual-current="true"] .is-highlighted,[data-visual-current="true"] .teaching-board-step-focus'):null;
  if(item){const rect=item.getBoundingClientRect(),bounds=pane.getBoundingClientRect();if(changed||rect.top<bounds.top||rect.bottom>bounds.bottom){const top=Math.max(0,Math.min(pane.scrollHeight-pane.clientHeight,pane.scrollTop+rect.top-bounds.top-12));autoTop.current=top;pane.scrollTop=top;}return}
  scrollTo(pane,latestMaterial(pane));
 },[contentKey,visualReply?.focusKey]);
 const touchStart=useRef<number|null>(null);
 return <div ref={scrollRef} onWheel={stopFollowing} onTouchStart={e=>{touchStart.current=e.touches[0]?.clientY??null}} onTouchMove={e=>{if(touchStart.current!==null&&Math.abs((e.touches[0]?.clientY??touchStart.current)-touchStart.current)>8)stopFollowing()}} onTouchEnd={()=>{touchStart.current=null}} onScroll={event=>{const pane=event.currentTarget;if(visualReply&&autoTop.current!==null&&Math.abs(pane.scrollTop-autoTop.current)<=2){autoTop.current=null;return}followRef.current=pane.scrollHeight-pane.clientHeight-pane.scrollTop<=48;if(visualReply)setPaused(!followRef.current)}} className="friend-phone-captions friend-chat-bubbles" aria-label={name}>
  {headerAccessory}
  {completed.map(turn=><div className="friend-bubble-turn" key={turn.index}>
   {turn.input?.trim()?<section className="friend-bubble friend-bubble-user" aria-label={youLabel}><small>{youLabel}</small><p lang={source}>{turn.input.trim()}</p></section>:null}
   {learningFeedback[turn.index]&&<LearningFeedbackCard feedback={learningFeedback[turn.index]} language={learningLanguage||source}/>}
   {turn.output?.trim()||hasVisual(turn.index)?<section className={"friend-bubble friend-bubble-ai"+(hasVisual(turn.index)?" has-visual-reply":"")} data-reply-key={visualReply?turn.index:undefined} data-reply-template={visualReply?.kind?.(turn.index)} aria-label={name}>
    <small>{name}</small>{turn.output?.trim()&&<p lang={source}>{turn.output.trim()}</p>}
    {renderTranslation(turn.output?.trim()||"",!showCurrentOutput&&latestAiKey===turn.index)}
    {visualReply?.render(turn.index)}
    {renderSuggestions(turn.index)}
   </section>:null}
  </div>)}
  {showCurrentInput?<section className="friend-bubble friend-bubble-user" aria-label={youLabel}><small>{youLabel} · {recognizingLabel}</small><p lang={source}>{currentInput}</p></section>:null}
  {showCurrentOutput||hasVisual("stream")?<section className={"friend-bubble friend-bubble-ai"+(hasVisual("stream")?" has-visual-reply":"")} data-reply-key={visualReply?"stream":undefined} data-reply-template={visualReply?.kind?.("stream")} aria-label={name}>
   {speakerAvatar?<div className="friend-caption-speaker"><span className="friend-caption-avatar teacher-call-caption-avatar">{speakerAvatar}</span><small>{name}{speaking?" · …":""}</small></div>:<small>{name}</small>}
   {showCurrentOutput&&<><p lang={source}>{currentOutput}</p>{replyExtra}{renderTranslation(currentOutput,true)}</>}
   {visualReply?.render("stream")}
   {renderSuggestions("stream")}
  </section>:null}
  {!completed.length&&!showCurrentOutput&&!showCurrentInput&&!hasVisual("stream")?<section className="friend-bubble friend-bubble-ai" aria-label={name}><small>{name}</small><p>{waitingText}</p></section>:null}
  {visualReply&&paused&&<button type="button" className="teacher-visual-follow" onClick={goLatest}>{nativeLanguage.startsWith("zh")?"跟隨老師":"Follow teacher"}</button>}
 </div>;
}
