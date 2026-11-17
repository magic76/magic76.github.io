import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import type {TFunction} from "i18next";
import {trackUsageEvent} from "../analytics/usage";
import {MiniGameVoice,MiniShell,useMiniFriend,type VoiceCue} from "./MiniGameFrame";
import {GamePanel} from "./GamePanel";
import {dailyNumberDate,dailyNumberSecret,readNumberRecord,readDailyResult,saveNumberResult} from "./dailyNumberChallenge";
import {friendGameReaction} from "./friendGameReaction";
import {readUnfinishedNumberRound,saveUnfinishedNumberRound,clearUnfinishedNumberRound,type UnfinishedNumberRound} from "./unfinishedNumberRound";
import {legalNumber,secretNumber,scoreAB,parseSpokenNumber,parseSpokenAB,nextComputerGuess,candidateNumbers,type DigitCount,type GuessRow,type AB} from "./numberGameEngine";

type Mode="guess"|"reverse";

function saveResultImage(t:TFunction,count:number,digits:number,name:string,won:boolean,daily:boolean,best:number|null){
 const canvas=document.createElement("canvas");canvas.width=900;canvas.height=1080;
 const ctx=canvas.getContext("2d");if(!ctx)return;
 ctx.fillStyle="#181b38";ctx.fillRect(0,0,900,1080);
 ctx.fillStyle="#9db3ff";ctx.font="bold 35px sans-serif";ctx.fillText("CREW PLAY  /  1A2B",65,105);
 ctx.fillStyle="#ffffff";ctx.font="bold 96px sans-serif";ctx.fillText(t("playHub.number.times",{n:count}),65,355);
 ctx.font="40px sans-serif";ctx.fillText(t("playHub.number.digitsLong",{n:digits})+" · "+(won?t("playHub.number.cardWon"):t("playHub.number.roundOver"))+(daily?" · "+t("playHub.number.daily"):""),65,435);
  if(best!==null){ctx.fillStyle="#b7c8ff";ctx.font="30px sans-serif";ctx.fillText(t("playHub.number.cardBest",{n:best}),65,505);}
 ctx.fillStyle="#c9c8e8";ctx.font="34px sans-serif";
 ctx.fillText(t("playHub.number.cardSays",{name}),65,605);
 ctx.font="32px sans-serif";ctx.fillText(won?t("playHub.number.cardQuoteWin"):t("playHub.number.cardQuoteLose"),65,665);
 ctx.strokeStyle="#8585ba";ctx.beginPath();ctx.moveTo(65,875);ctx.lineTo(835,875);ctx.stroke();
 ctx.fillStyle="#fff";ctx.font="29px sans-serif";ctx.fillText("https://koolo.app/games/1a2b",65,965);
 canvas.toBlob(blob=>{
  if(!blob)return;
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download="crew-play-1a2b.png";document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 },"image/png");
}
export function NumberGamePage(){
 const {friend,choose}=useMiniFriend();
 const {t}=useTranslation(["games","home"]);
 useEffect(()=>{trackUsageEvent("game_open","1a2b")},[]);
 const [digits,setDigits]=useState<DigitCount>(4),[mode,setMode]=useState<Mode>("guess"),[revision,setRevision]=useState(0);
 const [daily,setDaily]=useState(false);
 const [resumed,setResumed]=useState<UnfinishedNumberRound|null>(null);
 // Read browser storage after hydration; never render storage-dependent state on the server.
 useEffect(()=>{
  const saved=readUnfinishedNumberRound();
  if(saved){setDigits(saved.digits);setMode(saved.mode);setDaily(Boolean(saved.dailyDate));setResumed(saved)}
 },[]);
 const discardResume=()=>{clearUnfinishedNumberRound();setResumed(null)};
 const day=dailyNumberDate();
 return <MiniShell kind="1a2b" friend={friend} onChange={choose}>
  <div className="crew-mini-toolbar">
   <button type="button" className="crew-mini-daily-toggle" aria-pressed={daily} onClick={()=>{if(window.confirm(t("playHub.number.confirmDaily"))){discardResume();setDaily(v=>!v);setMode("guess");setRevision(v=>v+1)}}}>{daily?t("playHub.number.daily")+" ✓":t("playHub.number.dailyChallenge")}</button>
   <GamePanel label={"⚙ "+t("playHub.number.settings")} title={t("playHub.number.settingsTitle")}>
  <div className="crew-mini-config" aria-label={t("playHub.number.rulesAria")}>
   <div className="crew-mini-segments" role="group" aria-label={t("playHub.number.modeAria")}>
    <button aria-pressed={mode==="guess"} onClick={()=>{if(mode!=="guess"&&window.confirm(t("playHub.number.confirmMode"))){discardResume();setMode("guess")}}}>{t("playHub.number.modeGuess")}</button>
    <button aria-pressed={mode==="reverse"} onClick={()=>{if(mode!=="reverse"&&window.confirm(t("playHub.number.confirmMode"))){discardResume();setDaily(false);setMode("reverse")}}}>{t("playHub.number.modeReverse")}</button>
   </div>
   <div className="crew-mini-segments" role="group" aria-label={t("playHub.number.digitsAria")}>
    {([3,4,5] as DigitCount[]).map(n=><button key={n} aria-pressed={digits===n} onClick={()=>{if(digits!==n&&window.confirm(t("playHub.number.confirmDigits"))){discardResume();setDigits(n)}}}>{t("playHub.number.digits",{n})}</button>)}
   </div>
  </div>
    <p>{t("playHub.number.settingsNote")}</p>
   </GamePanel>
   <GamePanel label={t("playHub.number.howTo")} title={t("playHub.number.rulesTitle")} variant="modal">
    <p>{t("playHub.number.rules1")}</p>
    <p>{t("playHub.number.rules2")}</p>
   </GamePanel>
  </div>
  <NumberRound key={mode+digits+revision+friend.id+(daily?day:"normal")+(resumed?":resumed:"+resumed.at:"")}
   mode={mode} digits={digits} dailyDate={daily?day:null} friend={friend}
   resume={resumed?.mode===mode&&resumed.digits===digits&&resumed.dailyDate===(daily?day:null)?resumed:null}
   onNew={()=>{discardResume();setRevision(x=>x+1)}} onLeaveDaily={()=>{discardResume();setDaily(false);setRevision(x=>x+1)}}/>
 </MiniShell>;
}
function NumberRound({mode,digits,friend,onNew,onLeaveDaily,dailyDate,resume}:{
 mode:Mode;digits:DigitCount;dailyDate:string|null;resume:UnfinishedNumberRound|null;friend:ReturnType<typeof useMiniFriend>["friend"];onNew:()=>void;onLeaveDaily:()=>void;
}){
 const {t,i18n}=useTranslation(["games","home"]);
 const [secret]=useState(()=>resume?.secret||(dailyDate?dailyNumberSecret(digits,dailyDate):secretNumber(digits)));
 const [record,setRecord]=useState(()=>readNumberRecord(digits));
 const [dailyResult,setDailyResult]=useState(()=>dailyDate?readDailyResult(digits,dailyDate):null);
 const recordedRef=useRef(false);
 const submitLockRef=useRef(false);
 const [history,setHistory]=useState<GuessRow[]>(()=>resume?.history||[]);
 const [guess,setGuess]=useState(""),[a,setA]=useState(0),[b,setB]=useState(0);
 const [error,setError]=useState("");
 const [cue,setCue]=useState<VoiceCue>({id:0,text:""});
 const emit=useCallback((text:string)=>setCue(old=>({id:old.id+1,text})),[]);
 const finalRow=history[history.length-1];
 const won=Boolean(finalRow&&finalRow.result.a===digits);
 const finished=won||history.length>=10;
 useEffect(()=>{submitLockRef.current=false},[history.length]);
 const startedRef=useRef(Boolean(resume?.history.length)),completedRef=useRef(false);
 useEffect(()=>{
  if(history.length>0&&!startedRef.current){
   startedRef.current=true;trackUsageEvent("game_started","1a2b");
  }
 },[history.length]);
 useEffect(()=>{
  if(finished&&startedRef.current&&!completedRef.current){
   completedRef.current=true;trackUsageEvent("game_completed","1a2b");
   if(mode==="guess"&&!recordedRef.current){recordedRef.current=true;setRecord(saveNumberResult(digits,history.length,won,dailyDate));if(dailyDate)setDailyResult(readDailyResult(digits,dailyDate));}
  }
 },[finished,mode,digits,dailyDate,history.length,won]);
 useEffect(()=>{
  if(finished){clearUnfinishedNumberRound();return}
  if(history.length>0)saveUnfinishedNumberRound({mode,digits,dailyDate,secret,history,at:Date.now()});
 },[history,finished,mode,digits,dailyDate,secret]);
 const computerGuess=useMemo(()=>mode==="reverse"&&!finished?nextComputerGuess(digits,history):null,[mode,digits,history,finished]);
 const submitGuess=(value:string)=>{
  if(finished||submitLockRef.current)return;
  if(!legalNumber(value,digits)){setError(t("playHub.number.errInvalid",{n:digits}));emit("The number was unclear or invalid. Ask the player to say each digit again, slowly.");return;}
  const result=scoreAB(secret,value);
  submitLockRef.current=true;
  setHistory(prev=>[...prev,{guess:value,result}]);setGuess("");setError("");
  emit("Player guessed "+value.split("").join(" ")+". Verified result: "+result.a+"A"+result.b+"B. "+
   (result.a===digits?"Player wins.":history.length===9?"Ten attempts used. Round finished.":"Give a short witty reaction, without giving away the answer."));
 };
 const submitReverse=(result:AB)=>{
  if(finished||!computerGuess||submitLockRef.current)return;
  if(result.a<0||result.b<0||result.a+result.b>digits){setError(t("playHub.number.errSum"));return;}
  const updated=[...history,{guess:computerGuess,result}];
  if(candidateNumbers(digits,updated).length===0){
   setError(t("playHub.number.errContradict"));
   emit("The submitted A/B hint contradicts earlier hints. Ask to check and repeat it.");
   return;
  }
  submitLockRef.current=true;
  setHistory(updated);setError("");
  emit("Your verified guess was "+computerGuess.split("").join(" ")+". Player reported "+result.a+"A"+result.b+"B. "+
   (result.a===digits?"You guessed the secret correctly.":history.length===9?"Ten guesses reached.":"React briefly before the next guess."));
  setA(0);setB(0);
 };
 const handleSpeech=(speech:string)=>{
  if(finished)return;
  if(mode==="guess"){
   const number=parseSpokenNumber(speech,digits);
   if(number)submitGuess(number);
   else{setError(t("playHub.number.errHearNumber"));emit("Ask the player to repeat the digits slowly in English.");}
  }else{
   const report=parseSpokenAB(speech,digits);
   if(report)submitReverse(report);
   else{setError(t("playHub.number.errHearAB"));emit("Ask the player to repeat the A/B result clearly.");}
  }
 };
 const undo=()=>{if(finished||!history.length)return;setHistory(old=>old.slice(0,-1));setError("");emit("The last submitted turn was undone. Ignore that result. Wait for a new game action.");};
 const remaining=Math.max(0,10-history.length);
 return <div className="crew-mini-stage">
  
  <section className="crew-mini-panel crew-mini-number-board" aria-label={t("playHub.number.boardAria")}>
   <div className="crew-mini-topline"><strong>{dailyDate?t("playHub.number.today")+" · ":""}{mode==="guess"?t("playHub.number.crack",{name:friend.name}):t("playHub.number.helpGuess",{name:friend.name})}</strong><span>{t("playHub.number.attempts",{used:history.length,left:remaining})}</span></div>
   <progress className="crew-mini-turn-progress" value={history.length} max={10} aria-label={t("playHub.number.usedAria")} />
   {dailyDate?<p className="crew-mini-daily-note">{t("playHub.number.dailyNote",{date:dailyDate})}</p>:null}
   {mode==="guess"?<p className="crew-mini-statline">{t("playHub.number.bestLabel")}{record.best===null?t("playHub.number.noRecord"):t("playHub.number.times",{n:record.best})} · {t("playHub.number.wins",{wins:record.wins,played:record.played})}{dailyDate&&dailyResult?" · "+t("playHub.number.todayFirst",{n:dailyResult.attempts}):""}</p>:null}
   <p className="crew-mini-muted">{mode==="guess"?
    t("playHub.number.hintGuess"):
    t("playHub.number.hintReverse")}</p>
   {!finished&&mode==="guess"&&!history.length?<div className="crew-mini-quick-start">{!history.length?<button className="crew-mini-primary" type="button" onClick={()=>submitGuess(digits===3?"123":digits===4?"1234":"12345")}>
     {i18n.resolvedLanguage?.startsWith("zh")?"快速試猜 ":"Try your first guess: "}{digits===3?"123":digits===4?"1234":"12345"}
    </button>:null}</div>:null}
   {!finished&&mode==="guess"?<form onSubmit={e=>{e.preventDefault();submitGuess(guess)}}>
    <label className="crew-mini-label" htmlFor="crew-number">{t("playHub.number.yourGuess")}</label>
    <div className="crew-mini-input-row">
     <input id="crew-number" className="crew-mini-number-input" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={digits} value={guess} placeholder={t("playHub.number.placeholder",{n:digits})} onChange={e=>{setGuess(e.target.value.replace(/\D/g,"").slice(0,digits));setError("")}}/>
     <button type="button" onClick={()=>setGuess(old=>old.slice(0,-1))} aria-label={t("playHub.number.backspace")}>⌫</button>
     <button type="submit" className="crew-mini-primary">{t("playHub.number.submit")}</button>
    </div>
    <div className="crew-mini-keypad" role="group" aria-label={t("playHub.number.keypad")}>
     {([1,2,3,4,5,6,7,8,9,null,0,null] as const).map((n,i)=>n===null?<span className="crew-mini-keypad-spacer" aria-hidden="true" key={"space-"+i}/>:<button type="button" key={n} disabled={guess.length>=digits||guess.includes(String(n))||guess.length===0&&n===0} onClick={()=>setGuess(v=>v+String(n))}>{n}</button>)}
    </div>
   </form>:null}
   {!finished&&mode==="reverse"?<div className="crew-mini-reverse">
    <span className="crew-mini-label">{t("playHub.number.friendGuesses",{name:friend.name})}</span><strong className="crew-mini-big-digits">{computerGuess||"—"}</strong>
    <p className="crew-mini-muted">{t("playHub.number.reportHint")}</p>
    <div className="crew-mini-feedback">
     <label>A <select aria-label={t("playHub.number.howManyA")} value={a} onChange={e=>setA(Number(e.target.value))}>{Array.from({length:digits+1},(_,i)=><option key={i}>{i}</option>)}</select></label>
     <label>B <select aria-label={t("playHub.number.howManyB")} value={b} onChange={e=>setB(Number(e.target.value))}>{Array.from({length:digits+1},(_,i)=><option key={i}>{i}</option>)}</select></label>
     <button type="button" className="crew-mini-primary" onClick={()=>submitReverse({a,b})}>{t("playHub.number.report")}</button>
    </div>
   </div>:null}
   {error?<p className="crew-mini-error" role="alert">{error}</p>:null}
   <div className="crew-mini-history-head"><strong>{t("playHub.number.recent")}</strong>
    <div className="crew-mini-history-actions">
     {history.length>0&&!finished?<button type="button" onClick={undo}>{t("playHub.number.undo")}</button>:null}
     {history.length>0?<GamePanel label={t("playHub.number.fullLog")} title={t("playHub.number.logTitle")}>
      <ol className="crew-mini-number-history">{history.map((row,i)=><li key={i}><span>#{i+1}</span><strong>{row.guess}</strong><b>{row.result.a}A{row.result.b}B</b></li>)}</ol>
     </GamePanel>:null}
    </div>
   </div>
   <ol className="crew-mini-number-history">{history.slice(-3).map((row,i)=><li key={history.length-Math.min(3,history.length)+i}><span>#{history.length-Math.min(3,history.length)+i+1}</span><strong>{row.guess}</strong><b>{row.result.a}A{row.result.b}B</b></li>)}</ol>
   {!history.length?<p className="crew-mini-muted">{t("playHub.number.empty")}</p>:null}
  </section>
  {finished?<section className="crew-mini-result" aria-live="polite">
   <small>CREW PLAY · 1A2B</small><h2>{won?t("playHub.number.won"):t("playHub.number.roundOver")}</h2>
   <strong className="crew-mini-result-count">{t("playHub.number.times",{n:history.length})}</strong>
   {mode==="guess"?<p>{t("playHub.number.answer")}<strong>{secret}</strong></p>:<p>{won?t("playHub.number.friendWon",{name:friend.name}):t("playHub.number.outOfTries")}</p>}
   <blockquote>{friendGameReaction(friend.id,won?"win":"lose",i18n.language==="zh-TW"?"zh":"en")}</blockquote>
   {mode==="guess"?<p>{t("playHub.number.bestLabel")}<strong>{record.best===null?t("playHub.number.none"):t("playHub.number.times",{n:record.best})}</strong> · {t("playHub.number.played",{n:record.played})}{dailyDate?" · "+t("playHub.number.streak",{n:record.streak}):""}</p>:null}
   {dailyDate&&dailyResult?<p>{t("playHub.number.todayFirstLabel")}{dailyResult.won?t("playHub.number.success"):t("playHub.number.fail")} · {t("playHub.number.times",{n:dailyResult.attempts})}</p>:null}
   <p>koolo.app/games/1a2b</p>
   <div className="crew-mini-result-actions">
    <button onClick={()=>saveResultImage(t,history.length,digits,friend.name,won,Boolean(dailyDate),record.best)} type="button">{t("playHub.number.saveCard")}</button>
    <button className="crew-mini-primary" onClick={dailyDate?onLeaveDaily:onNew} type="button">{dailyDate?t("playHub.number.normalMode"):t("playHub.number.again")}</button>
   </div>
  </section>:null}
  <MiniGameVoice kind="1a2b" friend={friend} cue={cue} onSpeech={handleSpeech}/>
  {!finished&&!dailyDate?<button className="crew-mini-restart" type="button" onClick={()=>{if(!history.length||window.confirm(t("playHub.number.confirmRestart")))onNew()}}>{t("playHub.number.restart")}</button>:null}
 </div>;
}
