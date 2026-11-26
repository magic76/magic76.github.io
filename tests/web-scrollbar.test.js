const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

test("Crew Web hides root and nested scrollbar chrome, not scrolling", () => {
  const css = fs.readFileSync(path.join(root, "web-spa/src/scrollbar-policy.css"), "utf8");
  const html = fs.readFileSync(path.join(root, "web-spa/index.html"), "utf8");
  assert.ok(css.includes("scrollbar-width: none !important"));
  assert.ok(css.includes("-ms-overflow-style: none !important"));
  assert.ok(css.includes("#root *::-webkit-scrollbar"));
  assert.ok(css.includes("body *::-webkit-scrollbar-corner"));
  assert.ok(css.includes("body *::-webkit-scrollbar-button"));
  assert.ok(html.includes("html::-webkit-scrollbar"));
  assert.ok(html.includes("#root *::-webkit-scrollbar"));
  assert.ok(html.includes("body *::-webkit-scrollbar"));
  // Hiding the scrollbar is not the same as disabling page scrolling.
  assert.doesNotMatch(css, /overflow\s*:\s*hidden\s*!important/);
  assert.doesNotMatch(html, /overflow\s*:\s*hidden\s*!important/);
});

test("Global policy is imported last and includes body portals while leaving scrolling enabled", () => {
  const main = fs.readFileSync(path.join(root, "web-spa/src/main.tsx"), "utf8");
  const css = fs.readFileSync(path.join(root, "web-spa/src/scrollbar-policy.css"), "utf8");
  const imports = [...main.matchAll(/import ["'](\.[^"']+\.css)["']/g)].map(match => match[1]);
  assert.equal(imports.at(-1), "./scrollbar-policy.css");
  assert.ok(css.includes("body *,"));
  assert.ok(css.includes("#root * {"));
  assert.ok(css.includes("body *::-webkit-scrollbar"));
  assert.ok(css.includes("scrollbar-gutter: auto !important"));
  assert.doesNotMatch(css, /overflow(?:-x|-y)?\s*:\s*(?:hidden|clip)/);
});

test("Scroll surfaces retain their independent scrolling behavior", () => {
  const css = fs.readFileSync(path.join(root, "web-spa/src/styles.css"), "utf8");
  const shared = fs.readFileSync(path.join(root, "features/shared/design-system.css"), "utf8");
  assert.ok(css.includes(".teacher-picker"));
  assert.ok(css.includes(".story-filmstrip"));
  assert.ok(css.includes(".fortune-result-tabs"));
  assert.ok(shared.includes("overflow:auto"));
});

test("Shared product chrome exposes the contact email as a mail link", () => {
  const chrome = fs.readFileSync(path.join(root, "web-spa/src/components/AppChrome.tsx"), "utf8");
  const styles = fs.readFileSync(path.join(root, "web-spa/src/styles.css"), "utf8");
  assert.ok(chrome.includes('href="mailto:cs@koolo.app"'));
  assert.ok(chrome.includes('t("contact.label")'));
 const common=JSON.parse(fs.readFileSync(path.join(root,"web-spa/src/i18n/locales/zh-TW/common.json"),"utf8"));
 assert.equal(common.contact.label,"聯絡我們");
  assert.ok(styles.includes(".crew-contact-footer"));
});
