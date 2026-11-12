import {useTranslation} from "react-i18next";
import "./quoteTextStarter.css";

/** A starter uses the same verified send path as the composer submit button. */
export function TextChatStarters({onPick,speaker,firstStarter,firstOnly=false}:{onPick:(sentence:string)=>void;speaker:string;firstStarter?:string;firstOnly?:boolean}){
 const {t}=useTranslation("friends");
 return <div className={"crew-text-starters"+(firstOnly?" crew-quote-resume-starters":"")} aria-label={t("textStarters.heading")}>
  <span className="crew-text-starters-heading">{t("textStarters.heading")}</span>
  <div className="crew-text-starters-options">
   {firstStarter&&<button type="button" className="crew-text-starter" onClick={()=>onPick(firstStarter)}>{firstStarter}</button>}
   {!firstOnly&&(["cafe","intro","smalltalk"] as const).map(key=><button key={key} type="button"
    className="crew-text-starter" onClick={()=>onPick(t("textStarters."+key,{name:speaker}))}>{t("textStarters."+key,{name:speaker})}</button>)}
  </div>
 </div>;
}
