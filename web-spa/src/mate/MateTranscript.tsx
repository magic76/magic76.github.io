import {useEffect,useRef,useState} from "react";
import type {MateTurn} from "./mateState";
export type TranscriptView="bilingual"|"translated"|"original";
export function MateTranscript({turns,target,view,english}:{
  turns:MateTurn[];target:string;view:TranscriptView;english:boolean;
}){
  const scrollRef=useRef<HTMLDivElement|null>(null);
  const shouldFollow=useRef(true);
  const [showJump,setShowJump]=useState(false);
  useEffect(()=>{
    if(!shouldFollow.current)return;
    const el=scrollRef.current;
    if(el)el.scrollTop=el.scrollHeight;
  },[turns]);
  const onScroll=()=>{
    const el=scrollRef.current;
    if(!el)return;
    const nearBottom=el.scrollHeight-el.scrollTop-el.clientHeight<90;
    shouldFollow.current=nearBottom;
    setShowJump(!nearBottom&&turns.length>0);
  };
  const jump=()=>{
    const el=scrollRef.current;
    if(el)el.scrollTop=el.scrollHeight;
    shouldFollow.current=true;setShowJump(false);
  };
  return <div className="mate-transcript-wrap">
    <div className="mate-transcript" ref={scrollRef} onScroll={onScroll} role="log" aria-live="polite" aria-label={english?"Live transcript":"即時對話逐字稿"}>
      {turns.length===0&&<p className="mate-empty">{english?"Waiting for the other person to speak.":"等待對方開始說話，Mate 不會自行假裝對方已回覆。"}</p>}
      {turns.map(entry=><div key={entry.id} className={"mate-message "+(entry.sender==="mate"?"agent":"other")}>
        <strong>{entry.sender==="mate"?"Mate":target}</strong>
        <p>{view==="original"?entry.original:entry.translated||entry.original}</p>
        {view==="bilingual"&&entry.translated&&entry.translated!==entry.original&&<p className="mate-original">{entry.original}</p>}
        <small>{new Date(entry.time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small>
      </div>)}
    </div>
    {showJump&&<button type="button" className="mate-jump" onClick={jump}>{english?"Latest conversation ↓":"最新對話 ↓"}</button>}
  </div>;
}
