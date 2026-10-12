import {useEffect,useRef,useState} from "react";
import {clearGeminiKey,ensureLive,geminiKey,geminiVerified,saveGeminiKey,setGeminiVerified} from "../lib/runtime";

type MicPermission = PermissionState|"unknown"|"unsupported";
type VoiceResult = "idle"|"testing"|"success"|"failed";

function isMicrophoneDenied(value:unknown){
 const error=value as {name?:string;message?:string}|null;
 const detail=String(error?.name||"")+" "+String(error?.message||"");
 return /NotAllowedError|PermissionDeniedError|SecurityError|permission denied|not allowed|access is denied|permission dismissed/i.test(detail);
}
function isMicrophoneMissing(value:unknown){
 const error=value as {name?:string;message?:string}|null;
 return /NotFoundError|DevicesNotFoundError|Requested device not found/i.test(String(error?.name||"")+" "+String(error?.message||""));
}
function safeDetail(value:unknown){
 const message=value instanceof Error?value.message:String(value||"語音連線發生問題");
 return message.replace(/AIza[0-9A-Za-z_-]+/g,"[已隱藏的金鑰]").replace(/gemini-[0-9A-Za-z.-]+/gi,"語音服務").slice(0,180);
}
function microphoneHelp(){
 const agent=navigator.userAgent;
 if(/Macintosh|Mac OS X/.test(agent))return "Mac：系統設定 → 隱私權與安全性 → 麥克風，允許 Microsoft Edge／Chrome；再確認網址列左側的網站權限。修改後請完全結束瀏覽器並重新開啟。";
 if(/Windows/.test(agent))return "Windows：設定 → 隱私權與安全性 → 麥克風，啟用麥克風存取與桌面應用程式存取；再確認 Edge／Chrome 的網站麥克風權限。";
 return "請在裝置的隱私權設定允許瀏覽器使用麥克風，並在網站權限中允許麥克風，然後重新測試。";
}
function microphoneLabel(permission:MicPermission,blocked:boolean){
 if(blocked||permission==="denied")return "已拒絕（請檢查系統及網站權限）";
 if(permission==="granted")return "已允許";
 if(permission==="prompt")return "尚未授權（測試時才會要求）";
 if(permission==="unsupported")return "瀏覽器不支援查詢權限";
 return "尚未確認";
}
function voiceFailure(value:unknown){
 if(isMicrophoneDenied(value))return "麥克風存取遭拒，請先調整裝置與網站權限。已儲存的 Key 不受影響。";
 if(isMicrophoneMissing(value))return "找不到可用的麥克風，請檢查輸入裝置。已儲存的 Key 不受影響。";
 return "Gemini Live 測試失敗："+safeDetail(value)+"。已儲存的 Key 不受影響。";
}

