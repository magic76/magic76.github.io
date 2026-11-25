import {useEffect,useRef,useState,type FormEvent,type KeyboardEvent} from "react";
import {useTranslation} from "react-i18next";
import {Arrow} from "../components/Arrow";
import type {ReturnTypeOfLive} from "../live/types";
import "./friendUnifiedComposer.css";

type Props={
 live:ReturnTypeOfLive;
 hasKey:boolean;
 focusOnMount:boolean;
 blocked?:boolean;
 starters?:string[];
 autoStarter?:string;
 verificationReady?:boolean;
 onVerificationNeeded?:()=>void;
};

/** One keyboard for the voice and text-first paths. Both call live.sendText. */
export function FriendUnifiedComposer({live,hasKey,focusOnMount,blocked=false,starters=[],autoStarter,verificationReady=false,onVerificationNeeded}:Props){
 const {t}=useTranslation("voice");
 const inputRef=useRef<HTMLTextAreaElement>(null);
 const autoSent=useRef(false);
 const pendingText=useRef("");
 const [draft,setDraft]=useState("");
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [micBusy,setMicBusy]=useState(false);
 const connected=live.state==="listening"||live.state==="speaking";
 const connecting=live.state==="requesting-mic"||live.state==="connecting"||live.state==="ending"||live.state==="reporting";
 useEffect(()=>{if(focusOnMount)inputRef.current?.focus({preventScroll:true})},[focusOnMount]);
 const send=async(value:string)=>{
  const text=value.trim();
  if(!text||busy)return;
  if(blocked){setNotice(t("friendLive.preparingPost"));return}
  if(connecting){setNotice(t(onVerificationNeeded?"friendLive.connectingText":"friendLive.preparingPost"));return}
  if(!connected&&!hasKey){
   if(!onVerificationNeeded){setNotice(t("guestTrial.homeDesc",{ns:"common"}));return}
   // Keep the submitted message until verification grants a text-only Live socket.
   pendingText.current=text;autoSent.current=true;
   setNotice(t(verificationReady?"friendLive.connectingText":"friendLive.verifyBeforeSend"));
   onVerificationNeeded?.();
   return;
  }
  setBusy(true);setNotice("");
  try{
   if(!connected)await live.start(undefined,true);
   if(!live.sendText(text))throw Error("Live unavailable");
   setDraft(current=>current.trim()===text?"":current);
   inputRef.current?.focus({preventScroll:true});
  }catch{
   setDraft(current=>current||text);
   setNotice(t("guestTrial.serviceUnavailable",{ns:"common"}));
  }finally{setBusy(false)}
 };
 // After Turnstile and the guest grant, send the queued message exactly once.
 useEffect(()=>{
  if(!connected||busy||blocked||!pendingText.current)return;
  const text=pendingText.current;pendingText.current="";void send(text);
 },[connected,busy,blocked]);
 useEffect(()=>{
  if(pendingText.current)setNotice(t(verificationReady?"friendLive.connectingText":"friendLive.verifyBeforeSend"));
 },[verificationReady,t]);
 const submit=(event:FormEvent)=>{event.preventDefault();void send(draft)};
 const keyDown=(event:KeyboardEvent<HTMLTextAreaElement>)=>{
  if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){
   event.preventDefault();void send(draft);
  }
 };
 const enableMic=async()=>{
  if(micBusy)return;
  setMicBusy(true);setNotice("");
  try{await live.enableMicrophone()}
  catch{setNotice(t("controls.micBlocked"))}
  finally{setMicBusy(false)}
 };
 // The explicit fortune handoff auto-sends once. Ordinary visitors still decide when to start.
 useEffect(()=>{
  if(autoSent.current||!autoStarter?.trim()||blocked||busy||live.turns.length)return;
  if(!connected&&!hasKey)return;
  autoSent.current=true;void send(autoStarter);
 },[autoStarter,blocked,connected,hasKey,busy,live.turns.length]);
 const quick=[...new Set(starters.map(v=>v.trim()).filter(Boolean))].slice(0,2);
 return <div className="friend-unified-composer" data-live-input="unified">
  {quick.length>0&&live.turns.length===0&&<div className="friend-unified-starters" aria-label={t("friendLive.stageAria",{name:""})}>
   {quick.map(value=><button type="button" key={value} onClick={()=>void send(value)} disabled={busy||connecting||blocked}>{value}</button>)}
  </div>}
  {connected&&!live.micEnabled&&<button className="friend-unified-enable-mic" type="button" disabled={micBusy} onClick={()=>void enableMic()}>{t("friendLive.useVoice")}</button>}
  <form className="friend-unified-input-row" onSubmit={submit}>
   <textarea ref={inputRef} rows={1} value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={keyDown}
    aria-label={t("friendLive.textChat")} placeholder={t("friendLive.textChat")} disabled={live.state==="ending"||live.state==="reporting"}
    maxLength={2000}/>
   <button type="submit" disabled={!draft.trim()||busy||connecting||blocked} aria-label={t("friendLive.textChat")}><Arrow direction="up" className="crew-arrow--plain"/></button>
  </form>
  {notice&&<p className="friend-unified-notice" role={notice===t("friendLive.verifyBeforeSend")?"alert":"status"}>{notice}</p>}
 </div>;
}
