import {useCallback,useEffect,useRef,useState} from "react";
import {creatureVoiceInstruction,validCreatureContext,validCreatureVoiceTurn,type CreatureVoiceContext} from "./creatureVoiceBridge.mjs";

/** The enclosing lab owns the creature state. This page only reports completed turns. */
export function useCreatureVoiceBridge(enabled:boolean){
 const [creature,setCreature]=useState<CreatureVoiceContext|null>(null);
 const creatureRef=useRef(creature);creatureRef.current=creature;
 const stopVoice=useRef<(()=>Promise<unknown>)|null>(null);
 const control=useRef<((text:string)=>boolean)|null>(null);
 const channel=useRef("");
 const sentTurns=useRef(new Set<string>());

 useEffect(()=>{
  if(!enabled||window.parent===window)return;
  let active=true,stopping=false;
  const receive=(event:MessageEvent)=>{
   if(event.origin!==window.location.origin||event.source!==window.parent)return;
   const context=validCreatureContext(event.data);
   if(context){
    if(channel.current&&channel.current!==context.channelId)return;
    channel.current=context.channelId;
    setCreature(context.creature);
    return;
   }
   if(event.data?.type!=="CREW_CREATURE_VOICE_STOP"||event.data.channelId!==channel.current||!channel.current||stopping)return;
   stopping=true;
   void Promise.resolve().then(()=>stopVoice.current?.()).catch(()=>{}).finally(()=>{
    if(active)window.parent.postMessage({type:"CREW_CREATURE_VOICE_STOPPED",channelId:channel.current},window.location.origin);
   });
  };
  window.addEventListener("message",receive);
  window.parent.postMessage({type:"CREW_CREATURE_VOICE_READY"},window.location.origin);
  return()=>{active=false;window.removeEventListener("message",receive)};
 },[enabled,stopVoice]);

 const reportTurn=useCallback((turn:unknown)=>{
  if(!enabled||!channel.current||window.parent===window)return;
  const completed=validCreatureVoiceTurn(turn);
  if(!completed||sentTurns.current.has(completed.turnId))return;
  sentTurns.current.add(completed.turnId);
  window.parent.postMessage({type:"CREW_CREATURE_VOICE_TURN",channelId:channel.current,...completed},window.location.origin);
 },[enabled]);
 const onRecovered=useCallback(()=>{
  if(creatureRef.current)control.current?.(creatureVoiceInstruction(creatureRef.current));
 },[]);
 const bind=(live:{stop:(defer?:boolean)=>Promise<unknown>;sendControl:(text:string)=>boolean})=>{
  stopVoice.current=()=>live.stop(true);
  control.current=live.sendControl;
 };
 return {creature,reportTurn,onRecovered,bind};
}

export function useCreatureStageSync(enabled:boolean,creature:CreatureVoiceContext|null,sendControl:(text:string)=>boolean){
 const previous=useRef("");
 useEffect(()=>{
  if(!enabled||!creature)return;
  const stage=String(creature.line)+":"+creature.stage;
  const changed=Boolean(previous.current)&&previous.current!==stage;
  previous.current=stage;
  if(changed)sendControl(creatureVoiceInstruction(creature));
 },[enabled,creature,sendControl]);
}
