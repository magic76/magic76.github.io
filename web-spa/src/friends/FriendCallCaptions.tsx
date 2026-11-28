import type {LearningFeedbackByTurn} from "../live/learningFeedback.mjs";
import {useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {geminiKey} from "../lib/runtime";
import type {NativeLanguage} from "../teacher/teacherLocale";
import {callTranslationRows,splitCallSentences} from "./callSentence.mjs";
import {translateWithProvider} from "../live/secondLiveProvider";
import {FriendCallBubbleList} from "./FriendCallBubbleList";
import type {SuggestedReply} from "../live/suggestReplies";
type Turn={input?:string;output?:string};
type Props={learningFeedback?:LearningFeedbackByTurn;name:string;turns:ReadonlyArray<Turn>;input:string;output:string;learningLanguage:string;nativeLanguage:NativeLanguage;speaking:boolean;speakerAvatar?:ReactNode;waitingText?:string;replyExtra?:ReactNode;visualReply?:{keys:ReadonlyArray<number|"stream">;standalone?:ReadonlyArray<{id:number;before:number;content:ReactNode}>;revision:string;focusKey:string;passive?:boolean;renderCaption?:(text:string,language:string,key?:number|"stream")=>ReactNode;kind?:(key:number|"stream")=>string;render:(key:number|"stream")=>ReactNode};headerAccessory?:ReactNode;translationEnabled?:boolean;suggestions?:SuggestedReply[];suggestionsEnabled?:boolean};
type Translator={translate(text:string):Promise<string>;destroy?():void};
type Factory={availability(v:{sourceLanguage:string;targetLanguage:string}):Promise<"available"|"downloadable"|"downloading"|"unavailable">;create(v:{sourceLanguage:string;targetLanguage:string}):Promise<Translator>};
type Browser={factory:Factory|null;status:"checking"|"available"|"downloadable"|"downloading"|"unavailable";instance:Translator|null;promise:Promise<void>|null;closed:boolean};
type Part={source:string;text:string;status:"pending"|"working"|"done"|"key"|"failed"};
const PREF="crew_friend_call_translation_v1";
const LANG:Record<string,string>={"英文":"en","日文":"ja","韓文":"ko","中文":"zh","華語":"zh","繁體中文":"zh","簡體中文":"zh","西班牙文":"es","法文":"fr","德文":"de","義大利文":"it","越南文":"vi","泰文":"th","印尼文":"id","葡萄牙文":"pt"};
function initial(){try{return localStorage.getItem(PREF)!=="off"}catch{return true}}
function browserCode(language:string){return language==="zh-TW"?"zh-Hant":language==="zh-CN"?"zh":language.split("-")[0]}
export function FriendCallCaptions({name,turns,learningFeedback,input,output,learningLanguage,nativeLanguage,speaking,speakerAvatar,waitingText,replyExtra,visualReply,headerAccessory,translationEnabled,suggestions=[],suggestionsEnabled=false}:Props){
 const {t}=useTranslation("voice");
 const captionsRef=useRef<HTMLDivElement>(null),replyRef=useRef<HTMLParagraphElement>(null),translationRef=useRef<HTMLDivElement>(null);
 const [localEnabled]=useState(initial);
 const enabled=translationEnabled??localEnabled;
 const [parts,setParts]=useState<Part[]>([]);
 const historicalTranslationsRef=useRef(new Map<string,string[]>());
 const partsRef=useRef<Part[]>([]),queueRef=useRef<number[]>([]),activeRef=useRef(new Map<number,AbortController>());
 const epochRef=useRef(0),flushRef=useRef<()=>void>(()=>{}),browserRef=useRef<Browser|null>(null);
 const streamRef=useRef({raw:"",closed:0,count:turns.length,completed:"",final:false,suspended:""});
 const heardInputRef=useRef(input.trim());
 const latestInput=useMemo(()=>[...turns].reverse().find(v=>v.input?.trim())?.input?.trim()||"",[turns]);
 const latestReply=useMemo(()=>[...turns].reverse().find(v=>v.output?.trim())?.output?.trim()||"",[turns]);
 const source=LANG[learningLanguage]||"en";
 const needTranslation=source.split("-")[0]!==nativeLanguage.split("-")[0];
 const currentReply=output.trim();
 const visibleTranslation=callTranslationRows(parts);
 const publish=()=>setParts([...partsRef.current]);
 const cancel=()=>{epochRef.current++;for(const controller of activeRef.current.values())controller.abort();activeRef.current.clear();queueRef.current=[];partsRef.current=[];publish()};
 const reset=()=>{const previous=streamRef.current.raw||streamRef.current.completed;if(previous){const texts=partsRef.current.filter(part=>part.status==="done"&&part.text.trim()).map(part=>part.text.trim());if(texts.length)historicalTranslationsRef.current.set(previous,texts)}cancel();const s=streamRef.current;s.raw="";s.closed=0;s.completed="";s.final=false;s.suspended=""};
 const startBrowser=(session:Browser)=>{
  if(session.closed||!session.factory||session.promise||session.instance||session.status==="unavailable")return;
  const from=browserCode(source),to=browserCode(nativeLanguage);
  session.promise=session.factory.create({sourceLanguage:from,targetLanguage:to}).then(item=>{
   if(session.closed){item.destroy?.();return}
   session.instance=item;flushRef.current();
  }).catch(()=>{if(!session.closed){session.status="unavailable";flushRef.current()}});
 };
 const flush=()=>{
  if(!enabled||!needTranslation)return;
  const browser=browserRef.current,useKey=!!geminiKey();
  if(!useKey&&(!browser||browser.status==="checking"||(!browser.instance&&browser.status!=="unavailable")))return;
  while(queueRef.current.length&&activeRef.current.size<(useKey?2:1)){
   const index=queueRef.current.shift()!,part=partsRef.current[index];if(!part||part.status!=="pending")continue;
   if(!useKey&&!browser?.instance){part.status="key";publish();continue}
   const epoch=epochRef.current,controller=new AbortController();activeRef.current.set(index,controller);part.status="working";publish();
   const onText=(value:string)=>{if(epoch!==epochRef.current||controller.signal.aborted)return;const item=partsRef.current[index];if(item){item.text=value;publish()}};
   const task=useKey?translateWithProvider(part.source,source,nativeLanguage,onText,controller.signal):browser!.instance!.translate(part.source).then(value=>{onText(String(value).trim());return String(value).trim()});
   void task.then(value=>{if(epoch!==epochRef.current)return;const item=partsRef.current[index];if(item){item.text=value;item.status=value?"done":"failed";publish()}}).catch(error=>{if(epoch!==epochRef.current)return;const item=partsRef.current[index];if(item){item.text="";item.status=error?.message==="key"?"key":"failed";publish()}}).finally(()=>{if(epoch!==epochRef.current)return;activeRef.current.delete(index);flushRef.current()});
  }
 };
 flushRef.current=flush;
 const enqueue=(text:string)=>{if(!text||!enabled||!needTranslation)return;partsRef.current.push({source:text,text:"",status:"pending"});queueRef.current.push(partsRef.current.length-1);publish();flushRef.current()};
 const advance=(text:string,final:boolean)=>{
  const s=streamRef.current;
  const {sentences,tail}=splitCallSentences(text);
  if(s.closed>sentences.length||partsRef.current.slice(0,s.closed).some((part,i)=>part.source!==sentences[i]))reset();
  const state=streamRef.current;
  for(let i=state.closed;i<sentences.length;i++)enqueue(sentences[i]);
  state.closed=sentences.length;state.raw=text;
  if(final&&!state.final){if(tail)enqueue(tail);state.final=true}
 };
 // Only mounted during an active telephone call: restore the exact prior browser chrome color.
 useEffect(()=>{const meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');if(!meta)return;const previous=meta.getAttribute("content");meta.setAttribute("content","#000");return()=>{if(previous===null)meta.removeAttribute("content");else meta.setAttribute("content",previous)}},[]);
 // The browser model is prepared once per language pair, then reused throughout the call.
 useEffect(()=>{
  const session:Browser={factory:null,status:"checking",instance:null,promise:null,closed:false};browserRef.current=session;
  if(!geminiKey()){
   const factory=(globalThis as unknown as {Translator?:Factory}).Translator;
   if(!factory){session.status="unavailable";flushRef.current()}
   else{session.factory=factory;void factory.availability({sourceLanguage:browserCode(source),targetLanguage:browserCode(nativeLanguage)}).then(status=>{
    if(session.closed)return;session.status=status;
    if(status==="available")startBrowser(session);
    else flushRef.current();
   }).catch(()=>{if(!session.closed){session.status="unavailable";flushRef.current()}})}
  }
  return()=>{session.closed=true;session.instance?.destroy?.();session.instance=null;browserRef.current=null};
 },[source,nativeLanguage]);
 useEffect(()=>{reset();streamRef.current.count=turns.length},[enabled,needTranslation,source,nativeLanguage]);
 // A fresh stream that is not an extension of the prior reply is a new AI turn.
 useEffect(()=>{
  if(!enabled||!needTranslation)return;
  const s=streamRef.current;
  if(turns.length>s.count){
   for(const turn of turns.slice(s.count))if(turn.output?.trim()){
    const complete=turn.output.trim();
    if(s.raw&&!complete.startsWith(s.raw))reset();
    advance(complete,true);s.completed=complete;s.final=true;
   }
   s.count=turns.length;
  }
  if(!currentReply||currentReply===s.suspended||s.final&&currentReply===s.completed)return;
  if(s.raw&&!currentReply.startsWith(s.raw))reset();
  if(currentReply!==s.raw){s.final=false;advance(currentReply,false)}
 },[turns,currentReply,enabled,needTranslation,source,nativeLanguage]);
 // Interrupt button and server-side break both invalidate in-flight work; epoch guards late responses.
 useEffect(()=>{
  const interrupt=()=>{const stale=currentReply;reset();streamRef.current.suspended=stale};
  window.addEventListener("crew-friend-call-interrupt",interrupt);
  return()=>{window.removeEventListener("crew-friend-call-interrupt",interrupt);cancel()};
 },[source,nativeLanguage]);
 // Server interruption usually begins a fresh user transcript before the old AI turn completes.
 useEffect(()=>{const previous=heardInputRef.current;heardInputRef.current=input.trim();if(input.trim()&&input.trim()!==previous&&!speaking&&streamRef.current.raw&&!streamRef.current.final){const stale=currentReply;reset();streamRef.current.suspended=stale}},[input,speaking,currentReply]);
 // Keep the spoken original readable; the friend's primary avatar already identifies the speaker.
 useEffect(()=>{const el=replyRef.current;if(el)el.scrollTop=el.scrollHeight;const pane=captionsRef.current;if(pane)pane.scrollTop=0},[latestReply,currentReply]);
 useEffect(()=>{const el=translationRef.current;if(el)el.scrollTop=el.scrollHeight},[parts]);
 useEffect(()=>{if(enabled){const session=browserRef.current;if(session&&(session.status==="downloadable"||session.status==="downloading"))startBrowser(session)}},[enabled]);
 return <FriendCallBubbleList name={name} turns={turns} learningFeedback={learningFeedback} learningLanguage={learningLanguage} input={input} output={output} source={source} nativeLanguage={nativeLanguage} translationRows={visibleTranslation} historicalTranslations={historicalTranslationsRef.current} suggestions={suggestions} suggestionsEnabled={suggestionsEnabled} translationEnabled={enabled} needTranslation={needTranslation} speaking={speaking} speakerAvatar={speakerAvatar} waitingText={waitingText||t("callCaptions.waitingForFriend")} youLabel={t("friendLive.youSaid")} recognizingLabel={t("callCaptions.recognizing")} recognizedLabel={t("callCaptions.recognized")} translateStatus={value=>t(value==="needsKey"?"callCaptions.needsKey":value==="translateFailed"?"callCaptions.translateFailed":"callCaptions.translating")} headerAccessory={headerAccessory} replyExtra={replyExtra} visualReply={visualReply}/>;
}
