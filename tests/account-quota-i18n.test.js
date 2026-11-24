const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("account text quota preloads voice translations even on a cold direct visit",()=>{
 const app=read("web-spa/src/App.tsx");
 const account=read("web-spa/src/pages/AccountPage.tsx");
 assert.match(app,/const AccountPage=lazy\(\(\)=>withNamespace\("voice",import\("\.\/pages\/AccountPage"\)\)/);
 assert.match(account,/useTranslation\(\["common","voice"\]\)/);
 assert.match(account,/t\("voice:textChat\.ui\.freePractice"\)/);
 assert.match(account,/t\("voice:textChat\.ui\.freeDaily",\{count:state\.textTrial\.limit\}\)/);
 assert.match(account,/t\("voice:textChat\.ui\.remaining",\{count:Math\.max\(0,state\.textTrial\.limit-state\.textTrial\.used\)\}\)/);
});

test("every configured UI locale supplies account text quota labels and count placeholders",()=>{
 const {locales}=JSON.parse(read("config/ui-locales.json"));
 for(const {code} of locales){
  const ui=JSON.parse(read("web-spa/src/i18n/locales/"+code+"/voice.json")).textChat?.ui;
  for(const key of ["freePractice","freeDaily","remaining"]){
   assert.equal(typeof ui?.[key],"string",code+":"+key);
   assert.ok(ui[key].trim()&&ui[key]!=="textChat.ui."+key,code+":"+key);
   if(key!=="freePractice")assert.match(ui[key],/\{\{count\}\}/,code+":"+key);
  }
 }
});
