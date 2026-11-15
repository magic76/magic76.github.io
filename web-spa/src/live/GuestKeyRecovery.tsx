import {Link,useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";

/** Show a clear next step without interrupting or resetting the user's chat. */
export function GuestKeyRecovery({exhausted,hasKey}:{exhausted:boolean;hasKey:boolean}){
 const {t}=useTranslation("voice");
 const location=useLocation();
 const continueTo="/account?returnTo="+encodeURIComponent(location.pathname+location.search)+"#settings-gemini";
 return <div className="crew-text-key-recovery" role="note">
  {exhausted&&!hasKey&&<p>{t("guestText.nextDayHint")}</p>}
  <Link className="btn secondary small" to={continueTo}>{hasKey?t("guestText.useKey"):t("guestText.applyKey")}</Link>
  {!hasKey&&<small>{t("guestText.keyApplyNote")}</small>}
 </div>;
}
