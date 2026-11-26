const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const ROOT=path.resolve(__dirname,"..");
const read=(file)=>fs.readFileSync(path.join(ROOT,file),"utf8");
const decode=(text)=>text.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const routes=[
 {locale:"zh-TW",prefix:"",page:"",key:"home",intent:"Koolo 酷囉｜AI 英文口說練習"},
 {locale:"zh-TW",prefix:"",page:"teacher/",key:"teacher",intent:"AI 英文口說練習"},
 {locale:"en",prefix:"en/",page:"",key:"home",intent:"Koolo – AI English Speaking Practice"},
 {locale:"en",prefix:"en/",page:"teacher/",key:"teacher",intent:"AI English Speaking Practice"}
];

test("CTR pilot titles remain aligned across SSG, OG, JSON-LD and SPA route metadata",()=>{
 for(const {locale,prefix,page,key,intent} of routes){
  const html=read(prefix+page+"index.html");
  const common=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/common.json"));
  const title=common.seo[key];
  assert.ok(title.startsWith(intent),locale+":"+key+" should lead with the chosen brand and search intent");
  assert.equal(decode(html.match(/<title>([^<]+)<\/title>/)[1]),title,locale+":"+key+" title");
  assert.equal(decode(html.match(/<meta property="og:title" content="([^"]+)">/)[1]),title,locale+":"+key+" OG");
  const jsonld=JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  const pageNode=jsonld["@graph"].find(item=>item["@type"]==="WebPage");
  assert.equal(pageNode.name,title,locale+":"+key+" JSON-LD");
  const desc=html.match(/<meta name="description" content="([^"]+)">/)[1];
  assert.ok(desc.length>=45,locale+":"+key+" useful snippet");
  assert.equal(html.match(/<meta property="og:description" content="([^"]+)">/)[1],desc);
  assert.equal(pageNode.description,decode(desc));
  assert.match(html,/<meta name="robots" content="index,follow">/);
  assert.doesNotMatch(html.split("</head>")[0],/\bGemini\b|\bKey\b/i,locale+":"+key+" no API-key requirement in search snippet");
 }
});

test("CTR pilot does not alter private and preview SPA index policy",()=>{
 assert.match(read("web-spa/index.html"),/name="robots" content="noindex,follow"/);
 assert.match(read("crew-app/index.html"),/name="robots" content="noindex,follow"/);
});
