import {fortuneSpeakingOpening,fortuneSpeakingPolicy,readFortuneSpeakingContext,type FortuneSpeakingKind} from "./fortuneSpeaking";
import{effectiveSpeakingLevel,storedSpeakingLevel}from"./speakingLevelMemory";
import{trackUsageEvent,sessionDurationDetail}from"../analytics/usage";
import {conversationIntent,conversationOpening} from "./conversationIntent";
import{personalMemoryEnabled}from"./studentMemory";
import {voiceIdentityPrompt,normalizeLiveVoice} from "../live/voiceIdentity";
import{hasMeaningfulLearnerSpeech,rememberTeacherConversation}from"./studentMemory";
import{recordCompletedTutorSession}from"./teacherPracticeHistory";
import{useEffect,useMemo,useRef,useState}from"react";import{Link,useNavigate,useSearchParams}from"react-router-dom";
import{LiveControls}from"../live/LiveControls";import{TextChatPanel}from"../live/TextChatPanel";
import{DesktopLivePanel}from"../components/DesktopLivePanel";import{useLiveSession}from"../live/useLiveSession";
import{history,lastLive,vocabularyLevel,geminiKey}from"../lib/runtime";import{useTeacherStore}from"../store/teacherStore";
import{getTeacherProfile}from"./teacherProfiles";
import {teacherLifeBookPrompt,nextTeacherLifeOpening} from "../characters/lifeBook";import{accentOptions,normalizedAccent}from"./teacherAccent";
import{buildTeacherSessionPolicy}from"./teacherPolicy";
import{teacherLanguageLiveHint}from"./teacherLanguageUx";
import{nativeLanguageName}from"./teacherLocale";
import{friendSpokenLanguage}from"../friends/friendLanguage";
import{useTranslation}from"react-i18next";import "./boardEntry.css";import{teacherLanguageReminder,unexpectedTeacherKorean}from"./teacherLanguage";import{TeacherAvatar}from"./TeacherAvatar";import{TeacherProfilePicker}from"./TeacherProfilePicker";import{courseLesson}from"./courseCatalog";import{evaluateCourseSession}from"./courseEvaluation";import{saveLessonProgress,nextUnlockedLesson}from"./courseProgress";

const legacyMissions:any={hotel_checkin:{title:"飯店入住",scene:"飯店",goals:["說出訂房姓名","確認早餐時間","詢問退房時間"]},restaurant_order:{title:"餐廳點餐",scene:"餐廳",goals:["詢問推薦菜色","說明飲食限制","請服務生結帳"]},work_meeting:{title:"工作會議",scene:"工作",goals:["表達一個風險","提出替代方案","確認 action item"]},transport:{title:"問路與交通",scene:"旅遊",goals:["問目的地方向","確認月台","確認這班車是否正確"]}};

