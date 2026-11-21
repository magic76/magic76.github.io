const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const ROOT=path.resolve(__dirname,"..");
const ORIGIN="https://koolo.app";
const slugs=["","teacher","story","fortune","research"];
const courses=["travel","business","daily","teamwork","tickets","services"].map(slug=>"teacher/course/"+slug);
const read=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const url=(slug,lang)=>ORIGIN+"/"+(lang==="en"?"en/":"")+(slug?slug+"/":"");

test("landing pages match deterministic SEO generator",()=>{
  execFileSync(process.execPath,["scripts/generate-seo.mjs","--check"],{cwd:ROOT,stdio:"pipe"});
});
test("each locale has crawlable content with its own canonical and reciprocal hreflang",()=>{
  for(const slug of slugs){for(const lang of ["zh","en"]){
    const file=(lang==="en"?"en/":"")+(slug?slug+"/":"")+"index.html";
    const html=read(file);
    const location=url(slug,lang);
    assert.ok(html.includes('<html lang="'+(lang==="en"?"en":"zh-Hant")+'">'));
    assert.match(html,/<h1>[^<]+<\/h1>/);
    assert.match(html,/<meta name="description" content="[^"]+">/);
    assert.ok(html.includes('<link rel="canonical" href="'+location+'">'));
    assert.ok(html.includes('<meta property="og:url" content="'+location+'">'));
    for(const [code,alt] of [["zh-Hant","zh"],["en","en"],["x-default","zh"]]){
      assert.ok(html.includes('<link rel="alternate" hreflang="'+code+'" href="'+url(slug,alt)+'">'));
    }
    assert.ok(html.includes('href="/crew-app/#/'));
    assert.ok(html.includes('<meta name="robots" content="index,follow">'));
    const expectedImage=slug?ORIGIN+"/social/og/"+slug+"-koolo-v1.png":ORIGIN+"/social/koolo-shared-v1.png";
    for(const tag of ['<meta property="og:image"','<meta property="og:image:secure_url"','<meta name="twitter:image"']){
      assert.ok(html.includes(tag+' content="'+expectedImage+'">'),file+" missing "+tag);
    }
    assert.match(html,/<meta name="twitter:card" content="summary_large_image">/);
    assert.match(html,/<script type="application\/ld\+json">/);
    const structured=JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
    assert.equal(structured["@context"],"https://schema.org");
    assert.ok(structured["@graph"].find(item=>item["@type"]==="WebSite"));
    assert.ok(structured["@graph"].find(item=>item["@type"]==="WebPage"||item["@type"]==="CollectionPage"));
    if(slug)assert.ok(structured["@graph"].find(item=>item["@type"]==="BreadcrumbList"));
    if(["teacher","story","fortune"].includes(slug))assert.ok(structured["@graph"].find(item=>item["@type"]==="SoftwareApplication"));
    if(lang==="en"){
      assert.ok(html.includes('<a lang="zh-Hant" href="'+url(slug,"zh")+'">'));
      assert.doesNotMatch(html,/常見問題|準備好開始了嗎|從想法到實際體驗/);
    }
  }}
});
test("sitemap enumerates public and game URLs with matching language alternates",()=>{
  const games=["games","games/friend-gomoku","games/connect4","games/twenty-questions","games/reversi","games/mystery","games/1a2b","games/number-bomb","games/memory","games/crazy-court","games/werewolf","games/truth-news","games/nonsense","games/taboo"];
  const xml=read("sitemap.xml");
  const actual=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  assert.deepEqual(actual,[...slugs,...games,...courses].flatMap(slug=>[url(slug,"zh"),url(slug,"en")]));
  assert.equal((xml.match(/hreflang="x-default"/g)||[]).length,(slugs.length+games.length+courses.length)*2);
  const dates=[...xml.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g)];
  assert.equal(dates.length,actual.length,"every indexable URL has lastmod");
  assert.ok(!actual.some(link=>link.endsWith("/games/gomoku/")),"redirect alias must not be indexed");
  assert.match(xml,/xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  assert.match(read("robots.txt"),/Sitemap: https:\/\/koolo\.app\/sitemap\.xml/);
});
test("referenced social image assets exist and are PNG files",()=>{
  for(const name of ["crew","teacher","story","fortune","research","crew-shared-v2"]){
    const png=fs.readFileSync(path.join(ROOT,"social",name+".png"));
    assert.deepEqual(Array.from(png.subarray(0,8)),[137,80,78,71,13,10,26,10]);
    assert.equal(png.readUInt32BE(16),1200);
    assert.equal(png.readUInt32BE(20),630);
  }
});
test("SPA remains noindex and continues to serve its React app",()=>{
  for(const name of ["web-spa/index.html","crew-app/index.html"]){
    const html=read(name);
    assert.match(html,/<meta name="robots" content="noindex,follow"\s*\/>/);
    assert.ok(html.includes('<div id="root"></div>'));
  }
});

