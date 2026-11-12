import {useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {TimelinePortrait} from "./TimelinePortrait";
import {
 OBSERVER_ACTORS,OBSERVER_AGES,OBSERVER_BUDGET,OBSERVER_PAIRS,
 advanceObserverRun,chooseObserverIntervention,createObserverRun,
 observerAge,observerBondLabel,observerEnding,observerInterventionCount,
 observerScenes,settleObserverChapter,
 type ObserverAge,type ObserverChapter,type ObserverId,type ObserverLanguage,type ObserverPair,
 type ObserverRun
} from "./lifeObservatory";
import {loadObserverSave,removeObserverSave,writeObserverSave,type ObserverSave} from "./lifeObservatoryStorage";
import "./lifeObservatory.css";

const names:Record<ObserverId,string>={mira:"Mira",ethan:"Ethan",hana:"Hana"};
const props:Record<ObserverId,{symbol:string;motif:string;zh:string;en:string}>={
 mira:{symbol:"◌",motif:"相機",zh:"總會發現別人沒看見的東西",en:"Notices what others overlook"},
 ethan:{symbol:"♫",motif:"音樂",zh:"想用聲音留下些什麼",en:"Wants to leave something through sound"},
 hana:{symbol:"✦",motif:"旅行",zh:"總想知道遠方會有什麼",en:"Always curious about what lies beyond"}
};
const pairNames:Record<ObserverPair,[ObserverId,ObserverId]>={
 "mira-ethan":["mira","ethan"],"mira-hana":["mira","hana"],"ethan-hana":["ethan","hana"]
};
function randomSeed(){
 if(typeof crypto!=="undefined"&&crypto.getRandomValues)return crypto.getRandomValues(new Uint32Array(1))[0];
 return Date.now()>>>0;
}
function characterStatus(id:ObserverId,run:ObserverRun,language:ObserverLanguage){
 const {hope,stress}=run.actors[id];
 if(stress>=65)return language==="zh"?"心事重重":"Worried";
 if(hope>=78)return language==="zh"?"充滿期待":"Hopeful";
 if(hope<=48)return language==="zh"?"有點迷惘":"Uncertain";
 return language==="zh"?"還在摸索":"Finding a way";
}
function BondRow({run,language,before}:{run:ObserverRun;language:ObserverLanguage;before?:ObserverChapter["before"]}){
 return <div className="lo-relations">
  <div className="lo-small-heading">
   <span>{language==="zh"?"此刻的關係":"Their connections"}</span>
   <small>{language==="zh"?"這些距離會改變往後的故事":"These ties shape later stories"}</small>
  </div>
  <div className="lo-bond-grid">{OBSERVER_PAIRS.map(id=>{
   const current=run.bonds[id],change=current-(before?.[id]??current),pair=pairNames[id];
   return <div className="lo-bond" key={id}>
    <div className="lo-bond-label"><span>{names[pair[0]]} <i aria-hidden="true">↔</i> {names[pair[1]]}</span>
     <strong>{observerBondLabel(current,language)}{change!==0?<em className={change>0?"lo-bond-up":"lo-bond-down"}>{change>0?"+":""}{change}</em>:null}</strong></div>
    <div className="lo-bond-track"><span style={{width:current+"%"}}/></div>
   </div>;
  })}</div>
 </div>;
}
function SceneWorld({run,language}:{run:ObserverRun;language:ObserverLanguage}){
 const age=observerAge(run);
 const era=age===16?language==="zh"?"那年夏天":"The summer":age===25?language==="zh"?"走向遠方":"Growing apart":language==="zh"?"重返街角":"A familiar street";
 return <section className="lo-world" data-age={age} aria-label={language==="zh"?"三人共同生活的世界":"A shared world"}>
  <div className="lo-world-glow" aria-hidden="true"/>
  <div className="lo-world-stars" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
  <div className="lo-world-header">
   <span>THE CREW OBSERVATORY</span>
   <div className="lo-world-era">{era}<b>{age} <small>{language==="zh"?"歲":"years"}</small></b></div>
  </div>
  <div className="lo-cast">
   {OBSERVER_ACTORS.map(id=><article className={"lo-person lo-person-"+id} key={id}>
    <span className="lo-person-arc" aria-hidden="true">{props[id].symbol}</span>
    <TimelinePortrait characterId={id} age={age} className="lo-portrait" priority alt={names[id]}/>
    <strong>{names[id]}</strong>
    <small>{characterStatus(id,run,language)}</small>
    <div className="lo-person-meters" aria-label={(language==="zh"?"期待與壓力":"Hope and stress")+": "+run.actors[id].hope+"/"+run.actors[id].stress}>
     <span style={{width:run.actors[id].hope+"%"}}/>
    </div>
   </article>)}
  </div>
  <div className="lo-connecting" aria-hidden="true">
   <svg viewBox="0 0 320 52" preserveAspectRatio="none">
    <path d="M52 28 Q108 4 160 28" strokeWidth={2+run.bonds["mira-ethan"]/18} className={run.bonds["mira-ethan"]<48?"lo-weak":""}/>
    <path d="M160 28 Q214 4 268 28" strokeWidth={2+run.bonds["ethan-hana"]/18} className={run.bonds["ethan-hana"]<48?"lo-weak":""}/>
    <path d="M52 29 Q160 80 268 29" strokeWidth={2+run.bonds["mira-hana"]/24} className={run.bonds["mira-hana"]<48?"lo-weak":""}/>
   </svg>
   <span>{language==="zh"?"他們的關係正在改變":"Their lives are intertwined"}</span>
  </div>
  <div className="lo-world-horizon" aria-hidden="true"/>
 </section>;
}
function ChapterBar({run,language}:{run:ObserverRun;language:ObserverLanguage}){
 const age=observerAge(run);
 return <nav className="lo-chapters" aria-label={language==="zh"?"人生階段":"Life chapters"}>
  {OBSERVER_AGES.map((year,i)=><div className={"lo-chapter "+(i===run.step?"lo-chapter-now":i<run.step?"lo-chapter-past":"lo-chapter-future")} key={year} aria-current={i===run.step?"step":undefined}>
   <span>{i<run.step?"✓":i===run.step?"●":"○"}</span><b>{year}</b><small>{language==="zh"?"歲":"yrs"}</small>
   {i<OBSERVER_AGES.length-1&&<i aria-hidden="true"/>}
  </div>)}
 </nav>;
}
function CompareWorlds({current,previous,language}:{current:ObserverRun;previous:ObserverRun;language:ObserverLanguage}){
 const zh=language==="zh";
 return <section className="lo-compare" aria-label={zh?"平行人生":"Parallel lives"}>
  <h2>{zh?"同樣的起點，兩種人生":"Same beginning, different lives"}</h2>
  <p>{zh?"角色、初始狀態、隨機種子相同。只要做出的選擇不同，後面的關係就可能走向不同方向。":
  "The characters, starting states and seed are the same. Changed choices can alter every later connection."}</p>
  <div className="lo-compare-grid">
   {[{run:previous,title:zh?"前一次的人生":"First life"},{run:current,title:zh?"這一次的人生":"Second life"}].map((item,i)=>
    <div className="lo-compare-side" key={i}>
     <h3>{item.title}</h3>
     {item.run.history.map(ch=><div className="lo-compare-chapter" key={ch.age}>
      <b>{ch.age} {zh?"歲":"years"}</b>
      <span>{ch.ripple.title[language]}</span>
      <small>{ch.decisions.filter(d=>d.source==="player").length} {zh?"次介入":"interventions"}</small>
     </div>)}
     <div className="lo-compare-bonds">{OBSERVER_PAIRS.map(pair=><div key={pair}>
      <span>{pairNames[pair].map(id=>names[id]).join(" – ")}</span><strong>{item.run.bonds[pair]}</strong>
     </div>)}</div>
    </div>)}
  </div>
 </section>;
}
export function LifeObservatoryPage(){
 const {i18n}=useTranslation("home");
 const language:ObserverLanguage=i18n.language.startsWith("zh")?"zh":"en";
 const zh=language==="zh";
 const l=(a:string,b:string)=>zh?a:b;
 const [saved,setSaved]=useState<ObserverSave|null>(()=>loadObserverSave());
 const [storageWarning,setStorageWarning]=useState(false);
 const [showCompare,setShowCompare]=useState(false);
 const [showDetails,setShowDetails]=useState(false);
 const run=saved?.current??null;
 const history=run?.history.at(-1);
 const age=run?observerAge(run):16;
 const applied=run?observerInterventionCount(run):0;
 const persist=(next:ObserverSave)=>{
  setSaved(next);
  if(!writeObserverSave(next))setStorageWarning(true);else setStorageWarning(false);
 };
 const start=(seed=randomSeed(),previous:ObserverRun|null=null)=>{
  persist({version:1,current:createObserverRun(seed),previous});
  setShowCompare(false);
  setShowDetails(false);
 };
 const intervene=(id:ObserverId,choice:0|1)=>{
  if(!saved||saved.current.phase!=="watch")return;
  try{persist({...saved,current:chooseObserverIntervention(saved.current,id,choice)});}
  catch{/* Full budget is reflected by disabled controls. */}
 };
 const settle=()=>{
  if(!saved||saved.current.phase!=="watch")return;
  persist({...saved,current:settleObserverChapter(saved.current)});
  setShowDetails(false);
 };
 const advance=()=>{
  if(!saved||saved.current.phase!=="recap")return;
  persist({...saved,current:advanceObserverRun(saved.current)});
  setShowDetails(false);
  if(typeof window!=="undefined")window.scrollTo({top:0,behavior:"instant"});
 };
 const reset=()=>{
  if(!window.confirm(l("確定刪除這段觀察與平行人生？原本 Timeline 和人生實驗室不受影響。","Delete this observation and parallel life? Your existing Timeline and Life Lab will remain.")))return;
  if(removeObserverSave()){setSaved(null);setStorageWarning(false);setShowCompare(false);}
  else setStorageWarning(true);
 };
 return <main className="lo-page">
  <header className="lo-header">
   <div className="lo-header-links"><Link to="/timeline/simulate">← {l("返回人生實驗室","Back to Life Lab")}</Link><span>EXPERIMENT 03 / 2026</span></div>
   <div className="lo-title-area"><div>
    <span className="lo-eyebrow"><i/> CREW · THE LIFE OBSERVATORY</span>
    <h1>{l("如果你不在，他們會過著怎樣的人生？","What happens to them when you're gone?")}</h1>
    <p>{l("三個人，一個世界。你可以影響他們，卻無法替他們決定一切。","Three people, one world. Influence their lives, but you cannot decide everything for them.")}</p>
   </div><div className="lo-side-stamp" aria-hidden="true"><span>03</span><small>PARALLEL<br/>LIVES</small></div></div>
  </header>
  {storageWarning&&<div className="lo-warning" role="status">{l("目前無法保存到這台裝置。重新整理後可能會失去進度。","Saving is unavailable on this device. Progress may be lost on reload.")}</div>}
  {!run?<section className="lo-intro">
   <div className="lo-intro-tag">{l("一個小小的社會實驗","A SMALL SOCIAL EXPERIMENT")}</div>
   <SceneWorld run={createObserverRun(1729)} language={language}/>
   <div className="lo-intro-copy"><h2>{l("先看著他們生活。","Watch them make their own choices.")}</h2>
    <p>{l("從 16 歲開始，經過 25 歲與 40 歲。每個階段三人都有自己的心事；你最多介入兩次，也可以完全不出手。","Begin at 16, then follow them at 25 and 40. Every chapter has three lives unfolding, with at most two chances to intervene.")}</p>
    <div className="lo-intro-points"><span>◌ {l("3 個主角同場","Three connected lives")}</span><span>✦ {l("不介入也會發生事","Events happen on their own")}</span><span>⌁ {l("能回頭改變結局","Replay and compare")}</span></div>
    <button type="button" className="lo-primary" onClick={()=>start()}>{l("開始觀察他們的人生","Start watching their lives")} <span aria-hidden="true">↗</span></button>
    <small>{l("免費遊玩 · 不需要 Gemini Key · 不會在背景執行","Free offline play · No Gemini Key · No background agent")}</small>
   </div>
  </section>:<>
   <ChapterBar run={run} language={language}/>
   <SceneWorld run={run} language={language}/>
   <BondRow run={run} language={language} before={run.phase!=="watch"?history?.before:undefined}/>
   {run.phase==="watch"?<>
    <section className="lo-feed">
     <div className="lo-feed-top"><div><span className="lo-eyebrow">CURRENT SCENES · {age}</span>
       <h2>{l("這一年，他們各自遇到了什麼？","Three lives, three unfolding moments")}</h2>
       <p>{l("你可以選擇介入，但沒有誰的故事一定需要你來拯救。","You may intervene, but none of these lives is waiting to be rescued.")}</p></div>
      <div className="lo-budget" aria-live="polite"><span>{l("尚可介入","Interventions left")}</span><strong>{OBSERVER_BUDGET-applied}<small> / {OBSERVER_BUDGET}</small></strong></div></div>
     <div className="lo-scene-list">{observerScenes(run).map((scene,i)=>{
      const selected=run.interventions[scene.actor];
      return <article className={"lo-scene lo-scene-"+scene.actor} key={scene.id}>
       <div className="lo-scene-index">{String(i+1).padStart(2,"0")}<span className="lo-scene-dot"/></div>
       <div className="lo-scene-content"><div className="lo-scene-heading"><span>{names[scene.actor]} · {age} {l("歲","years")}</span>
        <span className={selected===undefined?"lo-self-badge":"lo-intervened-badge"}>{selected===undefined?l("自主發展","Own decision"):l("你已介入","You intervened")}</span></div>
        <h3>{scene.title[language]}</h3><p>{scene.intro[language]}</p>
        <div className="lo-option-list" role="group" aria-label={names[scene.actor]+" "+l("介入方式","interventions")}>
         {scene.choices.map((choice,index)=><button type="button" key={index}
          disabled={applied>=OBSERVER_BUDGET&&selected===undefined}
          aria-pressed={selected===index}
          className={selected===index?"lo-option-selected":""}
          onClick={()=>intervene(scene.actor,index as 0|1)}>
          <span>{choice.label[language]}</span><span aria-hidden="true">{selected===index?"✓":"+"}</span></button>)}
        </div>
        {selected===undefined?<small className="lo-self-caption">{l("未介入：角色會根據當下的心情與過往自行決定。","Without intervention, they decide based on their own state and past.")}</small>:
         <small className="lo-selected-caption">{l("再次點同一選項可取消；時間推進前都能更改。","Tap again to remove this intervention before time advances.")}</small>}
       </div>
      </article>;
     })}</div>
    </section>
    <div className="lo-action-dock"><div><strong>{applied===0?l("這次你什麼都沒做，也沒關係。","You haven't intervened. That's okay."):
     l("有些事被你改變了，其他事還在繼續。","You changed some moments. Others unfold on their own.")}</strong>
     <span>{l("按下後，三個人會自行走完這個階段。","Advance to see all three lives unfold.")}</span></div>
     <button type="button" className="lo-primary" onClick={settle}>{l("讓時間繼續","Let time move on")} <span aria-hidden="true">→</span></button>
    </div>
   </>:run.phase==="recap"&&history?<>
    <section className="lo-recap">
     <div className="lo-recap-head"><span className="lo-eyebrow">CHAPTER {run.step+1} · COMPLETE</span>
      <h2>{l("時間走過了。他們做出了自己的決定。","Time passed. They made their choices.")}</h2>
      <p>{l("有些選擇因為你而發生，有些則完全不是你預料的。","Some choices came from you. Others did not.")}</p></div>
     <div className="lo-outcomes">{history.decisions.map(decision=><article key={decision.id} className={"lo-outcome lo-outcome-"+decision.id}>
      <div><span>{names[decision.id]}</span><small>{decision.source==="player"?l("你的介入","Your intervention"):l("他自己決定","Their own choice")}</small></div>
      <h3>{decision.decision[language]}</h3><p>{decision.outcome[language]}</p>
     </article>)}</div>
     <div className="lo-ripple" role="status"><div className="lo-ripple-symbol" aria-hidden="true">✳</div>
      <div><span>{l("命運的連鎖反應","THE RIPPLE EFFECT")}</span>
       <h3>{history.ripple.title[language]}</h3><p>{history.ripple.body[language]}</p>
       {history.ripple.fromAge&&<small>{l("這次變化，與","This echoes choices from")} {history.ripple.fromAge} {l("歲時的經歷有關","years old")}</small>}
      </div>
     </div>
     <div className="lo-recap-footer"><button type="button" className="lo-primary" onClick={advance}>
      {run.step===2?l("看看三人的結局","See how their lives turned out"):l("快轉到下一段人生","Skip forward to the next chapter")} <span aria-hidden="true">→</span>
     </button></div>
    </section>
   </>:run.phase==="end"?<>
    <section className="lo-ending">
     <span className="lo-eyebrow">THE YEARS BETWEEN · ENDING</span>
     <h2>{l("他們都長大了。","They grew up.")}</h2>
     <p className="lo-ending-lead">{observerEnding(run)[language]}</p>
     <div className="lo-ending-story">{run.history.map(ch=><article key={ch.age}><span>{ch.age} {l("歲","years")}</span><div><h3>{ch.ripple.title[language]}</h3><p>{ch.ripple.body[language]}</p></div></article>)}</div>
     <div className="lo-ending-actions"><button type="button" className="lo-primary" onClick={()=>start(run.seed,run)}>
      {l("從同一起點再玩一次","Replay the same starting point")} <span aria-hidden="true">↗</span></button>
      <button type="button" className="lo-secondary" onClick={()=>start()}>{l("開始另一個平行世界","Start another parallel world")}</button></div>
     {saved?.previous&&<div className="lo-compare-toggle"><button type="button" onClick={()=>setShowCompare(v=>!v)} aria-expanded={showCompare}>
      {showCompare?l("收起兩條人生","Hide both lives"):l("比較兩次人生的變化","Compare both lives")} <span aria-hidden="true">{showCompare?"−":"+"}</span></button>
     </div>}
     {showCompare&&saved?.previous&&<CompareWorlds current={run} previous={saved.previous} language={language}/>}
    </section>
   </>:null}
   <footer className="lo-footer">
    <button type="button" onClick={()=>setShowDetails(v=>!v)} aria-expanded={showDetails}>
     {showDetails?l("收起觀察紀錄","Hide world log"):l("查看這段世界的紀錄","View the world log")}</button>
    {showDetails&&<ol>{run.history.map(ch=><li key={ch.age}><b>{ch.age} {l("歲","years")}：</b>{ch.ripple.title[language]}</li>)}</ol>}
    <button type="button" className="lo-delete" onClick={reset}>{l("刪除此原型進度","Delete prototype progress")}</button>
    <p>{l("這是獨立的 V3 試玩原型，原本 12 階段人生實驗室及聊天紀錄不受影響。角色決定由固定規則運作，不會呼叫 AI。","This standalone V3 prototype does not alter the original 12-stage Life Lab or chats. Characters decide via deterministic rules, not AI.")}</p>
   </footer>
  </>}
 </main>;
}
