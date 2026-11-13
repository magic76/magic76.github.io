const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
async function social(){
 const source=stripTypeScriptTypes(read("web-spa/src/teacher/shortsSocial.ts"),{mode:"strip"});
 return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
}
test("Shorts CTA keeps approved post, friend, hook, question and goes to text",async()=>{
 const {shortsChatUrl}=await social();
 const post={id:"ada-20261110",friendId:"ada"};
 const url=new URL(shortsChatUrl(post,"details",0),"https://example.test");
 assert.equal(url.pathname,"/friend/live");
 for(const [key,value] of Object.entries({id:"ada",post:"ada-20261110",hook:"details",q:"0",chat:"text"}))
  assert.equal(url.searchParams.get(key),value,key);
 assert.equal(new URL(shortsChatUrl(post),"https://example.test").searchParams.get("chat"),"text");
});
test("Validated post question is first suggested text reply; existing composer sends it",()=>{
 const friend=read("web-spa/src/friends/FriendLivePage.tsx");
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 const starters=read("web-spa/src/live/TextChatStarters.tsx");
 const bubble=read("web-spa/src/pages/HomeLiveBubble.tsx");
 assert.match(friend,/shortsSelectedQuestion\(shortsPost,params\.get\("q"\)/);
 assert.match(friend,/firstStarter=\{shortsStarter\|\|fortuneContinue\|\|dailyFortuneStarter\|\|dailyQuoteStarter\|\|dailyTopicStarter\}/);
 assert.match(starters,/firstStarter&&<button[^>]+onClick=\{\(\)=>onPick\(firstStarter\)\}/);
 assert.match(panel,/onPick=\{sentence=>void sendMessage\(sentence\)\}/);
 assert.match(panel,/if\(messages\.length&&history\.current\)/);
 assert.match(panel,/if\(latestMessages\.current\.length\)log\.scrollTop/);
 assert.match(panel,/try\{onExchange\?\.\(\)\}catch/);
 assert.match(friend,/trackUsageEvent\("shorts_conversation"\);rememberShortsConversation\(shortsPost\)/);
 assert.match(bubble,/const ZOE_LIVE="\/friend\/live\?id=zoe&from=home&entry=bubble"/);
 assert.doesNotMatch(bubble,/ZOE_LIVE=.*chat=text/);
 assert.match(friend,/if\(textMode\)alternateParams\.delete\("chat"\);else alternateParams\.set\("chat","text"\)/);
 assert.match(friend,/shortsPost&&!textMode\?<div className="friend-shorts-first-action"/);
 assert.match(friend,/if\(textMode\|\|!geminiKey\(\)\|\|shortsPost\)return/);
});
