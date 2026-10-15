const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const root=path.resolve(__dirname,"..");
const script=path.join(root,"scripts/publish-shorts-pages.mjs");
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"crew-shorts-pages-"));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const approved=path.join(dir,"approved");
 const target=path.join(dir,"public");
 fs.mkdirSync(path.join(approved,"media"),{recursive:true});
 fs.mkdirSync(target);
 fs.writeFileSync(path.join(approved,"media","zoe.webp"),
  Buffer.concat([Buffer.from("RIFF"),Buffer.from([12,0,0,0]),Buffer.from("WEBPVP8 "),Buffer.alloc(12)]));
 const post=(id,date,image)=>({
  id,friendId:"zoe",friendName:"Zoe",caption:"I paid £7 for coffee.",
  translationZh:"這杯咖啡竟然要七英鎊。",image,
  imageAlt:"Rain outside a café",publishedAt:date+"T08:00:00Z",
  language:"en",storyId:"zoe-cafe-episode"
 });
 const source={schema:1,kind:"crew-shorts",source:"seed",posts:[
  post("zoe-oct-14","2026-10-14","media/zoe.webp"),
  post("zoe-oct-15","2026-10-15","")
 ]};
 const feed=path.join(approved,"posts.json");
 const save=()=>fs.writeFileSync(feed,JSON.stringify(source));
 save();
 const run=(date,extra=[])=>spawnSync(process.execPath,[script,
  "--feed",feed,"--out-dir",target,"--as-of",date,...extra
 ],{cwd:root,encoding:"utf8"});
 return {dir,approved,target,source,save,run};
}
test("Pages publisher generates only due posts and first-party fingerprinted images",t=>{
 const f=fixture(t);
 const result=f.run("2026-10-14");
 assert.equal(result.status,0,result.stderr);
 const feed=JSON.parse(fs.readFileSync(path.join(f.target,"posts.json"),"utf8"));
 assert.equal(feed.posts.length,1);
 assert.equal(feed.posts[0].id,"zoe-oct-14");
 assert.equal(feed.posts[0].translationZh,"這杯咖啡竟然要七英鎊。");
 assert.match(feed.posts[0].image,/^\/features\/teacher\/shorts\/media\/[a-f0-9]{24}\.webp$/);
 const file=path.join(f.target,"media",path.basename(feed.posts[0].image));
 assert.equal(fs.existsSync(file),true);
 assert.equal(feed.source,"seed");
});
test("Pages publisher is idempotent and does not generate daily commits without new stories",t=>{
 const f=fixture(t);
 assert.equal(f.run("2026-10-14").status,0);
 const before=fs.readFileSync(path.join(f.target,"posts.json"),"utf8");
 const result=f.run("2026-10-15");
 assert.notEqual(result.status,0,"due image is absent so the old feed must not be replaced");
 assert.equal(fs.readFileSync(path.join(f.target,"posts.json"),"utf8"),before);
 const again=f.run("2026-10-14");
 assert.equal(again.status,0,again.stderr);
 assert.match(again.stdout,/No feed changes/);
 assert.equal(fs.readFileSync(path.join(f.target,"posts.json"),"utf8"),before);
});
test("Pages dry-run never writes files and missing approved source fails closed",t=>{
 const f=fixture(t);
 const result=f.run("2026-10-14",["--dry-run"]);
 assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/DRY RUN/);
 assert.equal(fs.existsSync(path.join(f.target,"posts.json")),false);
 const bad=spawnSync(process.execPath,[script,"--feed",path.join(f.dir,"missing.json"),
  "--out-dir",f.target,"--dry-run"],{encoding:"utf8"});
 assert.notEqual(bad.status,0);
 assert.match(bad.stderr,/approved posts.json missing/);
});
test("Pages publisher rejects unsafe image paths, invalid roles and placeholders",t=>{
 const f=fixture(t);
 f.source.posts[0].image="../leak.webp";f.save();
 let result=f.run("2026-10-14");
 assert.notEqual(result.status,0);assert.match(result.stderr,/relative local WebP/);
 f.source.posts[0].image="https://images.unsplash.com/example.webp";f.save();
 result=f.run("2026-10-14");
 assert.notEqual(result.status,0);assert.match(result.stderr,/relative local WebP/);
 f.source.posts[0].image="media/zoe.webp";f.source.posts[0].friendId="unknown";f.save();
 result=f.run("2026-10-15");
 assert.notEqual(result.status,0);assert.match(result.stderr,/unknown friend/);
});
test("A future release cannot be published early, but can be simulated in dry-run",t=>{
 const f=fixture(t);
 f.source.posts=[{...f.source.posts[0],id:"zoe-2099",publishedAt:"2099-12-31T08:00:00+08:00"}];
 f.save();
 const early=f.run("2099-12-31");
 assert.equal(early.status,0,early.stderr);
 assert.match(early.stdout,/No approved posts due/);
 assert.equal(fs.existsSync(path.join(f.target,"posts.json")),false);
 const preview=f.run("2099-12-31",["--dry-run"]);
 assert.equal(preview.status,0,preview.stderr);
 assert.match(preview.stdout,/DRY RUN: 1 due posts/);
});
test("Content inventory warns before the last approved day",()=>{
 const script=path.join(root,"scripts/check-shorts-inventory.mjs");
 const ok=spawnSync(process.execPath,[script,"--today","2026-10-16"],{cwd:root,encoding:"utf8"});
 assert.equal(ok.status,0,ok.stderr);
 assert.match(ok.stdout,/final release 2026-10-18/);
 assert.match(ok.stdout,/::warning::/);
});
test("Scheduled Pages release activates after seed approval and remains independent of R2",()=>{
 const workflow=fs.readFileSync(path.join(root,".github/workflows/crew-shorts-pages.yml"),"utf8");
 assert.match(workflow,/github.event_name != 'pull_request'/);
 assert.match(workflow,/pull_request:/);
 assert.match(workflow,/branches: \[master\]/);
 assert.match(workflow,/workflow_dispatch/);
 assert.match(workflow,/schedule:/);
 assert.match(workflow,/git push origin HEAD:master/);
 assert.doesNotMatch(workflow,/R2_ACCESS_KEY|CLOUDFLARE_API_TOKEN|wrangler/);
 const loader=fs.readFileSync(path.join(root,"web-spa/src/teacher/shortsFeed.ts"),"utf8");
 assert.match(loader,/fetchShortsFeed/);
 assert.doesNotMatch(loader,/import\s+.*posts\.json/);
});
