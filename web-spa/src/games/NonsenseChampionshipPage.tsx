import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {trackUsageEvent} from "../analytics/usage";
import {geminiKey} from "../lib/runtime";
import {GamePanel} from "./GamePanel";
import {judgeNonsense,type NonsenseVerdict} from "./nonsenseJudge";
import {nonsenseCategories,nonsenseHints,nonsenseJudges,pickNonsenseTopic,type NonsenseJudgeId,type NonsenseLanguage,type NonsenseTopic} from "./nonsenseTopics";
import "./nonsenseChampionship.css";

type Phase="setup"|"prep"|"speaking"|"review"|"judging"|"result";
type RecognitionResult={isFinal:boolean;0:{transcript:string}};
type RecognitionEvent={results:{length:number;[index:number]:RecognitionResult}};
type RecognitionInstance={
 lang:string;continuous:boolean;interimResults:boolean;
 onresult:((event:RecognitionEvent)=>void)|null;
 onerror:((event:{error:string})=>void)|null;
 onend:(()=>void)|null;
 start:()=>void;stop:()=>void;abort:()=>void;
};
type RecognitionConstructor=new()=>RecognitionInstance;
function speechConstructor():RecognitionConstructor|undefined{
 const browser=window as Window&{SpeechRecognition?:RecognitionConstructor;webkitSpeechRecognition?:RecognitionConstructor};
 return browser.SpeechRecognition||browser.webkitSpeechRecognition;
}
const L=(zh:boolean,a:string,b:string)=>zh?a:b;
function clock(seconds:number){return String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0")}
const judgeNames:Record<NonsenseJudgeId,{zh:string;en:string}>={
 stern:{zh:"鐵面法官",en:"Stern Judge"},roast:{zh:"毒舌主持人",en:"Roast Host"},
 scientist:{zh:"瘋狂科學家",en:"Mad Scientist"},queen:{zh:"傲嬌女王",en:"Proud Queen"}
};

export function NonsenseChampionshipPage(){
 const {i18n}=useTranslation("home");
 const zh=Boolean(i18n.resolvedLanguage?.startsWith("zh"));
 const target=useTeacherStore(s=>s.targetLanguage);
 const [language,setLanguage]=useState<NonsenseLanguage>(/(中文|華語|國語|chinese|mandarin|^zh)/i.test(target)?"zh":"en");
 const [category,setCategory]=useState("all");
 const [judgeId,setJudgeId]=useState<NonsenseJudgeId>("stern");
 const [topic,setTopic]=useState<NonsenseTopic>(()=>pickNonsenseTopic("all"));
 const [phase,setPhase]=useState<Phase>("setup");
 const [prepLeft,setPrepLeft]=useState(10),[timeLeft,setTimeLeft]=useState(60);
 const [heard,setHeard]=useState(""),[manual,setManual]=useState(""),[draft,setDraft]=useState("");
 const [micActive,setMicActive]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 const [verdict,setVerdict]=useState<NonsenseVerdict|null>(null),[copied,setCopied]=useState(false);
 const recognitionRef=useRef<RecognitionInstance|null>(null);
 const heardRef=useRef(""),manualRef=useRef("");
 const deadlineRef=useRef(0),prepDeadlineRef=useRef(0);
 const phaseRef=useRef<Phase>("setup"),requestRef=useRef(0),mountedRef=useRef(true);
 const categoryLabel=nonsenseCategories.find(c=>c.id===topic.category);
 const currentJudge=nonsenseJudges.find(j=>j.id===judgeId)||nonsenseJudges[0];
 const canRecognize=typeof window!=="undefined"&&Boolean(speechConstructor());
 const chooseTopic=()=>{
  setTopic(previous=>pickNonsenseTopic(category,previous.id));
  setError("");setNotice("");setVerdict(null);
 };
 const teardownMic=()=>{
  const recognition=recognitionRef.current;
  recognitionRef.current=null;
  if(recognition){
   recognition.onresult=null;recognition.onerror=null;recognition.onend=null;
   try{recognition.abort()}catch{/* May have already stopped */}
  }
  setMicActive(false);
 };
 useEffect(()=>{
  mountedRef.current=true;trackUsageEvent("game_open","nonsense");
  return()=>{mountedRef.current=false;requestRef.current++;const instance=recognitionRef.current;
   if(instance){instance.onresult=null;instance.onerror=null;instance.onend=null;try{instance.abort()}catch{/* disposed */}}};
 },[]);
 useEffect(()=>{phaseRef.current=phase},[phase]);
 useEffect(()=>{
  if(phase!=="prep")return;
  const sync=()=>setPrepLeft(Math.max(0,Math.ceil((prepDeadlineRef.current-Date.now())/1000)));
  sync();const id=window.setInterval(sync,200);return()=>clearInterval(id);
 },[phase]);
 useEffect(()=>{
  if(phase!=="speaking")return;
  const sync=()=>{
   const left=Math.max(0,Math.ceil((deadlineRef.current-Date.now())/1000));
   setTimeLeft(left);
   if(left===0)finishSpeech();
  };
  sync();const id=window.setInterval(sync,180);return()=>clearInterval(id);
 // finishSpeech operates on stable refs; the timer is intentionally owned by phase.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[phase]);
 const beginPrep=()=>{
  teardownMic();requestRef.current++;
  heardRef.current="";manualRef.current="";setHeard("");setManual("");setDraft("");setVerdict(null);setError("");setNotice("");
  prepDeadlineRef.current=Date.now()+10000;setPrepLeft(10);setTimeLeft(60);
  setPhase("prep");phaseRef.current="prep";
 };
 const activateRecognition=(base:string)=>{
  if(!speechConstructor()){setNotice(L(zh,"此裝置不支援網頁語音辨識，可使用鍵盤語音輸入或直接打字。","Speech recognition unavailable. Use your keyboard's voice dictation or type instead."));return;}
  teardownMic();
  const Ctor=speechConstructor()!;
  const recognizer=new Ctor();
  recognizer.lang=language==="zh"?"zh-TW":"en-US";
  recognizer.continuous=true;recognizer.interimResults=true;
  recognizer.onresult=(event)=>{
   let final="",interim="";
   for(let i=0;i<event.results.length;i++){
    const result=event.results[i],part=result?.[0]?.transcript||"";
    if(result?.isFinal)final+=" "+part;else interim+=" "+part;
   }
   const next=(base+" "+final+" "+interim).trim();
   heardRef.current=next;setHeard(next);
  };
  recognizer.onerror=(event)=>{
   if(phaseRef.current==="speaking")setNotice(L(zh,"語音辨識中斷（"+event.error+"），可重新開麥或改用文字。","Recognition interrupted ("+event.error+"). Resume the mic or type."));
  };
  recognizer.onend=()=>{
   if(recognitionRef.current===recognizer){recognitionRef.current=null;setMicActive(false);}
  };
  recognitionRef.current=recognizer;
  try{recognizer.start();setMicActive(true);setNotice("");}
  catch{recognitionRef.current=null;setMicActive(false);setNotice(L(zh,"無法啟動麥克風，請檢查權限或改用文字輸入。","Could not start the mic. Check permissions or use text."));}
 };
 const startSpeaking=()=>{
  if(phaseRef.current!=="prep")return;
  trackUsageEvent("game_started","nonsense");
  deadlineRef.current=Date.now()+60000;setTimeLeft(60);setPhase("speaking");phaseRef.current="speaking";
  activateRecognition(heardRef.current);
 };
 const finishSpeech=()=>{
  if(phaseRef.current!=="speaking")return;
  phaseRef.current="review";
  // Use the final interim result if the browser hasn't emitted an isFinal event yet.
  const transcript=[heardRef.current,manualRef.current].filter(Boolean).join(" ").trim();
  teardownMic();setDraft(transcript);setPhase("review");setError("");setNotice("");
 };
 const reset=()=>{
  requestRef.current++;teardownMic();phaseRef.current="setup";setPhase("setup");
  setHeard("");heardRef.current="";manualRef.current="";setManual("");setDraft("");setError("");setNotice("");setVerdict(null);setCopied(false);
 };
 const grade=async()=>{
  if(phaseRef.current!=="review")return;
  const text=draft.trim();
  if(text.length<18){setError(L(zh,"內容太短了，請至少講幾句完整的論點。","Too short — make a few complete arguments first."));return;}
  if(!geminiKey()){setError(L(zh,"評分需要 Gemini Key；演說和練習不需要。","A Gemini Key is required for AI judging, but not for practicing."));return;}
  const request=++requestRef.current;phaseRef.current="judging";setPhase("judging");setError("");
  try{
   const result=await judgeNonsense(topic,judgeId,language,text);
   if(!mountedRef.current||requestRef.current!==request)return;
   setVerdict(result);phaseRef.current="result";setPhase("result");trackUsageEvent("game_completed","nonsense");
  }catch{
   if(!mountedRef.current||requestRef.current!==request)return;
   phaseRef.current="review";setPhase("review");
   setError(L(zh,"評審暫時無法評分，請檢查 Key 或網路後重試。演說內容已保留。","Judging failed. Check your key or connection and retry. Your speech is saved on this screen."));
  }
 };
 const share=async()=>{
  if(!verdict)return;
  const payload=L(zh,"我在 Crew 一分鐘胡說大賽得到 ","I scored ")+verdict.total+
   L(zh," 分！題目：「"," in Crew's Nonsense Championship! Topic: “")+topic[language]+"”\n"+
   window.location.origin+"/games/nonsense";
  try{
   if(navigator.share)await navigator.share({text:payload});
   else{await navigator.clipboard.writeText(payload);setCopied(true);}
  }catch{/* Share was cancelled or clipboard permission was denied */}
 };
 const hints=nonsenseHints[topic.category]?.[language]||[];
 return <main className="crew-play-page nonsense-page">
  <header className="crew-play-game-header nonsense-header">
   <Link to="/games" className="crew-play-back">← {L(zh,"全部遊戲","All games")}</Link>
   <span className="crew-play-eyebrow">CREW PLAY · VOICE ARCADE</span>
   <h1>{L(zh,"一分鐘胡說大賽","Nonsense Championship")}</h1>
   <p>{L(zh,"一本正經地胡說八道。60 秒說服 AI 評審。","Deliver a ridiculous argument with a straight face. You have 60 seconds.")}</p>
  </header>
  <div className="nonsense-shell">
   <section className="nonsense-stage" aria-label={L(zh,"遊戲舞台","Game stage")}>
    <div className="nonsense-stage-top">
     <span className="nonsense-label">{L(zh,"今日荒謬命題","YOUR ABSURD CLAIM")}</span>
     {phase==="setup"||phase==="prep"?<GamePanel title={L(zh,"遊戲設定","Game settings")} label={L(zh,"調整設定","Settings")}>
      <label>{L(zh,"題目分類","Topic category")}
       <select value={category} onChange={e=>{setCategory(e.target.value);setTopic(old=>pickNonsenseTopic(e.target.value,old.id));}}>
        <option value="all">{L(zh,"全部類型 · 150 題","All topics · 150")}</option>
        {nonsenseCategories.map(c=><option key={c.id} value={c.id}>{zh?c.zh:c.en}</option>)}
       </select>
      </label>
      <label>{L(zh,"評審風格","Judge persona")}
       <select value={judgeId} onChange={e=>setJudgeId(e.target.value as NonsenseJudgeId)}>
        {nonsenseJudges.map(j=><option key={j.id} value={j.id}>{j.icon} {zh?j.zh:j.en}</option>)}
       </select>
      </label>
      <label>{L(zh,"演說語言","Speech language")}
       <select value={language} onChange={e=>setLanguage(e.target.value as NonsenseLanguage)}>
        <option value="zh">繁體中文</option><option value="en">English</option>
       </select>
      </label>
     </GamePanel>:<span className="nonsense-label">{zh?categoryLabel?.zh:categoryLabel?.en}</span>}
    </div>
    <div className="nonsense-spotlight" aria-hidden="true"><span>🎙</span></div>
    <h2>{topic[language]}</h2>
    <div className="nonsense-judge">
     <span aria-hidden="true">{currentJudge.icon}</span>
     <div><strong>{zh?judgeNames[judgeId].zh:judgeNames[judgeId].en}</strong><small>{L(zh,"你的 AI 評審","Your AI judge")}</small></div>
    </div>
    {(phase==="prep"||phase==="speaking")&&<div className="nonsense-clock" aria-live="off">
     <strong>{clock(phase==="prep"?prepLeft:timeLeft)}</strong>
     <small>{phase==="prep"?L(zh,"準備時間（可提前開始）","Preparation (you may start early)"):L(zh,"你的演說倒數","Speech countdown")}</small>
    </div>}
    {phase==="setup"&&<div className="nonsense-buttons">
     <button type="button" className="nonsense-main-button" onClick={beginPrep}>{L(zh,"準備挑戰","Prepare to speak")} →</button>
     <button type="button" className="nonsense-secondary" onClick={chooseTopic}>{L(zh,"換一題","Shuffle topic")}</button>
    </div>}
    {phase==="prep"&&<>
     <div className="nonsense-hints"><strong>{L(zh,"可參考的三個方向","Three optional talking points")}</strong>
      <ul>{hints.map(h=><li key={h}>{h}</li>)}</ul>
     </div>
     <div className="nonsense-buttons"><button type="button" className="nonsense-main-button" onClick={startSpeaking}>{L(zh,"開始演說 60 秒","Start my 60-second speech")}</button><button type="button" className="nonsense-secondary" onClick={reset}>{L(zh,"返回","Back")}</button></div>
    </>}
    {phase==="speaking"&&<>
     <div className="nonsense-listening" role="status"><span className={micActive?"is-listening":""}/>
      {micActive?L(zh,"正在聆聽…","Listening…"):canRecognize?L(zh,"麥克風未啟動／已停止","Microphone paused"):L(zh,"可使用鍵盤語音輸入","Try keyboard dictation")}
     </div>
     {heard&&<p className="nonsense-heard">{heard}</p>}
     {!micActive&&<label className="nonsense-text-fallback">{L(zh,"無法使用麥克風？在這裡輸入演說內容","Can't use the mic? Type your speech here")}
      <textarea value={manual} onChange={e=>{manualRef.current=e.target.value;setManual(e.target.value)}} rows={3} maxLength={6000}/>
     </label>}
     <div className="nonsense-buttons">
      {!micActive&&canRecognize&&<button type="button" className="nonsense-secondary" onClick={()=>activateRecognition(heardRef.current)}>{L(zh,"繼續收音","Resume mic")}</button>}
      <button type="button" className="nonsense-main-button" onClick={finishSpeech}>{L(zh,"結束演說","Finish speech")}</button>
     </div>
    </>}
    {(phase==="review"||phase==="judging")&&<section className="nonsense-review">
     <h3>{L(zh,"確認你的演說逐字稿","Review your speech transcript")}</h3>
     <p>{L(zh,"語音辨識可能有錯字，可在評分前修正。本網站不儲存錄音；辨識可能由瀏覽器語音服務處理。","Speech recognition may make mistakes. This site does not store recordings; your browser may process audio through its speech service.")}</p>
     <textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={7} maxLength={6000} disabled={phase==="judging"} aria-label={L(zh,"演說逐字稿","Speech transcript")}/>
     {!geminiKey()&&<p className="nonsense-key-note">{L(zh,"AI 評分需要 Gemini Key。你仍然可以免費抽題和演說。","AI judging requires a Gemini Key. Topic drawing and speaking are free.")} <Link to="/settings">{L(zh,"前往設定","Open settings")}</Link></p>}
     {error&&<p role="alert" className="nonsense-alert">{error}</p>}
     <div className="nonsense-buttons">
      <button type="button" className="nonsense-main-button" disabled={phase==="judging"||!geminiKey()} onClick={()=>void grade()}>{phase==="judging"?L(zh,"AI 評審正在評分…","AI judge is scoring…"):L(zh,"交給 AI 評審","Submit for AI judging")}</button>
      <button type="button" className="nonsense-secondary" disabled={phase==="judging"} onClick={reset}>{L(zh,"重玩","Play again")}</button>
     </div>
    </section>}
    {phase==="result"&&verdict&&<section className="nonsense-result" aria-live="polite">
     <span className="nonsense-label">{L(zh,"評審結算卡","JUDGE'S SCORECARD")}</span>
     <div className="nonsense-total"><strong>{verdict.total}</strong><span>/ 100</span></div>
     <h3>{verdict.total>=85?L(zh,"胡說宗師","Master of Nonsense"):verdict.total>=65?L(zh,"荒謬演說家","Absurd Orator"):L(zh,"胡說新秀","Rising Nonsense Star")}</h3>
     <div className="nonsense-score-grid">
      {(["creativity","logic","relevance","delivery"] as const).map((key,index)=><div key={key}><span>{(zh?["創意與荒謬度","歪理邏輯","切合題目","表達與完整度"]:["Creativity","Absurd logic","Relevance","Structure"])[index]}</span><strong>{verdict[key]} / {({creativity:35,logic:25,relevance:20,delivery:20})[key]}</strong></div>)}
     </div>
     {verdict.highlight&&<blockquote>「{verdict.highlight}」</blockquote>}
     <p className="nonsense-comment">{verdict.comment}</p>
     <div className="nonsense-buttons"><button type="button" className="nonsense-main-button" onClick={()=>void share()}>{L(zh,"分享結果","Share score")}</button><button type="button" className="nonsense-secondary" onClick={reset}>{L(zh,"再來一局","Play again")}</button></div>
     {copied&&<small role="status">{L(zh,"挑戰連結已複製","Challenge link copied")}</small>}
    </section>}
    {notice&&phase==="speaking"&&<p role="status" className="nonsense-alert">{notice}</p>}
   </section>
   <p className="nonsense-footer">{L(zh,"不用 Gemini Key 就能抽題和開口練習；AI 結算需要自己的 Key。語音辨識依瀏覽器支援情況提供，也可使用鍵盤語音輸入。","Draw topics and practice without a Gemini Key. AI scores require your own key. Voice recognition depends on browser support; keyboard dictation also works.")}</p>
  </div>
 </main>;
}
