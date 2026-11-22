import {useEffect,useRef,useState,type FormEvent,type KeyboardEvent} from "react";
import {useTranslation} from "react-i18next";
import type {ReturnTypeOfLive} from "../live/types";
import "./friendUnifiedComposer.css";

type Props={
 live:ReturnTypeOfLive;
 hasKey:boolean;
 focusOnMount:boolean;
 starters?:string[];
};

/** One keyboard for the voice and text-first paths. Both call live.sendText. */
export function FriendUnifiedComposer({live,hasKey,focusOnMount,starters=[]}:Props){
 const {t}=useTranslation("voice");
 const inputRef=useRef<HTMLTextAreaElement>(null);
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
  if(connecting){setNotice(t("friendLive.preparingPost"));return}
  if(!connected&&!hasKey){
   // Existing Turnstile/guest gate remains the only way to mint a 5-minute Live grant.
   setNotice(t("guestTrial.homeDesc",{ns:"common"}));
   return;
  }
  setBusy(true);setNotice("");
  try{
   if(!connected)await live.start(undefined,true);
   if(!live.sendText(text))throw Error("Live unavailable");
   setDraft(current=>current.trim()===text?"":current);
   inputRef.current?.focus({preventScroll:true});
  }catch{
   setNotice(t("callCaptions.translateFailed"));
  }finally{setBusy(false)}
 };
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
 const quick=[...new Set(starters.map(v=>v.trim()).filter(Boolean))].slice(0,2);
 return <div className="friend-unified-composer" data-live-input="unified">
  {quick.length>0&&live.turns.length===0&&<div className="friend-unified-starters" aria-label={t("friendLive.stageAria",{name:""})}>
   {quick.map(value=><button type="button" key={value} onClick={()=>void send(value)} disabled={busy||connecting}>{value}</button>)}
  </div>}
  {connected&&!live.micEnabled&&<button className="friend-unified-enable-mic" type="button" disabled={micBusy} onClick={()=>void enableMic()}>{t("friendLive.useVoice")}</button>}
  <form className="friend-unified-input-row" onSubmit={submit}>
   <textarea ref={inputRef} rows={1} value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={keyDown}
    aria-label={t("friendLive.textChat")} placeholder={t("friendLive.textChat")} disabled={live.state==="ending"||live.state==="reporting"}
    maxLength={2000}/>
   <button type="submit" disabled={!draft.trim()||busy||connecting} aria-label={t("friendLive.textChat")}>{t("friendLive.textChat")}</button>
  </form>
  {notice&&<p className="friend-unified-notice" role="status">{notice}</p>}
 </div>;
}
