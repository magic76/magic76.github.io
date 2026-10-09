import{useEffect,useRef,useState}from"react";
import{downloadBackup,importBackup}from"../lib/backup";import{clearGeminiKey,ensureLive,geminiKey,geminiVerified,saveGeminiKey,setGeminiVerified}from"../lib/runtime";
function uiMessage(value:unknown){return String(value||"語音連線發生問題").replace(/gemini-[0-9A-Za-z.-]+/gi,"語音服務")}
export function SettingsPage(){
 const initial=geminiKey(),initialVerified=geminiVerified();
 const[key,setKey]=useState(initial),[remember,setRemember]=useState(Boolean(localStorage.getItem("crew_gemini_api_key"))),[verified,setVerified]=useState(initialVerified),[status,setStatus]=useState(initialVerified?"✓ Gemini 已連線":initial?"Gemini 已設定，尚未驗證。":"尚未設定 Gemini。"),[showSetup,setShowSetup]=useState(!Boolean(initial));
 const[testing,setTesting]=useState(false),[volume,setVolume]=useState(Number(localStorage.getItem("crew_live_volume")||100));const liveRef=useRef<any>(null),pendingRollbackRef=useRef<null|(()=>void)>(null),mountedRef=useRef(true);
 const[backupBusy,setBackupBusy]=useState(false),[backupStatus,setBackupStatus]=useState("");
 const caps=[["麥克風",!!navigator.mediaDevices?.getUserMedia],["WebSocket",typeof WebSocket!=="undefined"],["Web Audio",!!(window.AudioContext||(window as any).webkitAudioContext)],["Wake Lock",!!(navigator as any).wakeLock?.request]];
 useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false;if(liveRef.current)void liveRef.current.stop({silentStatus:true,emitTerminal:false});pendingRollbackRef.current?.();pendingRollbackRef.current=null}},[]);
 async function saveAndTest(){
  const candidate=key.trim();
  if(!candidate){setStatus("先貼上 API key。");return}
  if(testing)return;
  const existingKey=geminiKey(),existingRemember=Boolean(localStorage.getItem("crew_gemini_api_key")),existingVerified=geminiVerified();
  const restore=()=>{
   if(existingKey)saveGeminiKey(existingKey,existingRemember);else clearGeminiKey();
   setGeminiVerified(existingVerified);
   if(mountedRef.current)setVerified(existingVerified);
  };
  setTesting(true);setStatus("正在驗證新的 Gemini Key…");
  // Do not replace the working key until Google accepts the candidate.
  const controller=new AbortController();
  const timeout=window.setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",{
    headers:{"x-goog-api-key":candidate},signal:controller.signal
   });
   if(!response.ok)throw new Error(response.status===400||response.status===401||response.status===403?"Key 無效或沒有權限（"+response.status+"）":"金鑰驗證失敗（"+response.status+"）");
  }catch(e){
   if(mountedRef.current){setStatus("新 Key 尚未儲存："+(e instanceof Error?uiMessage(e.message):"連線失敗")+"。原本的 Key 保持不變。");setTesting(false)}
   return;
  }finally{window.clearTimeout(timeout)}
  if(!mountedRef.current)return;
  saveGeminiKey(candidate,remember);
  pendingRollbackRef.current=restore;
  setVerified(false);setStatus("正在測試語音連線…");
  try{
   await ensureLive();
   if(!window.CrewLive)throw new Error("Live runtime 未載入");
   if(!mountedRef.current){restore();pendingRollbackRef.current=null;return}
   let completing=false;
   const session=new window.CrewLive.Session({
    system:"這是語音連線測試。請只用繁體中文說一句「連線成功」，不要延伸聊天。",
    openingPrompt:"請現在說出測試句。",voice:"Kore",volume,manualInterruptOnly:true,
    maxLiveAttempts:2,connectTimeoutMs:8000,replyTimeoutMs:10000,
    onStatus:v=>{if(mountedRef.current)setStatus(uiMessage(v))},
    onTurnComplete:async(turn:any)=>{
     if(!turn.hasValidOutput||completing)return;
     completing=true;
     try{
      await session.waitForPlaybackDrain(6500);
      await session.stop({reason:"test-complete",silentStatus:true,emitTerminal:false,emitState:false});
      liveRef.current=null;
      if(!mountedRef.current)return;
      pendingRollbackRef.current=null;
      setGeminiVerified(true);setVerified(true);
      setStatus("✓ Gemini 已連線");setShowSetup(false);setTesting(false);
     }catch(e){
      pendingRollbackRef.current?.();pendingRollbackRef.current=null;liveRef.current=null;
      if(mountedRef.current){setStatus("語音測試尚未完成："+uiMessage(e instanceof Error?e.message:e)+"。已還原原本的 Key。");setTesting(false)}
     }
    },
    onError:(e:Error)=>{
     if(completing||!pendingRollbackRef.current)return;
     pendingRollbackRef.current();pendingRollbackRef.current=null;liveRef.current=null;
     if(mountedRef.current){setStatus("新 Key 語音測試失敗："+uiMessage(e.message)+"。已保留原本的 Key。");setTesting(false)}
    }
   });
   liveRef.current=session;
   await session.start();
  }catch(e){
   pendingRollbackRef.current?.();pendingRollbackRef.current=null;liveRef.current=null;
   if(mountedRef.current){setStatus("新 Key 測試失敗："+uiMessage(e instanceof Error?e.message:e)+"。已保留原本的 Key。");setTesting(false)}
  }
 }
 const configured=Boolean(geminiKey());
 return <><section className="hero"><span className="kicker">Crew</span><h1>設定</h1><p>Gemini Key、語音體驗與資料備份，都在這裡統一管理。Teacher、Story、Fortune 共用同一組 Key。</p></section>
 {!showSetup&&configured?<section className={"section panel settings-connected-card "+(verified?"verified":"pending")}><div className="settings-connected-main"><span className="settings-connected-mark">{verified?"✓":"!"}</span><span><strong>{verified?"Gemini 已連線":"Gemini 已設定 · 尚未驗證"}</strong><small>{verified?"這個 Key 已通過語音連線測試":"先測試一次，確認 Key 與語音服務都能正常使用"}</small></span></div><code>••••••••••••</code><div className="actions">{!verified&&<button className="btn" disabled={testing} onClick={()=>void saveAndTest()}>{testing?"正在測試…":"測試連線"}</button>}<button className="btn secondary" onClick={()=>setShowSetup(true)}>重新設定</button></div></section>:
 <section className="section panel"><h3>{configured?"重新設定 Gemini Key":"設定 Gemini Key"}</h3><p className="meta">Story 的 AI 創作與陪讀需要 Key；Fortune 的固定計算不需要，只有 AI 解讀與語音追問會使用。</p><div className="setup-steps"><div className="step"><b>1</b><span><strong>開啟 Google AI Studio</strong><small>使用自己的 Google 帳戶登入。</small></span></div><div className="step"><b>2</b><span><strong>Create API key</strong><small>建立 Gemini API key 並複製。</small></span></div><div className="step"><b>3</b><span><strong>貼回這裡</strong><small>按一次儲存並測試即可。</small></span></div></div>
 <div className="actions"><a className="btn secondary" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">開啟 Google AI Studio</a></div>
 <label className="label">Gemini API key</label><input className="field" type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="貼上 API key"/>
 <p className="meta" style={{marginTop:8}}>Key 只保存在這個瀏覽器；用量與可能費用由你的 Google 專案管理。</p><label className="row" style={{marginTop:10}}><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/><span className="meta">記住在這台裝置</span></label>
 <div className="actions settings-primary-action"><button className="btn" disabled={testing} onClick={()=>void saveAndTest()}>{testing?"正在測試…":"儲存並測試"}</button>{configured&&<button className="btn secondary" onClick={()=>setShowSetup(false)}>取消</button>}</div><div className={"result settings-connection-result "+(status.startsWith("✓")?"success":"")}>{status}</div></section>}
 <section className="section panel"><div className="section-head"><h2>資料備份</h2><small>僅此瀏覽器</small></div><p className="meta">下載故事、學習進度與命盤紀錄，方便換裝置或清除瀏覽器前備份。備份包含個人內容，請妥善保管；不包含 Gemini API Key。</p><div className="actions"><button className="btn secondary" disabled={backupBusy} onClick={async()=>{setBackupBusy(true);setBackupStatus("");try{const r=await downloadBackup();setBackupStatus("備份已建立："+r.stories+" 本故事，"+r.keys+" 項本機資料。")}catch(_){setBackupStatus("備份失敗，請檢查瀏覽器儲存空間後重試。")}finally{setBackupBusy(false)}}}>匯出備份</button><label className={"btn secondary"+(backupBusy?" disabled":"")}>匯入備份<input type="file" accept=".json,application/json" hidden disabled={backupBusy} onChange={async e=>{const file=e.target.files?.[0];e.currentTarget.value="";if(!file)return;setBackupBusy(true);setBackupStatus("");try{const r=await importBackup(file);setBackupStatus("已匯入 "+r.stories+" 本故事、"+r.entries+" 項資料，略過 "+r.skipped+" 項既有紀錄。重新整理後會更新畫面。")}catch(err){setBackupStatus("匯入失敗："+(err instanceof Error?err.message:"請確認備份檔案。"))}finally{setBackupBusy(false)}}}/></label></div>{backupStatus&&<p className="meta" role="status">{backupStatus}</p>}<p className="meta">匯入只補上尚不存在的資料，不會覆蓋現有故事或 Key。</p></section>
 <section className="section panel"><div className="section-head"><h2>語音體驗</h2><small>共用設定</small></div><div><label className="label">預設播放音量</label><div className="range-row"><input className="field" type="range" min="0" max="100" value={volume} onChange={e=>{const v=Number(e.target.value);setVolume(v);localStorage.setItem("crew_live_volume",String(v))}}/><strong>{volume}%</strong></div></div>
 <details className="settings-diagnostics"><summary>連線診斷</summary><p className="meta">只有語音連線異常時才需要查看。</p><div className="result settings-capabilities">{caps.map(([n,ok])=><div key={String(n)}>{ok?"✓ ":"— "}{String(n)}</div>)}</div></details>
 <details className="settings-danger-zone"><summary>進階與清除</summary><div className="actions"><button className="btn secondary" onClick={()=>{if(liveRef.current)void liveRef.current.stop({silentStatus:true,emitTerminal:false});liveRef.current=null;clearGeminiKey();setKey("");setRemember(false);setVerified(false);setStatus("已清除 Gemini Key。");setShowSetup(true)}}>清除 Gemini Key</button><button className="btn secondary" onClick={()=>{["teacher","story","fortune","teacher_pronunciation","teacher_textbook"].forEach(n=>{localStorage.removeItem("crew_history_"+n);localStorage.removeItem("crew_live_last_"+n)});setStatus("已清除語音紀錄。")}}>清除語音紀錄</button></div></details>
 </section></>;
}
