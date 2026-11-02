import {useCallback,useEffect,useRef,useState,type ChangeEvent,type FormEvent,type MouseEvent} from "react";
import {SoulCamera,type SoulVisual} from "./SoulCamera";
import {SoulChat} from "./SoulChat";
import {type Photo,type Soul,type Candidate,persona,pid,trim,list,save,update,remove,photoFromFile,distinctPhotos,keepReferences,candidates} from "./soulData";
import {cutoutObject} from "./soulCutout";
import {embeddingStatus} from "./soulEmbedding";
import {shouldAutoWake} from "./soulRecognition";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ensureVision,geminiKey} from "../lib/runtime";
import "./souls.css";

export function SoulsPage(){
 const {i18n}=useTranslation(),en=!i18n.language.startsWith("zh");
 const t=(zh:string,english:string)=>en?english:zh;
 const [items,setItems]=useState<Soul[]>([]),[selected,setSelected]=useState<Soul|null>(null);
 const [step,setStep]=useState<"home"|"match"|"create"|"detail">("home"),[scan,setScan]=useState<Photo|null>(null),[matches,setMatches]=useState<Candidate[]>([]);
 const [cameraOpen,setCameraOpen]=useState(false),[cutoutDraft,setCutoutDraft]=useState(""),[cutting,setCutting]=useState(false);
 const [draftPhotos,setDraftPhotos]=useState<Photo[]>([]),[pendingForeground,setPendingForeground]=useState<File|null>(null);
 const [cameraVisual,setCameraVisual]=useState<SoulVisual>({state:"idle",caption:"",mood:"calm"});
 const mouthRef=useRef<SVGEllipseElement|null>(null);
 const onAudioLevel=useCallback((level:number)=>{
  // Bypass React for 15Hz playback envelope updates.
  if(mouthRef.current)mouthRef.current.setAttribute("ry",String(Math.max(2,Math.min(20,Math.round(2+level*18)))));
 },[]);
 const onVisual=useCallback((next:SoulVisual)=>{
  setCameraVisual(prev=>prev.state===next.state&&prev.caption===next.caption&&prev.mood===next.mood&&prev.hearing===next.hearing?prev:next);
 },[]);
 const [name,setName]=useState(""),[kind,setKind]=useState(""),[description,setDescription]=useState("");
 const [personality,setPersonality]=useState<Soul["personality"]>("witty"),[rememberEnabled,setRememberEnabled]=useState(true);
 const [note,setNote]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[info,setInfo]=useState("");
 const camera=useRef<HTMLInputElement>(null),gallery=useRef<HTMLInputElement>(null);
 // A first-time Soul created from the live camera should wake up in that same mode.
 const returnToCameraAfterCreate=useRef(false),embeddingWarningShown=useRef(false);
 async function refresh(id?:string){const all=await list();setItems(all);if(id)setSelected(all.find(s=>s.id===id)||null)}
 useEffect(()=>{void refresh().catch(()=>setError(t("本機儲存無法使用，請檢查瀏覽器模式。","Local storage is unavailable.")))},[]);
 async function processFiles(frames:File[],keepCamera=false){
  if(!frames.length)throw Error("No camera frames");
  const photos:Photo[]=[];
  for(const file of frames){
   const p=await photoFromFile(file,true);
   if(!p.quality)photos.push(p);
  }
  if(!photos.length)throw Error(t("照片過暗、過亮或模糊，請穩定手機重新拍攝。","Photos are blurry or poorly exposed. Please retake."));
  const unique=distinctPhotos(photos),all=await list();
  if(!keepCamera)setCameraOpen(false);
  setScan(unique[0]);setDraftPhotos(unique);setCutoutDraft("");
  setItems(all);setMatches(candidates(unique[0],all));setStep("match");
 }
 async function processFile(file:File,keepCamera=false){return processFiles([file],keepCamera)}
 async function addReferences(frames:File[]){
  if(!selected)throw Error("Select a Soul first");
  const photos:Photo[]=[];
  for(const file of frames){
   const p=await photoFromFile(file,true);
   if(!p.quality)photos.push(p);
  }
  if(!photos.length)throw Error(t("照片品質不足，請重新補拍。","Photo quality too low; try again."));
  const currentId=selected.id;
  const before=selected.photos.length;
  const changed=await update(currentId,item=>({...item,photos:keepReferences([...item.photos,...photos])}));
  await refresh(currentId);
  const added=Math.max(0,(changed?.photos.length||0)-before);
  setInfo(added
   ?t("已新增 "+added+" 個不同視角，辨識時會一起比對。","Saved "+added+" extra views for recognition.")
   :t("照片外觀太接近，沒有增加新的辨識視角；可繞物品再拍一次。","Views were nearly identical; move around the object and try again."));
 }
 async function confirmForeground(){
  if(!selected||!pendingForeground||busy)return;
  setBusy(true);setError("");
  try{
   const id=selected.id,photo=await photoFromFile(pendingForeground,true);
   if(photo.quality)throw Error(t("裁切照片品質不足，請重新定位。","Foreground crop is too blurry or poorly exposed."));
   await update(id,current=>({...current,photos:keepReferences([...current.photos,photo])}));
   await refresh(id);setPendingForeground(null);
   setInfo(t("已確認加入裁切參考照。","Foreground reference saved after confirmation."));
  }catch(error){setError(error instanceof Error?error.message:String(error))}
  finally{setBusy(false)}
 }
 async function scanFile(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];e.target.value="";if(!file)return;
  setBusy(true);setError("");setInfo("");
  try{await processFile(file)}
  catch(err){setError(err instanceof Error?err.message:String(err))}
  finally{setBusy(false)}
 }
 // Automatic wake requires 3 consistent observations in the scanner and a clear margin.
 async function probe(file:File){
  const useEmbedding=items.some(s=>s.photos.some(photo=>Boolean(photo.embedding?.length)));
  const p=await photoFromFile(file,useEmbedding),ranked=candidates(p,items),best=ranked[0];
  if(useEmbedding&&embeddingStatus()==="unavailable"&&!embeddingWarningShown.current){
   embeddingWarningShown.current=true;
   setInfo(t("本機 AI 辨識模型暫時無法載入。為避免認錯物品，請從下方手動選擇 Soul。","On-device image model unavailable. Please select a Soul manually to avoid mistaken identity."));
  }
  if(embeddingStatus()==="ready")embeddingWarningShown.current=false;
  if(p.quality||!shouldAutoWake(best,ranked[1]))return null;
  return {id:best.soul.id,name:best.soul.name};
 }
 async function wake(id:string,file:File){
  const soul=items.find(s=>s.id===id);if(!soul)return;
  try{setScan(await photoFromFile(file));await choose(soul)}
  catch(error){setError(t("喚醒失敗，可以從收藏重新開啟。","Could not wake this Soul; open it from your collection."));throw error}
 }
 function home(){setPendingForeground(null);returnToCameraAfterCreate.current=false;setCameraOpen(false);setSelected(null);setScan(null);setDraftPhotos([]);setCameraVisual({state:"idle",caption:"",mood:"calm"});setStep("home");setError("");setInfo("")}
 function resetCameraSoul(){setPendingForeground(null);setSelected(null);setScan(null);setDraftPhotos([]);setStep("home");setCameraVisual({state:"idle",caption:"",mood:"calm"});setError("");setInfo("")}
 async function removeBackground(event:MouseEvent<HTMLButtonElement>,existing=false){
  const original=existing?selected?.photos[0]:scan;if(!original||cutting)return;
  const rect=event.currentTarget.getBoundingClientRect();
  const pos=event.clientX>0&&rect.width&&rect.height
   ?{x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height}:{x:.5,y:.5};
  setCutting(true);setError("");setInfo(t("正在載入本機去背模型，第一次可能比較久。","Loading on-device cutout model; first run may take longer."));
  try{
   const result=await cutoutObject(original.image,pos);
   if(existing&&selected){await update(selected.id,s=>({...s,cutout:result}));await refresh(selected.id)}
   else setCutoutDraft(result);
   setInfo(t("去背完成，點圖片另一處可重試。","Background removed. Tap another part to retry."));
  }catch{setError(t("去背失敗，原照片保留；請檢查網路或點在物品上。","Cutout failed. Original remains; retry on the object."))}
  finally{setCutting(false)}
 }
 function createStart(){returnToCameraAfterCreate.current=cameraOpen;setCameraOpen(false);setName("");setKind("");setDescription("");setRememberEnabled(true);setPersonality("witty");setStep("create")}
 async function aiDescribe(){
  if(!scan)return;
  if(!geminiKey()){setError(t("請先加入 Gemini Key，或自行填寫。","Add a Gemini Key or fill in the details manually."));return}
  setBusy(true);setError("");
  try{
   await ensureVision();if(!window.CrewGeminiVision?.generate)throw Error("Vision unavailable");
   const result=await window.CrewGeminiVision.generate(
    "Return JSON only: {\"kind\":\"\",\"description\":\"\",\"suggestedName\":\"\"}. Describe the main centered household object in Traditional Chinese. Mention only visually observed color, shape and distinctive patterns. Do not identify people or guess personal information.",
    [{mimeType:"image/jpeg",data:scan.image.split(",")[1]}],{json:true,maxOutputTokens:350}
   ) as {kind?:unknown;description?:unknown;suggestedName?:unknown};
   setKind(trim(result.kind,60));setDescription(trim(result.description,140));setName(v=>v||trim(result.suggestedName,40));
   setInfo(t("AI 已建議物品資料，可以再修改。","AI suggested details. You can edit them."));
  }catch{setError(t("AI 分析失敗，仍可手動建立。","AI analysis failed. Create it manually."))}
  finally{setBusy(false)}
 }
 async function create(e:FormEvent){e.preventDefault();if(!scan||!name.trim()||busy)return;
  setBusy(true);setError("");
  try{
   const now=Date.now(),s:Soul={id:pid(),name:trim(name,40),kind:trim(kind,60),description:trim(description,140),personality,voice:persona[personality][2],photos:keepReferences([scan,...draftPhotos]),cutout:cutoutDraft||undefined,notes:[],remember:rememberEnabled,createdAt:now,lastSeenAt:now};
   await save(s);await refresh(s.id);setScan(null);setCutoutDraft("");setStep("detail");
    if(returnToCameraAfterCreate.current){setCameraOpen(true);returnToCameraAfterCreate.current=false;}
    setInfo(t("靈魂已誕生！相機拍攝建立的 Soul 會在鏡頭中醒來。","Soul created! Camera-enrolled Souls now wake in the live view."));
  }catch{setError(t("保存失敗，請檢查瀏覽器儲存空間。","Could not save. Check browser storage."))}
  finally{setBusy(false)}
 }
 async function choose(soul:Soul){
  setPendingForeground(null);
  try{await update(soul.id,s=>({...s,lastSeenAt:Date.now()}));await refresh(soul.id);setStep("detail");setInfo(t("已載入 "+soul.name+" 的回憶。","Loaded memories for "+soul.name+"."))}
  catch{setError(t("物品載入失敗。","Could not load object."))}
 }
 async function mutate(fn:(s:Soul)=>Soul){
  if(!selected)return;try{await update(selected.id,fn);await refresh(selected.id)}catch{setError(t("本機儲存失敗。","Local save failed."))}
 }
 async function addAngle(){
  if(!scan||!selected)return;await mutate(s=>({...s,photos:keepReferences([...s.photos,...(draftPhotos.length?draftPhotos:[scan])])}));setScan(null);setDraftPhotos([]);
  setInfo(t("已新增辨識角度。","Reference angle added."));
 }
 async function manual(e:FormEvent){e.preventDefault();if(!note.trim())return;
  await mutate(s=>({...s,notes:[...s.notes,{id:pid(),text:trim(note),source:"manual" as const}].slice(-30)}));setNote("");
 }
 async function erase(){
  if(!selected||!window.confirm(t("確定刪除靈魂、照片與全部回憶？此動作無法復原。","Delete this Soul, photos and memories permanently?")))return;
  try{await remove(selected.id);home();await refresh()}catch{setError(t("刪除失敗。","Delete failed."))}
 }
 return <main className="souls-page">
  <header className="souls-header"><Link to="/explore">← {t("探索","Explore")}</Link><small>CREW SOULS · PRIVATE MVP</small>
   <h1>{t("讓萬物，記得你。","Give objects a memory.")}</h1><p>{t("鏡頭對準物品，它就醒來跟你說話。下次再見，它還記得你們的故事。","Point your camera at an object. It wakes up, talks and remembers.")}</p>
  </header>
  <input ref={camera} className="souls-hidden" type="file" accept="image/*" capture="environment" aria-label={t("拍照","Camera")} onChange={e=>void scanFile(e)}/>
  <input ref={gallery} className="souls-hidden" type="file" accept="image/*" aria-label={t("相簿","Gallery")} onChange={e=>void scanFile(e)}/>
  <div className="souls-actions"><button className="souls-primary" disabled={busy} onClick={()=>{if(cameraOpen){setCameraOpen(false);return}setSelected(null);setStep("home");setCameraOpen(true);setError("");setInfo("")}}>◎ {cameraOpen?t("關閉相機","Close camera"):t("開啟相機，喚醒物品","Open camera / wake Soul")}</button>
   <button disabled={busy} onClick={()=>gallery.current?.click()}>{t("選擇照片","Choose photo")}</button>
   {step!=="home"&&<button onClick={home}>{t("我的物品","My Souls")}</button>}</div>
  {cameraOpen&&<SoulCamera en={en} onProbe={probe} onWake={(id,file)=>wake(id,file)} onSnapshot={frames=>processFiles(frames,true)} onAddReferences={frames=>addReferences(frames)} onRegionCrop={file=>{setPendingForeground(file)}} onClose={()=>setCameraOpen(false)} onReset={resetCameraSoul} activeSoul={step==="detail"&&selected?{id:selected.id,name:selected.name}:null} visual={cameraVisual} mouthRef={mouthRef} paused={step==="match"}>
    {step==="detail"&&selected?<SoulChat key={selected.id} soul={selected} en={en} overlay onVisual={onVisual} onAudioLevel={onAudioLevel} onChange={()=>{void refresh(selected.id)}}/>:null}
    {step==="detail"&&selected&&pendingForeground&&<div className="souls-camera-quick" role="group" aria-label={t("裁切參考照確認","Foreground reference confirmation")}>
     <strong>{t("物品輪廓已取得。要把裁切圖加入辨識照片嗎？","Object isolated. Save this crop as a recognition reference?")}</strong>
     <div><button type="button" disabled={busy} onClick={()=>void confirmForeground()}>{t("確認加入","Save reference")}</button><button type="button" onClick={()=>setPendingForeground(null)}>{t("不用，保留原照片","Not now")}</button></div>
    </div>}
    {step==="home"&&items.length>0?<div className="souls-camera-quick"><strong>{t("或手動選一個靈魂","Or choose a Soul")}</strong><div>{items.slice(0,8).map(s=><button type="button" key={s.id} onClick={()=>void choose(s)}>{s.name}</button>)}</div></div>:null}
   </SoulCamera>}
   {busy&&<p role="status">{t("正在處理…","Processing…")}</p>}
  {error&&<p className="souls-error" role="alert">{error}</p>}{info&&<p className="souls-info" role="status">{info}</p>}
  {!cameraOpen&&step==="home"&&<section className="souls-panel"><h2>{t("我的靈魂收藏","My Souls")} <small>({items.length})</small></h2>
   {!items.length?<div className="souls-empty">✦<p>{t("第一個靈魂等你喚醒，先拍一張照片吧。","Your first Soul is waiting. Take a picture.")}</p></div>:
    <div className="souls-grid">{items.map(s=><button key={s.id} onClick={()=>{setSelected(s);setScan(null);setStep("detail");setInfo("")}}><img src={s.photos[0]?.image} alt={s.description||s.name}/><strong>{s.name}</strong><small>{s.kind||t("神祕物品","Mystery object")} · {s.notes.length} {t("則回憶","memories")}</small></button>)}</div>}
  </section>}
  {step==="match"&&scan&&<section className="souls-panel"><h2>{t("這是哪一個靈魂？","Which Soul is this?")}</h2><div className="souls-preview"><img src={scan.image} alt={t("掃描照片","Scan")}/><p>{t("本機照片比對只提供可能候選。即使很相似，仍需要你確認身分。","Local image matching only suggests candidates; please verify identity.")}</p></div>
   {matches.map(({soul},i)=><button className="souls-match" key={soul.id} onClick={()=>void choose(soul)}><img src={soul.photos[0]?.image} alt=""/><span><strong>{soul.name}</strong><small>{i===0?t("最相似候選","Closest candidate"):t("相似物品","Possible match")}</small></span>→</button>)}
   <button className="souls-full" onClick={createStart}>{t("不是以上物品？建立新的靈魂 ＋","Not one of these? Create a new Soul +")}</button>
  </section>}
  {step==="create"&&scan&&<section className="souls-panel"><h2>{t("喚醒新靈魂","Awaken a new Soul")}</h2><div className="souls-cutout-stage"><button className="souls-cutout-target" type="button" disabled={cutting} onClick={e=>void removeBackground(e)} aria-label={t("點物品去背","Tap object to remove background")}><img className="souls-new" src={cutoutDraft||scan.image} alt={t("物品照片","Object")}/></button><small>{cutting?t("正在去背…","Removing background…"):t("✦ 點照片中的物品，可選擇去背","✦ Tap the object to cut it out")}</small></div>
   <button className="souls-full" disabled={busy} onClick={()=>void aiDescribe()}>{t("✧ 讓 Gemini 看照片並建議名字（會上傳照片）","✧ Ask Gemini to suggest a name (uploads photo)")}</button>
   <p className="souls-views-note">{t("已收集 "+(draftPhotos.length||1)+" 個不同視角，會一起保存作為辨識依據。","Collected "+(draftPhotos.length||1)+" different views for recognition.")}</p>
   <form className="souls-form" onSubmit={e=>void create(e)}>
    <label>{t("名字 *","Name *")}<input required maxLength={40} value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>{t("物品種類","Object type")}<input maxLength={60} value={kind} onChange={e=>setKind(e.target.value)}/></label>
    <label>{t("外觀特徵","Appearance")}<textarea maxLength={140} value={description} onChange={e=>setDescription(e.target.value)}/></label>
    <fieldset><legend>{t("個性","Personality")}</legend><div className="souls-pills">{(Object.keys(persona) as Soul["personality"][]).map(id=><button type="button" key={id} aria-pressed={personality===id} onClick={()=>setPersonality(id)}>{en?persona[id][1]:persona[id][0]}</button>)}</div></fieldset>
    <label className="souls-checkbox"><input type="checkbox" checked={rememberEnabled} onChange={e=>setRememberEnabled(e.target.checked)}/>{t("允許聊天時擷取重要回憶（可關閉或刪除）","Allow chat memories (can disable or delete)")}</label>
    <button className="souls-primary" disabled={!name.trim()||busy}>{t("喚醒這個靈魂 ✦","Awaken Soul ✦")}</button>
   </form>
  </section>}
  {!cameraOpen&&step==="detail"&&selected&&<><section className="souls-panel souls-profile"><div className="souls-cutout-stage"><button type="button" className="souls-cutout-target" disabled={cutting} onClick={e=>void removeBackground(e,true)} aria-label={t("點物品去背","Tap object to remove background")}><img src={selected.cutout||selected.photos[0]?.image} alt={selected.description||selected.name}/></button><small>{cutting?t("正在去背…","Removing background…"):t("點物品重新去背","Tap object to cut out again")}</small></div><div>
    <small>SOUL #{selected.id.slice(0,8)}</small><h2>{selected.name}</h2><p>{selected.kind||t("獨特物品","Unique object")}</p><p>{selected.description}</p><small>{selected.photos.length} {t("張參考照","reference photos")}</small></div>
    {scan&&<div className="souls-angle"><p>{t("已確認這次掃描是它。要加入參考照片嗎？","Confirmed match. Add this scan as a reference photo?")}</p><button onClick={()=>void addAngle()}>{t("加入角度（最多 8 張）","Add angle (max 8)")}</button></div>}
   </section>
   <SoulChat key={selected.id} soul={selected} en={en} onChange={()=>{void refresh(selected.id)}}/>
   <section className="souls-panel"><h2>{t("它記得的事","Memories")} <small>({selected.notes.length}/30)</small></h2>
    <label className="souls-checkbox"><input type="checkbox" checked={selected.remember} onChange={e=>void mutate(s=>({...s,remember:e.target.checked}))}/>{t("聊天時使用並擷取回憶","Use and capture memories during chats")}</label>
    <p className="souls-muted">{t("只擷取有對話依據的摘要，不保存逐字稿；關閉後不使用回憶。","Only grounded notes are saved, not transcripts. Disable to stop using memories.")}</p>
    <form className="souls-note" onSubmit={e=>void manual(e)}><input value={note} onChange={e=>setNote(e.target.value)} maxLength={180} aria-label={t("新增回憶","New memory")} placeholder={t("手動記下一件事…","Add a memory…")}/><button disabled={!note.trim()}>{t("記住","Remember")}</button></form>
    <ul className="souls-notes">{[...selected.notes].reverse().map(n=><li key={n.id}><span>{n.text}<small>{n.source==="manual"?t("手動","Manual"):t("聊天擷取","From chat")}</small></span><button aria-label={t("刪除回憶","Delete memory")} onClick={()=>void mutate(s=>({...s,notes:s.notes.filter(x=>x.id!==n.id)}))}>×</button></li>)}</ul>
   </section>
   <div className="souls-delete"><button onClick={()=>void erase()}>{t("刪除靈魂及全部回憶","Delete Soul and memories")}</button></div>
  </>}
  <footer className="souls-footer">{t("隱藏網址不是存取控制。掃描、去背在本機處理，首次去背會下載模型。照片與回憶存在此瀏覽器，清除網站資料就會消失。主動要求 Gemini 看照片才會上傳影像；Live 對話會傳給 Gemini。","Unlisted does not mean access-controlled. Scanning and cutout run locally; cutout downloads a model. Photos and memories are stored in this browser and lost on clearing site data. Images are uploaded only when you request Gemini visual analysis; Live conversations go to Gemini.")}</footer>
 </main>;
}
