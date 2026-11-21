import test from "node:test";
import assert from "node:assert/strict";
import {membershipInfo} from "../server/koolo-membership.mjs";

const request=(cookie="",origin="https://koolo.app")=>new Request(origin+"/api/membership",{headers:cookie?{Cookie:"__Host-crew_session="+cookie}:{}});
const token="a".repeat(43);
const db=(membership,validSession=true)=>({prepare(sql){return {bind(){return {async first(){if(sql.includes("FROM crew_auth_sessions"))return validSession?{user_id:"user-1"}:null;if(sql.includes("FROM koolo_memberships"))return membership;throw Error("Unexpected query");}}}}}});
test("membership requires a valid login",async()=>{
 const r=await membershipInfo({request:request(),env:{CREW_AUTH_DB:db(null)}});
 assert.equal(r.status,401);
});
test("membership rejects an invalid host",async()=>{
 const r=await membershipInfo({request:request(token,"https://example.com"),env:{CREW_AUTH_DB:db(null)}});
 assert.equal(r.status,404);
});
test("membership fails closed without database",async()=>{
 const r=await membershipInfo({request:request(token),env:{}});
 assert.equal(r.status,503);
});
test("membership defaults to free when no row exists",async()=>{
 const r=await membershipInfo({request:request(token),env:{CREW_AUTH_DB:db(null)}});
 assert.equal(r.status,200);
 assert.equal((await r.json()).plan,"free");
});
test("membership grants active unexpired server-side plan",async()=>{
 const r=await membershipInfo({request:request(token),env:{CREW_AUTH_DB:db({plan:"plus",status:"active",current_period_end:Math.floor(Date.now()/1000)+3600})}});
 assert.equal((await r.json()).plan,"plus");
});
test("membership denies expired plan",async()=>{
 const r=await membershipInfo({request:request(token),env:{CREW_AUTH_DB:db({plan:"pro",status:"active",current_period_end:1})}});
 assert.equal((await r.json()).plan,"free");
});
test("membership denies revoked plan",async()=>{
 const r=await membershipInfo({request:request(token),env:{CREW_AUTH_DB:db({plan:"pro",status:"revoked",current_period_end:Math.floor(Date.now()/1000)+3600})}});
 assert.equal((await r.json()).plan,"free");
});
test("membership denies missing database schema",async()=>{
 const r=await membershipInfo({request:request(token),env:{CREW_AUTH_DB:{prepare(){throw Error("missing table")}}}});
 assert.equal(r.status,503);
});
