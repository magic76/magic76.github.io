const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Crew home uses only product icons, never teacher character portraits",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const teacher=home.match(/<Link className="crew-home-product crew-home-teacher"[\s\S]*?<\/Link>/)?.[0];
 assert.ok(teacher,"Teacher product entry exists");
 assert.ok(teacher.includes('<Icon name="teacher"/>'),"Teacher gateway uses the line icon");
 assert.ok(!teacher.includes("<img")&&!teacher.includes("TeacherAvatar"),"Teacher product gateway must never show a portrait");
 assert.ok(!home.includes("TeacherAvatar"),"The homepage uses icons even for recent Teacher history");
 for(const name of ["story","fortune"]){
  const entry=home.match(new RegExp('<Link className="crew-home-product crew-home-'+name+'"[\\s\\S]*?<\\/Link>'))?.[0];
  assert.ok(entry?.includes('<Icon name="'+name+'"/>'),name+" retains its product icon");
 }
});
