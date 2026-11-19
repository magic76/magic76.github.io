import {useCallback,useEffect,useRef,useState} from "react";
import {SUGGEST_REPLIES_NAME,SUGGEST_REPLIES_TOOL,SUGGEST_REPLIES_PROMPT,parseSuggestedReplies} from "./suggestReplies";
import type {SuggestedReply} from "./suggestReplies";
const KEY="koolo_reply_hints";
export const replyHintsLocked=(state:string)=>["connecting","listening","speaking"].includes(state);
export function useSuggestedReplies({allowed=true,language}:{allowed?:boolean;language:string}){
 const [enabled,setEnabled]=useState(()=>{try{return localStorage.getItem(KEY)!=="off"}catch{return true}});
 const [replies,setReplies]=useState<SuggestedReply[]>([]);
 const [unavailable,setUnavailable]=useState(false);
 const enabledRef=useRef(enabled&&allowed);
 enabledRef.current=enabled&&allowed&&!unavailable;
 const clear=useCallback(()=>setReplies([]),[]);
 useEffect(()=>{clear()},[language,clear]);
 const toggle=useCallback(()=>{setEnabled(value=>{const next=!value;try{localStorage.setItem(KEY,next?"on":"off")}catch{}if(!next)clear();return next})},[clear]);
 const onToolCall=useCallback((call:{name:string;args?:unknown})=>{
  if(call.name!==SUGGEST_REPLIES_NAME)return {ok:false,error:"unknown-tool"};
  if(!enabledRef.current)return {ok:false,error:"disabled"};
  const next=parseSuggestedReplies(call.args);
  if(next.length)setReplies(next);
  return {ok:next.length>=2};
 },[]);
 const onToolsUnavailable=useCallback(()=>{setUnavailable(true);clear()},[clear]);
 const active=enabled&&allowed&&!unavailable;
 return {enabled:active,replies,unavailable,clear,toggle,onToolCall,onToolsUnavailable,
  tools:active?[{functionDeclarations:[SUGGEST_REPLIES_TOOL]}]:undefined,
  prompt:active?SUGGEST_REPLIES_PROMPT:""};
}
