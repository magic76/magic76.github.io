const test=require("node:test");
const assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process");
const path=require("node:path");
test("offline catalog audit validates published and nine Beta locales",()=>{
 const output=execFileSync(process.execPath,["scripts/check-ui-locales.mjs"],{cwd:path.resolve(__dirname,".."),encoding:"utf8"});
 for(const code of ["zh-TW","en","ja","es","pt-BR","id","ko","fr","de","vi","th"])assert.ok(output.includes("| "+code+" |"));
 assert.match(output,/Errors: 0;/);
});
