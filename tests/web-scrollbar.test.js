const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

test("Crew Web hides root and nested scrollbar chrome, not scrolling", () => {
  const css = fs.readFileSync(path.join(root, "web-spa/src/styles.css"), "utf8");
  const html = fs.readFileSync(path.join(root, "web-spa/index.html"), "utf8");
  assert.ok(css.includes("scrollbar-width: none !important"));
  assert.ok(css.includes("-ms-overflow-style: none !important"));
  assert.ok(css.includes("#root *::-webkit-scrollbar"));
  assert.ok(css.includes("*::-webkit-scrollbar-corner"));
  assert.ok(css.includes("*::-webkit-scrollbar-button"));
  assert.ok(html.includes("html::-webkit-scrollbar"));
  assert.ok(html.includes("#root *::-webkit-scrollbar"));
  // Hiding the scrollbar is not the same as disabling page scrolling.
  assert.doesNotMatch(css.slice(0, 1000), /overflow\s*:\s*hidden\s*!important/);
  assert.doesNotMatch(html, /overflow\s*:\s*hidden\s*!important/);
});

test("Scroll surfaces retain their independent scrolling behavior", () => {
  const css = fs.readFileSync(path.join(root, "web-spa/src/styles.css"), "utf8");
  const shared = fs.readFileSync(path.join(root, "features/shared/design-system.css"), "utf8");
  assert.ok(css.includes(".teacher-picker"));
  assert.ok(css.includes(".story-filmstrip"));
  assert.ok(css.includes(".fortune-result-tabs"));
  assert.ok(shared.includes("overflow:auto"));
});
