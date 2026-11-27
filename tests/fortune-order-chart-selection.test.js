const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.join(__dirname,"..","web-spa/src/fortune",p),"utf8");
async function model(){
 const source=stripTypeScriptTypes(read("orderChartSelection.ts"),{mode:"strip"});
 return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
}
const profile={birthDate:"1990-01-01",birthTime:"10:00",gender:"1",city:"Taipei",latitude:"25",longitude:"121",utcOffset:"8",timeZoneId:"Asia/Taipei"};
const row=(id,p=profile)=>({id,mode:"bazi",profile:p,result:{fourPillars:"same",dayMaster:"甲"}});
test("order chart choices deduplicate matching profiles without mutating reading history",async()=>{
 const {selectOrderCharts,readOrderChartRecords}=await model();
 const raw=[row("latest"),row("older"),row("other",{...profile,birthDate:"1990-01-02"}),row("city",{...profile,city:"Tokyo"}),row("gender",{...profile,gender:"0"}),{...row("legacy1"),profile:undefined},{...row("legacy2"),profile:undefined},null,{...row("tarot"),mode:"tarot"}];
 const before=JSON.stringify(raw);
 const records=readOrderChartRecords(raw);
 assert.deepEqual(selectOrderCharts(records,null).map(x=>x.id),["latest","other","city","gender","legacy1","legacy2"]);
 assert.deepEqual(selectOrderCharts(records,"older").map(x=>x.id),["older","other","city","gender","legacy1","legacy2"]);
 assert.equal(JSON.stringify(raw),before);
 assert.deepEqual(selectOrderCharts(records,"other",1).map(x=>x.id),["latest","other"]);
 assert.deepEqual(readOrderChartRecords({}),[]);
});
test("deduplicate before the display cap and preserve older explicit links",async()=>{
 const {selectOrderCharts}=await model();
 const rows=Array.from({length:25},(_,i)=>row("repeat"+i));
 rows.push(row("relative",{...profile,birthTime:"13:00"}));
 assert.deepEqual(selectOrderCharts(rows,null).map(x=>x.id),["repeat0","relative"]);
 assert.deepEqual(selectOrderCharts(rows,"repeat24").map(x=>x.id),["repeat24","relative"]);
});
test("picker uses local chart names and sends only existing facts",()=>{
 const page=read("EcpayStagePage.tsx");
 assert.match(page,/readDailyChartMeta\(hash\)\.nickname/);
 assert.match(page,/selectOrderCharts\(records,readingId\)/);
 assert.match(page,/body:JSON\.stringify\(\{facts\}\)/);
 assert.match(page,/aria-current=/);
});
