import {useEffect,useMemo,useRef,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {geminiKey,ensureFortuneServices} from "../lib/runtime";
import {useClientReady} from "../lib/useClientReady";
import {useRouteNamespace} from "../i18n/useRouteNamespace";
import {buildDailyCard,dailyProfileHash,localDateKey,type DailyCard,type DailyKind} from "./dailyCard";
import {DAILY_COPY_REVISION,readCachedDaily,readDailyKindChoice,resolveDailyKind,saveDailyKind,saveCachedDaily,readDailyCompletionStreak,findExistingAiForKind,isDailyCompleted,completeDailyExploration,recentDailyExplorations} from "./dailyStore";
import {generateDailyAi} from "./dailyAi";
import {FortuneZoeReading} from "./FortuneZoeReading";
import {shareDailyCard} from "./shareCard";
import {readDailyProfiles,chooseDailyProfile} from "./dailyProfileSelection";
import type {FortuneProfile} from "./types";
import "./dailyCard.css";

function getProfile(chartHash?:string):Partial<FortuneProfile>|null{
 try{const charts=readDailyProfiles();return (chooseDailyProfile(charts,chartHash)||chooseDailyProfile(charts))?.profile||null;}
 catch{return null;}
}
function useLocalDay(){
 const [date,setDate]=useState(()=>localDateKey());
 useEffect(()=>{
  const check=()=>{if(document.visibilityState==="visible")setDate(localDateKey());};
  const interval=window.setInterval(check,60000);
  document.addEventListener("visibilitychange",check);
  window.addEventListener("focus",check);
  return ()=>{window.clearInterval(interval);document.removeEventListener("visibilitychange",check);window.removeEventListener("focus",check);};
 },[]);
 return date;
}
export function FortuneDailyCard({chartHash}:{chartHash?:string}={}){
 const {t,i18n}=useTranslation("fortuneDaily");
 const ready=useRouteNamespace("fortuneDaily");
 // Keep the SSG and first hydration pass identical, regardless of saved profile.
 const clientReady=useClientReady();
 const date=useLocalDay();
 const [searchParams,setSearchParams]=useSearchParams();
 const [profile,setProfile]=useState<Partial<FortuneProfile>|null>(()=>getProfile(chartHash));
 const [selected,setSelected]=useState<DailyKind>(()=>{
  if(typeof window!=="undefined"){
   const kind=new URLSearchParams(window.location.search).get("kind");
   if(kind==="numerology"||kind==="bazi")return kind;
  }
  const chart=chooseDailyProfile(readDailyProfiles(),chartHash);
  return resolveDailyKind(chart?.mode||"tarot",chart?.profile.birthTime,readDailyKindChoice());
 });
 const [engineReady,setEngineReady]=useState(false);
 const [loadFailure,setLoadFailure]=useState(false);
 const [aiBusy,setAiBusy]=useState(false);
 const [aiError,setAiError]=useState<""|"quota"|"error"|"used">("");
 const [aiText,setAiText]=useState("");
 const [streak,setStreak]=useState(()=>readDailyCompletionStreak());
 const [refresh,setRefresh]=useState(0);
 const [revealed,setRevealed]=useState(false);
 const [completed,setCompleted]=useState(false);
 const frontButton=useRef<HTMLButtonElement|null>(null);
 const finishButton=useRef<HTMLButtonElement|null>(null);
 const backButton=useRef<HTMLButtonElement|null>(null);
 const hasFlipped=useRef(false);
 const active=useRef("");
 const profileHash=useMemo(()=>profile?dailyProfileHash(profile):"",[profile]);
 const kind:DailyKind=selected==="bazi"&&profile?.birthTime?"bazi":"numerology";
 const locale=i18n.resolvedLanguage||i18n.language;
 useEffect(()=>{
  const update=()=>{setProfile(getProfile(chartHash));setRefresh(x=>x+1);};
  update();
  window.addEventListener("focus",update);
  window.addEventListener("storage",update);
  return()=>{window.removeEventListener("focus",update);window.removeEventListener("storage",update);};
 },[chartHash]);
 useEffect(()=>{
  if((kind!=="bazi"&&!/^zh/i.test(locale))||(kind==="bazi"&&!profile?.birthTime))return;
  let cancelled=false;
  setEngineReady(Boolean((window as Window & {Solar?:unknown}).Solar&&(kind!=="bazi"||window.CrewFortuneBaZi)));
  void ensureFortuneServices().then(()=>{if(!cancelled){setEngineReady(true);setLoadFailure(false);}}).catch(()=>{if(!cancelled){setEngineReady(Boolean((window as Window & {Solar?:unknown}).Solar));setLoadFailure(true);}});
  return ()=>{cancelled=true;};
 },[kind,profileHash,locale,refresh]);
 const card=useMemo(()=>{
  if(!clientReady||!ready||!profile?.birthDate)return null;
  const cached=readCachedDaily(date,kind,profileHash);
  // Cache is a stable card, but strings must always match the active language.
  if(cached?.card&&cached.card.kind===kind&&cached.card.date===date&&
     cached.locale===locale&&cached.copyRevision===DAILY_COPY_REVISION&&cached.card.artSrc&&(!/^zh/i.test(locale)||!!cached.card.almanac))return cached.card;
  const result=buildDailyCard({kind,profile,localDate:date,lang:locale});
  if("status" in result)return result;
  saveCachedDaily(result,profileHash,undefined,locale);
  return result;
 },[clientReady,ready,profileHash,profile,kind,date,locale,engineReady,refresh]);
 const activeKey=date+":"+kind+":"+profileHash;
 active.current=activeKey;
 useEffect(()=>{
  setAiError("");setAiBusy(false);setRevealed(false);
  setCompleted(Boolean(profileHash&&isDailyCompleted(date,kind,profileHash)));
  setStreak(readDailyCompletionStreak());
  setAiText(profileHash?readCachedDaily(date,kind,profileHash)?.ai||"":"");
 },[activeKey,locale]);
 useEffect(()=>{
  if(!clientReady||!ready||!profile?.birthDate)return;
  if(revealed){
   hasFlipped.current=true;
   (completed?backButton:finishButton).current?.focus();
  }else if(hasFlipped.current)frontButton.current?.focus();
 },[clientReady,ready,Boolean(profile?.birthDate),revealed,completed]);
 if(!clientReady||!ready)return <section className="fortune-daily panel" aria-busy="true"><p>{t("loading")}</p></section>;
 if(!profile?.birthDate)return <section className="fortune-daily panel">
  <span className="kicker">CREW FORTUNE · {t("today")}</span><h2>{t("emptyTitle")}</h2>
  <p>{t("emptyDescription")}</p><Link className="btn" to="/fortune/reading?mode=tarot">{t("addBirthday")} →</Link>
 </section>;
 function changeKind(next:DailyKind){
  if(next==="bazi"&&!profile?.birthTime)return;
  setSelected(saveDailyKind(next));setAiError("");
  // Keep the visible tab in the URL, so refreshing a home deep link preserves a manual switch.
  const updated=new URLSearchParams(searchParams);updated.set("kind",next);
  setSearchParams(updated,{replace:true});
 }
 async function useGemini(current:DailyCard){
  if(aiBusy||!window.CrewAI?.call||!geminiKey())return;
  const token=activeKey;setAiBusy(true);setAiError("");
  const result=await generateDailyAi(current,profileHash,locale,(prompt,options)=>window.CrewAI!.call(prompt,options));
  if(active.current!==token)return;
  setAiBusy(false);
  if(result.status==="ready")setAiText(result.text);
  else setAiError(result.status);
 }
 const full=card&&!("status" in card)?card:null;
 const unavailable=card&&"status" in card?card:null;
 const seen=full?findExistingAiForKind(date,kind):null;
 const aiUsedOther=Boolean(seen&&seen.profileHash!==profileHash);

 const days=profileHash?recentDailyExplorations(date,kind,profileHash):[];
 function finishToday(){
  if(!full||completed)return;
  setStreak(completeDailyExploration(date,kind,profileHash));
  setCompleted(true);
 }
 return <section className="fortune-daily panel" aria-label={t("today")} data-daily-kind={kind}>
  <div className="fortune-daily-top">
   <div><span className="kicker">CREW FORTUNE · {t("today")}</span><small>{date}</small></div>
   {streak.streak>0&&<span className="fortune-daily-streak">✦ {t("streak",{count:streak.streak})}</span>}
  </div>
  <div className="fortune-daily-kind" role="group" aria-label={t("selectKind")}>
   <button type="button" className={kind==="numerology"?"active":""} aria-pressed={kind==="numerology"} onClick={()=>changeKind("numerology")}>{t("numerology")}</button>
   <button type="button" className={kind==="bazi"?"active":""} aria-pressed={kind==="bazi"} disabled={!profile.birthTime} title={!profile.birthTime?t("timeRequired"):undefined} onClick={()=>changeKind("bazi")}>{t("bazi")}</button>
  </div>
  {!profile.birthTime&&<small className="fortune-daily-help">{t("timeRequired")}</small>}
  {full?<>
   <div className="fortune-daily-scene">
    <div className={"fortune-daily-flipper"+(revealed?" flipped":"")}>
     <div className="fortune-daily-face fortune-daily-face-front" aria-hidden={revealed}>
      <div className="fortune-daily-stars" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span></div>
      <div className="fortune-daily-front-main">
       <div className="fortune-daily-portrait"><span aria-hidden="true">✦</span>
        {full.artSrc&&<img src={full.artSrc} alt="" loading="lazy" onError={e=>{e.currentTarget.hidden=true}}/>}
       </div>
       <div className="fortune-daily-intro"><span className="fortune-daily-eyebrow">{t("exploreLabel")}</span><h2>{full.headline}</h2><p>{full.theme}</p></div>
      </div>
      <button ref={frontButton} type="button" className="fortune-daily-reveal" tabIndex={revealed?-1:0} onClick={()=>setRevealed(true)}>{t("flipCard")} ✦</button>
     </div>
     <div className={"fortune-daily-face fortune-daily-face-back"+(completed?" completed":"")} aria-hidden={!revealed}>
      <div className="fortune-daily-confetti" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span><span>✧</span></div>
      <span className="fortune-daily-eyebrow">{t("todayAction")}</span>
      <h2>{full.do[0]}</h2><p>{t("avoidLabel")} · {full.avoid}</p>
      <button ref={finishButton} type="button" className="fortune-daily-reveal" tabIndex={revealed?0:-1} disabled={completed} onClick={finishToday}>{completed?"✓ "+t("completed"):t("markComplete")+" ✦"}</button>
      <button ref={backButton} type="button" className="fortune-daily-back-button" tabIndex={revealed?0:-1} onClick={()=>setRevealed(false)}>{t("flipBack")}</button>
     </div>
    </div>
   </div>
   {/^[a-f0-9]{64}$/.test(profileHash)&&<Link className="fortune-daily-zoe" to={"/fortune?daily=1&chart="+profileHash+"&kind="+kind+"&zoe=1"}>{t("dailyQuote.chatRead",{ns:"home"})}</Link>}
   {/^[a-f0-9]{64}$/.test(profileHash)&&searchParams.get("zoe")==="1"&&<FortuneZoeReading key={date+":"+kind+":"+profileHash+":"+locale} card={full} hash={profileHash} locale={locale} scrollOnOpen/>}
   <div className="fortune-daily-week"><span>{t("recentDays")}</span>
    <div className="fortune-daily-week-dots">{days.map(item=><span key={item.date} title={item.date} className={item.completed?"done":""} aria-label={item.date+" · "+t(item.completed?"completed":"notCompleted")}>{item.completed?"✦":"·"}</span>)}</div>
   </div>
   {revealed&&<div className="fortune-daily-extras">
    <details className="fortune-daily-details"><summary>{t("moreDetails")}</summary>
     <div className="fortune-daily-advice"><div><strong>{t("doLabel")}</strong><ul>{full.do.map((x,i)=><li key={i}>{x}</li>)}</ul></div><div><strong>{t("avoidLabel")}</strong><p>{full.avoid}</p></div></div>
     <div className="fortune-daily-color"><span className="fortune-daily-swatch" style={{backgroundColor:full.luckyColor.hex}} aria-hidden="true"/><div><small>{t("luckyColor")}</small><strong>{full.luckyColor.name} · {full.luckyColor.element}</strong></div></div>
     <details className="fortune-daily-basis"><summary>{t("basisLabel")}</summary><ul>{full.basis.map((x,i)=><li key={i}>{x}</li>)}</ul></details>
     {/^zh/i.test(locale)&&full.almanac&&<div className="fortune-daily-almanac"><strong>{t("almanacLabel")}</strong><p>宜：{full.almanac.yi.join("、")||"—"}</p><p>忌：{full.almanac.ji.join("、")||"—"}</p>{full.almanac.chong&&<p>沖：{full.almanac.chong}</p>}</div>}
     <p className="fortune-daily-note">{t("disclaimer")}</p>
    </details>
    {aiText&&<div className="fortune-daily-ai-result" role="status">{Array.from(aiText).slice(0,120).join("")}</div>}
    {aiError&&<p role="alert" className="fortune-daily-help">{t("ai."+aiError)}</p>}
    {loadFailure&&<p role="alert" className="fortune-daily-help">{t("loadFailed")}</p>}
    <div className="fortune-daily-actions">
     <button className="btn secondary small" type="button" onClick={()=>void shareDailyCard(full,{doLabel:t("doLabel"),avoidLabel:t("avoidLabel"),luckyColor:t("luckyColor"),disclaimer:t("disclaimer"),kindLabel:t(full.kind)})}>{t("share")}</button>
     {!!geminiKey()&&<button className="btn secondary small" type="button" disabled={aiBusy||Boolean(aiText)||aiUsedOther} onClick={()=>void useGemini(full)}>{aiBusy?t("ai.loading"):aiText||aiUsedOther?t("ai.used"):t("ai.generate")}</button>}
     <Link className="btn small" to={full.deepLink}>{t("fullReading")} →</Link>
    </div>
   </div>}
  </>:<p role="status" className="fortune-daily-help">{unavailable?t(unavailable.reason==="birthTime"?"timeRequired":unavailable.reason==="birthDate"?"addBirthday":"loadFailed"):t("loading")}</p>}
 </section>;
}
