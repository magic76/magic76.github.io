const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];

// Import pure route validation through its public ESM interface (no portrait bundles).
let link;
test("share-link parser has exact tab, friend, game and post allowlists",async()=>{
 link=await import("../web-spa/src/pages/homeDeepLink.mjs");
 const {readHomeDeepLink:parse,HOME_FRIEND_IDS,HOME_FRIEND_NAMES}=link;
 const ids="zoe noah iris max yuna felix luna theo isla hugo ada finn maya oscar bella ryan".split(" ");
 assert.deepEqual([...HOME_FRIEND_IDS],ids);
 for(const tab of ["chat","learn","fortune","play"]){assert.equal(parse("?tab="+tab).tab,tab)}
 for(const id of ids){
  assert.equal(parse("?tab=chat&friend="+id).friend,id);
  assert.equal(HOME_FRIEND_NAMES[id],id[0].toUpperCase()+id.slice(1));
  assert.equal(parse("?tab=learn&friend="+id).friend,null);
 }
 for(const game of ["1a2b","connect4","reversi"]){
  assert.equal(parse("?tab=play&game="+game).game,game);
  assert.equal(parse("?tab=chat&game="+game).game,null);
 }
 for(const input of ["?tab=admin&friend=zoe","?tab=%3Cscript%3E","?tab=chat&friend=admin","?tab=chat&friend=%2Ffriend%2Flive","?tab=play&game=admin","?short=%3Cscript%3E"]){
  const result=parse(input);assert.equal(result.friend,null,input);assert.equal(result.game,null,input);assert.equal(result.short,null,input);
 }
 assert.deepEqual(parse("?short=ada-20261103&tab=play&friend=zoe&game=1a2b"),{tab:"chat",friend:null,game:null,short:"ada-20261103"});
 assert.deepEqual(parse("?tab=chat&friend=zoe&short=a--"),{tab:"chat",friend:null,game:null,short:"a--"});
 assert.equal(parse("?short=a_" ).short,null);
 assert.equal(parse("?short="+"a".repeat(97)).short,null);
 assert.deepEqual(parse("?tab=chat&friend=<script>"),{tab:"chat",friend:null,game:null,short:null});
});

test("homepage friend display names mirror authorized profile IDs without importing portraits",()=>{
 const src=read("web-spa/src/friends/friendProfiles.ts");
 const names=[...src.matchAll(/"id":"([a-z]+)","name":"([A-Za-z]+)"/g)].map(m=>[m[1],m[2]]);
 assert.equal(names.length,16);
 for(const [id,name] of names)assert.equal(link.HOME_FRIEND_NAMES[id],name);
 const code=read("web-spa/src/pages/homeDeepLink.mjs");
 assert.doesNotMatch(code,/friendProfiles|crew_friend_.*webp|homeHooks|taipeiHookIndex|HOME_HOOK_COUNT/);
});

test("SSR renders chat, and only mount effect applies sanitized URL hints",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx"),home=read("web-spa/src/pages/HomePage.tsx");
 assert.match(portal,/useState<PortalMode>\("chat"\)/);
 assert.match(portal,/useEffect\(\(\)=>\{\s*const link=readHomeDeepLink\(window.location.search\)/);
 assert.match(portal,/if\(link.tab\)setMode\(link.tab\)/);
 assert.match(portal,/const selectedPost=deepLink.short\?shortsFeed\?\.posts.find\(post=>post.id===deepLink.short\)/);
 assert.match(portal,/shortsChatUrl\(selectedPost,undefined,questions.length\?0:undefined\)/);
 assert.match(portal,/shortsPhotoQuestions\(selectedPost/);
 assert.match(portal,/shorts_hook_click","shorts_home"/);
 assert.match(portal,/shorts_chat_click","shorts_home"/);
 assert.match(portal,/friendId==="zoe"\?HOME_ZOE/);
 assert.match(portal,/mode==="play"\?"\/games\/"\+gameId/);
 assert.match(portal,/const destination=exhausted\?"\/account#settings-gemini":shortsDestination\|\|/);
 assert.match(portal,/&from=home&chat=text/);
 assert.doesNotMatch(portal,/pushState|replaceState|setInterval|location.search.*(prompt|system)/);
 assert.match(home,/fetchShortsFeed\(controller.signal\)/);
 assert.equal((home.match(/fetchShortsFeed\(controller.signal\)/g)||[]).length,1);
 assert.match(home,/<HomePortal shortsFeed=\{shortsFeed\}\/>/);
 assert.match(home,/<HomeShortsPreview sharedFeed=\{shortsFeed\} sharedStatus=\{shortsStatus\}\/>/);
 const preview=read("web-spa/src/teacher/HomeShortsPreview.tsx");
 assert.match(preview,/if\(sharedStatus!==undefined\)return/);
 assert.match(preview,/const feed=sharedStatus===undefined\?ownFeed:sharedFeed/);
 assert.match(preview,/const status=sharedStatus\?\?ownStatus/);
 assert.match(preview,/return\(\)=>controller.abort\(\)/);
 const friend=read("web-spa/src/friends/FriendLivePage.tsx");
 assert.match(friend,/HOME_FRIEND_IDS.includes\(params.get\("id"\)\|\|""\)/);
});

test("deep-link translations are string leaves in all eleven locales",()=>{
 for(const locale of locales){
  const world=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/home.json`)).world;
  for(const key of ["chatTrialWith","chatNeutralWith","chatWithFriend","shortsFallback","game1a2b","gameConnect4","gameReversi"]){
   assert.equal(typeof world[key],"string",locale+" "+key);
   assert.ok(world[key].length>0);
  }
  for(const key of ["chatTrialWith","chatNeutralWith","chatWithFriend"])assert.match(world[key],/\{\{name\}\}/);
  assert.doesNotMatch(world.chatTrialWith,/5/);
 }
});
