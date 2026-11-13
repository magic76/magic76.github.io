const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const utilSource=read("web-spa/src/analytics/usageExport.ts");
const controlSource=read("web-spa/src/analytics/UsageExportControls.tsx");
const pageSource=read("web-spa/src/analytics/UsageDashboardPage.tsx");
const css=read("web-spa/src/analytics/usage-dashboard.css");

function compilePure(){
 const source=stripTypeScriptTypes(utilSource,{mode:"strip"}).replace(/\bexport (const|function)\b/g,"$1");
 const names=["buildUsageExport","usageExportFilename","usageExportCsv","usageExportSummary"];
 return new Function(source+"\nreturn {"+names.join(",")+"};")();
}
const {buildUsageExport,usageExportFilename,usageExportCsv,usageExportSummary}=compilePure();
function fixture(){
 const secrets={authorization:"LEAK_AUTH",token:"LEAK_TOKEN",cookie:"LEAK_COOKIE",jwt:"LEAK_JWT",visitorId:"LEAK_VISITOR",sessionId:"LEAK_SESSION",email:"LEAK_EMAIL",ip:"LEAK_IP"};
 const rows=[
  {day:"2026-11-11",event:"home_entry_click",detail:"voice",count:12,users:4,...secrets},
  {day:"2026-11-11",event:"home_entry_click",detail:"friend",count:20,users:9,...secrets},
  {day:"2026-11-12",event:"app_opened",detail:"",count:70,users:32,...secrets},
  {day:"2026-11-12",event:"teacher_conversation",detail:"",count:2,users:2,...secrets},
  {day:"2026-11-12",event:"friend_conversation",detail:"",count:3,users:2,...secrets},
  {day:"2026-11-12",event:"souls_live_connected",detail:"",count:4,users:2,...secrets},
  {day:"2026-11-12",event:"souls_user_input",detail:"",count:5,users:2,...secrets},
  {day:"2026-11-12",event:"souls_ai_replied",detail:"",count:6,users:2,...secrets},
  {day:"2026-11-12",event:"souls_conversation",detail:"",count:7,users:3,...secrets},
  {day:"2026-11-12",event:"LEAK_EVENT",detail:"",count:10,users:2},
  {day:"2026-11-12",event:"home_entry_click",detail:"LEAK_TOKEN",count:10,users:2},
  {day:"LEAK_IP",event:"home_entry_click",detail:"voice",count:10,users:2}
 ];
 const data={days:7,activeUsers:30,chatUsers:12,previousActiveUsers:20,previousChatUsers:6,
  journey:{opened:50,clicked:35,started:25,engaged:30,returned:11,...secrets},
  generatedAt:"2026-11-13T04:00:00.000Z",rows,
  eventUsers:[{event:"app_opened",users:32,...secrets},{event:"LEAK_AUTH",users:3}],...secrets,
  headlines:secrets,entryClicks:secrets,chatFunnel:secrets};
 return {data,secrets};
}

test("export uses a strict aggregate allowlist and strips sensitive keys and poisoned values",()=>{
 const {data,secrets}=fixture();
 const payload=buildUsageExport(data,7,{id:"chat",label:"老師／朋友／Souls 聊天"},[
  {day:"2026-11-11",count:2,token:"LEAK_BARS"},{day:"2026-11-12",count:10}
 ],12,new Date("2026-11-13T05:00:00.000Z"));
 assert.deepEqual(Object.keys(payload),["exportedAt","source","days","category","generatedAt","headlines","journey","chatFunnel","entryClicks","categoryBars","categoryEventTotal","eventUsers","rows","caveats"]);
 assert.deepEqual(Object.keys(payload.headlines),["activeUsers","previousActiveUsers","chatUsers","previousChatUsers","effectiveConversations","appOpened"]);
 assert.deepEqual(Object.keys(payload.rows[0]),["day","event","detail","count","users"]);
 assert.deepEqual(Object.keys(payload.categoryBars[0]),["day","count"]);
 assert.deepEqual(Object.keys(payload.eventUsers[0]),["event","users"]);
 assert.equal(payload.source,"https://www.3sssi.com/usage");
 assert.equal(payload.rows.length,9);
 assert.equal(payload.eventUsers.length,1);
 const serialized=JSON.stringify(payload);
 for(const leak of [...Object.values(secrets),"LEAK_EVENT","LEAK_BARS"]){assert.ok(!serialized.includes(leak),leak)}
 for(const key of ["authorization","visitorId","sessionId","email","cookie","jwt"]){assert.ok(!serialized.includes('"'+key+'"'),key)}
 assert.deepEqual(payload.entryClicks.home_entry_click,{friend:20,voice:12});
 assert.equal(payload.headlines.effectiveConversations,12);
 assert.equal(payload.headlines.appOpened,70);
 assert.deepEqual(payload.journey,{opened:50,clicked:35,started:25,engaged:30,returned:11});
 assert.deepEqual(payload.category,{id:"chat",label:"老師／朋友／Souls 聊天"});
 assert.equal(payload.categoryEventTotal,12);
 assert.deepEqual(payload.categoryBars,[{day:"2026-11-11",count:2},{day:"2026-11-12",count:10}]);
});

