import {useState} from "react";
const KEY="crew_friend_call_translation_v1";
export function useCallTranslationPreference(){
 const [enabled,setEnabled]=useState(()=>{try{return localStorage.getItem(KEY)!=="off"}catch{return true}});
 const toggle=()=>setEnabled(value=>{try{localStorage.setItem(KEY,value?"off":"on")}catch{}return !value});
 return {enabled,toggle};
}
