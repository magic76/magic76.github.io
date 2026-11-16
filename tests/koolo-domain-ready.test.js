const test=require("node:test");
const assert=require("node:assert/strict");
const OLD="https://www.3sssi.com",NEW="https://koolo.app";
const request=(origin,route,init)=>new Request(origin+route,init);
const env={CREW_AUTH_DB:{},CREW_AUTH_GOOGLE_CLIENT_ID:"test-id",CREW_AUTH_GOOGLE_CLIENT_SECRET:"test-secret"};

test("Koolo and legacy domains each use their own exact OAuth callback and host-only cookies",async()=>{
 const {start,sessionInfo,logout}=await import("../server/crew-auth.mjs");
 for(const origin of [OLD,NEW]){
  const started=await start({request:request(origin,"/api/auth/google/start"),env},"google");
  assert.equal(started.status,302);
  const redirect=new URL(started.headers.get("location"));
  assert.equal(redirect.origin,"https://accounts.google.com");
  assert.equal(redirect.searchParams.get("redirect_uri"),origin+"/api/auth/google/callback");
  assert.match(started.headers.get("set-cookie"),/Path=\/; Secure; HttpOnly; SameSite=Lax/);
  const signed=await sessionInfo({request:request(origin,"/api/auth/session"),env});
  assert.equal(signed.status,200);
  const out=await logout({request:request(origin,"/api/auth/logout",{method:"POST",headers:{Origin:origin}}),env});
  assert.equal(out.status,200);
 }
 for(const origin of ["https://evil.example","https://www.koolo.app","http://koolo.app"]){
  const denied=await start({request:request(origin,"/api/auth/google/start"),env},"google");
  assert.equal(denied.status,404);
 }
 const mismatch=await logout({request:request(NEW,"/api/auth/logout",{method:"POST",headers:{Origin:OLD}}),env});
 assert.equal(mismatch.status,403);
});

test("Guest Worker only responds with exact same-origin CORS for old and Koolo sites",async()=>{
 const worker=(await import("../workers/guest-trial/worker.mjs")).default;
 const url="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token";
 for(const origin of [OLD,NEW]){
  const pre=await worker.fetch(new Request(url,{method:"OPTIONS",headers:{Origin:origin}}),{});
  assert.equal(pre.status,204);
  assert.equal(pre.headers.get("access-control-allow-origin"),origin);
  assert.equal(pre.headers.get("vary"),"Origin");
  const get=await worker.fetch(new Request(url,{headers:{Origin:origin}}),{});
  assert.equal(get.headers.get("access-control-allow-origin"),origin);
 }
 for(const origin of ["https://evil.example","https://www.koolo.app","http://koolo.app"]){
  const denied=await worker.fetch(new Request(url,{method:"OPTIONS",headers:{Origin:origin}}),{});
  assert.equal(denied.status,403);
  assert.equal(denied.headers.get("access-control-allow-origin"),null);
 }
});

test("Member guest-ticket accepts only same-origin requests on each approved domain",async()=>{
 const {onRequestPost}=await import("../functions/api/auth/guest-ticket.js");
 for(const origin of [OLD,NEW]){
  const response=await onRequestPost({request:new Request(origin+"/api/auth/guest-ticket",{method:"POST",headers:{Origin:origin}}),env:{}});
  assert.equal(response.status,503,"valid origin reaches configuration checks");
 }
 const mismatch=await onRequestPost({request:new Request(NEW+"/api/auth/guest-ticket",{method:"POST",headers:{Origin:OLD}}),env:{}});
 assert.equal(mismatch.status,403);
 const unknown=await onRequestPost({request:new Request("https://evil.example/api/auth/guest-ticket",{method:"POST",headers:{Origin:"https://evil.example"}}),env:{}});
 assert.equal(unknown.status,404);
});
