const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const file=fs.readFileSync(path.join(__dirname,"../web-spa/src/lib/guestTrial.ts"),"utf8");
function compile(fetch,clock){
 const ts=file.replace(/^import .*;\s*$/gm,"");
 const js=stripTypeScriptTypes(ts,{mode:"strip"}).replace(/^export /gm,"");
 return new Function("window","isCrewAndroidShell","fetch","Date",js+"\nreturn fetchGuestTrialConfig;")({},()=>false,fetch,clock);
}
const enabled={enabled:true,siteKey:"public-site-key",seconds:300,signinRequired:false,memberMetering:false};
test("Guest config in-flight GET is shared across homepage, onboarding and Live",async()=>{
 let now=1_000,calls=0,release;
 const deferred=new Promise(resolve=>{release=resolve});
 const request=async()=>{calls++;await deferred;return{ok:true,json:async()=>enabled}};
 const get=compile(request,{now:()=>now});
 const first=get(),second=get(),third=get();
 assert.equal(calls,1,"simultaneous views must share the same public GET");
 release();
 assert.deepEqual(await first,enabled);
 assert.deepEqual(await second,enabled);
 assert.deepEqual(await third,enabled);
 await get();assert.equal(calls,1,"fresh enabled config reuses 30s cache");
 now+=30_001;await get();assert.equal(calls,2,"expired config is rechecked");
});
test("Guest config rejects 180-second rollout mismatch, fails closed and retries a disabled response quickly",async()=>{
 let now=0,calls=0;
 const get=compile(async()=>{
  calls++;return{ok:true,json:async()=>({...enabled,seconds:180})};
 },{now:()=>now});
 assert.deepEqual(await get(),{enabled:false});
 now+=4_999;await get();assert.equal(calls,1);
 now+=2;await get();assert.equal(calls,2);
});
test("Guest trial still requires explicit start, mic permission and server grant",()=>{
 const code=fs.readFileSync(path.join(__dirname,"../web-spa/src/live/GuestLiveStarter.tsx"),"utf8");
 const callback=code.indexOf("callback:token=>");
 const start=code.indexOf("async function begin(textOnly=false)");
 assert.ok(callback!==-1&&start>callback);
 assert.match(code.slice(callback,start),/void ensureLive\(\)\.catch/);
 assert.doesNotMatch(code.slice(callback,start),/getUserMedia|GUEST_TOKEN_ENDPOINT.*method:"POST"/);
 assert.match(code.slice(start),/getUserMedia\(\{audio:true\}\)/);
 assert.match(code.slice(start),/method:"POST"/);
});
