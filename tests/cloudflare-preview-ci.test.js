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

test("Cloudflare browser validation is manual, cancellable, and readable", () => {
  assert.match(workflow, /^  workflow_dispatch:\s*$/m);
  assert.match(workflow, /group: cloudflare-preview-\$\{\{ github\.event\.pull_request\.number \|\| github\.run_id \}\}/);
  assert.match(workflow, /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
  assert.match(workflow, /run: npm run build:cloudflare/);
  assert.match(workflow, /run: npm run test:cloudflare/);
  assert.match(workflow, /- name: Full browser smoke \(manual\)\n\s+if: github\.event_name == 'workflow_dispatch'[\s\S]*?run: npm run test:browser:cloudflare/);
  assert.match(workflow, /- name: Install Playwright for manual browser smoke\n\s+if: github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow, /- name: Install FFmpeg for optional visual recordings\n\s+if: github\.event_name == 'workflow_dispatch' && inputs\.visual_qa/);
  assert.match(workflow, /visual_qa:\n\s+description:[^\n]+\n\s+required: false\n\s+type: boolean\n\s+default: false/);
  assert.doesNotMatch(workflow, /if: always\(\) && github\.event_name == 'pull_request'/,
    "PRs should not upload browser visual artifacts");
  assert.match(workflow, /if: github\.event_name == 'workflow_dispatch'\n\s+run: npm run check:web/);
  assert.match(workflow, /- uses: actions\/upload-artifact@v4\n\s+if: github\.event_name == 'workflow_dispatch'/);
});

const browserSmoke = readFileSync(join(__dirname, "cloudflare-browser-smoke.mjs"), "utf8");
test("expensive screenshot/video capture is manual opt-in", () => {
  assert.match(browserSmoke, /if\(process\.env\.CREW_VISUAL_QA==="1"\)await captureCrewVisualQA\(browser\)/);
  assert.match(workflow, /if: always\(\) && github\.event_name == 'workflow_dispatch' && inputs\.visual_qa/);
});
