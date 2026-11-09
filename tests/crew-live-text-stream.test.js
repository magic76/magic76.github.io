const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const source=fs.readFileSync(path.join(__dirname,"../web-spa/src/live/typingReveal.ts"),"utf8");
const js=stripTypeScriptTypes(source,{mode:"strip"}).replace("export function createTypingReveal","function createTypingReveal");
const context={setInterval,clearInterval};
vm.runInNewContext(js+"\nthis.makeReveal=createTypingReveal;",context);
const create=context.makeReveal;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test("Live streaming appears one character at a time, not as an entire sentence",async()=>{
 const frames=[];
 const reveal=create(text=>frames.push(text),4);
 reveal.push("Hi");
 await wait(12);
 const done=reveal.finish("Hi there");
 await done;
 assert.equal(frames.at(-1),"Hi there");
 assert.ok(frames.length>=8,"must emit progressive character frames");
 assert.equal(frames[0],"H");
 assert.ok(frames.every((v,i)=>i===0||v.length>=frames[i-1].length));
 reveal.cancel();
});

test("partial transcription revisions replace outdated text rather than appending it",async()=>{
 const frames=[];
 const reveal=create(text=>frames.push(text),4);
 reveal.push("I am wrong");
 await wait(12);
 await reveal.finish("I am right");
 assert.equal(frames.at(-1),"I am right");
 assert.doesNotMatch(frames.at(-1),/wrong/);
 reveal.cancel();
});

test("cancel resolves a pending reveal and does not schedule later UI changes",async()=>{
 const frames=[];
 const reveal=create(text=>frames.push(text),10);
 const finished=reveal.finish("Some unusually long text to ensure a pending timer");
 reveal.cancel();
 await finished;
 const count=frames.length;
 await wait(40);
 assert.equal(frames.length,count);
});

test("Teacher/Friend text UI subscribes to Live chunks before turn completion",()=>{
 const panel=fs.readFileSync(path.join(__dirname,"../web-spa/src/live/TextChatPanel.tsx"),"utf8");
 const adapter=fs.readFileSync(path.join(__dirname,"../web-spa/src/live/liveTextChat.ts"),"utf8");
 assert.match(panel,/createTypingReveal\(updateLiveAnswer\)/);
 assert.doesNotMatch(panel,/key\?createTypingReveal/);
 assert.match(panel,/await reveal\.finish\(reply\)/);
 assert.match(panel,/body:JSON\.stringify\(\{action:"send"/);
 assert.match(panel,/\.send\(value,partial=>\{/);
 assert.match(panel,/reveal\?\.push\(partial\)/);
 assert.match(panel,/setRequestSent\(true\)/);
 assert.match(panel,/await reveal\.finish\(reply\)/);
 assert.match(adapter,/onOutputTranscript:text=>/);
 assert.match(adapter,/this\.pending\?\.onPartial\?\.\(text\)/);
 assert.match(adapter,/onGenerationComplete:text=>/);
});
