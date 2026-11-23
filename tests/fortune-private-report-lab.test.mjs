import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizeLabFacts,validateLabChapters,generateLabChapters,labPrompt,PARTS} from "../server/koolo-fortune-lab-core.mjs";
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
const model="gemini-3.5-flash";
const facts={
 fourPillars:"甲子 乙丑 丙寅 丁卯",dayMaster:"丙",dayMasterElement:"火",strength:"中和",
 weighted:{木:4,火:3,土:2,金:1,水:2},
 counts:{resource:3,output:1,officer:2,directWealth:1,indirectWealth:2},
 luck:{ganZhi:"庚午"},
 annual:[0,1,2].map(n=>({year:THIS_YEAR+n,ganZhi:["丙午","丁未","戊申"][n],themes:["學習／支援"]})),
 relations:["子午 六沖"]
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
 assert.doesNotMatch(html,/<textarea|id="question1"|id="question2"|YOUR QUESTIONS/);
 assert.match(html,/你的內在動機與壓力反應/);
 assert.match(html,/適合你的成長方向與生活節奏/);
 assert.doesNotMatch(html,/AI 個人化命理報告|AI PERSONAL GUIDANCE|AI 生成|老師給你的話/);
 const printedBook=html.slice(html.indexOf('<article class="sheet dark"'));
 assert.doesNotMatch(printedBook,/AI\s*生成|AI 個人|娛樂參考|私人驗收|非真人|非科學|命理解讀不是|專業保證/);
 assert.match(printedBook,/Koolo 專屬命書/);
 assert.match(html,/@media print\{/);
 assert.match(html,/#chooser,#report>\.actions,#message\{display:none!important\}/);
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
 assert.match(html,/<script src="\/assets\/js\/fortune-report-lab\.js\?v=20261123-reader1" defer><\/script>/);
 assert.match(readFileSync("_headers","utf8"),/\/assets\/js\/fortune-report-lab\.js\n  Cache-Control: no-store/);
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
  [302,/命書 API 被重新導向/],
  [502,/Cloudflare／代理層回應（非命書 API 格式）（HTTP 502）；Ray ID abcd1234abcd1234-TPE/]
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
   const incoming=JSON.parse(options.body);
   assert.equal(Object.hasOwn(incoming.facts,"questions"),false,"browser must never transmit personal questions");
   return new Response(htmlStatus===302?null:htmlStatus===502?
    JSON.stringify({errors:[{message:"upstream internal key SECRET_DO_NOT_SHOW"}]}):
    "<!DOCTYPE html><html><body>Edge fallback</body></html>",{
    status:htmlStatus,headers:htmlStatus===502?
     {"content-type":"application/json","cf-ray":"abcd1234abcd1234-TPE"}:{"content-type":"text/html"}
   });
  };
  new Function("document","localStorage","location","window","fetch","crypto","console",browserJs)(
   document,{getItem(key){return key==="crew_fortune_readings_v2"?JSON.stringify([reading]):null}},
   {pathname:"/fortune/report-lab",hash:""},
   {history:{replaceState(){}},scrollTo(){},print(){}},
   mockFetch,{randomUUID:()=>UUID},{error(){}}
  );
  await elements.get("generate").listeners.click();
  const message=elements.get("message").textContent;
  assert.match(message,expected);
  assert.doesNotMatch(message,/Unexpected token|<!DOCTYPE|SECRET_DO_NOT_SHOW|API_ERROR/i);
  assert.equal(elements.get("generate").disabled,false);
  assert.equal(elements.has("question1"),false);
  assert.equal(elements.has("question2"),false);
 }
});


