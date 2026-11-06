import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../web-spa/src/i18n/languageSwitcher.css", import.meta.url), "utf8");

test("language dialog close button has a 44px touch target at mobile widths", () => {
  const rule = css.match(/\.crew-language-close\s*\{([^}]*)\}/);
  assert.ok(rule, "language close selector must exist");
  assert.match(rule[1], /(?:^|;)\s*width:\s*44px\s*;/);
  assert.match(rule[1], /(?:^|;)\s*height:\s*44px\s*;/);

  const mobile = css.match(/@media\s*\(max-width:\s*600px\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(mobile, "mobile breakpoint must exist");
  assert.doesNotMatch(mobile[1], /\.crew-language-close\s*\{/,
    "mobile styles must not shrink the close target");
});
