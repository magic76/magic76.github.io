const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const starter=read('web-spa/src/live/GuestLiveStarter.tsx');
const helper=read('web-spa/src/live/guestTextChallenge.ts');
const panel=read('web-spa/src/live/TextChatPanel.tsx');
const retrySource=read('web-spa/src/live/guestMicRetry.ts');
const retryApi={};
Object.assign(retryApi,{setTimeout,clearTimeout,AbortController,Error});
vm.runInNewContext(stripTypeScriptTypes(retrySource,{mode:'strip'}).replace(/^export /gm,'')+'\nthis.rules={canRetryGuestMicrophone,isGuestVoiceVerificationExpired,guestStartDeadline,guestStartRequest}',retryApi);
const locales=['zh-TW','en','de','es','fr','id','ja','ko','pt-BR','th','vi'];

// Execute the real begin() body, not a reimplementation, with mocked browser I/O.
function trial(errorName,withFallback=true,afterToken=false){
 const actions=[],events=[],messages=[];
 const fallback=withFallback?{href:'/friend/live?id=zoe&post=short01&quote=daily&chat=text',name:'Zoe'}:undefined;
 const beginSource=starter.slice(starter.indexOf('async function begin(textOnly=false){'),starter.indexOf('\n return <div className="notice guest-live-entry"'));
 const body=stripTypeScriptTypes(beginSource,{mode:'strip'});
 let allowed=false;
 const microphone=errorName==='missing'?undefined:async()=>{
  if(!afterToken&&!allowed&&errorName)throw new DOMException('microphone unavailable',errorName);
  return {getTracks:()=>[{stop(){}}]};
 };
 const ctx={
  DOMException,Error,Event,window:{dispatchEvent(){}},console:{warn(){}},
  navigator:{mediaDevices:microphone?{getUserMedia:microphone}:undefined},
  busy:{current:false},phase:'ready',challenge:'unused-challenge',micUnavailable:false,role:'friend',friendMemory:false,learningFeedback:false,active:{current:true},
  ...retryApi.rules,
  signinRequired:false,memberSignedIn:false,textFallback:fallback,
  ensureLive:async()=>{},trackUsageEvent:(name)=>events.push(name),
  offerGuestChallengeToken:token=>actions.push(['offer',token]),
  navigate:(href,options)=>actions.push(['navigate',href,options]),
  setMicPermissionDenied:value=>actions.push(['micDenied',value]),
  setMicUnavailable:value=>{ctx.micUnavailable=value;actions.push(['micUnavailable',value])},
  setChallenge:value=>{ctx.challenge=value;actions.push(['challenge',value])},
  setPhase:value=>{ctx.phase=value;actions.push(['phase',value])},
  setMessage:value=>messages.push(value),setStartStage:value=>actions.push(['stage',value]),
  t:(key)=>key,fetch:async()=>{if(afterToken)throw new DOMException('token failed','NotAllowedError');return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({token:'token-one',model:'gemini-3.8-live',seconds:300})}},
  GUEST_TOKEN_ENDPOINT:'/guest/token',onGrant:async grant=>actions.push(['grant',grant]),
 };
 vm.runInNewContext(body+'\nthis.begin=begin',ctx);
 return {begin:ctx.begin,actions,events,messages,allowMicrophone(){allowed=true},get phase(){return ctx.phase}};
}

test('mic failure keeps voice recovery visible and reuses the same verification when permissions change',async()=>{
 for(const [name,event] of [['NotAllowedError','guest_trial_mic_denied'],['NotFoundError','guest_trial_setup_failed'],['SecurityError','guest_trial_setup_failed'],['missing','guest_trial_setup_failed']]){
  const h=trial(name);await h.begin();
  assert.equal(h.phase,'error',name);
  assert.equal(h.events.filter(x=>x===event).length,1,name);
  assert.equal(h.actions.filter(x=>x[0]==='offer'||x[0]==='navigate').length,0,name);
  assert.ok(h.actions.some(x=>x[0]==='micUnavailable'&&x[1]),name);
  if(name!=='missing'){
   h.allowMicrophone();await h.begin();
   assert.equal(h.actions.filter(x=>x[0]==='grant').length,1,name);
   assert.equal(h.actions.filter(x=>x[0]==='offer'||x[0]==='navigate').length,0,name);
  }
 }
});

test('without fallback mic error remains; unrelated network/token failures do not redirect',async()=>{
 for(const name of ['NotAllowedError','NotFoundError','missing']){
  const h=trial(name,false);await h.begin();
  assert.equal(h.phase,'error');
  if(name!=='NotAllowedError')assert.ok(h.messages.includes('guestTrial.micNotFound'),name);
 }
 for(const [name,tokenRequested] of [['AbortError',false],['NotAllowedError',true]]){
  const h=trial(name,true,tokenRequested);await h.begin();
  assert.equal(h.actions.filter(x=>x[0]==='offer'||x[0]==='navigate').length,0,name);
  assert.ok(h.events.includes(tokenRequested?'guest_trial_token_failed':'guest_trial_setup_failed'));
 }
});

