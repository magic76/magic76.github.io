const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {stripTypeScriptTypes}=require("node:module");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>readFileSync(path.join(root,file),"utf8");
const posts=JSON.parse(read("features/teacher/shorts/posts.json")).posts;
const byId=new Map(posts.map(post=>[post.id,post]));
const translate=key=>key;
async function social(){
 const source=stripTypeScriptTypes(read("web-spa/src/teacher/shortsSocial.ts"),{mode:"strip"});
 return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
}
test("#5: Ryan's 11/11 library return is not a repair",async()=>{
 const {shortsPhotoQuestions,shortsSelectedQuestion,SHORTS_HOOKS}=await social();
 const post=byId.get("ryan-20261111");
 assert.ok(post,"Ryan's published 11/11 story must exist");
 assert.match(post.caption,/repair manual/i);
 assert.deepEqual(shortsPhotoQuestions(post,translate),[]);
 assert.equal(shortsSelectedQuestion(post,"0",translate),"");
 // ShortsPage displays the existing neutral hooks when no photo questions exist.
 assert.deepEqual(SHORTS_HOOKS,["details","feelings","next"]);
});
test("#5: bare repair terms never override the story, real fixes still qualify",async()=>{
 const {shortsPhotoQuestions}=await social();
 const base=byId.get("ryan-20261111");assert.ok(base);
 const topic=caption=>shortsPhotoQuestions({...base,caption},translate)[0]?.label||"";
 for(const caption of [
  "I bought a repair manual for my bike.",
  "At the repair meetup, I borrowed a thermal camera by the window.",
  "The repaired basket looked nice in the display.",
  "My jacket has a tiny repair and a very large backstory.",
  "The oversized repair manual went through the doorway sideways."
 ])assert.equal(topic(caption),"",caption);
 for(const caption of [
  "I repaired the bike yesterday.",
  "I patched the bike tube myself.",
  "Flat tire fixed. My bike and I are speaking again.",
  "I replaced the mouse feet.",
  "My lunch table rocked. A folded card fixed it.",
  "I tightened two screws on the squeaky cupboard hinge."
 ])assert.equal(topic(caption),"photoTopics.repair.first",caption);
 assert.equal(topic("First ginger duck of the season. So much steam!"),"photoTopics.food.first");
 assert.equal(topic("I made a padded pouch for my notebook."),"photoTopics.craft.first");
});
test("#5: a short errand is not a journey, but actual travel remains travel",async()=>{
 const {shortsPhotoQuestions}=await social();
 const base=byId.get("ryan-20261111");assert.ok(base);
 const topic=caption=>shortsPhotoQuestions({...base,caption},translate)[0]?.label||"";
 for(const caption of [
  "One more trip to the desk, then.",
  "I made another trip to the shop for a missing screw.",
  "The trip to the library counter took longer than expected.",
  "My last trip back to the desk was for a book.",
  "I took a trip home to get the forgotten book."
 ])assert.equal(topic(caption),"",caption);
 for(const caption of [
  "I took the train to the coast this morning.",
  "I walked the trail around the lake this afternoon.",
  "We took the ferry back from the island today."
 ])assert.equal(topic(caption),"photoTopics.travel.first",caption);
});
test("#5: historical Shorts archive keeps audited classification exceptions",async()=>{
 const {shortsPhotoQuestions}=await social();
 const index=JSON.parse(read("features/teacher/shorts/v2/index.json"));
 const archive=index.pages.flatMap(({url})=>JSON.parse(read(url.slice(1))).posts);
 assert.ok(archive.length>=415,"The audited historical archive remains accessible");
 assert.equal(new Set(archive.map(post=>post.id)).size,archive.length);
 const byArchiveId=new Map(archive.map(post=>[post.id,post]));
 const topic=id=>{
  const post=byArchiveId.get(id);
  assert.ok(post,"Missing historical post "+id);
  return shortsPhotoQuestions(post,translate)[0]?.label||"";
 };
 for(const id of ["maya-20261113","ryan-20261112","ryan-20261111","theo-20261105","oscar-20261019"])
  assert.equal(topic(id),"",id);
 assert.equal(topic("ryan-20261102"),"photoTopics.repair.first");
 assert.equal(topic("ryan-20261109"),"photoTopics.repair.first");
 assert.equal(topic("hugo-20261109"),"photoTopics.food.first");
});
