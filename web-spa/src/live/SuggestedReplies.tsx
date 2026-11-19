import {useTranslation} from "react-i18next";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import type {SuggestedReply} from "./suggestReplies";
import "./suggestedReplies.css";
export function SuggestedReplies({replies,enabled,onToggle,disabled,unavailable,language}:{replies:SuggestedReply[];enabled:boolean;onToggle:()=>void;disabled:boolean;unavailable:boolean;language:string}){
 const {t}=useTranslation("voice");
 const lang=TARGET_LANGUAGES.find(item=>item.value===language||item.code===language)?.code||"en";
 return <section className="live-suggest" aria-label={t("suggestReplies.label")}>
  {unavailable?<small role="status">{t("suggestReplies.unavailable")}</small>:<>
   <div className="live-suggest-heading"><button className="live-suggest-toggle" type="button" disabled={disabled} aria-pressed={enabled} onClick={onToggle}>{t("suggestReplies.label")} {t(enabled?"suggestReplies.on":"suggestReplies.off")}</button>{disabled?<small>{t("suggestReplies.nextCall")}</small>:null}</div>
   {enabled&&replies.length>0?<div className="live-suggest-list"><small>{t("suggestReplies.instructions")}</small>
    {replies.map((reply,index)=><p className="live-suggest-item" key={index}><span className="live-suggest-index">{index+1}.</span><span><strong lang={lang}>{reply.text}</strong><small>{reply.translation}</small></span></p>)}
   </div>:null}
  </>}
 </section>;
}
