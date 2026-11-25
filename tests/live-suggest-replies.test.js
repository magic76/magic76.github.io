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
 const page=readFileSync("web-spa/src/friends/FriendLiveConversation.tsx","utf8");
 assert.match(page,/if\(_turn\.hasValidOutput\)replyHints\.generate\(completedTurns\)/);
 assert.match(page,/onInputSpeech:replyHints\.onInputSpeech/);
 assert.doesNotMatch(page,/tools:replyHints\.tools|onToolCall:replyHints\.onToolCall|replyHints\.prompt|onMissingReplyHints/);
 assert.ok(Buffer.byteLength(page)<26000);
 const teacher=readFileSync("web-spa/src/teacher/LivePage.tsx","utf8");
 assert.match(teacher,/allowed:true/);
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

test("latest suggestions are nested inside the AI bubble and transcript remains scrollable",()=>{
 const bubbles=readFileSync("web-spa/src/friends/FriendCallBubbleList.tsx","utf8");
 const css=readFileSync("web-spa/src/friends/friendCallBubbles.css","utf8");
 const page=readFileSync("web-spa/src/friends/FriendLiveConversation.tsx","utf8");
 const hook=readFileSync("web-spa/src/live/useSuggestedReplies.ts","utf8");
 const menu=readFileSync("web-spa/src/friends/FriendCallMenuPreferences.tsx","utf8");
 assert.match(bubbles,/friend-bubble-suggestions/);
 assert.match(bubbles,/latestAiKey===key/);
 assert.match(bubbles,/suggestions\.slice\(0,3\)/);
 assert.match(bubbles,/renderTranslation\(turn\.output\.trim\(\)/);
 assert.match(bubbles,/renderSuggestions\(turn\.index\)/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/overflow-x:hidden/);
 assert.match(hook,/setGroups\(\[next\]\)/);
 assert.match(page,/suggestions=\{replyHints\.groups\.at\(-1\)\|\|\[\]\}/);
 assert.doesNotMatch(page,/<SuggestedReplies/);
 assert.match(menu,/aria-pressed=\{hintsEnabled\} disabled=\{hintsLocked\}/);
 assert.ok(Buffer.byteLength(page)<26000);
});

test("two generations retain only the latest group; new speech clears old hints",()=>{
 const hook=readFileSync("web-spa/src/live/useSuggestedReplies.ts","utf8");
 const page=readFileSync("web-spa/src/friends/FriendLiveConversation.tsx","utf8");
 assert.match(hook,/setGroups\(\[next\]\)/);
 assert.doesNotMatch(hook,/appendReplyGroup/);
 assert.match(hook,/const onInputSpeech=useCallback\(\(\)=>\{clear\(\)\}/);
 assert.match(hook,/const current=version\.current/);
 assert.match(hook,/if\(version\.current===current&&activeRef\.current&&next\.length>0\)/);
 assert.match(hook,/if\(!next\)clear\(\)/);
 assert.match(page,/if\(live\.output\.trim\(\)\)replyHints\.clear\(\)/);
});
