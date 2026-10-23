import {useCallback,useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import {CREW_FRIENDS} from "../friends/friendProfiles";
import {TEACHER_PROFILES} from "../teacher/teacherProfiles";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {
 hasNativeDeviceBridge,probeNativeDeviceCapabilities,
 readNativeOrbStatus,requestNativeOrbStart,requestNativeOrbStop
} from "../lib/deviceCapabilities";
import type {NativeDeviceFeatures,NativeOrbStatus} from "../lib/deviceCapabilities";
import "./cyberOrb.css";

type RoleType="friend"|"teacher";
const messages={
 zh:{
  title:"Cyber Orb · 隨身 AI 聊天",intro:"選一位 Crew 角色，切到其他 App 也能透過懸浮球繼續語音聊天。",
  friend:"Crew Friends",teacher:"Crew Teachers",language:"對話語言",start:"開啟 Cyber Orb",stop:"結束懸浮對話",
  loading:"讀取原生服務中…",active:"正在與 {name} 對話",private:"獨立原生通話 · 不同步 Web 記憶、聊天紀錄或學習進度",
  note:"請先結束目前的 Web 語音通話，再開啟 Cyber Orb。不同角色需要先掛斷才能切換。",
  native_key_required:"請在剛開啟的 Android 原生視窗設定 Gemini API Key，完成後再次點選開始。",
  overlay_permission_required:"請允許在其他 App 上層顯示，返回 Crew 後再次點選開始。",
  microphone_permission_required:"請允許使用麥克風，返回 Crew 後再次點選開始。",
  already_active:"已有 Cyber Orb 通話。先結束原通話，再選擇其他角色。",
  start_failed:"無法啟動原生語音服務，請稍後重試。",bridge_error:"Android 裝置橋接無回應，請重新開啟 App。",
  unavailable:"此版本尚不支援 Cyber Orb。",unknown:"操作失敗，請重試。"
 },
 en:{
  title:"Cyber Orb · Hands-free chat",intro:"Choose a Crew character and keep talking while using other Android apps.",
  friend:"Crew Friends",teacher:"Crew Teachers",language:"Conversation language",start:"Start Cyber Orb",stop:"End Orb call",
  loading:"Checking Android service…",active:"Talking with {name}",private:"Independent native call · No Web memories, transcripts or learning records",
  note:"End any ongoing Web voice call first. End the current Orb call before switching characters.",
  native_key_required:"Set a Gemini API Key in the Android dialog, then tap Start again.",
  overlay_permission_required:"Allow display over other apps, return to Crew, then tap Start again.",
  microphone_permission_required:"Allow microphone access, return to Crew, then tap Start again.",
  already_active:"An Orb call is already active. End it before choosing another character.",
  start_failed:"The native voice service could not start. Please retry.",bridge_error:"Android bridge did not respond. Reopen Crew.",
  unavailable:"Cyber Orb is unavailable in this App version.",unknown:"The operation failed. Try again."
 }
};

export function CyberOrbPanel(){
 const {i18n}=useTranslation();
 const copy=i18n.language.startsWith("zh")?messages.zh:messages.en;
 const [features,setFeatures]=useState<NativeDeviceFeatures|null>(null);
 const [status,setStatus]=useState<NativeOrbStatus|null>(null);
 const [roleType,setRoleType]=useState<RoleType>("friend");
 const [roleId,setRoleId]=useState("zoe");
 const [language,setLanguage]=useState("en");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [checking,setChecking]=useState(true);
 const [available,setAvailable]=useState(false);

 const refresh=useCallback(async()=>{
  if(!hasNativeDeviceBridge()){setChecking(false);return}
  try{
   const caps=await probeNativeDeviceCapabilities();
   if(!caps?.cyberOrb){setChecking(false);return}
   setAvailable(true);
   setFeatures(caps);
   const next=await readNativeOrbStatus(caps);
   if(next)setStatus(next);
  }catch{/* Older app versions should not render a broken Orb control. */}
  finally{setChecking(false)}
 },[]);

 useEffect(()=>{
  void refresh();
  const visible=()=>{if(document.visibilityState==="visible")void refresh()};
  window.addEventListener("focus",refresh);
  document.addEventListener("visibilitychange",visible);
  return()=>{window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",visible)};
 },[refresh]);

 const profiles=roleType==="friend"?CREW_FRIENDS:TEACHER_PROFILES;
 const activeName= status?.roleType==="friend"
  ?CREW_FRIENDS.find(p=>p.id===status.roleId)?.name
  :TEACHER_PROFILES.find(p=>p.id===status?.roleId)?.name;

 async function start(){
  if(!features||busy)return;
  if(status?.active){setMessage(copy.already_active);return}
  setBusy(true);setMessage("");
  const result=await requestNativeOrbStart({roleType,roleId,language},features);
  if(result.ok){
   setStatus(old=>({active:true,roleType,roleId,language,
    keyConfigured:old?.keyConfigured??true,overlayAllowed:true,microphoneAllowed:true}));
  }else{
   const key=result.error as keyof typeof copy;
   setMessage((key&&copy[key])||copy.unknown);
  }
  setBusy(false);
 }
 async function stop(){
  if(!features||busy)return;
  setBusy(true);setMessage("");
  const result=await requestNativeOrbStop(features);
  if(result.ok)setStatus(old=>old?{...old,active:false,roleType:"",roleId:"",language:""}:null);
  else setMessage(copy.unknown);
  setBusy(false);
 }

 if(!hasNativeDeviceBridge()||(!available&&!checking))return null;
 if(!available)return null; // No Orb button until the native capability handshake succeeds.
 return <section className="crew-orb-panel" id="crew-cyber-orb" aria-labelledby="crew-orb-title">
  <header className="crew-orb-head">
   <span className="crew-orb-symbol" aria-hidden="true">◉</span>
   <div><h3 id="crew-orb-title">{copy.title}</h3><p>{copy.intro}</p></div>
  </header>
  {status?.active?<div className="crew-orb-call" role="status">
    <span className="crew-orb-dot" aria-hidden="true"/>
    <strong>{copy.active.replace("{name}",activeName||status.roleId)}</strong>
   </div>:null}
  <div className="crew-orb-tabs" role="group" aria-label="Crew role type">
   {(["friend","teacher"] as const).map(type=><button type="button" key={type}
    aria-pressed={roleType===type} className={roleType===type?"selected":""}
    disabled={busy||!!status?.active}
    onClick={()=>{setRoleType(type);setRoleId(type==="friend"?"zoe":"emma");setMessage("")}}>
    {copy[type]}
   </button>)}
  </div>
  <div className="crew-orb-roles" role="group" aria-label={copy.title}>
   {profiles.map(profile=><button key={profile.id} type="button"
    className={"crew-orb-role"+(roleId===profile.id?" selected":"")}
    aria-pressed={roleId===profile.id} disabled={busy||!!status?.active}
    onClick={()=>setRoleId(profile.id)}>
    <img src={profile.avatar} alt="" loading="lazy"/>
    <span>{profile.name}</span>
   </button>)}
  </div>
  <label className="crew-orb-language">{copy.language}
   <select value={language} disabled={busy||!!status?.active} onChange={e=>setLanguage(e.target.value)}>
    {TARGET_LANGUAGES.map(item=><option key={item.code} value={item.code}>{i18n.language.startsWith("zh")?item.value:item.spoken}</option>)}
   </select>
  </label>
  <p className="crew-orb-private">{copy.private}</p>
  <div className="crew-orb-actions">
   {status?.active?<button type="button" className="crew-orb-stop" disabled={busy} onClick={()=>void stop()}>{copy.stop}</button>:
    <button type="button" className="crew-orb-start" disabled={busy} onClick={()=>void start()}>{busy?copy.loading:copy.start}</button>}
  </div>
  <p className="crew-orb-note">{copy.note}</p>
  {message&&<p className="crew-orb-message" role="status">{message}</p>}
 </section>;
}
