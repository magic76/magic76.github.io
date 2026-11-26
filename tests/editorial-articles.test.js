const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const ROOT=path.resolve(__dirname,"..");
const ORIGIN="https://koolo.app";
const read=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
async function load(){return import("../scripts/editorial-articles.mjs");}

test("editorial catalog exposes six bilingual, substantial published articles only",async()=>{
 const {readEditorial}=await load();
 const items=readEditorial(ROOT);
 const raw=JSON.parse(read("content/editorial/articles.json"));
 assert.equal(items.length,6);
 assert.equal(raw.candidates.length,3);
 assert.ok(items.every(a=>a.status==="published"));
 assert.ok(items.every(a=>a.zh.sections.length>=3&&a.en.sections.length>=3));
 assert.ok(items.every(a=>a.zh.faq.length&&a.en.faq.length));
 assert.equal(new Set(items.map(x=>x.slug)).size,items.length);
 assert.ok(items.every(a=>!raw.candidates.some(c=>c.slug===a.slug)));
 for(const item of items){
  for(const name of ["zh","en"]){
   assert.ok(item[name].sections.every(s=>s.length>=3));
   assert.ok(item[name].description.length>=24);
  }
  const og=path.join(ROOT,"social/og",item.image+"-koolo-v1.png");
  assert.ok(fs.existsSync(og),"Missing curated article cover "+item.slug);
 }
});
test("build writes bilingual indexable pages and omits unreviewed candidates",async()=>{
 const {readEditorial,writeEditorialPages,editorialSitemapEntries}=await load();
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"koolo-editorial-"));
 try{
  assert.equal(writeEditorialPages(ROOT,dir),6);
  const items=readEditorial(ROOT);
  const xml=editorialSitemapEntries(items);
  const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
  assert.equal(urls.length,14);
  assert.equal(new Set(urls).size,14);
  for(const lang of ["","en/"]){
   const hub=fs.readFileSync(path.join(dir,lang,"articles/index.html"),"utf8");
   assert.match(hub,/<h1>/);
   assert.ok(hub.includes('href="'+ORIGIN+"/"+lang+"articles/"+'"'));
   assert.ok(hub.includes('data-editorial-ssg-path="/'+lang+'articles/"'));
   for(const item of items){
    const rel=lang+"articles/"+item.slug+"/";
    const body=fs.readFileSync(path.join(dir,rel,"index.html"),"utf8");
    const loc=ORIGIN+"/"+rel;
    assert.ok(urls.includes(loc));
    assert.ok(body.includes('<link rel="canonical" href="'+loc+'">'),rel);
    assert.ok(body.includes('<meta name="robots" content="index,follow">'),rel);
    assert.ok(body.includes('hreflang="zh-Hant" href="'+ORIGIN+"/articles/"+item.slug+'/"'),rel);
    assert.ok(body.includes('hreflang="en" href="'+ORIGIN+"/en/articles/"+item.slug+'/"'),rel);
    assert.ok(body.includes('data-editorial-ssg-path="/'+rel+'"'),rel);
    assert.match(body,/<h1>[^<]+<\/h1>/);
    assert.ok(body.includes('data-editorial-cta="'+item.slug+'"'),rel);
    const json=JSON.parse(body.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
    assert.ok(json["@graph"].some(x=>x["@type"]==="Article"&&x.mainEntityOfPage===loc));
    assert.ok(json["@graph"].some(x=>x["@type"]==="BreadcrumbList"));
   }
  }
  for(const c of JSON.parse(read("content/editorial/articles.json")).candidates){
   assert.ok(!urls.some(u=>u.includes(c.slug)));
   assert.ok(!fs.existsSync(path.join(dir,"articles",c.slug,"index.html")));
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test("review articles never become public without explicit published state",async()=>{
 const {readEditorial}=await load();
 const raw=JSON.parse(read("content/editorial/articles.json"));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"koolo-editorial-review-"));
 try{
  const output=path.join(dir,"content/editorial/articles.json");
  fs.mkdirSync(path.dirname(output),{recursive:true});
  raw.articles[0].status="review";
  fs.writeFileSync(output,JSON.stringify(raw));
  assert.equal(readEditorial(dir).length,5);
  raw.articles[1].slug="../unsafe";
  fs.writeFileSync(output,JSON.stringify(raw));
  assert.throws(()=>readEditorial(dir),/Invalid editorial entry/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test("existing research hub links to editorial center",()=>{
 assert.ok(read("web-spa/src/briefing/BriefingPage.tsx").includes('href="/articles/"'));
 assert.ok(read("scripts/prepare-cloudflare.mjs").includes("editorialSitemapEntries(editorialItems)"));
});
