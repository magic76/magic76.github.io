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
 const api=vm.runInNewContext("(function(){"+js+"\nreturn {getDeviceCapabilities,probeNativeDeviceCapabilities,speakText};})()",ctx);
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
