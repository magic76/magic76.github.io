const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");

test("BaZi SEO generator emits 14 bilingual public pages and reciprocal language links",async()=>{
 const {BAZI_SEO_SLUGS,BAZI_STEMS,writeBaziSeoPages,baziSitemapEntries}=await import("../scripts/bazi-seo.mjs");
 assert.equal(BAZI_STEMS.length,10);
 assert.equal(BAZI_SEO_SLUGS.length,14);
 assert.equal(new Set(BAZI_SEO_SLUGS).size,14);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"koolo-bazi-seo-"));
 try{
  writeBaziSeoPages(temp);
  const links=[];
  for(const slug of BAZI_SEO_SLUGS)for(const locale of ["zh","en"]){
   const part=(locale==="en"?"en/":"")+"fortune/"+slug+"/";
   const canonical="https://koolo.app/"+part;
   const html=fs.readFileSync(path.join(temp,part,"index.html"),"utf8");
   assert.ok(html.includes('<html lang="'+(locale==="en"?"en":"zh-Hant")+'">'),part);
   assert.match(html,/<title>[^<]+<\/title>/,part);
   assert.match(html,/<meta name="description" content="[^"]+">/,part);
   assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'),part);
   assert.ok(html.includes('hreflang="zh-Hant" href="https://koolo.app/fortune/'+slug+'/">'),part);
   assert.ok(html.includes('hreflang="en" href="https://koolo.app/en/fortune/'+slug+'/">'),part);
   assert.ok(html.includes('href="/fortune/reading?mode=bazi"'),part);
   assert.ok(html.includes('name="robots" content="index,follow"'),part);
   assert.ok(!html.includes("birthDate")&&!html.includes("birthTime")&&!html.includes("chartHash"),part);
   assert.ok(html.includes('application/ld+json'),part);
   links.push(canonical);
  }
  assert.equal(links.length,28);
  const sitemap=baziSitemapEntries(()=>"2026-11-21");
  assert.equal((sitemap.match(/<loc>/g)||[]).length,28);
  assert.equal((sitemap.match(/<lastmod>/g)||[]).length,28);
  assert.ok(!sitemap.includes("/fortune/reading"));
  assert.ok(!sitemap.includes("/fortune/live"));
  for(const link of links)assert.ok(sitemap.includes("<loc>"+link+"</loc>"));
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
});
