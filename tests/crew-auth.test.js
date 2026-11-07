// Redeploy sanity marker: OAuth client secrets are read by Pages Functions at runtime.
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {webcrypto}=require("node:crypto");
if(!global.crypto)global.crypto=webcrypto;
const ORIGIN="https://www.3sssi.com";
const lib=()=>import("../server/crew-auth.mjs");
const req=(p,headers={},method="GET")=>new Request(ORIGIN+p,{headers,method});
const config=()=>({CREW_AUTH_GOOGLE_CLIENT_ID:"google-id",CREW_AUTH_GOOGLE_CLIENT_SECRET:"google-secret",
 CREW_AUTH_GITHUB_CLIENT_ID:"github-id",CREW_AUTH_GITHUB_CLIENT_SECRET:"github-secret"});
class FakeDB{
 constructor(){this.users=new Map();this.identities=new Map();this.sessions=new Map()}
 prepare(q){
  return{bind:(...args)=>({
   first:async()=>{
    if(q.includes("SELECT user_id FROM crew_auth_identities"))
     return this.identities.get(args[0]+":"+args[1])||null;
    if(q.includes("SELECT u.id AS id")){
     const session=this.sessions.get(args[0]);if(!session||session.expires<=args[1])return null;
     const user=this.users.get(session.uid);
     const identity=[...this.identities].find(([,v])=>v.user_id===session.uid);
     return user&&identity?{id:session.uid,name:user.name,provider:identity[0].split(":")[0]}:null;
    }
    throw Error("Unexpected SELECT: "+q);
   },
   run:async()=>{
    if(q.startsWith("INSERT INTO crew_auth_users"))this.users.set(args[0],{name:args[1]});
    else if(q.startsWith("INSERT OR IGNORE INTO crew_auth_identities")){
     const key=args[0]+":"+args[1];if(!this.identities.has(key))this.identities.set(key,{user_id:args[2]});
    }else if(q.startsWith("INSERT INTO crew_auth_sessions"))this.sessions.set(args[0],{uid:args[1],expires:args[3]});
    else if(q.startsWith("DELETE FROM crew_auth_sessions"))this.sessions.delete(args[0]);
    else throw Error("Unexpected mutation: "+q);
    return{success:true};
   }
  })}
 }
 async batch(statements){for(const statement of statements)await statement.run()}
}
test("OAuth start uses PKCE, state and secure cookies; bad state cannot create a session",async()=>{
 const {start,callbackHandler,logout}=await lib();
 const denied=await start({request:new Request("https://preview.pages.dev/api/auth/google/start"),env:{}},"google");
 assert.equal(denied.status,404);
 const unconfigured=await start({request:req("/api/auth/google/start"),env:{}},"google");
 assert.match(unconfigured.headers.get("Location"),/auth_error=unavailable/);
 const env={...config(),CREW_AUTH_DB:new FakeDB()};
 const begin=await start({request:req("/api/auth/google/start"),env},"google");
 const auth=new URL(begin.headers.get("Location"));
 assert.equal(auth.hostname,"accounts.google.com");
 assert.equal(auth.searchParams.get("code_challenge_method"),"S256");
 assert.equal(auth.searchParams.get("scope"),"openid email profile");
 assert.equal(auth.searchParams.get("redirect_uri"),ORIGIN+"/api/auth/google/callback");
 assert.match(begin.headers.get("Set-Cookie"),/Secure; HttpOnly; SameSite=Lax/);
 const invalid=await callbackHandler({request:req("/api/auth/google/callback?code=abc&state=invalid",{
  Cookie:begin.headers.get("Set-Cookie").split(";")[0]}),env},"google");
 assert.match(invalid.headers.get("Location"),/auth_error=failed/);
 assert.equal(env.CREW_AUTH_DB.sessions.size,0);
 const csrf=await logout({request:req("/api/auth/logout",{Origin:"https://evil.example"},"POST"),env});
 assert.equal(csrf.status,403);
});
test("Google and GitHub flow creates distinct account IDs, sessions and revocable logout",async()=>{
 const {start,callbackHandler,sessionInfo,logout}=await lib();
 const db=new FakeDB(),env={...config(),CREW_AUTH_DB:db},original=global.fetch;
 let exchanges=0;
 global.fetch=async url=>{
  const u=String(url);
  if(u.includes("oauth2.googleapis.com/token")||u.includes("github.com/login/oauth/access_token")){
   exchanges++;return new Response(JSON.stringify({access_token:"private-oauth-token"}),{status:200});
  }
  if(u.includes("openidconnect.googleapis.com"))return new Response(JSON.stringify({sub:"same-number",name:"Alex"}),{status:200});
  if(u.includes("api.github.com/user"))return new Response(JSON.stringify({id:7,name:"Alex",login:"alex"}),{status:200});
  throw Error("Unexpected external request "+u);
 };
 try{
  const cookies=[];
  for(const provider of ["google","github"]){
   const begin=await start({request:req("/api/auth/"+provider+"/start"),env},provider);
   const auth=new URL(begin.headers.get("Location"));
   const flow=begin.headers.get("Set-Cookie").split(";")[0];
   const completed=await callbackHandler({request:req("/api/auth/"+provider+"/callback?state="+auth.searchParams.get("state")+"&code=valid",{Cookie:flow}),env},provider);
   assert.equal(completed.status,302);
   assert.equal(completed.headers.get("Location"),ORIGIN+"/account");
   const responseCookies=completed.headers.getSetCookie();
   assert.ok(responseCookies.some(x=>x.startsWith("__Host-crew_oauth=; Max-Age=0")));
   const sessionCookie=responseCookies.find(x=>x.startsWith("__Host-crew_session="));
   assert.match(sessionCookie,/Secure; HttpOnly; SameSite=Lax/);
   cookies.push(sessionCookie.split(";")[0]);
   const active=await sessionInfo({request:req("/api/auth/session",{Cookie:cookies.at(-1)}),env});
   const body=await active.json();
   assert.equal(body.user.provider,provider);
   assert.equal(body.user.name,"Alex");
   assert.deepEqual(body.providers,{google:true,github:true});
   assert.doesNotMatch(JSON.stringify(body),/private-oauth-token/);
  }
  assert.equal(exchanges,2);
  assert.equal(db.users.size,2,"Must not merge identities based on profile names/email");
  assert.ok(!JSON.stringify([...db.sessions.values()]).includes("private-oauth-token"));
  const signout=await logout({request:req("/api/auth/logout",{Origin:ORIGIN,Cookie:cookies[0]},"POST"),env});
  assert.equal(signout.status,200);
  assert.match(signout.headers.get("Set-Cookie"),/Max-Age=0/);
  const one=await sessionInfo({request:req("/api/auth/session",{Cookie:cookies[0]}),env});
  const two=await sessionInfo({request:req("/api/auth/session",{Cookie:cookies[1]}),env});
  assert.equal((await one.json()).user,null);
  assert.equal((await two.json()).user.provider,"github");
 }finally{global.fetch=original}
});
test("auth functions are routed to Pages; D1 tables and account entry exist",()=>{
 const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
 const routes=JSON.parse(read("_routes.json"));
 assert.ok(routes.include.includes("/api/auth/*"));
 assert.ok(routes.exclude.includes("/api/guest/*"));
 const sql=read("migrations/crew-auth/0001.sql");
 for(const name of ["crew_auth_users","crew_auth_identities","crew_auth_sessions"])
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS "+name));
 assert.match(read("web-spa/src/App.tsx"),/path="\/account"/);
 assert.match(read("scripts/prepare-cloudflare.mjs"),/"\/account"/);
 assert.match(read("web-spa/src/pages/AccountPage.tsx"),/api\/auth\/logout/);
 assert.doesNotMatch(read("server/crew-auth.mjs"),/localStorage|sessionStorage/);
});
test("existing OAuth client secret names from initial setup are supported",async()=>{
 const {start,sessionInfo}=await lib();
 const env={
  GOOGLE_OAUTH_CLIENT_ID:"legacy-google-id",GOOGLE_OAUTH_CLIENT_SECRET:"legacy-google-secret",
  GITHUB_OAUTH_CLIENT_ID:"legacy-github-id",GITHUB_OAUTH_CLIENT_SECRET:"legacy-github-secret",
  CREW_AUTH_DB:new FakeDB()
 };
 const session=await sessionInfo({request:req("/api/auth/session"),env});
 assert.deepEqual((await session.json()).providers,{google:true,github:true});
 for(const provider of ["google","github"]){
  const begin=await start({request:req("/api/auth/"+provider+"/start"),env},provider);
  assert.equal(begin.status,302);
  assert.equal(new URL(begin.headers.get("Location")).searchParams.get("client_id"),"legacy-"+provider+"-id");
 }
 const preferred={...env,CREW_AUTH_GOOGLE_CLIENT_ID:"preferred-google-id",CREW_AUTH_GOOGLE_CLIENT_SECRET:"preferred-google-secret"};
 const startPreferred=await start({request:req("/api/auth/google/start"),env:preferred},"google");
 assert.equal(new URL(startPreferred.headers.get("Location")).searchParams.get("client_id"),"preferred-google-id");
});

