import test from "node:test";
import assert from "node:assert/strict";
import {labPost,labGet} from "../server/koolo-fortune-report-lab.mjs";
import {PARTS,normalizeLabFacts,generateLabPart,labPartPrompt} from "../server/koolo-fortune-lab-core.mjs";

const UUID="11111111-2222-4333-8444-555555555555";
const USER="22222222-2222-4333-8444-555555555555";
const YEAR=new Date(Date.now()+8*3600*1000).getUTCFullYear();
const facts={
 fourPillars:"甲子 乙丑 丙寅 丁卯",dayMaster:"丙",dayMasterElement:"火",strength:"中和",
 weighted:{木:4,火:3,土:2,金:1,水:2},
 counts:{resource:3,output:1,officer:2,directWealth:1,indirectWealth:2},
 luck:{ganZhi:"庚午"},
 annual:[0,1,2].map((n)=>({year:YEAR+n,ganZhi:["丙午","丁未","戊申"][n],themes:["學習"]})),
 relations:["子午 六沖"]
};
const env=(db,fetcher)=>({CREW_AUTH_DB:db,
 KOOLO_FORTUNE_LAB_GEMINI_KEY:"private-test-key-long-enough",
 FORTUNE_LAB_TEST_FETCH:fetcher});
const req=(body)=>new Request("https://koolo.app/api/fortune/report-lab",{
 method:"POST",headers:{"Content-Type":"application/json","Origin":"https://koolo.app",
  "Cookie":"__Host-crew_session="+"a".repeat(43)},body:JSON.stringify(body)
});
const getReq=(id)=>new Request("https://koolo.app/api/fortune/report-lab?report="+id,{
 headers:{"Cookie":"__Host-crew_session="+"a".repeat(43)}});
