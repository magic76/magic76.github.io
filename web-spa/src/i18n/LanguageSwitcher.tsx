import {useTranslation} from "react-i18next";
import {useLocation} from "react-router-dom";
import i18n,{type UiLocale,UI_LOCALES} from "./index";
import {UI_LOCALE_CATALOG,localePrefix,normalizeUiLocale} from "./localeCatalog";

export function LanguageSwitcher({variant="header"}:{variant?:"header"|"settings"}){
 const {t}=useTranslation("common");
 const location=useLocation();
 const current:UiLocale=normalizeUiLocale(i18n.language)||"zh-TW";
 return <label className={"crew-language-picker crew-language-picker-"+variant}>
  {variant==="settings"&&<span className="label">{t("language.label")}</span>}
  <select aria-label={t("language.label")} className="crew-language-select"
   value={current} onChange={event=>{
    const next=event.target.value as UiLocale;
    if(!UI_LOCALES.includes(next))return;
    if(window.location.pathname.startsWith("/crew-app/"))void i18n.changeLanguage(next);
    else{
     // React Router location is basename-relative; changing the prefix never
     // duplicates /en/ or /ja/ and preserves deep links and query parameters.
     const path=localePrefix(next)+(location.pathname.startsWith("/")?location.pathname:"/"+location.pathname);
     window.location.assign(path+location.search+location.hash);
    }
   }}>
   {UI_LOCALE_CATALOG.map(({code,label,stage})=><option key={code} value={code}>
    {label}{stage==="published"?"":stage==="priority"?" · Beta":" · Preview (English fallback)"}
   </option>)}
  </select>
 </label>;
}