test("health correctly identifies D1 tables bound to the production Pages Function",async()=>{
 const {health}=await lib();
 const missing=await health({request:req("/api/auth/health"),env:config()});
 assert.equal(missing.status,503);
 assert.equal((await missing.json()).database.binding,false);
 const actual=[];
 const db={prepare(q){actual.push(q);return {first:async()=>q.includes("crew_auth_sessions")
  ?Promise.reject(Error("no such table")):null}}};
 const partial=await health({request:req("/api/auth/health"),env:{...config(),CREW_AUTH_DB:db}});
 assert.equal(partial.status,503);
 const info=await partial.json();
 assert.deepEqual(info.providers,{google:true,github:true});
 assert.equal(info.database.tables.crew_auth_users,true);
 assert.equal(info.database.tables.crew_auth_identities,true);
 assert.equal(info.database.tables.crew_auth_sessions,false);
 assert.equal(actual.length,3);
 const complete=await health({request:req("/api/auth/health"),env:{...config(),CREW_AUTH_DB:{
  prepare:()=>({first:async()=>null})
 }}});
 assert.equal(complete.status,200);
 assert.equal((await complete.json()).database.tables.crew_auth_sessions,true);
 const preview=await health({request:new Request("https://preview.pages.dev/api/auth/health"),env:{}});
 assert.equal(preview.status,404);
});
test("failed callback exposes only a stable stage, never credentials or OAuth response",async()=>{
 const {start,callbackHandler}=await lib(),original=global.fetch;
 const env={...config(),CREW_AUTH_DB:new FakeDB()};
 const begin=await start({request:req("/api/auth/google/start"),env},"google");
 const authorize=new URL(begin.headers.get("Location"));
 const query="/api/auth/google/callback?state="+authorize.searchParams.get("state")+"&code=valid";
 const request=req(query,{Cookie:begin.headers.get("Set-Cookie").split(";")[0]});
 global.fetch=async()=>new Response(JSON.stringify({error:"provider_private_details"}),{status:401});
 try{
  const result=await callbackHandler({request,env},"google");
  const back=new URL(result.headers.get("Location"));
  assert.equal(back.searchParams.get("auth_error"),"failed");
  assert.equal(back.searchParams.get("auth_stage"),"token");
  assert.ok(!back.href.includes("provider_private_details"));
  assert.ok(!back.href.includes("google-secret"));
 }finally{global.fetch=original}
});
test("account D1 failures are distinguished from OAuth token failures",async()=>{
 const {start,callbackHandler}=await lib(),original=global.fetch;
 const env={...config(),CREW_AUTH_DB:{
  prepare(q){
   if(q.startsWith("SELECT user_id FROM crew_auth_identities"))
    return {bind:()=>({first:async()=>null})};
   throw Error("test DB schema not ready");
  },
  batch:async()=>{throw Error("test database failure")}
 }};
 const begin=await start({request:req("/api/auth/github/start"),env},"github");
 const authorize=new URL(begin.headers.get("Location"));
 const callback=req("/api/auth/github/callback?state="+authorize.searchParams.get("state")+"&code=valid",{
  Cookie:begin.headers.get("Set-Cookie").split(";")[0]});
 global.fetch=async url=>{
  if(String(url).includes("github.com/login/oauth/access_token"))return Response.json({access_token:"private-token"});
  if(String(url).includes("api.github.com/user"))return Response.json({id:123,name:"User"});
  throw Error("Unexpected URL");
 };
 try{
  const result=await callbackHandler({request:callback,env},"github");
  const back=new URL(result.headers.get("Location"));
  assert.equal(back.searchParams.get("auth_stage"),"account");
  assert.equal(back.searchParams.get("auth_error"),"failed");
  assert.ok(!back.href.includes("private-token"));
 }finally{global.fetch=original}
});

