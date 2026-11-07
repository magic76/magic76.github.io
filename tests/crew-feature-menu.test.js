const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

const menuFile="web-spa/src/components/CrewFeatureMenu.tsx";
const menu=read(menuFile)+"\n"+read("web-spa/src/components/CrewFeatureMenuPanel.tsx");
const css=read("web-spa/src/components/crewFeatureMenu.css");

test("all 15 feature destinations are direct, named Crew routes",()=>{
 const targets=[...menu.matchAll(/\{id:"([a-z]+)",to:"([^"]+)"/g)];
 assert.equal(targets.length,15,"the menu should expose all 15 top-level experiences");
 assert.equal(new Set(targets.map(item=>item[1])).size,15,"unique feature keys");
 assert.equal(new Set(targets.map(item=>item[2])).size,15,"unique deep links");
 for(const [,id,to] of targets)assert.ok(to.startsWith("/")&&!to.startsWith("//"),id+" must be an internal route");
 const app=read("web-spa/src/App.tsx");
 for(const route of ["/games","/souls","/mate","/story","/fortune","/timeline","/town","/magic","/discover","/research","/me","/settings"]){
  assert.ok(app.includes('path="'+route+'"'),route+" must have a routed page");
 }
 assert.ok(app.includes('path="roles"'),"teacher/friend picker exists");
 assert.ok(app.includes('path="shorts"'),"shorts feed exists");
 assert.ok(!targets.some(([,id])=>id==="circle"),"hidden community pilot must stay hidden");
});

test("drawer is discoverable across the site while preserving the five-tab navigation",()=>{
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 assert.ok(chrome.includes("<CrewFeatureMenu/>"),"drawer belongs to the shared header");
 assert.ok(read(menuFile).includes('loadUiNamespace("featureMenu")'),"feature names must be lazy-loaded");
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
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:410px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
});

test("all 11 supported interface locales provide complete menu labels and descriptions",()=>{
 const locales=["zh-TW","en","ja","es","pt-BR","id","fr","de","ko","vi","th"];
 const featureIds=[...menu.matchAll(/\{id:"([a-z]+)",to:"/g)].map(match=>match[1]);
 for(const locale of locales){
  const common=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/common.json"));
  const dict=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/featureMenu.json"));
  for(const key of ["trigger","shortTrigger"])assert.ok(common.featureMenu?.[key]?.trim(),locale+": button "+key);
  assert.ok(dict,locale+": missing feature menu");
  for(const key of ["title","subtitle","close"])assert.ok(dict[key]?.trim(),locale+":"+key);
  for(const key of ["chat","explore","me"])assert.ok(dict.groups[key]?.trim(),locale+" group:"+key);
  assert.deepEqual(Object.keys(dict.items).sort(),featureIds.slice().sort(),locale+": feature parity");
  for(const id of featureIds)for(const field of ["title","desc"]){
   assert.ok(dict.items[id]?.[field]?.trim(),locale+":"+id+"."+field);
  }
 }
});

test("menu analytics are accepted by the private usage endpoint without leaking URLs or personal content",()=>{
 const client=read("web-spa/src/analytics/usage.ts");
 const server=read("functions/api/usage/event.ts");
 const dashboard=read("web-spa/src/analytics/UsageDashboardPage.tsx");
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