test("client course titles stay exactly aligned with SSG course SEO titles",async()=>{
 const {COURSE_SEO}=await import("../scripts/course-seo.mjs");
 const client=read("web-spa/src/teacher/courseSeoTitles.ts");
 assert.equal(COURSE_SEO.length,6);
 for(const item of COURSE_SEO){
  assert.ok(client.includes(JSON.stringify(item.slug)+":{zh:"),item.slug);
  assert.ok(client.includes(JSON.stringify(item.zh.title)),item.slug+" zh");
  assert.ok(client.includes(JSON.stringify(item.en.title)),item.slug+" en");
 }
});

test("OG PNG renderer creates deterministic, distinct full-size imagery without external dependencies",async()=>{
 const {writePreview,previewUrl}=await import("../scripts/social-og.mjs");
 const os=require("node:os");
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"koolo-og-"));
 try{
  const urlA=writePreview(tmp,"course","travel"),urlB=writePreview(tmp,"course","business");
  const pngA=fs.readFileSync(path.join(tmp,new URL(urlA).pathname.slice(1)));
  const pngB=fs.readFileSync(path.join(tmp,new URL(urlB).pathname.slice(1)));
  for(const png of [pngA,pngB]){
   assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
   assert.equal(png.readUInt32BE(16),1200);
   assert.equal(png.readUInt32BE(20),630);
   assert.ok(png.length>4000,"must have real nonempty visual content");
  }
  assert.notDeepEqual(pngA,pngB,"different topics must not share a preview image");
  assert.equal(previewUrl("home"),ORIGIN+"/social/koolo-shared-v1.png");
  assert.equal(previewUrl("feature","teacher"),ORIGIN+"/social/og/teacher-koolo-v1.png");
  assert.throws(()=>writePreview(tmp,"feature","teacher"),/curated/i);
  assert.equal(previewUrl("course","travel","en"),ORIGIN+"/social/og/course/travel-en.png");
  assert.equal(previewUrl("guide","ai-english-speaking","zh"),ORIGIN+"/social/og/guide/ai-english-speaking-zh.png");
  assert.throws(()=>previewUrl("article","../../secrets"));
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});


test("five curated Koolo Q-style OG images are real, distinct 1200x630 PNGs",()=>{
 const crypto=require("node:crypto");
 const sums=new Set();
 for(const slug of ["teacher","story","fortune","research","games"]){
  const file=path.join(ROOT,"social","og",slug+"-koolo-v1.png");
  const image=fs.readFileSync(file);
  assert.deepEqual([...image.subarray(0,8)],[137,80,78,71,13,10,26,10],slug);
  assert.equal(image.readUInt32BE(16),1200,slug);
  assert.equal(image.readUInt32BE(20),630,slug);
  assert.ok(image.length>30000,"OG image must not be a placeholder: "+slug);
  const hash=crypto.createHash("sha256").update(image).digest("hex");
  assert.ok(!sums.has(hash),"image reused for another feature: "+slug);
  sums.add(hash);
 }
});

test("Koolo social previews are versioned, size-bounded and referenced by both localized pages",async()=>{
 const {previewUrl}=await import("../scripts/social-og.mjs");
 for(const slug of ["","teacher","story","games","fortune","research"]){
  const asset=previewUrl(slug?"feature":"home",slug||undefined);
  assert.match(asset,/^https:\/\/koolo\.app\/social\//);
  const png=fs.readFileSync(path.join(ROOT,new URL(asset).pathname.slice(1)));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),1200);
  assert.equal(png.readUInt32BE(20),630);
  assert.ok(png.length<(slug?400000:1100000),asset+" exceeds the share-image budget");
  for(const locale of ["","en/"]){
   const html=read(locale+(slug?slug+"/":"")+"index.html");
   const metas=[...html.matchAll(/<meta\s+[^>]+>/g)].map(m=>m[0]);
   for(const key of ["og:image","og:image:secure_url","twitter:image"]){
    const tag=metas.find(m=>m.includes('="'+key+'"'));
    assert.ok(tag,locale+slug+" missing "+key);
    const content=tag.match(/\bcontent="([^"]+)"/)?.[1];
    assert.equal(content,asset,locale+slug+" "+key);
   }
  }
 }
});
