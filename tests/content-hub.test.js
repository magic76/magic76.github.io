const test=require("node:test");
const assert=require("node:assert/strict");
const {pathToFileURL}=require("node:url");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const importModule=name=>import(pathToFileURL(path.join(root,"scripts",name)));
const moment=(i)=>({id:"zoe-"+String(i).padStart(5,"0"),friendId:"zoe",friendName:"Zoe",
 caption:"An original moment number "+i,image:"/features/teacher/shorts/media/a12345678901234567890123.webp",
 publishedAt:new Date(Date.UTC(2026,9,1,0,i)).toISOString(),language:"en",storyId:"zoe-arc"});
test("Shorts v2 archive paginates 125 stories, keeps ID lookup and deterministic URLs",async()=>{
 const {createShortsArchive,SHORTS_PAGE_SIZE}=await importModule("shorts-v2.mjs");
 const posts=Array.from({length:125},(_,i)=>moment(i));
 const r=createShortsArchive(posts,{source:"daily",generatedAt:"2026-10-18T00:00:00Z"});
 assert.equal(SHORTS_PAGE_SIZE,50);
 assert.equal(r.pages.length,3);
 assert.deepEqual(r.pages.map(p=>p.data.posts.length),[50,50,25]);
 assert.equal(r.index.total,125);
 assert.equal(Object.keys(r.index.lookup).length,125);
 assert.equal(r.pages[0].data.posts[0].id,"zoe-00124");
 assert.equal(r.pages[0].data.nextPage,r.pages[1].url);
 assert.equal(r.pages[2].data.nextPage,null);
 for(const page of r.pages)for(const post of page.data.posts)
  assert.equal(r.index.lookup[post.id],page.url);
 assert.deepEqual(createShortsArchive(posts,{source:"daily",generatedAt:"2026-10-18T00:00:00Z"}),r);
});
test("Content Hub v2 validates image and video metadata and explicit editorial transitions",async()=>{
 const {asMomentRecord,asArticleRecord,validateMediaAsset,transitionContent}=await importModule("content-hub.mjs");
 const p=asMomentRecord({...moment(1),image:"media/zoe.webp",translationZh:"新的一天"},"approved");
 assert.equal(p.type,"moment");
 assert.equal(p.media[0].url,"/content/crew-shorts/approved/media/zoe.webp");
 assert.equal(transitionContent(p,"scheduled").status,"scheduled");
 assert.equal(transitionContent({...p,status:"scheduled"},"published").status,"published");
 assert.throws(()=>transitionContent(p,"archived"),/Disallowed/);
 assert.equal(validateMediaAsset({type:"video",assetId:"clip-1",url:"https://cdn.example.com/clip.mp4",posterUrl:"/poster.webp",durationSec:15}).type,"video");
 assert.throws(()=>validateMediaAsset({type:"video",assetId:"clip-1",url:"javascript:alert(1)"}),/Invalid/);
 const a=asArticleRecord({id:"123abcdef",title:"Research update",publishedAt:"2026-10-18T00:00:00Z"},"2026-10-18");
 assert.equal(a.type,"article");
 assert.equal(a.id,"research-2026-10-18-123abcdef");
});
test("Public v1 is capped at 100 but archival source remains append-only",()=>{
 const fs=require("node:fs");
 const pub=fs.readFileSync(path.join(root,"scripts/publish-shorts-pages.mjs"),"utf8");
 const gen=fs.readFileSync(path.join(root,"scripts/generate-shorts-daily.mjs"),"utf8");
 assert.match(pub,/const legacyPosts=posts.slice\(0,100\)/);
 assert.match(pub,/createShortsArchive\(posts/);
 assert.match(gen,/const retained=all;/);
 assert.doesNotMatch(gen,/all.slice\(-100\)/);
});
