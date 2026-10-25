const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
const folder=path.join(root,"web-spa/src/i18n/locales");
const locales=["ja","es","pt-BR","id","ko","fr","de","vi","th"];
const namespaces=["common","home","settings","teacher","friends","story","fortune"];
const vars=value=>[...value.matchAll(/\{\{[^{}]+\}\}/g)].map(m=>m[0]).sort();
const flat=(obj,prefix="",out={})=>{
 for(const [key,value] of Object.entries(obj)){
  const p=prefix?prefix+"."+key:key;
  if(typeof value==="string")out[p]=value;
  else if(value&&typeof value==="object")flat(value,p,out);
  else throw new Error("Invalid translation value at "+p);
 }
 return out;
};
const load=(lang,ns)=>flat(JSON.parse(fs.readFileSync(path.join(folder,lang,ns+".json"),"utf8")));

test("all nine beta languages have complete translation catalogs",()=>{
 for(const ns of namespaces){
  const source=load("en",ns);
  for(const lang of locales){
   const dest=load(lang,ns);
   assert.deepEqual(Object.keys(dest).sort(),Object.keys(source).sort(),lang+"/"+ns+" has full key parity");
   for(const [key,value] of Object.entries(source)){
    assert.equal(typeof dest[key],"string",lang+"/"+ns+":"+key);
    if(value.trim())assert.ok(dest[key].trim(),lang+"/"+ns+":"+key+" cannot be blank");
    assert.deepEqual(vars(dest[key]),vars(value),lang+"/"+ns+":"+key+" interpolations must match");
   }
  }
 }
});
test("beta localization does not change Teacher's learning language or indexed SEO locales",()=>{
 const catalog=JSON.parse(fs.readFileSync(path.join(root,"config/ui-locales.json"),"utf8")).locales;
 assert.deepEqual(catalog.filter(x=>x.stage==="priority").map(x=>x.code),locales.slice(0,4).concat(["ko","fr","de","vi","th"]).sort((a,b)=>catalog.findIndex(x=>x.code===a)-catalog.findIndex(x=>x.code===b)));
 assert.deepEqual(catalog.filter(x=>x.stage==="published").map(x=>x.code),["zh-TW","en"]);
 const source=fs.readFileSync(path.join(root,"web-spa/src/i18n/index.ts"),"utf8");
 const switcher=fs.readFileSync(path.join(root,"web-spa/src/i18n/LanguageSwitcher.tsx"),"utf8");
 assert.ok(source.includes("import.meta.glob"));
 assert.ok(switcher.includes("localePrefix(next)"));
 assert.ok(!switcher.includes("setTargetLanguage"));
});


test("removed preview languages cannot appear in the UI language picker",()=>{
 const entries=JSON.parse(fs.readFileSync(path.join(root,"config/ui-locales.json"),"utf8")).locales;
 assert.equal(entries.length,11);
 assert.ok(entries.every(entry=>entry.stage==="published"||entry.stage==="priority"));
 for(const locale of locales){
  const catalog=JSON.parse(fs.readFileSync(path.join(folder,locale,"home.json"),"utf8"));
  assert.ok(catalog.sectionExplore.fortune.desc&&catalog.sectionExplore.circle.desc,locale+" Explore content");
 }
});
