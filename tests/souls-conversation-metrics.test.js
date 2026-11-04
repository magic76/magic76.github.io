const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"web-spa/src/souls/soulConversationMetrics.ts"),"utf8");
const stripped=stripTypeScriptTypes(source,{mode:"strip"}).replace("export function hasSoulExchange","function hasSoulExchange");
const hasSoulExchange=new Function(stripped+"\nreturn hasSoulExchange;")();
const chat=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulChat.tsx"),"utf8");

test("AI proactive greeting alone is never a real two-way Soul conversation",()=>{
 assert.equal(hasSoulExchange([]),false);
 assert.equal(hasSoulExchange([{output:"hello"}]),false);
 assert.equal(hasSoulExchange([{input:"hi"}]),false);
 assert.equal(hasSoulExchange([{input:"hi"},{output:"hello"}]),false);
 assert.equal(hasSoulExchange([{input:" ",output:"hello"}]),false);
 assert.equal(hasSoulExchange([{input:"hi",output:" "}]),false);
});
test("one same-turn valid user input and AI reply qualifies, including later turns",()=>{
 assert.equal(hasSoulExchange([{input:"hi",output:"hello"}]),true);
 assert.equal(hasSoulExchange([{output:"AI greeting"},{input:"Hi",output:"Hello"}]),true);
 assert.equal(hasSoulExchange([{input:" hi ",output:" hello "}]),true);
});
test("guest and BYOK transcript turns both feed the privacy-safe metric",()=>{
 const hook=fs.readFileSync(path.join(root,"web-spa/src/live/useLiveSession.ts"),"utf8");
 assert.match(hook,/if\(!guestModeRef\.current\)configRef\.current\.onTurnComplete\?\./);
 assert.match(chat,/recordExchange\(live\.turns\)/);
 assert.match(chat,/if\(!hasSoulExchange\(turns\)\)return/);
 assert.match(chat,/onTurnComplete:\(_turn,turns\)=>capture\(turns\)/);
 assert.match(chat,/if\(!countedConversation\.current\)/);
 assert.match(chat,/if\(!countedReply\.current\)/);
 assert.match(chat,/recordInput\(\);\s*setTyped/);
});
test("analytics emits only fixed event names, not photo, transcript or soul identifiers",()=>{
 for(const key of ["souls_live_attempt","souls_live_connected","souls_live_failed",
  "souls_user_input","souls_ai_replied","souls_conversation"]){
  assert.match(chat,new RegExp('trackUsageEvent\\("'+key+'"\\)'));
 }
 assert.doesNotMatch(chat,/trackUsageEvent\([^;\n]*?(?:soul\.id|soul\.name|draft|caption|lastSpeech)/);
});
