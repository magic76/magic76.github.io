import {useId,useState} from "react";
import {useTranslation} from "react-i18next";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import type {SuggestedReply} from "./suggestReplies";
import "./suggestedReplies.css";
export function SuggestedReplies({replies,enabled,onToggle,disabled,unavailable,language}:{replies:SuggestedReply[];enabled:boolean;onToggle:()=>void;disabled:boolean;unavailable:boolean;language:string}){
 const {t,i18n}=useTranslation("voice");
 const [expanded,setExpanded]=useState(false);
 const listId=useId();
 const lang=TARGET_LANGUAGES.find(item=>item.value===language||item.code===language)?.code||"en";
 const hasReplies=enabled&&replies.length>0;
 const countLabel=i18n.language.startsWith("zh")?`${replies.length} 條建議`:`${replies.length} suggestions`;
 return <section className="live-suggest" aria-label={t("suggestReplies.label")}>
  {unavailable?<small role="status">{t("suggestReplies.unavailable")}</small>:<>
   <div className="live-suggest-heading">
    <button className="live-suggest-toggle" type="button" disabled={disabled} aria-pressed={enabled} onClick={onToggle}>{t("suggestReplies.label")} {t(enabled?"suggestReplies.on":"suggestReplies.off")}</button>
    {disabled?<small>{t("suggestReplies.nextCall")}</small>:null}
    {hasReplies?<button className="live-suggest-expand" type="button" aria-expanded={expanded} aria-controls={listId} onClick={()=>setExpanded(value=>!value)}>
     <span>{countLabel}</span><span className="live-suggest-chevron" aria-hidden="true">⌄</span>
    </button>:null}
   </div>
   {hasReplies&&expanded?<div className="live-suggest-list" id={listId}><small>{t("suggestReplies.instructions")}</small>
    {replies.map((reply,index)=><p className="live-suggest-item" key={index}><span className="live-suggest-index">{index+1}.</span><span><strong lang={lang}>{reply.text}</strong><small>{reply.translation}</small></span></p>)}
   </div>:null}
  </>}
 </section>;
}
