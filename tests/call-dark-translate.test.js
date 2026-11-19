import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {stripTypeScriptTypes} from "node:module";
import {callTranslationRows,splitCallSentences} from "../web-spa/src/friends/callSentence.mjs";
const read=path=>fs.readFileSync(path,"utf8"),root="web-spa/src/friends/";
const css=read(root+"friendCall.css"),captions=read(root+"FriendCallCaptions.tsx"),helper=read(root+"callTranslate.ts");
const bubbleList=read(root+"FriendCallBubbleList.tsx"),bubbleCss=read(root+"friendCallBubbles.css");
const dark=css.slice(css.indexOf("/* #52:"));
function style(selector){
 const rules={};let matched=false;
 for(const [,selectors,declarations] of dark.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
  const found=selector.includes(",")?selectors.trim().endsWith(selector):selectors.split(",").some(v=>v.trim().endsWith(selector));
  if(!found)continue;matched=true;
  for(const part of declarations.split(";").filter(Boolean)){
   const at=part.indexOf(":");if(at>=0)rules[part.slice(0,at).trim()]=part.slice(at+1).trim();
  }
 }
 assert.ok(matched,"Missing: "+selector);return rules;
}
function rgb(hex){assert.match(hex,/^#[0-9a-f]{3,6}$/i);const h=hex.slice(1);return(h.length===3?[...h].map(c=>parseInt(c+c,16)):[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)))}
function luminance(hex){const a=rgb(hex).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722}
function contrast(foreground,background){const x=luminance(foreground),y=luminance(background);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
const scope=".friend-live-page:has(.friend-phone-stage) ";
test("#52 activates black viewport and header only while a call stage exists",()=>{
 const surfaces=["html:has(.friend-phone-stage)","html:has(.friend-phone-stage) body","body:has(.friend-phone-stage) .app-header","body.teacher-theme.session-page main.friend-live-page:has(.friend-phone-stage)",scope+".friend-phone-stage"];
 for(const selector of surfaces){const value=style(selector).background;assert.ok(value,"background "+selector);assert.ok(rgb(value).every(n=>n<=0x10),selector+" "+value)}
 assert.doesNotMatch(dark,/(?:^|\n)\s*(?:body|\.app-header)\s*\{[^}]*background\s*:/);
 assert.match(dark,/body\.teacher-theme\.session-page main\.friend-live-page:has\(\.friend-phone-stage\)/);
 assert.match(dark,/safe-area|100dvh/);
});
test("#52 the header, stage, transcript strip, history and desktop canvas are one uninterrupted black surface",()=>{
 const black="#000",selectors=["html:has(.friend-phone-stage)","html:has(.friend-phone-stage) body","body:has(.friend-phone-stage) #root","body:has(.friend-phone-stage) .app-header","body:has(.friend-phone-stage) .app-header .shell.inner","body.teacher-theme.session-page main.friend-live-page:has(.friend-phone-stage)",scope+".friend-phone-stage",scope+".friend-phone-stage>.friend-chat-history",scope+".friend-phone-stage>.friend-chat-history summary",scope+".desktop-live-panel"];
 for(const selector of selectors)assert.equal(style(selector).background,black,selector);
 const stage=style(scope+".friend-phone-stage");
 for(const [prop,value] of [["border","0"],["border-radius","0"],["box-shadow","none"],["background-image","none"],["margin","0"],["max-width","none"],["height","auto"],["max-height","none"]])assert.equal(stage[prop],value,prop);
 const page=style("body.teacher-theme.session-page main.friend-live-page:has(.friend-phone-stage)");
 for(const [prop,value] of [["width","100%"],["margin","0"],["padding","0"],["max-width","none"]])assert.equal(page[prop],value,prop);
 assert.equal(style("body:has(.friend-phone-stage) .app-header .status").background,"#141414");
 assert.match(dark,/background-color:rgba\(255,255,255,\.08\)/);
 assert.match(dark,/safe-area-inset-bottom/);
 assert.match(dark,/@media\(max-width:1049px\)/);
 assert.match(dark,/body:has\(\.friend-phone-stage\) #root\{display:flex/);
});
test("#52 primary text contrast is >= 4.5:1 against the actual call surfaces",()=>{
 const cases=[
  [scope+".friend-phone-stage .friend-caption-ai",scope+".friend-phone-stage .friend-caption-ai"],
  [scope+".friend-phone-stage .friend-caption-translation",scope+".friend-phone-stage .friend-caption-ai"],
  [scope+".friend-phone-stage .friend-caption-user",scope+".friend-phone-stage .friend-caption-user"],
  ["body:has(.friend-phone-stage) .app-header .app-title,body:has(.friend-phone-stage) .app-header .app-title strong,body:has(.friend-phone-stage) .app-header .app-title small","body:has(.friend-phone-stage) .app-header"],
  [scope+".friend-phone-duration,"+scope+".friend-phone-volume,"+scope+".friend-phone-button","html:has(.friend-phone-stage)"],
  [scope+".friend-phone-stage .friend-caption-user small",scope+".friend-phone-stage .friend-caption-user"],
  [scope+".friend-phone-stage .friend-caption-ai small",scope+".friend-phone-stage .friend-caption-ai"],
  ["body:has(.friend-phone-stage) .app-header .status span","body:has(.friend-phone-stage) .app-header .status"]
 ];
 for(const [fg,bg] of cases){const color=style(fg).color,background=style(bg).background;assert.ok(color&&background,fg+" or "+bg);assert.ok(contrast(color,background)>=4.5,fg+" contrast "+contrast(color,background).toFixed(2))}
});
test("#52 desktop transcript, notes, settings and focus remain dark and readable",()=>{
 for(const selector of [scope+".desktop-live-panel",scope+".workspace-bubble",scope+".workspace-bubble.from-user",scope+".workspace-bottom",scope+".workspace-note-area textarea"])assert.ok(rgb(style(selector).background).every(n=>n<=0x40),selector);
 assert.ok(contrast(style(scope+".workspace-bubble").color,style(scope+".workspace-bubble").background)>=4.5);
 assert.match(dark,/\.friend-phone-stage button:focus-visible/);
 assert.match(dark,/\.guest-trial-countdown-copy small/);
 assert.match(dark,/\.friend-language-options button/);
});
test("#52 Android theme-color restores the exact previous value on unmount",()=>{
 assert.match(captions,/meta\[name="theme-color"\]/);
 assert.match(captions,/const previous=meta\.getAttribute\("content"\)/);
 assert.match(captions,/meta\.setAttribute\("content","#000"\)/);
 assert.match(captions,/return\(\)=>\{if\(previous===null\)meta\.removeAttribute\("content"\);else meta\.setAttribute\("content",previous\)/);
});
test("#50 direct single-model streaming, minimal thinking, timeout, bounded RAM cache",()=>{
 for(const token of ["gemini-3.5-flash-lite","streamGenerateContent","alt=sse","thinkingLevel","minimal","x-goog-api-key","AbortController","maxOutputTokens:200","temperature:0","Map<string,string>","CACHE_LIMIT=50","response.status===400","response.status===401||response.status===403"])assert.ok(helper.includes(token),token);
 assert.match(helper,/setTimeout\(stop,6000\)/);
 assert.match(helper,/reader\.read\(\)/);assert.match(helper,/line\.startsWith\("data:"\)/);
 assert.doesNotMatch(helper,/\/models\?|CrewAI|ensureCore|discover|localStorage|sessionStorage|gemini-(?!3\.5-flash-lite)\d/);
 assert.match(helper,/const id=source\+"\|"\+target\+"\|"\+sentence/);
});
test("#50 sentences are split in both languages and the unfinished tail is retained",()=>{
 assert.deepEqual(splitCallSentences("Hi! I'm fine. How about you"),{sentences:["Hi!","I'm fine."],tail:"How about you"});
 assert.deepEqual(splitCallSentences("你好！今天很好。要喝咖啡嗎"),{sentences:["你好！","今天很好。"],tail:"要喝咖啡嗎"});
 assert.deepEqual(splitCallSentences("OK!? ”Next… (later)"),{sentences:["OK!?","”Next…"],tail:"(later)"});
});
test("#50 incremental translation, persistent browser Translator and epoch-safe interruptions",()=>{
 assert.match(captions,/splitCallSentences\(text\)/);assert.match(captions,/advance\(currentReply,false\)/);assert.match(captions,/advance\(complete,true\)/);
 assert.match(captions,/if\(tail\)enqueue\(tail\)/);assert.match(captions,/partsRef\.current\.slice\(0,s\.closed\)/);
 assert.match(captions,/\.availability\(/);assert.match(captions,/session\.factory\.create\(/);assert.match(captions,/session\.instance=item/);assert.match(captions,/session\.instance\?\.destroy\?\.\(\)/);
 assert.match(captions,/browserCode\(nativeLanguage\)/);assert.match(captions,/zh-Hant/);
 assert.match(captions,/activeRef\.current\.size<\(useKey\?2:1\)/);
 assert.match(captions,/epochRef\.current\+\+/);assert.match(captions,/controller\.abort\(\)/);
 assert.match(captions,/epoch!==epochRef\.current/);assert.match(captions,/crew-friend-call-interrupt/);
 assert.match(captions,/crew_friend_call_translation_v1/);assert.match(captions,/needTranslation=/);
 assert.doesNotMatch(captions,/ensureCore|CrewAI/);
 assert.match(read(root+"FriendCallControls.tsx"),/dispatchEvent\(new Event\("crew-friend-call-interrupt"\)\)/);
});
test("no protected changes, oversized components or tiny text",()=>{
 assert.ok(Buffer.byteLength(read("web-spa/src/friends/FriendLivePage.tsx"))<26000);
 for(const file of ["FriendCallCaptions.tsx","callTranslate.ts","FriendCallControls.tsx"])assert.ok(Buffer.byteLength(read(root+file))<26000,file);
 for(const [,font] of css.matchAll(/font-size:\s*([\d.]+)px/g))assert.ok(Number(font)>=12,"font-size "+font);
 assert.doesNotMatch([captions,helper,read(root+"FriendCallControls.tsx")].join("\n"),/trackUsageEvent/);
});

test("#50 v3: four failed sentences show one error; successful translations stay visible",()=>{
 const failed={source:"Hi!",text:"",status:"failed"};
 const rows=callTranslationRows([failed,failed,failed,failed]);
 assert.deepEqual(rows,[{kind:"message",value:"translateFailed"}]);
 assert.deepEqual(callTranslationRows([
  {source:"Hi!",text:"嗨！",status:"done"},
  {source:"How are you?",text:"",status:"failed"},
  {source:"Let's go.",text:"走吧。",status:"done"},
  {source:"Bye!",text:"",status:"failed"}
 ]),[{kind:"text",value:"嗨！"},{kind:"text",value:"走吧。"},{kind:"message",value:"translateFailed"}]);
 assert.deepEqual(callTranslationRows([{text:"",status:"key"},{text:"",status:"failed"}]),[{kind:"message",value:"needsKey"}]);
 assert.deepEqual(callTranslationRows([{text:"",status:"pending"},{text:"",status:"working"}]),[{kind:"message",value:"translating"}]);
 assert.deepEqual(callTranslationRows([{text:"partial text",status:"working"},{text:"",status:"pending"}]),[{kind:"text",value:"partial text"}]);
 assert.match(captions,/callTranslationRows\(parts\)/);
 assert.match(captions,/visibleTranslation\.map/);
 assert.doesNotMatch(captions,/parts\.map\(\(part,i\)/);
});
test("#50 v3: Zoe original, translation and speaker remain visible in scrollable chat bubbles",()=>{
 assert.match(captions,/FriendCallBubbleList/);
 assert.match(bubbleList,/\{turn\.output\.trim\(\)\}<\/p>/);
 assert.match(bubbleList,/renderTranslation\(turn\.output\.trim\(\)/);
 assert.match(bubbleList,/speakerAvatar\?<div className="friend-caption-speaker"/);
 assert.match(bubbleList,/pane\.scrollTop=pane\.scrollHeight/);
 assert.match(bubbleCss,/overflow-y:auto/);
 assert.match(bubbleCss,/overflow-x:hidden/);
 assert.match(bubbleCss,/\.friend-bubble-ai\{align-self:flex-start/);
});

test("translation retries transient failures once with fresh deadlines and abort guard",()=>{
 assert.match(helper,/for\(let attempt=0;attempt<2;attempt\+\+\)/);
 assert.match(helper,/const request=async\(thinking:boolean\)/);
 assert.match(helper,/const controller=new AbortController\(\)/);
 assert.match(helper,/setTimeout\(stop,6000\)/);
 assert.match(helper,/if\(signal\.aborted\)throw/);
 assert.match(helper,/if\(error instanceof Error&&error\.message==="key"\)throw error/);
 assert.match(helper,/response\.status===401\|\|response\.status===403/);
 assert.match(helper,/request\(false\)/);
 assert.match(helper,/一个→一個, 从→從, 说→說/);
 assert.match(helper,/temperature:0/);
 assert.ok(Buffer.byteLength(helper)<26000);
});

test("runtime: successful SSE translation resolves and does not retry",async()=>{
 const originalFetch=globalThis.fetch;
 const originalKey=globalThis.__testTranslationKey;
 const originalName=globalThis.__testNativeLanguageName;
 try{
  globalThis.__testTranslationKey=()=>"test-key";
  globalThis.__testNativeLanguageName=()=>"繁體中文";
  const moduleSource=read(root+"callTranslate.ts")
   .replace(/^import .*;\n/gm,"")
   .replace("geminiKey()","globalThis.__testTranslationKey()")
   .replace("nativeLanguageName(target)","globalThis.__testNativeLanguageName(target)");
  const js=stripTypeScriptTypes(moduleSource,{mode:"strip"});
  const {translateCallSentence}=await import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));
  let calls=0;
  globalThis.fetch=async()=>{
   calls++;
   const encoder=new TextEncoder();
   return new Response(new ReadableStream({start(controller){
    controller.enqueue(encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"一個朋友說你好"}]}}]}\n\n'));
    controller.close();
   }}),{status:200});
  };
  const partial=[];
  const translated=await translateCallSentence("A friend says hello.","en","zh-TW",text=>partial.push(text),new AbortController().signal);
  assert.equal(translated,"一個朋友說你好");
  assert.deepEqual(partial,["一個朋友說你好"]);
  assert.equal(calls,1,"successful translation must not retry");
 }finally{
  globalThis.fetch=originalFetch;
  if(originalKey===undefined)delete globalThis.__testTranslationKey;else globalThis.__testTranslationKey=originalKey;
  if(originalName===undefined)delete globalThis.__testNativeLanguageName;else globalThis.__testNativeLanguageName=originalName;
 }
});

test("call transcript heading removed; translation preference lives in call menu",()=>{
 const menu=read(root+"FriendCallMenuPreferences.tsx");
 const page=read(root+"FriendLivePage.tsx");
 assert.doesNotMatch(captions,/className="friend-caption-heading"|className="friend-caption-toggle"/);
 assert.match(menu,/callCaptions\.hideTranslation/);
 assert.match(menu,/aria-pressed=\{translationEnabled\}/);
 assert.match(page,/translationEnabled=\{translationEnabled\}/);
});
