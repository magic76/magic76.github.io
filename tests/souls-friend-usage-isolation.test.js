const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=file=>readFileSync(path.resolve(__dirname,"..",file),"utf8");
const hook=read("web-spa/src/live/useLiveSession.ts");
const soulChat=read("web-spa/src/souls/SoulChat.tsx");
const classifySource=hook.match(/const chatKind=([\s\S]*?);\s*let learnerSpoke=/);
assert.ok(classifySource,"shared Live analytics classification exists");
const classify=new Function("pageKey","const configRef={current:{pageKey}};return "+classifySource[1]+";");

test("Souls has independent analytics classification even though it reuses Friend voice transport",()=>{
 assert.equal(classify("friend-soul-portrait-1"),null);
 assert.equal(classify("friend-soul-abc"),null);
 assert.match(soulChat,/sessionKind:"friend",conversationFlow:"friend"/);
 assert.match(soulChat,/trackUsageEvent\("souls_user_input"\)/);
 assert.match(soulChat,/trackUsageEvent\("souls_ai_replied"\)/);
 assert.match(soulChat,/trackUsageEvent\("souls_conversation"\)/);
 assert.match(soulChat,/recordExchange\(live\.turns\)/,"guest Live transcript turns are still measured");
});
test("normal teacher, friends, timeline and games retain their existing analytics categories",()=>{
 assert.equal(classify("teacher"),"teacher");
 assert.equal(classify("friend-ada"),"friend");
 assert.equal(classify("friend-live-noah"),"friend");
 assert.equal(classify("timeline-mira-25"),"timeline");
 assert.equal(classify("friend-game-taboo"),null);
 assert.equal(classify("crew-play-mini-taboo"),null);
 assert.equal(classify("story-create"),null);
});
test("Souls events record outcomes without sending conversation content to Friend metrics",()=>{
 const source=read("web-spa/src/souls/soulConversationMetrics.ts");
 assert.match(source,/turn\.input\?\.trim\(\)&&turn\.output\?\.trim\(\)/);
 const client=read("web-spa/src/analytics/usage.ts");
 for(const event of ["souls_user_input","souls_ai_replied","souls_conversation"])
  assert.ok(client.includes('"'+event+'"'));
});
