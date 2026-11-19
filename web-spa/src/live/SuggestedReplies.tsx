import {useEffect,useRef} from "react";
import {useTranslation} from "react-i18next";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import type {SuggestedReply} from "./suggestReplies";
import "./suggestedReplies.css";

export function SuggestedReplies({groups,enabled,language}:{groups:SuggestedReply[][];enabled:boolean;language:string}){
 const {t}=useTranslation("voice");
 const scrollRef=useRef<HTMLDivElement>(null);
 const lang=TARGET_LANGUAGES.find(item=>item.value===language||item.code===language)?.code||"en";
 useEffect(()=>{
  if(!enabled||groups.length===0)return;
  const element=scrollRef.current;
  if(element)element.scrollTo({top:element.scrollHeight,behavior:"smooth"});
 },[groups,enabled]);
 if(!enabled||groups.length===0)return null;
 return <section className="live-suggest" aria-label={t("suggestReplies.label")}>
  <div className="live-suggest-history" ref={scrollRef}>
   {groups.map((group,groupIndex)=><div className="live-suggest-group" key={groupIndex}>
    {group.map((reply,index)=><p className="live-suggest-item" key={index}><span className="live-suggest-index">{index+1}.</span><span><strong lang={lang}>{reply.text}</strong><small>{reply.translation}</small></span></p>)}
   </div>)}
  </div>
 </section>;
}