function challengeHarness(){
 const hooks=[],effects=[],events=[],scripts=new Map(),timers=new Map();
 let cursor=0,tick=0,now=10000;
 const same=(a,b)=>a?.length===b?.length&&a.every((x,i)=>Object.is(x,b[i]));
 function useState(value){const i=cursor++;if(!hooks[i])hooks[i]={value:typeof value==='function'?value():value};return[hooks[i].value,next=>{hooks[i].value=typeof next==='function'?next(hooks[i].value):next}]}
 function useRef(value){const i=cursor++;return (hooks[i]??={value:{current:value}}).value}
 function useCallback(fn,deps){const i=cursor++;if(!hooks[i]||!same(hooks[i].deps,deps))hooks[i]={value:fn,deps};return hooks[i].value}
 function useEffect(fn,deps){const i=cursor++,h=hooks[i]??={};if(!same(h.deps,deps)){h.deps=deps;h.next=fn}hooks[i]=h}
 function flush(){for(const h of hooks)if(h.next){h.cleanup?.();h.cleanup=h.next();h.next=null}}
 const document={getElementById:id=>scripts.get(id)||null,createElement:()=>({listeners:new Map(),addEventListener(name,fn){this.listeners.set(name,fn)},removeEventListener(name,fn){if(this.listeners.get(name)===fn)this.listeners.delete(name)},remove(){scripts.delete(this.id)}}),head:{appendChild(script){scripts.set(script.id,script);events.push('load-script')}}};
 const ctx={useState,useRef,useCallback,useEffect,window:{turnstile:undefined},document,Date:{now:()=>now},
  setTimeout(fn){const id=++tick;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)}};
 const source=stripTypeScriptTypes(helper,{mode:'strip'}).replace(/^import .*;\s*$/gm,'').replace(/^export /gm,'');
 vm.runInNewContext(source+'\nthis.api={useGuestTextChallenge,offerGuestChallengeToken,hasGuestChallengeHandoff,takeMicFallbackNotice,takeUsedGuestHandoff,clearGuestChallengeHandoff}',ctx);
 function render(){cursor=0;const result=ctx.api.useGuestTextChallenge(true,'ready','sitekey');if(result.requested)result.host.current={};flush();return result}
 return {ctx,render,events,timers,scripts,advance(ms){now+=ms}};
}

test('single-use 240-second in-memory token bypasses Turnstile once; next send returns to original on-demand path',async()=>{
 const h=challengeHarness(),api=h.ctx.api;
 let hook=h.render();
 api.offerGuestChallengeToken('fresh-handoff');
 assert.equal(api.hasGuestChallengeHandoff(),true);
 assert.equal(api.takeMicFallbackNotice(),true);assert.equal(api.takeMicFallbackNotice(),false);
 assert.equal(await hook.waitForChallenge(),'fresh-handoff');
 assert.equal(api.takeUsedGuestHandoff(),true);
 assert.equal(api.takeUsedGuestHandoff(),false);
 assert.equal(h.events.length,0);assert.equal(h.scripts.size,0);
 assert.equal(api.hasGuestChallengeHandoff(),false);
 const second=hook.waitForChallenge();hook=h.render();
 assert.deepEqual(h.events,['load-script']);
 api.clearGuestChallengeHandoff();
 h.ctx.window.turnstile={render:(_host,opt)=>{h.callback=opt.callback;return 'id-1'},execute(){},remove(){}};
 h.scripts.get('crew-guest-turnstile').listeners.get('load')();
 h.callback('second-token');assert.equal(await second,'second-token');
 assert.equal(api.takeUsedGuestHandoff(),false);
});

test('expired or revoked token is never reused; handoff never writes to browser storage',()=>{
 const h=challengeHarness(),api=h.ctx.api;
 api.offerGuestChallengeToken('will-expire');h.advance(240001);
 assert.equal(api.hasGuestChallengeHandoff(),false);
 h.render();void h.render().waitForChallenge();h.render();assert.deepEqual(h.events,['load-script']);
 api.offerGuestChallengeToken('to-revoke');api.clearGuestChallengeHandoff();
 assert.equal(api.hasGuestChallengeHandoff(),false);
 assert.doesNotMatch(helper,/\blocalStorage\b|\bsessionStorage\b|\bconsole\./);
 assert.doesNotMatch(starter,/sessionStorage\.setItem|localStorage\.setItem/);
});

