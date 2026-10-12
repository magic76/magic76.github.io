const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const ROOT=path.resolve(__dirname,"..");
const ORIGIN="https://www.3sssi.com";
const slugs=["","teacher","story","fortune","research"];
const read=p=>fs.readFileSync(path.join(ROOT,p),"utf8");

test("SEO pages match committed generator output",()=>{
  execFileSync(process.execPath,["scripts/generate-seo.mjs","--check"],{cwd:ROOT,stdio:"pipe"});
});

test("all public pages are independently rendered and indexable",()=>{
  for(const slug of slugs){
    const file=slug?slug+"/index.html":"index.html";
    const html=read(file),url=ORIGIN+"/"+(slug?slug+"/":"");
    assert.match(html,/<html lang="zh-Hant">/);
    assert.match(html,/<h1>[^<]+<\/h1>/);
    assert.match(html,/<meta name="description" content="[^"]+">/);
    assert.ok(html.includes('<link rel="canonical" href="'+url+'">'));
    assert.ok(html.includes('<meta property="og:url" content="'+url+'">'));
    assert.ok(html.includes('<meta name="robots" content="index,follow">'));
    assert.ok(html.includes('href="/crew-app/#/'));
    assert.ok(!html.includes("location.replace("));
  }
});

test("crawler can discover all public canonical URLs from sitemap",()=>{
  const sitemap=read("sitemap.xml");
  const entries=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
  assert.deepEqual(entries,slugs.map(slug=>ORIGIN+"/"+(slug?slug+"/":"")));
  assert.match(read("robots.txt"),/Sitemap: https:\/\/www\.3sssi\.com\/sitemap\.xml/);
  assert.doesNotMatch(read("robots.txt"),/Disallow:\s*\/crew-app/);
});

test("app shell is not an SEO duplicate and remains mounted",()=>{
  for(const path of ["web-spa/index.html","crew-app/index.html"]){
    const html=read(path);
    assert.match(html,/<meta name="robots" content="noindex,follow"\s*\/>/);
    assert.ok(html.includes('<div id="root"></div>'));
  }
});
