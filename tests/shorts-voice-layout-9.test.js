"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("Shorts voice compact applies only to active voice sessions with a verified post",()=>{
 const page=read("web-spa/src/friends/FriendLivePage.tsx");
 assert.match(page,/!textMode&&active&&shortsPost\?" friend-shorts-voice-compact"/);
 assert.match(page,/shortsPost\?<section className="friend-live-post"/);
 assert.match(page,/<FriendCallCaptions name=\{friend\.name\}/);
});
test("Shorts voice layout gives transcripts one scroll area and keeps controls available",()=>{
 const css=read("web-spa/src/friends/friendCall.css");
 const scope=css.split("/* #9 voice follow-up:")[1];
 assert.ok(scope);
 assert.match(scope,/@media\(max-width:\d+px\)/);
 assert.match(scope,/friend-phone-stage\.friend-shorts-voice-compact/);
 assert.match(scope,/\.friend-phone-captions\{[^}]*overflow-y:auto/);
 assert.match(scope,/\.friend-caption-ai>p\{[^}]*overflow:visible/);
 assert.match(scope,/\.friend-caption-translation\{[^}]*max-height:none;overflow:visible/);
 assert.match(scope,/\.friend-phone-button svg\{[^}]*width:\d+px/);
 assert.doesNotMatch(scope,/\.friend-phone-captions\{[^}]*display:none/);
 assert.match(scope,/prefers-reduced-motion:reduce/);
});