test('a rejected transferred token automatically requests a fresh challenge once, using unchanged Worker start contract',async()=>{
 const source=panel.slice(panel.indexOf('async function startGuestText():Promise<string>{'),panel.indexOf('\n async function sendMessage(text:string)'));
 const code=stripTypeScriptTypes(source,{mode:'strip'});
 const requests=[],phases=[];let calls=0;
 const ctx={
  t:key=>key,hasGuestChallengeHandoff:()=>calls===0,waitForChallenge:async()=>{calls++;return calls===1?'handoff':'new-human-token'},
  takeUsedGuestHandoff:()=>calls===1,setGuestStatus:()=>{},setGuestPhase:p=>phases.push(p),
  textAuthTicket:async()=>undefined,setDailyLimit:()=>{},
  fetch:async(_url,options)=>{const body=JSON.parse(options.body);requests.push(body);return {ok:body.challengeToken==='new-human-token',status:body.challengeToken==='new-human-token'?200:403,json:async()=>body.challengeToken==='new-human-token'?{sessionToken:'s',expiresAt:Date.now()+60000,remaining:10}:{code:'VERIFY_FAILED'}}},
  GUEST_TEXT_ENDPOINT:'/api/guest/text',sessionStorage:{setItem(){}} ,mounted:{current:true},setGuestToken:()=>{},setRemaining:()=>{},backendFailureCount:{current:0},phaseRef:{current:'ready'},
  classifyGuestTextFailure:err=>({reverify:err.message==='VERIFY_FAILED',kind:err.message==='VERIFY_FAILED'?'verification':'backend'}),
  guestTextWorkerError:code=>Error(code),markGuestTextStartError:err=>err,
 };
 vm.runInNewContext(code+'\nthis.run=startGuestText',ctx);
 assert.equal(await ctx.run(),'s');assert.equal(calls,2);
 assert.deepEqual(requests.map(x=>x.challengeToken),['handoff','new-human-token']);
 assert.ok(requests.every(x=>x.action==='start'));
 assert.ok(phases.includes('ready'));
 assert.match(panel,/const challengeToken=await waitForChallenge\(\)/);
 assert.match(panel,/body:JSON\.stringify\(\{action:"start",challengeToken,\.\.\.\(authTicket\?\{authTicket\}:\{\}\)\}\)/);
 assert.ok(requests.every(x=>!Object.hasOwn(x,"authTicket")));
 assert.match(panel,/acquire:startGuestText/);
 assert.match(panel,/handedOff&&failure\.reverify&&mounted\.current/);
});

test('one-shot accessible message and all 11 localized strings remain within build limits',()=>{
 assert.match(panel,/useState\(takeMicFallbackNotice\)/);
 assert.match(panel,/micFallbackNotice&&<small role="status">\{t\("guestText\.micFallbackNotice",\{name:speaker\}\)\}<\/small>/);
 assert.ok(Buffer.byteLength(panel)<26000);
 assert.ok(Buffer.byteLength(starter)<26000);
 for(const loc of locales){
  const common=JSON.parse(read(`web-spa/src/i18n/locales/${loc}/common.json`)).guestTrial;
  const voice=JSON.parse(read(`web-spa/src/i18n/locales/${loc}/voice.json`)).guestText;
  for(const key of ['micTextTitle','micTextDesc','micTextFallback','micNotFound','retryMic','micSitePermission'])assert.ok(typeof common[key]==='string'&&common[key].trim(),loc+':'+key);
  assert.ok(typeof voice.micFallbackNotice==='string'&&voice.micFallbackNotice.trim());
  assert.match(common.micTextFallback,/\{\{name\}\}/);assert.match(voice.micFallbackNotice,/\{\{name\}\}/);
 }
});

test('guest startup begins microphone request before runtime and before token POST',async()=>{
 const h=trial(null);await h.begin();
 assert.deepEqual(h.actions.filter(x=>x[0]==='stage').map(x=>x[1]),['microphone','runtime','token','session']);
 assert.ok(starter.indexOf('guestStartDeadline(navigator.mediaDevices.getUserMedia({audio:true})')<starter.indexOf('await guestStartDeadline(ensureLive()'));
});
test('startup deadlines reject stuck requests and clean up a microphone resolving late',async()=>{
 let resolveMic,stops=0;
 const pending=new Promise(resolve=>{resolveMic=resolve});
 const wait=retryApi.rules.guestStartDeadline(pending,5,'microphone',stream=>stream.getTracks().forEach(track=>track.stop()));
 await assert.rejects(wait,{name:'MicrophoneTimeoutError'});
 resolveMic({getTracks:()=>[{stop(){stops++}}]});
 await Promise.resolve();
 assert.equal(stops,1);
 let aborted=false;
 await assert.rejects(retryApi.rules.guestStartDeadline(new Promise(()=>{}),5,'token',undefined,()=>{aborted=true}),{name:'GuestStartTimeoutError'});
 assert.equal(aborted,true);
});
