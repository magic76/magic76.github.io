import {useCallback,useEffect,useRef,useState,type ChangeEvent,type FormEvent,type MouseEvent} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {SoulChat} from "./SoulChat";
import {SoulPortrait} from "./SoulPortrait";
import {SoulMaskEditor} from "./SoulMaskEditor";
import {SoulTransformControls} from "./SoulTransformControls";
import {DEFAULT_TRANSFORM,safeTransform,type SoulTransform} from "./soulTransform";
import {type SoulVisual} from "./soulVisual";
import {DEFAULT_FACE,faceFromAlpha,safeFace,type SoulFace} from "./soulFace";
import {type Soul,type Photo,type SoulSubjectType,type SoulSpeechStyle,persona,pid,trim,list,save,update,remove,photoFromFile,soulFaceVisible,soulSubjectType,soulSpeechStyle} from "./soulData";
import {randomSoulVoice,soulVoiceLabel} from "./soulVoice";
import {cutoutObject,CutoutError,type CutoutProgress} from "./soulCutout";
import {ensureVision,geminiKey} from "../lib/runtime";
import "./souls.css";

function loadImage(src:string):Promise<HTMLImageElement>{
 return new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>reject(new Error("Image could not be loaded"));
  image.src=src;
 });
}
async function suggestedFace(src:string):Promise<SoulFace>{
 const image=await loadImage(src);
 const canvas=document.createElement("canvas");canvas.width=canvas.height=320;
 const ctx=canvas.getContext("2d",{willReadFrequently:true});
 if(!ctx)return {...DEFAULT_FACE};
 ctx.drawImage(image,0,0,320,320);
 return faceFromAlpha(ctx.getImageData(0,0,320,320).data,320,320);
}

