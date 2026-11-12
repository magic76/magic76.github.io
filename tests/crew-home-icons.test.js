const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Crew home keeps icon-based entry points without duplicating product portraits",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 assert.doesNotMatch(home,/crew-home-product-grid|TeacherAvatar/);
 assert.match(home,/<Icon name="teacher"\/>/);
 assert.match(home,/to="\/teacher\/course\/travel"/);
 assert.match(home,/<Icon name="play"\/>/);
 const rail=read("web-spa/src/pages/HomeModeRail.tsx");
 assert.match(rail,/to:"\/teacher\/live\?lesson=daily_u1_l1"/);
 assert.match(rail,/to:"\/fortune\/reading\?mode=tarot"/);
 for(const icon of ["chat","teacher","fortune","play"])assert.ok(rail.includes('icon:"'+icon+'"'),icon);
 assert.match(rail,/<Icon name=\{item.icon\}/);
 assert.match(home,/to="\/fortune"/);
 assert.match(home,/to="\/timeline"/);
});
