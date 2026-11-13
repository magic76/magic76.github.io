import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {GeminiSetupNotice} from "../components/GeminiSetupNotice";
import {ensureCore,geminiKey,GEMINI_KEY_CHANGED_EVENT} from "../lib/runtime";
import type {DailyCard} from "./dailyCard";
import {generateZoeDaily,readZoeDaily,readZoeDailyFailure,retryZoeDaily,saveZoeDaily,zoeDailyFailure,zoeDailySlot,zoeFollowupPrompt,ZOE_DAILY_OPTIONS,type ZoeDailyEntry,type ZoeDailyError} from "./zoeDailyReading";

type Props={card:DailyCard;hash:string;locale:string;scrollOnOpen:boolean};
export function FortuneZoeReading({card,hash,locale,scrollOnOpen}:Props){
 const {t}=useTranslation("fortuneDaily");
 const slot=zoeDailySlot(card.date,card.kind,hash,locale);
 const [entry,setEntry]=useState<ZoeDailyEntry|null>(()=>readZoeDaily(slot));
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<ZoeDailyError|null>(null);
 const [question,setQuestion]=useState("");
 const [asking,setAsking]=useState(false);
 const [askError,setAskError]=useState<ZoeDailyError|null>(null);
 const [keyRevision,setKeyRevision]=useState(0);
 const sectionRef=useRef<HTMLElement|null>(null);
 const currentSlot=useRef(slot);
 currentSlot.current=slot;
 const hasKey=Boolean(geminiKey());
 const fallback=t("zoeReading.fallback",{kind:t(card.kind),headline:card.headline,theme:card.theme,
  do:card.do[0],avoid:card.avoid,color:card.luckyColor.name});
 const activeEntry=entry?.source==="ai"?entry:{text:fallback,source:"fallback" as const,at:Date.now(),followups:entry?.followups||[]};
 const friendHref="/friend/live?id=zoe&from=home&chat=text&quote=daily&chart="+hash;
 const returnTo="/fortune?daily=1&chart="+hash+"&kind="+card.kind+"&zoe=1";
 useEffect(()=>{
  const changed=()=>{retryZoeDaily(slot);setKeyRevision(v=>v+1)};
  window.addEventListener(GEMINI_KEY_CHANGED_EVENT,changed);
  return()=>window.removeEventListener(GEMINI_KEY_CHANGED_EVENT,changed);
 },[slot]);
 useEffect(()=>{
  if(!scrollOnOpen)return;
  const reduced=typeof window.matchMedia==="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  sectionRef.current?.scrollIntoView({behavior:reduced?"auto":"smooth",block:"start"});
 },[slot,scrollOnOpen]);
 useEffect(()=>{
  let cancelled=false;
  setEntry(readZoeDaily(slot));setBusy(false);setError(null);setQuestion("");setAskError(null);setAsking(false);
  const cached=readZoeDaily(slot);
  if(cached?.source==="ai"||!hasKey)return()=>{cancelled=true};
  setBusy(true);
  void (async()=>{
   try{
    await ensureCore();
    if(!window.CrewAI?.call)throw new Error("Gemini unavailable");
    const result=await generateZoeDaily(card,hash,locale,(prompt,options)=>window.CrewAI!.call(prompt,options));
    if(!cancelled&&currentSlot.current===slot){if(result)setEntry(result);else setError(readZoeDailyFailure(slot));}
   }catch(e){if(!cancelled&&currentSlot.current===slot)setError(zoeDailyFailure(e));}
   finally{if(!cancelled&&currentSlot.current===slot)setBusy(false);}
  })();
  return()=>{cancelled=true};
 },[slot,keyRevision]);
 async function ask(){
  const q=question.trim();if(!q||!hasKey||asking)return;
  setAsking(true);setAskError(null);
  try{
   await ensureCore();
   if(!window.CrewAI?.call)throw new Error("Gemini unavailable");
   const answer=String(await window.CrewAI.call(zoeFollowupPrompt(card,locale,activeEntry.text,q,activeEntry.followups||[]),ZOE_DAILY_OPTIONS)).trim().slice(0,4000);
   if(!answer)throw new Error("Empty reply");
   if(currentSlot.current!==slot)return;
   const result:ZoeDailyEntry={...activeEntry,at:Date.now(),followups:[...(activeEntry.followups||[]),{q,a:answer,at:Date.now()}].slice(-8)};
   setEntry(result);saveZoeDaily(slot,result);setQuestion("");
  }catch(e){if(currentSlot.current===slot)setAskError(zoeDailyFailure(e));}
  finally{if(currentSlot.current===slot)setAsking(false);}
 }
 function retry(){retryZoeDaily(slot);setKeyRevision(v=>v+1)}
 return <section ref={sectionRef} className="fortune-zoe-reading" aria-label={t("zoeReading.title")}>
  <h3>✦ {t("zoeReading.title")}</h3>
  <p className="fortune-zoe-reading-text" aria-live="polite">{activeEntry.text}</p>
  {busy&&<p className="fortune-zoe-reading-status" role="status">{t("zoeReading.loading")}</p>}
  {!busy&&activeEntry.source==="fallback"&&<p className="fortune-zoe-reading-status">{t("zoeReading.staticNote")}</p>}
  {error&&<div className="fortune-zoe-reading-status" role="alert">{t("zoeReading."+error)}{hasKey&&<button type="button" onClick={retry}>{t("zoeReading.retry")}</button>}</div>}
  {!hasKey&&<><p className="fortune-zoe-reading-status">{t("zoeReading.needKey")}</p><GeminiSetupNotice returnTo={returnTo}/></>}
  {hasKey&&error==="key"&&<GeminiSetupNotice force returnTo={returnTo}/>}
  {hasKey&&<form className="fortune-zoe-reading-followup" onSubmit={e=>{e.preventDefault();void ask()}}>
   {(activeEntry.followups||[]).map((turn,i)=><div className="fortune-zoe-reading-turn" key={i}><strong>{turn.q}</strong><p>{turn.a}</p></div>)}
   <label htmlFor="fortune-zoe-question">{t("zoeReading.ask")}</label>
   <textarea id="fortune-zoe-question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1000} rows={2} disabled={asking} placeholder={t("zoeReading.placeholder")}/>
   <button type="submit" disabled={asking||!question.trim()}>{asking?t("zoeReading.sending"):t("zoeReading.send")}</button>
   {askError&&<p role="alert">{t("zoeReading."+askError)}</p>}
  </form>}
  <Link className="fortune-zoe-reading-chat" to={friendHref}>{t("zoeReading.continueChat")}</Link>
 </section>;
}
