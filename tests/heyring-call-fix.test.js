import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=path=>fs.readFileSync(path,"utf8");
const page=read("web-spa/src/friends/FriendLivePage.tsx");
const css=read("web-spa/src/friends/friendCall.css");
const root="web-spa/src/friends/";
const rule=selector=>{
 const start=css.lastIndexOf(selector+"{");
 assert.ok(start>=0,`missing CSS selector ${selector}`);
 return css.slice(start+selector.length+1,css.indexOf("}",start));
};
const numeric=(body,property)=>{
 const match=body.match(new RegExp(`(?:^|;)\\s*${property}:\\s*([\\d.]+)px(?:;|$)`));
 assert.ok(match,`missing numeric ${property} in ${body}`);
 return Number(match[1]);
};
test("telephone route keeps its components and splits its overlarge page",()=>{
 assert.ok(Buffer.byteLength(page)<=25500,`FriendLivePage: ${Buffer.byteLength(page)} bytes`);
 assert.match(page,/FriendCallCaptions name=\{friend\.name\}/);
 assert.match(page,/FriendCallControls live=\{live\}/);
 for(const [path,component] of [["useFriendTextViewport.ts","useFriendTextViewport"],["FriendChatHistory.tsx","FriendChatHistory"],["friendVoiceStatusKey.ts","friendVoiceStatusKey"]]){
  assert.ok(fs.existsSync(root+path),path);
  assert.ok(Buffer.byteLength(read(root+path))<26000,path);
  assert.ok(page.includes(`./${path.replace(/\.(?:tsx|ts)$/,'')}`),path+" import");
  assert.ok(page.includes(component+"(" )||page.includes("<"+component),path+" called");
 }
 assert.match(read(root+"useFriendTextViewport.ts"),/--crew-friend-viewport-height/);
 assert.match(read(root+"useFriendTextViewport.ts"),/visualViewport/);
 assert.match(read(root+"FriendChatHistory.tsx"),/friend-chat-history-scroll/);
});
test("call transcript toggle and volume have at least 44px touch dimensions",()=>{
 for(const selector of [".friend-phone-stage .friend-caption-toggle",".friend-phone-stage .friend-phone-volume summary"]){
  const declaration=rule(selector);
  assert.ok(numeric(declaration,"min-height")>=44,selector+" height");
  assert.ok(numeric(declaration,"min-width")>=44,selector+" width");
 }
});
test("360x640 preserves call controls by scrolling only bilingual captions",()=>{
 const stages=[...css.matchAll(/\.friend-phone-stage\{([^}]+)\}/g)].map(m=>m[1]);
 assert.ok(stages.some(stage=>/overflow:hidden/.test(stage)&&/max-height:calc\(100dvh - 110px\)/.test(stage)));
 const captions=rule(".friend-phone-stage>.friend-phone-captions");
 assert.match(captions,/flex:1 1 0/);
 assert.match(captions,/min-height:0/);
 assert.match(captions,/overflow-y:auto/);
 assert.ok([...css.matchAll(/\.friend-phone-stage \.friend-phone-controls\{([^}]+)\}/g)].some(m=>/flex:none/.test(m[1])));
 assert.match(css,/@media\(max-width:640px\) and \(max-height:690px\)/);
 assert.match(css,/height:calc\(100dvh - 95px - env\(safe-area-inset-bottom,0px\)\)/);
 assert.ok((css.match(/\.friend-phone-stage/g)||[]).length>15);
 for(const [,font] of css.matchAll(/font-size:\s*([\d.]+)px/g))assert.ok(Number(font)>=12,"minimum font size");
 assert.doesNotMatch(css,/\.friend-text-stage\s*\{/);
 assert.match(read(root+"FriendCallCaptions.tsx"),/scrollTop=el\.scrollHeight/);
 assert.match(css,/\.friend-phone-stage \.friend-caption-heading\{position:sticky/);
});
test("additional movement still respects reduced-motion preferences",()=>{
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/scroll-behavior:smooth/);
});
