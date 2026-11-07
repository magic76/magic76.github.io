import {useEffect,useMemo,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import type {FortuneReading} from "./types";
import {buildFortuneIdentity} from "./identity";
import {identityInviteUrl,shareIdentityCard} from "./identityShare";
import {identityArtworkUrl} from "./identityArtwork";
import "./identityCard.css";

type Rating="yes"|"partly"|"no";
const feedbackDetail={
 bazi:{yes:"bazi_yes",partly:"bazi_partly",no:"bazi_no"},
 tarot:{yes:"tarot_yes",partly:"tarot_partly",no:"tarot_no"},
 vedic:{yes:"vedic_yes",partly:"vedic_partly",no:"vedic_no"}
} as const;
const copy={
 zh:{eyebrow:"CREW FORTUNE · 命格身份",title:"我的命格身份",core:"核心特質",behavior:"最像你的地方",tension:"你的另一面",evidence:"查看命盤依據",share:"分享我的命格卡",invite:"複製朋友挑戰連結",rating:"你覺得這份描述像自己嗎？",yes:"非常像",partly:"部分符合",no:"不太像",thanks:"謝謝回饋！這是你的主觀感受，不會改動命盤結果。",copied:"已複製邀請連結",downloaded:"圖片已嘗試下載，可以傳給朋友",error:"目前無法分享，請重試",continueReport:"繼續查看完整命盤",more:"進一步了解我的命格",disclaimer:"依傳統命理符號整理，供自我探索，不是科學人格判定。"},
 en:{eyebrow:"CREW FORTUNE · IDENTITY",title:"My fortune archetype",core:"Core theme",behavior:"How you may act",tension:"Another side",evidence:"View chart evidence",share:"Share my archetype",invite:"Copy challenge link",rating:"How much does this sound like you?",yes:"Very much",partly:"Somewhat",no:"Not really",thanks:"Thanks for the feedback! This won't change your calculated chart.",copied:"Challenge link copied",downloaded:"Image download requested; share it with friends",error:"Could not share. Please try again.",continueReport:"View full chart",more:"Explore my archetype",disclaimer:"Traditional symbols for reflection, not an evidence-based personality assessment."}
};
const readStored=(key:string):Rating|null=>{try{const x=localStorage.getItem(key);return x==="yes"||x==="partly"||x==="no"?x:null}catch{return null}};
export function FortuneIdentityCard({reading,onContinue}:{reading:FortuneReading;onContinue:()=>void}){
 const {i18n}=useTranslation("fortune");
 const locale=i18n.resolvedLanguage||i18n.language;
 const zh=/^zh(?:-|$)/i.test(locale),labels=zh?copy.zh:copy.en;
 const card=useMemo(()=>buildFortuneIdentity(reading.mode,reading.result,locale),[reading.mode,reading.result,locale]);
 const key=card?"crew_fortune_identity_rating_"+card.version+"_"+card.rule:"";
 const artSrc=card?identityArtworkUrl(card.id):null;
 const[artFailed,setArtFailed]=useState(false);
 const artRef=useRef<HTMLImageElement|null>(null);
 const[rating,setRating]=useState<Rating|null>(null);
 const[status,setStatus]=useState("");
 useEffect(()=>{setRating(key?readStored(key):null);setStatus("")},[key]);
 useEffect(()=>{setArtFailed(false);artRef.current=null},[artSrc]);
 if(!card)return null;
 const vote=(value:Rating)=>{
  setRating(value);try{localStorage.setItem(key,value)}catch{/* optional local-only feedback */}
  trackUsageEvent("fortune_identity_feedback",feedbackDetail[reading.mode][value]);
  setStatus(labels.thanks);
 };
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
  <div className="fortune-identity-actions">
   <button className="btn" type="button" onClick={()=>void share()}>{labels.share}</button>
   <button className="btn secondary" type="button" onClick={onContinue}>{labels.continueReport}</button>
  </div>
  <details className="fortune-identity-more">
   <summary>{labels.more}</summary>
   <div className="fortune-identity-more-content">
    <div className="fortune-identity-facts">
     {card.behavior&&<div><strong>{labels.behavior}</strong><p>{card.behavior}</p></div>}
     {card.tension&&<div><strong>{labels.tension}</strong><p>{card.tension}</p></div>}
    </div>
    <details className="fortune-identity-evidence"><summary>{labels.evidence}</summary><ul>{card.evidence.map(x=><li key={x}>{x}</li>)}</ul></details>
    <p className="fortune-identity-note">{labels.disclaimer}</p>
    <button className="btn secondary fortune-identity-copy-link" type="button" onClick={()=>void copyLink()}>{labels.invite}</button>
   </div>
  </details>
  <div className="fortune-identity-rating">
   <strong>{labels.rating}</strong>
   <div role="group" aria-label={labels.rating} className="fortune-identity-rating-choices">
    {(["yes","partly","no"] as const).map(value=><button key={value} type="button" aria-pressed={rating===value} onClick={()=>vote(value)}>{labels[value]}</button>)}
   </div>
  </div>
  {status&&<p className="fortune-identity-status" role="status">{status}</p>}
 </section>;
}
