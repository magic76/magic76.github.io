import {useMemo,useRef,useState,type FormEvent} from "react";
import {Link,useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "./feedback.css";
const TYPES=["bug","idea","other"] as const;
type Kind=typeof TYPES[number];
const safePath=(value:string|null)=>value&&/^\/[a-zA-Z0-9_\-/]*$/.test(value)&&value.length<=160?value:"";
export function FeedbackPage(){
 const {t}=useTranslation("feedback"),location=useLocation();
 const [kind,setKind]=useState<Kind>("bug"),[message,setMessage]=useState(""),[contact,setContact]=useState("");
 const [status,setStatus]=useState<"idle"|"sending"|"success"|"error">("idle"),[reference,setReference]=useState("");
 const [errorCode,setErrorCode]=useState<"error"|"required"|"invalidEmail"|"unavailable"|"rateLimited">("error");
 const messageRef=useRef<HTMLTextAreaElement>(null),emailRef=useRef<HTMLInputElement>(null);
 const honeypotRef=useRef<HTMLInputElement>(null);
 const page=useMemo(()=>{
  const params=new URLSearchParams(location.search);let previous="";
  if(typeof window!=="undefined")try{previous=sessionStorage.getItem("crew_feedback_source_path")||""}catch{/* Optional. */}
  return safePath(params.get("from"))||safePath(previous);
 },[location.search]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(status==="sending"||status==="success")return;
  if(message.trim().length<10||message.trim().length>1500){setErrorCode("required");setStatus("error");messageRef.current?.focus();return}
  if(contact.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim())){
   setErrorCode("invalidEmail");setStatus("error");emailRef.current?.focus();return;
  }
  setStatus("sending");
  try{
   const response=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({kind,message:message.trim(),contact:contact.trim(),page,website:honeypotRef.current?.value??""})});
   if(response.status===429)throw Error("RATE_LIMITED");
   if(response.status===503)throw Error("UNAVAILABLE");
   if(!response.ok)throw Error("Submission failed");
   const result=await response.json() as {ok?:boolean;reference?:string};
   if(!result.ok||!result.reference)throw Error("Invalid response");
   setReference(result.reference);setStatus("success");
  }catch(error){
   setErrorCode(error instanceof Error&&error.message==="RATE_LIMITED"?"rateLimited":error instanceof Error&&error.message==="UNAVAILABLE"?"unavailable":"error");
   setStatus("error");
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
   <textarea ref={messageRef} id="crew-feedback-message" required minLength={10} maxLength={1500} rows={6}
    aria-invalid={status==="error"&&errorCode==="required"}
    placeholder={t("detailsPlaceholder")} value={message} onChange={e=>{setMessage(e.target.value);if(status==="error")setStatus("idle")}}/>
   <div className="crew-feedback-helper"><small>{t("detailsHelp")}</small><small>{message.length}/1500</small></div>
   <label htmlFor="crew-feedback-email" className="crew-feedback-label">{t("emailLabel")}</label>
   <input ref={emailRef} id="crew-feedback-email" type="email" maxLength={160} autoComplete="email" aria-invalid={status==="error"&&errorCode==="invalidEmail"} placeholder={t("emailPlaceholder")} value={contact} onChange={e=>{setContact(e.target.value);if(status==="error")setStatus("idle")}}/>
   {page&&<p className="crew-feedback-source"><strong>{t("pageLabel")}：</strong><span>{page}</span></p>}
   <p className="crew-feedback-privacy">{t("privacy")}</p>
   <input ref={honeypotRef} className="crew-feedback-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" type="text"/>
   {status==="error"&&<p role="alert" className="crew-feedback-error">{t(errorCode)}</p>}
   <button className="btn primary crew-feedback-submit" type="submit" disabled={status==="sending"}>
    {status==="sending"?t("sending"):t("send")}</button>
  </form></section>}
 </div>;
}
