const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=relative=>readFileSync(path.join(root,relative),"utf8");
const records=JSON.parse(read("features/teacher/shorts/posts.json")).posts;
async function social(){
 const source=stripTypeScriptTypes(read("web-spa/src/teacher/shortsSocial.ts"),{mode:"strip"});
 return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
}
function dictionary(locale){return JSON.parse(read(`web-spa/src/i18n/locales/${locale}/home.json`)).shorts.photoTopics}
function translator(locale){const topics=dictionary(locale);return key=>{
 const [,topic,variant]=key.split(".");
 const text=topics?.[topic]?.[variant];
 assert.ok(typeof text==="string"&&text.length>0,locale+":"+key);
 return text;
}}
test("Current published Shorts use compact contextual zh-TW questions and safe fallbacks",async()=>{
 const {shortsPhotoQuestions,shortsSelectedQuestion}=await social();
 const translate=translator("zh-TW");
 let specific=0;
 assert.ok(records.length>=100,"audit at least 100 published posts");
 for(const post of records){
  const questions=shortsPhotoQuestions(post,translate);
  if(!questions.length)continue;
  specific++;
  assert.equal(questions.length,2,post.id);
  for(const {label,index} of questions){
   assert.ok([...label].length<=18,post.id+": too long: "+label);
   assert.doesNotMatch(label,/[\u2026…]/,post.id);
   assert.doesNotMatch(label,/[A-Za-z]{5,}/,post.id+": English phrase escaped: "+label);
   assert.doesNotMatch(label,/[「」“”]/,post.id+": caption quote escaped: "+label);
   assert.equal(shortsSelectedQuestion(post,String(index),translate),label,post.id);
  }
 }
 // Conservative coverage is deliberate: an irrelevant first question is worse than
 // falling back to the existing neutral hooks for an ambiguous caption.
 assert.ok(specific>=20,"expected some unambiguous real-photo prompts; got "+specific);
 const representative={
  "ada-20261107":"做的時候順利嗎？",
  "hugo-20261109":"這次味道怎麼樣？",
  "luna-20261110":"這次味道怎麼樣？",
  "finn-20261109":"這次練得怎麼樣？",
  "maya-20261109":"怎麼想到這個改法？",
  "ryan-20261109":"你怎麼找到問題的？",
  "yuna-20261109":"怎麼注意到這一幕的？",
  "noah-20261105":"路上最意外的是什麼？",
  "ryan-20261105":"做的時候順利嗎？"
 };
 for(const [id,expected] of Object.entries(representative)){
  const post=records.find(post=>post.id===id);
  assert.ok(post,"missing audited post "+id);
  assert.equal(shortsPhotoQuestions(post,translate)[0]?.label,expected,id);
 }
 for(const id of ["max-20261110","felix-20261109","isla-20261109","oscar-20261109"]){
  const post=records.find(post=>post.id===id);
  assert.ok(post,id);
  assert.deepEqual(shortsPhotoQuestions(post,translate),[],id);
 }

});
test("Every locale has identical photo-topic keys, no placeholder interpolation",()=>{
 const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
 const baseline=dictionary("en");const topics=Object.keys(baseline).sort();
 assert.deepEqual(topics,["craft","find","food","home","nature","repair","sport","travel"]);
 for(const loc of locales){
  const actual=dictionary(loc);
  assert.deepEqual(Object.keys(actual).sort(),topics,loc);
  for(const key of topics){
   assert.deepEqual(Object.keys(actual[key]).sort(),["first","second"],loc+":"+key);
   for(const phrase of Object.values(actual[key])){
    assert.ok(phrase.trim(),loc+":"+key);
    assert.doesNotMatch(phrase,/\{\{|\}\}/,loc+":"+key);
   }
  }
 }
});
