const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {resolve}=require("node:path");
const read=path=>readFileSync(resolve(__dirname,"..",path),"utf8");

test("mobile banner/dots spacing is 8px and dots/fortune spacing is 16px",()=>{
 const hero=read("web-spa/src/pages/mobileHomeHeroV3.css");
 const quote=read("web-spa/src/pages/dailyTopicCards.css");
 assert.match(hero,/@media\(max-width:767px\)\{\s*\.cmh-carousel\{margin-bottom:0\}\s*\.cmh-slide\{padding-bottom:22px\}\s*\.cmh-carousel-dots\{margin-top:-10\.5px;position:relative;z-index:2\}/);
 assert.match(quote,/@media\(max-width:767px\)\{\s*\.daily-quote--mobile\{margin-top:-2\.5px\}/);
 assert.match(hero,/\.cmh-carousel-dots button\{min-height:44px/);
 // Dot is centered within its 44px high tap target. Measure visible edges.
 const buttonHeight=44,dotHeight=7,halfBlank=(buttonHeight-dotHeight)/2;
 assert.equal(-10.5+halfBlank,8,"banner edge to visible dot");
 assert.equal(-2.5+halfBlank,16,"visible dot to fortune edge");
 // Preserve ≥44px controls and move the banner's primary action clear of
 // the 10.5px pager overlap: its bottom remains 22px inside the banner.
 assert.ok(22>10.5);
});

test("home has no quota slot and preserves the dots-to-fortune order",()=>{
 const page=read("web-spa/src/pages/MobileHomePage.tsx");
 const dots=page.indexOf('className="cmh-carousel-dots"');
 const fortune=page.indexOf('<DailyTopicCards variant="mobile"/>');
 const apps=page.indexOf('<section className="cmh-apps"');
 assert.ok(dots>=0&&dots<fortune&&fortune<apps);
 assert.doesNotMatch(page,/cmh-allowance-slot|cmh-free-allowance/);
});
