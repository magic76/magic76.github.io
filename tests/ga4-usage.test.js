const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");

function harness(options={}){
 const file=fs.readFileSync(path.join(root,"web-spa/src/analytics/ga4.ts"),"utf8");
 const source=stripTypeScriptTypes(file,{mode:"strip"}).replace(/^export /gm,"");
 const scripts=[];
 const window={
  location:{origin:"https://www.3sssi.com",pathname:"/teacher/shorts",search:"",...options.location},
  dataLayer:[]
 };
 const document={
  referrer:options.referrer||"",
  createElement:tag=>({tagName:tag}),
  head:{appendChild:node=>scripts.push(node)}
 };
 const exports=new Function("window","document",source+
  "\nreturn {GA4_MEASUREMENT_ID,safeGa4Path,safeGa4CampaignQuery,safeGa4Referrer,setGa4Enabled,sendGa4PageView,sendGa4Event};")(window,document);
 return {scripts,window,...exports};
}
test("GA4 queues native gtag Arguments objects (including consent updates)",()=>{
 const ga=harness();
 ga.setGa4Enabled(true);
 ga.sendGa4PageView("/teacher/vocabulary");
 ga.sendGa4Event("vocabulary_practice","");
 ga.setGa4Enabled(false);
 const commands=ga.window.dataLayer;
 assert.deepEqual(commands.map(row=>row[0]),["js","consent","config","event","event","consent"]);
 for(const row of commands){
  assert.equal(Object.prototype.toString.call(row),"[object Arguments]",
   "gtag.js commands must use native Arguments, not Array");
  assert.equal(Array.isArray(row),false);
 }
 assert.deepEqual(Array.from(commands[2]).slice(0,2),["config","G-563JSM2X68"]);
 assert.equal(commands[3][1],"page_view");
 assert.equal(commands[4][1],"crew_vocabulary_practice");
 assert.equal(commands[5][1],"update");
});
test("GA4 tag is lazy, guarded by opt-out, and configured without automatic page views or ads",()=>{
 const ga=harness();
 assert.equal(ga.GA4_MEASUREMENT_ID,"G-563JSM2X68");
 assert.equal(ga.setGa4Enabled(false),false);
 assert.equal(ga.window["ga-disable-G-563JSM2X68"],true);
 assert.equal(ga.scripts.length,0);
 ga.sendGa4Event("vocabulary_practice","");
 assert.equal(ga.scripts.length,0,"events cannot reactivate GA4 after privacy opt-out");
 assert.equal(ga.setGa4Enabled(true),true);
 assert.equal(ga.scripts.length,1);
 assert.equal(ga.scripts[0].src,"https://www.googletagmanager.com/gtag/js?id=G-563JSM2X68");
 const consent=ga.window.dataLayer.find(x=>x[0]==="consent"&&x[1]==="default")[2];
 assert.equal(consent.analytics_storage,"granted");
 assert.equal(consent.ad_storage,"denied");
 assert.equal(consent.ad_user_data,"denied");
 assert.equal(consent.ad_personalization,"denied");
 const config=ga.window.dataLayer.find(x=>x[0]==="config")[2];
 assert.equal(config.send_page_view,false);
 assert.equal(config.allow_google_signals,false);
 assert.equal(config.allow_ad_personalization_signals,false);
 assert.equal(ga.setGa4Enabled(true),true);
 assert.equal(ga.scripts.length,1,"tag must load only once");
});
test("GA4 SPA pageviews omit query, hash and private dynamic identifiers",()=>{
 const ga=harness();ga.setGa4Enabled(true);
 const path="/story/read/private-user-story-123";
 assert.equal(ga.safeGa4Path(path),"/story/read/item");
 ga.sendGa4PageView(path+"?key=SECRET#private");
 ga.sendGa4PageView(path+"?key=SECRET#private");
 const views=ga.window.dataLayer.filter(x=>x[0]==="event"&&x[1]==="page_view");
 assert.equal(views.length,1,"React StrictMode must not double count pageview");
 assert.equal(views[0][2].page_location,"https://www.3sssi.com/story/read/item");
 assert.equal(views[0][2].page_title,"Crew Web");
 assert.ok(!JSON.stringify(views).includes("SECRET"));
 ga.sendGa4PageView("/teacher/vocabulary");
 assert.equal(ga.window.dataLayer.filter(x=>x[1]==="page_view").length,2);
 ga.sendGa4Event("vocabulary_practice","");
 const event=ga.window.dataLayer.at(-1);
 assert.equal(event[1],"crew_vocabulary_practice");
 assert.equal(event[2].crew_platform,"web");
 assert.ok(!JSON.stringify(event).includes("SECRET"));
});
test("GA4 opt-out revokes analytics consent and suppresses further events",()=>{
 const ga=harness();ga.setGa4Enabled(true);
 ga.sendGa4Event("teacher_conversation_start","");
 const before=ga.window.dataLayer.filter(x=>x[0]==="event").length;
 ga.setGa4Enabled(false);
 assert.equal(ga.window["ga-disable-G-563JSM2X68"],true);
 const change=ga.window.dataLayer.filter(x=>x[0]==="consent"&&x[1]==="update").at(-1);
 assert.equal(change[2].analytics_storage,"denied");
 ga.sendGa4Event("friend_conversation_start","");
 ga.sendGa4PageView("/teacher/shorts");
 assert.equal(ga.window.dataLayer.filter(x=>x[0]==="event").length,before);
});
test("Web product analytics reuses privacy and source allowlists, and React Router sends route pageviews",()=>{
 const usage=fs.readFileSync(path.join(root,"web-spa/src/analytics/usage.ts"),"utf8");
 const app=fs.readFileSync(path.join(root,"web-spa/src/App.tsx"),"utf8");
 const settings=fs.readFileSync(path.join(root,"web-spa/src/pages/SettingsPage.tsx"),"utf8");
 assert.match(usage,/const allowed=\(\)=>production\(\)&&!globalPrivacy\(\)&&!usageDisabled\(\)&&!developerUsageMode\(\)/);
 assert.match(usage,/if\(!allowed\(\)\)return;[\s\S]*?sendGa4Event\(event,detail\)/);
 assert.match(usage,/setGa4Enabled\(allowed\(\)\)/);
 assert.match(usage,/sendGa4PageView\(pathname\)/);
 assert.match(app,/useEffect\(\(\)=>\{trackPageView\(pathname\)\},\[pathname\]\)/);
 const privacy=fs.readFileSync(path.join(root,"web-spa/src/pages/PrivacyPage.tsx"),"utf8");
 assert.doesNotMatch(settings,/Anonymous product usage|匿名產品使用統計|setUsageDisabled/);
 assert.match(settings,/<Link to="\/privacy">/);
 assert.match(privacy,/Google Analytics（GA4）/);
 assert.match(privacy,/setUsageDisabled/);
 assert.match(app,/<Route path="\/privacy"/);
});

