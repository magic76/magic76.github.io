import {useEffect,useState} from "react";
import {browserSpeechConstructor,startBrowserSpeech} from "./browserSpeechRecognition";
export function useBrowserSpeechCaptions({eligible,language,turnCount,clear}:{eligible:boolean;language?:string;turnCount:number;clear:boolean}){
 const [enabled,setEnabled]=useState(false),[text,setText]=useState(""),[failed,setFailed]=useState(false);
 const [visible,setVisible]=useState(()=>typeof document!=="undefined"&&document.visibilityState==="visible");
 const supported=Boolean(browserSpeechConstructor());
 useEffect(()=>{
  const changed=()=>setVisible(document.visibilityState==="visible");
  const hide=()=>setVisible(false);
  document.addEventListener("visibilitychange",changed);window.addEventListener("pagehide",hide);
  return()=>{document.removeEventListener("visibilitychange",changed);window.removeEventListener("pagehide",hide)};
 },[]);
 useEffect(()=>{setText("")},[language,turnCount,clear,visible,enabled]);
 useEffect(()=>{
  if(!enabled||!eligible||!visible||!language)return;
  const C=browserSpeechConstructor();if(!C)return;
  let active=true;
  const stop=startBrowserSpeech(C,language,value=>{if(active)setText(value)},()=>{if(active){setFailed(true);setEnabled(false);setText("")}});
  return()=>{active=false;stop()};
 },[enabled,eligible,visible,language,turnCount]);
 const toggle=()=>{setFailed(false);setText("");setEnabled(v=>!v)};
 return {supported,enabled,failed,text:enabled&&!clear&&visible?text:"",toggle};
}
