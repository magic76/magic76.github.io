import {useMemo,useState} from "react";
import {Link} from "react-router-dom";
import type {FortunePublicInvite} from "./fortuneInvite";
import {publicFortuneCard,fortuneInviteNextUrl} from "./fortuneInvite";
import {fortuneCopy} from "./fortuneJourneyI18n";
import "./identityCard.css";

/** Public only: deterministic archetype copy from known code. No profile, report or remote lookup. */
export function FortuneInviteLanding({invite,locale}:{invite:FortunePublicInvite;locale:string}){
 const model=useMemo(()=>publicFortuneCard(invite,locale),[invite.mode,invite.archetype,locale]);
 const labels=fortuneCopy(locale),[imageFailed,setImageFailed]=useState(false);
 if(!model)return null;
 return <section className={"fortune-invite-landing fortune-invite-"+invite.mode} aria-label={labels.friend}>
  <span className="fortune-identity-kicker">CREW FORTUNE · {labels.friend}</span>
  <div className="fortune-invite-content">
   <div className="fortune-invite-art" aria-hidden="true">
    {model.artSrc&&!imageFailed?<img src={model.artSrc} alt="" onError={()=>setImageFailed(true)}/>:
     <span className="fortune-identity-mark">✦</span>}
   </div>
   <div className="fortune-invite-copy">
    <span className="fortune-identity-kicker">{model.modeLabel}</span>
    <h1>{model.title}</h1>
    <p>{model.tagline}</p>
    <div className="fortune-identity-chips">{model.chips.slice(0,2).map(chip=><span key={chip}>{chip}</span>)}</div>
    <p className="fortune-invite-note">{labels.symbolic}</p>
    <Link className="btn fortune-invite-primary" to={fortuneInviteNextUrl(invite)}>{labels.mine} →</Link>
    <div className="fortune-invite-alternatives">
     <Link to="/fortune/reading?mode=bazi&src=card">{labels.bazi}</Link>
     <Link to="/fortune/reading?mode=vedic&src=card">{labels.vedic}</Link>
    </div>
   </div>
  </div>
 </section>;
}
