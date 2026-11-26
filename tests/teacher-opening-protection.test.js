const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(file) {
  return fs.readFileSync(path.join(__dirname, "..", file), "utf8");
}

test("teacher voice sessions opt into the existing protected opening", () => {
  const page = read("web-spa/src/teacher/LivePage.tsx");
  assert.match(page, /useLiveSession\(\{pageKey:"teacher",[^\n]*\bprotectOpening:true\b/);
});

test("teacher status does not invite speech during a protected opening", () => {
  const status = read("web-spa/src/teacher/teacherCallStatus.ts");
  assert.match(status, /if\(state==="listening"\)\{\s*if\(openingProtected\)return "live\.status\.processing"/);
  assert.match(status, /const awaitingReply=live\.openingProtected\|\|/);
});
