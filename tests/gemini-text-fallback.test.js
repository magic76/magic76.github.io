const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const expected=[
 "gemini-3.6-flash","gemini-3.5-flash-lite","gemini-3.5-flash",
 "gemini-3.0-flash","gemini-3-flash","gemini-2.5-flash",
 "gemini-2.0-flash","gemini-1.5-flash"
];
function harness(reply){
 const calls=[],memory=new Map([["crew_gemini_api_key","test-key"]]);
 const localStorage={getItem:key=>memory.get(key)||null,setItem:(key,v)=>memory.set(key,String(v)),removeItem:key=>memory.delete(key)};
 const sessionStorage={getItem:()=>null,removeItem:()=>{},setItem:()=>{}};
 const document={querySelectorAll:()=>[]};
 const window={};
 async function fetch(url){
  if(url.includes("?pageSize="))return{ok:true,json:async()=>({models:[]})};
  const match=url.match(/\\/models\\/([^/:]+):generateContent/);
  assert.ok(match,"Expected a Gemini text-generation request");
  const model=decodeURIComponent(match[1]);calls.push(model);
  const result=reply(model,calls.length);
  if(typeof result==="string")return{ok:true,status:200,json:async()=>({
   candidates:[{content:{parts:[{text:result}]}}]
  })};
  const status=result.status||404;
  return {ok:false,status,json:async()=>({error:{status:result.reason||"NOT_FOUND",message:result.message||"model unavailable"}})};
 }
 const code=fs.readFileSync(path.join(root,"crew.js"),"utf8");
 vm.runInNewContext(code,{window,document,localStorage,sessionStorage,fetch,setTimeout,clearTimeout,WebSocket:{}});
 return{calls,ai:window.CrewAI};
}
test("Gemini text fallback exactly follows Android model priority",async()=>{
 const {calls,ai}=harness(model=>model==="gemini-2.5-flash"
  ?'{"topics":[],"memory_updates":{}}':{status:404});
 const value=await ai.call("Extract a memory",{preferLive:false,json:true});
 assert.ok(JSON.parse(value).memory_updates);
 assert.deepEqual(calls,expected.slice(0,6));
});
test("text fallback retries quota and malformed structured JSON",async()=>{
 const {calls,ai}=harness((model,n)=>n===1?{status:429,reason:"RESOURCE_EXHAUSTED"}:
   n===2?"invalid-json":'{"memory_updates":{}}');
 const value=await ai.call("Extract a memory",{preferLive:false,json:true});
 assert.ok(JSON.parse(value).memory_updates);
 assert.deepEqual(calls,expected.slice(0,3));
});
test("invalid Gemini API key stops fallback without hammering eight models",async()=>{
 const {calls,ai}=harness(()=>({status:401,reason:"UNAUTHENTICATED"}));
 await assert.rejects(ai.call("Extract",{preferLive:false,json:true}),err=>err.kind==="key");
 assert.deepEqual(calls,[expected[0]]);
});
test("all unavailable models preserve categorized errors, not raw API messages",async()=>{
 const {calls,ai}=harness(()=>({status:429,reason:"RESOURCE_EXHAUSTED",message:"Private upstream details"}));
 await assert.rejects(ai.call("Extract",{preferLive:false,json:true}),err=>
  err.kind==="quota"&&!err.message.includes("Private upstream details"));
 assert.deepEqual(calls,expected);
});
test("Crew Friend and Teacher memory do not bypass the shared fallback",()=>{
 for(const file of ["web-spa/src/friends/friendMemory.ts","web-spa/src/teacher/studentMemory.ts"]){
  const source=fs.readFileSync(path.join(root,file),"utf8");
  assert.ok(source.includes("window.CrewAI.call"),file+" must use CrewAI");
  assert.ok(!source.includes("models/gemini-2.5-flash:generateContent"),file+" must not hardcode one model");
 }
});
