import {useCallback,useEffect,useRef,useState} from "react";
import type {LiveTurn} from "../lib/runtime";
import {suggestWithProvider} from "./secondLiveProvider";
import {appendReplyGroup} from "./replyHintHistory";
import type {SuggestedReply} from "./suggestReplies";
const KEY="koolo_reply_hints";
export const replyHintsLocked=(state:string)=>["connecting","listening","speaking"].includes(state);
export function useSuggestedReplies({allowed=true,language,nativeLanguage="zh-TW"}:{allowed?:boolean;language:string;nativeLanguage?:string}){
 const [enabled,setEnabled]=useState(()=>{try{return localStorage.getItem(KEY)!=="off"}catch{return true}});
 const [groups,setGroups]=useState<SuggestedReply[][]>([]);
 const [unavailable]=useState(false);
 const version=useRef(0);
 const activeRef=useRef(enabled&&allowed);
 activeRef.current=enabled&&allowed;
 const clear=useCallback(()=>{version.current++;setGroups([])},[]);
 useEffect(()=>{clear()},[language,nativeLanguage,clear]);
 const toggle=useCallback(()=>{setEnabled(value=>{const next=!value;try{localStorage.setItem(KEY,next?"on":"off")}catch{}if(!next)clear();return next})},[clear]);
 const onInputSpeech=useCallback(()=>{},[]);
 const generate=useCallback((turns:LiveTurn[])=>{
  if(!activeRef.current)return;
  const current=version.current;
  void suggestWithProvider(turns,language,nativeLanguage).then(next=>{
   if(version.current===current&&activeRef.current&&next.length>0)setGroups(previous=>appendReplyGroup(previous,next));
  }).catch(()=>{});
 },[language,nativeLanguage]);
 return {enabled:enabled&&allowed,groups,unavailable,clear,onInputSpeech,toggle,generate};
}
