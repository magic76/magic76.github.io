const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const panelCss=()=>read("web-spa/src/live/TextChatPanel.css");
const friendCss=()=>read("web-spa/src/friends/friends.css");

function keyboardHarness({width=390,viewportHeight=844,innerHeight=844,hasVisual=true}={}){
 const cssValues=new Map(),classes=new Set();
 const style={setProperty:(key,value)=>cssValues.set(key,value),removeProperty:key=>cssValues.delete(key)};
 const stage={classList:{add:key=>classes.add(key),remove:key=>classes.delete(key)}};
 const input={closest:selector=>selector===".crew-text-chat-form input"?input:null};
 const chat=new EventTarget();
 chat.contains=element=>element===input;
 chat.closest=selector=>selector===".live-stage"?stage:null;
 const viewport=hasVisual?new EventTarget():null;
 if(viewport){viewport.height=viewportHeight;viewport.offsetTop=0}
 const browser=new EventTarget();
 browser.innerHeight=innerHeight;
 browser.visualViewport=viewport;
 browser.matchMedia=()=>({matches:width<=640});
 const document={body:{style},activeElement:null,querySelector:selector=>selector===".app-header"?{getBoundingClientRect:()=>({height:59})}:null};
 let cleanup=()=>{};
 const source=stripTypeScriptTypes(read("web-spa/src/live/textChatKeyboard.ts"),{mode:"strip"})
  .replace(/^import .*from "react";\s*/m,"").replace(/^export /gm,"");
 const context={window:browser,document,Event,useEffect:callback=>{cleanup=callback()},
  cancelAnimationFrame:()=>{},requestAnimationFrame:callback=>{callback();return 1}};
 vm.runInNewContext(source+"\nthis.useTextChatKeyboard=useTextChatKeyboard;",context);
 const ref={current:chat};
 context.useTextChatKeyboard(ref);
 return{viewport,browser,document,input,chat,classes,cssValues,cleanup};
}

test("Soft keyboard: focused 390px composer collapses only after viewport shrinks; restores on dismissal",()=>{
 const h=keyboardHarness();let events=0;
 h.chat.addEventListener("crew:text-keyboard-change",()=>events++);
 h.document.activeElement=h.input;
 h.chat.dispatchEvent(new Event("focusin"));
 assert.equal(h.classes.has("crew-text-keyboard-open"),false);
 h.viewport.height=422;
 h.viewport.dispatchEvent(new Event("resize"));
 assert.equal(h.classes.has("crew-text-keyboard-open"),true);
 assert.equal(h.cssValues.get("--crew-text-keyboard-visible-height"),"422px");
 assert.equal(h.cssValues.get("--crew-text-keyboard-header-height"),"59px");
 h.viewport.offsetTop=24;
 h.viewport.dispatchEvent(new Event("scroll"));
 assert.equal(h.cssValues.get("--crew-text-keyboard-visible-top"),"24px","iOS visual offset tracks the visible top");
 h.viewport.height=844;
 h.viewport.dispatchEvent(new Event("resize"));
 assert.equal(h.classes.has("crew-text-keyboard-open"),false);
 assert.equal(h.cssValues.has("--crew-text-keyboard-visible-height"),false);
 assert.equal(events,2,"the history receives both collapse and restoration signals");
 h.cleanup();
});

test("Android content resize and 360×320 compact mode work without visualViewport",()=>{
 const h=keyboardHarness({width:360,viewportHeight:640,innerHeight:640,hasVisual:false});
 h.document.activeElement=h.input;
 h.chat.dispatchEvent(new Event("focusin"));
 h.browser.innerHeight=320;
 h.browser.dispatchEvent(new Event("resize"));
 assert.equal(h.classes.has("crew-text-keyboard-open"),true);
 assert.equal(h.cssValues.get("--crew-text-keyboard-visible-height"),"320px");
 h.document.activeElement=null;
 h.chat.dispatchEvent(new Event("focusout"));
 assert.equal(h.classes.has("crew-text-keyboard-open"),false);
 h.cleanup();
});

test("Android content resize is detected even if visualViewport reports a stale height",()=>{
 const h=keyboardHarness();
 h.document.activeElement=h.input;
 h.chat.dispatchEvent(new Event("focusin"));
 h.browser.innerHeight=422;
 h.browser.dispatchEvent(new Event("resize"));
 assert.equal(h.classes.has("crew-text-keyboard-open"),true);
 assert.equal(h.cssValues.get("--crew-text-keyboard-visible-height"),"422px");
 h.cleanup();
});

