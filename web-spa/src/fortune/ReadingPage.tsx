import{useEffect,useRef,useState}from"react";import{trackUsageEvent}from"../analytics/usage";import{GeminiSetupNotice}from"../components/GeminiSetupNotice";import{useTranslation}from"react-i18next";import{Link,useNavigate,useSearchParams}from"react-router-dom";import{addHistory,ensureFortuneServices,geminiKey,setGeminiVerified,emitGeminiKeyChanged}from"../lib/runtime";import{BaZiTabs}from"./result/BaZiTabs";import{TarotTabs}from"./result/TarotTabs";import{VedicTabs}from"./result/VedicTabs";import{shareFortuneReading,formatFortuneShareDate}from"./shareCard";import{FortuneProfileTools}from"./ProfileTools";import{FortuneYearHighlights}from"./YearHighlights";import{FortuneReadingOverview}from"./ReadingOverview";import type{FortuneMode,FortuneProfile,FortuneReading}from"./types";import{buildReportPrompt}from"./report";import{computeCurrentPhase}from"./currentPhase";import{FortuneSummaryCard}from"./FortuneSummaryCard";import{FortuneFollowUp}from"./FortuneFollowUp";import{isCurrentRequest,formatFortuneLocalDate,auditAiReading}from"./aiReading";import{resolveBirthOffset}from"./birthPlaceSearch";import{UI_LOCALE_CATALOG}from"../i18n/localeCatalog";import"./result/depth.css";import{FortuneDailyStrip}from"./FortuneDailyStrip";import{FortuneIdentityRevealDialog}from"./FortuneIdentityRevealDialog";import{buildFortuneIdentity}from"./identity";import{identityArtworkUrl}from"./identityArtwork";

const AI_REPORT_CONFIG={maxOutputTokens:6500,timeoutMs:45000,requireComplete:true,temperature:.4,thinking:"low"} as const;
const copy:Record<FortuneMode,[string,string]>={bazi:["八字","看懂你的基本性格、做事方式，以及目前正走到哪一段。"],tarot:["塔羅生命靈數","從核心性格、人生主題與時間節奏，整理現在最值得看的重點。"],vedic:["印度星盤","從出生底盤、人生週期與目前行運，整理現在最值得看的重點。"]};
const EMPTY:FortuneProfile={birthDate:"",birthTime:"",gender:"1",city:"",latitude:"",longitude:"",utcOffset:"",timeZoneId:"",aiStyle:"normal"};

