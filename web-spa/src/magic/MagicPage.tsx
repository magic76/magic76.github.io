import {Component,lazy,Suspense,useCallback,useEffect,useRef,useState} from "react";
import type {CSSProperties,FormEvent,ReactNode} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ensureLive,geminiKey,GEMINI_KEY_CHANGED_EVENT,type LiveSession} from "../lib/runtime";
import {applyMagicCommand,applyMagicLiveCall,demoMagicCommand,MAGIC_INITIAL_WORLD,type MagicChoice,type MagicWorld,type MagicObjectKind,type MagicResult} from "./world";
import {MAGIC_TOOLS,magicSystemPrompt} from "./liveTools";
import {MagicChallengeCard,MagicGeneratedCard} from "./MagicInteractionCard";
import {MagicMobileInteraction} from "./MagicMobileInteraction";
import "./magic.css";

const MagicScene3D=lazy(()=>import("./MagicScene3D").then(mod=>({default:mod.MagicScene3D})));
class MagicRenderBoundary extends Component<{children:ReactNode;onFailure:()=>void},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(error:Error){console.error("Crew Magic 3D fallback",error);this.props.onFailure()}
 render(){return this.state.failed?null:this.props.children}
}


const OBJECT_ICONS:Record<MagicObjectKind,string>={
 dragon:"🐉",chest:"🧰",portal:"🌀",tree:"🌳",owl:"🦉",crystal:"💎"
};
const OBJECT_LABELS:Record<MagicObjectKind,[string,string]>={
 dragon:["飛龍","Dragon"],chest:["寶箱","Treasure chest"],portal:["傳送門","Portal"],
 tree:["魔法樹","Magic tree"],owl:["貓頭鷹","Owl"],crystal:["水晶","Crystal"]
};
const SPOTS:[[number,number],[number,number],[number,number],[number,number],[number,number],[number,number]]=[
 [19,57],[74,43],[59,68],[35,72],[83,60],[12,34]
];
const HELPERS=[
 {id:"dragon",zh:"召喚一條龍",en:"Summon a dragon",emoji:"🐉"},
 {id:"night",zh:"讓天空變成星夜",en:"Make it a starry night",emoji:"🌙"},
 {id:"puzzle",zh:"給我一個魔法謎題",en:"Give me a magic riddle",emoji:"🔮"},
 {id:"portal",zh:"打開一扇傳送門",en:"Open a portal",emoji:"🌀"},
 {id:"snow",zh:"冰雪魔法",en:"Snow kingdom",emoji:"❄️"},
 {id:"forest",zh:"精靈森林",en:"Enchanted forest",emoji:"🌲"},
 {id:"candy",zh:"糖果王國",en:"Candy kingdom",emoji:"🍬"},
 {id:"sunny",zh:"回到天空之島",en:"Sunny sky",emoji:"☀️"},
 {id:"rain",zh:"召喚暴風雨",en:"Rainstorm",emoji:"🌧️"},
 {id:"meteor",zh:"流星雨降臨",en:"Meteor shower",emoji:"☄️"},
 {id:"rainbow",zh:"召喚彩虹",en:"Summon rainbow",emoji:"🌈"},
 {id:"aurora",zh:"夜空極光",en:"Northern lights",emoji:"✨"}
] as const;

