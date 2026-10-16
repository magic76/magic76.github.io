"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process");
const path=require("node:path");

test("all 32 Crew character identities match their immutable approved master portraits",()=>{
 const root=path.resolve(__dirname,"..");
 const output=execFileSync(process.execPath,["scripts/verify-character-identities.mjs"],{
  cwd:root,encoding:"utf8",timeout:10000,windowsHide:true
 });
 assert.match(output,/PASS: 32 identities \(16 Friends \+ 16 Teachers\)/);
});
