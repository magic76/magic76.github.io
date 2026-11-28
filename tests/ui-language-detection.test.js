"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");

const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

// Exercise the actual TypeScript decision logic, without a browser or a Vite server.
function loadLocalePolicy(){
 const source=read("web-spa/src/i18n/localeCatalog.ts");
 // Node 22 strips TS types directly; this does not depend on TypeScript compiler APIs.
 const js=stripTypeScriptTypes(source)
  .replace(/^import definitions from .*?;$/m,"")
  .replace(/\bexport (?=(?:const|function)\b)/g,"");
 const definitions=JSON.parse(read("config/ui-locales.json"));
 return new Function("definitions",js+"\nreturn {resolveInitialUiLocale};")(definitions);
}
const {resolveInitialUiLocale}=loadLocalePolicy();
const visit=(pathname,languages,storedLocale=null,userAgent="Mozilla/5.0")=>
 resolveInitialUiLocale({pathname,storedLocale,browserLanguages:languages,userAgent});

test("public URLs default to Traditional Chinese irrespective of device languages or saved preferences",()=>{
 for(const languages of [["ja-JP"],["en-US"],["zh-Hant-TW"],["ru-RU","es-AR"],["pt-PT"],[]]){
  for(const path of ["/","/explore","/learn","/games/taboo"]){
   assert.equal(visit(path,languages),"zh-TW");
   assert.equal(visit(path,languages,"en"),"zh-TW");
  }
 }
});
test("explicit public language prefixes beat both saved and device languages",()=>{
 assert.equal(visit("/ja/chat",["fr-FR"],"en"),"ja");
 assert.equal(visit("/en/teacher",["ja-JP"],"zh-TW"),"en");
 assert.equal(visit("/pt-BR/story",["en-US"],"ko"),"pt-BR");
});
test("legacy HashRouter retains explicit preference; SSG is deterministic",()=>{
 assert.equal(visit("/crew-app/",["ja-JP"],"en"),"en");
 assert.equal(visit("/crew-app/",["ja-JP"]),"zh-TW");
 assert.equal(resolveInitialUiLocale({pathname:"/",storedLocale:"ja",isBrowser:false}),"zh-TW");
});
test("public startup cannot redirect by locale, including crawlers",()=>{
 const bot="Mozilla/5.0 (compatible; Googlebot/2.1; +https://google.com/bot.html)";
 assert.equal(visit("/",["en-US"],null,bot),"zh-TW");
 assert.equal(visit("/teacher",["ja-JP"],"en",bot),"zh-TW");
 assert.equal(visit("/ja/explore",["en-US"],null,bot),"ja");
 const main=read("web-spa/src/main.tsx");
 assert.doesNotMatch(main,/preferredPublicLocaleDestination|navigator\.language/);
 assert.match(main,/const destination=kooloCanonicalDestination;/);
 assert.doesNotMatch(read("web-spa/src/i18n/index.ts"),/navigator\.languages?/);
});

test("only an intentional language picker choice persists, and Teacher target language stays separate",()=>{
 const index=read("web-spa/src/i18n/index.ts");
 const switcher=read("web-spa/src/i18n/LanguageSwitcher.tsx");
 assert.doesNotMatch(index,/localStorage\.setItem\(UI_LOCALE_KEY/);
 assert.match(switcher,/localStorage\.setItem\(UI_LOCALE_KEY,next\)/);
 assert.match(switcher,/rememberManualChoice\(next\)/);
 assert.doesNotMatch(switcher,/setTargetLanguage/);
});