test("OAuth token provider error codes remain bounded and never reveal secrets",async()=>{
 const {start,callbackHandler}=await lib(),original=global.fetch;
 const env={...config(),CREW_AUTH_DB:new FakeDB()};
 const cases=[
  {provider:"google",status:401,error:"invalid_client",reason:"invalid_client"},
  {provider:"google",status:400,error:"invalid_grant",reason:"invalid_grant"},
  // GitHub can return an OAuth error inside HTTP 200.
  {provider:"github",status:200,error:"incorrect_client_credentials",reason:"incorrect_client_credentials"},
  {provider:"github",status:401,error:"private-token-or-secret",reason:"provider_rejected"},
  {provider:"google",status:503,error:"secret-provider-internal-failure",reason:"provider_unavailable"}
 ];
 try{
  for(const item of cases){
   const begin=await start({request:req("/api/auth/"+item.provider+"/start"),env},item.provider);
   const authorize=new URL(begin.headers.get("Location"));
   const cookie=begin.headers.get("Set-Cookie").split(";")[0];
   const callback=req("/api/auth/"+item.provider+"/callback?state="+authorize.searchParams.get("state")+"&code=valid",{Cookie:cookie});
   global.fetch=async()=>new Response(JSON.stringify({error:item.error,error_description:"PRIVATE secret=leak"}),{status:item.status});
   const response=await callbackHandler({request:callback,env},item.provider);
   const dest=new URL(response.headers.get("Location"));
   assert.equal(dest.searchParams.get("auth_stage"),"token");
   assert.equal(dest.searchParams.get("auth_reason"),item.reason);
   assert.equal(dest.searchParams.get("auth_error"),"failed");
   assert.ok(!dest.href.includes("PRIVATE"));
   assert.ok(!dest.href.includes("leak"));
   assert.ok(!dest.href.includes("google-secret"));
  }
  const begin=await start({request:req("/api/auth/github/start"),env},"github");
  const authorize=new URL(begin.headers.get("Location"));
  const cookie=begin.headers.get("Set-Cookie").split(";")[0];
  global.fetch=async()=>{throw Error("client_secret=PRIVATE");};
  const response=await callbackHandler({request:req("/api/auth/github/callback?state="+authorize.searchParams.get("state")+"&code=valid",{Cookie:cookie}),env},"github");
  const back=new URL(response.headers.get("Location"));
  assert.equal(back.searchParams.get("auth_reason"),"token_transport");
  assert.ok(!back.href.includes("PRIVATE"));
 }finally{global.fetch=original}
});

