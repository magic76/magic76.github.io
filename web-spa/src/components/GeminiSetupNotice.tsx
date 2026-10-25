import {Link,useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {geminiKey} from "../lib/runtime";

// Product surfaces share one setup destination; the key is always configured in Settings.
export function GeminiSetupNotice({force=false,returnTo,className=""}:{force?:boolean;returnTo?:string;className?:string}){
 const {t}=useTranslation("settings");
 const location=useLocation();
 const hasKey=Boolean(geminiKey());
 if(!force&&hasKey)return null;
 const proposed=returnTo||location.pathname+location.search;
 const safeReturn=proposed.startsWith("/")&&!proposed.startsWith("//")&&!proposed.startsWith("/\\")&&!/^\/settings(?:[/?#]|$)/.test(proposed)?proposed:"/";
 return <div className={"crew-gemini-setup-notice "+className} role="note">
  <span className="crew-gemini-setup-copy"><strong>{force&&hasKey?t("gemini.setupInvalidTitle"):t("gemini.setupNoticeTitle")}</strong><small>{force&&hasKey?t("gemini.setupInvalidDesc"):t("gemini.setupNoticeDesc")}</small></span>
  <Link className="btn secondary" to={"/settings?returnTo="+encodeURIComponent(safeReturn)+"#settings-gemini"}>{force&&hasKey?t("gemini.setupInvalidAction"):t("gemini.setupNoticeAction")}</Link>
 </div>;
}
