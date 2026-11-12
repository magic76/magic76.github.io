const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const helper="web-spa/src/pages/dailyFortuneReader.ts";
function builder(){
 const source=stripTypeScriptTypes(read(helper),{mode:"strip"}).replace(/^import[^\n]*;\s*$/gm,"").replace(/^export /gm,"");
 return Function(source+"\nreturn buildDailyFortuneContext;")();
}
const sample={date:"2026-11-12",kind:"numerology",headline:"A quieter day",theme:"Choose your own pace",
 do:["Take a break","Listen first"],avoid:"Rush",luckyColor:{name:"Blue"},basis:["Personal cycle 2","Reflection","Key phrase"]};
test("reader uses only computed symbolic card fields, remains deterministic and bounded",()=>{
 const format=builder(),card={...sample,birthDate:"1985-07-06",birthTime:"04:10",city:"Taipei",gender:"male",profile:{birthDate:"1985-07-06"}};
 const result=format(card);
 assert.equal(result,format(card));
 assert.match(result,/Method: Numerology/);
 for(const part of [sample.theme,sample.headline,sample.avoid,sample.luckyColor.name,"Personal cycle 2"])
  assert.ok(result.includes(part),part);
 assert.match(result,/local symbolic data/i);
 assert.match(result,/not instructions/i);
 assert.match(result,/No medical, legal or investment directives/);
 assert.doesNotMatch(result,/1985-07-06|04:10|Taipei|male|birthDate|birthTime|profile\s*[:=]/);
 assert.ok(result.length<=600);
 const long={...sample,kind:"bazi",theme:"X".repeat(2000),headline:"Y".repeat(2000),do:["Z".repeat(2000),"K".repeat(2000)],basis:Array(20).fill("Q".repeat(2000))};
 const bounded=format(long);
 assert.match(bounded,/Method: BaZi/);
 assert.match(bounded,/Theme: /);
 assert.match(bounded,/Basis: /);
 assert.ok(bounded.endsWith("[/ZOE DAILY FORTUNE]"));
 assert.ok(bounded.length<=600);
});
test("local hash failure returns ordinary Zoe starters, no personal system or scope",()=>{
 const friend=read("web-spa/src/friends/FriendLivePage.tsx"),home=read("web-spa/src/pages/DailyTopicCards.tsx");
 assert.match(friend,/friend\.id==="zoe"&&textMode&&params\.get\("quote"\)==="daily"/);
 assert.match(friend,/\^\[a-f0-9\]\{64\}\$/);
 assert.match(friend,/hash:line\?\.hash\|\|"",context:line\?buildDailyFortuneContext\(line\.card\):""/);
 assert.match(friend,/dailyLookup\?\.key===dailyLookupKey&&dailyLookup\.hash===personalChartHash&&dailyLookup\.context/);
 assert.match(friend,/dailyFortune\?"\\n"\+dailyFortune\.context:""/);
 assert.match(friend,/dailyFortune\?":daily:"\+dailyFortune\.hash:""/);
 assert.match(friend,/firstStarter=\{selectedQuestion\|\|\(shortsHook\?shortsHookLabel\(shortsHook,english\):undefined\)\|\|dailyFortuneStarter\|\|dailyQuoteStarter\|\|dailyTopicStarter\}/);
 assert.match(friend,/showStarterWithHistory=\{Boolean\(dailyFortuneStarter\|\|dailyQuoteStarter\)\}/);
 assert.match(friend,/dailyLookupPending\?<p/);
 assert.match(home,/quote=daily&chart=/);
 assert.doesNotMatch(home,/quote="\+quote!/,"no-chart home CTA now directs to fortune setup");
 assert.match(home,/t\("dailyQuote.setupChart"\)/);
 assert.doesNotMatch(friend,/setDraft\(dailyFortuneStarter\)|sendMessage\(dailyFortuneStarter\)/);
});
test("all 11 language packs define both new labels, existing quote labels unchanged",()=>{
 for(const lang of ["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"]){
  const home=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`));
  const friends=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/friends.json`));
  assert.ok(home.dailyQuote.chatRead.length>3,lang);
  assert.ok(friends.dailyFortuneStarter.length>3,lang);
  assert.ok(home.dailyQuote.chat.length>3,lang);
  assert.ok(home.dailyQuote.setupChart.length>5,lang);
  assert.ok(home.dailyQuote.setupHint.length>5,lang);
 }
 assert.equal(JSON.parse(read("web-spa/src/i18n/locales/zh-TW/home.json")).dailyQuote.chat,"跟 Zoe 聊這句");
});
test("compact personal card retains 44px controls, 12px type and reduced-motion",()=>{
 const css=read("web-spa/src/pages/dailyTopicCards.css");
 assert.match(css,/\.daily-quote-action\{[^}]*min-height:44px/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(css,/font-size:13px/);
 assert.match(css,/@media\(max-width:380px\)[^\n]*font-size:12px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.daily-quote-actions--setup\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.daily-quote-benefit\{[^}]*font-size:12px/);
});
