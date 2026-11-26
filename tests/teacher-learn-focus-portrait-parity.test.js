const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Selected Teacher card keeps the approved avatar while the learning focus avoids a duplicate portrait",()=>{
 const card=read("web-spa/src/teacher/CurrentTeacherCard.tsx");
 const focus=read("web-spa/src/teacher/LearningFocusCard.tsx");
 const hub=read("web-spa/src/pages/CrewSectionPage.tsx");
 const avatar=read("web-spa/src/teacher/TeacherAvatar.tsx");
 assert.match(card,/import \{TeacherAvatar\} from "\.\/TeacherAvatar";/);
 assert.match(card,/<TeacherAvatar profile=\{teacher\} decorative\/>/);
 assert.match(hub,/<CurrentTeacherCard\/>/);
 assert.match(hub,/<LearningFocusCard\/>/);
 assert.doesNotMatch(focus,/<TeacherAvatar|<img src=\{teacher\.avatar\}/);
 for(const id of ["emma","alex","james","mia"])assert.match(avatar,new RegExp(id+':"\\d+%"'));
 assert.match(avatar,/hq!==undefined\?portraitSprite:profile\.avatar/);
});

test("Selected Teacher portrait keeps the approved square high-resolution crop",()=>{
 const css=read("web-spa/src/pages/crewSections.css");
 const portraits=[...css.matchAll(/\.crew-learn-teacher-portrait\{([^}]+)\}/g)];
 assert.ok(portraits.length>0);
 for(const [,rule] of portraits){
  const width=rule.match(/(?:^|;)width:(\d+)px/);
  assert.ok(width,rule);
  assert.match(rule,new RegExp("height:"+width[1]+"px(?:;|$)"));
 }
 assert.match(css,/\.crew-learn-teacher-portrait \.teacher-avatar-image\{[^}]*width:100%;height:100%/);
});
