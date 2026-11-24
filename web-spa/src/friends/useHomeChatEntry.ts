import {useEffect,useRef,useState} from "react";
import {useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {consumeHomeChat,peekHomeChat} from "../pages/homeChatHandoff";
import {getHomeChatTopic} from "./friendMemory";

export function useHomeChatEntry(friendId:string,language:string,eligible:boolean){
 const location=useLocation();
 const {t}=useTranslation("home");
 const [initial]=useState(()=>eligible?peekHomeChat(location.state,friendId):null);
 const entry=eligible&&initial?.friendId===friendId?initial:null;
 useEffect(()=>{if(initial)consumeHomeChat(initial.token)},[initial]);
 const reported=useRef(new Set<string>());
 function report(stage:"verify"|"reply"|"second"){
  if(!entry||reported.current.has(stage))return;
  reported.current.add(stage);
  trackUsageEvent("home_friend_chat",`${entry.choice}_${stage}`);
 }
 function resolve(){
  if(!entry)return "";
  if(entry.choice==="resume"){
   const topic=entry.language===language&&entry.topicId
    ?getHomeChatTopic(friendId,language,entry.topicId):undefined;
   return topic?t("chatChoices.about",{topic:topic.title}):t("chatChoices.fresh");
  }
  return t("chatChoices."+entry.choice);
 }
 return {
  active:!!entry,
  resolve,
  verified:()=>report("verify"),
  replied:()=>report("reply"),
  input:()=>{if(reported.current.has("reply"))report("second")}
 };
}
