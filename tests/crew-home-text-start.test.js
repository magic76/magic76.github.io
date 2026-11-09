const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const locales=["zh-TW","en","de","es","fr","id","ja","ko","pt-BR","th","vi"];

test("chat destinations use text mode but retain exhausted quota redirect",()=>{
 const portal=read("web-spa/src/pages/HomePortal.tsx");
 const bubble=read("web-spa/src/pages/HomeLiveBubble.tsx");
 const line=read("web-spa/src/pages/HomeDiscoveryLine.tsx");
 const onboarding=read("web-spa/src/onboarding/OnboardingGate.tsx");
 assert.match(portal,/const HOME_ZOE=ZOE\+"&from=home&chat=text"/);
 assert.match(portal,/friendId==="zoe"\?HOME_ZOE:"\/friend\/live\?id="\+friendId\+"&from=home&chat=text"/);
 assert.match(portal,/const destination=exhausted\?"\/account#settings-gemini":shortsDestination\|\|/);
 assert.match(portal,/const teacherDestination=exhausted\?"\/account#settings-gemini"/);
 assert.match(portal,/const cta=hasKey\?"world.chatWithFriend":exhausted\?"world.chatExhausted":trialAvailable\?"world.chatTrialWith":"world.chatNeutralWith"/);
 assert.match(portal,/mode==="chat"&&!exhausted\?<img className="crew-portal-cta-avatar"/);
 assert.match(portal,/mode==="chat"&&ready&&!hasKey&&trial.resolved&&trial.enabled&&trial.remaining!==null&&trial.remaining>0/);
 assert.match(portal,/trackUsageEvent\("home_entry_click",exhausted&&\(mode==="chat"\|\|mode==="learn"\)\?"settings":current.entry\)/);
 assert.match(bubble,/const ZOE_LIVE="\/friend\/live\?id=zoe&from=home&entry=bubble"/);
 assert.match(bubble,/<Icon name=\{needsSetup\?"settings":"mic"\}\/>/);
 assert.match(bubble,/trial\.remaining===0/);
 assert.match(bubble,/const target=needsSetup\?"\/account#settings-gemini":ZOE_LIVE/);
 assert.match(bubble,/trackUsageEvent\("home_entry_click",needsSetup\?"settings":"friend"\)/);
 assert.match(line,/to:"\/friend\/live\?id=zoe&from=home&chat=text"/);
 assert.match(onboarding,/chat:"\/friend\/live\?id=zoe&from=home&chat=text"/);
});

test("friend text empty state offers one-tap starters and preserves verification",()=>{
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 const starters=read("web-spa/src/live/TextChatStarters.tsx");
 const style=read("web-spa/src/live/TextChatPanel.css");
 assert.match(panel,/historyReady&&!messages.length&&!draft.trim\(\)&&!busy&&sessionScope.startsWith\("friend:"\)/);
 assert.match(panel,/<TextChatStarters onPick=\{sentence=>void sendMessage\(sentence\)\}\/>/);
 assert.match(starters,/onClick=\{\(\)=>onPick\(t\("textStarters\."\+key\)\)\}/);
 assert.match(starters,/type="button"/);
 assert.doesNotMatch(starters,/send\(|submit\(|fetch\(|getUserMedia\(/);
 assert.match(panel,/onSubmit=\{event=>\{event.preventDefault\(\);void sendMessage\(draft\)\}\}/);
 assert.match(panel,/sendGuestTextWithRenewal/);
 assert.match(style,/\.crew-text-starter\{[^}]*min-height:44px/);
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
 assert.ok(Buffer.byteLength(panel)<26000);
});

test("starter click shares sendMessage, pending draft and Turnstile dispatch with submit",()=>{
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 assert.match(panel,/async function sendMessage\(text:string\)/);
 assert.match(panel,/const value=text.trim\(\).slice\(0,1200\)/);
 assert.match(panel,/<TextChatStarters onPick=\{sentence=>void sendMessage\(sentence\)\}\/>/);
 assert.doesNotMatch(panel,/<TextChatStarters onPick=\{setDraft\}\/>/);
 assert.match(panel,/onSubmit=\{event=>\{event.preventDefault\(\);void sendMessage\(draft\)\}\}/);
 assert.match(panel,/pendingSend.current=\{before:messages,value,sent:false\}/);
 assert.match(panel,/writePendingTextDraft\(sessionScope,\{text:value,sent:false\}\)/);
 assert.match(panel,/const challengeToken=await waitForChallenge\(\)/);
 assert.match(panel,/markDispatched\(\)/);
});

test("11 locales offer three string starters and text-first CTAs, teacher voice copy intact",()=>{
 for(const lang of locales){
  const home=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/home.json`));
  const friends=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/friends.json`));
  for(const key of ["chatTrialWith","chatNeutralWith","chatWithFriend"]){
   assert.match(home.world[key],/\{\{name\}\}/,lang+" "+key);
  }
  assert.doesNotMatch(home.world.chatTrialWith,/5/,lang);
  assert.match(home.world.teacherTrial,/5/,lang);
  for(const key of ["heading","cafe","intro","smalltalk"]){
   assert.equal(typeof friends.textStarters[key],"string",lang+" "+key);
   assert.ok(friends.textStarters[key].trim());
  }
  assert.doesNotMatch(friends.textStarters.heading,/edit|bearbeit|modifiable|修|編集|수정|editar|แก้ไข|sửa|bisa diedit/i,lang+" heading must not imply editing");
  assert.equal(typeof home.liveBubble.start,"string");
 }
});
