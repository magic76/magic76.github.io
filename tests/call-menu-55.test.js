import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const root="web-spa/src/friends/";
const page=read(root+"FriendLivePage.tsx");
const sheet=read(root+"FriendCallMenu.tsx");
const css=read(root+"friendCall.css");

test("#55 moves call settings, presets and history to the header bottom sheet",()=>{
 assert.match(page,/FriendCallMenuTrigger active=\{active&&!textMode\}/);
 assert.match(page,/<FriendCallMenu inCall=\{active&&!textMode\}/);
 assert.doesNotMatch(page,/friend-call-options-toggle/);
 assert.match(page,/className="friend-language-switch"/);
 assert.match(page,/className="crew-chat-mode-switch"/);
 assert.match(page,/className="live-presets"/);
 assert.match(page,/<FriendChatHistory turns=\{live\.turns\}/);
 assert.match(page,/FriendCallCaptions name=\{friend\.name\}/);
 assert.match(page,/FriendCallControls live=\{live\}/);
 assert.match(sheet,/createPortal\(/);
 assert.match(sheet,/if\(!inCall\)return <>{children}<\/>/);
 assert.match(sheet,/if\(!open\)return null/);
 assert.ok(Buffer.byteLength(page)<=25500,"existing 25,500-byte limit");
});

test("#55 accessible call menu is 44px, keyboard dismissible and black",()=>{
 for(const token of ['aria-label={label}','aria-haspopup="dialog"','aria-expanded={open}','aria-controls="friend-call-menu-dialog"','aria-modal="true"','role="dialog"','event.key==="Escape"','event.key==="Tab"','previous.focus()'])assert.ok(sheet.includes(token),token);
 const trigger=css.match(/\.friend-call-menu-trigger\{([^}]+)\}/)?.[1]||"";
 assert.match(trigger,/min-width:44px/);
 assert.match(trigger,/min-height:44px/);
 assert.match(css,/\.friend-call-menu-panel\{[^}]*background:#000/);
 assert.match(css,/body:has\(\.friend-phone-stage\) \.app-header \.status\{[^}]*max-width:min\(42vw,185px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 for(const [,font] of css.matchAll(/font-size:\s*([\d.]+)px/g))assert.ok(Number(font)>=12,"min 12px text");
});

test("#55 labels for closing the call menu exist in all 11 voice locales",()=>{
 for(const lang of ["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"]){
  const voice=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/voice.json"));
  assert.ok(voice.callCaptions.more,lang+" label");
  assert.ok(voice.callCaptions.closeMenu,lang+" close label");
 }
});
