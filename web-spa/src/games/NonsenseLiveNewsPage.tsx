import {Arrow} from "../components/Arrow";
import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {trackUsageEvent} from "../analytics/usage";
import {geminiKey} from "../lib/runtime";
import {NonsenseNewsStage} from "./NonsenseNewsStage";
import {startNonsenseNewsLive,type NewsLiveController} from "./nonsenseNewsLive";
import {GameVoicePicker,useGameVoice,resolveGameVoice} from "./GameVoicePicker";
import type {DirectorEvent} from "./nonsenseDirector";
import {openingNewsScene,nextNewsScene,type NewsScene,type NewsTurn} from "./nonsenseNewsEngine";
import {renderNewsEndingCard,shareNewsEnding} from "./nonsenseNewsShare";
import {nonsenseCategories,pickNonsenseTopic,nextNonsenseTopic,customNonsenseTopic,type NonsenseLanguage,type NonsenseTopic} from "./nonsenseTopics";
import "./crewPlay.css";
import "./nonsenseNews.css";

type Status="setup"|"connecting"|"playing"|"generating"|"finished";
type Mode="voice"|"text";
const L=(zh:boolean,a:string,b:string)=>zh?a:b;

export function NonsenseLiveNewsPage(){
 const {i18n}=useTranslation("home");
 const zh=Boolean(i18n.resolvedLanguage?.startsWith("zh"));
 const target=useTeacherStore(s=>s.targetLanguage);
 const [language,setLanguage]=useState<NonsenseLanguage>(/(中文|華語|國語|chinese|mandarin|^zh)/i.test(target)?"zh":"en");
 const [category,setCategory]=useState("all");
 const [customTopic,setCustomTopic]=useState("");
 const [roundCount,setRoundCount]=useState<5|7>(5);
 const [topic,setTopic]=useState<NonsenseTopic>(()=>pickNonsenseTopic("all"));
 const [mode,setMode]=useState<Mode>("voice");
 const {gameVoice,setGameVoice}=useGameVoice();
 const [status,setStatus]=useState<Status>("setup");
 const [scene,setScene]=useState<NewsScene>(()=>openingNewsScene(topic,language));
 const [turns,setTurns]=useState<NewsTurn[]>([]);
 const [answer,setAnswer]=useState("");
 const [hostDraft,setHostDraft]=useState("");
 const [playerDraft,setPlayerDraft]=useState("");
 const [aiSpeaking,setAiSpeaking]=useState(false);
 const [introReady,setIntroReady]=useState(false);
 const [muted,setMuted]=useState(false);
 const [choiceBusy,setChoiceBusy]=useState(false);
 const [directorEvents,setDirectorEvents]=useState<DirectorEvent[]>([]);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [preview,setPreview]=useState("");
 const [shareNotice,setShareNotice]=useState("");
 const controllerRef=useRef<NewsLiveController|null>(null);
 const submittingRef=useRef(false);
 const sceneRef=useRef(scene),turnsRef=useRef<NewsTurn[]>([]),generationRef=useRef(0),mountedRef=useRef(true);
 const activeTopicRef=useRef<NonsenseTopic>(topic);
 const keyReady=typeof window!=="undefined"&&Boolean(geminiKey());
 const liveTopic=category==="custom"&&customTopic.trim()?customNonsenseTopic(customTopic):topic;
 const validCustom=category!=="custom"||customTopic.trim().length>=6;
 const setBroadcast=(next:NewsScene)=>{sceneRef.current=next;setScene(next);};
 const dispose=()=>{
  controllerRef.current?.stop();controllerRef.current=null;
  setHostDraft("");setPlayerDraft("");setAiSpeaking(false);setIntroReady(false);setMuted(false);setChoiceBusy(false);
 };
 useEffect(()=>{
  mountedRef.current=true;trackUsageEvent("game_open","nonsense");
  return()=>{mountedRef.current=false;generationRef.current++;controllerRef.current?.stop();};
 },[]);
 useEffect(()=>{
  if(!preview)return;
  const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setPreview("");};
  window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);
 },[preview]);
 const chooseTopic=(nextCategory=category)=>{
  if(status!=="setup")return;
  if(nextCategory==="custom")return;
  const next=pickNonsenseTopic(nextCategory,topic.id);setTopic(next);
  setBroadcast(openingNewsScene(next,language));setDirectorEvents([]);setError("");
 };
 const chooseLanguage=(lang:NonsenseLanguage)=>{
  if(status!=="setup")return;
  setLanguage(lang);setDirectorEvents([]);setBroadcast(openingNewsScene(liveTopic,lang));
 };
 const reset=()=>{
  ++generationRef.current;dispose();turnsRef.current=[];setTurns([]);submittingRef.current=false;setDirectorEvents([]);
  setStatus("setup");setAnswer("");setError("");setNotice("");setPreview("");setShareNotice("");
  activeTopicRef.current=liveTopic;
  setBroadcast(openingNewsScene(liveTopic,language));
 };
 const recoverEnding=async(stamp:number)=>{
  const last=turnsRef.current.at(-1);
  if(!last)return;
  setStatus("generating");setNotice(L(zh,"正在補上 AI 新聞結局…","Generating the missing ending…"));
  try{
   const next=await nextNewsScene(activeTopicRef.current,language,turnsRef.current.slice(0,-1),last.player,true,roundCount);
   if(!mountedRef.current||stamp!==generationRef.current)return;
   setBroadcast(next);setDirectorEvents([]);setStatus("finished");setNotice("");setError("");
   trackUsageEvent("game_completed","nonsense");
  }catch{
   if(stamp!==generationRef.current||!mountedRef.current)return;
   setStatus("playing");setNotice("");
   setError(L(zh,"最後一幕產生失敗。可以按「重試結局」，不需要重新說一次。","Could not generate the ending. Retry without repeating your answer."));
  }
 };
 const start=async(playTopic:NonsenseTopic=liveTopic)=>{
  if(status!=="setup"&&status!=="finished")return;
  if(!geminiKey()){setError(L(zh,"需要先在設定中加入自己的 Gemini Key 才能讓 AI 即時出題。","Add your Gemini Key in settings to play with the AI director."));return;}
  if(!validCustom){setError(L(zh,"請先輸入至少 6 個字元的自訂新聞題目。","Enter a custom headline of at least 6 characters."));return;}
  const stamp=++generationRef.current;
  activeTopicRef.current=playTopic;
  dispose();turnsRef.current=[];setTurns([]);submittingRef.current=false;setDirectorEvents([]);
  setError("");setNotice("");setAnswer("");setShareNotice("");setPreview("");
  setBroadcast(openingNewsScene(playTopic,language));
  trackUsageEvent("game_started","nonsense");
  if(mode==="text"){setStatus("playing");return;}
  setStatus("connecting");
  try{
   const controller=await startNonsenseNewsLive(playTopic,language,{
    onScene:next=>{if(stamp===generationRef.current&&mountedRef.current){setBroadcast(next);setDirectorEvents([]);}},
    onDirector:event=>{if(stamp===generationRef.current&&mountedRef.current)setDirectorEvents(old=>[...old,event].slice(-2));},
    onChoiceBusy:busy=>{if(stamp===generationRef.current){setChoiceBusy(busy);setMuted(controllerRef.current?.isMuted()??false);}},
    onPlayerTurn:(player,host)=>{
     if(stamp!==generationRef.current||!mountedRef.current)return;
     const next=[...turnsRef.current,{player,host,headline:sceneRef.current.headline}].slice(0,roundCount);
     turnsRef.current=next;setTurns(next);
    },
    onPlayerDraft:text=>{if(stamp===generationRef.current)setPlayerDraft(text);},
    onHostDraft:text=>{if(stamp===generationRef.current)setHostDraft(text);},
    onReady:()=>{if(stamp===generationRef.current){setStatus("playing");setMuted(true);}},
    onIntroReady:()=>{if(stamp===generationRef.current){setIntroReady(true);setMuted(false);setNotice("");}},
    onSpeaking:value=>{if(stamp===generationRef.current)setAiSpeaking(value);},
    onDone:()=>{
     if(stamp!==generationRef.current||!mountedRef.current)return;
     controllerRef.current=null;setAiSpeaking(false);setHostDraft("");setPlayerDraft("");setChoiceBusy(false);
     if(sceneRef.current.type==="finale"){setStatus("finished");trackUsageEvent("game_completed","nonsense");}
     else{setMode("text");void recoverEnding(stamp);}
    },
    onFailure:message=>{
     if(stamp!==generationRef.current||!mountedRef.current)return;
     controllerRef.current=null;setAiSpeaking(false);setMuted(false);setChoiceBusy(false);
     if(sceneRef.current.type==="finale"){
      setStatus("finished");setNotice(L(zh,"結局已揭曉，但主播未能完成語音播報。","The ending is ready, but the anchor could not finish narrating it."));setError("");
      trackUsageEvent("game_completed","nonsense");
      return;
     }
     setMode("text");
     setNotice(L(zh,"語音已結束，已保留劇情並切換到文字模式。","Voice ended. Story preserved; continuing in text mode."));
     setError(message);
     if(turnsRef.current.length>=roundCount)void recoverEnding(stamp);
     else setStatus("playing");
    }
   },resolveGameVoice(gameVoice,"Puck"),roundCount);
   if(stamp!==generationRef.current||!mountedRef.current){controller.stop();return;}
   controllerRef.current=controller;
  }catch{
   if(stamp!==generationRef.current||!mountedRef.current)return;
   controllerRef.current=null;setMode("text");setStatus("playing");
   setNotice(L(zh,"麥克風或 Gemini Live 無法啟動，已切換文字玩法。","Microphone or Gemini Live unavailable. Text mode is ready."));
  }
 };
 const nextBroadcast=()=>{
  if(status!=="finished")return;
  const next=nextNonsenseTopic(activeTopicRef.current,category);
  setCategory(next.category);setTopic(next.topic);
  void start(next.topic);
 };
 const switchToText=()=>{
  if(status==="connecting"||status==="playing"){
   ++generationRef.current;dispose();setMode("text");setStatus("playing");
   setNotice(L(zh,"已關閉語音連線；可以打字或使用手機鍵盤語音輸入。","Voice connection closed. Type or use your keyboard's dictation."));
  }
 };
 const submitText=async(selected?:string)=>{
  if(status!=="playing"||mode!=="text"||turnsRef.current.length>=roundCount||submittingRef.current)return;
  const reply=(selected??answer).trim();
  if(reply.length<2){setError(L(zh,"先說點什麼讓主播接招吧！","Say something for the host to react to."));return;}
  const stamp=generationRef.current;
  submittingRef.current=true;
  setStatus("generating");setError("");setNotice("");
  const previous=turnsRef.current;
  const final=previous.length===roundCount-1;
  try{
   const next=await nextNewsScene(activeTopicRef.current,language,previous,reply,final,roundCount);
   if(stamp!==generationRef.current||!mountedRef.current)return;
   const updated=[...previous,{player:reply,host:next.question||next.ending,headline:sceneRef.current.headline}];
   turnsRef.current=updated;setTurns(updated);setBroadcast(next);setDirectorEvents(next.director?[next.director]:[]);setAnswer("");
   setStatus(final?"finished":"playing");
   if(final)trackUsageEvent("game_completed","nonsense");
  }catch{
   if(stamp!==generationRef.current||!mountedRef.current)return;
   setStatus("playing");setError(L(zh,"AI 暫時沒有回應。你剛才輸入的內容已保留，請重試。","AI did not respond. Your answer is saved; try again."));
  }finally{if(stamp===generationRef.current)submittingRef.current=false;}
 };
 const pickChoice=(value:string)=>{
  if(status!=="playing"||turnsRef.current.length>=roundCount)return;
  if(mode==="text"){void submitText(value);return;}
  if(!introReady||choiceBusy||aiSpeaking)return;
  const selected=controllerRef.current?.choose(value);
  if(selected){setChoiceBusy(true);setMuted(controllerRef.current?.isMuted()??false);setError("");}
  else setNotice(L(zh,"主播正在處理上一句話，請等他說完或直接用語音回答。","Host is processing the previous reply. Try again after the host finishes, or speak."));
 };
 const share=async()=>{
  if(status!=="finished"||scene.type!=="finale")return;
  setShareNotice("");
  try{
   const result=await shareNewsEnding({topic:activeTopicRef.current[language],scene,language,link:window.location.origin+"/games/nonsense"});
   if(result==="copied")setShareNotice(L(zh,"結局文字已複製。","Ending copied."));
   if(result==="downloaded")setShareNotice(L(zh,"已嘗試儲存分享圖。","Image download requested."));
  }catch{setShareNotice(L(zh,"無法透過系統分享，請使用圖片預覽另存。","Sharing unavailable. Try the preview image."));}
 };
 const showPreview=()=>{
  try{setPreview(renderNewsEndingCard({topic:activeTopicRef.current[language],scene,language,link:window.location.origin+"/games/nonsense"}).toDataURL("image/png"));}
  catch{setShareNotice(L(zh,"無法產生分享圖。","Could not generate the share image."));}
 };
 const round=Math.min(roundCount,turns.length+1);
 return <div className="crew-play-page nonsense-news-page">
  <header className="crew-play-game-header news-page-header">
   <Link to="/games" className="crew-play-back"><Arrow direction="left"/> {L(zh,"全部遊戲","All games")}</Link>
   <span className="crew-play-eyebrow">CREW PLAY · AI IMPROV</span>
   <h1>{L(zh,"荒謬新聞直播","Absurd News Live")}</h1>
   <p>{L(zh,"你說一句，AI 就讓新聞現場更失控。自選 5 或 7 回合，最後依你的決策決定救場或翻車。","One reply changes the whole broadcast. Play 5 or 7 rounds with a good or bad ending based on your decisions.")}</p>
  </header>
  <div className="news-game-shell">
   {status==="setup"&&<section className="news-setup" aria-label={L(zh,"遊戲設定","Game setup")}>
    <div className="news-setup-fields">
     <label>{L(zh,"荒謬新聞分類","News category")}<select value={category} onChange={e=>{
      const next=e.target.value;setCategory(next);
      if(next==="custom"){setDirectorEvents([]);setError("");setBroadcast(openingNewsScene(customTopic.trim()?customNonsenseTopic(customTopic):topic,language));}
      else chooseTopic(next);
     }}><option value="all">{L(zh,"全部 150 題","All 150 topics")}</option>{nonsenseCategories.map(c=><option key={c.id} value={c.id}>{zh?c.zh:c.en}</option>)}<option value="custom">{L(zh,"自己寫新聞題目","Custom headline")}</option></select></label>
     <label>{L(zh,"互動語言","Game language")}<select value={language} onChange={e=>chooseLanguage(e.target.value as NonsenseLanguage)}><option value="zh">繁體中文</option><option value="en">English</option></select></label>
    </div>
    {category==="custom"&&<label className="news-custom-topic">{L(zh,"你的虛構新聞題目","Your fictional breaking-news headline")}
     <textarea value={customTopic} maxLength={140} rows={2} onChange={e=>{
      const value=e.target.value;setCustomTopic(value);setError("");
      setBroadcast(openingNewsScene(value.trim()?customNonsenseTopic(value):topic,language));
     }} placeholder={L(zh,"例如：全台灣的電梯宣布罷工，要求週休三日","For example: Every elevator is on strike demanding three-day weekends")}/>
     <small>{L(zh,"至少 6 字元，最多 140 字元。這是虛構劇情，不會發布真正新聞。","6–140 characters. This is fiction, not a real news report.")}</small>
    </label>}
    <fieldset className="news-length-picker"><legend>{L(zh,"直播長度","Broadcast length")}</legend>
     <div>{([5,7] as const).map(count=><button key={count} type="button" aria-pressed={roundCount===count} className={roundCount===count?"selected":""} onClick={()=>setRoundCount(count)}>{count} {L(zh,"回合","rounds")}{count===5?L(zh," · 標準"," · Standard"):L(zh," · 長篇"," · Extended")}</button>)}</div>
    </fieldset>
    {mode==="voice"?<GameVoicePicker value={gameVoice} onChange={setGameVoice} defaultVoice="Puck" english={!zh}/>:null}
    <div className="news-mode-picker" role="group" aria-label={L(zh,"遊玩方式","Play mode")}>
     <button type="button" className={mode==="voice"?"selected":""} aria-pressed={mode==="voice"} onClick={()=>setMode("voice")}>🎙 {L(zh,"Gemini Live 語音互動","Gemini Live voice")}</button>
     <button type="button" className={mode==="text"?"selected":""} aria-pressed={mode==="text"} onClick={()=>setMode("text")}>⌨️ {L(zh,"文字互動／鍵盤聽寫","Text / keyboard dictation")}</button>
    </div>
    <div className="news-setup-actions">{category!=="custom"&&<button type="button" onClick={()=>chooseTopic()}>{L(zh,"換一則新聞","Shuffle premise")}</button>}<button type="button" className="news-primary" onClick={()=>void start()} disabled={!keyReady||!validCustom}>{L(zh,"進入直播間","Go live")} <Arrow/></button></div>
    {!keyReady&&<p className="news-key-note">{L(zh,"需要先到設定加入 Gemini API Key。此模式每回合都會呼叫 AI；沒有 Key 時不會產生假新聞回應。","Add a Gemini API Key in settings first. Each turn uses AI; without a Key, no fake AI replies are generated.")}</p>}
   </section>}
   <NonsenseNewsStage scene={scene} zh={zh} round={round} totalRounds={roundCount} playing={status==="playing"&&mode==="voice"} hostDraft={hostDraft} playerDraft={playerDraft} aiSpeaking={aiSpeaking} directorEvents={directorEvents} choiceDisabled={status!=="playing"||(mode==="voice"&&!introReady)||choiceBusy||aiSpeaking||turns.length>=roundCount} onChoice={pickChoice}/>
   {status!=="setup"&&<section className="news-control-panel">
    {status==="connecting"&&<p role="status">{L(zh,"Gemini Live 連線與麥克風啟動中…","Connecting Gemini Live and opening the microphone…")}</p>}
    {status==="generating"&&<p role="status">{L(zh,"AI 導演正在改寫下一幕…","The AI director is rewriting the next scene…")}</p>}
    {status==="playing"&&mode==="voice"&&<>
     <div className="news-mic-line"><span className={"news-mic-status"+(muted?" muted":"")}>{!introReady?L(zh,"主播正在開場，等他問完第一題再回答","Anchor introducing the story — wait for the first question"):choiceBusy?L(zh,"AI 正在處理你的選項…","AI is handling your choice…"):muted?L(zh,"麥克風已靜音","Mic muted"):aiSpeaking?L(zh,"主播正在說話","Host speaking"):L(zh,"直接說話，AI 會接招","Speak naturally; the host will react")}</span><strong>{L(zh,"已完成","Completed")} {turns.length}/{roundCount}</strong></div>
     <div className="news-actions"><button type="button" disabled={!introReady||choiceBusy} onClick={()=>{const isMuted=controllerRef.current?.mute();if(isMuted!==undefined)setMuted(isMuted);}}>{muted?L(zh,"開啟麥克風","Unmute"):L(zh,"靜音麥克風","Mute")}</button><button type="button" onClick={switchToText}>{L(zh,"改用文字","Switch to text")}</button><button type="button" onClick={reset}>{L(zh,"結束","Exit")}</button></div>
    </>}
    {status==="playing"&&mode==="text"&&turns.length<roundCount&&<form onSubmit={event=>{event.preventDefault();void submitText();}} className="news-reply-form">
     <label htmlFor="news-improv-answer">{L(zh,"你的荒謬回應 · 第 ","Your improv reply · round ")}{round}</label>
     <textarea id="news-improv-answer" value={answer} onChange={e=>setAnswer(e.target.value)} rows={3} maxLength={650} placeholder={L(zh,"講一個離譜但聽起來很合理的理由…","Give the most absurdly convincing explanation…")}/>
     <div className="news-actions"><button className="news-primary" type="submit">{round===roundCount?L(zh,"揭曉結局","Reveal ending"):L(zh,"讓 AI 接招","Make AI react")} <Arrow/></button><button type="button" onClick={reset}>{L(zh,"退出","Exit")}</button></div>
    </form>}
    {status==="playing"&&mode==="text"&&turns.length>=roundCount&&<div className="news-actions"><button className="news-primary" onClick={()=>void recoverEnding(generationRef.current)}>{L(zh,"重試結局","Retry ending")}</button><button onClick={reset}>{L(zh,"重新開始","Restart")}</button></div>}
    {status==="finished"&&<div className="news-finish-actions">
     <div className="news-actions"><button className="news-primary" type="button" onClick={nextBroadcast}>{L(zh,"下一則新聞","Next news story")} <Arrow/></button><button type="button" onClick={()=>void share()}>{L(zh,"分享結局圖片","Share ending")}</button><button type="button" onClick={showPreview}>{L(zh,"預覽圖片","Preview card")}</button><button type="button" onClick={reset}>{L(zh,"重新設定","Change settings")}</button></div>
     {shareNotice&&<p role="status">{shareNotice}</p>}
    </div>}
    {notice&&<p className="news-notice" role="status">{notice}</p>}
    {error&&<p className="news-error" role="alert">{error}</p>}
   </section>}
   {turns.length>0&&<details className="news-history"><summary>{L(zh,"查看本局精彩對話","Replay your replies")} ({turns.length}/{roundCount})</summary><ol>{turns.map((turn,i)=><li key={i}><strong>{turn.headline}</strong><p>{L(zh,"你說：","You: ")}{turn.player}</p></li>)}</ol></details>}
   <p className="news-disclaimer">{L(zh,"節目中的新聞、證人、民調及危機皆為 AI 虛構娛樂內容。語音模式由 Gemini Live 同時管理麥克風與主播，失敗可切換文字繼續。","All news, witnesses, polls and crises are fictional AI entertainment. Gemini Live owns both audio directions; text fallback preserves progress.")}</p>
  </div>
  {preview&&<div className="news-preview-backdrop" role="presentation" onClick={()=>setPreview("")}><section role="dialog" aria-modal="true" aria-label={L(zh,"結局圖片預覽","Ending image preview")} onClick={e=>e.stopPropagation()}><div><strong>{L(zh,"分享圖預覽","Share preview")}</strong><button type="button" autoFocus onClick={()=>setPreview("")} aria-label={L(zh,"關閉","Close")}>✕</button></div><img src={preview} alt={scene.ending}/><a href={preview} download="crew-news-ending.png">{L(zh,"儲存圖片","Save image")}</a></section></div>}
 </div>;
}
