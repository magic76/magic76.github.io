const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const helper="web-spa/src/live/guestTextError.ts";
function loadHelper(){
 const source=stripTypeScriptTypes(read(helper),{mode:"strip"}).replace(/^export /gm,"");
 const context={};
 vm.runInNewContext(source+"\nObject.assign(this,{guestTextWorkerError,markGuestTextStartError,isGuestTextStartError,classifyGuestTextFailure,Error,TypeError,SyntaxError});",context,{filename:helper});
 return context;
}
test("all guest Worker codes have distinct, actionable groups; only verification expires grants",()=>{
 const {classifyGuestTextFailure,guestTextWorkerError}=loadHelper();
 const cases={
  VERIFY_REQUIRED:["verification","guestText.verifyRequired",true,false],
  VERIFY_FAILED:["verification","guestText.verifyFailed",true,false],
  SESSION_EXPIRED:["verification","guestText.sessionExpired",true,false],
  DAILY_LIMIT:["dailyLimit","guestText.dailyLimit",false,false],
  TOO_FAST:["tooFast","guestText.tooFast",false,true],
  CAPACITY:["capacity","guestText.capacity",false,false],
  TEMP_UNAVAILABLE:["backend","guestText.backend",false,true],
  BAD_REQUEST:["badRequest","guestText.badRequest",false,true],
  ORIGIN_REJECTED:["backend","guestText.backend",false,true],
  METHOD_NOT_ALLOWED:["backend","guestText.backend",false,true]
 };
 for(const [code,expected] of Object.entries(cases)){
  const actual=classifyGuestTextFailure(guestTextWorkerError(code,code==="CAPACITY"?429:503));
  assert.deepEqual([actual.kind,actual.messageKey,actual.reverify,actual.retry],expected,code);
 }
});
test("network fetch and JSON parse failures do not trigger Turnstile",()=>{
 const {classifyGuestTextFailure,TypeError,SyntaxError,Error,guestTextWorkerError}=loadHelper();
 for(const e of [new TypeError("Failed to fetch"),new TypeError("Network request failed"),new SyntaxError("Unexpected token '<' in JSON"),new Error("Load failed")]){
  const result=classifyGuestTextFailure(e);
  assert.equal(result.kind,"network");assert.equal(result.reverify,false);assert.equal(result.retry,true);
 }
 for(const e of [guestTextWorkerError("GUEST_FAILED",503),guestTextWorkerError("GUEST_START_FAILED",503),
  guestTextWorkerError("",429),new Error("Empty reply")]){
  const result=classifyGuestTextFailure(e);
  assert.equal(result.kind,"backend");assert.equal(result.reverify,false);
 }
 assert.equal(classifyGuestTextFailure(guestTextWorkerError("BAD_REQUEST",400)).reverify,false);
});
test("start error tagging preserves original worker/network code and doesn't imply verification",()=>{
 const {markGuestTextStartError,isGuestTextStartError,classifyGuestTextFailure,guestTextWorkerError,TypeError}=loadHelper();
 const backend=markGuestTextStartError(guestTextWorkerError("TEMP_UNAVAILABLE",503));
 assert.equal(isGuestTextStartError(backend),true);
 assert.equal(classifyGuestTextFailure(backend).kind,"backend");
 assert.equal(backend.message,"TEMP_UNAVAILABLE");
 const network=markGuestTextStartError(new TypeError("Failed to fetch"));
 assert.equal(classifyGuestTextFailure(network).kind,"network");
 assert.equal(isGuestTextStartError(guestTextWorkerError("TEMP_UNAVAILABLE",503)),false);
});
test("guest panel preserves send grants on non-verification errors; start can pause without reverify",()=>{
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 assert.match(panel,/setGuestPhase\(failure\.reverify\?"error":"paused"\)/);
 assert.match(panel,/if\(failure\.reverify&&!start\)\{invalidateGuestGrant\(\);setGuestPhase\("error"\)\}/);
 assert.match(panel,/throw guestTextWorkerError\(data\.code\|\|"GUEST_FAILED",response\.status\)/);
 assert.match(panel,/if\(data\.code!=="SESSION_EXPIRED"/);
 assert.match(panel,/guestFailure&&!guestFailure\.start&&guestFailure\.retry/);
 assert.match(panel,/backendFailureCount\.current>=2/);
 assert.match(panel,/guestText\.restartHint/);
 assert.doesNotMatch(panel,/setGuestPhase\("error"\);\s*}\s*throw reason/);
});
test("on-demand Turnstile errors require verification again rather than reporting backend failure",()=>{
 const {classifyGuestTextFailure,Error}=loadHelper();
 for(const code of ["TURNSTILE_LOAD_FAILED","TURNSTILE_ERROR","TURNSTILE_EXPIRED","TURNSTILE_TIMEOUT"]){
  const result=classifyGuestTextFailure(new Error(code));
  assert.equal(result.kind,"verification",code);
  assert.equal(result.reverify,true,code);
  assert.equal(result.retry,false,code);
  assert.match(result.messageKey,/guestText\.challenge(?:Timeout|Unavailable)/);
 }
});
test("new guest failure messages and buttons exist as strings in all 11 voice namespaces",()=>{
 const locales=["zh-TW","en","ja","ko","es","fr","de","pt-BR","id","vi","th"];
 let keys;
 for(const locale of locales){
  const json=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/voice.json`));
  const group=json.guestText;
  assert.ok(group,locale);
  const now=Object.keys(group).sort();
  if(!keys)keys=now;else assert.deepEqual(now,keys,locale);
  assert.equal(keys.length,22);
  for(const value of Object.values(group))assert.equal(typeof value,"string",locale);
 }
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 assert.match(panel,/useTranslation\("voice"\)/);
 const css=read("web-spa/src/live/TextChatPanel.css");
 assert.match(css,/\.crew-text-chat-error \.btn\{min-height:44px/);
});
