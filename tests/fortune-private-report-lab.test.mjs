import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizeLabFacts,validateLabChapters,generateLabChapters,PARTS} from "../server/koolo-fortune-lab-core.mjs";
import {labGet,labPost,labPage} from "../server/koolo-fortune-report-lab.mjs";
import {reportLabHtml} from "../server/koolo-fortune-lab-html.mjs";


// The two page Functions inject the same verified admin guard used by /usage.
// Mock the guard here; the actual verified-email and Access-JWT guard has its
// own tests in tests/koolo-admin-allowlist.test.js and tests/crew-usage.test.js.
const get=ctx=>labGet({...ctx,verifyAdmin:async()=>true});
const page=ctx=>labPage({...ctx,verifyAdmin:async()=>true});
const post=ctx=>labPost({...ctx,verifyAdmin:async()=>true});

const COOKIE="a".repeat(43),UUID="11111111-2222-4333-8444-555555555555";
const THIS_YEAR=new Date(Date.now()+8*3600*1000).getUTCFullYear();
const model="gemini-2.5-flash";
const facts={
 fourPillars:"甲子 乙丑 丙寅 丁卯",dayMaster:"丙",dayMasterElement:"火",strength:"中和",
 weighted:{木:4,火:3,土:2,金:1,水:2},
 counts:{resource:3,output:1,officer:2,directWealth:1,indirectWealth:2},
 luck:{ganZhi:"庚午"},
 annual:[0,1,2].map(n=>({year:THIS_YEAR+n,ganZhi:["丙午","丁未","戊申"][n],themes:["學習／支援"]})),
 relations:["子午 六沖"],questions:["我的職涯應該如何安排？","如何改善人際關係？"]
};
function chapters(){
 const obj={};
 for(const k of PARTS)obj[k]=("這是專屬命書的"+k+"章節。以甲木與丙火的象徵理解選擇，回顧日常觀察、實際的能力、工作環境與真實的人生經驗。").repeat(k==="letter"?5:3)+" 今年可關注 "+THIS_YEAR+" 年的生活方向。";
 return obj;
}
function request(path="",{method="GET",cookie=true,origin="https://koolo.app",body=null,requestOrigin=origin}={}){
 return new Request(origin+"/api/fortune/report-lab"+path,{method,
  headers:{...(cookie?{Cookie:"__Host-crew_session="+COOKIE}:{}),...(body?{"Content-Type":"application/json",Origin:requestOrigin}:{})},
  ...(body?{body:JSON.stringify(body)}:{})});
}
function pageRequest({cookie=true,origin="https://koolo.app"}={}){
 return new Request(origin+"/fortune/report-lab",{
  headers:cookie?{Cookie:"__Host-crew_session="+COOKIE}:{}
 });
}
function db({uid=UUID,found=null,insertChanges=1}={}){
 const queries=[];
 return {queries,prepare(sql){
  queries.push(sql);
  return {bind(...args){return{
   async first(){
    if(sql.includes("FROM crew_auth_sessions"))return uid?{user_id:uid}:null;
    if(sql.includes("WHERE user_id=? AND request_id=?"))return null;
    if(sql.includes("FROM koolo_fortune_lab_reports"))return found;
    return null;
   },
   async all(){return{results:[]}},
   async run(){return{meta:{changes:insertChanges}}}
  }}};
 }};
}
const env=(database,more={})=>({CREW_AUTH_DB:database,
 KOOLO_FORTUNE_LAB_GEMINI_KEY:"this-is-only-a-unit-test-key-123456",
 KOOLO_FORTUNE_LAB_MODEL:model,...more});
const fakeProvider=async(_url,opts)=>{
 assert.equal(opts.headers["x-goog-api-key"],"this-is-only-a-unit-test-key-123456");
 const payload=JSON.parse(opts.body);
 assert.equal(payload.generationConfig.responseMimeType,"application/json");
 assert.equal(payload.generationConfig.maxOutputTokens,8192);
 return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(chapters())}]}}],
  usageMetadata:{promptTokenCount:260, candidatesTokenCount:780}}),{status:200});
};

