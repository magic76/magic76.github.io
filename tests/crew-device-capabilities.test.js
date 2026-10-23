const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");

function load({agent="",withWebSpeech=true,bridge=null,mic=false}={}){
 const src=readFileSync("web-spa/src/lib/deviceCapabilities.ts","utf8")
  .replace(/^import .*;\s*$/gm,"")
  .replace(/\bexport\s+(?=(?:const|function|async|type|interface)\b)/g,"");
 const js=stripTypeScriptTypes(src,{mode:"strip"});
 const said=[];
 const fakeWindow={
  location:{assign:url=>said.push({url})},
  ...(withWebSpeech?{speechSynthesis:{cancel:()=>said.push({cancel:true}),speak:utt=>said.push({utterance:utt})}}:{})
 };
 if(bridge)fakeWindow.CrewDeviceBridge=bridge;
 class FakeUtterance {constructor(text){this.text=text;}}
 const ctx={
  window:fakeWindow,navigator:{userAgent:agent,mediaDevices:mic?{getUserMedia(){}}:undefined},
  SpeechSynthesisUtterance:withWebSpeech?FakeUtterance:undefined,
  hasCrewNativeVocabularyTts:()=>agent.split(/\s+/).includes("CrewNativeTts/1"),
  nativeVocabularyTtsUrl:(text,rate)=>"crew-tts://speak?text="+encodeURIComponent(text)+"&rate="+rate,
  setTimeout,clearTimeout,Map,Error,JSON
 };
 const api=vm.runInNewContext("(function(){"+js+"\nreturn {getDeviceCapabilities,probeNativeDeviceCapabilities,speakText,hasNativeDeviceBridge,readNativeDeviceInfo,requestNativeDeviceAction,diagnosticSummary,readNativeOrbStatus,requestNativeOrbStart,requestNativeOrbStop};})()",ctx);
 return{...api,said,window:fakeWindow};
}

test("normal browsers and missing Web Speech choose the right capabilities",async()=>{
 const browser=load({mic:true});
 assert.equal(browser.getDeviceCapabilities().tts,"browser");
 assert.equal(browser.getDeviceCapabilities().photoPicker,"web-input");
 assert.equal(browser.getDeviceCapabilities().filePicker,"web-input");
 assert.equal(browser.getDeviceCapabilities().microphone,"web-permission");
 const voice={lang:"en-GB"};
 await browser.speakText("hello",{speed:"slow",voice});
 assert.equal(browser.said[1].utterance.rate,0.8);
 assert.equal(browser.said[1].utterance.voice,voice);
 assert.equal(browser.said[1].utterance.lang,"en-GB");
 assert.equal(browser.said[1].utterance.pitch,1);
 assert.equal(load({withWebSpeech:false}).getDeviceCapabilities().tts,"unavailable");
});

test("old debug shell keeps bounded URL-based native TTS and new browser does not",async()=>{
 const legacy=load({agent:"Mozilla/5.0 CrewAndroidShell/1 CrewNativeTts/1",withWebSpeech:false});
 assert.equal(legacy.getDeviceCapabilities().tts,"native-legacy");
 await legacy.speakText("take off",{speed:"slow"});
 assert.equal(legacy.said[0].url,"crew-tts://speak?text=take%20off&rate=slow");
 assert.equal(load({agent:"Mozilla/5.0 Android wv",withWebSpeech:false})
  .getDeviceCapabilities().tts,"unavailable");
});

