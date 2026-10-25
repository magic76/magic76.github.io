import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {trackUsageEvent} from "../analytics/usage";
import {MiniGameVoice,MiniShell,useMiniFriend,type VoiceCue} from "./MiniGameFrame";
import {GamePanel} from "./GamePanel";
import {dailyNumberDate,dailyNumberSecret,readNumberRecord,readDailyResult,saveNumberResult} from "./dailyNumberChallenge";
import {friendGameReaction} from "./friendGameReaction";
import {legalNumber,secretNumber,scoreAB,parseSpokenNumber,parseSpokenAB,nextComputerGuess,candidateNumbers,type DigitCount,type GuessRow,type AB} from "./numberGameEngine";

type Mode="guess"|"reverse";

function saveResultImage(count:number,digits:number,name:string,won:boolean,daily:boolean,best:number|null){
 const canvas=document.createElement("canvas");canvas.width=900;canvas.height=1080;
 const ctx=canvas.getContext("2d");if(!ctx)return;
 ctx.fillStyle="#181b38";ctx.fillRect(0,0,900,1080);
 ctx.fillStyle="#9db3ff";ctx.font="bold 35px sans-serif";ctx.fillText("CREW PLAY  /  1A2B",65,105);
 ctx.fillStyle="#ffffff";ctx.font="bold 96px sans-serif";ctx.fillText(count+" 次",65,355);
 ctx.font="40px sans-serif";ctx.fillText(digits+" 位數 · "+(won?"挑戰成功":"本局結束")+(daily?" · 每日同題":""),65,435);
  if(best!==null){ctx.fillStyle="#b7c8ff";ctx.font="30px sans-serif";ctx.fillText("個人最佳："+best+" 次",65,505);}
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
 const [daily,setDaily]=useState(false);
 const day=dailyNumberDate();
 return <MiniShell kind="1a2b" friend={friend} onChange={choose}>
  <div className="crew-mini-toolbar">
   <button type="button" className="crew-mini-daily-toggle" aria-pressed={daily} onClick={()=>{if(window.confirm("切換每日挑戰會重新開始本局，確定嗎？")){setDaily(v=>!v);setMode("guess");setRevision(v=>v+1)}}}>{daily?"每日同題 ✓":"每日同題挑戰"}</button>
   <GamePanel label="⚙ 遊戲設定" title="1A2B 遊戲設定">
  <div className="crew-mini-config" aria-label="猜數字規則">
   <div className="crew-mini-segments" role="group" aria-label="遊戲模式">
    <button aria-pressed={mode==="guess"} onClick={()=>{if(mode!=="guess"&&window.confirm("切換模式會重新開始本局，確定嗎？"))setMode("guess")}}>我猜朋友的數字</button>
    <button aria-pressed={mode==="reverse"} onClick={()=>{if(mode!=="reverse"&&window.confirm("切換模式會重新開始本局，確定嗎？")){setDaily(false);setMode("reverse")}}}>朋友猜我的數字</button>
   </div>
   <div className="crew-mini-segments" role="group" aria-label="位數難度">
    {([3,4,5] as DigitCount[]).map(n=><button key={n} aria-pressed={digits===n} onClick={()=>{if(digits!==n&&window.confirm("調整位數會重新開始本局，確定嗎？"))setDigits(n)}}>{n} 位</button>)}
   </div>
  </div>
    <p>變更玩法或位數會重新開始目前這局；打開設定不會中斷語音。</p>
   </GamePanel>
   <GamePanel label="玩法" title="1A2B 遊戲規則" variant="modal">
    <p>所有數字都不重複，首位不可為 0。A 代表數字和位置都正確，B 代表數字正確但位置不對。</p>
    <p>可以選擇你猜電腦的數字，或讓 AI 朋友猜你心裡的數字；每局最多 10 次猜測。</p>
   </GamePanel>
  </div>
  <NumberRound key={mode+digits+revision+friend.id+(daily?day:"normal")} mode={mode} digits={digits} dailyDate={daily?day:null} friend={friend} onNew={()=>setRevision(x=>x+1)} onLeaveDaily={()=>{setDaily(false);setRevision(x=>x+1)}}/>
 </MiniShell>;
}
function NumberRound({mode,digits,friend,onNew,onLeaveDaily,dailyDate}:{
 mode:Mode;digits:DigitCount;dailyDate:string|null;friend:ReturnType<typeof useMiniFriend>["friend"];onNew:()=>void;onLeaveDaily:()=>void;
}){
 const [secret]=useState(()=>dailyDate?dailyNumberSecret(digits,dailyDate):secretNumber(digits));
 const [record,setRecord]=useState(()=>readNumberRecord(digits));
 const [dailyResult,setDailyResult]=useState(()=>dailyDate?readDailyResult(digits,dailyDate):null);
 const recordedRef=useRef(false);
 const submitLockRef=useRef(false);
 const [history,setHistory]=useState<GuessRow[]>([]);
 const [guess,setGuess]=useState(""),[a,setA]=useState(0),[b,setB]=useState(0);
 const [error,setError]=useState("");
 const [cue,setCue]=useState<VoiceCue>({id:0,text:""});
 const emit=useCallback((text:string)=>setCue(old=>({id:old.id+1,text})),[]);
 const finalRow=history[history.length-1];
 const won=Boolean(finalRow&&finalRow.result.a===digits);
 const finished=won||history.length>=10;
 useEffect(()=>{submitLockRef.current=false},[history.length]);
 const startedRef=useRef(false),completedRef=useRef(false);
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
 const computerGuess=useMemo(()=>mode==="reverse"&&!finished?nextComputerGuess(digits,history):null,[mode,digits,history,finished]);
 const submitGuess=(value:string)=>{
  if(finished||submitLockRef.current)return;
  if(!legalNumber(value,digits)){setError("請輸入 "+digits+" 個不重複的數字，首位不能是 0。");emit("The number was unclear or invalid. Ask the player to say each digit again, slowly.");return;}
  const result=scoreAB(secret,value);
  submitLockRef.current=true;
  setHistory(prev=>[...prev,{guess:value,result}]);setGuess("");setError("");
  emit("Player guessed "+value.split("").join(" ")+". Verified result: "+result.a+"A"+result.b+"B. "+
   (result.a===digits?"Player wins.":history.length===9?"Ten attempts used. Round finished.":"Give a short witty reaction, without giving away the answer."));
 };
 const submitReverse=(result:AB)=>{
  if(finished||!computerGuess||submitLockRef.current)return;
  if(result.a<0||result.b<0||result.a+result.b>digits){setError("A + B 不可超過位數。");return;}
  const updated=[...history,{guess:computerGuess,result}];
  if(candidateNumbers(digits,updated).length===0){
   setError("這個提示和先前的 A/B 結果矛盾；請重新檢查或撤銷上一筆。");
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
   else{setError("沒聽清楚數字，請用英文逐位重念，例如 one three five nine。");emit("Ask the player to repeat the digits slowly in English.");}
  }else{
   const report=parseSpokenAB(speech,digits);
   if(report)submitReverse(report);
   else{setError("沒聽清楚 A/B，請重念，例如 one A two B。");emit("Ask the player to repeat the A/B result clearly.");}
  }
 };
 const undo=()=>{if(finished||!history.length)return;setHistory(old=>old.slice(0,-1));setError("");emit("The last submitted turn was undone. Ignore that result. Wait for a new game action.");};
 const remaining=Math.max(0,10-history.length);
 return <div className="crew-mini-stage">
  
  <section className="crew-mini-panel crew-mini-number-board" aria-label="1A2B 猜數字">
   <div className="crew-mini-topline"><strong>{dailyDate?"今日同題 · ":""}{mode==="guess"?"破解 "+friend.name+" 的密碼":"幫 "+friend.name+" 猜你的密碼"}</strong><span>{history.length} / 10 次 · 剩餘 {remaining} 次</span></div>
   <progress className="crew-mini-turn-progress" value={history.length} max={10} aria-label="已使用猜測次數" />
   {dailyDate?<p className="crew-mini-daily-note">每日固定題目（UTC {dailyDate}），同難度答案相同；本機僅保留首次完成紀錄。</p>:null}
   {mode==="guess"?<p className="crew-mini-statline">個人最佳：{record.best===null?"尚無紀錄":record.best+" 次"} · 勝場 {record.wins} / {record.played}{dailyDate&&dailyResult?" · 今日首局 "+dailyResult.attempts+" 次":""}</p>:null}
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
     {([1,2,3,4,5,6,7,8,9,null,0,null] as const).map((n,i)=>n===null?<span className="crew-mini-keypad-spacer" aria-hidden="true" key={"space-"+i}/>:<button type="button" key={n} disabled={guess.length>=digits||guess.includes(String(n))||guess.length===0&&n===0} onClick={()=>setGuess(v=>v+String(n))}>{n}</button>)}
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
   <div className="crew-mini-history-head"><strong>最近猜測</strong>
    <div className="crew-mini-history-actions">
     {history.length>0&&!finished?<button type="button" onClick={undo}>撤銷上一筆</button>:null}
     {history.length>0?<GamePanel label="完整紀錄" title="本局猜測紀錄">
      <ol className="crew-mini-number-history">{history.map((row,i)=><li key={i}><span>#{i+1}</span><strong>{row.guess}</strong><b>{row.result.a}A{row.result.b}B</b></li>)}</ol>
     </GamePanel>:null}
    </div>
   </div>
   <ol className="crew-mini-number-history">{history.slice(-3).map((row,i)=><li key={history.length-Math.min(3,history.length)+i}><span>#{history.length-Math.min(3,history.length)+i+1}</span><strong>{row.guess}</strong><b>{row.result.a}A{row.result.b}B</b></li>)}</ol>
   {!history.length?<p className="crew-mini-muted">還沒有猜測，從第一個數字開始吧。</p>:null}
  </section>
  {finished?<section className="crew-mini-result" aria-live="polite">
   <small>CREW PLAY · 1A2B</small><h2>{won?"破解成功！":"本局結束"}</h2>
   <strong className="crew-mini-result-count">{history.length} 次</strong>
   {mode==="guess"?<p>正確答案：<strong>{secret}</strong></p>:<p>{won?friend.name+" 成功猜到你心中的數字。":"十次挑戰已用完，下次再來！"}</p>}
   <blockquote>{friendGameReaction(friend.id,won?"win":"lose","zh")}</blockquote>
   {mode==="guess"?<p>個人最佳：<strong>{record.best===null?"尚無":record.best+" 次"}</strong> · 已完成 {record.played} 局{dailyDate?" · 連續挑戰 "+record.streak+" 天":""}</p>:null}
   {dailyDate&&dailyResult?<p>今日首局：{dailyResult.won?"成功":"未成功"} · {dailyResult.attempts} 次</p>:null}
   <p>3sssi.com/games/1a2b</p>
   <div className="crew-mini-result-actions">
    <button onClick={()=>saveResultImage(history.length,digits,friend.name,won,Boolean(dailyDate),record.best)} type="button">儲存分享卡 PNG</button>
    <button className="crew-mini-primary" onClick={dailyDate?onLeaveDaily:onNew} type="button">{dailyDate?"改玩一般模式":"再玩一局"}</button>
   </div>
  </section>:null}
  <MiniGameVoice kind="1a2b" friend={friend} cue={cue} onSpeech={handleSpeech}/>
  {!finished&&!dailyDate?<button className="crew-mini-restart" type="button" onClick={()=>{if(!history.length||window.confirm("重新出題會清除本局猜測紀錄，確定嗎？"))onNew()}}>重新出題</button>:null}
 </div>;
}
