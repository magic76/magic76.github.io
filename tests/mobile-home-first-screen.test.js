const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {resolve}=require("node:path");
const read=path=>readFileSync(resolve(__dirname,"..",path),"utf8");

test("mobile first screen prioritizes eight shortcuts before today's fortune",()=>{
 const page=read("web-spa/src/pages/MobileHomePage.tsx");
 const carousel=page.indexOf('className="cmh-carousel"');
 const apps=page.indexOf('<section className="cmh-apps"');
 const fortune=page.indexOf('<DailyTopicCards variant="mobile"/>');
 const shorts=page.indexOf('<div className="cmh-shorts">');
 assert.ok(carousel>=0&&carousel<apps&&apps<fortune&&fortune<shorts,
  "Zoe carousel → 8 apps → daily fortune → Moments");
 const items=page.slice(page.indexOf("const APPS:"),page.indexOf("/** Mobile-only"));
 assert.equal((items.match(/\{id:"/g)||[]).length,8);
 assert.match(page,/className="cmh-app-grid">\{APPS.map/);
});

test("compact phone hero and 4x2 touch-safe app grid preserve navigation",()=>{
 const base=read("web-spa/src/pages/mobileHome.css");
 const hero=read("web-spa/src/pages/mobileHomeHeroV3.css");
 assert.match(base,/\.cmh-app-grid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(base,/\.cmh-app\{min-height:76px;gap:4px;padding:6px 3px\}/);
 assert.match(base,/\.cmh-app-icon\{width:35px;height:35px/);
 assert.match(hero,/\.cmh-slide\{height:210px;min-height:210px/);
 assert.match(hero,/@media\(max-width:380px\)\{\s*\.cmh-slide\{height:208px;min-height:208px/);
 assert.match(hero,/\.cmh-resume-preview-row\{bottom:59px\}/);
 assert.match(hero,/\.cmh-zoe-actions a\{min-height:44px/);
 assert.match(hero,/\.cmh-preview-eye\{[^}]*min-height:44px/);
});
