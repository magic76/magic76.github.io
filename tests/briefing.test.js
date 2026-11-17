import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {abstractPreview,normalizeCandidate,select,unique,classify,composeEdition,renderRssFeed} from "../scripts/generate-briefing.mjs";
import {RESEARCH_AXES,matchingAxes,researchScore,selectResearch} from "../scripts/briefing-research-axes.mjs";
import {parsePublicFeed,parseReleaseNotes} from "../scripts/briefing-public-sources.mjs";
import {assessResearchQuality} from "../scripts/research-quality.mjs";
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

test("rejects tangential voice commerce and general education policy studies",()=>{
 const retail={...sample,title:"ARTIFICIAL INTELLIGENCE IN RETAIL: CONSUMER ATTITUDES TOWARD VOICE COMMERCE"};
 const policy={...sample,title:"Integrating Artificial Intelligence into Early Childhood Education in Nigeria: Policy Imperatives"};
 assert.equal(researchScore(retail),0);
 assert.equal(researchScore(policy),0);
 assert.ok(researchScore({...sample,title:"Leveraging LiveKit for Real-Time AI-Driven Conversational Agents"})>=68);
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


test("RSS/Atom metadata is parsed safely, with invalid dates and links excluded",()=>{
 const xml='<rss><channel><item><title>Agent memory retrieval update</title><link>https://example.org/a</link><pubDate>Tue, 13 Oct 2026 10:00:00 GMT</pubDate><description><![CDATA[Improved retrieval.]]></description></item>'+
  '<item><title>Invalid time</title><link>https://example.org/b</link><pubDate>unknown</pubDate></item>'+
  '<item><title>Unsafe URL</title><link>http://example.org/c</link><pubDate>Tue, 13 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>';
 const items=parsePublicFeed(xml);
 assert.equal(items.length,1);
 assert.equal(items[0].url,"https://example.org/a");
 assert.equal(items[0].abstract,"Improved retrieval.");
 const atom='<feed><entry><title>Agent evaluation methods</title><link rel="alternate" href="https://example.org/atom"/><updated>2026-10-13T09:00:00Z</updated><summary>Benchmark methods.</summary></entry></feed>';
 assert.equal(parsePublicFeed(atom)[0].url,"https://example.org/atom");
});

test("release leads require relevant real note lines and reject draft releases",()=>{
 const notes=[
  {html_url:"https://github.com/openai/codex/releases/tag/v1",tag_name:"v1",published_at:now,body:"- Improve agent recovery after intermittent API connection errors, with explicit retry handling"},
  {html_url:"https://github.com/openai/codex/releases/tag/v2",tag_name:"v2",published_at:now,body:"- Update documentation links and dependency metadata only"},
  {html_url:"https://github.com/openai/codex/releases/tag/v3",tag_name:"v3",published_at:now,draft:true,body:"- Improve agent recovery after interrupted requests"}
 ];
 const items=parseReleaseNotes(notes,"Codex");
 assert.equal(items.length,1);
 assert.match(items[0].title,/agent recovery/);
 assert.equal(items[0].kind,"官方產品更新");
 assert.ok(researchScore({...sample,...items[0]})>=68);
});

test("compose up to six public items, and keep raw excerpts out of SEO indexing",()=>{
 const raw=Array.from({length:10},(_,i)=>({...normalizeCandidate(sample),id:"source-"+i,title:"Agent memory retrieval "+i}));
 const {items,deepCount}=composeEdition(raw,[]);
 assert.equal(items.length,6);
 assert.equal(deepCount,0);
 assert.equal(assessResearchQuality(items[0]).indexable,false);
 assert.deepEqual(composeEdition([],[]),{items:[],deepCount:0});
});

test("published RSS and future generated article links use the canonical Koolo domain",()=>{
 const expectedOrigin="https://koolo.app";
 const generated=renderRssFeed([{date:"2026-10-14",item:{id:"sample",title:"Example & research",summary:"Research summary",publishedAt:"2026-10-14T00:00:00Z"}}]);
 const expectedLinks=[expectedOrigin+"/research/",expectedOrigin+"/research/2026-10-14/sample"];
 const extractLinks=xml=>[...xml.matchAll(/<link>([^<]+)<\/link>/g)].map(match=>match[1]);
 assert.deepEqual(extractLinks(generated),expectedLinks);
 assert.match(generated,/<title>Example &amp; research<\/title>/);
 for(const file of ["../web-spa/public/briefings/feed.xml","../crew-app/briefings/feed.xml"]){
  const feed=readFileSync(new URL(file,import.meta.url),"utf8");
  assert.doesNotMatch(feed,/https?:\/\/magic76\.github\.io/);
  const links=extractLinks(feed);
  assert.ok(links.length>1,"feed must include channel and articles: "+file);
  assert.equal(links[0],expectedOrigin+"/research/");
  assert.ok(links.slice(1).every(link=>link.startsWith(expectedOrigin+"/research/")),"article links must use canonical production URLs: "+file);
 }
});
