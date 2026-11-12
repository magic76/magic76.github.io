const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const locales=["zh-TW","en","ja","es","pt-BR","id","ko","fr","de","vi","th"];

test("guest text allowance agrees with the Worker DAILY_TURNS",()=>{
 const worker=read("workers/guest-trial/text-chat.mjs");
 const constant=read("web-spa/src/live/guestAllowance.ts");
 const backend=worker.match(/\bDAILY_TURNS\s*=\s*(\d+)\b/);
 const frontend=constant.match(/\bGUEST_TEXT_DAILY_TURNS\s*=\s*(\d+)\b/);
 assert.ok(backend,"Worker must expose DAILY_TURNS");
 assert.ok(frontend,"front end must expose the shared quota");
 assert.equal(Number(frontend[1]),Number(backend[1]));
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 assert.match(panel,/\$\{GUEST_TEXT_DAILY_TURNS\}/);
 assert.doesNotMatch(panel,/Up to 12 messages|每天最多 12 則/);
});

test("desktop and mobile both show localized truthful allowance, never a second remaining-trial line",()=>{
 const desktop=read("web-spa/src/pages/HomePortal.tsx");
 const mobile=read("web-spa/src/pages/MobileHomePage.tsx");
 const desktopCss=read("web-spa/src/pages/homePortal.css");
 const mobileCss=read("web-spa/src/pages/mobileHomeHeroV3.css");
 for(const [name,source] of [["desktop",desktop],["mobile",mobile]]){
  assert.match(source,/GUEST_TEXT_DAILY_TURNS/,name);
  for(const key of ["full","textOnly","voiceUsed"])assert.ok(source.includes(`world.freeAllowance.${key}`),name+":"+key);
  assert.match(source,/!hasKey/,name+":hide for BYOK");
  assert.match(source,/trial\.seconds\/60/,name+":minutes from config");
  assert.doesNotMatch(source,/freeAllowance[^\n]*\b(?:12|5)\b/,name+":no hardcoded quotas");
 }
 assert.match(desktop,/className="crew-portal-remaining" role="status"/);
 assert.doesNotMatch(desktop,/common:guestTrial\.(?:memberRemaining|remaining)/);
 assert.match(desktopCss,/\.crew-portal-invitation-meta \.crew-portal-status-slot\{order:-1/);
 assert.match(mobile,/className="cmh-allowance-slot"/);
 assert.match(mobileCss,/\.cmh-allowance-slot\{min-height:36px/);
 assert.match(mobileCss,/\.cmh-free-allowance\{font-size:12px/);
});

test("BYOK hides allowance slots entirely; guests keep the preexisting reserved space",()=>{
 const desktop=read("web-spa/src/pages/HomePortal.tsx");
 const mobile=read("web-spa/src/pages/MobileHomePage.tsx");
 const desktopCss=read("web-spa/src/pages/homePortal.css");
 const layoutCss=read("web-spa/src/pages/homeDesktopLayout.css");
 const mobileCss=read("web-spa/src/pages/mobileHomeHeroV3.css");
 for(const [name,source] of [["desktop",desktop],["mobile",mobile]]){
  assert.match(source,/const hasKey=ready&&Boolean\(geminiKey\(\)\)/,name+": key detection after hydration");
 }
 // The slot node, not only its status text, must disappear when BYOK is ready.
 assert.match(mobile,/\{!hasKey&&<div className="cmh-allowance-slot">/,"BYOK has no 36px mobile slot");
 assert.match(desktop,/\{!hasKey&&<div className="crew-portal-status-slot">/,"BYOK has no empty desktop slot");
 // On the SSG first render hasKey is false: preserve the guest layout and quota status.
 assert.match(mobile,/\{ready&&!hasKey&&<p className="cmh-free-allowance" role="status">/);
 assert.match(desktop,/ready&&!hasKey&&trial\.resolved&&trial\.enabled/);
 assert.match(mobileCss,/\.cmh-allowance-slot\{min-height:36px/);
 assert.match(desktopCss,/\.crew-portal-invitation-meta \.crew-portal-status-slot\{order:-1;min-height:38px/);
 assert.match(layoutCss,/\.crew-home-legacy \.crew-portal-status-slot\{min-height:19px/);
});

test("all 11 home locales use string leaves and quota interpolation",()=>{
 for(const lang of locales){
  const allowance=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`)).world.freeAllowance;
  for(const key of ["full","textOnly","voiceUsed"]){
   assert.equal(typeof allowance?.[key],"string",lang+":"+key);
   assert.match(allowance[key],/\{\{count\}\}/,lang+":"+key);
   assert.ok(allowance[key].length<180,lang+":"+key+" too long");
  }
  assert.match(allowance.full,/\{\{minutes\}\}/,lang+":full");
 }
});

test("edited TSX files remain below the 26KB cap",()=>{
 for(const path of ["web-spa/src/pages/HomePortal.tsx","web-spa/src/pages/MobileHomePage.tsx","web-spa/src/live/TextChatPanel.tsx"])
  assert.ok(fs.statSync(require("node:path").join(root,path)).size<26000,path);
});
