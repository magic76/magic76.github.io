import {useTranslation} from "react-i18next";
import {useLocation} from "react-router-dom";
import i18n,{type UiLocale,UI_LOCALES} from "./index";

export function LanguageSwitcher({variant="header"}:{variant?:"header"|"settings"}){
 const {t}=useTranslation("common");
 const location=useLocation();
 const current:UiLocale=i18n.language==="en"?"en":"zh-TW";
 return <label className={"crew-language-picker crew-language-picker-"+variant}>
  {variant==="settings"&&<span className="label">{t("language.label")}</span>}
  <select aria-label={t("language.label")} className="crew-language-select"
   value={current} onChange={event=>{const next=event.target.value as UiLocale;if(UI_LOCALES.includes(next)){
    if(window.location.pathname.startsWith("/crew-app/"))void i18n.changeLanguage(next);
    else{
     // Reload across BrowserRouter basenames: locale and canonical URL stay aligned.
     const path=(next==="en"?"/en":"")+(location.pathname.startsWith("/")?location.pathname:"/"+location.pathname);
     window.location.assign(path+location.search+location.hash);
    }
   }}}>
   <option value="zh-TW">{t("language.zh")}</option>
   <option value="en">{t("language.en")}</option>
  </select>
 </label>;
}
