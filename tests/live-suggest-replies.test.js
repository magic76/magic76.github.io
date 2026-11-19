import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {stripTypeScriptTypes} from "node:module";

const source=readFileSync("web-spa/src/live/suggestReplies.ts","utf8");
const js=stripTypeScriptTypes(source,{mode:"strip"});
const {parseSuggestedReplies}=await import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));
const reply=(text,translation="翻譯")=>({text,translation});

test("accepts two or three short unique replies",()=>{
 assert.equal(parseSuggestedReplies({replies:[reply("I like it."),reply("I prefer tea.")]}).length,2);
 assert.equal(parseSuggestedReplies({replies:[reply("One"),reply("Two"),reply("Three")]}).length,3);
});
test("rejects a single reply and keeps distinct replies after deduplication",()=>{
 assert.deepEqual(parseSuggestedReplies({replies:[reply("One")]}),[]);
 assert.deepEqual(parseSuggestedReplies({replies:[reply("One!"),reply("one."),reply("Two")]}),[reply("One!"),reply("Two")]);
 assert.deepEqual(parseSuggestedReplies({replies:[reply("Cats"),reply("Cat"),reply("Two")]}),[reply("Cats"),reply("Cat"),reply("Two")]);
});
test("rejects overlong and untranslated replies",()=>{
 assert.deepEqual(parseSuggestedReplies({replies:[reply("x".repeat(81)),reply("Two")]}),[]);
 assert.deepEqual(parseSuggestedReplies({replies:[reply("One",""),reply("Two")]}),[]);
});
test("rejects invalid arguments",()=>{
 assert.deepEqual(parseSuggestedReplies(null),[]);
 assert.deepEqual(parseSuggestedReplies("hello"),[]);
 assert.deepEqual(parseSuggestedReplies({replies:{}}),[]);
});
test("shared hook retains preference and clears stale suggestions",()=>{
 const hook=readFileSync("web-spa/src/live/useSuggestedReplies.ts","utf8");
 const live=readFileSync("web-spa/src/live/useLiveSession.ts","utf8");
 for(const snippet of ['koolo_reply_hints','localStorage.setItem(KEY','enabledRef.current','setReplies([])','onToolsUnavailable','replyHintsLocked'])assert.ok(hook.includes(snippet),snippet);
 assert.match(live,/onInputSpeech\?\.\(\)/);
 for(const path of ["web-spa/src/friends/FriendLivePage.tsx","web-spa/src/teacher/LivePage.tsx"]){
  const page=readFileSync(path,"utf8");
  assert.match(page,/useSuggestedReplies\(/);
  assert.match(page,/onInputSpeech:replyHints\.(?:clear|onInputSpeech)/);
  assert.match(page,/onTurnComplete:[^\n]*\n\s*replyHints\.clear\(\)/);
  assert.match(page,/onToolsUnavailable:replyHints\.onToolsUnavailable/);
  assert.ok(Buffer.byteLength(page)<26000,path);
 }
});

test("reply hint control sends at most once per learner exchange",async()=>{
 const gateSource=stripTypeScriptTypes(readFileSync("web-spa/src/live/replyHintTurnGate.ts","utf8"),{mode:"strip"});
 const {createReplyHintTurnGate}=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(gateSource));
 const gate=createReplyHintTurnGate();
 assert.equal(gate.takeRequest(true),true);
 assert.equal(gate.takeRequest(true),false);
 gate.onLearnerSpeech();
 assert.equal(gate.takeRequest(true),true);
});
test("reply hint control skips existing tool calls and disabled or guest modes",async()=>{
 const gateSource=stripTypeScriptTypes(readFileSync("web-spa/src/live/replyHintTurnGate.ts","utf8"),{mode:"strip"});
 const {createReplyHintTurnGate}=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(gateSource));
 const gate=createReplyHintTurnGate();
 assert.equal(gate.takeRequest(false),false);
 gate.onToolCall();
 assert.equal(gate.takeRequest(true),false);
 gate.onLearnerSpeech();
 assert.equal(gate.takeRequest(true),true);
 const live=readFileSync("web-spa/src/live/useLiveSession.ts","utf8");
 assert.match(live,/!guestModeRef\.current&&!replyHintControlPendingRef\.current/);
 assert.match(live,/!session\.micMuted&&!awaitingTutorRef\.current/);
 assert.match(live,/cancelRescue\(\);replyHintControlPendingRef\.current=true/);
});
