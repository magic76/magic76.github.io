const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=relative=>readFileSync(path.join(root,relative),"utf8");
const records=JSON.parse(read("features/teacher/shorts/v2/pages/00001.json")).posts;
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
test("Nov 3 real photos use compact conversational zh-TW chips without clipped English",async()=>{
 const {shortsPhotoQuestions,shortsSelectedQuestion}=await social();
 const translate=translator("zh-TW");
 let specific=0;
 for(const post of records.slice(0,32)){
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
 assert.ok(specific>=19,"at least 19 of 32 real posts should classify accurately; got "+specific);
 const representative={
  "ryan-20261103":"你怎麼找到問題的？",
  "felix-20261103":"怎麼想到這個改法？",
  "noah-20261103":"路上最意外的是什麼？",
  "luna-20261103":"最後在哪裡找到的？",
  "bella-20261103":"做的時候順利嗎？",
  "zoe-20261103":"這次練得怎麼樣？"
 };
 for(const [id,expected] of Object.entries(representative)){
  const post=records.find(post=>post.id===id);
  assert.ok(post,"missing authentic post "+id);
  assert.equal(shortsPhotoQuestions(post,translate)[0]?.label,expected,id);
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
