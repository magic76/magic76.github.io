import {useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {TimelinePortrait} from "./TimelinePortrait";
import {
 CAFE_ACTORS,CAFE_PAIRS,CAFE_PROPS,CAFE_SECRETS,cafeNames,cafePropCopy,cafeSecretCopy,
 cafeFinale,cafeLength,continueCafeWorld,newCafeWorld,useCafeProp,
 type CafeActor,type CafeProp,type CafeSecret,type CafeWorld
} from "./lifeCafeEngine";
import {loadCafeWorld,saveCafeWorld,clearCafeWorld} from "./lifeCafeStorage";
import "./lifeCafe.css";

const actorsMeta:Record<CafeActor,{role:[string,string];icon:string;thought:[string,string]}>={
 mira:{role:["記錄者","The observer"],icon:"📷",thought:["她在看誰？","Who is she watching?"]},
 ethan:{role:["音樂人","The musician"],icon:"🎸",thought:["他在等誰？","Who is he waiting for?"]},
 hana:{role:["旅行者","The traveller"],icon:"🧳",thought:["她在隱瞞什麼？","What is she hiding?"]}
};
function freshSeed():number{
 if(typeof crypto!=="undefined"&&crypto.getRandomValues)return crypto.getRandomValues(new Uint32Array(1))[0];
 return Date.now()>>>0;
}
function ActorPortrait({id,active,reacting,onClick,zh}:{id:CafeActor;active:boolean;reacting:boolean;onClick:()=>void;zh:boolean}){
 const meta=actorsMeta[id];
 return <button type="button" className={"lc-character lc-character-"+id+(active?" lc-character-active":"")+(reacting?" lc-character-reacting":"")}
  onClick={onClick} aria-pressed={active} aria-label={(zh?"把物件放到 ":"Give the item to ")+cafeNames[id]} >
  <div className="lc-character-halo" aria-hidden="true"/>
  <TimelinePortrait characterId={id} age={25} className="lc-portrait" priority alt=""/>
  <span className="lc-character-name">{cafeNames[id]}</span>
  <span className="lc-character-mood">{meta.thought[zh?0:1]}</span>
  <span className="lc-character-choose">{active?(zh?"✦ 投放目標":"✦ Recipient"):"+"}</span>
 </button>;
}
function RelationRow({world,zh}:{world:CafeWorld;zh:boolean}){
 const pairLabel:Record<string,string>={"mira-ethan":"Mira – Ethan","mira-hana":"Mira – Hana","ethan-hana":"Ethan – Hana"};
 return <div className="lc-relations" aria-label={zh?"人物關係":"Relationships"}>
  {CAFE_PAIRS.map(pair=><div className="lc-relation" key={pair}>
   <span>{pairLabel[pair]}</span>
   <div className="lc-relation-track"><span style={{width:world.relations[pair]+"%"}}/></div>
   <b>{world.relations[pair]}</b>
  </div>)}
 </div>;
}
function Secrets({world,zh}:{world:CafeWorld;zh:boolean}){
 const uncovered=world.revealed.length+(world.phase==="finished"&&!world.revealed.includes("hana-moving")?1:0);
 return <section className="lc-secrets">
  <div className="lc-panel-heading"><h2>{zh?"他們沒說出口的事":"Things left unsaid"}</h2><span>{uncovered} / {CAFE_SECRETS.length}</span></div>
  <div className="lc-secret-list">{CAFE_SECRETS.map((id:CafeSecret)=>{const known=world.revealed.includes(id)||(world.phase==="finished"&&id==="hana-moving");return <div key={id} className={"lc-secret"+(known?" is-revealed":"")}>
   <span aria-hidden="true">{known?"✦":"?"}</span>
   <div><strong>{known?cafeSecretCopy[id].title[zh?"zh":"en"]:zh?"還沒被發現":"Not discovered"}</strong>
    {known&&<p>{cafeSecretCopy[id].detail[zh?"zh":"en"]}</p>}
   </div>
  </div>})}</div>
 </section>;
}
function LastReaction({world,zh,onContinue,onReset}:{world:CafeWorld;zh:boolean;onContinue:()=>void;onReset:()=>void}){
 const last=world.moves.at(-1);
 if(!last)return null;
 return <section className="lc-reaction" aria-live="polite">
  <div className="lc-reaction-label"><span className="lc-pulse"/> {zh?"剛剛發生了什麼":"WHAT JUST HAPPENED"}</div>
  <h2>{last.news.title[zh?"zh":"en"]}</h2>
  <p className="lc-reaction-main">{last.news.detail[zh?"zh":"en"]}</p>
  <div className="lc-dialogue">{last.beats.map((beat,i)=><div key={i} className={"lc-dialogue-line"+(beat.who?" lc-dialogue-"+beat.who:"")} style={{animationDelay:(i*.13)+"s"}}>
   <span>{beat.who?cafeNames[beat.who]:zh?"店裡":"The café"}</span>
   <p>{beat.line[zh?"zh":"en"]}</p>
  </div>)}</div>
  {last.guess!==null&&<div className={"lc-guess-result "+(last.correct?"is-correct":"is-surprised")}>
   <span>{last.correct?"✓":"✧"}</span>
   {last.correct
    ?zh?"猜中了！你開始了解他們了。":"You called it! You're learning their habits."
    :zh?"猜錯了！先有反應的是 "+cafeNames[last.first]+"。":"Unexpected! "+cafeNames[last.first]+" reacted first."}
  </div>}
  <div className="lc-reaction-actions">
   <button type="button" className="lc-primary" onClick={onContinue}>
    {world.used.length>=cafeLength(world)?zh?"揭曉三人的結局":"Reveal how their story ends":zh?"繼續下一幕":"Continue the story"}
    <span aria-hidden="true">→</span>
   </button>
   <button type="button" className="lc-quiet-action" onClick={onReset}>{zh?"換一種可能性，重來":"Rewind this world"}</button>
  </div>
 </section>;
}
export function LifeCafePage(){
 const {i18n}=useTranslation("home");
 const zh=i18n.language.startsWith("zh");
 const language=zh?"zh":"en";
 const l=(a:string,b:string)=>zh?a:b;
 const [world,setWorld]=useState<CafeWorld>(()=>loadCafeWorld()||newCafeWorld(freshSeed()));
 const [item,setItem]=useState<CafeProp>("letter");
 const [target,setTarget]=useState<CafeActor>("ethan");
 const [guess,setGuess]=useState<CafeActor|null>(null);
 const [showGuess,setShowGuess]=useState(false);
 const [warning,setWarning]=useState(false);
 const [showSecrets,setShowSecrets]=useState(false);
 const [showLog,setShowLog]=useState(false);
 const last=world.moves.at(-1);
 const opening=world.version===2&&world.used.length===0;
 const total=cafeLength(world);
 const finale=world.phase==="finished"?cafeFinale(world):null;
 const activeItem=world.used.includes(item)?CAFE_PROPS.find(p=>!world.used.includes(p))||item:item;
 const update=(next:CafeWorld)=>{
  setWorld(next);
  setWarning(!saveCafeWorld(next));
 };
 const reset=(sameSeed:boolean)=>{
  if(world.phase!=="finished"&&world.moves.length>0&&!window.confirm(l("重新開始這場實驗？現在的事件會被覆蓋。","Restart? The current experiment history will be replaced.")))return;
  const next=newCafeWorld(sameSeed?world.seed:freshSeed());
  if(!clearCafeWorld())setWarning(true);
  update(next);
  setItem("letter");setTarget("ethan");setGuess(null);setShowGuess(false);setShowSecrets(false);setShowLog(false);
  window.scrollTo({top:0,behavior:"instant"});
 };
 const apply=()=>{
  if(world.phase!=="ready")return;
  try{
   const next=useCafeProp(world,activeItem,target,guess);
   update(next);setGuess(null);setShowGuess(false);
   window.requestAnimationFrame(()=>document.getElementById("lc-reaction")?.scrollIntoView({block:"start",behavior:"smooth"}));
  }catch{setWarning(true);}
 };
 const continueWorld=()=>{
  try{
   const next=continueCafeWorld(world);
   update(next);
   setItem(CAFE_PROPS.find(p=>!next.used.includes(p))||"letter");
   setGuess(null);setShowGuess(false);
   window.scrollTo({top:0,behavior:"instant"});
  }catch{setWarning(true);}
 };
 const dismissAway=()=>update({...world,awayReports:[]});
 const reacting=world.phase==="reaction";
 const finished=world.phase==="finished";
 const knownSecrets=world.revealed.length+(finished&&!world.revealed.includes("hana-moving")?1:0);
 return <main className="lc-page">
  <div className="lc-shell">
   <header className="lc-header">
    <Link className="lc-back" to="/games">← {l("回小遊戲","Back to games")}</Link>
    <div className="lc-header-label">CREW · LITTLE WORLD EXPERIMENT</div>
    <div className="lc-header-title"><div><span className="lc-eyebrow"><span/> {l("一個會誤會彼此的小世界","A SMALL WORLD OF MISUNDERSTANDINGS")}</span>
     <h1>{l("誰寫了那封匿名信？","Who wrote the anonymous letter?")}</h1>
     <p>{l("三個從小認識的朋友在咖啡店見面，有人準備離開，卻不敢說。","Three childhood friends meet at a café. One is leaving, but cannot say it.")}</p>
    </div><div className="lc-counter"><strong>{world.used.length}<small> / {total}</small></strong><span>{l("幕故事","story beats")}</span></div></div>
   </header>
   {warning&&<p className="lc-warning" role="status">{l("目前無法安全儲存進度。離開後可能需要重玩。","Local storage is unavailable; your experiment may not survive a reload.")}</p>}
   {world.awayReports.length>0&&<section className="lc-away" aria-label={l("離開後的世界","Since you were away")}>
    <div className="lc-away-top"><span>✦ {l("你離開後，這裡還有一些小插曲","While you were away…")}</span><button type="button" onClick={dismissAway}>{l("收起","Dismiss")}</button></div>
    {world.awayReports.map((report,i)=><p key={i}><b>{report.title[language]}</b> — {report.detail[language]}</p>)}
    <small>{l("根據離開時間補算，沒有背景 AI 持續執行。","Reconstructed from elapsed time, without a running background AI.")}</small>
   </section>}
   {opening&&<section className="lc-story-hook" aria-label={l("故事開場","Story opening")}>
 <span className="lc-step">{l("星期五下午 · 故事開始","FRIDAY AFTERNOON · THE STORY BEGINS")}</span>
 <p>{l("Mira 喜歡拍照，Ethan 總帶著吉他，Hana 今天卻一直望著窗外。他們三個從小就認識。","Mira takes pictures, Ethan plays guitar, and Hana keeps looking out the window. They've been friends since childhood.")}</p>
 <blockquote>{l("「我可能要離開了。」","“I might be leaving.”")}</blockquote>
 <p>{l("桌上突然出現一封沒有署名的信。到底是誰寫的？為什麼不敢親口說？","An unsigned letter appears on the table. Who wrote it, and why couldn't they say it aloud?")}</p>
 <button type="button" className="lc-story-start" onClick={()=>document.getElementById("lc-console")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"})}>
  {l("把信交給誰？開始觀察","Who gets the letter? Start watching")} <span aria-hidden="true">↓</span>
 </button>
</section>}
{!opening&&world.phase==="ready"&&<div className="lc-story-progress">
 <span aria-hidden="true">✉️</span>
 <p>{world.revealed.includes("hana-moving")?
  l("寫信的人已經被發現。接下來，他們能好好道別嗎？","You know who wrote it. Can they say goodbye properly?"):
  l("有人看到了信，但真相還沒揭曉。再製造一個機會，看看誰會開口。","Someone saw the letter, but its author remains unknown. What could make them speak?")}</p>
</div>}
<section className={"lc-stage"+(reacting?" lc-stage-reacting":"")} aria-label={l("咖啡店裡的三個人","Three people in a café")}>
    <div className="lc-stage-window" aria-hidden="true"><div className="lc-window-glow"/><div className="lc-window-bars"/><div className="lc-window-city"/></div>
    <div className="lc-stage-light" aria-hidden="true"/>
    <div className="lc-stage-sign" aria-hidden="true"><span>OPEN</span><b>THE LITTLE CAFÉ</b></div>
    <div className="lc-stage-clock">{l("星期五 · 午後","FRIDAY · AFTERNOON")} <span className="lc-live-dot"/></div>
    <div className="lc-character-stage">
     {CAFE_ACTORS.map(id=><ActorPortrait key={id} id={id} active={!reacting&&!finished&&target===id}
      reacting={reacting&&last?.first===id} onClick={()=>{if(world.phase==="ready")setTarget(id)}} zh={zh}/>)}
    </div>
    <div className="lc-stage-furniture" aria-hidden="true"><div className="lc-cafe-table"><span>☕</span></div></div>
    <div className="lc-stage-bottom">
     <span>{finished?"✦":reacting&&last?cafePropCopy[last.item].icon:activeItem?cafePropCopy[activeItem].icon:"✦"}</span>
     <p>{reacting&&last?last.news.title[language]:finished?l("今晚的故事有了結局","Tonight's story has an ending"):opening?l("「我可能要離開了。」誰寫了這封信？","Who wrote 'I might be leaving'?"):l("信交出去了，故事還沒有結束","The letter is out, but the story is not over.")}</p>
    </div>
   </section>
   {world.phase==="ready"&&<section className="lc-console" id="lc-console">
    <div className="lc-section-top">
     <div><span className="lc-step">{opening?l("第一幕 · 匿名信","ACT 1 · THE LETTER"):l("下一幕 · 製造轉機","NEXT ACT · A NEW TWIST")}</span>
      <h2>{opening?l("這封信，要先交給誰？","Who should read the letter first?"):l("接下來，怎麼打破沉默？","What might break the silence?")}</h2></div>
     <span className="lc-remaining">{l("剩下","Left")} {total-world.used.length} {l("幕","acts")}</span>
    </div>
    {opening?<div className="lc-opening-letter">
      <span aria-hidden="true">✉️</span>
      <div><strong>{l("沒有署名的信","An unsigned letter")}</strong><p>{l("上面只有一句：「我可能要離開了。」","Just one line: 'I might be leaving.'")}</p></div>
     </div>:<div className="lc-item-grid" role="group" aria-label={l("選擇下一個物件","Choose another object")}>
      {CAFE_PROPS.map(id=><button type="button" key={id}
       aria-pressed={activeItem===id&&!world.used.includes(id)} disabled={world.used.includes(id)}
       className={"lc-item"+(activeItem===id&&!world.used.includes(id)?" is-selected":"")}
       onClick={()=>setItem(id)}>
       <span className="lc-item-icon" aria-hidden="true">{cafePropCopy[id].icon}</span>
       <strong>{cafePropCopy[id].title[language]}</strong>
       <small>{world.used.includes(id)?l("已使用","Used"):cafePropCopy[id].hint[language]}</small>
      </button>)}
     </div>}
    <div className="lc-recipient">
     <span className="lc-step">{opening?l("選一個收信的人","CHOOSE WHO RECEIVES THE LETTER"):l("物件要放在誰面前？","WHO FINDS THE OBJECT?")}</span>
     <div className="lc-recipient-pills" role="group" aria-label={l("物件放置目標","Choose who finds it")}>
      {CAFE_ACTORS.map(id=><button type="button" key={id} aria-pressed={target===id} className={target===id?"is-selected":""} onClick={()=>setTarget(id)}>{cafeNames[id]}</button>)}
     </div>
     <small>{l("也可以直接點上面場景裡的人物。","Or tap a person in the café scene.")}</small>
    </div>
    <div className="lc-guess">
     <button type="button" className="lc-guess-toggle" aria-expanded={showGuess} onClick={()=>setShowGuess(v=>!v)}>
      <span>{l("想多玩一點？猜誰會第一個有反應（可略過）","Extra challenge: who reacts first? (optional)")}</span>
      <span aria-hidden="true">{showGuess?"−":"+"}</span>
     </button>
     {showGuess&&<div className="lc-guess-content">
      <span className="lc-step">{l("猜人心","PREDICT THE FIRST REACTION")}</span>
      <div className="lc-guess-pills" role="group" aria-label={l("猜先反應的人","Predict first reaction")}>
       <button type="button" aria-pressed={guess===null} className={guess===null?"is-selected":""} onClick={()=>setGuess(null)}>{l("不猜","Skip")}</button>
       {CAFE_ACTORS.map(id=><button type="button" key={id} aria-pressed={guess===id} className={guess===id?"is-selected":""} onClick={()=>setGuess(id)}>{cafeNames[id]}</button>)}
      </div>
     </div>}
    </div>
    <div className="lc-submit">
     <button type="button" className="lc-primary" onClick={apply}>
      {l("把","Put ")}{zh?cafePropCopy[activeItem].title.zh:"the "+cafePropCopy[activeItem].title.en}
      {zh?"放到 "+cafeNames[target]+" 面前":" in front of "+cafeNames[target]}
      <span aria-hidden="true">→</span>
     </button>
     <p>{opening?l("你只決定誰先看到信；他們會自己做出反應。","You decide who sees it first; they react on their own."):
      l("不同物件和對象，可能讓真相更近，也可能造成新的誤會。","Different objects and recipients can uncover the truth or cause another misunderstanding.")}</p>
    </div>
   </section>}
   {reacting&&<div id="lc-reaction"><LastReaction world={world} zh={zh} onContinue={continueWorld} onReset={()=>reset(true)}/></div>}
   {finished&&<section className="lc-finished">
    <div className="lc-finished-symbol" aria-hidden="true">✦</div>
    <span className="lc-step">{l("故事結局 · 第二天早上","THE END · THE NEXT MORNING")}</span>
    <h2>{finale?.title[language]}</h2>
    <p className="lc-finale-body">{finale?.detail[language]}</p>
    <div className="lc-finale-answer">
     <span aria-hidden="true">✉️</span><div>
      <strong>{l("答案揭曉：匿名信是 Hana 寫的。","The answer: Hana wrote the letter.")}</strong>
      <p>{l("她一直想告訴朋友自己要搬走。你讓誰先看到信，以及後來發生的事，決定了他們如何道別。","She was afraid to tell her friends she was moving. Your choices shaped how they said goodbye.")}</p>
     </div>
    </div>
    <div className="lc-episode-recap">
     <h3>{l("這段故事是怎麼發生的？","How did the story unfold?")}</h3>
     <ol>{world.moves.map((move,i)=><li key={i}>
      <span>{l("第","Act ")}{i+1}{zh?" 幕":""}</span>
      <p><b>{cafePropCopy[move.item].title[language]} → {cafeNames[move.target]}</b>　{move.news.title[language]}</p>
     </li>)}</ol>
    </div>
    <div className="lc-finished-stats">
     <div><strong>{knownSecrets}<small>/3</small></strong><span>{l("已揭露的秘密","Secrets uncovered")}</span></div>
     <div><strong>{world.correctGuesses}<small>/{world.attemptedGuesses}</small></strong><span>{l("猜中第一反應","Correct predictions")}</span></div>
     <div><strong>{world.moves.length}</strong><span>{l("意外的故事","Unfolded moments")}</span></div>
    </div>
    <RelationRow world={world} zh={zh}/>
    <div className="lc-finished-actions">
     <button type="button" className="lc-primary" onClick={()=>reset(true)}>{l("換個人收到信，重玩一次","Replay: give the letter to someone else")} <span aria-hidden="true">↻</span></button>
     <button type="button" className="lc-secondary" onClick={()=>reset(false)}>{l("生成新的起點","Start from a new seed")}</button>
    </div>
   </section>}
   <aside className="lc-bottom-panels">
    <div className="lc-discoveries"><button type="button" className="lc-fold-button" onClick={()=>setShowSecrets(v=>!v)} aria-expanded={showSecrets}>
      <span>✧ {l("他們的秘密","Hidden stories")} · {knownSecrets}/3</span><span>{showSecrets?"−":"+"}</span>
     </button>
     {showSecrets&&<Secrets world={world} zh={zh}/>}
    </div>
    <div className="lc-history"><button type="button" className="lc-fold-button" onClick={()=>setShowLog(v=>!v)} aria-expanded={showLog}>
     <span>☰ {l("實驗紀錄","Experiment log")} · {world.moves.length}/{total}</span><span>{showLog?"−":"+"}</span></button>
     {showLog&&<ol>{world.moves.map((move,i)=><li key={i}><b>{cafePropCopy[move.item].icon} {cafePropCopy[move.item].title[language]} → {cafeNames[move.target]}</b>
       <p>{move.news.title[language]}</p></li>)}</ol>}
    </div>
   </aside>
   <footer className="lc-footer"><Link to="/timeline/observe/classic">{l("回看舊版人生觀察室","Old Life Observatory")}</Link>
    <span>{l("虛構模擬，非真實 AI 自主生活。事件由規則演算，只有回訪時才補算。","Fictional rules-based simulation. No real-time autonomous agents; missed time is simulated on return.")}</span>
   </footer>
  </div>
 </main>;
}
