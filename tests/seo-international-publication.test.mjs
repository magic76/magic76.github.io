import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {alternatesFor,canonicalUrl,internationalRedirectRules,validateInternationalPages,publishInternationalPages,localizedSeoHead} from "../scripts/seo-publication.mjs";
const locales=[{code:"zh-TW",stage:"published"},{code:"en",stage:"published"},{code:"ja",stage:"priority"},{code:"es",stage:"priority"}];
const ja={locale:"ja",path:"/teacher",title:"AI 英会話",description:"英語を話して練習する",lastmod:"2026-11-28",reviewed:true};
test("publication is explicit, reviewed, unique and restricted to eligible routes",()=>{
 assert.deepEqual(validateInternationalPages({version:1,pages:[]},locales),[]);
 assert.deepEqual(validateInternationalPages({version:1,pages:[ja]},locales),[ja]);
 for(const invalid of [{...ja,reviewed:false},{...ja,path:"/teacher/live"},{...ja,locale:"en"},{...ja,lastmod:"2026-02-30"},{...ja,title:" "}]){
  assert.throws(()=>validateInternationalPages({version:1,pages:[invalid]},locales));
 }
 assert.throws(()=>validateInternationalPages({version:1,pages:[ja,ja]},locales),/Duplicate/);
});
test("canonical URLs and hreflang include only actual published counterparts",()=>{
 assert.equal(canonicalUrl("zh-TW","/"),"https://koolo.app/");
 assert.equal(canonicalUrl("pt-BR","/teacher"),"https://koolo.app/pt-BR/teacher/");
 assert.deepEqual(alternatesFor("/teacher",["zh-TW","en","ja"]).map(x=>x.language),["zh-Hant","en","ja","x-default"]);
 assert.deepEqual(alternatesFor("/learn",["ja","es"]).map(x=>x.language),["ja","es"]);
});
test("exact public localized paths take precedence and other routes remain noindex",()=>{
 const preview=locales.filter(x=>x.stage!=="published");
 assert.deepEqual(internationalRedirectRules(preview,[]),["/ja/* /ja/ 200","/es/* /es/ 200"]);
 assert.deepEqual(internationalRedirectRules(preview,[ja]),["/ja/teacher /ja/teacher/ 301","/ja/teacher/ /ja/teacher/ 200","/ja/* /_app-noindex 200","/es/* /es/ 200"]);
});
test("publication writes real localized HTML, reciprocal alternatives and sitemap without changing unrelated entries",()=>{
 const out=mkdtempSync(join(tmpdir(),"koolo-intl-"));
 try{
  const sitemap='<urlset><url><loc>https://koolo.app/teacher/</loc><lastmod>2026-11-01</lastmod></url><url><loc>https://koolo.app/en/teacher/</loc></url><url><loc>https://koolo.app/story/</loc></url></urlset>';
  for(const [locale,folder] of [["zh-TW","teacher"],["en","en/teacher"]]){
   mkdirSync(join(out,folder),{recursive:true});
   writeFileSync(join(out,folder,"index.html"),'<html><head><meta name="robots" content="index,follow"><link rel="canonical" href="'+canonicalUrl(locale,"/teacher")+'"><link rel="alternate" hreflang="en" href="https://koolo.app/en/teacher/"></head><body>original</body></html>');
  }
  const rendered=new Map([["ja:/teacher",'<div class="app-header"><h1>AI 英会話</h1></div>']]);
  const makeHtml=(entry,body,links)=>'<html lang="ja"><head><meta name="robots" content="index,follow">'+localizedSeoHead(entry,links)+'</head><body>'+body+'</body></html>';
  assert.equal(publishInternationalPages({out,pages:[],rendered,makeHtml,sitemap}),sitemap);
  assert.throws(()=>publishInternationalPages({out,pages:[ja],rendered:new Map(),makeHtml,sitemap}),/Missing localized SSG/);
  const result=publishInternationalPages({out,pages:[ja],rendered,makeHtml,sitemap});
  for(const folder of ["teacher","en/teacher","ja/teacher"]){
   const html=readFileSync(join(out,folder,"index.html"),"utf8");
   for(const lang of ["zh-Hant","en","ja","x-default"])assert.equal((html.match(new RegExp('hreflang="'+lang+'"','g'))||[]).length,1);
  }
  assert.match(result,/<loc>https:\/\/koolo\.app\/ja\/teacher\/<\/loc><lastmod>2026-11-28<\/lastmod>/);
  assert.equal((result.match(/hreflang="ja"/g)||[]).length,3);
  assert.ok(result.includes("<url><loc>https://koolo.app/story/</loc></url>"));
  assert.ok(!result.includes("/es/"));
 }finally{rmSync(out,{recursive:true,force:true});}
});
