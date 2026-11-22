const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const canon=require("../contracts/crew-character-life-book/v1.json");
const zh=require("../contracts/crew-character-life-book/locales/zh-TW.json");
const read=p=>fs.readFileSync(p,"utf8");
test("translated character UI entries exactly match sixteen Friends and Teachers",()=>{
 assert.equal(zh.locale,"zh-TW");assert.equal(zh.fallback,"en");
 assert.deepEqual(Object.keys(zh.friends).sort(),Object.keys(canon.friends).sort());
 assert.deepEqual(Object.keys(zh.teachers).sort(),Object.keys(canon.teachers).sort());
 for(const [id,p] of Object.entries(zh.friends)){
  assert.ok(p.summary.length>6,id+" summary");
  assert.ok(p.people.length>6,id+" people");
  assert.ok(p.current.length>6,id+" tension");
  assert.equal(p.moments.split("；").length,3,id+" moments");
 }
 for(const [id,p] of Object.entries(zh.teachers)){
  assert.ok(p.summary.length>6,id+" summary");
  assert.ok(p.teaching.length>6,id+" teaching");
  assert.equal(p.moments.split("；").length,2,id+" moments");
 }
});
test("UI locale does not select spoken language or mutate memories",()=>{
 const model=read("web-spa/src/characters/lifeBookLocale.ts");
 const friend=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const teacher=read("web-spa/src/teacher/LivePage.tsx");
 const book=read("web-spa/src/characters/lifeBook.ts");
 assert.match(model,/UI-only biography selection/);
 assert.match(model,/lifeBookLocale/);
 assert.match(model,/return normal===/);
 assert.doesNotMatch(model,/setFriendChatMode|setTargetLanguage|setTeacherProfile/);
 assert.match(friend,/openingPrompt:languageDirective/);
 assert.match(friend,/conversationHint:fortuneContinue\|\|gameRoundStarter\(/);
 assert.match(teacher,/opening\+"\\n"\+languageDirective/);
 assert.match(book,/English authoring language/);
 assert.match(read("web-spa/src/friends/FriendsPage.tsx"),/characterLifeView\("friend",selected\.id,locale\.language\)/);
 assert.match(read("web-spa/src/teacher/TeacherProfilePicker.tsx"),/characterLifeView\("teacher",detail\.id,locale\.language\)/);
});
