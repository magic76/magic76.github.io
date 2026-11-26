const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("public Gemini key guide explains limited free usage and links directly to account setup",()=>{
 const guide=read("web-spa/src/guides/catalog.ts").split('"gemini-key-for-ai-practice":{')[1];
 assert.ok(guide,"Gemini guide entry exists");
 assert.match(guide,/每日免費文字與語音額度/);
 assert.match(guide,/daily free text and voice allowances/);
 assert.match(guide,/自備 Key 不代表無限免費/);
 assert.match(guide,/does not mean unlimited free voice chat/);
 assert.equal((guide.match(/target:"\/account#settings-gemini"/g)||[]).length,2);
 assert.equal((guide.match(/https:\/\/ai\.google\.dev\/gemini-api\/docs\/pricing/g)||[]).length,2);
 assert.equal((guide.match(/https:\/\/ai\.google\.dev\/gemini-api\/docs\/troubleshooting/g)||[]).length,2);
 assert.match(guide,/401 or 403/);
 assert.match(guide,/429 error/);
 assert.doesNotMatch(guide,/免費試用 [35] 分鐘 AI 語音|(?:three|five) minutes of free AI voice/i,"do not hard-code a service allowance in public copy");
 assert.match(read("web-spa/src/pages/SettingsPage.tsx"),/\/account#settings-gemini/);
});
