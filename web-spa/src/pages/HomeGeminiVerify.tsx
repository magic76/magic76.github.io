import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon} from "../components/Icon";
import {useClientReady} from "../lib/useClientReady";
import {geminiKey,geminiVerified} from "../lib/runtime";
import "./homeGeminiVerify.css";

/** Only a saved but unverified key needs a settings prompt. */
export function HomeGeminiVerify({variant}:{variant:"desktop"|"mobile"}){
 const {t}=useTranslation("home");
 const ready=useClientReady();
 if(!ready||!geminiKey()||geminiVerified())return null;
 return <Link to="/account#settings-gemini" className={"home-gemini-verify home-gemini-verify--"+variant}>
  <span className="home-gemini-verify-icon" aria-hidden="true"><Icon name="settings"/></span>
  <span className="home-gemini-verify-copy"><strong>{t("setup.verify")}</strong><small>{t("setup.verifyDesc")}</small></span>
  <span className="home-gemini-verify-arrow" aria-hidden="true">→</span>
 </Link>;
}
