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
 assert.match(tutor,/className="teacher-avatar-button teacher-home-avatar"/);
 assert.match(tutor,/<TeacherAvatar profile=\{profile\}/);
 for(const id of ["emma","alex","james","mia","sophie","lina"]){
  assert.match(profiles,new RegExp("teacher-"+id+"\\.webp"));
  assert.ok(fs.existsSync(path.join(root,"assets/teacher/teacher-"+id+".webp")));
 }
});

test("teacher picker close button stays circular and touch-sized in the flex header",()=>{
 const css=read("web-spa/src/styles.css");
 const rule=css.match(/\.teacher-picker-close\{([^}]+)\}/)?.[1];
 assert.ok(rule);
 for(const declaration of ["box-sizing:border-box","flex:0 0 44px","width:44px","height:44px","min-width:44px","min-height:44px","padding:0","display:grid","place-items:center","border-radius:50%"]){
  assert.ok(rule.split(";").includes(declaration),declaration);
 }
});

test("teacher gallery uses the header close button without a duplicate footer action",()=>{
 const picker=read("web-spa/src/teacher/TeacherProfilePicker.tsx");
 const footer=picker.match(/<div className="teacher-gallery-footer">([\s\S]*?)<\/div>/)?.[1];
 assert.ok(footer);
 assert.match(footer,/picker\.footer/);
 assert.doesNotMatch(footer,/<button/);
 assert.match(picker,/<button ref=\{closeButton\}[^>]*className="teacher-picker-close"/);
 assert.equal((picker.match(/t\("picker\.close"\)/g)||[]).length,1);
 assert.match(picker,/event\.key==="Escape"/);
});
