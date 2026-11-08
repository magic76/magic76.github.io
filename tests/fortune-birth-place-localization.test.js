const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const OpenCC=require("opencc-js");

const source=stripTypeScriptTypes(
 fs.readFileSync(path.join(__dirname,"../web-spa/src/fortune/birthPlaceSearch.ts"),"utf8"),
 {mode:"strip"}
).replace(/^import OpenCC from "opencc-js";\s*$/m,"").replace(/^export\s+/gm,"");

function harness(rows){
 const calls=[];
 const mockFetch=async(url)=>{
  calls.push(url);
  return{ok:true,json:async()=>({results:rows})};
 };
 const {searchBirthPlaces}=Function("OpenCC","fetch","navigator",source+"\nreturn {searchBirthPlaces};")(OpenCC,mockFetch,{language:"en-US"});
 return{searchBirthPlaces,calls};
}
const place=(overrides={})=>({name:"新北市",admin1:"中國",country:"中國台北台灣",country_code:"TW",latitude:25.012,longitude:121.46,timezone:"Asia/Taipei",...overrides});

test("Taiwan search results never prefix China and keep geocoding data intact",async()=>{
 const h=harness([place()]);
 const [result]=await h.searchBirthPlaces("新北","zh-TW");
 assert.match(h.calls[0],/language=zh/);
 assert.equal(result.displayName,"新北市, 台灣");
 assert.equal(result.country,"台灣");
 assert.equal(result.countryCode,"TW");
 assert.equal(result.latitude,25.012);
 assert.equal(result.longitude,121.46);
 assert.equal(result.timezone,"Asia/Taipei");
 assert.doesNotMatch(result.displayName,/中國|中国|中華台北/);
});

test("Chinese search results use Traditional Chinese for overseas places",async()=>{
 const h=harness([place({name:"纽约",admin1:"纽约州",country:"美国",country_code:"US",timezone:"America/New_York"})]);
 const [result]=await h.searchBirthPlaces("纽约","zh-TW");
 assert.equal(result.displayName,"紐約, 紐約州, 美國");
});

test("non-Chinese UI keeps its language while labeling Taiwan without political prefix",async()=>{
 const h=harness([place({name:"Taipei",admin1:"Taipei",country:"Chinese Taipei"})]);
 const [result]=await h.searchBirthPlaces("Taipei","en-US");
 assert.match(h.calls[0],/language=en/);
 assert.equal(result.displayName,"Taipei, Taiwan");
 assert.doesNotMatch(result.displayName,/Chinese Taipei/);
});

test("Taiwan administration and country are not shown twice",async()=>{
 const h=harness([place({name:"台南市",admin1:"台湾省",country:"中国台湾"})]);
 const [result]=await h.searchBirthPlaces("台南","zh-TW");
 assert.match(result.displayName,/^[臺台]南市, 台灣$/);
});

test("concatenated Taipei Taiwan labels and conflicting country codes are normalized",async()=>{
 const h=harness([place({name:"中国台北台湾",admin1:"中国",country:"中国",country_code:"CN"})]);
 const [result]=await h.searchBirthPlaces("台北","zh-TW");
 assert.equal(result.countryCode,"TW");
 assert.match(result.displayName,/^[臺台]北, 台灣$/);
 assert.doesNotMatch(result.displayName,/中國|中国/);
});
