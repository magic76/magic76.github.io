import {useEffect,useMemo,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import type {FortuneReading} from "./types";
import {buildFortuneIdentity} from "./identity";
import {identityInviteUrl,shareIdentityCard} from "./identityShare";
import {identityArtworkUrl} from "./identityArtwork";
import "./identityCard.css";

const copy={
 zh:{eyebrow:"CREW FORTUNE · 命格身份",title:"我的命格身份",core:"核心特質",behavior:"最像你的地方",tension:"你的另一面",evidence:"命盤依據",share:"分享我的命格卡",invite:"複製朋友挑戰連結",copied:"已複製邀請連結",downloaded:"圖片已嘗試下載，可以傳給朋友",error:"目前無法分享，請重試",continueReport:"繼續查看完整命盤",more:"進一步了解我的命格",disclaimer:"依傳統命理符號整理，供自我探索，不是科學人格判定。"},
 en:{eyebrow:"CREW FORTUNE · IDENTITY",title:"My fortune archetype",core:"Core theme",behavior:"How you may act",tension:"Another side",evidence:"Chart evidence",share:"Share my archetype",invite:"Copy challenge link",copied:"Challenge link copied",downloaded:"Image download requested; share it with friends",error:"Could not share. Please try again.",continueReport:"View full chart",more:"Explore my archetype",disclaimer:"Traditional symbols for reflection, not an evidence-based personality assessment."}
};
export function FortuneIdentityCard({reading,onContinue}:{reading:FortuneReading;onContinue:()=>void}){
 const {i18n}=useTranslation("fortune");
 const locale=i18n.resolvedLanguage||i18n.language;
 const zh=/^zh(?:-|$)/i.test(locale),labels=zh?copy.zh:copy.en;
 const card=useMemo(()=>buildFortuneIdentity(reading.mode,reading.result,locale),[reading.mode,reading.result,locale]);
 const artSrc=card?identityArtworkUrl(card.id):null;
 const[artFailed,setArtFailed]=useState(false);
 const artRef=useRef<HTMLImageElement|null>(null);
 const[status,setStatus]=useState("");
 const[moreOpen,setMoreOpen]=useState(true);
 const[evidenceOpen,setEvidenceOpen]=useState(true);
 useEffect(()=>{setMoreOpen(true);setEvidenceOpen(true)},[reading.id]);
 useEffect(()=>{setStatus("")},[reading.id]);
 useEffect(()=>{setArtFailed(false);artRef.current=null},[artSrc]);
 if(!card)return null;
 const share=async()=>{
  setStatus("");
  try{
   const result=await shareIdentityCard(card,locale,artSrc&&!artFailed?artRef.current:null);
   if(result==="cancelled")return;
   if(result==="shared")trackUsageEvent("fortune_identity_shared",reading.mode);
   else {trackUsageEvent("fortune_identity_shared",reading.mode);setStatus(labels.downloaded)}
  }catch{setStatus(labels.error)}
 };
 const copyLink=async()=>{
  try{await navigator.clipboard.writeText(identityInviteUrl(reading.mode));
   trackUsageEvent("fortune_identity_copy_link",reading.mode);setStatus(labels.copied);
  }catch{setStatus(labels.error)}
 };
 return <section className="fortune-identity" aria-label={labels.title}>
  <div className="fortune-identity-card">
   <span className="fortune-identity-kicker">{labels.eyebrow}</span>
   <div className="fortune-identity-art">
    {artSrc&&!artFailed?<img src={artSrc} alt={zh?"「"+card.title+"」命格人物插畫":"Illustrated archetype: "+card.title} loading="eager" decoding="async" onLoad={event=>{artRef.current=event.currentTarget}} onError={()=>{artRef.current=null;setArtFailed(true)}}/>:
     <div className="fortune-identity-mark" aria-hidden="true">{card.symbol.slice(0,2)}</div>}
   </div>
   <h3>{card.title}</h3>
   <p className="fortune-identity-core">{card.core}</p>
  </div>
  <details className="fortune-identity-more" open={moreOpen} onToggle={event=>setMoreOpen(event.currentTarget.open)}>
   <summary>{labels.more}</summary>
   <div className="fortune-identity-more-content">
    <div className="fortune-identity-facts">
     {card.behavior&&<div><strong>{labels.behavior}</strong><p>{card.behavior}</p></div>}
     {card.tension&&<div><strong>{labels.tension}</strong><p>{card.tension}</p></div>}
    </div>
    <details className="fortune-identity-evidence" open={evidenceOpen} onToggle={event=>setEvidenceOpen(event.currentTarget.open)}><summary>{labels.evidence}</summary><ul>{card.evidence.map(x=><li key={x}>{x}</li>)}</ul></details>
    <p className="fortune-identity-note">{labels.disclaimer}</p>
    <button className="btn secondary fortune-identity-copy-link" type="button" onClick={()=>void copyLink()}>{labels.invite}</button>
   </div>
  </details>
  <div className="fortune-identity-actions">
   <button className="btn" type="button" onClick={()=>void share()}>{labels.share}</button>
   <button className="btn secondary" type="button" onClick={onContinue}>{labels.continueReport}</button>
   {status&&<p className="fortune-identity-status" role="status">{status}</p>}
  </div>
 </section>;
}
