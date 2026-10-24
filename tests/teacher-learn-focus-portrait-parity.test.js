const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Learn resume card uses the same TeacherAvatar as teacher picker and live",()=>{
 const focus=read("web-spa/src/teacher/LearningFocusCard.tsx");
 const avatar=read("web-spa/src/teacher/TeacherAvatar.tsx");
 const css=read("web-spa/src/pages/crewSections.css");
 assert.match(focus,/import \{TeacherAvatar\} from "\.\/TeacherAvatar";/);
 assert.match(focus,/<TeacherAvatar profile=\{teacher\} decorative\/>/);
 assert.doesNotMatch(focus,/<img src=\{teacher\.avatar\}/);
 // Legacy Emma/Alex/James/Mia must render from the approved HQ portrait sprite.
 for(const id of ["emma","alex","james","mia"])assert.match(avatar,new RegExp(id+':"\\d+%"'));
 assert.match(avatar,/hq!==undefined\?portraitSprite:profile\.avatar/);
 assert.match(css,/\.crew-section-focus-card-portrait \.teacher-avatar-image\{[^}]*width:100%;height:100%/);
});

test("Learn focus teacher portrait preserves the HQ sprite's square aspect ratio",()=>{
 const css=read("web-spa/src/pages/crewSections.css");
 const rule=css.match(/\.crew-section-focus-card-portrait\{([^}]*)\}/)?.[1];
 assert.ok(rule,"Learn focus portrait style must be present");
 assert.match(rule,/aspect-ratio:\s*1\s*\/\s*1(?:;|$)/);
 assert.doesNotMatch(rule,/aspect-ratio:\s*3\s*\/\s*4/);
});
