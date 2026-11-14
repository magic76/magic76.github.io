import {useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {modeFromFriendSystem} from "./friendReplyFallback";
import {looksLikePractice,makeLearningCheck,summarizeLearning} from "./textChatLearning";
import type {LearningNote,LearningMessage} from "./textChatLearning";

/** Memory belongs to this mounted text chat only: no extra storage of personal sentences. */
export function useFriendTextLearning(system:string,scope:string){
 const {t,i18n}=useTranslation("voice");
 const target=useTeacherStore(state=>state.targetLanguage);
 const storedMode=useTeacherStore(state=>state.friendChatMode);
 const mode=modeFromFriendSystem(system,storedMode);
 const code=TARGET_LANGUAGES.find(item=>item.value===target||item.code===target)?.code||"en";
 const [notes,setNotes]=useState<LearningNote[]>([]);
 const [checked,setChecked]=useState<number[]>([]);
 const [checkTexts,setCheckTexts]=useState<string[]>([]);
 const [dismissed,setDismissed]=useState(false);
 useEffect(()=>{setNotes([]);setChecked([]);setCheckTexts([]);setDismissed(false)},[scope]);
 const eligible=(value:string)=>scope.startsWith("friend:")&&looksLikePractice(value,code,i18n.language);
 function record(index:number,reply:string,tip:string|null,phrase:string|null,previousUser:string){
  if(!eligible(previousUser))return;
  if(!tip&&!phrase)return;
  setNotes(before=>[...before.filter(item=>item.index!==index),{index,reply,original:previousUser,tip,phrase}].slice(-15));
 }
 function check(index:number,sentence:string,onSend:(message:string)=>void){
  if(checked.includes(index)||checkTexts.includes(sentence)||!eligible(sentence))return;
  const value=makeLearningCheck(sentence,code,mode,t("textChat.learning.checkQuestion"));
  setChecked(before=>[...before,index].slice(-40));
  setCheckTexts(before=>[...before,value].slice(-40));
  onSend(value);
 }
 return {notes,dismissed,dismiss:()=>setDismissed(true),record,
  canCheck:(index:number,text:string)=>eligible(text)&&!checked.includes(index)&&!checkTexts.includes(text),
  check,summary:(messages:LearningMessage[])=>summarizeLearning(messages,notes)};
}

export function FriendLearningCheck({onClick,disabled}:{onClick:()=>void;disabled:boolean}){
 const {t}=useTranslation("voice");
 return <button type="button" className="crew-text-learning-check" disabled={disabled} onClick={onClick}>{t("textChat.learning.checkButton")}</button>;
}
export function FriendLearningTip({text}:{text:string}){
 const {t}=useTranslation("voice");
 return <div className="crew-text-learning-tip"><span>{t("textChat.learning.better")}</span> {text}</div>;
}
export function FriendLearningSummary({phrases,onDismiss}:{phrases:string[];onDismiss:()=>void}){
 const {t}=useTranslation("voice");
 if(!phrases.length)return null;
 return <section className="crew-text-learning-summary" aria-label={t("textChat.learning.summaryTitle")}>
  <div className="crew-text-learning-header"><strong>{t("textChat.learning.summaryTitle")}</strong>
   <button type="button" aria-label={t("textChat.learning.dismiss")} onClick={onDismiss}>×</button></div>
  <ul>{phrases.slice(0,3).map((phrase,index)=><li key={index}>{phrase.includes(" → ")&&<span className="crew-text-learning-better">{t("textChat.learning.better")} </span>}{phrase}</li>)}</ul>
 </section>;
}
