"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];

test("Shorts compact entry is opt-in and keeps the verified first-sentence send path",()=>{
 const page=read("web-spa/src/friends/FriendLivePage.tsx");
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 const starters=read("web-spa/src/live/TextChatStarters.tsx");
 assert.match(page,/textMode&&shortsPost\?" friend-text-short-post"/);
 assert.match(page,/firstStarter=\{shortsStarter\|\|/);
 assert.match(panel,/historyReady&&!messages\.length&&!draft\.trim\(\)/);
 assert.match(starters,/onClick=\{\(\)=>onPick\(\(gameStarter\|\|firstStarter\)!\)\}/);
 assert.match(panel,/className="crew-text-chat-form"/);
});
test("Short-phone layout preserves first suggestion, composer and keyboard focus",()=>{
 const css=read("web-spa/src/friends/friends.css");
 const block=css.split("/* #9 short phone:")[1];
 assert.ok(block,"Shorts-only compact block exists");
 assert.match(block,/@media\s*\(max-width:\s*\d+px\)\s*and\s*\(max-height:\s*\d+px\)/);
 assert.match(block,/friend-text-stage\.friend-text-short-post:not\(\.crew-text-keyboard-open\)/);
 assert.match(block,/\.friend-live-post p\{[^}]*text-overflow:ellipsis/);
 assert.match(block,/\.crew-text-starters-target-hint\{display:none/);
 assert.match(block,/\.crew-text-guest:not\(:has\(\.crew-text-challenge-host,\.crew-text-key-recovery,button\)\)/);
 assert.doesNotMatch(block,/(?:\.crew-text-starter(?:\s|:|\{)|\.crew-text-chat-form(?:\s|:|\{))[^{]*\{[^}]*display:none/);
 const shared=read("web-spa/src/live/TextChatPanel.css");
 assert.match(shared,/\.crew-text-starter\{[^}]*min-height:\d+px/);
 assert.match(shared,/\.crew-text-chat-form button\{[^}]*min-height:\d+px/);
});
test("Shorts post label remains string-valued in all 11 UI locales",()=>{
 const page=read("web-spa/src/friends/FriendLivePage.tsx");
 assert.match(page,/t\("friendLive\.postOrigin"\)/);
 for(const locale of locales){
  const resource=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/voice.json"));
  assert.equal(typeof resource.friendLive.postOrigin,"string",locale);
  assert.ok(resource.friendLive.postOrigin.trim(),locale);
 }
});
