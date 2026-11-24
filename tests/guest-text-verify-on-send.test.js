const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const panel=read("web-spa/src/live/TextChatPanel.tsx");
const helper=read("web-spa/src/live/guestTextChallenge.ts");
const css=read("web-spa/src/live/TextChatPanel.css");

// Minimal hook renderer: exercise the actual helper with a fake DOM/Turnstile,
// not just a copy of the implementation or a mocked successful network call.
function harness(){
 const hooks=[],events=[],scripts=new Map(),timers=new Map();
 let cursor=0,nextTimer=0;
 const same=(a,b)=>a?.length===b?.length&&a?.every((v,i)=>Object.is(v,b[i]));
 function useState(initial){
  const i=cursor++;
  if(!hooks[i])hooks[i]={value:typeof initial==="function"?initial():initial};
  return[hooks[i].value,value=>{hooks[i].value=typeof value==="function"?value(hooks[i].value):value}];
 }
 function useRef(initial){const i=cursor++;return(hooks[i]??={value:{current:initial}}).value}
 function useCallback(callback,deps){const i=cursor++;if(!hooks[i]||!same(hooks[i].deps,deps))hooks[i]={value:callback,deps};return hooks[i].value}
 function useEffect(callback,deps){const i=cursor++;const h=hooks[i]??={};if(!same(h.deps,deps)){h.deps=deps;h.next=callback}hooks[i]=h}
 function flush(){for(const h of hooks){if(h.next){h.cleanup?.();h.cleanup=h.next();h.next=null}}}
 const document={
  getElementById:id=>scripts.get(id)||null,
  createElement:()=>({listeners:new Map(),addEventListener(name,callback){this.listeners.set(name,callback)},
   removeEventListener(name,callback){if(this.listeners.get(name)===callback)this.listeners.delete(name)},
   remove(){scripts.delete(this.id)}}),
  head:{appendChild(node){scripts.set(node.id,node);events.push("script-load-request")}}
 };
 const widgets=[];
 const window={turnstile:undefined};
 function createApi(){
  window.turnstile={render:(host,options)=>{widgets.push(options);events.push("render");return "widget-1"},
   execute:id=>events.push("execute:"+id),remove:id=>events.push("remove:"+id)};
 }
 const source=stripTypeScriptTypes(helper,{mode:"strip"}).replace(/^import .*;\s*$/gm,"").replace(/^export /gm,"");
 const ctx={useState,useRef,useCallback,useEffect,window,document,
  setTimeout:(fn)=>{const id=++nextTimer;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(source+"\nthis.makeHook=useGuestTextChallenge;",ctx);
 let latest;
 function render(guestMode=true,phase="ready",key="public-site-key"){
  cursor=0;latest=ctx.makeHook(guestMode,phase,key);
  // When requested, React mounts the inline host before effects run.
  if(latest.requested)latest.host.current={nodeType:1};
  flush();return latest;
 }
 return {render,events,scripts,timers,widgets,window,createApi,get latest(){return latest},unmount(){for(const h of hooks)h.cleanup?.()}};
}

test("entry has no Turnstile host/script; Send or starter uses one on-demand path",async()=>{
 assert.match(panel,/import \{useGuestTextChallenge\} from "\.\/guestTextChallenge"/);
 assert.match(panel,/const \{host,requested:challengeRequested,waitForChallenge\}=useGuestTextChallenge\(guestMode,guestPhase,siteKey\)/);
 assert.match(panel,/challengeRequested&&guestPhase==="ready"/);
 assert.match(panel,/<TextChatStarters onPick=\{sentence=>void sendMessage\(sentence\)\}/);
 assert.match(panel,/onSubmit=\{event=>\{event\.preventDefault\(\);void sendMessage\(draft\)\}\}/);
 assert.match(panel,/const challengeToken=await waitForChallenge\(\)/);
 assert.match(panel,/acquire:startGuestText/);
 assert.doesNotMatch(panel,/document\.createElement\("script"\)|challenges\.cloudflare\.com/);
 const h=harness();h.render();
 assert.equal(h.events.length,0);assert.equal(h.scripts.size,0);
 const wait=h.latest.waitForChallenge();h.render();
 assert.deepEqual(h.events,["script-load-request"]);
 h.createApi();h.scripts.get("crew-guest-turnstile").listeners.get("load")();
 assert.deepEqual(h.events.slice(-2),["render","execute:widget-1"]);
 assert.equal(h.widgets[0].action,"crew-guest-trial");
 assert.equal(h.widgets[0].execution,"execute");
 assert.equal(h.widgets[0].appearance,"interaction-only");
 assert.equal(h.widgets[0].size,"flexible");
 h.widgets[0].callback("fresh-token");
 assert.equal(await wait,"fresh-token");
 h.render();assert.equal(h.timers.size,0);assert.equal(h.events.at(-1),"remove:widget-1");
 h.unmount();
});

test("active session and BYOK never start a challenge on page entry",()=>{
 for(const [guest,phase] of [[true,"active"],[false,"ready"],[false,"active"]]){
  const h=harness();h.render(guest,phase);assert.equal(h.scripts.size,0);
  assert.equal(h.events.length,0);h.unmount();
 }
 assert.match(panel,/token:guestPhase==="active"\|\|guestPhase==="checking"\?guestToken:""/);
 assert.match(panel,/const key=guestMode\?"":geminiKey\(\)/);
 assert.match(panel,/if\(key\)\{/);
});

test("script failure, challenge timeout, expiration and unmount reject; retry re-executes",async()=>{
 const h=harness();h.render();
 let wait=h.latest.waitForChallenge();h.render();
 h.scripts.get("crew-guest-turnstile").listeners.get("error")();
 await assert.rejects(wait,/TURNSTILE_LOAD_FAILED/);
 h.render();assert.equal(h.scripts.size,0,"failed script can be reloaded");
 wait=h.latest.waitForChallenge();h.render();
 assert.equal(h.events.filter(x=>x==="script-load-request").length,2);
 h.createApi();h.scripts.get("crew-guest-turnstile").listeners.get("load")();
 h.widgets.at(-1)["expired-callback"]();
 await assert.rejects(wait,/TURNSTILE_EXPIRED/);
 h.render();
 wait=h.latest.waitForChallenge();h.render();
 assert.equal(h.events.filter(x=>x.startsWith("execute:")).length,2,"expired token isn't reused");
 for(const fn of [...h.timers.values()])fn();
 await assert.rejects(wait,/TURNSTILE_TIMEOUT/);
 h.render();
 wait=h.latest.waitForChallenge();h.render();h.unmount();
 await assert.rejects(wait,/UNMOUNTED/);
});

test("unavailable phase rejects a pending challenge and first send restores the draft on failure",async()=>{
 const h=harness();h.render();
 const pending=h.latest.waitForChallenge();h.render();h.render(true,"unavailable");
 await assert.rejects(pending,/CHALLENGE_CANCELLED/);
 assert.match(panel,/setMessages\(messages\);setDraft\(value\)/);
 assert.match(panel,/pendingSend\.current=null;clearPendingTextDraft\(sessionScope\)/);
 assert.match(panel,/setGuestPhase\(failure\.reverify\?"error":"paused"\)/);
 assert.match(panel,/if\(failure\.reverify&&!start\)\{invalidateGuestGrant\(\);setGuestPhase\("error"\)\}/);
 assert.match(panel,/if\(!key&&guestPhase==="error"\)setGuestPhase\("ready"\)/);
 assert.match(panel,/role="status"/);
 assert.match(panel,/t\("textChat\.ui\.notSent"\)/);
 const zhPending=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/voice.json")).textChat.ui.notSent;
 assert.match(zhPending,/等待驗證・尚未送出/);
});

test("Worker contract, layout constraints and locale status copy are preserved",()=>{
 assert.match(panel,/body:JSON\.stringify\(\{action:"start",challengeToken,\.\.\.\(authTicket\?\{authTicket\}:\{\}\)\}\)/);
 assert.match(panel,/action:"send",sessionToken:token,system:guestSystem/);
 assert.match(panel,/sendGuestTextWithRenewal\(/);
 assert.match(panel,/invalidateGuestGrant\(\)/);
 assert.ok(Buffer.byteLength(panel)<26000);
 assert.match(css,/\.crew-text-guest \.btn\{[^}]*min-height:44px/);
 assert.match(css,/\.crew-text-chat-form button\{min-height:46px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/font-size:(?:[0-9]|10|11)px/);
 for(const locale of ["zh-TW","en","de","es","fr","id","ja","ko","pt-BR","th","vi"]){
  const group=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/voice.json`)).guestText;
  for(const k of ["checkingHuman","interactionHint","connecting","sending","challengeTimeout","challengeUnavailable"])
   assert.ok(typeof group[k]==="string"&&group[k].trim(),locale+" "+k);
 }
});
