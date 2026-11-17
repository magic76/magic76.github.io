"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const fsPath=p=>path.join(__dirname,"..",p);
const read=p=>readFileSync(fsPath(p),"utf8");
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
const flattened=(obj,prefix="",out={})=>{
 for(const [k,v] of Object.entries(obj)){const key=prefix?prefix+"."+k:k;
  if(typeof v==="string")out[key]=v;
  else if(v&&typeof v==="object"&&!Array.isArray(v))flattened(v,key,out);
  else throw Error("Non-string translation leaf "+key);
 }return out;
};
test("#29: homepage carousel, labels and all eight app entries have translated keys",()=>{
 const source=flattened(JSON.parse(read("web-spa/src/i18n/locales/en/home.json")).showcase29);
 assert.equal(Object.keys(source).length,49);
 const allowed=["slideZoe","badgeFriend","badgeFriends","badgeLearn","badgePlay","desktop.learnBadge"];
 for(const locale of locales){
  const text=flattened(JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/home.json")).showcase29);
  assert.deepEqual(Object.keys(text).sort(),Object.keys(source).sort(),locale+" key parity");
  for(const [key,value] of Object.entries(text)){
   assert.ok(value.trim(),locale+" missing "+key);
   assert.deepEqual([...value.matchAll(/\{\{([^{}]+)\}\}/g)].map(x=>x[1]).sort(),
    [...source[key].matchAll(/\{\{([^{}]+)\}\}/g)].map(x=>x[1]).sort(),locale+" placeholder "+key);
   if(locale!=="en"&&!allowed.includes(key)&&!(key==="apps.shorts"&&value==="Moments"))
    assert.notEqual(value,source[key],locale+" English fallback "+key);
  }
  for(const id of ["friends","teacher","games","story","fortune","shorts","timeline","scenarios"])
   assert.ok(text["apps."+id],locale+" app "+id);
 }
 const mobile=read("web-spa/src/pages/MobileHomePage.tsx");
 const desktop=read("web-spa/src/pages/DesktopHomePage.tsx");
 assert.match(mobile,/showcase29\.heading/);
 assert.match(mobile,/showcase29\.slideGo/);
 assert.match(mobile,/showcase29\.apps\./);
 assert.match(desktop,/showcase29\.apps\./);
});
test("#29: first Learn gate uses the selected language, not English fallback",()=>{
 const gate=read("web-spa/src/onboarding/LearningLanguageGate.tsx");
 const copy=read("web-spa/src/onboarding/learningLanguageCopy.ts");
 assert.match(gate,/getLearningLanguageCopy\(i18n\.language\)/);
 assert.doesNotMatch(gate,/getLearningLanguageCopy\(i18n\.resolvedLanguage/);
 for(const locale of locales){
  const marker=locale==="zh-TW"?'"zh-TW":{':locale==="pt-BR"?'"pt-BR":{':locale+":{";
  assert.ok(copy.includes(marker),locale+" dialog locale not found");
 }
 assert.match(copy,/ja:\{title:"何語を学びたいですか？"/);
 assert.match(copy,/ja:[^\n]*start:"学習を始める"/);
 assert.match(copy,/ja:[^\n]*skip:"初期設定のまま進む"/);
});
test("#29: five bottom tabs retain >=44px targets and can wrap at 360px",()=>{
 const css=read("web-spa/src/components/mobileNavigation.css");
 const common=JSON.parse(read("web-spa/src/i18n/locales/vi/common.json"));
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 assert.equal(common.nav.me,"Tôi");
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/\.crew-mobile-dock-label\{[\s\S]*?white-space:normal/);
 assert.match(css,/font-size:12px/);
 assert.match(css,/\.crew-mobile-dock-item\{min-width:0;min-height:54px\}/);
 for(const id of ["home","chat","explore","learn","me"])assert.ok(chrome.includes('id:"'+id+'"'));
});
