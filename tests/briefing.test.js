import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {abstractPreview,normalizeCandidate,select,unique,classify} from "../scripts/generate-briefing.mjs";
import {RESEARCH_AXES,matchingAxes,researchScore,selectResearch} from "../scripts/briefing-research-axes.mjs";
const now=new Date().toISOString();
const sample={title:"A new approach to agent memory and context retrieval",url:"https://example.org/paper",publishedAt:now,topic:"Agent Memory",projects:["Crew Pocket"],abstract:"An LLM memory retrieval study.",kind:"研究論文索引"};

test("selects research using headline evidence, not a broad search query",()=>{
 const nonsense={...sample,title:"A celebrity's new smartphone case",abstract:"Lots of attention about AI agents"};
 assert.equal(researchScore(nonsense),0);
 assert.equal(normalizeCandidate(nonsense),null);
 assert.ok(researchScore(sample)>=68);
 assert.deepEqual(select([sample]).map(x=>x.title),[sample.title]);
});

test("rejects old or unsafe links; avoids duplicate daily research",()=>{
 assert.equal(normalizeCandidate({...sample,url:"javascript:alert(1)"}),null);
 assert.equal(normalizeCandidate({...sample,publishedAt:"2020-01-01T00:00:00Z"}),null);
 const chosen=select([sample,sample]);assert.equal(chosen.length,1);
 assert.equal(select([sample],[{items:chosen}]).length,0);
});

test("rejects generic Ask HN questions and project commit noise",()=>{
 assert.equal(researchScore({...sample,title:"Ask HN: What are the best AI agent tools?"}),0);
 assert.equal(selectResearch([{...sample,title:"chore: prepare v2.4.1 release"}]).length,0);
});

test("supports eight practical research themes and deduplicates projects",()=>{
 assert.equal(RESEARCH_AXES.length,8);
 assert.ok(matchingAxes("Multi-agent collaboration and task coordination").length>=1);
 assert.ok(classify("AI speech language learning tutor").includes("Crew Teacher"));
 assert.deepEqual(unique(["Crew Pocket","Crew Pocket","Crew Web"]),["Crew Pocket","Crew Web"]);
});

test("source diversity prevents a single research topic occupying the whole report",()=>{
 const samples=Array.from({length:7},(_,i)=>({...sample,url:"https://example.org/paper-"+i,title:"Agent memory and long-term context retrieval benchmark "+i}));
 assert.ok(selectResearch(samples,[],8).length<=3);
});

test("reads paper metadata without inventing a research outcome",()=>{
 assert.equal(abstractPreview({Memory:[0],retrieval:[1],works:[2]},50),"Memory retrieval works");
 assert.equal(abstractPreview(null),"");
 assert.deepEqual(select([]),[]);
});

test("public reader doesn't present owner's GitHub or social editor utilities",()=>{
 const article=readFileSync(new URL("../web-spa/src/briefing/BriefingDetailPage.tsx",import.meta.url),"utf8");
 const landing=readFileSync(new URL("../web-spa/src/briefing/BriefingPage.tsx",import.meta.url),"utf8");
 assert.doesNotMatch(article,/與 GitHub 進度核對|Crew Lab SI 文章草稿|檢查公開 Commits|socialDraft|getRepoPulse/);
 assert.doesNotMatch(landing,/優先度 \{item\.score\}|GitHub Actions 手動執行/);
 assert.match(article,/參考資料/);
 assert.match(landing,/每日 AI 研究/);
});
