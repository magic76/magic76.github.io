import {useId,useState} from "react";
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
 return <div className={"crew-game-speech"+(expanded?" is-expanded":"")+(className?" "+className:"")}>
  <button className="crew-game-speech-trigger" type="button" aria-expanded={expanded} aria-controls={panelId}
   onClick={()=>setExpanded(current=>!current)}>
   <span className="crew-game-speech-preview">{expanded?(english?"AI reply":"AI 對話"):text}</span>
   <span className="crew-game-speech-action" aria-hidden="true">{expanded?(english?"Collapse ↑":"收合 ↑"):(english?"Expand ↓":"展開 ↓")}</span>
  </button>
  <div id={panelId} className="crew-game-speech-scroll" role="region" tabIndex={expanded?0:-1}
   aria-label={english?"AI dialogue, scroll for more":"AI 對話內容，可上下捲動"} hidden={!expanded}>
   {text}
  </div>
 </div>;
}