test("Compact keyboard stage budgets at least 180px for history on short phones",()=>{
 // Reference app header: 59px. Compact padding 6px top / 4px bottom,
 // 46px composer and a 6px flex gap; overflow is confined to the history.
 assert.match(friendCss(),/padding:6px 10px 4px/);
 assert.match(panelCss(),/padding:6px 12px 4px/);
 assert.match(panelCss(),/\.crew-text-chat-form input\{[^}]*min-height:46px/);
 for(const viewportHeight of [320,422]){
  const transcriptSpace=viewportHeight-59-6-4-46-6;
  assert.ok(transcriptSpace>=180,`history should remain usable at ${viewportHeight}px`);
 }
});

test("Desktop 1280×800 with a focused composer never hides the controls",()=>{
 const h=keyboardHarness({width:1280,viewportHeight:800,innerHeight:800});
 h.document.activeElement=h.input;
 h.chat.dispatchEvent(new Event("focusin"));
 h.viewport.height=390;
 h.viewport.dispatchEvent(new Event("resize"));
 assert.equal(h.classes.has("crew-text-keyboard-open"),false);
 h.cleanup();
});

test("Zoe compact layout hides controls, keeps a fixed header and viewport-fitted composer",()=>{
 const friend=friendCss(),css=panelCss();
 assert.match(friend,/\.friend-desktop-workspace>\.friend-text-stage\.crew-text-keyboard-open\{[^}]*position:fixed;[^}]*top:calc\(var\(--crew-text-keyboard-visible-top[^}]*height:calc\(var\(--crew-text-keyboard-visible-height/s);
 for(const name of ["live-identity","friend-language-switch","crew-chat-mode-switch","friend-live-post"])
  assert.match(friend,new RegExp(`\\.friend-text-stage\\.crew-text-keyboard-open>\\.${name}`));
 for(const name of ["crew-text-mode-choice","crew-text-chat-live-status","crew-text-chat-notice"])
  assert.match(css,new RegExp(`\\.live-stage\\.crew-text-keyboard-open \\.${name}`));
 assert.match(css,/\.live-stage\.crew-text-keyboard-open \.crew-text-chat-history\{flex:1 1 0;min-height:0;max-height:none;order:0\}/);
 assert.match(css,/\.live-stage\.crew-text-keyboard-open \.crew-text-chat-form\{flex:0 0 auto;margin-top:auto;order:3\}/);
 assert.match(css,/body\.teacher-theme\.session-page:has\(\.crew-text-keyboard-open\) \.app-header\{[^}]*position:fixed;/s);
 assert.match(css,/\.crew-text-guest:not\(:has\(\.crew-text-challenge-host\)\)\{display:none\}/,
  "Turnstile challenge must remain visible when it needs interaction");
});

test("Teacher keyboard uses text-only :has override, not the voice dock; transcript re-scrolls",()=>{
 const css=panelCss(),panel=read("web-spa/src/live/TextChatPanel.tsx");
 const selector="body.teacher-theme.session-page .teacher-live-stage.live-stage:has(>.crew-text-chat)";
 assert.ok(css.includes(selector+"{padding-bottom:calc(6px + env(safe-area-inset-bottom,0px))}"));
 assert.ok(selector.split(/[ .:()>]+/).filter(Boolean).length>"body.teacher-theme.session-page .live-stage".split(/[ .:()>]+/).filter(Boolean).length);
 assert.match(css,/\.teacher-live-stage\.live-stage\.crew-text-keyboard-open:has\(>\.crew-text-chat\)\{/);
 assert.match(css,/\.teacher-live-stage\.crew-text-keyboard-open>\.live-identity/);
 assert.match(panel,/useTextChatKeyboard\(chatRoot\)/);
 assert.match(panel,/ref=\{chatRoot\}/);
 assert.match(panel,/crew:text-keyboard-change/);
 assert.match(panel,/log\.scrollTop=log\.scrollHeight/);
 assert.ok(Buffer.byteLength(panel)<26000);
 assert.ok(Buffer.byteLength(read("web-spa/src/friends/FriendLiveConversation.tsx"))<26000);
});
