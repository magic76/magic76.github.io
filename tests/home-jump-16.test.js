const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=filename=>fs.readFileSync(path.join(root,filename),"utf8");
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];

test("#16: primary CTAs reflect verified return state without quota-dependent wording",()=>{
 const mobile=read("web-spa/src/pages/MobileHomePage.tsx");
 const desktop=read("web-spa/src/pages/DesktopHomePage.tsx");
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const button=(text,cls)=>text.match(new RegExp('className="'+cls+'"[^\\n]*<Icon[^\\n]*?<\\/Link>'))?.[0];
 const mobileCta=button(mobile,"cmh-zoe-primary");
 const desktopCta=button(desktop,"kdh-primary");
 assert.ok(mobileCta&&desktopCta,"mobile and desktop primary buttons remain present");
 assert.ok(mobileCta.includes('t(friendResume?"chatChoices.resume":"showcase29.voice")'));
 assert.ok(desktopCta.includes('t(friend?"chatChoices.resume":"showcase29.desktop.voice")'));
 assert.match(mobileCta,/<Icon name="chat"\/>/);
 assert.match(desktopCta,/<Icon name="chat"\/>/);
 assert.doesNotMatch(mobile.split('className="cmh-zoe-actions"')[1].split("</div>")[0],/cmh-zoe-secondary|showcase29\.textZoe/);
 assert.doesNotMatch(desktop.split('className="kdh-zoe-actions"')[1].split("</div>")[0],/kdh-secondary|showcase29\.desktop\.text/);
 assert.doesNotMatch(mobileCta,/trialAvailable|hasKey\s*\?|exhausted\s*\?/);
 assert.doesNotMatch(desktopCta,/trialAvailable|hasKey\s*\?|exhausted\s*\?/);
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
  assert.ok(resource.showcase29.voice.trim(),locale);
  assert.equal(resource.showcase29.voice,resource.showcase29.desktop.voice,locale);
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
 assert.match(header,/@media\(max-width:700px\)\{\.crew-language-picker-header \.crew-language-trigger\{width:82px;min-width:82px/);
 assert.match(quote,/daily-quote--mobile \.daily-quote-text,\.daily-quote--mobile \.daily-quote-placeholder\{[^}]*overflow:hidden/);
 assert.match(art,/cmh-zoe-primary\{flex:1\.35 1 0;min-width:0/);
 assert.match(art,/cmh-zoe-secondary\{flex:\.8 1 0;min-width:0/);
});

test("#16 regression: quote does not grow after async text and compact phone grid remains tappable",()=>{
 const quote=read("web-spa/src/pages/dailyTopicCards.css");
 const mobile=read("web-spa/src/pages/mobileHome.css");
 const slot=quote.match(/\.daily-quote--mobile \.daily-quote-text,\.daily-quote--mobile \.daily-quote-placeholder\{([^}]+)\}/)?.[1];
 assert.ok(slot,"placeholder and loaded text must occupy the same slot");
 const fontSize=Number(quote.match(/\.daily-quote-text\{[^}]*font-size:([\d.]+)px/)?.[1]);
 const lineHeight=Number(slot.match(/(?:^|;)height:([\d.]+)px/)?.[1]);
 assert.ok(lineHeight>fontSize&&lineHeight<fontSize*2,"reserve only a single text line");
 assert.match(slot,/margin:0/);
 assert.match(slot,/overflow:hidden/);
 assert.doesNotMatch(quote,/\.daily-quote--mobile \.daily-quote-heading\{[^}]*min-height/);
 assert.match(quote,/\.daily-quote--mobile \.daily-quote-text\{[^}]*white-space:nowrap;[^}]*text-overflow:ellipsis/);
 const chartHit=Number(quote.match(/\.daily-quote-chart\{[^}]*min-height:([\d.]+)px/)?.[1]);
 const actionHit=Number(quote.match(/\.daily-quote-action\{[^}]*min-height:([\d.]+)px/)?.[1]);
 assert.ok(chartHit>=44&&actionHit>=44,"chart selector and fortune action keep accessible hit areas");
 const small=mobile.match(/@media\(max-width:(\d+)px\)\{\s*\.cmh-app\{min-height:([\d.]+)px\}/);
 const regular=Number(mobile.match(/\.cmh-app\{min-height:([\d.]+)px;gap:4px/)?.[1]);
 assert.ok(small&&Number(small[1])>=360&&Number(small[1])<390,"narrow-only override");
 assert.ok(Number(small[2])>=44&&Number(small[2])<regular,"shortcuts stay tappable and compact");
});
