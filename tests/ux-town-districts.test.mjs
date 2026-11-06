import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../web-spa/src/town/three/town3d.css", import.meta.url), "utf8");

test("Town 3D district buttons meet minimum touch and text sizes", () => {
  const rules = [...css.matchAll(/\.crew-town-3d-districts button\s*\{([^}]*)\}/g)];
  assert.equal(rules.length, 2, "expect base and mobile district button rules");
  for (const [, declarations] of rules) {
    const height = declarations.match(/min-height:\s*(\d+)px/);
    const font = declarations.match(/font-size:\s*(\d+)px/);
    assert.ok(height && Number(height[1]) >= 44, "district button height must be at least 44px");
    assert.ok(font && Number(font[1]) >= 12, "district button font must be at least 12px");
  }
  assert.match(css, /@media\(max-width:720px\)\s*\{[\s\S]*?\.crew-town-3d-districts button\s*\{/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
