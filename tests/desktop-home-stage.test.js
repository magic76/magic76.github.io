const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {resolve}=require("node:path");
const read=path=>readFileSync(resolve(path),"utf8");

test("desktop-only home CSS respects 768px boundary and shared frame",()=>{
 const style=read("web-spa/src/pages/homeDesktopLayout.css");
 const home=read("web-spa/src/pages/HomePage.tsx");
 assert.match(home,/import "\.\/homeDesktopLayout\.css";/);
 assert.match(style,/@media \(min-width:768px\)/);
 assert.match(style,/@media \(min-width:1100px\)/);
 assert.doesNotMatch(style,/@media\s*\(max-width:/);
 assert.match(style,/--crew-desktop-home-frame:min\(1540px,calc\(100vw - 188px\)\)/);
 assert.match(style,/\.crew-home-legacy \.crew-home \.crew-home-world,\s*\.crew-home-legacy \.crew-home-content/);
 assert.match(style,/\.crew-home-legacy \.crew-home-portal\{\s*min-height:clamp\(474px,57svh,560px\)/);
 assert.match(style,/\.crew-home-legacy \.crew-portal-kicker\{[\s\S]*?left:calc\(var\(--crew-desktop-home-frame\)/);
 assert.match(style,/body:has\(\.crew-home-legacy\) \.global-nav/);
 assert.match(style,/body:has\(\.crew-home-legacy\) \.crew-home-live-bubble/);
 for(const unchanged of ["web-spa/src/pages/MobileHomePage.tsx","web-spa/src/components/mobileNavigation.css"]){
  const code=read(unchanged);
  assert.ok(code.length>1000,"mobile source is retained: "+unchanged);
 }
});
