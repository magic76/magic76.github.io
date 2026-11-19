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
test("friend voice generates text hints only after valid completed output",()=>{
 const page=readFileSync("web-spa/src/friends/FriendLivePage.tsx","utf8");
 assert.match(page,/if\(_turn\.hasValidOutput\)replyHints\.generate\(completedTurns\)/);
 assert.match(page,/onInputSpeech:replyHints\.onInputSpeech/);
 assert.doesNotMatch(page,/tools:replyHints\.tools|onToolCall:replyHints\.onToolCall|replyHints\.prompt|onMissingReplyHints/);
 assert.ok(Buffer.byteLength(page)<26000);
 const teacher=readFileSync("web-spa/src/teacher/LivePage.tsx","utf8");
 assert.match(teacher,/allowed:false/);
 assert.doesNotMatch(teacher,/tools:replyHints\.tools|replyHints\.prompt/);
 assert.ok(Buffer.byteLength(teacher)<26000);
});
test("disabled and guest sessions do not generate hints",()=>{
 const hook=readFileSync("web-spa/src/live/useSuggestedReplies.ts","utf8");
 const live=readFileSync("web-spa/src/live/useLiveSession.ts","utf8");
 assert.match(hook,/if\(!activeRef\.current\)return/);
 assert.match(hook,/localStorage\.setItem\(KEY/);
 assert.match(live,/if\(!guestModeRef\.current\)configRef\.current\.onTurnComplete\?/);
 assert.doesNotMatch(live,/REPLY_HINT_CONTROL|onMissingReplyHints|replyHintControlPendingRef/);
});
test("text generation is isolated from Live and failures are silent",()=>{
 const source=readFileSync("web-spa/src/live/replyHintText.ts","utf8");
 const hook=readFileSync("web-spa/src/live/useSuggestedReplies.ts","utf8");
 assert.match(source,/window\.CrewAI\.call\(prompt/);
 assert.match(source,/preferLive:false/);
 assert.match(source,/models:\["gemini-3\.5-flash-lite","gemini-3\.5-flash"\]/);
 const core=readFileSync("crew.js","utf8");
 assert.match(core,/Array\.isArray\(opt\.models\)/);
 assert.match(core,/preferred:TEXT/);
 assert.match(source,/if\(!geminiKey\(\)/);
 assert.match(source,/parseSuggestedReplies\(data\)/);
 assert.match(source,/catch\{return \[\]\}/);
 assert.match(source,/8000/);
 assert.match(hook,/version\.current===current&&activeRef\.current/);
 assert.match(hook,/\.catch\(\(\)=>\{\}\)/);
 assert.doesNotMatch(source,/sendControl|suggest_replies/);
});

test("reply hints default collapsed and expand independently of locked toggle",()=>{
 const component=readFileSync("web-spa/src/live/SuggestedReplies.tsx","utf8");
 const css=readFileSync("web-spa/src/live/suggestedReplies.css","utf8");
 assert.match(component,/useState\(false\)/);
 assert.match(component,/aria-expanded=\{expanded\}/);
 assert.match(component,/aria-controls=\{listId\}/);
 assert.match(component,/onClick=\{\(\)=>setExpanded\(value=>!value\)\}/);
 assert.match(component,/hasReplies&&expanded\?/);
 assert.match(component,/hasReplies\?<button className="live-suggest-expand"/);
 assert.match(component,/className="live-suggest-toggle" type="button" disabled=\{disabled\} aria-pressed=\{enabled\}/);
 assert.match(component,/suggestReplies\.nextCall/);
 assert.match(component,/reply\.translation/);
 assert.match(css,/\.live-suggest-expand/);
 assert.match(css,/\[aria-expanded="true"\]/);
 assert.ok(Buffer.byteLength(component)<26000);
 assert.ok(Buffer.byteLength(css)<26000);
});
