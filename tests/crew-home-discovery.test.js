const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=p=>readFileSync(path.join(__dirname,"..",p),"utf8");

test("Home discovery keeps one manual primary CTA and SSR-readable first sentence",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const copy=read("web-spa/src/pages/HomeDiscoveryLine.tsx");
 assert.match(portal,/<HomeDiscoveryLine animate=\{canAnimate&&!manuallySelected\}\/>/);
 assert.match(portal,/data-discovery=\{mode==="chat"&&!selectedPost\?"true":"false"\}/);
 assert.equal((portal.match(/className="crew-portal-cta"/g)||[]).length,1);
 assert.match(portal,/onClick=\{\(\)=>\{setMode\(item.id\);setManuallySelected\(true\)\}\}/);
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
  for(let i=0;i<5;i++){
   const phrase=world.discovery["item"+i];
   assert.ok(typeof phrase==="string"&&phrase.trim().length>4,lang+":"+i);
  }
 }
});
test("Mobile portrait keeps discovery visible without affecting compact landscape or reduced-motion",()=>{
 const css=read("web-spa/src/pages/homePortal.css");
 assert.match(css,/\.crew-portal-description\[data-discovery="true"\]/);
 assert.match(css,/@media\(max-width:700px\) and \(max-height:700px\) and \(orientation:portrait\)/);
 assert.match(css,/\.crew-home-portal \.crew-portal-description\[data-discovery="true"\]\{display:flex/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.crew-portal-discovery-caret\{animation:none\}\}/);
});
