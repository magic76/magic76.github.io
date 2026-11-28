const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const vm=require("node:vm");
test("six distinct bilingual SEO intent guides are crawlable and functional",async()=>{
 const m=await import("../scripts/intent-seo.mjs");
 assert.equal(m.INTENT_SEO_SLUGS.length,6);
 assert.equal(new Set(m.INTENT_SEO_SLUGS).size,6);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"koolo-intent-"));
 try{
  m.writeIntentSeoPages(tmp);
  for(const slug of m.INTENT_SEO_SLUGS)for(const en of [false,true]){
   const rel=(en?"en/":"")+"guides/"+slug+"/";
   const html=fs.readFileSync(path.join(tmp,rel,"index.html"),"utf8");
   const url="https://koolo.app/"+rel;
   assert.ok(html.includes('<link rel="canonical" href="'+url+'">'),rel);
   assert.ok(html.includes('hreflang="zh-Hant"')&&html.includes('hreflang="en"'),rel);
   assert.ok(html.includes('property="og:image"'),rel);
   assert.ok(html.includes('<h1>')&&html.includes('type="application/ld+json"'),rel);
   assert.equal((html.match(/data-seo-cta="/g)||[]).length,2,rel);
   assert.ok(html.indexOf('data-seo-cta="top"')<html.indexOf('<img class="hero"'),rel);
   assert.ok(!html.includes("chartHash")&&!html.includes("birthTime"),rel);
   assert.ok(html.includes("seo_intent_cta_click"),rel);
   assert.ok(/href="\/(?:en\/)?(?:fortune\/reading\?mode=(?:bazi|tarot)|learn|friend\/live\?id=zoe)/.test(html),rel);
   const json=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
   assert.ok(json,rel);
   const structured=JSON.parse(json[1]);
   assert.equal(structured["@graph"].find(x=>x["@type"]==="BreadcrumbList").itemListElement.at(-1).item,url);
   assert.ok(!html.includes("crew_ui_locale_v1"),rel);
   for(const match of html.matchAll(/data-seo-cta="[^"]+" class="cta" href="([^"]+)"/g))assert.equal(match[1].startsWith("/en/"),en,rel);
   const embedded=html.match(/<script>([\s\S]*?)<\/script><\/body>/);
   assert.ok(embedded,rel);
   new vm.Script(embedded[1],{filename:rel});
   if(slug.startsWith("2027-"))assert.ok(html.includes("www-ws.gov.taipei"),rel);
  }
  const sitemap=m.intentSitemapEntries(()=>"2026-11-23");
  assert.equal((sitemap.match(/<loc>/g)||[]).length,12);
  assert.ok(!sitemap.includes("/fortune/reading"));
  assert.equal(m.personalYear2027(7,6),6);
  assert.equal(m.personalYear2027(1,1),4);
  assert.throws(()=>m.personalYear2027(2,30));
  assert.deepEqual(m.goatYear2027("2027-02-04","09:45"),{bazi:"丙午",lunar:"丙午"});
  assert.deepEqual(m.goatYear2027("2027-02-04","09:46"),{bazi:"丁未",lunar:"丙午"});
  assert.deepEqual(m.goatYear2027("2027-02-06","00:00"),{bazi:"丁未",lunar:"丁未"});
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
