import {useTranslation} from "react-i18next";

/** A starter uses the same verified send path as the composer submit button. */
export function TextChatStarters({onPick}:{onPick:(sentence:string)=>void}){
 const {t}=useTranslation("friends");
 return <div className="crew-text-starters" aria-label={t("textStarters.heading")}>
  <span className="crew-text-starters-heading">{t("textStarters.heading")}</span>
  <div className="crew-text-starters-options">
   {(["cafe","intro","smalltalk"] as const).map(key=><button key={key} type="button"
    className="crew-text-starter" onClick={()=>onPick(t("textStarters."+key))}>{t("textStarters."+key)}</button>)}
  </div>
 </div>;
}
