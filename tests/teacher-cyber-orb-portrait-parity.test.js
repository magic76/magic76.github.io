const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Teacher selection, detail, live session and Cyber Orb use one photographic portrait renderer",()=>{
 const avatar=read("web-spa/src/teacher/TeacherAvatar.tsx");
 const picker=read("web-spa/src/teacher/TeacherProfilePicker.tsx");
 const live=read("web-spa/src/teacher/LivePage.tsx");
 const orb=read("web-spa/src/pages/CyberOrbPanel.tsx");
 const css=read("web-spa/src/pages/cyberOrb.css");

 // Emma, Alex, James and Mia must not fall back to their old, low-resolution thumbnails.
 for(const id of ["emma","alex","james","mia"]){
  assert.match(avatar,new RegExp(id+':"\\d+%"'));
 }
 assert.match(avatar,/hq!==undefined\?portraitSprite:profile\.avatar/);
 assert.match(picker,/<TeacherAvatar profile=\{profile\} className="teacher-profile-image"\/>/);
 assert.match(picker,/<TeacherAvatar profile=\{detail\}\/>/);
 assert.match(live,/<TeacherAvatar profile=\{profile\}\/>/);

 // Native Orb should keep the same photo as the Web teacher selection and live page.
 assert.match(orb,/import \{TeacherAvatar\} from "\.\.\/teacher\/TeacherAvatar";/);
 assert.match(orb,/"recommendedVoice" in profile\s*\?<TeacherAvatar profile=\{profile\} className="crew-orb-role-avatar" decorative\/>/);
 assert.match(orb,/:<img src=\{profile\.avatar\} alt="" loading="lazy"\/>/); // Friends retain their own photos.
 assert.match(css,/\.crew-orb-role \.crew-orb-role-avatar\{[^}]*aspect-ratio:1/);
});
