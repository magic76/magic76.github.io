const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("teacher picker mounts at viewport root, not animated page container",()=>{
 const picker=read("web-spa/src/teacher/TeacherProfilePicker.tsx");
 const css=read("web-spa/src/styles.css");
 assert.match(picker,/import\{createPortal\}from"react-dom"/);
 assert.match(picker,/document\.body\)/);
 assert.match(picker,/document\.body\.style\.overflow="hidden"/);
 assert.match(picker,/event\.key==="Escape"/);
 assert.match(css,/\.teacher-picker-backdrop\{position:fixed;inset:0;[^}]*align-items:center/);
 assert.doesNotMatch(css,/\.teacher-picker-backdrop\{[^}]*align-items:flex-end/);
 assert.match(css,/\.teacher-picker\{[^}]*max-height:min\(82dvh,760px\);overflow-y:auto/);
});

test("all tutor avatar slots use Vite-bundled profile assets",()=>{
 const avatar=read("web-spa/src/teacher/TeacherAvatar.tsx");
 const profiles=read("web-spa/src/teacher/teacherProfiles.ts");
 const tutor=read("web-spa/src/teacher/TutorPage.tsx");
 assert.match(avatar,/import portraitSprite from/);
 assert.match(avatar,/hq!==undefined\?portraitSprite:profile\.avatar/);
 assert.doesNotMatch(avatar,/url\("\/assets\/teacher/);
 assert.match(avatar,/aria-label=\{decorative\?undefined:profile\.name\}/);
 const css=read("web-spa/src/styles.css");
 assert.match(css,/\.teacher-avatar-image\{display:block;width:100%;height:100%/);
 assert.match(tutor,/className="avatar"><TeacherAvatar profile=\{profile\}/);
 for(const id of ["emma","alex","james","mia","sophie","lina"]){
  assert.match(profiles,new RegExp("teacher-"+id+"\\.webp"));
  assert.ok(fs.existsSync(path.join(root,"assets/teacher/teacher-"+id+".webp")));
 }
});
