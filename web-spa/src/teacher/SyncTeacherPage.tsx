import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {geminiKey} from "../lib/runtime";
import {getTeacherProfile} from "./teacherProfiles";
import {TeacherAvatar} from "./TeacherAvatar";
import {TeachingCard} from "./TeachingCard";
import {generateTeachingPlan,type TeachingPlan,type TeachingContext} from "./syncTeachingPlan";
import {listenOnce,recognitionConstructor,syncSpeechAvailable,syncSpeechLocale,playTeachingSegments,speakSyncSegment} from "./syncTeachingSpeech";
import "./teachingBoard.css";
import "./syncTeacher.css";

type Phase="idle"|"listening"|"generating"|"speaking";
type Reply={id:number;learner:string;plan?:TeachingPlan;spoken:number;focus:number;status:"generating"|"speaking"|"done"|"interrupted"|"failed";answers:Record<string,number>};
export function SyncTeacherPage(){
 const {i18n}=useTranslation("teacher"),zh=i18n.language.startsWith("zh"),t=(a:string,b:string)=>zh?a:b;
 const s=useTeacherStore(),profile=getTeacherProfile(s.teacherProfile);
 const [phase,setPhase]=useState<Phase>("idle"),[draft,setDraft]=useState(""),[heard,setHeard]=useState(""),[error,setError]=useState("");
 const [inputMode,setInputMode]=useState<"native"|"target">("native");
 const [replies,setReplies]=useState<Reply[]>([]);
 const repliesRef=useRef<Reply[]>([]),history=useRef<TeachingContext[]>([]),seq=useRef(0),generation=useRef(0);
 const request=useRef<AbortController|null>(null),recognition=useRef<ReturnType<typeof listenOnce>|null>(null),active=useRef<number|null>(null);
 const thread=useRef<HTMLDivElement>(null),follow=useRef(true),autoTop=useRef<number|null>(null);
 function publish(next:Reply[]){repliesRef.current=next;setReplies(next)}
 function patch(id:number,fields:Partial<Reply>){publish(repliesRef.current.map(r=>r.id===id?{...r,...fields}:r))}
 function remember(id:number){
  const r=repliesRef.current.find(r=>r.id===id);if(!r?.plan)return;
  const spoken=r.plan.segments.slice(0,r.spoken).map(seg=>seg.text).join(" ");
  if(spoken)history.current=[...history.current,{learner:r.learner,teacher:spoken}].slice(-8);
 }
 function cancel(keep=true){
  generation.current++;recognition.current?.abort();recognition.current=null;request.current?.abort();request.current=null;
  const id=active.current;active.current=null;
  if(keep&&id!==null){remember(id);patch(id,{status:"interrupted",focus:-1})}
  if(keep){setPhase("idle");setHeard("")}
 }
 useEffect(()=>()=>cancel(false),[]);
 useEffect(()=>{document.body.classList.add("session-page");return()=>document.body.classList.remove("session-page")},[]);
 useEffect(()=>{const pane=thread.current;if(!pane||!follow.current)return;const focused=pane.querySelector<HTMLElement>("[data-sync-active=true] .is-highlighted,[data-sync-active=true] .teaching-board-step-focus");if(focused){const bounds=pane.getBoundingClientRect(),rect=focused.getBoundingClientRect();if(rect.top<bounds.top||rect.bottom>bounds.bottom){autoTop.current=Math.max(0,Math.min(pane.scrollHeight-pane.clientHeight,pane.scrollTop+rect.top-bounds.top-10));pane.scrollTop=autoTop.current}}else{autoTop.current=Math.max(0,pane.scrollHeight-pane.clientHeight);pane.scrollTop=autoTop.current}},[replies,phase]);
 async function send(value:string){
  const text=value.trim().slice(0,1200);if(!text)return;
  if(!geminiKey()){setError(t("請先設定 Gemini API Key。","Set a Gemini API key first."));return}
  cancel();const epoch=++generation.current,id=++seq.current,controller=new AbortController();
  request.current=controller;active.current=id;follow.current=true;setDraft("");setHeard("");setError("");setPhase("generating");
  publish([...repliesRef.current,{id,learner:text,spoken:0,focus:-1,status:"generating",answers:{}}].slice(-40));
  try{
   const plan=await generateTeachingPlan(text,history.current,{target:s.targetLanguage,native:s.nativeLanguage,teacher:profile.name,persona:profile.personaPrompt,mode:s.teachingMode,level:s.learnerSpeakingLevel},geminiKey(),controller.signal);
   if(generation.current!==epoch||controller.signal.aborted)return;
   patch(id,{plan,status:"speaking"});setPhase("speaking");
   if(!syncSpeechAvailable())throw new Error("speech synthesis unavailable");
   const rate=s.speakingPace==="slow"?0.8:s.speakingPace==="fast"?1.15:1;
   await playTeachingSegments(plan.segments,(segment,onStart,signal)=>speakSyncSegment(segment,syncSpeechLocale(segment.lang==="target"?s.targetLanguage:s.nativeLanguage),rate,onStart,signal),index=>{
    if(generation.current===epoch)patch(id,{spoken:index+1,focus:plan.segments[index].focus});
   },controller.signal);
   if(generation.current!==epoch||controller.signal.aborted)return;
   patch(id,{status:"done",focus:-1,spoken:plan.segments.length});remember(id);
  }catch(e){
   if(generation.current!==epoch||controller.signal.aborted)return;
   patch(id,{status:"failed",focus:-1});
   setError(t("生成或語音播放失敗，可以重試或返回原版老師。","Generation or speech failed. Retry or return to the original teacher.")+" ("+(e instanceof Error?e.message:"error")+")");
  }finally{if(generation.current===epoch){active.current=null;request.current=null;setPhase("idle")}}
 }
 function startMic(){
  if(phase==="listening"){recognition.current?.stop();return}
  if(!geminiKey()){setError(t("請先設定 Gemini API Key。","Set a Gemini API key first."));return}
  if(!recognitionConstructor()){setError(t("此瀏覽器不支援語音辨識，請使用文字輸入。","Speech recognition is unavailable. Type instead."));return}
  cancel();setError("");setHeard("");setPhase("listening");const epoch=++generation.current;
  try{recognition.current=listenOnce(syncSpeechLocale(inputMode==="native"?s.nativeLanguage:s.targetLanguage),{
   partial:text=>{if(generation.current===epoch)setHeard(text)},
   done:text=>{if(generation.current===epoch){recognition.current=null;void send(text)}},
   error:reason=>{if(generation.current===epoch){recognition.current=null;setPhase("idle");setError(t("語音辨識未完成，請再試一次或輸入文字。","Speech recognition did not finish. Try again or type.")+" ("+reason+")")}}
  })}catch{setPhase("idle");setError(t("無法啟動麥克風。","Unable to start microphone."))}
 }
 const busy=phase!=="idle",latest=replies.at(-1)?.id;
 return <main className="sync-teacher">
  <header className="sync-teacher-header"><TeacherAvatar profile={profile} decorative className="sync-teacher-avatar"/><div><strong>{profile.name}</strong><small>{t("同步教學・實驗版","Synchronized teaching · Experimental")}</small></div><Link to="/teacher/live">{t("原版通話","Original call")}</Link></header>
  <div className="sync-teacher-thread" ref={thread} onWheel={()=>{follow.current=false;autoTop.current=null}} onTouchMove={()=>{follow.current=false;autoTop.current=null}} onScroll={e=>{const p=e.currentTarget;if(autoTop.current!==null&&Math.abs(p.scrollTop-autoTop.current)<2){autoTop.current=null;return}follow.current=p.scrollHeight-p.clientHeight-p.scrollTop<96}}>
   {!replies.length&&<section className="sync-teacher-intro"><h1>{t("跟老師一起看教材","Learn with synchronized material")}</h1><p>{t("按麥克風說話，或輸入問題。老師會先準備同一份講稿和教材，開始講解時同步標示重點。","Tap the mic or type a question. Your teacher prepares one shared script and material, then highlights each point as it is spoken.")}</p><p>{t("本實驗使用瀏覽器語音辨識與朗讀，語音可能和原版老師不同。語音辨識可能由瀏覽器服務處理。","This experiment uses browser recognition and speech synthesis. The voice may differ from the original teacher; recognition may use a browser service.")}</p><p>{t("使用你的 Gemini API Key；對話僅保留於本次頁面。","Uses your Gemini API key. Conversation is retained only on this page.")}</p></section>}
   {replies.map(r=><div className="sync-teacher-turn" key={r.id}>
    <div className="sync-teacher-user">{r.learner}</div>
    <section className="sync-teacher-reply" data-sync-active={r.id===active.current&&r.status==="speaking"?"true":undefined}>
     <small>{profile.name}</small>
     {r.status==="generating"&&<p role="status">{t("正在準備講稿與教材…","Preparing speech and material…")}</p>}
     {r.plan&&<><p className="sync-teacher-caption" lang={r.plan.segments[Math.max(0,r.spoken-1)]?.lang==="native"?s.nativeLanguage:syncSpeechLocale(s.targetLanguage)}>{r.status==="failed"||r.status==="done"?r.plan.segments.map(seg=>seg.text).join(" "):r.plan.segments.slice(0,r.spoken).map(seg=>seg.text).join(" ")}</p>
      {r.plan.choice.kind==="material"&&<div className="teacher-visual-reply"><TeachingCard card={r.plan.choice.card} answers={r.answers} english={!zh} focusIndex={r.focus} disabled={busy||r.id!==latest} readOnly={r.id!==latest} onAnswer={(card,i,selected)=>{const q=card.questions[i],key=card.id+":"+i;if(busy||r.id!==latest||!q||!Number.isInteger(selected)||selected<0||selected>=q.options.length||r.answers[key]!==undefined)return;patch(r.id,{answers:{...r.answers,[key]:selected}});void send(t("我的測驗答案：","My quiz answer: ")+q.question+" — "+q.options[selected])}} onExplain={text=>{if(!busy)void send(t("請解釋：","Please explain: ")+text)}}/></div>}
      {r.status==="speaking"&&<div className="sync-teacher-progress"><progress max={r.plan.segments.length} value={r.spoken}/><small>{r.spoken}/{r.plan.segments.length}</small></div>}
     </>}
     {r.status==="interrupted"&&<small>{t("已中斷","Interrupted")}</small>}
     {r.status==="failed"&&<button className="sync-teacher-retry" disabled={busy} onClick={()=>void send(r.learner)}>{t("重試","Retry")}</button>}
    </section>
   </div>)}
  </div>
  <footer className="sync-teacher-controls">
   {error&&<p role="alert" className="sync-teacher-error">{error}</p>}
   {heard&&phase==="listening"&&<p className="sync-teacher-heard" role="status">{heard}</p>}
   <div className="sync-teacher-microw"><label>{t("辨識語言","Recognition language")} <select value={inputMode} disabled={busy} onChange={e=>setInputMode(e.target.value==="target"?"target":"native")}><option value="native">{s.nativeLanguage}</option><option value="target">{s.targetLanguage}</option></select></label>
    <button type="button" onClick={startMic} disabled={phase==="generating"||phase==="speaking"}>{phase==="listening"?t("說完了","Done speaking"):t("🎙 說話","🎙 Speak")}</button>
    {busy&&<button type="button" onClick={()=>cancel()}>{t("中斷","Interrupt")}</button>}
   </div>
   <form onSubmit={e=>{e.preventDefault();if(!busy)void send(draft)}}><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={1200} placeholder={t("問老師一個問題…","Ask your teacher…")} aria-label={t("輸入問題","Your question")} disabled={busy}/><button disabled={busy||!draft.trim()}>{t("送出","Send")}</button></form>
   <Link className="sync-teacher-exit" to="/learn">{t("結束教學","End lesson")}</Link>
  </footer>
 </main>
}
