const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../functions/api/feedback.js"),"utf8");
const load=()=>import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const token="123456:"+("A".repeat(35)),chatId="7788990011";
const payload={kind:"bug",message:"My game did not save the last move. Please fix this.\nIt happened twice.",contact:"someone@example.com",page:"/chat",website:""};
const request=(body=payload)=>new Request("https://www.3sssi.com/api/feedback",{
 method:"POST",headers:{"origin":"https://www.3sssi.com","content-type":"application/json","cf-connecting-ip":"203.0.113.12"},
 body:JSON.stringify(body)
});
function fakeDb(){
 let id=200,rate=0;
 const rows=[];
 return {rows,prepare(sql){
  let args=[];
  return {bind(...values){args=values;return this},async run(){
   if(sql.startsWith("CREATE TABLE")||sql.startsWith("DELETE FROM crew_feedback_limit"))
    return {success:true,meta:{changes:0}};
   if(sql.startsWith("INSERT INTO crew_feedback_limit")){
    if(rate>=3)return {success:true,meta:{changes:0}};
    rate++;return{success:true,meta:{changes:1}};
   }
   if(sql.startsWith("INSERT INTO crew_feedback (")){
    rows.push(args);return {success:true,meta:{changes:1,last_row_id:++id}};
   }
   throw Error("Unexpected DB query: "+sql);
  }};
 }};
}
function config(db,override={}){
 return {CREW_FEEDBACK_DB:db,CREW_FEEDBACK_TG_BOT_TOKEN:token,CREW_FEEDBACK_TG_CHAT_ID:chatId,...override};
}
test("Telegram includes full multiline message and source path after successful D1 insert",async()=>{
 const api=await load(),db=fakeDb(),jobs=[],calls=[],old=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  calls.push({url,options});
  return new Response(JSON.stringify({ok:true,result:{message_id:1}}),{status:200});
 };
 try{
  const response=await api.onRequestPost({request:request(),env:config(db),waitUntil:task=>jobs.push(task)});
  assert.equal(response.status,201);
  const receipt=await response.json();
  assert.deepEqual(receipt,{ok:true,reference:"FB-201"});
  assert.equal(db.rows.length,1);
  assert.equal(jobs.length,1);
  await Promise.all(jobs);
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,"https://api.telegram.org/bot"+token+"/sendMessage");
  assert.equal(calls[0].options.method,"POST");
  assert.equal(calls[0].options.headers["Content-Type"],"application/json");
  const sent=JSON.parse(calls[0].options.body);
  assert.equal(sent.chat_id,chatId);
  assert.match(sent.text,/FB-201/);
  assert.match(sent.text,/問題回報/);
  assert.match(sent.text,/https:\/\/www\.3sssi\.com\/usage\/feedback/);
  assert.ok(sent.text.includes("\n"),"Telegram notice must contain readable line breaks");
  assert.deepEqual(sent.link_preview_options,{is_disabled:true});
  assert.ok(sent.text.includes(payload.message),"full unmodified feedback text is sent");
  assert.ok(sent.text.includes("來源頁面：/chat"));
  assert.ok(sent.text.includes("使用者留言：\n"+payload.message));
  assert.ok(!sent.text.includes(payload.contact),"separate optional contact email must not be sent");
  assert.equal(Object.hasOwn(sent,"parse_mode"),false,"user-authored markup must not be interpreted");
  assert.ok(!JSON.stringify(receipt).includes(token));
 }finally{globalThis.fetch=old}
});
test("Telegram preserves full 1,500-character plain text including markup-like content",async()=>{
 const api=await load(),db=fakeDb(),jobs=[],calls=[],old=globalThis.fetch;
 const prefix="&<> * [hello] (https://example.invalid) @someone "+String.fromCharCode(10);
 const full=prefix+("測".repeat(1500-prefix.length));
 assert.equal(full.length,1500);
 globalThis.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));return new Response(JSON.stringify({ok:true}),{status:200})};
 try{
  const response=await api.onRequestPost({request:request({...payload,kind:"idea",message:full,page:"/en/games"}),env:config(db),waitUntil:task=>jobs.push(task)});
  assert.equal(response.status,201);
  await Promise.all(jobs);
  assert.equal(calls.length,1);
  assert.ok(calls[0].text.includes(full));
  assert.ok(calls[0].text.includes("來源頁面：/en/games"));
  assert.ok(calls[0].text.includes("功能建議"));
  assert.ok(!calls[0].text.includes(payload.contact));
  assert.equal(db.rows[0][1],full);
 }finally{globalThis.fetch=old}
});