test("owner-only acceptance HTML has 10 pages, is hidden from normal app navigation and is noindexed",async()=>{
 const d=db(),r=await page({request:pageRequest(),env:env(d)});
 assert.equal(r.status,200);assert.match(r.headers.get("Content-Security-Policy"),/nonce-/);
 assert.doesNotMatch(readFileSync("server/koolo-fortune-report-lab.mjs","utf8"),/KOOLO_FORTUNE_LAB_ENABLED/);
 assert.match(r.headers.get("X-Robots-Tag"),/noindex/);
 const html=await r.text();
 assert.equal((html.match(/class="sheet(?: dark)?"/g)||[]).length,10);
 assert.match(html,/列印／儲存為 PDF/);assert.match(html,/@page\{size:A4;margin:0\}/);
 assert.match(html,/四柱、五行統計、十神/);
 assert.doesNotMatch(html,/KOOLO_FORTUNE_LAB_GEMINI_KEY|api[_-]?key\s*[:=]\s*["']/i);
 const app=readFileSync("web-spa/src/App.tsx","utf8");
 const price=readFileSync("web-spa/src/fortune/FortunePriceInterest.tsx","utf8");
 assert.ok(!app.includes("report-lab")&&!price.includes("report-lab"));
 const route=readFileSync("functions/api/fortune/report-lab.js","utf8");
 assert.match(route,/from "\.\.\/usage\/report"/);
 assert.match(route,/verifyAdmin:verifyAccess/);
 assert.match(route,/onRequestGet=context=>labGet/);
 assert.match(route,/onRequestPost=context=>labPost/);
 const pageRoute=readFileSync("functions/fortune/report-lab.js","utf8");
 assert.match(pageRoute,/from "\.\.\/api\/usage\/report"/);
 assert.match(pageRoute,/verifyAdmin:verifyAccess/);
 assert.match(pageRoute,/onRequestGet=context=>labPage/);
 const guard=readFileSync("server/koolo-fortune-report-lab.mjs","utf8");
 assert.doesNotMatch(guard,/KOOLO_FORTUNE_LAB_USER_IDS/);
 assert.match(guard,/await verifyAdmin\(request,env\)===true/);
 const pagesRoutes=JSON.parse(readFileSync("_routes.json","utf8"));
 assert.ok(pagesRoutes.include.includes("/fortune/report-lab"));
 const browserJs=readFileSync("assets/js/fortune-report-lab.js","utf8");
 assert.match(html,/<script src="\/assets\/js\/fortune-report-lab\.js" defer><\/script>/);
 assert.doesNotMatch(html,/<script nonce=/);
 assert.match(r.headers.get("Content-Security-Policy"),/script-src 'self'/);
 assert.match(html,/id="chartStatus"/);
 assert.match(html,/id="refreshCharts"/);
 assert.match(browserJs,/var path="\/api\/fortune\/report-lab",pagePath=location.pathname/);
 assert.match(browserJs,/window\.history\.replaceState\(null,"",pagePath/);
 assert.match(browserJs,/selectCharts\(\);/);
 assert.equal((await get({request:request(),env:env(d)})).status,404);
 assert.equal((await page({request:pageRequest({cookie:false}),env:env(d)})).status,401);
 assert.equal((await labPage({request:pageRequest(),env:env(d),verifyAdmin:async()=>false})).status,404);
});

test("PWA chart picker initializes immediately and can rescan local BaZi readings without waiting for network",async()=>{
 const source=readFileSync("assets/js/fortune-report-lab.js","utf8");
 let saved="[]";
 const elements=new Map();
 const mk=(id="")=>{
  const el={id,value:"",textContent:"",disabled:false,hidden:false,children:[],listeners:{},
   appendChild(child){this.children.push(child)},
   replaceChildren(...items){this.children=items},
   addEventListener(type,fn){this.listeners[type]=fn},
   append(...children){this.children.push(...children)},
   style:{setProperty(){}}
  };
  return el;
 };
 const document={
  getElementById(id){if(!elements.has(id))elements.set(id,mk(id));return elements.get(id)},
  createElement(){return mk()}
 };
 // Reproduces a slow/offline D1 report history request; local chart loading must
 // remain entirely synchronous and independent of it.
 const fetch=()=>new Promise(()=>{});
 new Function("document","localStorage","location","window","fetch","crypto","console",source)(
  document,{getItem(key){return key==="crew_fortune_readings_v2"?saved:null}},
  {pathname:"/fortune/report-lab",hash:""},
  {history:{replaceState(){}},scrollTo(){},print(){}},
  fetch,{randomUUID:()=>UUID},{error(){}}
 );
 const chart=elements.get("chart"),status=elements.get("chartStatus"),btn=elements.get("generate");
 assert.equal(chart.children.length,1);
 assert.match(chart.children[0].textContent,/沒有已保存的八字命盤/);
 assert.match(status.textContent,/同一個 Koolo 網域/);
 assert.equal(btn.disabled,true);
 saved=JSON.stringify([
  {id:"a",mode:"tarot",result:{fourPillars:"unused"}},
  {id:"reading_123",mode:"bazi",createdAt:"2026-11-22T10:00:00Z",result:{fourPillars:"甲子 乙丑 丙寅 丁卯"}}
 ]);
 elements.get("refreshCharts").listeners.click();
 assert.equal(chart.children.length,1);
 assert.match(chart.children[0].textContent,/甲子 乙丑 丙寅 丁卯/);
 assert.equal(chart.value,"0");
 assert.match(status.textContent,/已找到 1 份/);
 assert.equal(btn.disabled,false);
});

test("PWA API detects HTML fallback, HTML edge error and Access redirect without parsing them as JSON",async()=>{
 const browserJs=readFileSync("assets/js/fortune-report-lab.js","utf8");
 const reading={id:"reading_test",mode:"bazi",createdAt:"2026-11-23T00:00:00Z",result:{
  fourPillars:facts.fourPillars,dayMaster:facts.dayMaster,dayMasterElement:facts.dayMasterElement,
  dayMasterStrength:facts.strength,weightedFiveElements:facts.weighted,annualTimeline:facts.annual,
  careerProfile:{resourceCount:3,outputCount:1,officerCount:2},
  wealthProfile:{directWealthCount:1,indirectWealthCount:2}
 }};
 for(const [htmlStatus,expected] of [
  [200,/回傳網頁而非資料（HTTP 200）/],
  [504,/HTML 錯誤頁（HTTP 504）/],
  [302,/命書 API 被重新導向/]
 ]){
  const elements=new Map();
  const make=()=>({value:"",textContent:"",disabled:false,hidden:false,children:[],listeners:{},
   appendChild(child){this.children.push(child)},replaceChildren(...items){this.children=items},
   addEventListener(name,fn){this.listeners[name]=fn},append(...items){this.children.push(...items)},
   style:{setProperty(){}}
  });
  const document={
   getElementById(id){if(!elements.has(id))elements.set(id,make());return elements.get(id)},
   createElement(){return make()}
  };
  const mockFetch=async(path,options)=>{
   if(path.includes("?list=1"))return new Response(JSON.stringify({items:[]}),{
    status:200,headers:{"content-type":"application/json"}
   });
   assert.equal(options.redirect,"manual");
   assert.equal(options.headers.Accept,"application/json");
   return new Response(htmlStatus===302?null:"<!DOCTYPE html><html><body>Edge fallback</body></html>",{
    status:htmlStatus,headers:{"content-type":"text/html"}
   });
  };
  new Function("document","localStorage","location","window","fetch","crypto","console",browserJs)(
   document,{getItem(key){return key==="crew_fortune_readings_v2"?JSON.stringify([reading]):null}},
   {pathname:"/fortune/report-lab",hash:""},
   {history:{replaceState(){}},scrollTo(){},print(){}},
   mockFetch,{randomUUID:()=>UUID},{error(){}}
  );
  elements.get("question1").value="我的職涯應該如何安排？";
  await elements.get("generate").listeners.click();
  const message=elements.get("message").textContent;
  assert.match(message,expected);
  assert.doesNotMatch(message,/Unexpected token|<!DOCTYPE/i);
  assert.equal(elements.get("generate").disabled,false);
 }
});

test("a stalled Gemini request is aborted before the edge timeout",async()=>{
 let aborted=false;
 const stall=(_url,opts)=>new Promise((resolve,reject)=>{
  opts.signal.addEventListener("abort",()=>{
   aborted=true;
   reject(new Error("aborted"));
  },{once:true});
 });
 await assert.rejects(generateLabChapters(normalizeLabFacts(facts),{
  key:"private-unit-test-key",model,fetcher:stall,timeoutMs:20
 }),/UPSTREAM_TIMEOUT/);
 assert.equal(aborted,true);
 const d=db();
 const res=await post({request:request("",{method:"POST",body:{requestId:UUID,facts}}),
  env:env(d,{FORTUNE_LAB_TEST_FETCH:async()=>{throw Error("UPSTREAM_TIMEOUT")}})});
 assert.equal(res.status,504);
 assert.equal(res.headers.get("content-type")?.includes("application/json"),true);
 assert.equal((await res.json()).error,"AI_TIMEOUT");
 assert.ok(d.queries.some(sql=>sql.includes("status='failed'")));
});

test("missing login, wrong user, malicious origin and wrong method fail closed",async()=>{
 const d=db();
 assert.equal((await get({request:request("",{cookie:false}),env:env(d)})).status,401);
 assert.equal((await labGet({request:request(),env:env(d),verifyAdmin:async()=>false})).status,404);
 assert.equal((await get({request:request("",{origin:"https://evil.example"}),env:env(d)})).status,404);
 assert.equal((await post({request:request(),env:env(d)})).status,405);
});

test("backend-admin rejection blocks the private page, report reads and generation even with a valid Koolo session",async()=>{
 const d=db();
 const reject=async()=>false;
 const context={env:env(d),verifyAdmin:reject};
 assert.equal((await labPage({...context,request:pageRequest()})).status,404);
 assert.equal((await labGet({...context,request:request("?list=1")})).status,404);
 assert.equal((await labPost({...context,request:request("",{method:"POST",body:{requestId:UUID,facts}})})).status,404);
 assert.equal(d.queries.some(sql=>sql.includes("koolo_fortune_lab_reports")),false);
 assert.equal((await labPage({request:pageRequest(),env:env(d)})).status,404);
 assert.equal((await labPage({...context,verifyAdmin:async()=>{throw Error("auth backend unavailable")},request:pageRequest()})).status,404);
});

test("normalization rejects forged pillars, mismatched day master, unrelated date and excessive personal questions",()=>{
 assert.ok(normalizeLabFacts(facts));
 assert.equal(normalizeLabFacts({...facts,dayMaster:"戊"}),null);
 assert.equal(normalizeLabFacts({...facts,weighted:{...facts.weighted,火:-1}}),null);
 assert.equal(normalizeLabFacts({...facts,annual:facts.annual.slice(1)}),null);
 assert.equal(normalizeLabFacts({...facts,questions:["123","456"]}),null);
 assert.equal(normalizeLabFacts({...facts,questions:[...facts.questions,"third question"]}),null);
 const normalized=normalizeLabFacts({...facts,name:"PRIVATE PERSON",birthDate:"1990-01-01",email:"secret@example.com"});
 assert.equal(JSON.stringify(normalized).includes("PRIVATE PERSON"),false);
 assert.equal(JSON.stringify(normalized).includes("1990-01-01"),false);
});

test("generated narrative is validated, distinct and evidence grounded",()=>{
 const f=normalizeLabFacts(facts),good=chapters();
 assert.ok(validateLabChapters(good,f));
 assert.equal(validateLabChapters({...good,timing:"我不提供任何可驗證年份。".repeat(9)},f),null);
 assert.equal(validateLabChapters({...good,personality:"很棒".repeat(70)},f),null);
 assert.equal(validateLabChapters({...good,letter:good.career},f),null);
 const bad=structuredClone(good);bad.letter="<script>alert(1)</script>".repeat(20);
 assert.equal(validateLabChapters(bad,f),null);
});

test("only authorized owner can generate; Origin/JSON/content/limit guard run before Gemini",async()=>{
 const d=db();
 assert.equal((await post({request:request("",{method:"POST",body:{requestId:UUID,facts},requestOrigin:"https://evil.example"}),env:env(d)})).status,403);
 assert.equal((await post({request:request("",{method:"POST",body:{requestId:UUID,facts}}),env:env(d,{KOOLO_FORTUNE_LAB_GEMINI_KEY:""})})).status,503);
 assert.equal((await post({request:request("",{method:"POST",body:{requestId:UUID,facts:{...facts,dayMaster:"甲"}}}),env:env(d)})).status,400);
 const limited=await post({request:request("",{method:"POST",body:{requestId:UUID,facts}}),env:env(db({insertChanges:0}))});
 assert.equal(limited.status,429);
});

test("authorized generation saves a complete private snapshot and never mutates paid orders",async()=>{
 const d=db(),r=await post({request:request("",{method:"POST",body:{requestId:UUID,facts}}),
  env:env(d,{FORTUNE_LAB_TEST_FETCH:fakeProvider})});
 assert.equal(r.status,201);
 const {report}=await r.json();
 assert.equal(report.status,"ready");assert.equal(report.model,model);
 assert.equal(report.usage.outputTokens,780);
 assert.equal(report.facts.fourPillars,"甲子 乙丑 丙寅 丁卯");
 assert.equal(Object.keys(report.chapters).length,7);
 assert.ok(d.queries.some(x=>x.includes("status='ready'")));
 assert.ok(d.queries.every(x=>!/koolo_fortune_orders|koolo_fortune_reports|koolo_billing_orders|koolo_voice_wallets/.test(x)));
});

test("report details are never accessible across accounts; missing items stay unknown",async()=>{
 const d=db({found:null});
 const r=await get({request:request("?report="+UUID),env:env(d)});
 assert.equal(r.status,404);
 assert.ok(d.queries.some(sql=>/WHERE id=\? AND user_id=\?/.test(sql)));
});

test("provider failure does not mark a report ready",async()=>{
 const d=db();
 const r=await post({request:request("",{method:"POST",body:{requestId:UUID,facts}}),
  env:env(d,{FORTUNE_LAB_TEST_FETCH:async()=>new Response("bad",{status:503})})});
 assert.equal(r.status,502);assert.ok(d.queries.some(q=>q.includes("status='failed'")));
 assert.ok(!d.queries.some(q=>q.includes("status='ready'")));
});
