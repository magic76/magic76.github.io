const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {resolve}=require("node:path");
const read=file=>readFileSync(resolve(__dirname,"..",file),"utf8");

test("mobile home effects preserve slides, carousel timing, shortcuts and existing entry links",()=>{
 const home=read("web-spa/src/pages/MobileHomePage.tsx");
 assert.ok(home.includes('const SLIDES=["learn","zoe","friends","game"]'));
 assert.ok(home.includes("CAROUSEL_INTERVAL_MS=11000"));
 assert.equal((home.slice(home.indexOf("const APPS:"),home.indexOf("/** Mobile-only")).match(/\{id:"/g)||[]).length,6);
 for(const href of ["/friend/live?id=noah&from=home&chat=text","/teacher/roles?mode=friends","/games","/learn","/teacher/roles?mode=teacher","/teacher/shorts"]){
  assert.ok(home.includes(href),"missing existing destination: "+href);
 }
 assert.ok(home.includes("onTouchStart={touchBegin} onTouchEnd={touchFinish}"));
 assert.ok(home.includes("setCarouselPaused(true)"));
 assert.ok(home.includes("data-scene={SLIDES[activeSlide]}"));
 assert.ok(home.includes('data-home-motion={homeMotion?"on":"off"}'));
 assert.ok(home.includes("if(!homeMotion)return"));
});

test("no duplicate homepage chat bubble; single unified CTA remains the only Zoe hero entry",()=>{
 const home=read("web-spa/src/pages/MobileHomePage.tsx");
 const art=read("web-spa/src/pages/mobileHomeEffects.css");
 const hero=read("web-spa/src/pages/mobileHomeHeroV3.css");
 assert.doesNotMatch(home,/cmh-friend-invite|cmh-zoe-invite|cmh-friend-invite-text|cmh-friends-invite/);
 assert.doesNotMatch(home,/cmh-chat-pop-last|showcase29\.bubble/);
 assert.doesNotMatch(art,/cmh-friend-invite|cmh-friend-pop|cmh-chat-pop-last/);
 assert.doesNotMatch(hero,/cmh-chat-pop-last/);
 assert.match(home,/const ZOE_VOICE="\/friend\/live\?id=zoe&from=home&entry=bubble"/);
 assert.match(home,/<Link to=\{voiceDestination\} tabIndex=\{activeSlide===1\?0:-1\} className="cmh-zoe-primary"/);
 assert.match(home,/cmh-chat-pop-first/,"retain the distinct non-interactive Hey! decoration");
 assert.match(hero,/\.cmh-chat-pop-first/);
});

test("removing the bubble restores the untouched carousel-to-daily layout at 360 and 390 widths",()=>{
 const home=read("web-spa/src/pages/MobileHomePage.tsx");
 const art=read("web-spa/src/pages/mobileHomeEffects.css");
 const hero=read("web-spa/src/pages/mobileHomeHeroV3.css");
 const css=read("web-spa/src/pages/mobileHome.css");
 const nav=read("web-spa/src/components/mobileNavigation.css");
 const pager=home.indexOf('className="cmh-carousel-dots"');
 const daily=home.indexOf('<DailyTopicCards variant="mobile"/>');
 assert.ok(pager>=0&&daily>pager,"daily recommendation still follows the carousel");
 const between=home.slice(pager,daily);
 assert.doesNotMatch(between,/<Link|cmh-friend-invite/,"no floating link after the pager");
 assert.match(hero,/\.cmh-slide\{height:180px;min-height:180px/);
 assert.match(hero,/@media\(max-width:380px\)\{\s*\.cmh-slide\{height:176px;min-height:176px/);
 assert.match(hero,/\.cmh-carousel\{margin-bottom:0\}/);
 assert.match(hero,/\.cmh-carousel-dots\{margin-top:-10\.5px/);
 assert.match(css,/\.cmh-app-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(art,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(art,/cmh-friend-pop/);
 // Keep the original two-row shortcut and five-tab geometry at 360 and 390 widths.
 assert.match(css,/\.cmh-app\{min-height:76px;gap:4px;padding:6px 3px\}/);
 assert.match(nav,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
});

test("motion gates keep battery saver, low-end and reduced-motion experience usable",()=>{
 const hook=read("web-spa/src/lib/useHomeAmbientMotion.ts");
 const style=read("web-spa/src/pages/mobileHomeEffects.css");
 const mobile=read("web-spa/src/pages/MobileHomePage.tsx");
 for(const safeguard of ["max-width:767px","prefers-reduced-motion: reduce","deviceMemory","hardwareConcurrency","saveData","visibilityState","addEventListener","removeEventListener"]){
  assert.ok(hook.includes(safeguard),safeguard);
 }
 assert.ok(mobile.includes('motionEnabled={homeMotion}'));
 assert.ok(style.includes('data-home-motion="off"'));
 assert.ok(style.includes("animation:none!important"));
 assert.ok(style.includes("@media(prefers-reduced-motion:reduce)"));
 assert.ok(!/canvas|WebGL|setInterval|filter:blur/i.test(style),"new effects must stay lightweight");
});

test("photo animation builds on existing observer and settles once",()=>{
 const home=read("web-spa/src/pages/MobileHomePage.tsx");
 const preview=read("web-spa/src/teacher/HomeShortsPreview.tsx");
 const base=read("web-spa/src/teacher/homeShorts.css");
 const effects=read("web-spa/src/pages/mobileHomeEffects.css");
 assert.ok(home.includes("motionEnabled={homeMotion}"),"home forwards the device motion gate to Shorts");
 assert.ok(preview.includes("motionEnabled=true"));
 assert.ok(preview.includes("!motionEnabled"),"Shorts observer respects the motion gate");
 assert.ok(preview.includes('entry.target.toggleAttribute("data-visible",entry.isIntersecting)'));
 assert.ok(preview.includes('(entry.target as HTMLElement).dataset.photoEntered="true"'));
 assert.ok(base.includes('data-motion-ready="true"'));
 assert.match(effects,/\.cmh-shorts \.crew-home-shorts-grid\[data-motion-ready="true"\] \.crew-home-short-card\[data-photo-entered\]\{\s*opacity:1;translate:0 0;rotate:0;/);
 assert.match(effects,/@media\(max-width:767px\) and \(prefers-reduced-motion:no-preference\)/);
 assert.match(effects,/@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?\.cmh-shorts \.crew-home-short-card\{opacity:1!important;translate:0 0!important;rotate:0!important\}/);
});

test("brand asset stays original; eyes blink only on mobile home while tapping preserves other routes",()=>{
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 const effects=read("web-spa/src/pages/mobileHomeEffects.css");
 const logo=read("web-spa/public/brand/koolo-wordmark-koo-v2.svg");
 assert.ok(chrome.includes('<img className="app-wordmark" src="/brand/koolo-wordmark-koo-v2.svg"'));
 assert.ok(chrome.includes('const homeLogo=product==="home"&&location.pathname==="/"'));
 assert.ok(chrome.includes("useHomeAmbientMotion(homeLogo)"));
 assert.ok(chrome.includes("if(homeLogo&&homeMotion){event.preventDefault();setLogoTap"));
 assert.ok(chrome.includes('key={logoTap} className="koolo-home-blink"'));
 assert.ok(chrome.includes('data-logo-tapped={logoTap>0?"true":"false"}'));
 assert.ok(logo.includes('<circle cx="55" cy="22.7"'));
 assert.ok(effects.includes("@keyframes koolo-logo-eyelids"));
 assert.ok(effects.includes('data-home-blink="on"'));
 assert.ok(effects.includes('data-home-blink="off"'));
});
