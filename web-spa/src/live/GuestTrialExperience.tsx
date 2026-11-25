import{Link,useLocation}from"react-router-dom";
import{useTranslation}from"react-i18next";
import{getCrewFriend}from"../friends/friendProfiles";
import"./guestTrialExperience.css";

/** Display only; the Live hook enforces the independent five-minute deadline. */
export function GuestTrialCountdown({secondsLeft}:{secondsLeft:number}){
 const {t}=useTranslation("common");
 if(secondsLeft<=0)return null;
 const soon=secondsLeft<=10;
 return <div className={"guest-trial-countdown"+(soon?" is-soon":"")} role="timer" aria-label={t("guestTrial.timeLeft")+": "+secondsLeft+"s"}>
  <strong className="guest-trial-countdown-number" aria-hidden="true">{secondsLeft}s</strong>
  <div className="guest-trial-countdown-copy"><small>{t("guestTrial.timeLeft")}</small>
   {soon&&<strong role="status" aria-live="polite">{t("guestTrial.almostDone")}</strong>}</div>
 </div>;
}

/** Never suggest trial renewal: the three free destinations work without Live or a Key. */
export function GuestTrialFinish({expired,failed,name}:{expired:boolean;failed:boolean;name?:string}){
 const {t}=useTranslation(["common","voice"]);
 const location=useLocation();
 const friendId=new URLSearchParams(location.search).get("id");
 const isFriend=location.pathname.startsWith("/friend/live");
 const displayName=name||(isFriend&&friendId?getCrewFriend(friendId).name:t("guestTrial.aiFriend"));
 const textParams=new URLSearchParams(location.search);
 textParams.set("chat","text");
 return <section className="guest-trial-finish" role="region" aria-labelledby="guest-trial-finish-title">
  <div className="guest-trial-finish-icon" aria-hidden="true">✦</div>
  <h2 id="guest-trial-finish-title">{failed?t("guestTrial.interrupted"):expired?t("guestTrial.completeTitle",{name:displayName}):t("guestTrial.ended")}</h2>
  <p>{failed?t("guestTrial.interruptedBody"):t("guestTrial.completeBody")}</p>
  {isFriend?<Link className="btn secondary" to={location.pathname+"?"+textParams.toString()}>{t("voice:friendLive.useText")}</Link>:null}
  <div className="guest-trial-finish-actions" aria-label={t("guestTrial.freeNextTitle")}>
   <Link className="btn" to="/games/1a2b">{t("guestTrial.free1a2b")}</Link>
   <Link className="btn secondary" to="/teacher/vocabulary">{t("guestTrial.freeVocabulary")}</Link>
   <Link className="btn secondary" to="/story">{t("guestTrial.freeStory")}</Link>
  </div>
 </section>;
}
