import {Link,useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";

/** Show a clear next step without interrupting or resetting the user's chat. */
export function GuestKeyRecovery({exhausted,hasKey}:{exhausted:boolean;hasKey:boolean}){
 const {t}=useTranslation(["voice","common"]);
 const location=useLocation();
 const continueTo="/account?returnTo="+encodeURIComponent(location.pathname+location.search)+"#settings-gemini";
 return <div className="crew-text-key-recovery" role="note">
  {exhausted&&<p>{t("guestText.nextDayHint")}</p>}
  {hasKey?<Link className="btn secondary small" to={continueTo}>{t("guestText.useKey")}</Link>:<Link className="btn secondary small" to="/games">{t("common:guestTrial.freeNextTitle")}</Link>}
 </div>;
}
