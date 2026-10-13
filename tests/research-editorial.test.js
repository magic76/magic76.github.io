const {test}=require("node:test");
const assert=require("node:assert/strict");
const {join,resolve}=require("node:path");

const root=resolve(__dirname,"..");
test("research SEO requires project-specific commentary, limits, and source references",async()=>{
 const {assessResearchQuality}=await import("../scripts/research-quality.mjs");
 const {readPublishedResearch,indexableArticle}=await import("../scripts/research-seo.mjs");
 const {days}=readPublishedResearch(root);
 let indexed=0,thin=0;
 for(const day of days.values())for(const item of day.items){
  const report=assessResearchQuality(item);
  assert.equal(report.indexable,indexableArticle(item),"SSG gate must reuse editorial rules");
  assert.ok(report.reasons.every(x=>typeof x==="string"));
  if(report.indexable)indexed++;else thin++;
 }
 assert.ok(indexed+thin>0,"public research feed must contain real content");
 const detailed=[...days.values()].flatMap(day=>day.items).find(item=>item.id==="research-acon-icml-2026");
 if(detailed){
  assert.equal(assessResearchQuality(detailed).indexable,true,"specific Crew analysis with limitations should qualify");
  const excerpt={...detailed,body:detailed.summary,relevance:"這個議題涉及 Crew Pocket。可先評估現有做法，再決定是否安排小型實驗。"};
  const reasons=assessResearchQuality(excerpt).reasons;
  assert.ok(reasons.includes("copied_excerpt")&&reasons.includes("generic_application"),"raw excerpts and boilerplate must be excluded");
  assert.ok(assessResearchQuality({...detailed,sources:[]}).reasons.includes("missing_https_source"),"a source is required");
  assert.ok(assessResearchQuality({...detailed,body:detailed.body.replace("研究限制：","")}).reasons.includes("missing_limitations"),"must identify limitations");
 }
});
test("related articles are real published routes, not self links or guessed products",async()=>{
 const {readPublishedResearch,articlePath}=await import("../scripts/research-seo.mjs");
 const {recommendPublishedResearch}=await import("../scripts/research-discovery.mjs");
 const {days}=readPublishedResearch(root);
 const catalogue=recommendPublishedResearch(days);
 const published=new Set([...days].flatMap(([date,day])=>day.items.map(item=>articlePath(date,item))));
 assert.deepEqual(new Set(Object.keys(catalogue)),published,"every published article must have a manifest entry");
 for(const [url,items] of Object.entries(catalogue)){
  assert.ok(Array.isArray(items)&&items.length<=3,"maximum three related articles");
  const seen=new Set();
  for(const entry of items){
   assert.ok(published.has(entry.path),"recommendation must have a corresponding SSG file: "+entry.path);
   assert.notEqual(entry.path,url,"never recommend an article itself");
   assert.ok(!seen.has(entry.path),"never duplicate recommendations");
   assert.ok(entry.reason&&entry.title&&entry.topic,"relationship must come from public article metadata");
   seen.add(entry.path);
  }
 }
 const acon=catalogue["/research/2026-10-11/research-acon-icml-2026/"];
 if(acon)assert.ok(acon.some(x=>x.topic==="Context Engineering"),"topic-matching context research must be discoverable");
});