function duplicateDb(stored,{loseClaim=false}={}){
 const queries=[];
 return {queries,prepare(sql){
  queries.push(sql);
  return {bind(...args){
   return {
    async first(){
     if(sql.includes("FROM crew_auth_sessions"))return {user_id:UUID};
     if(sql.includes("FROM koolo_fortune_lab_reports"))return stored;
     return null;
    },
    async all(){return {results:[]}},
    async run(){
     if(sql.includes("SET status='failed'")&&sql.includes("created_at<?"))
      return {meta:{changes:0}};
     if(sql.startsWith("INSERT INTO koolo_fortune_lab_reports"))
      return {meta:{changes:0}};
     if(sql.includes("SET status='generating'")){
      if(loseClaim){stored.status="generating";return {meta:{changes:0}}}
      stored.status="generating";return {meta:{changes:1}};
     }
     if(sql.includes("SET status='ready'"))stored.status="ready";
     return {meta:{changes:1}};
    }
   };
  }};
 }};
}

test("duplicate requestId returns an existing ready book without calling Gemini",async()=>{
 const id="aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
 const stored={id,user_id:UUID,request_id:UUID,status:"ready",created_at:100000,
  model,prompt_tokens:260,output_tokens:780,content_json:JSON.stringify({
   version:"bazi-private-lab-v2",facts:normalizeLabFacts(facts),chapters:chapters()
  })};
 let aiCalls=0;
 const database=duplicateDb(stored);
 const res=await post({request:request("",{method:"POST",body:{requestId:UUID,facts}}),
  env:env(database,{FORTUNE_LAB_TEST_FETCH:async()=>{aiCalls++;throw Error("duplicate book must not call Gemini")}})});
 assert.equal(res.status,200);
 const {report}=await res.json();
 assert.equal(report.id,id);
 assert.equal(report.version,"bazi-private-lab-v2");
 assert.equal(report.status,"ready");
 assert.equal(aiCalls,0);
 assert.equal(database.queries.some(q=>q.includes("SET status='generating'")),false);
 assert.equal(res.headers.get("X-Koolo-Fortune-Lab-API"),"v1");
});

test("duplicate generating ID returns 202 without another Gemini generation",async()=>{
 const stored={id:UUID,user_id:UUID,request_id:UUID,status:"generating",created_at:Math.floor(Date.now()/1000),
  model,prompt_tokens:0,output_tokens:0,content_json:null};
 let calls=0;
 const database=duplicateDb(stored);
 const res=await post({request:request("",{method:"POST",body:{requestId:UUID,facts}}),
  env:env(database,{FORTUNE_LAB_TEST_FETCH:async()=>{calls++;throw Error("no duplicate generation")}})});
 assert.equal(res.status,202);
 assert.equal((await res.json()).report.status,"generating");
 assert.equal(calls,0);
 assert.equal((await get({request:request("?report="+UUID),env:env(database)})).status,202);
});

test("failed requestId is atomically reclaimed without creating a second row",async()=>{
 const originalId="aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
 const stored={id:originalId,user_id:UUID,request_id:UUID,status:"failed",created_at:100000,
  model,prompt_tokens:0,output_tokens:0,content_json:null};
 const database=duplicateDb(stored);
 let calls=0;
 const res=await post({request:request("",{method:"POST",body:{requestId:UUID,facts}}),
  env:env(database,{FORTUNE_LAB_TEST_FETCH:async(url,opts)=>{calls++;return fakeProvider(url,opts)}})});
 assert.equal(res.status,201);
 const {report}=await res.json();
 assert.equal(report.id,originalId);
 assert.equal(report.status,"ready");
 assert.equal(calls,1);
 assert.equal(database.queries.filter(q=>q.includes("INSERT INTO koolo_fortune_lab_reports")).length,1);
 assert.equal(database.queries.filter(q=>q.includes("SET status='generating'")).length,1);
 assert.match(database.queries.join("\n"),/status='failed' AND/);
});

test("lost retry race returns another caller's generating state without duplicate Gemini work",async()=>{
 const stored={id:UUID,user_id:UUID,request_id:UUID,status:"failed",created_at:100000,
  model,prompt_tokens:0,output_tokens:0,content_json:null};
 const database=duplicateDb(stored,{loseClaim:true});
 let calls=0;
 const res=await post({request:request("",{method:"POST",body:{requestId:UUID,facts}}),
  env:env(database,{FORTUNE_LAB_TEST_FETCH:async()=>{calls++;throw Error("no second Gemini call")}})});
 assert.equal(res.status,202);
 assert.equal((await res.json()).report.status,"generating");
 assert.equal(calls,0);
});