export function MagicPage(){
 const {i18n}=useTranslation();
 const zh=i18n.language.startsWith("zh");
 const t=(chinese:string,english:string)=>zh?chinese:english;
 const [world,setWorld]=useState<MagicWorld>(MAGIC_INITIAL_WORLD);
 const worldRef=useRef<MagicWorld>(MAGIC_INITIAL_WORLD);
 const [voiceState,setVoiceState]=useState<"idle"|"connecting"|"listening"|"speaking"|"error">("idle");
 const [notice,setNotice]=useState("");
 const [heard,setHeard]=useState("");
 const [said,setSaid]=useState("");
 const [toolsAvailable,setToolsAvailable]=useState(true);
 const [input,setInput]=useState("");
 const [volume,setVolume]=useState(100);
 const [muted,setMuted]=useState(false);
 const [hasKey,setHasKey]=useState(false);
 const [starting,setStarting]=useState(false);
 const [showGuide,setShowGuide]=useState(false);
 const [useThreeWorld,setUseThreeWorld]=useState(()=>typeof window!=="undefined"&&(
  "WebGL2RenderingContext" in window||"WebGLRenderingContext" in window
 ));
 const [threeFailed,setThreeFailed]=useState(false);
 const [reducedMotion,setReducedMotion]=useState(false);
 useEffect(()=>{
  const q=window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync=()=>setReducedMotion(q.matches);
  sync();q.addEventListener("change",sync);return()=>q.removeEventListener("change",sync);
 },[]);
 const has3D=useThreeWorld&&!threeFailed;
 const fail3D=useCallback(()=>{setThreeFailed(true);setUseThreeWorld(false)},[]);
 const sessionRef=useRef<LiveSession|null>(null);
 const toolResultsRef=useRef(new Map<string,MagicResult>());
 useEffect(()=>{
  const sync=()=>setHasKey(Boolean(geminiKey()));
  sync();window.addEventListener(GEMINI_KEY_CHANGED_EVENT,sync);
  return()=>window.removeEventListener(GEMINI_KEY_CHANGED_EVENT,sync);
 },[]);
 const generation=useRef(0);
 useEffect(()=>{
  if(worldRef.current.revision===0){
   const message=t("一扇門正在等你。說出願望，或選一個魔法開始。","A portal is waiting. Make a wish or choose a spell.");
   if(worldRef.current.message!==message){worldRef.current={...worldRef.current,message};setWorld(worldRef.current);}
  }
 },[zh]);

 const runCommand=useCallback((name:string,args:unknown)=>{
  const next=applyMagicCommand(worldRef.current,name,args,zh?"zh":"en");
  if(next.ok){
   worldRef.current=next.world;
   setWorld(next.world);
  }
  return next;
 },[zh]);
 const runDemo=useCallback((id:(typeof HELPERS)[number]["id"]|"reset")=>{
  const next=demoMagicCommand(id,worldRef.current,zh?"zh":"en");
  if(next.ok){worldRef.current=next.world;setWorld(next.world);setNotice("");}
  if(sessionRef.current?.running)sessionRef.current.sendControl?.("The player triggered a world action by tapping the UI. React naturally; the on-screen action has already happened. Do not duplicate the action.");
 },[zh]);

 const stopVoice=useCallback(async ()=>{
  ++generation.current;
  toolResultsRef.current.clear();
  const session=sessionRef.current;sessionRef.current=null;
  setVoiceState("idle");setStarting(false);setMuted(false);setHeard("");setSaid("");
  if(session)try{await session.stop({reason:"magic-stop",silentStatus:true,emitTerminal:false})}catch{/* Already closed */}
 },[]);
 useEffect(()=>()=> {
  ++generation.current;
  const session=sessionRef.current;sessionRef.current=null;
  if(session)void session.stop({reason:"page-leave",silentStatus:true,emitTerminal:false}).catch(()=>{});
 },[]);

 async function startVoice(){
  if(starting||sessionRef.current?.running)return;
  if(!geminiKey()){
   setNotice(t("先到設定加入 Gemini Key，再回來施展語音魔法。","Add your Gemini key in Settings to use voice magic."));
   return;
  }
  const sequence=++generation.current;
  toolResultsRef.current.clear(); // A manual new call is a new session; reconnects keep this map.
  setStarting(true);setVoiceState("connecting");setToolsAvailable(true);setMuted(false);
  setNotice(t("正在開啟魔法通道…","Opening the magical connection…"));
  const failSession=(message:string)=>{
   if(generation.current!==sequence)return;
   const active=sessionRef.current;sessionRef.current=null;
   setVoiceState("error");setNotice(message);
   // A failed Live transport can still own a microphone track. Never let that
   // stale session block the retry button or update the next connection.
   if(active)void Promise.resolve().then(()=>active.stop({
    reason:"magic-connection-error",silentStatus:true,emitTerminal:false
   })).catch(()=>{});
  };
  try{
   await ensureLive();
   if(generation.current!==sequence)return;
   if(!window.CrewLive)throw new Error("Live runtime unavailable");
   const session=new window.CrewLive.Session({
    system:magicSystemPrompt(!zh),
    openingPrompt:zh?"歡迎來到魔法島！簡短介紹你是 Lumi，問玩家想讓這個世界發生什麼，並示範可以召喚生物、改變天氣或玩魔法謎題。":"Welcome to the magic island! Briefly introduce yourself as Lumi and ask what the player would like to create, such as creatures, weather or a magical riddle.",
    voice:"Aoede",volume,tools:MAGIC_TOOLS,maxResumeAttempts:1,maxLiveAttempts:2,
    onToolCall:call=>{
     if(generation.current!==sequence)return {ok:false,error:"stale-session"};
     const {result,duplicate}=applyMagicLiveCall(worldRef.current,call,toolResultsRef.current,zh?"zh":"en");
     if(!duplicate&&result.ok){worldRef.current=result.world;setWorld(result.world);}
     return {ok:result.ok,event:result.event,chapter:result.world.chapter,
      duplicate,...(result.ok?{}:{error:result.event})};
    },
    onToolsUnavailable:()=>{if(generation.current===sequence){
     setToolsAvailable(false);
     setNotice(t("可以繼續聊天，也可以點擊下方魔法來改變世界。","You can still chat or tap a spell to change the world."));
    }},
    onStatus:msg=>{if(generation.current===sequence&&msg&&msg.length<180)setNotice(msg)},
    onState:state=>{if(generation.current!==sequence)return;
     if(state==="ready")setVoiceState("listening");
     if(state==="error")failSession(t("連線中斷，請重新開始。","Connection lost. Please reconnect."));
    },
    onSpeaking:now=>{if(generation.current===sequence)setVoiceState(now?"speaking":"listening")},
    onMicMuted:()=>{if(generation.current===sequence)setMuted(Boolean(sessionRef.current?.micMuted))},
    onInputTranscript:value=>{if(generation.current===sequence)setHeard(value.slice(0,240))},
    onOutputTranscript:value=>{if(generation.current===sequence)setSaid(value.slice(0,240))},
    onError:()=>failSession(t("語音暫時無法使用。你仍可以點擊魔法試玩。","Voice is unavailable right now. You can still try the spells.")),
    onTerminal:()=>{if(generation.current===sequence&&sessionRef.current){
     sessionRef.current=null;setVoiceState("idle");
    }}
   });
   sessionRef.current=session;
   await session.start();
   if(generation.current!==sequence||sessionRef.current!==session){
    await session.stop({reason:"stale",silentStatus:true,emitTerminal:false});return;
   }
   if(!session.ready||!session.running){
    failSession(t("語音連線未能完成，請再試一次。","The voice connection did not finish. Please retry."));
    return;
   }
   setVoiceState("listening");
   setNotice("");
  }catch{
   failSession(t("連線失敗，請確認麥克風與網路後再試。","Could not connect. Check your microphone and connection."));
  }finally{
   if(generation.current===sequence)setStarting(false);
  }
 }
 function answer(choice:MagicChoice){
  const before=worldRef.current.challenge;
  const outcome=runCommand("answer_challenge",{choice});
  if(outcome.ok&&before){
   const success=choice===before.correct;
   sessionRef.current?.sendControl?.("The player selected answer "+choice+" on the on-screen riddle. It was "+(success?"correct.":"incorrect.")+" Respond briefly in character. The interface already resolved the choice. Do not call answer_challenge again.");
  }
 }
 function selectPanel(panelId:number,choice:MagicChoice){
  const result=runCommand("select_magic_panel",{panel_id:panelId,choice});
  if(result.ok)sessionRef.current?.sendControl?.("The player tapped choice "+choice+" in a magic panel. Respond in character to the selection, but do not call select_magic_panel again.");
 }
 function interact(kind:MagicObjectKind){
  if(kind==="chest"){runDemo("puzzle");return}
  if(kind==="portal"){runCommand("change_world",{theme:worldRef.current.theme==="sky"?"forest":"sky"});return}
  if(kind==="dragon"){runCommand("cast_spell",{spell:"fire"});return}
  runCommand("cast_spell",{spell:"sparkles"});
 }
 function submitInput(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const message=input.trim();
  if(!message)return;
  const session=sessionRef.current;
  if(!session?.running){
   setNotice(t("請先開啟語音，或點擊下方的魔法試玩。","Start the live connection first, or try a spell below."));
   return;
  }
  if(session.sendText(message)){setHeard(message.slice(0,240));setInput("");setNotice("");}
  else setNotice(t("目前無法傳送，請重新連線。","Could not send that. Try reconnecting."));
 }
 const isOnline=voiceState==="speaking"||voiceState==="listening";
 return <main className="magic-page">
  <header className="magic-header">
   <div>
    <span className="magic-eyebrow">CREW MAGIC <span>· BETA</span></span>
    <h1>{t("讓你的想像變成世界","Speak a world into existence")}</h1>
    <p>{t("和 Lumi 說話，召喚奇蹟，讓眼前的島嶼跟著想像改變。","Talk with Lumi, cast a spell and watch your world come alive.")}</p>
   </div>
   <Link className="magic-back" to="/explore">← {t("探索","Explore")}</Link>
  </header>
  <div className="magic-layout">
   <section className={"magic-stage theme-"+world.theme+" time-"+world.time+" weather-"+world.weather+(has3D?" is-3d":"")}
    aria-label={t("即時魔法世界","Live magic world")}>
    {has3D?<MagicRenderBoundary onFailure={fail3D}>
     <Suspense fallback={<div className="magic-3d-loading" role="status">{t("正在建造魔法世界…","Building your magic world…")}</div>}>
      <MagicScene3D world={world} reducedMotion={reducedMotion} onInteract={interact} onFailure={fail3D}/>
     </Suspense>
    </MagicRenderBoundary>:null}
    <div className="magic-moon" aria-hidden="true"/>
    <div className="magic-sun" aria-hidden="true"/>
    <div className="magic-stars" aria-hidden="true">{Array.from({length:22},(_,i)=><i key={i} style={{left:((i*37)%97+1)+"%",top:((i*23)%59+1)+"%"}}/>)}</div>
    <div className="magic-cloud cloud-a" aria-hidden="true"/><div className="magic-cloud cloud-b" aria-hidden="true"/>
    <div className="magic-cloud cloud-c" aria-hidden="true"/>
    <div className="magic-distant distant-left" aria-hidden="true"/>
    <div className="magic-distant distant-right" aria-hidden="true"/>
    {world.weather==="rain"||world.weather==="snow"?<div className="magic-precipitation" aria-hidden="true">
     {Array.from({length:24},(_,i)=><i key={i} style={{left:((i*41)%100)+"%",animationDelay:"-"+(i%8)+"s"}}/> )}
    </div>:null}
    <div className="magic-island" aria-hidden="true">
     <div className="magic-island-glow"/>
     <div className="magic-island-grass"/>
     <div className="magic-island-earth"/>
     <div className="magic-path"/>
     <div className="magic-castle">
      <span className="magic-tower tower-left"><i/></span><span className="magic-tower tower-right"><i/></span>
      <span className="magic-palace"><i/><b/></span>
      <span className="magic-castle-roof"/>
     </div>
     <span className="magic-island-tree tree-left">🌲</span><span className="magic-island-tree tree-right">🌲</span>
    </div>
    <div className="magic-object-layer">
     {world.objects.map(obj=>{
      const [x,y]=SPOTS[obj.slot];
      const style={"--magic-x":x+"%","--magic-y":y+"%"} as CSSProperties;
      return <button key={obj.id} type="button" className={"magic-object kind-"+obj.kind}
       style={style} title={zh?OBJECT_LABELS[obj.kind][0]:OBJECT_LABELS[obj.kind][1]}
       aria-label={t("和","Interact with ")+(zh?OBJECT_LABELS[obj.kind][0]:OBJECT_LABELS[obj.kind][1])}
       onClick={()=>interact(obj.kind)}>
       <span aria-hidden="true">{OBJECT_ICONS[obj.kind]}</span>
      </button>;
     })}
    </div>
    {world.effect?<div key={world.revision} className={"magic-effect effect-"+world.effect} aria-hidden="true">
     <i/><i/><i/><i/><i/><i/>
    </div>:null}
    <div className="magic-stage-heading"><span className="magic-stage-dot"/>{t("魔法島 · ","Magic Island · ")}{world.time==="night"?t("星夜","Starlight"):t("白晝","Daylight")}</div>
    <button className="magic-view-switch" type="button" onClick={()=>setUseThreeWorld(v=>threeFailed?false:!v)}
     disabled={threeFailed} aria-label={has3D?t("切換簡易地圖","Switch to simple world"):t("切換 3D 世界","Switch to 3D world")}>
     {has3D?t("切換 2D","2D mode"):threeFailed?t("簡易模式","Simple world"):t("切換 3D","3D mode")}
    </button>
    <div className="magic-stage-dock" aria-label={t("語音魔法操作","Voice magic controls")}>
     {isOnline||voiceState==="connecting"?<>
      <span className={"magic-dock-state"+(voiceState==="speaking"?" speaking":"")} aria-live="polite">{voiceState==="speaking"?t("Lumi 說話中","Lumi speaks"):voiceState==="connecting"?t("連線中","Connecting"):t("聆聽中","Listening")}</span>
      {isOnline&&<button type="button" onClick={()=>{sessionRef.current?.toggleMic();setMuted(Boolean(sessionRef.current?.micMuted));}} aria-pressed={muted}
       aria-label={muted?t("開啟麥克風","Unmute microphone"):t("麥克風靜音","Mute microphone")}>{muted?"◌":"●"}</button>}
      <button type="button" onClick={()=>void stopVoice()} aria-label={t("結束語音","End voice")}>×</button>
     </>:hasKey?
      <button type="button" disabled={starting} onClick={()=>void startVoice()}>◉ {t("和 Lumi 說話","Talk to Lumi")}</button>:
      <Link to="/settings">◉ {t("設定語音","Set up voice")}</Link>}
    </div>
    <div className="magic-story" role="status" aria-live="polite">
     <span>{t("冒險篇章","Chapter")} {world.chapter.toString().padStart(2,"0")}</span>
     <p>{world.message}</p>
    </div>
    <MagicMobileInteraction challenge={world.challenge} panels={world.panels} zh={zh}
     onAnswer={answer} onSelect={selectPanel}/>
   </section>
   <aside className="magic-panel">
    <section className="magic-guide-card">
     <div className="magic-guide-row">
      <span className={"magic-lumi"+(voiceState==="speaking"?" is-speaking":"")} aria-hidden="true">✦</span>
      <div className="magic-guide-text">
       <strong>Lumi <span>{t("· 魔法嚮導","· your magic guide")}</span></strong>
       <small role="status">{voiceState==="speaking"?t("Lumi 正在說話","Lumi is speaking"):
        voiceState==="listening"?t("正在聆聽你的願望","Listening to your wish"):
        voiceState==="connecting"?t("正在連線…","Connecting…"):
        voiceState==="error"?t("暫時離線","Connection lost"):t("等你一起創造世界","Ready to make magic")}</small>
      </div>
     </div>
     <p className="magic-guide-lead">{t("「今天想讓這座島發生什麼奇蹟？」","“What wonderful thing should happen to our island?”")}</p>
     <div className="magic-voice-actions">
      {isOnline||voiceState==="connecting"?
       <button type="button" className="magic-primary magic-end" onClick={()=>void stopVoice()}>{t("結束對話","End conversation")}</button>:
       <button type="button" className="magic-primary" disabled={starting} onClick={()=>void startVoice()}>
        <span aria-hidden="true">◉</span> {starting?t("連線中…","Connecting…"):t("開啟語音魔法","Start voice magic")}
       </button>}
      {isOnline?<button type="button" className="magic-secondary" onClick={()=>{sessionRef.current?.toggleMic();setMuted(Boolean(sessionRef.current?.micMuted));}} aria-pressed={muted}>
       {muted?t("開啟麥克風","Unmute"):t("麥克風靜音","Mute")}
      </button>:null}
     </div>
     {isOnline&&<label className="magic-volume">{t("Lumi 音量","Lumi volume")} <input aria-label={t("調整 Lumi 音量","Lumi volume")} type="range" min="0" max="150" step="5"
      value={volume} onChange={event=>{const value=Number(event.target.value);setVolume(value);sessionRef.current?.setVolume(value)}}/>
      <output>{volume}%</output></label>}
     {!hasKey&&<Link className="magic-settings" to="/settings">{t("設定語音連線","Set up voice connection")} →</Link>}
     {!toolsAvailable&&<p className="magic-muted">{t("語音可以繼續；畫面互動仍可透過下方魔法使用。","Voice can continue; use the spells below to change the scene.")}</p>}
     {notice&&<p className="magic-notice" role="status">{notice}</p>}
     {isOnline&&(heard||said)&&<div className="magic-transcripts">
      {heard&&<p><b>{t("你","You")}:</b> {heard}</p>}
      {said&&<p><b>Lumi:</b> {said}</p>}
     </div>}
    </section>
    {has3D&&world.objects.length>0?<section className="magic-3d-access" aria-label={t("世界中的魔法物件","Objects in the world")}>
     <strong>{t("探索島上的魔法物件","Explore the creatures and objects")}</strong>
     <div>{world.objects.map(obj=><button type="button" key={obj.id} onClick={()=>interact(obj.kind)}>
      {OBJECT_ICONS[obj.kind]} {zh?OBJECT_LABELS[obj.kind][0]:OBJECT_LABELS[obj.kind][1]}
     </button>)}</div>
    </section>:null}
    {world.challenge?<MagicChallengeCard challenge={world.challenge} zh={zh} onAnswer={answer}/>:null}
    {world.panels.map(panel=><MagicGeneratedCard key={panel.id} panel={panel} zh={zh} onSelect={selectPanel}/>)}
    <section className="magic-actions" aria-label={t("快速施法","Quick magic spells")}>
     <div className="magic-actions-title"><h2>{t("說出願望，或先試試魔法","Make a wish or try a spell")}</h2>
      <button type="button" onClick={()=>setShowGuide(v=>!v)} aria-expanded={showGuide}>{t("玩法","How to play")} ⓘ</button></div>
     {showGuide&&<p className="magic-help">{t("點選下方魔法可直接改變世界；連線後也能用語音或打字自由下指令。點擊島上的生物與物件，看看會發生什麼。","Tap a spell to change your world instantly. Connect to Lumi for open-ended voice or text requests. Tap creatures and objects to interact.")}</p>}
     <div className="magic-spell-grid">
      {HELPERS.map(item=><button key={item.id} type="button" onClick={()=>runDemo(item.id)}>
       <span aria-hidden="true">{item.emoji}</span><strong>{zh?item.zh:item.en}</strong>
      </button>)}
     </div>
     <form className="magic-prompt" onSubmit={submitInput}>
      <label htmlFor="magic-wish">{t("你想創造什麼？","What would you like to create?")}</label>
      <div><input id="magic-wish" type="text" autoComplete="off" maxLength={180} value={input}
       onChange={event=>setInput(event.target.value)}
       placeholder={t("例如：讓天空下雪，召喚貓頭鷹…","e.g. Make it snow, summon an owl…")}/>
       <button type="submit" disabled={!input.trim()||!isOnline} aria-label={t("送出願望","Send wish")}>➤</button></div>
     </form>
     <button type="button" className="magic-reset" onClick={()=>{
      if(window.confirm(t("要重新開始這座魔法島嗎？","Start the magic world over?")))runDemo("reset");
     }}>{t("重新創造世界","Start a new world")} ↻</button>
    </section>
   </aside>
  </div>
 </main>;
}
