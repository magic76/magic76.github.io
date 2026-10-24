const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");
function loadDirector(){
 const ts=read("web-spa/src/games/nonsenseDirector.ts");
 const js=stripTypeScriptTypes(ts.replace(/^import .*$/gm,"")).replace(/^export /gm,"");
 const values={};
 new Function("values",js+"\nObject.assign(values,{parseDirectorEvent,directorToolKind,NewsRoundTracker});")(values);
 return values;
}
test("AI director only accepts validated, bounded event data",()=>{
 const {parseDirectorEvent,directorToolKind}=loadDirector();
 assert.equal(directorToolKind("show_evidence"),"evidence");
 assert.equal(directorToolKind("spawn_character"),"character");
 assert.equal(directorToolKind("offer_choices"),"choices");
 assert.equal(directorToolKind("trigger_effect"),"effect");
 assert.equal(directorToolKind("eval_script"),null);
 const scene=parseDirectorEvent("evidence",{title:"F".repeat(200),body:"B".repeat(400),detail:"private-looking",mood:"x",effect:"y"});
 assert.equal(scene.title.length,90);assert.equal(scene.body.length,260);
 assert.equal(scene.mood,"surprised");assert.equal(scene.effect,"alert");
 assert.throws(()=>parseDirectorEvent("choices",{choices:["only one"]}));
 assert.equal(parseDirectorEvent("choices",{choices:["A","B","C","D"]}).choices.length,3);
 assert.throws(()=>parseDirectorEvent("character",{title:"somebody"}));
 assert.throws(()=>parseDirectorEvent("dynamic_html",{title:"danger",body:"<script>"}));
});
test("three-round tracker deduplicates voice events and tapped choices",()=>{
 const {NewsRoundTracker}=loadDirector();
 const g=new NewsRoundTracker(3);
 assert.equal(g.acceptVoice("First absurd excuse","v1"),true);
 assert.equal(g.count,1);
 assert.equal(g.acceptVoice("First absurd excuse","v1"),false);
 assert.equal(g.acceptChoice("We will pay in starlight"),true);
 assert.equal(g.count,2);
 assert.equal(g.choicePending,true);
 assert.equal(g.acceptChoice("Duplicate tap"),false);
 assert.equal(g.acceptVoice("We will pay in starlight","echo"),false);
 assert.equal(g.count,2);
 g.endChoice();
 assert.equal(g.canShowFinale,false);
 assert.equal(g.acceptFinale(),false);
 assert.equal(g.acceptVoice("Last argument","v3"),true);
 assert.equal(g.canShowFinale,true);
 assert.equal(g.count,3);
 assert.equal(g.acceptVoice("Fourth argument","v4"),false);
 assert.equal(g.acceptFinale(),true);
 assert.equal(g.beginFinishing(),true);
 assert.equal(g.beginFinishing(),false);
});
test("long broadcasts count exactly the configured replies",()=>{
 const {NewsRoundTracker}=loadDirector();
 for(const length of [5,7]){
  const tracker=new NewsRoundTracker(length);
  for(let i=0;i<length-1;i++)assert.equal(tracker.acceptVoice("unique answer "+i,"turn"+i),true);
  assert.equal(tracker.count,length-1);
  assert.equal(tracker.canShowFinale,false);
  assert.equal(tracker.acceptVoice("last reply","last"),true);
  assert.equal(tracker.canShowFinale,true);
  assert.equal(tracker.acceptVoice("overflow","overflow"),false);
  assert.equal(tracker.acceptFinale(),true);
 }
});
test("stage cutaways are React elements with real click handlers, not arbitrary HTML",()=>{
 const stage=read("web-spa/src/games/NonsenseNewsStage.tsx");
 const card=read("web-spa/src/games/NonsenseDirectorCards.tsx");
 const css=read("web-spa/src/games/nonsenseNews.css");
 const live=read("web-spa/src/games/nonsenseNewsLive.ts");
 const page=read("web-spa/src/games/NonsenseLiveNewsPage.tsx");
 assert.match(stage,/NonsenseDirectorCards/);
 assert.match(card,/onClick=\{\(\)=>onChoice\(value\)\}/);
 assert.match(card,/news-director-card director-/);
 assert.match(card,/news-evidence-paper/);
 assert.match(card,/effect-/);
 assert.doesNotMatch(card,/dangerouslySetInnerHTML|innerHTML|eval\(/);
 assert.match(live,/sendText\(selected\)/);
 assert.match(live,/session\.toggleMic\(\)/);
 assert.match(live,/round\.acceptChoice\(selected\)/);
 assert.match(live,/beginFinishing/);
 assert.match(live,/onDirector:/);
 assert.match(live,/onChoiceBusy:/);
 assert.match(page,/submitText\(value\)/);
 assert.match(page,/choiceDisabled=/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test("AI JSON text mode can deliver real optional director cards",()=>{
 const engine=read("web-spa/src/games/nonsenseNewsEngine.ts");
 assert.match(engine,/parseDirectorEvent\(/);
 assert.match(engine,/director:\s*\{/);
 assert.match(engine,/2 or 3 distinct short options/);
 assert.match(engine,/Never include HTML or scripts/);
});
