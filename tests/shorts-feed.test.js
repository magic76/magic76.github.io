const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const load=p=>readFileSync(path.join(root,p),"utf8");

test("Crew Shorts ships feed as external data, not TypeScript",()=>{
 const feed=JSON.parse(load("features/teacher/shorts/posts.json"));
 assert.equal(feed.schema,1);
 assert.equal(feed.kind,"crew-shorts");
 assert.ok(feed.posts.length>=10);
 assert.equal(new Set(feed.posts.map(p=>p.id)).size,feed.posts.length);
 for(const post of feed.posts){
  assert.match(post.friendId,/^[a-z0-9-]+$/);
  assert.match(post.image,/^https:\/\//);
  assert.ok(post.caption&&post.storyId&&post.language);
 }
 const page=load("web-spa/src/teacher/ShortsPage.tsx");
 assert.match(page,/fetch\(ENDPOINT/);
 assert.match(page,/loading=\{index>1\?"lazy":"eager"\}/);
 assert.doesNotMatch(page,/import .*posts\.json/);
});
test("Crew Shorts route is lazy and links from Teacher homepage",()=>{
 const app=load("web-spa/src/App.tsx");
 const home=load("web-spa/src/teacher/PracticePage.tsx");
 assert.match(app,/ShortsPage=lazy/);
 assert.match(app,/path="shorts"/);
 assert.match(home,/\/teacher\/shorts/);
});
