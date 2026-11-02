const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const app=fs.readFileSync(path.join(root,"web-spa/src/App.tsx"),"utf8");
const page=fs.readFileSync(path.join(root,"web-spa/src/souls/SoulsPage.tsx"),"utf8");
const nav=fs.readFileSync(path.join(root,"web-spa/src/pages/crewNavigation.ts"),"utf8");
test("Souls is a direct-only lazy route, not a navigation entry",()=>{
 assert.match(app,/path="\/souls"/);
 assert.match(app,/withNamespace\("voice",import\("\.\/souls\/SoulsPage"\)\)/);
 assert.doesNotMatch(nav,/\/souls/);
});
test("Souls recognition always requires explicit confirmation",()=>{
 assert.match(page,/function candidates\(/);
 assert.match(page,/onClick=\{\(\)=>void choose\(soul\)\}/);
 assert.match(page,/Local image matching only suggests candidates/);
});
test("Souls uses browser storage and the Friends Live engine",()=>{
 assert.match(page,/indexedDB\.open\("crew-souls-local-v1"/);
 assert.match(page,/useLiveSession\(/);
 assert.match(page,/sessionKind:"friend"/);
 assert.match(page,/role="friend"/);
});
test("Soul memory is scoped to the object and can be disabled or deleted",()=>{
 assert.match(page,/current\.remember/);
 assert.match(page,/await update\(id,current=>/);
 assert.match(page,/notes:s\.notes\.filter/);
 assert.match(page,/Delete Soul/);
});