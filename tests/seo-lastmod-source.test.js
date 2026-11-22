const {test}=require("node:test");
const assert=require("node:assert/strict");

test("SEO source dates remain available for BaZi and numerology sitemap routes",async()=>{
 const {seoLastmod}=await import("../scripts/seo-lastmod.mjs");
 for(const slug of ["fortune/bazi","fortune/bazi/jia-wood","fortune/numerology","fortune/numerology/1"]){
  const lastmod=seoLastmod(slug);
  assert.match(lastmod,/^\d{4}-\d{2}-\d{2}$/,"lastmod date: "+slug);
 }
 assert.equal(seoLastmod("fortune/numerology"),seoLastmod("fortune/numerology/1"));
 assert.throws(()=>seoLastmod("fortune/unknown-seo-topic"),/Missing lastmod source mapping/);
});
