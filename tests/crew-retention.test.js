const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

function browserTracker(start){
 const src=read("web-spa/src/analytics/usage.ts").replace(/^import \{usagePlatform\} from "\.\/usagePlatform";\n/,"");
 const js=stripTypeScriptTypes(src,{mode:"strip"}).replace(/\bexport (function|const)\b/g,"$1");
 const clock={now:Date.parse(start)};
 class FakeDate extends Date{static now(){return clock.now}}
 const makeStore=()=>{
  const map=new Map();
  return{getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)};
 };
 const localStorage=makeStore(),sessionStorage=makeStore(),events=[];
 const fakeFetch=(url,opts)=>{events.push(JSON.parse(opts.body).event);return Promise.resolve(new Response(null,{status:204}))};
 const tracker=new Function("Date","localStorage","sessionStorage","location","navigator","window","document","fetch","crypto","usagePlatform","Event",js+
  "\nreturn {trackAppOpen,trackUsageEvent,taipeiUsageDay,taipeiDayGap};")(
  FakeDate,localStorage,sessionStorage,{hostname:"koolo.app",pathname:"/",search:""},
  {doNotTrack:"0"}, {dispatchEvent:()=>{}},{referrer:""},fakeFetch,
  {randomUUID:()=> "aab11919-1a11-4c99-a011-000000000001"},()=>"web",class Event{});
 return {clock,events,localStorage,...tracker};
}
test("Taipei dates roll at 00:00, not UTC midnight nor 24 hours",()=>{
 const t=browserTracker("2026-11-21T15:59:00.000Z");
 assert.equal(t.taipeiUsageDay(t.clock.now),"2026-11-21");
 assert.equal(t.taipeiUsageDay(Date.parse("2026-11-21T16:00:00Z")),"2026-11-22");
 assert.equal(t.taipeiDayGap("2026-11-21","2026-11-22"),1);
 assert.equal(t.taipeiDayGap("2026-11-15","2026-11-22"),7);
});
test("Same UUID survives revisits; crossing Taipei midnight emits one D1 and effective return",()=>{
 const t=browserTracker("2026-11-21T15:59:00.000Z");
 t.trackAppOpen();
 const uuid=t.localStorage.getItem("crew_usage_visitor_v1");
 assert.ok(uuid);
 assert.equal(t.events.filter(e=>e==="retention_cohort_started").length,1);
 t.clock.now=Date.parse("2026-11-21T16:02:00Z");
 t.trackAppOpen(); // Same tab: the opened flag must not block day transitions.
 assert.equal(t.localStorage.getItem("crew_usage_visitor_v1"),uuid);
 assert.equal(t.events.filter(e=>e==="user_returned").length,1);
 assert.equal(t.events.filter(e=>e==="retention_d1_returned").length,1);
 t.trackUsageEvent("game_completed");
 t.trackUsageEvent("game_completed");
 assert.equal(t.events.filter(e=>e==="user_returned_engaged").length,1);
 t.trackAppOpen();
 assert.equal(t.events.filter(e=>e==="user_returned").length,1);
 t.clock.now=Date.parse("2026-11-28T01:00:00Z");
 t.trackAppOpen();
 assert.equal(t.events.filter(e=>e==="retention_d7_returned").length,1);
 assert.equal(t.events.filter(e=>e==="retention_cohort_started").length,1);
});
test("Legacy UUID migration never forges a new cohort or an unknowable return",()=>{
 const t=browserTracker("2026-11-21T17:00:00Z");
 t.localStorage.setItem("crew_usage_visitor_v1","aab11919-1a11-4c99-a011-000000000003");
 t.localStorage.setItem("crew_usage_last_day_v1","2026-11-20");
 t.trackAppOpen();
 assert.ok(!t.events.includes("retention_cohort_started"));
 assert.ok(!t.events.includes("user_returned"));
 t.clock.now=Date.parse("2026-11-22T16:01:00Z");
 t.trackAppOpen();
 assert.ok(t.events.includes("user_returned"));
 assert.ok(!t.events.includes("retention_d1_returned"));
});
test("D1/D7 denominators use the exact eligible cohort dates and exclude today",()=>{
 const src=read("functions/api/usage/report.ts");
 const block=src.slice(src.indexOf("function taipeiReportDay("),src.indexOf("async function sql("));
 const js=stripTypeScriptTypes(block,{mode:"strip"}).replace(/\bexport (function|const)\b/g,"$1");
 const retention=new Function(js+"\nreturn retentionSummary;")();
 const rows=[
  {day:"2026-11-14",event:"retention_cohort_started",users:10},
  {day:"2026-11-15",event:"retention_cohort_started",users:12},
  {day:"2026-11-21",event:"retention_d7_returned",users:4},
  {day:"2026-11-21",event:"retention_d1_returned",users:3},
  {day:"2026-11-20",event:"retention_cohort_started",users:8},
  {day:"2026-11-22",event:"retention_d1_returned",users:99}
 ];
 assert.deepEqual(retention(rows,1,"2026-11-22"),{d1:{eligible:8,returned:3},d7:{eligible:10,returned:4}});
 assert.match(src,/formatDateTime\(timestamp, '%Y-%m-%d', 'Asia\/Taipei'\)/);
 assert.doesNotMatch(src,/SELECT\s+blob2\s+AS\s+/);
 assert.doesNotMatch(src,/JOIN crew_usage/);
});
test("Privacy opt-out clears cohort keys and analytics event contract is explicit",()=>{
 const src=read("web-spa/src/analytics/usage.ts");
 const ingest=read("functions/api/usage/event.ts");
 for(const name of ["retention_cohort_started","retention_d1_returned","retention_d7_returned","user_returned_engaged"]){
  assert.ok(src.includes('"'+name+'"')&&ingest.includes('"'+name+'"'));
 }
 assert.match(src,/\[KEY,SESSION,LAST,LOCAL_DAY,COHORT_DAY,RETURN_DAY,ENGAGED_DAY\]\.forEach/);
 assert.match(read("web-spa/src/analytics/RetentionUsagePanel.tsx"),/尚無已成熟的新訪客樣本/);
});
