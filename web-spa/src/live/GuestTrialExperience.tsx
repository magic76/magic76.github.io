import{Link}from"react-router-dom";
import{useTranslation}from"react-i18next";
import"./guestTrialExperience.css";

/** Display only; the Live hook enforces the independent three-minute deadline. */
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

/** Teacher and Friend finish without attempting to reuse the one-use token. */
export function GuestTrialFinish({expired,failed}:{expired:boolean;failed:boolean}){
 const {t}=useTranslation("common");
 return <section className="guest-trial-finish" role="region" aria-labelledby="guest-trial-finish-title">
  <div className="guest-trial-finish-icon" aria-hidden="true">✦</div>
  <h2 id="guest-trial-finish-title">{failed?t("guestTrial.interrupted"):expired?t("guestTrial.completeTitle"):t("guestTrial.ended")}</h2>
  <p>{failed?t("guestTrial.interruptedBody"):t("guestTrial.completeBody")}</p>
  <div className="guest-trial-finish-actions">
   <Link className="btn" to="/account#settings-gemini">{t("guestTrial.continueKey")}</Link>
   <Link className="btn secondary" to="/">{t("guestTrial.exploreCrew")}</Link>
  </div>
 </section>;
}
