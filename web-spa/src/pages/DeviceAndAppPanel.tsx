import {useCallback,useEffect,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {
 diagnosticSummary,hasNativeDeviceBridge,probeNativeDeviceCapabilities,
 readNativeDeviceInfo,requestNativeDeviceAction,speakText
} from "../lib/deviceCapabilities";
import type {NativeDeviceFeatures,NativeDeviceInfo} from "../lib/deviceCapabilities";

/** Shared Web surface. Native operations render only after a successful handshake. */
export function DeviceAndAppPanel(){
 const {t}=useTranslation("settings");
 const [features,setFeatures]=useState<NativeDeviceFeatures|null>(null);
 const [info,setInfo]=useState<NativeDeviceInfo|null>(null);
 const [status,setStatus]=useState<"loading"|"ready"|"legacy"|"error">("loading");
 const [message,setMessage]=useState("");
 const [speaking,setSpeaking]=useState(false);
 const activeSpeech=useRef(false);
 const running=useRef(false);
 const nativeAvailable=hasNativeDeviceBridge();

 const refresh=useCallback(async()=>{
  if(!nativeAvailable){setStatus("legacy");return;}
  // Prevent overlapping requests while focus/visibility events arrive together.
  if(running.current)return;
  running.current=true;
  try{
   const next=await probeNativeDeviceCapabilities();
   setFeatures(next??null);
   if(!next?.deviceInfo){setInfo(null);setStatus("legacy");return;}
   const report=await readNativeDeviceInfo();
   setInfo(report);
   setStatus(report?"ready":"error");
  }catch{
   setInfo(null);
   setFeatures(null);
   setStatus("error");
  }finally{running.current=false}
 },[nativeAvailable]);

 useEffect(()=>{
  void refresh();
  const onVisible=()=>{if(document.visibilityState==="visible")void refresh()};
  window.addEventListener("focus",refresh);
  document.addEventListener("visibilitychange",onVisible);
  return()=>{
   window.removeEventListener("focus",refresh);
   document.removeEventListener("visibilitychange",onVisible);
   if(activeSpeech.current){
    // Stopping playback on leave is safe; no new speech or permission prompt.
    if(features?.stopSpeech)void requestNativeDeviceAction("stopSpeech",features);
    else if(typeof window!=="undefined"&&"speechSynthesis" in window)window.speechSynthesis.cancel();
   }
  };
 },[refresh,features]);

 async function settingsAction(action:"openAppSettings"|"openTtsSettings"){
  setMessage("");
  const ok=await requestNativeDeviceAction(action,features);
  if(!ok)setMessage(t("deviceApp.actionUnavailable"));
 }

 async function testSpeech(){
  setMessage("");
  try{
   activeSpeech.current=true;
   setSpeaking(true);
   await speakText("Hello, welcome to Koolo.",{speed:"normal"});
  }catch{
   activeSpeech.current=false;setSpeaking(false);
   setMessage(t("deviceApp.ttsUnavailable"));
  }
 }

 async function stopSpeech(){
  activeSpeech.current=false;setSpeaking(false);
  if(features?.stopSpeech)await requestNativeDeviceAction("stopSpeech",features);
  else if(typeof window!=="undefined"&&"speechSynthesis" in window)window.speechSynthesis.cancel();
 }

 async function copySummary(){
  if(!info)return;
  try{
   await navigator.clipboard.writeText(diagnosticSummary(info));
   setMessage(t("deviceApp.copied"));
  }catch{setMessage(t("deviceApp.copyFailed"))}
 }

 const fields:([string,string]|null)[] = info?[
  ["deviceApp.appVersion",info.appVersion],["deviceApp.build",info.appVersionCode],
  ["deviceApp.android",info.androidVersion],["deviceApp.sdk",info.androidSdk],
  ["deviceApp.webview",info.webViewVersion],["deviceApp.bridge",info.bridgeRevision],
  ["deviceApp.microphone",t("deviceApp.state."+info.microphone)],
  ["deviceApp.camera",t("deviceApp.state."+info.camera)],
  ["deviceApp.tts",t("deviceApp.state."+info.tts)],
  ["deviceApp.network",t("deviceApp.state."+info.network)],
  ["deviceApp.service",t("deviceApp.state."+info.crewService)]
 ]:[];

 return <div className="crew-device-app">
  <h3>{t("deviceApp.title")}</h3>
  <p className="meta">{t("deviceApp.description")}</p>
  {!nativeAvailable?<p className="meta">{t("deviceApp.browser")}</p>:
   status==="loading"?<p className="meta" role="status">{t("deviceApp.loading")}</p>:
   status==="legacy"?<p className="meta">{t("deviceApp.legacy")}</p>:
   <>
    {status==="error"&&<p className="meta" role="alert">{t("deviceApp.unavailable")}</p>}
    {features?.deviceInfo&&<div className="actions" style={{marginTop:14}}>
     {features.openAppSettings&&<button type="button" className="btn secondary" onClick={()=>void settingsAction("openAppSettings")}>{t("deviceApp.appSettings")}</button>}
     {features.openTtsSettings&&<button type="button" className="btn secondary" onClick={()=>void settingsAction("openTtsSettings")}>{t("deviceApp.ttsSettings")}</button>}
     {features.tts&&<button type="button" className="btn secondary" onClick={()=>void (speaking?stopSpeech():testSpeech())}>{t(speaking?"deviceApp.stopSpeech":"deviceApp.testSpeech")}</button>}
     {info&&<button type="button" className="btn secondary" onClick={()=>void copySummary()}>{t("deviceApp.copy")}</button>}
    </div>}
    <div className="actions" style={{marginTop:10}}><button type="button" className="btn secondary" onClick={()=>void refresh()}>{t("deviceApp.refresh")}</button></div>
    {info&&<details style={{marginTop:16}}>
     <summary>{t("deviceApp.details")}</summary>
     <dl className="crew-device-fields">{fields.filter((x):x is [string,string]=>x!==null).map(([key,value])=><div key={key} className="row" style={{justifyContent:"space-between",gap:12,padding:"6px 0"}}><dt>{t(key)}</dt><dd style={{margin:0,textAlign:"right",overflowWrap:"anywhere"}}>{value}</dd></div>)}</dl>
    </details>}
    {message&&<p className="meta" role="status">{message}</p>}
   </>}
  <p className="meta">{t("deviceApp.privacy")}</p>
 </div>;
}
