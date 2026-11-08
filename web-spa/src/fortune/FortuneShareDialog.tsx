import {useEffect,useMemo,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import type {FortuneReading} from "./types";
import {buildFortuneCardModel} from "./fortuneCardModel";
import {renderCollectibleCard,collectiblePngFile,nativeCollectibleShare} from "./fortuneCardCanvas";
import {fortuneCopy,fortuneInvitation} from "./fortuneJourneyI18n";
import {fortuneInviteUrl} from "./fortuneInvite";

/** One deliberate share surface. No automatic reveal and no surprise desktop download. */
export function FortuneShareDialog({reading,oneLine,open,onClose}:{
 reading:FortuneReading;oneLine:string;open:boolean;onClose:()=>void
}){
 const {i18n}=useTranslation("fortune"),locale=i18n.resolvedLanguage||i18n.language;
 const labels=fortuneCopy(locale);
 const model=useMemo(()=>buildFortuneCardModel(reading.mode,reading.result,locale,oneLine),
  [reading.mode,reading.result,locale,oneLine]);
 const url=fortuneInviteUrl(reading.mode,model.id,locale),invitation=fortuneInvitation(locale,model.title,url);
 const dialog=useRef<HTMLDialogElement>(null),art=useRef<HTMLImageElement|null>(null);
 const[preview,setPreview]=useState(""),[status,setStatus]=useState(""),[manual,setManual]=useState(false),[busy,setBusy]=useState(false);
 function generate(){
  const canvas=renderCollectibleCard(model,art.current,new Date(),locale);
  return {canvas,file:collectiblePngFile(canvas)};
 }
 useEffect(()=>{
  if(!open)return;
  const element=dialog.current;if(!element)return;
  const previouslyFocused=document.activeElement;
  const previousOverflow=document.body.style.overflow;
  if(!element.open)element.showModal();
  document.body.style.overflow="hidden";
  element.querySelector<HTMLButtonElement>(".fortune-share-close")?.focus();
  return ()=>{
   if(element.open)element.close();
   document.body.style.overflow=previousOverflow;
   if(previouslyFocused instanceof HTMLElement&&previouslyFocused.isConnected)previouslyFocused.focus();
  };
 },[open]);
 useEffect(()=>{
  if(!open)return;
  let active=true;setStatus("");setManual(false);art.current=null;
  const update=()=>{if(active)try{setPreview(generate().canvas.toDataURL("image/png"))}catch{setPreview("")}};
  update();
  if(!model.artSrc)return()=>{active=false};
  const image=new Image();
  image.onload=()=>{if(active&&image.naturalWidth>0){art.current=image;update()}};
  image.onerror=()=>{if(active){art.current=null;update()}};
  image.src=model.artSrc;
  if(image.complete&&image.naturalWidth>0){art.current=image;update()}
  return()=>{active=false;image.onload=null;image.onerror=null};
 },[open,model.id,model.artSrc,model.title,model.tagline,locale]);
 async function copy(text:string){
  setStatus("");setManual(false);
  try{
   if(!navigator.clipboard?.writeText)throw Error("clipboard unavailable");
   await navigator.clipboard.writeText(text);
   trackUsageEvent("fortune_identity_copy_link",reading.mode);
   setStatus(labels.copied);
  }catch{setManual(true);setStatus(labels.clipboardError)}
 }
 async function nativeShare(){
  if(busy)return;setBusy(true);setStatus("");
  try{
   const {file}=generate();
   const result=await nativeCollectibleShare(file,invitation,url);
   if(result==="shared"){
    // Share-sheet resolution reports a handoff, not receipt or a new visitor.
    trackUsageEvent("fortune_identity_shared",reading.mode);
    setStatus(labels.shared);
   }else if(result==="unsupported")setStatus(labels.failed);
   // AbortError is intentional cancellation; remain in the preview without a message.
  }catch{setStatus(labels.failed)}
  finally{setBusy(false)}
 }
 function download(){
  setStatus("");
  try{
   const {file}=generate(),href=URL.createObjectURL(file);
   const a=document.createElement("a");a.href=href;a.download=file.name;
   document.body.appendChild(a);a.click();a.remove();
   window.setTimeout(()=>URL.revokeObjectURL(href),1000);
   setStatus(labels.downloaded);
  }catch{setStatus(labels.failed)}
 }
 const handleBackdrop=(event:React.MouseEvent<HTMLDialogElement>)=>{
  if(event.target!==event.currentTarget)return;
  const rect=event.currentTarget.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose();
 };
 return <dialog ref={dialog} className="fortune-share-dialog" aria-label={labels.share}
  onCancel={event=>{event.preventDefault();onClose()}} onClose={onClose} onClick={handleBackdrop}>
  <div className="fortune-share-dialog-header">
   <strong>{labels.share}</strong>
   <button className="fortune-share-close" type="button" onClick={onClose} aria-label={labels.close}>×</button>
  </div>
  <div className="fortune-share-dialog-body">
   <div className="fortune-share-preview">
    {preview?<img src={preview} alt={labels.preview+" · "+model.title} width={1080} height={1350}/>:
     <div role="status">{labels.preview}</div>}
   </div>
   <p className="fortune-share-prompt">{model.title} · {labels.question}</p>
   <a href={url} target="_blank" rel="noopener noreferrer" className="fortune-share-public-link">{url}</a>
   <div className="fortune-share-controls">
    <button type="button" className="btn" disabled={busy} onClick={()=>void nativeShare()}>{labels.native}</button>
    <button type="button" className="btn secondary" disabled={busy} onClick={()=>void copy(invitation)}>{labels.copyInvite}</button>
    <button type="button" className="btn secondary" disabled={busy} onClick={()=>void copy(url)}>{labels.copyLink}</button>
    <button type="button" className="btn secondary" disabled={busy} onClick={download}>{labels.download}</button>
   </div>
   {status&&<p className="fortune-share-status" role="status">{status}</p>}
   {manual&&<label className="fortune-share-manual">{labels.manual}<textarea readOnly rows={4} value={invitation} onFocus={e=>e.target.select()}/></label>}
  </div>
 </dialog>;
}
