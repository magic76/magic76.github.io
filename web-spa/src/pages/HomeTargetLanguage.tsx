import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";

/** Lightweight, client-only practice-language picker; the header locale is separate. */
export default function HomeTargetLanguage(){
 const {t}=useTranslation(["home","friends"]);
 const targetLanguage=useTeacherStore(s=>s.targetLanguage);
 const setTargetLanguage=useTeacherStore(s=>s.setTargetLanguage);
 return <label className="crew-portal-practice-lang">
  <span className="crew-portal-practice-label">{t("world.practiceLang.label")}</span>
  <span className="crew-portal-practice-control">
   <select aria-label={t("world.practiceLang.aria")} value={targetLanguage}
    onChange={event=>setTargetLanguage(event.currentTarget.value)}>
    {TARGET_LANGUAGES.map(language=><option key={language.code} value={language.value}>
     {t("friends:languages."+language.value,{defaultValue:language.spoken})}
    </option>)}
   </select>
  </span>
 </label>;
}
