import{useEffect,useRef,useState}from"react";
import{Link}from"react-router-dom";
import{useTranslation}from"react-i18next";
import{GeminiSetupNotice}from"../components/GeminiSetupNotice";
import{geminiKey}from"../lib/runtime";
import{UI_LOCALE_CATALOG}from"../i18n/localeCatalog";
import{buildFortuneQuestionPrompt,formatFortuneLocalDate,parseAiReading}from"./aiReading";
import type{FortuneReading}from"./types";

/** Keep stored original for context but display simple text without literal Markdown markers. */
export function plainFortuneAnswer(value:string):string{return value.replace(/\*\*([^*\n]+)\*\*/g,"$1").replace(/^\s{0,3}#{1,3}\s+/gm,"").trim()}
const FOLLOWUP_CONFIG={preferLive:false,maxOutputTokens:2048,requireComplete:true,timeoutMs:45000,thinking:"low"} as const;
type Props={reading:FortuneReading;isCurrent:()=>boolean;onSave:(reading:FortuneReading)=>void};
export function FortuneFollowUp({reading,isCurrent,onSave}:Props){
 const{t,i18n}=useTranslation("fortune");
 const[q,setQ]=useState(""),[sending,setSending]=useState(false),[error,setError]=useState<"quota"|"key"|"other"|null>(null);
 const latest=useRef(reading.id),mounted=useRef(true);
 latest.current=reading.id;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 useEffect(()=>{setError(null);setSending(false);setQ("")},[reading.id]);
 const parsed=parseAiReading(reading.ai||"");
 const followups=reading.followups||[];
 const hasKey=Boolean(geminiKey()&&window.CrewAI);
 async function submit(input?:string){
  const question=(input||q).trim();
  if(!question||sending||!hasKey)return;
  const id=reading.id;
  setSending(true);setError(null);
  const lang=UI_LOCALE_CATALOG.find(x=>x.code===i18n.resolvedLanguage||x.code===i18n.language)?.label||"繁體中文";
  const prompt=buildFortuneQuestionPrompt(reading.result,parsed.summary,formatFortuneLocalDate(new Date()),lang,question,followups);
  try{
   const answer=await window.CrewAI.call(prompt,FOLLOWUP_CONFIG);
   if(!mounted.current||latest.current!==id||!isCurrent())return;
   const entry={q:question,a:String(answer),at:new Date().toISOString(),model:window.CrewAI.lastModel?.()};
   onSave({...reading,followups:[...followups,entry].slice(-10)});
   setQ("");
  }catch(err:unknown){
   if(!mounted.current||latest.current!==id||!isCurrent())return;
   const kind=(err&&typeof err==="object"&&"kind"in err)?String((err as{kind:unknown}).kind):"";
   setError(kind==="quota"?"quota":kind==="key"?"key":"other");
  }finally{if(mounted.current&&latest.current===id)setSending(false)}
 }
 return <section className="fortune-result-card fortune-follow-up" aria-label={t("reading.followup.title")}>
  <h3>{t("reading.followup.title")}</h3>
  {followups.length>0&&<div className="fortune-follow-up-history" role="status" aria-live="polite">{followups.map((item,i)=><div className="fortune-follow-up-entry" key={i}><strong>{item.q}</strong><p style={{whiteSpace:"pre-line"}}>{plainFortuneAnswer(item.a)}</p></div>)}</div>}
  <form onSubmit={e=>{e.preventDefault();void submit()}}>
   <label className="label" htmlFor="fortune-followup-question">{t("reading.followup.question")}</label>
   <textarea className="field" id="fortune-followup-question" value={q} onChange={e=>setQ(e.target.value)} rows={3} maxLength={1000} disabled={sending} placeholder={t("reading.followup.placeholder")}/>
   <small>{t("reading.followup.quotaNote")}</small>
   <div className="actions"><button type="submit" className="btn" disabled={sending||!q.trim()||!hasKey}>{sending?t("reading.followup.sending"):t("reading.followup.send")}</button></div>
  </form>
  {!hasKey&&<GeminiSetupNotice returnTo={"/fortune/reading?history="+encodeURIComponent(reading.id)}/>}
  {error&&<div className="spa-error" role="alert">{t("reading.followup."+error)} {error==="key"?<Link to="/settings">{t("reading.followup.settings")}</Link>:error==="other"?<button type="button" className="btn secondary small" disabled={sending} onClick={()=>void submit()}>{t("reading.retry")}</button>:null}</div>}
 </section>;
}
