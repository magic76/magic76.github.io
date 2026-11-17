const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=filename=>fs.readFileSync(path.join(root,filename),"utf8");
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];

test("#16: primary CTAs do not change wording after quota or resume hydration",()=>{
 const mobile=read("web-spa/src/pages/MobileHomePage.tsx");
 const desktop=read("web-spa/src/pages/DesktopHomePage.tsx");
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const button=(text,cls)=>text.match(new RegExp('className="'+cls+'"[^\\n]*<Icon[^\\n]*?<\\/Link>'))?.[0];
 const mobileCta=button(mobile,"cmh-zoe-primary");
 const desktopCta=button(desktop,"kdh-primary");
 assert.ok(mobileCta&&desktopCta,"mobile and desktop primary buttons remain present");
 assert.ok(mobileCta.includes('t("showcase29.textZoe")'));
 assert.ok(desktopCta.includes('t("showcase29.desktop.text")'));
 assert.doesNotMatch(mobileCta,/friendResume\s*\?/);
 assert.doesNotMatch(desktopCta,/validResume\s*\?/);
 const copy=portal.match(/className="crew-portal-cta-label">([\s\S]*?)<\/span>/)?.[1];
 assert.ok(copy?.includes('t("world.chatStableWith",{name:friendName})'));
 assert.doesNotMatch(copy,/trialAvailable|hasKey\s*\?|exhausted\s*\?/);
});

test("#16: all eleven localized primary labels are neutral and JSON leaves remain strings",()=>{
 const verify=(item,p)=>{
  if(typeof item==="string")return;
  assert.ok(item&&typeof item==="object"&&!Array.isArray(item),"non-string leaf at "+p);
  for(const [key,value] of Object.entries(item))verify(value,p+"."+key);
 };
 for(const locale of locales){
  const resource=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/home.json"));
  verify(resource,locale);
  assert.equal(resource.world.chatStableWith,resource.world.chatWithFriend,locale);
  assert.ok(resource.world.chatStableWith.includes("{{name}}"),locale);
 }
});

test("#16: header, practice selector, CTA columns and quote reserve stable dimensions",()=>{
 const portal=read("web-spa/src/pages/homePortal.css");
 const header=read("web-spa/src/i18n/languageSwitcher.css");
 const quote=read("web-spa/src/pages/dailyTopicCards.css");
 const art=read("web-spa/src/pages/mobileHomeHeroV3.css");
 assert.match(portal,/crew-portal-practice-holder\{[^}]*width:min\(100%,290px\);min-height:44px/);
 assert.match(portal,/crew-portal-practice-lang,\.crew-portal-practice-preview\{[^}]*width:100%/);
 assert.match(header,/crew-language-picker-header \.crew-language-trigger\{width:104px;min-width:104px/);
 assert.match(header,/@media\(max-width:700px\)\{\.crew-language-picker-header \.crew-language-trigger\{width:92px;min-width:92px/);
 assert.match(quote,/daily-quote--mobile \.daily-quote-text,\.daily-quote--mobile \.daily-quote-placeholder\{[^}]*height:38px/);
 assert.match(art,/cmh-zoe-primary\{flex:1\.35 1 0;min-width:0/);
 assert.match(art,/cmh-zoe-secondary\{flex:\.8 1 0;min-width:0/);
});
