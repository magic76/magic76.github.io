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
 // The translated UI must still take its quota from the Worker-aligned shared constant.
 assert.match(panel,/t\(["']textChat\.ui\.freeDaily["']\s*,\s*\{\s*count\s*:\s*dailyLimit\s*\}\s*\)/);
 for(const lang of locales){
  const freeDaily=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/voice.json`)).textChat?.ui?.freeDaily;
  assert.equal(typeof freeDaily,"string",lang+":textChat.ui.freeDaily");
  assert.match(freeDaily,/\{\{count\}\}/,lang+":textChat.ui.freeDaily must interpolate count");
 }
 assert.doesNotMatch(panel,/Up to 12 messages|每天最多 12 則/);
});

test("active home surfaces do not advertise quotas; legacy portal remains inert",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 for(const source of [read("web-spa/src/pages/MobileHomePage.tsx"),read("web-spa/src/pages/DesktopHomePage.tsx")])assert.doesNotMatch(source,/useGuestTrialQuota|world\.freeAllowance|cmh-allowance-slot/);
 assert.match(home,/className="crew-home-legacy" aria-hidden="true" inert/);
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
