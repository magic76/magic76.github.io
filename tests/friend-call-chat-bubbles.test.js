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

 test("same visible content does not retrigger scrolling and manual reading pauses follow",()=>{
 assert.match(list,/const contentKey=JSON.stringify/);
 assert.match(list,/\},\[contentKey\]\)/);
 assert.doesNotMatch(list,/\[turns,input,output,browserInput,translationRows,suggestions\]/);
 assert.match(list,/!followRef.current\)return/);
 assert.match(list,/scrollHeight-pane.clientHeight-pane.scrollTop<=48/);
 assert.match(style,/scroll-behavior:auto/);
 });

 test("identical rerenders leave manual scroll intact; changed content follows only near bottom",()=>{
 const fragment=list.slice(list.indexOf(" const contentKey=JSON.stringify"),list.indexOf(" return <div ref={scrollRef}"));
 const render=Function("completed","showCurrentInput","currentInput","showBrowser","browserText","showCurrentOutput","currentOutput","translationEnabled","needTranslation","translationRows","suggestionsEnabled","suggestions","scrollRef","followRef","useEffect",fragment);
 let writes=0,prior;const pane={scrollHeight:900,clientHeight:300,get scrollTop(){return 100},set scrollTop(value){assert.equal(value,900);writes++}};
 const follow={current:true};
 const run=(output,rows=[])=>render([{input:"Hi",output:"Hello"}],false,"",false,"",true,output,true,true,rows,true,[],{current:pane},follow,(effect,[key])=>{if(key!==prior){prior=key;effect()}});
 run("First");assert.equal(writes,1);
 follow.current=false;run("First",[]);run("First",[{kind:"pending",value:"translating"}]);assert.equal(writes,1);
 run("Second");assert.equal(writes,1,"do not interrupt a user reading old messages");
 follow.current=true;run("Third");assert.equal(writes,2,"following resumes after the user scrolls back down");
 run("Third",[]);assert.equal(writes,2);
 });
