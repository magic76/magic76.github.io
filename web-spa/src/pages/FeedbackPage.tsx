import {useEffect,useMemo,useRef,useState,type FormEvent} from "react";
import {Link,useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "./feedback.css";
type ChallengeApi={render:(el:HTMLElement,options:Record<string,unknown>)=>string;reset:(id:string)=>void;remove:(id:string)=>void};
declare global{interface Window{turnstile?:ChallengeApi}}
let loader:Promise<void>|null=null;
function loadTurnstile(){
 if(window.turnstile)return Promise.resolve();
 if(loader)return loader;
 loader=new Promise<void>((resolve,reject)=>{
  const script=document.createElement("script");
  script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async=true;script.onload=()=>window.turnstile?resolve():reject(Error("Turnstile unavailable"));
  script.onerror=()=>reject(Error("Turnstile load failed"));document.head.appendChild(script);
 }).catch(error=>{loader=null;throw error});
 return loader;
}
const TYPES=["bug","idea","other"] as const;
type Kind=typeof TYPES[number];
const safePath=(value:string|null)=>value&&/^\/[a-zA-Z0-9_\-/]*$/.test(value)&&value.length<=160?value:"";
export function FeedbackPage(){
 const {t}=useTranslation("feedback"),location=useLocation();
 const [kind,setKind]=useState<Kind>("bug"),[message,setMessage]=useState(""),[contact,setContact]=useState("");
 const [siteKey,setSiteKey]=useState(""),[availability,setAvailability]=useState<"loading"|"ready"|"unavailable">("loading");
 const [captcha,setCaptcha]=useState(""),[captchaError,setCaptchaError]=useState(false);
 const [status,setStatus]=useState<"idle"|"sending"|"success"|"error">("idle"),[reference,setReference]=useState("");
 const challengeNode=useRef<HTMLDivElement>(null),widgetId=useRef<string|null>(null);
 const page=useMemo(()=>{
  const params=new URLSearchParams(location.search);let previous="";
  if(typeof window!=="undefined")try{previous=sessionStorage.getItem("crew_feedback_source_path")||""}catch{/* Optional. */}
  return safePath(params.get("from"))||safePath(previous);
 },[location.search]);
 useEffect(()=>{
  let active=true;
  void fetch("/api/feedback",{cache:"no-store"}).then(async response=>{
   if(!response.ok)throw Error("Feedback unavailable");
   return response.json() as Promise<{enabled?:boolean;siteKey?:string}>;
  }).then(result=>{
   if(!active)return;
   if(result.enabled&&result.siteKey){setSiteKey(result.siteKey);setAvailability("ready")}
   else setAvailability("unavailable");
  }).catch(()=>{if(active)setAvailability("unavailable")});
  return()=>{active=false};
 },[]);
 useEffect(()=>{
  if(!siteKey)return;
  let active=true;
  void loadTurnstile().then(()=>{
   if(!active||!challengeNode.current||!window.turnstile)return;
   widgetId.current=window.turnstile.render(challengeNode.current,{
    sitekey:siteKey,
    callback:(value:unknown)=>{if(active){setCaptcha(typeof value==="string"?value:"");setCaptchaError(false)}},
    "expired-callback":()=>{if(active)setCaptcha("")},
    "error-callback":()=>{if(active){setCaptcha("");setCaptchaError(true)}}
   });
  }).catch(()=>{if(active)setCaptchaError(true)});
  return()=>{active=false;if(widgetId.current){window.turnstile?.remove(widgetId.current);widgetId.current=null}};
 },[siteKey]);
 const mailto=useMemo(()=>{
  const subject="[Crew Feedback]["+kind+"]";
  const body=[message,contact?"Contact: "+contact:"",page?"Page: "+page:""].filter(Boolean).join("\n\n");
  return "mailto:crew@3sssi.com?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
 },[kind,message,contact,page]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(status==="sending"||status==="success")return;
  if(message.trim().length<10||message.trim().length>1500){setStatus("error");return}
  if(!captcha){setCaptchaError(true);return}
  setStatus("sending");
  try{
   const response=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({kind,message:message.trim(),contact:contact.trim(),page,captcha,website:""})});
   if(!response.ok)throw Error("Submission failed");
   const result=await response.json() as {ok?:boolean;reference?:string};
   if(!result.ok||!result.reference)throw Error("Invalid response");
   setReference(result.reference);setStatus("success");setCaptcha("");
  }catch{
   setStatus("error");setCaptcha("");
   if(widgetId.current)window.turnstile?.reset(widgetId.current);
  }
 }
 return <div className="crew-feedback">
  <section className="hero crew-feedback-hero"><span className="kicker">Crew</span><h1>{t("title")}</h1><p>{t("intro")}</p></section>
  {status==="success"?<section className="section panel crew-feedback-success" role="status">
   <div aria-hidden="true" className="crew-feedback-success-icon">✓</div>
   <h2>{t("successTitle")}</h2><p>{t("successBody")}</p>
   <p className="meta">{t("reference")}：<strong>{reference}</strong></p>
   <Link className="btn primary" to="/">{t("back")}</Link>
  </section>:<section className="section panel crew-feedback-panel"><form onSubmit={submit} noValidate>
   <fieldset className="crew-feedback-kinds"><legend>{t("typeLabel")}</legend>
    <div className="crew-feedback-kind-list">{TYPES.map(id=><label key={id} className="crew-feedback-kind">
     <input type="radio" name="kind" checked={kind===id} onChange={()=>setKind(id)}/><span>{t("types."+id)}</span>
    </label>)}</div>
   </fieldset>
   <label htmlFor="crew-feedback-message" className="crew-feedback-label">{t("detailsLabel")}</label>
   <textarea id="crew-feedback-message" required minLength={10} maxLength={1500} rows={6}
    placeholder={t("detailsPlaceholder")} value={message} onChange={e=>{setMessage(e.target.value);if(status==="error")setStatus("idle")}}/>
   <div className="crew-feedback-helper"><small>{t("detailsHelp")}</small><small>{message.length}/1500</small></div>
   <label htmlFor="crew-feedback-email" className="crew-feedback-label">{t("emailLabel")}</label>
   <input id="crew-feedback-email" type="email" maxLength={160} autoComplete="email" placeholder={t("emailPlaceholder")} value={contact} onChange={e=>setContact(e.target.value)}/>
   {page&&<p className="crew-feedback-source"><strong>{t("pageLabel")}：</strong><span>{page}</span></p>}
   <p className="crew-feedback-privacy">{t("privacy")}</p>
   <input className="crew-feedback-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" type="text"/>
   {availability==="ready"&&<div className="crew-feedback-challenge"><div ref={challengeNode}/>
    {captchaError&&<p role="alert" className="crew-feedback-error">{t("captchaNeeded")}</p>}</div>}
   {availability==="loading"&&<p className="meta" role="status">{t("captchaLoading")}</p>}
   {status==="error"&&<p role="alert" className="crew-feedback-error">{message.trim().length<10?t("required"):t("error")}</p>}
   {availability==="unavailable"&&<p className="crew-feedback-error" role="status">{t("unavailable")}</p>}
   {availability==="ready"&&<button className="btn primary crew-feedback-submit" type="submit"
    disabled={status==="sending"||!captcha||message.trim().length<10||message.trim().length>1500||Boolean(contact.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim()))}>
    {status==="sending"?t("sending"):t("send")}</button>}
   <a className="crew-feedback-email-link" href={mailto}>{t("emailFallback")}</a>
   <small className="crew-feedback-email-hint">{t("emailHint")}</small>
  </form></section>}
 </div>;
}
