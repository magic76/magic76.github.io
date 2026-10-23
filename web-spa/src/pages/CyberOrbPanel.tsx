import {useCallback,useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import {CREW_FRIENDS} from "../friends/friendProfiles";
import {TEACHER_PROFILES} from "../teacher/teacherProfiles";
import {TeacherAvatar} from "../teacher/TeacherAvatar";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {geminiKey} from "../lib/runtime";
import {
 hasNativeDeviceBridge,isValidGeminiApiKey,probeNativeDeviceCapabilities,
 shouldBlockNativeOrbStartForMissingKey,
 readNativeOrbStatus,requestNativeOrbStart,requestNativeOrbStop
} from "../lib/deviceCapabilities";
import type {NativeDeviceFeatures,NativeOrbStatus} from "../lib/deviceCapabilities";
import "./cyberOrb.css";

type RoleType="friend"|"teacher";
export function CyberOrbPanel(){
 const {t,i18n}=useTranslation("settings");
 const copy={
  title:t("cyberOrb.title"),intro:t("cyberOrb.intro"),
  friend:t("cyberOrb.friend"),teacher:t("cyberOrb.teacher"),
  language:t("cyberOrb.language"),start:t("cyberOrb.start"),
  stop:t("cyberOrb.stop"),loading:t("cyberOrb.loading"),
  active:t("cyberOrb.active"),private:t("cyberOrb.private"),
  note:t("cyberOrb.note"),native_key_required:t("cyberOrb.native_key_required"),
  overlay_permission_required:t("cyberOrb.overlay_permission_required"),
  microphone_permission_required:t("cyberOrb.microphone_permission_required"),
  already_active:t("cyberOrb.already_active"),start_failed:t("cyberOrb.start_failed"),
  bridge_error:t("cyberOrb.bridge_error"),unavailable:t("cyberOrb.unavailable"),
  unknown:t("cyberOrb.unknown"),webKeyNotice:t("cyberOrb.webKeyNotice"),
  web_key_unavailable:t("cyberOrb.web_key_unavailable")
 };
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
 const webKey=geminiKey();
 const validWebKey=isValidGeminiApiKey(webKey);

 async function start(){
  if(!features||busy)return;
  if(status?.active){setMessage(copy.already_active);return}
  const currentWebKey=geminiKey();
  if(shouldBlockNativeOrbStartForMissingKey(features,status?.keyConfigured,currentWebKey)){
   setMessage(copy.web_key_unavailable);
   return;
  }
  setBusy(true);setMessage("");
  const result=await requestNativeOrbStart({roleType,roleId,language},features,currentWebKey);
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
    {"recommendedVoice" in profile
     ?<TeacherAvatar profile={profile} className="crew-orb-role-avatar" decorative/>
     :<img src={profile.avatar} alt="" loading="lazy"/>}
    <span>{profile.name}</span>
   </button>)}
  </div>
  <label className="crew-orb-language">{copy.language}
   <select value={language} disabled={busy||!!status?.active} onChange={e=>setLanguage(e.target.value)}>
    {TARGET_LANGUAGES.map(item=><option key={item.code} value={item.code}>{i18n.language.startsWith("zh")?item.value:item.spoken}</option>)}
   </select>
  </label>
  <p className="crew-orb-private">{copy.private}</p>
  {!status?.active&&features?.cyberOrbWebKey&&validWebKey&&<p className="crew-orb-key-note">{copy.webKeyNotice}</p>}
  {!status?.active&&features?.cyberOrbWebKey&&status?.keyConfigured!==true&&!validWebKey
   &&<p className="crew-orb-key-note" role="status">{copy.web_key_unavailable}</p>}
  <div className="crew-orb-actions">
   {status?.active?<button type="button" className="crew-orb-stop" disabled={busy} onClick={()=>void stop()}>{copy.stop}</button>:
    <button type="button" className="crew-orb-start" disabled={busy} onClick={()=>void start()}>{busy?copy.loading:copy.start}</button>}
  </div>
  <p className="crew-orb-note">{copy.note}</p>
  {message&&<p className="crew-orb-message" role="status">{message}</p>}
 </section>;
}
