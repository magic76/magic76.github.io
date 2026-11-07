import i18n,{normalizeUiLocale} from "../i18n";

// This catalog mapping lives in the drawer chunk, not the initial Crew bundle.
const menuCatalogs=import.meta.glob("../i18n/locales/*/featureMenu.json",{import:"default"});
const inflight=new Map<string,Promise<void>>();

function loadMenuLanguage(locale:string):Promise<void>{
 if(i18n.hasResourceBundle(locale,"featureMenu"))return Promise.resolve();
 const cached=inflight.get(locale);
 if(cached)return cached;
 const loader=menuCatalogs["../i18n/locales/"+locale+"/featureMenu.json"];
 if(!loader)return Promise.reject(new Error("Missing Crew feature menu locale: "+locale));
 const task=loader().then(strings=>{i18n.addResourceBundle(locale,"featureMenu",strings,true,true)});
 inflight.set(locale,task);
 return task.catch(error=>{inflight.delete(locale);throw error});
}

export function loadCrewFeatureMenuLocale():Promise<void>{
 const current=normalizeUiLocale(i18n.language)||"zh-TW";
 const fallback=current==="zh-TW"?[]:current==="en"?[]:["en"];
 return Promise.all([current,...fallback].map(loadMenuLanguage)).then(()=>{});
}
