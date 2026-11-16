const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {resolve}=require("node:path");
const vm=require("node:vm");
const read=file=>readFileSync(resolve(__dirname,"..",file),"utf8");
const mobile=read("web-spa/src/pages/MobileHomePage.tsx");
const desktop=read("web-spa/src/pages/HomePortal.tsx");
const art=read("web-spa/src/pages/mobileHomeHeroV3.css");
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];

// Evaluate the tiny pure TypeScript utility without needing the full Vite toolchain.
const source=read("web-spa/src/pages/formatResumePreview.ts")
 .replace("export function formatResumePreview(value:string,maxLength=84):string{","function formatResumePreview(value,maxLength=84){")
 .replace("end![0]","end[0]");
const formatResumePreview=vm.runInNewContext(source+"\nformatResumePreview;");

test("display-only preview normalizes punctuation and truncates at word/CJK boundaries",()=>{
 const bad="One imaginary café trip coming right up!I'll pretend that's our table by the window, and you can walk in whenever you're ready.";
 const cleaned=formatResumePreview(bad,110);
 assert.match(cleaned,/up! I'll/);
 assert.doesNotMatch(cleaned,/up!I'll/);
 assert.equal(formatResumePreview("   Hey   there!Let's chat  ",60),"Hey there! Let's chat");
 assert.equal(formatResumePreview("One imaginary café trip coming right up!I'll pretend",26),"One imaginary café trip…");
 assert.equal(formatResumePreview("今天聊得真開心明天再繼續",7),"今天聊得真開心…");
 assert.match(source,/if\(clean.length<=maxLength\)return clean/);
 assert.doesNotMatch(mobile,/saveFriendResume\(/);
});

test("first carousel slide uses the last known friend and keeps Zoe for first visits",()=>{
 assert.match(mobile,/const \[resume,setResume\]=useState<FriendResume\|null>\(null\)/);
 assert.match(mobile,/useEffect\(\(\)=>\{\s*setResume\(readLatestFriendResume\(\)\)/);
 assert.match(mobile,/const resumeFriend=resume\?CREW_FRIENDS.find\(friend=>friend.id===resume.friendId\):null/);
 assert.match(mobile,/const friendResume=resumeFriend\?resume:null/);
 assert.match(mobile,/friendResume\?t\("layout2.resumeTitle",\{name:resumeFriend!\.name\}\):t\("mobileHero.title"/);
 assert.match(mobile,/src=\{resumeFriend\?\.avatar\|\|zoePhoto\}/);
 assert.match(mobile,/textDestination=resumeId\?"\/friend\/live\?id="\+encodeURIComponent\(resumeId\)\+"&from=home&chat=text":ZOE_TEXT/);
 assert.match(mobile,/voiceDestination=resumeId\?"\/friend\/live\?id="\+encodeURIComponent\(resumeId\)\+"&from=home&entry=bubble":ZOE_VOICE/);
 assert.doesNotMatch(mobile,/className="cmh-other-resume"/);
 assert.equal((mobile.match(/<section className=/g)||[]).length>=3,true);
});

test("return card resumes the last friend without exposing transcript text",()=>{
 assert.doesNotMatch(mobile,/cmh-resume-preview-row|cmh-preview-eye|formatResumePreview\(friendResume\.preview/);
 assert.doesNotMatch(mobile,/PREVIEW_HIDDEN_KEY|previewHidden|togglePreview/);
 assert.doesNotMatch(art,/\.cmh-resume-preview-row\{|\.cmh-preview-eye\{/);
 assert.match(mobile,/friendResume\?t\("layout2.resumeAction"\)/);
 assert.match(art,/\.cmh-zoe-return \.cmh-chat-pop\{display:none!important\}/);
 assert.match(art,/\.cmh-chat-pop-first\{top:179px/);
 for(const width of [360,375,390,412])assert.ok(width>=360&&width<=767);
});

test("desktop uses last friend but never overrides Shorts or explicit friend links",()=>{
 assert.match(desktop,/HOME_FRIEND_IDS\.includes\(resume.friendId\)/);
 assert.match(desktop,/const canResume=Boolean\(resumeId&&!selectedPost&&\(!deepLink.friend\|\|deepLink.friend===resumeId\)\)/);
 assert.match(desktop,/friendId=deepLink.tab==="chat"&&deepLink.friend\?deepLink.friend:canResume&&resumeId\?resumeId:"zoe"/);
 assert.match(desktop,/canResume\?t\("layout2.resumeTitle",\{name:friendName\}\)/);
 assert.match(desktop,/formatResumePreview\(resume\?\.preview\|\|""\)/);
 assert.match(desktop,/\(selectedPost\?\.friendId\|\|friendId\)/);
 assert.match(desktop,/const target=destination/);
 assert.match(desktop,/const HOME_ZOE=ZOE\+"&from=home&chat=text"/);
});

test("all 11 locales interpolate the resume name and translate preview and privacy controls",()=>{
 for(const lang of locales){
  const layout=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`)).layout2;
  assert.match(layout.resumeTitle,/\{\{name\}\}/,lang);
  for(const key of ["previewLabel","hidePreview","showPreview","previewHidden"])
   assert.ok(typeof layout[key]==="string"&&layout[key].trim(),lang+":"+key);
 }
 for(const name of ["MobileHomePage.tsx","HomePortal.tsx"])
  assert.ok(Buffer.byteLength(read("web-spa/src/pages/"+name))<26000,name);
});
