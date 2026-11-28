import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import {normalizeUiLocale,resolveInitialUiLocale,UI_LOCALES,UI_LOCALE_KEY} from "./localeCatalog";
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
 if(typeof window==="undefined")return "zh-TW";
 let saved:string|null=null;
 try{saved=localStorage.getItem(UI_LOCALE_KEY)}catch{/* Restricted storage must not block first paint. */}
 return resolveInitialUiLocale({
  pathname:window.location.pathname,
  storedLocale:saved
 });
}
// Keep beta base catalogs out of the entry bundle. Vite puts each JSON
// into its own on-demand chunk, and only the active locale is fetched.
const localeImports=import.meta.glob("./locales/{ja,es,pt-BR,id,ko,fr,de,vi,th}/*.json",{import:"default"});
const namespaceNames=["common","home","settings","teacher","friends","story","fortune"] as const;
const loadingLocales=new Map<string,Promise<void>>();
// Route-scoped catalogs (every locale, zh-TW and en included) stay out of the
// entry bundle. Routes await loadUiNamespace() inside their lazy() import, so
// the strings exist before the first render and raw keys never flash.
const routeNamespaceImports=import.meta.glob("./locales/*/{games,mate,lesson,voice,magic,fortuneReport,fortuneDaily,feedback}.json",{import:"default"});
export type RouteNamespace="games"|"mate"|"lesson"|"voice"|"magic"|"fortuneReport"|"fortuneDaily"|"feedback";
const wantedRouteNamespaces=new Set<RouteNamespace>();
const loadingRouteNamespaces=new Map<string,Promise<void>>();
function loadRouteBundle(locale:string,namespace:RouteNamespace):Promise<void>{
 const id=locale+"/"+namespace;
 const cached=loadingRouteNamespaces.get(id);
 if(cached)return cached;
 const load=routeNamespaceImports["./locales/"+id+".json"];
 if(!load)return Promise.resolve();
 const promise=load().then(bundle=>{i18n.addResourceBundle(locale,namespace,bundle,true,true)});
 loadingRouteNamespaces.set(id,promise);
 return promise.catch(error=>{loadingRouteNamespaces.delete(id);throw error});
}
function loadRouteNamespaces(locale:string,namespaces:Iterable<RouteNamespace>):Promise<void>{
 // Beta locales fall back to English, so their English catalog loads too.
 const locales=locale==="zh-TW"?["zh-TW"]:locale==="en"?["en"]:[locale,"en"];
 return Promise.all([...namespaces].flatMap(namespace=>locales.map(l=>loadRouteBundle(l,namespace)))).then(()=>{});
}
/** True when the active locale (and its English fallback) has this route catalog. */
export function routeNamespaceReady(namespace:RouteNamespace):boolean{
 const locale=normalizeUiLocale(i18n.language)||"zh-TW";
 return i18n.hasResourceBundle(locale,namespace)&&(locale==="zh-TW"||locale==="en"||i18n.hasResourceBundle("en",namespace));
}
export function loadUiNamespace(namespace:RouteNamespace):Promise<void>{
 wantedRouteNamespaces.add(namespace);
 return loadRouteNamespaces(normalizeUiLocale(i18n.language)||"zh-TW",[namespace]);
}
export function loadUiLocale(locale:string):Promise<void>{
 if(!UI_LOCALES.includes(locale as (typeof UI_LOCALES)[number]))return Promise.resolve();
 return Promise.all([loadBaseLocale(locale),loadRouteNamespaces(locale,wantedRouteNamespaces)]).then(()=>{});
}
function loadBaseLocale(locale:string):Promise<void>{
 // Base locales are bundled eagerly; only Beta locales need dynamic JSON chunks.
 if(locale==="zh-TW"||locale==="en")return Promise.resolve();
 const match=namespaceNames.map(namespace=>{
  const filename="./locales/"+locale+"/"+namespace+".json";
  return [namespace,localeImports[filename]] as const;
 }).filter((pair):pair is readonly [typeof namespaceNames[number],()=>Promise<unknown>]=>Boolean(pair[1]));
 if(match.length!==namespaceNames.length)return Promise.reject(new Error("Missing locale resources: "+locale));
 const cached=loadingLocales.get(locale);
 if(cached)return cached;
 const promise=Promise.all(match.map(async ([namespace,load])=>{
  const bundle=await load();
  i18n.addResourceBundle(locale,namespace,bundle,true,true);
 })).then(()=>{});
 loadingLocales.set(locale,promise);
 return promise.catch(error=>{loadingLocales.delete(locale);throw error});
}
const activeLocale=initialLocale();
void i18n.use(initReactI18next).init({
 lng:activeLocale,
 // Missing product strings fall back to English without changing learning language.
 fallbackLng:{"zh-TW":["zh-TW"],default:["en","zh-TW"]},
 supportedLngs:[...UI_LOCALES],
 ns:["common","home","settings","teacher","friends","story","fortune"],
 defaultNS:"common",
 resources:{
  "zh-TW":{common:zhCommon,home:zhHome,settings:zhSettings,teacher:zhTeacher,friends:zhFriends,story:zhStory,fortune:zhFortune},
  en:{common:enCommon,home:enHome,settings:enSettings,teacher:enTeacher,friends:enFriends,story:enStory,fortune:enFortune}
 },
 interpolation:{escapeValue:false},
 // Route pages call useTranslation(["lesson","teacher"]) etc.; look keys up in every listed namespace.
 react:{useSuspense:false,nsMode:"fallback"},
 initImmediate:false
});
function applyLocale(language:string){
 const locale=normalizeUiLocale(language)||"zh-TW";
 if(typeof document!=="undefined")document.documentElement.lang=locale;
 // Only explicit selections in LanguageSwitcher persist; direct links must not override the user\'s saved preference.
}
i18n.on("languageChanged",applyLocale);
applyLocale(i18n.language);
// Browser entry waits for the selected locale before mounting, preventing
// an English flash while keeping all other locales out of the initial JS.
export let uiLocaleFailedToLoad=false;
export const localeResourcesReady=loadUiLocale(activeLocale).catch(error=>{
 uiLocaleFailedToLoad=true;
 console.warn("Crew UI locale could not load; falling back to English",error);
 return i18n.changeLanguage("en").then(()=>{});
});
if(typeof window!=="undefined"){
 window.addEventListener("storage",event=>{
  if(event.key!==UI_LOCALE_KEY)return;
  const next=normalizeUiLocale(event.newValue);
  if(next&&next!==i18n.language&&window.location.pathname.startsWith("/crew-app/"))void loadUiLocale(next).then(()=>i18n.changeLanguage(next));
 });
}
export default i18n;