test("Cloudflare Workers manual redirect mode enables Google and GitHub callback",async()=>{
 const {start,callbackHandler,sessionInfo}=await lib();
 const db=new FakeDB(),env={...config(),CREW_AUTH_DB:db},original=global.fetch;
 let tokenCalls=0,profileCalls=0;
 global.fetch=async (url,init)=>{
  // Cloudflare workerd rejects redirect:'error' before it can send a request.
  if(init?.redirect!=="manual")throw TypeError('Invalid redirect value, must be "follow" or "manual"');
  if(String(url).includes("oauth2.googleapis.com/token")||
     String(url).includes("github.com/login/oauth/access_token")){
   tokenCalls++;
   return Response.json({access_token:"never-store-this-private-token"});
  }
  if(String(url).includes("openidconnect.googleapis.com/v1/userinfo")){
   profileCalls++;
   return Response.json({sub:"test-google-id",name:"Cloudflare Google"});
  }
  if(String(url).includes("api.github.com/user")){
   profileCalls++;
   return Response.json({id:1234,name:"Cloudflare GitHub"});
  }
  throw Error("Unexpected URL");
 };
 try{
  for(const provider of ["google","github"]){
   const begin=await start({request:req("/api/auth/"+provider+"/start"),env},provider);
   const authorize=new URL(begin.headers.get("Location"));
   const callback=req("/api/auth/"+provider+"/callback?state="+authorize.searchParams.get("state")+"&code=valid",{
    Cookie:begin.headers.get("Set-Cookie").split(";")[0]});
   const response=await callbackHandler({request:callback,env},provider);
   assert.equal(response.status,302);
   assert.equal(response.headers.get("Location"),ORIGIN+"/account");
   const cookie=response.headers.getSetCookie().find(c=>c.startsWith("__Host-crew_session="));
   assert.ok(cookie,"Expected valid secure session after successful Cloudflare token exchange");
   const session=await sessionInfo({request:req("/api/auth/session",{Cookie:cookie.split(";")[0]}),env});
   assert.equal((await session.json()).user.provider,provider);
  }
  assert.equal(tokenCalls,2);
  assert.equal(profileCalls,2);
 }finally{global.fetch=original}
});

