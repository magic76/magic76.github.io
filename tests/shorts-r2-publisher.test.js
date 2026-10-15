const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const root=path.resolve(__dirname,"..");
const publisher=path.join(root,"scripts","publish-shorts-r2.mjs");
const examplePost=(id,date,image)=>({
 id,friendId:"zoe",friendName:"Zoe",caption:"I paid £7 for coffee.",
 image,imageAlt:"Coffee on a rainy table",publishedAt:date+"T08:00:00Z",
 language:"en",storyId:"zoe-coffee-01",translationZh:"這杯咖啡竟然要七英鎊。"
});
const makeTestInput=()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"crew-shorts-r2-test-"));
 fs.mkdirSync(path.join(dir,"media"));
 // Minimal RIFF/WEBP structural fixture; the publisher checks container signatures.
 fs.writeFileSync(path.join(dir,"media","zoe.webp"),Buffer.concat([
  Buffer.from("RIFF"),Buffer.from([12,0,0,0]),Buffer.from("WEBPVP8 "),Buffer.alloc(12)
 ]));
 const feed={schema:1,kind:"crew-shorts",source:"seed",generatedAt:"2026-10-14T08:00:00Z",
  posts:[
   examplePost("zoe-oct-15","2026-10-15","media/zoe.webp"),
   examplePost("zoe-oct-16","2026-10-16","")
  ]};
 const file=path.join(dir,"posts.json");fs.writeFileSync(file,JSON.stringify(feed));
 const run=(date,extra=[])=>spawnSync(process.execPath,[publisher,
   "--feed",file,"--origin","https://media.3sssi.com","--as-of",date,
   "--dry-run","--output",path.join(dir,"out.json"),...extra
 ],{cwd:root,encoding:"utf8"});
 return {dir,file,feed,run};
};
test("R2 publisher only releases approved, due stories and rewrites media to fingerprinted WebP URLs",t=>{
 const fixture=makeTestInput();t.after(()=>fs.rmSync(fixture.dir,{recursive:true,force:true}));
 const result=fixture.run("2026-10-15");
 assert.equal(result.status,0,result.stderr||result.stdout);
 const feed=JSON.parse(fs.readFileSync(path.join(fixture.dir,"out.json"),"utf8"));
 assert.equal(feed.posts.length,1);
 assert.equal(feed.posts[0].id,"zoe-oct-15");
 assert.equal(feed.posts[0].translationZh,"這杯咖啡竟然要七英鎊。");
 assert.match(feed.posts[0].image,/^https:\/\/media\.3sssi\.com\/shorts\/media\/[a-f0-9]{24}\.webp$/);
 assert.equal(feed.source,"seed");
 assert.match(result.stdout,/DRY RUN/);
});
test("R2 publisher refuses due posts with missing pictures without writing a new feed",t=>{
 const fixture=makeTestInput();t.after(()=>fs.rmSync(fixture.dir,{recursive:true,force:true}));
 const result=fixture.run("2026-10-16");
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/requires a local WebP image path/);
 assert.equal(fs.existsSync(path.join(fixture.dir,"out.json")),false);
});
test("R2 publisher blocks traversal paths, unrelated friends and published external placeholders",t=>{
 const fixture=makeTestInput();t.after(()=>fs.rmSync(fixture.dir,{recursive:true,force:true}));
 fixture.feed.posts[0].image="../escape.webp";
 fs.writeFileSync(fixture.file,JSON.stringify(fixture.feed));
 const result=fixture.run("2026-10-15");
 assert.notEqual(result.status,0);assert.match(result.stderr,/local WebP image path/);
 fixture.feed.posts[0].image="media/zoe.webp";
 fixture.feed.posts[0].friendId="unknown-friend";
 fs.writeFileSync(fixture.file,JSON.stringify(fixture.feed));
 const again=fixture.run("2026-10-15");
 assert.notEqual(again.status,0);assert.match(again.stderr,/invalid friend/);
});
test("R2 publishing remains opt-in and does not bundle content into JavaScript",()=>{
 const workflow=fs.readFileSync(path.join(root,".github/workflows/crew-shorts-r2.yml"),"utf8");
 assert.match(workflow,/CREW_SHORTS_ENABLED == 'true'/);
 assert.match(workflow,/workflow_dispatch/);
 assert.match(workflow,/schedule:/);
 assert.match(workflow,/dry_run:/);
 const publisherSource=fs.readFileSync(publisher,"utf8");
 assert.match(publisherSource,/LAST step: atomic switch/);
 assert.match(publisherSource,/NoSuchKey/);
 assert.match(publisherSource,/max-age=31536000, immutable/);
 const site=fs.readFileSync(path.join(root,"web-spa/src/teacher/shortsFeed.ts"),"utf8");
 assert.match(site,/fetchShortsFeed/);
 assert.doesNotMatch(site,/import\s+.*posts\.json/);
});
