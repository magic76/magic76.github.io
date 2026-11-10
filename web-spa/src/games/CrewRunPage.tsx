import {useCallback,useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {getCrewFriend} from "../friends/friendProfiles";
import {FriendAvatar} from "../friends/FriendAvatar";
import {buildFriendSystem} from "../friends/friendMemory";
import {useTeacherStore} from "../store/teacherStore";
import {geminiKey} from "../lib/runtime";
import {useLiveSession} from "../live/useLiveSession";
import {LiveControls} from "../live/LiveControls";
import {GameSpeechBubble} from "./GameSpeechBubble";
import {GameVoicePicker,useGameVoice,resolveGameVoice} from "./GameVoicePicker";
import {trackUsageEvent} from "../analytics/usage";
import "./crewRun.css";

type Phase="ready"|"running"|"paused"|"fork"|"finished";
type Lane=0|1|2;
type Route="roof"|"tunnel";
type ItemKind="star"|"box"|"bar"|"wall";
type Item={id:number;at:number;lane:Lane;kind:ItemKind;passed:boolean};
type Run={
 phase:Phase;distance:number;elapsed:number;lane:Lane;jumpUntil:number;slideUntil:number;
 hits:number;stars:number;items:Item[];nextSpawn:number;forkIndex:number;route:Route|null;won:boolean;
};
const END=570, SPEED=8.1, FORKS=[190,390] as const;
const zoe=getCrewFriend("zoe");
function fresh():Run{return {phase:"ready",distance:0,elapsed:0,lane:1,jumpUntil:0,slideUntil:0,hits:0,stars:0,items:[],nextSpawn:32,forkIndex:0,route:null,won:false}}
function snapshot(s:Run):Run{return {...s,items:s.items.filter(item=>!item.passed&&item.at>s.distance-8).map(item=>({...item}))}}
function parseRoute(speech:string):Route|null{
 const value=speech.toLowerCase();
 if(/\b(rooftop|rooftops|roof|left|upstairs|go up)\b|屋頂|上面|左邊|走左|上去|左側/.test(value))return "roof";
 if(/\b(tunnel|underground|right|downstairs|go down)\b|隧道|地下|右邊|走右|下面|右側/.test(value))return "tunnel";
 return null;
}
function tick(s:Run,dt:number):"hit"|"fork"|"finish"|null{
 if(s.phase!=="running")return null;
 s.elapsed+=dt;
 s.distance=Math.min(END,s.distance+dt*SPEED);
 while(s.nextSpawn<s.distance+88&&s.nextSpawn<END-12){
  const index=Math.floor(s.nextSpawn/16);
  // The player-chosen route changes subsequent obstacle patterns, not just the scenery.
  const routeBias=s.route==="roof"?1:s.route==="tunnel"?2:0;
  const kind:ItemKind=index%5===0?"star":((index+routeBias)%4===0?"wall":(index+routeBias)%3===0?"bar":"box");
  const lane=((index*7+Math.floor(index/3)+routeBias)%3) as Lane;
  s.items.push({id:index,at:s.nextSpawn,lane,kind,passed:false});
  s.nextSpawn+=16;
 }
 let collided=false;
 for(const item of s.items){
  if(item.passed||item.at>s.distance)continue;
  item.passed=true;
  if(item.lane!==s.lane)continue;
  if(item.kind==="star"){s.stars++;continue}
  if((item.kind==="box"&&s.jumpUntil>s.elapsed)||(item.kind==="bar"&&s.slideUntil>s.elapsed))continue;
  s.hits++;collided=true;
 }
 s.items=s.items.filter(item=>item.at>s.distance-14);
 if(s.hits>=3){s.phase="finished";s.won=false;return "finish"}
 if(s.forkIndex<FORKS.length&&s.distance>=FORKS[s.forkIndex]){s.phase="fork";return "fork"}
 if(s.distance>=END){s.phase="finished";s.won=true;return "finish"}
 return collided?"hit":null;
}
function prettyDistance(distance:number){return Math.min(END,Math.floor(distance))}

export function CrewRunPage(){
 const {i18n}=useTranslation("home");
 const zh=Boolean(i18n.resolvedLanguage?.startsWith("zh"));
 const [view,setView]=useState<Run>(fresh);
 const state=useRef<Run>(fresh());
 const [subtitle,setSubtitle]=useState(zh?"Zoe：準備好了嗎？我們一起跑！":"Zoe: Ready? Let's run!");
 const [lastReply,setLastReply]=useState("");
 const [cue,setCue]=useState({id:0,text:""});
 const delivered=useRef(0);
 const seenSpeech=useRef(new Set<string>());
 const touchStart=useRef<{x:number;y:number}|null>(null);
 const started=useRef(false),completed=useRef(false);
 const [voiceActive,setVoiceActive]=useState(false);
 const targetLanguage=useTeacherStore(s=>s.targetLanguage);
 const nativeLanguage=useTeacherStore(s=>s.nativeLanguage);
 const friendMode=useTeacherStore(s=>s.friendChatMode);
 const {gameVoice,setGameVoice}=useGameVoice();
 const english=Boolean(i18n.resolvedLanguage?.startsWith("en"));
 const keyAvailable=Boolean(geminiKey());
 const display=useCallback(()=>setView(snapshot(state.current)),[]);
 const announce=useCallback((line:string,event:string)=>{
  setSubtitle("Zoe: "+line);
  // Only verified, public game events are sent to AI. The local engine owns all outcomes.
  setCue(previous=>({id:previous.id+1,text:event}));
 },[]);
 const chooseRoute=useCallback((route:Route)=>{
  const s=state.current;
  if(s.phase!=="fork")return;
  const fork=s.forkIndex+1;
  s.route=route;s.forkIndex++;s.phase="running";
  display();
  const label=route==="roof"?"rooftops":"tunnel";
  announce(route==="roof"?"Rooftops it is. Watch your step!":"Tunnel it is. Stay close!",
   "At fork "+fork+" the PLAYER CHOSE "+label+". The engine committed this route. React with one short in-character comment and then listen.");
 },[announce,display]);
 const chooseRef=useRef(chooseRoute);
 chooseRef.current=chooseRoute;
 const system=buildFriendSystem(zoe,targetLanguage,nativeLanguage,friendMode)+
  "\n[CREW RUN GAME] You are Zoe, a witty running companion. This is an exciting 70-second endless-runner game, not a formal lesson. Talk naturally and briefly in the learner's selected target language. The player can chat freely; follow their topic when safe. Keep responses short enough to hear while running. The local game engine alone determines obstacles, collisions, health, distance, score and routes. Never invent game outcomes, claim to control the game, or say an unconfirmed route is chosen. At a fork the game visibly PAUSES; the player can say 'rooftops/left' or 'tunnel/right', or tap a button. Only the player's recognized speech or a button can commit a choice; you do not control the route. For [VERIFIED GAME] messages, react to the supplied actual result in one brief playful sentence. Do not persist friend memories or reveal API keys.";
 const live=useLiveSession({
  pageKey:"crew-run-zoe",title:"Crew Run · Zoe",system,
  openingPrompt:"Give one energetic one-sentence invitation to run with you. Then listen.",
  voice:resolveGameVoice(gameVoice,zoe.voice),language:targetLanguage,nativeLanguage,
  sessionKind:"friend",persistHistory:false,teacherReport:false,
  onTurnComplete:(turn,completed)=>{
   if(turn.output?.trim())setLastReply(turn.output.trim());
   const input=[...completed].reverse().find(entry=>entry.input?.trim())?.input?.trim();
   if(!input||state.current.phase!=="fork")return;
   const gate=state.current.forkIndex;
   const key=gate+":"+input.toLowerCase();
   if(seenSpeech.current.has(key))return;
   seenSpeech.current.add(key);
   const route=parseRoute(input);
   if(route)chooseRef.current(route);
  }
 });
 useEffect(()=>{trackUsageEvent("game_open","crew-run");document.body.classList.add("teacher-theme");
  return()=>document.body.classList.remove("teacher-theme");
 },[]);
 useEffect(()=>{
  const active=["requesting-mic","connecting","listening","speaking"].includes(live.state);
  setVoiceActive(active);
  if(!active)delivered.current=cue.id;
  if(live.state==="listening"&&cue.id>delivered.current&&live.sendText("[VERIFIED GAME] "+cue.text))delivered.current=cue.id;
 },[cue,live.state,live.sendText]);
 const action=useCallback((move:"left"|"right"|"jump"|"slide")=>{
  const s=state.current;if(s.phase!=="running")return;
  if(move==="left")s.lane=Math.max(0,s.lane-1) as Lane;
  else if(move==="right")s.lane=Math.min(2,s.lane+1) as Lane;
  else if(move==="jump"){s.jumpUntil=s.elapsed+0.92;s.slideUntil=0}
  else{s.slideUntil=s.elapsed+0.9;s.jumpUntil=0}
  display();
 },[display]);
 const start=useCallback(()=>{
  if(state.current.phase!=="ready"&&state.current.phase!=="paused")return;
  if(!started.current){started.current=true;trackUsageEvent("game_started","crew-run")}
  state.current.phase="running";display();
 },[display]);
 const reset=useCallback(()=>{
  state.current=fresh();started.current=false;completed.current=false;seenSpeech.current.clear();
  setSubtitle(zh?"Zoe：這次我們跑遠一點！":"Zoe: Let's go farther this time!");
  setLastReply("");display();
 },[zh,display]);
 useEffect(()=>{
  const keydown=(event:KeyboardEvent)=>{
   if(event.target instanceof HTMLElement&&["INPUT","TEXTAREA","SELECT"].includes(event.target.tagName))return;
   const actions:Record<string,"left"|"right"|"jump"|"slide">={
    ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right",ArrowUp:"jump",w:"jump"," ":"jump",ArrowDown:"slide",s:"slide"
   };
   const move=actions[event.key];
   if(move){event.preventDefault();action(move)}
  };
  window.addEventListener("keydown",keydown);
  return()=>window.removeEventListener("keydown",keydown);
 },[action]);
 useEffect(()=>{
  let raf=0,last=0,lastPaint=0;
  const step=(now:number)=>{
   if(last){
    const event=tick(state.current,Math.min((now-last)/1000,0.05));
    if(event==="hit")announce("Ouch! Keep going!","The player just hit an obstacle. Current hits: "+state.current.hits+" of 3. React once briefly; do not change the score.");
    if(event==="fork")announce("Quick! Rooftops or tunnel?","The game has PAUSED at fork "+(state.current.forkIndex+1)+". Ask the player whether to take the ROOFTOPS (left) or TUNNEL (right). Do not claim they chose until the game confirms it.");
    if(event==="finish"){
     if(!completed.current){completed.current=true;trackUsageEvent("game_completed","crew-run")}
     const s=state.current;
     announce(s.won?"We made it! That was awesome!":"No worries! Let's try another run!",
      "Verified game over. "+(s.won?"The player FINISHED the run.":"The player hit 3 obstacles and the run ended.")+
      " Distance "+prettyDistance(s.distance)+"m, stars "+s.stars+". Congratulate or encourage in one sentence. Do not invent a different result.");
    }
   }
   if(now-lastPaint>70){display();lastPaint=now}
   last=now;raf=window.requestAnimationFrame(step);
  };
  raf=window.requestAnimationFrame(step);
  return()=>window.cancelAnimationFrame(raf);
 },[announce,display]);
 const progress=Math.min(100,view.distance/END*100);
 const jump=view.jumpUntil>view.elapsed,slide=view.slideUntil>view.elapsed;
 return <main className="crew-run-page">
  <header className="crew-run-header">
   <Link to="/games">← {zh?"所有遊戲":"All games"}</Link>
   <div><span>CREW PLAY · RUN TOGETHER</span><h1>Crew Run</h1><p>{zh?"和 Zoe 一起跑酷，聊天決定冒險路線":"Run with Zoe. Talk your way through the adventure."}</p></div>
  </header>
  <section className="crew-run-shell" aria-label={zh?"跑酷遊戲":"Runner game"}>
   <div className="crew-run-hud">
    <div><small>{zh?"距離":"Distance"}</small><strong>{prettyDistance(view.distance)} m</strong></div>
    <div><small>{zh?"星星":"Stars"}</small><strong>★ {view.stars}</strong></div>
    <div><small>{zh?"生命":"Lives"}</small><strong>{"♥".repeat(Math.max(0,3-view.hits))}{"♡".repeat(view.hits)}</strong></div>
   </div>
   <div className="crew-run-progress"><span style={{width:progress+"%"}}/></div>
   <div className={"crew-run-scene"+(view.route==="tunnel"?" is-tunnel":"")+(view.route==="roof"?" is-roof":"")}
    aria-label={zh?"向上滑跳躍，向下滑滑行，左右滑換跑道":"Swipe up to jump, down to slide, left or right to change lane"}
    onTouchStart={event=>{touchStart.current={x:event.touches[0].clientX,y:event.touches[0].clientY}}}
    onTouchEnd={event=>{
     const begin=touchStart.current;if(!begin)return;
     const end=event.changedTouches[0],dx=end.clientX-begin.x,dy=end.clientY-begin.y;
     if(Math.max(Math.abs(dx),Math.abs(dy))>26)action(Math.abs(dx)>Math.abs(dy)?dx<0?"left":"right":dy<0?"jump":"slide");
     touchStart.current=null;
    }}>
    <div className="crew-run-sky"><span>✦</span><span>✦</span><span>✧</span></div>
    <div className="crew-run-city"><i/><i/><i/><i/><i/><i/><i/></div>
    <div className="crew-run-road" style={{backgroundPositionY:Math.round(view.distance*14)+"px"}}><span/><span/></div>
    {view.items.filter(item=>item.at>view.distance&&item.at-view.distance<76).map(item=>{
     const depth=1-(item.at-view.distance)/76;
     const x=50+(item.lane-1)*(4+depth*26);
     const y=28+depth*60;
     const icon=item.kind==="star"?"★":item.kind==="box"?"▣":item.kind==="bar"?"▰":"✖";
     return <div key={item.id} className={"crew-run-item kind-"+item.kind} aria-hidden="true"
      style={{left:x+"%",top:y+"%",transform:"translate(-50%,-50%) scale("+(0.35+depth*1.24)+")"}}>{icon}</div>;
    })}
    <div className={"crew-run-runner"+(jump?" is-jumping":"")+(slide?" is-sliding":"")} style={{left:(50+(view.lane-1)*29)+"%"}} aria-hidden="true">
     <div className="crew-run-shadow"/><div className="crew-run-person"><span className="head"/><span className="body"/><span className="legs"/></div>
    </div>
    <div className="crew-run-zoe" aria-hidden="true"><FriendAvatar friend={zoe}/><span>Zoe</span></div>
    {view.phase==="ready"||view.phase==="paused"?<div className="crew-run-overlay">
     <h2>{view.phase==="ready"?(zh?"一起出發吧！":"Ready to run?"):(zh?"暫停中":"Paused")}</h2>
     <p>{zh?"左右閃避、上滑跳躍、下滑滑行":"Swipe left/right, up to jump, down to slide"}</p>
     <button type="button" onClick={start}>{view.phase==="ready"?(zh?"開始跑酷":"Start running"):(zh?"繼續跑":"Resume")}</button>
    </div>:null}
    {view.phase==="fork"?<div className="crew-run-overlay crew-run-fork" role="group" aria-label={zh?"選擇路線":"Choose a route"}>
     <h2>{zh?"Zoe：要走哪邊？":"Zoe: Which way?"}</h2><p>{zh?"可以直接說英文，也可以點選":"Say it aloud or tap a choice"}</p>
     <div><button type="button" onClick={()=>chooseRoute("roof")}>↖ {zh?"屋頂":"Rooftops"}</button>
      <button type="button" onClick={()=>chooseRoute("tunnel")}>↘ {zh?"隧道":"Tunnel"}</button></div>
    </div>:null}
    {view.phase==="finished"?<div className="crew-run-overlay">
     <h2>{view.won?(zh?"成功抵達！":"You made it!"):(zh?"再挑戰一次！":"Try again!")}</h2>
     <p>{prettyDistance(view.distance)} m · ★ {view.stars}</p>
     <button type="button" onClick={reset}>{zh?"再玩一次":"Play again"}</button>
    </div>:null}
   </div>
   <div className="crew-run-commands">
    <button type="button" disabled={view.phase!=="running"} onClick={()=>action("left")} aria-label={zh?"向左":"Left"}>←</button>
    <button type="button" disabled={view.phase!=="running"} onClick={()=>action("jump")}>{zh?"跳":"Jump"} ↑</button>
    <button type="button" disabled={view.phase!=="running"} onClick={()=>action("slide")}>{zh?"滑":"Slide"} ↓</button>
    <button type="button" disabled={view.phase!=="running"} onClick={()=>action("right")} aria-label={zh?"向右":"Right"}>→</button>
    <button className="crew-run-pause" type="button" disabled={view.phase!=="running"} onClick={()=>{state.current.phase="paused";display()}}>{zh?"暫停":"Pause"}</button>
   </div>
   <div className="crew-run-companion"><FriendAvatar friend={zoe}/><p role="status" aria-live="polite">{subtitle}</p></div>
   <div className="crew-run-voice">
    <div className="crew-run-voice-title"><strong>🎙 Zoe · Gemini Live</strong><span>{voiceActive?(zh?"語音已連線":"Voice connected"):(zh?"可選語音陪跑":"Optional voice companion")}</span></div>
    {lastReply&&voiceActive?<GameSpeechBubble text={lastReply} english={english}/>:null}
    <GameVoicePicker value={gameVoice} onChange={setGameVoice} defaultVoice={zoe.voice} disabled={voiceActive} english={english}/>
    {voiceActive?<LiveControls live={live} compact prominentInterrupt/>:
     keyAvailable?<button type="button" className="crew-run-connect" onClick={()=>{delivered.current=cue.id;seenSpeech.current.clear();void live.start()}}>{zh?"開啟 Zoe 即時語音":"Start Zoe Live voice"}</button>:
     <p className="crew-run-voice-note">{zh?"跑酷可直接免費玩；即時 AI 語音目前使用自己的 Gemini Key。":"The runner is free. Live AI voice currently uses your Gemini Key."} <Link to="/settings">{zh?"設定 Gemini Key":"Set up Gemini Key"}</Link></p>}
    {live.state==="error"?<p role="alert" className="crew-run-voice-note">{zh?"語音連線失敗，跑酷仍可正常遊玩。":"Voice connection failed. You can keep playing."} <button type="button" onClick={()=>void live.start()}>{zh?"重試語音":"Retry voice"}</button></p>:null}
    <small>{zh?"說「rooftops」或「tunnel」選路線。AI 不負責判定碰撞與分數。":"Say rooftops or tunnel at a fork. The game engine controls collisions and scoring."}</small>
   </div>
  </section>
 </main>;
}
