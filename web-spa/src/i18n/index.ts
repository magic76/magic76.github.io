import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import zhCommon from "./locales/zh-TW/common.json";
import zhHome from "./locales/zh-TW/home.json";
import zhSettings from "./locales/zh-TW/settings.json";
import zhFortune from "./locales/zh-TW/fortune.json";
import zhStory from "./locales/zh-TW/story.json";
import zhFriends from "./locales/zh-TW/friends.json";
import zhTeacher from "./locales/zh-TW/teacher.json";
import enCommon from "./locales/en/common.json";
import enHome from "./locales/en/home.json";
import enSettings from "./locales/en/settings.json";
import enFortune from "./locales/en/fortune.json";
import enStory from "./locales/en/story.json";
import enFriends from "./locales/en/friends.json";
import enTeacher from "./locales/en/teacher.json";

export type UiLocale="zh-TW"|"en";
export const UI_LOCALE_KEY="crew_ui_locale_v1";
export const UI_LOCALES:readonly UiLocale[]=["zh-TW","en"];

export function normalizeUiLocale(value:unknown):UiLocale|null {
 if(typeof value!=="string")return null;
 if(value==="zh-TW"||/^zh(?:[-_]|$)/i.test(value))return "zh-TW";
 if(value==="en"||/^en[-_]/i.test(value))return "en";
 return null;
}
function initialLocale():UiLocale {
 try {
  const saved=normalizeUiLocale(localStorage.getItem(UI_LOCALE_KEY));
  if(saved)return saved;
 }catch{/* Private browsing can restrict localStorage. */}
 const preference=typeof navigator==="undefined"?[]:navigator.languages?.length?navigator.languages:[navigator.language];
 for(const value of preference){
  const locale=normalizeUiLocale(value);
  if(locale)return locale;
 }
 return "zh-TW";
}
const activeLocale=initialLocale();
void i18n.use(initReactI18next).init({
 lng:activeLocale,
 fallbackLng:"zh-TW",
 supportedLngs:[...UI_LOCALES],
 ns:["common","home","settings","teacher","friends","story","fortune"],
 defaultNS:"common",
 resources:{
  "zh-TW":{common:zhCommon,home:zhHome,settings:zhSettings,teacher:zhTeacher,friends:zhFriends,story:zhStory,fortune:zhFortune},
  en:{common:enCommon,home:enHome,settings:enSettings,teacher:enTeacher,friends:enFriends,story:enStory,fortune:enFortune}
 },
 interpolation:{escapeValue:false},
 react:{useSuspense:false},
 initImmediate:false
});

function applyLocale(language:string){
 const locale=normalizeUiLocale(language)||"zh-TW";
 if(typeof document!=="undefined")document.documentElement.lang=locale;
 try{localStorage.setItem(UI_LOCALE_KEY,locale)}catch{/* Read-only browser storage is optional. */}
}
i18n.on("languageChanged",applyLocale);
applyLocale(i18n.language);

if(typeof window!=="undefined"){
 window.addEventListener("storage",event=>{
  if(event.key!==UI_LOCALE_KEY)return;
  const next=normalizeUiLocale(event.newValue);
  if(next&&next!==i18n.language)void i18n.changeLanguage(next);
 });
}
export default i18n;
