import {getDailyQuote} from "./dailyQuotes";

// One small locale chunk is loaded on demand. Never put all 330 lines in the homepage bundle.
const catalogs=import.meta.glob("../i18n/locales/*/dailyQuote.json",{import:"default"});
const LANGUAGES=new Set(["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"]);
const pending=new Map<string,Promise<Record<string,string>>>();
function catalogFor(language:string):Promise<Record<string,string>>{
 const lang=LANGUAGES.has(language)?language:"en";
 const cached=pending.get(lang);
 if(cached)return cached;
 const load=catalogs["../i18n/locales/"+lang+"/dailyQuote.json"];
 if(!load)return Promise.resolve({});
 const promise=load().then(data=>data as Record<string,string>);
 pending.set(lang,promise);
 return promise.catch(error=>{pending.delete(lang);throw error});
}
/** Only an allowlisted quote ID can ever be looked up from a query parameter. */
export async function loadQuoteText(language:string,id:string|null):Promise<string|undefined>{
 const quote=getDailyQuote(id);
 if(!quote)return undefined;
 try{
  const localized=await catalogFor(language);
  if(typeof localized[quote.id]==="string"&&localized[quote.id].trim())return localized[quote.id];
  const fallback=await catalogFor("en");
  return fallback[quote.id];
 }catch{return undefined}
}
