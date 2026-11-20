import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const page=read("web-spa/src/teacher/LivePage.tsx");
const bubbles=read("web-spa/src/friends/FriendCallBubbleList.tsx");
const hook=read("web-spa/src/live/useSuggestedReplies.ts");
const session=read("web-spa/src/live/useLiveSession.ts");
test("teacher call removes status dot from teacher avatar",()=>{
 assert.match(page,/teacher-presence-shell/);
 assert.doesNotMatch(page,/className="live-presence-dot"/);
});
test("teacher generates two or three suggestions after a valid completed AI reply",()=>{
 assert.match(page,/useSuggestedReplies\(\{allowed:true,language:s\.targetLanguage,nativeLanguage:s\.nativeLanguage\}\)/);
 assert.match(page,/onInputSpeech:replyHints\.onInputSpeech/);
 assert.match(page,/if\(_turn\.hasValidOutput\)replyHints\.generate\(completedTurns\)/);
 assert.match(page,/suggestions=\{replyHints\.groups\.at\(-1\)\|\|\[\]\}/);
 assert.match(page,/suggestionsEnabled=\{replyHints\.enabled\}/);
 assert.match(bubbles,/suggestions\.slice\(0,3\)/);
});
test("latest-only hints and guest gate stay intact",()=>{
 assert.match(hook,/setGroups\(\[next\]\)/);
 assert.match(hook,/const onInputSpeech=useCallback\(\(\)=>\{clear\(\)\}/);
 assert.match(hook,/if\(!activeRef\.current\)return/);
 assert.match(session,/if\(!guestModeRef\.current\)configRef\.current\.onTurnComplete\?/);
 assert.ok(Buffer.byteLength(page)<=26000);
});
