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
type BridgeResponse={
 v:number;
 id:string;
 ok:boolean;
 capabilities?:{tts:boolean;photoPicker:string;filePicker:string;microphone:string};
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

function sendNativeMessage(method:"getCapabilities"|"speak",params?:{text:string;rate:SpeechSpeed}):Promise<BridgeResponse>{
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
