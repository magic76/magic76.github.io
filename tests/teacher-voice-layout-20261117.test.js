import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const page=read("web-spa/src/teacher/LivePage.tsx");
const captions=read("web-spa/src/friends/FriendCallCaptions.tsx");
const css=read("web-spa/src/teacher/teacherCall.css");

test("teacher guest countdown moves to the transcript header only during an active call",()=>{
 assert.match(captions,/headerAccessory\?:ReactNode/);
 assert.match(captions,/\{headerAccessory\}/);
 assert.match(page,/headerAccessory=\{guestStarted&&live\.state!==/);
 assert.match(page,/\{guestStarted&&!sessionActive&&live\.state!==/);
 assert.equal((page.match(/<GuestTrialCountdown /g)||[]).length,2);
});

test("teacher call ring, captions and bottom buttons have dedicated mobile layout",()=>{
 assert.ok(css.includes(".teacher-live-stage.friend-phone-stage>.live-identity{padding-top:18px"));
 assert.ok(css.includes("min-height:64px;width:64px;height:64px"));
 assert.ok(css.includes("body.teacher-theme.session-page .teacher-call-page .teacher-live-stage.friend-phone-stage{\n  padding:12px 12px calc(12px + env(safe-area-inset-bottom,0px))"));
 assert.ok(css.includes(".friend-caption-ai>p{font-size:14px}"));
 assert.ok(css.includes("flex:1 1 auto;min-height:0;overflow-y:auto"));
 assert.ok(css.includes(".teacher-live-stage.friend-phone-stage>.teacher-call-voice-dock{\n margin-top:auto"));
 assert.ok(css.includes(".friend-caption-heading>.guest-trial-countdown"));
 assert.ok(css.includes(".guest-trial-countdown-number{\n min-width:0;font-size:14px"));
});
