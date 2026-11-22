import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const list=read("web-spa/src/friends/FriendCallBubbleList.tsx");
const style=read("web-spa/src/friends/friendCallBubbles.css");
const hints=read("web-spa/src/live/useSuggestedReplies.ts");
const page=read("web-spa/src/friends/FriendLiveConversation.tsx");
test("AI bubble is left, learner bubble is right using existing call colors",()=>{
 assert.match(style,/\.friend-bubble-ai\{align-self:flex-start;background:#f6f9ff/);
 assert.match(style,/\.friend-bubble-user\{align-self:flex-end;background:#c9ddff18/);
 assert.match(list,/friend-bubble-ai/);
 assert.match(list,/friend-bubble-user/);
});
test("translation and 2-3 suggestions are nested below their AI utterance",()=>{
 assert.ok(list.includes("{turn.output.trim()}</p>")&&list.includes("{renderTranslation(turn.output.trim()"),"translation follows AI text");
 assert.match(list,/\{renderSuggestions\(turn\.index\)\}/);
 assert.match(list,/suggestions\.slice\(0,3\)/);
 assert.match(list,/latestAiKey===key/);
});
test("suggestions are replaced, cleared on new Zoe output, and old transcript remains",()=>{
 assert.match(hints,/setGroups\(\[next\]\)/);
 assert.match(hints,/const onInputSpeech=useCallback\(\(\)=>\{clear\(\)\}/);
 assert.match(page,/if\(live\.output\.trim\(\)\)replyHints\.clear\(\)/);
 assert.match(list,/completed\.map\(turn=>/);
 assert.doesNotMatch(list,/turns\.slice\(-1\)/);
});
test("conversation list scrolls to bottom and remains scrollable for old turns",()=>{
 assert.match(list,/pane\.scrollTop=pane\.scrollHeight/);
 assert.match(style,/overflow-y:auto/);
 assert.match(style,/overflow-x:hidden/);
});
test("new and modified TSX remain below 26000 bytes",()=>{
 for(const p of ["web-spa/src/friends/FriendLiveConversation.tsx","web-spa/src/friends/FriendCallCaptions.tsx","web-spa/src/friends/FriendCallBubbleList.tsx"]){
  assert.ok(Buffer.byteLength(read(p))<=26000,p+" exceeds 26KB");
 }
});
