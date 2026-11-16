const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const locales=["zh-TW","en","ja","ko","de","fr","es","id","pt-BR","th","vi"];
const namespaces=["common","home","settings","teacher","featureMenu","friends","story","fortune","voice","fortuneDaily","feedback"];
const oldName=/\b(?:Crew|CREW)\b/;

function values(v,path=[],output=[]){
 if(typeof v==="string")output.push({path:path.join("."),text:v});
 else if(v&&typeof v==="object")for(const [k,x] of Object.entries(v))values(x,[...path,k],output);
 return output;
}

test("Koolo is the visible brand in all 11 languages, without touching SEO or native Android app labels",()=>{
 for(const lang of locales)for(const namespace of namespaces){
  const bundle=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/"+namespace+".json"));
  for(const entry of values(bundle)){
   if(namespace==="common"&&entry.path.startsWith("seo."))continue;
   if(namespace==="settings"&&entry.path==="device.permissions")continue;
   assert.doesNotMatch(entry.text,oldName,lang+"/"+namespace+"."+entry.path);
  }
 }
 const zh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/common.json"));
 assert.match(zh.seo.home,/Crew/,"SEO rebranding is a separate release");
});

test("installable app and update prompts use Koolo but retain icon paths and canonical domain",()=>{
 const manifest=JSON.parse(read("web-spa/public/site.webmanifest"));
 assert.equal(manifest.short_name,"Koolo");
 assert.match(manifest.name,/Koolo/);
 assert.deepEqual(manifest.shortcuts.map(x=>x.url),["/chat","/learn","/games"]);
 const html=read("web-spa/index.html");
 const cloudflare=read("scripts/prepare-cloudflare.mjs");
 for(const s of [html,cloudflare])assert.match(s,/apple-mobile-web-app-title" content="Koolo"/);
 assert.match(html,/<title>Crew<\/title>/,"SEO title stays untouched");
 for(const source of [read("web-spa/src/components/crewInstallCopy.ts"),read("web-spa/src/components/CrewUpdateNotice.tsx")]){
  assert.match(source,/Koolo/);
  assert.doesNotMatch(source,oldName);
 }
});
