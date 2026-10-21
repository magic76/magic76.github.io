const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

test("reading-to-Fortune explicitly transfers a brief local context", () => {
 const module = read("web-spa/src/teacher/fortuneSpeaking.ts");
 const page = read("web-spa/src/fortune/ReadingPage.tsx");
 assert.match(module, /sessionStorage\.setItem\(STORAGE_KEY/);
 assert.match(module, /30\*60\*1000/);
 assert.doesNotMatch(module, /birthDate|birthTime|latitude|longitude/);
 assert.match(page, /saveFortuneSpeakingContext\(reading\)/);
 assert.match(page, /\/fortune\/live\?from=hub/);
});

test("daily reflection routes to explanatory Live and preserves chosen conversation language", () => {
 const practice = read("web-spa/src/teacher/PracticePage.tsx");
 const live = read("web-spa/src/teacher/LivePage.tsx");
 assert.match(practice, /\/teacher\/fortune/);
 const hub=read("web-spa/src/teacher/TeacherFortunePage.tsx");
 assert.match(hub, /start\("daily"\)/);
 assert.match(hub, /\/fortune\/live\?from=/);
 assert.match(live, /fortuneSpeakingPolicy\(fortuneKind,fortuneContext\)/);
 assert.match(live, /fortuneSpeakingOpening\(fortuneKind,fortuneContext\)/);
 assert.match(live, /language:s\.targetLanguage/);
});

test("fortune voice counselor exposes spoken language selection", () => {
 const fortune = read("web-spa/src/fortune/LivePage.tsx");
 assert.match(fortune, /setSpokenLanguage/);
 assert.match(fortune, /language:spokenLanguage/);
 assert.match(fortune, /TARGET_LANGUAGES\.map/);
 const languageList=read("web-spa/src/teacher/targetLanguages.ts");
 assert.match(languageList,/value:"日文"/);
});
