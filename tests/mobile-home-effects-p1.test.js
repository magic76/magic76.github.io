const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {resolve}=require("node:path");
const read=file=>readFileSync(resolve(__dirname,"..",file),"utf8");

test("mobile home effects preserve slides, carousel timing, shortcuts and existing entry links",()=>{
 const home=read("web-spa/src/pages/MobileHomePage.tsx");
 assert.ok(home.includes('const SLIDES=["zoe","friends","game","learn"]'));
 assert.ok(home.includes("CAROUSEL_INTERVAL_MS=11000"));
 assert.equal((home.slice(home.indexOf("const APPS:"),home.indexOf("/** Mobile-only")).match(/\{id:"/g)||[]).length,8);
 for(const href of ["/friend/live?id=noah&from=home&chat=text","/teacher/roles?mode=friends","/games","/learn","/teacher/roles?mode=teacher","/teacher/shorts"]){
  assert.ok(home.includes(href),"missing existing destination: "+href);
 }
 assert.ok(home.includes("onTouchStart={touchBegin} onTouchEnd={touchFinish}"));
 assert.ok(home.includes("setCarouselPaused(true)"));
 assert.ok(home.includes("data-scene={SLIDES[activeSlide]}"));
 assert.ok(home.includes('data-home-motion={homeMotion?"on":"off"}'));
 assert.ok(home.includes("if(!homeMotion)return"));
});

test("AI friend greetings are real links outside the aria-hidden artwork",()=>{
 const home=read("web-spa/src/pages/MobileHomePage.tsx");
 const art=read("web-spa/src/pages/mobileHomeEffects.css");
 assert.ok(home.includes('className="cmh-friend-invite cmh-zoe-invite"'));
 assert.ok(home.includes('className="cmh-friend-invite cmh-friends-invite"'));
 assert.ok(home.includes('to={textDestination} tabIndex={activeSlide===0?0:-1}'));
 assert.ok(home.includes('tabIndex={activeSlide===1?0:-1}'));
 assert.ok(home.indexOf('className="cmh-friend-invite cmh-zoe-invite"')>home.indexOf('className="cmh-scene cmh-zoe-scene"'));
 assert.ok(art.includes(".cmh-slide[data-active=\"true\"] .cmh-friend-invite"));
 assert.ok(art.includes("pointer-events:none"));
 assert.ok(art.includes("min-height:36px"));
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
 const preview=read("web-spa/src/teacher/HomeShortsPreview.tsx");
 const base=read("web-spa/src/teacher/homeShorts.css");
 const effects=read("web-spa/src/pages/mobileHomeEffects.css");
 assert.ok(preview.includes('entry.target.toggleAttribute("data-visible",entry.isIntersecting)'));
 assert.ok(preview.includes('(entry.target as HTMLElement).dataset.photoEntered="true"'));
 assert.ok(preview.includes("motionEnabled=true"));
 assert.ok(base.includes('data-motion-ready="true"'));
 assert.ok(effects.includes("[data-photo-entered]"));
 assert.ok(effects.includes("rotate:0;"));
 assert.ok(effects.includes('data-home-motion="on"'));
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