const post=(database,fetcher,body)=>labPost({request:req(body),env:env(database,fetcher),verifyAdmin:async()=>true});
const get=(database,id)=>labGet({request:getReq(id),env:env(database),verifyAdmin:async()=>true});
function database(){
 const db={row:null,statements:[],prepare(sql){
  db.statements.push(sql);
  return {bind(...args){
   return {
    async first(){
     if(sql.includes("FROM crew_auth_sessions"))return {user_id:USER};
     if(sql.includes("FROM koolo_fortune_lab_reports WHERE user_id=? AND request_id=?"))
      return db.row&&db.row.user_id===args[0]&&db.row.request_id===args[1]?{...db.row}:null;
     if(sql.includes("FROM koolo_fortune_lab_reports WHERE id=? AND user_id=?"))
      return db.row&&db.row.id===args[0]&&db.row.user_id===args[1]?{...db.row}:null;
     return null;
    },
    async all(){return {results:db.row?[{...db.row}]:[]}},
    async run(){
     if(sql.startsWith("INSERT INTO koolo_fortune_lab_reports")){
      if(db.row)return {meta:{changes:0}};
      db.row={id:args[0],user_id:args[1],request_id:args[2],status:"generating",
       model:args[3],content_json:args[4],created_at:args[5],updated_at:args[6],
       prompt_tokens:0,output_tokens:0};
      return {meta:{changes:1}};
     }
     if(sql.includes("AND created_at<? AND updated_at<?"))return {meta:{changes:0}};
     if(!db.row)return {meta:{changes:0}};
     if(sql.includes("SET status='generating',created_at=?")){
      if(db.row.id!==args[2]||db.row.user_id!==args[3]||db.row.status!=="failed")
       return {meta:{changes:0}};
      Object.assign(db.row,{status:"generating",created_at:args[0],updated_at:args[1]});
      return {meta:{changes:1}};
     }
     if(sql.includes("SET status='generating',model=?")){
      if(db.row.status!=="failed")return {meta:{changes:0}};
      db.row.status="generating";db.row.model=args[0];
      db.row.created_at=args[1];db.row.updated_at=args[2];
      if(!args[3])db.row.content_json=null;
      else db.row.content_json=db.row.content_json||args[4];
      return {meta:{changes:1}};
     }
     if(sql.includes("SET content_json=?,updated_at=?")){
      if(db.row.status!=="generating"||db.row.id!==args[2]||db.row.user_id!==args[3]||
       db.row.content_json!==args[4])return {meta:{changes:0}};
      db.row.content_json=args[0];db.row.updated_at=args[1];
      return {meta:{changes:1}};
     }
     if(sql.includes("SET status=?,model=?,content_json=?")){
      if(db.row.status!=="generating"||db.row.content_json!==args[8])
       return {meta:{changes:0}};
      Object.assign(db.row,{status:args[0],model:args[1],content_json:args[2],
       prompt_tokens:args[3],output_tokens:args[4],updated_at:args[5]});
      return {meta:{changes:1}};
     }
     if(sql.includes("SET status='failed',content_json=?")){
      if(db.row.status!=="generating"||db.row.content_json!==args[4])
       return {meta:{changes:0}};
      db.row.status="failed";db.row.content_json=args[0];db.row.updated_at=args[1];
      return {meta:{changes:1}};
     }
     throw Error("Unexpected SQL: "+sql);
    }
   };
  }};
 }};
 return db;
}
function provider({calls=[],failAt=null,alwaysFailPart=null}={}){
 return async(_url,options)=>{
  const prompt=JSON.parse(options.body).contents[0].parts[0].text;
  const part=PARTS.find(p=>prompt.includes("本次僅撰寫："+p+"。"));
  assert.ok(part,"each AI request must ask for exactly one chapter");
  const config=JSON.parse(options.body).generationConfig;
  assert.equal(config.maxOutputTokens,6144);
  assert.equal(config.responseMimeType,undefined,"single chapter needs no JSON wrapper");
  assert.equal(config.thinkingConfig?.thinkingLevel,"LOW");
  calls.push(part);
  if(alwaysFailPart===part||(failAt&&calls.length===failAt))
   return new Response("upstream unavailable",{status:503});
  const txt=("依據丙火日主、木火互動與五行配置，這個人可能在面對選擇時同時重視效率和關係，適合透過觀察實際情況建立自己更舒服的節奏，而不是預設任何人生經歷。").repeat(4)+
   " 觀察年份 "+YEAR+" 年的節奏，重點是選擇與調整。本章專注於 "+part+" 的獨特面向。";
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:txt}]},finishReason:"STOP"}],
   usageMetadata:{promptTokenCount:87,candidatesTokenCount:210}}),{
    headers:{"Content-Type":"application/json"},status:200});
 };
}
test("a new report returns immediately; seven bounded chapters commit one at a time",async()=>{
 const db=database(),calls=[];
 const ai=provider({calls});
 let response=await post(db,ai,{requestId:UUID,facts,pipeline:"chapters"});
 assert.equal(response.status,202);
 let {report}=await response.json();
 assert.equal(report.progress.completed,0);
 assert.equal(calls.length,0,"create must not block on Gemini");
 assert.equal(db.row.status,"generating");
 const id=report.id;
 for(let i=0;i<PARTS.length;i++){
  response=await post(db,ai,{action:"advance",reportId:id});
  assert.equal(response.status,i===PARTS.length-1?201:202);
  report=(await response.json()).report;
  if(i<PARTS.length-1){
   assert.equal(report.progress.completed,i+1);
   assert.equal(JSON.parse(db.row.content_json).chapters[PARTS[i]].length>=150,true);
  }
 }
 assert.deepEqual(calls,PARTS);
 assert.equal(report.status,"ready");
 assert.equal(report.version,"bazi-private-lab-v2");
 assert.equal(Object.keys(report.chapters).length,7);
 assert.equal(report.usage.outputTokens,1470);
 assert.equal((await get(db,id)).status,200);
 assert.equal((await post(db,ai,{action:"advance",reportId:id})).status,200,
  "a repeated advance must never regenerate a ready report");
 assert.equal(calls.length,7);
 assert.ok(db.statements.every(s=>!/koolo_fortune_orders|koolo_voice_wallets/.test(s)));
});
test("a failed third chapter preserves the first two and retry never repeats them",async()=>{
 const db=database(),calls=[],ai=provider({calls,alwaysFailPart:"career"});
 const start=await post(db,ai,{requestId:UUID,facts,pipeline:"chapters"});
 const id=(await start.json()).report.id;
 await post(db,ai,{action:"advance",reportId:id});
 await post(db,ai,{action:"advance",reportId:id});
 const fail=await post(db,ai,{action:"advance",reportId:id});
 assert.equal(fail.status,200,"expected provider failure is a JSON report outcome, not an edge 502");
 assert.equal(fail.headers.get("X-Koolo-Fortune-Lab-API"),"v1");
 const failure=(await fail.json()).report;
 assert.equal(failure.status,"failed");
 assert.equal(failure.progress.lastFailure,"GEMINI_UPSTREAM_503");
 assert.equal(db.row.status,"failed");
 assert.equal(JSON.parse(db.row.content_json).chapters.preface.length>150,true);
 assert.equal(JSON.parse(db.row.content_json).chapters.personality.length>150,true);
 const checkpoint=(await (await get(db,id)).json()).report.progress;
 assert.equal(checkpoint.completed,2);
 let resumed=await post(db,provider({calls}),{action:"advance",reportId:id});
 assert.equal(resumed.status,202);
 assert.equal((await resumed.json()).report.progress.completed,3);
 for(let i=3;i<7;i++)resumed=await post(db,provider({calls}),{action:"advance",reportId:id});
 assert.equal(resumed.status,201);
 assert.deepEqual(calls,["preface","personality","career","career","career","relationships","timing","letter","plan"]);
});
test("a live per-chapter D1 lease prevents concurrent Gemini charges; expired leases recover",async()=>{
 const db=database(),calls=[];
 const start=await post(db,()=>{throw Error("create must not call provider")},{
  requestId:UUID,facts,pipeline:"chapters"});
 const id=(await start.json()).report.id;
 let release;
 const blocked=async(url,options)=>{
  const wait=new Promise(resolve=>{release=resolve});
  await wait;
  return provider({calls})(url,options);
 };
 const first=post(db,blocked,{action:"advance",reportId:id});
 for(let i=0;i<100&&!release;i++)await new Promise(resolve=>setTimeout(resolve,1));
 assert.equal(typeof release,"function");
 const second=await post(db,provider({calls}),{action:"advance",reportId:id});
 assert.equal(second.status,202);
 assert.equal((await second.json()).report.progress.busy,true);
 assert.equal(calls.length,0);
 release();
 assert.equal((await first).status,202);
 assert.deepEqual(calls,["preface"]);
 const snapshot=JSON.parse(db.row.content_json);
 snapshot.lease={token:"previous-aborted-invocation",until:Date.now()-1000};
 db.row.content_json=JSON.stringify(snapshot);
 const recovered=await post(db,provider({calls}),{action:"advance",reportId:id});
 assert.equal(recovered.status,202);
 assert.equal((await recovered.json()).report.progress.completed,2);
 assert.deepEqual(calls,["preface","personality"]);
});
test("ready legacy rows remain accessible, while unauthenticated or foreign resumes fail closed",async()=>{
 const db=database();
 const start=await post(db,provider(),{requestId:UUID,facts,pipeline:"chapters"});
 const id=(await start.json()).report.id;
 const foreign=await labPost({request:req({action:"advance",reportId:id}),
  env:env(db,provider()),verifyAdmin:async()=>false});
 assert.equal(foreign.status,404);
 const unknown="aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
 assert.equal((await post(db,provider(),{action:"advance",reportId:unknown})).status,404);
 const noCookie=new Request("https://koolo.app/api/fortune/report-lab",{method:"POST",
  headers:{"Origin":"https://koolo.app","Content-Type":"application/json"},
  body:JSON.stringify({action:"advance",reportId:id})});
 assert.equal((await labPost({request:noCookie,env:env(db,provider()),verifyAdmin:async()=>true})).status,401);
 assert.ok(labPartPrompt(normalizeLabFacts(facts),"letter").includes("內在驅動"));
 await assert.rejects(generateLabPart(normalizeLabFacts(facts),"bad",{
  key:"only-test-key",model:"gemini-3.5-flash",fetcher:provider()
 }),/INVALID_PART/);
});

