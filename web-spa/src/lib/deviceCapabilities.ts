import {hasCrewNativeVocabularyTts,nativeVocabularyTtsUrl} from "../teacher/nativeVocabularySpeech";

/**
 * The UI calls one capability layer, not UA/WebView-specific code.
 * Android preview injects a same-origin WebMessage object; legacy preview APKs
 * still use the old navigation command. Normal browsers use Web Speech.
 *
 * No microphone, camera or file permissions are requested here. Existing
 * HTML file inputs and getUserMedia remain their feature owners.
 */
export type SpeechSpeed="normal"|"slow";
export type DeviceTtsMode="native-message"|"native-legacy"|"browser"|"unavailable";
export type DeviceCapabilities={
 tts:DeviceTtsMode;
 photoPicker:"web-input";
 filePicker:"web-input";
 microphone:"web-permission"|"unavailable";
};

export type DeviceSpeechOptions={
 speed:SpeechSpeed;
 voice?:SpeechSynthesisVoice;
 onError?:(error:Error)=>void;
};

type WebMessagePort={
 postMessage:(data:string)=>void;
 onmessage:((event:{data:unknown})=>void)|null;
};
export type NativeDeviceFeatures={
 tts:boolean;
 photoPicker:string;
 filePicker:string;
 microphone:string;
 revision?:number;
 deviceInfo?:boolean;
 openAppSettings?:boolean;
 openTtsSettings?:boolean;
 stopSpeech?:boolean;
 cyberOrb?:boolean;
 cyberOrbWebKey?:boolean;
};
export type NativeDeviceInfo={
 appVersion:string;
 appVersionCode:string;
 androidVersion:string;
 androidSdk:string;
 webViewVersion:string;
 bridgeRevision:string;
 microphone:string;
 camera:string;
 tts:string;
 network:string;
 crewService:string;
};
type BridgeResponse={
 v:number;
 id:string;
 ok:boolean;
 capabilities?:NativeDeviceFeatures;
 data?:unknown;
 error?:string;
};
const BRIDGE_PROTOCOL_VERSION=1;
const TIMEOUT_MS=2500;
const pending=new Map<string,{resolve:(reply:BridgeResponse)=>void;reject:(error:Error)=>void;timeout:ReturnType<typeof setTimeout>}>();
let sequence=0;
let attachedPort:WebMessagePort|null=null;

function webMessagePort():WebMessagePort|null{
 if(typeof window==="undefined")return null;
 const port=(window as Window&{CrewDeviceBridge?:WebMessagePort}).CrewDeviceBridge;
 return port&&typeof port.postMessage==="function"?port:null;
}

function onBridgeReply(event:{data:unknown}):void{
 try{
  if(typeof event.data!=="string")return;
  const reply=JSON.parse(event.data) as Partial<BridgeResponse>;
  if(reply.v!==BRIDGE_PROTOCOL_VERSION||typeof reply.id!=="string"||typeof reply.ok!=="boolean")return;
  const entry=pending.get(reply.id);
  if(!entry)return;
  pending.delete(reply.id);
  clearTimeout(entry.timeout);
  entry.resolve(reply as BridgeResponse);
 }catch{/* Discard malformed native responses. */}
}

function sendNativeMessage(method:"getCapabilities"|"speak"|"getDeviceInfo"|"openAppSettings"|"openTtsSettings"|"stopSpeech"|"getOrbStatus"|"startOrb"|"stopOrb",
 params?:{text:string;rate:SpeechSpeed}|{roleType:"friend"|"teacher";roleId:string;language:string;ephemeralApiKey?:string}):Promise<BridgeResponse>{
 const port=webMessagePort();
 if(!port)return Promise.reject(new Error("Native device bridge unavailable"));
 if(attachedPort!==port){
  // A full WebView navigation may replace the injected object.
  for(const entry of pending.values()){
   clearTimeout(entry.timeout);
   entry.reject(new Error("Native device bridge changed"));
  }
  pending.clear();
  port.onmessage=onBridgeReply;
  attachedPort=port;
 }
 const id="crew_"+(++sequence);
 return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{
   pending.delete(id);
   reject(new Error("Native device bridge timed out"));
  },TIMEOUT_MS);
  pending.set(id,{resolve,reject,timeout});
  try{port.postMessage(JSON.stringify({v:BRIDGE_PROTOCOL_VERSION,id,method,...(params?{params}:{})}))}
  catch(error){
   clearTimeout(timeout);
   pending.delete(id);
   reject(error instanceof Error?error:new Error("Native device request failed"));
  }
 });
}