test("mobile PWA retry reuses the same request ID after a lost 502, without resubmitting another report",async()=>{
 const source=readFileSync("assets/js/fortune-report-lab.js","utf8");
 const reading={id:"chart-123",mode:"bazi",createdAt:"2026-11-23T00:00:00Z",result:{
  fourPillars:facts.fourPillars,dayMaster:facts.dayMaster,dayMasterElement:facts.dayMasterElement,
  dayMasterStrength:facts.strength,weightedFiveElements:facts.weighted,annualTimeline:facts.annual,
  careerProfile:{resourceCount:3,outputCount:1,officerCount:2},
  wealthProfile:{directWealthCount:1,indirectWealthCount:2}
 }};
 const elements=new Map();
 const make=()=>({value:"",textContent:"",disabled:false,hidden:false,children:[],listeners:{},
  appendChild(child){this.children.push(child)},replaceChildren(...children){this.children=children},
  addEventListener(name,fn){this.listeners[name]=fn},append(...children){this.children.push(...children)},
  style:{setProperty(){}}
 });
 const document={
  getElementById(id){if(!elements.has(id))elements.set(id,make());return elements.get(id)},
  createElement(){return make()}
 };
 const storage=new Map(),requests=[];
 const mockStorage={
  getItem(key){return storage.get(key)||null},
  setItem(key,value){storage.set(key,value)},
  removeItem(key){storage.delete(key)}
 };
 const fetch=async (path,opts)=>{
  if(path.includes("?list=1"))return new Response(JSON.stringify({items:[]}),{
   headers:{"content-type":"application/json"}
  });
  if(opts.method==="POST"){
   requests.push(JSON.parse(opts.body));
   return new Response(JSON.stringify({error:"GENERATION_FAILED",id:UUID}),{
    status:502,headers:{"content-type":"application/json","x-koolo-fortune-lab-api":"v1"}
   });
  }
  throw Error("Unexpected request in test: "+path);
 };
 new Function("document","localStorage","sessionStorage","location","window","fetch","crypto","console",source)(
  document,{getItem(key){return key==="crew_fortune_readings_v2"?JSON.stringify([reading]):null}},
  mockStorage,{pathname:"/fortune/report-lab",hash:""},
  {history:{replaceState(){}},scrollTo(){},print(){}},
  fetch,{randomUUID:()=>UUID},{error(){}}
 );
 const click=elements.get("generate").listeners.click;
 await click();
 await click();
 assert.equal(requests.length,2);
 assert.equal(requests[0].requestId,UUID);
 assert.equal(requests[1].requestId,UUID);
 assert.equal(storage.has("koolo_fortune_lab_pending_v1"),true);
 assert.equal(Object.hasOwn(requests[0].facts,"questions"),false);
 assert.match(elements.get("message").textContent,/製作未完成/);
});

