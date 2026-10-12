import {Link,useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {geminiKey} from "../lib/runtime";

// Product surfaces share one setup destination; the key is always configured in Settings.
export function GeminiSetupNotice({force=false,returnTo,className=""}:{force?:boolean;returnTo?:string;className?:string}){
 const {t}=useTranslation("settings");
 const location=useLocation();
 if(!force&&geminiKey())return null;
 const proposed=returnTo||location.pathname+location.search;
 const safeReturn=proposed.startsWith("/")&&!proposed.startsWith("//")&&!proposed.startsWith("/\\")&&!/^\/settings(?:[/?#]|$)/.test(proposed)?proposed:"/";
 return <div className={"crew-gemini-setup-notice "+className} role="note">
  <span className="crew-gemini-setup-copy"><strong>{t("gemini.setupNoticeTitle")}</strong><small>{t("gemini.setupNoticeDesc")}</small></span>
  <Link className="btn secondary" to={"/settings?returnTo="+encodeURIComponent(safeReturn)}>{t("gemini.setupNoticeAction")}</Link>
 </div>;
}