test("Timeline and comparison routes remain public GA4 paths",()=>{
 const ga=harness();ga.setGa4Enabled(true);
 for(const route of ["/timeline","/timeline/live","/timeline/compare"]){
  assert.equal(ga.safeGa4Path(route),route);
  ga.sendGa4PageView(route);
 }
 assert.equal(ga.safeGa4Path("/timeline/private-identifier"),"/timeline/item");
 const views=ga.window.dataLayer.filter(row=>row[0]==="event"&&row[1]==="page_view");
 assert.deepEqual(views.map(row=>row[2].page_path),["/timeline","/timeline/live","/timeline/compare"]);
});

test("GA4 captures safe incoming UTM and external referral without private query text",()=>{
 const ga=harness({
  location:{pathname:"/teacher/",search:"?utm_source=threads&utm_medium=social&utm_campaign=english_launch&utm_content=post_a&utm_term=private+search&fbclid=TRACKING&key=SECRET#fragment"},
  referrer:"https://l.facebook.com/private/path?token=SECRET#secret"
 });
 ga.sendGa4Event("app_opened","");
 const config=ga.window.dataLayer.find(row=>row[0]==="config")[2];
 const landing="https://www.3sssi.com/teacher?utm_source=threads&utm_medium=social&utm_campaign=english_launch&utm_content=post_a";
 assert.equal(config.page_location,landing);
 assert.equal(config.page_referrer,"https://l.facebook.com/");
 const earlyEvent=ga.window.dataLayer.at(-1);
 assert.equal(earlyEvent[2].page_location,landing,
  "product events before the initial pageview must retain attribution");
 assert.equal(earlyEvent[2].page_referrer,"https://l.facebook.com/");
 ga.sendGa4PageView("/teacher/");
 const first=ga.window.dataLayer.at(-1);
 assert.equal(first[1],"page_view");
 assert.equal(first[2].page_location,landing);
 assert.equal(first[2].page_referrer,"https://l.facebook.com/");
 ga.window.location.pathname="/games/1a2b";
 ga.window.location.search="?key=ANOTHER_SECRET&utm_source=wrong";
 ga.sendGa4PageView("/games/1a2b");
 const next=ga.window.dataLayer.at(-1);
 assert.equal(next[2].page_location,"https://www.3sssi.com/games/1a2b");
 assert.equal(next[2].page_referrer,"https://www.3sssi.com/teacher");
 ga.sendGa4Event("game_started","1a2b");
 const action=ga.window.dataLayer.at(-1);
 assert.equal(action[2].page_referrer,"https://www.3sssi.com/teacher");
 assert.equal(action[2].page_location,"https://www.3sssi.com/games/1a2b");
 assert.ok(!JSON.stringify(ga.window.dataLayer).includes("SECRET"));
 assert.ok(!JSON.stringify(ga.window.dataLayer).includes("TRACKING"));
 assert.ok(!JSON.stringify(ga.window.dataLayer).includes("private/path"));
 assert.ok(!JSON.stringify(ga.window.dataLayer).includes("utm_term"));
});

