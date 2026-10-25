import {useEffect,useId,useRef,useState} from "react";
import "./gameSpeechBubble.css";

/**
 * Shared Crew Play transcript: keep the controls compact and let players inspect
 * longer AI speech without changing or restarting the current Live session.
 */
export function GameSpeechBubble({text,english=false,className=""}:{
 text:string;english?:boolean;className?:string;
}){
 const [expanded,setExpanded]=useState(false);
 const panelId=useId();
 const scrollRef=useRef<HTMLDivElement>(null);
 const followLatestRef=useRef(true);
 // Follow streaming speech only while the reader remains at the latest lines.
 // Scrolling upward to re-read an older line must not jump the transcript.
 useEffect(()=>{
  if(!expanded||!followLatestRef.current||!scrollRef.current)return;
  scrollRef.current.scrollTop=scrollRef.current.scrollHeight;
 },[expanded,text]);
 const toggle=()=>{
  if(!expanded)followLatestRef.current=true;
  setExpanded(current=>!current);
 };
 const onTranscriptScroll=()=>{
  const panel=scrollRef.current;
  if(!panel)return;
  followLatestRef.current=panel.scrollHeight-panel.scrollTop-panel.clientHeight<28;
 };
 const toggleLabel=expanded
  ?(english?"Collapse AI dialogue":"收合 AI 對話")
  :(english?"Expand AI dialogue":"展開 AI 對話");
 return <div className={"crew-game-speech"+(expanded?" is-expanded":"")+(className?" "+className:"")}>
  <button className="crew-game-speech-trigger" type="button" aria-expanded={expanded} aria-controls={panelId} aria-label={toggleLabel}
   onClick={toggle}>
   <span className="crew-game-speech-preview" aria-hidden="true">{expanded?(english?"AI reply":"AI 對話"):text}</span>
   <span className="crew-game-speech-action" aria-hidden="true">{expanded?(english?"Collapse ↑":"收合 ↑"):(english?"Expand ↓":"展開 ↓")}</span>
  </button>
  <div ref={scrollRef} id={panelId} className="crew-game-speech-scroll" role="region" tabIndex={expanded?0:-1} onScroll={onTranscriptScroll}
   aria-label={english?"AI dialogue, scroll for more":"AI 對話內容，可上下捲動"} hidden={!expanded}>
   {text}
  </div>
 </div>;
}