test("a transient upstream 503 retries once within the same chapter and checkpoints success",async()=>{
 const db=database(),calls=[],ai=provider({calls,failAt:1});
 const start=await post(db,ai,{requestId:UUID,facts,pipeline:"chapters"});
 const id=(await start.json()).report.id;
 const response=await post(db,ai,{action:"advance",reportId:id});
 assert.equal(response.status,202);
 const data=(await response.json()).report;
 assert.equal(data.status,"generating");
 assert.equal(data.progress.completed,1);
 assert.deepEqual(calls,["preface","preface"]);
 assert.equal(db.row.status,"generating");
 assert.ok(JSON.parse(db.row.content_json).chapters.preface);
 assert.equal(JSON.parse(db.row.content_json).lastFailure,null);
});

test("plain-text chapter avoids invalid JSON and the first passage is checkpointed",async()=>{
 const normalized=normalizeLabFacts(facts);
 assert.doesNotMatch(labPartPrompt(normalized,"preface"),/只回傳 JSON 物件/);
 assert.match(labPartPrompt(normalized,"preface"),/只輸出本章完整的繁體中文正文/);
 const raw=("依據日主丙火與原局五行木火較旺的線索，你在面對選擇時可能偏向把實際做法、人的感受和長期節奏一起考量。").repeat(4);
 let upstreamCalls=0;
 const reply=await generateLabPart(normalized,"preface",{
  key:"only-test-key",model:"gemini-3.5-flash",
  fetcher:async(_url,opt)=>{
   upstreamCalls++;
   assert.equal(JSON.parse(opt.body).generationConfig.responseMimeType,undefined);
   return new Response(JSON.stringify({candidates:[{content:{parts:[{text:raw}]},finishReason:"STOP"}],
    usageMetadata:{promptTokenCount:100,candidatesTokenCount:200}}),{status:200});
  }
 });
 assert.equal(reply.text,raw);
 assert.equal(reply.finishReason,"STOP");
 assert.equal(upstreamCalls,1);
});

