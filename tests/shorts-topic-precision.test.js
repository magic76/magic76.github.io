const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {stripTypeScriptTypes}=require("node:module");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>readFileSync(path.join(root,file),"utf8");
const posts=JSON.parse(read("features/teacher/shorts/posts.json")).posts;
const byId=new Map(posts.map(post=>[post.id,post]));
const key=label=>label.match(/^photoTopics\.(\w+)\.(first|second)$/)?.[1];
const translate=label=>label;
async function social(){
 const source=stripTypeScriptTypes(read("web-spa/src/teacher/shortsSocial.ts"),{mode:"strip"});
 return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
}
test("Incidental meals, backdrop words and previous post topics do not select food",async()=>{
 const {shortsPhotoQuestions,shortsSelectedQuestion}=await social();
 const expected={
  "ada-20261107":"craft",   // padded pouch, imageAlt says breakfast alcove
  "ada-20261110":"home",    // flask strap, caption mentions carrying lunch
  "finn-20261109":"sport",  // stairs, caption mentions lunch and sandwich
  "felix-20261109":null,     // jigsaw/clouds, caption mentions lunch
  "isla-20261109":null,      // book, caption mentions lunch
  "maya-20261109":"home",   // rearranged shelf, caption mentions dinner
  "oscar-20261109":null,     // walking route, caption mentions dinner
  "yuna-20261109":"nature", // colour-changing stone, caption mentions lunch
  "max-20261110":null,       // litter picking, imageAlt mentions snack wrapper
  "finn-20261110":"sport", // ball catches, imageAlt contains folding chair
  "ryan-20261108":null,      // fitted sheet, caption mentions breeze
  "isla-20261108":null       // looking at an old map is not a journey
 };
 for(const [id,topic] of Object.entries(expected)){
  const post=byId.get(id); assert.ok(post,"missing audited post "+id);
  const questions=shortsPhotoQuestions(post,translate);
  assert.equal(questions.length,topic?2:0,id);
  assert.equal(key(questions[0]?.label||"")??null,topic,id);
  assert.notEqual(key(questions[0]?.label||""),"food",id);
  assert.equal(shortsSelectedQuestion(post,"0",translate),questions[0]?.label||"",id);
 }
});
test("Actual food-photo prompts are food or neutral, never unrelated topics",async()=>{
 const {shortsPhotoQuestions}=await social();
 for(const id of ["hugo-20261109","luna-20261110","hugo-20261107","luna-20261107"]){
  const post=byId.get(id);assert.ok(post,id);
  const questions=shortsPhotoQuestions(post,translate);
  assert.equal(key(questions[0]?.label||""),"food",id);
 }
});
test("Every published post is safe, and scenery/meal cues never override an editor opener",async()=>{
 const {shortsPhotoQuestions,shortsSelectedQuestion}=await social();
 assert.ok(posts.length>=100,"the audited feed contains at least 100 posts");
 for(const post of posts){
  const questions=shortsPhotoQuestions(post,translate);
  assert.ok(questions.length===0||questions.length===2||questions.length===3,post.id);
  for(const [i,question] of questions.entries()){
   assert.equal(question.index,i,post.id);
   assert.equal(typeof question.label,"string",post.id);
   assert.equal(shortsSelectedQuestion(post,String(i),translate),question.label,post.id);
  }
 }
 const base=byId.get("ada-20261107");assert.ok(base);
 assert.equal(key(shortsPhotoQuestions({...base,caption:"A small scene outside.",imageAlt:"Dumplings for breakfast at a train window, a baking class in the distance."},translate)[0]?.label||""),undefined);
 assert.deepEqual(shortsPhotoQuestions({...base,openers:["What part did you sew?","Did it fit?"]},translate).map(q=>q.label),["What part did you sew?","Did it fit?"]);
});
