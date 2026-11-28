const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const vm=require("node:vm");

test("numerology public cluster generates 10 bilingual topics with correct cards, master-number caveat and private chart handoff",async()=>{
 const {NUMEROLOGY_SEO_SLUGS,NUMEROLOGY_NUMBERS,writeNumerologySeoPages,numerologySitemapEntries}=await import("../scripts/numerology-seo.mjs");
 assert.equal(NUMEROLOGY_NUMBERS.length,9);
 assert.equal(NUMEROLOGY_SEO_SLUGS.length,10);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"koolo-numerology-"));
 try{
  writeNumerologySeoPages(tmp);
  const urls=[];
  for(const slug of NUMEROLOGY_SEO_SLUGS)for(const lang of ["zh","en"]){
   const rel=(lang==="en"?"en/":"")+"fortune/"+slug+"/";
   const url="https://koolo.app/"+rel;
   urls.push(url);
   const html=fs.readFileSync(path.join(tmp,rel,"index.html"),"utf8");
   assert.ok(html.includes('<html lang="'+(lang==="en"?"en":"zh-Hant")+'">'),rel);
   assert.ok(html.includes('<link rel="canonical" href="'+url+'">'),rel);
   for(const code of ["zh-Hant","en","x-default"])assert.ok(html.includes('hreflang="'+code+'"'),rel);
   assert.ok(html.includes('property="og:image" content="https://koolo.app/fortune/'),rel);
   assert.ok(html.includes('<img class="hero"'),rel);
   assert.ok(html.includes('alt="'),rel);
   assert.ok(html.includes('href="'+(lang==="en"?"/en":"")+'/fortune/reading?mode=tarot"'),rel);
   assert.equal(html.includes('/en/fortune/reading?mode=tarot'),lang==='en',rel);
   assert.equal((html.match(/data-seo-cta="/g)||[]).length,2,rel);
   assert.equal((html.match(/<details>/g)||[]).length,3,rel);
   assert.ok(!html.includes("crew_ui_locale_v1"),rel);
   assert.ok(html.includes('11')&&html.includes('22')&&html.includes('33'),"master numbers explained "+rel);
   assert.ok(!html.includes("birthTime")&&!html.includes("chartHash"),rel);
   const ld=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
   assert.ok(ld,rel);
   const graph=JSON.parse(ld[1])["@graph"];
   const crumbs=graph.find(x=>x["@type"]==="BreadcrumbList").itemListElement;
   assert.equal(crumbs.length,slug==="numerology"?2:3,rel);
   assert.equal(crumbs.at(-1).item,url,rel);
  }
  const xml=numerologySitemapEntries(()=>"2026-11-22");
  assert.equal((xml.match(/<loc>/g)||[]).length,20);
  assert.equal((xml.match(/<lastmod>/g)||[]).length,20);
  for(const url of urls)assert.ok(xml.includes("<loc>"+url+"</loc>"),url);
  assert.ok(!xml.includes("/fortune/reading"));
  assert.ok(!xml.includes("/fortune/live"));
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});

test("SEO numerology copy reflects the shipped deterministic Tarot calculator",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../features/fortune/tarot/calculator.js"),"utf8");
 const context={window:{}};
 vm.runInNewContext(source,context);
 const result=context.window.CrewFortuneTarot.calculate("1985-07-06",new Date("2026-10-04T00:00:00Z"));
 assert.equal(result.lifePathNumber,9);
 assert.equal(result.birthCardDisplay,"9 隱者");
 assert.ok(source.includes("v!==11&&v!==22&&v!==33"),"master 11/22/33 must remain distinct");
});
