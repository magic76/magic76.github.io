import {useEffect,useMemo,useState} from "react";
import {useTranslation} from "react-i18next";
import type {FortuneReading} from "./types";
import {buildFortuneCardModel} from "./fortuneCardModel";
import {fortuneCopy} from "./fortuneJourneyI18n";
import "./identityCard.css";

/** In-depth identity evidence is local-only. All share paths use the parent preview. */
export function FortuneIdentityCard({reading,onContinue,onShare,compact=false}:{
 reading:FortuneReading;onContinue:()=>void;onShare?:()=>void;compact?:boolean
}){
 const {i18n}=useTranslation("fortune"),locale=i18n.resolvedLanguage||i18n.language;
 const labels=fortuneCopy(locale),zh=/^zh(?:-|$)/i.test(locale);
 const view=useMemo(()=>buildFortuneCardModel(reading.mode,reading.result,locale),
  [reading.mode,reading.result,locale]);
 const card=view.identity,artSrc=view.artSrc;
 const[artFailed,setArtFailed]=useState(false);
 const[moreOpen,setMoreOpen]=useState(true),[evidenceOpen,setEvidenceOpen]=useState(true);
 useEffect(()=>{setMoreOpen(true);setEvidenceOpen(true)},[reading.id]);
 useEffect(()=>{setArtFailed(false)},[artSrc]);
 if(!card)return null;
 return <section className={"fortune-identity"+(compact?" fortune-identity-compact":"")} aria-label={labels.details}>
  {!compact&&<div className="fortune-identity-card">
   <span className="fortune-identity-kicker">CREW FORTUNE · {view.modeLabel}</span>
   <div className="fortune-identity-art">
    {artSrc&&!artFailed?<img src={artSrc} alt={view.title} loading="lazy" decoding="async" onError={()=>setArtFailed(true)}/>:
     <div className="fortune-identity-mark" aria-hidden="true">✦</div>}
   </div>
   <h3>{view.title}</h3>
   <p className="fortune-identity-core">{view.tagline}</p>
   <div className="fortune-identity-chips">{view.chips.map(chip=><span key={chip}>{chip}</span>)}</div>
  </div>}
  {!compact&&<div className="fortune-identity-actions">
   <button className="btn" type="button" onClick={onShare||onContinue}>{labels.share}</button>
   <button className="btn secondary" type="button" onClick={onContinue}>{labels.deep}</button>
  </div>}
  <details className="fortune-identity-more" open={moreOpen} onToggle={event=>setMoreOpen(event.currentTarget.open)}>
   <summary>{labels.details}</summary>
   <div className="fortune-identity-more-content">
    <div className="fortune-identity-facts">
     {card.behavior&&<div><strong>{zh?"最像你的地方":"How you may act"}</strong><p>{card.behavior}</p></div>}
     {card.tension&&<div><strong>{zh?"值得留意的另一面":"Another side to consider"}</strong><p>{card.tension}</p></div>}
    </div>
    <details className="fortune-identity-evidence" open={evidenceOpen} onToggle={event=>setEvidenceOpen(event.currentTarget.open)}>
     <summary>{zh?"命盤依據":"Chart evidence"}</summary>
     <ul>{card.evidence.map(evidence=><li key={evidence}>{evidence}</li>)}</ul>
    </details>
    <p className="fortune-identity-note">{labels.symbolic}</p>
   </div>
  </details>
 </section>;
}