export function getDeviceCapabilities():DeviceCapabilities{
 const speech=typeof window!=="undefined"&&"speechSynthesis" in window
  &&typeof SpeechSynthesisUtterance!=="undefined";
 const tts:DeviceTtsMode=webMessagePort()?"native-message":
  hasCrewNativeVocabularyTts()?"native-legacy":speech?"browser":"unavailable";
 return{
  tts,
  photoPicker:"web-input",
  filePicker:"web-input",
  microphone:typeof navigator!=="undefined"&&typeof navigator.mediaDevices?.getUserMedia==="function"
   ?"web-permission":"unavailable"
 };
}

/** Explicit native handshake, useful for device smoke tests and diagnostics. */
export async function probeNativeDeviceCapabilities():Promise<BridgeResponse["capabilities"]|null>{
 if(!webMessagePort())return null;
 const result=await sendNativeMessage("getCapabilities");
 if(!result.ok||!result.capabilities)throw new Error("Native capabilities handshake failed");
 return result.capabilities;
}

/** The bridge itself is the authority: the UA token must never grant actions. */
export function hasNativeDeviceBridge():boolean{
 return webMessagePort()!==null;
}

const safeVersion=(value:unknown):string=>
 typeof value==="string"&&/^[A-Za-z0-9 ._+()-]{1,80}$/.test(value)?value:"unknown";
const safeState=(value:unknown,allowed:readonly string[]):string=>
 typeof value==="string"&&allowed.includes(value)?value:"unknown";
const safeNumber=(value:unknown):string=>
 typeof value==="number"&&Number.isSafeInteger(value)&&value>=0?String(value):"unknown";

function filterNativeDeviceInfo(value:unknown):NativeDeviceInfo|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const input=value as Record<string,unknown>;
 // Never serialize native objects wholesale; this explicit allowlist is also
 // used for the user-controlled diagnostic copy.
 return {
  appVersion:safeVersion(input.appVersion),
  appVersionCode:safeNumber(input.appVersionCode),
  androidVersion:safeVersion(input.androidVersion),
  androidSdk:safeNumber(input.androidSdk),
  webViewVersion:safeVersion(input.webViewVersion),
  bridgeRevision:safeNumber(input.bridgeRevision),
  microphone:safeState(input.microphone,["granted","denied"]),
  camera:safeState(input.camera,["granted","denied"]),
  tts:safeState(input.tts,["ready","initializing","missing_data","failed"]),
  network:safeState(input.network,["offline","os_validated","connected_unverified"]),
  crewService:safeState(input.crewService,["unknown"])
 };
}

export async function readNativeDeviceInfo():Promise<NativeDeviceInfo|null>{
 if(!webMessagePort())return null;
 const caps=await probeNativeDeviceCapabilities();
 // The old APK only knows getCapabilities and speak. Do not send a new
 // request (and wait for its timeout) unless it advertises the feature.
 if(!caps?.deviceInfo)return null;
 const reply=await sendNativeMessage("getDeviceInfo");
 return reply.ok?filterNativeDeviceInfo(reply.data):null;
}

export async function requestNativeDeviceAction(
 action:"openAppSettings"|"openTtsSettings"|"stopSpeech",
 features:NativeDeviceFeatures|null
):Promise<boolean>{
 if(!webMessagePort()||!features?.[action])return false;
 try{
  const reply=await sendNativeMessage(action);
  return reply.ok;
 }catch{return false}
}

/** Cyber Orb is an independent Android-native Gemini call, not a Web Live handoff. */
export type NativeOrbSelection={roleType:"friend"|"teacher";roleId:string;language:string};
export type NativeOrbStatus={
 active:boolean;roleType:string;roleId:string;language:string;
 keyConfigured:boolean;overlayAllowed:boolean;microphoneAllowed:boolean;
};
export type NativeOrbActionResult={ok:boolean;error?:string};

// Treat an API key as an opaque credential. The settings flow can verify it
// with Gemini; this boundary only makes sure it can safely cross the JSON
// bridge and HTTP header without controls or whitespace. Google may change
// key prefixes or formats independently of the WebView bridge.
const GEMINI_API_KEY_PATTERN=/^[\x21-\x7E]{20,256}$/;

export function isValidGeminiApiKey(value:string):boolean{
 return GEMINI_API_KEY_PATTERN.test(value.trim());
}

