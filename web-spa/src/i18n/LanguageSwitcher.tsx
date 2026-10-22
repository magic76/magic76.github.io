import {useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {useLocation} from "react-router-dom";
import i18n,{loadUiLocale,type UiLocale,UI_LOCALES} from "./index";
import {UI_LOCALE_CATALOG,localePrefix,normalizeUiLocale} from "./localeCatalog";
import "./languageSwitcher.css";

/**
 * Use an accessible, bounded dialog instead of a native select: Android
 * WebView otherwise expands all locales into an oversized system picker.
 */
export function LanguageSwitcher({variant="header"}:{variant?:"header"|"settings"}){
 const {t}=useTranslation("common");
 const location=useLocation();
 const dialogRef=useRef<HTMLDialogElement>(null);
 const [open,setOpen]=useState(false);
 const [changing,setChanging]=useState(false);
 const [failed,setFailed]=useState(false);
 const current:UiLocale=normalizeUiLocale(i18n.language)||"zh-TW";
 const currentLabel=UI_LOCALE_CATALOG.find(item=>item.code===current)?.label||current;

 function showPicker(){
  const dialog=dialogRef.current;
  if(!dialog)return;
  if(!dialog.open)dialog.showModal();
  setOpen(true);
 }
 function closePicker(){
  dialogRef.current?.close();
  setOpen(false);
 }
 async function chooseLocale(next:UiLocale){
  if(!UI_LOCALES.includes(next)||changing)return;
  if(next===current){closePicker();return;}
  if(window.location.pathname.startsWith("/crew-app/")){
   setChanging(true);setFailed(false);
   try{await loadUiLocale(next);await i18n.changeLanguage(next);closePicker();}
   catch{setFailed(true);}
   finally{setChanging(false);}
  } else{closePicker();
   // Keep the existing route, query and hash while replacing its locale prefix.
   const path=localePrefix(next)+(location.pathname.startsWith("/")?location.pathname:"/"+location.pathname);
   window.location.assign(path+location.search+location.hash);
  }
 }

 return <div className={"crew-language-picker crew-language-picker-"+variant}>
  {variant==="settings"&&<span className="label">{t("language.label")}</span>}
  <button type="button" className="crew-language-trigger"
   aria-label={t("language.label")+": "+currentLabel}
   aria-haspopup="dialog" aria-expanded={open} onClick={showPicker}>
   <span className="crew-language-trigger-name">{currentLabel}</span>
   <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
  </button>
  <dialog ref={dialogRef} className="crew-language-dialog"
   aria-label={t("language.select")} onClose={()=>setOpen(false)}
   onClick={event=>{if(event.target===event.currentTarget)closePicker()}}>
   <div className="crew-language-dialog-panel">
    <div className="crew-language-dialog-head">
     <div><h2>{t("language.select")}</h2><p>{t("language.description")}</p></div>
     <button type="button" className="crew-language-close"
      aria-label={t("language.close")} onClick={closePicker}>×</button>
    </div>
    {changing&&<p className="crew-language-feedback" role="status">{t("language.loading")}</p>}
    {failed&&<p className="crew-language-feedback" role="alert">{t("language.loadError")}</p>}
    <div className="crew-language-options">
     {UI_LOCALE_CATALOG.map(({code,label,stage})=><button
      key={code} type="button" disabled={changing}
      className={"crew-language-option"+(code===current?" is-selected":"")}
      aria-pressed={code===current}
      onClick={()=>chooseLocale(code)}>
      <span className="crew-language-option-copy">
       <span className="crew-language-option-main">
        <span className="crew-language-option-name">{label}</span>
        {stage==="priority"&&<span className="crew-language-stage crew-language-stage-priority">{t("language.beta")}</span>}
       </span>
      </span>
      <span className="crew-language-check" aria-hidden="true">{code===current?"✓":""}</span>
     </button>)}
    </div>
   </div>
  </dialog>
 </div>;
}
