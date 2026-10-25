const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");

const read=relative=>fs.readFileSync(path.resolve(__dirname,"..",relative),"utf8");
function loadTs(relative,exports){
 const source=read(relative).replace(/^import .*$/gm,"");
 const stripped=stripTypeScriptTypes(source).replace(/^export /gm,"");
 const scope={exports:{}};
 new Function("module","exports",stripped+"\nObject.assign(exports,{"+exports.join(",")+"});")(scope,scope.exports);
 return scope.exports;
}
const topics=loadTs("web-spa/src/games/nonsenseTopics.ts",["nonsenseTopics","nonsenseCategories","nonsenseHints","nonsenseJudges","pickNonsenseTopic"]);
const judge=loadTs("web-spa/src/games/nonsenseJudge.ts",["parseNonsenseVerdict","nonsenseWeights"]);

test("the first release contains 150 unique bilingual topics across six categories",()=>{
 assert.equal(topics.nonsenseCategories.length,6);
 assert.equal(topics.nonsenseTopics.length,150);
 assert.equal(new Set(topics.nonsenseTopics.map(topic=>topic.id)).size,150);
 assert.equal(new Set(topics.nonsenseTopics.map(topic=>topic.zh)).size,150);
 assert.equal(new Set(topics.nonsenseTopics.map(topic=>topic.en)).size,150);
 for(const category of topics.nonsenseCategories){
  assert.equal(topics.nonsenseTopics.filter(t=>t.category===category.id).length,25);
  assert.equal(topics.nonsenseHints[category.id].zh.length,3);
  assert.equal(topics.nonsenseHints[category.id].en.length,3);
 }
 assert.ok(topics.nonsenseTopics.every(t=>t.zh.trim().length>4&&t.en.trim().length>9));
 assert.equal(topics.nonsenseJudges.length,4);
});

test("drawing respects category and excludes the previous topic",()=>{
 const first=topics.pickNonsenseTopic("science",undefined,()=>0);
 const second=topics.pickNonsenseTopic("science",first.id,()=>0);
 assert.notEqual(first.id,second.id);
 assert.equal(first.category,"science");
 assert.equal(second.category,"science");
 assert.equal(topics.pickNonsenseTopic("all",first.id,()=>0).id,topics.nonsenseTopics[1].id);
});

test("verdict totals only bounded sub-scores, never trusts model total",()=>{
 const speech="企鵝每天穿西裝，比大多數人更適合召開正式會議。";
 const input={creativity:35,logic:25,relevance:20,delivery:20,total:999,highlight:"企鵝每天穿西裝",comment:"論點荒謬但講得很有條理，值得一個掌聲。"};
 const parsed=judge.parseNonsenseVerdict(input,speech);
 assert.equal(parsed.total,100);
 assert.equal(parsed.highlight,"企鵝每天穿西裝");
 assert.deepEqual(judge.nonsenseWeights,{creativity:35,logic:25,relevance:20,delivery:20});
 for(const change of [{creativity:36},{delivery:-1},{logic:1.5},{relevance:"20"}]){
  assert.throws(()=>judge.parseNonsenseVerdict({...input,...change},speech));
 }
});

test("a fabricated quote is never presented as the player's own words",()=>{
 const speech="企鵝的西裝讓牠可以擔任主席。";
 const verdict=judge.parseNonsenseVerdict({
  creativity:12,logic:8,relevance:10,delivery:9,
  highlight:"玩家從未講過這句話",comment:"玩家有把荒謬的理由串起來，仍可以更具體。"
 },speech);
 assert.equal(verdict.highlight,"");
 assert.equal(verdict.total,39);
});

test("Crew Play provides a standalone route and key-free practice fallback",()=>{
 const app=read("web-spa/src/App.tsx"),hub=read("web-spa/src/games/CrewPlayHubPage.tsx"),page=read("web-spa/src/games/NonsenseChampionshipPage.tsx");
 assert.match(app,/path="\/games\/nonsense"/);
 assert.match(hub,/to="\/games\/nonsense"/);
 assert.match(page,/speechConstructor\(\)/);
 assert.match(page,/useState<Phase>\("setup"\)/);
 assert.match(page,/Date\.now\(\)\+60000/);
 assert.match(page,/setPhase\("review"\)/);
 assert.match(page,/if\(!geminiKey\(\)\)/);
 assert.match(page,/disabled=\{phase==="judging"\|\|!geminiKey\(\)\}/);
});
