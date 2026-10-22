"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ts=require("typescript");

const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

// Exercise the actual TypeScript decision logic, without a browser or a Vite server.
function loadLocalePolicy(){
 const source=read("web-spa/src/i18n/localeCatalog.ts");
 const js=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020
 }}).outputText;
 const exports={};
 const localRequire=id=>{
  assert.equal(id,"../../../config/ui-locales.json");
  return {default:JSON.parse(read("config/ui-locales.json"))};
 };
 new Function("require","exports",js)(localRequire,exports);
 return exports;
}
const {resolveInitialUiLocale,preferredPublicLocaleDestination}=loadLocalePolicy();
const visit=(pathname,languages,storedLocale=null,userAgent="Mozilla/5.0")=>
 resolveInitialUiLocale({pathname,storedLocale,browserLanguages:languages,userAgent});

test("first-time Web and Android WebView visitors use device languages, then English fallback",()=>{
 assert.equal(visit("/",["ja-JP"]),"ja");
 assert.equal(visit("/explore",["en-US"]),"en");
 assert.equal(visit("/learn",["zh-Hant-TW"]),"zh-TW");
 assert.equal(visit("/",["ru-RU","es-AR"]),"es");
 assert.equal(visit("/",["pt-PT"]),"pt-BR");
 assert.equal(visit("/",["ru-RU"]),"en");
 assert.equal(visit("/",[]),"en");
});

test("explicit public language prefixes beat both saved and device languages",()=>{
 assert.equal(visit("/ja/chat",["fr-FR"],"en"),"ja");
 assert.equal(visit("/en/teacher",["ja-JP"],"zh-TW"),"en");
 assert.equal(visit("/pt-BR/story",["en-US"],"ko"),"pt-BR");
});

test("existing preference wins on unprefixed routes and legacy HashRouter",()=>{
 assert.equal(visit("/",["ja-JP"],"zh-TW"),"zh-TW");
 assert.equal(visit("/games/taboo",["ja-JP"],"es"),"es");
 assert.equal(visit("/crew-app/",["ja-JP"],"en"),"en");
 assert.equal(visit("/crew-app/",["ja-JP"]),"ja");
 assert.equal(resolveInitialUiLocale({
  pathname:"/",storedLocale:"ja",browserLanguages:["en"],isBrowser:false
 }),"zh-TW","SSG must keep its canonical Traditional Chinese snapshot");
});

test("redirects preserve deep route, query and hash without adding a back-history entry",()=>{
 assert.equal(preferredPublicLocaleDestination("/","ja"),"/ja/");
 assert.equal(preferredPublicLocaleDestination("/chat","en","?mode=voice","#start"),"/en/chat?mode=voice#start");
 assert.equal(preferredPublicLocaleDestination("/games/1a2b","ko","?friend=zoe"),"/ko/games/1a2b?friend=zoe");
 assert.equal(preferredPublicLocaleDestination("/en/chat","ja"),null);
 assert.equal(preferredPublicLocaleDestination("/crew-app/","ja"),null);
 assert.equal(preferredPublicLocaleDestination("/story","zh-TW"),null);
 assert.match(read("web-spa/src/main.tsx"),/window\.location\.replace\(destination\)/);
});

test("crawlers continue seeing canonical SSG text, not a client-language redirect",()=>{
 const bot="Mozilla/5.0 (compatible; Googlebot/2.1; +https://google.com/bot.html)";
 assert.equal(visit("/",["en-US"],null,bot),"zh-TW");
 assert.equal(visit("/teacher",["ja-JP"],"en",bot),"zh-TW");
 assert.equal(visit("/ja/explore",["en-US"],null,bot),"ja");
 assert.equal(preferredPublicLocaleDestination("/","en","","",bot),null);
});

test("only an intentional language picker choice persists, and Teacher target language stays separate",()=>{
 const index=read("web-spa/src/i18n/index.ts");
 const switcher=read("web-spa/src/i18n/LanguageSwitcher.tsx");
 assert.doesNotMatch(index,/localStorage\.setItem\(UI_LOCALE_KEY/);
 assert.match(switcher,/localStorage\.setItem\(UI_LOCALE_KEY,next\)/);
 assert.match(switcher,/rememberManualChoice\(next\)/);
 assert.doesNotMatch(switcher,/setTargetLanguage/);
});
