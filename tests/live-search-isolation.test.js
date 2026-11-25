const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {join}=require("node:path");

const read=path=>readFileSync(join(__dirname,"..",path),"utf8");

test("Live session does not attach Google Search to audio WebSocket setup",()=>{
 const live=read("web-spa/src/live/useLiveSession.ts");
 assert.match(live,/tools:grant\?\(guestMemoryAllowed\?\[\{functionDeclarations:guestMemoryTools!\}\]:undefined\):configRef\.current\.tools,/);
 assert.match(live,/filter\(tool=>tool\.name==="save_friend_memory"\)/);
 assert.match(live,/guestMemoryAllowed&&call\.name==="save_friend_memory"/);
 assert.doesNotMatch(live,/webSearch\s*\?/);
 assert.doesNotMatch(live,/tools:configRef\.current\.webSearch/);
});

test("Teacher, Friends and Discover use opt-in separate grounded requests",()=>{
 const action=read("web-spa/src/live/LiveSearchAction.tsx");
 assert.match(action,/searchGroundedText\(/);
 assert.match(action,/live\.sendText\(/);
 assert.match(action,/live\.presentGrounding\(/);
 for(const path of ["web-spa/src/teacher/LivePage.tsx","web-spa/src/friends/FriendLiveConversation.tsx"]){
  const code=read(path);
  assert.match(code,/LiveSearchAction/);
  assert.doesNotMatch(code,/webSearch:/);
 }
 const discover=read("web-spa/src/pages/DiscoverPage.tsx");
 assert.match(discover,/searchGroundedText\(/);
 assert.match(discover,/live\.presentGrounding\(/);
 assert.doesNotMatch(discover,/webSearch:/);
});

test("Searched facts have HTTPS-only citations and fail closed for speech injection",()=>{
 const action=read("web-spa/src/live/LiveSearchAction.tsx");
 assert.match(action,/if\(!answer\.sources\.length\)throw/);
 const grounding=read("web-spa/src/live/grounding.ts");
 assert.match(grounding,/url\.protocol==="https:"/);
});
