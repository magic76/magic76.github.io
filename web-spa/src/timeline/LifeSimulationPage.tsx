import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {TextChatPanel} from "../live/TextChatPanel";
import {TIMELINE_IDS,timelinePerson,type TimelineCharacterId} from "./timelineCharacters";
import {TimelinePortrait} from "./TimelinePortrait";
import {LIFE_AGES,advanceLife,chooseLifeEvent,forkLifeRun,lifeEnding,lifeEventFor,lifeEventTitleById,lifeOutcome,newLifeRun,type LifeRun,type Traits} from "./lifeSimulation";
import {clearLifeRun,clearLifeComparison,loadLifeRun,loadLifeComparison,saveLifeFork,saveLifeRun} from "./lifeSimulationStorage";
import {lifeCausalEcho,lifeEndingCards} from "./lifeNarrative";
import {lifeLabDialoguePrompt} from "./lifeDialogue";
import type {LifeTrait} from "./lifeEvents";
import "./lifeSimulation.css";

const traitLabels:Record<LifeTrait,[string,string]>={
 courage:["勇氣","Courage"],trust:["信任","Trust"],ambition:["野心","Ambition"],empathy:["同理心","Empathy"]
};
const traitIds:LifeTrait[]=["courage","trust","ambition","empathy"];
const descriptions:Record<TimelineCharacterId,[string,string]>={
 mira:["從攝影與星空出發，看看她如何尋找自己的方向。","Follow her changing path between photography and the stars."],
 ethan:["熱愛聲音的男孩，會選擇理想、工作，還是身邊的人？","Will a young sound maker choose dreams, security, or the people he loves?"],
 hana:["喜歡走進陌生街道的女孩，想留下哪些故事？","Which stories will a curious traveller choose to preserve?"]
};
const FORK_AGES=[16,25,40] as const;
function freshSeed():number{
 if(typeof crypto!=="undefined"&&typeof crypto.getRandomValues==="function")
  return crypto.getRandomValues(new Uint32Array(1))[0];
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
function Journal({run,en}:{run:LifeRun;en:boolean}){
 return <ol className="life-sim-journal-list">{run.history.map((item,i)=><li key={i}>
  <strong>{item.age} {en?"years":"歲"} · {lifeEventTitleById(item.eventId,en)}</strong>
  <span>{en?item.labelEn:item.labelZh}</span>
 </li>)}</ol>;
}
function CompareLives({run,original,en}:{run:LifeRun;original:LifeRun;en:boolean}){
 const l=(zh:string,english:string)=>en?english:zh;
 const originalCards=lifeEndingCards(original,en),newCards=lifeEndingCards(run,en);
 const diffs=run.history.filter((item,i)=>item.eventId!==original.history[i]?.eventId||item.choice!==original.history[i]?.choice);
 return <section className="life-sim-compare" aria-label={l("平行人生比較","Parallel lives comparison")}>
  <div className="life-sim-compare-top">
   <h2>{l("平行人生：同一個起點，兩種結果","Parallel lives: one starting point, two outcomes")}</h2>
   <p>{l("出生條件和種子相同。只有選擇、後續事件及其結果不同。","The same character and starting seed; only decisions and downstream events differ.")}</p>
   <strong>{l(`共有 ${diffs.length} 個階段出現不同事件或選擇`,`${diffs.length} stages changed`)}</strong>
  </div>
  <div className="life-sim-compare-columns">
   {[{life:original,title:l("原本的人生","Original life")},{life:run,title:l("改寫的人生","Altered life")}].map(({life,title})=>
    <article key={title} className="life-sim-compare-column">
     <h3>{title}</h3>
     <div className="life-sim-compare-traits">{traitIds.map(k=><div key={k}>
      <span>{traitLabels[k][en?1:0]}</span><b>{life.traits[k]}</b>
     </div>)}</div>
     <div className="life-sim-compare-pivots">{FORK_AGES.map(age=>{
      const item=life.history.find(d=>d.age===age);
      return <p key={age}><b>{age} {l("歲","years")}</b> {item?(en?item.labelEn:item.labelZh):l("尚未經歷","Not reached")}</p>;
     })}</div>
     {(life===original?originalCards:newCards).map(card=><div className="life-sim-compare-card" key={card.id}>
      <b>{card.heading}</b><p>{card.text}</p>
     </div>)}
    </article>)}
  </div>
 </section>;
}
export function LifeSimulationPage(){
 const {i18n}=useTranslation("home");
 const en=!i18n.language.startsWith("zh");
 const l=(zh:string,english:string)=>en?english:zh;
 const [run,setRun]=useState<LifeRun|null>(null);
 const [original,setOriginal]=useState<LifeRun|null>(null);
 const [loaded,setLoaded]=useState(false);
 const [saving,setSaving]=useState(false);
 const [storageWarning,setStorageWarning]=useState(false);
 const [notice,setNotice]=useState("");
 const [choice,setChoice]=useState<0|1|2>(0);
 const [forkAge,setForkAge]=useState<number>(16);
 const [showHistory,setShowHistory]=useState(false);
 const [showCompare,setShowCompare]=useState(false);
 const [showChat,setShowChat]=useState(false);
 useEffect(()=>{
  let active=true;
  void Promise.all([loadLifeRun(),loadLifeComparison()]).then(([saved,comparison])=>{
   if(active){setRun(saved);setOriginal(comparison);}
  }).catch(()=>{if(active)setStorageWarning(true)}).finally(()=>{if(active)setLoaded(true)});
  return()=>{active=false};
 },[]);
 const apply=async(next:LifeRun)=>{
  setSaving(true);setRun(next);setChoice(0);setShowChat(false);setNotice("");
  try{await saveLifeRun(next);}
  catch{setStorageWarning(true);}
  finally{setSaving(false);}
 };
 const start=async(id:TimelineCharacterId,seed=freshSeed())=>{
  if(saving)return;
  setSaving(true);setOriginal(null);setShowCompare(false);setShowChat(false);
  try{await clearLifeComparison();}
  catch{setStorageWarning(true);}
  await apply(newLifeRun(id,seed));
 };
 const reset=async()=>{
  if(saving||!window.confirm(l("確定刪除這段人生與平行比較？這不會刪除原本 Timeline 的聊天記憶。","Delete this simulated life and comparison? Existing Timeline memories remain.")))return;
  setSaving(true);
  try{await clearLifeRun();setRun(null);setOriginal(null);setShowCompare(false);setShowChat(false);setStorageWarning(false);setNotice("");}
  catch{setStorageWarning(true);setNotice(l("儲存空間拒絕刪除，請確認瀏覽器設定。","Browser storage refused the deletion."));}
  finally{setSaving(false);}
 };
 const fork=async()=>{
  if(!run||saving)return;
  try{
   const alternate=forkLifeRun(run,forkAge);
   setSaving(true);
   try{await saveLifeFork(run,alternate);}
   catch{setStorageWarning(true);}
   setOriginal(run);setRun(alternate);setChoice(0);setShowCompare(false);setShowChat(false);
   setNotice(l(`保留原本的人生；現在回到 ${forkAge} 歲改寫命運。`,`Original life saved. Replaying from age ${forkAge}.`));
  }catch(error){
   setNotice(l("這段舊版人生無法從這一年重播，請改選較早的階段或開始新人生。","This older run cannot be replayed from that stage. Choose an earlier stage or start a new life."));
  }finally{setSaving(false);}
 };
 const current=run&&run.phase!=="end"?lifeEventFor(run):null;
 const age=run?LIFE_AGES[run.step]:7;
 const person=run?timelinePerson(run.character):null;
 const last=run?.history.at(-1);
 const echo=run&&current?lifeCausalEcho(run,age,en):null;
 const chatVisible=!!run&&(run.phase==="result"||run.phase==="end");
 return <main className="shell life-sim-page">
  <header className="life-sim-header">
   <Link to="/timeline" className="life-sim-back">← {l("回到人生時間線","Back to Timeline")}</Link>
   <div className="life-sim-kicker">CREW · LIFE LAB <span>V2</span></div>
   <h1>{l("人生實驗室","Life Lab")}</h1>
   <Link to="/timeline/observe" className="life-sim-observatory-entry">{l("✦ 新玩法試玩｜三人命運觀察室：不插手也會發生事","✦ V3 Preview · The Life Observatory: watch three lives unfold")} →</Link>
   <p>{l("同一個起點，走出不同人生。你的選擇會改變往後的事件；完成後，還能回到某一年試試另一條路。","One beginning, many lives. Choices shape later chapters; return to a turning point to explore another path.")}</p>
  </header>
  {storageWarning&&<p className="life-sim-warning" role="status">{l("目前無法可靠儲存：可以繼續玩，但離開後可能會失去進度。","Storage is unavailable: you can continue, but progress may be lost.")}</p>}
  {notice&&<p className="life-sim-notice" role="status">{notice}</p>}
  {!loaded?<div className="life-sim-loading" role="status">{l("正在讀取人生…","Loading your story…")}</div>:!run?<>
   <section className="life-sim-selection">
    <h2>{l("今天想體驗誰的人生？","Whose life will you explore?")}</h2>
    <p>{l("每個角色有獨立的關鍵劇情。先選人，再用自己的決定走過 12 個人生階段。","Each character has unique turning points. Choose one, then play through 12 life stages.")}</p>
    <div className="life-sim-character-grid">{TIMELINE_IDS.map(id=><article className="life-sim-character" key={id}>
     <TimelinePortrait characterId={id} age={25}/>
     <div><h3>{timelinePerson(id).name}</h3><p>{descriptions[id][en?1:0]}</p></div>
     <button type="button" disabled={saving} onClick={()=>void start(id)}>{l("開始人生","Start life")}</button>
    </article>)}</div>
    <p className="life-sim-caption">{l("事件模擬免費且不消耗 AI 額度。角色對話是獨立選用功能，會使用現有 Gemini Key 或免費聊天額度。","The simulation itself is free and offline. Optional Gemini dialogue uses your existing key or available guest chat allowance.")}</p>
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
    <div className="life-sim-ending-grid">{lifeEndingCards(run,en).map(card=><article className="life-sim-ending-card" key={card.id}>
     <span>{card.sourceAge} {l("歲的選擇","years")}</span><h3>{card.heading}</h3><p>{card.text}</p>
    </article>)}</div>
    <div className="life-sim-fork-controls">
     <h3>{l("回到哪一年，試試不同選擇？","Where would you change the story?")}</h3>
     <div className="life-sim-fork-row">
      <label className="life-sim-fork-label">{l("改寫的年齡","Fork age")}
       <select value={forkAge} onChange={event=>setForkAge(Number(event.target.value))}>
        {FORK_AGES.map(a=><option key={a} value={a}>{a} {l("歲","years")}</option>)}
       </select>
      </label>
      <button className="life-sim-primary" disabled={saving} onClick={()=>void fork()}>{l("保留這段人生，從這裡改寫","Save this life and rewrite from here")}</button>
     </div>
    </div>
    <div className="life-sim-final-actions">
     <button disabled={saving} onClick={()=>void start(run.character,run.seed)}>{l("整段重玩相同起點","Restart from the same seed")}</button>
     <button disabled={saving} className="life-sim-secondary" onClick={()=>void start(run.character)}>{l("開始全新人生","Start a new life")}</button>
    </div>
   </section>
   {original&&original.phase==="end"&&<div className="life-sim-compare-actions">
    <button type="button" onClick={()=>setShowCompare(v=>!v)} aria-expanded={showCompare} className="life-sim-secondary">
     {showCompare?l("收起平行人生比較","Hide comparison"):l("比較兩條人生的選擇與結局","Compare both lives")}
    </button>
   </div>}
   {original&&original.phase==="end"&&showCompare&&<CompareLives run={run} original={original} en={en}/>}
   <section className="life-sim-journal"><h2>{l("這一生的 12 個決定","Twelve decisions in this life")}</h2><Journal run={run} en={en}/></section>
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
      {echo&&<p className="life-sim-echo" role="note">{echo}</p>}
      <p>{en?current.story.en:current.story.zh}</p>
      {run.phase==="event"?<>
       <h3>{l("這次你要怎麼做？","What will you do?")}</h3>
       <div className="life-sim-choices" role="group" aria-label={l("選擇","Your choice")}>
        {current.choices.map((option,i)=><button type="button" key={i} disabled={saving} className={choice===i?"selected":""} aria-pressed={choice===i} onClick={()=>setChoice(i as 0|1|2)}>
         <span>{en?option.en:option.zh}</span><span aria-hidden="true">{choice===i?"●":"○"}</span>
        </button>)}
       </div>
       <button className="life-sim-primary" disabled={saving} onClick={()=>void apply(chooseLifeEvent(run,choice))}>{l("確認決定","Confirm choice")}</button>
      </>:<>
       <div className="life-sim-consequence" role="status">
        <b>{l("你決定了","You chose")}</b>
        <p>{en?last?.labelEn:last?.labelZh}</p>
        <p>{lifeOutcome(run,en)}</p>
        <small>{l("這次事件已寫入人生紀錄，後續事件會受到影響。","This event is recorded and can affect later chapters.")}</small>
       </div>
       <button className="life-sim-primary" disabled={saving} onClick={()=>void apply(advanceLife(run))}>{run.step===LIFE_AGES.length-1?l("查看這一生的結局","See the ending"):l("繼續下一個人生階段","Continue to the next stage")} →</button>
      </>}
     </div>
    </section>
    <aside className="life-sim-sidebar">
     <TraitPanel traits={run.traits} en={en}/>
     <section className="life-sim-aside-card">
      <h3>{l("人生回音","Echoes from the past")}</h3>
      {run.history.length===0?<p>{l("第一個選擇將從這裡開始被記住。","Your first choice will be remembered here.")}</p>:
       <p>{run.history.at(-1)?.age} {l("歲","years")} · {en?run.history.at(-1)?.labelEn:run.history.at(-1)?.labelZh}</p>}
      <button className="life-sim-journal-toggle" onClick={()=>setShowHistory(v=>!v)} aria-expanded={showHistory}>
       {showHistory?l("收起紀錄","Hide history"):l("查看走過的決定","View decisions")}
      </button>
      {showHistory&&<Journal run={run} en={en}/>}
     </section>
     {original&&<section className="life-sim-aside-card">
      <h3>{l("另一條人生已保存","Original life preserved")}</h3>
      <p>{l("完成這一生後，就能和原本的人生比較。兩段人生使用相同的起點。","Finish this run to compare both lives with the same starting seed.")}</p>
     </section>}
     <section className="life-sim-aside-card">
      <h3>{l("遊戲規則","How choices work")}</h3>
      <p>{l("16、25、40、70 歲有角色專屬的因果劇情；其他階段由種子與人物狀態選出事件。不必使用 AI。","Character-specific arcs at 16, 25, 40 and 70; other events use seeded rules and trait weights. No AI is required.")}</p>
     </section>
     <button className="life-sim-delete" disabled={saving} onClick={()=>void reset()}>{l("刪除這段人生，重新選角色","Delete run and choose another character")}</button>
    </aside>
   </div>
  </>:null}
  {chatVisible&&<section className="life-sim-chat">
   <div className="life-sim-chat-heading">
    <div><h2>{l("和這一段人生的角色聊聊","Talk to this version of the character")}</h2>
     <p>{l("純文字、手動開啟。這段對話不會改變遊戲數值，也不會自動存入人生紀錄。使用現有 Gemini Key 或免費額度。","Optional text chat. It cannot change game stats and is not saved to the life log. Uses your existing Gemini key or available guest allowance.")}</p>
    </div>
    <button type="button" className="life-sim-secondary" onClick={()=>setShowChat(v=>!v)} aria-expanded={showChat}>
     {showChat?l("結束這次聊天","Close chat"):l("開始角色對話","Open character chat")}
    </button>
   </div>
   {showChat&&<TextChatPanel key={run.character+":"+run.step+":"+run.history.map(d=>d.eventId+":"+d.choice).join("|")}
    sessionScope="" system={lifeLabDialoguePrompt(run,en)}
    speaker={person?.name||""} english={en} searchEnabled={false}
    targetLanguage={en?"English":"繁體中文"}
    hint={l("你還記得這個決定嗎？","How do you feel about that decision?")}
    firstStarter={l("你現在怎麼看當年的選擇？","How do you feel about that choice now?")}/>}
  </section>}
 </main>;
}
