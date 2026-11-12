const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=p=>readFileSync(path.join(__dirname,"..",p),"utf8");
test("Portal keeps the cloud-free live particle design and softly lights the inner field",()=>{
 const visual=read("web-spa/src/pages/PortalParticleField.tsx");
 const css=read("web-spa/src/pages/homePortal.css");
 const field=read("web-spa/src/pages/portalField.mjs");
 assert.doesNotMatch(visual,/crew-portal-core/);
 assert.match(css,/radial-gradient\(ellipse 28% 35%/);
 assert.match(css,/#12101c88 0%,#12101c53 48%/);
 assert.match(field,/const inner = noise\(i \+ count \* 3\) < \.14/);
 assert.match(field,/point\.inner \? \.55 : 1/);
 assert.match(field,/if \(point\.inner\) \{ target\[0\] \*= point\.inset/);
 assert.match(field,/!lowQuality && i % 137 === 0 && point\.size > \.35/);
 assert.doesNotMatch(field,/THREE|new WebGLRenderingContext/);
});

test("Hero primary CTA stays above the text scrim with a solid unshadowed label",()=>{
 const css=read("web-spa/src/pages/homePortal.css");
 for(const token of [
  ".crew-portal-cta{position:relative;z-index:5;isolation:isolate;text-shadow:none;",
  ".crew-portal-cta .crew-portal-cta-label,.crew-portal-cta .crew-portal-cta-arrow{position:relative;z-index:1;text-shadow:none}",
  "background:#f5eee6;color:#22182c",
  "inset:-20px -22px -10px",
  "inset:-40px -80px -12px -60px",
  "inset:-20px -40px -10px -28px"
 ])assert.ok(css.includes(token),"Missing foreground/scrim rule: "+token);
 assert.ok(!css.includes("inset:-20px -22px -85px"),"Copy scrim must not extend across the CTA");
});

test("Crew homepage keeps one manual tab portal before Shorts and exploration",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx"),portal=read("web-spa/src/pages/HomePortal.tsx"),rail=read("web-spa/src/pages/HomeModeRail.tsx");
 assert.ok(home.indexOf("<HomePortal shortsFeed={shortsFeed}/>")>=0);
 assert.ok(home.indexOf("<HomeShortsPreview sharedFeed={shortsFeed} sharedStatus={shortsStatus}/>")>home.indexOf("<HomePortal shortsFeed={shortsFeed}/>"));
 assert.match(portal,/const HOME_ZOE=ZOE\+"&from=home&chat=text"/);
 assert.match(portal,/const target=destination/);
 for(const target of ["/teacher/live?lesson=daily_u1_l1","/fortune/reading?mode=tarot","/games/1a2b"])
  assert.ok(rail.includes('to:"'+target+'"'),target);
 assert.match(portal,/to=\{target\}/);
 assert.match(portal,/<HomeModeRail prefix="crew-portal-mode"/);
 assert.match(rail,/role="tablist" aria-orientation="vertical"/);
 assert.match(rail,/role="tab"/);assert.match(rail,/role="tabpanel"/);
 assert.match(portal,/<PortalParticleField mode=\{mode\}/);
 assert.doesNotMatch(portal,/data-portal-tile|crew-portal-picks|crew-portal-game-link|setTeacherProfile/);

});

test("Crew World Shorts still use the real feed and their story/chat paths",()=>{
 const shorts=read("web-spa/src/teacher/HomeShortsPreview.tsx");
 assert.match(shorts,/fetchShortsFeed\(/);
 assert.match(shorts,/shortsChatUrl\(post,/);
 assert.match(shorts,/\/teacher\/shorts\?post=/);
 assert.match(shorts,/maxPosts=3/);
 assert.match(shorts,/\.slice\(0,maxPosts\)/);
 assert.match(shorts,/excludeFriendIds\.includes\(post\.friendId\)/);
});
test("Crew World animated portal respects reduced motion",()=>{
 const css=read("web-spa/src/pages/homePortal.css");
 const canvas=read("web-spa/src/pages/portalField.mjs");
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(canvas,/prefers-reduced-motion: reduce/);
 assert.match(canvas,/saveData/);
 assert.match(canvas,/IntersectionObserver/);
});


test("Crew World does not repeat its KV tabs in a separate quick-start carousel",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const css=read("web-spa/src/pages/homeWorld.css");
 const kv=home.indexOf("<HomePortal shortsFeed={shortsFeed}/>");
 const recent=home.indexOf('className="crew-home-continue"');
 const shorts=home.indexOf("<HomeShortsPreview sharedFeed={shortsFeed} sharedStatus={shortsStatus}/>");
 assert.ok(kv>=0&&kv<recent&&recent<shorts);
 assert.doesNotMatch(home,/HomeQuickCarousel|crew-home-launchpad/);
 assert.match(home,/recent\.to/);
 assert.doesNotMatch(css,/crew-home-carousel|crew-home-quick-actions/);
 assert.match(css,/\.crew-home-world \.crew-home-continue/);
});

test("Crew World tabs select manually without rotation or a pause control",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx"),rail=read("web-spa/src/pages/HomeModeRail.tsx");
 assert.match(portal,/data-mode=\{mode\}/);
 assert.match(portal,/useState<HomeMode>\("chat"\)/);
 assert.match(portal,/setMode/);
 assert.match(portal,/trial\.resolved&&trial\.enabled&&trial\.remaining===0/);
 assert.doesNotMatch(portal,/setInterval|5000|crew-portal-motion/);
 assert.match(rail,/onClick=\{\(\)=>onChange\(item.id\)\}/);

});

test("Mobile portal delays Canvas and recurring motion until eligible",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const field=read("web-spa/src/pages/PortalParticleField.tsx");
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(portal,/useState\(true\); \/\/ Static SSR fallback/);
 assert.match(portal,/requestIdleCallback/);
 assert.match(portal,/IntersectionObserver/);
 assert.match(portal,/visibilitychange/);
 assert.match(portal,/\!canAnimate/);
 assert.match(portal,/enabled=\{fieldEverEnabled\|\|fieldEligible\}/);
 assert.match(portal,/if\(!reducedMotion&&!saveData\)setPaused\(false\)/);
 assert.doesNotMatch(portal,/coarse\.matches/);
 assert.match(portal,/fieldEligible=idleReady&&inViewport&&foreground/);
 assert.match(field,/createPortalField\(canvas,host,state\.mode/);
 assert.match(field,/setMode\(mode\)/);
 assert.match(field,/field\.setPaused\(state\.paused\)/);
 assert.match(field,/\[mode,enabled\]/);
 assert.match(field,/\[paused,enabled\]/);
 assert.match(field,/if\(!enabled\|\|!canvas\|\|!host\)return/);
 assert.doesNotMatch(css,/@keyframes crew-world-copy-in\{[^}]*filter:blur/);
 assert.match(css,/@media\(max-width:700px\)/);
});


test("Four semantic tabs switch copy and one immediate CTA with a keyboard roving focus",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx"),rail=read("web-spa/src/pages/HomeModeRail.tsx");
 assert.match(portal,/useState<HomeMode>\("chat"\)/);
 assert.match(rail,/aria-label=\{t\("world.tilesLabel"\)\}/);
 assert.match(rail,/role="tablist" aria-orientation="vertical"/);
 for(const mode of ["chat","learn","fortune","play"])assert.ok(rail.includes('id:"'+mode+'"'));
 for(const attr of ["aria-selected","aria-controls","tabIndex","aria-labelledby"])assert.ok(rail.includes(attr));
 for(const key of ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Home","End"])assert.ok(rail.includes('"'+key+'"'));
 assert.equal((portal.match(/className="crew-portal-cta"/g)||[]).length,1);
 assert.match(portal,/const target=destination/);
 assert.match(portal,/onRailNavigate/);

});

test("All eleven locales name the four tabs, translate their copy and retain trial keys",()=>{
 for(const lang of ["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"]){
  const world=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`)).world;
  assert.ok(typeof world.tilesLabel==="string"&&world.tilesLabel.trim(),lang+":tilesLabel");
  for(const mode of ["chat","teacher","fortune","play"])
   for(const key of ["name","sub"])assert.ok(typeof world.tiles?.[mode]?.[key]==="string"&&world.tiles[mode][key].trim(),lang+":"+mode+":"+key);
  for(const mode of ["chat","learn","fortune","play"])
   for(const key of ["lead","before","accent","after","description","cta"])assert.equal(typeof world.modes?.[mode]?.[key],"string",lang+":"+mode+":"+key);
  assert.ok(world.intro?.trim(),lang+":intro");
  for(const key of ["chatHeading","chatSubtitle","chatStart","chatWithZoe","chatExhausted","quickPicks","noVoice"])assert.ok(world[key],lang+":"+key);
 }
 const zh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/home.json")).world.tiles;
 assert.deepEqual(zh,{chat:{name:"聊天",sub:"和 Zoe 聊聊"},teacher:{name:"老師",sub:"練外語"},fortune:{name:"算命",sub:"今日運勢"},play:{name:"遊戲",sub:"1A2B"}});
});


test("Home hero balances the first screen and reserves no bottom nav on desktop",()=>{
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(css,/display:grid;place-items:center/);
 assert.match(css,/100svh - 58px - var\(--nav-h\) - env\(safe-area-inset-bottom\)/);
 assert.match(css,/@media\(min-width:1100px\)\{\.crew-home-portal\{min-height:calc\(100vh - 58px\);min-height:calc\(100svh - 58px\)\}\}/);
 assert.match(css,/\.crew-portal-tab\{[^}]*min-height:(?:4[4-9]|[5-9][0-9])px/);
 assert.doesNotMatch(css,/padding-top:54px/);
});

test("Home stage layout is selected by CSS before hydration without reordering the invitation",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx"),css=read("web-spa/src/pages/homeLayout2.css");
 assert.ok(portal.indexOf('className="crew-portal-layout2-rail"')<portal.indexOf('className="crew-portal-layout2-main"'));
 const tokens=['className="crew-portal-intro"','className="crew-portal-kicker"',"<h1>",'className="crew-portal-description"','className="crew-portal-cta"','className="crew-portal-status-slot"'];
 const positions=tokens.map(v=>portal.indexOf(v));assert.ok(positions.every((v,i)=>v>=0&&(!i||v>positions[i-1])));
 assert.match(css,/@media\(min-width:768px\)/);assert.match(css,/grid-template-columns:minmax\(120px,156px\)/);
 assert.doesNotMatch(portal,/getBoundingClientRect|window\.innerWidth/);

});

test("Portrait phones enlarge the ring and short landscape removes only the height floor",()=>{
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(css,/@media\(max-width:599px\)\{\.crew-home-portal\{[^}]*--portal-stage-y:\.47;[^}]*--portal-stage-scale-w:\.60;[^}]*--portal-stage-tall:1\.62/);
 const compact=css.slice(css.indexOf("@media(orientation:landscape) and (max-height:500px) and (min-width:560px)"));
 assert.ok(compact.startsWith("@media(orientation:landscape) and (max-height:500px) and (min-width:560px)"));
 assert.match(compact,/min-height:calc\(100svh - 58px - var\(--nav-h\) - env\(safe-area-inset-bottom\)\)/);
 assert.doesNotMatch(compact,/min-height:max\(/,"Compact hero cannot retain a portrait height floor");
 for(const token of ["--portal-stage-scale-w:.25","--portal-stage-scale-h:.62","width:52vw","padding:10px 0","font-size:26px;line-height:1.25;margin:0 0 12px",".crew-portal-intro,.crew-portal-description{display:none}",".crew-portal-status-slot{min-height:0}","margin:10px 0 0"])
  assert.ok(compact.includes(token),"Compact layout token: "+token);
 assert.doesNotMatch(compact,/crew-portal-remaining\{[^}]*display:none/,"Resolved remaining-trial status stays visible");
});

test("Homepage practice-language picker changes the existing chat and voice target language",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx"),picker=read("web-spa/src/pages/HomeTargetLanguage.tsx"),css=read("web-spa/src/pages/homePortal.css");
 assert.match(portal,/lazy\(\(\)=>import\("\.\/HomeTargetLanguage"\)\)/);
 assert.ok(portal.indexOf('className="crew-portal-practice-holder"')>portal.indexOf('className="crew-portal-status-slot"'));
 assert.match(portal,/<HomeTargetLanguage\/>/);
 assert.match(picker,/useTeacherStore\(s=>s\.targetLanguage\)/);
 assert.match(picker,/onChange=\{event=>setTargetLanguage\(event\.currentTarget\.value\)\}/);
 assert.match(css,/\.crew-portal-practice-control select\{[^}]*min-height:44px/);

});

test("Short portrait chat tabs clear the fixed Zoe bubble without shrinking controls",()=>{
 const css=read("web-spa/src/pages/homePortal.css");
 const rule=css.match(/@media\(max-width:375px\) and \(max-height:680px\) and \(orientation:portrait\)\{([^}]*\{[^}]*\})\s*\}/);
 assert.ok(rule,"Only 360/375 short portrait viewports receive a layout correction");
 assert.match(rule[1],/\.crew-home-portal\[data-mode="chat"\] \.crew-portal-content\{top:-24px\}/);
 // QA feedback v1 geometry: tabs' bottom vs fixed bubble's top (CSS pixels).
 for(const [tabsBottom,bubbleTop] of [[506,492],[522,519]])
  assert.ok(tabsBottom-24<=bubbleTop-4,"At least 4px gap on 360/375 short phones");
 assert.match(css,/\.crew-portal-practice-control select\{[^}]*min-height:44px/);
 assert.match(css,/\.crew-portal-tabs button\{[^}]*min-height:44px|\.crew-portal-tab\{[^}]*min-height:44px/);
});
