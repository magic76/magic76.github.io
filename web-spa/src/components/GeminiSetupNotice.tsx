import {Link,useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {geminiKey} from "../lib/runtime";
import {GUEST_TEXT_DAILY_TURNS} from "../live/guestAllowance";

// Product surfaces share one setup destination; the key is configured on Account (even without sign-in).
export function GeminiSetupNotice({force=false,returnTo,className="",compactLabel}:{force?:boolean;returnTo?:string;className?:string;compactLabel?:string}){
 const {t}=useTranslation("settings");
 const location=useLocation();
 const hasKey=Boolean(geminiKey());
 if(!force&&hasKey)return null;
 const proposed=returnTo||location.pathname+location.search;
 const safeReturn=proposed.startsWith("/")&&!proposed.startsWith("//")&&!proposed.startsWith("/\\")&&!/^\/(?:settings|account)(?:[/?#]|$)/.test(proposed)?proposed:"/";
 if(compactLabel)return <Link className="crew-gemini-setup-compact" style={{display:"inline-flex",alignItems:"center",minHeight:44,fontSize:12}} to={"/account?returnTo="+encodeURIComponent(safeReturn)+"#settings-gemini"}>{compactLabel}</Link>;
 return <div className={"crew-gemini-setup-notice "+className} role="note">
  <span className="crew-gemini-setup-copy"><strong>{force&&hasKey?t("gemini.setupInvalidTitle"):t("gemini.setupNoticeTitle")}</strong>
   <small>{t("gemini.keyCapabilities",{count:GUEST_TEXT_DAILY_TURNS})}</small>
   <small>{force&&hasKey?t("gemini.setupInvalidDesc"):t("gemini.setupNoticeDesc")}</small></span>
  <Link className="btn secondary" to={"/account?returnTo="+encodeURIComponent(safeReturn)+"#settings-gemini"}>{force&&hasKey?t("gemini.setupInvalidAction"):t("gemini.setupNoticeAction")}</Link>
 </div>;
}
