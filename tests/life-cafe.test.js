const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
function engine(){
 const ts=stripTypeScriptTypes(read("web-spa/src/timeline/lifeCafeEngine.ts")).replace(/^import .*;\s*$/gm,"").replace(/^export /gm,"");
 const ctx={};
 vm.runInNewContext(ts+"\nglobalThis.game={newCafeWorld,cafeWorldValid,CAFE_PROPS,CAFE_ACTORS,cafeFirstResponder,useCafeProp,continueCafeWorld,catchUpCafeWorld,cafeBond,cafeFinale,cafeLength};",ctx);
 return ctx.game;
}
function experiment(seed,item,target,guess=null){
 const g=engine(),w=g.newCafeWorld(seed,1000000);
 return {g,start:w,result:g.useCafeProp(w,item,target,guess,1000001)};
}
test("five usable props, three actors, a consistent starting world",()=>{
 const g=engine(),w=g.newCafeWorld(42,3000000);
 assert.equal(g.CAFE_PROPS.length,5);
 assert.equal(g.CAFE_ACTORS.length,3);
 assert.equal(w.phase,"ready");
 assert.equal(w.used.length,0);
 assert.ok(g.cafeWorldValid(w));
 assert.deepEqual(Object.keys(w.relations).sort(),["ethan-hana","mira-ethan","mira-hana"]);
});
test("the same input produces identical reactions, but placing the letter elsewhere changes outcomes",()=>{
 const a=experiment(44,"letter","mira"),b=experiment(44,"letter","mira"),c=experiment(44,"letter","hana");
 assert.deepEqual(JSON.parse(JSON.stringify(a.result.moves)),JSON.parse(JSON.stringify(b.result.moves)));
 assert.equal(a.result.moves[0].news.title.zh,"誤會開始發酵");
 assert.equal(c.result.moves[0].news.title.zh,"秘密就在桌上");
 assert.equal(a.result.revealed.includes("hana-moving"),false);
 assert.equal(c.result.revealed.includes("hana-moving"),true);
 assert.ok(a.result.relations["mira-ethan"]<c.result.relations["mira-ethan"]);
});
test("camera can correct a letter misreading and repair the relationship",()=>{
 const g=engine();let w=g.newCafeWorld(88,1000000);
 w=g.useCafeProp(w,"letter","mira",null,1000001);
 const before=w.relations["mira-ethan"];
 w=g.continueCafeWorld(w,1000002);
 w=g.useCafeProp(w,"camera","ethan",null,1000003);
 assert.equal(w.moves[1].news.title.zh,"照片裡藏著另一個答案");
 assert.ok(w.relations["mira-ethan"]>before);
 assert.ok(w.revealed.includes("mira-photo"));
 assert.ok(w.flags.includes("photo-cleared"));
});
test("a new mystery has three acts, must open with the letter and ends with an explicit answer",()=>{
 const g=engine();let w=g.newCafeWorld(88,1000000);
 assert.equal(w.version,2);
 assert.equal(g.cafeLength(w),3);
 assert.throws(()=>g.useCafeProp(w,"ticket","mira",null,1000001),/anonymous letter/);
 for(const [item,target] of [["letter","hana"],["ticket","ethan"],["camera","mira"]]){
  w=g.useCafeProp(w,item,target,null,w.lastSeenAt+1);
  assert.ok(g.cafeWorldValid(w));
  w=g.continueCafeWorld(w,w.lastSeenAt+1);
 }
 assert.equal(w.phase,"finished");assert.equal(w.used.length,3);
 assert.equal(w.moves.length,3);
 assert.equal(w.revealed.length,3);
 assert.match(g.cafeFinale(w).title.zh,/再見/);
 assert.match(g.cafeFinale(w).detail.zh,/Hana/);
 assert.ok(g.cafeWorldValid(w));
 assert.throws(()=>g.useCafeProp(w,"rain","mira",null,w.lastSeenAt+1),/Invalid experiment/);
 assert.throws(()=>g.continueCafeWorld(w,w.lastSeenAt+1),/Nothing to advance/);
});
test("ending is a real consequence: unresolved false letter produces a missed goodbye",()=>{
 const g=engine();let w=g.newCafeWorld(55,1000000);
 for(const [item,target] of [["letter","mira"],["ticket","hana"],["coffee","mira"]]){
  w=g.useCafeProp(w,item,target,null,w.lastSeenAt+1);
  w=g.continueCafeWorld(w,w.lastSeenAt+1);
 }
 assert.equal(w.phase,"finished");
 assert.match(g.cafeFinale(w).title.zh,/錯過/);
 assert.match(g.cafeFinale(w).detail.zh,/Ethan/);
 assert.notEqual(g.cafeFinale(w).title.zh,"在離開之前，他們終於說了再見");
});
test("historical five-object local saves remain playable without silent truncation",()=>{
 const g=engine(),fresh=g.newCafeWorld(19,1000000);
 let w={...fresh,version:1,episodeLength:undefined};
 assert.equal(g.cafeLength(w),5);
 for(const [item,target] of [["ticket","ethan"],["coffee","hana"],["letter","mira"],["rain","mira"],["camera","ethan"]]){
  w=g.useCafeProp(w,item,target,null,w.lastSeenAt+1);
  assert.ok(g.cafeWorldValid(w));
  w=g.continueCafeWorld(w,w.lastSeenAt+1);
 }
 assert.equal(w.phase,"finished");assert.equal(w.moves.length,5);
 assert.match(g.cafeFinale(w).detail.zh,/Hana/);
});
test("prediction measures actual first reaction and skip does not count",()=>{
 const g=engine();let w=g.newCafeWorld(884,1000000);
 const first=g.cafeFirstResponder(w,"letter","ethan");
 w=g.useCafeProp(w,"letter","ethan",first,1000001);
 assert.equal(w.correctGuesses,1);assert.equal(w.attemptedGuesses,1);
 assert.equal(w.moves[0].first,first);assert.equal(w.moves[0].correct,true);
 w=g.continueCafeWorld(w,1000002);
 w=g.useCafeProp(w,"ticket","ethan",null,1000003);
 assert.equal(w.correctGuesses,1);assert.equal(w.attemptedGuesses,1);
});
test("spent props cannot be reused, invalid targets and forged save states fail closed",()=>{
 const g=engine();let w=g.newCafeWorld(23,1000000);
 w=g.useCafeProp(w,"letter","mira",null,1000001);
 w=g.continueCafeWorld(w,1000002);
 assert.throws(()=>g.useCafeProp(w,"letter","mira",null,1000003),/already used/);
 assert.throws(()=>g.useCafeProp(w,"ticket","intruder",null,1000003),/Invalid/);
 assert.equal(g.cafeWorldValid({...w,seed:-1}),false);
 assert.equal(g.cafeWorldValid({...w,relations:{"mira-ethan":101,"mira-hana":70,"ethan-hana":64}}),false);
 assert.equal(g.cafeWorldValid({...w,used:["letter","letter"]}),false);
});
test("time away adds at most three idempotent offline events and no server work",()=>{
 const g=engine(),start=g.newCafeWorld(15,1000000);
 const soon=g.catchUpCafeWorld(start,1000000+5*60000);
 assert.equal(soon,start);
 const next=g.catchUpCafeWorld(start,1000000+22*60000);
 assert.equal(next.awayReports.length,1);
 assert.ok(g.cafeWorldValid(next));
 assert.equal(g.catchUpCafeWorld(next,1000000+22*60000),next);
 const late=g.catchUpCafeWorld(start,1000000+10*60*60000);
 assert.equal(late.awayReports.length,3);
 assert.equal(g.catchUpCafeWorld(start,900000),start);
});
test("new cafe is the primary Crew life game without deleting original timeline or classic V3",()=>{
 const app=read("web-spa/src/App.tsx"),hub=read("web-spa/src/games/CrewPlayHubPage.tsx");
 assert.match(app,/path="\/timeline\/observe" element=\{<AppChrome product="teacher"><LifeCafePage/);
 assert.match(app,/path="\/timeline\/observe\/classic" element=\{<AppChrome product="teacher"><LifeObservatoryPage/);
 assert.match(hub,/Crew 生活實驗箱/);
 const storage=read("web-spa/src/timeline/lifeCafeStorage.ts");
 assert.match(storage,/crew-life-cafe-v1/);
 assert.doesNotMatch(storage,/crew_timeline_.*keepsakes|crew-life-observatory-v3/);
 const ui=read("web-spa/src/timeline/LifeCafePage.tsx");
 assert.match(ui,/lc-character-stage/);
 assert.match(ui,/lc-item-grid/);
 assert.match(ui,/lc-guess-pills/);
 assert.doesNotMatch(ui,/TextChatPanel|GeminiClient|useLiveSession/);
});
