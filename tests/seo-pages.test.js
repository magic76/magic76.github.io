const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const ROOT=path.resolve(__dirname,"..");
const ORIGIN="https://www.3sssi.com";
const slugs=["","teacher","story","fortune","research"];
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
    assert.match(html,/<meta property="og:image" content="https:\/\/www\.3sssi\.com\/social\/[a-z]+\.png">/);
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
  const games=["games","games/friend-gomoku","games/connect4","games/twenty-questions","games/reversi","games/mystery","games/1a2b","games/taboo"];
  const xml=read("sitemap.xml");
  const actual=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  assert.deepEqual(actual,[...slugs,...games].flatMap(slug=>[url(slug,"zh"),url(slug,"en")]));
  assert.equal((xml.match(/hreflang="x-default"/g)||[]).length,(slugs.length+games.length)*2);
  assert.match(xml,/xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  assert.match(read("robots.txt"),/Sitemap: https:\/\/www\.3sssi\.com\/sitemap\.xml/);
});
test("referenced social image assets exist and are PNG files",()=>{
  for(const name of ["crew","teacher","story","fortune","research"]){
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
