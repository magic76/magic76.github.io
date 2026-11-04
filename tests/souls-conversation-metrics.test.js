const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"web-spa/src/souls/soulConversationMetrics.ts"),"utf8");
const stripped=stripTypeScriptTypes(source,{mode:"strip"})
 .replace(/export function /g,"function ");
const run=new Function(stripped+"\nreturn{hasSoulExchange,hasSoulInput};")();
const {hasSoulExchange,hasSoulInput}=run;

test("AI opening greeting alone does not count as two-sided Soul chat",()=>{
 assert.equal(hasSoulInput([{output:"Hello!"}]),false);
 assert.equal(hasSoulExchange([{output:"Hello!"}]),false);
 assert.equal(hasSoulExchange([{input:"hello"}]),false);
 assert.equal(hasSoulExchange([{input:"hello"},{output:"nice to meet you"}]),false,
  "separate unpaired turns are not proof of a two-sided exchange");
});

test("only confirmed input + assistant output within the same completed turn qualifies",()=>{
 assert.equal(hasSoulInput([{input:"hello"}]),true);
 assert.equal(hasSoulExchange([{input:" hello ",output:" hi " }]),true);
 assert.equal(hasSoulExchange([{input:"  ",output:"hello"}]),false);
 assert.equal(hasSoulExchange([{input:"hello",output:"  "}]),false);
 assert.equal(hasSoulExchange([{input:null,output:"hi"},{input:"OK",output:"yes"}]),true);
});

test("guest Live state updates are measured even though guest session callbacks are skipped",()=>{
 const chat=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulChat.tsx"),"utf8");
 const live=fs.readFileSync(path.join(root,"web-spa/src/live/useLiveSession.ts"),"utf8");
 assert.match(live,/if\(!guestModeRef\.current\)configRef\.current\.onTurnComplete\?\./);
 assert.match(chat,/recordExchange\(live\.turns\)/);
 assert.match(chat,/hasSoulInput\(live\.turns\)/);
 assert.match(chat,/if\(!hasSoulExchange\(turns\)\)return/);
 assert.match(chat,/if\(!usageFlags\.current\.completed\)/);
 assert.match(chat,/if\(!usageFlags\.current\.replied\)/);
 assert.match(chat,/if\(!live\.sendText\(value\)\)/);
 assert.match(chat,/recordInput\(\);\s*setTyped/);
});

test("analytics stage names never include a transcript, Soul ID or personal data",()=>{
 const chat=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulChat.tsx"),"utf8");
 for(const name of [
  "souls_live_attempt","souls_live_connected","souls_live_failed",
  "souls_user_input","souls_ai_replied","souls_conversation"
 ]){
  assert.match(chat,new RegExp('trackUsageEvent\\("'+name+'"\\)'));
 }
 assert.doesNotMatch(chat,/trackUsageEvent\([^;\n]*?(?:soul\.id|soul\.name|draft|caption|lastSpeech)/);
});
