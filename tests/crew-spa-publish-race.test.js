const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

test("SPA publisher serializes master and never rebases hashed build assets",()=>{
 const yaml=fs.readFileSync(path.join(__dirname,"../.github/workflows/crew-spa.yml"),"utf8");
 assert.match(yaml,/group: crew-spa-\$\{\{ github\.event_name == 'push' && 'master' \|\| github\.event\.pull_request\.number \}\}/);
 assert.match(yaml,/cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
 assert.match(yaml,/git fetch origin master/);
 assert.match(yaml,/source_head="\$\(git rev-parse HEAD\)"/);
 assert.match(yaml,/Skipping superseded build/);
 assert.match(yaml,/git merge-base --is-ancestor/);
 assert.doesNotMatch(yaml,/git pull --rebase origin master/);
 assert.match(yaml,/git add -A crew-app package-lock\.json/);
 assert.match(yaml,/git push origin HEAD:master/);
});
