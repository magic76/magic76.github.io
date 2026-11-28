const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=p=>readFileSync(path.resolve(__dirname,"..",p),"utf8");

test("bottom navigation is genuinely regrouped by intent, not merely a home card reorder",()=>{
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 const model=read("web-spa/src/pages/crewNavigation.ts");
 const app=read("web-spa/src/App.tsx");
 assert.deepEqual([...chrome.split("const NAV_SECTIONS=[")[1].split("] as const")[0].matchAll(/id:"([^"]+)"/g)].map(m=>m[1]),["home","learn","explore","chat","me"]);
 assert.ok(model.includes('["home","learn","explore","chat","me"]'));
 assert.match(chrome,/CREW_SECTIONS\.indexOf\(active\)/);
 for(const tab of ["home","chat","explore","learn","me"]){
  assert.match(model,new RegExp('"'+tab+'"'));
  assert.match(chrome,new RegExp('id:"'+tab+'"'));
 }
 assert.doesNotMatch(chrome,/active==="story"/);
 assert.doesNotMatch(chrome,/active==="fortune"/);
 for(const route of ["/chat","/explore","/learn","/me"]){
  assert.ok(app.includes('path="'+route+'"'),"Missing section "+route);
 }
});

test("legacy product routes and contextual bottom-nav selection remain reachable",()=>{
 const app=read("web-spa/src/App.tsx");
 const model=read("web-spa/src/pages/crewNavigation.ts");
 for(const route of ["/teacher","/story","/fortune","/timeline","/games","/settings"]){
  assert.ok(app.includes('path="'+route+'"'),route+" disappeared");
 }
 assert.match(app,/sectionForRoute\(pathname,search\)/);
 assert.match(model,/pathname\.startsWith\("\/teacher\/shorts"\)/);
 assert.doesNotMatch(model,/\/teacher\/roles/);
 assert.match(model,/\["chat","explore","learn","me"\]\.includes\(root\)/);
 assert.match(model,/\["fortune","timeline","games","story","research"/);
 assert.match(model,/\["settings","account","privacy","usage"\]/);
});

test("new sections link to existing real screens and preserve the main Shorts feed",()=>{
 const hub=read("web-spa/src/pages/CrewSectionPage.tsx");
 const home=read("web-spa/src/pages/HomePage.tsx");
 for(const url of ["/teacher/shorts","/chat","/friend/live?id=",
                   "/fortune","/timeline","/games","/story",
                   "/learn","/teacher/learn","/teacher/textbook",
                   "/teacher/me","/fortune/history","/story/me","/settings"]){
  assert.ok(hub.includes(url),"Missing existing route "+url);
 }
 assert.match(home,/<HomeShortsPreview\b/);
});

test("five global labels exist in both available interface languages",()=>{
 for(const language of ["en","zh-TW"]){
  const json=JSON.parse(read("web-spa/src/i18n/locales/"+language+"/common.json"));
  for(const tab of ["home","chat","explore","learn","me","label"]){
   assert.equal(typeof json.nav[tab],"string");
   assert.ok(json.nav[tab].length>0);
  }
 }
});