test("feedback form discloses Telegram forwarding in every supported language",()=>{
 const locales=["zh-TW","en","de","es","fr","id","ja","ko","pt-BR","th","vi"];
 for(const locale of locales){
  const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,"../web-spa/src/i18n/locales",locale,"feedback.json"),"utf8"));
  assert.match(catalog.privacy,/Telegram/i,locale+" lacks Telegram disclosure");
 }
});

test("missing/invalid secrets or absent waitUntil never call Telegram and never block D1",async()=>{
 const api=await load(),db=fakeDb(),old=globalThis.fetch,calls=[];
 globalThis.fetch=async()=>{calls.push(1);return new Response(JSON.stringify({ok:true}))};
 try{
  assert.equal((await api.onRequestPost({request:request(),env:config(db,{CREW_FEEDBACK_TG_CHAT_ID:""})})).status,201);
  assert.equal((await api.onRequestPost({request:request(),env:config(db,{CREW_FEEDBACK_TG_BOT_TOKEN:"bad"})})).status,201);
  assert.equal((await api.onRequestPost({request:request(),env:config(db)})).status,201);
  assert.equal(calls.length,0);
  assert.equal(db.rows.length,3);
 }finally{globalThis.fetch=old}
});
test("failed Telegram requests leave the successful DB receipt unchanged and log no secrets",async()=>{
 const api=await load(),db=fakeDb(),jobs=[],old=globalThis.fetch,oldWarn=console.warn,warnings=[];
 globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,description:"secret failure"}),{status:400});
 console.warn=(...parts)=>warnings.push(parts.join(" "));
 try{
  const response=await api.onRequestPost({request:request(),env:config(db),waitUntil:task=>jobs.push(task)});
  assert.equal(response.status,201);
  assert.deepEqual(await response.json(),{ok:true,reference:"FB-201"});
  await Promise.all(jobs);
  assert.equal(warnings.length,1);
  assert.match(warnings[0],/FB-201/);
  assert.ok(!warnings[0].includes(token));
  assert.ok(!warnings[0].includes(chatId));
  assert.ok(!warnings[0].includes(payload.message));
 }finally{globalThis.fetch=old;console.warn=oldWarn}
});
test("rejected submissions and 4th same-IP hourly submission never send a Telegram notification",async()=>{
 const api=await load(),db=fakeDb(),jobs=[],calls=[],old=globalThis.fetch;
 globalThis.fetch=async()=>{calls.push(1);return new Response(JSON.stringify({ok:true}),{status:200})};
 try{
  const settings=config(db),waitUntil=task=>jobs.push(task);
  assert.equal((await api.onRequestPost({request:request({...payload,message:"short"}),env:settings,waitUntil})).status,400);
  for(let i=0;i<3;i++)
   assert.equal((await api.onRequestPost({request:request({...payload,kind:i===0?"bug":i===1?"idea":"other"}),env:settings,waitUntil})).status,201);
  assert.equal((await api.onRequestPost({request:request(),env:settings,waitUntil})).status,429);
  await Promise.all(jobs);
  assert.equal(calls.length,3);
  assert.equal(jobs.length,3);
  assert.equal(db.rows.length,3);
 }finally{globalThis.fetch=old}
});
