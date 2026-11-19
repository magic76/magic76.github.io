import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {transformSync} from "esbuild";

// Execute the real TS provider module with only its network/clock dependencies replaced.
function harness({mode="live-ws",startError=false,send,clock=false}={}){
 const sessions=[],timeouts=new Map();
 let nextTimer=0,httpTranslations=0,httpHints=0;
 const storage=new Map([["koolo_aux_live_provider",mode]]);
 const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
 class Session{
  constructor(options){this.options=options;this.ready=false;this.running=false;this.stops=0;sessions.push(this)}
  async start(){if(startError)throw new Error("cannot connect");this.ready=true;this.running=true;this.options.onState?.("ready")}
  async stop(){this.stops++;this.ready=false;this.running=false}
  sendText(prompt){if(send)send(this,prompt);return true}
 }
 const window={CrewLive:{Session}};
 const fallback={
  translateCallSentence:async(_sentence,_source,_target,onText)=>{httpTranslations++;onText("HTTP translation");return "HTTP translation"},
  generateReplyHints:async()=>{httpHints++;return [{text:"HTTP first",translation:"一"},{text:"HTTP second",translation:"二"}]}
 };
 const parseSuggestedReplies=value=>{
  if(!Array.isArray(value?.replies))return [];
  const valid=value.replies.filter(row=>typeof row?.text==="string"&&typeof row?.translation==="string"&&row.text.trim()&&row.translation.trim());
  return valid.length>=2?valid.slice(0,3):[];
 };
 const dependencies={
  "../lib/runtime":{ensureLive:async()=>{},geminiKey:()=>"test-key"},
  "./suggestReplies":{parseSuggestedReplies},
  "../friends/callTranslate":{translateCallSentence:fallback.translateCallSentence},
  "./replyHintText":{generateReplyHints:fallback.generateReplyHints}
 };
 const module={exports:{}};
 const source=readFileSync("web-spa/src/live/secondLiveProvider.ts","utf8");
 const js=transformSync(source,{loader:"ts",format:"cjs",target:"es2022"}).code;
 const context={module,exports:module.exports,require:name=>{
  if(!(name in dependencies))throw new Error("unexpected dependency: "+name);
  return dependencies[name];
 },window,localStorage,DOMException,console,
  setTimeout:(fn,delay)=>clock?(timeouts.set(++nextTimer,{fn,delay}),nextTimer):setTimeout(fn,delay),
  clearTimeout:id=>clock?timeouts.delete(id):clearTimeout(id)
 };
 vm.runInNewContext(js,context,{filename:"secondLiveProvider.js"});
 const api=module.exports;
 const translate=async(onText=()=>{})=>api.translateWithProvider("Hello","en","zh-TW",onText,new AbortController().signal);
 const suggest=()=>api.suggestWithProvider([{input:"Hello",output:"How are you?"}],"en","zh-TW");
 return {api,window,storage,sessions,translate,suggest,timeouts,stats:()=>({httpTranslations,httpHints})};
}
const settle=async()=>{for(let i=0;i<50;i++)await Promise.resolve()};
test("connected auxiliary WS supplies both translation and reply hints without HTTP",async()=>{
 const h=harness({send:(session,prompt)=>{
  const task=JSON.parse(prompt).task;
  const response=task==="translate"?{translation:"你好"}:{replies:[{text:"I'm fine",translation:"我很好"},{text:"How about you?",translation:"你呢"}]};
  session.options.onGenerationComplete(JSON.stringify(response));
 }});
 h.api.startAuxiliarySession();
 assert.equal(await h.translate(),"你好");
 assert.equal((await h.suggest()).length,2);
 assert.deepEqual(h.stats(),{httpTranslations:0,httpHints:0});
 assert.equal(h.sessions.length,1);
 assert.equal(h.sessions[0].options.textOnly,true);
 assert.equal(h.sessions[0].options.tools,undefined);
 h.api.stopAuxiliarySession();
 await settle();
});
test("session.start failure falls back to HTTP translation",async()=>{
 const h=harness({startError:true});
 h.api.startAuxiliarySession();
 assert.equal(await h.translate(),"HTTP translation");
 assert.equal(h.stats().httpTranslations,1);
 h.api.stopAuxiliarySession();
});
for(const event of ["onTerminal","onError"]){
 test("mid-request "+event+" falls back and never stops the main session",async()=>{
  const h=harness({send:session=>session.options[event](new Error("disconnect"))});
  h.api.startAuxiliarySession();
  assert.equal(await h.translate(),"HTTP translation");
  assert.equal(h.stats().httpTranslations,1);
  h.api.stopAuxiliarySession();
 });
}
test("6.5-second silent WS request times out into HTTP fallback",async()=>{
 const h=harness({clock:true});
 h.api.startAuxiliarySession();
 const task=h.translate();
 await settle();
 const timeout=[...h.timeouts.values()].find(timer=>timer.delay===6500);
 assert.ok(timeout,"request deadline must be armed");
 timeout.fn();
 assert.equal(await task,"HTTP translation");
 assert.equal(h.stats().httpTranslations,1);
 h.api.stopAuxiliarySession();
});
for(const payload of ["not json",'{"missing":"translation"}','{"translation":"这个"}']){
 test("malformed or unsafe translation "+payload+" falls back without displaying garbage",async()=>{
  const h=harness({send:session=>session.options.onGenerationComplete(payload)});
  const shown=[];
  h.api.startAuxiliarySession();
  assert.equal(await h.translate(value=>shown.push(value)),"HTTP translation");
  assert.deepEqual(shown,["HTTP translation"]);
  h.api.stopAuxiliarySession();
 });
}
test("too few suggestions falls back to original HTTP generator",async()=>{
 const h=harness({send:session=>session.options.onGenerationComplete('{"replies":[{"text":"Hi","translation":"嗨"}]}')});
 h.api.startAuxiliarySession();
 const hints=await h.suggest();
 assert.equal(hints[0].text,"HTTP first");
 assert.equal(h.stats().httpHints,1);
 h.api.stopAuxiliarySession();
});
test("text-http flag never constructs a secondary session",async()=>{
 const h=harness({mode:"text-http"});
 h.api.startAuxiliarySession();
 assert.equal(await h.translate(),"HTTP translation");
 assert.equal((await h.suggest())[0].text,"HTTP first");
 assert.equal(h.sessions.length,0);
 assert.equal(h.stats().httpTranslations,1);
 assert.equal(h.stats().httpHints,1);
});
test("JSON markdown fences are accepted before strict validation",()=>{
 const h=harness();
 assert.equal(h.api.parseAuxiliaryJson("\u0060\u0060\u0060json\n{\"translation\":\"你好\"}\n\u0060\u0060\u0060").translation,"你好");
});
