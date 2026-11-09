const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("public Gemini key guide matches the configured five-minute guest voice trial",()=>{
 const backend=read("functions/api/guest/token.js");
 const guide=read("web-spa/src/guides/catalog.ts").split('"gemini-key-for-ai-practice":{')[1];
 assert.ok(guide,"Gemini guide entry exists");
 assert.match(backend,/const SESSION_SECONDS=300;/,"backend guest voice duration is 300 seconds");
 assert.match(guide,/Crew Web 可先免費試用 5 分鐘 AI 語音/,"Chinese guide must describe five minutes");
 assert.match(guide,/You can first try five minutes of free AI voice/,"English guide must describe five minutes");
 assert.doesNotMatch(guide,/免費試用 3 分鐘 AI 語音|three minutes of free AI voice/i,"no outdated three-minute trial claims");
});
