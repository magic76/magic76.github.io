const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const code=fs.readFileSync(path.join(__dirname,"../functions/api/feedback.js"),"utf8");
const load=()=>import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"));
const env={FEEDBACK_GITHUB_TOKEN:"ghp_fake_token_for_test_only_123456789",FEEDBACK_TURNSTILE_SECRET:"0x-test-secret-123",FEEDBACK_TURNSTILE_SITE_KEY:"0x-site-key-test-123"};
const request=(body,origin="https://www.3sssi.com")=>new Request("https://www.3sssi.com/api/feedback",{method:"POST",headers:{"origin":origin,"content-type":"application/json"},body:JSON.stringify(body)});
const payload={kind:"bug",message:"Something broke on the games page.",contact:"",page:"/games",captcha:"verified-token",website:""};
test("GET is disabled until all Cloudflare bindings exist",async()=>{
 const api=await load();
 assert.deepEqual(await (await api.onRequestGet({env:{}})).json(),{enabled:false,siteKey:null});
 const ready=await (await api.onRequestGet({env})).json();
 assert.equal(ready.enabled,true);assert.equal(ready.siteKey,env.FEEDBACK_TURNSTILE_SITE_KEY);
 assert.equal(JSON.stringify(ready).includes("fake_token"),false);
});
test("POST rejects cross-origin and invalid content",async()=>{
 const api=await load();
 assert.equal((await api.onRequestPost({request:request(payload,"https://attacker.example"),env})).status,403);
 assert.equal((await api.onRequestPost({request:request({...payload,message:"short"}),env})).status,400);
});
test("POST fails closed when challenge fails",async()=>{
 const api=await load(),old=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({success:false})};
 try{assert.equal((await api.onRequestPost({request:request(payload),env})).status,403);assert.equal(calls,1)}
 finally{globalThis.fetch=old}
});
test("POST opens private GitHub issue only after verified challenge",async()=>{
 const api=await load(),old=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});return calls.length===1?Response.json({success:true,hostname:"www.3sssi.com"}):Response.json({number:1234},{status:201})};
 try{
  const response=await api.onRequestPost({request:request({...payload,page:"/en/games"}),env});
  assert.equal(response.status,201);
  assert.deepEqual(await response.json(),{ok:true,reference:"FB-1234"});
  assert.equal(calls.length,2);assert.ok(calls[0].url.endsWith("/siteverify"));
  assert.ok(calls[1].url.includes("/magic76/magic76.github.io/issues"));
  const issue=JSON.parse(calls[1].options.body);
  assert.match(issue.title,/\[user-feedback\]\[bug\]/);
  assert.ok(issue.body.includes("/en/games"));
  assert.ok(!issue.body.includes("verified-token")&&!issue.body.includes("fake_token"));
 }finally{globalThis.fetch=old}
});
