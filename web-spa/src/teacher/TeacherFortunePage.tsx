import {Arrow} from "../components/Arrow";
import {useEffect,useMemo,useState} from "react";
import {Link,Navigate,useNavigate,useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ensureFortuneServices} from "../lib/runtime";
import {FortuneProfileTools} from "../fortune/ProfileTools";
import {resolveBirthOffset} from "../fortune/birthPlaceSearch";
import {buildLocalReport,type FortuneChapter} from "../fortune/report";
import {readFortuneHistoryPreviews} from "../fortune/readingHistory";
import type {FortuneMode,FortuneProfile,FortuneReading} from "../fortune/types";
import {dailyFortuneTopic,saveFortuneSpeakingContext,type FortuneSpeakingKind} from "./fortuneSpeaking";
import {useTeacherStore} from "../store/teacherStore";
import "./fortuneHub.css";

const EMPTY:FortuneProfile={
 birthDate:"",birthTime:"",gender:"1",city:"",latitude:"",longitude:"",
 utcOffset:"",timeZoneId:"",aiStyle:"normal"
};
const MODES:{id:FortuneMode;name:string;hint:string}[]=[
 {id:"bazi",name:"八字",hint:"需要生日與出生時間"},
 {id:"tarot",name:"塔羅生命靈數",hint:"只需要出生日期"},
 {id:"vedic",name:"印度星盤",hint:"需要生日、時間與出生地"}
];
const FOCUS=[{id:"overview",name:"整體探索"},{id:"career",name:"工作與選擇"},
 {id:"relationships",name:"感情與人際"},{id:"personality",name:"個性與天賦"}] as const;
type FocusId=typeof FOCUS[number]["id"];
type Phase="home"|"create"|"result";
const label=(mode:FortuneMode)=>MODES.find(x=>x.id===mode)?.name||"命盤";

function calculate(mode:FortuneMode,p:FortuneProfile):unknown{
 const now=new Date();
 if(mode==="bazi")return window.CrewFortuneBaZi.calculate(p.birthDate,p.birthTime,Number(p.gender),now);
 if(mode==="tarot")return window.CrewFortuneTarot.calculate(p.birthDate,now);
 const chart=window.CrewFortuneVedic.calculate(p,now);
 return window.CrewFortuneVedicEnrich.enrich(chart,p,now);
}
function compatibleReading(x:unknown):x is FortuneReading{
 if(!x||typeof x!=="object")return false;
 const v=x as Partial<FortuneReading>;
 return typeof v.id==="string"&&["bazi","tarot","vedic"].includes(v.mode||"")
  &&Boolean(v.result)&&typeof v.result==="object";
}
export function nativeFortuneStartUrl(kind:FortuneSpeakingKind,summary=""):string{
 // Only the user-click action below invokes this scheme; never transfer raw birth fields.
 return "crewteacher://fortune/start?kind="+encodeURIComponent(kind)
   +"&summary="+encodeURIComponent(summary.slice(0,1800));
}

