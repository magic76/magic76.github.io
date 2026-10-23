const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.resolve(__dirname,"../",p),"utf8");
function load(p,names){
 const source=read(p).replace(/^import .+$/gm,"");
 const js=stripTypeScriptTypes(source).replace(/^export (const|function)/gm,"$1");
 const moduleRef={exports:{}};
 new Function("module","exports",js+"\nObject.assign(exports,{"+names.join(",")+"});")(moduleRef,moduleRef.exports);
 return moduleRef.exports;
}
const guide=load("web-spa/src/games/courtGuidance.ts",["courtDossier","courtQuestion","courtSuggestedLines","courtRoleMission","courtRiffIdeas"]);
const court=load("web-spa/src/games/crazyCourtEngine.ts",["courtCases"]);
test("all cases supply both roles with three meaningful conversation starters and four judge questions",()=>{
 for(const c of court.courtCases){
  const d=guide.courtDossier(c);
  assert.ok(d.background.zh.length>30&&d.dispute.zh.length>15);
  for(const role of ["defense","prosecution"]){
   for(const language of ["zh","en"]){
    const mission=guide.courtRoleMission(c,role,language);
    assert.ok(mission.includes(c.defendant[language]));
    assert.ok(mission.length>=45);
    const riffs=guide.courtRiffIdeas(c,role,language);
    assert.equal(riffs.length,3);
    assert.ok(riffs.every(item=>item.title.length>=3&&item.text.length>=25));
   }
   const approaches=guide.courtSuggestedLines(c,role,"zh");
   assert.equal(approaches.length,3);
   assert.ok(approaches.every(v=>v.title.length>=3&&v.text.length>8));
   for(let stage=0;stage<4;stage++)assert.ok(guide.courtQuestion(c,role,stage,"en").length>10);
  }
 }
});
test("Crazy Court advances stages only on explicit player request and allows optional hints",()=>{
 const s=read("web-spa/src/games/CrazyCourtPage.tsx");
 assert.match(s,/const nextStage=\(\)=>/);
 assert.match(s,/setStageActions\(n=>n\+1\)/);
 assert.match(s,/disabled=\{busy\|\|stageActions===0\}/);
 assert.match(s,/courtDynamicHints\(/);
 assert.match(s,/court-opening-guide/);
 assert.match(s,/court-role-mission/);
 assert.match(s,/court-case-clues/);
 assert.match(s,/courtRiffIdeas\(/);
 assert.match(s,/padStart\(3,"0"\)/);
 assert.doesNotMatch(s,/if\(next===maxTurns\)/);
 assert.match(s,/useTeacherStore\(state=>state\.targetLanguage\)/);
 assert.match(s,/judgeCourtTurn\(court,role,conversationLanguage/);
});
test("Chinese Taboo has genuine Chinese prompts, words, and forbidden terms",()=>{
 const s=read("web-spa/src/games/chineseTaboo.ts");
 const cards=load("web-spa/src/games/chineseTaboo.ts",["CHINESE_TABOO_CARDS","drawChineseTabooDeck"]);
 assert.ok(cards.CHINESE_TABOO_CARDS.length>=12);
 for(const card of cards.CHINESE_TABOO_CARDS){
  assert.match(card.word,/^[\u3400-\u9fff]+$/);
  assert.equal(card.zh,card.word);
  assert.ok(card.banned.every(term=>/^[\u3400-\u9fff]+$/.test(term)));
  assert.ok(!card.clues.some(clue=>[card.word,...card.banned].some(bad=>clue.includes(bad))),"clue must not reveal forbidden words: "+card.word);
 }
 for(const level of ["easy","medium"]){
  const draw=cards.drawChineseTabooDeck(level,()=>0.42);
  assert.equal(draw.length,5);
  assert.equal(new Set(draw.map(c=>c.word)).size,5);
 }
 assert.match(read("web-spa/src/games/TabooGamePage.tsx"),/drawChineseTabooDeck/);
 assert.match(read("web-spa/src/games/tabooEngine.ts"),/Traditional Chinese noun/);
});
