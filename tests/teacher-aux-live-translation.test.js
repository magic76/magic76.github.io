import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const page=read("web-spa/src/teacher/LivePage.tsx");
const hook=read("web-spa/src/live/useAuxiliaryLiveSession.ts");
const captions=read("web-spa/src/friends/FriendCallCaptions.tsx");
const provider=read("web-spa/src/live/secondLiveProvider.ts");

test("teacher voice and fortuneKind calls activate auxiliary WS only when active and not text",()=>{
 assert.match(page,/import \{useAuxiliaryLiveSession\} from "\.\.\/live\/useAuxiliaryLiveSession"/);
 assert.match(page,/useAuxiliaryLiveSession\(sessionActive,textMode\)/);
 assert.match(page,/const sessionActive=\["requesting-mic","connecting","listening","speaking","ending","reporting"\]/);
 assert.match(hook,/if\(!active\|\|textMode\|\|!geminiKey\(\)\)return/);
 assert.match(hook,/startAuxiliarySession\(\)/);
 assert.match(hook,/return stopAuxiliarySession/);
 assert.match(page,/fortuneKind/);
});

test("teacher captions use shared Live WS translator and HTTP fallback",()=>{
 assert.match(page,/<FriendCallCaptions\b/);
 assert.match(captions,/translateWithProvider\(part\.source,source,nativeLanguage/);
 assert.match(provider,/active!\.request\(/);
 assert.match(provider,/\(\)=>translateCallSentence\(sentence,source,target,onText,signal\)/);
 assert.match(provider,/AUX_PROVIDER_FLAG="koolo_aux_live_provider"/);
 assert.match(provider,/if\(auxiliaryProvider\(\)==="text-http"\|\|!geminiKey\(\)\|\|!active\)return http\(\)/);
 assert.match(provider,/catch\{return http\(\)\}/);
});

test("teacher hints remain disabled and TSX size stays below 26000 bytes",()=>{
 assert.match(page,/useSuggestedReplies\(\{allowed:true,language:s\.targetLanguage,nativeLanguage:s\.nativeLanguage\}\)/);
 assert.ok(Buffer.byteLength(page)<=26000,"teacher/LivePage.tsx exceeds 26000 B");
});
