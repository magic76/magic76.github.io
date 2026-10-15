const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
// Exercise the actual TS feed parser without requiring npm dependencies.
const filename=path.resolve(__dirname,"../web-spa/src/teacher/shortsFeed.ts");
const source=readFileSync(filename,"utf8");
const compiled=stripTypeScriptTypes(source,{mode:"strip"}).replace(/\bexport (async )?(function|const) /g,"$1$2 ");
const {normalizeShortFeed,validShortPost}=new Function(compiled+";return {normalizeShortFeed,validShortPost};")();
const post=(id,date,friendId="zoe")=>({
 id,friendId,friendName:friendId[0].toUpperCase()+friendId.slice(1),
 caption:"A surprising coffee.",imageAlt:"Friend holding coffee.",
 image:"/features/teacher/shorts/media/9fff6f180851072ede67db09.webp",
 publishedAt:date,language:"en",storyId:friendId+"-coffee"
});
const feed=posts=>({schema:1,kind:"crew-shorts",source:"seed",generatedAt:"2026-10-16T00:00:00+08:00",posts});
const instant="2026-10-16T07:59:59+08:00";
const release="2026-10-16T08:00:00+08:00";
test("Crew Web and Android hide future-dated posts until release",()=>{
 const raw=feed([post("zoe-day1",release)]);
 assert.equal(normalizeShortFeed(raw,Date.parse(instant)).posts.length,0);
 assert.equal(normalizeShortFeed(raw,Date.parse(release)).posts.length,1);
});
test("Crew Web rejects invalid owner, non-first-party image, and malformed date",()=>{
 const invalid=post("zoe-day1",release);
 invalid.friendName="Bella";
 assert.equal(validShortPost(invalid),false);
 const outside=post("zoe-day2",release);
 outside.image="https://example.com/photo.webp";
 assert.equal(validShortPost(outside),false);
 const unknown=post("stranger-day1",release,"stranger");
 assert.equal(validShortPost(unknown),false);
 const malformed=post("zoe-day3","2026-10-16T08:00:00");
 assert.equal(validShortPost(malformed),false);
 assert.throws(()=>normalizeShortFeed(feed([invalid,outside,unknown,malformed]),Date.parse(release)),/No valid Shorts/);
});
test("latest public posts remain ordered and distinct IDs cannot overwrite each other",()=>{
 const raw=feed([post("zoe-day1","2026-10-15T08:00:00+08:00"),post("bella-day1",release,"bella"),post("zoe-day1",release)]);
 const posts=normalizeShortFeed(raw,Date.parse(release)).posts;
 assert.deepEqual(posts.map(p=>p.id),["bella-day1","zoe-day1"]);
});
