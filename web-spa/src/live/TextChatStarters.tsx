import {useTranslation} from "react-i18next";

/** A starter uses the same verified send path as the composer submit button. */
export function TextChatStarters({onPick,speaker,firstStarter}:{onPick:(sentence:string)=>void;speaker:string;firstStarter?:string}){
 const {t}=useTranslation("friends");
 return <div className="crew-text-starters" aria-label={t("textStarters.heading")}>
  <span className="crew-text-starters-heading">{t("textStarters.heading")}</span>
  <div className="crew-text-starters-options">
   {firstStarter&&<button type="button" className="crew-text-starter" onClick={()=>onPick(firstStarter)}>{firstStarter}</button>}
   {(["cafe","intro","smalltalk"] as const).map(key=><button key={key} type="button"
    className="crew-text-starter" onClick={()=>onPick(t("textStarters."+key,{name:speaker}))}>{t("textStarters."+key,{name:speaker})}</button>)}
  </div>
 </div>;
}
