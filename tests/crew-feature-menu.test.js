const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

const menuFile="web-spa/src/components/CrewFeatureMenu.tsx";
const menu=read(menuFile)+"\n"+read("web-spa/src/components/CrewFeatureMenuPanel.tsx");
const css=read("web-spa/src/components/crewFeatureMenu.css");

test("all 33 feature destinations are direct, existing Crew routes",()=>{
 const targets=[...menu.matchAll(/\{id:"([a-zA-Z0-9]+)",to:"([^"]+)"/g)];
 assert.equal(targets.length,33,"the directory should expose all 33 verified destinations");
 assert.equal(new Set(targets.map(item=>item[1])).size,33,"unique feature keys");
 assert.equal(new Set(targets.map(item=>item[2])).size,33,"unique deep links");
 for(const [,id,to] of targets)assert.ok(to.startsWith("/")&&!to.startsWith("//"),id+" must be an internal route");
 const app=read("web-spa/src/App.tsx");
 for(const route of ["/games","/souls","/mate","/story","/fortune","/timeline","/town","/magic","/discover","/research","/me","/settings","/feedback"]){
  assert.ok(app.includes('path="'+route+'"'),route+" must have a routed page");
 }
 assert.ok(app.includes('path="roles"'),"teacher/friend picker exists");
 assert.ok(app.includes('path="shorts"'),"shorts feed exists");
 const teacherRoutes=["course","vocabulary","pronunciation","textbook","phrasebook","reading-library","reports","memory"];
 for(const route of teacherRoutes)assert.ok(app.includes('path="'+route+'"'),"teacher deep link "+route+" must exist");
 for(const route of ["/games/gomoku","/games/1a2b","/games/number-bomb","/games/memory"]){
  assert.ok(app.includes('path="'+route+'"'),route+" must be directly routed");
 }
 assert.ok(app.includes('path="/games/:gameId"'),"connect4 and reversi use the game-id route");
 for(const route of ["me","history"])assert.ok(app.includes('path="'+route+'"'),route+" nested story/fortune route must exist");
 assert.ok(menu.includes('/settings#memory-settings'),"friend memory settings remain accessible");
 assert.ok(!targets.some(([,id])=>id==="circle"),"hidden community pilot must stay hidden");
 assert.deepEqual([...menu.matchAll(/\{id:"([a-z]+)",icon:"[^"]+",items:\[/g)].map(m=>m[1]),["chat","learn","games","explore","me"],"directory has five ordered categories");
});

test("drawer is discoverable across the site while preserving the five-tab navigation",()=>{
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 assert.ok(chrome.includes("<CrewFeatureMenu/>"),"drawer belongs to the shared header");
 assert.ok(read(menuFile).includes("component.loadCrewFeatureMenuLocale()"),"feature names must be lazy-loaded");
 assert.ok(read("web-spa/src/components/crewFeatureMenuLocale.ts").includes("import.meta.glob"),"locale catalogs stay out of the main loader");
 assert.ok(read(menuFile).includes('import("./CrewFeatureMenuPanel")'),"full overlay must be lazy-loaded");
 for(const id of ["home","chat","explore","learn","me"])assert.ok(chrome.includes('id:"'+id+'"'),id+" tab remains");
 assert.match(menu,/aria-haspopup="dialog"/);
 assert.match(menu,/aria-expanded=\{open\}/);
 assert.match(menu,/aria-modal="true"/);
 assert.match(menu,/event.key==="Escape"/);
 assert.match(menu,/event.key!=="Tab"/);
 assert.match(menu,/document.body.style.overflow="hidden"/);
 assert.match(menu,/setOpen\(false\)/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/grid-template-rows:0fr/);
 assert.match(css,/grid-template-rows:1fr/);
 assert.match(css,/crew-feature-menu-group-trigger/);
 assert.match(css,/min-height:58px/);
 assert.match(css,/@media\(max-width:410px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
});

test("all 11 supported interface locales provide complete menu labels and descriptions",()=>{
 const locales=["zh-TW","en","ja","es","pt-BR","id","fr","de","ko","vi","th"];
 const featureIds=[...menu.matchAll(/\{id:"([a-zA-Z0-9]+)",to:"/g)].map(match=>match[1]);
 for(const locale of locales){
  const common=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/common.json"));
  const dict=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/featureMenu.json"));
  for(const key of ["trigger","shortTrigger"])assert.ok(common.featureMenu?.[key]?.trim(),locale+": button "+key);
  assert.ok(dict,locale+": missing feature menu");
  for(const key of ["title","subtitle","close"])assert.ok(dict[key]?.trim(),locale+":"+key);
  for(const key of ["chat","learn","games","explore","me"])assert.ok(dict.groups[key]?.trim(),locale+" group:"+key);
  assert.ok(dict.featureCount?.trim(),locale+": missing feature count label");
  assert.deepEqual(Object.keys(dict.items).sort(),featureIds.slice().sort(),locale+": feature parity");
  for(const id of featureIds)for(const field of ["title","desc"]){
   assert.ok(dict.items[id]?.[field]?.trim(),locale+":"+id+"."+field);
  }
 }
});

test("menu analytics are accepted by the private usage endpoint without leaking URLs or personal content",()=>{
 const client=read("web-spa/src/analytics/usage.ts");
 const server=read("functions/api/usage/event.ts");
 const dashboard=read("web-spa/src/analytics/usageDashboardDefinitions.ts");
 for(const event of ["menu_open","menu_item_click"]){
  for(const src of [client,server,dashboard])assert.ok(src.includes('"'+event+'"')||src.includes(event+":"),event+" missing in analytics");
 }
 for(const detail of ["discover","me"]){
  assert.ok(client.includes('"'+detail+'"'));
  assert.ok(server.includes('"'+detail+'"'));
 }
 assert.match(menu,/trackUsageEvent\("menu_item_click",item.detail\)/);
 assert.ok(!menu.includes("window.location.href"),"tracking must not include full navigation URLs");
});

test("feature menu opens and collapses smoothly without cutting off navigation",()=>{
 const panel=read("web-spa/src/components/CrewFeatureMenuPanel.tsx");
 assert.match(panel,/data-state=\{closing\?"closing":"open"\}/);
 assert.match(panel,/const \[closing,setClosing\]=useState\(false\)/);
 assert.match(panel,/const beginClose=useCallback/);
 assert.match(panel,/destinationRef\.current=destination\|\|null/);
 assert.match(panel,/event\.preventDefault\(\)/);
 assert.match(panel,/beginClose\(item\.to\)/);
 assert.match(panel,/onAnimationEnd=\{event=>\{if\(closing&&event\.target===event\.currentTarget\)finishClose\(\)\}\}/);
 assert.match(panel,/setTimeout\(finishClose,reduced\?0:270\)/);
 assert.match(panel,/finishedRef\.current/);
 assert.match(css,/crew-menu-slide-in/);
 assert.match(css,/crew-menu-slide-out/);
 assert.match(css,/crew-menu-fade-in/);
 assert.match(css,/crew-menu-fade-out/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test("five-group accordion is accessible, keyboard-safe and directly navigable",()=>{
 const panel=read("web-spa/src/components/CrewFeatureMenuPanel.tsx");
 assert.match(panel,/const \[expandedGroup,setExpandedGroup\]=useState<string\|null>\("chat"\)/);
 assert.match(panel,/setExpandedGroup\(current=>current===group\.id\?null:group\.id\)/);
 assert.match(panel,/aria-expanded=\{expanded\}/);
 assert.match(panel,/aria-controls=\{listId\}/);
 assert.match(panel,/aria-hidden=\{!expanded\}/);
 assert.match(panel,/tabIndex=\{expanded\?0:-1\}/);
 assert.match(panel,/a\[href\]:not\(\[tabindex="-1"\]\)/);
 assert.match(panel,/beginClose\(item\.to\)/);
 assert.match(css,/crew-feature-menu-branch\[data-expanded="true"\]/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test("accordion disclosure uses plus/minus instead of up/down arrows",()=>{
 const panel=read("web-spa/src/components/CrewFeatureMenuPanel.tsx");
 assert.match(panel,/className="crew-feature-menu-disclosure" aria-hidden="true">\s*<svg/);
 assert.match(panel,/className="crew-feature-menu-disclosure-plus" d="M12 6v12"/);
 assert.match(panel,/aria-expanded=\{expanded\}/);
 assert.doesNotMatch(panel,/className="crew-feature-menu-chevron"/);
 assert.doesNotMatch(panel,/crew-feature-menu-chevron" aria-hidden="true">⌄/);
 assert.match(css,/\.crew-feature-menu-disclosure svg\{display:block;width:17px;height:17px\}/);
 assert.match(css,/\.crew-feature-menu-group-trigger\[aria-expanded="true"\] \.crew-feature-menu-disclosure-plus\{opacity:0;transform:rotate\(90deg\)\}/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test("item navigation keeps the slim vector chevron",()=>{
 const panel=read("web-spa/src/components/CrewFeatureMenuPanel.tsx");
 assert.match(panel,/className="crew-feature-menu-link-arrow" aria-hidden="true">\s*<svg/);
 assert.doesNotMatch(panel,/crew-feature-menu-link-arrow" aria-hidden="true">›/);
 assert.match(css,/\.crew-feature-menu-link-arrow svg\{display:block;width:16px;height:16px\}/);
});