test("OAuth token exchange never follows redirects to another origin",async()=>{
 const {start,callbackHandler}=await lib();
 const db=new FakeDB(),env={...config(),CREW_AUTH_DB:db},original=global.fetch;
 let calls=0;
 global.fetch=async (_url,init)=>{
  assert.equal(init?.redirect,"manual");
  calls++;
  return new Response(JSON.stringify({access_token:"should-not-accept"}),{
   status:302,headers:{Location:"https://evil.example/collect","Content-Type":"application/json"}
  });
 };
 try{
  const begin=await start({request:req("/api/auth/google/start"),env},"google");
  const authorize=new URL(begin.headers.get("Location"));
  const cb=req("/api/auth/google/callback?state="+authorize.searchParams.get("state")+"&code=valid",{
   Cookie:begin.headers.get("Set-Cookie").split(";")[0]});
  const result=await callbackHandler({request:cb,env},"google");
  const loc=new URL(result.headers.get("Location"));
  assert.equal(loc.searchParams.get("auth_stage"),"token");
  assert.equal(loc.searchParams.get("auth_reason"),"provider_rejected");
  assert.equal(calls,1,"Must not request the redirected URL");
  assert.equal(db.sessions.size,0);
 }finally{global.fetch=original}
});

test("signed account proof endpoint requires same-origin POST and an authenticated session",async()=>{
 const {onRequestPost}=await import("../functions/api/auth/guest-ticket.js");
 const secret="test-only-guest-token-secret-that-is-very-long";
 const base={...config(),CREW_AUTH_DB:new FakeDB(),CREW_GUEST_TICKET_SECRET:secret};
 const bad=await onRequestPost({request:req("/api/auth/guest-ticket",{Origin:"https://evil.example"},"POST"),env:base});
 assert.equal(bad.status,403);
 const missing=await onRequestPost({request:req("/api/auth/guest-ticket",{Origin:ORIGIN},"POST"),env:base});
 assert.equal(missing.status,401);
 const disabled=await onRequestPost({request:req("/api/auth/guest-ticket",{Origin:ORIGIN},"POST"),env:{...base,CREW_GUEST_TICKET_SECRET:undefined}});
 assert.equal(disabled.status,503);
 const source=fs.readFileSync(path.join(__dirname,"../migrations/crew-auth/0002_guest_trials.sql"),"utf8");
 for(const name of ["crew_guest_usage","crew_guest_ticket_claims"])
  assert.ok(source.includes("CREATE TABLE IF NOT EXISTS "+name));
 const client=fs.readFileSync(path.join(__dirname,"../web-spa/src/live/GuestLiveStarter.tsx"),"utf8");
 const backend=fs.readFileSync(path.join(__dirname,"../functions/api/guest/token.js"),"utf8");
 assert.match(client,/auth\/guest-ticket/);
 assert.match(client,/phase==="login"/);
 assert.match(backend,/GUEST_REQUIRE_SIGNIN/);
});


