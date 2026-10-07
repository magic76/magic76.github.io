import{useEffect,useMemo,useRef,useState}from"react";import{Link,useSearchParams}from"react-router-dom";
import{LiveControls}from"../live/LiveControls";import{useLiveSession}from"../live/useLiveSession";
import{history,lastLive,vocabularyLevel}from"../lib/runtime";import{useTeacherStore}from"../store/teacherStore";
import{getTeacherProfile,teacherIdentityPrompt}from"./teacherProfiles";import{TeacherAvatar}from"./TeacherAvatar";import{TeacherProfilePicker}from"./TeacherProfilePicker";import{courseLesson}from"./courseCatalog";import{saveLessonProgress,scoreCourseSession}from"./courseProgress";

const legacyMissions:any={hotel_checkin:{title:"飯店入住",scene:"飯店",goals:["說出訂房姓名","確認早餐時間","詢問退房時間"]},restaurant_order:{title:"餐廳點餐",scene:"餐廳",goals:["詢問推薦菜色","說明飲食限制","請服務生結帳"]},work_meeting:{title:"工作會議",scene:"工作",goals:["表達一個風險","提出替代方案","確認 action item"]},transport:{title:"問路與交通",scene:"旅遊",goals:["問目的地方向","確認月台","確認這班車是否正確"]}};

