const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const workflow = readFileSync(join(__dirname, "../.github/workflows/cloudflare-clean-routes.yml"), "utf8");
const browserSmoke = readFileSync(join(__dirname, "cloudflare-browser-smoke.mjs"), "utf8");

test("Cloudflare never automatically builds on PR updates", () => {
  assert.doesNotMatch(workflow, /^  pull_request:/m,
    "Crew SPA already validates PRs; Cloudflare should be on-demand");
  assert.match(workflow, /^  issue_comment:\n    types: \[created\]$/m);
  assert.match(workflow, /^  workflow_dispatch:\n    inputs:/m);
});

test("only the repository owner can explicitly trigger a PR comment preview", () => {
  assert.match(workflow, /github\.event\.issue\.pull_request/);
  assert.match(workflow, /github\.event\.comment\.user\.login == github\.repository_owner/);
  for(const command of ["/crew-preview", "/crew-preview full", "/crew-preview visual"]){
    assert.ok(workflow.includes("github.event.comment.body == '" + command + "'"),
      "Missing authorized command: " + command);
  }
  assert.doesNotMatch(workflow, /startsWith\(github\.event\.comment\.body/,
    "Do not allow unrecognized arbitrary comment commands");
});

test("a commented preview builds the exact open PR commit, not master", () => {
  assert.match(workflow, /gh api "repos\/\$\{GITHUB_REPOSITORY\}\/pulls\/\$\{PR_NUMBER\}"/);
  assert.match(workflow, /head_repo.*GITHUB_REPOSITORY/);
  assert.match(workflow, /pr_state.*"open"/);
  assert.match(workflow, /ref: \$\{\{ steps\.source\.outputs\.sha \|\| github\.sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /pull-requests: read/);
  assert.match(workflow, /pr_number:\n\s+description:[^\n]+\n\s+required: false\n\s+type: number\n\s+default: 0/);
});

test("regular preview still checks Cloudflare deployment contracts", () => {
  for(const check of [
    "npm run build:cloudflare",
    "npm run test:cloudflare",
    "node --test tests/research-editorial.test.js",
    "node scripts/research-quality-report.mjs"
  ]) assert.ok(workflow.includes(check), "Missing validation: " + check);
  assert.match(workflow, /- uses: actions\/upload-artifact@v4\n\s+if: github\.event_name == 'workflow_dispatch' \|\| github\.event_name == 'issue_comment'/);
  assert.match(workflow, /retention-days: 2/);
});

test("Playwright and visual captures stay behind explicit commands", () => {
  assert.match(workflow, /- name: Install Playwright for manual browser smoke\n\s+if: >-[\s\S]*?github\.event\.comment\.body == '\/crew-preview full'[\s\S]*?github\.event\.comment\.body == '\/crew-preview visual'/);
  assert.match(workflow, /- name: Install FFmpeg for optional visual recordings\n\s+if: >-[\s\S]*?github\.event\.comment\.body == '\/crew-preview visual'/);
  assert.match(workflow, /- name: Full browser smoke \(explicit request\)\n\s+if: >-[\s\S]*?run: npm run test:browser:cloudflare/);
  assert.match(browserSmoke, /if\(process\.env\.CREW_VISUAL_QA==="1"\)await captureCrewVisualQA\(browser\)/);
  assert.match(workflow, /if: >-\n\s+always\(\) &&[\s\S]*?github\.event\.comment\.body == '\/crew-preview visual'/);
});
