import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {trackUsageEvent} from "../analytics/usage";
import {MiniGameVoice,MiniShell,useMiniFriend,type VoiceCue} from "./MiniGameFrame";
import {legalNumber,secretNumber,scoreAB,parseSpokenNumber,parseSpokenAB,nextComputerGuess,candidateNumbers,type DigitCount,type GuessRow,type AB} from "./numberGameEngine";

type Mode="guess"|"reverse";
const quote=(name:string,won:boolean)=>won
 ?name+"：這次真讓你猜中了，下次我換個難的。"
 :name+"：差一點就被你抓到了，再來一局？";

function saveResultImage(count:number,digits:number,name:string,won:boolean){
 const canvas=document.createElement("canvas");canvas.width=900;canvas.height=1080;
 const ctx=canvas.getContext("2d");if(!ctx)return;
 ctx.fillStyle="#181b38";ctx.fillRect(0,0,900,1080);
 ctx.fillStyle="#9db3ff";ctx.font="bold 35px sans-serif";ctx.fillText("CREW PLAY  /  1A2B",65,105);
 ctx.fillStyle="#ffffff";ctx.font="bold 96px sans-serif";ctx.fillText(count+" 次",65,355);
 ctx.font="40px sans-serif";ctx.fillText(digits+" 位數 · "+(won?"挑戰成功":"本局結束"),65,435);
 ctx.fillStyle="#c9c8e8";ctx.font="34px sans-serif";
 ctx.fillText(name+" 說：",65,605);
 ctx.font="32px sans-serif";ctx.fillText(won?"這次真讓你猜中了！":"差一點就被你抓到了！",65,665);
 ctx.strokeStyle="#8585ba";ctx.beginPath();ctx.moveTo(65,875);ctx.lineTo(835,875);ctx.stroke();
 ctx.fillStyle="#fff";ctx.font="29px sans-serif";ctx.fillText("https://www.3sssi.com/games/1a2b",65,965);
 canvas.toBlob(blob=>{
  if(!blob)return;
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download="crew-play-1a2b.png";document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 },"image/png");
}
export function NumberGamePage(){
 const {friend,choose}=useMiniFriend();
 useEffect(()=>{trackUsageEvent("game_open","1a2b")},[]);
 const [digits,setDigits]=useState<DigitCount>(4),[mode,setMode]=useState<Mode>("guess"),[revision,setRevision]=useState(0);
 return <MiniShell kind="1a2b" friend={friend} onChange={choose}>
  <div className="crew-mini-config" aria-label="猜數字規則">
   <div className="crew-mini-segments" role="group" aria-label="遊戲模式">
    <button aria-pressed={mode==="guess"} onClick={()=>setMode("guess")}>我猜朋友的數字</button>
    <button aria-pressed={mode==="reverse"} onClick={()=>setMode("reverse")}>朋友猜我的數字</button>
   </div>
   <div className="crew-mini-segments" role="group" aria-label="位數難度">
    {([3,4,5] as DigitCount[]).map(n=><button key={n} aria-pressed={digits===n} onClick={()=>setDigits(n)}>{n} 位</button>)}
   </div>
  </div>
  <NumberRound key={mode+digits+revision+friend.id} mode={mode} digits={digits} friend={friend} onNew={()=>setRevision(x=>x+1)}/>
 </MiniShell>;
}
function NumberRound({mode,digits,friend,onNew}:{
 mode:Mode;digits:DigitCount;friend:ReturnType<typeof useMiniFriend>["friend"];onNew:()=>void;
}){
 const [secret]=useState(()=>secretNumber(digits));
 const [history,setHistory]=useState<GuessRow[]>([]);
 const [guess,setGuess]=useState(""),[a,setA]=useState(0),[b,setB]=useState(0);
 const [error,setError]=useState("");
 const [cue,setCue]=useState<VoiceCue>({id:0,text:""});
 const emit=useCallback((text:string)=>setCue(old=>({id:old.id+1,text})),[]);
 const finalRow=history[history.length-1];
 const won=Boolean(finalRow&&finalRow.result.a===digits);
 const finished=won||history.length>=10;
 const startedRef=useRef(false),completedRef=useRef(false);
 useEffect(()=>{
  if(history.length>0&&!startedRef.current){
   startedRef.current=true;trackUsageEvent("game_started","1a2b");
  }
 },[history.length]);
 useEffect(()=>{
  if(finished&&startedRef.current&&!completedRef.current){
   completedRef.current=true;trackUsageEvent("game_completed","1a2b");
  }
 },[finished]);
 const computerGuess=useMemo(()=>mode==="reverse"&&!finished?nextComputerGuess(digits,history):null,[mode,digits,history,finished]);
 const submitGuess=(value:string)=>{
  if(finished)return;
  if(!legalNumber(value,digits)){setError("請輸入 "+digits+" 個不重複的數字，首位不能是 0。");emit("The number was unclear or invalid. Ask the player to say each digit again, slowly.");return;}
  const result=scoreAB(secret,value);
  setHistory(prev=>[...prev,{guess:value,result}]);setGuess("");setError("");
  emit("Player guessed "+value.split("").join(" ")+". Verified result: "+result.a+"A"+result.b+"B. "+
   (result.a===digits?"Player wins.":history.length===9?"Ten attempts used. Round finished.":"Give a short witty reaction, without giving away the answer."));
 };
 const submitReverse=(result:AB)=>{
  if(finished||!computerGuess)return;
  if(result.a<0||result.b<0||result.a+result.b>digits){setError("A + B 不可超過位數。");return;}
  const updated=[...history,{guess:computerGuess,result}];
  if(candidateNumbers(digits,updated).length===0){
   setError("這個提示和先前的 A/B 結果矛盾；請重新檢查或撤銷上一筆。");
   emit("The submitted A/B hint contradicts earlier hints. Ask to check and repeat it.");
   return;
  }
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
   else{setError("沒聽清楚數字，請用英文逐位重念，例如 one three five nine。");emit("Ask the player to repeat the digits slowly in English.");}
  }else{
   const report=parseSpokenAB(speech,digits);
   if(report)submitReverse(report);
   else{setError("沒聽清楚 A/B，請重念，例如 one A two B。");emit("Ask the player to repeat the A/B result clearly.");}
  }
 };
 const undo=()=>{if(!history.length)return;setHistory(old=>old.slice(0,-1));setError("");emit("The last submitted turn was undone. Ignore that result. Wait for a new game action.");};
 const remaining=Math.max(0,10-history.length);
 return <div className="crew-mini-stage">
  <MiniGameVoice kind="1a2b" friend={friend} cue={cue} onSpeech={handleSpeech}/>
  <section className="crew-mini-panel" aria-label="1A2B 猜數字">
   <div className="crew-mini-topline"><strong>{mode==="guess"?"破解 "+friend.name+" 的密碼":"幫 "+friend.name+" 猜你的密碼"}</strong><span>{history.length} / 10 次 · 剩餘 {remaining} 次</span></div>
   <p className="crew-mini-muted">{mode==="guess"?
    "A = 數字與位置都對；B = 數字對、位置錯。首位不能是 0，數字不可重複。":
    "先在心中想好一組不重複的數字，不必輸入或透露答案；朋友會逐步猜，你只需回報 A/B。"}</p>
   {!finished&&mode==="guess"?<form onSubmit={e=>{e.preventDefault();submitGuess(guess)}}>
    <label className="crew-mini-label" htmlFor="crew-number">你的猜測</label>
    <div className="crew-mini-input-row">
     <input id="crew-number" className="crew-mini-number-input" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={digits} value={guess} placeholder={digits+" 位不重複數字"} onChange={e=>{setGuess(e.target.value.replace(/\D/g,"").slice(0,digits));setError("")}}/>
     <button type="button" onClick={()=>setGuess(old=>old.slice(0,-1))} aria-label="撤銷一個數字">⌫</button>
     <button type="submit" className="crew-mini-primary">送出</button>
    </div>
    <div className="crew-mini-keypad" role="group" aria-label="數字鍵盤">
     {Array.from({length:10},(_,i)=>i).map(n=><button type="button" key={n} disabled={guess.length>=digits||guess.includes(String(n))||guess.length===0&&n===0} onClick={()=>setGuess(v=>v+String(n))}>{n}</button>)}
    </div>
   </form>:null}
   {!finished&&mode==="reverse"?<div className="crew-mini-reverse">
    <span className="crew-mini-label">{friend.name} 猜：</span><strong className="crew-mini-big-digits">{computerGuess||"—"}</strong>
    <p className="crew-mini-muted">請對照你心中的答案，回報幾 A 幾 B。</p>
    <div className="crew-mini-feedback">
     <label>A <select aria-label="幾 A" value={a} onChange={e=>setA(Number(e.target.value))}>{Array.from({length:digits+1},(_,i)=><option key={i}>{i}</option>)}</select></label>
     <label>B <select aria-label="幾 B" value={b} onChange={e=>setB(Number(e.target.value))}>{Array.from({length:digits+1},(_,i)=><option key={i}>{i}</option>)}</select></label>
     <button type="button" className="crew-mini-primary" onClick={()=>submitReverse({a,b})}>回報結果</button>
    </div>
   </div>:null}
   {error?<p className="crew-mini-error" role="alert">{error}</p>:null}
   <div className="crew-mini-history-head"><strong>猜測歷史</strong>
    {history.length>0?<button type="button" onClick={undo}>撤銷上一筆</button>:null}</div>
   <ol className="crew-mini-number-history">{history.map((row,i)=><li key={i}><span>#{i+1}</span><strong>{row.guess}</strong><b>{row.result.a}A{row.result.b}B</b></li>)}</ol>
   {!history.length?<p className="crew-mini-muted">還沒有猜測，從第一個數字開始吧。</p>:null}
  </section>
  {finished?<section className="crew-mini-result" aria-live="polite">
   <small>CREW PLAY · 1A2B</small><h2>{won?"破解成功！":"本局結束"}</h2>
   <strong className="crew-mini-result-count">{history.length} 次</strong>
   {mode==="guess"?<p>正確答案：<strong>{secret}</strong></p>:<p>{won?friend.name+" 成功猜到你心中的數字。":"十次挑戰已用完，下次再來！"}</p>}
   <blockquote>{quote(friend.name,won)}</blockquote>
   <p>3sssi.com/games/1a2b</p>
   <div className="crew-mini-result-actions">
    <button onClick={()=>saveResultImage(history.length,digits,friend.name,won)} type="button">儲存分享卡 PNG</button>
    <button className="crew-mini-primary" onClick={onNew} type="button">再玩一局</button>
   </div>
  </section>:null}
  {!finished?<button className="crew-mini-restart" type="button" onClick={onNew}>重新出題</button>:null}
 </div>;
}
