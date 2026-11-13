const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=filename=>fs.readFileSync(path.join(__dirname,"..",filename),"utf8");
const asModule=filename=>import("data:text/javascript;charset=utf-8,"+
 encodeURIComponent(stripTypeScriptTypes(read(filename),{mode:"strip"})));

const post={id:"ada-20261107",friendId:"ada",friendName:"Ada",storyId:"ada-pouch",language:"en",
 caption:"Those sharpened scissors have their first job: a padded pouch.",
 imageAlt:"Ada cutting a padded pouch with sharp scissors",
 storyContext:"The lining kept slipping; Ada cut a little extra allowance to hold it."};
const language="[FRIEND LANGUAGE CONTROL] Reply entirely in the chosen target language; no mixing. "+
 "Maintain this language setting after reconnect without corrections or parallel translations. ".repeat(15);

function makeSystem(context,persona){return persona+context+"\n"+language}

test("Shorts guest and BYOK prompts keep verified caption, story and final language rule",async()=>{
 const {buildShortsFriendContext}=await asModule("web-spa/src/teacher/shortsFeed.ts");
 const {buildShortsTextSystems}=await asModule("web-spa/src/live/shortsTextContext.ts");
 const context=buildShortsFriendContext(post);
 const {guest,live}=buildShortsTextSystems(makeSystem(context,"You are Ada. You like making things.\n"),context);
 for(const system of [guest,live]){
  assert.match(system,/\[SHORTS TEXT HANDOFF — FIRST REPLY\]/);
  assert.match(system,/\[CREW SHORTS — FICTIONAL POST BACKGROUND/);
  assert.ok(system.includes(post.caption),"approved caption preserved verbatim");
  assert.ok(system.includes(post.storyContext),"approved story context preserved verbatim");
  assert.match(system,/learner's actual opening message or question/);
  assert.ok(system.endsWith(language),"language reminder is the final instruction");
 }
 assert.ok(guest.length<=6000);
 assert.equal(live,guest,"ordinary-length prompts should not be shortened");
});

test("Hugo warm bun / hillside tram post survives full context assembly",async()=>{
 const {buildShortsFriendContext}=await asModule("web-spa/src/teacher/shortsFeed.ts");
 const {buildShortsTextSystems}=await asModule("web-spa/src/live/shortsTextContext.ts");
 const hugo={...post,id:"hugo-20261108",friendId:"hugo",friendName:"Hugo",storyId:"hugo-tram",
  caption:"My bun was still warm when the hillside tram arrived. I let it leave. Breakfast had become a two-handed situation.",
  storyContext:"Hugo buys a large steamed bun before the hillside tram arrives and lets it go while he enjoys breakfast."};
 const context=buildShortsFriendContext(hugo);
 const {guest}=buildShortsTextSystems(makeSystem(context,"Hugo is a fictional friend. "+"Life Book bakery scene. ".repeat(300)),context);
 assert.ok(guest.length<=6000);
 assert.ok(guest.includes(hugo.caption));
 assert.ok(guest.includes(hugo.storyContext));
 assert.ok(guest.endsWith(language));
});

test("Long Life Book cannot push Shorts details out of the guest 6000 limit",async()=>{
 const {buildShortsFriendContext}=await asModule("web-spa/src/teacher/shortsFeed.ts");
 const {buildShortsTextSystems}=await asModule("web-spa/src/live/shortsTextContext.ts");
 const context=buildShortsFriendContext(post);
 const persona="[IDENTITY] You are Ada. Respect safety rules.\n"+"Life Book ongoing lamp project. ".repeat(280)+
  "\n[CONTINUITY AND LANGUAGE] Stay Ada; prioritize the learner.\n";
 const original=makeSystem(context,persona);
 assert.ok(original.length>6000);
 // Demonstrate the original bug: the 4800+1100 clipping loses at least the caption.
 const old=original.slice(0,4800)+"\n"+original.slice(-1100);
 assert.ok(!old.includes(post.caption),"old middle truncation discards this caption");
 const {guest,live}=buildShortsTextSystems(original,context);
 assert.ok(guest.length<=6000,`worker must accept ${guest.length}`);
 assert.ok(live.length>6000,"BYOK is intentionally untruncated");
 for(const part of ["[SHORTS TEXT HANDOFF", "[CREW SHORTS",post.caption,post.storyContext]){
  assert.ok(guest.includes(part),`protected part missing: ${part}`);
  assert.ok(live.includes(part),`BYOK missing: ${part}`);
 }
 assert.ok(guest.startsWith("[IDENTITY]"),"first identity/safety instructions survive");
 assert.ok(guest.includes("[CONTINUITY AND LANGUAGE]"),"end of character prompt survives");
 assert.ok(guest.endsWith(language),"language directive remains final after truncation");
});

test("Shorts changes are opt-in, other chat and visible user message stay untouched",async()=>{
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 const friend=read("web-spa/src/friends/FriendLivePage.tsx");
 const {buildShortsTextSystems}=await asModule("web-spa/src/live/shortsTextContext.ts");
 assert.match(friend,/shortsContext=\{shortsPost\?buildShortsFriendContext\(shortsPost\):undefined\}/);
 assert.match(friend,/firstStarter=\{shortsStarter\|\|dailyFortuneStarter\|\|dailyQuoteStarter\|\|dailyTopicStarter\}/);
 assert.match(panel,/shortsContext\?buildShortsTextSystems\(baseSystem,shortsContext\):null/);
 assert.match(panel,/const system=shortsSystems\?\.live\|\|baseSystem/);
 assert.match(panel,/const guestBase=shortsSystems\?\.guest\?\?/);
 assert.match(panel,/const guestSystem=isFriend\?friendGuestSystem\(guestBase\):guestBase/);
 assert.match(panel,/new LiveTextConversation\(prior\?system\+[\s\S]*?\+prior:system,\s*searchEnabled/);
 assert.match(panel,/const next:Message\[\]=\[\.\.\.messages,\{role:"user",text:value\}\]/);
 assert.match(panel,/messages:next\.slice\(-10\)\.map\(m=>\(\{role:m\.role,text:m\.text\}\)\)/);
 assert.throws(()=>buildShortsTextSystems("No approved post was fetched", "[CREW SHORTS]"),/Missing verified/);
});
