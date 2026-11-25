const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {resolve}=require("node:path");
const read=path=>readFileSync(resolve(__dirname,"..",path),"utf8");

test("mobile first screen prioritizes daily fortune and six shortcuts",()=>{
 const page=read("web-spa/src/pages/MobileHomePage.tsx");
 const carousel=page.indexOf('className="cmh-carousel"');
 const apps=page.indexOf('<section className="cmh-apps"');
 const fortune=page.indexOf('<DailyTopicCards variant="mobile"/>');
 const shorts=page.indexOf('<div className="cmh-shorts">');
 assert.ok(carousel>=0&&carousel<fortune&&fortune<apps&&apps<shorts,
  "Zoe carousel → daily fortune → 6 apps → Moments");
 const items=page.slice(page.indexOf("const APPS:"),page.indexOf("/** Mobile-only"));
 assert.equal((items.match(/\{id:"/g)||[]).length,6);
 assert.match(page,/className="cmh-app-grid">\{APPS.map/);
});

test("compact phone hero and 3x2 touch-safe app grid preserve navigation",()=>{
 const base=read("web-spa/src/pages/mobileHome.css");
 const hero=read("web-spa/src/pages/mobileHomeHeroV3.css");
 assert.match(base,/\.cmh-app-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(base,/\.cmh-app\{min-height:76px;gap:4px;padding:6px 3px\}/);
 assert.match(base,/\.cmh-app-icon\{width:35px;height:35px/);
 assert.match(hero,/\.cmh-slide\{height:180px;min-height:180px/);
 assert.match(hero,/@media\(max-width:380px\)\{\s*\.cmh-slide\{height:176px;min-height:176px/);
 assert.doesNotMatch(hero,/\.cmh-resume-preview-row\{/);
 assert.match(hero,/\.cmh-zoe-actions a\{min-height:44px/);
 assert.doesNotMatch(read("web-spa/src/pages/MobileHomePage.tsx"),/cmh-preview-eye|cmh-resume-preview-row/);
});
