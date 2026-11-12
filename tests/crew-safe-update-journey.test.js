const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("New version notice does not interrupt any long-running Crew workflow",()=>{
 const source=read("web-spa/src/components/CrewUpdateNotice.tsx");
 const start=source.indexOf("export function canOfferCrewRefresh(");
 const end=source.indexOf("export function CrewUpdateNotice(",start);
 assert.ok(start>=0&&end>start);
 const method=stripTypeScriptTypes(source.slice(start,end),{mode:"strip"}).replace("export function","function");
 const canOffer=new Function(method+"\nreturn canOfferCrewRefresh;")();
 for(const safe of ["/","/chat","/learn","/explore","/me","/settings","/teacher/roles","/research","/en/learn","/ja/teacher/roles"]){
  assert.equal(canOffer(safe),true,safe);
 }
 for(const unsafe of ["/mate","/magic","/town","/orb","/games","/games/taboo","/en/games/1a2b",
  "/teacher/live","/friend/live","/story/live","/fortune/live","/timeline/live",
  "/teacher/board","/teacher/voice-lab","/teacher/textbook","/teacher/course",
  "/teacher/practice","/teacher/pronunciation","/story/create","/story/edit/private",
  "/story/read/private","/story/physical","/fortune/reading","/timeline/compare",
  "/ja/magic","/en/mate"]){
  assert.equal(canOffer(unsafe),false,unsafe);
 }
 assert.match(source,/hasNewBuild\(latest\)/);
 assert.match(source,/refreshCrewBuild/);
});
test("Usage journey consists only of private, per-period distinct browser aggregates",()=>{
 const api=read("functions/api/usage/report.ts");
 const ui=read("web-spa/src/analytics/UsageDashboardPage.tsx");
 const journey=read("web-spa/src/analytics/UsageJourneySection.tsx");
 assert.match(api,/verifyAccess\(request,env\)/);
 assert.match(api,/journeyClickEvents/);
 assert.match(api,/journeyStartEvents/);
 assert.match(api,/COUNT\(DISTINCT blob2\) AS users/);
 for(const stage of ["opened","clicked","started","engaged","returned"]){
  assert.match(api,new RegExp(stage+":Number\\("));
  assert.match(journey,new RegExp('key:"'+stage+'"'));
 }
 assert.match(journey,/不是同一批人的精準轉換漏斗或次日留存率/);
 assert.match(ui,/<UsageJourneySection days=\{days\} journey=\{data\.journey\}\/>/);
 assert.match(ui,/journey\?:JourneyCounts/);
 assert.doesNotMatch(api,/SELECT\s+blob2\s+AS\s+/);
 assert.doesNotMatch(api,/JOIN |INSERT INTO|CREATE TABLE/);
 const home=read("web-spa/src/pages/HomePortal.tsx");
 assert.match(home,/trackUsageEvent\("home_entry_click",exhausted&&\(next==="chat"\|\|next==="learn"\)\?"settings":next==="chat"\?"friend":next\)/);
 assert.match(home,/trackUsageEvent\("home_entry_click",exhausted\?"settings":"friend"\)/);
 const rail=read("web-spa/src/pages/HomeModeRail.tsx");
 const details=[...rail.matchAll(/\{id:"(chat|learn|fortune|play)"[^\n]*entry:"([^"]+)"/g)].map(([,mode,detail])=>[mode,detail]);
 assert.deepEqual(details,[["chat","friend"],["learn","learn"],["fortune","fortune"],["play","play"]]);
});
