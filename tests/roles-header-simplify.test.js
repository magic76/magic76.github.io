import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
test("canonical Learn and Chat use normal chrome without retired role landing exception",()=>{
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 assert.doesNotMatch(chrome,/rolesLanding|\/teacher\/roles/);
 assert.match(chrome,/<span className="app-title">/);
 assert.match(chrome,/<LanguageSwitcher\/>/);
 assert.match(chrome,/koolo-wordmark-koo-v2\.svg/);
});
test("retired role page and tabs are absent, while the friend directory remains available",()=>{
 const app=read("web-spa/src/App.tsx"),friends=read("web-spa/src/friends/FriendsPage.tsx"),tutor=read("web-spa/src/teacher/TutorPage.tsx");
 assert.equal(existsSync("web-spa/src/teacher/RolesPage.tsx"),false);
 assert.doesNotMatch(app,/RolesPage|crew-role-switcher/);
 assert.doesNotMatch(friends,/<span className="kicker">\{t\("kicker"\)\}<\/span>/);
 assert.doesNotMatch(tutor,/CREW TEACHER/);
 assert.match(friends,/t\("all"\)/);
 assert.match(app,/return directory\?<FriendsPage\/>:<CrewSectionPage section="chat"\/>/);
 for(const page of [friends,tutor])assert.ok(Buffer.byteLength(page)<26000);
});
