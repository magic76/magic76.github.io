import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const provider=read("web-spa/src/live/secondLiveProvider.ts");
test("auxiliary Live defaults on and can be disabled for HTTP-only fallback",()=>{
 assert.match(provider,/AUX_PROVIDER_FLAG="koolo_aux_live_provider"/);
 assert.match(provider,/==="text-http"\?"text-http":"live-ws"/);
 assert.match(provider,/auxiliaryProvider\(\)==="text-http"/);
 assert.match(provider,/return http\(\)/);
});
test("secondary Live is text-only with no microphone, audio or tools and uses shared model defaults",()=>{
 assert.match(provider,/new window\.CrewLive\.Session/);
 assert.match(provider,/textOnly:true/);
 assert.doesNotMatch(provider,/models:\[/);
 assert.doesNotMatch(provider,/tools:/);
 assert.match(provider,/maxResumeAttempts:2/);
 assert.match(provider,/await session\.start\(\)/);
 assert.match(provider,/await session\.stop\(\)/);
 const live=read("crew-live.js");
 assert.match(live,/DEFAULT_MODELS=\["gemini-3\.8-live"/);
 assert.match(live,/this\.textOnly=this\.options\.textOnly===true/);
 assert.match(live,/_resumeAfterGoAway/);
});
test("failed, disconnected, timed out or malformed secondary responses fall back to original HTTP providers",()=>{
 assert.match(provider,/onTerminal:\(\)=>\{this\.ready=false;this\.fail/);
 assert.match(provider,/onError:\(\)=>\{this\.ready=false;this\.fail/);
 assert.match(provider,/auxiliary timeout/);
 assert.match(provider,/parseAuxiliaryJson\(raw\)/);
 assert.match(provider,/try\{return await live\(\)\}catch\{return http\(\)\}/);
 assert.match(provider,/translateCallSentence\(sentence,source,target,onText,signal\)/);
 assert.match(provider,/generateReplyHints\(turns,language,nativeLanguage\)/);
 assert.match(provider,/parseSuggestedReplies\(result\)/);
 assert.match(provider,/if\(replies\.length<2\)throw/);
});
test("friend call owns secondary session only while active and with a BYOK key",()=>{
 const lifecycle=read("web-spa/src/live/useAuxiliaryLiveSession.ts");
 const friend=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const captions=read("web-spa/src/friends/FriendCallCaptions.tsx");
 const hints=read("web-spa/src/live/useSuggestedReplies.ts");
 assert.match(lifecycle,/!active\|\|textMode\|\|!geminiKey\(\)/);
 assert.match(lifecycle,/return stopAuxiliarySession/);
 assert.match(friend,/useAuxiliaryLiveSession\(active,false\)/);
 assert.match(captions,/translateWithProvider\(part\.source,source,nativeLanguage,onText,controller\.signal\)/);
 assert.match(hints,/suggestWithProvider\(turns,language,nativeLanguage\)/);
 assert.ok(Buffer.byteLength(friend)<26000);
});
