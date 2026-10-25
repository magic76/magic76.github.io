import {useEffect,useState} from "react";
import type {TeachingMode} from "../store/teacherStore";
import {containsHan,isMandarinTarget,shouldShowPinyin,toPinyin,type PinyinAidMode} from "./pinyinAid";
import "./pinyinAid.css";

type Props={text:string;targetLanguage:string;mode:PinyinAidMode;teachingMode:TeachingMode;english?:boolean};

/** Visual-only learner aid, not part of TTS or Gemini's spoken transcript. */
export function PinyinHint({text,targetLanguage,mode,teachingMode,english=false}:Props){
 const [revealed,setRevealed]=useState(false);
 const [reading,setReading]=useState<{source:string;value:string}|null>(null);
 const eligible=isMandarinTarget(targetLanguage)&&mode!=="off"&&containsHan(text);
 const visible=eligible&&(shouldShowPinyin(mode,teachingMode)||(mode==="tap"&&revealed));
 useEffect(()=>{setRevealed(false)},[text]);
 useEffect(()=>{
  if(!visible)return;
  let cancelled=false;
  // Live streams many partial tokens; avoid regenerating for every token.
  const id=window.setTimeout(()=>{
   void toPinyin(text).then(value=>{
    if(!cancelled)setReading({source:text,value});
   }).catch(()=>{if(!cancelled)setReading({source:text,value:""})});
  },240);
  return()=>{cancelled=true;window.clearTimeout(id)};
 },[text,visible]);
 if(!eligible)return null;
 return <span className="crew-pinyin-aid">
  {mode==="tap"&&<button type="button" className="crew-pinyin-reveal" aria-expanded={revealed} onClick={()=>setRevealed(v=>!v)}>{english?(revealed?"Hide pinyin":"Show pinyin"):(revealed?"收起拼音":"顯示拼音")}</button>}
  {visible&&reading?.source===text&&reading.value&&<small className="crew-pinyin-reading" lang="zh-Latn-pinyin" aria-label={english?"Pinyin":"拼音"}>{reading.value}</small>}
 </span>;
}
