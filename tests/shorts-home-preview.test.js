const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>readFileSync(path.join(root,file),"utf8");

test("Photo Shorts and friend intents live in Chat; teacher hub stays focused",()=>{
 const home=read("web-spa/src/teacher/PracticePage.tsx");
 const chat=read("web-spa/src/pages/CrewSectionPage.tsx");
 const friendCards=read("web-spa/src/friends/FriendIntentCards.tsx");
 assert.doesNotMatch(home,/HomeShortsPreview|crew-daily-intents|crew-role-entry friend/);
 assert.match(chat,/section==="chat"/);
 assert.match(chat,/<FriendIntentCards\/>/);
 assert.match(chat,/<HomeShortsPreview maxPosts=\{3\}/);
 assert.match(friendCards,/intent=share/);
 assert.match(friendCards,/intent=speak/);
 assert.doesNotMatch(home,/CREW SHORTS · DEMO/);
});

test("Home preview uses network feed and preserves explicit friend chat navigation",()=>{
 const component=read("web-spa/src/teacher/HomeShortsPreview.tsx");
 assert.match(component,/fetchShortsFeed\(controller.signal\)/);
 assert.match(component,/shuffleShortsPosts\(value.posts\)/);
 assert.match(component,/setFeed\(\{\.\.\.value,posts:shuffleShortsPosts\(value.posts\)\}\)/);
 assert.ok(component.indexOf("shuffleShortsPosts(value.posts)")<component.indexOf("const seen=new Set<string>()"),"shuffle before friend dedupe and slicing");
 assert.match(component,/controller\.abort\(\)/);
 assert.match(component,/maxPosts=3/);
 assert.match(component,/\.slice\(0,maxPosts\)/);
 assert.match(component,/excludeFriendIds\.includes\(post\.friendId\)/);
 assert.match(component,/seen\.has\(post\.friendId\)/);
 assert.match(component,/gesture\.current/);
 assert.match(component,/ref=\{sliderRef\}/);
 assert.match(component,/crew-home-short-photo-overlay/);
 assert.match(component,/atEnd:element\.scrollWidth-element\.clientWidth-element\.scrollLeft<=3/);
 assert.match(component,/pullRef\.current>=72/);
 assert.match(component,/navigate\("\/teacher\/shorts"\)/);
 assert.match(component,/IntersectionObserver/);
 assert.match(component,/threshold:0.35/);
 assert.match(component,/data-visible/);
 assert.match(component,/prefers-reduced-motion: reduce/);
 assert.match(component,/shorts_chat_click/);
 assert.match(component,/loading="lazy"/);
 assert.match(component,/to=\{"\/teacher\/shorts\?post="\+encodeURIComponent\(post.id\)\}/);
 assert.match(component,/shortsChatUrl\(post,undefined,0\)/);
 assert.doesNotMatch(component,/crew-home-short-chat|\/friend\/live\?id=/);
 assert.match(component,/\/teacher\/shorts/);
 assert.match(component,/status==="error"/);
 assert.match(component,/feed\?\.source==="demo"/);
 assert.doesNotMatch(component,/import .*posts\.json|speechSynthesis|SpeechSynthesisUtterance/);
});

test("Home Shorts mobile cards scroll horizontally without a large JS gallery",()=>{
 const styles=read("web-spa/src/teacher/homeShorts.css");
 assert.match(styles,/display:flex/);
 assert.match(styles,/overflow-x:auto/);
 assert.match(styles,/scroll-snap-type:x proximity/);
 assert.match(styles,/crew-home-short-end/);
 assert.match(styles,/flex:0 0 clamp\(185px,23vw,235px\)/);
 assert.match(styles,/aspect-ratio:3\/4/);
 assert.match(styles,/object-fit:contain/);
 assert.doesNotMatch(styles,/aspect-ratio:4\/3/);
 const en=JSON.parse(read("web-spa/src/i18n/locales/en/teacher.json"));
 const zh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/teacher.json"));
 for(const language of [en,zh])for(const key of ["shortsTitle","shortsIntro","shortsAll","shortsChat","shortsLoading","shortsUnavailable","shortsDisclosure","shortsDemo","shortsPullHint","shortsReleaseHint"]){
  assert.ok(language.practice[key],key+" missing");
 }
});


test("Opening a home photo previews the selected full post instead of dialing Live",()=>{
 const preview=read("web-spa/src/teacher/HomeShortsPreview.tsx");
 const feed=read("web-spa/src/teacher/ShortsPage.tsx");
 const photo=preview.match(/<Link className="crew-home-short-photo"[\s\S]*?<\/Link>/)?.[0]||"";
 assert.match(photo,/\/teacher\/shorts\?post=/);
 assert.doesNotMatch(photo,/shortsChatUrl/);
 assert.match(preview,/crew-home-short-question/);
 assert.match(feed,/const focusPostId=searchParams\.get\("post"\)/);
 assert.match(feed,/ordered\.unshift\(\.\.\.ordered\.splice\(at,1\)\)/);
});