test("7/30 day selection and category are reflected, Taiwan filename rolls at 00:00",()=>{
 const {data}=fixture();
 for(const days of [7,30]){
  const payload=buildUsageExport({...data,days},days,{id:"shorts",label:"Shorts"},[],0);
  assert.equal(payload.days,days);
  assert.deepEqual(payload.category,{id:"shorts",label:"Shorts"});
 }
 assert.equal(usageExportFilename("json",new Date("2026-11-13T15:59:59.000Z")),"crew-usage-2026-11-13.json");
 assert.equal(usageExportFilename("csv",new Date("2026-11-13T16:00:00.000Z")),"crew-usage-2026-11-14.csv");
});

test("copy summary includes every requested aggregate, both entry clicks and tracking caveats",()=>{
 const {data,secrets}=fixture();
 const payload=buildUsageExport(data,7,{id:"all",label:"所有有效互動"},[{day:"2026-11-12",count:12}],12);
 const summary=usageExportSummary(payload);
 for(const text of ["最近 7 天","產生時間","有效使用瀏覽器","真的聊過天","有效對話次數","網站開啟次數","Journey","opened=50","returned=11","聊天漏斗","完成有效雙向對話=12","home_entry_click","voice=12","friend=20","2026-11-12:12","未分開追蹤","一般文字聊天","不含 Android","類別篩選"]){assert.ok(summary.includes(text),text)}
 for(const leak of Object.values(secrets)){assert.ok(!summary.includes(leak),leak)}
});

test("CSV has only the 7/30 day period rows, fixed headers, and safe escaped values",()=>{
 const {data,secrets}=fixture();
 const csv=usageExportCsv(buildUsageExport(data,7,{id:"chat",label:"老師／朋友／Souls 聊天"},[],0));
 assert.ok(csv.startsWith("\uFEFFday,event,detail,count,users\r\n"));
 assert.equal(csv.trim().split("\r\n").length,10);
 assert.ok(csv.includes('"2026-11-11","home_entry_click","voice","12","4"'));
 assert.ok(csv.includes('"2026-11-11","home_entry_click","friend","20","9"'));
 for(const leak of Object.values(secrets)){assert.ok(!csv.includes(leak),leak)}
});

test("toolbar controls appear only for current successful data; no API calls or new tracking",()=>{
 assert.match(pageSource,/<UsageExportControls data=\{data\} days=\{days\} category=\{selected\} bars=\{bars\}/);
 assert.match(pageSource,/disabled=\{loading\|\|!!error\|\|!data\|\|data\.days!==days\}/);
 assert.match(controlSource,/disabled=\{unavailable\}/);
 assert.match(controlSource,/const unavailable=disabled\|\|!data\|\|data\.days!==days/);
 for(const label of ["匯出 JSON","匯出 CSV","複製"]){assert.ok(controlSource.includes(label))}
 assert.match(controlSource,/navigator\.clipboard\?\.writeText/);
 assert.match(controlSource,/document\.execCommand\("copy"\)/);
 assert.doesNotMatch(controlSource+utilSource,/\bfetch\s*\(|trackUsageEvent\s*\(/);
 assert.match(pageSource,/fetch\("\/api\/usage\/report\?days="\+days,\{credentials:"same-origin",cache:"no-store"\}\)/);
});

test("new controls meet 44px and 12px requirements; dashboard does not grow",()=>{
 assert.match(css,/\.usage-toolbar \.usage-export\{[^}]*min-height:44px;min-width:44px;[^}]*font-size:(?:1[2-9]|[2-9]\d)px/);
 assert.match(css,/\.usage-toolbar \.usage-export:focus-visible\{[^}]*outline:/);
 assert.ok(Buffer.byteLength(pageSource,"utf8")<=26457,`page grew: ${Buffer.byteLength(pageSource,"utf8")}`);
 assert.ok(Buffer.byteLength(controlSource,"utf8")<26000);
});

test("export event/detail vocabulary equals existing event tracker, not additional events",()=>{
 const usage=read("web-spa/src/analytics/usage.ts");
 const existingEvents=(usage.split("export type UsageEvent=")[1]||"").split(";")[0].match(/"[^"]+"/g)||[];
 const safeEvents=(utilSource.split("const SAFE_EVENTS=new Set<string>(")[1]||"").split(");")[0].match(/"[^"]+"/g)||[];
 assert.deepEqual([...new Set(safeEvents)].sort(),[...new Set(existingEvents)].sort());
 assert.doesNotMatch(controlSource+utilSource,/trackUsageEvent\(/);
 assert.match(usage,/export type UsageEvent=/);
});
