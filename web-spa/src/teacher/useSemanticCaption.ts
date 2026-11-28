import {useEffect,useRef,useState} from "react";
import {captionView,nextCaptionChunk,plainCaption,requestSemanticCaption,SEMANTIC_INTERVAL_MS,SEMANTIC_MAX_CALLS,SEMANTIC_TURN_CALLS,type CaptionSegment,type SemanticBlock} from "./semanticCaptionLayout";
type Turn={output?:string};
type Key=number|"stream";
export type SemanticCaptionState={revision:number;segments:(key:Key)=>ReadonlyArray<CaptionSegment>};
export function captionAt(turns:ReadonlyArray<Turn>,output:string,index:number){
 if(index<turns.length)return {raw:turns[index]?.output?.trim()||"",final:true};
 const raw=output.trim(),last=[...turns].reverse().find(t=>t.output?.trim())?.output?.trim()||"";
 return {raw:index===turns.length&&raw!==last?raw:"",final:false};
}
export function useSemanticCaption(enabled:boolean,turns:ReadonlyArray<Turn>,output:string):SemanticCaptionState{
 const latest=useRef({turns,output});latest.current={turns,output};
 const committed=useRef(new Map<number,CaptionSegment[]>());
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!enabled)return;
  committed.current=new Map();setRevision(v=>v+1);
  let disposed=false,active:AbortController|null=null,lastCall=0,total=0;
  const attempts=new Map<number,number>(),initialCount=latest.current.turns.length;
  let suspended:{index:number;raw:string}|null=null;
  function interrupt(){
   suspended={index:latest.current.turns.length,raw:latest.current.output.trim()};active?.abort();
  }
  async function tick(){
   if(disposed||active||total>=SEMANTIC_MAX_CALLS||Date.now()-lastCall<SEMANTIC_INTERVAL_MS)return;
   const {turns,output}=latest.current;
   for(const index of [turns.length-1,turns.length]){
    if(index<initialCount||index<0)continue;
    const {raw,final}=captionAt(turns,output,index);
    if(!raw||suspended?.index===index&&(!final&&raw===suspended.raw))continue;
    const prior=committed.current.get(index)||[],view=captionView(raw,prior),count=attempts.get(index)||0;
    if(count>=(final?SEMANTIC_TURN_CALLS:SEMANTIC_TURN_CALLS-1))continue;
    const chunk=nextCaptionChunk(raw,view.consumed,final);
    if(!chunk)continue;
    const controller=new AbortController();active=controller;lastCall=Date.now();total++;attempts.set(index,count+1);
    let blocks:SemanticBlock[];
    try{blocks=await requestSemanticCaption(chunk,controller.signal)}
    catch{blocks=plainCaption(chunk)}
    finally{if(active===controller)active=null}
    if(disposed||controller.signal.aborted)return;
    const now=captionAt(latest.current.turns,latest.current.output,index).raw;
    if(!now.startsWith(view.consumed+chunk))return;
    let prefix="",valid:CaptionSegment[]=[];
    for(const entry of prior){if(!view.consumed.startsWith(prefix+entry.source))break;valid.push(entry);prefix+=entry.source}
    committed.current.set(index,[...valid,{source:chunk,blocks}]);setRevision(v=>v+1);
    return;
   }
  }
  const timer=window.setInterval(()=>{void tick()},500);
  window.addEventListener("crew-friend-call-interrupt",interrupt);
  return()=>{disposed=true;active?.abort();window.clearInterval(timer);window.removeEventListener("crew-friend-call-interrupt",interrupt)};
 },[enabled]);
 return {revision,segments:key=>committed.current.get(key==="stream"?turns.length:key)||[]};
}