/** Photo-first object characters. Old IndexedDB Souls are preserved without migration. */
export function SoulsPage(){
 const {i18n}=useTranslation(),en=!i18n.language.startsWith("zh");
 const t=(zh:string,english:string)=>en?english:zh;
 const [items,setItems]=useState<Soul[]>([]);
 const [selected,setSelected]=useState<Soul|null>(null);
 const [step,setStep]=useState<"home"|"edit"|"detail">("home");
 const [draft,setDraft]=useState<Photo|null>(null);
 const [cutoutDraft,setCutoutDraft]=useState("");
 const [useCutout,setUseCutout]=useState(true);
 const [subjectType,setSubjectType]=useState<SoulSubjectType>("object");
 const [faceVisible,setFaceVisible]=useState(true);
 const [speechStyle,setSpeechStyle]=useState<SoulSpeechStyle>("bubble");
 const [maskEditing,setMaskEditing]=useState<"draft"|"saved"|null>(null);
 function chooseSubject(kind:SoulSubjectType){
  setSubjectType(kind);setFaceVisible(kind==="object");
  setSpeechStyle(kind==="person"?"subtitle":"bubble");
 }
 const [faceDraft,setFaceDraft]=useState<SoulFace>({...DEFAULT_FACE});
 const [transformDraft,setTransformDraft]=useState<SoulTransform>({...DEFAULT_TRANSFORM});
 const [editTarget,setEditTarget]=useState<"object"|"face">("object");
 const faceWasEdited=useRef(false);
 function changeFace(next:SoulFace){faceWasEdited.current=true;setFaceDraft(next)}
 const [selectSubject,setSelectSubject]=useState(false);
 const [editFace,setEditFace]=useState(false);
 const [name,setName]=useState(""),[kind,setKind]=useState(""),[description,setDescription]=useState("");
 const [personality,setPersonality]=useState<Soul["personality"]>("witty");
 const [draftVoice,setDraftVoice]=useState(()=>randomSoulVoice());
 const [rememberEnabled,setRememberEnabled]=useState(true);
 const [note,setNote]=useState("");
 const [busy,setBusy]=useState(false),[cutting,setCutting]=useState(false);
 const [cutoutPhase,setCutoutPhase]=useState<CutoutProgress>("loading");
 const [error,setError]=useState(""),[info,setInfo]=useState("");
 const [visual,setVisual]=useState<SoulVisual>({state:"idle",caption:"",mood:"calm"});
 const camera=useRef<HTMLInputElement>(null),gallery=useRef<HTMLInputElement>(null);
 const cutoutJob=useRef(0),alive=useRef(true);
 const mouthRef=useRef<SVGEllipseElement|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;cutoutJob.current++}},[]);
 const onAudioLevel=useCallback((level:number)=>{
  const mouth=mouthRef.current;
  if(mouth)mouth.setAttribute("ry",String(Math.max(3,Math.min(19,Math.round(3+level*16)))));
 },[]);
 const onVisual=useCallback((next:SoulVisual)=>{
  setVisual(previous=>previous.state===next.state&&previous.caption===next.caption&&
   previous.mood===next.mood&&previous.hearing===next.hearing?previous:next);
 },[]);
 async function refresh(id?:string){
  const all=await list();
  if(!alive.current)return;
  setItems(all);
  if(id)setSelected(all.find(s=>s.id===id)||null);
 }
 useEffect(()=>{void refresh().catch(()=>setError(t("本機收藏無法讀取，請確認瀏覽器儲存權限。","Could not read local Souls.")))},[]);
 function resetVisual(){setVisual({state:"idle",caption:"",mood:"calm"})}
 function home(){
  cutoutJob.current++;setCutting(false);
  setStep("home");setSelected(null);setDraft(null);setCutoutDraft("");
  setUseCutout(true);setSelectSubject(false);setEditFace(false);setMaskEditing(null);
  setSubjectType("object");setFaceVisible(true);setSpeechStyle("bubble");
  setTransformDraft({...DEFAULT_TRANSFORM});setEditTarget("object");faceWasEdited.current=false;
  setError("");setInfo("");resetVisual();
 }
 async function runCutout(image:string,point:{x:number;y:number},existingId?:string){
  const job=++cutoutJob.current;
  setCutting(true);setCutoutPhase("loading");setError("");
  setInfo(t("正在準備本機去背模型。第一次需要下載與初始化，執行時畫面可能暫時停頓；仍可保留原圖建立 Soul。","Preparing on-device model. First use downloads and initializes the model; segmentation may briefly pause the screen."));
  try{
   // Give React an opportunity to display the busy indicator before the synchronous inference.
   await new Promise<void>(resolve=>window.setTimeout(resolve,35));
   const result=await cutoutObject(image,point,phase=>{
    if(!alive.current||job!==cutoutJob.current)return;
    setCutoutPhase(phase);
    if(phase==="segmenting")setInfo(t("模型已準備，正在分析物品輪廓；手機可能短暫停頓。","Model ready. Segmenting object; the UI may briefly pause."));
    if(phase==="compositing")setInfo(t("已取得輪廓，正在製作透明背景圖片。","Mask ready. Compositing the cutout."));
   });
   if(!alive.current||job!==cutoutJob.current)return;
   const face=await suggestedFace(result);
   if(!alive.current||job!==cutoutJob.current)return;
   if(existingId){
    await update(existingId,s=>({...s,cutout:result,face}));
    if(!alive.current||job!==cutoutJob.current)return;
    await refresh(existingId);if(!faceWasEdited.current)setFaceDraft(face);setEditFace(false);
   }else{
    setCutoutDraft(result);setUseCutout(true);if(!faceWasEdited.current)setFaceDraft(face);
   }
   setSelectSubject(false);
   setInfo(t("去背完成！可以拖曳眼睛微調位置。","Background removed. Drag the eyes to fine-tune their position."));
  }catch(cause){
   if(!alive.current||job!==cutoutJob.current)return;
   console.warn("[Crew Souls] optional photo cutout failed",cause);
   const reason=cause instanceof CutoutError?cause.kind:"unknown";
   if(reason==="runtime"||reason==="model"){
    setInfo(t("本機去背模型無法載入，請確認網路後點「重新點選去背主體」再試；也可以保留原圖建立 Soul。","The on-device cutout model could not load. Check your connection and retry selecting the object, or save the original image."));
   }else if(reason==="selection"){
    setInfo(t("去背沒選到清楚的物品，請點照片中的物品本體重試；也可以保留原圖。","Could not isolate the object. Tap the object itself to retry, or keep the original photo."));
   }else if(reason==="inference"){
    setInfo(t("去背模型執行失敗，請重新點選物品重試；保留原圖也能聊天。","Cutout inference failed. Select the object again, or keep the original photo."));
   }else{
    setInfo(t("這張照片暫時無法自動去背。可以保留原圖、調整眼睛，一樣建立 Soul。","Cutout could not finish. Keep the original image and position the eyes; your Soul still works."));
   }
   setSelectSubject(false);
  }finally{
   if(alive.current&&job===cutoutJob.current)setCutting(false);
  }
 }
 async function pickPhoto(event:ChangeEvent<HTMLInputElement>){
  const file=event.currentTarget.files?.[0];event.currentTarget.value="";
  if(!file)return;
  cutoutJob.current++;setCutting(false);
  setBusy(true);setError("");setInfo("");
  try{
   const p=await photoFromFile(file);
   if(!alive.current)return;
   setDraft(p);setSelected(null);setStep("edit");setCutoutDraft("");
   setFaceDraft({...DEFAULT_FACE});faceWasEdited.current=false;
   setTransformDraft({...DEFAULT_TRANSFORM});setEditTarget("object");
   setUseCutout(true);setSelectSubject(false);setMaskEditing(null);
   setSubjectType("object");setFaceVisible(true);setSpeechStyle("bubble");
   setName("");setKind("");setDescription("");setPersonality("witty");
   setDraftVoice(previous=>randomSoulVoice(previous));setRememberEnabled(true);
   setBusy(false);
   if(p.quality)setInfo(t("照片可能有點模糊或曝光不足；可繼續建立，也可以換一張。","This photo may be blurry or underexposed. You may continue or choose another."));
   void runCutout(p.image,{x:.5,y:.52});
  }catch(cause){
   setError(cause instanceof Error?cause.message:String(cause));
  }finally{if(alive.current)setBusy(false)}
 }
 function tapSource(event:MouseEvent<HTMLButtonElement>,source:string,existingId?:string){
  const rect=event.currentTarget.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const point={x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};
  setSelectSubject(false);
  void runCutout(source,point,existingId);
 }
 async function suggestDetails(){
  if(!draft||busy)return;
  if(!geminiKey()){
   setError(t("需要 Gemini Key 才能分析照片；也可以直接手動命名。","Gemini Key required to analyze a photo; manual naming works too."));
   return;
  }
  setBusy(true);setError("");
  try{
   await ensureVision();
   if(!window.CrewGeminiVision?.generate)throw Error("Vision unavailable");
   const result=await window.CrewGeminiVision.generate(
    "Return JSON only: {\"kind\":\"\",\"description\":\"\",\"suggestedName\":\"\"}. Describe the visible "+(subjectType==="person"?"portrait":"main household object")+" in Traditional Chinese. For a person, never identify them, infer age, ethnicity, health, background or private traits. No sensitive assumptions.",
    [{mimeType:"image/jpeg",data:draft.image.split(",")[1]}],
    {json:true,maxOutputTokens:350}
   ) as {kind?:unknown;description?:unknown;suggestedName?:unknown};
   setKind(trim(result.kind,60));setDescription(trim(result.description,140));
   setName(previous=>previous||trim(result.suggestedName,40));
   setInfo(t("已提供名稱與描述建議，儲存前都可以修改。","Suggested a name and description. You can edit them before saving."));
  }catch{setError(t("AI 分析失敗，你仍然可以手動命名。","AI analysis failed. You can still name this Soul yourself."))}
  finally{setBusy(false)}
 }
 async function create(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!draft||!name.trim()||busy)return;
  // Cancel optional cutout in progress so it cannot write into a later draft.
  cutoutJob.current++;setCutting(false);setBusy(true);setError("");
  try{
   const now=Date.now();
   const s:Soul={
    id:pid(),name:trim(name,40),kind:trim(kind,60),
    description:trim(description,140),personality,
    voice:draftVoice,photos:[draft],
    cutout:useCutout&&cutoutDraft?cutoutDraft:undefined,
    subjectType,faceVisible,speechStyle,
    face:safeFace(faceDraft),transform:safeTransform(transformDraft),notes:[],remember:rememberEnabled,
    createdAt:now,lastSeenAt:now
   };
   await save(s);await refresh(s.id);
   setDraft(null);setCutoutDraft("");setStep("detail");setSelectSubject(false);
   resetVisual();
   setInfo(t("你的物品已經有靈魂了！可以開始跟它說話。","Your object is now a Soul. Start talking to it!"));
  }catch{setError(t("儲存失敗，請檢查瀏覽器的儲存空間。","Could not save Soul. Check browser storage."))}
  finally{setBusy(false)}
 }
 async function choose(s:Soul){
  cutoutJob.current++;setCutting(false);
  setSelected(s);setDraft(null);setStep("detail");setSelectSubject(false);setMaskEditing(null);
  setEditFace(false);setEditTarget("object");setTransformDraft(safeTransform(s.transform));
  faceWasEdited.current=false;resetVisual();setError("");setInfo("");
  try{await update(s.id,old=>({...old,lastSeenAt:Date.now()}));await refresh(s.id)}
  catch{setError(t("無法更新本機收藏，但你仍可嘗試聊天。","Could not update local visit time."))}
 }
 async function mutate(fn:(s:Soul)=>Soul){
  if(!selected)return;
  try{await update(selected.id,fn);await refresh(selected.id)}
  catch{setError(t("本機資料儲存失敗。","Could not save local data."))}
 }
 async function applySavedMask(dataUrl:string){
  if(!selected)return;
  const id=selected.id;
  setError("");
  try{
   await update(id,current=>({...current,cutout:dataUrl}));
   await refresh(id);setMaskEditing(null);
   setInfo(t("去背修補已儲存。","Cutout repair saved."));
  }catch{setError(t("修補結果儲存失敗。","Could not save repaired cutout."))}
 }
 async function rerollSavedVoice(){
  if(!selected)return;
  const id=selected.id;
  setError("");
  try{
   await update(id,current=>({...current,voice:randomSoulVoice(current.voice)}));
   await refresh(id);
   setInfo(t("已替 Soul 換好聲線，下一次重新連接 Live 時生效。","Soul voice saved. Reconnect Gemini Live to hear the new voice."));
  }catch{
   setError(t("更新聲線失敗，請再試一次。","Could not update Soul voice. Please retry."));
  }
 }
 async function saveFace(){
  if(!selected)return;
  await mutate(s=>({...s,face:safeFace(faceDraft),transform:safeTransform(transformDraft)}));
  setEditFace(false);
  setInfo(t("物品位置、大小、角度及五官已儲存。","Object transform and face placement saved."));
 }
 async function manual(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!note.trim())return;
  await mutate(s=>({...s,notes:[...s.notes,{id:pid(),text:trim(note),source:"manual" as const}].slice(-30)}));
  setNote("");
 }
 async function erase(){
  if(!selected||!window.confirm(t("確定刪除此物品、角色圖與全部回憶？無法復原。","Delete this Soul, portrait and all memories permanently?")))return;
  try{await remove(selected.id);home();await refresh()}
  catch{setError(t("刪除失敗。","Delete failed."))}
 }
 const editingImage=cutoutDraft&&useCutout?cutoutDraft:draft?.image||"";
 const selectedKind=selected?soulSubjectType(selected):"object";
 const selectedImage=selected?.cutout||selected?.photos[0]?.image||"";
 return <main className="souls-page souls-photo-first">
  <header className="souls-header">
   <Link to="/explore">← {t("探索","Explore")}</Link>
   <small>CREW SOULS · LIVING PORTRAITS</small>
   <h1>{t("讓照片裡的角色，活過來。","Bring a portrait to life.")}</h1>
   <p>{t("物品或人物照片都可以。去背、修補輪廓、設定個性，創造能說話的虛構角色。","Use an object or a person photo. Remove and repair the background, then create a fictional character you can talk to.")}</p>
  </header>
  <input className="souls-hidden" ref={camera} type="file" accept="image/*" capture="environment"
   aria-label={t("拍攝一張物品照片","Take object photo")} onChange={e=>void pickPhoto(e)}/>
  <input className="souls-hidden" ref={gallery} type="file" accept="image/*"
   aria-label={t("從相簿挑選照片","Choose image")} onChange={e=>void pickPhoto(e)}/>
  <div className="souls-actions souls-main-actions">
   <button className="souls-primary" disabled={busy} onClick={()=>camera.current?.click()}>
    <span aria-hidden="true">◎</span> {t("拍一張，創造 Soul","Take a photo")}
   </button>
   <button disabled={busy} onClick={()=>gallery.current?.click()}>
    {t("從相簿選照片","Choose from gallery")}
   </button>
   {step!=="home"&&<button onClick={home}>{t("回到我的收藏","Back to collection")}</button>}
  </div>
  {busy&&<p role="status" className="souls-info">{t("正在處理照片或儲存資料…","Processing photo or saving…")}</p>}
  {error&&<p role="alert" className="souls-error">{error}</p>}
  {info&&<p role="status" className="souls-info">{info}</p>}
  {step==="home"&&<section className="souls-panel">
   <div className="souls-section-heading"><div><small>{t("你的生活收藏","YOUR COLLECTION")}</small>
    <h2>{t("我的 Soul","My Souls")} <small>({items.length})</small></h2></div></div>
   {!items.length?<div className="souls-empty">✦
    <p>{t("還沒有 Soul。先拍一張喜歡的物品或人物照片。","No Souls yet. Start with an object or person photo.")}</p>
    <button type="button" onClick={()=>camera.current?.click()}>{t("建立第一個 Soul","Create your first Soul")}</button>
   </div>:<div className="souls-grid souls-collection">
    {items.map(s=><button key={s.id} type="button" onClick={()=>void choose(s)}>
     <SoulPortrait image={s.cutout||s.photos[0]?.image||""} face={s.face} transform={s.transform} personality={s.personality} faceVisible={soulFaceVisible(s)} name={s.name} caption={false}/>
     <small>{s.kind||t("獨特物品","Unique object")} · {s.notes.length} {t("則回憶","memories")}</small>
    </button>)}
   </div>}
  </section>}
  {step==="edit"&&draft&&<section className="souls-panel souls-editor">
   <div className="souls-section-heading"><div><small>{t("01 · 準備角色照片","01 · PREPARE PHOTO")}</small>
    <h2>{t("把照片變成角色","Bring the photo to life")}</h2></div></div>
   <div className="souls-subject-toggle" role="group" aria-label={t("角色類型","Character type")}>
    <button type="button" aria-pressed={subjectType==="object"} onClick={()=>chooseSubject("object")}>{t("物品","Object")}</button>
    <button type="button" aria-pressed={subjectType==="person"} onClick={()=>chooseSubject("person")}>{t("人物","Person")}</button>
    <small>{t("人物預設保留原本五官、不加卡通臉；聊天角色為虛構設定。","People keep their natural face by default; the chat persona is fictional.")}</small>
   </div>
   {maskEditing==="draft"?<SoulMaskEditor
    original={draft.image} initialCutout={cutoutDraft||undefined} en={en}
    onApply={data=>{setCutoutDraft(data);setUseCutout(true);setMaskEditing(null);
     setInfo(t("手動修補已套用。","Manual cutout repair applied."))}}
    onCancel={()=>setMaskEditing(null)}/>
   :selectSubject?<div className="souls-subject-picker">
    <p>{t("點一下你要留下的物品，不必點得很準。","Tap the object you want to cut out.")}</p>
    <button type="button" disabled={cutting} onClick={e=>tapSource(e,draft.image)}
     aria-label={t("點選去背主體","Select cutout subject")}>
     <img src={draft.image} alt={t("點選照片中的物品","Choose the object in the photo")}/>
    </button>
    <button type="button" onClick={()=>setSelectSubject(false)}>{t("取消，回到角色預覽","Cancel")}</button>
   </div>:<div className="souls-editor-layout">
    <SoulPortrait image={editingImage} face={faceDraft} personality={personality} faceVisible={faceVisible} onFaceChange={changeFace}
     transform={transformDraft} onTransformChange={setTransformDraft}
     editing editTarget={editTarget}/>
    <div className="souls-editor-tools">
     <label className="souls-checkbox"><input type="checkbox" checked={faceVisible}
      onChange={e=>setFaceVisible(e.target.checked)}/>
      {t("顯示 Q 版靈魂臉","Show cartoon Soul face")}
     </label>
     <SoulTransformControls mode={editTarget} onModeChange={setEditTarget}
      face={faceDraft} onFaceChange={changeFace}
      transform={transformDraft} onTransformChange={setTransformDraft} en={en}/>
     <div className="souls-editor-buttons">
      {cutoutDraft&&<button type="button" aria-pressed={useCutout}
       onClick={()=>setUseCutout(v=>!v)}>
       {useCutout?t("顯示原圖","Show original"):t("使用去背圖","Use cutout")}
      </button>}
      <button type="button" onClick={()=>{cutoutJob.current++;setCutting(false);setSelectSubject(true)}}>
       {t("重新點選去背主體","Retry cutout")}
      </button>
      <button type="button" onClick={()=>{cutoutJob.current++;setCutting(false);setMaskEditing("draft")}}>
       {t("手動修補去背","Repair cutout")}
      </button>
     </div>
     <p className="souls-muted">{cutting?(cutoutPhase==="loading"?
      t("正在下載或初始化去背模型，首次使用可能較慢。","Downloading or initializing the cutout model (first use may take longer)."):
      cutoutPhase==="segmenting"?
      t("正在執行物品分割，畫面可能暫時停住。","Running segmentation; the screen may briefly freeze."):
      t("正在製作去背圖片…","Compositing the cutout…")) :
      cutoutDraft&&useCutout?t("透明背景已完成。","Transparent background ready.") :
      t("目前使用原始照片，可以直接存成 Soul。","Using the original photo. You can still create a Soul.")}</p>
    </div>
   </div>}
   <div className="souls-editor-details">
    <div className="souls-section-heading"><div><small>{t("02 · 設定角色個性","02 · SET PERSONALITY")}</small>
     <h2>{t("幫它取個名字","Name your Soul")}</h2></div></div>
    <button className="souls-ai-describe" type="button" disabled={busy}
     onClick={()=>void suggestDetails()}>
     {t("✧ 讓 Gemini 幫忙取名（會上傳照片）","✧ Gemini name suggestion (uploads photo)")}
    </button>
    <form className="souls-form" onSubmit={e=>void create(e)}>
     <label>{t("名字 *","Name *")}
      <input required maxLength={40} value={name} onChange={e=>setName(e.target.value)}
       placeholder={t("例如：小杯杯","e.g. Mugsy")}/>
     </label>
     <label>{t(subjectType==="person"?"角色定位":"物品種類",subjectType==="person"?"Character role":"Object type")}
      <input maxLength={60} value={kind} onChange={e=>setKind(e.target.value)}
       placeholder={t(subjectType==="person"?"例如：愛旅行的虛構角色":"例如：咖啡杯",subjectType==="person"?"e.g. Fictional traveler":"e.g. Coffee mug")}/>
     </label>
     <label>{t("外觀特色（選填）","Appearance (optional)")}
      <textarea maxLength={140} value={description} onChange={e=>setDescription(e.target.value)}/>
     </label>
     <fieldset><legend>{t("它是什麼個性？","Personality")}</legend>
      <div className="souls-pills">
       {(Object.keys(persona) as Soul["personality"][]).map(id=><button type="button" key={id}
        aria-pressed={personality===id} onClick={()=>setPersonality(id)}>
        {en?persona[id][1]:persona[id][0]}</button>)}
      </div>
     </fieldset>
     <div className="souls-voice-choice">
      <span>{t("專屬聲線","Soul voice")}：<strong>{soulVoiceLabel(draftVoice)}</strong></span>
      <button type="button" onClick={()=>setDraftVoice(previous=>randomSoulVoice(previous))}>
       {t("換個聲音","Shuffle voice")}
      </button>
      <small>{t("從 Gemini Live 聲線中隨機選一種，儲存後不會自己改變。","Randomly chosen from Gemini Live voices; stays the same after saving.")}</small>
     </div>
     <label className="souls-checkbox"><input type="checkbox" checked={rememberEnabled}
      onChange={e=>setRememberEnabled(e.target.checked)}/>
      {t("允許聊天時擷取有依據的回憶（之後可關閉或刪除）","Remember grounded facts from chats (can disable or delete)")}
     </label>
     <button className="souls-primary" disabled={!name.trim()||busy}>
      {t("儲存 Soul，開始聊天 ✦","Save Soul & start chatting ✦")}
     </button>
    </form>
   </div>
  </section>}
  {step==="detail"&&selected&&<div className="souls-details">
   <section className="souls-panel souls-photo-profile">
    <div className="souls-profile-portrait">
     <SoulPortrait image={selectedImage} face={editFace?faceDraft:selected.face} personality={selected.personality}
      transform={editFace?transformDraft:selected.transform} editTarget={editTarget}
      editing={editFace} onFaceChange={editFace?changeFace:undefined}
      onTransformChange={editFace?setTransformDraft:undefined}
      visual={visual} name={selected.name} mouthRef={mouthRef}/>
     {editFace&&<SoulTransformControls mode={editTarget} onModeChange={setEditTarget}
      face={faceDraft} onFaceChange={changeFace} transform={transformDraft}
      onTransformChange={setTransformDraft} en={en}/>}
    </div>
    <div className="souls-profile-copy">
     <small>{t("你的物品朋友","YOUR OBJECT FRIEND")}</small>
     <h2>{selected.name}</h2><p>{selected.kind||t("獨一無二的小東西","A one-of-a-kind object")}</p>
     {selected.description&&<p>{selected.description}</p>}
     <div className="souls-voice-choice souls-saved-voice">
      <span>{t("專屬聲線","Soul voice")}：<strong>{soulVoiceLabel(selected.voice)}</strong></span>
      <button type="button" onClick={()=>void rerollSavedVoice()}>
       {t("重新抽聲線","Shuffle voice")}
      </button>
      <small>{t("已儲存的聲線不會自動變。換聲線後，下次重新連線 Live 才會生效。","The saved voice is stable. A change takes effect on your next Live connection.")}</small>
     </div>
     <div className="souls-profile-buttons">
      {editFace?<><button type="button" onClick={()=>void saveFace()}>{t("儲存物品與五官","Save object & eyes")}</button>
       <button type="button" onClick={()=>setEditFace(false)}>{t("取消","Cancel")}</button></>:
       <button type="button" onClick={()=>{setFaceDraft(safeFace(selected.face));setTransformDraft(safeTransform(selected.transform));setEditTarget("object");faceWasEdited.current=false;setEditFace(true)}}>
        {t("調整物品／五官","Adjust object / eyes")}
       </button>}
     </div>
     <small>{t("這個 Soul 會保存在這台裝置的瀏覽器裡。","This Soul is stored in this browser.")}</small>
    </div>
   </section>
   <SoulChat key={selected.id} soul={selected} en={en} onChange={()=>{void refresh(selected.id)}}
    onVisual={onVisual} onAudioLevel={onAudioLevel}/>
   <section className="souls-panel">
    <h2>{t("它記得的事","Memories")} <small>({selected.notes.length}/30)</small></h2>
    <label className="souls-checkbox"><input type="checkbox" checked={selected.remember}
     onChange={e=>void mutate(s=>({...s,remember:e.target.checked}))}/>
     {t("聊天時使用並擷取回憶","Use and capture memories during chats")}
    </label>
    <p className="souls-muted">{t("只保存有依據的摘要，不保留逐字稿；可逐則刪除。","Only grounded notes are saved, not full transcripts. Delete any note.")}</p>
    <form className="souls-note" onSubmit={e=>void manual(e)}>
     <input value={note} maxLength={180} onChange={e=>setNote(e.target.value)}
      aria-label={t("新增回憶","New memory")} placeholder={t("手動記下想讓它記得的事…","Add a memory…")}/>
     <button disabled={!note.trim()}>{t("記住","Remember")}</button>
    </form>
    <ul className="souls-notes">{[...selected.notes].reverse().map(n=><li key={n.id}>
     <span>{n.text}<small>{n.source==="manual"?t("手動","Manual"):t("聊天擷取","From chat")}</small></span>
     <button type="button" aria-label={t("刪除回憶","Delete memory")}
      onClick={()=>void mutate(s=>({...s,notes:s.notes.filter(item=>item.id!==n.id)}))}>×</button>
    </li>)}</ul>
   </section>
   <div className="souls-delete"><button type="button" onClick={()=>void erase()}>
    {t("刪除此 Soul 與全部回憶","Delete Soul and memories")}
   </button></div>
  </div>}
  <footer className="souls-footer">{t(
   "照片去背在本機處理，首次使用需下載模型；失敗仍可保留原圖。照片與回憶存在此瀏覽器，清除網站資料就會消失。只有你主動要求 Gemini 分析照片才會上傳影像；Live 對話會傳給 Gemini。",
   "Cutout runs on-device after downloading a model; originals can be kept if it fails. Photos and memories remain in this browser unless site data is cleared. Only explicit Gemini photo analysis uploads an image; Live conversations go to Gemini."
  )}</footer>
 </main>;
}
