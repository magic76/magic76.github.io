const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>readFileSync(path.join(root,file),"utf8");

test("Teacher home puts photo Shorts after role choice, before intent and learning tools",()=>{
 const home=read("web-spa/src/teacher/PracticePage.tsx");
 const role=home.indexOf('className="section crew-role-gateway"');
 const shorts=home.indexOf("<HomeShortsPreview/>");
 const intents=home.indexOf('className="section crew-daily-intents"');
 const learning=home.indexOf('className="section crew-continue-section"');
 assert.ok(role>=0&&role<shorts&&shorts<intents&&intents<learning);
 assert.doesNotMatch(home,/CREW SHORTS · DEMO/);
});

test("Home preview uses network feed and preserves explicit friend chat navigation",()=>{
 const component=read("web-spa/src/teacher/HomeShortsPreview.tsx");
 assert.match(component,/fetchShortsFeed\(controller.signal\)/);
 assert.match(component,/controller\.abort\(\)/);
 assert.match(component,/\.slice\(0,5\)/);
 assert.match(component,/seen\.has\(post\.friendId\)/);
 assert.match(component,/IntersectionObserver/);
 assert.match(component,/shorts_chat_click/);
 assert.match(component,/loading="lazy"/);
 assert.match(component,/&post=/);
 assert.match(component,/\/teacher\/shorts/);
 assert.match(component,/status==="error"/);
 assert.match(component,/feed\?\.source==="demo"/);
 assert.doesNotMatch(component,/import .*posts\.json|speechSynthesis|SpeechSynthesisUtterance/);
});

test("Home Shorts mobile cards scroll horizontally without a large JS gallery",()=>{
 const styles=read("web-spa/src/teacher/homeShorts.css");
 assert.match(styles,/grid-auto-flow:column/);
 assert.match(styles,/overflow-x:auto/);
 assert.match(styles,/scroll-snap-type:x proximity/);
 assert.match(styles,/grid-template-columns:repeat\(5/);
 assert.match(styles,/aspect-ratio:3\/4/);
 assert.match(styles,/object-fit:contain/);
 assert.doesNotMatch(styles,/aspect-ratio:4\/3/);
 const en=JSON.parse(read("web-spa/src/i18n/locales/en/teacher.json"));
 const zh=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/teacher.json"));
 for(const language of [en,zh])for(const key of ["shortsTitle","shortsIntro","shortsAll","shortsChat","shortsLoading","shortsUnavailable","shortsDisclosure","shortsDemo"]){
  assert.ok(language.practice[key],key+" missing");
 }
});
