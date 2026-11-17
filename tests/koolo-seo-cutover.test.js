const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const canonical="https://koolo.app";
const publicPages=["index.html","en/index.html","teacher/index.html","en/teacher/index.html","story/index.html","en/story/index.html","fortune/index.html","en/fortune/index.html","research/index.html","en/research/index.html","games/index.html","en/games/index.html"];
test("canonical origin migrates across SEO source and checked-in public SSG",()=>{
 for(const file of ["scripts/generate-seo.mjs","scripts/prepare-cloudflare.mjs","scripts/research-seo.mjs","scripts/social-og.mjs","scripts/check-live-seo.mjs","sitemap.xml","robots.txt",...publicPages]){
  assert.ok(!read(file).includes("https://www.3sssi.com"),"Old SEO origin remains in "+file);
 }
 for(const file of publicPages){
  const html=read(file),rel=file.replace(/index\.html$/,""),target=canonical+"/"+rel;
  assert.ok(html.includes('<link rel="canonical" href="'+target+'">'),file+" canonical");
  assert.ok(html.includes('<meta property="og:url" content="'+target+'">'),file+" OG");
  assert.ok(html.includes('hreflang="x-default" href="'+canonical+'/'),file+" alternates");
 }
 assert.ok(read("robots.txt").includes("Sitemap: "+canonical+"/sitemap.xml"));
 assert.ok(!read("sitemap.xml").includes("https://www.3sssi.com"));
});
test("private app and previews remain noindex; changing SEO never changes login routes",()=>{
 for(const file of ["web-spa/index.html","crew-app/index.html"]){
  assert.ok(read(file).includes('name="robots" content="noindex,follow"'),file);
 }
 assert.ok(read("server/crew-auth.mjs").includes("https://www.3sssi.com"),"Legacy OAuth origin must stay supported");
});
