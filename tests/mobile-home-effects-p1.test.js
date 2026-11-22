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

test("AI friend bubble uses the existing pager row, keeps a 44px target, and never covers portraits or CTA",()=>{
 const home=read("web-spa/src/pages/MobileHomePage.tsx");
 const art=read("web-spa/src/pages/mobileHomeEffects.css");
 const mobile=read("web-spa/src/pages/mobileHome.css");
 const hero=read("web-spa/src/pages/mobileHomeHeroV3.css");
 assert.equal((home.match(/className="cmh-friend-invite cmh-zoe-invite"/g)||[]).length,1);
 assert.doesNotMatch(home,/cmh-friends-invite/,"Noah already has the primary chat CTA");
 assert.ok(home.includes('to={textDestination} tabIndex={activeSlide===0?0:-1}'));
 assert.ok(home.includes('aria-hidden={activeSlide!==0} data-active={activeSlide===0}'));
 assert.ok(home.includes('className="cmh-zoe-actions"'));
 const pager=home.indexOf('className="cmh-carousel-dots"');
 const bubble=home.indexOf('className="cmh-friend-invite cmh-zoe-invite"');
 const nextSection=home.indexOf('<DailyTopicCards variant="mobile"/>');
 assert.ok(pager>0&&bubble>pager&&nextSection>bubble,"Invite is below the clipped slides, within the existing pager footprint");
 const rule=art.match(/\.cmh-friend-invite\{([^}]*)\}/)?.[1]||"";
 assert.match(rule,/position:absolute;[^;]*;bottom:0;left:0/);
 assert.match(rule,/min-height:44px/);
 assert.match(rule,/width:min\(100px,calc\(50% - 60px\)\)/);
 assert.match(rule,/font-size:12px/);
 assert.doesNotMatch(rule,/top:53px|right:12px|min-height:36px/);
 assert.match(art,/\.cmh-friend-invite\[data-active="true"\]\{opacity:1;visibility:visible;pointer-events:auto\}/);
 assert.match(mobile,/\.cmh-carousel-dots button\{[^}]*padding:0 8px/);
 assert.match(hero,/\.cmh-carousel-dots\{min-height:44px/);
 // On 360 and 390px phones the 44px invitation stays to the LEFT of all four
 // centered 44px-height dot hit targets (active 24px, idle 7px + 16px padding).
 for(const viewport of [360,390]){
  const carouselWidth=viewport-36; // Existing homepage horizontal padding: 18px per side
  const inviteWidth=Math.min(100,carouselWidth/2-60);
  const dotGroupWidth=24+16+3*(7+16);
  const firstDotLeft=(carouselWidth-dotGroupWidth)/2;
  assert.ok(firstDotLeft-inviteWidth>=6,viewport+": invite must not intercept pager buttons");
 }
});

test("greeting contrast and text size meet mobile accessibility requirements",()=>{
 const art=read("web-spa/src/pages/mobileHomeEffects.css");
 const rule=art.match(/\.cmh-friend-invite\{([^}]*)\}/)?.[1]||"";
 const bg=rule.match(/background:(#[0-9a-f]{6})/i)?.[1];
 const fg=rule.match(/(?:^|;)color:(#[0-9a-f]{6})/i)?.[1];
 const star=art.match(/\.cmh-friend-invite span\[aria-hidden="true"\]\{[^}]*font-size:12px;color:(#[0-9a-f]{6})\}/)?.[1];
 assert.ok(bg&&fg&&star,"Explicit legible background, text and decorative star colors");
 const luminance=hex=>{
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
 };
 const contrast=(a,b)=>{
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
 };
 assert.ok(contrast(fg,bg)>=4.5,"Visible label text must meet WCAG AA");
 assert.ok(contrast(star,bg)>=4.5,"Star also has adequate contrast");
 assert.match(rule,/font-size:12px/);
 assert.match(rule,/min-height:44px/);
 assert.match(art,/\.cmh-friend-invite-text\{[^}]*text-overflow:ellipsis;white-space:nowrap\}/);
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
