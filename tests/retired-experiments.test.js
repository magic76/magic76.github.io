const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("retired Magic and Creature Lab are no longer exposed",()=>{
 const app=read("web-spa/src/App.tsx");
 assert.doesNotMatch(app,/import\("\.\/magic\/MagicPage"\)/);
 assert.match(app,/<Route path="\/magic" element={<Navigate to="\/explore" replace\/>}\/>/);
 for(const file of ["CrewSectionPage.tsx","HomePage.tsx","DesktopHomePage.tsx","MobileHomePage.tsx"]){
  assert.doesNotMatch(read("web-spa/src/pages/"+file),/creatureLabHref|CreatureLabResume|creatureProgress|to="\/magic"|to:"\/magic"/);
 }
 assert.doesNotMatch(read("web-spa/src/components/CrewFeatureMenuPanel.tsx"),/to:"\/magic"/);
});

test("normal chats no longer award creature energy",()=>{
 for(const file of ["live/TextChatPanel.tsx","teacher/LivePage.tsx","friends/FriendLiveConversation.tsx"]){
  assert.doesNotMatch(read("web-spa/src/"+file),/awardCreatureChatEnergy|useCreatureVoiceBridge|CreatureVoicePanel/);
 }
});

test("build replaces Creature Lab with a legacy redirect",()=>{
 const config=read("vite.web.config.ts");
 assert.match(config,/rmSync\(retiredLab, \{ recursive: true, force: true \}\)/);
 assert.match(read("scripts/prepare-cloudflare.mjs"),/\/crew-creature-lab\/\* \/explore 301/);
});
