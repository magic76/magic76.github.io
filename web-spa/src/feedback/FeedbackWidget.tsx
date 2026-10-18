import {useEffect,useRef,useState,type FormEvent} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {sendFeedback,type FeedbackKind,type FeedbackProduct,type FeedbackReason} from "./api";
import "./feedback.css";
type FeedbackProps={product:FeedbackProduct;roleId?:string;errorCode?:string;model?:string};
const reasonOptions:Exclude<FeedbackReason,"">[]=["wrong_language","repeated_question","interrupted","bad_response","connection","game_logic","other"];
const zh={
 title:"意見回饋",open:"提供意見",rate:"這次體驗如何？",good:"很好",bad:"需要改善",
 kind:"回饋類型",bug:"遇到問題",idea:"功能建議",other:"其他意見",rating:"體驗評分",
 reason:"問題類型（選填）",message:"詳細說明",placeholder:"告訴我們發生了什麼，或希望改善的地方…",
 warn:"請勿提供 Gemini API Key、私人對話或敏感資料。",
 diagnostics:"附上目前功能、頁面、角色與模型等基本診斷資訊（不包含對話內容）",
 send:"送出回饋",sending:"送出中…",cancel:"取消",close:"關閉",success:"謝謝你的回饋！",
 failure:"無法送出，請再試一次。",rate_limit:"提交太頻繁，請稍後再試。",
 not_ready:"回饋服務尚未啟用，請稍後再試。",optional:"描述（選填）",
 reasons:{"wrong_language":"突然切換語言","repeated_question":"重複問相同問題","interrupted":"太早打斷我","bad_response":"答非所問","connection":"語音或連線問題","game_logic":"遊戲規則或回合錯誤","other":"其他"}
};
const en={
 title:"Send feedback",open:"Give feedback",rate:"How was this experience?",good:"Good",bad:"Needs work",
 kind:"Feedback type",bug:"Report an issue",idea:"Suggest a feature",other:"Other",rating:"Rate experience",
 reason:"Issue category (optional)",message:"Details",placeholder:"Tell us what happened or what could improve…",
 warn:"Do not include your Gemini API Key, private conversations or sensitive data.",
 diagnostics:"Include basic diagnostics (feature, page, role and model; no conversation content)",
 send:"Send feedback",sending:"Sending…",cancel:"Cancel",close:"Close",success:"Thanks for your feedback!",
 failure:"Could not send feedback. Please try again.",rate_limit:"Too many submissions. Please try later.",
 not_ready:"Feedback is not enabled yet. Please try later.",optional:"Details (optional)",
 reasons:{"wrong_language":"Unexpected language switch","repeated_question":"Repeated the same question","interrupted":"Interrupted me too early","bad_response":"Irrelevant answer","connection":"Voice or connection problem","game_logic":"Game rules or turn issue","other":"Other"}
};
function useCopy(){const {i18n}=useTranslation();return i18n.language.startsWith("zh")?zh:en}
export function FeedbackLauncher({product,roleId,errorCode,model}:FeedbackProps){
 const [open,setOpen]=useState(false),t=useCopy();
 return <><button type="button" className="crew-feedback-launch" onClick={()=>setOpen(true)}>{t.open}</button>
  {open?<FeedbackDialog product={product} roleId={roleId} errorCode={errorCode} model={model} onClose={()=>setOpen(false)}/>:null}
 </>;
}
export function FeedbackRating({product,roleId,model}:FeedbackProps){
 const [negative,setNegative]=useState(false);
 const [state,setState]=useState<"idle"|"loading"|"done"|"error">("idle");
 const t=useCopy(),{i18n}=useTranslation();
 async function positive(){
  setState("loading");
  try{
   await sendFeedback({kind:"rating",rating:5,reason:"",message:"",product,platform:"web",
    includeDiagnostics:false});
   setState("done");
  }catch{setState("error")}
 }
 return <div className="crew-feedback-rating">
  {state==="done"?<small role="status">{t.success}</small>:<>
   <span>{t.rate}</span><div className="crew-feedback-rating-actions">
    <button type="button" disabled={state==="loading"} onClick={()=>{void positive()}}>👍 {t.good}</button>
    <button type="button" disabled={state==="loading"} onClick={()=>setNegative(true)}>👎 {t.bad}</button>
   </div>{state==="error"?<small role="alert">{t.failure}</small>:null}
  </>}
  {negative?<FeedbackDialog product={product} roleId={roleId} model={model} kind="rating" rating={1}
   onClose={()=>setNegative(false)} onSuccess={()=>setState("done")}/>:null}
 </div>;
}
export function FeedbackDialog({product,roleId,errorCode,model,kind:initialKind="bug",rating=1,onClose,onSuccess}:FeedbackProps&{
 kind?:FeedbackKind;rating?:1|5;onClose:()=>void;onSuccess?:()=>void;
}){
 const t=useCopy(),{i18n}=useTranslation();
 const [kind,setKind]=useState<FeedbackKind>(initialKind),[reason,setReason]=useState<FeedbackReason>("");
 const [message,setMessage]=useState(""),[includeDiagnostics,setIncludeDiagnostics]=useState(true);
 const [website,setWebsite]=useState(""),[state,setState]=useState<"editing"|"sending"|"sent">("editing");
 const [error,setError]=useState("");
 const first=useRef<HTMLSelectElement>(null),modal=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;first.current?.focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();onClose()}
   if(event.key!=="Tab")return;
   const elements=Array.from(modal.current?.querySelectorAll<HTMLElement>(
    "button:not([disabled]),select:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([tabindex='-1'])"
   )||[]);
   if(!elements.length)return;
   const start=elements[0],end=elements[elements.length-1];
   if(event.shiftKey&&document.activeElement===start){event.preventDefault();end.focus()}
   else if(!event.shiftKey&&document.activeElement===end){event.preventDefault();start.focus()}
  };
  window.addEventListener("keydown",key);
  return()=>{window.removeEventListener("keydown",key);previous?.focus()};
 },[onClose]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(state!=="editing")return;
  setState("sending");setError("");
  try{
   await sendFeedback({kind,rating:kind==="rating"?rating:undefined,reason,message:message.trim(),
    product,platform:"web",includeDiagnostics,
    page:includeDiagnostics?location.pathname:undefined,roleId:includeDiagnostics?roleId:undefined,
    model:includeDiagnostics?(model||(["teacher","friend","play"].includes(product)?useTeacherStore.getState().liveModel:undefined)):undefined,
    errorCode:includeDiagnostics?errorCode:undefined,locale:includeDiagnostics?i18n.language:undefined,website});
   setState("sent");onSuccess?.();
  }catch(e){const name=e instanceof Error?e.message:"";
   setError(name==="rate_limit"?t.rate_limit:name==="not_ready"?t.not_ready:t.failure);setState("editing")}
 }
 if(typeof document==="undefined")return null;
 return createPortal(<div className="crew-feedback-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <div ref={modal} className="crew-feedback-modal" role="dialog" aria-modal="true" aria-label={t.title}>
   <div className="crew-feedback-heading"><h2>{t.title}</h2><button type="button" aria-label={t.close} onClick={onClose}>×</button></div>
   {state==="sent"?<div className="crew-feedback-done" role="status">
    <p>{t.success}</p><button type="button" className="crew-feedback-primary" onClick={onClose}>{t.close}</button>
   </div>:<form onSubmit={e=>{void submit(e)}}>
    {initialKind!=="rating"?<label>{t.kind}<select ref={first} value={kind} onChange={e=>{setKind(e.target.value as FeedbackKind);setReason("")}}>
      <option value="bug">{t.bug}</option><option value="idea">{t.idea}</option><option value="other">{t.other}</option>
     </select></label>:<><p className="crew-feedback-selected">{rating===5?"👍 "+t.good:"👎 "+t.bad}</p>
     <select ref={first} className="crew-feedback-hidden-select" aria-label={t.kind} value="rating" onChange={()=>{}}><option value="rating">{t.rating}</option></select></>}
    {(kind==="bug"||(kind==="rating"&&rating===1))?<label>{t.reason}<select value={reason} onChange={e=>setReason(e.target.value as FeedbackReason)}>
      <option value="">—</option>{reasonOptions.map(value=><option value={value} key={value}>{t.reasons[value]}</option>)}
     </select></label>:null}
    <label>{kind==="rating"?t.optional:t.message}<textarea maxLength={1600} rows={4} value={message}
      onChange={e=>setMessage(e.target.value)} placeholder={t.placeholder}/></label>
    <p className="crew-feedback-warning">{t.warn}</p>
    <label className="crew-feedback-check"><input type="checkbox" checked={includeDiagnostics} onChange={e=>setIncludeDiagnostics(e.target.checked)}/><span>{t.diagnostics}</span></label>
    <input className="crew-feedback-honeypot" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={e=>setWebsite(e.target.value)}/>
    {error?<p role="alert" className="crew-feedback-error">{error}</p>:null}
    <div className="crew-feedback-buttons"><button type="button" onClick={onClose}>{t.cancel}</button>
     <button className="crew-feedback-primary" type="submit" disabled={state==="sending"||(kind!=="rating"&&!message.trim())}>{state==="sending"?t.sending:t.send}</button>
    </div>
   </form>}
  </div></div>,document.body);
}
