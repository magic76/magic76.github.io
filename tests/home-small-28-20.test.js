const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");

test("#28: legacy verification SVG is bounded even as a flex item",()=>{
 const css=read("web-spa/src/pages/homeWorld.css");
 const rule=css.match(/\.crew-home-start-verify>svg\{([^}]+)\}/)?.[1];
 assert.ok(rule,"legacy settings icon must have its own scoped rule");
 for(const declaration of ["flex:0 0 22px","width:22px","height:22px","max-width:22px","max-height:22px"]){
  assert.ok(rule.includes(declaration),declaration);
 }
});

test("#28: both visible homepages render a compact card only for an unverified saved key",()=>{
 const ui=read("web-spa/src/pages/HomeGeminiVerify.tsx");
 const css=read("web-spa/src/pages/homeGeminiVerify.css");
 const desktop=read("web-spa/src/pages/DesktopHomePage.tsx");
 const mobile=read("web-spa/src/pages/MobileHomePage.tsx");
 assert.match(ui,/if\(!ready\|\|!geminiKey\(\)\|\|geminiVerified\(\)\)return null/);
 assert.match(ui,/to="\/account#settings-gemini"/);
 assert.match(ui,/t\("setup.verify"\)/);
 assert.match(ui,/t\("setup.verifyDesc"\)/);
 assert.match(desktop,/<HomeGeminiVerify variant="desktop"\/>/);
 assert.match(mobile,/<HomeGeminiVerify variant="mobile"\/>/);
 assert.ok(mobile.indexOf('<HomeGeminiVerify variant="mobile"/>')>mobile.indexOf('className="cmh-apps"'),
  "mobile card must come after all eight shortcuts");
 assert.match(css,/\.home-gemini-verify-icon svg\{[^}]*width:22px;height:22px;max-width:22px;max-height:22px/);
 assert.match(css,/\.home-gemini-verify\{[^}]*min-height:64px/);
 for(const locale of ["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"]){
  const home=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/home.json"));
  assert.equal(typeof home.setup.verify,"string",locale);
  assert.equal(typeof home.setup.verifyDesc,"string",locale);
 }
 for(const file of ["HomePage.tsx","DesktopHomePage.tsx","MobileHomePage.tsx","HomeGeminiVerify.tsx"]){
  assert.ok(Buffer.byteLength(read("web-spa/src/pages/"+file))<26000,file);
 }
});

test("#20: first visit is ineligible, a different session counts as a return",()=>{
 const ui=read("web-spa/src/components/CrewInstallEntry.tsx");
 const start=ui.indexOf("function hasReturnVisit(){");
 const end=ui.indexOf("\n}\nfunction canShowCrewInstallNudge",start);
 assert.ok(start>=0&&end>start,"visit guard function missing");
 const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v))};};
 const ctx={localStorage:storage(),sessionStorage:storage()};
 const check=vm.runInNewContext('const HOME_VISITED_KEY="crew_pwa_home_visited_v1";const HOME_VISIT_SESSION_KEY="crew_pwa_home_visit_session_v1";\n'+ui.slice(start,end+2)+"\nhasReturnVisit",ctx);
 assert.equal(check(),false,"fresh visitors never get a nudge just by opening Home");
 assert.equal(check(),false,"same session navigation is not a return visit");
 ctx.sessionStorage=storage();
 assert.equal(check(),true,"new browsing session is a return visit");
});

test("#20: install invitation is allowed only after a conversation or return and respects snooze",()=>{
 const ui=read("web-spa/src/components/CrewInstallEntry.tsx");
 const body=ui.match(/function canShowCrewInstallNudge\([^)]*\)\{([\s\S]*?)\n\}/)?.[1];
 assert.ok(body,"test the exact eligibility expression shipped in the component");
 const eligible=new Function("engaged","returning","snooze","now",body);
 const now=Date.now();
 assert.equal(eligible(false,false,null,now),false,"brand-new visitor");
 assert.equal(eligible(true,false,null,now),true,"completed conversation or other meaningful use");
 assert.equal(eligible(false,true,null,now),true,"returning visitor");
 assert.equal(eligible(true,true,"never",now),false);
 assert.equal(eligible(true,true,String(now+1000),now),false,"snoozed");
 assert.equal(eligible(true,false,String(now-1000),now),true,"snooze expired");
 assert.match(ui,/localStorage.getItem\(ENGAGED_KEY\)==="1"/);
 assert.match(ui,/window.addEventListener\("crew-pwa-engaged"/);
});

test("#20: nudge sits above the five-tab dock and close target is at least 44px",()=>{
 const css=read("web-spa/src/components/crewInstallEntry.css");
 const nav=read("web-spa/src/components/mobileNavigation.css");
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 const ui=read("web-spa/src/components/CrewInstallEntry.tsx");
 assert.match(nav,/\.crew-mobile-dock\{[\s\S]*?position:fixed;[\s\S]*?bottom:calc\(8px \+ env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(nav,/z-index:70/);
 assert.match(css,/\.crew-install-nudge\{[^}]*z-index:65;bottom:calc\(var\(--nav-h,68px\) \+ 20px \+ env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(css,/max-height:calc\(100dvh/);
 assert.match(css,/@media\(min-width:768px\)/);
 assert.match(css,/\.crew-install-nudge-close\{[^}]*min-width:44px;min-height:44px/);
 assert.match(ui,/className="crew-install-nudge-close" aria-label=\{copy.close\}/);
 assert.match(chrome,/export function MobileBottomNav/);
 assert.match(chrome,/NAV_SECTIONS.map/);
});
