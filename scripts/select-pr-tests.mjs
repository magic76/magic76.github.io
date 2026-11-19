// Conservative PR impact selection. Unknown or shared changes require the full suite.
// This file is deliberately dependency-free and does not rely on branch naming.
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const areas={
  fortune:{prefixes:["web-spa/src/fortune/","functions/api/fortune/"],tests:["tests/fortune-ai-quality.test.js","tests/fortune-report-depth.test.js","tests/fortune-identity.test.js","tests/fortune-daily-card.test.js"]},
  shorts:{prefixes:["web-spa/src/shorts/","scripts/shorts-"],tests:["tests/shorts-daily-generator.test.js","tests/shorts-agent-pipeline.test.js","tests/shorts-post-starter.test.js"]},
  games:{prefixes:["web-spa/src/games/"],tests:["tests/game-end-12.test.js"]},
  teacher:{prefixes:["web-spa/src/teacher/"],tests:["tests/teacher-japanese-english-onboarding.test.js","tests/teacher-target-languages.test.js"]},
};
const core=["tests/crew-usage.test.js","tests/crew-feedback.test.js","tests/crew-feedback-admin.test.js","tests/crew-auth.test.js","tests/guest-trial.test.js"];

export function selectTests(paths){
  const changed=[...new Set(paths.filter(Boolean))];
  if(!changed.length)return {mode:"full",reason:"no changed files",tests:[]};
  const selected=new Set(core);
  for(const path of changed){
    // Never assume documentation, workflow, dependency or shared-module edits are feature-local.
    if(path.startsWith("docs/") || path.endsWith(".md"))continue;
    if(path.startsWith("tests/") || path.startsWith(".github/") || path.startsWith("scripts/") ||
       path.startsWith("functions/") || path.startsWith("workers/") ||
       ["package.json","package-lock.json","vite.web.config.ts"].includes(path))
      return {mode:"full",reason:"shared or infrastructure change: "+path,tests:[]};
    const matching=Object.values(areas).filter(area=>area.prefixes.some(prefix=>path.startsWith(prefix)));
    if(matching.length!==1)return {mode:"full",reason:"unmapped path: "+path,tests:[]};
    for(const test of matching[0].tests)selected.add(test);
  }
  return {mode:"selected",reason:"mapped feature-only changes",tests:[...selected].sort()};
}

if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]){
  const base=process.argv[2],head=process.argv[3]||"HEAD";
  if(!base || !/^[a-f0-9]{40}$/.test(base))throw Error("Expected a full base commit SHA");
  const bytes=execFileSync("git",["diff","--name-only","-z","--diff-filter=ACDMRTUXB",base,head],{encoding:"utf8"});
  const result=selectTests(bytes.split("\0"));
  process.stdout.write(JSON.stringify(result)+"\n");
}
