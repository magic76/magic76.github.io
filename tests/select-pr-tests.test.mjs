import test from "node:test";
import assert from "node:assert/strict";
import {selectTests} from "../scripts/select-pr-tests.mjs";

test("feature-local changes include mandatory security and analytics contracts",()=>{
 const result=selectTests(["web-spa/src/fortune/DailyCard.tsx"]);
 assert.equal(result.mode,"selected");
 assert.ok(result.tests.includes("tests/fortune-daily-card.test.js"));
 assert.ok(result.tests.includes("tests/crew-auth.test.js"));
 assert.ok(result.tests.includes("tests/crew-usage.test.js"));
});

test("unknown, shared, deleted or infrastructure paths conservatively trigger full regression",()=>{
 for(const path of ["web-spa/src/components/Button.tsx","functions/api/usage/event.ts","scripts/other.mjs",".github/workflows/crew-spa.yml","package-lock.json","tests/crew-usage.test.js"]){
  assert.equal(selectTests([path]).mode,"full",path);
 }
});

test("mixed changes fall back to full suite rather than silently skipping a dependency",()=>{
 assert.equal(selectTests(["web-spa/src/games/GamePage.tsx","web-spa/src/components/Nav.tsx"]).mode,"full");
});

test("empty diff runs full suite",()=>{
 assert.equal(selectTests([]).mode,"full");
});

test("only docs changes do not require feature tests but retain core contracts",()=>{
 const result=selectTests(["docs/test-audit.md"]);
 assert.equal(result.mode,"selected");
 assert.ok(result.tests.includes("tests/crew-feedback-admin.test.js"));
});
