import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {readInternationalPages} from "../scripts/seo-publication.mjs";
const root=fileURLToPath(new URL("../",import.meta.url));
const read=path=>JSON.parse(readFileSync(join(root,path),"utf8"));
const copy=read("web-spa/src/i18n/internationalLearningData.json");
test("first international release is limited to Japanese, Vietnamese and Korean home/Teacher pages",()=>{
 const pages=readInternationalPages(root);
 for(const locale of ["ja","vi","ko"]){
  const entries=pages.filter(entry=>entry.locale===locale);
  assert.ok(entries.some(entry=>entry.path==="/")&&entries.some(entry=>entry.path==="/teacher"));
  const common=read("web-spa/src/i18n/locales/"+locale+"/common.json");
  assert.equal(entries.find(entry=>entry.path==="/").title,common.seo.home);
  assert.equal(entries.find(entry=>entry.path==="/teacher").title,common.seo.teacher);
  assert.equal(copy[locale].guides.examples.length,3);
  assert.equal(new Set(copy[locale].guides.examples.map(example=>example.english)).size,3);
  assert.ok(copy[locale].guides.examples.every(example=>example.meaning&&example.meaning!==example.english));
  assert.equal(Object.keys(copy[locale].tracks).length,6);
 }
});

test("market copy stays out of the initial bundle and loads before locale rendering",()=>{
 const loader=readFileSync(join(root,"web-spa/src/i18n/internationalLearningCopy.ts"),"utf8");
 const i18n=readFileSync(join(root,"web-spa/src/i18n/index.ts"),"utf8");
 assert.ok(loader.includes('import("./internationalLearningData.json").then('));
 assert.ok(!loader.includes('import copy from'));
 assert.ok(loader.includes('if(!marketKey(locale)||copy)return Promise.resolve()'));
 assert.ok(i18n.includes('loadInternationalLearningCopy(locale)'));
});
