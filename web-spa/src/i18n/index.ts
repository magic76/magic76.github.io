import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import {previewResources} from "./previewTranslations";
import {normalizeUiLocale,localeFromPublicPath,UI_LOCALES,UI_LOCALE_KEY} from "./localeCatalog";
export {normalizeUiLocale,UI_LOCALES,UI_LOCALE_KEY,SEO_PRIORITY_LOCALES,PUBLISHED_SEO_LOCALES} from "./localeCatalog";
export type {UiLocale} from "./localeCatalog";

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

function initialLocale(){
 // A public path determines the displayed language even when a stored preference differs.
 // Legacy HashRouter /crew-app is intentionally controlled by the user's stored choice.
 if(typeof window!=="undefined"&&!window.location.pathname.startsWith("/crew-app/")){
  return localeFromPublicPath(window.location.pathname)||"zh-TW";
 }
 try {
  const saved=normalizeUiLocale(localStorage.getItem(UI_LOCALE_KEY));
  if(saved)return saved;
 }catch{/* Restricted storage must not block first paint. */}
 const preferences=typeof navigator==="undefined"?[]:navigator.languages?.length?navigator.languages:[navigator.language];
 for(const value of preferences){
  const locale=normalizeUiLocale(value);
  if(locale)return locale;
 }
 return "zh-TW";
}
// Load any complete namespace catalogs generated for each UI locale. Preview
// catalogs remain available only for namespaces not yet translated.
const generatedLocaleResources:Record<string,Record<string,unknown>>={};
const localeFiles=import.meta.glob("./locales/*/*.json",{eager:true,import:"default"});
for(const [filename,bundle] of Object.entries(localeFiles)){
 const match=/\\/locales\\/([^/]+)\\/([^/]+)\\.json$/.exec(filename);
 if(!match)continue;
 const [,locale,namespace]=match;
 (generatedLocaleResources[locale]??={})[namespace]=bundle;
}
const combinedLocaleResources=Object.fromEntries(
 Object.entries(generatedLocaleResources).map(([locale,namespaces])=>[
  locale,{...((previewResources as Record<string,Record<string,unknown>>)[locale]??{}),...namespaces}
 ])
);
const activeLocale=initialLocale();
void i18n.use(initReactI18next).init({
 lng:activeLocale,
 // Non-Chinese preview languages fall back to English for untranslated product
 // namespaces; show this status explicitly in the language switcher.
 fallbackLng:{"zh-TW":["zh-TW"],default:["en","zh-TW"]},
 supportedLngs:[...UI_LOCALES],
 ns:["common","home","settings","teacher","friends","story","fortune"],
 defaultNS:"common",
 resources:{
  "zh-TW":{common:zhCommon,home:zhHome,settings:zhSettings,teacher:zhTeacher,friends:zhFriends,story:zhStory,fortune:zhFortune},
  en:{common:enCommon,home:enHome,settings:enSettings,teacher:enTeacher,friends:enFriends,story:enStory,fortune:enFortune},
  ...previewResources,
  ...combinedLocaleResources
 },
 interpolation:{escapeValue:false},
 react:{useSuspense:false},
 initImmediate:false
});
function applyLocale(language:string){
 const locale=normalizeUiLocale(language)||"zh-TW";
 if(typeof document!=="undefined")document.documentElement.lang=locale;
 try{localStorage.setItem(UI_LOCALE_KEY,locale)}catch{/* Private browsing can restrict localStorage. */}
}
i18n.on("languageChanged",applyLocale);
applyLocale(i18n.language);
if(typeof window!=="undefined"){
 window.addEventListener("storage",event=>{
  if(event.key!==UI_LOCALE_KEY)return;
  const next=normalizeUiLocale(event.newValue);
  if(next&&next!==i18n.language&&window.location.pathname.startsWith("/crew-app/"))void i18n.changeLanguage(next);
 });
}
export default i18n;
