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
   const image=slug.startsWith("bazi/")&& !["five-elements","ten-gods","luck-cycles"].includes(slug.split("/")[1])
    ?"/fortune/identity/art/bazi-"+({"jia-wood":"jia","yi-wood":"yi","bing-fire":"bing","ding-fire":"ding","wu-earth":"wu","ji-earth":"ji","geng-metal":"geng","xin-metal":"xin","ren-water":"ren","gui-water":"gui"}[slug.split("/")[1]])+".webp"
    :"/fortune/modes/fortune-bazi-cover.webp";
   assert.ok(html.includes('src="'+image+'"'),"missing hero image "+part);
   assert.ok(html.includes('alt="'),"missing image alt "+part);
   assert.ok(html.includes('<meta property="og:image" content="https://koolo.app'+image+'">'),"missing OG image "+part);
   links.push(canonical);
  }

  // P0.1 page quality: meaningful first-screen CTA, distinct FAQ, and correct locale handling.
  for(const slug of BAZI_SEO_SLUGS)for(const locale of ["zh","en"]){
   const rel=(locale==="en"?"en/":"")+"fortune/"+slug+"/";
   const html=fs.readFileSync(path.join(temp,rel,"index.html"),"utf8");
   const firstCta=html.indexOf('data-seo-cta="top"');
   assert.ok(firstCta>0&&firstCta<html.indexOf('<img class="bazi-hero"'),"first-screen CTA must precede hero "+rel);
   assert.equal((html.match(/data-seo-cta="/g)||[]).length,2,"top and bottom CTAs "+rel);
   assert.ok((html.match(/<details>/g)||[]).length>=3,"FAQ is substantive "+rel);
   assert.ok(html.includes('href="/fortune/reading?mode=bazi"'),"real SPA route "+rel);
   if(locale==="en")assert.ok(html.includes("crew_ui_locale_v1"),"English UI handoff "+rel);
   const related=(html.match(/<li><a href=/g)||[]).length;
   assert.ok(related>=3&&related<=4,"focused related reading "+rel);
   assert.ok(html.includes('fortune_seo_chart_click'),"CTA analytics "+rel);
   const json=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
   assert.ok(json,"structured data missing "+rel);
   const graph=JSON.parse(json[1])["@graph"];
   const items=graph.find(item=>item["@type"]==="BreadcrumbList").itemListElement;
   assert.equal(items.length,slug==="bazi"?2:3,"breadcrumb count "+rel);
   assert.equal(items.at(-1).item,"https://koolo.app/"+rel,"breadcrumb current "+rel);
  }
  for(const name of ["five-elements","ten-gods","luck-cycles"]){
   const svg=fs.readFileSync(path.join(temp,"fortune","bazi","assets",name+".svg"),"utf8");
   assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'),"valid SVG "+name);
   assert.ok(svg.includes("<text"),"educational labels "+name);
   for(const locale of ["zh","en"]){
    const rel=(locale==="en"?"en/":"")+"fortune/bazi/"+name+"/";
    const html=fs.readFileSync(path.join(temp,rel,"index.html"),"utf8");
    assert.ok(html.includes('src="/fortune/bazi/assets/'+name+'.svg"'),"distinct topic illustration "+rel);
    // Social networks do not consistently accept SVG OG images; retain the approved WebP cover.
    assert.ok(html.includes('og:image" content="https://koolo.app/fortune/modes/fortune-bazi-cover.webp"'),"OG WebP "+rel);
   }
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
