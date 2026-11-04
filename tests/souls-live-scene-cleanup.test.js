const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const page=read("web-spa/src/souls/SoulsPage.tsx");
const chat=read("web-spa/src/souls/SoulChat.tsx");
const css=read("web-spa/src/souls/souls.css");
const app=read("web-spa/src/App.tsx");

test("one stable Live session is docked directly under the finished Soul portrait",()=>{
 const detail=page.slice(page.indexOf('step==="detail"&&selected'));
 const scene=detail.indexOf('<div className="souls-live-stage"');
 const portrait=detail.indexOf("<SoulPortrait");
 const speech=detail.indexOf('className={"souls-speech-display');
 const chatPosition=detail.indexOf("<SoulChat");
 const copy=detail.indexOf('<div className="souls-profile-copy">');
 assert.ok(scene>=0&&portrait>scene&&speech>portrait&&chatPosition>speech&&copy>chatPosition,
  "portrait, caption and Live controls must stay grouped before secondary profile details");
 assert.equal((detail.match(/<SoulChat\b/g)||[]).length,1,"one conversation per selected Soul");
 assert.match(detail,/<SoulChat key=\{selected\.id\} soul=\{selected\}/);
 assert.match(detail,/onVisual=\{onVisual\} onAudioLevel=\{onAudioLevel\} scene\/>/);
 assert.match(detail,/mouthRef=\{mouthRef\}/);
});

test("Live controls, guest trial, interrupts and live text share the same dock",()=>{
 assert.match(chat,/<div className="souls-live-console">/);
 assert.match(chat,/<LiveControls live=\{live\} compact=\{active\} prominentInterrupt\/>/);
 assert.match(chat,/<GuestLiveStarter role="friend"/);
 assert.match(chat,/guest&&live\.state!=="ended"&&live\.state!=="error"/);
 assert.match(chat,/scene&&<form className="souls-live-input souls-live-composer"/);
 assert.match(chat,/onSubmit=\{send\}/);
 assert.match(chat,/live\.sendText\(value\)/);
 assert.match(chat,/live\.interrupt\(\)/);
 assert.match(chat,/scene\?<details className="souls-chat-history"/);
 assert.match(chat,/onOutputLevel:level=>onAudioLevel\?\.\(level\)/);
 assert.match(chat,/ready\?"LIVE"/,"do not claim a session is LIVE while only connecting");
});

test("finished stage is borderless and portrait-first on desktop and mobile",()=>{
 assert.match(css,/\.souls-photo-first \.souls-live-stage\s*\{/);
 assert.match(css,/\.souls-photo-first \.souls-live-caption-slot\s*\{/);
 assert.match(css,/\.souls-photo-first \.souls-live-console\s*\{/);
 assert.match(css,/\.souls-photo-first \.souls-chat-inline\s*\{/);
 assert.match(css,/\.souls-photo-first \.souls-photo-profile \.souls-portrait-stage\s*\{/);
 assert.match(css,/background:none!important/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(page,/faceVisible=\{soulFaceVisible\(selected\)\}/);
 assert.match(page,/onSpeechStyleChange=\{style=>void mutate/);
 assert.match(page,/maskEditing==="saved"&&<div className="souls-panel">/);
});

test("remove BOTH retired vision-lab public sites, stale docs and standalone tracker tests",()=>{
 for(const location of [
  "web-spa/public/souls-vision-lab",
  "crew-app/souls-vision-lab",
  "docs/souls-web-vision-lab.md",
  "tests/souls-web-tracker.test.mjs"
 ]){
  assert.equal(fs.existsSync(path.resolve(root,location)),false,
   location+" should not remain in sources or generated pages");
 }
 assert.match(app,/path="\/souls"/);
 assert.doesNotMatch(app,/souls-vision-lab/);
 assert.match(page,/from "\.\/SoulMaskEditor"/);
});
