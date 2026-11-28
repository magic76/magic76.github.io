"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
test("public home bypasses Pages Functions; API routes stay active",()=>{
 const routes=JSON.parse(fs.readFileSync(path.join(root,"_routes.json"),"utf8"));
 assert.ok(!routes.include.includes("/"));
 assert.ok(!routes.include.includes("/*"));
 assert.ok(!fs.existsSync(path.join(root,"functions/_middleware.ts")));
 for(const route of ["/api/usage/*","/api/books","/api/auth/*","/api/membership/*","/api/fortune/*","/api/voice/*"])assert.ok(routes.include.includes(route),route);
});
test("language picker still navigates on explicit choice without an edge cookie",()=>{
 const switcher=fs.readFileSync(path.join(root,"web-spa/src/i18n/LanguageSwitcher.tsx"),"utf8");
 assert.doesNotMatch(switcher,/document\.cookie=/);
 assert.match(switcher,/localePrefix\(next\)/);
 assert.match(switcher,/window\.location\.replace\(path\+location\.search\+location\.hash\)/);
});
