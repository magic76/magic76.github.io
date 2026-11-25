const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"../web-spa/src/guides",p),"utf8");
test("guide answers preserve free-first policy in both locales",()=>{
 const source=read("catalog.ts"),page=read("GuidePage.tsx");
 assert.match(source,/有沒有可以用中文聊天、也可以練英文的 AI 朋友/);
 assert.match(source,/Can I chat with an AI friend in Chinese and practice English/);
 assert.match(source,/有沒有不用下載 App 或申請 API Key 的英文口說練習/);
 assert.match(source,/Can I practice English speaking without installing an app or getting an API key/);
 assert.doesNotMatch(source,/免費試用 5 分鐘 AI 語音|five minutes of free AI voice|your own Gemini API key is needed after the free trial/);
 assert.match(page,/每日免費文字與語音額度，無需自備 API Key/);
 assert.match(page,/daily free AI text or voice without an API key/);
});
