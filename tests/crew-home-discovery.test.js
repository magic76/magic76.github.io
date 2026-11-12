const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=p=>readFileSync(path.join(__dirname,"..",p),"utf8");

test("Home discovery keeps one manual primary CTA and SSR-readable first sentence",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const copy=read("web-spa/src/pages/HomeDiscoveryLine.tsx");
 assert.match(portal,/<HomeDiscoveryLine animate=\{canAnimate&&!manuallySelected\}\/>/);
 assert.match(portal,/className="crew-portal-description"/);
 assert.match(portal,/<div className="crew-portal-discovery-slot">\{mode==="chat"&&!selectedPost&&<HomeDiscoveryLine/);
 const layout=read("web-spa/src/pages/homeLayout2.css");
 assert.match(layout,/\.crew-home-legacy \.crew-portal-layout2 \.crew-portal-discovery-slot\{[^}]*height:74px;min-height:74px/);
 assert.ok(portal.indexOf('className="crew-portal-cta"')<portal.indexOf('className="crew-portal-discovery-slot"'));
 assert.ok(portal.includes('<HomeModeRail prefix="crew-portal-mode"'));
 assert.equal((portal.match(/className="crew-portal-cta"/g)||[]).length,1);
 assert.match(portal,/onChange=\{onModeChange\}/);
 assert.match(copy,/useState<number\|null>\(null\)/);
 assert.match(copy,/const visible=!animate\|\|count===null\?phrase/);
 assert.match(copy,/aria-label=\{phrase\}/);
 assert.doesNotMatch(copy,/setInterval\(|window.location|navigate\(/);
 assert.match(copy,/return\(\)=>window.clearTimeout\(timer\)/);
 assert.match(copy,/onFocus=\{\(\)=>setFocused\(true\)\}/);
 assert.match(copy,/onPointerEnter=\{\(\)=>setHover\(true\)\}/);
});
test("Discovery cycles faster while keeping hover and keyboard focus pauses",()=>{
 const copy=read("web-spa/src/pages/HomeDiscoveryLine.tsx");
 assert.match(copy,/const delay=phase==="hold"\?2000:phase==="erase"\?20:40;/);
 assert.match(copy,/if\(!animate\|\|hover\|\|focused\)return;/);
});
test("Discovery phrases and headline are present in each of the eleven supported locales",()=>{
 const langs=["zh-TW","en","de","es","fr","id","ja","ko","pt-BR","th","vi"];
 for(const lang of langs){
  const world=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/home.json")).world;
  assert.ok(world.modes.chat.lead&&world.modes.chat.accent,lang+":headline");
  assert.ok(world.discovery.intro,lang+":intro");
  for(const key of ["item0","item1","item3","item4"]){
   const phrase=world.discovery[key];
   assert.ok(typeof phrase==="string"&&phrase.trim().length>4,lang+":"+key);
  }
  assert.equal(world.discovery.item2,undefined,lang+":removed duplicate");
  assert.equal(typeof JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/home.json")).liveBubble.start,"string");
 }
});
test("Mobile portrait keeps discovery visible without affecting compact landscape or reduced-motion",()=>{
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(css,/\.crew-portal-discovery-slot\{display:flex/);
 assert.match(css,/\.crew-portal-discovery-link\{[^}]*min-height:44px/);
 assert.match(css,/\.crew-home-portal \.crew-portal-discovery-slot\{display:none\}/);
 const line=read("web-spa/src/pages/HomeDiscoveryLine.tsx");
 for(const [url,key] of [["/games/1a2b","item0"],["/souls","item1"],["/teacher/vocabulary","item3"],["/story","item4"]]){
  assert.ok(line.includes('to:"'+url+'"')&&line.includes('phrase:"'+key+'"'),url);
 }
 assert.match(line,/t\("world\.discovery\."\+item\.phrase\)/);
 assert.doesNotMatch(line,/friend\/live|chat=text/);
 assert.match(css,/@media\(max-width:700px\) and \(max-height:700px\) and \(orientation:portrait\)/);
 assert.match(css,/\.crew-home-portal \.crew-portal-discovery-slot\{display:flex/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.crew-portal-discovery-caret\{animation:none\}\}/);
});

test("Zoe bubble calls out voice in every language without clipping the label",()=>{
 const css=read("web-spa/src/pages/homeLiveBubble.css");
 assert.match(css,/\.crew-live-bubble-label\{[^}]*white-space:nowrap/);
 assert.match(css,/\.crew-live-bubble-label\{[^}]*overflow:visible/);
 assert.doesNotMatch(css,/\.crew-live-bubble-label\{[^}]*text-overflow:ellipsis/);
 assert.match(css,/\.crew-live-bubble-label\{[^}]*font-size:12px/);
 assert.match(css,/\.crew-live-bubble-label\{[^}]*overflow-wrap:normal/);
 assert.match(css,/@media\(max-width:700px\) and \(max-height:670px\) and \(orientation:portrait\)\{\.crew-home-live-bubble\{bottom:calc\(var\(--nav-h,68px\) \+ env\(safe-area-inset-bottom,0px\)\)\}\}/);
 const starts={"zh-TW":"語音開聊","en":"Voice","de":"Audio","es":"Voz","fr":"Vocal","id":"Suara","ja":"音声会話","ko":"음성대화","pt-BR":"Voz","th":"แชตเสียง","vi":"Thoại"};
 for(const [lang,label] of Object.entries(starts)){
  const home=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/home.json"));
  assert.equal(home.liveBubble.start,label,lang);
 }
});
