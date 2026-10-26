import {useEffect,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import type {MateTurn} from "./mateState";
export type TranscriptView="bilingual"|"translated"|"original";
export function MateTranscript({turns,target,view}:{
  turns:MateTurn[];target:string;view:TranscriptView;
}){
  const {t}=useTranslation(["mate","home"]);
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
    <div className="mate-transcript" ref={scrollRef} onScroll={onScroll} role="log" aria-live="polite" aria-label={t("mate.transcript.aria")}>
      {turns.length===0&&<p className="mate-empty">{t("mate.transcript.waiting")}</p>}
      {turns.map(entry=><div key={entry.id} className={"mate-message "+(entry.sender==="mate"?"agent":"other")}>
        <strong>{entry.sender==="mate"?"Mate":target}</strong>
        <p>{view==="original"?entry.original:entry.translated||entry.original}</p>
        {view==="bilingual"&&entry.translated&&entry.translated!==entry.original&&<p className="mate-original">{entry.original}</p>}
        <small>{new Date(entry.time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small>
      </div>)}
    </div>
    {showJump&&<button type="button" className="mate-jump" onClick={jump}>{t("mate.transcript.jump")}</button>}
  </div>;
}
