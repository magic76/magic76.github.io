const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {resolve}=require("node:path");
const read=path=>readFileSync(resolve(__dirname,"..",path),"utf8");

test("mobile banner/dots spacing is 8px and dots/fortune spacing is 16px",()=>{
 const hero=read("web-spa/src/pages/mobileHomeHeroV3.css");
 const quote=read("web-spa/src/pages/dailyTopicCards.css");
 assert.match(hero,/@media\(max-width:767px\)\{\s*\.cmh-carousel\{margin-bottom:0\}\s*\.cmh-carousel-dots\{margin-top:8px\}/);
 assert.match(quote,/@media\(max-width:767px\)\{\s*\.daily-quote--mobile\{margin-top:16px\}/);
 assert.match(hero,/\.cmh-carousel-dots button\{min-height:44px/);
});

test("guest allowance still appears but no longer breaks the dots-to-fortune gap",()=>{
 const page=read("web-spa/src/pages/MobileHomePage.tsx");
 const dots=page.indexOf('className="cmh-carousel-dots"');
 const fortune=page.indexOf('<DailyTopicCards variant="mobile"/>');
 const apps=page.indexOf('<section className="cmh-apps"');
 const allowance=page.indexOf('className="cmh-allowance-slot"');
 assert.ok(dots>=0&&dots<fortune&&fortune<apps&&apps<allowance);
 assert.match(page,/\{!hasKey&&<div className="cmh-allowance-slot">/);
 assert.match(page,/ready&&!hasKey&&<p className="cmh-free-allowance" role="status"/);
});
