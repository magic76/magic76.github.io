const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const workflow = readFileSync(join(__dirname, "../.github/workflows/cloudflare-clean-routes.yml"), "utf8");
const pathsSection = workflow.match(/^  pull_request:\n    paths:\n([\s\S]*?)^  workflow_dispatch:/m);
assert.ok(pathsSection, "Cloudflare PR path filter and manual dispatch must exist");
const paths = [...pathsSection[1].matchAll(/^\s+- "([^"]+)"\s*$/gm)].map(match => match[1]);

test("Cloudflare preview avoids a full build for unrelated app edits", () => {
  assert.ok(paths.length > 0, "PR changes must be path filtered");
  for (const forbidden of ["web-spa/**", "web-spa/src/**", "**"]) {
    assert.ok(!paths.includes(forbidden), "Overbroad trigger: " + forbidden);
  }
  assert.ok(!paths.some(path => path.startsWith("web-spa/src/live/")),
    "Live-only changes belong to Crew SPA verification");
});

test("Cloudflare preview still checks SSG, main routes, critical CSS, and deploy config", () => {
  for (const needed of [
    "web-spa/src/App.tsx",
    "web-spa/src/main.tsx",
    "web-spa/src/ssg-entry.tsx",
    "web-spa/src/pages/**",
    "web-spa/src/briefing/**",
    "web-spa/src/guides/**",
    "web-spa/src/i18n/**",
    "web-spa/src/*.css",
    "features/shared/design-system.css",
    "features/teacher/styles.css",
    "features/story/styles.css",
    "features/fortune/styles.css",
    "web-spa/src/games/CrewPlayHubPage.tsx",
    "scripts/ssg-renderer.mjs",
    "scripts/prepare-cloudflare.mjs",
    "vite.web.config.ts",
    "package.json",
    "package-lock.json",
    "tests/cloudflare-browser-smoke.mjs",
    "tests/cloudflare-deployment.test.js",
    ".github/workflows/cloudflare-clean-routes.yml"
  ]) {
    assert.ok(paths.includes(needed), "Missing critical trigger: " + needed);
  }
});

test("Cloudflare browser validation remains manual, cancellable, and readable", () => {
  assert.match(workflow, /^  workflow_dispatch:\s*$/m);
  assert.match(workflow, /group: cloudflare-preview-\$\{\{ github\.event\.pull_request\.number \|\| github\.run_id \}\}/);
  assert.match(workflow, /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
  assert.match(workflow, /run: npm run build:cloudflare/);
  assert.match(workflow, /run: npm run test:cloudflare/);
  assert.match(workflow, /run: npm run test:browser:cloudflare/);
  assert.match(workflow, /if: github\.event_name == 'workflow_dispatch'\n\s+run: npm run check:web/);
  assert.match(workflow, /- uses: actions\/upload-artifact@v4\n\s+if: github\.event_name == 'workflow_dispatch'/);
});