test("authenticated session exposes member trial count but never leaks account or signing secrets",async()=>{
 const {sessionInfo}=await lib();
 const db=new FakeDB(),uid="123e4567-e89b-42d3-a456-426614174004";
 const token="A".repeat(43);
 const tokenHash=require("node:crypto").createHash("sha256").update(token).digest("hex");
 db.users.set(uid,{name:"Member"});
 db.identities.set("google:123",{user_id:uid});
 db.sessions.set(tokenHash,{uid,expires:Math.floor(Date.now()/1000)+86400*2});
 const original=db.prepare.bind(db);
 const latest=Math.floor(Date.now()/1000);
 let storedAt=latest;
 db.prepare=q=>q.includes("SELECT used,updated_at FROM crew_guest_usage")
  ?{bind:()=>({first:async()=>({used:3,updated_at:storedAt})})}:original(q);
 const env={...config(),CREW_AUTH_DB:db,CREW_GUEST_TICKET_SECRET:"private-guest-secret-never-returned-to-browser"};
 const res=await sessionInfo({request:req("/api/auth/session",{Cookie:"__Host-crew_session="+token}),env});
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.user.id,uid);
 assert.deepEqual(data.trial,{used:3,limit:3,lastUsedAt:latest});
 // The same persisted row is reset logically when its timestamp crosses a
 // Taipei midnight, including an old lifetime-exhausted account.
 const nextBoundary=Math.floor((latest+28800)/86400+1)*86400-28800;
 storedAt=nextBoundary-1;
 const oldNow=Date.now;
 Date.now=()=>1000*(nextBoundary+1);
 try{
  const reset=await sessionInfo({request:req("/api/auth/session",{Cookie:"__Host-crew_session="+token}),env});
  assert.deepEqual((await reset.json()).trial,{used:0,limit:3});
 }finally{Date.now=oldNow}
 assert.ok(!JSON.stringify(data).includes("private-guest-secret"));
 const anonymous=await sessionInfo({request:req("/api/auth/session"),env});
 assert.equal((await anonymous.json()).trial,undefined);
});
test("session endpoint tolerates unmigrated optional member quota without breaking OAuth",async()=>{
 const {sessionInfo}=await lib();
 const db=new FakeDB(),uid="123e4567-e89b-42d3-a456-426614174005",token="B".repeat(43);
 const hash=require("node:crypto").createHash("sha256").update(token).digest("hex");
 db.users.set(uid,{name:"Member"});db.identities.set("github:77",{user_id:uid});
 db.sessions.set(hash,{uid,expires:Math.floor(Date.now()/1000)+3600});
 const status=await sessionInfo({request:req("/api/auth/session",{Cookie:"__Host-crew_session="+token}),env:{...config(),CREW_AUTH_DB:db}});
 assert.equal(status.status,200);
 const data=await status.json();
 assert.equal(data.user.provider,"github");
 assert.equal(data.trial,undefined,"missing optional schema must not stop sign-in");
});
