const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {stripTypeScriptTypes}=require("node:module");
require.extensions[".ts"]=(mod,filename)=>{
 const src=fs.readFileSync(filename,"utf8");
 const output=stripTypeScriptTypes(src,{mode:"strip"})
  .replace(/export function /g,"function ")
  +"\nmodule.exports={readFortuneHistoryPreviews};";
 mod._compile(output,filename);
};
const {readFortuneHistoryPreviews}=require("../web-spa/src/fortune/readingHistory.ts");
const origStorage=global.localStorage;
function setHistory(raw){
 global.localStorage={getItem:(key)=>key==="crew_fortune_readings_v2"?raw:null};
}
test.after(()=>{global.localStorage=origStorage});
test("Fortune report directory handles saved data without external scripts",()=>{
 setHistory(JSON.stringify([
  {id:"ok-1",mode:"bazi",summary:"原始摘要",createdAt:"2026-10-20T00:00:00Z",profile:{birthDate:"private"}},
  null,{id:"",mode:"bazi"},{id:"invalid",mode:"other"},
  {id:"ok-2",mode:"vedic",summary:"第二張"},{id:"ok-3",mode:"tarot"},
 ]));
 const items=readFortuneHistoryPreviews();
 assert.deepEqual(items.map(x=>x.id),["ok-1","ok-2","ok-3"]);
 assert.deepEqual(items.map(x=>x.mode),["bazi","vedic","tarot"]);
 assert.equal(items[0].summary,"原始摘要");
 assert.equal("profile" in items[0],false,"Do not put sensitive birth information into list previews");
 assert.equal(readFortuneHistoryPreviews(1).length,1);
});
test("Fortune history handles corrupt and legacy data without crashing the route",()=>{
 for(const raw of ["{bad-json",JSON.stringify({id:"not-a-list"}),JSON.stringify(null)]){
  setHistory(raw);
  assert.deepEqual(readFortuneHistoryPreviews(),[]);
 }
 global.localStorage={getItem(){throw new Error("storage blocked")}};
 assert.deepEqual(readFortuneHistoryPreviews(),[]);
});
test("Fortune landing and history are not blocked by astrology CDNs",()=>{
 for(const file of ["HomePage.tsx","HistoryPage.tsx"]){
  const src=fs.readFileSync(require.resolve("../web-spa/src/fortune/"+file),"utf8");
  assert.match(src,/readFortuneHistoryPreviews/);
  assert.doesNotMatch(src,/ensureFortuneServices|window\.CrewFortuneProfile/);
 }
});
test("Dynamic import errors trigger cache-busting recovery without looping",()=>{
 const boundary=fs.readFileSync(require.resolve("../web-spa/src/components/RouteErrorBoundary.tsx"),"utf8");
 const main=fs.readFileSync(require.resolve("../web-spa/src/main.tsx"),"utf8");
 assert.match(boundary,/RETRY_QUERY="__crew_reload"/);
 assert.match(boundary,/window\.location\.replace\(url\.toString\(\)\)/);
 assert.match(boundary,/const path=recoveryPath\(\)/);
 assert.match(main,/url\.searchParams\.delete\("__crew_reload"\)/);
});
