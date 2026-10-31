const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Crew home keeps icon-based entry points without duplicating product portraits",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 assert.doesNotMatch(home,/crew-home-product-grid|TeacherAvatar/);
 assert.match(home,/<Icon name="teacher"\/>/);
 assert.match(home,/<Icon name="fortune"\/>/);
 assert.match(home,/<Icon name="play"\/>/);
 assert.match(portal,/icon:"teacher"/);
 assert.match(home,/to="\/fortune"/);
 assert.match(home,/to="\/timeline"/);
});
