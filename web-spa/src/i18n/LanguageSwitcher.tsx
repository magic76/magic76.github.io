import {useTranslation} from "react-i18next";
import i18n,{type UiLocale,UI_LOCALES} from "./index";

export function LanguageSwitcher({variant="header"}:{variant?:"header"|"settings"}){
 const {t}=useTranslation("common");
 const current:UiLocale=i18n.language==="en"?"en":"zh-TW";
 return <label className={"crew-language-picker crew-language-picker-"+variant}>
  {variant==="settings"&&<span className="label">{t("language.label")}</span>}
  <select aria-label={t("language.label")} className="crew-language-select"
   value={current} onChange={event=>{const next=event.target.value as UiLocale;if(UI_LOCALES.includes(next))void i18n.changeLanguage(next)}}>
   <option value="zh-TW">{t("language.zh")}</option>
   <option value="en">{t("language.en")}</option>
  </select>
 </label>;
}
