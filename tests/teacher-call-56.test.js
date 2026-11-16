import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const page=read("web-spa/src/teacher/LivePage.tsx"),menu=read("web-spa/src/friends/FriendCallMenu.tsx");
const css=read("web-spa/src/friends/friendCall.css")+"\n"+read("web-spa/src/teacher/teacherCall.css");
test("#56 shared black stage and modal controls",()=>{
 for(const name of ["FriendCallMenu","FriendCallMenuTrigger","FriendCallControls","FriendCallCaptions","FriendChatHistory","friend-phone-stage","friend-live-page","friend-desktop-workspace","teacher-live-quick-actions","TeacherLiveTools"])assert.ok(page.includes(name),name);
 assert.match(page,/inCall open=\{callOptions\}/);
 assert.match(page,/active=\{!textMode\}/);
 assert.match(css,/background:#000/);
 assert.match(css,/border-radius:0/);
 assert.match(css,/\.friend-call-menu-trigger\{[^}]*width:44px;height:44px/);
 for(const name of ["Escape","previous.focus()","event.target===event.currentTarget","aria-modal=\"true\""])assert.ok(menu.includes(name),name);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test("#56 eleven locales and size constraints",()=>{
 for(const l of ["zh-TW","en","ja","ko","fr","de","es","pt-BR","vi","th","id"]){const d=JSON.parse(read("web-spa/src/i18n/locales/"+l+"/voice.json"));for(const k of ["more","closeMenu","waitingForTeacher"])assert.ok(d.callCaptions[k],l+" "+k);assert.ok(d.friendLive.historySummary);}
 for(const p of ["teacher/LivePage.tsx","teacher/TeacherLiveResults.tsx","friends/FriendCallCaptions.tsx"])assert.ok(Buffer.byteLength(read("web-spa/src/"+p))<26000,p);
 assert.doesNotMatch(read("web-spa/src/teacher/teacherCall.css"),/font-size:(?:[0-9]|10|11)px/);
});
