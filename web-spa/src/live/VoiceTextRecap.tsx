import {useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import {readSessionTranscript} from "./sessionTranscript";
import {shortsOpeningHint,shortsQuestionOpeningHint} from "../teacher/shortsSocial";
import {pickVoiceTextRecap,composeFriendVoiceOpening} from "./voiceTextRecap.mjs";
export {voiceTextContext} from "./voiceTextRecap.mjs";
import "./VoiceTextRecap.css";

type RecapMessage={role:"user"|"assistant";text:string};
type Loaded={key:string;messages:RecapMessage[]};
/** Load after the text panel unmount has synchronously flushed its latest confirmed turns. */
export function useVoiceTextRecap(enabled:boolean,scope:string,friendId:string){
 const [loaded,setLoaded]=useState<Loaded|null>(null);
 useEffect(()=>{
  if(!enabled){setLoaded(null);return}
  const messages=pickVoiceTextRecap(scope,friendId,readSessionTranscript(scope));
  setLoaded({key:scope+"::"+friendId,messages});
 },[enabled,scope,friendId]);
 const current=enabled&&loaded?.key===scope+"::"+friendId;
 return {ready:!enabled||current,messages:current?loaded!.messages:[] as RecapMessage[]};
}
export function buildFriendVoiceOpening({name,languageDirective,shortsPost,shortsHook,selectedQuestion,lifeOpening,conversationHint,conversationStyle,creatureContext,messages}:{
 name:string;languageDirective:string;shortsPost:boolean;
 shortsHook:Parameters<typeof shortsOpeningHint>[0];selectedQuestion:string;
 lifeOpening:string;conversationHint:string;conversationStyle:string;
 creatureContext:string;messages:ReadonlyArray<RecapMessage>;
}){
 return composeFriendVoiceOpening({name,languageDirective,shorts:shortsPost,
  shortsHint:shortsPost?shortsOpeningHint(shortsHook):"",
  questionHint:shortsPost?shortsQuestionOpeningHint(selectedQuestion):"",
  lifeOpening,conversationHint:shortsPost?"":conversationHint,conversationStyle,
  creatureContext,hasRecap:messages.length>0});
}
export function VoiceTextRecap({messages,name}:{messages:ReadonlyArray<RecapMessage>;name:string}){
 const {t}=useTranslation("friends");
 if(!messages.length)return null;
 return <details className="voice-text-recap" open>
  <summary>{t("voiceTextRecap.title")}</summary>
  <ol className="voice-text-recap-list">{messages.map((message,index)=><li key={index}>
   <strong>{message.role==="user"?t("voiceTextRecap.you"):name}</strong>
   <span>{message.text}</span>
  </li>)}</ol>
 </details>;
}
