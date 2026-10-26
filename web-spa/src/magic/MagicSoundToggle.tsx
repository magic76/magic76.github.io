import {useEffect,useState} from "react";
import {activateMagicAudio} from "./magicSound";
export function MagicSoundToggle({onChange,labelOn,labelOff}:{onChange:(enabled:boolean)=>void;labelOn:string;labelOff:string}){
 const [enabled,setEnabled]=useState(()=>{try{return localStorage.getItem("crew.magic.sound")==="on"}catch{return false}});
 useEffect(()=>onChange(enabled),[enabled,onChange]);
 return <button type="button" className="magic-sound-toggle" aria-pressed={enabled} onClick={()=>{
  activateMagicAudio();const next=!enabled;setEnabled(next);
  try{localStorage.setItem("crew.magic.sound",next?"on":"off")}catch{/* private mode */}
 }}>{enabled?labelOn:labelOff}</button>;
}
