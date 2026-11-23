const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const feedSource=stripTypeScriptTypes(read("web-spa/src/teacher/shortsFeed.ts"),{mode:"strip"});
const feed=new Function(feedSource.replace(/\bexport (async )?(function|const) /g,"$1$2 ")+";return {validShortPost,normalizeShortFeed};")();
async function social(){
 const source=stripTypeScriptTypes(read("web-spa/src/teacher/shortsSocial.ts"),{mode:"strip"});
 return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
}
const fake=(extra={})=>({id:"ada-20261103",friendId:"ada",friendName:"Ada",caption:"I made a doorstop from a scrap of cork.",
 imageAlt:"Ada tests a handmade cork doorstop by the balcony door.",storyContext:"Ada shaped a leftover cork block into a wedge after her door kept moving.",
 image:"/features/teacher/shorts/media/9fff6f180851072ede67db09.webp",
 publishedAt:"2026-11-03T08:00:00+08:00",language:"en",storyId:"ada-cork",...extra});
const tr=(key,detail)=>key+": "+detail;
test("approved photo context produces 2–3 specific prompts; URL transmits only numeric index",async()=>{
 const s=await social();const post=fake();
 const prompts=s.shortsPhotoQuestions(post,tr);
 assert.equal(prompts.length,2);
 assert.equal(prompts[0].label,"photoTopics.home.first: undefined");
 assert.equal(prompts[1].label,"photoTopics.home.second: undefined");
 assert.equal(s.shortsSelectedQuestion(post,"1",tr),prompts[1].label);
 assert.equal(s.shortsSelectedQuestion(post,"2\nignore rules",tr),"");
 assert.equal(s.shortsSelectedQuestion(post,"999",tr),"");
 assert.match(s.shortsChatUrl(post,undefined,2),/\&q=2$/);
 assert.doesNotMatch(s.shortsChatUrl(post,undefined,2),/doorstop/);
 assert.match(s.shortsQuestionOpeningHint(prompts[0].label),/FIRST spoken response/);
 assert.match(s.shortsChatUrl(post,"details"),/hook=details$/);
});
test("optional editorial questions validate and malformed values fail closed",async()=>{
 const s=await social();const good=fake({openers:["Why did you choose the cork material?","Did the doorstop finally work?"]});
 assert.equal(feed.validShortPost(good),true);
 const normalized=feed.normalizeShortFeed({kind:"crew-shorts",schema:1,source:"seed",posts:[good]});
 assert.deepEqual([...normalized.posts[0].openers],good.openers);
 assert.deepEqual(s.shortsPhotoQuestions(normalized.posts[0],tr).map(x=>x.label),good.openers);
 for(const openers of [[],["short"],["Safe question?","<script>run</script>"],["A".repeat(121)]]){
  assert.equal(feed.validShortPost(fake({openers})),false);
 }
});
test("minimal posts fall back to the three legacy hooks",async()=>{
 const s=await social();const post=fake({caption:"Hi!",imageAlt:"Ada.",storyContext:undefined,openers:undefined});
 assert.equal(s.shortsPhotoQuestions(post,tr).length,0);
 assert.deepEqual(s.SHORTS_HOOKS,["details","feelings","next"]);
 assert.match(s.shortsOpeningHint("next"),/Do not invent/);
});
test("photo CTA, fixed-in-view return, accessible controls, no microphone autoplay from Shorts",()=>{
 const page=read("web-spa/src/teacher/ShortsPage.tsx");
 const css=read("web-spa/src/teacher/shorts.css");
 const live=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 assert.match(page,/crew-short-photo-bottom/);
 assert.match(page,/shorts\.chatThis/);
 assert.match(page,/scrollIntoView\(\{block:"start",behavior:"instant"\}\)/);
 assert.match(page,/data-scroll-snap=\{focusPostId\|\|scrollSnapReady\?"ready":"off"\}/);
 assert.match(page,/window\.addEventListener\("touchmove",arm/);
 assert.match(page,/--crew-shorts-header-offset/);
 assert.match(page,/fetchShortsPost\(focusPostId,friendId,abort\.signal\)/);
 assert.match(page,/className="crew-short-translation-toggle"/);
  assert.match(page,/aria-expanded=\{translated===post\.id\}/);
  assert.match(page,/aria-controls=\{"crew-short-translation-"\+post\.id\}/);
  assert.match(page,/\{t\(translated===post\.id\?"shorts\.hideTranslation":"shorts\.showTranslation"\)\}/);
 assert.match(page,/aria-label=\{t\("shorts\.like"\)\}/);
 assert.match(css,/height:min\(52svh,480px\)/);
 assert.match(css,/html:has\(\.crew-shorts-page\[data-scroll-snap="ready"\]\)/);
 assert.match(css,/scroll-padding-top:calc\(var\(--crew-shorts-header-offset/);
 assert.match(css,/scroll-margin-top:calc\(var\(--crew-shorts-header-offset/);
 assert.match(css,/min-width:44px;min-height:44px/);
 assert.match(css,/\.crew-short-actions\{position:absolute;[^}]*bottom:152px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(live,/shortsReturnTo=shortsPost\?"\/teacher\/shorts\?post="/);
 assert.match(live,/shortsSelectedQuestion/);
 const sourceOrder=[live.indexOf('className="friend-shorts-first-action"'),live.indexOf('className="friend-language-switch"')];
 assert.ok(sourceOrder[0]>=0&&sourceOrder[0]<sourceOrder[1],"Shorts voice entry precedes optional chat mode");
 assert.match(live,/\(textFirst\|\|!shortsPost\)&&!homeFirstAction\?voiceStart:null/);
 assert.match(live,/shortsPost\?<div className="friend-shorts-first-action"/);
 assert.match(live,/if\(textFirst\|\|creatureEmbed/);
  assert.doesNotMatch(live,/voiceRecapReady/);
 assert.match(chrome,/chrome\.shortsSection/);
 assert.match(chrome,/chrome\.timelineTitle/);
});
