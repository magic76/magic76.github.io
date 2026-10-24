import {useState} from "react";
import {LIVE_VOICES,normalizeLiveVoice} from "../live/voiceIdentity";
import "./gameVoice.css";

/** Crew Play voice is separate from the NPC's identity and shared across games. */
const KEY="crew_play_live_voice_v1";
export type GameVoiceChoice="auto"|string;
export function resolveGameVoice(choice:GameVoiceChoice,defaultVoice:string){
 return choice==="auto"?normalizeLiveVoice(defaultVoice):normalizeLiveVoice(choice);
}
export function useGameVoice(){
 const [voice,setVoice]=useState<GameVoiceChoice>(()=>{
  if(typeof window==="undefined")return "auto";
  try{
   const saved=window.localStorage.getItem(KEY);
   return saved&&LIVE_VOICES.some(v=>v===saved)?saved:"auto";
  }catch{return "auto";}
 });
 const choose=(next:GameVoiceChoice)=>{
  const safe=next==="auto"||LIVE_VOICES.some(v=>v===next)?next:"auto";
  setVoice(safe);
  try{if(typeof window!=="undefined")window.localStorage.setItem(KEY,safe)}catch{/* Private mode */}
 };
 return {gameVoice:voice,setGameVoice:choose};
}
export function GameVoicePicker({value,onChange,disabled=false,english=false,defaultVoice="Puck"}:{
 value:GameVoiceChoice;onChange:(voice:GameVoiceChoice)=>void;disabled?:boolean;english?:boolean;defaultVoice?:string;
}){
 return <label className="crew-game-voice-picker">
  <span>{english?"Gemini Live voice":"Gemini Live 音色"}</span>
  <select aria-label={english?"Choose game voice":"選擇遊戲語音音色"} value={value} disabled={disabled} onChange={event=>onChange(event.target.value)}>
   <option value="auto">{english?"Default":"跟隨角色／預設"} · {normalizeLiveVoice(defaultVoice)}</option>
   {LIVE_VOICES.map(v=><option value={v} key={v}>{v}</option>)}
  </select>
  <small>{disabled?(english?"Reconnect to change voice.":"變更音色請先結束語音連線。"):(english?"Saved for all Crew Play games.":"所有 Crew Play 遊戲共用此音色偏好。")}</small>
 </label>;
}
