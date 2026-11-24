const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
test("Account route preloads voice translations before rendering on direct entry",()=>{
 const app=read("web-spa/src/App.tsx");
 assert.ok(app.includes('const AccountPage=lazy(()=>withNamespace("voice",import("./pages/AccountPage"))'));
 assert.match(app,/path="\/account"[^\n]*<AccountPage\/>/);
 const account=read("web-spa/src/pages/AccountPage.tsx");
 for(const key of ["freePractice","freeDaily","remaining"])
  assert.ok(account.includes('voice:textChat.ui.'+key),key);
});
test("Account text quota labels and count placeholders exist in every supported locale",()=>{
 const locales=JSON.parse(read("config/ui-locales.json")).locales.map(x=>x.code);
 assert.ok(locales.length>0);
 for(const locale of locales){
  const ui=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/voice.json")).textChat.ui;
  for(const key of ["freePractice","freeDaily","remaining"]){
   assert.equal(typeof ui[key],"string",locale+":"+key);
   assert.ok(ui[key].trim(),locale+":"+key);
   assert.notEqual(ui[key],"textChat.ui."+key);
  }
  for(const key of ["freeDaily","remaining"])assert.ok(ui[key].includes("{{count}}"),locale+":"+key);
 }
});