test("first-party generation failures are marked as JSON and failed jobs do not consume daily quota",async()=>{
 const dbInstance=db();
 const res=await post({request:request("",{method:"POST",body:{requestId:UUID,facts}}),
  env:env(dbInstance,{FORTUNE_LAB_TEST_FETCH:async()=>new Response("unavailable",{status:502})})});
 assert.equal(res.status,502);
 assert.equal(res.headers.get("X-Koolo-Fortune-Lab-API"),"v1");
 assert.equal((await res.json()).error,"GEMINI_UPSTREAM_502");
 assert.ok(dbInstance.queries.some(q=>q.includes("status='failed'")&&q.includes("created_at<?")));
 assert.ok(dbInstance.queries.some(q=>q.includes("status IN ('generating','ready')")));
 assert.ok(dbInstance.queries.some(q=>q.includes("SET status='failed'")));
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

test("normalization rejects forged chart facts but ignores legacy personal questions",()=>{
 assert.ok(normalizeLabFacts(facts));
 assert.equal(normalizeLabFacts({...facts,dayMaster:"戊"}),null);
 assert.equal(normalizeLabFacts({...facts,weighted:{...facts.weighted,火:-1}}),null);
 assert.equal(normalizeLabFacts({...facts,annual:facts.annual.slice(1)}),null);
 const legacyQuestions=["明天會不會發財？","我的職涯應該如何安排？"];
 const legacy=normalizeLabFacts({...facts,questions:legacyQuestions});
 assert.ok(legacy);
 assert.equal(Object.hasOwn(legacy,"questions"),false);
 assert.doesNotMatch(JSON.stringify(legacy),/發財|職涯應該/);
 const normalized=normalizeLabFacts({...facts,name:"PRIVATE PERSON",birthDate:"1990-01-01",email:"secret@example.com"});
 assert.equal(JSON.stringify(normalized).includes("PRIVATE PERSON"),false);
 assert.equal(JSON.stringify(normalized).includes("1990-01-01"),false);
});

test("portrait prompt relies on chart signals, not user Q&A, biography inventions or author identity",()=>{
 const source=normalizeLabFacts({...facts,questions:["明天會不會發財？"]});
 const prompt=labPrompt(source);
 assert.match(prompt,/詳細人物側寫/);
 assert.match(prompt,/內在驅動與壓力反應/);
 assert.match(prompt,/長期成長方向/);
 assert.match(prompt,/四柱/);
 assert.doesNotMatch(prompt,/明天會不會發財|Koolo AI 命理老師|真人命理師|AI 系統/);
 assert.doesNotMatch(JSON.stringify(source),/questions|明天會不會/);
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
 assert.equal(report.version,"bazi-private-lab-v2");
 assert.equal(Object.hasOwn(report.facts,"questions"),false);
 assert.ok(d.queries.some(x=>x.includes("status='ready'")));
 assert.ok(d.queries.every(x=>!/koolo_fortune_orders|koolo_fortune_reports|koolo_billing_orders|koolo_voice_wallets/.test(x)));
});

test("Gemini 2.5 404 falls back to Gemini 3.5 Flash within one D1 report attempt",async()=>{
 const calls=[],d=db();
 const fetcher=async(url,opts)=>{
  calls.push(url);
  if(url.includes("/gemini-2.5-flash:"))return new Response('{"error":"retired"}',{status:404});
  assert.ok(url.includes("/gemini-3.5-flash:"),"fallback must use current text model");
  return fakeProvider(url,opts);
 };
 const r=await post({request:request("",{method:"POST",body:{requestId:UUID,facts}}),
  env:env(d,{KOOLO_FORTUNE_LAB_MODEL:"gemini-2.5-flash",FORTUNE_LAB_TEST_FETCH:fetcher})});
 assert.equal(r.status,201);
 const json=await r.json();
 assert.equal(json.report.model,"gemini-3.5-flash");
 assert.equal(calls.length,2);
 assert.equal(d.queries.filter(sql=>sql.includes("INSERT INTO koolo_fortune_lab_reports")).length,1);
 assert.ok(d.queries.some(sql=>sql.includes("SET status='ready',model=?")));
});

test("Gemini 3.5 Flash 404 falls back to Flash-Lite, but 403 is not retried",async()=>{
 const f=normalizeLabFacts(facts),models=[];
 const result=await generateLabChapters(f,{
  key:"this-is-only-a-unit-test-key-123456",model:"gemini-3.5-flash",
  fetcher:async(url,opts)=>{
   models.push(url);
   return url.includes("gemini-3.5-flash-lite:")?fakeProvider(url,opts):
    new Response('{"error":"not found"}',{status:404});
  }
 });
 assert.equal(result.model,"gemini-3.5-flash-lite");
 assert.equal(models.length,2);
 let authCalls=0;
 await assert.rejects(generateLabChapters(f,{
  key:"this-is-only-a-unit-test-key-123456",model:"gemini-2.5-flash",
  fetcher:async()=>{authCalls++;return new Response("denied",{status:403})}
 }),/UPSTREAM_403/);
 assert.equal(authCalls,1,"permission errors must never trigger extra model requests");
});

test("legacy Q&A books remain readable with their original version",async()=>{
 const row={id:UUID,status:"ready",created_at:1795400000,model,
  prompt_tokens:150,output_tokens:500,
  content_json:JSON.stringify({version:"bazi-private-lab-v1",
   facts:{...normalizeLabFacts(facts),questions:["我的職涯應該如何安排？"]},
   chapters:chapters()})};
 const response=await get({request:request("?report="+UUID),env:env(db({found:row}))});
 assert.equal(response.status,200);
 const {report}=await response.json();
 assert.equal(report.version,"bazi-private-lab-v1");
 assert.match(report.chapters.letter,/專屬命書/);
 const browser=readFileSync("assets/js/fortune-report-lab.js","utf8");
 assert.match(browser,/legacy=x\.version!=="bazi-private-lab-v2"/);
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

test("PWA recovers an obscured 502 from the saved report and shows the classified failure",async()=>{
 const browserJs=readFileSync("assets/js/fortune-report-lab.js","utf8");
 const reading={id:"reading_test",mode:"bazi",createdAt:"2026-11-23T00:00:00Z",result:{
  fourPillars:facts.fourPillars,dayMaster:facts.dayMaster,dayMasterElement:facts.dayMasterElement,
  dayMasterStrength:facts.strength,weightedFiveElements:facts.weighted,annualTimeline:facts.annual,
  careerProfile:{resourceCount:3,outputCount:1,officerCount:2},
  wealthProfile:{directWealthCount:1,indirectWealthCount:2}
 }};
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
 let generationPosts=0,progressReads=0;
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,
  headers:{"content-type":"application/json"}});
 const mockFetch=async(path,options)=>{
  if(path.includes("?list=1"))return json({items:[]});
  if(path.includes("?report=")){
   progressReads++;
   return json({report:{id:UUID,status:"failed",
    progress:{completed:0,total:7,busy:false,lastFailure:"GEMINI_UPSTREAM_503"}}});
  }
  const payload=JSON.parse(options.body);
  if(payload.action==="advance"){
   generationPosts++;
   return json({errors:[{message:"PRIVATE_UPSTREAM_RESPONSE_MUST_NOT_LEAK"}]},502);
  }
  assert.equal(payload.pipeline,"chapters");
  return json({report:{id:UUID,status:"generating",
   progress:{completed:0,total:7,busy:false}}},202);
 };
 const sessionStorage={item:null,getItem(){return this.item},setItem(_,value){this.item=value},
  removeItem(){this.item=null}};
 new Function("document","localStorage","sessionStorage","location","window","fetch","crypto","console",browserJs)(
  document,{getItem(key){return key==="crew_fortune_readings_v2"?JSON.stringify([reading]):null}},
  sessionStorage,{pathname:"/fortune/report-lab",hash:""},
  {history:{replaceState(){}},scrollTo(){},print(){}},mockFetch,
  {randomUUID:()=>UUID},{error(){}}
 );
 await elements.get("generate").listeners.click();
 const message=elements.get("message").textContent;
 assert.match(message,/GEMINI_UPSTREAM_503/);
 assert.match(message,/已完成的章節仍保存在製作紀錄/);
 assert.doesNotMatch(message,/PRIVATE_UPSTREAM_RESPONSE_MUST_NOT_LEAK|Cloudflare／代理層回應/);
 assert.equal(generationPosts,1);
 assert.equal(progressReads,1,"recover from the existing report instead of starting a new one");
 assert.equal(JSON.parse(sessionStorage.item).requestId,UUID);
});