test("new Android adapter uses versioned postMessage handshake and speech",async()=>{
 const sent=[];
 const bridge={
  onmessage:null,
  postMessage(value){
   const request=JSON.parse(value);
   sent.push(request);
   const response={
    v:1,id:request.id,ok:true,
    capabilities:{tts:true,photoPicker:"web-input",filePicker:"web-input",microphone:"web-permission"}
   };
   // The listener must match request IDs and avoid other callers' replies.
   bridge.onmessage({data:JSON.stringify({...response,id:"wrong"})});
   bridge.onmessage({data:JSON.stringify(response)});
  }
 };
 const device=load({agent:"CrewNativeTts/1 CrewDeviceBridge/1",bridge,withWebSpeech:false});
 assert.equal(device.getDeviceCapabilities().tts,"native-message");
 const capabilities=await device.probeNativeDeviceCapabilities();
 assert.equal(capabilities.tts,true);
 await device.speakText("apple",{speed:"normal"});
 assert.deepEqual(JSON.parse(JSON.stringify(sent.map(x=>x.method))),["getCapabilities","speak"]);
 assert.equal(sent[1].v,1);
 assert.equal(sent[1].params.text,"apple");
 assert.equal(sent[1].params.rate,"normal");
 assert.deepEqual(device.said,[]);
});

test("native negative acknowledgment is never silently retried with browser TTS",async()=>{
 const bridge={onmessage:null,postMessage(message){
  const {id}=JSON.parse(message);
  bridge.onmessage({data:JSON.stringify({v:1,id,ok:false})});
 }};
 const device=load({bridge});
 await assert.rejects(device.speakText("hello",{speed:"normal"}),/Android text-to-speech unavailable/);
 assert.equal(device.said.length,0);
});

test("diagnostic actions are not authorized by UA; old APK degrades without unknown commands",async()=>{
 const browser=load({agent:"CrewAndroidShell/1 CrewDeviceBridge/1",withWebSpeech:false});
 assert.equal(browser.hasNativeDeviceBridge(),false);
 assert.equal(await browser.readNativeDeviceInfo(),null);
 assert.equal(await browser.requestNativeDeviceAction("openAppSettings",null),false);
 const methods=[];
 const legacy={onmessage:null,postMessage(value){
  const {v,id,method}=JSON.parse(value);methods.push(method);
  if(method==="getCapabilities")legacy.onmessage({data:JSON.stringify({
   v,id,ok:true,capabilities:{tts:true,photoPicker:"web-input",filePicker:"web-input",microphone:"web-permission"}
  })});
 }};
 const device=load({bridge:legacy,withWebSpeech:false});
 assert.equal(await device.readNativeDeviceInfo(),null);
 assert.equal(await device.requestNativeDeviceAction("openAppSettings",await device.probeNativeDeviceCapabilities()),false);
 assert.deepEqual(methods,["getCapabilities","getCapabilities"]);
});

test("new APK returns only allowlisted device fields and gated methods",async()=>{
 const sent=[];
 const caps={tts:true,revision:2,photoPicker:"web-input",filePicker:"web-input",
  microphone:"web-permission",deviceInfo:true,openAppSettings:true,openTtsSettings:false,stopSpeech:true};
 const bridge={onmessage:null,postMessage(value){
  const {v,id,method}=JSON.parse(value);sent.push(method);
  bridge.onmessage({data:JSON.stringify(method==="getCapabilities"
   ?{v,id,ok:true,capabilities:caps}
   :method==="getDeviceInfo"?{v,id,ok:true,data:{
    appVersion:"1.9.30",appVersionCode:104,androidVersion:"15",androidSdk:35,
    webViewVersion:"130.1",bridgeRevision:2,microphone:"granted",camera:"denied",
    tts:"ready",network:"os_validated",crewService:"unknown",
    apiKey:"SUPER-SECRET",url:"https://site/?apiKey=secret",conversation:"private"}}
   :{v,id,ok:true})});
 }};
 const device=load({bridge,withWebSpeech:false});
 const report=await device.readNativeDeviceInfo();
 assert.equal(report.appVersion,"1.9.30");
 assert.equal(report.camera,"denied");
 const summary=device.diagnosticSummary(report);
 assert.doesNotMatch(summary,/SUPER-SECRET|apiKey|private|https/);
 assert.match(summary,/Crew service: unknown/);
 assert.equal(await device.requestNativeDeviceAction("openAppSettings",caps),true);
 assert.equal(await device.requestNativeDeviceAction("openTtsSettings",caps),false);
 assert.deepEqual(sent,["getCapabilities","getDeviceInfo","openAppSettings"]);
});

