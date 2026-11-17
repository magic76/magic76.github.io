const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");

const source=readFileSync(path.resolve(__dirname,"../web-spa/src/live/guestMicRetry.ts"),"utf8");
const code=stripTypeScriptTypes(source,{mode:"strip"}).replace(/^export /gm,"");
const api={};
vm.runInNewContext(code+"\nObject.assign(this,{canRetryGuestMicrophone,isGuestVoiceVerificationExpired})",api);

test("a denied microphone reuses the live verification token without verifying again",()=>{
 for(const valid of ["unused-challenge","still-valid"]){
  assert.equal(api.canRetryGuestMicrophone("error",true,valid),true);
 }
 for(const state of [["ready",true,"token"],["error",false,"token"],["error",true,""]]){
  assert.equal(api.canRetryGuestMicrophone(...state),false);
 }
});

test("only an explicit rejected/expired verification grant triggers new verification",()=>{
 const expired=[
  [403,{error:"Verification failed"}],
  [400,{error:"Verification required"}],
  [403,{code:"VERIFY_FAILED"}],
  [401,{code:"VERIFY_REQUIRED"}],
 ];
 for(const [status,payload] of expired)assert.equal(api.isGuestVoiceVerificationExpired(status,payload),true);
 const unrelated=[
  [403,{error:"Origin rejected"}],
  [503,{error:"Verification temporarily unavailable"}],
  [429,{code:"DAILY_LIMIT"}],
  [401,{code:"SIGNIN_REQUIRED"}],
  [403,{}],
  [200,{}],
 ];
 for(const [status,payload] of unrelated)assert.equal(api.isGuestVoiceVerificationExpired(status,payload),false);
});