test("Gemini MAX_TOKENS does not save an incomplete first chapter; same report resumes",async()=>{
 const db=database(),calls=[],normalized=normalizeLabFacts(facts);
 const truncated=async(_url,opt)=>{
  const prompt=JSON.parse(opt.body).contents[0].parts[0].text;
  const part=PARTS.find(p=>prompt.includes("本次僅撰寫："+p+"。"));
  calls.push(part);
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:"不完整的正文".repeat(35)}]},
   finishReason:"MAX_TOKENS"}],usageMetadata:{promptTokenCount:190,candidatesTokenCount:6144}}),{status:200});
 };
 const start=await post(db,truncated,{requestId:UUID,facts,pipeline:"chapters"});
 const id=(await start.json()).report.id;
 const failed=await post(db,truncated,{action:"advance",reportId:id});
 assert.equal(failed.status,200);
 assert.equal((await failed.json()).report.progress.lastFailure,"GEMINI_TRUNCATED");
 assert.equal(db.row.status,"failed");
 assert.deepEqual(JSON.parse(db.row.content_json).chapters,{});
 assert.deepEqual(calls,["preface"],"do not retry truncated provider output automatically");
 const recovered=await post(db,provider({calls}),{action:"advance",reportId:id});
 assert.equal(recovered.status,202);
 assert.equal((await recovered.json()).report.progress.completed,1);
 assert.deepEqual(calls,["preface","preface"]);
 assert.equal(JSON.parse(db.row.content_json).lastFailure,null);
});

test("malformed legacy JSON is refused, but valid legacy JSON remains readable",async()=>{
 const normalized=normalizeLabFacts(facts);
 const request=async text=>generateLabPart(normalized,"preface",{
  key:"only-test-key",model:"gemini-3.5-flash",fetcher:async()=>new Response(
   JSON.stringify({candidates:[{content:{parts:[{text}]},finishReason:"STOP"}]}),{status:200})
 });
 await assert.rejects(request('{"preface":"不完整'),/UPSTREAM_INVALID_FORMAT/);
 const passage=("丙火日主與木火生助的配置，呈現重視效率與關係、願意持續調整節奏的傾向。").repeat(5);
 const generated=await request(JSON.stringify({preface:passage}));
 assert.equal(generated.text,passage);
});