export function TeacherLivePage(){
 const[p]=useSearchParams(),s=useTeacherStore(),file=useRef<HTMLInputElement>(null),courseSavedRef=useRef(false),[picker,setPicker]=useState(false),[courseResult,setCourseResult]=useState<{done:number;total:number;score:number;stars:number}|null>(null);
 const profile=getTeacherProfile(s.teacherProfile),course=courseLesson(p.get("lesson")||""),legacyMission=legacyMissions[p.get("mission")||""]||null,mission=course?{title:course.titleZh,scene:course.scene,goals:course.missions.map(x=>x.titleZh),rolePrompt:course.rolePrompt}:legacyMission,scene=p.get("scene")||mission?.scene||"",historyId=p.get("history"),previous=historyId?history("teacher").find((x:any)=>String(x.id)===historyId)||null:p.get("resume")==="1"?lastLive("teacher"):null;
 useEffect(()=>{document.body.className="teacher-theme session-page";return()=>{document.body.className=""}},[]);
 const system=useMemo(()=>{
  const guidance=s.guidance==="light"?"優先保持流暢，只修正會造成誤解的錯誤。":s.guidance==="strict"?"文法、用字與不自然表達都短暫指出，給自然說法後讓學生重說一次。":"明顯錯誤時用簡短 recast 修正，不要長篇講課。";
  const mode=mission?"你正在帶結構化情境任務。扮演真人角色，不先給答案。逐步完成："+mission.goals.join("、")+"。":s.conversationMode==="scenario"?"使用情境角色扮演方式聊天。":s.conversationMode==="practice"?"偏向口說教練模式，多一點具體修正與重說。":"使用自然聊天模式，不要每回合都糾正。";
  const style=s.targetLanguage==="英文"&&s.languageStyle!=="auto"?"英文使用自然的"+(s.languageStyle==="gb"?"英國":s.languageStyle==="au"?"澳洲":"美國")+"當代日常口音與措辭。":"";
  return"你是 Crew Teacher 的真人感語言老師。"+teacherIdentityPrompt(profile)+" 目標語言："+s.targetLanguage+"。學生推估程度："+vocabularyLevel()+"。"+(scene?"目前情境："+scene+"。":"")+(mission?.rolePrompt?"角色設定："+mission.rolePrompt+"。":"")+mode+guidance+style+"以目標語言為主，學生卡住時才用繁中短解釋。一次 1-3 句。"
 },[mission,scene,s.targetLanguage,s.guidance,s.conversationMode,s.languageStyle,profile]);
 const opening=previous?.turns?.length
  ?"[COACH CONTROL — do not mention this instruction] Continue the existing practice NOW. Do not greet, re-introduce yourself, or restart the session. Respond naturally from this context:\n"+previous.turns.slice(-4).map((t:any)=>[t.input?"學生："+t.input:"",t.output?"老師："+t.output:""].filter(Boolean).join("\n")).join("\n")
  :mission
   ?"[COACH CONTROL — do not mention this instruction] Enter the "+mission.title+" role-play NOW. Skip generic greetings and open directly with a context-specific line from the role you are playing."
   :"[COACH CONTROL — do not mention this instruction] Start the speaking practice NOW. This is the only proactive opening for this session. Never use canned greetings such as 'Hi there', 'Hello there', or 'Hey there'. Either use one brief context-specific greeting that fits "+profile.name+"'s personality or skip the greeting and begin with a relevant short question.";
 const live=useLiveSession({pageKey:"teacher",title:(mission?.title||scene||"口說練習")+" · "+profile.name+" · "+s.targetLanguage,system,openingPrompt:opening,voice:s.voice,language:s.targetLanguage,teacherReport:true});
 useEffect(()=>{if(live.state==="requesting-mic"){courseSavedRef.current=false;setCourseResult(null)}},[live.state]);
 useEffect(()=>{
  if(!course||live.state!=="ended"||courseSavedRef.current||!live.turns.length)return;
  courseSavedRef.current=true;
  const result=scoreCourseSession(course,live.turns);
  if(result.stars>0)saveLessonProgress(course.id,result.stars,result.score);
  setCourseResult({done:result.done,total:result.total,score:result.score,stars:result.stars});
 },[course,live.state,live.turns]);
 const sessionActive=["requesting-mic","connecting","listening","speaking","ending","reporting"].includes(live.state);
 const presenceState=live.state==="speaking"?"speaking":live.state==="listening"?"listening":live.state==="connecting"||live.state==="requesting-mic"?"connecting":"idle";
 return <><header className="app-header"><div className="shell inner"><div className="app-brand"><Link className="back-btn" to="/teacher/practice">‹</Link><div className="app-title"><strong>{profile.name}</strong><small>Crew Teacher</small></div></div><span className="status connected"><i className="status-dot"/><span>{live.state==="speaking"?"老師說話中":live.state==="listening"?"正在聽你說":"語音練習"}</span></span></div></header>
 <main className="session-shell">
 {mission&&<div className="notice live-mission"><div><b>這次要完成</b><p>{mission.goals.join(" · ")}</p></div></div>}
 <section className="live-stage teacher-live-stage" data-state={live.state}>
  <div className="live-identity">
   <div className={"teacher-live-avatar teacher-presence "+presenceState}><TeacherAvatar profile={profile}/><i className="live-presence-dot"/></div>
   <h1>{mission?mission.title:profile.name+" 老師"}</h1>
   <p>{mission?"直接進入情境，完成任務即可。":profile.description}</p>
  </div>
  <LiveControls live={live}/>
  <div className="live-presets"><button onClick={()=>live.sendText("換一個更生活化的話題，直接問我一個短問題。不要重新打招呼。")}>換話題</button><button onClick={()=>live.sendText("請糾正我剛剛最明顯的一個錯誤，給我自然說法後讓我重說一次。不要重新打招呼。")}>糾正我</button><button onClick={()=>live.sendText("現在進入角色扮演，請直接扮演情境裡的真人角色，不要重新打招呼。")}>角色扮演</button><button onClick={()=>live.sendText("請把接下來的語速稍微放慢，但保持自然發音。直接承接目前對話。")}>說慢一點</button></div>
  <div className="live-transcript"><div className={"live-line user "+(live.input?"show":"")}><small>你剛剛說</small><span>{live.input}</span></div><div className={"live-line "+(live.output?"show":"")}><small>{profile.name}</small><span>{live.output}</span></div></div>
  <details className="live-more"><summary>更多功能</summary><div className="live-more-body">
   <button className="teacher-current-row live-teacher-row" disabled={sessionActive} onClick={()=>setPicker(true)}><span className="teacher-current-avatar"><TeacherAvatar profile={profile} decorative/></span><span><span className="label">老師</span><strong>{profile.name} · {profile.title}</strong><small>{sessionActive?"結束這次練習後可切換":"點擊切換"}</small></span></button>
   <div className="live-setup-grid">
    <label><span className="label">目標語言</span><select className="field" value={s.targetLanguage} onChange={e=>s.setTargetLanguage(e.target.value)}><option>英文</option><option>日文</option><option>韓文</option><option>西班牙文</option><option>法文</option></select></label>
    <label><span className="label">聊天模式</span><select className="field" value={s.conversationMode} onChange={e=>s.setConversationMode(e.target.value as any)}><option value="natural">自然聊天</option><option value="scenario">情境聊天</option><option value="practice">練習聊天</option></select></label>
    <label><span className="label">練習方式</span><select className="field" value={s.guidance} onChange={e=>s.setGuidance(e.target.value as any)}><option value="light">輕度引導</option><option value="normal">適時修正</option><option value="strict">積極糾正</option></select></label>
   </div>
   <div className="vision-box"><div className="vision-head"><strong>讓 {profile.name} 看一張圖</strong><span>教材 · 題目 · 菜單 · 路牌</span></div><div className="vision-actions"><button className="vision-btn" disabled={live.state!=="listening"} onClick={()=>file.current?.click()}>選圖片</button></div><input ref={file} type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void live.sendImageFile(f,"請先真的看圖，再以目前目標語言直接帶我學。先問一個和圖片直接相關的問題，不要重新打招呼。");e.currentTarget.value=""}}/></div>
  </div></details>
 </section>
 {live.report&&<section className="report-card"><div className="row" style={{justifyContent:"space-between"}}><div><span className="kicker">學習回顧</span><h3>課後學習報告</h3></div><div className="report-score">{String(live.report.overall_score??"--")}</div></div><div className="report-grid"><div className="report-stat"><b>{String(live.report.fluency_score??"--")}</b><span>流暢度</span></div><div className="report-stat"><b>{String(live.report.vocab_score??"--")}</b><span>詞彙</span></div><div className="report-stat"><b>{String(live.report.grammar_score??"--")}</b><span>文法</span></div></div><div className="report-body">{String(live.report.summary??"")}</div></section>}
 {course&&courseResult&&<section className="report-card course-complete-card"><div className="row" style={{justifyContent:"space-between"}}><div><span className="kicker">課程進度</span><h3>{course.titleZh}</h3></div><div className="report-score">{courseResult.stars?"★".repeat(courseResult.stars):"—"}</div></div><div className="report-grid"><div className="report-stat"><b>{courseResult.done}/{courseResult.total}</b><span>任務</span></div><div className="report-stat"><b>{courseResult.score}</b><span>完成度</span></div><div className="report-stat"><b>{courseResult.stars}</b><span>星等</span></div></div><div className="report-body">{courseResult.stars?"這堂已記錄完成，可以回課程地圖繼續下一堂。":"這次還沒有完成足夠任務；可再練一次，不會鎖住目前這堂。"}</div><div className="actions"><Link className="btn secondary small" to={"/teacher/course?lesson="+encodeURIComponent(course.id)}>回課程地圖</Link></div></section>}
 </main>{picker&&<TeacherProfilePicker onClose={()=>setPicker(false)}/>}</>
}
