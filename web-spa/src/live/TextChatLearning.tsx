import {useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {modeFromFriendSystem} from "./friendReplyFallback";
import {looksLikePractice,makeLearningCheck,summarizeLearning} from "./textChatLearning";
import type {LearningNote,LearningMessage} from "./textChatLearning";
import {addDeckItem} from "../teacher/learningDeck";
import {normalizeLearningLanguage,speakLearningText} from "../teacher/learningSpeech";

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
function saveLearningPhrase(value:string,target:string){
 const [original,better]=value.includes(" → ")?value.split(" → ",2):["",value];
 addDeckItem({category:original?"correction":"phrase",originalText:(better||value).trim().slice(0,260),translation:"",notes:original?"原句："+original.trim().slice(0,180):"Zoe 對話收藏",language:normalizeLearningLanguage(target)});
}
export function FriendLearningActions({text}:{text:string}){
 const target=useTeacherStore(state=>state.targetLanguage),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false);
 const value=text.trim(),canSave=value.length>0&&value.length<=260;
 if(!value)return null;
 return <div className="crew-text-learning-actions">
  <button type="button" disabled={busy} onClick={()=>{setBusy(true);void speakLearningText(value,target,{mode:value.split(/\s+/).length<=5?"phrase":"sentence"}).finally(()=>setBusy(false))}}>🔊 聽</button>
  {canSave&&<button type="button" disabled={saved} onClick={()=>{saveLearningPhrase(value,target);setSaved(true)}}>{saved?"✓ 已收藏":"☆ 收藏成片語"}</button>}
 </div>;
}
export function FriendLearningSummary({phrases,onDismiss}:{phrases:string[];onDismiss:()=>void}){
 const {t}=useTranslation("voice"),target=useTeacherStore(state=>state.targetLanguage);
 const[saved,setSaved]=useState<string[]>([]);
 if(!phrases.length)return null;
 return <section className="crew-text-learning-summary" aria-label={t("textChat.learning.summaryTitle")}>
  <div className="crew-text-learning-header"><strong>{t("textChat.learning.summaryTitle")}</strong>
   <button type="button" aria-label={t("textChat.learning.dismiss")} onClick={onDismiss}>×</button></div>
  <ul>{phrases.slice(0,3).map((phrase,index)=><li key={index}><span>{phrase.includes(" → ")&&<span className="crew-text-learning-better">{t("textChat.learning.better")} </span>}{phrase}</span><button type="button" disabled={saved.includes(phrase)} onClick={()=>{saveLearningPhrase(phrase,target);setSaved(list=>[...list,phrase])}}>{saved.includes(phrase)?"✓":"＋ 收藏"}</button></li>)}</ul>
 </section>;
}
