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
