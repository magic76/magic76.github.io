const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const source=fs.readFileSync(path.join(__dirname,"../functions/api/usage/report.ts"),"utf8");
const js=stripTypeScriptTypes(source,{mode:"strip"}).replace(/export async function /g,"async function ")+"\nmodule.exports={verifyAccess};";
const mod={exports:{}};
new Function("module","exports","require","Response","Request","fetch","crypto","atob","TextEncoder","TextDecoder",js)(
 mod,mod.exports,require,Response,Request,fetch,globalThis.crypto,atob,TextEncoder,TextDecoder);
const {verifyAccess}=mod.exports;
const token="a".repeat(43);
async function request(cookie=token,origin="https://koolo.app"){
 return new Request(origin+"/api/usage/report",{headers:cookie?{Cookie:"__Host-crew_session="+cookie}:{}});
}
async function makeEnv(email="owner@example.com",valid=true){
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))),x=>x.toString(16).padStart(2,"0")).join("");
 return {KOOLO_ADMIN_EMAILS:"owner@example.com,other@example.com",CREW_AUTH_DB:{
  prepare(sql){
   assert.match(sql,/crew_auth_verified_emails/);
   return {bind(hash,now){
    assert.equal(hash,digest);assert.ok(now>0);
    return {async first(){return valid?{email}:null}};
   }};
  }
 }};
}
test("Koolo admin allowlist fails closed without configuration or valid cookie",async()=>{
 assert.equal(await verifyAccess(await request(),{}),false);
 const env=await makeEnv();
 assert.equal(await verifyAccess(await request(""),env),false);
 assert.equal(await verifyAccess(await request("forged"),env),false);
 assert.equal(await verifyAccess(await request(token,"https://evil.example"),env),false);
});
test("Koolo admin accepts only an unexpired session with verified allowlisted email",async()=>{
 assert.equal(await verifyAccess(await request(),await makeEnv()),true);
 assert.equal(await verifyAccess(await request(),await makeEnv("stranger@example.com")),false);
 assert.equal(await verifyAccess(await request(),await makeEnv("owner@example.com",false)),false);
});
test("Koolo admin denies when database migration is missing",async()=>{
 const env={KOOLO_ADMIN_EMAILS:"owner@example.com",CREW_AUTH_DB:{prepare(){throw Error("no such table")}}};
 assert.equal(await verifyAccess(await request(),env),false);
});
