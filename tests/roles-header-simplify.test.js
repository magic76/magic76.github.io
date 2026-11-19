import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
test("only roles landing hides teacher chrome labels, preserving other teacher pages",()=>{
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 assert.match(chrome,/rolesLanding=location\.pathname==="\/teacher\/roles"\|\|location\.pathname==="\/teacher\/roles\/"/);
 assert.match(chrome,/\{!rolesLanding&&<span className="app-title">/);
 assert.match(chrome,/!rolesLanding&&productName/);
 assert.match(chrome,/<LanguageSwitcher\/>/);
 assert.match(chrome,/koolo-wordmark-koo-v2\.svg/);
});
test("roles keep titles and role controls but remove duplicated kickers",()=>{
 const friends=read("web-spa/src/friends/FriendsPage.tsx");
 const tutor=read("web-spa/src/teacher/TutorPage.tsx");
 const roles=read("web-spa/src/teacher/RolesPage.tsx");
 const css=read("web-spa/src/teacher/parity.css");
 assert.doesNotMatch(friends,/<span className="kicker">\{t\("kicker"\)\}<\/span>/);
 assert.doesNotMatch(tutor,/CREW TEACHER/);
 assert.match(friends,/t\("title"\)/);
 assert.match(tutor,/t\("tutor\.title"\)/);
 assert.match(tutor,/t\("tutor\.intro"\)/);
 assert.match(roles,/crew_teacher_last_role_v1/);
 assert.match(roles,/practice\.teacher/);
 assert.match(roles,/practice\.friend/);
 assert.match(css,/crew-role-switcher button\{[^\n]*min-height:44px/);
 assert.match(css,/margin:3px 0 8px/);
 for(const page of [friends,tutor])assert.ok(Buffer.byteLength(page)<26000);
});