/** Avoid opening Android's native key dialog when neither supported key source is available. */
export function shouldBlockNativeOrbStartForMissingKey(
 features:NativeDeviceFeatures|null,nativeKeyConfigured:boolean|undefined,webGeminiKey:string
):boolean{
 return features?.cyberOrbWebKey===true&&nativeKeyConfigured!==true&&!isValidGeminiApiKey(webGeminiKey);
}

function safeOrbStatus(value:unknown):NativeOrbStatus|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const v=value as Record<string,unknown>;
 if(typeof v.active!=="boolean"||typeof v.keyConfigured!=="boolean"
  ||typeof v.overlayAllowed!=="boolean"||typeof v.microphoneAllowed!=="boolean")return null;
 const text=(value:unknown)=>typeof value==="string"&&/^[a-z]{0,16}$/.test(value)?value:"";
 return{active:v.active,roleType:text(v.roleType),roleId:text(v.roleId),language:text(v.language),
  keyConfigured:v.keyConfigured,overlayAllowed:v.overlayAllowed,microphoneAllowed:v.microphoneAllowed};
}

export async function readNativeOrbStatus(features:NativeDeviceFeatures|null):Promise<NativeOrbStatus|null>{
 if(!features?.cyberOrb||!webMessagePort())return null;
 const reply=await sendNativeMessage("getOrbStatus");
 return reply.ok?safeOrbStatus(reply.data):null;
}

export async function requestNativeOrbStart(
 selection:NativeOrbSelection,features:NativeDeviceFeatures|null,webGeminiKey=""
):Promise<NativeOrbActionResult>{
 if(!features?.cyberOrb||!webMessagePort())return{ok:false,error:"unavailable"};
 // Only transmit on explicit Start and to native builds advertising one-shot key support.
 const key=webGeminiKey.trim();
 const passKey=features.cyberOrbWebKey===true&&isValidGeminiApiKey(key);
 try{
  const reply=await sendNativeMessage("startOrb",{
   ...selection,...(passKey?{ephemeralApiKey:key}:{})
  });
  return{ok:reply.ok,error:reply.error};
 }catch{return{ok:false,error:"bridge_error"}}
}

export async function requestNativeOrbStop(features:NativeDeviceFeatures|null):Promise<NativeOrbActionResult>{
 if(!features?.cyberOrb||!webMessagePort())return{ok:false,error:"unavailable"};
 try{
  const reply=await sendNativeMessage("stopOrb");
  return{ok:reply.ok,error:reply.error};
 }catch{return{ok:false,error:"bridge_error"}}
}

export function diagnosticSummary(info:NativeDeviceInfo):string{
 const lines:[string,string][]=[
  ["App version",info.appVersion],
  ["App build",info.appVersionCode],
  ["Android",info.androidVersion],
  ["Android SDK",info.androidSdk],
  ["WebView",info.webViewVersion],
  ["Bridge revision",info.bridgeRevision],
  ["Microphone permission",info.microphone],
  ["Camera permission",info.camera],
  ["TTS",info.tts],
  ["Network (OS)",info.network],
  ["Crew service",info.crewService]
 ];
 return lines.map(([label,value])=>label+": "+value).join("\\n");
}

export async function speakText(text:string,options:DeviceSpeechOptions):Promise<void>{
 const mode=getDeviceCapabilities().tts;
 if(mode==="native-message"){
  const response=await sendNativeMessage("speak",{text,rate:options.speed});
  if(!response.ok)throw new Error("Android text-to-speech unavailable");
  return;
 }
 if(mode==="native-legacy"){
  window.location.assign(nativeVocabularyTtsUrl(text,options.speed));
  return;
 }
 if(mode!=="browser")throw new Error("Speech synthesis unavailable");
 // The caller may select a browser-local English voice; Android TTS voice
 // selection instead belongs to Android system settings.
 const utterance=new SpeechSynthesisUtterance(text);
 if(options.voice)utterance.voice=options.voice;
 utterance.lang=options.voice?.lang||"en-US";
 utterance.rate=options.speed==="slow"?0.8:1;
 utterance.pitch=1;
 utterance.onerror=event=>{
  if(event.error!=="canceled"&&event.error!=="interrupted")
   options.onError?.(new Error("Speech synthesis failed: "+event.error));
 };
 window.speechSynthesis.cancel();
 window.speechSynthesis.speak(utterance);
}