export function TeacherLivePage(){
 const {t,i18n:locale}=useTranslation("teacher");const english=locale.language==="en";
 const navigate=useNavigate(),endRequestedRef=useRef(false),usageSentRef=useRef(false),usageStartedRef=useRef(false),memoryCheckpointRef=useRef(false);
 const[p]=useSearchParams(),s=useTeacherStore(),cameraFile=useRef<HTMLInputElement>(null),galleryFile=useRef<HTMLInputElement>(null),courseSavedRef=useRef(false),[picker,setPicker]=useState(false),[assessmentRetry,setAssessmentRetry]=useState(0),[courseResult,setCourseResult]=useState<{done:number;total:number;score:number;stars:number}|null>(null),[evaluating,setEvaluating]=useState(false),[evaluationError,setEvaluationError]=useState("");
 const[endingCourse,setEndingCourse]=useState(false),[changingTeacher,setChangingTeacher]=useState(false),[openingBoard,setOpeningBoard]=useState(false),[teacherSwitchError,setTeacherSwitchError]=useState("");
 const textMode=p.get("chat")==="text";
 const profile=getTeacherProfile(s.teacherProfile),course=courseLesson(p.get("lesson")||""),legacyMission=legacyMissions[p.get("mission")||""]||null,mission=course?{title:course.titleZh,scene:course.scene,goals:course.missions.map(x=>x.titleZh),rolePrompt:course.rolePrompt}:legacyMission,scene=p.get("scene")||mission?.scene||"",historyId=p.get("history"),previous=historyId?history("teacher").find((x:any)=>String(x.id)===historyId)||null:p.get("resume")==="1"?lastLive("teacher"):null;
 useEffect(()=>{document.body.className="teacher-theme session-page";return()=>{document.body.className=""}},[]);
 const fortuneKind:FortuneSpeakingKind|null=p.get("fortune")==="reading"?"reading":p.get("fortune")==="daily"?"daily":p.get("fortune")==="culture"?"culture":null;
 const[fortuneContext]=useState(()=>fortuneKind==="reading"?readFortuneSpeakingContext():null);
 const intent=conversationIntent(p.get("intent"),"teacher");
 const isRoleplay=!fortuneKind&&intent!=="continue"&&(Boolean(mission)||s.conversationMode==="scenario");
 const effectiveLevel=effectiveSpeakingLevel(s.targetLanguage,s.learnerSpeakingLevel,personalMemoryEnabled());
 const freeTalk=!isRoleplay&&(Boolean(fortuneKind)||intent==="continue"||s.conversationMode==="natural");
 const [lifeOpening]=useState(()=>freeTalk&&!fortuneKind&&!previous?.turns?.length&&intent!=="continue"?nextTeacherLifeOpening(profile.id):"");
 const languageDirective=useMemo(()=>teacherLanguageReminder(s.targetLanguage,s.nativeLanguage,isRoleplay?"immersion":s.teachingMode,effectiveLevel),[s.targetLanguage,s.nativeLanguage,s.teachingMode,effectiveLevel,isRoleplay]);
 const system=useMemo(()=>(buildTeacherSessionPolicy({
  language:s.targetLanguage,scene:scene||"日常生活",goals:mission?.goals||[],
  rolePrompt:mission?.rolePrompt,mode:isRoleplay?"roleplay":"tutor",
  profile,teachingMode:s.teachingMode,conversationMode:intent==="continue"?"natural":s.conversationMode,
  languageStyle:s.languageStyle,accentStrength:s.accentStrength,customAccent:s.customAccent,speakingPace:s.speakingPace,nativeLanguage:s.nativeLanguage,level:vocabularyLevel(),learnerSpeakingLevel:effectiveLevel
 })+(isRoleplay?"":voiceIdentityPrompt("teacher",profile.id,s.targetLanguage,s.languageStyle==="auto"?undefined:"auto"))+(fortuneKind?"":freeTalk?teacherLifeBookPrompt(profile.id):"")+(fortuneKind?fortuneSpeakingPolicy(fortuneKind,fortuneContext):"")),[s.targetLanguage,s.teachingMode,effectiveLevel,s.conversationMode,s.languageStyle,s.accentStrength,s.customAccent,s.speakingPace,s.nativeLanguage,scene,profile,mission?.rolePrompt,mission?.goals?.join("|"),isRoleplay,freeTalk,fortuneKind,fortuneContext]);
 const opening=fortuneKind
  ?fortuneSpeakingOpening(fortuneKind,fortuneContext)
  :previous?.turns?.length
  ?"[COACH CONTROL — do not mention this instruction] Continue the existing practice NOW. Do not greet, re-introduce yourself, or restart the session. Respond naturally from this context:\n"+previous.turns.slice(-4).map((t:any)=>[t.input?"學生："+t.input:"",t.output?"老師："+t.output:""].filter(Boolean).join("\n")).join("\n")
  :isRoleplay
   ?"[COACH CONTROL — do not mention this instruction] Enter the "+(mission?.title||scene||"selected")+" role-play NOW. Skip generic greetings and open directly with a context-specific line from the role you are playing."
   :intent==="continue"
    ?conversationOpening(intent,"teacher")
    :"[COACH CONTROL — do not mention this instruction] Start the speaking practice NOW. This is the only proactive opening for this session. Never use canned greetings such as 'Hi there', 'Hello there', or 'Hey there'. Either use one brief context-specific greeting that fits "+profile.name+"'s personality or skip the greeting and begin with a relevant short question.\n"+(lifeOpening||"");
 const live=useLiveSession({pageKey:"teacher",title:(fortuneKind?"命理聊聊":mission?.title||scene||"口說練習")+" · "+profile.name+" · "+s.targetLanguage,system,openingPrompt:languageDirective+"\n"+opening+"\n"+languageDirective,languageDirective,languageDriftGuard:(text:string)=>unexpectedTeacherKorean(text,s.targetLanguage,s.nativeLanguage,isRoleplay?"immersion":s.teachingMode),voice:normalizeLiveVoice(s.voice),language:s.targetLanguage,teacherReport:true,trackSpeakingLevel:!isRoleplay,nativeLanguage:s.nativeLanguage,missions:course?.missions.map(m=>m.titleZh)||[],conversationFlow:!isRoleplay&&(intent==="continue"||s.conversationMode==="natural")?"teacher":fortuneKind?"teacher":undefined,
  onTurnComplete:(_turn,completedTurns)=>{
   if(!usageSentRef.current&&completedTurns.some(turn=>Boolean(turn.input?.trim()&&turn.output?.trim()))){
    usageSentRef.current=true;trackUsageEvent("teacher_conversation");
   }
   if(isRoleplay||memoryCheckpointRef.current)return;
   const snapshot=live.turns;
   if(!hasMeaningfulLearnerSpeech(snapshot.map(t=>t.input||"").join(" ")))return;
   memoryCheckpointRef.current=true;
   void rememberTeacherConversation(s.targetLanguage,snapshot,geminiKey());
  },
  onSessionFinished:item=>{
   if(!item)return;
   if(item.durationMs>0)trackUsageEvent("teacher_session_end",sessionDurationDetail(item.durationMs));
   if(isRoleplay)return;
   // Long sessions have a richer report; short conversations still retain explicit facts.
   if(item.durationMs<60000||item.turns.filter(t=>Boolean(t.input?.trim())).length<3)
    void rememberTeacherConversation(s.targetLanguage,item.turns,geminiKey());
  }});
 useEffect(()=>{if((live.state==="listening"||live.state==="speaking")&&!usageStartedRef.current){usageStartedRef.current=true;trackUsageEvent("teacher_conversation_start")}},[live.state]);
 useEffect(()=>{if(live.state==="requesting-mic"){courseSavedRef.current=false;setCourseResult(null)}},[live.state]);
 useEffect(()=>{
  if(live.state!=="ended"||!course||courseSavedRef.current||!live.turns.length)return;
  courseSavedRef.current=true;
  setEndingCourse(true);
  let cancelled=false;setEvaluating(true);setEvaluationError("");
  void evaluateCourseSession(course,live.turns,live.report).then(result=>{
   if(cancelled)return;
   if(result.stars>0)saveLessonProgress(course.id,result.stars,result.score);
   setCourseResult({done:result.done,total:result.total,score:result.score,stars:result.stars});
  }).catch(error=>{if(!cancelled)setEvaluationError(error instanceof Error?error.message:"課程評估失敗")})
  .finally(()=>{if(!cancelled)setEvaluating(false)});
  return()=>{cancelled=true};
 },[course?.id,live.state,live.report,live.turns,assessmentRetry]);
 // The selected teacher starts when the session page opens. Deferral avoids a StrictMode double-mount call.
 useEffect(()=>{if(textMode)return;const timer=window.setTimeout(()=>{void live.start()},0);return()=>window.clearTimeout(timer)},[live.start,textMode]);
 const tutorHistoryRecorded=useRef(false);
 useEffect(()=>{
  if(live.state==="requesting-mic"){tutorHistoryRecorded.current=false;return}
  if(live.state!=="ended"||tutorHistoryRecorded.current)return;
  tutorHistoryRecorded.current=true;
  recordCompletedTutorSession(profile.id,s.targetLanguage,live.durationMs,
   live.turns.filter(turn=>Boolean(turn.input?.trim())).length,isRoleplay);
 },[live.state,live.durationMs,live.turns,profile.id,s.targetLanguage,isRoleplay]);
 const endAndReturn=async()=>{
  if(endRequestedRef.current||endingCourse){
   if(course&&!evaluating&&(courseResult||evaluationError))navigate("/teacher/course?lesson="+encodeURIComponent(course.id));
   return;
  }
  endRequestedRef.current=true;
  tutorHistoryRecorded.current=true;
  if(course){
   courseSavedRef.current=true;
   setEndingCourse(true);
   setEvaluating(true);
   setEvaluationError("");
   setCourseResult(null);
  }
  try{
   const saved=await live.stop(true);
   if(saved){
    recordCompletedTutorSession(profile.id,s.targetLanguage,saved.durationMs,
     saved.turns.filter(t=>Boolean(t.input?.trim())).length,isRoleplay);
   }
   if(!course)return;
   if(!saved||!saved.turns.some(t=>Boolean(t.input?.trim()))){
    setEvaluationError("這次沒有可評估的學生發言；可返回課程地圖再練習。");
    return;
   }
   // Keep the learner on the finished lesson while grading. The single
   // promise saves results even if the learner leaves during a slow response.
   const grading=saved.completion
    .then(done=>evaluateCourseSession(course,done.turns,done.report))
    .then(result=>{
     if(result.stars>0)saveLessonProgress(course.id,result.stars,result.score);
     setCourseResult({done:result.done,total:result.total,score:result.score,stars:result.stars});
     setEvaluationError("");
     return result;
    });
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{
    await Promise.race([
     grading,
     new Promise<never>((_,reject)=>{
      timer=window.setTimeout(()=>reject(new Error("評估時間較長。可先查看課程地圖；若背景評估完成，進度會自動儲存。")),30000);
     })
    ]);
   }catch(error){
    setEvaluationError(error instanceof Error?error.message:"課程評估失敗，可重試。");
   }finally{
    if(timer!==undefined)window.clearTimeout(timer);
   }
  }catch(error){
   if(course)setEvaluationError(error instanceof Error?error.message:"無法結束練習，請重試。");
  }finally{
   if(course)setEvaluating(false);
   else navigate(fortuneKind?"/teacher/fortune":"/teacher/practice");
  }
 };
 const sessionActive=["requesting-mic","connecting","listening","speaking","ending","reporting"].includes(live.state);
 const openBoard=async()=>{
  if(openingBoard||changingTeacher||endingCourse)return;
  if(sessionActive&&!window.confirm(t("board.entryConfirm")))return;
  setOpeningBoard(true);setTeacherSwitchError("");
  try{
   // The board starts its own Live session. Never leave the existing mic/socket running.
   if(!textMode&&sessionActive)await live.stop(true);
   navigate("/teacher/board");
  }catch{
   setOpeningBoard(false);
   setTeacherSwitchError(t("board.entryError"));
  }
 };
 const changeTeacher=async()=>{
  if(changingTeacher||openingBoard)return;
  if(sessionActive){
   const confirmation=course
    ?english?"Changing teachers ends this lesson without a completion score. Continue?":"更換老師會結束這堂課，尚未完成的練習不會計入進度。確定繼續？"
    :english?"Changing teachers ends the current conversation. Continue?":"更換老師會結束目前的對話，確定繼續？";
   if(!window.confirm(confirmation))return;
  }
  setChangingTeacher(true);setTeacherSwitchError("");
  try{
   if(!textMode)await live.stop(true);
   navigate("/teacher/roles?mode=teacher",{state:{openTeacherPicker:true}});
  }catch{
   setChangingTeacher(false);
   setTeacherSwitchError(english?"Couldn't end the session. Please try again.":"無法結束目前對話，請重試。");
  }
 };
 const alternateParams=new URLSearchParams(p);
  if(textMode)alternateParams.delete("chat");else alternateParams.set("chat","text");
  const alternateHref="/teacher/live?"+alternateParams.toString();
  const presenceState=live.state==="speaking"?"speaking":live.state==="listening"?"listening":live.state==="connecting"||live.state==="requesting-mic"?"connecting":live.state==="reporting"?"waiting":live.state==="error"?"error":"idle";
 return <><header className="app-header"><div className="shell inner"><div className="app-brand"><Link className="back-btn" to={course?"/teacher/course?lesson="+encodeURIComponent(course.id):fortuneKind?"/teacher/fortune":"/teacher/practice"} onClick={e=>{e.preventDefault();void endAndReturn()}}>‹</Link><div className="app-title"><strong>{profile.name}</strong><small>Crew Teacher · {s.targetLanguage}</small></div></div><span className="status connected"><i className="status-dot"/><span>{live.state==="speaking"?"老師說話中":live.state==="listening"?"正在聽你說":"語音練習"}</span></span></div></header>
 <main className="session-shell">
 {mission&&<div className="notice live-mission"><div><b>這次要完成</b><p>{mission.goals.join(" · ")}</p></div></div>}
 <div className="desktop-live-workspace teacher-desktop-workspace"><section className="live-stage teacher-live-stage" data-state={live.state} aria-label="語音練習">
  <div className="live-identity">
   <div className="teacher-presence-shell" data-state={presenceState}><span className="teacher-presence-orbit" aria-hidden="true"/><div className={"teacher-live-avatar teacher-presence "+presenceState}><TeacherAvatar profile={profile}/><i className="live-presence-dot"/></div></div>
   <h1>{fortuneKind?"命理聊聊 · "+profile.name:mission?mission.title:profile.name+" 老師"}</h1>
    <div className="teacher-live-entry-actions">
     <button type="button" className="teacher-live-change-action" onClick={()=>void changeTeacher()} disabled={changingTeacher||openingBoard||endingCourse}>{changingTeacher?(english?"Switching…":"切換中…"):(english?"Change teacher →":"更換老師 →")}</button>
     {!course&&!fortuneKind&&<button type="button" className="teacher-live-change-action teacher-live-board-entry" onClick={()=>void openBoard()} disabled={changingTeacher||openingBoard||endingCourse}>{openingBoard?t("board.entryOpening"):t("board.entryAction")} →</button>}
    </div>
    {teacherSwitchError&&<p className="teacher-switch-error" role="alert">{teacherSwitchError}</p>}
   <p>{fortuneKind?"命理是文化與自我探索素材；聊聊你真正關心的事情。":mission?"直接進入情境，完成任務即可。":profile.description}</p>
   {!isRoleplay&&<p className="teacher-native-help teacher-live-language-hint" role="note">{teacherLanguageLiveHint(
    s.teachingMode,effectiveLevel,nativeLanguageName(s.nativeLanguage),
    english?friendSpokenLanguage(s.targetLanguage):s.targetLanguage,english)}</p>}
  </div>
  <div className="crew-chat-mode-switch"><span>{textMode?"文字聊天":"語音聊天"}</span><Link className="btn secondary small" to={alternateHref} onClick={event=>{if(textMode)return;event.preventDefault();void live.stop(true).finally(()=>navigate(alternateHref))}}>{textMode?"改用語音":"改用文字"}</Link></div>
  {textMode?<TextChatPanel system={system+"\n"+languageDirective} speaker={profile.name} english={english} hint={course?"文字聊天不計入這堂口說課的完成評分。":undefined}/>:<>
  {endingCourse
   ?<div className="notice" role="status"><div><b>{evaluating?"正在整理課程結果":"這次練習已結束"}</b><p>{evaluating?"正在依實際對話評估任務，完成後會在下方顯示結果。":"可查看評估結果，或返回課程地圖繼續學習。"}</p></div></div>
   :<LiveControls live={live} onEnd={endAndReturn} prominentInterrupt interruptLabel="換我說"/>}
  <details className="teacher-live-quick-actions"><summary>{english?"Conversation shortcuts":"對話快捷操作"}</summary><div className="live-presets">{!sessionActive&&<Link className="live-mode-shortcut" to="/teacher/roles?mode=teacher">設定聊天／情境模式</Link>}{!isRoleplay&&<><button onClick={()=>live.sendText(languageDirective+"\n換一個更生活化的話題，直接問我一個短問題。不要重新打招呼。")}>換話題</button><button onClick={()=>live.sendText(languageDirective+"\n請糾正我剛剛最明顯的一個錯誤，給我自然說法後讓我重說一次。不要重新打招呼。")}>糾正我</button></>}<button onClick={()=>live.sendText(languageDirective+"\n請把接下來的語速稍微放慢，但保持自然發音。直接承接目前對話。")}>說慢一點</button></div></details>
  <div className="live-transcript"><div className={"live-line user "+(live.input?"show":"")}><small>你剛剛說</small><span>{live.input}</span></div><div className={"live-line "+(live.output?"show":"")}><small>{profile.name}</small><span>{live.output}</span></div></div>
  </>}
  {!textMode&&<details className="live-more"><summary>更多功能</summary><div className="live-more-body">
   <button className="teacher-current-row live-teacher-row" disabled={sessionActive} onClick={()=>setPicker(true)}><span className="teacher-current-avatar"><TeacherAvatar profile={profile} decorative/></span><span><span className="label">老師</span><strong>{profile.name} · {profile.title}</strong><small>{sessionActive?"結束這次練習後可切換":"點擊切換"}</small></span></button>
   <div className={"live-config "+(sessionActive?"locked":"")}><div className="live-setup-grid">
    <label><span className="label">目標語言</span><select className="field" disabled={sessionActive} value={s.targetLanguage} onChange={e=>s.setTargetLanguage(e.target.value)}><option>英文</option><option>日文</option><option>韓文</option><option>西班牙文</option><option>法文</option></select></label>
    <label><span className="label">聊天模式</span><select className="field" disabled={sessionActive} value={s.conversationMode} onChange={e=>s.setConversationMode(e.target.value as any)}><option value="natural">自然聊天</option><option value="scenario">情境聊天</option><option value="practice">練習聊天</option></select></label>
    <label><span className="label">我的口說程度</span><select className="field" disabled={sessionActive} value={s.learnerSpeakingLevel} onChange={e=>s.setLearnerSpeakingLevel(e.target.value as typeof s.learnerSpeakingLevel)}><option value="auto">自動 · 依長期口說調整</option><option value="A1">A1</option><option value="A2">A2</option><option value="B1">B1</option><option value="B2">B2+</option></select></label>{s.learnerSpeakingLevel==="auto"&&storedSpeakingLevel(s.targetLanguage,personalMemoryEnabled())&&
       <p className="live-config-note">長期對話引導：目前偏 {storedSpeakingLevel(s.targetLanguage,personalMemoryEnabled())}（非正式檢定，下一次對話生效）</p>}
      <label><span className="label">教學模式</span><select className="field" disabled={sessionActive} value={s.teachingMode} onChange={e=>s.setTeachingMode(e.target.value as any)}><option value="beginner">零基礎引導</option><option value="bilingual">雙語輔助</option><option value="immersion">全外語沉浸</option></select></label>
    <label><span className="label">語速</span><select className="field" disabled={sessionActive} value={s.speakingPace} onChange={e=>s.setSpeakingPace(e.target.value as any)}><option value="slow">慢</option><option value="normal">正常</option><option value="fast">快</option></select></label>
    <label><span className="label">地區口音</span><select className="field" disabled={sessionActive} value={normalizedAccent(s.targetLanguage,s.languageStyle)} onChange={e=>s.setLanguageStyle(e.target.value as any)}>{accentOptions(s.targetLanguage).map(a=><option key={a.value} value={a.value}>{a.label}</option>)}</select></label>
   </div>{sessionActive&&<p className="live-config-note">這些設定會套用到下一次對話；目前這次不會中途改變。</p>}</div>
   <div className="vision-box"><div className="vision-head"><strong>讓 {profile.name} 看一張圖</strong><span>教材 · 題目 · 菜單 · 路牌</span></div><div className="vision-actions"><button className="vision-btn" disabled={live.state!=="listening"||live.visionSending} onClick={()=>cameraFile.current?.click()}>{live.visionSending?"正在送出…":"拍照"}</button><button className="vision-btn" disabled={live.state!=="listening"||live.visionSending} onClick={()=>galleryFile.current?.click()}>從相簿選</button></div><input ref={cameraFile} type="file" accept="image/*" capture="environment" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void live.sendImageFile(f,"請先真的看最新這張圖，再以目前目標語言直接帶我學。先問一個和圖片直接相關的問題，不要重新打招呼。");e.currentTarget.value=""}}/><input ref={galleryFile} type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void live.sendImageFile(f,"請先真的看最新這張圖，再以目前目標語言直接帶我學。先問一個和圖片直接相關的問題，不要重新打招呼。");e.currentTarget.value=""}}/>{live.lastImage&&<div className="vision-latest"><img src={live.lastImage.preview} alt="最新送出的照片"/><span><b>已送給 {profile.name}</b><small>最新照片{live.lastImage.width&&live.lastImage.height?" · "+live.lastImage.width+"×"+live.lastImage.height:""}</small></span></div>}{live.visionError&&<p className="vision-error">{live.visionError}</p>}</div>
  </div></details>}
 </section>{!textMode&&<DesktopLivePanel kind="teacher" label={profile.name} language={s.targetLanguage} turns={live.turns} input={live.input} output={live.output} state={live.state}/>}</div>
 {live.report&&<section className="report-card"><div className="row" style={{justifyContent:"space-between"}}><div><span className="kicker">學習回顧</span><h3>課後學習報告</h3></div><div className="report-score">{String(live.report.overall_score??"--")}</div></div><div className="report-grid"><div className="report-stat"><b>{String(live.report.fluency_score??"--")}</b><span>流暢度</span></div><div className="report-stat"><b>{String(live.report.vocab_score??"--")}</b><span>詞彙</span></div><div className="report-stat"><b>{String(live.report.grammar_score??"--")}</b><span>文法</span></div></div><div className="report-body">{String(live.report.summary??"")}</div></section>}
 {course&&evaluating&&<div className="notice"><div><b>正在評估情境任務…</b><p>依你的實際回答判斷，不只比對關鍵字。</p></div></div>}{course&&evaluationError&&<div className="notice" role="alert"><div><b>課程評估尚未完成</b><p>{evaluationError}</p><div className="actions"><button className="btn secondary small" disabled={evaluating} onClick={()=>{courseSavedRef.current=false;setEvaluationError("");setCourseResult(null);setEvaluating(true);setAssessmentRetry(x=>x+1)}}>重新評估</button><Link className="btn secondary small" to={"/teacher/course?lesson="+encodeURIComponent(course.id)}>返回課程地圖</Link></div></div></div>}{course&&courseResult&&<section className="report-card course-complete-card"><div className="row" style={{justifyContent:"space-between"}}><div><span className="kicker">課程進度</span><h3>{course.titleZh}</h3></div><div className="report-score">{courseResult.stars?"★".repeat(courseResult.stars):"—"}</div></div><div className="report-grid"><div className="report-stat"><b>{courseResult.done}/{courseResult.total}</b><span>任務</span></div><div className="report-stat"><b>{courseResult.score}</b><span>完成度</span></div><div className="report-stat"><b>{courseResult.stars}</b><span>星等</span></div></div><div className="report-body">{courseResult.stars?"這堂已記錄完成，可以回課程地圖繼續下一堂。":"這次還沒有完成足夠任務；可再練一次，不會鎖住目前這堂。"}</div><div className="actions"><Link className="btn secondary small" to={"/teacher/course?lesson="+encodeURIComponent(course.id)}>回課程地圖</Link>{courseResult.stars>0&&<Link className="btn primary small" to={"/teacher/course?lesson="+encodeURIComponent(nextUnlockedLesson(course.trackId)?.id||course.id)}>查看下一堂 →</Link>}</div></section>}
 </main>{picker&&<TeacherProfilePicker onClose={()=>setPicker(false)}/>}</>
}