export function FortuneReadingPage(){
 const {t,i18n}=useTranslation("fortune");
 const activeRequest=useRef({id:null as string|null,seq:0});
 const[formError,setFormError]=useState("");
 const[identityOpen,setIdentityOpen]=useState(false);
 const[oneLine,setOneLine]=useState(""),[shareStatus,setShareStatus]=useState(""),[shareBusy,setShareBusy]=useState(false);
 const shareArtRef=useRef<HTMLImageElement|null>(null);
 const readingRef=useRef<FortuneReading|null>(null);
 const[revealId,setRevealId]=useState<string|null>(null),[aiRevealId,setAiRevealId]=useState<string|null>(null);
 useEffect(()=>{if(!revealId)return;const timer=window.setTimeout(()=>setRevealId(null),480);return()=>window.clearTimeout(timer)},[revealId]);
 useEffect(()=>{if(!aiRevealId)return;const timer=window.setTimeout(()=>setAiRevealId(null),380);return()=>window.clearTimeout(timer)},[aiRevealId]);
 const[params,setParams]=useSearchParams(),nav=useNavigate(),initial=(params.get("mode") as FortuneMode)||"bazi";
 const[mode,setModeState]=useState<FortuneMode>(copy[initial]?initial:"bazi"),[p,setP]=useState<FortuneProfile>(EMPTY),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[reading,setReading]=useState<FortuneReading|null>(null),[showInput,setShowInput]=useState(true),[loadError,setLoadError]=useState(""),[aiStatus,setAiStatus]=useState<"idle"|"loading"|"ready"|"error">("idle");
 useEffect(()=>{
  // Social crawlers use the server-side shell; these tags cover in-app SPA navigation.
  const image="https://www.3sssi.com/social/og/fortune-chibi-v1.png";
  const title="我算出了自己的命格身份！換你看看，你是哪一型？";
  const desc="Crew Fortune｜八字、塔羅生命靈數與印度星盤，看看你的命格身份是哪一型。";
  const fields:[string,string,string][]=[
   ["property","og:type","website"],["property","og:title",title],
   ["property","og:description",desc],["property","og:image",image],
   ["property","og:url","https://www.3sssi.com/fortune/reading"],
   ["name","twitter:card","summary_large_image"],
   ["name","twitter:title",title],["name","twitter:description",desc],["name","twitter:image",image]
  ];
  const restore:(()=>void)[]=[];
  for(const [attr,name,value] of fields){
   let element=document.head.querySelector<HTMLMetaElement>('meta['+attr+'="'+name+'"]');
   if(element){const old=element.content;element.content=value;restore.push(()=>{element!.content=old})}
   else{element=document.createElement("meta");element.setAttribute(attr,name);element.content=value;document.head.appendChild(element);const created=element;restore.push(()=>created.remove())}
  }
  return()=>{restore.reverse().forEach(fn=>fn())};
 },[]);
 useEffect(()=>{
  shareArtRef.current=null;setOneLine("");setShareStatus("");
  if(!reading)return;
  const identity=buildFortuneIdentity(reading.mode,reading.result,i18n.language);
  const src=identity?identityArtworkUrl(identity.id):null;
  if(!src)return;
  const art=new Image();let active=true;
  art.onload=()=>{if(active&&art.naturalWidth>0)shareArtRef.current=art};
  art.onerror=()=>{if(active)shareArtRef.current=null};
  art.src=src;
  if(art.complete&&art.naturalWidth>0)shareArtRef.current=art;
  return()=>{active=false;art.onload=null;art.onerror=null};
 },[reading?.id,reading?.mode,reading?.result,i18n.language]);
 async function shareCurrentReading(){
  if(!reading||shareBusy)return;
  setShareStatus("");setShareBusy(true);
  try{
   const outcome=await shareFortuneReading(reading,oneLine||reading.summary,shareArtRef.current);
   if(outcome!=="cancelled")setShareStatus(outcome==="shared"?"已開啟分享":"圖片已下載，可以傳給朋友");
  }catch{setShareStatus("分享失敗，請再試一次")}
  finally{setShareBusy(false)}
 }
 useEffect(()=>{void ensureFortuneServices().then(()=>{const saved=window.CrewFortuneProfile.load();setP(x=>({...x,...saved}));const historyId=params.get("history");if(historyId){const old=window.CrewFortuneProfile.get(historyId) as FortuneReading|null;if(old){activeRequest.current.id=old.id;activeRequest.current.seq++;setModeState(old.mode);setP(old.profile);readingRef.current=old;setReading(old);setIdentityOpen(false);setAiStatus(old.ai?"ready":"idle");setShowInput(false)}}setReady(true)}).catch(()=>setLoadError(t("reading.moduleError")))},[]);
 const setMode=(m:FortuneMode)=>{setFormError("");activeRequest.current.id=null;activeRequest.current.seq++;setModeState(m);setParams({mode:m});readingRef.current=null;setReading(null);setIdentityOpen(false);setAiStatus("idle");setShowInput(true)};
 const field=(k:keyof FortuneProfile)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>{setFormError("");const next={...p,[k]:e.target.value};setP(k==="birthDate"||k==="birthTime"||k==="timeZoneId"?{...next,utcOffset:resolveBirthOffset(next)}:next)};
 function validate(){if(!p.birthDate)return t("reading.birthdayRequired");if((mode==="bazi"||mode==="vedic")&&!p.birthTime)return t("reading.timeRequired");if(mode==="vedic"&&(!p.latitude||!p.longitude||!resolveBirthOffset(p)))return t("reading.locationRequired");return""}
 function calculate(profile:FortuneProfile=p){
  if(mode==="bazi")return window.CrewFortuneBaZi.calculate(profile.birthDate,profile.birthTime,Number(profile.gender),new Date());
  if(mode==="tarot")return window.CrewFortuneTarot.calculate(profile.birthDate,new Date());
  const base=window.CrewFortuneVedic.calculate(profile,new Date());return window.CrewFortuneVedicEnrich.enrich(base,profile,new Date());
 }
 async function interpret(item:FortuneReading){
  const seq=++activeRequest.current.seq,id=item.id;
  activeRequest.current.id=id;
  if(!geminiKey()||!window.CrewAI){setAiStatus("idle");return}
  setAiStatus("loading");
  const style=p.aiStyle==="strict"?"語氣嚴謹，清楚區分固定 facts 與主觀解讀。":p.aiStyle==="funny"?"可以輕鬆一點，但不要拿疾病、死亡、災難或重大損失開玩笑。":"白話、直接、有重點。";
  try{
   const today=new Date();
   const phase=computeCurrentPhase(item.mode,item.result,item.profile.birthDate,today);
   const lang=UI_LOCALE_CATALOG.find(x=>x.code===i18n.resolvedLanguage||x.code===i18n.language)?.label||"繁體中文";
   const prompt=buildReportPrompt(item.mode,item.result,style,{today:formatFortuneLocalDate(today),locale:lang,phase});
   let text=await window.CrewAI.call(prompt,{preferLive:false,...AI_REPORT_CONFIG});
   if(!isCurrentRequest(id,seq,activeRequest.current.id,activeRequest.current.seq))return;
   let audit=auditAiReading(text,item.result,item.mode);
   if(!audit.ok){
    // One bounded repair attempt. Never publish a malformed or ungrounded new report.
    const retryPrompt=prompt+"\n前次生成未符合報告規格，請重新輸出完整的八個標記段落；不同章節的分析必須獨立，干支只能引用固定計算資料。\n需修正："+audit.issues.join("；");
    text=await window.CrewAI.call(retryPrompt,{preferLive:false,...AI_REPORT_CONFIG,temperature:0.25});
    if(!isCurrentRequest(id,seq,activeRequest.current.id,activeRequest.current.seq))return;
    audit=auditAiReading(text,item.result,item.mode);
    if(!audit.ok)throw new Error("AI fortune reading failed quality checks: "+audit.issues.join("; "));
   }
   setGeminiVerified(true);emitGeminiKeyChanged();
   const updated={...(readingRef.current?.id===id?readingRef.current:item),ai:text};readingRef.current=updated;trackUsageEvent("fortune_ai_interpreted",item.mode);setReading(updated);setAiRevealId(updated.id);setAiStatus("ready");window.CrewFortuneProfile.addHistory(updated);addHistory("fortune",{id:"fortune-reading:"+item.id,historyId:item.id,surface:"reading",title:t("home."+item.mode),summary:item.summary,preview:text.slice(0,180)});localStorage.setItem("crew_fortune_live_context",JSON.stringify(updated));
  }catch{if(isCurrentRequest(id,seq,activeRequest.current.id,activeRequest.current.seq)){setAiStatus("error")}}
 }
 async function run(){
  if(!ready)return;const error=validate();if(error){setFormError(error);return}setFormError("");setBusy(true);const resolved={...p,utcOffset:resolveBirthOffset(p)};window.CrewFortuneProfile.save(resolved);
  try{
   const result=calculate(resolved);if(!result||typeof result!=="object")throw new Error("Invalid fortune calculation");
   const item:FortuneReading={id:"reading_"+Date.now(),mode,createdAt:new Date().toISOString(),profile:resolved,result,summary:t("home."+mode)+" · "+(result.fourPillars||result.birthCardDisplay||("Lagna "+result.lagnaSign))};
   activeRequest.current.id=item.id;activeRequest.current.seq++;trackUsageEvent("fortune_calculated",mode);setRevealId(item.id);readingRef.current=item;setReading(item);setIdentityOpen(true);setAiStatus(geminiKey()?"loading":"idle");setShowInput(false);window.CrewFortuneProfile.addHistory(item);addHistory("fortune",{id:"fortune-reading:"+item.id,historyId:item.id,surface:"reading",title:t("home."+mode),summary:item.summary,preview:"固定計算結果已完成。"});localStorage.setItem("crew_fortune_live_context",JSON.stringify(item));void interpret(item);
  }catch{setLoadError(t("reading.calcFailed"))}finally{setBusy(false)}
 }
 function ask(topic?:string){if(!reading)return;if(!geminiKey()){document.getElementById("fortune-ai-setup")?.scrollIntoView({behavior:"smooth",block:"center"});return}if(topic){const topics:Record<string,string>={overview:"整體底盤",personality:"性格與天賦",career:"事業與職涯",wealth:"財富與資源",relationships:"感情與人際",family:"家庭與生活",currentCycle:"人生階段",longTerm:"長期節奏",keyYears:"重要年份",advice:"如何使用解讀"};localStorage.setItem("crew_fortune_live_prompt","請先針對這份已計算命盤的「"+(topics[topic]||topic)+"」主題做白話講解，說明實際命盤依據及傳統上的意義，不編造事件或機率。")}localStorage.setItem("crew_fortune_live_context",JSON.stringify(reading));nav("/fortune/live?from=reading")}
 const teacherReady=Boolean(geminiKey());
 const teacherAction=<button type="button" className="fortune-teacher-primary-action" onClick={()=>ask()}>{teacherReady?t("reading.askTeacherAction"):t("reading.askTeacherSetup")} <span aria-hidden="true">→</span></button>;
 const Result=reading?.mode==="bazi"?BaZiTabs:reading?.mode==="tarot"?TarotTabs:VedicTabs;
 const identityAvailable=Boolean(reading&&buildFortuneIdentity(reading.mode,reading.result,i18n.language));
 const zh=/^zh(?:-|$)/i.test(i18n.language);
 return <><Link className="text-button" to="/fortune">‹ Crew Fortune</Link><section className="hero"><span className="kicker">Crew Fortune</span><h1>{t("home."+mode)}</h1><p>{t("reading.intro."+mode)}</p></section>
 {loadError&&<div className="spa-error" role="alert">{loadError}<button className="btn secondary" onClick={()=>window.location.reload()}>{t("reading.retry")}</button></div>}
 {showInput?<section className="fortune-input-page section"><div className="panel fortune-profile-form"><div className="section-head"><h2>{t("reading.yourProfile")}</h2><small>{t("reading.once")}</small></div><label className="label">{t("reading.mode")}</label><select className="field" value={mode} onChange={e=>setMode(e.target.value as FortuneMode)}><option value="bazi">{t("home.bazi")}</option><option value="tarot">{t("home.tarot")}</option><option value="vedic">{t("home.vedic")}</option></select><label className="label">{t("reading.birthday")}</label><input className="field" type="date" value={p.birthDate} onChange={field("birthDate")}/>{mode!=="tarot"&&<><label className="label">{t("reading.birthTime")}</label><input className="field" type="time" value={p.birthTime} onChange={field("birthTime")}/></>}{mode==="bazi"&&<><label className="label">{t("reading.gender")}</label><select className="field" value={p.gender} onChange={field("gender")}><option value="1">{t("reading.male")}</option><option value="0">{t("reading.female")}</option></select></>}{mode==="vedic"&&<><FortuneProfileTools mode={mode} profile={p} onChange={setP}/><details className="fortune-advanced-place"><summary>{t("reading.advancedBirth")}</summary><div className="two"><label><span className="label">Latitude</span><input className="field" value={p.latitude} onChange={field("latitude")}/></label><label><span className="label">Longitude</span><input className="field" value={p.longitude} onChange={field("longitude")}/></label></div><label className="label">{t("reading.timeZone")}</label><input className="field" value={p.timeZoneId} onChange={field("timeZoneId")} placeholder="Asia/Taipei"/><label className="label">{t("reading.offset")}</label><input className="field" value={p.utcOffset} onChange={field("utcOffset")}/></details></>}{mode!=="vedic"&&<FortuneProfileTools mode={mode} profile={p} onChange={setP}/>}<label className="label">{t("reading.aiStyle")}</label><select className="field" value={p.aiStyle} onChange={field("aiStyle")}><option value="normal">{t("reading.style.normal")}</option><option value="strict">{t("reading.style.strict")}</option><option value="funny">{t("reading.style.funny")}</option></select>{formError&&<div className="spa-error" role="alert">{formError}</div>}<div className="actions"><button className="btn" disabled={busy||!ready} onClick={()=>void run()}>{busy?t("reading.calculating"):t("reading.calculate")}</button></div></div></section>:
 <section className="fortune-result-page section" data-new-reveal={reading?.id===revealId?"true":"false"} data-ai-status={aiStatus} data-ai-new={reading?.id===aiRevealId?"true":"false"}><div className="fortune-result-header"><button className="btn secondary small" onClick={()=>{activeRequest.current.id=null;activeRequest.current.seq++;setRevealId(null);setIdentityOpen(false);setShowInput(true)}}>{t("reading.edit")}</button><div><span className="kicker">{t("home."+reading!.mode)}</span><h2>{reading!.summary.replace(/^[^·]+ · /,t("home."+reading!.mode)+" · ")}</h2><small>{formatFortuneShareDate(reading!.createdAt)}</small></div><div className="actions fortune-share-actions"><button className="btn secondary small" disabled={shareBusy} onClick={()=>void shareCurrentReading()}>{shareBusy?"準備圖片中…":t("reading.share")}</button>{shareStatus&&<span className="fortune-share-status" role="status">{shareStatus}</span>}</div></div><FortuneSummaryCard mode={reading!.mode} result={reading!.result} phase={computeCurrentPhase(reading!.mode,reading!.result,reading!.profile.birthDate,new Date())} ai={reading!.ai||""} loading={aiStatus==="loading"} onHeadline={setOneLine}/>{identityAvailable&&<div className="fortune-identity-entry"><div><span className="fortune-identity-entry-kicker">CREW FORTUNE</span><strong>${zh?"你的命格身份已揭曉":"Your fortune archetype is ready"}</strong></div><button className="btn fortune-identity-entry-button" type="button" onClick={()=>setIdentityOpen(true)}>${zh?"查看我的命格身份":"Reveal my archetype"}</button></div>}<FortuneDailyStrip reading={reading!}/><section className="fortune-teacher-invite" aria-label={t("reading.askTeacherTitle")}><div className="fortune-teacher-invite-copy"><span className="fortune-teacher-eyebrow">{t("reading.askTeacherEyebrow")}</span><h3>{t("reading.askTeacherTitle")}</h3><p>{t("reading.askTeacherDesc")}</p></div><div className="fortune-conversation-actions">{teacherAction}</div></section><FortuneReadingOverview mode={reading!.mode} result={reading!.result} phase={computeCurrentPhase(reading!.mode,reading!.result,reading!.profile.birthDate,new Date())} ai={reading!.ai||""} onAsk={id=>ask(id)}/><FortuneYearHighlights mode={reading!.mode} result={reading!.result} phase={computeCurrentPhase(reading!.mode,reading!.result,reading!.profile.birthDate,new Date())}/>
  {aiStatus==="loading"&&<div className="notice" role="status"><div><b>{t("reading.aiLoading")}</b><p>{t("reading.aiLoadingDesc")}</p></div></div>}
  {aiStatus==="error"&&<div className="spa-error" role="alert"><p>{t("reading.aiFailed")}</p><button className="btn secondary small" onClick={()=>void interpret(reading!)}>{t("reading.aiRetry")}</button></div>}
  {aiStatus==="idle"&&!reading?.ai&&(!geminiKey()?
   <div className="notice" id="fortune-ai-setup"><div><b>{t("reading.fixedDone")}</b><p>{t("reading.needKey")}</p><GeminiSetupNotice returnTo={"/fortune/reading?history="+encodeURIComponent(reading!.id)}/></div></div>:
   <div className="notice"><div><b>{t("reading.fixedDone")}</b><p>{t("reading.aiNotGenerated")}</p><button className="btn secondary small" onClick={()=>void interpret(reading!)}>{t("reading.generateAI")}</button></div></div>
  )}<Result result={reading!.result} ai={reading!.ai||""}/><FortuneFollowUp reading={reading!} isCurrent={()=>activeRequest.current.id===reading!.id} onSave={updated=>{const latest=readingRef.current;if(activeRequest.current.id!==updated.id||latest?.id!==updated.id)return;const merged={...latest,followups:updated.followups};readingRef.current=merged;setReading(merged);window.CrewFortuneProfile.addHistory(merged);localStorage.setItem("crew_fortune_live_context",JSON.stringify(merged));}}/><section className="fortune-teacher-followup"><div><h3>{t("reading.askMore")}</h3><p>{t("reading.askDesc")}</p></div><div className="fortune-conversation-actions">{teacherAction}</div></section></section>}
 {reading&&!showInput&&identityAvailable&&<FortuneIdentityRevealDialog reading={reading} open={identityOpen} onClose={()=>setIdentityOpen(false)}/>}
 </>}