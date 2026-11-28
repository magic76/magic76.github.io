import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const page=read("web-spa/src/teacher/LivePage.tsx");
const tutor=read("web-spa/src/teacher/CurrentTeacherCard.tsx");
const controls=read("web-spa/src/live/LiveControls.tsx");
const css=read("web-spa/src/teacher/parity.css");
const voiceZh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/voice.json"));

test("Live session offers a direct teacher-change entry with an explicit session-end confirmation",()=>{
 assert.match(page,/className="teacher-live-change-action"/);
 assert.match(page,/window\.confirm\(confirmation\)/);
 assert.match(page,/await live\.stop\(true\)/);
 assert.match(page,/navigate\("\/learn",\{state:\{openTeacherPicker:true\}\}\)/);
 assert.match(tutor,/useLocation\(\)/);
 assert.match(tutor,/openTeacherPicker\?:boolean/);
 assert.match(tutor,/useEffect\(\(\)=>\{if\(openTeacherPicker\)setPicker\(true\)\}/);
});

test("Mobile live controls keep only conversation actions visible until options are expanded",()=>{
 assert.match(page,/<details className="teacher-live-quick-actions">/);
 assert.doesNotMatch(controls,/live-audio-settings|volumeSummary|type="range"|live\.setVolume/);
 assert.equal(voiceZh.controls.volumeSummary,"AI 音量 · {{v}}%");
 assert.match(controls,/<button type="button" className="live-btn end crew-voice-end"/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\) minmax\(70px,\.72fr\)/);
 assert.match(css,/\.crew-voice-dock \.crew-voice-end\{grid-column:auto/);
 assert.match(css,/\.teacher-live-avatar\{width:92px;height:92px\}/);
});
