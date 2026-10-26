import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const locales=["zh-TW","en","ja","es","pt-BR","id","fr","de","ko","vi","th"];
const flat=(o,p="")=>Object.entries(o).flatMap(([k,v])=>typeof v==="string"?[[p+k,v]]:flat(v,p+k+"."));
const placeholders=s=>[...s.matchAll(/\{\{\s*([^}]+)\s*\}\}/g)].map(m=>m[1]).sort();
test("magic locale namespace has 11 complete aligned catalogs",()=>{
 const en=Object.fromEntries(flat(JSON.parse(read("web-spa/src/i18n/locales/en/magic.json"))));
 for(const lang of locales){const actual=Object.fromEntries(flat(JSON.parse(read(`web-spa/src/i18n/locales/${lang}/magic.json`))));
  assert.deepEqual(Object.keys(actual).sort(),Object.keys(en).sort(),lang);
  for(const [key,value] of Object.entries(actual)){assert.ok(value.trim(),lang+":"+key);assert.deepEqual(placeholders(value),placeholders(en[key]),lang+":"+key)}
 }
});
test("first screen quick actions and screen reader announcements",()=>{
 const page=read("web-spa/src/magic/MagicPage.tsx");
 assert.match(page,/className="magic-quick-row"/);
 for(const k of ["summon","create","daynight","sculpt"])assert.match(page,new RegExp('data-magic-quick="'+k+'"'));
 assert.match(page,/className="magic-sr-announcer"[^>]*role="status"[^>]*aria-live="polite"/);
 assert.doesNotMatch(page,/className="magic-story"[^>]*aria-live/);
 assert.doesNotMatch(read("web-spa/src/magic/MagicScene3D.tsx"),/aria-label="3D magic world"/);
});
test("touch target and text contrast",()=>{
 const css=read("web-spa/src/magic/magic.css");
 assert.match(css,/\.magic-quick-row button\{[^}]*min-height:48px/);
 const contrast=(a,b)=>{const lum=c=>{const vals=c.match(/[0-9a-f]{2}/gi).slice(0,3).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*vals[0]+.7152*vals[1]+.0722*vals[2]};let [x,y]=[lum(a),lum(b)].sort((a,b)=>b-a);return (x+.05)/(y+.05)};
 for(const color of ["#466e69","#64615d"])assert.ok(contrast(color,"#f7f7f4")>=4.5,color);
});
test("beta magic catalogs are translated, not English copies",()=>{
 const en=JSON.parse(read("web-spa/src/i18n/locales/en/magic.json"));
 const cognates=new Set(["Portal","Dragon"]);
 for(const lang of ["ja","es","pt-BR","id","fr","de","ko","vi","th"]){
  const actual=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/magic.json`));
  const copied=Object.keys(en).filter(key=>actual[key]===en[key]&&!cognates.has(en[key]));
  assert.deepEqual(copied,[],lang+" still has English copies");
 }
});
test("sentence keys are looked up without key or namespace separators",()=>{
 const hook=read("web-spa/src/magic/useMagicT.ts");
 assert.match(hook,/keySeparator:false/);
 assert.match(hook,/nsSeparator:false/);
 for(const file of ["MagicPage","MagicGuideCard","MagicHelpDialog","MagicCreatedList","MagicInteractionCard","MagicMobileInteraction"])
  assert.doesNotMatch(read(`web-spa/src/magic/${file}.tsx`),/useTranslation\("magic"\)/,file);
});
