import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {TIMELINE_IDS,timelinePerson,type TimelineCharacterId} from "./timelineCharacters";
import {TimelinePortrait} from "./TimelinePortrait";
import {LIFE_AGES,advanceLife,chooseLifeEvent,lifeEnding,lifeEventFor,lifeOutcome,newLifeRun,type LifeRun,type Traits} from "./lifeSimulation";
import {clearLifeRun,loadLifeRun,saveLifeRun} from "./lifeSimulationStorage";
import type {LifeTrait} from "./lifeEvents";
import "./lifeSimulation.css";

const traitLabels:Record<LifeTrait,[string,string]>={
 courage:["勇氣","Courage"],trust:["信任","Trust"],ambition:["野心","Ambition"],empathy:["同理心","Empathy"]
};
const traitIds:LifeTrait[]=["courage","trust","ambition","empathy"];
const description:Record<TimelineCharacterId,[string,string]>={
 mira:["喜歡觀察世界的攝影愛好者","A curious observer who loves photography"],
 ethan:["熱愛音樂、對未來充滿疑問","A musician with big questions about the future"],
 hana:["嚮往探索未知、珍惜生活細節","An explorer who notices life's small details"]
};
function freshSeed():number{
 if(typeof crypto!=="undefined"&&typeof crypto.getRandomValues==="function")return crypto.getRandomValues(new Uint32Array(1))[0];
 return Date.now()>>>0;
}
function TraitPanel({traits,en}:{traits:Traits;en:boolean}){
 return <section className="life-sim-traits" aria-label={en?"Character traits":"人物特質"}>
  <h3>{en?"Personality now":"目前人格"}</h3>
  <div className="life-sim-bars">{traitIds.map(k=><div className="life-sim-trait" key={k}>
   <div className="life-sim-stat-label"><span>{traitLabels[k][en?1:0]}</span><b>{traits[k]}</b></div>
   <div className="life-sim-track"><span style={{width:traits[k]+"%"}}/></div>
  </div>)}</div>
 </section>;
}
export function LifeSimulationPage(){
 const {i18n}=useTranslation("home");
 const en=!i18n.language.startsWith("zh");
 const l=(zh:string,english:string)=>en?english:zh;
 const [run,setRun]=useState<LifeRun|null>(null);
 const [loaded,setLoaded]=useState(false);
 const [saving,setSaving]=useState(false);
 const [storageWarning,setStorageWarning]=useState(false);
 const [choice,setChoice]=useState<0|1|2>(0);
 const [showHistory,setShowHistory]=useState(false);
 useEffect(()=>{
  let live=true;
  void loadLifeRun().then(saved=>{if(live)setRun(saved)}).catch(()=>{if(live)setStorageWarning(true)})
   .finally(()=>{if(live)setLoaded(true)});
  return()=>{live=false};
 },[]);
 const apply=async(next:LifeRun)=>{
  setRun(next);setSaving(true);setChoice(0);
  try{await saveLifeRun(next);}
  catch{setStorageWarning(true);}
  finally{setSaving(false);}
 };
 const start=(id:TimelineCharacterId,seed=freshSeed())=>void apply(newLifeRun(id,seed));
 const reset=async()=>{
  if(!window.confirm(l("確定刪除這段人生？這不會刪除原本 Timeline 的聊天記憶。","Delete this simulated life? Existing Timeline memories will remain.")))return;
  setSaving(true);
  try{await clearLifeRun();setRun(null);setStorageWarning(false);}
  catch{setStorageWarning(true);}
  finally{setSaving(false);}
 };
 const current=run&&run.phase!=="end"?lifeEventFor(run):null;
 const age=run?LIFE_AGES[run.step]:7;
 const person=run?timelinePerson(run.character):null;
 const last=run?.history.at(-1);
 return <main className="shell life-sim-page">
  <header className="life-sim-header">
   <Link to="/timeline" className="life-sim-back">← {l("回到人生時間線","Back to Timeline")}</Link>
   <div className="life-sim-kicker">CREW · LIFE LAB <span>V1</span></div>
   <h1>{l("人生實驗室","Life Lab")}</h1>
   <p>{l("做一個選擇，看它如何改變往後的人生。這是獨立的模擬遊戲，不會改動原本的角色故事。","Make a choice and see how it changes a fictional life. This separate simulation does not change the original character stories.")}</p>
  </header>
  {storageWarning&&<p className="life-sim-warning" role="status">{l("此裝置目前無法儲存進度，離開後可能會失去這段人生。","Storage is unavailable on this device; progress may be lost when you leave.")}</p>}
  {!loaded?<div className="life-sim-loading" role="status">{l("正在讀取人生…","Loading your story…")}</div>:!run?<>
   <section className="life-sim-selection">
    <h2>{l("今天想觀察誰的人生？","Whose life will you explore?")}</h2>
    <p>{l("每段人生有 12 個階段；同樣的起點，也可能因為你的決定走向不同方向。","Each life has 12 stages. Different choices can lead to different outcomes.")}</p>
    <div className="life-sim-character-grid">{TIMELINE_IDS.map(id=><article className="life-sim-character" key={id}>
     <TimelinePortrait characterId={id} age={25}/>
     <div><h3>{timelinePerson(id).name}</h3><p>{description[id][en?1:0]}</p></div>
     <button type="button" disabled={saving} onClick={()=>start(id)}>{l("開始人生","Start life")}</button>
    </article>)}</div>
    <p className="life-sim-caption">{l("免費離線事件模擬，不需麥克風、登入或 AI Key；對話功能後續才會加入。","Free local simulation; no microphone, login or AI key. Live dialogue is not part of this first version.")}</p>
   </section>
  </>:run.phase==="end"?<>
   <section className="life-sim-ending">
    <div className="life-sim-result-hero">
     <TimelinePortrait age={70} characterId={run.character} className="timeline-feature-photo life-sim-person-photo" priority/>
     <div className="life-sim-result-heading">
      <span className="life-sim-kicker">LIFE COMPLETE · 12 / 12</span>
      <h2>{person?.name} · 70 {l("歲","years")}</h2>
      <p>{lifeEnding(run,en)}</p>
     </div>
    </div>
    <TraitPanel traits={run.traits} en={en}/>
    <div className="life-sim-final-actions">
     <button disabled={saving} onClick={()=>start(run.character,run.seed)}>{l("重玩相同起點","Replay the same starting conditions")}</button>
     <button disabled={saving} className="life-sim-secondary" onClick={()=>start(run.character)}>{l("開始另一段人生","Try a different life")}</button>
    </div>
   </section>
   <section className="life-sim-journal"><h2>{l("這一生的 12 個決定","Twelve decisions in this life")}</h2>
    <ol>{run.history.map((item,index)=><li key={item.eventId+":"+index}>
     <b>{item.age} {l("歲","years")} · {(item.labelZh&&en?item.labelEn:item.labelZh)}</b>
     <small>{l("事件","Event")}：{lifeEventTitle(item.eventId,en)}</small>
    </li>)}</ol>
   </section>
   <button className="life-sim-delete" disabled={saving} onClick={()=>void reset()}>{l("刪除模擬存檔","Delete simulation save")}</button>
  </>:current?<>
   <div className="life-sim-progress">
    <div><strong>{person?.name} · {age} {l("歲","years")}</strong><span>{run.step+1} / {LIFE_AGES.length}</span></div>
    <div className="life-sim-progress-track"><span style={{width:((run.step+1)/LIFE_AGES.length*100)+"%"}}/></div>
   </div>
   <div className="life-sim-layout">
    <section className="life-sim-main">
     <div className="life-sim-person-stage">
      <TimelinePortrait age={age} characterId={run.character} className="timeline-feature-photo life-sim-person-photo" priority/>
      <div className="life-sim-stage-overlay"><span>{l("人生第","Chapter")} {run.step+1}</span><b>{person?.name}</b><small>{age} {l("歲","years")}</small></div>
     </div>
     <div className="life-sim-event">
      <span className="life-sim-kicker">{run.phase==="event"?l("人生事件 · 重要抉擇","LIFE EVENT · A DECISION"):l("人生事件 · 結果","LIFE EVENT · OUTCOME")}</span>
      <h2>{en?current.title.en:current.title.zh}</h2>
      <p>{en?current.story.en:current.story.zh}</p>
      {run.phase==="event"?<>
       <h3>{l("這次你要怎麼做？","What will you do?")}</h3>
       <div className="life-sim-choices" role="group" aria-label={l("選擇","Your choice")}>
        {current.choices.map((option,i)=><button type="button" key={i} className={choice===i?"selected":""} aria-pressed={choice===i} onClick={()=>setChoice(i as 0|1|2)}>
         <span>{en?option.en:option.zh}</span><span aria-hidden="true">{choice===i?"●":"○"}</span>
        </button>)}
       </div>
       <button className="life-sim-primary" disabled={saving} onClick={()=>void apply(chooseLifeEvent(run,choice))}>{l("確認決定","Confirm choice")}</button>
      </>:<>
       <div className="life-sim-consequence" role="status">
        <b>{l("你決定了","You chose")}</b>
        <p>{en?last?.labelEn:last?.labelZh}</p>
        <p>{lifeOutcome(run,en)}</p>
        <small>{l("後續事件會參考現在的人格狀態；不保證單一選擇能決定未來。","Later events use the current personality state; one choice never guarantees an outcome.")}</small>
       </div>
       <button className="life-sim-primary" disabled={saving} onClick={()=>void apply(advanceLife(run))}>{run.step===LIFE_AGES.length-1?l("查看這一生的結局","See the ending"):l("繼續下一個人生階段","Continue to the next stage")} →</button>
      </>}
     </div>
    </section>
    <aside className="life-sim-sidebar">
     <TraitPanel traits={run.traits} en={en}/>
     <section className="life-sim-aside-card">
      <h3>{l("人生回音","Echoes from the past")}</h3>
      {run.history.length===0?<p>{l("你的第一個選擇，會從這裡開始被記住。","Your first choice will appear here.")}</p>:
       <p>{l("你在","At age ")} {run.history.at(-1)?.age} {l("歲選擇了：","you chose:")} {en?run.history.at(-1)?.labelEn:run.history.at(-1)?.labelZh}</p>}
      <button className="life-sim-journal-toggle" onClick={()=>setShowHistory(v=>!v)} aria-expanded={showHistory}>
       {showHistory?l("收起紀錄","Hide history"):l("查看走過的決定","View decisions")}
      </button>
      {showHistory&&<ol className="life-sim-mini-history">{run.history.map((item,i)=><li key={i}>{item.age} {l("歲","years")} · {en?item.labelEn:item.labelZh}</li>)}</ol>}
     </section>
     <section className="life-sim-aside-card">
      <h3>{l("這個版本的規則","How this version works")}</h3>
      <p>{l("事件由固定規則與亂數種子選出；不會自動消耗 AI 額度。不同的選擇會改變下一階段的事件權重。","Rules and a saved seed select events. No AI credits are spent. Choices change future event weights.")}</p>
     </section>
     <button className="life-sim-delete" disabled={saving} onClick={()=>void reset()}>{l("刪除這段人生，重新選角色","Delete run and choose another character")}</button>
    </aside>
   </div>
  </>:null}
 </main>;
}
function lifeEventTitle(id:string,en:boolean):string{
 // History renders titles from the approved, finite event catalog, never generated dialogue.
 const catalog=EVENT_TITLES.find(item=>item.id===id);
 return catalog?(en?catalog.en:catalog.zh):id;
}
import {LIFE_EVENTS as EVENT_TITLES} from "./lifeEvents";
