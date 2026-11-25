const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const {mergeTranscript}=require("../crew-live.js").__test;
test("Latin transcription fragments preserve punctuation spaces and the first letter of the next word",()=>{
 for(const [base,chunk,expected] of [
  ["Iron Man is a classic!","He's such an interesting character","Iron Man is a classic! He's such an interesting character"],
  ["technology.","Do you like","technology. Do you like"],
  ["designs,","or is it","designs, or is it"],
  ["personality","you enjoy","personality you enjoy"],
  ["I like his"," suit","I like his suit"],
  ["Café","déjà vu","Café déjà vu"]
 ])assert.equal(mergeTranscript(base,chunk),expected);
});
test("punctuation spacing preserves CJK, numbers, contractions, cumulative snapshots and retransmitted text",()=>{
 for(const [base,chunk,expected] of [
  ["Hello","!","Hello!"],["I","'m here","I'm here"],
  ["3.","14","3.14"],["1,","000","1,000"],["U.","S.","U.S."],
  ["你好。","今天好嗎？","你好。今天好嗎？"],
  ["Hello","Hello world","Hello world"],
  ["I like movies","like movies today","I like movies today"],
  ["Hello world","world","Hello world"]
 ])assert.equal(mergeTranscript(base,chunk),expected);
});
test("teacher bubble list must be a vertical scroll surface, not a clipped caption",()=>{
 const css=fs.readFileSync("web-spa/src/teacher/teacherCall.css","utf8");
 const shared=fs.readFileSync("web-spa/src/friends/friendCallBubbles.css","utf8");
 const list=fs.readFileSync("web-spa/src/friends/FriendCallBubbleList.tsx","utf8");
 const rules=[...css.matchAll(/\.teacher-call-page \.teacher-live-stage\.friend-phone-stage>\.friend-phone-captions(?:\.friend-chat-bubbles)?\s*\{([^}]+)\}/g)];
 assert.ok(rules.length>=2);
 for(const rule of rules){
  assert.match(rule[1],/overflow-y:auto/);
  assert.doesNotMatch(rule[1],/overflow\s*:\s*hidden/);
  assert.match(rule[1],/min-height:0/);
 }
 assert.match(rules.at(-1)[1],/touch-action:pan-y/);
 assert.match(shared,/overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;touch-action:pan-y/);
 assert.match(list,/\[contentKey\]/);
 assert.match(list,/!followRef.current\)return/);
 assert.match(list,/scrollHeight-pane.clientHeight-pane.scrollTop<=48/);
 assert.match(css,/\.teacher-call-voice-dock\{[^}]*flex:0 0 auto/);
});