test("Cyber Orb is capability-gated and never sends Web memories or API keys",async()=>{
 const browser=load({withWebSpeech:false});
 assert.equal(await browser.readNativeOrbStatus(null),null);
 assert.equal((await browser.requestNativeOrbStart({roleType:"friend",roleId:"zoe",language:"ja"},null)).ok,false);
 const calls=[];
 const caps={tts:true,cyberOrb:true};
 const bridge={onmessage:null,postMessage(value){
  const request=JSON.parse(value);calls.push(request);
  const response=request.method==="getOrbStatus"
   ?{v:1,id:request.id,ok:true,data:{
    active:true,roleType:"friend",roleId:"zoe",language:"ja",
    keyConfigured:true,overlayAllowed:true,microphoneAllowed:true,apiKey:"SECRET",transcript:"PRIVATE"}}
   :{v:1,id:request.id,ok:true};
  bridge.onmessage({data:JSON.stringify(response)});
 }};
 const device=load({bridge});
 const status=await device.readNativeOrbStatus(caps);
 assert.equal(status.active,true);
 assert.equal(status.roleId,"zoe");
 assert.equal("apiKey" in status,false);
 const started=await device.requestNativeOrbStart({roleType:"friend",roleId:"zoe",language:"ja"},caps);
 assert.equal(started.ok,true);
 assert.equal((await device.requestNativeOrbStop(caps)).ok,true);
 assert.deepEqual(calls.map(x=>x.method),["getOrbStatus","startOrb","stopOrb"]);
 assert.deepEqual(calls[1].params,{roleType:"friend",roleId:"zoe",language:"ja"});
 assert.doesNotMatch(JSON.stringify(calls),/SECRET|PRIVATE|memory|apiKey/);
});

test("older Android bridge cannot start Cyber Orb",async()=>{
 const methods=[];
 const legacy={onmessage:null,postMessage(value){
  const request=JSON.parse(value);methods.push(request.method);
  legacy.onmessage({data:JSON.stringify({
   v:1,id:request.id,ok:true,capabilities:{tts:true}
  })});
 }};
 const device=load({bridge:legacy});
 const caps=await device.probeNativeDeviceCapabilities();
 assert.equal(caps.cyberOrb,undefined);
 assert.equal(await device.readNativeOrbStatus(caps),null);
 assert.equal((await device.requestNativeOrbStart({roleType:"teacher",roleId:"emma",language:"en"},caps)).ok,false);
 assert.deepEqual(methods,["getCapabilities"]);
});

test("one-shot Web Key travels to Android only on supported explicit Orb start",async()=>{
 const key="AIzaSyTEST_123456789012345678901234567890";
 const actions=[];
 const bridge={onmessage:null,postMessage(data){
  const req=JSON.parse(data);actions.push(req);
  bridge.onmessage({data:JSON.stringify({v:1,id:req.id,ok:true})});
 }};
 const device=load({bridge});
 const selection={roleType:"friend",roleId:"zoe",language:"en"};
 assert.equal((await device.requestNativeOrbStart(selection,{cyberOrb:true,cyberOrbWebKey:true},key)).ok,true);
 assert.equal(actions[0].params.ephemeralApiKey,key);
 assert.equal(actions[0].params.roleId,"zoe");
 assert.equal((await device.requestNativeOrbStart(selection,{cyberOrb:true,cyberOrbWebKey:true},"invalid-key")).ok,true);
 assert.equal("ephemeralApiKey" in actions[1].params,false);
 assert.equal((await device.requestNativeOrbStart(selection,{cyberOrb:true},key)).ok,true);
 assert.equal("ephemeralApiKey" in actions[2].params,false);
 assert.equal(actions[0].method,"startOrb");
});
