const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");

test("Fortune explainer links keep their SEO destinations without orphan arrows",()=>{
 const home=read("web-spa/src/fortune/HomePage.tsx");
 const css=read("web-spa/src/fortune/unifiedHome.css");
 assert.match(home,/className="fortune-journey-guides"/);
 for(const [route,mode] of [["bazi","bazi"],["numerology","tarot"]]){
  assert.ok(home.includes('<a href="/fortune/'+route+'/"><span>{t("home.'+mode+'")} · {t("home.'+mode+'Desc")}</span><Arrow className="crew-arrow--plain"/></a>'));
 }
 assert.doesNotMatch(home,/<a className="text-button" href="\/fortune\/(?:bazi|numerology)\//);
 assert.match(css,/\.fortune-journey-guides>a\{[\s\S]*?display:flex;align-items:center;gap:12px;min-width:0;min-height:44px/);
 assert.match(css,/\.fortune-journey-guides>a>span:first-child\{min-width:0;overflow-wrap:anywhere\}/);
 assert.match(css,/\.fortune-journey-guides \.crew-arrow\{margin-left:auto\}/);
 assert.match(css,/@media\(max-width:600px\)\{\.fortune-journey-guides\{grid-template-columns:minmax\(0,1fr\)\}\}/);
});

test("Fortune home removes duplicate continuation card while retaining history navigation",()=>{
 const home=read("web-spa/src/fortune/HomePage.tsx");
 const css=read("web-spa/src/fortune/unifiedHome.css");
 assert.doesNotMatch(home,/fortune-journey-primary|fortune-journey-latest|fortune-journey-actions|landing\.continue/);
 assert.doesNotMatch(css,/fortune-journey-primary|fortune-journey-latest|fortune-journey-actions/);
 assert.match(home,/className="fortune-history-row" to=\{readingUrl\(x.id\)\}/);
 assert.match(home,/to="\/fortune\/history"/);
});

test("Fortune arrow fixes are local and require no new translated labels",()=>{
 const home=read("web-spa/src/fortune/HomePage.tsx");
 const css=read("web-spa/src/fortune/unifiedHome.css");
 assert.ok(Buffer.byteLength(home)<26000);
 assert.match(css,/\.fortune-journey-guides>a\{[^}]*color:var\(--text\);font-size:13px/);
 assert.match(css,/\.fortune-journey-home a:focus-visible/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