test("GA4 rejects unsafe or duplicate campaign values and arbitrary URL parameters",()=>{
 const ga=harness();
 assert.equal(ga.safeGa4CampaignQuery("?utm_source=threads&utm_medium=social&utm_campaign=launch_2026"),
  "?utm_source=threads&utm_medium=social&utm_campaign=launch_2026");
 assert.equal(ga.safeGa4CampaignQuery("?utm_source=one&utm_source=two&auth=SECRET"),"");
 assert.equal(ga.safeGa4CampaignQuery("?utm_source=person%40example.com&utm_campaign=hello%20world&token=SECRET"),"");
 assert.equal(ga.safeGa4CampaignQuery("?utm_source="+("x".repeat(65))),"");
 assert.equal(ga.safeGa4CampaignQuery("?utm_id=abc123&utm_source_platform=meta&utm_content=variant_B"),
  "?utm_id=abc123&utm_content=variant_B&utm_source_platform=meta");
});

test("GA4 referrers are external origins only, never private paths or same-site URLs",()=>{
 const ga=harness();
 const safe=ga.safeGa4Referrer;
 const own="https://www.3sssi.com";
 assert.equal(safe("https://www.google.com/search?q=SECRET",own),"https://www.google.com/");
 assert.equal(safe("https://m.facebook.com:8443/path?token=SECRET",own),"https://m.facebook.com/");
 assert.equal(safe("https://3sssi.com/private?token=SECRET",own),"");
 assert.equal(safe("https://www.3sssi.com/private?token=SECRET",own),"");
 assert.equal(safe("https://localhost/private",own),"");
 assert.equal(safe("http://127.0.0.1/path",own),"");
 assert.equal(safe("javascript:alert(1)",own),"");
 assert.equal(safe("not-a-url",own),"");
});