export function GeminiConnectionPanel(){
 const initialKey=geminiKey(),initialVerified=geminiVerified();
 const [key,setKey]=useState(initialKey);
 const [remember,setRemember]=useState(Boolean(localStorage.getItem("crew_gemini_api_key")));
 const [verified,setVerified]=useState(initialVerified);
 const [keyStatus,setKeyStatus]=useState(initialVerified?"✓ Gemini Key 已驗證":initialKey?"Gemini Key 已設定，尚未驗證。":"尚未設定 Gemini Key。");
 const [showSetup,setShowSetup]=useState(!initialKey||!initialVerified);
 const [validating,setValidating]=useState(false);
 const [micPermission,setMicPermission]=useState<MicPermission>("unknown");
 const [micBlocked,setMicBlocked]=useState(false);
 const [micChecking,setMicChecking]=useState(false);
 const [micStatus,setMicStatus]=useState("");
 const [voiceResult,setVoiceResult]=useState<VoiceResult>("idle");
 const [voiceStatus,setVoiceStatus]=useState("尚未測試語音連線");
 const [volume,setVolume]=useState(Number(localStorage.getItem("crew_live_volume")||100));
 const [voiceBusy,setVoiceBusy]=useState(false);
 const mounted=useRef(true);
 const liveRef=useRef<any>(null);
 const validationRef=useRef<AbortController|null>(null);

 useEffect(()=>{
  mounted.current=true;
  let permission:PermissionStatus|null=null;
  const refresh=()=>{if(mounted.current&&permission)setMicPermission(permission.state)};
  if(!navigator.mediaDevices?.getUserMedia){
   setMicPermission("unsupported");
  }else if(navigator.permissions?.query){
   void navigator.permissions.query({name:"microphone" as PermissionName}).then(result=>{
    if(!mounted.current)return;
    permission=result;refresh();permission.addEventListener("change",refresh);
   }).catch(()=>{if(mounted.current)setMicPermission("unsupported")});
  }else{
   setMicPermission("unsupported");
  }
  return ()=>{
   mounted.current=false;
   validationRef.current?.abort();
   if(permission)permission.removeEventListener("change",refresh);
   if(liveRef.current)void liveRef.current.stop({silentStatus:true,emitTerminal:false});
   liveRef.current=null;
  };
 },[]);

 async function saveAndVerify(){
  const candidate=key.trim();
  if(!candidate){setKeyStatus("請先貼上 Gemini API Key。");return}
  if(validating||voiceBusy)return;
  setValidating(true);setKeyStatus("正在驗證 Gemini Key…");
  const controller=new AbortController();validationRef.current=controller;
  const timeout=window.setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",{
    headers:{"x-goog-api-key":candidate},signal:controller.signal
   });
   if(!response.ok)throw new Error(response.status===400||response.status===401||response.status===403
    ?"Key 無效或沒有 API 存取權限（"+response.status+"）":"Google 驗證失敗（"+response.status+"）");
  }catch(error){
   if(mounted.current){
    setKeyStatus("Key 尚未更換："+(error instanceof Error&&error.name==="AbortError"?"驗證逾時，請重試":safeDetail(error))+"。原有 Key 保持不變。");
    setValidating(false);
   }
   return;
  }finally{
   window.clearTimeout(timeout);
   if(validationRef.current===controller)validationRef.current=null;
  }
  if(!mounted.current)return;
  try{
   saveGeminiKey(candidate,remember);
   setGeminiVerified(true);
  }catch(_){
   setKeyStatus("Key 已通過 Google 驗證，但瀏覽器儲存失敗。請檢查儲存空間後重試。");
   setValidating(false);return;
  }
  setVerified(true);
  setKeyStatus("✓ Gemini Key 已驗證並儲存（語音需另外測試）");
  setVoiceResult("idle");setVoiceStatus("尚未測試語音連線");
  setShowSetup(false);setValidating(false);
 }

 async function checkMicrophone(){
  if(micChecking||voiceBusy||validating)return;
  setMicChecking(true);setMicStatus("正在確認麥克風…");
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error("瀏覽器不支援麥克風");
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   stream.getTracks().forEach(track=>track.stop());
   if(mounted.current){
    setMicPermission("granted");setMicBlocked(false);setMicStatus("✓ 麥克風可正常使用");
   }
  }catch(error){
   if(mounted.current){
    if(isMicrophoneDenied(error)){setMicBlocked(true);setMicPermission("denied")}
    setMicStatus(isMicrophoneDenied(error)?"麥克風存取遭拒。":isMicrophoneMissing(error)?"找不到可用的麥克風。":"麥克風檢查失敗："+safeDetail(error));
   }
  }finally{if(mounted.current)setMicChecking(false)}
 }

 async function testVoice(){
  if(voiceBusy||validating||!geminiKey())return;
  setVoiceBusy(true);setVoiceResult("testing");setVoiceStatus("正在啟動 Gemini Live…");
  let finished=false;
  const fail=(error:unknown)=>{
   if(finished)return;
   finished=true;
   if(liveRef.current){
    const running=liveRef.current;liveRef.current=null;
    void running.stop({silentStatus:true,emitTerminal:false,emitState:false});
   }
   if(!mounted.current)return;
   if(isMicrophoneDenied(error)){setMicBlocked(true);setMicPermission("denied")}
   setVoiceResult("failed");setVoiceStatus(voiceFailure(error));setVoiceBusy(false);
  };
  try{
   await ensureLive();
   if(!window.CrewLive)throw new Error("Live runtime 未載入");
   if(!mounted.current)return;
   const session=new window.CrewLive.Session({
    system:"這是語音連線測試。請只用繁體中文說一句「連線成功」，不要延伸聊天。",
    openingPrompt:"請現在說出測試句。",voice:"Kore",volume,manualInterruptOnly:true,
    maxLiveAttempts:2,connectTimeoutMs:8000,replyTimeoutMs:10000,
    onStatus:(value:string)=>{if(mounted.current&&!finished)setVoiceStatus(safeDetail(value))},
    onTurnComplete:async(turn:{hasValidOutput?:boolean})=>{
     if(!turn.hasValidOutput||finished)return;
     finished=true;
     try{
      await session.waitForPlaybackDrain(6500);
      await session.stop({reason:"test-complete",silentStatus:true,emitTerminal:false,emitState:false});
      liveRef.current=null;
      if(mounted.current){setMicBlocked(false);setMicPermission("granted");setVoiceResult("success");setVoiceStatus("✓ Gemini Live 語音連線正常");setVoiceBusy(false)}
     }catch(error){
      liveRef.current=null;
      if(mounted.current){setVoiceResult("failed");setVoiceStatus(voiceFailure(error));setVoiceBusy(false)}
     }
    },
    onError:(error:Error)=>fail(error)
   });
   liveRef.current=session;
   await session.start();
   if(mounted.current&&!finished){setMicBlocked(false);setMicPermission("granted")}
  }catch(error){fail(error)}
 }

 const configured=Boolean(geminiKey());
 const micDenied=micBlocked||micPermission==="denied";
 const caps:[string,boolean][]=[
  ["麥克風 API",!!navigator.mediaDevices?.getUserMedia],
  ["WebSocket",typeof WebSocket!=="undefined"],
  ["Web Audio",!!(window.AudioContext||(window as any).webkitAudioContext)],
  ["Wake Lock",!!(navigator as any).wakeLock?.request]
 ];
 return <>
  {!showSetup&&configured?
   <section className={"section panel settings-connected-card "+(verified?"verified":"pending")}>
    <div className="settings-connected-main"><span className="settings-connected-mark">{verified?"✓":"!"}</span>
     <span><strong>{verified?"Gemini Key 已驗證":"Gemini Key 尚未驗證"}</strong>
      <small>{verified?"Google API 驗證成功；語音連線可另行測試":"請先驗證此 Key，無須開啟麥克風"}</small></span></div>
    <code>••••••••••••</code>
    <div className="actions"><button className="btn secondary" disabled={validating||voiceBusy} onClick={()=>setShowSetup(true)}>重新設定 Key</button></div>
    <div className={"result settings-connection-result "+(verified?"success":"")} role="status">{keyStatus}</div>
   </section>:
   <section className="section panel">
    <h3>{configured?"重新設定 Gemini Key":"設定 Gemini Key"}</h3>
    <p className="meta">Teacher、Story、Fortune 共用同一組 Key。Google 驗證成功即可儲存，無須授權麥克風。</p>
    <div className="setup-steps">
     <div className="step"><b>1</b><span><strong>開啟 Google AI Studio</strong><small>使用自己的 Google 帳戶登入。</small></span></div>
     <div className="step"><b>2</b><span><strong>Create API key</strong><small>建立 Gemini API Key 並複製。</small></span></div>
     <div className="step"><b>3</b><span><strong>貼回這裡</strong><small>驗證並儲存；有需要再測試語音。</small></span></div>
    </div>
    <div className="actions"><a className="btn secondary" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">開啟 Google AI Studio</a></div>
    <label className="label" htmlFor="crew-gemini-key">Gemini API Key</label>
    <input id="crew-gemini-key" className="field" type="password" value={key} onChange={event=>setKey(event.target.value)} placeholder="貼上 API key" autoComplete="off"/>
    <p className="meta" style={{marginTop:8}}>Key 僅儲存在這台瀏覽器。用量與費用由你的 Google 專案管理。</p>
    <label className="row" style={{marginTop:10}}><input type="checkbox" checked={remember} onChange={event=>setRemember(event.target.checked)}/><span className="meta">記住在這台裝置</span></label>
    <div className="actions settings-primary-action">
     <button className="btn" disabled={validating||voiceBusy} onClick={()=>void saveAndVerify()}>{validating?"正在驗證…":"驗證並儲存 Key"}</button>
     {configured&&<button className="btn secondary" disabled={validating} onClick={()=>{setKey(geminiKey());setShowSetup(false)}}>取消</button>}
    </div>
    <div className={"result settings-connection-result "+(verified?"success":"")} role="status">{keyStatus}</div>
   </section>
  }
  <section className="section panel settings-voice-check">
   <div className="section-head"><h2>語音連線</h2><small>獨立測試 · 不影響已儲存的 Key</small></div>
   <p className="meta">只有要使用語音時才需要麥克風權限。Key 驗證成功並不代表 Gemini Live 可使用。</p>
   <div className="settings-check-list">
    <div><strong>1 · Gemini API Key</strong><span>{configured?(verified?"✓ 已驗證":"尚未驗證"):"尚未設定"}</span></div>
    <div><strong>2 · 麥克風權限</strong><span>{microphoneLabel(micPermission,micBlocked)}</span></div>
    <div><strong>3 · Gemini Live</strong><span>{voiceResult==="success"?"✓ 已連線":voiceResult==="testing"?"測試中":voiceResult==="failed"?"連線失敗":"尚未測試"}</span></div>
   </div>
   <div className="actions">
    <button className="btn secondary" disabled={micChecking||voiceBusy||validating} onClick={()=>void checkMicrophone()}>{micChecking?"檢查中…":"檢查麥克風"}</button>
    <button className="btn" disabled={!configured||!verified||voiceBusy||micChecking||validating} onClick={()=>void testVoice()}>{voiceBusy?"語音測試中…":"測試 Gemini Live"}</button>
   </div>
   {micStatus&&<p className="meta" role="status">{micStatus}</p>}
   <div className={"result settings-connection-result "+(voiceResult==="success"?"success":"")} role="status">{voiceStatus}</div>
   {micDenied&&<p className="meta settings-mic-advice" role="alert">{microphoneHelp()}</p>}
   <div><label className="label">預設播放音量</label><div className="range-row">
    <input className="field" type="range" min="0" max="100" value={volume} onChange={event=>{const value=Number(event.target.value);setVolume(value);localStorage.setItem("crew_live_volume",String(value))}}/>
    <strong>{volume}%</strong>
   </div></div>
   <details className="settings-diagnostics">
    <summary>連線診斷</summary>
    <p className="meta">瀏覽器支援麥克風 API，不代表作業系統已授權；只有按「檢查麥克風」才會要求存取權限。</p>
    <div className="result settings-capabilities">
     <div>麥克風授權：{microphoneLabel(micPermission,micBlocked)}</div>
     {caps.map(([name,ok])=><div key={name}>{ok?"✓ ":"— "}{name}</div>)}
    </div>
   </details>
   <details className="settings-danger-zone">
    <summary>進階與清除</summary>
    <div className="actions">
     <button className="btn secondary" disabled={voiceBusy||validating} onClick={()=>{
      clearGeminiKey();setKey("");setRemember(false);setVerified(false);setKeyStatus("已清除 Gemini Key。");setShowSetup(true);
      setVoiceResult("idle");setVoiceStatus("尚未測試語音連線");
     }}>清除 Gemini Key</button>
     <button className="btn secondary" onClick={()=>{
      ["teacher","story","fortune","teacher_pronunciation","teacher_textbook"].forEach(name=>{
       localStorage.removeItem("crew_history_"+name);localStorage.removeItem("crew_live_last_"+name);
      });
      setVoiceStatus("已清除語音紀錄。");
     }}>清除語音紀錄</button>
    </div>
   </details>
  </section>
 </>;
}
