import {Arrow} from "../components/Arrow";
import {useEffect,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {useClientReady} from "../lib/useClientReady";
import {localizedNativeName} from "../teacher/teacherLocale";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {getLearningLanguageCopy} from "./learningLanguageCopy";
import {isLearningLanguageEntry,markLearningLanguageConfirmed,needsLearningLanguageConfirmation} from "./learningLanguagePreference";
import "./onboarding.css";
import "./learningLanguage.css";

/** One-time Learn entry, separate from the home welcome wizard and live share links. */
export function LearningLanguageGate({pathname}:{pathname:string}){
 const {t,i18n}=useTranslation("friends");
 const copy=getLearningLanguageCopy(i18n.language);
 const ready=useClientReady();
 const dialog=useRef<HTMLDialogElement>(null);
 const [open,setOpen]=useState(false);
 const [draft,setDraft]=useState("英文");
 const target=useTeacherStore(s=>s.targetLanguage);
 const nativeLanguage=useTeacherStore(s=>s.nativeLanguage);
 const setTargetLanguage=useTeacherStore(s=>s.setTargetLanguage);

 useEffect(()=>{
  if(!isLearningLanguageEntry(pathname)){setOpen(false);return;}
  if(!needsLearningLanguageConfirmation(localStorage))return;
  setDraft(useTeacherStore.getState().targetLanguage);
  setOpen(true);
 },[pathname]);

 useEffect(()=>{
  const current=dialog.current;
  if(!current)return;
  if(open&&!current.open)current.showModal();
  if(!open&&current.open)current.close();
 },[open]);

 function finish(applySelection:boolean){
  if(applySelection&&draft!==target)setTargetLanguage(draft);
  markLearningLanguageConfirmed(localStorage);
  dialog.current?.close();
  setOpen(false);
 }

 return <dialog ref={dialog} className="crew-onboarding-dialog crew-learning-language-dialog"
  aria-labelledby="crew-learning-language-title"
  onCancel={event=>{event.preventDefault();finish(false)}}
  onClose={()=>setOpen(false)}>
  <div className="crew-onboarding-panel crew-learning-language-panel">
   <header className="crew-onboarding-header">
    <span className="crew-onboarding-brand"><span className="crew-onboarding-brand-icon">文</span> CREW LEARN</span>
   </header>
   <div className="crew-onboarding-content">
    <section className="crew-onboarding-step crew-learning-language-content">
     <h2 id="crew-learning-language-title">{copy.title}</h2>
     <p className="crew-onboarding-lead">{copy.intro}</p>
     <label className="crew-onboarding-setting">
      <span className="crew-onboarding-field-label">{copy.language}</span>
      <select autoFocus value={draft} onChange={event=>setDraft(event.target.value)}>
       {TARGET_LANGUAGES.map(language=><option key={language.code} value={language.value}>
        {t("languages."+language.value,{defaultValue:language.spoken})}
       </option>)}
      </select>
     </label>
     <p className="crew-learning-language-native">{copy.native}：<strong>{localizedNativeName(ready?nativeLanguage:"zh-TW",i18n.language)}</strong></p>
     <p className="crew-onboarding-note">{copy.friendNote}</p>
     <p className="crew-learning-language-later">{copy.changeLater}</p>
    </section>
   </div>
   <footer className="crew-onboarding-footer">
    <button type="button" className="crew-onboarding-primary" onClick={()=>finish(true)}>{copy.start}<Arrow/></button>
    <button type="button" className="crew-onboarding-skip" onClick={()=>finish(false)}>{copy.skip}</button>
   </footer>
  </div>
 </dialog>;
}
