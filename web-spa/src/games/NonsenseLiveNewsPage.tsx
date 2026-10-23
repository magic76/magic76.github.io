import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {trackUsageEvent} from "../analytics/usage";
import {geminiKey} from "../lib/runtime";
import {NonsenseNewsStage} from "./NonsenseNewsStage";
import {startNonsenseNewsLive,type NewsLiveController} from "./nonsenseNewsLive";
import {openingNewsScene,nextNewsScene,type NewsScene,type NewsTurn} from "./nonsenseNewsEngine";
import {renderNewsEndingCard,shareNewsEnding} from "./nonsenseNewsShare";
import {nonsenseCategories,pickNonsenseTopic,type NonsenseLanguage,type NonsenseTopic} from "./nonsenseTopics";
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
 const [topic,setTopic]=useState<NonsenseTopic>(()=>pickNonsenseTopic("all"));
 const [mode,setMode]=useState<Mode>("voice");
 const [status,setStatus]=useState<Status>("setup");
 const [scene,setScene]=useState<NewsScene>(()=>openingNewsScene(pickNonsenseTopic("all"),"zh"));
 const [turns,setTurns]=useState<NewsTurn[]>([]);
 const [answer,setAnswer]=useState("");
 const [hostDraft,setHostDraft]=useState("");
 const [playerDraft,setPlayerDraft]=useState("");
 const [aiSpeaking,setAiSpeaking]=useState(false);
 const [muted,setMuted]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [preview,setPreview]=useState("");
 const [shareNotice,setShareNotice]=useState("");
 const controllerRef=useRef<NewsLiveController|null>(null);
 const sceneRef=useRef(scene),turnsRef=useRef<NewsTurn[]>([]),generationRef=useRef(0),mountedRef=useRef(true);
 const keyReady=typeof window!=="undefined"&&Boolean(geminiKey());
 const setBroadcast=(next:NewsScene)=>{sceneRef.current=next;setScene(next);};
 const dispose=()=>{
  controllerRef.current?.stop();controllerRef.current=null;
  setHostDraft("");setPlayerDraft("");setAiSpeaking(false);setMuted(false);
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
  const next=pickNonsenseTopic(nextCategory,topic.id);setTopic(next);
  setBroadcast(openingNewsScene(next,language));setError("");
 };
 const chooseLanguage=(lang:NonsenseLanguage)=>{
  if(status!=="setup")return;
  setLanguage(lang);setBroadcast(openingNewsScene(topic,lang));
 };
 const reset=()=>{
  ++generationRef.current;dispose();turnsRef.current=[];setTurns([]);
  setStatus("setup");setAnswer("");setError("");setNotice("");setPreview("");setShareNotice("");
  setBroadcast(openingNewsScene(topic,language));
 };
 const recoverEnding=async(stamp:number)=>{
  const last=turnsRef.current.at(-1);
  if(!last)return;
  setStatus("generating");setNotice(L(zh,"正在補上 AI 新聞結局…","Generating the missing ending…"));
  try{
   const next=await nextNewsScene(topic,language,turnsRef.current.slice(0,-1),last.player,true);
   if(!mountedRef.current||stamp!==generationRef.current)return;
   setBroadcast(next);setStatus("finished");setNotice("");setError("");
   trackUsageEvent("game_completed","nonsense");
  }catch{
   if(stamp!==generationRef.current||!mountedRef.current)return;
   setStatus("playing");setNotice("");
   setError(L(zh,"最後一幕產生失敗。可以按「重試結局」，不需要重新說一次。","Could not generate the ending. Retry without repeating your answer."));
  }
 };
 const start=async()=>{
  if(status!=="setup")return;
  if(!geminiKey()){setError(L(zh,"需要先在設定中加入自己的 Gemini Key 才能讓 AI 即時出題。","Add your Gemini Key in settings to play with the AI director."));return;}
  const stamp=++generationRef.current;
  dispose();turnsRef.current=[];setTurns([]);setError("");setNotice("");setAnswer("");
  setBroadcast(openingNewsScene(topic,language));
  trackUsageEvent("game_started","nonsense");
  if(mode==="text"){setStatus("playing");return;}
  setStatus("connecting");
  try{
   const controller=await startNonsenseNewsLive(topic,language,{
    onScene:next=>{if(stamp===generationRef.current&&mountedRef.current)setBroadcast(next);},
    onPlayerTurn:(player,host)=>{
     if(stamp!==generationRef.current||!mountedRef.current)return;
     const next=[...turnsRef.current,{player,host,headline:sceneRef.current.headline}].slice(0,3);
     turnsRef.current=next;setTurns(next);
    },
    onPlayerDraft:text=>{if(stamp===generationRef.current)setPlayerDraft(text);},
    onHostDraft:text=>{if(stamp===generationRef.current)setHostDraft(text);},
    onReady:()=>{if(stamp===generationRef.current)setStatus("playing");},
    onSpeaking:value=>{if(stamp===generationRef.current)setAiSpeaking(value);},
    onDone:()=>{
     if(stamp!==generationRef.current||!mountedRef.current)return;
     controllerRef.current=null;setAiSpeaking(false);setHostDraft("");setPlayerDraft("");
     if(sceneRef.current.type==="finale"){setStatus("finished");trackUsageEvent("game_completed","nonsense");}
     else{setMode("text");void recoverEnding(stamp);}
    },
    onFailure:message=>{
     if(stamp!==generationRef.current||!mountedRef.current)return;
     controllerRef.current=null;setAiSpeaking(false);setMode("text");setMuted(false);
     setNotice(L(zh,"語音已結束，已保留劇情並切換到文字模式。","Voice ended. Story preserved; continuing in text mode."));
     setError(message);
     if(turnsRef.current.length>=3)void recoverEnding(stamp);
     else setStatus("playing");
    }
   });
   if(stamp!==generationRef.current||!mountedRef.current){controller.stop();return;}
   controllerRef.current=controller;
  }catch{
   if(stamp!==generationRef.current||!mountedRef.current)return;
   controllerRef.current=null;setMode("text");setStatus("playing");
   setNotice(L(zh,"麥克風或 Gemini Live 無法啟動，已切換文字玩法。","Microphone or Gemini Live unavailable. Text mode is ready."));
  }
 };
 const switchToText=()=>{
  if(status==="connecting"||status==="playing"){
   ++generationRef.current;dispose();setMode("text");setStatus("playing");
   setNotice(L(zh,"已關閉語音連線；可以打字或使用手機鍵盤語音輸入。","Voice connection closed. Type or use your keyboard's dictation."));
  }
 };
 const submitText=async()=>{
  if(status!=="playing"||mode!=="text"||turnsRef.current.length>=3)return;
  const reply=answer.trim();
  if(reply.length<2){setError(L(zh,"先說點什麼讓主播接招吧！","Say something for the host to react to."));return;}
  const stamp=generationRef.current;
  setStatus("generating");setError("");setNotice("");
  const previous=turnsRef.current;
  const final=previous.length===2;
  try{
   const next=await nextNewsScene(topic,language,previous,reply,final);
   if(stamp!==generationRef.current||!mountedRef.current)return;
   const updated=[...previous,{player:reply,host:next.question||next.ending,headline:sceneRef.current.headline}];
   turnsRef.current=updated;setTurns(updated);setBroadcast(next);setAnswer("");
   setStatus(final?"finished":"playing");
   if(final)trackUsageEvent("game_completed","nonsense");
  }catch{
   if(stamp!==generationRef.current||!mountedRef.current)return;
   setStatus("playing");setError(L(zh,"AI 暫時沒有回應。你剛才輸入的內容已保留，請重試。","AI did not respond. Your answer is saved; try again."));
  }
 };
 const share=async()=>{
  if(status!=="finished"||scene.type!=="finale")return;
  setShareNotice("");
  try{
   const result=await shareNewsEnding({topic:topic[language],scene,language,link:window.location.origin+"/games/nonsense"});
   if(result==="copied")setShareNotice(L(zh,"結局文字已複製。","Ending copied."));
   if(result==="downloaded")setShareNotice(L(zh,"已嘗試儲存分享圖。","Image download requested."));
  }catch{setShareNotice(L(zh,"無法透過系統分享，請使用圖片預覽另存。","Sharing unavailable. Try the preview image."));}
 };
 const showPreview=()=>{
  try{setPreview(renderNewsEndingCard({topic:topic[language],scene,language,link:window.location.origin+"/games/nonsense"}).toDataURL("image/png"));}
  catch{setShareNotice(L(zh,"無法產生分享圖。","Could not generate the share image."));}
 };
 const round=Math.min(3,turns.length+1);
 return <main className="crew-play-page nonsense-news-page">
  <header className="crew-play-game-header news-page-header">
   <Link to="/games" className="crew-play-back">← {L(zh,"全部遊戲","All games")}</Link>
   <span className="crew-play-eyebrow">CREW PLAY · AI IMPROV</span>
   <h1>{L(zh,"荒謬新聞直播","Absurd News Live")}</h1>
   <p>{L(zh,"你說一句，AI 就讓新聞現場更失控。三回合即興救場，不用演講 60 秒。","One reply changes the whole broadcast. Three fast improv rounds, no 60-second speech.")}</p>
  </header>
  <div className="news-game-shell">
   {status==="setup"&&<section className="news-setup" aria-label={L(zh,"遊戲設定","Game setup")}>
    <div className="news-setup-fields">
     <label>{L(zh,"荒謬新聞分類","News category")}<select value={category} onChange={e=>{setCategory(e.target.value);chooseTopic(e.target.value);}}><option value="all">{L(zh,"全部 150 題","All 150 topics")}</option>{nonsenseCategories.map(c=><option key={c.id} value={c.id}>{zh?c.zh:c.en}</option>)}</select></label>
     <label>{L(zh,"互動語言","Game language")}<select value={language} onChange={e=>chooseLanguage(e.target.value as NonsenseLanguage)}><option value="zh">繁體中文</option><option value="en">English</option></select></label>
    </div>
    <div className="news-mode-picker" role="group" aria-label={L(zh,"遊玩方式","Play mode")}>
     <button type="button" className={mode==="voice"?"selected":""} aria-pressed={mode==="voice"} onClick={()=>setMode("voice")}>🎙 {L(zh,"Gemini Live 語音互動","Gemini Live voice")}</button>
     <button type="button" className={mode==="text"?"selected":""} aria-pressed={mode==="text"} onClick={()=>setMode("text")}>⌨️ {L(zh,"文字互動／鍵盤聽寫","Text / keyboard dictation")}</button>
    </div>
    <div className="news-setup-actions"><button type="button" onClick={()=>chooseTopic()}>{L(zh,"換一則新聞","Shuffle premise")}</button><button type="button" className="news-primary" onClick={()=>void start()} disabled={!keyReady}>{L(zh,"進入直播間","Go live")} →</button></div>
    {!keyReady&&<p className="news-key-note">{L(zh,"需要先到設定加入 Gemini API Key。此模式每回合都會呼叫 AI；沒有 Key 時不會產生假新聞回應。","Add a Gemini API Key in settings first. Each turn uses AI; without a Key, no fake AI replies are generated.")}</p>}
   </section>}
   <NonsenseNewsStage scene={scene} zh={zh} round={round} playing={status==="playing"&&mode==="voice"} hostDraft={hostDraft} playerDraft={playerDraft} aiSpeaking={aiSpeaking}/>
   {status!=="setup"&&<section className="news-control-panel">
    {status==="connecting"&&<p role="status">{L(zh,"Gemini Live 連線與麥克風啟動中…","Connecting Gemini Live and opening the microphone…")}</p>}
    {status==="generating"&&<p role="status">{L(zh,"AI 導演正在改寫下一幕…","The AI director is rewriting the next scene…")}</p>}
    {status==="playing"&&mode==="voice"&&<>
     <div className="news-mic-line"><span className={"news-mic-status"+(muted?" muted":"")}>{muted?L(zh,"麥克風已靜音","Mic muted"):aiSpeaking?L(zh,"主播正在說話","Host speaking"):L(zh,"直接說話，AI 會接招","Speak naturally; the host will react")}</span><strong>{L(zh,"已完成","Completed")} {turns.length}/3</strong></div>
     <div className="news-actions"><button type="button" onClick={()=>{const isMuted=controllerRef.current?.mute();if(isMuted!==undefined)setMuted(isMuted);}}>{muted?L(zh,"開啟麥克風","Unmute"):L(zh,"靜音麥克風","Mute")}</button><button type="button" onClick={switchToText}>{L(zh,"改用文字","Switch to text")}</button><button type="button" onClick={reset}>{L(zh,"結束","Exit")}</button></div>
    </>}
    {status==="playing"&&mode==="text"&&turns.length<3&&<form onSubmit={event=>{event.preventDefault();void submitText();}} className="news-reply-form">
     <label htmlFor="news-improv-answer">{L(zh,"你的荒謬回應 · 第 ","Your improv reply · round ")}{round}</label>
     <textarea id="news-improv-answer" value={answer} onChange={e=>setAnswer(e.target.value)} rows={3} maxLength={650} placeholder={L(zh,"講一個離譜但聽起來很合理的理由…","Give the most absurdly convincing explanation…")}/>
     <div className="news-actions"><button className="news-primary" type="submit">{round===3?L(zh,"揭曉結局","Reveal ending"):L(zh,"讓 AI 接招","Make AI react")} →</button><button type="button" onClick={reset}>{L(zh,"退出","Exit")}</button></div>
    </form>}
    {status==="playing"&&mode==="text"&&turns.length>=3&&<div className="news-actions"><button className="news-primary" onClick={()=>void recoverEnding(generationRef.current)}>{L(zh,"重試結局","Retry ending")}</button><button onClick={reset}>{L(zh,"重新開始","Restart")}</button></div>}
    {status==="finished"&&<div className="news-finish-actions">
     <p>{L(zh,"這是你和 AI 即興創造的虛構結局。沒有預設分數，也不會把逐字稿放進分享圖。","A fictional ending you improvised with AI. No made-up scores; no transcript in the share card.")}</p>
     <div className="news-actions"><button className="news-primary" onClick={()=>void share()}>{L(zh,"分享結局圖片","Share ending")}</button><button onClick={showPreview}>{L(zh,"預覽圖片","Preview card")}</button><button onClick={reset}>{L(zh,"再玩一局","Play again")}</button></div>
     {shareNotice&&<p role="status">{shareNotice}</p>}
    </div>}
    {notice&&<p className="news-notice" role="status">{notice}</p>}
    {error&&<p className="news-error" role="alert">{error}</p>}
   </section>}
   {turns.length>0&&<details className="news-history"><summary>{L(zh,"查看本局精彩對話","Replay your replies")} ({turns.length}/3)</summary><ol>{turns.map((turn,i)=><li key={i}><strong>{turn.headline}</strong><p>{L(zh,"你說：","You: ")}{turn.player}</p></li>)}</ol></details>}
   <p className="news-disclaimer">{L(zh,"節目中的新聞、證人、民調及危機皆為 AI 虛構娛樂內容。語音模式由 Gemini Live 同時管理麥克風與主播，失敗可切換文字繼續。","All news, witnesses, polls and crises are fictional AI entertainment. Gemini Live owns both audio directions; text fallback preserves progress.")}</p>
  </div>
  {preview&&<div className="news-preview-backdrop" role="presentation" onClick={()=>setPreview("")}><section role="dialog" aria-modal="true" aria-label={L(zh,"結局圖片預覽","Ending image preview")} onClick={e=>e.stopPropagation()}><div><strong>{L(zh,"分享圖預覽","Share preview")}</strong><button type="button" autoFocus onClick={()=>setPreview("")} aria-label={L(zh,"關閉","Close")}>✕</button></div><img src={preview} alt={scene.ending}/><a href={preview} download="crew-news-ending.png">{L(zh,"儲存圖片","Save image")}</a></section></div>}
 </main>;
}