export function TeacherFortunePage(){
 const {i18n}=useTranslation("teacher");
 const english=i18n.language.startsWith("en");
 const [params]=useSearchParams(),nativeHost=params.get("host")==="android";
 const navigate=useNavigate(),targetLanguage=useTeacherStore(s=>s.targetLanguage);
 const [phase,setPhase]=useState<Phase>("home"),[mode,setMode]=useState<FortuneMode>("bazi");
 const [profile,setProfile]=useState<FortuneProfile>(EMPTY);
 const [readings,setReadings]=useState<FortuneReading[]>([]),[reading,setReading]=useState<FortuneReading|null>(null);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState("");
 const [focus,setFocus]=useState<FocusId>("overview");
 const [moreHistory,setMoreHistory]=useState(false);
 useEffect(()=>{
  let cancelled=false;
  void ensureFortuneServices().then(()=>{
   if(cancelled)return;
   const saved=window.CrewFortuneProfile.load()||{};
   setProfile({...EMPTY,...saved});
   const history=readFortuneHistoryPreviews(20).map(x=>window.CrewFortuneProfile.get(x.id))
    .filter(compatibleReading);
   setReadings(history);
   setLoading(false);
  }).catch(()=>{if(!cancelled){setError("命理計算器暫時無法載入，請檢查網路並重新開啟。");setLoading(false)}});
  return ()=>{cancelled=true};
 },[]);
 const chapters=useMemo(()=>reading?buildLocalReport(reading.mode,reading.result):[],[reading]);
 const chosen=chapters.find(c=>c.id===focus)||chapters.find(c=>c.id==="overview");
 const displayed=chosen?[chosen,...chapters.filter(c=>c.id!==chosen.id).slice(0,2)]:chapters.slice(0,3);
 function beginNew(){
  setError("");setFocus("overview");setReading(null);setPhase("create");
 }
 function openReading(item:FortuneReading){
  setReading(item);setMode(item.mode);setFocus("overview");setPhase("result");setError("");
 }
 function validate():string{
  if(!profile.birthDate)return english?"Enter your birth date.":"請填寫出生日期。";
  if(mode!=="tarot"&&!profile.birthTime)return english?"Enter your birth time.":"請填寫出生時間。";
  if(mode==="vedic"&&(!profile.latitude||!profile.longitude||
    !resolveBirthOffset(profile)))return "印度星盤需要有效的出生城市與時區，請先搜尋並選擇地點。";
  return "";
 }
 function createReading(){
  const issue=validate();if(issue){setError(issue);return}
  setSaving(true);setError("");
  try{
   const resolved={...profile,utcOffset:resolveBirthOffset(profile)};
   const result=calculate(mode,resolved);
   if(!result||typeof result!=="object")throw Error("未取得有效的命盤結果");
   const r:any=result;
   const summary=label(mode)+" · "+String(r.fourPillars||r.birthCardDisplay||
      (r.lagnaSign?"Lagna "+r.lagnaSign:"命盤已完成"));
   const item:FortuneReading={id:"reading_"+Date.now(),mode,profile:{...resolved},
    result,summary,createdAt:new Date().toISOString()};
   window.CrewFortuneProfile.save(resolved);
   window.CrewFortuneProfile.addHistory(item);
   setReadings(old=>[item,...old.filter(x=>x.id!==item.id)].slice(0,20));
   openReading(item);
  }catch(e){setError(e instanceof Error?e.message:"命盤計算失敗，請確認輸入資料。")}
  finally{setSaving(false)}
 }
 function start(kind:FortuneSpeakingKind,selectedReading?:FortuneReading){
  const active=selectedReading||reading;
  if(kind==="reading"&&!active)return;
  const activeFocus=selectedReading?"overview":focus;
  const notes=kind==="reading"&&active?buildLocalReport(active.mode,active.result):[];
  const preferred=[activeFocus,"overview","currentCycle","personality","career"];
  const selectedNotes=preferred.map(id=>notes.find(c=>c.id===id)).filter((c,i,arr)=>c&&arr.findIndex(other=>other?.id===c.id)===i)
   .slice(0,4).map(c=>c!.title+"："+c!.text).join("\n");
  if(kind==="reading"&&active)saveFortuneSpeakingContext(active,activeFocus);
  if(nativeHost){
   const excerpt=kind==="reading"&&active
    ?(active.summary+"\n"+selectedNotes).slice(0,1800):"";
   window.location.href=nativeFortuneStartUrl(kind,excerpt);
  }else{
   // The visitor came for an explanation, not Teacher's language coaching loop.
   // Use the dedicated Crew Fortune Live stack and its interruptible voice flow.
   if(targetLanguage)localStorage.setItem("crew_fortune_spokenLanguage",targetLanguage);
   navigate("/fortune/live?from="+(kind==="reading"?"hub":kind));
  }
 }
 // Keep the Android embedded calculator/voice bridge, redirect ordinary Web guests to the sole Fortune home.
 if(!nativeHost)return <Navigate to="/fortune" replace/>;
 return <section className="section teacher-fortune-hub" data-native-host={nativeHost?"true":"false"} aria-label={english?"Fortune explanation":"命理陪聊"}>
  <div className="teacher-fortune-header">
   <button type="button" className="text-button" onClick={()=>phase==="home"?nativeHost?window.location.assign("crewteacher://fortune/back"):navigate("/teacher/practice"):setPhase("home")}>‹ {english?"Back":"返回"}</button>
   <span className="kicker">CREW FORTUNE · FRIEND EXPLAINER</span>
   <h1>{english?"Fortune with a friend":"朋友陪你聊命理"}</h1>
   <p>{english?"A Crew Friend explains your reading first; interrupt or ask anything naturally.":"Crew Friend 會先幫你解釋命盤重點，有問題隨時問，不是外語口說課。"}</p>
   <small>命理屬文化與自我探索，不代表確定的事件預測。</small>
  </div>
  {loading&&<div className="spa-loading" role="status">正在讀取你在這個裝置的命盤…</div>}
  {error&&<div className="spa-error" role="alert">{error}</div>}
  {!loading&&phase==="home"&&<>
   {readings.length>0&&<div className="teacher-fortune-card teacher-fortune-last">
    <span className="teacher-fortune-eyebrow">已找到你的命盤</span>
    <h2>{label(readings[0].mode)}</h2>
    <p>{readings[0].summary}</p>
    <small>{readings[0].createdAt?new Date(readings[0].createdAt).toLocaleDateString():"此裝置已儲存"} · 不需要重新填資料</small>
    <button type="button" className="btn teacher-fortune-primary" onClick={()=>start("reading",readings[0])}>
     讓朋友繼續講解 →
    </button>
    <button className="text-button" onClick={()=>openReading(readings[0])}>先查看命盤摘要</button>
    {readings.length>1&&<><button className="text-button" onClick={()=>setMoreHistory(x=>!x)}>
     {moreHistory?"收起其他命盤":"選擇其他已儲存命盤"}
    </button>{moreHistory&&<div className="teacher-fortune-history">
     {readings.slice(1,8).map(x=><button key={x.id} onClick={()=>start("reading",x)}>
       <strong>{label(x.mode)}</strong><span>{x.summary}</span>
     </button>)}
    </div>}</>}
   </div>}
   <div className="teacher-fortune-card">
    <span className="teacher-fortune-eyebrow">{readings.length?"想探索新的命盤？":"第一次使用"}</span>
    <h2>{readings.length?"重新建立命盤":"先建立你的命盤"}</h2>
    <p>依照選擇的命理系統輸入資料，計算完成就由 Crew Friend 幫你逐步講解。</p>
    <button type="button" className="btn secondary teacher-fortune-primary" onClick={beginNew}>
     {readings.length?"建立另一份命盤 →":"建立命盤 →"}
    </button>
   </div>
   <div className="teacher-fortune-card teacher-fortune-daily">
    <span className="teacher-fortune-eyebrow">不想輸入出生資料？</span>
    <h2>今日探索話題</h2>
    <p>{dailyFortuneTopic()}</p>
    <button type="button" className="btn secondary teacher-fortune-primary" onClick={()=>start("daily")}>
      開始 2～3 分鐘口說 →
    </button>
    <small>每日反思題目，不是根據出生資料計算的個人運勢。</small>
   </div>
   <button className="text-button teacher-fortune-culture" onClick={()=>start("culture")}>探索不同文化的命理說法 →</button>
   <p className="teacher-fortune-privacy">出生資料與命盤保留在這個裝置；只有你按「開始對話」，才會將精簡的命盤主題提供給 AI。Android App 與瀏覽器的資料不會自動同步。</p>
  </>}
  {!loading&&phase==="create"&&<div className="teacher-fortune-card teacher-fortune-form">
   <span className="teacher-fortune-eyebrow">STEP 1 · 命理類型</span>
   <h2>建立你的命盤</h2>
   <div className="teacher-fortune-modes">
     {MODES.map(m=><button key={m.id} type="button" className={mode===m.id?"selected":""}
      aria-pressed={mode===m.id} onClick={()=>{setMode(m.id);setError("")}}>
      <strong>{m.name}</strong><small>{m.hint}</small>
     </button>)}
   </div>
   <div className="teacher-fortune-form-fields">
     <label><span>出生日期</span><input type="date" className="field" value={profile.birthDate}
       onChange={e=>setProfile(x=>{const next={...x,birthDate:e.target.value};return {...next,utcOffset:resolveBirthOffset(next)}})}/></label>
     {mode!=="tarot"&&<label><span>出生時間</span><input type="time" className="field" value={profile.birthTime}
       onChange={e=>setProfile(x=>{const next={...x,birthTime:e.target.value};return {...next,utcOffset:resolveBirthOffset(next)}})}/></label>}
     {mode==="bazi"&&<label><span>命盤使用的性別分類</span><select className="field" value={profile.gender}
      onChange={e=>setProfile(x=>({...x,gender:e.target.value}))}>
      <option value="1">男</option><option value="0">女</option></select></label>}
     {mode==="vedic"&&<FortuneProfileTools mode={mode} profile={profile} onChange={setProfile}/>}
   </div>
   <div className="teacher-fortune-actions">
    <button type="button" className="btn teacher-fortune-primary" disabled={saving} onClick={createReading}>
      {saving?"正在計算…":"計算命盤 →"}
    </button>
    <button type="button" className="text-button" onClick={()=>setPhase("home")}>取消</button>
   </div>
   <p className="teacher-fortune-privacy">使用既有 Crew Fortune 的固定計算器；此步驟不呼叫 Gemini，也不需要先設定 API Key。</p>
  </div>}
  {!loading&&phase==="result"&&reading&&<div className="teacher-fortune-card teacher-fortune-result">
   <span className="teacher-fortune-eyebrow">STEP 2 · 你的命盤已準備好</span>
   <h2>{label(reading.mode)}</h2><p>{reading.summary}</p>
   <div className="teacher-fortune-focus">
     <span>你想從哪個主題開始？</span>
     <div>{FOCUS.map(f=><button key={f.id} className={focus===f.id?"selected":""}
       aria-pressed={focus===f.id} onClick={()=>setFocus(f.id)}>{f.name}</button>)}</div>
   </div>
   <div className="teacher-fortune-chapters">
     {displayed.map((chapter:FortuneChapter)=><article key={chapter.id}>
      <strong>{chapter.title}</strong><p>{chapter.text}</p>
     </article>)}
   </div>
   <button type="button" className="btn teacher-fortune-primary" onClick={()=>start("reading")}>讓朋友講解這份命盤 →</button>
   <small className="teacher-fortune-footnote">
     {nativeHost?"對話將切換至 Android 原生語音，由選定的 Crew Friend 講解命盤。":
       "朋友將用 "+targetLanguage+" 自然介紹命盤，你可以隨時插話。"}
   </small>
   <details className="teacher-fortune-full"><summary>繼續看完整命盤重點</summary>
    {chapters.filter(x=>!displayed.includes(x)).map(x=><article key={x.id}>
      <strong>{x.title}</strong><p>{x.text}</p>
    </article>)}
   </details>
   <button type="button" className="text-button" onClick={beginNew}>重新建立另一份命盤</button>
   {!nativeHost&&<Link to={"/fortune/reading?history="+encodeURIComponent(reading.id)} className="text-button">進入 Crew Fortune 完整分析 ↗</Link>}
  </div>}
 </section>;
}
